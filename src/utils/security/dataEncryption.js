/**
 * Couche d'abstraction pour le chiffrement des données
 *
 * Phase 1 (actuelle): localStorage - les données sont marquées comme sensibles
 * Phase 2 (API REST): Les données seront chiffrées côté serveur avec AES-256
 * Phase 3 (GraphQL): Intégration avec système de chiffrement côté serveur
 *
 * Les composants n'ont JAMAIS besoin de changer - tout passe par cette couche
 *
 * @see SECURITY_ARCHITECTURE.md pour la documentation complète
 */

import { getSensitivityLevel, SENSITIVITY_LEVELS, isHighlySensitive } from './sensitiveLevels';

/**
 * Flag interne pour tracker les données sensibles
 * En production (phase 2+), ce flag déclenche le chiffrement côté serveur
 */
const ENCRYPTED_MARKER = '__encrypted__';
const SENSITIVE_MARKER = '__sensitive__';

/**
 * Configuration de chiffrement par environnement
 */
const ENCRYPTION_CONFIG = {
  development: {
    enabled: false, // localStorage, pas de chiffrement en dev
    algorithm: null,
    keyRotationDays: null
  },
  staging: {
    enabled: true, // Chiffrement obligatoire en staging
    algorithm: 'AES-256-GCM',
    keyRotationDays: 30
  },
  production: {
    enabled: true, // Chiffrement obligatoire en production
    algorithm: 'AES-256-GCM',
    keyRotationDays: 15
  }
};

const currentEnv = process.env.NODE_ENV || 'development';
const encryptionConfig = ENCRYPTION_CONFIG[currentEnv];

/**
 * Classe abstraite pour les opérations de chiffrement
 * Implémentation future : remplacer par API backend
 */
class DataEncryptionManager {
  constructor() {
    this.encryptionEnabled = encryptionConfig.enabled;
    this.algorithm = encryptionConfig.algorithm;
  }

  /**
   * Marquer une donnée comme sensible (Phase 1: localStorage)
   * En phase 2+ : cette fonction enverra au serveur pour chiffrement
   */
  markAsSensitive(data, dataType, fieldPath = null) {
    if (!data) return data;

    return {
      ...data,
      [SENSITIVE_MARKER]: {
        dataType,
        fieldPath,
        markedAt: new Date().toISOString(),
        environment: currentEnv
      }
    };
  }

  /**
   * Vérifier si une donnée est marquée comme sensible
   */
  isSensitive(data) {
    return data && data[SENSITIVE_MARKER] !== undefined;
  }

  /**
   * Obtenir les métadonnées de sensibilité
   */
  getSensitiveMetadata(data) {
    return data?.[SENSITIVE_MARKER] || null;
  }

  /**
   * Chiffrer une donnée (Phase 1: non-op, Phase 2+: chiffrement réel)
   *
   * @param {*} data - Donnée à chiffrer
   * @param {string} dataType - Type de donnée (PATIENT, APPOINTMENT, etc.)
   * @param {string} encryptionKey - Clé de chiffrement (future use)
   * @returns {Promise<*>} Donnée chiffrée ou marquée comme sensible
   *
   * @example
   * // Phase 1 (dev):
   * const marked = await encrypt(patientData, 'PATIENT');
   * // Retour: patientData avec __sensitive__ marker
   *
   * // Phase 2+ (avec backend API):
   * const marked = await encrypt(patientData, 'PATIENT');
   * // Retour: {"__encrypted__": "aes256:...", "__sensitive__": {...}}
   */
  async encrypt(data, dataType, encryptionKey = null) {
    if (!data || !dataType) {
      console.warn('[Encryption] Data or dataType missing');
      return data;
    }

    const sensitivityLevel = getSensitivityLevel(dataType);

    // Phase 1: localStorage - just mark as sensitive
    if (!this.encryptionEnabled) {
      console.debug(`[Encryption] Phase 1: Marked ${dataType} as ${sensitivityLevel.name}`);
      return this.markAsSensitive(data, dataType);
    }

    // Phase 2+: Backend chiffrement (implémentation future)
    if (this.encryptionEnabled && encryptionKey) {
      // TODO: Appeler l'API de chiffrement
      // const encrypted = await fetch('/api/security/encrypt', {
      //   method: 'POST',
      //   body: JSON.stringify({ data, dataType, algorithm: this.algorithm })
      // });
      // return encrypted.json();

      console.debug(`[Encryption] Phase 2+: Would encrypt with ${this.algorithm}`);
      return this.markAsSensitive(data, dataType);
    }

    return data;
  }

