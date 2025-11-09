/**
 * Appointments API Client
 * Handles all appointment-related API calls to the backend
 * - CRUD operations for appointments
 * - Appointment items management (products/services)
 * - Quote generation
 * - Search and filtering
 * - Data transformation between frontend and backend formats
 */

import { baseClient } from './baseClient';
import { dataTransform } from './dataTransform';

/**
 * Get all appointments for the current company
 */
async function getAppointments(options = {}) {
  try {
    const { page = 1, limit = 100, search = '', status = '' } = options;

    const response = await baseClient.get('/appointments', {
      query: {
        page,
        limit,
        search,
        status: status || undefined
      }
    });

    const data = dataTransform.unwrapResponse(response);

    // Transform appointments from backend format
    const appointments = (data.data || []).map(transformAppointmentFromBackend);

    return {
      appointments,
      total: data.total,
      page: data.page,
      limit: data.limit
    };
  } catch (error) {
    console.error('[appointmentsApi] Error fetching appointments:', error);
    throw error;
  }
}

/**
 * Get single appointment by ID
 */
async function getAppointmentById(appointmentId) {
  try {
    const response = await baseClient.get(`/appointments/${appointmentId}`);
    const data = dataTransform.unwrapResponse(response);
    return transformAppointmentFromBackend(data);
  } catch (error) {
    console.error('[appointmentsApi] Error fetching appointment:', error);
    throw error;
  }
}

/**
 * Create a new appointment
 */
async function createAppointment(appointmentData) {
  try {
    const backendData = transformAppointmentToBackend(appointmentData);

    const response = await baseClient.post('/appointments', backendData);
    const data = dataTransform.unwrapResponse(response);

    return transformAppointmentFromBackend(data);
  } catch (error) {
    console.error('[appointmentsApi] Error creating appointment:', error);
    throw error;
  }
}

/**
 * Update an existing appointment
 */
async function updateAppointment(appointmentId, appointmentData) {
  try {
    const backendData = transformAppointmentToBackend(appointmentData);

    const response = await baseClient.put(`/appointments/${appointmentId}`, backendData);
    const data = dataTransform.unwrapResponse(response);

    return transformAppointmentFromBackend(data);
  } catch (error) {
    console.error('[appointmentsApi] Error updating appointment:', error);
    throw error;
  }
}

/**
 * Delete an appointment (soft delete)
 */
async function deleteAppointment(appointmentId) {
  try {
    const response = await baseClient.delete(`/appointments/${appointmentId}`);
    const data = dataTransform.unwrapResponse(response);

    return transformAppointmentFromBackend(data);
  } catch (error) {
    console.error('[appointmentsApi] Error deleting appointment:', error);
    throw error;
  }
}

/**
 * Add items (products/services) to appointment
 */
async function addAppointmentItems(appointmentId, items) {
  try {
    const backendItems = Array.isArray(items) ? items : [items];

    const response = await baseClient.post(`/appointments/${appointmentId}/items`, backendItems);
    const data = dataTransform.unwrapResponse(response);

    return data;
  } catch (error) {
    console.error('[appointmentsApi] Error adding appointment items:', error);
    throw error;
  }
}

/**
 * Get items for an appointment
 */
async function getAppointmentItems(appointmentId) {
  try {
    const response = await baseClient.get(`/appointments/${appointmentId}/items`);
    const data = dataTransform.unwrapResponse(response);

    return data.data || [];
  } catch (error) {
    console.error('[appointmentsApi] Error fetching appointment items:', error);
    throw error;
  }
}

/**
 * Generate a draft quote from appointment items
 */
async function generateQuote(appointmentId) {
  try {
    const response = await baseClient.post(`/appointments/${appointmentId}/generate-quote`, {});
    const data = dataTransform.unwrapResponse(response);

    return data;
  } catch (error) {
    console.error('[appointmentsApi] Error generating quote:', error);
    throw error;
  }
}

/**
 * Transform backend appointment response to frontend format
 * Backend: { id, company_id, patient_id, practitioner_id, start_time, end_time, status, ... }
 * Frontend: { id, patientId, practitionerId, date, startTime, endTime, status, ... }
 */
function transformAppointmentFromBackend(appointment) {
  if (!appointment) return null;

  // Parse date and time from ISO strings
  const startDate = new Date(appointment.start_time);
  const endDate = new Date(appointment.end_time);
  const dateString = startDate.toISOString().split('T')[0]; // YYYY-MM-DD format

  return {
    // Basic info
    id: appointment.id,
    patientId: appointment.patient_id,
    practitionerId: appointment.practitioner_id,
    companyId: appointment.company_id,

    // Date and time
    date: dateString,
    startTime: startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    endTime: endDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    start_time: appointment.start_time, // Keep original for backend sync
    end_time: appointment.end_time,

    // Details
    reason: appointment.reason,
    notes: appointment.notes || {},
    status: appointment.status || 'scheduled',

    // Related data
    patient: appointment.patient,
    practitioner: appointment.practitioner,
    items: appointment.items || [],
    quote: appointment.quote,

    // Timestamps
    createdAt: appointment.created_at,
    updatedAt: appointment.updated_at,
    deletedAt: appointment.deleted_at
  };
}

/**
 * Transform frontend appointment data to backend format for API
 */
function transformAppointmentToBackend(appointment) {
  if (!appointment) return null;

  // Reconstruct ISO datetime strings from date and time
  let startTime, endTime;

  if (appointment.start_time && appointment.end_time) {
    // Already in ISO format
    startTime = appointment.start_time;
    endTime = appointment.end_time;
  } else if (appointment.date && appointment.startTime && appointment.endTime) {
    // Need to combine date with time
    const [startHour, startMin] = appointment.startTime.split(':');
    const [endHour, endMin] = appointment.endTime.split(':');

    startTime = new Date(`${appointment.date}T${startHour}:${startMin}:00`).toISOString();
    endTime = new Date(`${appointment.date}T${endHour}:${endMin}:00`).toISOString();
  }

  return {
    // IDs
    patient_id: appointment.patientId,
    practitioner_id: appointment.practitionerId,

    // Date and time
    start_time: startTime,
    end_time: endTime,

    // Details
    reason: appointment.reason,
    notes: appointment.notes || {},
    status: appointment.status || 'scheduled'
  };
}

export const appointmentsApi = {
  // CRUD operations
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,

  // Items management
  addAppointmentItems,
  getAppointmentItems,

  // Quote generation
  generateQuote,

  // Data transformation
  transformAppointmentFromBackend,
  transformAppointmentToBackend
};
