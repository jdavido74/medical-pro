import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, RefreshCw, Minus, Plus, Loader } from 'lucide-react';
import { getStockMovements, createStockMovement } from '../../api/stockApi';

const typeConfig = {
  supplier_entry: { icon: ArrowDown, color: 'text-green-600', bg: 'bg-green-50', label: 'Entrada' },
  treatment_exit: { icon: ArrowUp, color: 'text-red-600', bg: 'bg-red-50', label: 'Salida' },
  manual_adjustment: { icon: RefreshCw, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Ajuste' },
  loss: { icon: Minus, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Pérdida' },
};

const formatDate = (d) => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

const StockMovementsTab = ({ productId, t }) => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ movementType: 'supplier_entry', quantity: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const loadMovements = async () => {
    setLoading(true);
    try {
      const res = await getStockMovements(productId, { page, limit: 20 });
      if (res.success) {
        setMovements(res.data || []);
        setTotal(res.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Error loading movements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMovements(); }, [productId, page]);

  const handleSubmit = async () => {
    if (!formData.quantity) return;
    setSaving(true);
    try {
      await createStockMovement(productId, {
        movementType: formData.movementType,
        quantity: parseFloat(formData.quantity),
        notes: formData.notes || null,
      });
      setFormData({ movementType: 'supplier_entry', quantity: '', notes: '' });
      setShowForm(false);
      loadMovements();
    } catch (err) {
      console.error('Error creating movement:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading && movements.length === 0) {
    return <div className="flex justify-center py-8"><Loader className="h-5 w-5 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">{t('catalog:stock.movements')}</h4>
        <button onClick={() => setShowForm(!showForm)} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
          <Plus className="h-3 w-3" /> {t('catalog:stock.entry')}
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 p-3 rounded-lg space-y-2">
          <select value={formData.movementType} onChange={e => setFormData({...formData, movementType: e.target.value})} className="w-full px-2 py-1 text-sm border rounded">
            <option value="supplier_entry">{t('catalog:stock.entry')}</option>
            <option value="manual_adjustment">{t('catalog:stock.adjustment')}</option>
            <option value="loss">{t('catalog:stock.loss')}</option>
          </select>
          <input type="number" placeholder={t('catalog:stock.quantity')} value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} className="w-full px-2 py-1 text-sm border rounded" step="0.01" />
          <input type="text" placeholder="Notes" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-2 py-1 text-sm border rounded" />
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={saving} className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50">
              {saving ? '...' : t('common:save', 'Guardar')}
            </button>
            <button onClick={() => setShowForm(false)} className="px-3 py-1 text-gray-600 text-xs border rounded hover:bg-gray-100">{t('common:cancel', 'Cancelar')}</button>
          </div>
        </div>
      )}

      {movements.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Sin movimientos</p>
      ) : (
        <div className="space-y-1">
          {movements.map(m => {
            const tc = typeConfig[m.movementType] || typeConfig.manual_adjustment;
            const Icon = tc.icon;
            return (
              <div key={m.id} className={`flex items-center justify-between py-1.5 px-2 rounded ${tc.bg}`}>
                <div className="flex items-center gap-2">
                  <Icon className={`h-3.5 w-3.5 ${tc.color}`} />
                  <span className="text-xs text-gray-500">{formatDate(m.createdAt)}</span>
                  <span className="text-xs text-gray-700">{m.reference || m.notes || tc.label}</span>
                </div>
                <span className={`text-sm font-medium ${parseFloat(m.quantity) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {parseFloat(m.quantity) >= 0 ? '+' : ''}{parseFloat(m.quantity)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {total > 20 && (
        <div className="flex justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="text-xs text-blue-600 disabled:text-gray-300">← Anterior</button>
          <span className="text-xs text-gray-500">Página {page}</span>
          <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)} className="text-xs text-blue-600 disabled:text-gray-300">Siguiente →</button>
        </div>
      )}
    </div>
  );
};

export default StockMovementsTab;