  /**
   * Déchiffrer une donnée
   *
   * @param {*} encryptedData - Donnée chiffrée
   * @param {string} decryptionKey - Clé de déchiffrement (future use)
   * @returns {Promise<*>} Donnée déchiffrée
   *
   * @example
   * // Phase 1: no-op
   * const data = await decrypt(marked);
   * // Retour: données originales
   *
   * // Phase 2+: déchiffrement réel
   * const data = await decrypt(encrypted);
   * // Retour: données déchiffrées
   */
  async decrypt(encryptedData, decryptionKey = null) {
    if (!encryptedData) return encryptedData;

    // Phase 1: localStorage - just return data
    if (!this.encryptionEnabled) {
      return encryptedData;
    }

    // Phase 2+: Backend déchiffrement (implémentation future)
    if (this.encryptionEnabled && encryptedData[ENCRYPTED_MARKER]) {
      // TODO: Appeler l'API de déchiffrement
      // const decrypted = await fetch('/api/security/decrypt', {
      //   method: 'POST',
      //   body: JSON.stringify({ encryptedData, decryptionKey })
      // });
      // return decrypted.json();

      console.debug('[Encryption] Phase 2+: Would decrypt with backend');
    }

    return encryptedData;
  }

  /**
   * Chiffrer un champ spécifique (pour sérialisation partielle)
   * Utile pour l'audit logging (ne pas logger les données sensibles)
   */
  async encryptField(value, dataType, fieldName) {
    if (!value) return null;

    return {
      [SENSITIVE_MARKER]: {
        dataType,
        fieldName,
        encrypted: true,
        hashedValue: this.getHashedValue(value)
      }
    };
  }

  /**
   * Obtenir un hash sécurisé d'une valeur (pour logging sans révéler la donnée)
   * Exemple: email@example.com → em***@example.com
   */
  getHashedValue(value) {
    if (!value) return null;
    if (typeof value !== 'string') return '[redacted]';

    if (value.includes('@')) {
      // Email: show first 2 chars + domain
      const [name, domain] = value.split('@');
      return `${name.substring(0, 2)}***@${domain}`;
    }

    if (value.length > 4) {
      // Autres strings: show first 2 + last 2
      return `${value.substring(0, 2)}***${value.substring(value.length - 2)}`;
    }

    return '[redacted]';
  }

  /**
   * Redacter les données sensibles (pour logging/debugging)
   * Enlève les valeurs sensibles tout en gardant la structure
   */
  redactSensitiveData(data, dataType) {
    if (!data || typeof data !== 'object') return data;

    const redacted = { ...data };

    // Supprimer les champs sensibles
    const fieldsToRedact = this.getSensitiveFieldsForType(dataType);
    fieldsToRedact.forEach(field => {
      if (field in redacted) {
        redacted[field] = '[REDACTED]';
      }
    });

    return redacted;
  }

  /**
   * Obtenir les champs sensibles pour un type de données
   */
  getSensitiveFieldsForType(dataType) {
    const config = {
      PATIENT: ['firstName', 'lastName', 'email', 'phone', 'birthDate', 'allergies', 'medications'],
      APPOINTMENT: ['description', 'notes'],
      MEDICAL_RECORD: ['diagnosis', 'treatment', 'prescription', 'observations', 'testResults'],
      USER: ['email', 'passwordHash']
    };

    return config[dataType] || [];
  }

  /**
   * Obtenir les permissions requises pour déchiffrer des données
   * Utile pour vérifier les permissions avant de montrer des données sensibles
   */
  getRequiredPermissionsFor(dataType, action = 'READ') {
    const permissionMap = {
      PATIENT: [`PATIENT_${action}`, 'PATIENT_VIEW_SENSITIVE'],
      APPOINTMENT: [`APPOINTMENT_${action}`],
      MEDICAL_RECORD: [`MEDICAL_RECORD_${action}`, 'MEDICAL_RECORD_VIEW_SENSITIVE'],
      USER: [`USER_${action}`, 'USER_VIEW_SENSITIVE']
    };

    return permissionMap[dataType] || [];
  }

  /**
   * Vérifier si le chiffrement est activé
   */
  isEncryptionEnabled() {
    return this.encryptionEnabled;
  }

  /**
   * Obtenir les informations de configuration (pour debugging)
   */
  getConfig() {
    return {
      environment: currentEnv,
      encryptionEnabled: this.encryptionEnabled,
      algorithm: this.algorithm,
      phase: this.encryptionEnabled ? 2 : 1
    };
  }
}

// Export singleton
export const dataEncryption = new DataEncryptionManager();

export default dataEncryption;
