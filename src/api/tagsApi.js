/**
 * Tags API Client
 * Handles all API calls to the backend tags endpoints
 */

import { baseClient } from './baseClient';

const TAGS_ENDPOINT = '/tags';

/**
 * Get all tags
 */
export const getTags = async () => {
  return baseClient.get(TAGS_ENDPOINT);
};

/**
 * Get a single tag with its products
 * @param {string} id - Tag ID
 */
export const getTag = async (id) => {
  return baseClient.get(`${TAGS_ENDPOINT}/${id}`);
};

/**
 * Create a new tag
 * @param {Object} data - Tag data (name, color, description)
 */
export const createTag = async (data) => {
  return baseClient.post(TAGS_ENDPOINT, data);
};

/**
 * Update a tag
 * @param {string} id - Tag ID
 * @param {Object} data - Updated data
 */
export const updateTag = async (id, data) => {
  return baseClient.put(`${TAGS_ENDPOINT}/${id}`, data);
};

/**
 * Delete a tag
 * @param {string} id - Tag ID
 */
export const deleteTag = async (id) => {
  return baseClient.delete(`${TAGS_ENDPOINT}/${id}`);
};

/**
 * Get tags for a product
 * @param {string} productId - Product ID
 */
export const getProductTags = async (productId) => {
  return baseClient.get(`/products/${productId}/tags`);
};

/**
 * Add tags to a product
 * @param {string} productId - Product ID
 * @param {string[]} tagIds - Array of tag IDs to add
 */
export const addProductTags = async (productId, tagIds) => {
  return baseClient.post(`/products/${productId}/tags`, { tagIds });
};

/**
 * Replace all tags for a product
 * @param {string} productId - Product ID
 * @param {string[]} tagIds - Array of tag IDs
 */
export const setProductTags = async (productId, tagIds) => {
  return baseClient.put(`/products/${productId}/tags`, { tagIds });
};

/**
 * Remove a tag from a product
 * @param {string} productId - Product ID
 * @param {string} tagId - Tag ID to remove
 */
export const removeProductTag = async (productId, tagId) => {
  return baseClient.delete(`/products/${productId}/tags/${tagId}`);
};

export default {
  getTags,
  getTag,
  createTag,
  updateTag,
  deleteTag,
  getProductTags,
  addProductTags,
  setProductTags,
  removeProductTag
};
