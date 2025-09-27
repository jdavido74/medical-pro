// utils/backupStorage.js
import { v4 as uuidv4 } from 'uuid';
import auditStorage from './auditStorage';

class BackupStorage {
  constructor() {
    this.storageKey = 'medical_pro_backups';
    this.maxBackups = 50; // Limite pour éviter de surcharger localStorage
    this.initializeStorage();
  }

  initializeStorage() {
    if (!localStorage.getItem(this.storageKey)) {
      localStorage.setItem(this.storageKey, JSON.stringify([]));
    }
  }

  // Types de sauvegarde
  static BACKUP_TYPES = {
    FULL: 'full',
    PARTIAL: 'partial',
    CONFIGURATION: 'configuration',
    USER_DATA: 'user_data',
    MEDICAL_DATA: 'medical_data',
    AUDIT_LOGS: 'audit_logs'
  };

  // Statuts de sauvegarde
  static BACKUP_STATUS = {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CORRUPTED: 'corrupted'
  };

  /**
   * Crée une sauvegarde complète de l'application
   */
  async createFullBackup(description = '', includeAuditLogs = true) {
    const backupId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      // Enregistrer l'événement de début de sauvegarde
      auditStorage.logEvent(auditStorage.constructor.EVENT_TYPES.BACKUP_CREATED, {
        backupId,
        backupType: BackupStorage.BACKUP_TYPES.FULL,
        description,
        includeAuditLogs
      });

      const backup = {
        id: backupId,
        type: BackupStorage.BACKUP_TYPES.FULL,
        status: BackupStorage.BACKUP_STATUS.IN_PROGRESS,
        timestamp,
        description: description || `Sauvegarde complète du ${new Date().toLocaleDateString('fr-FR')}`,
        size: 0,
        checksum: '',
        data: {},
        metadata: {
          version: '2.0.0',
          platform: navigator.platform,
          userAgent: navigator.userAgent,
          createdBy: this.getCurrentUserId(),
          dataTypes: []
        }
      };

      // Collecter toutes les données
      const allData = this.collectAllData(includeAuditLogs);
      backup.data = allData;
      backup.metadata.dataTypes = Object.keys(allData);

      // Calculer la taille et le checksum
      const dataString = JSON.stringify(allData);
      backup.size = new Blob([dataString]).size;
      backup.checksum = this.calculateChecksum(dataString);

      // Marquer comme complété
      backup.status = BackupStorage.BACKUP_STATUS.COMPLETED;

      // Sauvegarder
      this.saveBackup(backup);

      return backup;
    } catch (error) {
      console.error('Erreur lors de la création de la sauvegarde:', error);

      // Enregistrer l'erreur dans l'audit
      auditStorage.logEvent(auditStorage.constructor.EVENT_TYPES.SYSTEM_ERROR, {
        errorType: 'backup_creation_failed',
        errorMessage: error.message,
        backupId,
        context: 'backup_creation'
      });

      throw error;
    }
  }

  /**
   * Crée une sauvegarde partielle
   */
  async createPartialBackup(dataTypes = [], description = '') {
    const backupId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      auditStorage.logEvent(auditStorage.constructor.EVENT_TYPES.BACKUP_CREATED, {
        backupId,
        backupType: BackupStorage.BACKUP_TYPES.PARTIAL,
        dataTypes,
        description
      });

      const backup = {
        id: backupId,
        type: BackupStorage.BACKUP_TYPES.PARTIAL,
        status: BackupStorage.BACKUP_STATUS.IN_PROGRESS,
        timestamp,
        description: description || `Sauvegarde partielle (${dataTypes.join(', ')})`,
        size: 0,
        checksum: '',
        data: {},
        metadata: {
          version: '2.0.0',
          platform: navigator.platform,
          userAgent: navigator.userAgent,
          createdBy: this.getCurrentUserId(),
          dataTypes: dataTypes
        }
      };

      // Collecter les données spécifiées
      const selectedData = this.collectSelectedData(dataTypes);
      backup.data = selectedData;

      // Calculer la taille et le checksum
      const dataString = JSON.stringify(selectedData);
      backup.size = new Blob([dataString]).size;
      backup.checksum = this.calculateChecksum(dataString);

      backup.status = BackupStorage.BACKUP_STATUS.COMPLETED;
      this.saveBackup(backup);

      return backup;
    } catch (error) {
      console.error('Erreur lors de la création de la sauvegarde partielle:', error);
      throw error;
    }
  }

  /**
   * Collecte toutes les données de l'application
   */
  collectAllData(includeAuditLogs = true) {
    const data = {};

    try {
      // Patients
      const patients = localStorage.getItem('medical_pro_patients');
      if (patients) {
        data.patients = JSON.parse(patients);
      }

      // Rendez-vous
      const appointments = localStorage.getItem('medical_pro_appointments');
      if (appointments) {
        data.appointments = JSON.parse(appointments);
      }

      // Dossiers médicaux
      const medicalRecords = localStorage.getItem('medical_pro_medical_records');
      if (medicalRecords) {
        data.medicalRecords = JSON.parse(medicalRecords);
      }

      // Consentements
      const consents = localStorage.getItem('medical_pro_consents');
      if (consents) {
        data.consents = JSON.parse(consents);
      }

      // Modèles de consentements
      const consentTemplates = localStorage.getItem('medical_pro_consent_templates');
      if (consentTemplates) {
        data.consentTemplates = JSON.parse(consentTemplates);
      }

      // Utilisateurs
      const users = localStorage.getItem('medical_pro_users');
      if (users) {
        data.users = JSON.parse(users);
      }

      // Équipes
      const teams = localStorage.getItem('medical_pro_teams');
      if (teams) {
        data.teams = JSON.parse(teams);
      }

      // Délégations
      const delegations = localStorage.getItem('medical_pro_delegations');
      if (delegations) {
        data.delegations = JSON.parse(delegations);
      }

      // Rôles et permissions
      const roles = localStorage.getItem('medical_pro_roles');
      if (roles) {
        data.roles = JSON.parse(roles);
      }

      // Paramètres
      const settings = localStorage.getItem('medical_pro_settings');
      if (settings) {
        data.settings = JSON.parse(settings);
      }

      // Factures
      const invoices = localStorage.getItem('medical_pro_invoices');
      if (invoices) {
        data.invoices = JSON.parse(invoices);
      }

      // Devis
      const quotes = localStorage.getItem('medical_pro_quotes');
      if (quotes) {
        data.quotes = JSON.parse(quotes);
      }

      // Produits et services
      const products = localStorage.getItem('medical_pro_products');
      if (products) {
        data.products = JSON.parse(products);
      }

      // Configuration des modules médicaux
      const moduleConfig = localStorage.getItem('medical_pro_module_config');
      if (moduleConfig) {
        data.moduleConfig = JSON.parse(moduleConfig);
      }

      // Traductions dynamiques
      const translations = localStorage.getItem('medical_pro_translations');
      if (translations) {
        data.translations = JSON.parse(translations);
      }

      // Logs d'audit (optionnel)
      if (includeAuditLogs) {
        const auditLogs = localStorage.getItem('medical_pro_audit_logs');
        if (auditLogs) {
          data.auditLogs = JSON.parse(auditLogs);
        }
      }

      // Authentification (sans mots de passe)
      const auth = localStorage.getItem('clinicmanager_auth');
      if (auth) {
        const authData = JSON.parse(auth);
        // Exclure les informations sensibles
        data.auth = {
          user: authData.user,
          timestamp: authData.timestamp
          // sessionInfo exclu pour la sécurité
        };
      }

    } catch (error) {
      console.error('Erreur lors de la collecte des données:', error);
      throw new Error(`Erreur lors de la collecte des données: ${error.message}`);
    }

    return data;
  }

  /**
   * Collecte des données sélectionnées
   */
  collectSelectedData(dataTypes) {
    const data = {};
    const allData = this.collectAllData(true);

    dataTypes.forEach(type => {
      if (allData[type]) {
        data[type] = allData[type];
      }
    });

    return data;
  }

  /**
   * Sauvegarde un backup
   */
  saveBackup(backup) {
    try {
      const backups = this.getAllBackups();
      backups.unshift(backup);

      // Limiter le nombre de sauvegardes
      if (backups.length > this.maxBackups) {
        backups.splice(this.maxBackups);
      }

      localStorage.setItem(this.storageKey, JSON.stringify(backups));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du backup:', error);
      throw error;
    }
  }

  /**
   * Récupère toutes les sauvegardes
   */
  getAllBackups() {
    try {
      const backups = localStorage.getItem(this.storageKey);
      return backups ? JSON.parse(backups) : [];
    } catch (error) {
      console.error('Erreur lors de la récupération des sauvegardes:', error);
      return [];
    }
  }

  /**
   * Récupère une sauvegarde par ID
   */
  getBackupById(backupId) {
    const backups = this.getAllBackups();
    return backups.find(backup => backup.id === backupId);
  }

  /**
   * Supprime une sauvegarde
   */
  deleteBackup(backupId) {
    try {
      const backups = this.getAllBackups();
      const filteredBackups = backups.filter(backup => backup.id !== backupId);
      localStorage.setItem(this.storageKey, JSON.stringify(filteredBackups));

      auditStorage.logEvent(auditStorage.constructor.EVENT_TYPES.SYSTEM_ERROR, {
        action: 'backup_deleted',
        backupId,
        context: 'backup_management'
      });

      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression de la sauvegarde:', error);
      return false;
    }
  }

  /**
   * Restaure les données depuis une sauvegarde
   */
  async restoreFromBackup(backupId, options = {}) {
    const {
      overwriteExisting = true,
      excludeDataTypes = [],
      createBackupBeforeRestore = true
    } = options;

    try {
      // Créer une sauvegarde avant la restauration si demandé
      if (createBackupBeforeRestore) {
        await this.createFullBackup('Sauvegarde automatique avant restauration');
      }

      const backup = this.getBackupById(backupId);
      if (!backup) {
        throw new Error('Sauvegarde introuvable');
      }

      // Vérifier l'intégrité de la sauvegarde
      if (!this.verifyBackupIntegrity(backup)) {
        throw new Error('Sauvegarde corrompue');
      }

      auditStorage.logEvent(auditStorage.constructor.EVENT_TYPES.BACKUP_RESTORED, {
        backupId,
        backupType: backup.type,
        restoreOptions: options
      });

      const restorationReport = {
        backupId,
        startTime: new Date().toISOString(),
        restoredDataTypes: [],
        skippedDataTypes: [],
        errors: []
      };

      // Restaurer les données
      Object.entries(backup.data).forEach(([dataType, data]) => {
        if (excludeDataTypes.includes(dataType)) {
          restorationReport.skippedDataTypes.push(dataType);
          return;
        }

        try {
          const storageKey = this.getStorageKeyForDataType(dataType);

          if (overwriteExisting || !localStorage.getItem(storageKey)) {
            localStorage.setItem(storageKey, JSON.stringify(data));
            restorationReport.restoredDataTypes.push(dataType);
          } else {
            restorationReport.skippedDataTypes.push(`${dataType} (existing data not overwritten)`);
          }
        } catch (error) {
          console.error(`Erreur lors de la restauration de ${dataType}:`, error);
          restorationReport.errors.push({
            dataType,
            error: error.message
          });
        }
      });

      restorationReport.endTime = new Date().toISOString();
      restorationReport.success = restorationReport.errors.length === 0;

      return restorationReport;
    } catch (error) {
      console.error('Erreur lors de la restauration:', error);

      auditStorage.logEvent(auditStorage.constructor.EVENT_TYPES.SYSTEM_ERROR, {
        errorType: 'backup_restoration_failed',
        errorMessage: error.message,
        backupId,
        context: 'backup_restoration'
      });

      throw error;
    }
  }

  /**
   * Vérifie l'intégrité d'une sauvegarde
   */
  verifyBackupIntegrity(backup) {
    try {
      if (!backup || !backup.data || !backup.checksum) {
        return false;
      }

      const dataString = JSON.stringify(backup.data);
      const calculatedChecksum = this.calculateChecksum(dataString);

      return calculatedChecksum === backup.checksum;
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'intégrité:', error);
      return false;
    }
  }

  /**
   * Exporte une sauvegarde vers un fichier
   */
  exportBackup(backupId, format = 'json') {
    try {
      const backup = this.getBackupById(backupId);
      if (!backup) {
        throw new Error('Sauvegarde introuvable');
      }

      let exportData;
      let mimeType;
      let fileExtension;

      switch (format) {
        case 'json':
          exportData = JSON.stringify(backup, null, 2);
          mimeType = 'application/json';
          fileExtension = 'json';
          break;
        case 'compressed':
          // Pour la compression, on peut utiliser une simple base64
          exportData = btoa(JSON.stringify(backup));
          mimeType = 'application/octet-stream';
          fileExtension = 'backup';
          break;
        default:
          throw new Error('Format d\'export non supporté');
      }

      const blob = new Blob([exportData], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `medical_pro_backup_${backup.id.substring(0, 8)}_${new Date().toISOString().split('T')[0]}.${fileExtension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      auditStorage.logEvent(auditStorage.constructor.EVENT_TYPES.DATA_EXPORT, {
        dataType: 'backup',
        backupId: backup.id,
        format,
        size: blob.size
      });

      return true;
    } catch (error) {
      console.error('Erreur lors de l\'export de la sauvegarde:', error);
      throw error;
    }
  }

  /**
   * Importe une sauvegarde depuis un fichier
   */
  async importBackup(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          let backupData;
          const content = event.target.result;

          // Déterminer le format du fichier
          if (file.name.endsWith('.backup')) {
            // Format compressé
            backupData = JSON.parse(atob(content));
          } else {
            // Format JSON
            backupData = JSON.parse(content);
          }

          // Valider la structure de la sauvegarde
          if (!this.validateBackupStructure(backupData)) {
            throw new Error('Structure de sauvegarde invalide');
          }

          // Générer un nouvel ID pour éviter les conflits
          backupData.id = uuidv4();
          backupData.imported = true;
          backupData.importedAt = new Date().toISOString();

          // Sauvegarder
          this.saveBackup(backupData);

          auditStorage.logEvent(auditStorage.constructor.EVENT_TYPES.DATA_IMPORT, {
            dataType: 'backup',
            backupId: backupData.id,
            originalId: backupData.id,
            fileName: file.name,
            size: file.size
          });

          resolve(backupData);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Erreur lors de la lecture du fichier'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Valide la structure d'une sauvegarde
   */
  validateBackupStructure(backup) {
    const requiredFields = ['id', 'type', 'timestamp', 'data', 'checksum'];
    return requiredFields.every(field => backup.hasOwnProperty(field));
  }

  /**
   * Obtient les statistiques des sauvegardes
   */
  getBackupStatistics() {
    const backups = this.getAllBackups();
    const stats = {
      totalBackups: backups.length,
      totalSize: 0,
      backupsByType: {},
      oldestBackup: null,
      newestBackup: null,
      successfulBackups: 0,
      failedBackups: 0
    };

    backups.forEach(backup => {
      stats.totalSize += backup.size || 0;
      stats.backupsByType[backup.type] = (stats.backupsByType[backup.type] || 0) + 1;

      if (backup.status === BackupStorage.BACKUP_STATUS.COMPLETED) {
        stats.successfulBackups++;
      } else if (backup.status === BackupStorage.BACKUP_STATUS.FAILED) {
        stats.failedBackups++;
      }

      if (!stats.oldestBackup || new Date(backup.timestamp) < new Date(stats.oldestBackup.timestamp)) {
        stats.oldestBackup = backup;
      }

      if (!stats.newestBackup || new Date(backup.timestamp) > new Date(stats.newestBackup.timestamp)) {
        stats.newestBackup = backup;
      }
    });

    return stats;
  }

  /**
   * Nettoie les anciennes sauvegardes
   */
  cleanupOldBackups(retentionDays = 30) {
    try {
      const backups = this.getAllBackups();
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      const filteredBackups = backups.filter(backup => {
        const backupDate = new Date(backup.timestamp);
        return backupDate > cutoffDate || backup.type === BackupStorage.BACKUP_TYPES.FULL;
      });

      localStorage.setItem(this.storageKey, JSON.stringify(filteredBackups));

      const removedCount = backups.length - filteredBackups.length;

      if (removedCount > 0) {
        auditStorage.logEvent(auditStorage.constructor.EVENT_TYPES.SYSTEM_ERROR, {
          action: 'backup_cleanup',
          removedBackups: removedCount,
          retentionDays,
          context: 'backup_maintenance'
        });
      }

      return removedCount;
    } catch (error) {
      console.error('Erreur lors du nettoyage des sauvegardes:', error);
      return 0;
    }
  }

  /**
   * Méthodes utilitaires
   */
  getStorageKeyForDataType(dataType) {
    const keyMapping = {
      patients: 'medical_pro_patients',
      appointments: 'medical_pro_appointments',
      medicalRecords: 'medical_pro_medical_records',
      consents: 'medical_pro_consents',
      consentTemplates: 'medical_pro_consent_templates',
      users: 'medical_pro_users',
      teams: 'medical_pro_teams',
      delegations: 'medical_pro_delegations',
      roles: 'medical_pro_roles',
      settings: 'medical_pro_settings',
      invoices: 'medical_pro_invoices',
      quotes: 'medical_pro_quotes',
      products: 'medical_pro_products',
      moduleConfig: 'medical_pro_module_config',
      translations: 'medical_pro_translations',
      auditLogs: 'medical_pro_audit_logs',
      auth: 'clinicmanager_auth'
    };

    return keyMapping[dataType] || `medical_pro_${dataType}`;
  }

  calculateChecksum(data) {
    // Simple checksum en utilisant un hash basique
    let hash = 0;
    if (data.length === 0) return hash.toString();
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir en 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  getCurrentUserId() {
    try {
      const user = JSON.parse(localStorage.getItem('current_user') || '{}');
      return user.id || 'system';
    } catch {
      return 'system';
    }
  }

  formatSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Instance singleton
const backupStorage = new BackupStorage();

export default backupStorage;