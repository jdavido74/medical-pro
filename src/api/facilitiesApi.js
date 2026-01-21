/**
 * Facilities API Client
 * Handles medical facility profile (company settings)
 */

import { baseClient } from './baseClient';
import { dataTransform } from './dataTransform';

/**
 * Get current facility info (company profile)
 */
async function getCurrentFacility() {
  try {
    const response = await baseClient.get('/facilities/current');
    const data = dataTransform.unwrapResponse(response);
    return dataTransform.transformFacilityFromBackend(data);
  } catch (error) {
    console.error('[facilitiesApi] Error fetching facility:', error);
    throw error;
  }
}

/**
 * Update current facility (company profile)
 */
async function updateCurrentFacility(facilityData) {
  try {
    // Transform frontend data to backend format
    const backendData = dataTransform.transformFacilityToBackend(facilityData);

    const response = await baseClient.put('/facilities/current', backendData);
    const data = dataTransform.unwrapResponse(response);

    // Transform response back to frontend format
    return dataTransform.transformFacilityFromBackend(data);
  } catch (error) {
    console.error('[facilitiesApi] Error updating facility:', error);
    throw error;
  }
}

export const facilitiesApi = {
  getCurrentFacility,
  updateCurrentFacility
};
