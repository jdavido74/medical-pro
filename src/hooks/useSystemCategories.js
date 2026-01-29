/**
 * useSystemCategories Hook
 * Provides access to system categories with caching and translation support
 *
 * Features:
 * - Automatic caching with configurable TTL
 * - Fallback to static data if API fails
 * - Translation support based on current language
 * - Loading and error states
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import systemCategoriesApi from '../api/systemCategoriesApi';

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map();

// Event system for real-time synchronization
const CATEGORY_UPDATE_EVENT = 'systemCategoriesUpdated';

/**
 * Dispatch event when categories are updated
 * @param {string} type - Category type that was updated (or null for all)
 */
export const notifyCategoryUpdate = (type = null) => {
  window.dispatchEvent(new CustomEvent(CATEGORY_UPDATE_EVENT, { detail: { type } }));
};

// Fallback data (from legacy consentTypes.js for backwards compatibility)
const FALLBACK_CONSENT_TYPES = [
  { code: 'medical_treatment', name: 'Soins médicaux', color: 'blue', icon: 'Heart', required: true },
  { code: 'surgery', name: 'Chirurgie', color: 'red', icon: 'Scissors', required: true },
  { code: 'anesthesia', name: 'Anesthésie', color: 'purple', icon: 'Moon', required: true },
  { code: 'diagnostic', name: 'Examens diagnostiques', color: 'indigo', icon: 'Search', required: false },
  { code: 'telehealth', name: 'Télémédecine', color: 'cyan', icon: 'Video', required: false },
  { code: 'clinical_trial', name: 'Essai clinique', color: 'orange', icon: 'FlaskConical', required: true },
  { code: 'minor_treatment', name: 'Traitement de mineur', color: 'pink', icon: 'Baby', required: true },
  { code: 'data_processing', name: 'RGPD / Données personnelles', color: 'gray', icon: 'Database', required: true },
  { code: 'photo', name: "Droit à l'image", color: 'amber', icon: 'Camera', required: false },
  { code: 'communication', name: 'Communication', color: 'green', icon: 'Mail', required: false },
  { code: 'dental', name: 'Soins dentaires', color: 'teal', icon: 'Smile', required: true },
  { code: 'mental_health', name: 'Santé mentale', color: 'violet', icon: 'Brain', required: true },
  { code: 'prevention', name: 'Prévention / Vaccination', color: 'lime', icon: 'Shield', required: false },
  { code: 'general_care', name: 'Soins généraux', color: 'sky', icon: 'Stethoscope', required: true }
];

/**
 * Get cached data or fetch new
 */
const getCachedOrFetch = async (cacheKey, fetchFn) => {
  const cached = cache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const result = await fetchFn();
    cache.set(cacheKey, { data: result, timestamp: now });
    return result;
  } catch (error) {
    // If cached data exists (even expired), use it
    if (cached) {
      console.warn(`[useSystemCategories] API failed, using cached data: ${error.message}`);
      return cached.data;
    }
    throw error;
  }
};

/**
 * Clear cache for a specific type or all types
 */
export const clearSystemCategoriesCache = (type = null) => {
  if (type) {
    // Clear both active-only and all (includeInactive) cache variants
    cache.delete(`categories_${type}_false`);
    cache.delete(`categories_${type}_true`);
    cache.delete('categories_grouped');
  } else {
    cache.clear();
  }
};

/**
 * Hook to get system categories by type
 * @param {string} type - Category type ('consent_type', 'appointment_type', 'specialty', 'department', 'priority')
 * @param {Object} options - Configuration options
 * @param {boolean} options.includeInactive - Include inactive categories
 * @param {boolean} options.enabled - Whether to fetch (default: true)
 */
