/**
 * Medical Constants
 * Centralized constants for departments, specialties, practitioner roles, and appointment types
 *
 * IMPORTANT: These constants are used across multiple components:
 * - UserFormModal
 * - TeamFormModal
 * - PractitionerSetupStep
 * - PractitionerManagementModal
 * - AppointmentFormModal
 *
 * Backend validation schemas in:
 * - /var/www/medical-pro-backend/src/base/clinicConfigSchemas.js
 */

// ============================================================================
// DEPARTMENTS
// ============================================================================

/**
 * Department keys for translation
 * Use with t(`departments.${key}`) or t(`admin:departments.${key}`)
 */
export const DEPARTMENT_KEYS = [
  'direction',
  'administration',
  'generalMedicine',
  'cardiology',
  'dermatology',
  'gynecology',
  'pediatrics',
  'radiology',
  'surgery',
  'nursing',
  'reception',
  'pharmacy',
  'laboratory',
  'physiotherapy',
  'audit'
];

/**
 * Specialties organized by department
 * These are medical/professional terms that may not need translation
 */
export const SPECIALTIES_BY_DEPARTMENT = {
  direction: ['Gestion', 'Stratégie', 'Qualité'],
  administration: ['Ressources Humaines', 'Comptabilité', 'Informatique'],
  generalMedicine: ['Médecine Générale', 'Médecine Préventive'],
  cardiology: ['Cardiologie Interventionnelle', 'Rythmologie', 'Insuffisance Cardiaque'],
  dermatology: ['Dermatologie Générale', 'Dermatologie Esthétique', 'Dermatopathologie'],
  gynecology: ['Gynécologie Médicale', 'Obstétrique', 'PMA'],
  pediatrics: ['Pédiatrie Générale', 'Néonatologie', 'Pédopsychiatrie'],
  radiology: ['Radiologie Conventionnelle', 'Scanner', 'IRM', 'Échographie'],
  surgery: ['Chirurgie Générale', 'Chirurgie Orthopédique', 'Chirurgie Esthétique'],
  nursing: ['Soins Généraux', 'Soins Intensifs', 'Bloc Opératoire'],
  reception: ['Administration', 'Secrétariat Médical', 'Facturation'],
  pharmacy: ['Pharmacie Clinique', 'Stérilisation'],
  laboratory: ['Biologie Médicale', 'Anatomopathologie'],
  physiotherapy: ['Kinésithérapie Générale', 'Kinésithérapie Sportive'],
  audit: ['Consultation', 'Contrôle Qualité']
};

/**
 * Get specialties for a given department
 * @param {string} department - Department key
 * @returns {string[]} Array of specialties
 */
export function getSpecialtiesForDepartment(department) {
  return SPECIALTIES_BY_DEPARTMENT[department] || [];
}

// ============================================================================
// PRACTITIONER ROLES
// ============================================================================

/**
 * Standardized practitioner roles
 * Must match backend validation in clinicConfigSchemas.js:
 * role: Joi.string().valid('super_admin', 'admin', 'physician', 'practitioner', 'secretary', 'readonly')
 */
export const PRACTITIONER_ROLES = {
  super_admin: { level: 100, color: 'red', canCreateUsers: true },
  admin: { level: 90, color: 'orange', canCreateUsers: true },
  physician: { level: 70, color: 'blue', canCreateUsers: false },
  practitioner: { level: 60, color: 'green', canCreateUsers: false },
  secretary: { level: 50, color: 'purple', canCreateUsers: false },
  readonly: { level: 10, color: 'gray', canCreateUsers: false }
};

/**
 * Roles available for onboarding (creating first practitioner)
 * Only clinical roles, not admin roles
 */
export const ONBOARDING_PRACTITIONER_ROLES = ['physician', 'practitioner'];

/**
 * Administrative roles (cumulative with main role)
 * Must match backend: administrative_role: Joi.string().valid('direction', 'clinic_admin', 'hr', 'billing')
 */
export const ADMINISTRATIVE_ROLES = ['direction', 'clinic_admin', 'hr', 'billing'];

// ============================================================================
// MEDICAL SPECIALTIES (for practitioner selection)
// ============================================================================

/**
 * Medical specialties for practitioner profiles
 * Keys are used for translation: t(`specialties.${key}`)
 */
