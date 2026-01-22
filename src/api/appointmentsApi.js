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

    // Backend returns: { success: true, data: [...], pagination: {...} }
    // unwrapResponse returns response.data if it exists
    const unwrapped = dataTransform.unwrapResponse(response);

    // Handle both cases: unwrapped is the array OR unwrapped is { data: [...], pagination: {...} }
    const appointmentsData = Array.isArray(unwrapped) ? unwrapped : (unwrapped.data || []);
    const pagination = Array.isArray(unwrapped) ? response.pagination : unwrapped.pagination;

    // Transform appointments from backend format
    const appointments = appointmentsData.map(transformAppointmentFromBackend);

    return {
      appointments,
      total: pagination?.total || response.pagination?.total || appointments.length,
      page: pagination?.page || response.pagination?.page || 1,
      limit: pagination?.limit || response.pagination?.limit || 100
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
 * Backend: { id, facility_id, patient_id, provider_id, appointment_date, start_time (TIME), end_time (TIME), type, ... }
 * Frontend: { id, patientId, practitionerId, date, startTime, endTime, type, title, ... }
 */
function transformAppointmentFromBackend(appointment) {
  if (!appointment) return null;

  // Format time from HH:MM:SS to HH:MM for frontend
  const formatTimeForFrontend = (time) => {
    if (!time) return '';
    // If already in HH:MM format, return as is
    if (/^\d{2}:\d{2}$/.test(time)) return time;
    // If in HH:MM:SS format, remove seconds
    if (/^\d{2}:\d{2}:\d{2}$/.test(time)) return time.substring(0, 5);
    return time;
  };

  return {
    // Basic info
    id: appointment.id,
    patientId: appointment.patient_id,
    practitionerId: appointment.provider_id,  // IMPORTANT: provider_id from DB
    facilityId: appointment.facility_id,
    companyId: appointment.company_id,

    // Date and time (SEPARATE fields from DB)
    date: appointment.appointment_date,       // Already in YYYY-MM-DD format
    startTime: formatTimeForFrontend(appointment.start_time),  // HH:MM
    endTime: formatTimeForFrontend(appointment.end_time),      // HH:MM
    duration: appointment.duration_minutes,

    // Type
    type: appointment.type,

    // Details
    title: appointment.title || appointment.reason,  // Use title if available, fallback to reason
    reason: appointment.reason,
    description: appointment.description || '',
    notes: appointment.notes || '',

    // Priority
    priority: appointment.priority || 'normal',

    // Location
    location: appointment.location || '',

    // Status
    status: appointment.status || 'scheduled',

    // Reminders configuration
    reminders: appointment.reminders || {
      patient: { enabled: true, beforeMinutes: 1440 },
      practitioner: { enabled: true, beforeMinutes: 30 }
    },

    // Additional slots (for multi-slot appointments)
    additionalSlots: appointment.additional_slots || [],

    // Additional fields
    isTeleconsultation: appointment.is_teleconsultation || false,
    meetingLink: appointment.meeting_link,
    consultationFee: appointment.consultation_fee,
    insuranceCovered: appointment.insurance_covered,

    // Reminder info
    reminderSent: appointment.reminder_sent,
    reminderSentAt: appointment.reminder_sent_at,

    // Confirmation info
    confirmationRequired: appointment.confirmation_required,
    confirmedAt: appointment.confirmed_at,
    confirmedBy: appointment.confirmed_by,

    // Related data
    patient: appointment.patient,
    practitioner: appointment.healthcare_provider || appointment.provider,  // Handle both field names
    items: appointment.items || [],
    quote: appointment.quote,

    // Timestamps
    createdAt: appointment.created_at,
    updatedAt: appointment.updated_at
  };
}

/**
 * Transform frontend appointment data to backend format for API
 * Frontend: { patientId, practitionerId, date, startTime, endTime, type, title, ... }
 * Backend: { patient_id, provider_id, appointment_date, start_time (TIME), end_time (TIME), type, reason, ... }
 */
function transformAppointmentToBackend(appointment) {
  if (!appointment) return null;

  // Format time to HH:MM:SS if needed
  const formatTime = (time) => {
    if (!time) return null;
    // If already in HH:MM:SS format, return as is
    if (/^\d{2}:\d{2}:\d{2}$/.test(time)) return time;
    // If in HH:MM format, add :00
    if (/^\d{2}:\d{2}$/.test(time)) return `${time}:00`;
    return time;
  };

  return {
    // Facility ID - let backend determine from clinic database if not provided
    ...(appointment.facilityId && { facility_id: appointment.facilityId }),

    // IDs (IMPORTANT: provider_id NOT practitioner_id!)
    patient_id: appointment.patientId,
    provider_id: appointment.practitionerId,  // Maps to healthcare_providers table

    // Date and time (SEPARATE fields, not ISO timestamp!)
    appointment_date: appointment.date,       // DATEONLY: YYYY-MM-DD
    start_time: formatTime(appointment.startTime),  // TIME: HH:MM:SS
    end_time: formatTime(appointment.endTime),      // TIME: HH:MM:SS

    // Duration
    duration_minutes: appointment.duration || appointment.duration_minutes,

    // Type (REQUIRED in DB)
    type: appointment.type || 'consultation',

    // Details
    ...(appointment.title && { title: appointment.title }),
    ...(appointment.reason || appointment.title ? { reason: appointment.reason || appointment.title } : {}),
    ...(appointment.description && { description: appointment.description }),
    ...(typeof appointment.notes === 'string' && appointment.notes ? { notes: appointment.notes } : {}),

    // Priority
    priority: appointment.priority || 'normal',

    // Location
    ...(appointment.location && { location: appointment.location }),

    // Status
    status: appointment.status || 'scheduled',

    // Reminders configuration (JSONB) - only send if valid object
    ...(appointment.reminders && typeof appointment.reminders === 'object' && { reminders: appointment.reminders }),

    // Additional slots (for multi-slot appointments)
    ...(appointment.additionalSlots && appointment.additionalSlots.length > 0 && { additional_slots: appointment.additionalSlots }),

    // Additional fields if provided
    is_teleconsultation: Boolean(appointment.isTeleconsultation),
    ...(appointment.meetingLink && { meeting_link: appointment.meetingLink }),
    ...(appointment.consultationFee != null && !isNaN(Number(appointment.consultationFee)) && { consultation_fee: Number(appointment.consultationFee) }),
    insurance_covered: appointment.insuranceCovered != null ? Boolean(appointment.insuranceCovered) : true
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
