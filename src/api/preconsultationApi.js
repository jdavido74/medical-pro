/**
 * Pre-consultation API Client
 *
 * Two sections:
 * 1. Public routes (no auth, token in URL) — used by patient portal
 * 2. Staff routes (authenticated via baseClient) — used by dashboard
 */

import { baseClient } from './baseClient';

const API_BASE = process.env.REACT_APP_API_BASE_URL || '/api/v1';

// ─── Helpers ─────────────────────────────────────────────────

async function publicFetch(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body?.error?.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.data = body;
    throw error;
  }

  return response.json();
}

// ─── Public Routes (Patient Portal) ─────────────────────────

/**
 * Get preconsultation data by token
 */
export async function getPreconsultationByToken(token) {
  const res = await publicFetch(`/public-preconsultation/${token}`);
  return res.data;
}

/**
 * Update patient info
 */
export async function submitPatientInfo(token, patientData) {
  const res = await publicFetch(`/public-preconsultation/${token}/patient-info`, {
    method: 'PUT',
    body: JSON.stringify(patientData)
  });
  return res.data;
}

/**
 * Upload a document (multipart/form-data)
 */
export async function uploadDocument(token, file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/public-preconsultation/${token}/documents`, {
    method: 'POST',
    body: formData
    // No Content-Type header — browser sets multipart boundary automatically
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body?.error?.message || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const res = await response.json();
  return res.data;
}

/**
 * List uploaded documents
 */
export async function getDocuments(token) {
  const res = await publicFetch(`/public-preconsultation/${token}/documents`);
  return res.data;
}

/**
 * Get document file as blob URL (for preview/download)
 */
export async function getDocumentFile(token, docId) {
  const response = await fetch(`${API_BASE}/public-preconsultation/${token}/documents/${docId}/file`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const blob = await response.blob();
  return { blob, url: URL.createObjectURL(blob), type: response.headers.get('Content-Type') };
}

/**
 * Delete a document
 */
export async function deleteDocument(token, docId) {
  return publicFetch(`/public-preconsultation/${token}/documents/${docId}`, { method: 'DELETE' });
}

/**
 * Confirm the appointment
 */
export async function confirmAppointment(token) {
  const res = await publicFetch(`/public-preconsultation/${token}/confirm`, { method: 'POST' });
  return res.data;
}

/**
 * Cancel the appointment
 */
export async function cancelAppointment(token) {
  const res = await publicFetch(`/public-preconsultation/${token}/cancel`, { method: 'POST' });
  return res.data;
}

/**
 * Request appointment modification
 */
export async function requestModification(token) {
  const res = await publicFetch(`/public-preconsultation/${token}/request-modification`, { method: 'POST' });
  return res.data;
}

/**
 * Select a date from proposed dates
 */
export async function selectDate(token, selectedDate) {
  const res = await publicFetch(`/public-preconsultation/${token}/select-date`, {
    method: 'POST',
    body: JSON.stringify({ selected_date: selectedDate })
  });
  return res.data;
}

/**
 * Get quote details
 */
export async function getQuote(token) {
  const res = await publicFetch(`/public-preconsultation/${token}/quote`);
  return res.data;
}

/**
 * Accept the quote
 */
export async function acceptQuote(token) {
  const res = await publicFetch(`/public-preconsultation/${token}/quote/accept`, { method: 'POST' });
  return res.data;
}

/**
 * Reject the quote
 */
export async function rejectQuote(token) {
  const res = await publicFetch(`/public-preconsultation/${token}/quote/reject`, { method: 'POST' });
  return res.data;
}

// ─── Staff Routes (Authenticated) ───────────────────────────

/**
 * Send preconsultation link to patient
 */
export async function sendPreconsultationLink(appointmentId, language = 'es', expiresInDays = 30) {
  return baseClient.post(`/preconsultation/appointments/${appointmentId}/send-preconsultation`, {
    language,
    expires_in_days: expiresInDays
  });
}

/**
 * Send reminder email
 */
export async function sendReminder(appointmentId) {
  return baseClient.post(`/preconsultation/appointments/${appointmentId}/send-reminder`);
}

/**
 * Propose alternative dates to patient
 */
export async function proposeDates(appointmentId, dates) {
  return baseClient.post(`/preconsultation/appointments/${appointmentId}/propose-dates`, { dates });
}

/**
 * Send quote to patient for validation
 */
export async function sendQuoteToPatient(appointmentId, quoteId) {
  return baseClient.post(`/preconsultation/appointments/${appointmentId}/send-quote`, { quote_id: quoteId });
}

/**
 * Get preconsultation status for an appointment
 */
export async function getPreconsultationStatus(appointmentId) {
  return baseClient.get(`/preconsultation/appointments/${appointmentId}/preconsultation-status`);
}

/**
 * Get patient documents list (staff view)
 */
export async function getPatientDocuments(patientId) {
  return baseClient.get(`/patient-documents/patients/${patientId}/documents`);
}

/**
 * Get patient document file (staff view) — returns blob URL
 */
export async function getPatientDocumentFile(patientId, docId) {
  const token = baseClient.getAuthToken();
  const response = await fetch(`${API_BASE}/patient-documents/patients/${patientId}/documents/${docId}/file`, {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    credentials: 'include'
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const blob = await response.blob();
  return { blob, url: URL.createObjectURL(blob), type: response.headers.get('Content-Type') };
}

/**
 * Delete a patient document (staff)
 */
export async function deletePatientDocument(patientId, docId) {
  return baseClient.delete(`/patient-documents/patients/${patientId}/documents/${docId}`);
}

/**
 * Link document to medical record
 */
export async function linkDocumentToRecord(patientId, docId, medicalRecordId) {
  return baseClient.patch(`/patient-documents/patients/${patientId}/documents/${docId}/link-record`, {
    medical_record_id: medicalRecordId
  });
}

// Default export for convenience
const preconsultationApi = {
  // Public
  getPreconsultationByToken,
  submitPatientInfo,
  uploadDocument,
  getDocuments,
  getDocumentFile,
  deleteDocument,
  confirmAppointment,
  cancelAppointment,
  requestModification,
  selectDate,
  getQuote,
  acceptQuote,
  rejectQuote,
  // Staff
  sendPreconsultationLink,
  sendReminder,
  proposeDates,
  sendQuoteToPatient,
  getPreconsultationStatus,
  getPatientDocuments,
  getPatientDocumentFile,
  deletePatientDocument,
  linkDocumentToRecord
};

export default preconsultationApi;
