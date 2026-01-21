/**
 * JWT Utilities
 * Helper functions for JWT token operations
 */

/**
 * Decode JWT token (without verification)
 * @param {string} token - JWT token
 * @returns {object|null} - Decoded payload or null if invalid
 */
export function jwtDecode(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode base64url payload
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('[jwtUtils] Failed to decode token:', error);
    return null;
  }
}

/**
 * Check if JWT token is expired
 * @param {string} token - JWT token
 * @returns {boolean} - True if expired
 */
export function isTokenExpired(token) {
  const decoded = jwtDecode(token);
  if (!decoded || !decoded.exp) {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  return decoded.exp < now;
}

/**
 * Get token expiration timestamp
 * @param {string} token - JWT token
 * @returns {number|null} - Expiration timestamp in milliseconds
 */
export function getTokenExpiration(token) {
  const decoded = jwtDecode(token);
  if (!decoded || !decoded.exp) {
    return null;
  }

  return decoded.exp * 1000; // Convert to milliseconds
}

/**
 * Calculate time until token expires
 * @param {string} token - JWT token
 * @returns {number} - Milliseconds until expiration (0 if expired)
 */
export function getTimeUntilExpiration(token) {
  const expiresAt = getTokenExpiration(token);
  if (!expiresAt) {
    return 0;
  }

  const now = Date.now();
  const timeLeft = expiresAt - now;

  return Math.max(0, timeLeft);
}

/**
 * Get user ID from token
 * @param {string} token - JWT token
 * @returns {string|null} - User ID or null
 */
export function getUserIdFromToken(token) {
  const decoded = jwtDecode(token);
  return decoded?.userId || decoded?.sub || null;
}

/**
 * Get company ID from token
 * @param {string} token - JWT token
 * @returns {string|null} - Company ID or null
 */
export function getCompanyIdFromToken(token) {
  const decoded = jwtDecode(token);
  return decoded?.companyId || null;
}
