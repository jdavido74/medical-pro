// utils/consentsStorage.js
import { generateId } from './idGenerator';
import { getClientIPAsync } from '../hooks/useClientIP';
import { CONSENT_TYPES as _CONSENT_TYPES, COLLECTION_METHODS as _COLLECTION_METHODS } from './consentTypes';

const CONSENTS_STORAGE_KEY = 'medicalPro_consents';

// IP caching to prevent excessive API calls (5-minute TTL)
let cachedClientIP = null;
let ipFetchTime = null;
const IP_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getCachedClientIP() {
  const now = Date.now();

  // Use cached IP if still valid
  if (cachedClientIP && ipFetchTime && now - ipFetchTime < IP_CACHE_DURATION) {
    return cachedClientIP;
  }

  try {
    const ip = await getClientIPAsync();
    cachedClientIP = ip;
    ipFetchTime = now;
    return ip;
  } catch (error) {
    console.warn('[ConsentsStorage] Failed to get client IP:', error);
    return 'unknown';
  }
}

// Service de gestion des consentements RGPD et médicaux
export const consentsStorage = {
  // Récupérer tous les consentements
  getAll: () => {
    try {
      const consents = localStorage.getItem(CONSENTS_STORAGE_KEY);
      return consents ? JSON.parse(consents) : [];
    } catch (error) {
      console.error('Erreur lecture consentements:', error);
      return [];
    }
  },

  // Récupérer les consentements d'un patient
  getByPatient: (patientId) => {
    const consents = consentsStorage.getAll();
    return consents
      .filter(consent => consent.patientId === patientId && !consent.deleted)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  // Récupérer les consentements actifs d'un patient par type
  getActiveByPatientAndType: (patientId, type) => {
    const consents = consentsStorage.getByPatient(patientId);
    return consents.filter(consent =>
      consent.type === type &&
      consent.status === 'granted' &&
      (!consent.expiresAt || new Date(consent.expiresAt) > new Date())
    );
  },

  // Vérifier si un patient a donné un consentement spécifique
  hasValidConsent: (patientId, type, purpose = null) => {
    const consents = consentsStorage.getActiveByPatientAndType(patientId, type);
    if (purpose) {
      return consents.some(consent => consent.purpose === purpose);
    }
    return consents.length > 0;
  },

  // Créer un nouveau consentement - US 4.1 & 4.2
  create: async (consentData, userId = 'system') => {
    try {
      const consents = consentsStorage.getAll();

      // Révoquer automatiquement les consentements précédents du même type
      if (consentData.autoRevokePrevious !== false) {
        consentsStorage.revokeByPatientAndType(
          consentData.patientId,
          consentData.type,
          consentData.purpose,
          userId,
          'automatic_replacement'
        );
      }

      const clientIP = await getCachedClientIP();
      const newConsent = {
        id: generateId(),
        ...consentData,
        status: consentData.status || 'granted',
        createdAt: new Date().toISOString(),
        createdBy: userId,
        // Métadonnées de traçabilité - US 4.3
        auditTrail: [{
          action: 'created',
          userId: userId,
          timestamp: new Date().toISOString(),
          ipAddress: clientIP,
          userAgent: navigator.userAgent || 'unknown',
          details: {
            method: consentData.collectionMethod || 'digital',
            witness: consentData.witness
          }
        }]
      };

      consents.push(newConsent);
      localStorage.setItem(CONSENTS_STORAGE_KEY, JSON.stringify(consents));
      return newConsent;
    } catch (error) {
      console.error('Erreur création consentement:', error);
      throw error;
    }
  },

  // Révoquer un consentement - US 4.3
  revoke: async (consentId, userId = 'system', reason = 'patient_request') => {
    try {
      const consents = consentsStorage.getAll();
      const index = consents.findIndex(consent => consent.id === consentId);

      if (index === -1) {
        throw new Error('Consentement non trouvé');
      }

      const currentConsent = consents[index];
      if (currentConsent.status === 'revoked') {
        throw new Error('Consentement déjà révoqué');
      }

      consents[index] = {
        ...currentConsent,
        status: 'revoked',
        revokedAt: new Date().toISOString(),
        revokedBy: userId,
        revocationReason: reason,
        auditTrail: [
          ...currentConsent.auditTrail,
          {
            action: 'revoked',
            userId: userId,
            timestamp: new Date().toISOString(),
            ipAddress: 'localhost',
            userAgent: navigator.userAgent || 'unknown',
            details: { reason }
          }
        ]
      };

      localStorage.setItem(CONSENTS_STORAGE_KEY, JSON.stringify(consents));
      return consents[index];
    } catch (error) {
      console.error('Erreur révocation consentement:', error);
      throw error;
    }
  },

  // Révoquer tous les consentements d'un patient pour un type donné
  revokeByPatientAndType: async (patientId, type, purpose = null, userId = 'system', reason = 'patient_request') => {
    const consents = consentsStorage.getByPatient(patientId);
    const toRevoke = consents.filter(consent => {
      return consent.type === type &&
             consent.status === 'granted' &&
             (!purpose || consent.purpose === purpose);
    });

    toRevoke.forEach(consent => {
      consentsStorage.revoke(consent.id, userId, reason);
    });

    return toRevoke.length;
  },

  // Mettre à jour un consentement
  update: async (consentId, updates, userId = 'system') => {
    try {
      const clientIP = await getCachedClientIP();
      const consents = consentsStorage.getAll();
      const index = consents.findIndex(consent => consent.id === consentId);

      if (index === -1) {
        throw new Error('Consentement non trouvé');
      }

      const currentConsent = consents[index];

      consents[index] = {
        ...currentConsent,
        ...updates,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
        auditTrail: [
          ...currentConsent.auditTrail,
          {
            action: 'updated',
            userId: userId,
            timestamp: new Date().toISOString(),
            ipAddress: clientIP,
            userAgent: navigator.userAgent || 'unknown',
            details: {
              fieldsChanged: Object.keys(updates)
            }
          }
        ]
      };

      localStorage.setItem(CONSENTS_STORAGE_KEY, JSON.stringify(consents));
      return consents[index];
    } catch (error) {
      console.error('Erreur mise à jour consentement:', error);
      throw error;
    }
  },

  // Supprimer définitivement un consentement (soft delete)
  delete: async (consentId, userId = 'system') => {
    try {
      const clientIP = await getCachedClientIP();
      const consents = consentsStorage.getAll();
      const index = consents.findIndex(consent => consent.id === consentId);

      if (index === -1) {
        throw new Error('Consentement non trouvé');
      }

      const currentConsent = consents[index];

      consents[index] = {
        ...currentConsent,
        deleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
        auditTrail: [
          ...currentConsent.auditTrail,
          {
            action: 'deleted',
            userId: userId,
            timestamp: new Date().toISOString(),
            ipAddress: clientIP,
            userAgent: navigator.userAgent || 'unknown'
          }
        ]
      };

      localStorage.setItem(CONSENTS_STORAGE_KEY, JSON.stringify(consents));
      return true;
    } catch (error) {
      console.error('Erreur suppression consentement:', error);
      throw error;
    }
  },

  // Générer un rapport de consentements pour un patient - US 4.3
  generatePatientReport: (patientId) => {
    const consents = consentsStorage.getByPatient(patientId);

    const report = {
      patientId,
      generatedAt: new Date().toISOString(),
      totalConsents: consents.length,
      activeConsents: consents.filter(c => c.status === 'granted').length,
      revokedConsents: consents.filter(c => c.status === 'revoked').length,
      consentsByType: {},
      expiringConsents: [],
      detailedConsents: consents.map(consent => ({
        id: consent.id,
        type: consent.type,
        purpose: consent.purpose,
        status: consent.status,
        createdAt: consent.createdAt,
        revokedAt: consent.revokedAt,
        expiresAt: consent.expiresAt,
        collectionMethod: consent.collectionMethod
      }))
    };

    // Grouper par type
    consents.forEach(consent => {
      if (!report.consentsByType[consent.type]) {
        report.consentsByType[consent.type] = { active: 0, revoked: 0, total: 0 };
      }
      report.consentsByType[consent.type].total++;
      if (consent.status === 'granted') {
        report.consentsByType[consent.type].active++;
      } else if (consent.status === 'revoked') {
        report.consentsByType[consent.type].revoked++;
      }
    });

    // Identifier les consentements expirant bientôt
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);

    report.expiringConsents = consents.filter(consent =>
      consent.status === 'granted' &&
      consent.expiresAt &&
      new Date(consent.expiresAt) <= in30Days &&
      new Date(consent.expiresAt) > new Date()
    );

    return report;
  },

  // Vérifier les consentements expirant bientôt
  getExpiringConsents: (daysAhead = 30) => {
    const allConsents = consentsStorage.getAll();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

    return allConsents.filter(consent =>
      consent.status === 'granted' &&
      consent.expiresAt &&
      new Date(consent.expiresAt) <= cutoffDate &&
      new Date(consent.expiresAt) > new Date() &&
      !consent.deleted
    ).sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt));
  },

  // Statistiques globales des consentements
  getStatistics: () => {
    const consents = consentsStorage.getAll().filter(c => !c.deleted);
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      total: consents.length,
      active: consents.filter(c => c.status === 'granted').length,
      revoked: consents.filter(c => c.status === 'revoked').length,
      expired: consents.filter(c => c.expiresAt && new Date(c.expiresAt) <= now).length,
      createdThisMonth: consents.filter(c => new Date(c.createdAt) >= thisMonth).length,
      byType: {},
      byCollectionMethod: {}
    };

    // Statistiques par type
    consents.forEach(consent => {
      if (!stats.byType[consent.type]) {
        stats.byType[consent.type] = { total: 0, active: 0, revoked: 0 };
      }
      stats.byType[consent.type].total++;
      if (consent.status === 'granted') stats.byType[consent.type].active++;
      if (consent.status === 'revoked') stats.byType[consent.type].revoked++;

      // Statistiques par méthode de collecte
      const method = consent.collectionMethod || 'unknown';
      if (!stats.byCollectionMethod[method]) {
        stats.byCollectionMethod[method] = 0;
      }
      stats.byCollectionMethod[method]++;
    });

    return stats;
  }
};

