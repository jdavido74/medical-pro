// utils/consentsStorage.js
import { generateId } from './idGenerator';

const CONSENTS_STORAGE_KEY = 'medicalPro_consents';

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
  create: (consentData, userId = 'system') => {
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
          ipAddress: 'localhost',
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
  revoke: (consentId, userId = 'system', reason = 'patient_request') => {
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
  revokeByPatientAndType: (patientId, type, purpose = null, userId = 'system', reason = 'patient_request') => {
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
  update: (consentId, updates, userId = 'system') => {
    try {
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
            ipAddress: 'localhost',
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
  delete: (consentId, userId = 'system') => {
    try {
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
            ipAddress: 'localhost',
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

// Types de consentements prédéfinis
export const CONSENT_TYPES = {
  RGPD_DATA_PROCESSING: {
    id: 'rgpd_data_processing',
    name: 'Traitement des données personnelles (RGPD)',
    description: 'Consentement pour le traitement des données personnelles dans le cadre médical',
    required: true,
    renewable: true,
    defaultDuration: null // Permanent jusqu'à révocation
  },
  RGPD_MARKETING: {
    id: 'rgpd_marketing',
    name: 'Communications marketing (RGPD)',
    description: 'Consentement pour recevoir des communications marketing et promotionnelles',
    required: false,
    renewable: true,
    defaultDuration: 365 // 1 an
  },
  MEDICAL_CARE: {
    id: 'medical_care',
    name: 'Soins médicaux généraux',
    description: 'Consentement aux soins médicaux généraux',
    required: true,
    renewable: false,
    defaultDuration: null
  },
  MEDICAL_SPECIFIC: {
    id: 'medical_specific',
    name: 'Soins médicaux spécifiques',
    description: 'Consentement pour des soins ou interventions spécifiques',
    required: true,
    renewable: false,
    defaultDuration: null
  },
  DATA_SHARING: {
    id: 'data_sharing',
    name: 'Partage de données médicales',
    description: 'Consentement pour le partage de données avec d\'autres professionnels',
    required: false,
    renewable: true,
    defaultDuration: 180 // 6 mois
  },
  RESEARCH: {
    id: 'research',
    name: 'Participation à la recherche',
    description: 'Consentement pour l\'utilisation des données à des fins de recherche',
    required: false,
    renewable: true,
    defaultDuration: 365 // 1 an
  },
  TELEMEDICINE: {
    id: 'telemedicine',
    name: 'Télémédecine',
    description: 'Consentement pour les consultations à distance',
    required: false,
    renewable: true,
    defaultDuration: 365 // 1 an
  }
};

// Méthodes de collecte des consentements
export const COLLECTION_METHODS = {
  DIGITAL: { id: 'digital', name: 'Numérique (formulaire)' },
  VERBAL: { id: 'verbal', name: 'Verbal (avec témoin)' },
  WRITTEN: { id: 'written', name: 'Écrit (signature physique)' },
  ELECTRONIC: { id: 'electronic', name: 'Signature électronique' }
};

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
            type: CONSENT_TYPES.RGPD_DATA_PROCESSING.id,
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
            type: CONSENT_TYPES.MEDICAL_CARE.id,
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