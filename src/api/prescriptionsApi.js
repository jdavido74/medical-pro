/**
 * Prescriptions API Client
 * Handles all prescription/ordonnance-related API calls
 */

import { baseClient } from './baseClient';
import { dataTransform } from './dataTransform';

/**
 * Get all prescriptions with optional filters
 */
async function getPrescriptions(options = {}) {
  try {
    const { page = 1, limit = 20, patientId, status, dateFrom, dateTo } = options;

    const response = await baseClient.get('/prescriptions', {
      query: {
        page,
        limit,
        patient_id: patientId,
        status,
        date_from: dateFrom,
        date_to: dateTo
      }
    });

    const data = dataTransform.unwrapResponse(response);
    return {
      prescriptions: (data.data || []).map(transformPrescriptionFromBackend),
      pagination: data.pagination
    };
  } catch (error) {
    console.error('[prescriptionsApi] Error fetching prescriptions:', error);
    throw error;
  }
}

/**
 * Get prescriptions for a specific patient
 */
async function getPatientPrescriptions(patientId) {
  try {
    const response = await baseClient.get(`/prescriptions/patient/${patientId}`);
    const data = dataTransform.unwrapResponse(response);
    return (data.data || []).map(transformPrescriptionFromBackend);
  } catch (error) {
    console.error('[prescriptionsApi] Error fetching patient prescriptions:', error);
    throw error;
  }
}

/**
 * Get prescriptions for a specific medical record
 */
async function getMedicalRecordPrescriptions(medicalRecordId) {
  try {
    const response = await baseClient.get(`/prescriptions/medical-record/${medicalRecordId}`);
    const data = dataTransform.unwrapResponse(response);
    return (data.data || []).map(transformPrescriptionFromBackend);
  } catch (error) {
    console.error('[prescriptionsApi] Error fetching medical record prescriptions:', error);
    throw error;
  }
}

/**
 * Get a single prescription by ID
 */
async function getPrescriptionById(prescriptionId) {
  try {
    const response = await baseClient.get(`/prescriptions/${prescriptionId}`);
    const data = dataTransform.unwrapResponse(response);
    return transformPrescriptionFromBackend(data);
  } catch (error) {
    console.error('[prescriptionsApi] Error fetching prescription:', error);
    throw error;
  }
}

/**
 * Create a new prescription
 */
async function createPrescription(prescriptionData) {
  try {
    const backendData = transformPrescriptionToBackend(prescriptionData);
    const response = await baseClient.post('/prescriptions', backendData);
    const data = dataTransform.unwrapResponse(response);
    return transformPrescriptionFromBackend(data);
  } catch (error) {
    console.error('[prescriptionsApi] Error creating prescription:', error);
    throw error;
  }
}

/**
 * Update an existing prescription
 */
async function updatePrescription(prescriptionId, prescriptionData) {
  try {
    const backendData = transformPrescriptionToBackend(prescriptionData);
    const response = await baseClient.put(`/prescriptions/${prescriptionId}`, backendData);
    const data = dataTransform.unwrapResponse(response);
    return transformPrescriptionFromBackend(data);
  } catch (error) {
    console.error('[prescriptionsApi] Error updating prescription:', error);
    throw error;
  }
}

/**
 * Finalize a prescription (locks it for editing)
 */
async function finalizePrescription(prescriptionId) {
  try {
    const response = await baseClient.post(`/prescriptions/${prescriptionId}/finalize`, {});
    const data = dataTransform.unwrapResponse(response);
    return transformPrescriptionFromBackend(data);
  } catch (error) {
    console.error('[prescriptionsApi] Error finalizing prescription:', error);
    throw error;
  }
}

/**
 * Mark prescription as printed
 */
async function markPrescriptionPrinted(prescriptionId) {
  try {
    const response = await baseClient.post(`/prescriptions/${prescriptionId}/print`, {});
    const data = dataTransform.unwrapResponse(response);
    return transformPrescriptionFromBackend(data);
  } catch (error) {
    console.error('[prescriptionsApi] Error marking prescription printed:', error);
    throw error;
  }
}

/**
 * Cancel a prescription
 */
