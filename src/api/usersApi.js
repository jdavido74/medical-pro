/**
 * Users API Client
 * Handles all user management API calls to the backend
 * Version 2.0: With centralized dataTransform
 * - CRUD operations for clinic users
 * - User statistics
 * - Password management
 */

import { baseClient } from './baseClient';
import { dataTransform } from './dataTransform';

/**
 * Get all users with optional filters
 */
async function getUsers(options = {}) {
  try {
    const { page = 1, limit = 100, search = '', role, department, isActive } = options;

    const query = { page, limit };
    if (search) query.search = search;
    if (role) query.role = role;
    if (department) query.department = department;
    if (isActive !== undefined) query.isActive = String(isActive);

    const response = await baseClient.get('/users', { query });

    const usersData = response.data || [];
    const pagination = response.pagination || {};

    const users = dataTransform.transformUserListFromBackend(usersData);

    return {
      users,
      total: pagination.total || users.length,
      page: pagination.page || 1,
      limit: pagination.limit || 100,
      totalPages: pagination.totalPages || Math.ceil((pagination.total || users.length) / limit)
    };
  } catch (error) {
    console.error('[usersApi] Error fetching users:', error);
    throw error;
  }
}

/**
 * Get single user by ID
 */
async function getUserById(userId) {
  try {
    const response = await baseClient.get(`/users/${userId}`);
    const data = dataTransform.unwrapResponse(response);
    return dataTransform.transformUserFromBackend(data);
  } catch (error) {
    console.error('[usersApi] Error fetching user:', error);
    throw error;
  }
}

/**
 * Get user statistics
 */
async function getUserStats() {
  try {
    const response = await baseClient.get('/users/stats');
    const data = dataTransform.unwrapResponse(response);
    return {
      total: data.total || 0,
      active: data.active || 0,
      inactive: data.inactive || 0,
      recentLogins: data.recentLogins || 0,
      byRole: data.byRole || {},
      byDepartment: data.byDepartment || {}
    };
  } catch (error) {
    console.error('[usersApi] Error fetching user stats:', error);
    throw error;
  }
}

/**
 * Create a new user
 */
async function createUser(userData) {
  try {
    const backendData = dataTransform.transformUserToBackend(userData);

    const response = await baseClient.post('/users', backendData);
    const data = dataTransform.unwrapResponse(response);

    return dataTransform.transformUserFromBackend(data);
  } catch (error) {
    console.error('[usersApi] Error creating user:', error);
    throw error;
  }
}

/**
 * Update an existing user
 */
async function updateUser(userId, userData) {
  try {
    const backendData = dataTransform.transformUserToBackend(userData);

    const response = await baseClient.put(`/users/${userId}`, backendData);
    const data = dataTransform.unwrapResponse(response);

    return dataTransform.transformUserFromBackend(data);
  } catch (error) {
    console.error('[usersApi] Error updating user:', error);
    throw error;
  }
}

/**
 * Delete a user (soft delete)
 */
async function deleteUser(userId) {
  try {
    const response = await baseClient.delete(`/users/${userId}`);
    return dataTransform.unwrapResponse(response);
  } catch (error) {
    console.error('[usersApi] Error deleting user:', error);
    throw error;
  }
}

/**
 * Restore a deleted user
 */
async function restoreUser(userId) {
  try {
    const response = await baseClient.post(`/users/${userId}/restore`);
    const data = dataTransform.unwrapResponse(response);
    return dataTransform.transformUserFromBackend(data);
  } catch (error) {
    console.error('[usersApi] Error restoring user:', error);
    throw error;
  }
}

/**
 * Reset user password (admin action)
 */
async function resetUserPassword(userId, newPassword) {
  try {
    const response = await baseClient.post(`/users/${userId}/reset-password`, {
      newPassword
    });
    return dataTransform.unwrapResponse(response);
  } catch (error) {
    console.error('[usersApi] Error resetting password:', error);
    throw error;
  }
}

/**
 * Search users
 */
async function searchUsers(query, filters = {}) {
  try {
    return await getUsers({
      search: query,
      ...filters
    });
  } catch (error) {
    console.error('[usersApi] Error searching users:', error);
    throw error;
  }
}

/**
 * Get users by role
 */
async function getUsersByRole(role) {
  try {
    return await getUsers({ role, isActive: true });
  } catch (error) {
    console.error('[usersApi] Error fetching users by role:', error);
    throw error;
  }
}

/**
 * Get active users only
 */
async function getActiveUsers() {
  try {
    return await getUsers({ isActive: true });
  } catch (error) {
    console.error('[usersApi] Error fetching active users:', error);
    throw error;
  }
}

/**
 * Toggle user active status
 */
async function toggleUserStatus(userId, isActive) {
  try {
    return await updateUser(userId, { isActive });
  } catch (error) {
    console.error('[usersApi] Error toggling user status:', error);
    throw error;
  }
}

export const usersApi = {
  getUsers,
  getUserById,
  getUserStats,
  createUser,
  updateUser,
  deleteUser,
  restoreUser,
  resetUserPassword,
  searchUsers,
  getUsersByRole,
  getActiveUsers,
  toggleUserStatus
};
