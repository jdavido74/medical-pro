/**
 * Clinic Roles API Client
 * Handles custom role management for the clinic
 */

import { baseClient } from './baseClient';
import { dataTransform } from './dataTransform';

/**
 * Get all clinic roles
 */
async function getClinicRoles(options = {}) {
  try {
    const { page = 1, limit = 100, search = '' } = options;

    const response = await baseClient.get('/clinic-roles', {
      query: {
        page,
        limit,
        search
      }
    });

    const rolesData = response.data || [];
    const pagination = response.pagination || {};

    // Transform list of roles from backend format to frontend format
    const roles = rolesData.map(dataTransform.transformClinicRoleFromBackend);

    return {
      roles,
      total: pagination.total || 0,
      page: pagination.page || 1,
      limit: pagination.limit || 100
    };
  } catch (error) {
    console.error('[clinicRolesApi] Error fetching roles:', error);
    throw error;
  }
}

/**
 * Get single role by ID
 */
async function getClinicRoleById(roleId) {
  try {
    const response = await baseClient.get(`/clinic-roles/${roleId}`);
    const data = dataTransform.unwrapResponse(response);
    return dataTransform.transformClinicRoleFromBackend(data);
  } catch (error) {
    console.error('[clinicRolesApi] Error fetching role:', error);
    throw error;
  }
}

/**
 * Create a new role
 */
async function createClinicRole(roleData) {
  try {
    // Transform frontend data to backend format
    const backendData = dataTransform.transformClinicRoleToBackend(roleData);

    const response = await baseClient.post('/clinic-roles', backendData);
    const data = dataTransform.unwrapResponse(response);

    // Transform response back to frontend format
    return dataTransform.transformClinicRoleFromBackend(data);
  } catch (error) {
    console.error('[clinicRolesApi] Error creating role:', error);
    throw error;
  }
}

/**
 * Update an existing role
 */
async function updateClinicRole(roleId, roleData) {
  try {
    // Transform frontend data to backend format
    const backendData = dataTransform.transformClinicRoleToBackend(roleData);

    // Remove facility_id and is_system_role - they're immutable after creation (backend won't accept them)
    delete backendData.facility_id;
    delete backendData.is_system_role;

    const response = await baseClient.put(`/clinic-roles/${roleId}`, backendData);
    const data = dataTransform.unwrapResponse(response);

    // Transform response back to frontend format
    return dataTransform.transformClinicRoleFromBackend(data);
  } catch (error) {
    console.error('[clinicRolesApi] Error updating role:', error);
    throw error;
  }
}

/**
 * Delete a role (only custom roles, not system roles)
 */
async function deleteClinicRole(roleId) {
  try {
    const response = await baseClient.delete(`/clinic-roles/${roleId}`);
    return dataTransform.unwrapResponse(response);
  } catch (error) {
    console.error('[clinicRolesApi] Error deleting role:', error);
    throw error;
  }
}

export const clinicRolesApi = {
  getClinicRoles,
  getClinicRoleById,
  createClinicRole,
  updateClinicRole,
  deleteClinicRole
};
