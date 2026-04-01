import React, { useState, useEffect } from 'react';
import { X, Package, Check, Loader } from 'lucide-react';
import { getStockDeduction, confirmStockDeduction } from '../../api/stockApi';

const StockDeductionModal = ({ isOpen, onClose, appointmentId, treatmentName, onConfirm }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && appointmentId) {
      loadDeduction();
    }
  }, [isOpen, appointmentId]);

  const loadDeduction = async () => {
    setLoading(true);
    try {
      const res = await getStockDeduction(appointmentId);
      if (res.success && res.data && res.data.length > 0) {
        setItems(res.data.map(d => ({ ...d, adjustedQuantity: d.standardQuantity })));
      } else {
        // No products to deduct — auto close
        onClose();
      }
    } catch (err) {
      console.error('Error loading deduction:', err);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await confirmStockDeduction(appointmentId, items.map(i => ({
        productId: i.productId,
        quantity: parseFloat(i.adjustedQuantity),
      })));
      if (onConfirm) onConfirm();
      onClose();
    } catch (err) {
      console.error('Error confirming deduction:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || loading) return null;
  if (items.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Deducción de stock</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6">
          {treatmentName && <p className="text-sm text-gray-500 mb-4">Tratamiento: <strong>{treatmentName}</strong></p>}

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={item.productId} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{item.productName}</p>
                  <p className="text-xs text-gray-400">Stock actual: {item.currentStock} {item.unit || ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={item.adjustedQuantity}
                    onChange={e => setItems(prev => prev.map((p, i) => i === idx ? { ...p, adjustedQuantity: e.target.value } : p))}
                    className="w-20 px-2 py-1 text-sm border rounded text-center"
                    step="0.01"
                    min="0"
                  />
                  <span className="text-xs text-gray-500">{item.unit || ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t flex justify-between">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50 text-sm">Omitir</button>
          <button onClick={handleConfirm} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm flex items-center gap-2">
            {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Confirmar deducción
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockDeductionModal;
