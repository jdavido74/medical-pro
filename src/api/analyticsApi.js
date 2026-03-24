/**
 * Analytics API Client
 */
import { baseClient } from './baseClient';

const ENDPOINT = '/analytics';

export const getDashboardData = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.dateFrom) query.append('dateFrom', params.dateFrom);
  if (params.dateTo) query.append('dateTo', params.dateTo);
  if (params.practitionerId) query.append('practitionerId', params.practitionerId);
  if (params.year) query.append('year', params.year);
  const qs = query.toString();
  return baseClient.get(`${ENDPOINT}/dashboard${qs ? `?${qs}` : ''}`);
};

export const getActivityData = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.dateFrom) query.append('dateFrom', params.dateFrom);
  if (params.dateTo) query.append('dateTo', params.dateTo);
  if (params.practitionerId) query.append('practitionerId', params.practitionerId);
  if (params.year) query.append('year', params.year);
  if (params.statuses) query.append('statuses', params.statuses);
  const qs = query.toString();
  return baseClient.get(`${ENDPOINT}/activity${qs ? `?${qs}` : ''}`);
};

export default { getDashboardData, getActivityData };
