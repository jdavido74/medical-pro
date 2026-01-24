/**
 * Catalog API Client
 * Handles all API calls to the backend catalog (products/services)
 */

import { baseClient } from './baseClient';

// Backend uses /products endpoint for catalog items
const CATALOG_ENDPOINT = '/products';

/**
 * Get all catalog items with optional filters
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 50)
 * @param {string} params.search - Search term
 * @param {string} params.type - Filter by type (product/service)
 * @param {string} params.itemType - Filter by itemType (product/medication/treatment/service)
 * @param {boolean} params.isActive - Filter by active status
 * @param {boolean} params.isFamily - Filter families only
 * @param {boolean} params.isVariant - Filter variants only
 * @param {string} params.parentId - Filter by parent ID
 * @param {boolean} params.includeVariants - Include variants in response
 */
export const getCatalogItems = async (params = {}) => {
  return baseClient.get(CATALOG_ENDPOINT, { query: params });
};

/**
 * Get a single catalog item by ID
 * @param {string} id - Item ID
 */
export const getCatalogItem = async (id) => {
  return baseClient.get(`${CATALOG_ENDPOINT}/${id}`);
};

/**
 * Create a new catalog item
 * @param {Object} data - Item data
 */
export const createCatalogItem = async (data) => {
  return baseClient.post(CATALOG_ENDPOINT, data);
};

/**
 * Update an existing catalog item
 * @param {string} id - Item ID
 * @param {Object} data - Updated data
 */
export const updateCatalogItem = async (id, data) => {
  return baseClient.put(`${CATALOG_ENDPOINT}/${id}`, data);
};

/**
 * Delete a catalog item
 * @param {string} id - Item ID
 */
export const deleteCatalogItem = async (id) => {
  return baseClient.delete(`${CATALOG_ENDPOINT}/${id}`);
};

/**
 * Get all family items with their variants
 */
export const getCatalogFamilies = async () => {
  return baseClient.get(`${CATALOG_ENDPOINT}/families`);
};

/**
 * Add a variant to a family
 * @param {string} parentId - Parent item ID
 * @param {Object} variantData - Variant data
 */
export const createVariant = async (parentId, variantData) => {
  return baseClient.post(`${CATALOG_ENDPOINT}/${parentId}/variants`, variantData);
};

/**
 * Duplicate a catalog item
 * @param {string} id - Item ID to duplicate
 */
export const duplicateCatalogItem = async (id) => {
  return baseClient.post(`${CATALOG_ENDPOINT}/${id}/duplicate`);
};

/**
 * Get catalog statistics
 */
export const getCatalogStats = async () => {
  return baseClient.get(`${CATALOG_ENDPOINT}/stats`);
};

/**
 * Get items that impact appointments (services and treatments with duration)
 */
export const getItemsForAppointments = async () => {
  return baseClient.get(`${CATALOG_ENDPOINT}/for-appointments`);
};

/**
 * Search catalog items
 * @param {string} query - Search query
 * @param {Object} options - Search options
 */
export const searchCatalog = async (query, options = {}) => {
  const params = {
    search: query,
    ...options
  };
  return baseClient.get(CATALOG_ENDPOINT, { query: params });
};

/**
 * Get items by type for selection (e.g., dropdown lists)
 * @param {string} itemType - Item type (medication/treatment/service/product)
 */
export const getItemsByType = async (itemType) => {
  const params = {
    itemType,
    isActive: true,
    limit: 100
  };
  return baseClient.get(CATALOG_ENDPOINT, { query: params });
};

/**
 * Bulk update items (e.g., batch activate/deactivate)
 * @param {string[]} ids - Array of item IDs
 * @param {Object} data - Data to update
 */
export const bulkUpdateItems = async (ids, data) => {
  const promises = ids.map(id => updateCatalogItem(id, data));
  return Promise.all(promises);
};

export default {
  getCatalogItems,
  getCatalogItem,
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
  getCatalogFamilies,
  createVariant,
  duplicateCatalogItem,
  getCatalogStats,
  getItemsForAppointments,
  searchCatalog,
  getItemsByType,
  bulkUpdateItems
};
