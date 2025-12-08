/**
 * Data Transformation Utilities
 * Converts between frontend (camelCase) and backend (snake_case) formats
 * Handles patient data structure differences
 */

/**
 * Convert snake_case to camelCase
 */
function toCamelCase(str) {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

/**
 * Convert camelCase to snake_case
 */
function toSnakeCase(str) {
  return str.replace(/([A-Z])/g, (g) => `_${g[0].toLowerCase()}`);
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array)
 */
function isEmpty(value) {
  return value === null ||
         value === undefined ||
         value === '' ||
         (Array.isArray(value) && value.length === 0);
}

/**
 * Recursively convert object keys to camelCase
 */
function transformKeysToCAamelCase(obj) {
  if (Array.isArray(obj)) {
    return obj.map(transformKeysToCAamelCase);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      result[toCamelCase(key)] = transformKeysToCAamelCase(obj[key]);
      return result;
    }, {});
  }
  return obj;
}

/**
 * Recursively convert object keys to snake_case
 */
function transformKeysToSnakeCase(obj) {
  if (Array.isArray(obj)) {
    return obj.map(transformKeysToSnakeCase);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      result[toSnakeCase(key)] = transformKeysToSnakeCase(obj[key]);
      return result;
    }, {});
  }
  return obj;
}

/**
 * Transform backend patient response to frontend format
 * Backend: { id, company_id, first_name, last_name, email, phone, date_of_birth, birth_date, ... }
 * Frontend: { id, firstName, lastName, contact: { email, phone }, birthDate, ... }
 */
function transformPatientFromBackend(patient) {
  if (!patient) return null;

  return {
    // Basic info
    id: patient.id,
    firstName: patient.first_name,
    lastName: patient.last_name,
    birthDate: patient.birth_date || patient.date_of_birth,
    dateOfBirth: patient.birth_date || patient.date_of_birth, // Backward compatibility
    gender: patient.gender,
    patientNumber: patient.patient_number,
    idNumber: patient.social_security_number,
    nationality: patient.nationality,

    // Address (nested structure for frontend)
    address: {
      street: patient.address_line1,
      line2: patient.address_line2,
      city: patient.city,
      postalCode: patient.postal_code,
      country: patient.country
    },

    // Contact info (nested)
    contact: {
      email: patient.email,
      phone: patient.phone,
      mobile: patient.mobile,
      // Map city/postal/country to contact for backward compatibility
      city: patient.city,
      postalCode: patient.postal_code,
      country: patient.country,
      // Emergency Contact
      emergencyContact: patient.emergency_contact || {
        name: patient.emergency_contact_name,
        phone: patient.emergency_contact_phone,
        relationship: patient.emergency_contact_relationship
      }
    },

    // Insurance
    insurance: patient.insurance_info || {
      provider: patient.insurance_provider,
      number: patient.insurance_number,
      type: patient.coverage_type
    },

    // Medical info - Transform strings to appropriate formats
    medicalHistory: patient.medical_history || {},
    allergies: patient.allergies
      ? (typeof patient.allergies === 'string'
          ? patient.allergies.split(',').map(a => a.trim()).filter(a => a)  // String → Array
          : patient.allergies)
      : [],
    currentMedications: patient.current_medications
      ? (typeof patient.current_medications === 'string'
          ? patient.current_medications.split(',').map(m => m.trim()).filter(m => m)
          : patient.current_medications)
      : [],
    bloodType: patient.blood_type,
    chronicConditions: patient.chronic_conditions,
    socialSecurityNumber: patient.social_security_number,

    // Status - Map from is_active boolean
    status: patient.is_active === false ? 'inactive' : 'active',
    isIncomplete: patient.is_incomplete || false,
    archived: patient.archived || false,

    // Notes
    notes: patient.notes,

    // Timestamps
    createdAt: patient.created_at,
    updatedAt: patient.updated_at,
    deletedAt: patient.deleted_at,

    // Company/Facility
    companyId: patient.company_id,
    facilityId: patient.facility_id
  };
}

/**
 * Transform frontend patient data to backend format
 * Only sends non-empty values to backend
 */
