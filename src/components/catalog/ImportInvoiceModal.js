import React, { useState, useRef } from 'react';
import { X, Upload, Camera, Loader, Check, AlertTriangle, Package } from 'lucide-react';
import { importInvoice, confirmImport } from '../../api/stockApi';

const ImportInvoiceModal = ({ isOpen, onClose, onImportComplete, defaultCategory, t }) => {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState(defaultCategory || 'medication');
  const [processing, setProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [items, setItems] = useState([]);
  const [supplierInfo, setSupplierInfo] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      const res = await importInvoice(file, category);
      if (res.success) {
        setExtractedData(res.data);
        setSupplierInfo(res.data.supplier || {});
        setItems((res.data.items || []).map((item, idx) => ({ ...item, _idx: idx, skip: false })));
        setStep(2);
      } else {
        setError(res.error?.message || 'Error processing invoice');
      }
    } catch (err) {
      setError(err.message || 'Error processing invoice');
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirm = async () => {
    setProcessing(true);
    setError(null);
    try {
      const res = await confirmImport({
        category,
        supplierInfo,
        items: items.filter(i => !i.skip).map(i => ({
          reference: i.reference,
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          taxRate: i.taxRate,
          existingProductId: i.matchedProduct?.id || null,
          isNew: !i.matchedProduct,
          skip: i.skip,
        })),
      });
      if (res.success) {
        setResult(res.data);
        setStep(3);
        if (onImportComplete) onImportComplete();
      } else {
        setError(res.error?.message || 'Error confirming import');
      }
    } catch (err) {
      setError(err.message || 'Error confirming import');
    } finally {
      setProcessing(false);
    }
  };

  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map(i => i._idx === idx ? { ...i, [field]: value } : i));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">{t('catalog:import.title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Step 1: Upload */}
          {step === 1 && (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                <p className="text-sm text-gray-600">{t('catalog:import.upload')}</p>
                {file && <p className="mt-2 text-sm font-medium text-blue-600">{file.name}</p>}
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} className="hidden" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('catalog:import.category')}</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="medication">Medicamento</option>
                  <option value="supplement">Complemento</option>
                  <option value="supply">Suministro</option>
                  <option value="product">Producto</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Validation */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Supplier info */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs font-medium text-gray-500 mb-1">{t('catalog:import.supplierInfo')}</p>
                <div className="grid grid-cols-3 gap-2">
                  <input value={supplierInfo.name || ''} onChange={e => setSupplierInfo({...supplierInfo, name: e.target.value})} placeholder="Proveedor" className="px-2 py-1 text-sm border rounded" />
                  <input value={supplierInfo.invoiceNumber || ''} onChange={e => setSupplierInfo({...supplierInfo, invoiceNumber: e.target.value})} placeholder="N° Factura" className="px-2 py-1 text-sm border rounded" />
                  <input value={supplierInfo.date || ''} onChange={e => setSupplierInfo({...supplierInfo, date: e.target.value})} placeholder="Fecha" className="px-2 py-1 text-sm border rounded" />
                </div>
              </div>

              {/* Items table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Estado</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Ref</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Descripción</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-gray-500">Cant.</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-gray-500">P.Unit.</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-gray-500">IVA%</th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500">Incluir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item._idx} className={`border-b ${item.skip ? 'opacity-40' : ''}`}>
                        <td className="px-2 py-2">
                          {item.matchedProduct ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">{t('catalog:import.existing')}</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 text-orange-700">{t('catalog:import.new')}</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <input value={item.reference || ''} onChange={e => updateItem(item._idx, 'reference', e.target.value)} className="w-16 px-1 py-0.5 text-xs border rounded" />
                        </td>
                        <td className="px-2 py-2">
                          <input value={item.description || ''} onChange={e => updateItem(item._idx, 'description', e.target.value)} className="w-full px-1 py-0.5 text-xs border rounded" />
                          {item.matchedProduct && <p className="text-[10px] text-green-600 mt-0.5">→ {item.matchedProduct.title}</p>}
                        </td>
                        <td className="px-2 py-2 text-right">
                          <input type="number" value={item.quantity} onChange={e => updateItem(item._idx, 'quantity', parseFloat(e.target.value))} className="w-16 px-1 py-0.5 text-xs border rounded text-right" step="0.001" />
                        </td>
                        <td className="px-2 py-2 text-right">
                          <input type="number" value={item.unitPrice} onChange={e => updateItem(item._idx, 'unitPrice', parseFloat(e.target.value))} className="w-16 px-1 py-0.5 text-xs border rounded text-right" step="0.01" />
                        </td>
                        <td className="px-2 py-2 text-right">
                          <input type="number" value={item.taxRate || 21} onChange={e => updateItem(item._idx, 'taxRate', parseFloat(e.target.value))} className="w-12 px-1 py-0.5 text-xs border rounded text-right" />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input type="checkbox" checked={!item.skip} onChange={e => updateItem(item._idx, 'skip', !e.target.checked)} className="rounded" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step 3: Result */}
          {step === 3 && result && (
            <div className="text-center py-8">
              <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Importación completada</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <p>{result.created} productos creados</p>
                <p>{result.updated} productos actualizados</p>
                <p className="font-medium text-gray-900">{result.total} entradas de stock</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t flex justify-between">
          {step === 1 && (
            <>
              <button onClick={onClose} className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50 text-sm">{t('common:cancel', 'Cancelar')}</button>
              <button onClick={handleUpload} disabled={!file || processing} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center gap-2">
                {processing ? <><Loader className="h-4 w-4 animate-spin" /> {t('catalog:import.processing')}</> : <><Upload className="h-4 w-4" /> Procesar</>}
              </button>
            </>
          )}
          {step === 2 && (
            <>
              <button onClick={() => setStep(1)} className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50 text-sm">← Volver</button>
              <button onClick={handleConfirm} disabled={processing} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm flex items-center gap-2">
                {processing ? <Loader className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {t('catalog:import.confirm')}
              </button>
            </>
          )}
          {step === 3 && (
            <button onClick={onClose} className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">Cerrar</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportInvoiceModal;
