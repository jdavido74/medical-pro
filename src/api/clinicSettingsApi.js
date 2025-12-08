/**
 * Clinic Settings API Client
 * Handles clinic configuration: operating hours, slots, closed dates, notifications
 */

import { baseClient } from './baseClient';
import { dataTransform } from './dataTransform';

/**
 * Get clinic settings (creates defaults if doesn't exist)
 */
async function getClinicSettings() {
  try {
    const response = await baseClient.get('/clinic-settings');
    const data = dataTransform.unwrapResponse(response);
    return dataTransform.transformClinicSettingsFromBackend(data);
  } catch (error) {
    console.error('[clinicSettingsApi] Error fetching settings:', error);
    throw error;
  }
}

/**
 * Update clinic settings
 */
async function updateClinicSettings(settingsData) {
  try {
    // Transform frontend data to backend format
    const backendData = dataTransform.transformClinicSettingsToBackend(settingsData);

    const response = await baseClient.put('/clinic-settings', backendData);
    const data = dataTransform.unwrapResponse(response);

    // Transform response back to frontend format
    return dataTransform.transformClinicSettingsFromBackend(data);
  } catch (error) {
    console.error('[clinicSettingsApi] Error updating settings:', error);
    throw error;
  }
}

/**
 * Add a closed date
 */
async function addClosedDate(date, reason, type = 'other') {
  try {
    const response = await baseClient.post('/clinic-settings/closed-dates', {
      date,
      reason,
      type
    });

    return dataTransform.unwrapResponse(response);
  } catch (error) {
    console.error('[clinicSettingsApi] Error adding closed date:', error);
    throw error;
  }
}

/**
 * Remove a closed date
 */
async function removeClosedDate(dateId) {
  try {
    const response = await baseClient.delete(`/clinic-settings/closed-dates/${dateId}`);
    return dataTransform.unwrapResponse(response);
  } catch (error) {
    console.error('[clinicSettingsApi] Error removing closed date:', error);
    throw error;
  }
}

export const clinicSettingsApi = {
  getClinicSettings,
  updateClinicSettings,
  addClosedDate,
  removeClosedDate
};