function transformPatientToBackend(patient) {
  if (!patient) return null;

  // Helper function to check if value is empty
  const isEmpty = (value) => {
    if (value === undefined || value === null || value === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      return Object.keys(value).length === 0;
    }
    return false;
  };

  const backendData = {
    // ============================================
    // REQUIRED FIELDS (4 uniquement)
    // ============================================
    first_name: patient.firstName?.trim(),
    last_name: patient.lastName?.trim(),
    email: patient.contact?.email?.trim(),
    phone: patient.contact?.phone?.trim(),

    // ============================================
    // OPTIONAL FIELDS
    // ============================================

    // Identity
    birth_date: patient.birthDate,
    date_of_birth: patient.birthDate || patient.dateOfBirth, // Backward compatibility
    gender: patient.gender,
    nationality: patient.nationality,
    patient_number: patient.patientNumber,

    // ID Documents (separated - no fallback)
    id_number: patient.idNumber,
    social_security_number: patient.socialSecurityNumber,

    // Contact
    mobile: patient.contact?.mobile,

    // Address
    address_line1: patient.address?.street || patient.addressLine1,
    address_line2: patient.address?.line2 || patient.addressLine2,
    city: patient.address?.city || patient.contact?.city,
    postal_code: patient.address?.postalCode || patient.contact?.postalCode,
    country: patient.address?.country || patient.contact?.country,

    // Emergency Contact
    emergency_contact_name: patient.contact?.emergencyContact?.name,
    emergency_contact_phone: patient.contact?.emergencyContact?.phone,
    emergency_contact_relationship: patient.contact?.emergencyContact?.relationship,

    // Insurance
    insurance_provider: patient.insurance?.provider,
    insurance_number: patient.insurance?.number,
    mutual_insurance: patient.insurance?.mutual,
    mutual_number: patient.insurance?.mutualNumber,

    // Medical (convert arrays to comma-separated strings)
    allergies: Array.isArray(patient.allergies) && patient.allergies.length > 0
      ? patient.allergies.join(', ')
      : patient.allergies,
    current_medications: Array.isArray(patient.currentMedications) && patient.currentMedications.length > 0
      ? patient.currentMedications.join(', ')
      : patient.currentMedications,
    blood_type: patient.bloodType,
    chronic_conditions: patient.chronicConditions,
    medical_history: patient.medicalHistory,

    // Status
    is_active: patient.status ? patient.status === 'active' : true,
    is_incomplete: patient.isIncomplete || false,

    // Notes
    notes: patient.notes
  };

  // Clean up: remove all empty values (undefined, null, '', [], {})
  Object.keys(backendData).forEach(key => {
    if (isEmpty(backendData[key])) {
      delete backendData[key];
    }
  });

  return backendData;
}

/**
 * Transform backend response (with success/data wrapper) to plain data
 */
function unwrapResponse(response) {
  if (response && response.data !== undefined) {
    return response.data;
  }
  return response;
}

/**
 * Transform patient list from backend
 */
function transformPatientListFromBackend(patients) {
  if (!Array.isArray(patients)) return [];
  return patients.map(transformPatientFromBackend);
}

/**
 * ============================================================================
 * HEALTHCARE PROVIDERS (Utilisateurs de la clinique)
 * ============================================================================
 */

/**
 * Transform backend healthcare provider to frontend format
 * Backend: { first_name, last_name, specialties: [...], availability: {...} }
 * Frontend: { firstName, lastName, speciality: "...", availability: {...} }
 */
function transformHealthcareProviderFromBackend(provider) {
  if (!provider) return null;

  return {
    id: provider.id,
    facilityId: provider.facility_id,
    email: provider.email,
    firstName: provider.first_name,
    lastName: provider.last_name,
    title: provider.title,

    // Professional info
    profession: provider.profession,
    speciality: Array.isArray(provider.specialties) && provider.specialties.length > 0
      ? provider.specialties[0]  // Frontend uses SINGULAR speciality (first one)
      : provider.specialties,
    specialties: provider.specialties,  // Also keep array for completeness
    adeli: provider.adeli,
    rpps: provider.rpps,
    license: provider.rpps || provider.adeli || provider.order_number,
    licenseNumber: provider.order_number,

    // Role and permissions
    role: provider.role,
    permissions: provider.permissions,

    // Contact
    phone: provider.phone,
    mobile: provider.mobile,

    // UI
    type: provider.profession?.toLowerCase() === 'médecin' ? 'doctor' :
          provider.profession?.toLowerCase() === 'infirmier' || provider.profession?.toLowerCase() === 'infirmière' ? 'nurse' :
          'other',
    color: provider.color || 'blue',
    availability: provider.availability || {},

    // Status
    isActive: provider.is_active,
    emailVerified: provider.email_verified,
    lastLogin: provider.last_login,

    // Timestamps
    createdAt: provider.created_at,
    updatedAt: provider.updated_at
  };
}

