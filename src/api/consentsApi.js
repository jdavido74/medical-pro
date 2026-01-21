/**
 * Consents API Client
 * Handles all consent-related API calls to the backend
 * - CRUD operations for consents
 * - Electronic signature (GDPR-compliant)
 * - Patient-specific consent queries
 */

import { baseClient } from './baseClient';
import { dataTransform } from './dataTransform';

/**
 * Get all consents with optional filters
 */
async function getConsents(options = {}) {
  try {
    const { page = 1, limit = 100, patientId, status, consentType } = options;

    const query = { page, limit };
    if (patientId) query.patient_id = patientId;
    if (status) query.status = status;
    if (consentType) query.consent_type = consentType;

    const response = await baseClient.get('/consents', { query });

    const consentsData = response.data || [];
    const pagination = response.pagination || {};

    const consents = dataTransform.transformConsentListFromBackend(consentsData);

    return {
      consents,
      total: pagination.total || consents.length,
      page: pagination.page || 1,
      limit: pagination.limit || 100
    };
  } catch (error) {
    console.error('[consentsApi] Error fetching consents:', error);
    throw error;
  }
}

/**
 * Get single consent by ID
 */
async function getConsentById(consentId) {
  try {
    const response = await baseClient.get(`/consents/${consentId}`);
    const data = dataTransform.unwrapResponse(response);
    return dataTransform.transformConsentFromBackend(data);
  } catch (error) {
    console.error('[consentsApi] Error fetching consent:', error);
    throw error;
  }
}

/**
 * Get all consents for a specific patient
 */
async function getConsentsByPatient(patientId, options = {}) {
  try {
    const { status } = options;

    const query = {};
    if (status) query.status = status;

    const response = await baseClient.get(`/consents/patient/${patientId}`, { query });

    const consentsData = response.data || [];
    const consents = dataTransform.transformConsentListFromBackend(consentsData);

    return {
      consents,
      total: response.count || consents.length
    };
  } catch (error) {
    console.error('[consentsApi] Error fetching patient consents:', error);
    throw error;
  }
}

/**
 * Get consents for a specific appointment
 */
async function getConsentsByAppointment(appointmentId) {
  try {
    const response = await baseClient.get(`/consents/appointment/${appointmentId}`);

    const consentsData = response.data || [];
    return dataTransform.transformConsentListFromBackend(consentsData);
  } catch (error) {
    console.error('[consentsApi] Error fetching appointment consents:', error);
    throw error;
  }
}

/**
 * Create a new consent
 */
async function createConsent(consentData) {
  try {
    const backendData = dataTransform.transformConsentToBackend(consentData);

    const response = await baseClient.post('/consents', backendData);
    const data = dataTransform.unwrapResponse(response);

    return dataTransform.transformConsentFromBackend(data);
  } catch (error) {
    console.error('[consentsApi] Error creating consent:', error);
    throw error;
  }
}

/**
 * Update an existing consent
 */
async function updateConsent(consentId, consentData) {
  try {
    const backendData = dataTransform.transformConsentToBackend(consentData);

    const response = await baseClient.put(`/consents/${consentId}`, backendData);
    const data = dataTransform.unwrapResponse(response);

    return dataTransform.transformConsentFromBackend(data);
  } catch (error) {
    console.error('[consentsApi] Error updating consent:', error);
    throw error;
  }
}

/**
 * Sign a consent electronically (GDPR-compliant)
 * Records IP, user agent, and timestamp for audit trail
 */
async function signConsent(consentId, options = {}) {
  try {
    const { signatureMethod = 'digital' } = options;

    const response = await baseClient.patch(`/consents/${consentId}/sign`, {
      signatureMethod,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });

    const data = dataTransform.unwrapResponse(response);
    return dataTransform.transformConsentFromBackend(data);
  } catch (error) {
    console.error('[consentsApi] Error signing consent:', error);
    throw error;
  }
}

/**
 * Revoke a consent (update status to rejected)
 */
async function revokeConsent(consentId, reason = 'patient_request') {
  try {
    const response = await baseClient.put(`/consents/${consentId}`, {
      status: 'rejected',
      revocation_reason: reason
    });

    const data = dataTransform.unwrapResponse(response);
    return dataTransform.transformConsentFromBackend(data);
  } catch (error) {
    console.error('[consentsApi] Error revoking consent:', error);
    throw error;
  }
}

/**
 * Delete a consent (soft delete)
 */
async function deleteConsent(consentId) {
  try {
    const response = await baseClient.delete(`/consents/${consentId}`);
    return dataTransform.unwrapResponse(response);
  } catch (error) {
    console.error('[consentsApi] Error deleting consent:', error);
    throw error;
  }
}

/**
 * Check if patient has valid consent of a specific type
 */
async function hasValidConsent(patientId, consentType) {
  try {
    const { consents } = await getConsentsByPatient(patientId, { status: 'accepted' });
    return consents.some(consent => consent.type === consentType);
  } catch (error) {
    console.error('[consentsApi] Error checking valid consent:', error);
    return false;
  }
}

/**
 * Get active consents for a patient by type
 */
async function getActiveConsentsByType(patientId, consentType) {
  try {
    const { consents } = await getConsentsByPatient(patientId, { status: 'accepted' });
    return consents.filter(consent => consent.type === consentType);
  } catch (error) {
    console.error('[consentsApi] Error fetching active consents by type:', error);
    throw error;
  }
}

export const consentsApi = {
  getConsents,
  getConsentById,
  getConsentsByPatient,
  getConsentsByAppointment,
  createConsent,
  updateConsent,
  signConsent,
  revokeConsent,
  deleteConsent,
  hasValidConsent,
  getActiveConsentsByType
};
