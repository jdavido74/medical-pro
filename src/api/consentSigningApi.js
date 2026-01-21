/**
 * API client for consent signing operations
 * Version 2.0: With dataTransform integration
 */

import { baseClient } from './baseClient';
import { dataTransform } from './dataTransform';

const consentSigningApi = {
  /**
   * Create a new consent signing request
   * @param {Object} data - Request data
   * @param {string} data.patientId - Patient UUID
   * @param {string} data.consentTemplateId - Consent template UUID
   * @param {string} [data.appointmentId] - Optional appointment UUID
   * @param {string} [data.sentVia] - Delivery method: 'email', 'sms', 'tablet', 'link'
   * @param {string} [data.recipientEmail] - Override email address
   * @param {string} [data.languageCode] - Language code: 'fr', 'en', 'es'
   * @param {string} [data.customMessage] - Custom message to include
   * @param {number} [data.expiresInHours] - Expiration time in hours (default: 48)
   */
  createRequest: async (data) => {
    try {
      const backendData = dataTransform.transformConsentSigningRequestToBackend(data);
      const response = await baseClient.post('/consent-signing', backendData);
      const result = dataTransform.unwrapResponse(response);
      return dataTransform.transformConsentSigningRequestFromBackend(result);
    } catch (error) {
      console.error('[consentSigningApi] Error creating request:', error);
      throw error;
    }
  },

  /**
   * Get all signing requests (with optional filters)
   * @param {Object} [params] - Query parameters
   * @param {string} [params.patientId] - Filter by patient
   * @param {string} [params.appointmentId] - Filter by appointment
   * @param {string} [params.status] - Filter by status
   */
  getRequests: async (params = {}) => {
    try {
      const response = await baseClient.get('/consent-signing', { query: params });
      const data = response.data || response;
      return {
        requests: dataTransform.transformConsentSigningRequestListFromBackend(data),
        pagination: response.pagination
      };
    } catch (error) {
      console.error('[consentSigningApi] Error fetching requests:', error);
      throw error;
    }
  },

  /**
   * Get signing requests for a specific patient
   * @param {string} patientId - Patient UUID
   * @param {string} [status] - Optional status filter
   */
  getPatientRequests: async (patientId, status) => {
    try {
      const query = status ? { status } : {};
      const response = await baseClient.get(`/consent-signing/patient/${patientId}`, { query });
      const data = response.data || response;
      return {
        requests: dataTransform.transformConsentSigningRequestListFromBackend(data),
        count: response.count
      };
    } catch (error) {
      console.error('[consentSigningApi] Error fetching patient requests:', error);
      throw error;
    }
  },

  /**
   * Get signing requests for a specific appointment
   * @param {string} appointmentId - Appointment UUID
   */
  getAppointmentRequests: async (appointmentId) => {
    try {
      const response = await baseClient.get(`/consent-signing/appointment/${appointmentId}`);
      const data = response.data || response;
      return {
        requests: dataTransform.transformConsentSigningRequestListFromBackend(data)
      };
    } catch (error) {
      console.error('[consentSigningApi] Error fetching appointment requests:', error);
      throw error;
    }
  },

  /**
   * Get a single signing request
   * @param {string} id - Request UUID
   */
  getRequest: async (id) => {
    try {
      const response = await baseClient.get(`/consent-signing/${id}`);
      const result = dataTransform.unwrapResponse(response);
      return dataTransform.transformConsentSigningRequestFromBackend(result);
    } catch (error) {
      console.error('[consentSigningApi] Error fetching request:', error);
      throw error;
    }
  },

  /**
   * Cancel a signing request
   * @param {string} id - Request UUID
   */
  cancelRequest: async (id) => {
    try {
      const response = await baseClient.patch(`/consent-signing/${id}/cancel`);
      const result = dataTransform.unwrapResponse(response);
      return dataTransform.transformConsentSigningRequestFromBackend(result);
    } catch (error) {
      console.error('[consentSigningApi] Error cancelling request:', error);
      throw error;
    }
  },

  /**
   * Send reminder for a signing request
   * @param {string} id - Request UUID
   */
  sendReminder: async (id) => {
    try {
      const response = await baseClient.post(`/consent-signing/${id}/remind`);
      const result = dataTransform.unwrapResponse(response);
      return dataTransform.transformConsentSigningRequestFromBackend(result);
    } catch (error) {
      console.error('[consentSigningApi] Error sending reminder:', error);
      throw error;
    }
  },

  /**
   * Delete a signing request
   * @param {string} id - Request UUID
   */
  deleteRequest: async (id) => {
    try {
      await baseClient.delete(`/consent-signing/${id}`);
      return { success: true };
    } catch (error) {
      console.error('[consentSigningApi] Error deleting request:', error);
      throw error;
    }
  }
};

export { consentSigningApi };
