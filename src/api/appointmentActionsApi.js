/**
 * Appointment Actions API Client
 * Handles API calls for appointment state machine and automated actions
 */

import { baseClient } from './baseClient';

const ENDPOINT = '/planning';

// ============================================
// Actions for specific appointments
// ============================================

/**
 * Get all actions for an appointment
 * @param {string} appointmentId - Appointment ID
 * @param {Object} params - Query parameters
 * @param {string} params.status - Filter by status (pending, completed, failed, etc.)
 */
export const getActions = async (appointmentId, params = {}) => {
  return baseClient.get(`${ENDPOINT}/appointments/${appointmentId}/actions`, { query: params });
};

/**
 * Create a manual action for an appointment
 * @param {string} appointmentId - Appointment ID
 * @param {Object} data - Action data
 * @param {string} data.actionType - Action type (confirmation_email, whatsapp_reminder, send_quote, send_consent, prepare_invoice)
 * @param {string} data.scheduledAt - ISO date for scheduled execution (optional)
 * @param {boolean} data.requiresValidation - Whether action requires validation before execution
 * @param {Object} data.metadata - Additional metadata
 */
export const createAction = async (appointmentId, data) => {
  return baseClient.post(`${ENDPOINT}/appointments/${appointmentId}/actions`, data);
};

/**
 * Validate (approve) an action for execution
 * @param {string} appointmentId - Appointment ID
 * @param {string} actionId - Action ID
 */
export const validateAction = async (appointmentId, actionId) => {
  return baseClient.patch(`${ENDPOINT}/appointments/${appointmentId}/actions/${actionId}/validate`);
};

/**
 * Cancel an action
 * @param {string} appointmentId - Appointment ID
 * @param {string} actionId - Action ID
 * @param {string} reason - Cancellation reason
 */
export const cancelAction = async (appointmentId, actionId, reason = '') => {
  return baseClient.patch(`${ENDPOINT}/appointments/${appointmentId}/actions/${actionId}/cancel`, { reason });
};

/**
 * Execute an action immediately
 * @param {string} appointmentId - Appointment ID
 * @param {string} actionId - Action ID
 */
export const executeAction = async (appointmentId, actionId) => {
  return baseClient.post(`${ENDPOINT}/appointments/${appointmentId}/actions/${actionId}/execute`);
};

/**
 * Retry a failed action
 * @param {string} appointmentId - Appointment ID
 * @param {string} actionId - Action ID
 */
export const retryAction = async (appointmentId, actionId) => {
  return baseClient.post(`${ENDPOINT}/appointments/${appointmentId}/actions/${actionId}/retry`);
};

// ============================================
// State transitions
// ============================================

/**
 * Transition an appointment to a new state
 * @param {string} appointmentId - Appointment ID
 * @param {Object} data - Transition data
 * @param {string} data.status - New status (scheduled, confirmed, in_progress, completed, cancelled, no_show)
 * @param {string} data.confirmedBy - Who confirmed (for confirmed status)
 * @param {Array} data.skipActions - Action types to skip during transition
 */
export const transitionAppointment = async (appointmentId, data) => {
  return baseClient.post(`${ENDPOINT}/appointments/${appointmentId}/transition`, data);
};

// ============================================
// Dashboard & summary endpoints
// ============================================

/**
 * Get all pending actions requiring validation
 */
export const getPendingActions = async () => {
  return baseClient.get(`${ENDPOINT}/actions/pending`);
};

/**
 * Get summary of actions for dashboard
 */
export const getActionsSummary = async () => {
  return baseClient.get(`${ENDPOINT}/actions/summary`);
};

/**
 * Get state machine configuration
 * Returns available states, transitions, and action types
 */
export const getStateConfig = async () => {
  return baseClient.get(`${ENDPOINT}/state-config`);
};

// ============================================
// Scheduler endpoints
// ============================================

/**
 * Get scheduler statistics
 */
export const getSchedulerStats = async () => {
  return baseClient.get(`${ENDPOINT}/scheduler/stats`);
};

/**
 * Manually trigger processing of due jobs (admin only)
 */
export const processScheduledJobs = async () => {
  return baseClient.post(`${ENDPOINT}/scheduler/process`);
};

export default {
  // Actions
  getActions,
  createAction,
  validateAction,
  cancelAction,
  executeAction,
  retryAction,
  // Transitions
  transitionAppointment,
  // Dashboard
  getPendingActions,
  getActionsSummary,
  getStateConfig,
  // Scheduler
  getSchedulerStats,
  processScheduledJobs
};
