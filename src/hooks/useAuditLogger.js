// hooks/useAuditLogger.js
import { useCallback } from 'react';
import auditStorage from '../utils/auditStorage';
import { useAuth } from '../contexts/AuthContext';

export const useAuditLogger = () => {
  const { user } = useAuth();

  const logEvent = useCallback((eventType, details = {}) => {
    // Ajouter automatiquement les informations de l'utilisateur actuel
    const auditDetails = {
      ...details,
      userId: user?.id,
      userName: user ? `${user.firstName} ${user.lastName}` : 'Utilisateur anonyme',
      userRole: user?.role,
      userEmail: user?.email
    };

    return auditStorage.logEvent(eventType, auditDetails);
  }, [user]);

  // Méthodes de convenance pour les événements courants
  const logPatientEvent = useCallback((action, patientId, additionalDetails = {}) => {
    const eventTypes = {
      'created': auditStorage.constructor.EVENT_TYPES.PATIENT_CREATED,
      'updated': auditStorage.constructor.EVENT_TYPES.PATIENT_UPDATED,
      'deleted': auditStorage.constructor.EVENT_TYPES.PATIENT_DELETED,
      'viewed': auditStorage.constructor.EVENT_TYPES.PATIENT_VIEWED,
      'searched': auditStorage.constructor.EVENT_TYPES.PATIENT_SEARCHED,
      'exported': auditStorage.constructor.EVENT_TYPES.PATIENT_EXPORTED
    };

    return logEvent(eventTypes[action], {
      patientId,
      action,
      ...additionalDetails
    });
  }, [logEvent]);

  const logMedicalRecordEvent = useCallback((action, recordId, patientId, additionalDetails = {}) => {
    const eventTypes = {
      'created': auditStorage.constructor.EVENT_TYPES.MEDICAL_RECORD_CREATED,
      'updated': auditStorage.constructor.EVENT_TYPES.MEDICAL_RECORD_UPDATED,
      'deleted': auditStorage.constructor.EVENT_TYPES.MEDICAL_RECORD_DELETED,
      'viewed': auditStorage.constructor.EVENT_TYPES.MEDICAL_RECORD_VIEWED
    };

    return logEvent(eventTypes[action], {
      recordId,
      patientId,
      action,
      ...additionalDetails
    });
  }, [logEvent]);

  const logAppointmentEvent = useCallback((action, appointmentId, patientId, additionalDetails = {}) => {
    const eventTypes = {
      'created': auditStorage.constructor.EVENT_TYPES.APPOINTMENT_CREATED,
      'updated': auditStorage.constructor.EVENT_TYPES.APPOINTMENT_UPDATED,
      'deleted': auditStorage.constructor.EVENT_TYPES.APPOINTMENT_DELETED,
      'cancelled': auditStorage.constructor.EVENT_TYPES.APPOINTMENT_CANCELLED
    };

    return logEvent(eventTypes[action], {
      appointmentId,
      patientId,
      action,
      ...additionalDetails
    });
  }, [logEvent]);

  const logConsentEvent = useCallback((action, consentId, patientId, additionalDetails = {}) => {
    const eventTypes = {
      'granted': auditStorage.constructor.EVENT_TYPES.CONSENT_GRANTED,
      'revoked': auditStorage.constructor.EVENT_TYPES.CONSENT_REVOKED,
      'viewed': auditStorage.constructor.EVENT_TYPES.CONSENT_VIEWED
    };

    return logEvent(eventTypes[action], {
      consentId,
      patientId,
      action,
      ...additionalDetails
    });
  }, [logEvent]);

  const logUserEvent = useCallback((action, targetUserId, additionalDetails = {}) => {
    const eventTypes = {
      'created': auditStorage.constructor.EVENT_TYPES.USER_CREATED,
      'updated': auditStorage.constructor.EVENT_TYPES.USER_UPDATED,
      'deleted': auditStorage.constructor.EVENT_TYPES.USER_DELETED,
      'role_changed': auditStorage.constructor.EVENT_TYPES.USER_ROLE_CHANGED,
      'permissions_changed': auditStorage.constructor.EVENT_TYPES.USER_PERMISSIONS_CHANGED
    };

    return logEvent(eventTypes[action], {
      targetUserId,
      action,
      ...additionalDetails
    });
  }, [logEvent]);

  const logTeamEvent = useCallback((action, teamId, additionalDetails = {}) => {
    const eventTypes = {
      'created': auditStorage.constructor.EVENT_TYPES.TEAM_CREATED,
      'updated': auditStorage.constructor.EVENT_TYPES.TEAM_UPDATED,
      'deleted': auditStorage.constructor.EVENT_TYPES.TEAM_DELETED
    };

    return logEvent(eventTypes[action], {
      teamId,
      action,
      ...additionalDetails
    });
  }, [logEvent]);

  const logDelegationEvent = useCallback((action, delegationId, additionalDetails = {}) => {
    const eventTypes = {
      'created': auditStorage.constructor.EVENT_TYPES.DELEGATION_CREATED,
      'approved': auditStorage.constructor.EVENT_TYPES.DELEGATION_APPROVED,
      'revoked': auditStorage.constructor.EVENT_TYPES.DELEGATION_REVOKED
    };

    return logEvent(eventTypes[action], {
      delegationId,
      action,
      ...additionalDetails
    });
  }, [logEvent]);

  const logInvoiceEvent = useCallback((action, invoiceId, additionalDetails = {}) => {
    const eventTypes = {
      'created': auditStorage.constructor.EVENT_TYPES.INVOICE_CREATED,
      'updated': auditStorage.constructor.EVENT_TYPES.INVOICE_UPDATED,
      'sent': auditStorage.constructor.EVENT_TYPES.INVOICE_SENT
    };

    return logEvent(eventTypes[action], {
      invoiceId,
      action,
      ...additionalDetails
    });
  }, [logEvent]);

  const logQuoteEvent = useCallback((action, quoteId, additionalDetails = {}) => {
    const eventTypes = {
      'created': auditStorage.constructor.EVENT_TYPES.QUOTE_CREATED,
      'updated': auditStorage.constructor.EVENT_TYPES.QUOTE_UPDATED,
      'sent': auditStorage.constructor.EVENT_TYPES.QUOTE_SENT
    };

    return logEvent(eventTypes[action], {
      quoteId,
      action,
      ...additionalDetails
    });
  }, [logEvent]);

  const logSecurityEvent = useCallback((eventType, details = {}) => {
    const securityEvents = [
      auditStorage.constructor.EVENT_TYPES.PERMISSION_DENIED,
      auditStorage.constructor.EVENT_TYPES.SUSPICIOUS_ACTIVITY,
      auditStorage.constructor.EVENT_TYPES.LOGIN_FAILED
    ];

    if (securityEvents.includes(eventType)) {
      return logEvent(eventType, details);
    } else {
      console.warn('Type d\'événement de sécurité non reconnu:', eventType);
    }
  }, [logEvent]);

  const logSystemEvent = useCallback((eventType, details = {}) => {
    const systemEvents = [
      auditStorage.constructor.EVENT_TYPES.SYSTEM_ERROR,
      auditStorage.constructor.EVENT_TYPES.BACKUP_CREATED,
      auditStorage.constructor.EVENT_TYPES.BACKUP_RESTORED,
      auditStorage.constructor.EVENT_TYPES.SETTINGS_CHANGED,
      auditStorage.constructor.EVENT_TYPES.DATA_EXPORT,
      auditStorage.constructor.EVENT_TYPES.DATA_IMPORT
    ];

    if (systemEvents.includes(eventType)) {
      return logEvent(eventType, details);
    } else {
      console.warn('Type d\'événement système non reconnu:', eventType);
    }
  }, [logEvent]);

  const logAuthEvent = useCallback((action, additionalDetails = {}) => {
    const authEvents = {
      'login': auditStorage.constructor.EVENT_TYPES.LOGIN,
      'logout': auditStorage.constructor.EVENT_TYPES.LOGOUT,
      'login_failed': auditStorage.constructor.EVENT_TYPES.LOGIN_FAILED,
      'session_expired': auditStorage.constructor.EVENT_TYPES.SESSION_EXPIRED
    };

    return logEvent(authEvents[action], {
      action,
      ...additionalDetails
    });
  }, [logEvent]);

  // Méthode pour logger l'accès refusé
  const logPermissionDenied = useCallback((resource, action, additionalDetails = {}) => {
    return logEvent(auditStorage.constructor.EVENT_TYPES.PERMISSION_DENIED, {
      resource,
      action,
      message: `Accès refusé à ${resource} pour l'action ${action}`,
      ...additionalDetails
    });
  }, [logEvent]);

  // Méthode pour logger les erreurs système
  const logSystemError = useCallback((error, context = {}) => {
    return logEvent(auditStorage.constructor.EVENT_TYPES.SYSTEM_ERROR, {
      errorMessage: error.message || error,
      errorStack: error.stack,
      errorType: error.name || 'Error',
      context,
      timestamp: new Date().toISOString()
    });
  }, [logEvent]);

  // Méthode pour logger l'export de données
  const logDataExport = useCallback((dataType, recordCount, format, additionalDetails = {}) => {
    return logEvent(auditStorage.constructor.EVENT_TYPES.DATA_EXPORT, {
      dataType,
      recordCount,
      format,
      exportTime: new Date().toISOString(),
      ...additionalDetails
    });
  }, [logEvent]);

  return {
    // Méthode générale
    logEvent,

    // Méthodes spécialisées par domaine
    logPatientEvent,
    logMedicalRecordEvent,
    logAppointmentEvent,
    logConsentEvent,
    logUserEvent,
    logTeamEvent,
    logDelegationEvent,
    logInvoiceEvent,
    logQuoteEvent,

    // Méthodes pour événements spéciaux
    logSecurityEvent,
    logSystemEvent,
    logAuthEvent,
    logPermissionDenied,
    logSystemError,
    logDataExport,

    // Accès direct aux constantes d'audit
    EVENT_TYPES: auditStorage.constructor.EVENT_TYPES,
    SEVERITY_LEVELS: auditStorage.constructor.SEVERITY_LEVELS,
    CATEGORIES: auditStorage.constructor.CATEGORIES
  };
};

export default useAuditLogger;