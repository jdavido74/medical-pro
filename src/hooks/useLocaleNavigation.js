/**
 * useLocaleNavigation Hook
 *
 * Provides locale-aware navigation utilities.
 * Wraps react-router's useNavigate with locale prefix handling.
 */

import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DEFAULT_LOCALE, isValidLocale } from '../config/locales';

/**
 * Hook for locale-aware navigation
 * @returns {Object} Navigation utilities
 */
export function useLocaleNavigation() {
  const navigate = useNavigate();
  const { locale } = useParams();

  // Get current locale or default
  const currentLocale = locale && isValidLocale(locale) ? locale : DEFAULT_LOCALE;

  /**
   * Build a locale-prefixed path
   * @param {string} path - Path without locale prefix
   * @returns {string} Path with locale prefix
   */
  const buildPath = useCallback((path) => {
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    // Don't add locale prefix to public paths
    if (normalizedPath.startsWith('/sign-consent') ||
        normalizedPath.startsWith('/public/')) {
      return normalizedPath;
    }

    return `/${currentLocale}${normalizedPath}`;
  }, [currentLocale]);

  /**
   * Navigate to a locale-prefixed path
   * @param {string} path - Path without locale prefix
   * @param {Object} options - Navigate options (replace, state, etc.)
   */
  const navigateTo = useCallback((path, options = {}) => {
    const fullPath = buildPath(path);
    navigate(fullPath, options);
  }, [buildPath, navigate]);

  /**
   * Navigate to login page
   * @param {Object} options - Navigate options
   */
  const navigateToLogin = useCallback((options = {}) => {
    navigateTo('/login', options);
  }, [navigateTo]);

  /**
   * Navigate to signup page
   * @param {Object} options - Navigate options
   */
  const navigateToSignup = useCallback((options = {}) => {
    navigateTo('/signup', options);
  }, [navigateTo]);

  /**
   * Navigate to dashboard
   * @param {Object} options - Navigate options
   */
  const navigateToDashboard = useCallback((options = {}) => {
    navigateTo('/dashboard', options);
  }, [navigateTo]);

  /**
   * Navigate to home page
   * @param {Object} options - Navigate options
   */
  const navigateToHome = useCallback((options = {}) => {
    navigateTo('/', options);
  }, [navigateTo]);

  /**
   * Navigate to email verification page
   * @param {string} email - Email to pass in state
   */
  const navigateToEmailVerification = useCallback((email) => {
    navigateTo('/email-verification', { state: { email } });
  }, [navigateTo]);

  /**
   * Go back in history
   */
  const goBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return {
    // Current locale
    locale: currentLocale,

    // Path building
    buildPath,

    // Navigation methods
    navigateTo,
    navigateToLogin,
    navigateToSignup,
    navigateToDashboard,
    navigateToHome,
    navigateToEmailVerification,
    goBack,

    // Raw navigate for advanced use
    rawNavigate: navigate
  };
}

export default useLocaleNavigation;
