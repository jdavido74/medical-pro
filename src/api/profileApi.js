/**
 * Profile API Client
 * Handles user profile updates (both central and clinic databases)
 */

import { baseClient } from './baseClient';
import { dataTransform } from './dataTransform';

/**
 * Update current user profile
 * Updates BOTH central database (users) AND clinic database (healthcare_providers)
 *
 * @param {Object} profileData - Profile data to update
 * @param {string} [profileData.firstName] - First name
 * @param {string} [profileData.lastName] - Last name
 * @param {string} [profileData.email] - Email address
 * @returns {Promise<Object>} Updated profile data from both databases
 */
async function updateProfile(profileData) {
  try {
    // Transform to backend format (camelCase → snake_case)
    const backendData = {};

    if (profileData.firstName !== undefined) {
      backendData.first_name = profileData.firstName?.trim();
    }

    if (profileData.lastName !== undefined) {
      backendData.last_name = profileData.lastName?.trim();
    }

    if (profileData.email !== undefined) {
      backendData.email = profileData.email?.trim().toLowerCase();
    }

    const response = await baseClient.put('/profile', backendData);
    const data = dataTransform.unwrapResponse(response);

    // Return both central and clinic data
    return {
      central: data.central,
      clinic: data.clinic
    };
  } catch (error) {
    console.error('[profileApi] Error updating profile:', error);
    throw error;
  }
}

export const profileApi = {
  updateProfile
};
