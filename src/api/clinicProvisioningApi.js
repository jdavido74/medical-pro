/**
 * Clinic Provisioning API
 * Handles deferred clinic database provisioning
 */

import { baseClient } from './baseClient';

/**
 * Provision clinic database (deferred provisioning)
 * Called after login when clinic_db_provisioned = false
 *
 * @param {string} provisioningToken - Token from login response
 * @returns {Promise<object>} Auth data with tokens after successful provisioning
 */
export async function provisionClinic(provisioningToken) {
  return baseClient.post('/auth/provision-clinic', {
    provisioningToken
  });
}

/**
 * Check provisioning status (for polling if needed)
 * @param {string} companyId - Company ID to check
 * @returns {Promise<object>} Provisioning status
 */
export async function checkProvisioningStatus(companyId) {
  return baseClient.get(`/clinic/provisioning-status/${companyId}`);
}

export default {
  provisionClinic,
  checkProvisioningStatus
};
