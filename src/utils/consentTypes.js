/**
 * Unified Consent Types Configuration
 *
 * This file provides consent types with dynamic loading from the API
 * and fallback to static data if the API is unavailable.
 *
 * MIGRATION NOTE: This file is being deprecated in favor of useSystemCategories hook.
 * New components should use: import { useConsentTypes } from '../hooks/useSystemCategories';
 *
 * For legacy compatibility, this file still exports:
 * - Static CONSENT_TYPES object
 * - Utility functions with dynamic loading support
 *
 * Backend routes:
 * - /var/www/medical-pro-backend/src/routes/system-categories.js (new)
 * - /var/www/medical-pro-backend/src/routes/consent-templates.js
 * - /var/www/medical-pro-backend/src/routes/consents.js
 */

import systemCategoriesApi from '../api/systemCategoriesApi';

// Cache for dynamic consent types
let cachedConsentTypes = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Listen for category updates to clear cache
const CATEGORY_UPDATE_EVENT = 'systemCategoriesUpdated';
if (typeof window !== 'undefined') {
  window.addEventListener(CATEGORY_UPDATE_EVENT, (event) => {
    const updatedType = event.detail?.type;
    if (!updatedType || updatedType === 'consent_type') {
      cachedConsentTypes = null;
      cacheTimestamp = 0;
    }
  });
}

// Types de consentement unifiés (fallback/synchronisés avec le backend)
export const CONSENT_TYPES = {
  MEDICAL_TREATMENT: {
    id: 'medical_treatment',
    name: 'Soins médicaux',
    description: 'Consentement pour interventions et soins médicaux généraux',
    required: true,
    renewable: false,
    defaultDuration: null,
    icon: 'Heart',
    color: 'blue'
  },
  SURGERY: {
    id: 'surgery',
    name: 'Chirurgie',
    description: 'Consentement pour interventions chirurgicales',
    required: true,
    renewable: false,
    defaultDuration: null,
    icon: 'Scissors',
    color: 'red'
  },
  ANESTHESIA: {
    id: 'anesthesia',
    name: 'Anesthésie',
    description: 'Consentement pour actes anesthésiques',
    required: true,
    renewable: false,
    defaultDuration: null,
    icon: 'Moon',
    color: 'purple'
  },
  DIAGNOSTIC: {
    id: 'diagnostic',
    name: 'Examens diagnostiques',
    description: 'Consentement pour examens et tests diagnostiques',
    required: false,
    renewable: true,
    defaultDuration: 365,
    icon: 'Search',
    color: 'indigo'
  },
  TELEHEALTH: {
    id: 'telehealth',
    name: 'Télémédecine',
    description: 'Consentement pour consultations à distance',
    required: false,
    renewable: true,
    defaultDuration: 365,
    icon: 'Video',
    color: 'cyan'
  },
  CLINICAL_TRIAL: {
    id: 'clinical_trial',
    name: 'Essai clinique',
    description: 'Consentement pour participation à un essai clinique ou recherche',
    required: true,
    renewable: false,
    defaultDuration: null,
    icon: 'FlaskConical',
    color: 'orange'
  },
  MINOR_TREATMENT: {
    id: 'minor_treatment',
    name: 'Traitement de mineur',
    description: 'Consentement parental pour soins sur mineur',
    required: true,
    renewable: false,
    defaultDuration: null,
    icon: 'Baby',
    color: 'pink'
  },
  DATA_PROCESSING: {
    id: 'data_processing',
    name: 'RGPD / Données personnelles',
    description: 'Consentement pour le traitement des données personnelles (RGPD)',
    required: true,
    renewable: true,
    defaultDuration: null,
    icon: 'Database',
    color: 'gray'
  },
  PHOTO: {
    id: 'photo',
    name: 'Droit à l\'image',
    description: 'Consentement pour prise et utilisation de photos/vidéos',
    required: false,
    renewable: true,
    defaultDuration: 365,
    icon: 'Camera',
    color: 'amber'
  },
  COMMUNICATION: {
    id: 'communication',
    name: 'Communication',
    description: 'Consentement pour communications marketing et newsletters',
    required: false,
    renewable: true,
    defaultDuration: 365,
    icon: 'Mail',
    color: 'green'
  },
  DENTAL: {
    id: 'dental',
    name: 'Soins dentaires',
    description: 'Consentement spécifique pour soins dentaires',
    required: true,
    renewable: false,
    defaultDuration: null,
    icon: 'Smile',
    color: 'teal'
  },
  MENTAL_HEALTH: {
    id: 'mental_health',
    name: 'Santé mentale',
    description: 'Consentement pour soins en santé mentale',
    required: true,
    renewable: false,
    defaultDuration: null,
    icon: 'Brain',
    color: 'violet'
  },
  PREVENTION: {
    id: 'prevention',
    name: 'Prévention / Vaccination',
    description: 'Consentement pour actes de prévention et vaccinations',
    required: false,
    renewable: true,
    defaultDuration: 365,
    icon: 'Shield',
    color: 'lime'
  },
  GENERAL_CARE: {
    id: 'general_care',
    name: 'Soins généraux',
    description: 'Consentement général pour prise en charge médicale',
    required: true,
    renewable: false,
    defaultDuration: null,
    icon: 'Stethoscope',
    color: 'sky'
  }
};

