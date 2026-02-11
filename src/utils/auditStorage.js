// utils/auditStorage.js
import { v4 as uuidv4 } from 'uuid';

class AuditStorage {
  constructor() {
    this.storageKey = 'medical_pro_audit_logs';
    this.maxLogs = 10000; // Limite pour éviter que localStorage devienne trop volumineux
    this.initializeStorage();
  }

  initializeStorage() {
    if (!localStorage.getItem(this.storageKey)) {
      localStorage.setItem(this.storageKey, JSON.stringify([]));
    }
  }

  // Types d'événements d'audit
  static EVENT_TYPES = {
    // Authentification
    LOGIN: 'login',
    LOGOUT: 'logout',
    LOGIN_FAILED: 'login_failed',
    SESSION_EXPIRED: 'session_expired',

    // Gestion des patients
    PATIENT_CREATED: 'patient_created',
    PATIENT_UPDATED: 'patient_updated',
    PATIENT_DELETED: 'patient_deleted',
    PATIENT_VIEWED: 'patient_viewed',
    PATIENT_SEARCHED: 'patient_searched',
    PATIENT_EXPORTED: 'patient_exported',

    // Dossiers médicaux
    MEDICAL_RECORD_CREATED: 'medical_record_created',
    MEDICAL_RECORD_UPDATED: 'medical_record_updated',
    MEDICAL_RECORD_DELETED: 'medical_record_deleted',
    MEDICAL_RECORD_VIEWED: 'medical_record_viewed',

    // Rendez-vous
    APPOINTMENT_CREATED: 'appointment_created',
    APPOINTMENT_UPDATED: 'appointment_updated',
    APPOINTMENT_DELETED: 'appointment_deleted',
    APPOINTMENT_CANCELLED: 'appointment_cancelled',

    // Consentements
    CONSENT_GRANTED: 'consent_granted',
    CONSENT_REVOKED: 'consent_revoked',
    CONSENT_VIEWED: 'consent_viewed',
    CONSENT_TEMPLATE_CREATED: 'consent_template_created',
    CONSENT_TEMPLATE_UPDATED: 'consent_template_updated',

    // Administration
    USER_CREATED: 'user_created',
    USER_UPDATED: 'user_updated',
    USER_DELETED: 'user_deleted',
    USER_ROLE_CHANGED: 'user_role_changed',
    USER_PERMISSIONS_CHANGED: 'user_permissions_changed',

    // Équipes et délégations
    TEAM_CREATED: 'team_created',
    TEAM_UPDATED: 'team_updated',
    TEAM_DELETED: 'team_deleted',
    DELEGATION_CREATED: 'delegation_created',
    DELEGATION_APPROVED: 'delegation_approved',
    DELEGATION_REVOKED: 'delegation_revoked',

    // Facturation
    INVOICE_CREATED: 'invoice_created',
    INVOICE_UPDATED: 'invoice_updated',
    INVOICE_SENT: 'invoice_sent',
    QUOTE_CREATED: 'quote_created',
    QUOTE_UPDATED: 'quote_updated',
    QUOTE_SENT: 'quote_sent',

    // Sécurité
    PERMISSION_DENIED: 'permission_denied',
    SUSPICIOUS_ACTIVITY: 'suspicious_activity',
    DATA_EXPORT: 'data_export',
    DATA_IMPORT: 'data_import',

    // Système
    SYSTEM_ERROR: 'system_error',
    BACKUP_CREATED: 'backup_created',
    BACKUP_RESTORED: 'backup_restored',
    SETTINGS_CHANGED: 'settings_changed'
  };

