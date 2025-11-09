/**
 * Classification des niveaux de sensibilité des données
 * Utilisé pour appliquer les bonnes mesures de sécurité
 *
 * @see SECURITY_ARCHITECTURE.md pour la documentation complète
 */

export const SENSITIVITY_LEVELS = {
  // PUBLIC - Pas besoin de chiffrement spécial
  PUBLIC: {
    level: 0,
    name: 'public',
    description: 'Données publiques, pas de sensibilité'
  },

  // INTERNAL - Données internes, besoin de contrôle d'accès
  INTERNAL: {
    level: 1,
    name: 'internal',
    description: 'Données internes, accès restreint'
  },

  // CONFIDENTIAL - Données confidentielles, besoin de chiffrement
  CONFIDENTIAL: {
    level: 2,
    name: 'confidential',
    description: 'Données confidentielles - chiffrement requis'
  },

  // HIGHLY_SENSITIVE - Données très sensibles, chiffrement fort requis
  HIGHLY_SENSITIVE: {
    level: 3,
    name: 'highly_sensitive',
    description: 'Données très sensibles (santé, finances) - chiffrement AES-256 requis'
  }
};

/**
 * Mapping des types de données vers leur niveau de sensibilité
 * Cet objet est la SOURCE DE VÉRITÉ pour la classification
 */
export const DATA_TYPE_SENSITIVITY = {
  // ============= PATIENTS =============
  PATIENT: {
    level: SENSITIVITY_LEVELS.HIGHLY_SENSITIVE,
    fields: {
      // Identifiant unique
      id: SENSITIVITY_LEVELS.CONFIDENTIAL,
      patientNumber: SENSITIVITY_LEVELS.CONFIDENTIAL,

      // Données personnelles
      firstName: SENSITIVITY_LEVELS.HIGHLY_SENSITIVE,
      lastName: SENSITIVITY_LEVELS.HIGHLY_SENSITIVE,
      birthDate: SENSITIVITY_LEVELS.HIGHLY_SENSITIVE,
      birthPlace: SENSITIVITY_LEVELS.CONFIDENTIAL,
      gender: SENSITIVITY_LEVELS.CONFIDENTIAL,
      nationality: SENSITIVITY_LEVELS.CONFIDENTIAL,

      // Contact
      email: SENSITIVITY_LEVELS.HIGHLY_SENSITIVE,
      phone: SENSITIVITY_LEVELS.HIGHLY_SENSITIVE,
      address: SENSITIVITY_LEVELS.HIGHLY_SENSITIVE,

      // Données médicales
      allergies: SENSITIVITY_LEVELS.HIGHLY_SENSITIVE,
      medications: SENSITIVITY_LEVELS.HIGHLY_SENSITIVE,
      medicalHistory: SENSITIVITY_LEVELS.HIGHLY_SENSITIVE,
      bloodType: SENSITIVITY_LEVELS.HIGHLY_SENSITIVE,
      emergencyContact: SENSITIVITY_LEVELS.HIGHLY_SENSITIVE,

      // Données d'assurance
      insuranceCompany: SENSITIVITY_LEVELS.HIGHLY_SENSITIVE,
      insuranceNumber: SENSITIVITY_LEVELS.HIGHLY_SENSITIVE,
      insuranceProvider: SENSITIVITY_LEVELS.CONFIDENTIAL,

      // Metadata non sensible
      status: SENSITIVITY_LEVELS.INTERNAL,
      createdAt: SENSITIVITY_LEVELS.INTERNAL,
      updatedAt: SENSITIVITY_LEVELS.INTERNAL,
      isIncomplete: SENSITIVITY_LEVELS.INTERNAL,
      accessLog: SENSITIVITY_LEVELS.CONFIDENTIAL
    }
  },

  // ============= RENDEZ-VOUS =============
  APPOINTMENT: {
    level: SENSITIVITY_LEVELS.HIGHLY_SENSITIVE,
    fields: {
      id: SENSITIVITY_LEVELS.CONFIDENTIAL,
      patientId: SENSITIVITY_LEVELS.HIGHLY_SENSITIVE,
      practitionerId: SENSITIVITY_LEVELS.CONFIDENTIAL,

      // Données du rendez-vous
      type: SENSITIVITY_LEVELS.CONFIDENTIAL,
      date: SENSITIVITY_LEVELS.CONFIDENTIAL,
      startTime: SENSITIVITY_LEVELS.CONFIDENTIAL,
      endTime: SENSITIVITY_LEVELS.CONFIDENTIAL,
      duration: SENSITIVITY_LEVELS.INTERNAL,

      // Détails
      title: SENSITIVITY_LEVELS.CONFIDENTIAL,
      description: SENSITIVITY_LEVELS.HIGHLY_SENSITIVE,
      notes: SENSITIVITY_LEVELS.HIGHLY_SENSITIVE,

      // Metadata
      status: SENSITIVITY_LEVELS.INTERNAL,
      priority: SENSITIVITY_LEVELS.INTERNAL,
      location: SENSITIVITY_LEVELS.CONFIDENTIAL,
      createdAt: SENSITIVITY_LEVELS.INTERNAL,
      updatedAt: SENSITIVITY_LEVELS.INTERNAL
    }
  },

  // ============= DOSSIERS MÉDICAUX =============
  MEDICAL_RECORD: {
    level: SENSITIVITY_LEVELS.HIGHLY_SENSITIVE,
    fields: {
      id: SENSITIVITY_LEVELS.CONFIDENTIAL,
      patientId: SENSITIVITY_LEVELS.HIGHLY_SENSITIVE,

      // Données médicales
      diagnosis: SENSITIVITY_LEVELS.HIGHLY_SENSITIVE,
      treatment: SENSITIVITY_LEVELS.HIGHLY_SENSITIVE,
      prescription: SENSITIVITY_LEVELS.HIGHLY_SENSITIVE,
      observations: SENSITIVITY_LEVELS.HIGHLY_SENSITIVE,
      testResults: SENSITIVITY_LEVELS.HIGHLY_SENSITIVE,

      // Metadata
      createdAt: SENSITIVITY_LEVELS.INTERNAL,
      practitionerId: SENSITIVITY_LEVELS.CONFIDENTIAL
    }
  },

  // ============= CONSENTEMENTS =============
  CONSENT: {
    level: SENSITIVITY_LEVELS.HIGHLY_SENSITIVE,
    fields: {
      id: SENSITIVITY_LEVELS.CONFIDENTIAL,
      patientId: SENSITIVITY_LEVELS.HIGHLY_SENSITIVE,
      type: SENSITIVITY_LEVELS.CONFIDENTIAL,
      givenAt: SENSITIVITY_LEVELS.CONFIDENTIAL,
      expiresAt: SENSITIVITY_LEVELS.CONFIDENTIAL,
      document: SENSITIVITY_LEVELS.HIGHLY_SENSITIVE,
      signature: SENSITIVITY_LEVELS.HIGHLY_SENSITIVE
    }
  },

  // ============= UTILISATEURS =============
  USER: {
    level: SENSITIVITY_LEVELS.HIGHLY_SENSITIVE,
    fields: {
      id: SENSITIVITY_LEVELS.CONFIDENTIAL,
      email: SENSITIVITY_LEVELS.HIGHLY_SENSITIVE,
      firstName: SENSITIVITY_LEVELS.HIGHLY_SENSITIVE,
      lastName: SENSITIVITY_LEVELS.HIGHLY_SENSITIVE,
      role: SENSITIVITY_LEVELS.CONFIDENTIAL,
      passwordHash: SENSITIVITY_LEVELS.HIGHLY_SENSITIVE,
      createdAt: SENSITIVITY_LEVELS.INTERNAL
    }
  }
};