// Réexporter depuis consentTypes.js - SOURCE UNIQUE DE VÉRITÉ
export const CONSENT_TYPES = _CONSENT_TYPES;
export const COLLECTION_METHODS = _COLLECTION_METHODS;

// Initialiser des consentements de démonstration
export const initializeSampleConsents = () => {
  const existingConsents = consentsStorage.getAll();
  if (existingConsents.length === 0) {
    // Récupérer les patients existants pour créer des consentements
    try {
      const patients = JSON.parse(localStorage.getItem('medicalPro_patients') || '[]');

      patients.forEach(patient => {
        if (!patient.deleted) {
          // Consentement RGPD obligatoire
          consentsStorage.create({
            patientId: patient.id,
            type: _CONSENT_TYPES.DATA_PROCESSING.id,
            purpose: 'medical_care',
            status: 'granted',
            title: 'Traitement des données personnelles - Soins médicaux',
            description: 'Consentement au traitement des données personnelles dans le cadre des soins médicaux dispensés.',
            collectionMethod: 'digital',
            isRequired: true,
            witness: null,
            expiresAt: null
          }, 'demo');

          // Consentement soins médicaux
          consentsStorage.create({
            patientId: patient.id,
            type: _CONSENT_TYPES.MEDICAL_TREATMENT.id,
            purpose: 'general_care',
            status: 'granted',
            title: 'Consentement aux soins médicaux',
            description: 'Consentement éclairé pour la réalisation des soins médicaux nécessaires.',
            collectionMethod: 'digital',
            isRequired: true,
            witness: null,
            expiresAt: null
          }, 'demo');
        }
      });
    } catch (error) {
      console.log('Erreur initialisation consentements démonstration:', error);
    }
  }
};

export default consentsStorage;