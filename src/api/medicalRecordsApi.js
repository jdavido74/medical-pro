/**
 * Medical Records API Client
 * Handles all medical record-related API calls to the backend
 *
 * Compliance: RGPD, Secret Médical (Art. L1110-4 CSP)
 * - Full audit trail for all access
 * - Permission-based access control
 */

import { baseClient } from './baseClient';
import { dataTransform } from './dataTransform';

/**
 * Get all medical records with pagination and filters
 */
async function getMedicalRecords(options = {}) {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      patientId = null,
      providerId = null,
      recordType = null,
      dateFrom = null,
      dateTo = null,
      archived = false
    } = options;

    const query = { page, limit };

    if (search) query.search = search;
    if (patientId) query.patient_id = patientId;
    if (providerId) query.provider_id = providerId;
    if (recordType) query.record_type = recordType;
    if (dateFrom) query.date_from = dateFrom;
    if (dateTo) query.date_to = dateTo;
    if (archived) query.archived = archived;

    const response = await baseClient.get('/medical-records', { query });

    const recordsData = response.data || [];
    const pagination = response.pagination || {};

    // Transform list of records from backend format to frontend format
    const records = dataTransform.transformMedicalRecordListFromBackend(recordsData);

    return {
      records,
      total: pagination.total || 0,
      page: pagination.page || 1,
      limit: pagination.limit || 20,
      pages: pagination.pages || 1
    };
  } catch (error) {
    console.error('[medicalRecordsApi] Error fetching medical records:', error);
    throw error;
  }
}

/**
 * Get all medical records for a specific patient
 */
async function getPatientMedicalRecords(patientId) {
  try {
    const response = await baseClient.get(`/medical-records/patient/${patientId}`);

    // Backend returns detailed patient history with statistics
    const records = dataTransform.transformMedicalRecordListFromBackend(response.data || []);

    return {
      records,
      statistics: response.statistics || {},
      activeTreatments: response.activeTreatments || [],
      allergies: response.allergies || [],
      byType: response.byType || {}
    };
  } catch (error) {
    console.error('[medicalRecordsApi] Error fetching patient medical records:', error);
    throw error;
  }
}

/**
 * Get medical records statistics
 */
async function getStatistics() {
  try {
    const response = await baseClient.get('/medical-records/statistics');
    return response.data || {};
  } catch (error) {
    console.error('[medicalRecordsApi] Error fetching statistics:', error);
    throw error;
  }
}

/**
 * Get single medical record by ID
 */
async function getMedicalRecordById(recordId) {
  try {
    const response = await baseClient.get(`/medical-records/${recordId}`);
    console.log('[medicalRecordsApi] getMedicalRecordById - raw response:', response);
    const data = dataTransform.unwrapResponse(response);
    console.log('[medicalRecordsApi] getMedicalRecordById - unwrapped data:', data);
    console.log('[medicalRecordsApi] getMedicalRecordById - chief_complaint from data:', data?.chief_complaint);
    const transformed = dataTransform.transformMedicalRecordFromBackend(data);
    console.log('[medicalRecordsApi] getMedicalRecordById - transformed result:', transformed);
    console.log('[medicalRecordsApi] getMedicalRecordById - basicInfo:', transformed?.basicInfo);
    return transformed;
  } catch (error) {
    console.error('[medicalRecordsApi] Error fetching medical record:', error);
    throw error;
  }
}

/**
 * Create a new medical record
 */
async function createMedicalRecord(recordData) {
  try {
    // Transform frontend data to backend format
    const backendData = dataTransform.transformMedicalRecordToBackend(recordData);

    const response = await baseClient.post('/medical-records', backendData);
    const data = dataTransform.unwrapResponse(response);

    // Transform response back to frontend format
    return dataTransform.transformMedicalRecordFromBackend(data);
  } catch (error) {
    console.error('[medicalRecordsApi] Error creating medical record:', error);
    throw error;
  }
}

/**
 * Update an existing medical record
 */
async function updateMedicalRecord(recordId, recordData) {
  try {
    // Transform frontend data to backend format
    const backendData = dataTransform.transformMedicalRecordToBackend(recordData);

    const response = await baseClient.put(`/medical-records/${recordId}`, backendData);
    const data = dataTransform.unwrapResponse(response);

    // Transform response back to frontend format
    return dataTransform.transformMedicalRecordFromBackend(data);
  } catch (error) {
    console.error('[medicalRecordsApi] Error updating medical record:', error);
    throw error;
  }
}

/**
 * Sign and lock a medical record
 */
async function signMedicalRecord(recordId) {
  try {
    const response = await baseClient.post(`/medical-records/${recordId}/sign`);
    const data = dataTransform.unwrapResponse(response);
    return dataTransform.transformMedicalRecordFromBackend(data);
  } catch (error) {
    console.error('[medicalRecordsApi] Error signing medical record:', error);
    throw error;
  }
}

/**
 * Archive a medical record (soft delete)
 */
async function archiveMedicalRecord(recordId) {
  try {
    const response = await baseClient.delete(`/medical-records/${recordId}`);
    return dataTransform.unwrapResponse(response);
  } catch (error) {
    console.error('[medicalRecordsApi] Error archiving medical record:', error);
    throw error;
  }
}

/**
 * Restore an archived medical record
 */
async function restoreMedicalRecord(recordId) {
  try {
    const response = await baseClient.post(`/medical-records/${recordId}/restore`);
    const data = dataTransform.unwrapResponse(response);
    return dataTransform.transformMedicalRecordFromBackend(data);
  } catch (error) {
    console.error('[medicalRecordsApi] Error restoring medical record:', error);
    throw error;
  }
}

export const medicalRecordsApi = {
  getMedicalRecords,
  getPatientMedicalRecords,
  getStatistics,
  getMedicalRecordById,
  createMedicalRecord,
  updateMedicalRecord,
  signMedicalRecord,
  archiveMedicalRecord,
  restoreMedicalRecord
};