export function useSystemCategories(type, options = {}) {
  const { includeInactive = false, enabled = true } = options;
  const { i18n } = useTranslation();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMounted = useRef(true);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    if (!enabled || !type) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const cacheKey = `categories_${type}_${includeInactive}`;
      const response = await getCachedOrFetch(cacheKey, () =>
        systemCategoriesApi.getSystemCategoriesByType(type, includeInactive)
      );

      if (isMounted.current) {
        setCategories(response.data || []);
      }
    } catch (err) {
      console.error(`[useSystemCategories] Error fetching ${type}:`, err);

      if (isMounted.current) {
        setError(err);

        // Use fallback data for consent_type
        if (type === 'consent_type') {
          setCategories(FALLBACK_CONSENT_TYPES.map(c => ({
            ...c,
            id: c.code,
            categoryType: 'consent_type',
            translations: { es: { name: c.name } },
            metadata: { required: c.required, icon: c.icon, color: c.color },
            isActive: true,
            isSystem: true
          })));
        }
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [type, includeInactive, enabled]);

  useEffect(() => {
    isMounted.current = true;
    fetchCategories();

    // Listen for category updates from other components
    const handleCategoryUpdate = (event) => {
      const updatedType = event.detail?.type;
      // Refresh if the updated type matches or if all types were updated
      if (!updatedType || updatedType === type) {
        clearSystemCategoriesCache(type);
        fetchCategories();
      }
    };

    window.addEventListener(CATEGORY_UPDATE_EVENT, handleCategoryUpdate);

    return () => {
      isMounted.current = false;
      window.removeEventListener(CATEGORY_UPDATE_EVENT, handleCategoryUpdate);
    };
  }, [fetchCategories, type]);

  // Get translated name for a category
  const getTranslatedName = useCallback((category) => {
    if (!category) return '';

    const lang = i18n.language?.substring(0, 2) || 'es';
    const translations = category.translations || {};

    return translations[lang]?.name
      || translations.es?.name
      || translations.en?.name
      || category.name
      || category.code;
  }, [i18n.language]);

  // Get translated description for a category
  const getTranslatedDescription = useCallback((category) => {
    if (!category) return '';

    const lang = i18n.language?.substring(0, 2) || 'es';
    const translations = category.translations || {};

    return translations[lang]?.description
      || translations.es?.description
      || translations.en?.description
      || category.description
      || '';
  }, [i18n.language]);

  // Get category by code
  const getByCode = useCallback((code) => {
    return categories.find(c => c.code === code) || null;
  }, [categories]);

  // Get category by ID
  const getById = useCallback((id) => {
    return categories.find(c => c.id === id) || null;
  }, [categories]);

  // Get categories as select options
  const asOptions = useMemo(() => {
    return categories.map(cat => ({
      value: cat.code,
      label: getTranslatedName(cat),
      description: getTranslatedDescription(cat),
      data: cat
    }));
  }, [categories, getTranslatedName, getTranslatedDescription]);

  // Refresh data (clears cache and refetches)
  const refresh = useCallback(() => {
    if (type) {
      clearSystemCategoriesCache(type);
    }
    return fetchCategories();
  }, [type, fetchCategories]);

  return {
    categories,
    loading,
    error,
    getTranslatedName,
    getTranslatedDescription,
    getByCode,
    getById,
    asOptions,
    refresh
  };
}

/**
 * Hook to get all system categories grouped by type
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether to fetch (default: true)
 */
export function useSystemCategoriesGrouped(options = {}) {
  const { enabled = true } = options;
  const { i18n } = useTranslation();

  const [grouped, setGrouped] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMounted = useRef(true);

  // Fetch grouped categories
  const fetchGrouped = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await getCachedOrFetch('categories_grouped', () =>
        systemCategoriesApi.getSystemCategoriesGrouped()
      );

      if (isMounted.current) {
        setGrouped(response.data || {});
      }
    } catch (err) {
      console.error('[useSystemCategoriesGrouped] Error:', err);
      if (isMounted.current) {
        setError(err);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [enabled]);

  useEffect(() => {
    isMounted.current = true;
    fetchGrouped();

    return () => {
      isMounted.current = false;
    };
  }, [fetchGrouped]);

  // Get translated name for a category
  const getTranslatedName = useCallback((category) => {
    if (!category) return '';

    const lang = i18n.language?.substring(0, 2) || 'es';
    const translations = category.translations || {};

    return translations[lang]?.name
      || translations.es?.name
      || translations.en?.name
      || category.name
      || category.code;
  }, [i18n.language]);

  // Refresh data
  const refresh = useCallback(() => {
    clearSystemCategoriesCache();
    return fetchGrouped();
  }, [fetchGrouped]);

  return {
    grouped,
    loading,
    error,
    getTranslatedName,
    refresh
  };
}

/**
 * Convenience hook for consent types
 */
export function useConsentTypes(options = {}) {
  return useSystemCategories('consent_type', options);
}

/**
 * Convenience hook for appointment types
 */
export function useAppointmentTypes(options = {}) {
  return useSystemCategories('appointment_type', options);
}

/**
 * Convenience hook for specialties
 */
export function useSpecialties(options = {}) {
  return useSystemCategories('specialty', options);
}

/**
 * Convenience hook for departments
 */
export function useDepartments(options = {}) {
  return useSystemCategories('department', options);
}

/**
 * Convenience hook for priorities
 */
export function usePriorities(options = {}) {
  return useSystemCategories('priority', options);
}

export default useSystemCategories;
