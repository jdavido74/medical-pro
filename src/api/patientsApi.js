/**
 * Patients API Client
 * Handles all patient-related API calls to the backend
 * - CRUD operations for patients
 * - Search and filtering
 * - Data transformation between frontend and backend formats
 */

import { baseClient } from './baseClient';
import { dataTransform } from './dataTransform';

/**
 * Get all patients for the current company
 */
async function getPatients(options = {}) {
  try {
    const { page = 1, limit = 100, search = '' } = options;

    const response = await baseClient.get('/patients', {
      query: {
        page,
        limit,
        search
      }
    });

    // Backend returns: { success: true, data: [...patients...], pagination: {...} }
    // Don't unwrap to keep access to pagination
    const patientsData = response.data || [];
    const pagination = response.pagination || {};

    // Transform list of patients from backend format to frontend format
    const patients = dataTransform.transformPatientListFromBackend(patientsData);

    return {
      patients,
      total: pagination.total || 0,
      page: pagination.page || 1,
      limit: pagination.limit || 100
    };
  } catch (error) {
    console.error('[patientsApi] Error fetching patients:', error);
    throw error;
  }
}

/**
 * Get single patient by ID
 */
async function getPatientById(patientId) {
  try {
    const response = await baseClient.get(`/patients/${patientId}`);
    const data = dataTransform.unwrapResponse(response);
    return dataTransform.transformPatientFromBackend(data);
  } catch (error) {
    console.error('[patientsApi] Error fetching patient:', error);
    throw error;
  }
}

/**
 * Create a new patient
 */
async function createPatient(patientData) {
  try {
    // Transform frontend data to backend format
    const backendData = dataTransform.transformPatientToBackend(patientData);

    const response = await baseClient.post('/patients', backendData);
    const data = dataTransform.unwrapResponse(response);

    // Transform response back to frontend format
    return dataTransform.transformPatientFromBackend(data);
  } catch (error) {
    console.error('[patientsApi] Error creating patient:', error);
    throw error;
  }
}

/**
 * Update an existing patient
 */
async function updatePatient(patientId, patientData) {
  try {
    // Transform frontend data to backend format
    const backendData = dataTransform.transformPatientToBackend(patientData);

    const response = await baseClient.put(`/patients/${patientId}`, backendData);
    const data = dataTransform.unwrapResponse(response);

    // Transform response back to frontend format
    return dataTransform.transformPatientFromBackend(data);
  } catch (error) {
    console.error('[patientsApi] Error updating patient:', error);
    throw error;
  }
}

/**
 * Delete a patient (soft delete)
 */
async function deletePatient(patientId) {
  try {
    const response = await baseClient.delete(`/patients/${patientId}`);
    const data = dataTransform.unwrapResponse(response);

    // Transform response back to frontend format
    return dataTransform.transformPatientFromBackend(data);
  } catch (error) {
    console.error('[patientsApi] Error deleting patient:', error);
    throw error;
  }
}

/**
 * Search patients (server-side search)
 */
async function searchPatients(query, options = {}) {
  try {
    const { page = 1, limit = 20 } = options;

    const response = await baseClient.get('/patients/search', {
      query: {
        q: query,
        page,
        limit
      }
    });

    const data = dataTransform.unwrapResponse(response);
    const patients = dataTransform.transformPatientListFromBackend(data.data || []);

    return {
      patients,
      total: data.total,
      page: data.page,
      limit: data.limit
    };
  } catch (error) {
    console.error('[patientsApi] Error searching patients:', error);
    throw error;
  }
}

/**
 * Check if patient exists (by email or name)
 * Used for duplicate detection
 */
async function checkPatientExists(firstName, lastName, email) {
  try {
    const response = await baseClient.post('/patients/check-duplicate', {
      first_name: firstName,
      last_name: lastName,
      email
    });

    return dataTransform.unwrapResponse(response);
  } catch (error) {
    console.error('[patientsApi] Error checking patient existence:', error);
    throw error;
  }
}

/**
 * Get patient statistics for current company
 */
async function getPatientStatistics() {
  try {
    const response = await baseClient.get('/patients/statistics');
    return dataTransform.unwrapResponse(response);
  } catch (error) {
    console.error('[patientsApi] Error fetching patient statistics:', error);
    throw error;
  }
}

export const patientsApi = {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
  searchPatients,
  checkPatientExists,
  getPatientStatistics
};