/**
 * Obtenir le niveau de sensibilité d'un type de données
 * @param {string} dataType - Type de données (PATIENT, APPOINTMENT, etc.)
 * @returns {Object} Niveau de sensibilité
 */
export const getSensitivityLevel = (dataType) => {
  const config = DATA_TYPE_SENSITIVITY[dataType];
  if (!config) {
    console.warn(`Type de données inconnu: ${dataType}`);
    return SENSITIVITY_LEVELS.HIGHLY_SENSITIVE; // Fail-safe: assume sensible
  }
  return config.level;
};

/**
 * Obtenir le niveau de sensibilité d'un champ spécifique
 * @param {string} dataType - Type de données
 * @param {string} field - Nom du champ
 * @returns {Object} Niveau de sensibilité du champ
 */
export const getFieldSensitivityLevel = (dataType, field) => {
  const config = DATA_TYPE_SENSITIVITY[dataType];
  if (!config || !config.fields) {
    return SENSITIVITY_LEVELS.HIGHLY_SENSITIVE; // Fail-safe
  }
  return config.fields[field] || SENSITIVITY_LEVELS.HIGHLY_SENSITIVE; // Fail-safe
};

/**
 * Checker si un type de données est hautement sensible
 * @param {string} dataType - Type de données
 * @returns {boolean}
 */
export const isHighlySensitive = (dataType) => {
  const level = getSensitivityLevel(dataType);
  return level.level >= SENSITIVITY_LEVELS.HIGHLY_SENSITIVE.level;
};

/**
 * Checker si un champ est hautement sensible
 * @param {string} dataType - Type de données
 * @param {string} field - Nom du champ
 * @returns {boolean}
 */
export const isFieldHighlySensitive = (dataType, field) => {
  const level = getFieldSensitivityLevel(dataType, field);
  return level.level >= SENSITIVITY_LEVELS.HIGHLY_SENSITIVE.level;
};

/**
 * Marquer les champs sensibles dans un objet
 * Utilisé pour la sérialisation et le logging sécurisé
 */
export const markSensitiveFields = (dataType, object) => {
  const config = DATA_TYPE_SENSITIVITY[dataType];
  if (!config) return object;

  return {
    ...object,
    __sensitiveLevels: {
      ...config.fields
    }
  };
};

export default {
  SENSITIVITY_LEVELS,
  DATA_TYPE_SENSITIVITY,
  getSensitivityLevel,
  getFieldSensitivityLevel,
  isHighlySensitive,
  isFieldHighlySensitive,
  markSensitiveFields
};
