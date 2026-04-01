import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Package, Loader } from 'lucide-react';
import { getTreatmentProducts, addTreatmentProduct, updateTreatmentProduct, removeTreatmentProduct } from '../../api/treatmentProductsApi';

const TreatmentProductsSection = ({ treatmentId, parentId, t, allProducts = [] }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ productId: '', standardQuantity: 1, unit: '' });

  const loadProducts = async () => {
    if (!treatmentId) return;
    setLoading(true);
    try {
      const res = await getTreatmentProducts(treatmentId);
      if (res.success) setProducts(res.data || []);
    } catch (err) {
      console.error('Error loading treatment products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProducts(); }, [treatmentId]);

  const handleAdd = async () => {
    if (!addForm.productId || !addForm.standardQuantity) return;
    try {
      await addTreatmentProduct(treatmentId, addForm);
      setAddForm({ productId: '', standardQuantity: 1, unit: '' });
      setShowAdd(false);
      loadProducts();
    } catch (err) {
      console.error('Error adding product:', err);
    }
  };

  const handleRemove = async (productId) => {
    try {
      await removeTreatmentProduct(treatmentId, productId);
      loadProducts();
    } catch (err) {
      console.error('Error removing product:', err);
    }
  };

  const handleUpdateQuantity = async (productId, newQty) => {
    try {
      await updateTreatmentProduct(treatmentId, productId, { standardQuantity: parseFloat(newQty) });
      loadProducts();
    } catch (err) {
      console.error('Error updating quantity:', err);
    }
  };

  if (loading) return <div className="flex justify-center py-4"><Loader className="h-5 w-5 animate-spin text-blue-500" /></div>;

  // Filter available products for the add dropdown (exclude already associated)
  const associatedIds = new Set(products.map(p => p.productId));
  const availableProducts = allProducts.filter(p =>
    !associatedIds.has(p.id) && ['product', 'medication', 'supplement', 'supply'].includes(p.itemType || p.item_type)
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Package className="h-4 w-4" />
          {t('catalog:treatmentProducts.title')}
        </h4>
        <button onClick={() => setShowAdd(!showAdd)} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
          <Plus className="h-3 w-3" /> {t('catalog:treatmentProducts.add')}
        </button>
      </div>

      {showAdd && (
        <div className="bg-gray-50 p-3 rounded-lg space-y-2">
          <select value={addForm.productId} onChange={e => setAddForm({...addForm, productId: e.target.value})} className="w-full px-2 py-1 text-sm border rounded">
            <option value="">-- Seleccionar producto --</option>
            {availableProducts.map(p => (
              <option key={p.id} value={p.id}>{p.title || p.name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <input type="number" placeholder={t('catalog:treatmentProducts.quantity')} value={addForm.standardQuantity} onChange={e => setAddForm({...addForm, standardQuantity: e.target.value})} className="flex-1 px-2 py-1 text-sm border rounded" step="0.01" min="0.01" />
            <input type="text" placeholder="Unidad" value={addForm.unit} onChange={e => setAddForm({...addForm, unit: e.target.value})} className="w-24 px-2 py-1 text-sm border rounded" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">{t('common:save', 'Guardar')}</button>
            <button onClick={() => setShowAdd(false)} className="px-3 py-1 text-gray-600 text-xs border rounded hover:bg-gray-100">{t('common:cancel', 'Cancelar')}</button>
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">{t('catalog:treatmentProducts.noProducts')}</p>
      ) : (
        <div className="space-y-1">
          {products.map(p => (
            <div key={p.productId} className={`flex items-center justify-between py-2 px-3 rounded ${p.isInherited ? 'bg-gray-50' : 'bg-white border border-gray-100'}`}>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-800">{p.productName}</span>
                {p.isInherited && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-500">{t('catalog:treatmentProducts.inherited')}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!p.isInherited ? (
                  <>
                    <input
                      type="number"
                      value={p.standardQuantity}
                      onChange={e => handleUpdateQuantity(p.productId, e.target.value)}
                      className="w-16 px-1 py-0.5 text-sm border rounded text-center"
                      step="0.01"
                      min="0.01"
                    />
                    <span className="text-xs text-gray-500">{p.unit || p.productUnit || ''}</span>
                    <button onClick={() => handleRemove(p.productId)} className="p-1 text-gray-400 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <span className="text-sm text-gray-500">{p.standardQuantity} {p.unit || p.productUnit || ''}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TreatmentProductsSection;
