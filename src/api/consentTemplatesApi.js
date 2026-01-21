/**
 * Consent Templates API Client
 * Handles all consent template-related API calls to the backend
 * - CRUD operations for consent templates
 * - Template versioning and validity management
 */

import { baseClient } from './baseClient';
import { dataTransform } from './dataTransform';

/**
 * Get all consent templates with optional filters
 */
async function getConsentTemplates(options = {}) {
  try {
    const { page = 1, limit = 100, consentType, search } = options;

    const query = { page, limit };
    if (consentType) query.consent_type = consentType;
    if (search) query.search = search;

    const response = await baseClient.get('/consent-templates', { query });

    const templatesData = response.data || [];
    const pagination = response.pagination || {};

    const templates = dataTransform.transformConsentTemplateListFromBackend(templatesData);

    return {
      templates,
      total: pagination.total || templates.length,
      page: pagination.page || 1,
      limit: pagination.limit || 100
    };
  } catch (error) {
    console.error('[consentTemplatesApi] Error fetching consent templates:', error);
    throw error;
  }
}

/**
 * Get single consent template by ID
 */
async function getConsentTemplateById(templateId) {
  try {
    const response = await baseClient.get(`/consent-templates/${templateId}`);
    const data = dataTransform.unwrapResponse(response);
    return dataTransform.transformConsentTemplateFromBackend(data);
  } catch (error) {
    console.error('[consentTemplatesApi] Error fetching consent template:', error);
    throw error;
  }
}

/**
 * Create a new consent template
 */
async function createConsentTemplate(templateData) {
  try {
    const backendData = dataTransform.transformConsentTemplateToBackend(templateData);

    const response = await baseClient.post('/consent-templates', backendData);
    const data = dataTransform.unwrapResponse(response);

    return dataTransform.transformConsentTemplateFromBackend(data);
  } catch (error) {
    console.error('[consentTemplatesApi] Error creating consent template:', error);
    throw error;
  }
}

/**
 * Update an existing consent template
 */
async function updateConsentTemplate(templateId, templateData) {
  try {
    const backendData = dataTransform.transformConsentTemplateToBackend(templateData);

    const response = await baseClient.put(`/consent-templates/${templateId}`, backendData);
    const data = dataTransform.unwrapResponse(response);

    return dataTransform.transformConsentTemplateFromBackend(data);
  } catch (error) {
    console.error('[consentTemplatesApi] Error updating consent template:', error);
    throw error;
  }
}

/**
 * Delete a consent template (soft delete)
 */
async function deleteConsentTemplate(templateId) {
  try {
    const response = await baseClient.delete(`/consent-templates/${templateId}`);
    return dataTransform.unwrapResponse(response);
  } catch (error) {
    console.error('[consentTemplatesApi] Error deleting consent template:', error);
    throw error;
  }
}

/**
 * Get active templates (valid and not expired)
 */
async function getActiveTemplates(options = {}) {
  try {
    const { templates } = await getConsentTemplates(options);
    const now = new Date();

    return templates.filter(template => {
      const validFrom = template.validFrom ? new Date(template.validFrom) : null;
      const validUntil = template.validUntil ? new Date(template.validUntil) : null;

      const isValidFromOk = !validFrom || validFrom <= now;
      const isValidUntilOk = !validUntil || validUntil > now;

      return isValidFromOk && isValidUntilOk;
    });
  } catch (error) {
    console.error('[consentTemplatesApi] Error fetching active templates:', error);
    throw error;
  }
}

/**
 * Get templates by consent type
 */
async function getTemplatesByType(consentType) {
  try {
    return await getConsentTemplates({ consentType });
  } catch (error) {
    console.error('[consentTemplatesApi] Error fetching templates by type:', error);
    throw error;
  }
}

/**
 * Get mandatory templates
 */
async function getMandatoryTemplates() {
  try {
    const { templates } = await getConsentTemplates();
    return templates.filter(template => template.isMandatory);
  } catch (error) {
    console.error('[consentTemplatesApi] Error fetching mandatory templates:', error);
    throw error;
  }
}

export const consentTemplatesApi = {
  getConsentTemplates,
  getConsentTemplateById,
  createConsentTemplate,
  updateConsentTemplate,
  deleteConsentTemplate,
  getActiveTemplates,
  getTemplatesByType,
  getMandatoryTemplates
};