// Méthodes de collecte des consentements
export const COLLECTION_METHODS = {
  DIGITAL: { id: 'digital', name: 'Numérique (formulaire)', nameKey: 'consents:collectionMethods.digital', icon: 'Monitor' },
  VERBAL: { id: 'verbal', name: 'Verbal (avec témoin)', nameKey: 'consents:collectionMethods.verbal', icon: 'Mic' },
  WRITTEN: { id: 'written', name: 'Écrit (signature physique)', nameKey: 'consents:collectionMethods.written', icon: 'PenTool' },
  ELECTRONIC: { id: 'electronic', name: 'Signature électronique', nameKey: 'consents:collectionMethods.electronic', icon: 'Edit3' }
};

// Liste des IDs de types pour la validation
export const CONSENT_TYPE_IDS = Object.values(CONSENT_TYPES).map(t => t.id);

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Obtenir un type de consentement par son ID
 * @param {string} typeId - ID du type (ex: 'medical_treatment')
 * @returns {Object|null} - Objet type ou null
 */
export function getConsentTypeById(typeId) {
  if (!typeId) return null;
  return Object.values(CONSENT_TYPES).find(t => t.id === typeId) || null;
}

/**
 * Obtenir le nom d'un type de consentement par son ID
 * @param {string} typeId - ID du type
 * @returns {string} - Nom du type ou l'ID si non trouvé
 */
export function getConsentTypeName(typeId) {
  const type = getConsentTypeById(typeId);
  return type ? type.name : typeId;
}

/**
 * Obtenir la description d'un type de consentement
 * @param {string} typeId - ID du type
 * @returns {string} - Description ou chaîne vide
 */
export function getConsentTypeDescription(typeId) {
  const type = getConsentTypeById(typeId);
  return type ? type.description : '';
}

/**
 * Vérifier si un type de consentement est obligatoire
 * @param {string} typeId - ID du type
 * @returns {boolean}
 */
export function isConsentTypeRequired(typeId) {
  const type = getConsentTypeById(typeId);
  return type ? type.required : false;
}

/**
 * Obtenir tous les types de consentement sous forme de liste
 * @returns {Array} - Liste des types
 */
export function getConsentTypesList() {
  return Object.values(CONSENT_TYPES);
}

/**
 * Obtenir les types de consentement sous forme d'options pour un select
 * @param {boolean} includeAll - Inclure une option "Tous les types"
 * @returns {Array} - Liste d'options {value, label}
 */
export function getConsentTypesOptions(includeAll = false) {
  const options = Object.values(CONSENT_TYPES).map(type => ({
    value: type.id,
    label: type.name,
    description: type.description,
    required: type.required
  }));

  if (includeAll) {
    options.unshift({ value: '', label: 'Tous les types', description: '' });
  }

  return options;
}

/**
 * Filtrer les modèles de consentement par type
 * @param {Array} templates - Liste des modèles
 * @param {string} typeId - ID du type à filtrer (vide = tous)
 * @returns {Array} - Modèles filtrés
 */
export function filterTemplatesByType(templates, typeId) {
  if (!templates || !Array.isArray(templates)) return [];
  if (!typeId) return templates;

  return templates.filter(template => {
    const templateType = template.consentType || template.consent_type || template.type;
    return templateType === typeId || templateType === 'general_care';
  });
}

/**
 * Obtenir le nom d'une méthode de collecte
 * @param {string} methodId - ID de la méthode
 * @returns {string} - Nom de la méthode
 */
export function getCollectionMethodName(methodId) {
  const method = Object.values(COLLECTION_METHODS).find(m => m.id === methodId);
  return method ? method.name : methodId;
}

