/**
 * Suppliers API Client
 * Handles all API calls for suppliers management
 * Reusable across the application
 */

import { baseClient } from './baseClient';

const ENDPOINT = '/suppliers';

/**
 * List suppliers with optional filtering
 * @param {Object} params - Query parameters
 * @param {string} params.search - Search term
 * @param {boolean} params.isActive - Filter by active status
 * @param {string} params.country - Filter by country code
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @param {string} params.sortBy - Sort field
 * @param {string} params.sortOrder - Sort direction (ASC/DESC)
 */
export const getSuppliers = async (params = {}) => {
  return baseClient.get(ENDPOINT, { query: params });
};

/**
 * Search suppliers (for autocomplete)
 * @param {string} query - Search query
 * @param {number} limit - Max results
 */
export const searchSuppliers = async (query, limit = 10) => {
  return baseClient.get(`${ENDPOINT}/search`, { query: { q: query, limit } });
};

/**
 * Get supplier by ID
 * @param {string} id - Supplier ID
 */
export const getSupplier = async (id) => {
  return baseClient.get(`${ENDPOINT}/${id}`);
};

/**
 * Create a new supplier
 * @param {Object} data - Supplier data
 */
export const createSupplier = async (data) => {
  return baseClient.post(ENDPOINT, data);
};

/**
 * Update a supplier
 * @param {string} id - Supplier ID
 * @param {Object} data - Updated data
 */
export const updateSupplier = async (id, data) => {
  return baseClient.put(`${ENDPOINT}/${id}`, data);
};

/**
 * Delete/deactivate a supplier
 * @param {string} id - Supplier ID
 * @param {boolean} permanent - Hard delete if true
 */
export const deleteSupplier = async (id, permanent = false) => {
  return baseClient.delete(`${ENDPOINT}/${id}`, { query: { permanent } });
};

/**
 * Get products for a supplier
 * @param {string} supplierId - Supplier ID
 */
export const getSupplierProducts = async (supplierId) => {
  return baseClient.get(`${ENDPOINT}/${supplierId}/products`);
};

// ============================================
// PRODUCT-SUPPLIER RELATIONSHIP
// ============================================

/**
 * Get suppliers for a product
 * @param {string} productId - Product ID
 */
export const getProductSuppliers = async (productId) => {
  return baseClient.get(`/products/${productId}/suppliers`);
};

/**
 * Add a supplier to a product
 * @param {string} productId - Product ID
 * @param {Object} data - Supplier association data
 * @param {string} data.supplierId - Supplier ID
 * @param {boolean} data.isPrimary - Is primary supplier
 * @param {string} data.supplierSku - Supplier's product code
 * @param {number} data.unitCost - Cost from supplier
 * @param {string} data.currency - Currency code
 * @param {number} data.minOrderQuantity - Minimum order quantity
 * @param {number} data.leadTimeDays - Delivery lead time
 * @param {string} data.notes - Notes
 */
export const addProductSupplier = async (productId, data) => {
  return baseClient.post(`/products/${productId}/suppliers`, data);
};

/**
 * Update product-supplier relationship
 * @param {string} productId - Product ID
 * @param {string} supplierId - Supplier ID
 * @param {Object} data - Updated data
 */
export const updateProductSupplier = async (productId, supplierId, data) => {
  return baseClient.put(`/products/${productId}/suppliers/${supplierId}`, data);
};

/**
 * Remove a supplier from a product
 * @param {string} productId - Product ID
 * @param {string} supplierId - Supplier ID
 */
export const removeProductSupplier = async (productId, supplierId) => {
  return baseClient.delete(`/products/${productId}/suppliers/${supplierId}`);
};

/**
 * Set a supplier as primary for a product
 * @param {string} productId - Product ID
 * @param {string} supplierId - Supplier ID
 */
export const setPrimarySupplier = async (productId, supplierId) => {
  return baseClient.put(`/products/${productId}/suppliers/${supplierId}/primary`);
};

export default {
  // Suppliers CRUD
  getSuppliers,
  searchSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierProducts,
  // Product-Supplier relationships
  getProductSuppliers,
  addProductSupplier,
  updateProductSupplier,
  removeProductSupplier,
  setPrimarySupplier
};
