import { baseClient } from './baseClient';

export const getStockMovements = async (productId, params) => baseClient.get(`/stock/${productId}/movements`, { query: params });
export const createStockMovement = async (productId, data) => baseClient.post(`/stock/${productId}/movement`, data);
export const getStockAlerts = async () => baseClient.get('/stock/alerts');
export const getStockDeduction = async (appointmentId) => baseClient.get(`/stock/appointments/${appointmentId}/stock-deduction`);
export const confirmStockDeduction = async (appointmentId, items) => baseClient.post(`/stock/appointments/${appointmentId}/stock-deduction`, { items });
export const importInvoice = async (file, category) => {
  const formData = new FormData();
  formData.append('file', file);
  if (category) formData.append('category', category);
  return baseClient.upload('/catalog/import-invoice', formData);
};
export const confirmImport = async (data) => baseClient.post('/catalog/import-invoice/confirm', data);

export default { getStockMovements, createStockMovement, getStockAlerts, getStockDeduction, confirmStockDeduction, importInvoice, confirmImport };
