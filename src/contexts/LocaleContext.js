/**
 * LocaleContext - Contexte centralisé pour la gestion des locales
 *
 * Single Source of Truth pour:
 * - Pays (country)
 * - Langue (language)
 * - Devise (currency)
 * - Formats de date/heure
 * - Préfixe téléphone
 * - Configuration médicale régionale
 */

import React, { createContext, useContext, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LOCALE_CONFIG,
  DEFAULT_LOCALE,
  ACTIVE_LOCALES,
  getLocaleConfig,
  isValidLocale,
  savePreferredLocale
} from '../config/locales';

// Context
const LocaleContext = createContext(null);

/**
 * Formater une date selon la locale
 * @param {Date|string} date - Date à formater
 * @param {Object} config - Configuration locale
 * @param {Object} options - Options de formatage
 * @returns {string} Date formatée
 */
function formatDateByLocale(date, config, options = {}) {
  if (!date) return '';

  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';

  const { includeTime = false, shortFormat = false } = options;

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  let dateStr;

  // Handle different date formats
  if (config.dateFormat === 'MM/DD/YYYY') {
    dateStr = shortFormat ? `${month}/${day}` : `${month}/${day}/${year}`;
  } else if (config.dateFormat === 'DD.MM.YYYY') {
    dateStr = shortFormat ? `${day}.${month}` : `${day}.${month}.${year}`;
  } else {
    // Default: DD/MM/YYYY
    dateStr = shortFormat ? `${day}/${month}` : `${day}/${month}/${year}`;
  }

  if (includeTime) {
    if (config.timeFormat === 'h:mm A') {
      const h = d.getHours();
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hour12 = h % 12 || 12;
      dateStr += ` ${hour12}:${minutes} ${ampm}`;
    } else {
      dateStr += ` ${hours}:${minutes}`;
    }
  }

  return dateStr;
}

/**
 * Formater un montant selon la locale
 * @param {number} amount - Montant à formater
 * @param {Object} config - Configuration locale
 * @param {Object} options - Options de formatage
 * @returns {string} Montant formaté
 */
function formatCurrencyByLocale(amount, config, options = {}) {
  if (amount === null || amount === undefined) return '';

  const { showSymbol = true, decimals = 2 } = options;

  const num = Number(amount);
  if (isNaN(num)) return '';

  // Format number with proper separators
  const parts = num.toFixed(decimals).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, config.thousandsSeparator);
  const decimalPart = parts[1];

  const formatted = `${integerPart}${config.decimalSeparator}${decimalPart}`;

  if (showSymbol) {
    // EUR symbol goes after in most European countries
    if (config.currency === 'EUR') {
      return `${formatted} ${config.currencySymbol}`;
    }
    // USD/GBP symbol goes before
    return `${config.currencySymbol}${formatted}`;
  }

  return formatted;
}

/**
 * Formater un numéro de téléphone selon la locale
 * @param {string} phone - Numéro de téléphone
 * @param {Object} config - Configuration locale
 * @returns {string} Téléphone formaté
 */
function formatPhoneByLocale(phone, config) {
  if (!phone) return '';

  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  // If already has country code, format with spaces
  if (phone.startsWith('+')) {
    return phone.replace(/(\+\d{2,3})(\d{1})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5 $6');
  }

  // Add country prefix and format
  return `${config.phonePrefix} ${digits.replace(/(\d{1})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5')}`;
}

/**
 * LocaleProvider Component
 * Wraps the application and provides locale context
 */
export function LocaleProvider({ children }) {
  const { locale: urlLocale } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n } = useTranslation();

  // Determine active locale from URL or default
  const activeLocale = useMemo(() => {
    if (urlLocale && isValidLocale(urlLocale)) {
      return urlLocale;
    }
    return DEFAULT_LOCALE;
  }, [urlLocale]);

  // Get full configuration for active locale
  const config = useMemo(() => getLocaleConfig(activeLocale), [activeLocale]);

  // Sync i18n language with locale
  useEffect(() => {
    if (i18n.language !== config.language) {
      i18n.changeLanguage(config.language);
    }
    // Save preference
    savePreferredLocale(activeLocale);
  }, [activeLocale, config.language, i18n]);

  // Change locale function - navigates to new locale URL
  const changeLocale = useCallback((newLocale) => {
    if (!isValidLocale(newLocale)) {
      console.warn(`Invalid locale: ${newLocale}`);
      return;
    }

    const currentPath = location.pathname;

    // Replace locale in path or add it
    let newPath;
    if (urlLocale) {
      // Replace existing locale
      newPath = currentPath.replace(`/${urlLocale}`, `/${newLocale}`);
    } else {
      // Add locale prefix (for legacy routes)
      newPath = `/${newLocale}${currentPath}`;
    }

    // Save preference and navigate
    savePreferredLocale(newLocale);
    navigate(newPath, { replace: true });
  }, [urlLocale, location.pathname, navigate]);

  // Build locale URL helper
  const buildLocaleUrl = useCallback((path) => {
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `/${activeLocale}${normalizedPath}`;
  }, [activeLocale]);

  // Memoized context value with all helpers
  const contextValue = useMemo(() => ({
    // Current locale info
    locale: activeLocale,
    code: activeLocale,
    country: config.country,
    language: config.language,

    // Currency
    currency: config.currency,
    currencySymbol: config.currencySymbol,

    // Formats
    dateFormat: config.dateFormat,
    timeFormat: config.timeFormat,
    dateTimeFormat: config.dateTimeFormat,
    decimalSeparator: config.decimalSeparator,
    thousandsSeparator: config.thousandsSeparator,

    // Phone
    phonePrefix: config.phonePrefix,
    phoneDigits: config.phoneDigits,

    // Display
    name: config.name,
    nativeName: config.nativeName,
    flag: config.flag,

    // Timezone
    timezone: config.timezone,
    firstDayOfWeek: config.firstDayOfWeek,

    // Medical
    healthcareSystem: config.healthcareSystem,
    prescriptionFormat: config.prescriptionFormat,
    consentLanguage: config.consentLanguage,

    // Full config access
    config,

    // Available locales
    availableLocales: ACTIVE_LOCALES,
    allLocaleConfigs: LOCALE_CONFIG,

    // Helper functions
    formatDate: (date, options) => formatDateByLocale(date, config, options),
    formatCurrency: (amount, options) => formatCurrencyByLocale(amount, config, options),
    formatPhone: (phone) => formatPhoneByLocale(phone, config),

    // Navigation helpers
    changeLocale,
    buildUrl: buildLocaleUrl,

    // Validation
    isValidLocale
  }), [activeLocale, config, changeLocale, buildLocaleUrl]);

  return (
    <LocaleContext.Provider value={contextValue}>
      {children}
    </LocaleContext.Provider>
  );
}

/**
 * Hook to access locale context
 * @returns {Object} Locale context value
 * @throws {Error} If used outside LocaleProvider
 */
export function useLocale() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }

  return context;
}

/**
 * Hook to get locale without throwing (for optional usage)
 * @returns {Object|null} Locale context value or null
 */
export function useLocaleOptional() {
  return useContext(LocaleContext);
}

/**
 * Higher-order component to inject locale props
 * @param {React.Component} Component - Component to wrap
 * @returns {React.Component} Wrapped component with locale props
 */
export function withLocale(Component) {
  return function WithLocaleComponent(props) {
    const locale = useLocale();
    return <Component {...props} locale={locale} />;
  };
}

export default LocaleContext;
