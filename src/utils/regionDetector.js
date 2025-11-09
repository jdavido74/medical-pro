/**
 * Region Detection Utility
 *
 * Detects the medical clinic region (country) from:
 * 1. Sub-domain (es.medicalpro.com, fr.medicalpro.com)
 * 2. URL path fallback (/es-es, /fr-fr)
 * 3. localStorage (if already detected)
 *
 * Once detected, the region is sticky - user stays in the same instance
 */

const VALID_REGIONS = {
  'es': {
    code: 'es',
    name: 'España',
    language: 'es',
    locale: 'es-ES',
    currency: 'EUR',
    country: 'ES'
  },
  'fr': {
    code: 'fr',
    name: 'France',
    language: 'fr',
    locale: 'fr-FR',
    currency: 'EUR',
    country: 'FR'
  }
};

const DEFAULT_REGION = 'es'; // Spain is default
const REGION_STORAGE_KEY = 'medicalpro_region';

/**
 * Detect region from sub-domain
 * @returns {string|null} Region code or null
 */
export function detectRegionFromSubdomain() {
  if (typeof window === 'undefined') return null;

  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  const potential = parts[0].toLowerCase();

  // Check if first part is a valid region code
  if (VALID_REGIONS[potential]) {
    return potential;
  }

  return null;
}

/**
 * Detect region from URL path
 * Supports: /es-es, /fr-fr (path-based fallback)
 * @returns {string|null} Region code or null
 */
export function detectRegionFromPath() {
  if (typeof window === 'undefined') return null;

  const pathname = window.location.pathname;
  const match = pathname.match(/^\/(es|fr)/);

  return match ? match[1] : null;
}

/**
 * Detect region from localStorage
 * @returns {string|null} Region code or null
 */
export function detectRegionFromStorage() {
  try {
    const stored = localStorage.getItem(REGION_STORAGE_KEY);
    if (stored && VALID_REGIONS[stored]) {
      return stored;
    }
  } catch (e) {
    console.warn('Failed to read region from localStorage:', e);
  }

  return null;
}

/**
 * Main region detection function
 * Priority order:
 * 1. Sub-domain (es.medicalpro.com)
 * 2. URL path (/es-es, /fr-fr)
 * 3. Stored region (sticky region)
 * 4. Default (es)
 *
 * @returns {string} Region code (es, fr)
 */
export function detectRegion() {
  // 1. Check sub-domain first (highest priority)
  const subdomain = detectRegionFromSubdomain();
  if (subdomain) {
    // Save to storage for consistency
    setRegionInStorage(subdomain);
    return subdomain;
  }

  // 2. Check URL path
  const pathRegion = detectRegionFromPath();
  if (pathRegion) {
    setRegionInStorage(pathRegion);
    return pathRegion;
  }

  // 3. Check localStorage
  const storedRegion = detectRegionFromStorage();
  if (storedRegion) {
    return storedRegion;
  }

  // 4. Use default
  return DEFAULT_REGION;
}

/**
 * Save region to localStorage (sticky region)
 * @param {string} region Region code
 */
export function setRegionInStorage(region) {
  if (VALID_REGIONS[region]) {
    try {
      localStorage.setItem(REGION_STORAGE_KEY, region);
    } catch (e) {
      console.warn('Failed to save region to localStorage:', e);
    }
  }
}

/**
 * Get region configuration
 * @param {string} region Region code
 * @returns {Object} Region configuration
 */
export function getRegionConfig(region) {
  return VALID_REGIONS[region] || VALID_REGIONS[DEFAULT_REGION];
}

/**
 * Get default language for region
 * @param {string} region Region code
 * @returns {string} Language code (es, fr, en)
 */
export function getRegionLanguage(region) {
  const config = getRegionConfig(region);
  return config.language;
}

/**
 * Get default locale for region
 * @param {string} region Region code
 * @returns {string} Locale code (es-ES, fr-FR)
 */
export function getRegionLocale(region) {
  const config = getRegionConfig(region);
  return config.locale;
}

/**
 * Check if region is valid
 * @param {string} region Region code
 * @returns {boolean}
 */
export function isValidRegion(region) {
  return !!VALID_REGIONS[region];
}

/**
 * Get all available regions
 * @returns {Object} All region configurations
 */
export function getAllRegions() {
  return VALID_REGIONS;
}

export default {
  detectRegion,
  detectRegionFromSubdomain,
  detectRegionFromPath,
  detectRegionFromStorage,
  setRegionInStorage,
  getRegionConfig,
  getRegionLanguage,
  getRegionLocale,
  isValidRegion,
  getAllRegions,
  DEFAULT_REGION,
  VALID_REGIONS
};
