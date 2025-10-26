/**
 * Gestion des permissions et de l'enrichissement des rendez-vous
 * Applique les règles de visibilité des données patient selon les permissions
 */

import { PERMISSIONS } from './permissionsStorage';

/**
 * Enrichir un rendez-vous avec les données patient et praticien
 * en respectant les permissions de l'utilisateur
 *
 * @param {Object} appointment - Le rendez-vous brut
 * @param {Object} patient - Les données du patient
 * @param {Object} practitioner - Les données du praticien
 * @param {Object} user - L'utilisateur courant
 * @param {Function} hasPermission - Fonction pour vérifier les permissions (usePermissions hook)
 * @returns {Object} Le rendez-vous enrichi avec les données visibles selon les permissions
 */
export const enrichAppointmentWithPermissions = (
  appointment,
  patient,
  practitioner,
  user,
  hasPermission
) => {
  // Données de base toujours enrichies
  const enriched = {
    ...appointment,
    practitionerName: practitioner?.name || 'Non assigné',
    practitionerSpecialty: practitioner?.specialty || ''
  };

  // Vérifier les permissions pour afficher les données patient
  const canViewPatientDetails = hasPermission(PERMISSIONS.PATIENTS_VIEW);
  const canViewAllPatients = hasPermission(PERMISSIONS.PATIENTS_VIEW_ALL);
  const isOwnAppointment = appointment.practitionerId === user?.id;

  /**
   * Règles d'affichage des données patient:
   * 1. L'utilisateur doit avoir la permission PATIENTS_VIEW
   * 2. ET soit:
   *    - Il peut voir TOUS les patients (PATIENTS_VIEW_ALL)
   *    - Soit c'est son propre rendez-vous (practitionerId === user.id)
   */
  if (canViewPatientDetails && (canViewAllPatients || isOwnAppointment)) {
    // Afficher les vraies données patient
    enriched.patientName = patient ? `${patient.firstName} ${patient.lastName}` : 'Patient inconnu';
    enriched.patientPhone = patient?.phone || '';
    enriched.patientNumber = patient?.patientNumber || '';
  } else {
    // Masquer les données patient
    enriched.patientName = 'Rendez-vous masqué';
    enriched.patientPhone = '';
    enriched.patientNumber = '';
  }

  return enriched;
};

/**
 * Déterminer si l'utilisateur peut voir tous les rendez-vous
 *
 * @param {Function} hasPermission - Fonction pour vérifier les permissions
 * @returns {boolean} true si l'utilisateur peut voir tous les RDV
 */
export const canViewAllAppointments = (hasPermission) => {
  return hasPermission(PERMISSIONS.APPOINTMENTS_VIEW_ALL);
};

/**
 * Déterminer si l'utilisateur peut voir les données patient
 *
 * @param {Function} hasPermission - Fonction pour vérifier les permissions
 * @returns {boolean} true si l'utilisateur peut voir les données patient
 */
export const canViewPatientData = (hasPermission) => {
  return hasPermission(PERMISSIONS.PATIENTS_VIEW);
};

/**
 * Déterminer si l'utilisateur peut voir tous les patients
 *
 * @param {Function} hasPermission - Fonction pour vérifier les permissions
 * @returns {boolean} true si l'utilisateur peut voir tous les patients
 */
export const canViewAllPatients = (hasPermission) => {
  return hasPermission(PERMISSIONS.PATIENTS_VIEW_ALL);
};

/**
 * Filtrer les rendez-vous selon les permissions de l'utilisateur
 *
 * @param {Array} appointments - Tous les rendez-vous
 * @param {Object} user - L'utilisateur courant
 * @param {Function} hasPermission - Fonction pour vérifier les permissions
 * @returns {Array} Les rendez-vous filtrés selon les permissions
 */
export const filterAppointmentsByPermissions = (appointments, user, hasPermission) => {
  const canViewAll = canViewAllAppointments(hasPermission);

  if (canViewAll) {
    // L'utilisateur peut voir TOUS les rendez-vous
    return appointments;
  } else {
    // L'utilisateur ne peut voir que ses propres rendez-vous
    return appointments.filter(apt => apt.practitionerId === user?.id);
  }
};

/**
 * Déterminer si le filtre praticien doit être affiché
 *
 * @param {Function} hasPermission - Fonction pour vérifier les permissions
 * @returns {boolean} true si le filtre praticien doit être affiché
 */
export const shouldShowPractitionerFilter = (hasPermission) => {
  // Afficher le filtre praticien si l'utilisateur peut voir tous les RDV
  return canViewAllAppointments(hasPermission);
};
