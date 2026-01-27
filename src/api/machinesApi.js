/**
 * Machines API Client
 * Handles all API calls for machine management
 */

import { baseClient } from './baseClient';

const ENDPOINT = '/machines';

/**
 * Get all machines with optional filters
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 50)
 * @param {string} params.search - Search term
 * @param {boolean} params.isActive - Filter by active status
 */
export const getMachines = async (params = {}) => {
  return baseClient.get(ENDPOINT, { query: params });
};

/**
 * Get a single machine by ID
 * @param {string} id - Machine ID
 */
export const getMachine = async (id) => {
  return baseClient.get(`${ENDPOINT}/${id}`);
};

/**
 * Create a new machine
 * @param {Object} data - Machine data
 * @param {string} data.name - Machine name
 * @param {string} data.description - Description
 * @param {string} data.color - Hex color code
 * @param {string} data.location - Physical location
 * @param {boolean} data.isActive - Active status
 * @param {string[]} data.treatments - Array of treatment IDs
 */
export const createMachine = async (data) => {
  return baseClient.post(ENDPOINT, data);
};

/**
 * Update an existing machine
 * @param {string} id - Machine ID
 * @param {Object} data - Updated data
 */
export const updateMachine = async (id, data) => {
  return baseClient.put(`${ENDPOINT}/${id}`, data);
};

/**
 * Delete a machine
 * @param {string} id - Machine ID
 */
export const deleteMachine = async (id) => {
  return baseClient.delete(`${ENDPOINT}/${id}`);
};

/**
 * Get treatments assigned to a machine
 * @param {string} machineId - Machine ID
 */
export const getMachineTreatments = async (machineId) => {
  return baseClient.get(`${ENDPOINT}/${machineId}/treatments`);
};

/**
 * Assign treatments to a machine (bulk)
 * @param {string} machineId - Machine ID
 * @param {string[]} treatmentIds - Array of treatment IDs
 */
export const assignTreatments = async (machineId, treatmentIds) => {
  return baseClient.post(`${ENDPOINT}/${machineId}/treatments`, { treatmentIds });
};

/**
 * Get machines that can perform a specific treatment
 * @param {string} treatmentId - Treatment ID
 */
export const getMachinesByTreatment = async (treatmentId) => {
  return baseClient.get(`${ENDPOINT}/by-treatment/${treatmentId}`);
};

/**
 * Get treatments that require machines (is_overlappable = false)
 */
export const getAvailableTreatments = async () => {
  return baseClient.get(`${ENDPOINT}/available-treatments`);
};

export default {
  getMachines,
  getMachine,
  createMachine,
  updateMachine,
  deleteMachine,
  getMachineTreatments,
  assignTreatments,
  getMachinesByTreatment,
  getAvailableTreatments
};
