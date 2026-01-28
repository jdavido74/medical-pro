/**
 * Treatment Consents API Client
 * Handles API calls for treatment-consent template associations
 */

import { baseClient } from './baseClient';

const ENDPOINT = '/treatment-consents';

// ============================================
// Associations CRUD
// ============================================

/**
 * Get all treatment-consent associations
 * @param {Object} params - Query parameters
 * @param {string} params.treatmentId - Filter by treatment ID
 * @param {string} params.consentTemplateId - Filter by consent template ID
 */
export const getAssociations = async (params = {}) => {
  return baseClient.get(ENDPOINT, { query: params });
};

/**
 * Get consent templates for a specific treatment
 * @param {string} treatmentId - Treatment ID
 */
export const getConsentsByTreatment = async (treatmentId) => {
  return baseClient.get(`${ENDPOINT}/treatment/${treatmentId}`);
};

/**
 * Create a new treatment-consent association
 * @param {Object} data - Association data
 * @param {string} data.treatmentId - Treatment ID
 * @param {string} data.consentTemplateId - Consent template ID
 * @param {boolean} data.isRequired - Whether consent is required for treatment
 * @param {number} data.sortOrder - Display order
 */
export const createAssociation = async (data) => {
  return baseClient.post(ENDPOINT, data);
};

/**
 * Bulk update consent templates for a treatment
 * Replaces all existing associations
 * @param {string} treatmentId - Treatment ID
 * @param {Array<string>} consentTemplateIds - Array of consent template IDs
 * @param {boolean} isRequired - Whether consents are required
 */
export const updateTreatmentConsents = async (treatmentId, consentTemplateIds, isRequired = true) => {
  return baseClient.put(`${ENDPOINT}/treatment/${treatmentId}`, {
    consentTemplateIds,
    isRequired
  });
};

/**
 * Delete an association by ID
 * @param {string} id - Association ID
 */
export const deleteAssociation = async (id) => {
  return baseClient.delete(`${ENDPOINT}/${id}`);
};

/**
 * Delete association by treatment and template IDs
 * @param {string} treatmentId - Treatment ID
 * @param {string} templateId - Consent template ID
 */
export const deleteByTreatmentAndTemplate = async (treatmentId, templateId) => {
  return baseClient.delete(`${ENDPOINT}/treatment/${treatmentId}/template/${templateId}`);
};

// ============================================
// Coverage validation
// ============================================

/**
 * Check if treatments have complete consent coverage
 * @param {Array<string>} treatmentIds - Array of treatment IDs to check
 * @returns {Object} { complete: boolean, covered: string[], missing: { id, name }[] }
 */
export const checkCoverage = async (treatmentIds) => {
  return baseClient.post(`${ENDPOINT}/check-coverage`, { treatmentIds });
};

/**
 * Get list of treatments that don't have any consent associations
 * Useful for admin dashboard to identify incomplete setup
 */
export const getTreatmentsWithoutConsents = async () => {
  return baseClient.get(`${ENDPOINT}/treatments-without-consents`);
};

// ============================================
// Available templates
// ============================================

/**
 * Get available consent templates that can be associated
 * @param {Object} params - Query parameters
 * @param {string} params.treatmentId - If provided, marks which templates are already associated
 */
export const getAvailableTemplates = async (params = {}) => {
  return baseClient.get(`${ENDPOINT}/templates/available`, { query: params });
};

export default {
  // CRUD
  getAssociations,
  getConsentsByTreatment,
  createAssociation,
  updateTreatmentConsents,
  deleteAssociation,
  deleteByTreatmentAndTemplate,
  // Coverage
  checkCoverage,
  getTreatmentsWithoutConsents,
  // Templates
  getAvailableTemplates
};