/**
 * Transform frontend healthcare provider to backend format
 * Frontend: { firstName, lastName, speciality: "...", availability: {...} }
 * Backend: { first_name, last_name, specialties: [...], availability: {...} }
 */
function transformHealthcareProviderToBackend(provider) {
  if (!provider) return null;

  const backendData = {
    facility_id: provider.facilityId,
    email: provider.email?.trim(),
    password_hash: provider.password || provider.passwordHash,
    first_name: provider.firstName?.trim(),
    last_name: provider.lastName?.trim(),
    title: provider.title,

    // Professional info
    profession: provider.profession || provider.department,
    // Handle speciality (SINGULAR with Y) -> specialties (PLURAL with IES)
    specialties: provider.specialties || (provider.speciality ? [provider.speciality] : []),
    adeli: provider.adeli,
    rpps: provider.rpps || provider.license,
    order_number: provider.licenseNumber || provider.orderNumber,

    // Role and permissions
    role: provider.role,
    permissions: provider.permissions || {},

    // Contact
    phone: provider.phone,
    mobile: provider.mobile,

    // UI
    color: provider.color || 'blue',
    availability: provider.availability || {},

    // Status
    is_active: provider.isActive !== undefined ? provider.isActive : true,
    email_verified: provider.emailVerified || false
  };

  // Clean up empty values
  Object.keys(backendData).forEach(key => {
    if (isEmpty(backendData[key])) {
      delete backendData[key];
    }
  });

  return backendData;
}

/**
 * ============================================================================
 * CLINIC SETTINGS (Configuration de la clinique)
 * ============================================================================
 */

/**
 * Transform backend clinic settings to frontend format
 */
function transformClinicSettingsFromBackend(settings) {
  if (!settings) return null;

  return {
    id: settings.id,
    facilityId: settings.facility_id,

    // Operating days (array of day numbers: 0=Sunday, 1=Monday, etc.)
    operatingDays: settings.operating_days || [1, 2, 3, 4, 5],

    // Operating hours (keep snake_case structure for compatibility)
    operatingHours: settings.operating_hours || {},

    // Slot settings
    slotSettings: {
      defaultDuration: settings.slot_settings?.defaultDuration || 30,
      availableDurations: settings.slot_settings?.availableDurations || [15, 20, 30, 45, 60],
      bufferTime: settings.slot_settings?.bufferTime || 5,
      maxAdvanceBooking: settings.slot_settings?.maxAdvanceBooking || 90,
      minAdvanceBooking: settings.slot_settings?.minAdvanceBooking || 1,
      allowWeekendBooking: settings.slot_settings?.allowWeekendBooking || false
    },

    // Closed dates
    closedDates: settings.closed_dates || [],

    // Appointment types
    appointmentTypes: settings.appointment_types || [],

    // Notifications
    notifications: settings.notifications || {},

    // Timestamps
    createdAt: settings.created_at,
    updatedAt: settings.updated_at
  };
}

/**
 * Transform frontend clinic settings to backend format
 */
function transformClinicSettingsToBackend(settings) {
  if (!settings) return null;

  const backendData = {
    // NOTE: facility_id is read-only and should NOT be sent on update
    operating_days: settings.operatingDays,
    operating_hours: settings.operatingHours,
    slot_settings: settings.slotSettings,
    closed_dates: settings.closedDates,
    appointment_types: settings.appointmentTypes,
    notifications: settings.notifications
  };

  // Clean up empty values
  Object.keys(backendData).forEach(key => {
    if (isEmpty(backendData[key])) {
      delete backendData[key];
    }
  });

  return backendData;
}

/**
 * ============================================================================
 * CLINIC ROLES (Rôles personnalisés)
 * ============================================================================
 */

