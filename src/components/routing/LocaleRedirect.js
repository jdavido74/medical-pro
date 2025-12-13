/**
 * LocaleRedirect Component
 *
 * Redirects users to the appropriate locale-prefixed URL
 * based on their preferences or browser settings.
 *
 * Used at the root path (/) to redirect to /:locale/dashboard
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { detectPreferredLocale, DEFAULT_LOCALE } from '../../config/locales';

/**
 * LocaleRedirect Component
 * Automatically redirects to the user's preferred locale
 *
 * @param {Object} props
 * @param {string} props.defaultPath - Path to redirect to after locale (default: '/dashboard')
 * @param {boolean} props.preservePath - If true, preserves the current path after locale prefix
 */
function LocaleRedirect({ defaultPath = '/dashboard', preservePath = false }) {
  const location = useLocation();

  // Detect user's preferred locale
  const locale = detectPreferredLocale() || DEFAULT_LOCALE;

  // Build target path
  let targetPath;

  if (preservePath && location.pathname !== '/') {
    // Preserve current path (for legacy URL migration)
    targetPath = `/${locale}${location.pathname}`;
  } else {
    // Redirect to default path
    targetPath = `/${locale}${defaultPath}`;
  }

  // Preserve search params and hash
  const search = location.search || '';
  const hash = location.hash || '';

  return <Navigate to={`${targetPath}${search}${hash}`} replace />;
}

/**
 * LocaleRedirectToLogin Component
 * Redirects to login page with locale prefix
 */
export function LocaleRedirectToLogin() {
  return <LocaleRedirect defaultPath="/login" />;
}

/**
 * LocaleRedirectToDashboard Component
 * Redirects to dashboard with locale prefix
 */
export function LocaleRedirectToDashboard() {
  return <LocaleRedirect defaultPath="/dashboard" />;
}

/**
 * LocaleRedirectToHome Component
 * Redirects to home page with locale prefix
 */
export function LocaleRedirectToHome() {
  return <LocaleRedirect defaultPath="/" />;
}

/**
 * LegacyRouteRedirect Component
 * Handles redirects from old non-locale URLs to new locale-prefixed URLs
 * Example: /patients -> /fr-FR/patients
 */
export function LegacyRouteRedirect() {
  return <LocaleRedirect preservePath={true} />;
}

export default LocaleRedirect;
