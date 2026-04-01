import { baseClient } from './baseClient';

const BASE = '/treatment-products/treatments';

export const getTreatmentProducts = async (treatmentId) => baseClient.get(`${BASE}/${treatmentId}/products`);
export const addTreatmentProduct = async (treatmentId, data) => baseClient.post(`${BASE}/${treatmentId}/products`, data);
export const updateTreatmentProduct = async (treatmentId, productId, data) => baseClient.put(`${BASE}/${treatmentId}/products/${productId}`, data);
export const removeTreatmentProduct = async (treatmentId, productId) => baseClient.delete(`${BASE}/${treatmentId}/products/${productId}`);

export default { getTreatmentProducts, addTreatmentProduct, updateTreatmentProduct, removeTreatmentProduct };
