/**
 * Audit Log Service - Frontend
 * 🔐 CRITIQUE: Envoie TOUS les logs d'accès au backend
 *
 * RÈGLE FONDAMENTALE:
 * - Logs d'accès = propriété du backend
 * - JAMAIS stockés en localStorage
 * - Toujours envoyés au serveur
 * - Backend maintient l'immuabilité
 */

import baseClient from '../api/baseClient';

/**
 * Types d'événements d'accès loggables
 */
export const AUDIT_EVENTS = {
  // Patients
  PATIENT_VIEW: 'patient_view_access',
  PATIENT_EDIT: 'patient_edit_access',
  PATIENT_CREATE: 'patient_create',
  PATIENT_DELETE: 'patient_delete',
  PATIENT_EXPORT: 'patient_export',

  // Dossiers médicaux
  MEDICAL_RECORD_VIEW: 'medical_record_view_access',
  MEDICAL_RECORD_EDIT: 'medical_record_edit_access',
  MEDICAL_RECORD_CREATE: 'medical_record_create',
  MEDICAL_RECORD_DELETE: 'medical_record_delete',

  // Rendez-vous
  APPOINTMENT_VIEW: 'appointment_view_access',
  APPOINTMENT_EDIT: 'appointment_edit_access',
  APPOINTMENT_CREATE: 'appointment_create',
  APPOINTMENT_CONFIRM: 'appointment_confirm',
  APPOINTMENT_DELETE: 'appointment_delete',

  // Consentements
  CONSENT_VIEW: 'consent_view_access',
  CONSENT_SIGN: 'consent_sign',
  CONSENT_REVOKE: 'consent_revoke'
};

/**
 * 🔐 Envoyer un événement d'audit au backend
 *
 * IMPORTANT: Cette fonction envoie le log au serveur (NOT localStorage)
 * Le serveur enregistre dans audit_logs (immuable)
 */
async function logAuditEvent(eventType, resourceType, resourceId, details = {}) {
  try {
    // Construire le payload
    const payload = {
      eventType,
      resourceType,
      resourceId,
      action: details.action || getActionDescription(eventType),
      details: {
        ...details,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.pathname
      }
    };

    // 🔐 ENVOYER AU BACKEND
    // Le backend enregistre dans audit_logs (immuable, protégé)
    const response = await baseClient.post('/audit/log', payload);

    if (!response.success) {
      console.warn('[auditLogService] Failed to log event', eventType, response.error);
      // Ne pas bloquer l'opération si le log échoue
      return false;
    }

    console.log('[auditLogService] Event logged:', eventType);
    return true;
  } catch (error) {
    console.error('[auditLogService] Error logging event', error);
    // Ne pas bloquer l'opération si le log échoue
    return false;
  }
}

/**
 * 🔐 Logger l'accès à une ressource
 */
async function logResourceAccess(eventType, resourceType, resourceId, userId, details = {}) {
  return logAuditEvent(eventType, resourceType, resourceId, {
    userId,
    action: `Accessed ${resourceType}`,
    ...details
  });
}

/**
 * 🔐 Logger la consultation d'un patient
 */
export async function logPatientView(patientId, userId, userRole) {
  return logResourceAccess(
    AUDIT_EVENTS.PATIENT_VIEW,
    'Patient',
    patientId,
    userId,
    {
      action: 'Viewed patient',
      userRole
    }
  );
}

/**
 * 🔐 Logger la modification d'un patient
 */
export async function logPatientEdit(patientId, userId, userRole, changes = {}) {
  return logResourceAccess(
    AUDIT_EVENTS.PATIENT_EDIT,
    'Patient',
    patientId,
    userId,
    {
      action: 'Edited patient',
      userRole,
      changes
    }
  );
}

/**
 * 🔐 Logger la consultation d'un dossier médical
 */
export async function logMedicalRecordView(recordId, userId, userRole, patientId) {
  return logResourceAccess(
    AUDIT_EVENTS.MEDICAL_RECORD_VIEW,
    'MedicalRecord',
    recordId,
    userId,
    {
      action: 'Viewed medical record',
      userRole,
      patientId
    }
  );
}

