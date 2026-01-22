/**
 * Healthcare Providers API Client
 * Handles all healthcare provider-related API calls to the backend
 * (praticiens, infirmiers, secrétaires, etc.)
 */

import { baseClient } from './baseClient';
import { dataTransform } from './dataTransform';

/**
 * Get all healthcare providers for the current clinic
 */
async function getHealthcareProviders(options = {}) {
  try {
    const { page = 1, limit = 100, search = '', role, isActive } = options;

    const response = await baseClient.get('/healthcare-providers', {
      query: {
        page,
        limit,
        search,
        role,
        is_active: isActive
      }
    });

    const providersData = response.data || [];
    const pagination = response.pagination || {};

    // Transform list of providers from backend format to frontend format
    const providers = providersData.map(dataTransform.transformHealthcareProviderFromBackend);

    return {
      providers,
      total: pagination.total || 0,
      page: pagination.page || 1,
      limit: pagination.limit || 100
    };
  } catch (error) {
    console.error('[healthcareProvidersApi] Error fetching providers:', error);
    throw error;
  }
}

/**
 * Get single healthcare provider by ID
 */
async function getHealthcareProviderById(providerId) {
  try {
    const response = await baseClient.get(`/healthcare-providers/${providerId}`);
    const data = dataTransform.unwrapResponse(response);
    return dataTransform.transformHealthcareProviderFromBackend(data);
  } catch (error) {
    console.error('[healthcareProvidersApi] Error fetching provider:', error);
    throw error;
  }
}

/**
 * Create a new healthcare provider
 */
async function createHealthcareProvider(providerData) {
  try {
    // Transform frontend data to backend format
    const backendData = dataTransform.transformHealthcareProviderToBackend(providerData);

    const response = await baseClient.post('/healthcare-providers', backendData);
    const data = dataTransform.unwrapResponse(response);

    // Transform response back to frontend format
    return dataTransform.transformHealthcareProviderFromBackend(data);
  } catch (error) {
    console.error('[healthcareProvidersApi] Error creating provider:', error);
    throw error;
  }
}

/**
 * Update an existing healthcare provider
 */
async function updateHealthcareProvider(providerId, providerData) {
  try {
    // Transform frontend data to backend format
    const backendData = dataTransform.transformHealthcareProviderToBackend(providerData);

    // Remove email - it's immutable after creation (backend won't accept it)
    delete backendData.email;

    // Remove facility_id - it comes from auth context, not from the request
    delete backendData.facility_id;

    const response = await baseClient.put(`/healthcare-providers/${providerId}`, backendData);
    const data = dataTransform.unwrapResponse(response);

    // Transform response back to frontend format
    return dataTransform.transformHealthcareProviderFromBackend(data);
  } catch (error) {
    console.error('[healthcareProvidersApi] Error updating provider:', error);
    throw error;
  }
}

/**
 * Get deletion statistics before deleting a provider
 * Returns info about patients, appointments, records that will be affected
 */
async function getDeletionStats(providerId) {
  try {
    const response = await baseClient.get(`/healthcare-providers/${providerId}/deletion-stats`);
    const data = dataTransform.unwrapResponse(response);
    return {
      provider: data.provider ? dataTransform.transformHealthcareProviderFromBackend(data.provider) : null,
      stats: data.stats || {
        futureAppointments: 0,
        patientsAsPrimary: 0,
        pastAppointments: 0,
        medicalRecords: 0
      }
    };
  } catch (error) {
    console.error('[healthcareProvidersApi] Error getting deletion stats:', error);
    throw error;
  }
}

/**
 * Soft delete a healthcare provider with optional reassignment
 * @param providerId - ID of provider to delete
 * @param reassignTo - Optional ID of provider to reassign future appointments and patients to
 */
async function deleteHealthcareProvider(providerId, reassignTo = null) {
  try {
    const response = await baseClient.delete(`/healthcare-providers/${providerId}`, {
      body: reassignTo ? { reassign_to: reassignTo } : undefined
    });
    const data = dataTransform.unwrapResponse(response);

    // Transform response back to frontend format
    return dataTransform.transformHealthcareProviderFromBackend(data);
  } catch (error) {
    console.error('[healthcareProvidersApi] Error deleting provider:', error);
    throw error;
  }
}

/**
 * Restore a soft-deleted healthcare provider
 */
async function restoreHealthcareProvider(providerId) {
  try {
    const response = await baseClient.post(`/healthcare-providers/${providerId}/restore`);
    const data = dataTransform.unwrapResponse(response);
    return dataTransform.transformHealthcareProviderFromBackend(data);
  } catch (error) {
    console.error('[healthcareProvidersApi] Error restoring provider:', error);
    throw error;
  }
}

/**
 * Get list of deleted healthcare providers
 */
async function getDeletedHealthcareProviders() {
  try {
    const response = await baseClient.get('/healthcare-providers/deleted');
    const providersData = response.data || [];
    return providersData.map(dataTransform.transformHealthcareProviderFromBackend);
  } catch (error) {
    console.error('[healthcareProvidersApi] Error fetching deleted providers:', error);
    throw error;
  }
}

/**
 * Resend invitation email to a pending provider
 */
async function resendInvitation(providerId, clinicId) {
  try {
    const response = await baseClient.post('/auth/resend-invitation', {
      providerId,
      clinicId
    });
    return response;
  } catch (error) {
    console.error('[healthcareProvidersApi] Error resending invitation:', error);
    throw error;
  }
}

/**
 * Activate a provider account manually (admin only)
 */
async function activateProvider(providerId) {
  try {
    const response = await baseClient.put(`/healthcare-providers/${providerId}`, {
      account_status: 'active',
      is_active: true
    });
    const data = dataTransform.unwrapResponse(response);
    return dataTransform.transformHealthcareProviderFromBackend(data);
  } catch (error) {
    console.error('[healthcareProvidersApi] Error activating provider:', error);
    throw error;
  }
}

export const healthcareProvidersApi = {
  getHealthcareProviders,
  getHealthcareProviderById,
  createHealthcareProvider,
  updateHealthcareProvider,
  deleteHealthcareProvider,
  getDeletionStats,
  restoreHealthcareProvider,
  getDeletedHealthcareProviders,
  resendInvitation,
  activateProvider
};