/**
 * Obtenir les méthodes de collecte sous forme d'options pour un select
 * @returns {Array} - Liste d'options {value, label}
 */
export function getCollectionMethodsOptions() {
  return Object.values(COLLECTION_METHODS).map(method => ({
    value: method.id,
    label: method.name
  }));
}

// ============================================
// DYNAMIC LOADING FUNCTIONS
// ============================================

/**
 * Load consent types from API (with caching)
 * @returns {Promise<Array>} List of consent types
 */
export async function loadConsentTypesFromApi() {
  const now = Date.now();

  // Return cached data if still valid
  if (cachedConsentTypes && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedConsentTypes;
  }

  try {
    const response = await systemCategoriesApi.getConsentTypes();
    if (response.data && Array.isArray(response.data)) {
      cachedConsentTypes = response.data;
      cacheTimestamp = now;
      return cachedConsentTypes;
    }
  } catch (error) {
    console.warn('[consentTypes] API unavailable, using static data:', error.message);
  }

  // Fallback to static data
  return Object.values(CONSENT_TYPES);
}

/**
 * Get consent type by ID (with API fallback)
 * @param {string} typeId - ID of the type
 * @param {string} lang - Language for translations
 * @returns {Promise<Object|null>} Consent type or null
 */
export async function getConsentTypeByIdAsync(typeId, lang = 'es') {
  if (!typeId) return null;

  try {
    const types = await loadConsentTypesFromApi();
    const apiType = types.find(t => t.code === typeId);

    if (apiType) {
      return {
        id: apiType.code,
        name: apiType.translations?.[lang]?.name || apiType.translations?.es?.name || apiType.code,
        description: apiType.translations?.[lang]?.description || apiType.translations?.es?.description || '',
        required: apiType.metadata?.required || false,
        renewable: apiType.metadata?.renewable || false,
        defaultDuration: apiType.metadata?.defaultDuration || null,
        icon: apiType.metadata?.icon || 'FileText',
        color: apiType.metadata?.color || 'blue'
      };
    }
  } catch (error) {
    console.warn('[consentTypes] getConsentTypeByIdAsync failed:', error.message);
  }

  // Fallback to static
  return getConsentTypeById(typeId);
}

/**
 * Get consent type name (with API fallback)
 * @param {string} typeId - ID of the type
 * @param {string} lang - Language for translations
 * @returns {Promise<string>} Type name
 */
export async function getConsentTypeNameAsync(typeId, lang = 'es') {
  const type = await getConsentTypeByIdAsync(typeId, lang);
  return type ? type.name : typeId;
}

/**
 * Get all consent types as options (with API fallback)
 * @param {boolean} includeAll - Include "All types" option
 * @param {string} lang - Language for translations
 * @returns {Promise<Array>} List of options
 */
export async function getConsentTypesOptionsAsync(includeAll = false, lang = 'es') {
  try {
    const types = await loadConsentTypesFromApi();

    const options = types.map(type => ({
      value: type.code,
      label: type.translations?.[lang]?.name || type.translations?.es?.name || type.code,
      description: type.translations?.[lang]?.description || type.translations?.es?.description || '',
      required: type.metadata?.required || false
    }));

    if (includeAll) {
      options.unshift({ value: '', label: 'Tous les types', description: '' });
    }

    return options;
  } catch (error) {
    console.warn('[consentTypes] getConsentTypesOptionsAsync failed:', error.message);
  }

  // Fallback to static
  return getConsentTypesOptions(includeAll);
}

/**
 * Clear the consent types cache
 * Call this after updating consent types in the admin panel
 */
export function clearConsentTypesCache() {
  cachedConsentTypes = null;
  cacheTimestamp = 0;
}

export default {
  CONSENT_TYPES,
  CONSENT_TYPE_IDS,
  COLLECTION_METHODS,
  // Synchronous functions (static data)
  getConsentTypeById,
  getConsentTypeName,
  getConsentTypeDescription,
  isConsentTypeRequired,
  getConsentTypesList,
  getConsentTypesOptions,
  filterTemplatesByType,
  getCollectionMethodName,
  getCollectionMethodsOptions,
  // Async functions (API with fallback)
  loadConsentTypesFromApi,
  getConsentTypeByIdAsync,
  getConsentTypeNameAsync,
  getConsentTypesOptionsAsync,
  clearConsentTypesCache
};
