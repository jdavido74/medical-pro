/**
 * duplicateAppointment.js - Utilities for duplicating appointments
 * Extracts treatment data from a single or linked appointment,
 * serializes/deserializes for mobile navigation query params.
 */

import { getAppointmentGroup } from '../api/planningApi';

/**
 * Extract duplicate data from an appointment (single or linked group).
 * For linked appointments, fetches the group and extracts all treatments.
 */
export const extractDuplicateData = async (appointment) => {
  const isLinked = appointment.isLinked ||
    appointment.linkedAppointmentId ||
    (appointment.linkSequence && appointment.linkSequence > 1);

  if (isLinked) {
    const groupId = appointment.linkedAppointmentId || appointment.id;
    const res = await getAppointmentGroup(groupId);
    if (res.success && res.data) {
      const group = Array.isArray(res.data) ? res.data : (res.data.appointments || []);
      group.sort((a, b) => (a.linkSequence || 0) - (b.linkSequence || 0));

      const treatments = group
        .filter(a => a.service || a.serviceId)
        .map(a => ({
          id: a.serviceId || a.service?.id,
          title: a.title || a.service?.title || '',
          duration: a.duration || a.service?.duration || 30
        }));

      return {
        treatments: treatments.length > 0 ? treatments : [{
          id: appointment.serviceId || appointment.service?.id,
          title: appointment.title || appointment.service?.title || '',
          duration: appointment.duration || appointment.service?.duration || 30
        }],
        patientId: appointment.patientId || appointment.patient?.id,
        patientName: appointment.patient?.fullName || '',
        providerId: appointment.providerId || appointment.provider?.id || ''
      };
    }
  }

  // Single appointment
  return {
    treatments: [{
      id: appointment.serviceId || appointment.service?.id,
      title: appointment.title || appointment.service?.title || '',
      duration: appointment.duration || appointment.service?.duration || 30
    }],
    patientId: appointment.patientId || appointment.patient?.id,
    patientName: appointment.patient?.fullName || '',
    providerId: appointment.providerId || appointment.provider?.id || ''
  };
};

/**
 * Serialize duplicate data into URL search params for mobile navigation.
 */
export const serializeDuplicateParams = (data) => {
  const params = new URLSearchParams();
  params.set('duplicate', '1');
  params.set('patientId', data.patientId || '');
  params.set('patientName', data.patientName || '');
  if (data.providerId) params.set('providerId', data.providerId);
  params.set('treatments', JSON.stringify(data.treatments));
  return params.toString();
};

/**
 * Parse duplicate data from URL search params.
 * Returns null if no duplicate params are present.
 */
export const parseDuplicateParams = (searchParams) => {
  if (searchParams.get('duplicate') !== '1') return null;

  let treatments = [];
  try {
    treatments = JSON.parse(searchParams.get('treatments') || '[]');
  } catch {
    return null;
  }

  if (treatments.length === 0) return null;

  return {
    treatments,
    patientId: searchParams.get('patientId') || '',
    patientName: searchParams.get('patientName') || '',
    providerId: searchParams.get('providerId') || ''
  };
};
