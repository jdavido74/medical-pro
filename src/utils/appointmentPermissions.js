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
  if (process.env.NODE_ENV === 'development' && !appointment.id) {
    console.warn('[enrichAppointmentWithPermissions] Appointment without ID:', {
      appointment,
      hasId: !!appointment.id
    });
  }

  // Données de base toujours enrichies
  const enriched = {
    ...appointment,
    practitionerName: practitioner?.name || 'Non assigné',
    practitionerSpecialty: practitioner?.specialty || ''
  };

  // Vérifier les permissions pour afficher les données patient
  const canViewPatientDetails = hasPermission(PERMISSIONS.PATIENTS_VIEW);
  const canViewAllPatients = hasPermission(PERMISSIONS.PATIENTS_VIEW_ALL);
  // IMPORTANT: Utiliser providerId (healthcare_provider.id) car appointment.practitionerId vient de la base clinique
  const userProviderId = user?.providerId || user?.id;
  const isOwnAppointment = appointment.practitionerId === userProviderId;

  /**
   * Règles d'affichage des données patient:
   * 1. L'utilisateur doit avoir la permission PATIENTS_VIEW
   * 2. ET soit:
   *    - Il peut voir TOUS les patients (PATIENTS_VIEW_ALL)
   *    - Soit c'est son propre rendez-vous (practitionerId === user.providerId)
   */
  if (canViewPatientDetails && (canViewAllPatients || isOwnAppointment)) {
    // Afficher les vraies données patient - utiliser plusieurs sources
    // 1. Patient passé en paramètre (lookup depuis localStorage ou PatientContext)
    // 2. Patient inclus dans le rendez-vous (depuis l'API backend)
    // 3. Titre du rendez-vous (contient souvent le nom du patient)
    const embeddedPatient = appointment.patient;

    let patientName = 'Patient inconnu';
    let patientPhone = '';
    let patientNumber = '';

    if (patient) {
      // Source 1: Patient trouvé par lookup
      patientName = `${patient.firstName} ${patient.lastName}`;
      patientPhone = patient.phone || patient.contact?.phone || '';
      patientNumber = patient.patientNumber || '';
    } else if (embeddedPatient) {
      // Source 2: Patient inclus dans la réponse API
      const firstName = embeddedPatient.first_name || embeddedPatient.firstName || '';
      const lastName = embeddedPatient.last_name || embeddedPatient.lastName || '';
      patientName = `${firstName} ${lastName}`.trim() || 'Patient inconnu';
      patientPhone = embeddedPatient.phone || '';
      patientNumber = embeddedPatient.patient_number || embeddedPatient.patientNumber || '';
    } else if (appointment.title) {
      // Source 3: Utiliser le titre du rendez-vous (contient le nom du patient)
      patientName = appointment.title;
    }

    enriched.patientName = patientName;
    enriched.patientPhone = patientPhone;
    enriched.patientNumber = patientNumber;
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
    // IMPORTANT: Utiliser providerId (healthcare_provider.id) car apt.practitionerId vient de la base clinique
    const userProviderId = user?.providerId || user?.id;
    return appointments.filter(apt => apt.practitionerId === userProviderId);
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
