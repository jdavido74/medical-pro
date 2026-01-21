// utils/dataManager.js - Gestionnaire centralisé de données et persistance

import { initializeDefaultCatalog } from './productsStorage';
import { initializeSampleConsents } from './consentsStorage';
import { initializeSampleTemplates } from './consentTemplatesStorage';
import { initializeSamplePatients } from './patientsStorage';
import { initializeSampleAppointments } from './appointmentsStorage';
import { initializeSampleMedicalRecords } from './medicalRecordsStorage';
import { initializeSamplePractitioners, initializeClinicConfig } from './clinicConfigStorage';

// Clés de stockage utilisées dans l'application
export const STORAGE_KEYS = {
  // Données principales
  PATIENTS: 'medicalPro_patients',
  MEDICAL_RECORDS: 'medicalPro_medical_records',
  APPOINTMENTS: 'medicalPro_appointments',
  AVAILABILITY: 'medicalPro_availability',

  // Catalogues et templates
  PRODUCTS: 'clinicmanager_products',
  SERVICES: 'clinicmanager_services',
  BUNDLES: 'clinicmanager_bundles',
  CONSENTS: 'medicalPro_consents',
  CONSENT_TEMPLATES: 'medicalPro_consent_templates',

  // Configuration
  SETTINGS: 'clinicmanager_settings',
  COUNTERS: 'clinicmanager_counters',
  PERMISSIONS: 'medicalPro_permissions',
  AUDIT: 'medicalPro_audit',
  CLINIC_CONFIG: 'medicalPro_clinic_config',
  PRACTITIONERS: 'medicalPro_practitioners'
};

// Utilitaire centralisé pour localStorage avec gestion d'erreurs
export const persistenceManager = {
  // Lire des données depuis localStorage
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Erreur lecture localStorage [${key}]:`, error);
      return defaultValue;
    }
  },

  // Sauvegarder des données dans localStorage
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Erreur écriture localStorage [${key}]:`, error);
      return false;
    }
  },

  // Supprimer une clé spécifique
  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Erreur suppression localStorage [${key}]:`, error);
      return false;
    }
  },

  // Vérifier si une clé existe et contient des données
  exists: (key) => {
    try {
      const item = localStorage.getItem(key);
      return item !== null && item !== 'null' && item !== '[]' && item !== '{}';
    } catch (error) {
      console.error(`Erreur vérification localStorage [${key}]:`, error);
      return false;
    }
  },

  // Obtenir l'état de toutes les données
  getDataStatus: () => {
    const status = {};
    Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
      const data = persistenceManager.get(key, []);
      status[name] = {
        key,
        exists: persistenceManager.exists(key),
        count: Array.isArray(data) ? data.length : (data ? 1 : 0),
        size: localStorage.getItem(key)?.length || 0
      };
    });
    return status;
  },

  // Nettoyer toutes les données de l'application
  clearAllData: () => {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      console.log('Toutes les données ont été supprimées');
      return true;
    } catch (error) {
      console.error('Erreur nettoyage localStorage:', error);
      return false;
    }
  },

  // Exporter toutes les données
  exportData: () => {
    const exportData = {};
    Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
      exportData[name] = persistenceManager.get(key);
    });
    return {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      data: exportData
    };
  },

  // Importer des données
  importData: (importedData) => {
    try {
      if (!importedData.data) {
        throw new Error('Format de données invalide');
      }

      Object.entries(importedData.data).forEach(([name, data]) => {
        if (STORAGE_KEYS[name]) {
          persistenceManager.set(STORAGE_KEYS[name], data);
        }
      });

      console.log('Données importées avec succès');
      return true;
    } catch (error) {
      console.error('Erreur importation données:', error);
      return false;
    }
  }
};

// DEMO DATA DISABLED - No longer initialize sample data
// All data should come from the backend API
export const initializeAllSampleData = () => {
  console.log('ℹ️ Demo data initialization disabled - using backend API');

  try {
    // Only initialize required catalogs and configuration
    // NO demo patients, practitioners, appointments, or medical records
    initializeDefaultCatalog();
    initializeSampleConsents();
    initializeSampleTemplates();
    initializeClinicConfig();

    // REMOVED: Sample practitioners initialization
    // REMOVED: Sample patients initialization
    // REMOVED: Sample medical records initialization
    // REMOVED: Sample appointments initialization

    // Afficher le status final
    const status = persistenceManager.getDataStatus();
    console.log('✅ Initialisation terminée:', status);

    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    return false;
  }
};

// Fonction de maintenance pour nettoyer et ré-initialiser
export const resetAndReinitialize = () => {
  console.log('🔄 Réinitialisation complète des données...');

  persistenceManager.clearAllData();
  initializeAllSampleData();

  console.log('✅ Réinitialisation terminée');
};

// Fonction pour vérifier l'intégrité des données
export const validateDataIntegrity = () => {
  const issues = [];
  const status = persistenceManager.getDataStatus();

  // Vérifier que les données essentielles existent
  if (!status.PATIENTS.exists) {
    issues.push('Aucun patient enregistré');
  }

  if (!status.APPOINTMENTS.exists) {
    issues.push('Aucun rendez-vous enregistré');
  }

  // Vérifier les relations entre données
  const patients = persistenceManager.get(STORAGE_KEYS.PATIENTS, []);
  const appointments = persistenceManager.get(STORAGE_KEYS.APPOINTMENTS, []);
  const medicalRecords = persistenceManager.get(STORAGE_KEYS.MEDICAL_RECORDS, []);

  // Vérifier que les rendez-vous ont des patients valides
  const patientIds = new Set(patients.map(p => p.id));
  const orphanAppointments = appointments.filter(apt => !patientIds.has(apt.patientId));
  if (orphanAppointments.length > 0) {
    issues.push(`${orphanAppointments.length} rendez-vous sans patient valide`);
  }

  // Vérifier que les dossiers médicaux ont des patients valides
  const orphanRecords = medicalRecords.filter(rec => !patientIds.has(rec.patientId));
  if (orphanRecords.length > 0) {
    issues.push(`${orphanRecords.length} dossiers médicaux sans patient valide`);
  }

  return {
    isValid: issues.length === 0,
    issues,
    status
  };
};

export default {
  persistenceManager,
  initializeAllSampleData,
  resetAndReinitialize,
  validateDataIntegrity,
  STORAGE_KEYS
};