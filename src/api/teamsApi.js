/**
 * Teams API Client
 * Handles team management for the clinic
 * Version 2.0: With centralized dataTransform
 */

import { baseClient } from './baseClient';
import { dataTransform } from './dataTransform';

/**
 * Get all teams
 */
async function getTeams(options = {}) {
  try {
    const { page = 1, limit = 100, search = '', department, isActive } = options;

    const query = { page, limit };
    if (search) query.search = search;
    if (department) query.department = department;
    if (isActive !== undefined) query.is_active = isActive;

    const response = await baseClient.get('/teams', { query });

    const teamsData = response.data || [];
    const pagination = response.pagination || {};

    return {
      teams: dataTransform.transformTeamListFromBackend(teamsData),
      total: pagination.total || 0,
      page: pagination.page || 1,
      limit: pagination.limit || 100
    };
  } catch (error) {
    console.error('[teamsApi] Error fetching teams:', error);
    throw error;
  }
}

/**
 * Get single team by ID
 */
async function getTeamById(teamId) {
  try {
    const response = await baseClient.get(`/teams/${teamId}`);
    const data = dataTransform.unwrapResponse(response);
    return dataTransform.transformTeamFromBackend(data);
  } catch (error) {
    console.error('[teamsApi] Error fetching team:', error);
    throw error;
  }
}

/**
 * Create a new team
 */
async function createTeam(teamData) {
  try {
    const backendData = dataTransform.transformTeamToBackend(teamData);
    const response = await baseClient.post('/teams', backendData);
    const data = dataTransform.unwrapResponse(response);
    return dataTransform.transformTeamFromBackend(data);
  } catch (error) {
    console.error('[teamsApi] Error creating team:', error);
    throw error;
  }
}

/**
 * Update an existing team
 */
async function updateTeam(teamId, teamData) {
  try {
    const backendData = dataTransform.transformTeamToBackend(teamData);
    const response = await baseClient.put(`/teams/${teamId}`, backendData);
    const data = dataTransform.unwrapResponse(response);
    return dataTransform.transformTeamFromBackend(data);
  } catch (error) {
    console.error('[teamsApi] Error updating team:', error);
    throw error;
  }
}

/**
 * Delete a team (soft delete)
 */
async function deleteTeam(teamId) {
  try {
    await baseClient.delete(`/teams/${teamId}`);
    return { success: true };
  } catch (error) {
    console.error('[teamsApi] Error deleting team:', error);
    throw error;
  }
}

export const teamsApi = {
  getTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam
};
