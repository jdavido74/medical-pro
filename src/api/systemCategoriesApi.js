/**
 * System Categories API Client
 * Handles all API calls to the backend system-categories endpoints
 * Used for dynamic management of consent types, appointment types, specialties, and departments
 */

import { baseClient } from './baseClient';

const ENDPOINT = '/system-categories';

/**
 * Category types available in the system
 */
export const CATEGORY_TYPES = [
  'consent_type',
  'appointment_type',
  'specialty',
  'department',
  'priority'
];

/**
 * Get all system categories
 * @param {Object} params - Query parameters
 * @param {string} params.type - Filter by category type
 * @param {boolean} params.includeInactive - Include inactive categories
 * @param {string} params.search - Search query
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 */
export const getSystemCategories = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `${ENDPOINT}?${queryString}` : ENDPOINT;
  return baseClient.get(url);
};

/**
 * Get system categories by type
 * @param {string} type - Category type (consent_type, appointment_type, specialty, department, priority)
 * @param {boolean} includeInactive - Include inactive categories
 */
export const getSystemCategoriesByType = async (type, includeInactive = false) => {
  const params = includeInactive ? '?includeInactive=true' : '';
  return baseClient.get(`${ENDPOINT}/by-type/${type}${params}`);
};

/**
 * Get all system categories grouped by type
 */
export const getSystemCategoriesGrouped = async () => {
  return baseClient.get(`${ENDPOINT}/grouped`);
};

/**
 * Get available category types
 */
export const getSystemCategoryTypes = async () => {
  return baseClient.get(`${ENDPOINT}/types`);
};

/**
 * Get a single system category by ID
 * @param {string} id - Category ID
 */
export const getSystemCategory = async (id) => {
  return baseClient.get(`${ENDPOINT}/${id}`);
};

/**
 * Create a new system category
 * @param {Object} data - Category data
 * @param {string} data.code - Unique code (alphanumeric with underscores)
 * @param {string} data.categoryType - Category type
 * @param {Object} data.translations - { es: { name, description }, en: {...}, fr: {...} }
 * @param {Object} data.metadata - Type-specific configuration
 * @param {number} data.sortOrder - Display order
 * @param {boolean} data.isActive - Whether the category is active
 */
export const createSystemCategory = async (data) => {
  return baseClient.post(ENDPOINT, data);
};

/**
 * Update a system category
 * @param {string} id - Category ID
 * @param {Object} data - Updated data
 */
export const updateSystemCategory = async (id, data) => {
  return baseClient.put(`${ENDPOINT}/${id}`, data);
};

/**
 * Delete a system category (only non-system categories can be deleted)
 * @param {string} id - Category ID
 */
export const deleteSystemCategory = async (id) => {
  return baseClient.delete(`${ENDPOINT}/${id}`);
};

/**
 * Reorder categories within a type
 * @param {string} type - Category type
 * @param {string[]} orderedIds - Array of category IDs in new order
 */
export const reorderSystemCategories = async (type, orderedIds) => {
  return baseClient.post(`${ENDPOINT}/reorder`, { type, orderedIds });
};

/**
 * Validate if a code exists for a type
 * @param {string} type - Category type
 * @param {string} code - Category code
 */
export const validateSystemCategoryCode = async (type, code) => {
  return baseClient.get(`${ENDPOINT}/validate/${type}/${code}`);
};

/**
 * Get all codes for a type (useful for validation/select options)
 * @param {string} type - Category type
 */
export const getSystemCategoryCodes = async (type) => {
  return baseClient.get(`${ENDPOINT}/codes/${type}`);
};

// ============================================================================
// CONVENIENCE METHODS FOR SPECIFIC TYPES
// ============================================================================

/**
 * Get consent types
 * @param {boolean} includeInactive - Include inactive types
 */
export const getConsentTypes = async (includeInactive = false) => {
  return getSystemCategoriesByType('consent_type', includeInactive);
};

/**
 * Get appointment types
 * @param {boolean} includeInactive - Include inactive types
 */
export const getAppointmentTypes = async (includeInactive = false) => {
  return getSystemCategoriesByType('appointment_type', includeInactive);
};

/**
 * Get medical specialties
 * @param {boolean} includeInactive - Include inactive specialties
 */
export const getSpecialties = async (includeInactive = false) => {
  return getSystemCategoriesByType('specialty', includeInactive);
};

/**
 * Get departments
 * @param {boolean} includeInactive - Include inactive departments
 */
export const getDepartments = async (includeInactive = false) => {
  return getSystemCategoriesByType('department', includeInactive);
};

/**
 * Get priorities
 * @param {boolean} includeInactive - Include inactive priorities
 */
export const getPriorities = async (includeInactive = false) => {
  return getSystemCategoriesByType('priority', includeInactive);
};

// Export as named exports and default object
export const systemCategoriesApi = {
  CATEGORY_TYPES,
  getSystemCategories,
  getSystemCategoriesByType,
  getSystemCategoriesGrouped,
  getSystemCategoryTypes,
  getSystemCategory,
  createSystemCategory,
  updateSystemCategory,
  deleteSystemCategory,
  reorderSystemCategories,
  validateSystemCategoryCode,
  getSystemCategoryCodes,
  // Convenience methods
  getConsentTypes,
  getAppointmentTypes,
  getSpecialties,
  getDepartments,
  getPriorities
};

export default systemCategoriesApi;
