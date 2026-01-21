/**
 * Practitioner Availability API Client
 * Handles all availability-related API calls to the backend
 * (weekly availability, templates, available slots)
 */

import { baseClient } from './baseClient';

/**
 * Get availability for a specific provider and week
 * Returns specific entry if exists, otherwise template or default
 * @param {string} providerId - Provider UUID
 * @param {number} year - Calendar year (e.g., 2025)
 * @param {number} week - ISO week number (1-53)
 * @returns {Promise<Object>}
 */
async function getWeekAvailability(providerId, year, week) {
  try {
    const response = await baseClient.get(`/availability/${providerId}/week/${year}/${week}`);
    return response.data;
  } catch (error) {
    console.error('[availabilityApi] Error fetching week availability:', error);
    throw error;
  }
}

/**
 * Save availability for a specific week
 * @param {string} providerId - Provider UUID
 * @param {number} year - Calendar year
 * @param {number} week - ISO week number
 * @param {Object} availability - Availability structure with days and slots
 * @param {string} notes - Optional notes
 * @returns {Promise<Object>}
 */
async function saveWeekAvailability(providerId, year, week, availability, notes = null) {
  try {
    const response = await baseClient.put(`/availability/${providerId}/week/${year}/${week}`, {
      availability,
      notes
    });
    return response.data;
  } catch (error) {
    console.error('[availabilityApi] Error saving week availability:', error);
    throw error;
  }
}

/**
 * Copy availability from one week to another
 * @param {string} providerId - Provider UUID
 * @param {number} targetYear - Target year
 * @param {number} targetWeek - Target week
 * @param {number} sourceYear - Source year
 * @param {number} sourceWeek - Source week
 * @returns {Promise<Object>}
 */
async function copyFromWeek(providerId, targetYear, targetWeek, sourceYear, sourceWeek) {
  try {
    const response = await baseClient.post(
      `/availability/${providerId}/week/${targetYear}/${targetWeek}/copy-from/${sourceYear}/${sourceWeek}`
    );
    return response.data;
  } catch (error) {
    console.error('[availabilityApi] Error copying week availability:', error);
    throw error;
  }
}

/**
 * Copy availability from the previous week
 * @param {string} providerId - Provider UUID
 * @param {number} year - Target year
 * @param {number} week - Target week number
 * @returns {Promise<Object>}
 */
async function copyFromPreviousWeek(providerId, year, week) {
  // Calculate previous week
  let sourceYear = year;
  let sourceWeek = week - 1;

  if (sourceWeek < 1) {
    // Go to previous year, week 52 or 53
    sourceYear = year - 1;
    sourceWeek = getWeeksInYear(sourceYear);
  }

  return copyFromWeek(providerId, year, week, sourceYear, sourceWeek);
}

/**
 * Get provider's default template
 * @param {string} providerId - Provider UUID
 * @returns {Promise<Object>}
 */
async function getTemplate(providerId) {
  try {
    const response = await baseClient.get(`/availability/${providerId}/template`);
    return response.data.template;
  } catch (error) {
    console.error('[availabilityApi] Error fetching template:', error);
    throw error;
  }
}

/**
 * Save provider's default template
 * @param {string} providerId - Provider UUID
 * @param {Object} availability - Template availability structure
 * @returns {Promise<Object>}
 */
async function saveTemplate(providerId, availability) {
  try {
    const response = await baseClient.put(`/availability/${providerId}/template`, {
      availability
    });
    return response.data.template;
  } catch (error) {
    console.error('[availabilityApi] Error saving template:', error);
    throw error;
  }
}

/**
 * Apply template to a specific week
 * @param {string} providerId - Provider UUID
 * @param {number} year - Target year
 * @param {number} week - Target week
 * @returns {Promise<Object>}
 */
async function applyTemplate(providerId, year, week) {
  try {
    const response = await baseClient.post(`/availability/${providerId}/apply-template/${year}/${week}`);
    return response.data;
  } catch (error) {
    console.error('[availabilityApi] Error applying template:', error);
    throw error;
  }
}

/**
 * Get available appointment slots for a specific date
 * @param {string} providerId - Provider UUID
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {number} duration - Slot duration in minutes (default: 30)
 * @returns {Promise<Object>}
 */
async function getAvailableSlots(providerId, date, duration = 30) {
  try {
    const response = await baseClient.get('/availability/slots', {
      query: {
        providerId,
        date,
        duration
      }
    });
    return response;
  } catch (error) {
    console.error('[availabilityApi] Error fetching available slots:', error);
    throw error;
  }
}

/**
 * Get effective availability for a specific day (intersected with clinic hours)
 * @param {string} providerId - Provider UUID
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Object>}
 */
async function getEffectiveAvailability(providerId, date) {
  try {
    const response = await baseClient.get(`/availability/${providerId}/effective/${date}`);
    return response.data;
  } catch (error) {
    console.error('[availabilityApi] Error fetching effective availability:', error);
    throw error;
  }
}

/**
 * Delete a specific week's availability (reverts to template)
 * @param {string} providerId - Provider UUID
 * @param {number} year - Year
 * @param {number} week - Week number
 * @returns {Promise<void>}
 */
async function deleteWeekAvailability(providerId, year, week) {
  try {
    await baseClient.delete(`/availability/${providerId}/week/${year}/${week}`);
  } catch (error) {
    console.error('[availabilityApi] Error deleting week availability:', error);
    throw error;
  }
}

// Helper functions

/**
 * Get ISO week number for a date
 * @param {Date} date
 * @returns {number}
 */
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Get year and week number for a date
 * @param {Date} date
 * @returns {{ year: number, week: number }}
 */
function getYearAndWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

/**
 * Get number of weeks in a year (52 or 53)
 * @param {number} year
 * @returns {number}
 */
function getWeeksInYear(year) {
  const dec31 = new Date(year, 11, 31);
  const weekInfo = getYearAndWeek(dec31);
  // If Dec 31 is in week 1 of next year, the year has 52 weeks
  if (weekInfo.year > year) {
    return 52;
  }
  return weekInfo.week;
}

/**
 * Get first day (Monday) of an ISO week
 * @param {number} year
 * @param {number} week
 * @returns {Date}
 */
function getFirstDayOfWeek(year, week) {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);
  return monday;
}

/**
 * Get all days of an ISO week
 * @param {number} year
 * @param {number} week
 * @returns {Date[]} Array of 7 dates (Monday to Sunday)
 */
function getWeekDays(year, week) {
  const monday = getFirstDayOfWeek(year, week);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    days.push(day);
  }
  return days;
}

// Default availability structure
const DEFAULT_AVAILABILITY = {
  monday: { enabled: true, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
  tuesday: { enabled: true, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
  wednesday: { enabled: true, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
  thursday: { enabled: true, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
  friday: { enabled: true, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
  saturday: { enabled: false, slots: [] },
  sunday: { enabled: false, slots: [] }
};

export const practitionerAvailabilityApi = {
  // Main API methods
  getWeekAvailability,
  saveWeekAvailability,
  copyFromWeek,
  copyFromPreviousWeek,
  getTemplate,
  saveTemplate,
  applyTemplate,
  getAvailableSlots,
  getEffectiveAvailability,
  deleteWeekAvailability,

  // Helper utilities
  getISOWeek,
  getYearAndWeek,
  getWeeksInYear,
  getFirstDayOfWeek,
  getWeekDays,
  DEFAULT_AVAILABILITY
};

export default practitionerAvailabilityApi;
