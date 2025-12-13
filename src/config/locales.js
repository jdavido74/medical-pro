/**
 * Configuration centralisee des locales
 * Single Source of Truth pour tous les parametres regionaux
 */

/**
 * Configuration complete de chaque locale supportee
 */
export const LOCALE_CONFIG = {
  'fr-FR': {
    code: 'fr-FR',
    country: 'FR',
    language: 'fr',
    currency: 'EUR',
    currencySymbol: '\u20AC',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    dateTimeFormat: 'DD/MM/YYYY HH:mm',
    phonePrefix: '+33',
    phoneDigits: 9,
    name: 'France',
    nativeName: 'Fran\u00E7ais',
    flag: '\uD83C\uDDEB\uD83C\uDDF7',
    timezone: 'Europe/Paris',
    firstDayOfWeek: 1, // Monday
    decimalSeparator: ',',
    thousandsSeparator: ' ',
    // Medical specific
    healthcareSystem: 'CPAM',
    prescriptionFormat: 'FR',
    consentLanguage: 'fr'
  },
  'es-ES': {
    code: 'es-ES',
    country: 'ES',
    language: 'es',
    currency: 'EUR',
    currencySymbol: '\u20AC',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    dateTimeFormat: 'DD/MM/YYYY HH:mm',
    phonePrefix: '+34',
    phoneDigits: 9,
    name: 'Espa\u00F1a',
    nativeName: 'Espa\u00F1ol',
    flag: '\uD83C\uDDEA\uD83C\uDDF8',
    timezone: 'Europe/Madrid',
    firstDayOfWeek: 1, // Monday
    decimalSeparator: ',',
    thousandsSeparator: '.',
    // Medical specific
    healthcareSystem: 'SNS',
    prescriptionFormat: 'ES',
    consentLanguage: 'es'
  },
  'en-GB': {
    code: 'en-GB',
    country: 'GB',
    language: 'en',
    currency: 'GBP',
    currencySymbol: '\u00A3',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    dateTimeFormat: 'DD/MM/YYYY HH:mm',
    phonePrefix: '+44',
    phoneDigits: 10,
    name: 'United Kingdom',
    nativeName: 'English (UK)',
    flag: '\uD83C\uDDEC\uD83C\uDDE7',
    timezone: 'Europe/London',
    firstDayOfWeek: 1, // Monday
    decimalSeparator: '.',
    thousandsSeparator: ',',
    // Medical specific
    healthcareSystem: 'NHS',
    prescriptionFormat: 'UK',
    consentLanguage: 'en'
  },
  'en-US': {
    code: 'en-US',
    country: 'US',
    language: 'en',
    currency: 'USD',
    currencySymbol: '$',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: 'h:mm A',
    dateTimeFormat: 'MM/DD/YYYY h:mm A',
    phonePrefix: '+1',
    phoneDigits: 10,
    name: 'United States',
    nativeName: 'English (US)',
    flag: '\uD83C\uDDFA\uD83C\uDDF8',
    timezone: 'America/New_York',
    firstDayOfWeek: 0, // Sunday
    decimalSeparator: '.',
    thousandsSeparator: ',',
    // Medical specific
    healthcareSystem: 'Private',
    prescriptionFormat: 'US',
    consentLanguage: 'en'
  },
  'pt-PT': {
    code: 'pt-PT',
    country: 'PT',
    language: 'pt',
    currency: 'EUR',
    currencySymbol: '\u20AC',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    dateTimeFormat: 'DD/MM/YYYY HH:mm',
    phonePrefix: '+351',
    phoneDigits: 9,
    name: 'Portugal',
    nativeName: 'Portugu\u00EAs',
    flag: '\uD83C\uDDF5\uD83C\uDDF9',
    timezone: 'Europe/Lisbon',
    firstDayOfWeek: 1, // Monday
    decimalSeparator: ',',
    thousandsSeparator: ' ',
    // Medical specific
    healthcareSystem: 'SNS',
    prescriptionFormat: 'PT',
    consentLanguage: 'pt'
  },
  'de-DE': {
    code: 'de-DE',
    country: 'DE',
    language: 'de',
    currency: 'EUR',
    currencySymbol: '\u20AC',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: 'HH:mm',
    dateTimeFormat: 'DD.MM.YYYY HH:mm',
    phonePrefix: '+49',
    phoneDigits: 10,
    name: 'Deutschland',
    nativeName: 'Deutsch',
    flag: '\uD83C\uDDE9\uD83C\uDDEA',
    timezone: 'Europe/Berlin',
    firstDayOfWeek: 1, // Monday
    decimalSeparator: ',',
    thousandsSeparator: '.',
    // Medical specific
    healthcareSystem: 'GKV',
    prescriptionFormat: 'DE',
    consentLanguage: 'de'
  },
  'it-IT': {
    code: 'it-IT',
    country: 'IT',
    language: 'it',
    currency: 'EUR',
    currencySymbol: '\u20AC',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    dateTimeFormat: 'DD/MM/YYYY HH:mm',
    phonePrefix: '+39',
    phoneDigits: 10,
    name: 'Italia',
    nativeName: 'Italiano',
    flag: '\uD83C\uDDEE\uD83C\uDDF9',
    timezone: 'Europe/Rome',
    firstDayOfWeek: 1, // Monday
    decimalSeparator: ',',
    thousandsSeparator: '.',
    // Medical specific
    healthcareSystem: 'SSN',
    prescriptionFormat: 'IT',
    consentLanguage: 'it'
  },
  'nl-BE': {
    code: 'nl-BE',
    country: 'BE',
    language: 'nl',
    currency: 'EUR',
    currencySymbol: '\u20AC',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    dateTimeFormat: 'DD/MM/YYYY HH:mm',
    phonePrefix: '+32',
    phoneDigits: 9,
    name: 'Belgi\u00EB',
    nativeName: 'Nederlands (BE)',
    flag: '\uD83C\uDDE7\uD83C\uDDEA',
    timezone: 'Europe/Brussels',
    firstDayOfWeek: 1, // Monday
    decimalSeparator: ',',
    thousandsSeparator: '.',
    // Medical specific
    healthcareSystem: 'INAMI',
    prescriptionFormat: 'BE',
    consentLanguage: 'nl'
  },
  'fr-BE': {
    code: 'fr-BE',
    country: 'BE',
    language: 'fr',
    currency: 'EUR',
    currencySymbol: '\u20AC',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    dateTimeFormat: 'DD/MM/YYYY HH:mm',
    phonePrefix: '+32',
    phoneDigits: 9,
    name: 'Belgique',
    nativeName: 'Fran\u00E7ais (BE)',
    flag: '\uD83C\uDDE7\uD83C\uDDEA',
    timezone: 'Europe/Brussels',
    firstDayOfWeek: 1, // Monday
    decimalSeparator: ',',
    thousandsSeparator: '.',
    // Medical specific
    healthcareSystem: 'INAMI',
    prescriptionFormat: 'BE',
    consentLanguage: 'fr'
  },
  'fr-CH': {
    code: 'fr-CH',
    country: 'CH',
    language: 'fr',
    currency: 'CHF',
    currencySymbol: 'CHF',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: 'HH:mm',
    dateTimeFormat: 'DD.MM.YYYY HH:mm',
    phonePrefix: '+41',
    phoneDigits: 9,
    name: 'Suisse',
    nativeName: 'Fran\u00E7ais (CH)',
    flag: '\uD83C\uDDE8\uD83C\uDDED',
    timezone: 'Europe/Zurich',
    firstDayOfWeek: 1, // Monday
    decimalSeparator: '.',
    thousandsSeparator: "'",
    // Medical specific
    healthcareSystem: 'LAMal',
    prescriptionFormat: 'CH',
    consentLanguage: 'fr'
  }
};