/**
 * Transform backend clinic role to frontend format
 */
function transformClinicRoleFromBackend(role) {
  if (!role) return null;

  return {
    id: role.id,
    facilityId: role.facility_id,
    name: role.name,
    description: role.description,
    level: role.level,
    isSystemRole: role.is_system_role,
    permissions: role.permissions || [],
    color: role.color || 'gray',
    createdAt: role.created_at,
    updatedAt: role.updated_at
  };
}

/**
 * Transform frontend clinic role to backend format
 */
function transformClinicRoleToBackend(role) {
  if (!role) return null;

  const backendData = {
    facility_id: role.facilityId,
    name: role.name?.trim(),
    description: role.description,
    level: role.level || 50,
    is_system_role: role.isSystemRole || false,
    permissions: role.permissions || [],
    color: role.color || 'gray'
  };

  // Clean up empty values
  Object.keys(backendData).forEach(key => {
    if (isEmpty(backendData[key])) {
      delete backendData[key];
    }
  });

  return backendData;
}

/**
 * ============================================================================
 * FACILITIES (Profil établissement / Company Settings)
 * ============================================================================
 */

/**
 * Transform backend facility to frontend format
 */
function transformFacilityFromBackend(facility) {
  if (!facility) return null;

  return {
    id: facility.id,
    name: facility.name,
    facilityType: facility.facility_type,

    // Registration
    finess: facility.finess,
    siret: facility.siret,
    adeli: facility.adeli,
    rpps: facility.rpps,
    businessNumber: facility.siret,  // Alias for compatibility

    // Address
    address: facility.address_line1,
    addressLine1: facility.address_line1,
    addressLine2: facility.address_line2,
    postalCode: facility.postal_code,
    city: facility.city,
    country: facility.country,

    // Contact
    phone: facility.phone,
    email: facility.email,
    website: facility.website,

    // Medical info
    specialties: facility.specialties || [],
    services: facility.services || [],

    // Configuration
    settings: facility.settings || {},
    timezone: facility.timezone || 'Europe/Paris',
    language: facility.language || 'fr-FR',

    // Status
    isActive: facility.is_active,
    subscriptionPlan: facility.subscription_plan,
    subscriptionExpiresAt: facility.subscription_expires_at,

    // Timestamps
    createdAt: facility.created_at,
    updatedAt: facility.updated_at
  };
}

/**
 * Transform frontend facility to backend format
 */
function transformFacilityToBackend(facility) {
  if (!facility) return null;

  const backendData = {
    name: facility.name?.trim(),
    facility_type: facility.facilityType,

    // Registration
    finess: facility.finess,
    siret: facility.siret || facility.businessNumber,
    adeli: facility.adeli,
    rpps: facility.rpps,

    // Address
    address_line1: facility.address || facility.addressLine1,
    address_line2: facility.addressLine2,
    postal_code: facility.postalCode,
    city: facility.city,
    country: facility.country || 'FR',

    // Contact
    phone: facility.phone,
    email: facility.email,
    website: facility.website,

    // Medical info
    specialties: facility.specialties || [],
    services: facility.services || [],

    // Configuration
    timezone: facility.timezone || 'Europe/Paris',
    language: facility.language || 'fr-FR',

    // Status
    is_active: facility.isActive !== undefined ? facility.isActive : true
  };

  // Clean up empty values
  Object.keys(backendData).forEach(key => {
    if (isEmpty(backendData[key])) {
      delete backendData[key];
    }
  });

  return backendData;
}

export const dataTransform = {
  // Key transformation
  toCamelCase,
  toSnakeCase,
  transformKeysToCAamelCase,
  transformKeysToSnakeCase,

  // Patient transformation
  transformPatientFromBackend,
  transformPatientToBackend,
  transformPatientListFromBackend,

  // Healthcare Provider transformation
  transformHealthcareProviderFromBackend,
  transformHealthcareProviderToBackend,

  // Clinic Settings transformation
  transformClinicSettingsFromBackend,
  transformClinicSettingsToBackend,

  // Clinic Roles transformation
  transformClinicRoleFromBackend,
  transformClinicRoleToBackend,

  // Facility transformation
  transformFacilityFromBackend,
  transformFacilityToBackend,

  // Response handling
  unwrapResponse
};
