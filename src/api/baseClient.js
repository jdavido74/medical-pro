/**
 * Base API Client
 * Handles all HTTP communication with the backend API
 * - Authentication via JWT token
 * - Error handling
 * - Request/response transformation
 * - Multi-tenancy support
 */

import { redirectToLogin } from '../utils/localeRedirect';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api/v1';
const API_TIMEOUT = parseInt(process.env.REACT_APP_API_TIMEOUT) || 30000;
const DEBUG = process.env.NODE_ENV === 'development';

/**
 * In-memory token storage (NOT localStorage)
 * Set by SecureAuthContext after login/refresh
 * Cleared on logout or auth failure
 */
let _accessToken = null;

/**
 * Set the access token (called by auth context)
 */
function setAccessToken(token) {
  _accessToken = token;
}

/**
 * Get JWT token from memory (primary) or localStorage (migration fallback)
 */
function getAuthToken() {
  // Primary: in-memory token (secure, not accessible via XSS)
  if (_accessToken) {
    return _accessToken;
  }

  // Migration fallback: read from localStorage for existing sessions
  try {
    const token = localStorage.getItem('clinicmanager_token');
    if (token) {
      // Move to memory and clean up localStorage
      _accessToken = token;
      localStorage.removeItem('clinicmanager_token');
      localStorage.removeItem('clinicmanager_auth');
      return _accessToken;
    }
  } catch (error) {
    // Ignore localStorage errors
  }
  return null;
}

/**
 * Clear the in-memory token (called on logout/auth failure)
 */
function clearAccessToken() {
  _accessToken = null;
  // Also clean up any legacy localStorage tokens
  try {
    localStorage.removeItem('clinicmanager_token');
    localStorage.removeItem('clinicmanager_auth');
  } catch (error) {
    // Ignore
  }
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
    // Build URL with query parameters (supports both absolute and relative base URLs)
    let urlString = `${API_BASE_URL}${endpoint}`;

    // Add query parameters
    const params = new URLSearchParams();
    if (Object.keys(query).length > 0) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          params.append(key, value);
        }
      });
      const qs = params.toString();
      if (qs) {
        urlString += `?${qs}`;
      }
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
      if (DEBUG) {
        console.log('📡 [baseClient] API Request:', { method, endpoint, hasToken: true });
      }
    } else if (DEBUG) {
      console.log('📡 [baseClient] API Request (no auth):', { method, endpoint });
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    // Make request (credentials: 'include' sends httpOnly cookies)
    const response = await fetch(urlString, {
      method,
      headers: requestHeaders,
      credentials: 'include',
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
      console.error('❌ [baseClient] API Error:', {
        endpoint,
        status: response.status,
        message: data?.error?.message || data?.message,
        errorCode: data?.error?.code
      });

      // Check for clinic status errors and emit event
      if (data?.error?.code && ['CLINIC_SUSPENDED', 'CLINIC_DELETED', 'CLINIC_NOT_FOUND'].includes(data.error.code)) {
        // Emit custom event for ClinicStatusGuard to handle
        window.dispatchEvent(new CustomEvent('clinicStatusError', {
          detail: { errorCode: data.error.code, data }
        }));
      }

      throw {
        status: response.status,
        message: data?.error?.message || data?.message || 'API Error',
        data: data
      };
    }

    if (DEBUG) {
      console.log('✅ [baseClient] API Success:', { endpoint, status: response.status });
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
      // Only redirect to login for authenticated requests, NOT for login/register attempts
      // Also exclude refresh-permissions which can fail silently without logout
      const isAuthEndpoint = endpoint.includes('/auth/login') || endpoint.includes('/auth/register');
      const isRefreshPermissions = endpoint.includes('/auth/refresh-permissions');

      if (!isAuthEndpoint && !isRefreshPermissions) {
        if (DEBUG) {
          console.log('🔒 [baseClient] 401 - Redirecting to login');
        }
        clearAccessToken();
        redirectToLogin();
      } else if (isRefreshPermissions && DEBUG) {
        console.log('🔒 [baseClient] 401 on refresh-permissions - ignoring (not redirecting)');
      }
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

/**
 * Upload file (multipart/form-data)
 * @param {string} endpoint - API endpoint
 * @param {FormData} formData - FormData object with file(s)
 * @returns {Promise<object>} Response data
 */
async function upload(endpoint, formData) {
  try {
    const urlString = `${API_BASE_URL}${endpoint}`;

    // Build headers WITHOUT Content-Type (browser will set it with boundary)
    const requestHeaders = {};

    // Add authentication token
    const token = getAuthToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    if (DEBUG) {
      console.log('📤 [baseClient] Upload Request:', { endpoint, hasToken: !!token });
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT * 2); // Longer timeout for uploads

    // Make request - body is FormData directly, NOT JSON.stringify
    const response = await fetch(urlString, {
      method: 'POST',
      headers: requestHeaders,
      credentials: 'include',
      body: formData, // Pass FormData directly
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
      console.error('❌ [baseClient] Upload Error:', {
        endpoint,
        status: response.status,
        message: data?.error?.message || data?.message
      });

      throw {
        status: response.status,
        message: data?.error?.message || data?.message || 'Upload Error',
        data: data
      };
    }

    if (DEBUG) {
      console.log('✅ [baseClient] Upload Success:', { endpoint, status: response.status });
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw {
        status: 408,
        message: 'Upload timeout',
        isTimeout: true
      };
    }
    throw error;
  }
}

export const baseClient = {
  request,
  get,
  post,
  put,
  patch,
  delete: deleteRequest,
  upload,
  getAuthToken,
  setAccessToken,
  clearAccessToken,
  API_BASE_URL
};