/**
 * 🔐 Logger la modification d'un dossier médical
 */
export async function logMedicalRecordEdit(recordId, userId, userRole, patientId, changes = {}) {
  return logResourceAccess(
    AUDIT_EVENTS.MEDICAL_RECORD_EDIT,
    'MedicalRecord',
    recordId,
    userId,
    {
      action: 'Edited medical record',
      userRole,
      patientId,
      changes
    }
  );
}

/**
 * 🔐 Logger la consultation d'un rendez-vous
 */
export async function logAppointmentView(appointmentId, userId, userRole) {
  return logResourceAccess(
    AUDIT_EVENTS.APPOINTMENT_VIEW,
    'Appointment',
    appointmentId,
    userId,
    {
      action: 'Viewed appointment',
      userRole
    }
  );
}

/**
 * 🔐 Logger la modification d'un rendez-vous
 */
export async function logAppointmentEdit(appointmentId, userId, userRole, changes = {}) {
  return logResourceAccess(
    AUDIT_EVENTS.APPOINTMENT_EDIT,
    'Appointment',
    appointmentId,
    userId,
    {
      action: 'Edited appointment',
      userRole,
      changes
    }
  );
}

/**
 * 🔐 Logger la consultation d'un consentement
 */
export async function logConsentView(consentId, userId, userRole, patientId) {
  return logResourceAccess(
    AUDIT_EVENTS.CONSENT_VIEW,
    'Consent',
    consentId,
    userId,
    {
      action: 'Viewed consent',
      userRole,
      patientId
    }
  );
}

/**
 * 🔐 Logger la signature d'un consentement
 */
export async function logConsentSign(consentId, userId, userRole, patientId) {
  return logResourceAccess(
    AUDIT_EVENTS.CONSENT_SIGN,
    'Consent',
    consentId,
    userId,
    {
      action: 'Signed consent',
      userRole,
      patientId
    }
  );
}

/**
 * Helper: Obtenir la description de l'action
 */
function getActionDescription(eventType) {
  const descriptions = {
    [AUDIT_EVENTS.PATIENT_VIEW]: 'Consulted patient data',
    [AUDIT_EVENTS.PATIENT_EDIT]: 'Modified patient data',
    [AUDIT_EVENTS.PATIENT_CREATE]: 'Created patient',
    [AUDIT_EVENTS.PATIENT_DELETE]: 'Deleted patient',
    [AUDIT_EVENTS.PATIENT_EXPORT]: 'Exported patient data',

    [AUDIT_EVENTS.MEDICAL_RECORD_VIEW]: 'Consulted medical record',
    [AUDIT_EVENTS.MEDICAL_RECORD_EDIT]: 'Modified medical record',
    [AUDIT_EVENTS.MEDICAL_RECORD_CREATE]: 'Created medical record',
    [AUDIT_EVENTS.MEDICAL_RECORD_DELETE]: 'Deleted medical record',

    [AUDIT_EVENTS.APPOINTMENT_VIEW]: 'Consulted appointment',
    [AUDIT_EVENTS.APPOINTMENT_EDIT]: 'Modified appointment',
    [AUDIT_EVENTS.APPOINTMENT_CREATE]: 'Created appointment',
    [AUDIT_EVENTS.APPOINTMENT_CONFIRM]: 'Confirmed appointment',
    [AUDIT_EVENTS.APPOINTMENT_DELETE]: 'Deleted appointment',

    [AUDIT_EVENTS.CONSENT_VIEW]: 'Consulted consent',
    [AUDIT_EVENTS.CONSENT_SIGN]: 'Signed consent',
    [AUDIT_EVENTS.CONSENT_REVOKE]: 'Revoked consent'
  };

  return descriptions[eventType] || `Event: ${eventType}`;
}

export default {
  logAuditEvent,
  logResourceAccess,
  logPatientView,
  logPatientEdit,
  logMedicalRecordView,
  logMedicalRecordEdit,
  logAppointmentView,
  logAppointmentEdit,
  logConsentView,
  logConsentSign,
  AUDIT_EVENTS
};