async function cancelPrescription(prescriptionId) {
  try {
    const response = await baseClient.delete(`/prescriptions/${prescriptionId}`);
    return dataTransform.unwrapResponse(response);
  } catch (error) {
    console.error('[prescriptionsApi] Error cancelling prescription:', error);
    throw error;
  }
}

/**
 * Transform backend prescription to frontend format
 */
function transformPrescriptionFromBackend(prescription) {
  if (!prescription) return null;

  return {
    id: prescription.id,
    patientId: prescription.patient_id,
    providerId: prescription.provider_id,
    medicalRecordId: prescription.medical_record_id,
    facilityId: prescription.facility_id,
    prescriptionNumber: prescription.prescription_number,

    // Medications
    medications: prescription.medications || [],
    instructions: prescription.instructions || '',
    additionalNotes: prescription.additional_notes || '',

    // Dates
    prescribedDate: prescription.prescribed_date,
    validUntil: prescription.valid_until,

    // Renewal
    renewable: prescription.renewable || false,
    renewalsRemaining: prescription.renewals_remaining || 0,

    // Snapshots
    patientSnapshot: prescription.patient_snapshot || {},
    providerSnapshot: prescription.provider_snapshot || {},
    vitalSigns: prescription.vital_signs || {},
    diagnosis: prescription.diagnosis || {},
    basicInfo: prescription.basic_info || null,
    currentIllness: prescription.current_illness || '',
    antecedents: prescription.antecedents || null,
    physicalExam: prescription.physical_exam || null,
    currentMedications: prescription.current_medications || null,

    // Status
    status: prescription.status || 'draft',
    finalizedAt: prescription.finalized_at,
    finalizedBy: prescription.finalized_by,

    // Print tracking
    printCount: prescription.print_count || 0,
    lastPrintedAt: prescription.last_printed_at,

    // Timestamps
    createdAt: prescription.created_at,
    updatedAt: prescription.updated_at
  };
}

/**
 * Transform frontend prescription to backend format
 */
function transformPrescriptionToBackend(prescription) {
  if (!prescription) return null;

  return {
    patient_id: prescription.patientId,
    provider_id: prescription.providerId,
    medical_record_id: prescription.medicalRecordId,
    facility_id: prescription.facilityId,

    // Medications - ensure proper structure
    medications: (prescription.medications || []).map(med => ({
      medication: med.medication || '',
      dosage: med.dosage || '',
      frequency: med.frequency || '',
      route: med.route || 'oral',
      duration: med.duration || '',
      quantity: med.quantity || '',
      instructions: med.instructions || '',
      // CIMA metadata (optional, backward compatible)
      source: med.source || null,
      nregistro: med.nregistro || null,
      atcCode: med.atcCode || null,
      activeIngredients: med.activeIngredients || null,
      pharmaceuticalForm: med.pharmaceuticalForm || null,
      requiresPrescription: med.requiresPrescription || null,
      customMedicationId: med.customMedicationId || null
    })),

    instructions: prescription.instructions || '',
    additional_notes: prescription.additionalNotes || '',

    // Dates
    prescribed_date: prescription.prescribedDate,
    valid_until: prescription.validUntil,

    // Renewal
    renewable: prescription.renewable || false,
    renewals_remaining: prescription.renewalsRemaining || 0,

    // Snapshots
    patient_snapshot: prescription.patientSnapshot || {},
    provider_snapshot: prescription.providerSnapshot || {},
    vital_signs: prescription.vitalSigns || {},
    diagnosis: prescription.diagnosis || {},
    basic_info: prescription.basicInfo || undefined,
    current_illness: prescription.currentIllness || undefined,
    antecedents: prescription.antecedents || undefined,
    physical_exam: prescription.physicalExam || undefined,
    current_medications: prescription.currentMedications || undefined
  };
}

export const prescriptionsApi = {
  getPrescriptions,
  getPatientPrescriptions,
  getMedicalRecordPrescriptions,
  getPrescriptionById,
  createPrescription,
  updatePrescription,
  finalizePrescription,
  markPrescriptionPrinted,
  cancelPrescription,
  transformPrescriptionFromBackend,
  transformPrescriptionToBackend
};
