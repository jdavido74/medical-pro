/**
 * Planning API Client
 * Handles all API calls for the planning module
 */

import { baseClient } from './baseClient';

const ENDPOINT = '/planning';

/**
 * Get available time slots
 * @param {Object} params - Query parameters
 * @param {string} params.date - Date (YYYY-MM-DD)
 * @param {string} params.category - 'treatment' or 'consultation'
 * @param {string} params.treatmentId - Treatment ID (for treatments)
 * @param {string} params.providerId - Provider ID (for consultations)
 * @param {number} params.duration - Duration in minutes
 */
export const getSlots = async (params) => {
  const query = { ...params };
  if (query.allowAfterHours !== undefined) {
    query.allowAfterHours = String(query.allowAfterHours);
  }
  return baseClient.get(`${ENDPOINT}/slots`, { query });
};

/**
 * Get appointments for calendar view
 * @param {Object} params - Query parameters
 * @param {string} params.startDate - Start date (YYYY-MM-DD)
 * @param {string} params.endDate - End date (YYYY-MM-DD)
 * @param {string} params.category - 'treatment', 'consultation', or 'all'
 * @param {string} params.machineId - Filter by machine
 * @param {string} params.providerId - Filter by provider
 * @param {string} params.patientId - Filter by patient
 */
export const getCalendar = async (params) => {
  return baseClient.get(`${ENDPOINT}/calendar`, { query: params });
};

/**
 * Create a new appointment
 * @param {Object} data - Appointment data
 */
export const createAppointment = async (data) => {
  return baseClient.post(`${ENDPOINT}/appointments`, data);
};

/**
 * Get appointment details
 * @param {string} id - Appointment ID
 */
export const getAppointment = async (id) => {
  return baseClient.get(`${ENDPOINT}/appointments/${id}`);
};

/**
 * Update an appointment
 * @param {string} id - Appointment ID
 * @param {Object} data - Updated data
 */
export const updateAppointment = async (id, data) => {
  return baseClient.put(`${ENDPOINT}/appointments/${id}`, data);
};

/**
 * Cancel an appointment
 * @param {string} id - Appointment ID
 */
export const cancelAppointment = async (id) => {
  return baseClient.delete(`${ENDPOINT}/appointments/${id}`);
};

/**
 * Get available resources (machines and providers)
 */
export const getResources = async () => {
  return baseClient.get(`${ENDPOINT}/resources`);
};

/**
 * Get treatments available for booking
 * @param {Object} params - Query parameters
 * @param {string} params.search - Search term for autocomplete
 * @param {string} params.categoryId - Filter by category ID
 */
export const getTreatments = async (params = {}) => {
  return baseClient.get(`${ENDPOINT}/treatments`, { query: params });
};

/**
 * Get available slots for multiple treatments (multi-treatment booking)
 * @param {string} date - Date (YYYY-MM-DD)
 * @param {Array} treatments - Array of { treatmentId, duration }
 */
export const getMultiTreatmentSlots = async (date, treatments, options = {}) => {
  return baseClient.post(`${ENDPOINT}/slots/multi-treatment`, {
    date,
    treatments,
    allowAfterHours: options.allowAfterHours || false
  });
};

/**
 * Create a multi-treatment appointment (linked appointments)
 * @param {Object} data - Appointment data
 * @param {string} data.patientId - Patient ID
 * @param {string} data.date - Date (YYYY-MM-DD)
 * @param {string} data.startTime - Start time (HH:MM)
 * @param {Array} data.treatments - Array of { treatmentId, machineId, duration }
 * @param {string} data.notes - Optional notes
 * @param {string} data.priority - Priority level
 */
export const createMultiTreatmentAppointment = async (data) => {
  return baseClient.post(`${ENDPOINT}/appointments/multi-treatment`, data);
};

/**
 * Get all appointments in a linked group
 * @param {string} groupId - Group ID (parent appointment ID)
 */
export const getAppointmentGroup = async (groupId) => {
  return baseClient.get(`${ENDPOINT}/appointments/group/${groupId}`);
};

/**
 * Update all appointments in a group
 * @param {string} groupId - Group ID (parent appointment ID)
 * @param {Object} data - Update data (date, startTime, notes, priority, status)
 */
export const updateAppointmentGroup = async (groupId, data) => {
  return baseClient.put(`${ENDPOINT}/appointments/group/${groupId}`, data);
};

/**
 * Cancel all appointments in a group
 * @param {string} groupId - Group ID (parent appointment ID)
 */
export const cancelAppointmentGroup = async (groupId) => {
  return baseClient.delete(`${ENDPOINT}/appointments/group/${groupId}`);
};

/**
 * Check provider availability for a given time slot
 * @param {string} providerId - Provider ID
 * @param {Object} params - Query parameters
 * @param {string} params.date - Date (YYYY-MM-DD)
 * @param {string} params.startTime - Start time (HH:MM)
 * @param {string} params.endTime - End time (HH:MM)
 * @param {string} params.excludeAppointmentId - Optional appointment ID to exclude
 */
export const checkProviderAvailability = async (providerId, params) => {
  return baseClient.get(`${ENDPOINT}/providers/${providerId}/check-availability`, { query: params });
};

/**
 * Check if a patient already has appointments overlapping the given time
 * @param {string} patientId - Patient ID
 * @param {Object} params - Query parameters
 * @param {string} params.date - Date (YYYY-MM-DD)
 * @param {string} [params.startTime] - Start time (HH:MM) for single slot
 * @param {string} [params.endTime] - End time (HH:MM) for single slot
 * @param {string} [params.segments] - JSON array of { startTime, endTime } for multi-treatment
 * @param {string} [params.excludeAppointmentIds] - Comma-separated appointment IDs to exclude
 */
export const checkPatientOverlap = async (patientId, params) => {
  return baseClient.get(`${ENDPOINT}/patients/${patientId}/check-overlap`, { query: params });
};

export default {
  getSlots,
  getCalendar,
  createAppointment,
  getAppointment,
  updateAppointment,
  cancelAppointment,
  getResources,
  getTreatments,
  getMultiTreatmentSlots,
  createMultiTreatmentAppointment,
  getAppointmentGroup,
  updateAppointmentGroup,
  cancelAppointmentGroup,
  checkProviderAvailability,
  checkPatientOverlap
};