export const MEDICAL_SPECIALTY_KEYS = [
  'general_medicine',
  'cardiology',
  'dermatology',
  'pediatrics',
  'gynecology',
  'orthopedics',
  'ophthalmology',
  'dentistry',
  'nursing',
  'physiotherapy',
  'psychiatry',
  'neurology',
  'gastroenterology',
  'urology',
  'endocrinology',
  'rheumatology',
  'pneumology',
  'nephrology',
  'oncology',
  'anesthesiology'
];

// ============================================================================
// APPOINTMENT TYPES
// ============================================================================

/**
 * Appointment types with default durations
 * Keys are used for translation: t(`appointmentTypes.${key}`)
 */
export const APPOINTMENT_TYPES = {
  consultation: { duration: 30, color: 'blue', priority: 'normal' },
  followup: { duration: 20, color: 'green', priority: 'normal' },
  emergency: { duration: 45, color: 'red', priority: 'urgent' },
  specialist: { duration: 45, color: 'purple', priority: 'normal' },
  checkup: { duration: 60, color: 'teal', priority: 'low' },
  vaccination: { duration: 15, color: 'orange', priority: 'normal' },
  surgery: { duration: 120, color: 'pink', priority: 'high' }
};

/**
 * Get appointment type keys
 */
export const APPOINTMENT_TYPE_KEYS = Object.keys(APPOINTMENT_TYPES);

/**
 * Get default duration for an appointment type
 * @param {string} type - Appointment type key
 * @returns {number} Duration in minutes
 */
export function getAppointmentDuration(type) {
  return APPOINTMENT_TYPES[type]?.duration || 30;
}

/**
 * Get appointment type color class for UI
 * @param {string} type - Appointment type key
 * @returns {string} Tailwind color class
 */
export function getAppointmentTypeColor(type) {
  const colorMap = {
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    purple: 'bg-purple-100 text-purple-800',
    teal: 'bg-teal-100 text-teal-800',
    orange: 'bg-orange-100 text-orange-800',
    pink: 'bg-pink-100 text-pink-800',
    yellow: 'bg-yellow-100 text-yellow-800'
  };
  const color = APPOINTMENT_TYPES[type]?.color || 'blue';
  return colorMap[color] || colorMap.blue;
}

// ============================================================================
// APPOINTMENT PRIORITIES
// ============================================================================

export const APPOINTMENT_PRIORITIES = ['low', 'normal', 'high', 'urgent'];

/**
 * Get priority color class for UI
 * @param {string} priority - Priority key
 * @returns {string} Tailwind text color class
 */
export function getPriorityColor(priority) {
  const colorMap = {
    low: 'text-gray-600',
    normal: 'text-blue-600',
    high: 'text-orange-600',
    urgent: 'text-red-600'
  };
  return colorMap[priority] || colorMap.normal;
}

// ============================================================================
// APPOINTMENT STATUSES
// ============================================================================

export const APPOINTMENT_STATUSES = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];

// ============================================================================
// PROFESSIONS (for healthcare providers)
// ============================================================================

/**
 * Profession labels by role
 * Used when role doesn't have specific profession
 */
export const PROFESSION_BY_ROLE = {
  physician: 'Médecin',
  practitioner: 'Praticien de santé',
  secretary: 'Secrétaire médicale',
  admin: 'Administrateur',
  readonly: 'Observateur'
};

/**
 * Get profession label for a role
 * @param {string} role - Role key
 * @returns {string} Profession label
 */
export function getProfessionForRole(role) {
  return PROFESSION_BY_ROLE[role] || 'Employé';
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Check if a role is valid
 * @param {string} role - Role to check
 * @returns {boolean}
 */
export function isValidRole(role) {
  return Object.keys(PRACTITIONER_ROLES).includes(role);
}

/**
 * Check if a department is valid
 * @param {string} department - Department to check
 * @returns {boolean}
 */
export function isValidDepartment(department) {
  return DEPARTMENT_KEYS.includes(department);
}

/**
 * Check if an administrative role is valid
 * @param {string} role - Administrative role to check
 * @returns {boolean}
 */
export function isValidAdministrativeRole(role) {
  return !role || ADMINISTRATIVE_ROLES.includes(role);
}

/**
 * Get role color for UI
 * @param {string} role - Role key
 * @returns {string} Tailwind color class suffix (e.g., 'red', 'blue')
 */
export function getRoleColor(role) {
  return PRACTITIONER_ROLES[role]?.color || 'gray';
}

/**
 * Get role level (for permission hierarchy)
 * @param {string} role - Role key
 * @returns {number} Role level (0-100)
 */
export function getRoleLevel(role) {
  return PRACTITIONER_ROLES[role]?.level || 0;
}
