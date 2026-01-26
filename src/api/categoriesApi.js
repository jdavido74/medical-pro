/**
 * Categories API Client
 * Handles all API calls to the backend categories endpoints
 * Reusable across the SaaS (products, services, appointments, etc.)
 */

import { baseClient } from './baseClient';

const CATEGORIES_ENDPOINT = '/categories';

/**
 * Get all categories
 * @param {Object} params - Query parameters (type, isActive, search, page, limit)
 */
export const getCategories = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `${CATEGORIES_ENDPOINT}?${queryString}` : CATEGORIES_ENDPOINT;
  return baseClient.get(url);
};

/**
 * Get categories by type
 * @param {string} type - Category type (medication, treatment, service, etc.)
 */
export const getCategoriesByType = async (type) => {
  return baseClient.get(`${CATEGORIES_ENDPOINT}/by-type/${type}`);
};

/**
 * Get all categories grouped by type
 */
export const getCategoriesGrouped = async () => {
  return baseClient.get(`${CATEGORIES_ENDPOINT}/grouped`);
};

/**
 * Get a single category by ID
 * @param {string} id - Category ID
 */
export const getCategory = async (id) => {
  return baseClient.get(`${CATEGORIES_ENDPOINT}/${id}`);
};

/**
 * Get category with its products
 * @param {string} id - Category ID
 */
export const getCategoryWithProducts = async (id) => {
  return baseClient.get(`${CATEGORIES_ENDPOINT}/${id}/products`);
};

/**
 * Create a new category
 * @param {Object} data - Category data (name, color, type, description, sortOrder)
 */
export const createCategory = async (data) => {
  return baseClient.post(CATEGORIES_ENDPOINT, data);
};

/**
 * Update a category
 * @param {string} id - Category ID
 * @param {Object} data - Updated data
 */
export const updateCategory = async (id, data) => {
  return baseClient.put(`${CATEGORIES_ENDPOINT}/${id}`, data);
};

/**
 * Delete a category
 * @param {string} id - Category ID
 */
export const deleteCategory = async (id) => {
  return baseClient.delete(`${CATEGORIES_ENDPOINT}/${id}`);
};

/**
 * Reorder categories
 * @param {string[]} orderedIds - Array of category IDs in new order
 */
export const reorderCategories = async (orderedIds) => {
  return baseClient.post(`${CATEGORIES_ENDPOINT}/reorder`, { orderedIds });
};

// Export as named exports and default object
export const categoriesApi = {
  getCategories,
  getCategoriesByType,
  getCategoriesGrouped,
  getCategory,
  getCategoryWithProducts,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories
};

export default categoriesApi;
