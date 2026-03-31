/**
 * Rooms API Client
 * Handles all API calls for room management
 */

import { baseClient } from './baseClient';

const ENDPOINT = '/rooms';

/**
 * Get all rooms with optional filters
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 50)
 * @param {string} params.search - Search term
 * @param {boolean} params.isActive - Filter by active status
 */
export const getRooms = async (params = {}) => {
  return baseClient.get(`${ENDPOINT}/list`, { query: params });
};

/**
 * Get a single room by ID
 * @param {string} id - Room ID
 */
export const getRoom = async (id) => {
  return baseClient.get(`${ENDPOINT}/${id}/details`);
};

/**
 * Create a new room
 * @param {Object} data - Room data
 * @param {string} data.name - Room name
 * @param {string} data.description - Description
 * @param {string} data.color - Hex color code
 * @param {string} data.floor - Floor location
 * @param {number} data.capacity - Room capacity
 * @param {boolean} data.isActive - Active status
 * @param {string[]} data.equipment - Array of equipment items
 */
export const createRoom = async (data) => {
  return baseClient.post(ENDPOINT, data);
};

/**
 * Update an existing room
 * @param {string} id - Room ID
 * @param {Object} data - Updated data
 */
export const updateRoom = async (id, data) => {
  return baseClient.put(`${ENDPOINT}/${id}`, data);
};

/**
 * Delete (deactivate) a room
 * @param {string} id - Room ID
 */
export const deleteRoom = async (id) => {
  return baseClient.put(`${ENDPOINT}/${id}/deactivate`);
};

export default {
  getRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom
};