  // Niveaux de criticité
  static SEVERITY_LEVELS = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  };

  // Catégories d'audit
  static CATEGORIES = {
    AUTHENTICATION: 'authentication',
    PATIENT_DATA: 'patient_data',
    MEDICAL_DATA: 'medical_data',
    ADMINISTRATION: 'administration',
    SECURITY: 'security',
    SYSTEM: 'system',
    COMPLIANCE: 'compliance'
  };

  /**
   * Enregistre un événement d'audit
   */
  logEvent(eventType, details = {}) {
    try {
      const auditLog = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        eventType,
        category: this.getCategoryForEvent(eventType),
        severity: this.getSeverityForEvent(eventType),
        userId: details.userId || this.getCurrentUserId(),
        userName: details.userName || this.getCurrentUserName(),
        userRole: details.userRole || this.getCurrentUserRole(),
        ipAddress: this.getClientIP(),
        userAgent: navigator.userAgent,
        sessionId: this.getSessionId(),
        details: {
          ...details,
          url: window.location.href,
          timestamp: Date.now()
        },
        metadata: {
          browserInfo: this.getBrowserInfo(),
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      };

      this.saveAuditLog(auditLog);
      this.notifyAuditListeners(auditLog);

      // Log critique pour la console en développement
      if (auditLog.severity === AuditStorage.SEVERITY_LEVELS.CRITICAL) {
        console.warn('🚨 AUDIT CRITIQUE:', auditLog);
      }

      return auditLog;
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de l\'audit:', error);
      // En cas d'erreur, on essaie de logger l'erreur elle-même
      this.logSystemError('audit_logging_failed', { originalEvent: eventType, error: error.message });
    }
  }

  /**
   * Sauvegarde un log d'audit
   */
  saveAuditLog(auditLog) {
    try {
      const logs = this.getAllLogs();
      logs.unshift(auditLog);

      // Limiter le nombre de logs pour éviter de surcharger localStorage
      if (logs.length > this.maxLogs) {
        logs.splice(this.maxLogs);
      }

      localStorage.setItem(this.storageKey, JSON.stringify(logs));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du log d\'audit:', error);
    }
  }

  /**
   * Récupère tous les logs d'audit
   */
  getAllLogs() {
    try {
      const logs = localStorage.getItem(this.storageKey);
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      console.error('Erreur lors de la récupération des logs:', error);
      return [];
    }
  }

  /**
   * Recherche dans les logs d'audit
   */
  searchLogs(criteria = {}) {
    const logs = this.getAllLogs();

    return logs.filter(log => {
      // Filtre par type d'événement
      if (criteria.eventType && log.eventType !== criteria.eventType) {
        return false;
      }

      // Filtre par catégorie
      if (criteria.category && log.category !== criteria.category) {
        return false;
      }

      // Filtre par niveau de sévérité
      if (criteria.severity && log.severity !== criteria.severity) {
        return false;
      }

      // Filtre par utilisateur
      if (criteria.userId && log.userId !== criteria.userId) {
        return false;
      }

      // Filtre par plage de dates
      if (criteria.startDate) {
        const logDate = new Date(log.timestamp);
        const startDate = new Date(criteria.startDate);
        if (logDate < startDate) {
          return false;
        }
      }

      if (criteria.endDate) {
        const logDate = new Date(log.timestamp);
        const endDate = new Date(criteria.endDate);
        if (logDate > endDate) {
          return false;
        }
      }

      // Recherche textuelle
      if (criteria.searchTerm) {
        const searchTerm = criteria.searchTerm.toLowerCase();
        const searchableText = [
          log.eventType,
          log.userName,
          JSON.stringify(log.details)
        ].join(' ').toLowerCase();

        if (!searchableText.includes(searchTerm)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Obtient des statistiques d'audit
   */
  getStatistics(period = 'week') {
    const logs = this.getAllLogs();
    const now = new Date();
    const periodStart = new Date();

    switch (period) {
      case 'day':
        periodStart.setDate(now.getDate() - 1);
        break;
      case 'week':
        periodStart.setDate(now.getDate() - 7);
        break;
      case 'month':
        periodStart.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        periodStart.setFullYear(now.getFullYear() - 1);
        break;
    }

    const periodLogs = logs.filter(log => new Date(log.timestamp) >= periodStart);

    const stats = {
      totalEvents: periodLogs.length,
      uniqueUsers: new Set(periodLogs.map(log => log.userId)).size,
      eventsByType: {},
      eventsByCategory: {},
      eventsBySeverity: {},
      eventsByHour: new Array(24).fill(0),
      topUsers: {},
      securityEvents: 0,
      criticalEvents: 0
    };

    periodLogs.forEach(log => {
      // Par type
      stats.eventsByType[log.eventType] = (stats.eventsByType[log.eventType] || 0) + 1;

      // Par catégorie
      stats.eventsByCategory[log.category] = (stats.eventsByCategory[log.category] || 0) + 1;

      // Par sévérité
      stats.eventsBySeverity[log.severity] = (stats.eventsBySeverity[log.severity] || 0) + 1;

      // Par heure
      const hour = new Date(log.timestamp).getHours();
      stats.eventsByHour[hour]++;

      // Top utilisateurs
      stats.topUsers[log.userName] = (stats.topUsers[log.userName] || 0) + 1;

      // Événements de sécurité
      if (log.category === AuditStorage.CATEGORIES.SECURITY) {
        stats.securityEvents++;
      }

      // Événements critiques
      if (log.severity === AuditStorage.SEVERITY_LEVELS.CRITICAL) {
        stats.criticalEvents++;
      }
    });

    return stats;
  }

  /**
   * Exporte les logs d'audit
   */
  exportLogs(format = 'json', criteria = {}) {
    const logs = criteria ? this.searchLogs(criteria) : this.getAllLogs();

    switch (format) {
      case 'csv':
        return this.exportToCSV(logs);
      case 'json':
        return this.exportToJSON(logs);
      default:
        throw new Error(`Format d'export non supporté: ${format}`);
    }
  }

  exportToCSV(logs) {
    const headers = [
      'Timestamp', 'Event Type', 'Category', 'Severity', 'User', 'Role', 'Details'
    ];

    const csvContent = [
      headers.join(','),
      ...logs.map(log => [
        log.timestamp,
        log.eventType,
        log.category,
        log.severity,
        log.userName,
        log.userRole,
        `"${JSON.stringify(log.details).replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    return csvContent;
  }

  exportToJSON(logs) {
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Détecte les activités suspectes
   */
  detectSuspiciousActivity() {
    const logs = this.getAllLogs();
    const recentLogs = logs.filter(log => {
      const logTime = new Date(log.timestamp);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      return logTime > oneHourAgo;
    });

    const alerts = [];

    // Trop de tentatives de connexion échouées
    const failedLogins = recentLogs.filter(log => log.eventType === AuditStorage.EVENT_TYPES.LOGIN_FAILED);
    const failedLoginsByUser = {};

    failedLogins.forEach(log => {
      const userId = log.details.attemptedUserId || 'unknown';
      failedLoginsByUser[userId] = (failedLoginsByUser[userId] || 0) + 1;
    });

    Object.entries(failedLoginsByUser).forEach(([userId, count]) => {
      if (count >= 5) {
        alerts.push({
          type: 'multiple_failed_logins',
          severity: AuditStorage.SEVERITY_LEVELS.HIGH,
          message: `${count} tentatives de connexion échouées pour l'utilisateur ${userId}`,
          userId,
          count
        });
      }
    });

    // Accès à de nombreux dossiers patients en peu de temps
    const patientViews = recentLogs.filter(log => log.eventType === AuditStorage.EVENT_TYPES.PATIENT_VIEWED);
    const viewsByUser = {};

    patientViews.forEach(log => {
      const userId = log.userId;
      if (!viewsByUser[userId]) {
        viewsByUser[userId] = new Set();
      }
      viewsByUser[userId].add(log.details.patientId);
    });

    Object.entries(viewsByUser).forEach(([userId, patientIds]) => {
      if (patientIds.size >= 20) {
        alerts.push({
          type: 'excessive_patient_access',
          severity: AuditStorage.SEVERITY_LEVELS.MEDIUM,
          message: `Accès à ${patientIds.size} dossiers patients différents en 1 heure`,
          userId,
          patientCount: patientIds.size
        });
      }
    });

    // Accès en dehors des heures de travail
    const offHoursLogs = recentLogs.filter(log => {
      const hour = new Date(log.timestamp).getHours();
      return hour < 7 || hour > 22; // En dehors de 7h-22h
    });

    if (offHoursLogs.length >= 10) {
      alerts.push({
        type: 'off_hours_activity',
        severity: AuditStorage.SEVERITY_LEVELS.MEDIUM,
        message: `${offHoursLogs.length} événements en dehors des heures de travail`,
        eventCount: offHoursLogs.length
      });
    }

    return alerts;
  }

  /**
   * Nettoie les anciens logs
   */
  cleanupOldLogs(retentionDays = 365) {
    const logs = this.getAllLogs();
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const filteredLogs = logs.filter(log => new Date(log.timestamp) > cutoffDate);

    localStorage.setItem(this.storageKey, JSON.stringify(filteredLogs));

    return logs.length - filteredLogs.length; // Nombre de logs supprimés
  }

  /**
   * Méthodes utilitaires
   */
  getCategoryForEvent(eventType) {
    const eventTypeToCategory = {
      [AuditStorage.EVENT_TYPES.LOGIN]: AuditStorage.CATEGORIES.AUTHENTICATION,
      [AuditStorage.EVENT_TYPES.LOGOUT]: AuditStorage.CATEGORIES.AUTHENTICATION,
      [AuditStorage.EVENT_TYPES.LOGIN_FAILED]: AuditStorage.CATEGORIES.SECURITY,
      [AuditStorage.EVENT_TYPES.SESSION_EXPIRED]: AuditStorage.CATEGORIES.AUTHENTICATION,

      [AuditStorage.EVENT_TYPES.PATIENT_CREATED]: AuditStorage.CATEGORIES.PATIENT_DATA,
      [AuditStorage.EVENT_TYPES.PATIENT_UPDATED]: AuditStorage.CATEGORIES.PATIENT_DATA,
      [AuditStorage.EVENT_TYPES.PATIENT_DELETED]: AuditStorage.CATEGORIES.PATIENT_DATA,
      [AuditStorage.EVENT_TYPES.PATIENT_VIEWED]: AuditStorage.CATEGORIES.PATIENT_DATA,

      [AuditStorage.EVENT_TYPES.MEDICAL_RECORD_CREATED]: AuditStorage.CATEGORIES.MEDICAL_DATA,
      [AuditStorage.EVENT_TYPES.MEDICAL_RECORD_UPDATED]: AuditStorage.CATEGORIES.MEDICAL_DATA,
      [AuditStorage.EVENT_TYPES.MEDICAL_RECORD_DELETED]: AuditStorage.CATEGORIES.MEDICAL_DATA,
      [AuditStorage.EVENT_TYPES.MEDICAL_RECORD_VIEWED]: AuditStorage.CATEGORIES.MEDICAL_DATA,

      [AuditStorage.EVENT_TYPES.USER_CREATED]: AuditStorage.CATEGORIES.ADMINISTRATION,
      [AuditStorage.EVENT_TYPES.USER_UPDATED]: AuditStorage.CATEGORIES.ADMINISTRATION,
      [AuditStorage.EVENT_TYPES.USER_DELETED]: AuditStorage.CATEGORIES.ADMINISTRATION,

      [AuditStorage.EVENT_TYPES.PERMISSION_DENIED]: AuditStorage.CATEGORIES.SECURITY,
      [AuditStorage.EVENT_TYPES.SUSPICIOUS_ACTIVITY]: AuditStorage.CATEGORIES.SECURITY,

      [AuditStorage.EVENT_TYPES.CONSENT_GRANTED]: AuditStorage.CATEGORIES.COMPLIANCE,
      [AuditStorage.EVENT_TYPES.CONSENT_REVOKED]: AuditStorage.CATEGORIES.COMPLIANCE,
    };

    return eventTypeToCategory[eventType] || AuditStorage.CATEGORIES.SYSTEM;
  }

  getSeverityForEvent(eventType) {
    const criticalEvents = [
      AuditStorage.EVENT_TYPES.PATIENT_DELETED,
      AuditStorage.EVENT_TYPES.MEDICAL_RECORD_DELETED,
      AuditStorage.EVENT_TYPES.USER_DELETED,
      AuditStorage.EVENT_TYPES.SYSTEM_ERROR,
      AuditStorage.EVENT_TYPES.SUSPICIOUS_ACTIVITY
    ];

    const highEvents = [
      AuditStorage.EVENT_TYPES.LOGIN_FAILED,
      AuditStorage.EVENT_TYPES.PERMISSION_DENIED,
      AuditStorage.EVENT_TYPES.USER_ROLE_CHANGED,
      AuditStorage.EVENT_TYPES.DATA_EXPORT
    ];

    const mediumEvents = [
      AuditStorage.EVENT_TYPES.PATIENT_CREATED,
      AuditStorage.EVENT_TYPES.PATIENT_UPDATED,
      AuditStorage.EVENT_TYPES.MEDICAL_RECORD_CREATED,
      AuditStorage.EVENT_TYPES.USER_CREATED
    ];

    if (criticalEvents.includes(eventType)) {
      return AuditStorage.SEVERITY_LEVELS.CRITICAL;
    } else if (highEvents.includes(eventType)) {
      return AuditStorage.SEVERITY_LEVELS.HIGH;
    } else if (mediumEvents.includes(eventType)) {
      return AuditStorage.SEVERITY_LEVELS.MEDIUM;
    } else {
      return AuditStorage.SEVERITY_LEVELS.LOW;
    }
  }

  getCurrentUserId() {
    try {
      const user = JSON.parse(localStorage.getItem('current_user') || '{}');
      return user.id || 'anonymous';
    } catch {
      return 'anonymous';
    }
  }

  getCurrentUserName() {
    try {
      const user = JSON.parse(localStorage.getItem('current_user') || '{}');
      return user.name || user.firstName + ' ' + user.lastName || 'Utilisateur anonyme';
    } catch {
      return 'Utilisateur anonyme';
    }
  }

  getCurrentUserRole() {
    try {
      const user = JSON.parse(localStorage.getItem('current_user') || '{}');
      return user.role || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  getClientIP() {
    return 'client';
  }

  getSessionId() {
    try {
      const session = JSON.parse(localStorage.getItem('auth_session') || '{}');
      return session.sessionId || 'no-session';
    } catch {
      return 'no-session';
    }
  }

  getBrowserInfo() {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    };
  }

  // Système de listeners pour les événements d'audit en temps réel
  auditListeners = [];

  addAuditListener(listener) {
    this.auditListeners.push(listener);
  }

  removeAuditListener(listener) {
    const index = this.auditListeners.indexOf(listener);
    if (index > -1) {
      this.auditListeners.splice(index, 1);
    }
  }

  notifyAuditListeners(auditLog) {
    this.auditListeners.forEach(listener => {
      try {
        listener(auditLog);
      } catch (error) {
        console.error('Erreur dans un listener d\'audit:', error);
      }
    });
  }

  // Méthodes de convenance pour les événements courants
  logLogin(userId, userName, success = true) {
    return this.logEvent(
      success ? AuditStorage.EVENT_TYPES.LOGIN : AuditStorage.EVENT_TYPES.LOGIN_FAILED,
      { userId, userName, success }
    );
  }

  logLogout(userId, userName) {
    return this.logEvent(AuditStorage.EVENT_TYPES.LOGOUT, { userId, userName });
  }

  logPatientAccess(patientId, action = 'viewed') {
    const eventType = action === 'created' ? AuditStorage.EVENT_TYPES.PATIENT_CREATED :
                     action === 'updated' ? AuditStorage.EVENT_TYPES.PATIENT_UPDATED :
                     action === 'deleted' ? AuditStorage.EVENT_TYPES.PATIENT_DELETED :
                     AuditStorage.EVENT_TYPES.PATIENT_VIEWED;

    return this.logEvent(eventType, { patientId, action });
  }

  logPermissionDenied(resource, action) {
    return this.logEvent(AuditStorage.EVENT_TYPES.PERMISSION_DENIED, {
      resource,
      action,
      message: `Accès refusé à ${resource} pour l'action ${action}`
    });
  }

  logSystemError(errorType, details) {
    return this.logEvent(AuditStorage.EVENT_TYPES.SYSTEM_ERROR, {
      errorType,
      ...details
    });
  }

  logDataExport(dataType, recordCount) {
    return this.logEvent(AuditStorage.EVENT_TYPES.DATA_EXPORT, {
      dataType,
      recordCount,
      exportTime: new Date().toISOString()
    });
  }
}

// Instance singleton
const auditStorage = new AuditStorage();

export default auditStorage;