/**
 * Locale par defaut
 */
export const DEFAULT_LOCALE = 'fr-FR';

/**
 * Locales actuellement actives dans l'application
 * (sous-ensemble de LOCALE_CONFIG)
 */
export const ACTIVE_LOCALES = ['fr-FR', 'es-ES', 'en-GB'];

/**
 * Obtenir la configuration d'une locale
 * @param {string} locale - Code locale (ex: 'fr-FR')
 * @returns {Object} Configuration de la locale
 */
export function getLocaleConfig(locale) {
  return LOCALE_CONFIG[locale] || LOCALE_CONFIG[DEFAULT_LOCALE];
}

/**
 * Verifier si une locale est valide
 * @param {string} locale - Code locale
 * @returns {boolean}
 */
export function isValidLocale(locale) {
  return ACTIVE_LOCALES.includes(locale);
}

/**
 * Obtenir toutes les locales actives avec leurs configs
 * @returns {Array} Liste des configurations de locales actives
 */
export function getActiveLocales() {
  return ACTIVE_LOCALES.map(code => ({
    ...LOCALE_CONFIG[code],
    code
  }));
}

/**
 * Trouver une locale a partir du code pays
 * @param {string} country - Code pays ISO (FR, ES, GB...)
 * @returns {string} Code locale
 */
export function getLocaleByCountry(country) {
  const entry = Object.entries(LOCALE_CONFIG).find(
    ([, config]) => config.country === country
  );
  return entry ? entry[0] : DEFAULT_LOCALE;
}

/**
 * Trouver une locale a partir de la langue
 * @param {string} language - Code langue (fr, es, en...)
 * @returns {string} Code locale (premiere correspondance)
 */
export function getLocaleByLanguage(language) {
  const entry = Object.entries(LOCALE_CONFIG).find(
    ([code, config]) => config.language === language && ACTIVE_LOCALES.includes(code)
  );
  return entry ? entry[0] : DEFAULT_LOCALE;
}

/**
 * Detecter la locale preferee de l'utilisateur
 * @returns {string} Code locale detecte
 */
export function detectPreferredLocale() {
  // 1. Check localStorage (returning user)
  try {
    const stored = localStorage.getItem('preferred_locale');
    if (stored && isValidLocale(stored)) {
      return stored;
    }
  } catch (e) {
    // localStorage not available
  }

  // 2. Check browser language
  if (typeof navigator !== 'undefined') {
    const browserLang = navigator.language || navigator.userLanguage;

    // Try exact match first (fr-FR, es-ES)
    if (isValidLocale(browserLang)) {
      return browserLang;
    }

    // Try language-only match (fr -> fr-FR, es -> es-ES)
    const langOnly = browserLang.split('-')[0];
    const matchedLocale = getLocaleByLanguage(langOnly);
    if (matchedLocale !== DEFAULT_LOCALE || langOnly === 'fr') {
      return matchedLocale;
    }
  }

  // 3. Default
  return DEFAULT_LOCALE;
}

/**
 * Sauvegarder la locale preferee
 * @param {string} locale - Code locale
 */
export function savePreferredLocale(locale) {
  if (isValidLocale(locale)) {
    try {
      localStorage.setItem('preferred_locale', locale);
    } catch (e) {
      // localStorage not available
    }
  }
}

export default {
  LOCALE_CONFIG,
  DEFAULT_LOCALE,
  ACTIVE_LOCALES,
  getLocaleConfig,
  isValidLocale,
  getActiveLocales,
  getLocaleByCountry,
  getLocaleByLanguage,
  detectPreferredLocale,
  savePreferredLocale
};
