/**
 * Locale-Aware Redirect Utilities
 * Handles redirections with locale prefix
 */

import { detectRegion } from './regionDetector';

/**
 * Get current locale from URL or detect it
 * @returns {string} - Locale code (e.g., 'fr-FR', 'es-ES')
 */
export function getCurrentLocale() {
  // Try to extract from URL path first
  const path = window.location.pathname;
  const match = path.match(/^\/([a-z]{2}-[A-Z]{2})\//);

  if (match) {
    return match[1];
  }

  // Fallback to region detection
  const region = detectRegion();
  const localeMap = {
    'fr': 'fr-FR',
    'es': 'es-ES',
    'gb': 'en-GB',
    'us': 'en-US'
  };

  return localeMap[region] || 'fr-FR';
}

/**
 * Build path with locale prefix
 * @param {string} path - Path without locale (e.g., '/login', '/dashboard')
 * @returns {string} - Path with locale (e.g., '/fr-FR/login')
 */
export function buildLocalePath(path) {
  const locale = getCurrentLocale();

  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  return `/${locale}/${cleanPath}`;
}

/**
 * Redirect to path with locale prefix
 * @param {string} path - Path to redirect to
 * @param {boolean} replace - Use replace instead of assign (default: false)
 */
export function redirectWithLocale(path, replace = false) {
  const localePath = buildLocalePath(path);

  if (replace) {
    window.location.replace(localePath);
  } else {
    window.location.href = localePath;
  }
}

/**
 * Get login URL with current locale
 * @returns {string} - Login URL with locale
 */
export function getLoginUrl() {
  return buildLocalePath('/login');
}

/**
 * Get dashboard URL with current locale
 * @returns {string} - Dashboard URL with locale
 */
export function getDashboardUrl() {
  return buildLocalePath('/dashboard');
}

/**
 * Redirect to login with locale
 */
export function redirectToLogin() {
  redirectWithLocale('/login', true);
}

/**
 * Redirect to dashboard with locale
 */
export function redirectToDashboard() {
  redirectWithLocale('/dashboard', true);
}
