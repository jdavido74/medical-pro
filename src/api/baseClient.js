/**
 * Base API Client
 * Handles all HTTP communication with the backend API
 * - Authentication via JWT token
 * - Error handling
 * - Request/response transformation
 * - Multi-tenancy support
 */

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api/v1';
const API_TIMEOUT = parseInt(process.env.REACT_APP_API_TIMEOUT) || 30000;

/**
 * Get JWT token from localStorage
 */
function getAuthToken() {
  try {
    // First try to get token from dedicated token storage (set during login)
    const token = localStorage.getItem('clinicmanager_token');
    if (token) {
      return token;
    }

    // Fallback to legacy location for backward compatibility
    const authData = localStorage.getItem('clinicmanager_auth');
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed.token || null;
    }
  } catch (error) {
    console.error('[baseClient] Error reading auth token:', error);
  }
  return null;
}

/**
 * Get company ID from user stored in localStorage
 */
function getCompanyId() {
  try {
    const authData = localStorage.getItem('clinicmanager_auth');
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed.user?.companyId || null;
    }
  } catch (error) {
    console.error('[baseClient] Error reading company ID:', error);
  }
  return null;
}

/**
 * Make HTTP request to backend API
 * @param {string} endpoint - API endpoint (e.g., '/patients')
 * @param {object} options - Request options
 * @param {string} options.method - HTTP method (GET, POST, PUT, DELETE, PATCH)
 * @param {object} options.body - Request body
 * @param {object} options.query - Query parameters
 * @param {object} options.headers - Custom headers
 * @returns {Promise<object>} Response data
 */
async function request(endpoint, options = {}) {
  const {
    method = 'GET',
    body = null,
    query = {},
    headers = {}
  } = options;

  try {
    // Build URL with query parameters
    const url = new URL(`${API_BASE_URL}${endpoint}`);

    // Add query parameters
    if (Object.keys(query).length > 0) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          url.searchParams.append(key, value);
        }
      });
    }

    // Build headers
    const requestHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };

    // Add authentication token if available
    const token = getAuthToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    // Make request
    const response = await fetch(url.toString(), {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : null,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Handle response
    const contentType = response.headers.get('content-type');
    let data = null;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Check for errors
    if (!response.ok) {
      throw {
        status: response.status,
        message: data?.error?.message || data?.message || 'API Error',
        data: data
      };
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw {
        status: 408,
        message: 'Request timeout',
        isTimeout: true
      };
    }

    if (error.status === 401) {
      // Handle unauthorized - clear auth and redirect to login
      localStorage.removeItem('clinicmanager_auth');
      window.location.href = '/login';
    }

    throw error;
  }
}

/**
 * GET request
 */
async function get(endpoint, options = {}) {
  return request(endpoint, { ...options, method: 'GET' });
}

/**
 * POST request
 */
async function post(endpoint, body, options = {}) {
  return request(endpoint, { ...options, method: 'POST', body });
}

/**
 * PUT request
 */
async function put(endpoint, body, options = {}) {
  return request(endpoint, { ...options, method: 'PUT', body });
}

/**
 * PATCH request
 */
async function patch(endpoint, body, options = {}) {
  return request(endpoint, { ...options, method: 'PATCH', body });
}

/**
 * DELETE request
 */
async function deleteRequest(endpoint, options = {}) {
  return request(endpoint, { ...options, method: 'DELETE' });
}

export const baseClient = {
  request,
  get,
  post,
  put,
  patch,
  delete: deleteRequest,
  getAuthToken,
  getCompanyId,
  API_BASE_URL
};
