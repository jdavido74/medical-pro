/**
 * Medications API Client
 * CIMA integration + custom medications
 */

import { baseClient } from './baseClient';
import { dataTransform } from './dataTransform';

/**
 * Search medications (CIMA + custom)
 */
async function searchMedications(query, options = {}) {
  try {
    const { limit = 20 } = options;
    const response = await baseClient.get('/medications/search', {
      query: { q: query, limit }
    });
    const data = dataTransform.unwrapResponse(response);
    return data.results || [];
  } catch (error) {
    console.error('[medicationsApi] Search error:', error);
    return [];
  }
}

/**
 * Get full CIMA medication detail
 */
async function getMedicationDetail(nregistro) {
  try {
    const response = await baseClient.get(`/medications/cima/${nregistro}`);
    return dataTransform.unwrapResponse(response);
  } catch (error) {
    console.error('[medicationsApi] Detail error:', error);
    return null;
  }
}

/**
 * Get posology (section 4.2) HTML
 */
async function getMedicationPosology(nregistro) {
  try {
    const response = await baseClient.get(`/medications/cima/${nregistro}/posology`);
    return dataTransform.unwrapResponse(response);
  } catch (error) {
    console.error('[medicationsApi] Posology error:', error);
    return null;
  }
}

/**
 * Get interactions (section 4.5) HTML
 */
async function getMedicationInteractions(nregistro) {
  try {
    const response = await baseClient.get(`/medications/cima/${nregistro}/interactions`);
    return dataTransform.unwrapResponse(response);
  } catch (error) {
    console.error('[medicationsApi] Interactions error:', error);
    return null;
  }
}

/**
 * Get contraindications (section 4.3) HTML
 */
async function getMedicationContraindications(nregistro) {
  try {
    const response = await baseClient.get(`/medications/cima/${nregistro}/contraindications`);
    return dataTransform.unwrapResponse(response);
  } catch (error) {
    console.error('[medicationsApi] Contraindications error:', error);
    return null;
  }
}

/**
 * Check interactions for a list of medications
 * @param {Array} medications - [{ nregistro, name }]
 */
async function checkInteractions(medications) {
  try {
    const response = await baseClient.post('/medications/interactions-check', { medications });
    return dataTransform.unwrapResponse(response);
  } catch (error) {
    console.error('[medicationsApi] Interactions check error:', error);
    return { interactions: [], checkedCount: 0 };
  }
}

/**
 * Get custom medications for the clinic
 */
async function getCustomMedications() {
  try {
    const response = await baseClient.get('/medications/custom');
    return dataTransform.unwrapResponse(response) || [];
  } catch (error) {
    console.error('[medicationsApi] Custom list error:', error);
    return [];
  }
}

/**
 * Create a custom medication
 */
async function createCustomMedication(data) {
  try {
    const response = await baseClient.post('/medications/custom', data);
    return dataTransform.unwrapResponse(response);
  } catch (error) {
    console.error('[medicationsApi] Custom create error:', error);
    throw error;
  }
}

/**
 * Update a custom medication
 */
async function updateCustomMedication(id, data) {
  try {
    const response = await baseClient.put(`/medications/custom/${id}`, data);
    return dataTransform.unwrapResponse(response);
  } catch (error) {
    console.error('[medicationsApi] Custom update error:', error);
    throw error;
  }
}

/**
 * Delete (deactivate) a custom medication
 */
async function deleteCustomMedication(id) {
  try {
    const response = await baseClient.delete(`/medications/custom/${id}`);
    return dataTransform.unwrapResponse(response);
  } catch (error) {
    console.error('[medicationsApi] Custom delete error:', error);
    throw error;
  }
}

export const medicationsApi = {
  searchMedications,
  getMedicationDetail,
  getMedicationPosology,
  getMedicationInteractions,
  getMedicationContraindications,
  checkInteractions,
  getCustomMedications,
  createCustomMedication,
  updateCustomMedication,
  deleteCustomMedication
};
