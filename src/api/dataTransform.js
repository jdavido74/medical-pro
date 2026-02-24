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
 * Safely convert a string to a number
 * Returns undefined if the value is empty or not a valid number
 * This is used to convert form input values (always strings) to numbers for API
 */
function toNumber(value) {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const num = parseFloat(value);
  return isNaN(num) ? undefined : num;
}

/**
 * Safely convert a string to an integer
 * Returns undefined if the value is empty or not a valid integer
 */
function toInteger(value) {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const num = parseInt(value, 10);
  return isNaN(num) ? undefined : num;
}

/**
 * Convert a value to a valid ISO date or null
 * Returns null for empty strings, undefined, or invalid dates
 * Returns the ISO string if valid
 */
function toDateOrNull(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  // If it's already a valid ISO date string, return it
  if (typeof value === 'string' && value.trim() !== '') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return value; // Return original string if valid
    }
  }
  // If it's a Date object
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString();
  }
  return null;
}

/**
 * Convert a string value - returns null for empty strings if nullifyEmpty is true
 * Otherwise returns the string as-is (including empty strings)
 */
function toStringOrNull(value, nullifyEmpty = false) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string' && value.trim() === '' && nullifyEmpty) {
    return null;
  }
  return value;
}

/**
 * Clean an object by removing keys with undefined or null values
 * Returns undefined if the resulting object is empty (so it gets removed from parent)
 */
function cleanObject(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return undefined;
  }

  const cleaned = {};
  let hasValues = false;

  Object.keys(obj).forEach(key => {
    const value = obj[key];
    // Keep the value if it's not undefined and not null
    // Empty strings are valid for text fields
    if (value !== undefined && value !== null) {
      cleaned[key] = value;
      hasValues = true;
    }
  });

  return hasValues ? cleaned : undefined;
}

/**
 * Filter an array to remove empty/null items and clean each object item
 * Returns undefined if the resulting array is empty
 */
function cleanArray(arr, itemCleaner = null) {
  if (!Array.isArray(arr)) {
    return undefined;
  }

  const cleaned = arr
    .map(item => itemCleaner ? itemCleaner(item) : item)
    .filter(item => {
      if (item === null || item === undefined) return false;
      if (typeof item === 'string' && item.trim() === '') return false;
      if (typeof item === 'object' && Object.keys(item).length === 0) return false;
      return true;
    });

  return cleaned.length > 0 ? cleaned : undefined;
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
      type: patient.coverage_type || patient.insurance_type
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

    // Profile completeness status (provisional / complete)
    profileStatus: patient.profile_status || 'complete',

    // Status - Map from is_active boolean
    status: patient.is_active === false ? 'inactive' : 'active',
    isIncomplete: patient.is_incomplete || patient.profile_status === 'provisional' || false,
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
    coverage_type: patient.insurance?.type,
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
    profile_status: patient.profileStatus,
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
    administrativeRole: provider.administrative_role, // Rôle administratif cumulable (direction, clinic_admin, hr, billing)
    permissions: provider.permissions,

    // Contact
    phone: provider.phone,
    mobile: provider.mobile,

    // UI - Map profession to standardized role types
    type: provider.profession?.toLowerCase() === 'médecin' ? 'physician' :
          provider.profession?.toLowerCase() === 'infirmier' || provider.profession?.toLowerCase() === 'infirmière' ? 'nurse' :
          provider.profession?.toLowerCase() === 'kinésithérapeute' || provider.profession?.toLowerCase() === 'kiné' ? 'practitioner' :
          provider.role || 'practitioner',
    color: provider.color || 'blue',
    availability: provider.availability || {},

    // Status
    isActive: provider.is_active,
    emailVerified: provider.email_verified,
    accountStatus: provider.account_status, // 'active', 'pending', 'inactive'
    lastLogin: provider.last_login,

    // Central user link (for activation)
    centralUserId: provider.central_user_id,
    authMigratedToCentral: provider.auth_migrated_to_central,

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
    send_invitation: provider.sendInvitation || false,
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
    administrative_role: provider.administrativeRole || null, // Rôle administratif cumulable
    permissions: provider.permissions || {},

    // Contact
    phone: provider.phone,
    mobile: provider.mobile,

    // UI
    color: provider.color || 'blue',
    availability: provider.availability || {},

    // Team assignment
    team_id: provider.teamId || null,

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
    facilityNumber: facility.facility_number || '',

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
    logoUrl: facility.logo_url || null,

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
    facility_number: facility.facilityNumber,

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

/**
 * ============================================================================
 * MEDICAL RECORDS (Dossiers médicaux)
 * ============================================================================
 */

/**
 * Transform backend medical record to frontend format
 * Backend: snake_case (patient_id, vital_signs, chief_complaint, etc.)
 * Frontend: camelCase (patientId, vitalSigns, chiefComplaint, etc.)
 */
function transformMedicalRecordFromBackend(record) {
  if (!record) return null;

  return {
    id: record.id,
    facilityId: record.facility_id,
    patientId: record.patient_id,
    providerId: record.provider_id,
    practitionerId: record.provider_id, // Alias for compatibility

    // Record type
    type: record.record_type,
    recordType: record.record_type,

    // Date et heure de consultation (éditable) - format pour datetime-local: YYYY-MM-DDTHH:MM
    recordDate: record.record_date
      ? record.record_date.slice(0, 16) // Tronquer les secondes et timezone pour datetime-local
      : (record.created_at ? record.created_at.slice(0, 16) : null),

    // Assistant optionnel (infirmière, aide-soignant, etc.)
    assistantProviderId: record.assistant_provider_id,

    // Basic info
    chiefComplaint: record.chief_complaint,
    symptoms: record.symptoms || [],
    duration: record.duration,
    currentIllness: record.current_illness || '',

    // Evolution notes
    evolution: record.evolution || '',

    // Nested structures - keep JSONB as-is but transform key names
    basicInfo: {
      chiefComplaint: record.chief_complaint,
      symptoms: record.symptoms || [],
      duration: record.duration
    },

    // Vital signs (transform nested structure)
    vitalSigns: record.vital_signs ? {
      weight: record.vital_signs.weight,
      height: record.vital_signs.height,
      bmi: record.vital_signs.bmi,
      bloodPressure: record.vital_signs.blood_pressure || record.vital_signs.bloodPressure,
      heartRate: record.vital_signs.heart_rate || record.vital_signs.heartRate,
      temperature: record.vital_signs.temperature,
      respiratoryRate: record.vital_signs.respiratory_rate || record.vital_signs.respiratoryRate,
      oxygenSaturation: record.vital_signs.oxygen_saturation || record.vital_signs.oxygenSaturation,
      bloodGlucose: record.vital_signs.blood_glucose || record.vital_signs.bloodGlucose,
      additionalReadings: (record.vital_signs.additional_readings || record.vital_signs.additionalReadings || []).map(r => ({
        timestamp: r.timestamp,
        treatmentId: r.treatment_id || r.treatmentId,
        treatmentName: r.treatment_name || r.treatmentName,
        bloodPressure: r.blood_pressure || r.bloodPressure,
        heartRate: r.heart_rate || r.heartRate,
        temperature: r.temperature,
        oxygenSaturation: r.oxygen_saturation || r.oxygenSaturation,
        bloodGlucose: r.blood_glucose || r.bloodGlucose,
        observations: r.observations
      }))
    } : {},

    // Medical history
    antecedents: record.antecedents || {},

    // Allergies
    allergies: record.allergies || [],

    // Diagnosis (handle both new JSONB and legacy columns)
    diagnosis: record.diagnosis && Object.keys(record.diagnosis).length > 0
      ? record.diagnosis
      : {
          primary: record.diagnosis_primary || '',
          secondary: record.diagnosis_secondary ? record.diagnosis_secondary.split(', ') : [],
          icd10: record.icd10_codes || []
        },

    // Chronic conditions
    chronicConditions: record.chronic_conditions || [],

    // Physical exam
    physicalExam: record.physical_exam || {},

    // Appointment link
    appointmentId: record.appointment_id,
    originalTreatments: record.original_treatments,

    // Treatments (transform snake_case to camelCase in array)
    treatments: (record.treatments || []).map(t => ({
      medication: t.medication,
      dosage: t.dosage,
      frequency: t.frequency,
      route: t.route,
      startDate: t.start_date || t.startDate,
      endDate: t.end_date || t.endDate,
      status: t.status,
      prescribedBy: t.prescribed_by || t.prescribedBy,
      notes: t.notes,
      catalogItemId: t.catalog_item_id || t.catalogItemId || null,
      catalogItemType: t.catalog_item_type || t.catalogItemType || null,
      origin: t.origin || null,
      appointmentItemId: t.appointment_item_id || t.appointmentItemId || null,
      originalMedication: t.original_medication || t.originalMedication || null
    })),

    // Treatment plan
    treatmentPlan: record.treatment_plan ? {
      recommendations: record.treatment_plan.recommendations || [],
      followUp: record.treatment_plan.follow_up || record.treatment_plan.followUp,
      tests: record.treatment_plan.tests || []
    } : {},

    // Current medications (patient's existing medications)
    currentMedications: (record.current_medications || []).map(m => ({
      medication: m.medication,
      dosage: m.dosage,
      frequency: m.frequency,
      startDate: m.start_date || m.startDate,
      prescribedBy: m.prescribed_by || m.prescribedBy,
      notes: m.notes
    })),

    // Medication warnings
    medicationWarnings: record.medication_warnings || [],

    // Blood type
    bloodType: record.blood_type,

    // Notes
    notes: record.notes,
    privateNotes: record.private_notes,

    // Audit trail
    accessLog: record.access_log || [],

    // Signature status
    isSigned: record.is_signed,
    signedAt: record.signed_at,
    signedBy: record.signed_by,
    isLocked: record.is_locked,

    // Soft delete
    archived: record.archived || false,
    archivedAt: record.archived_at,
    archivedBy: record.archived_by,
    deleted: record.archived, // Alias for compatibility

    // Timestamps
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    createdBy: record.created_by
  };
}

/**
 * Transform frontend medical record to backend format
 * Frontend: camelCase → Backend: snake_case
 *
 * IMPORTANT: This function handles all data type conversions:
 * - Numbers: string → number (removed if empty/invalid)
 * - Dates: string → ISO date string (removed if empty/invalid)
 * - Strings: empty strings → removed for cleaner data
 * - Arrays: cleaned of empty items, removed if empty
 * - Objects: cleaned of undefined/null values, removed if empty
 *
 * The backend Joi validation expects:
 * - Objects: either a valid object OR the field absent (NOT null)
 * - Arrays: either a valid array OR the field absent (NOT null)
 * - Strings: can be null or valid string
 * - Numbers: must be valid numbers (NOT strings)
 * - Dates: must be ISO format OR null
 */
function transformMedicalRecordToBackend(record) {
  if (!record) return null;

  // Helper: convert empty string to undefined (for removal)
  const emptyToUndefined = (val) => {
    if (val === '' || val === null || val === undefined) return undefined;
    return val;
  };

  // === VITAL SIGNS (numbers only - no strings allowed) ===
  let vitalSigns = undefined;
  if (record.vitalSigns) {
    const vs = record.vitalSigns;

    // Blood pressure nested object
    const systolic = toInteger(vs.bloodPressure?.systolic);
    const diastolic = toInteger(vs.bloodPressure?.diastolic);
    const bloodPressure = (systolic !== undefined || diastolic !== undefined)
      ? { systolic, diastolic }
      : undefined;

    // Build vital signs - only include defined values
    const vsData = {};
    const weight = toNumber(vs.weight);
    const height = toNumber(vs.height);
    const bmi = toNumber(vs.bmi);
    const heartRate = toInteger(vs.heartRate);
    const temperature = toNumber(vs.temperature);
    const respiratoryRate = toInteger(vs.respiratoryRate);
    const oxygenSaturation = toNumber(vs.oxygenSaturation);

    if (weight !== undefined) vsData.weight = weight;
    if (height !== undefined) vsData.height = height;
    if (bmi !== undefined) vsData.bmi = bmi;
    if (bloodPressure !== undefined) vsData.blood_pressure = cleanObject(bloodPressure);
    if (heartRate !== undefined) vsData.heart_rate = heartRate;
    if (temperature !== undefined) vsData.temperature = temperature;
    if (respiratoryRate !== undefined) vsData.respiratory_rate = respiratoryRate;
    if (oxygenSaturation !== undefined) vsData.oxygen_saturation = oxygenSaturation;

    const bloodGlucose = toNumber(vs.bloodGlucose);
    if (bloodGlucose !== undefined) vsData.blood_glucose = bloodGlucose;

    if (vs.treatmentId) vsData.treatment_id = vs.treatmentId;
    if (vs.treatmentName) vsData.treatment_name = vs.treatmentName;
    if (vs.observations) vsData.observations = vs.observations;

    // Additional readings (per-treatment vitals)
    if (Array.isArray(vs.additionalReadings) && vs.additionalReadings.length > 0) {
      vsData.additional_readings = vs.additionalReadings.map(r => {
        const reading = {};
        if (r.timestamp) reading.timestamp = r.timestamp;
        if (r.treatmentId) reading.treatment_id = r.treatmentId;
        if (r.treatmentName) reading.treatment_name = r.treatmentName;
        const rSystolic = toInteger(r.bloodPressure?.systolic);
        const rDiastolic = toInteger(r.bloodPressure?.diastolic);
        if (rSystolic !== undefined || rDiastolic !== undefined) {
          reading.blood_pressure = { systolic: rSystolic, diastolic: rDiastolic };
        }
        const rHr = toInteger(r.heartRate);
        if (rHr !== undefined) reading.heart_rate = rHr;
        const rTemp = toNumber(r.temperature);
        if (rTemp !== undefined) reading.temperature = rTemp;
        const rSpo2 = toNumber(r.oxygenSaturation);
        if (rSpo2 !== undefined) reading.oxygen_saturation = rSpo2;
        const rGlucose = toNumber(r.bloodGlucose);
        if (rGlucose !== undefined) reading.blood_glucose = rGlucose;
        if (r.observations) reading.observations = r.observations;
        return reading;
      });
    }

    // Only include vital_signs if it has at least one value
    if (Object.keys(vsData).length > 0) {
      vitalSigns = vsData;
    }
  }

  // === ALLERGIES (with date field) ===
  let allergies = undefined;
  if (Array.isArray(record.allergies) && record.allergies.length > 0) {
    const cleanedAllergies = record.allergies
      .filter(a => a && a.allergen && a.allergen.trim())
      .map(a => {
        const item = { allergen: a.allergen };
        if (a.type && a.type.trim()) item.type = a.type;
        if (a.severity && a.severity.trim()) item.severity = a.severity;
        if (a.reaction && a.reaction.trim()) item.reaction = a.reaction;
        const dateDiscovered = toDateOrNull(a.dateDiscovered || a.date_discovered);
        if (dateDiscovered) item.date_discovered = dateDiscovered;
        return item;
      });
    if (cleanedAllergies.length > 0) {
      allergies = cleanedAllergies;
    }
  }

  // === DIAGNOSIS ===
  let diagnosis = undefined;
  if (record.diagnosis) {
    const d = record.diagnosis;
    const diagData = {};

    // Primary - keep even if empty string (backend allows it)
    if (d.primary && d.primary.trim()) {
      diagData.primary = d.primary;
    }

    // Secondary - filter empty strings
    if (Array.isArray(d.secondary)) {
      const filtered = d.secondary.filter(s => s && s.trim());
      if (filtered.length > 0) diagData.secondary = filtered;
    }

    // ICD10 - filter empty strings
    if (Array.isArray(d.icd10)) {
      const filtered = d.icd10.filter(c => c && c.trim());
      if (filtered.length > 0) diagData.icd10 = filtered;
    }

    if (Object.keys(diagData).length > 0) {
      diagnosis = diagData;
    }
  }

  // === CHRONIC CONDITIONS (with date field) ===
  let chronicConditions = undefined;
  if (Array.isArray(record.chronicConditions) && record.chronicConditions.length > 0) {
    const cleaned = record.chronicConditions
      .filter(c => c && c.condition && c.condition.trim())
      .map(c => {
        const item = { condition: c.condition };
        const diagDate = toDateOrNull(c.diagnosisDate || c.diagnosis_date);
        if (diagDate) item.diagnosis_date = diagDate;
        if (c.practitioner && c.practitioner.trim()) item.practitioner = c.practitioner;
        if (c.status && c.status.trim()) item.status = c.status;
        if (c.notes && c.notes.trim()) item.notes = c.notes;
        return item;
      });
    if (cleaned.length > 0) {
      chronicConditions = cleaned;
    }
  }

  // === TREATMENTS (with date fields) ===
  let treatments = undefined;
  if (Array.isArray(record.treatments) && record.treatments.length > 0) {
    const cleaned = record.treatments
      .filter(t => t && t.medication && t.medication.trim())
      .map(t => {
        const item = { medication: t.medication };
        if (t.dosage && t.dosage.trim()) item.dosage = t.dosage;
        if (t.frequency && t.frequency.trim()) item.frequency = t.frequency;
        if (t.route && t.route.trim()) item.route = t.route;
        const startDate = toDateOrNull(t.startDate || t.start_date);
        if (startDate) item.start_date = startDate;
        const endDate = toDateOrNull(t.endDate || t.end_date);
        if (endDate) item.end_date = endDate;
        if (t.status && t.status.trim()) item.status = t.status;
        const prescribedBy = t.prescribedBy || t.prescribed_by;
        if (prescribedBy && prescribedBy.trim()) item.prescribed_by = prescribedBy;
        if (t.notes && t.notes.trim()) item.notes = t.notes;
        if (t.catalogItemId) item.catalog_item_id = t.catalogItemId;
        if (t.catalogItemType) item.catalog_item_type = t.catalogItemType;
        if (t.origin) item.origin = t.origin;
        if (t.appointmentItemId) item.appointment_item_id = t.appointmentItemId;
        if (t.originalMedication) item.original_medication = t.originalMedication;
        return item;
      });
    if (cleaned.length > 0) {
      treatments = cleaned;
    }
  }

  // === TREATMENT PLAN (with date field) ===
  let treatmentPlan = undefined;
  if (record.treatmentPlan) {
    const tp = record.treatmentPlan;
    const tpData = {};

    // Recommendations - filter empty strings
    if (Array.isArray(tp.recommendations)) {
      const filtered = tp.recommendations.filter(r => r && r.trim());
      if (filtered.length > 0) tpData.recommendations = filtered;
    }

    // Follow up date - convert empty to null (backend accepts null for dates)
    const followUp = toDateOrNull(tp.followUp || tp.follow_up);
    if (followUp) tpData.follow_up = followUp;

    // Tests - filter empty strings
    if (Array.isArray(tp.tests)) {
      const filtered = tp.tests.filter(t => t && t.trim());
      if (filtered.length > 0) tpData.tests = filtered;
    }

    if (Object.keys(tpData).length > 0) {
      treatmentPlan = tpData;
    }
  }

  // === CURRENT MEDICATIONS (with date field) ===
  let currentMedications = undefined;
  if (Array.isArray(record.currentMedications) && record.currentMedications.length > 0) {
    const cleaned = record.currentMedications
      .filter(m => m && m.medication && m.medication.trim())
      .map(m => {
        const item = { medication: m.medication };
        if (m.dosage && m.dosage.trim()) item.dosage = m.dosage;
        if (m.frequency && m.frequency.trim()) item.frequency = m.frequency;
        const startDate = toDateOrNull(m.startDate || m.start_date);
        if (startDate) item.start_date = startDate;
        const prescribedBy = m.prescribedBy || m.prescribed_by;
        if (prescribedBy && prescribedBy.trim()) item.prescribed_by = prescribedBy;
        if (m.notes && m.notes.trim()) item.notes = m.notes;
        return item;
      });
    if (cleaned.length > 0) {
      currentMedications = cleaned;
    }
  }

  // === PHYSICAL EXAM ===
  let physicalExam = undefined;
  if (record.physicalExam) {
    const pe = record.physicalExam;
    const peData = {};
    if (pe.general && pe.general.trim()) peData.general = pe.general;
    if (pe.cardiovascular && pe.cardiovascular.trim()) peData.cardiovascular = pe.cardiovascular;
    if (pe.respiratory && pe.respiratory.trim()) peData.respiratory = pe.respiratory;
    if (pe.abdomen && pe.abdomen.trim()) peData.abdomen = pe.abdomen;
    if (pe.neurological && pe.neurological.trim()) peData.neurological = pe.neurological;
    if (pe.other && pe.other.trim()) peData.other = pe.other;

    if (Object.keys(peData).length > 0) {
      physicalExam = peData;
    }
  }

  // === SYMPTOMS (array of strings) ===
  let symptoms = undefined;
  const rawSymptoms = record.symptoms || record.basicInfo?.symptoms;
  if (Array.isArray(rawSymptoms)) {
    const filtered = rawSymptoms.filter(s => s && s.trim());
    if (filtered.length > 0) {
      symptoms = filtered;
    }
  }

  // === ANTECEDENTS (pass as-is if not empty) ===
  let antecedents = undefined;
  if (record.antecedents && typeof record.antecedents === 'object') {
    // Check if antecedents has any meaningful content
    const hasContent = Object.keys(record.antecedents).some(key => {
      const val = record.antecedents[key];
      if (val === null || val === undefined || val === '') return false;
      if (typeof val === 'object' && Object.keys(val).length === 0) return false;
      return true;
    });
    if (hasContent) {
      antecedents = record.antecedents;
    }
  }

  // === BUILD FINAL OBJECT ===
  // Only include fields that have actual values (not undefined)
  const backendData = {
    record_type: record.type || record.recordType || 'consultation'
  };

  // patient_id only for creation (not allowed on updates)
  if (record.patientId) {
    backendData.patient_id = record.patientId;
  }

  // IDs (optional)
  if (record.facilityId) backendData.facility_id = record.facilityId;
  if (record.providerId || record.practitionerId) {
    backendData.provider_id = record.providerId || record.practitionerId;
  }

  // Date de consultation (éditable)
  const recordDate = toDateOrNull(record.recordDate);
  if (recordDate) {
    backendData.record_date = recordDate;
  }

  // Assistant optionnel (infirmière, aide-soignant, etc.)
  if (record.assistantProviderId) {
    backendData.assistant_provider_id = record.assistantProviderId;
  }

  // Basic info (strings - send if not empty)
  const chiefComplaint = record.chiefComplaint || record.basicInfo?.chiefComplaint;
  if (chiefComplaint && chiefComplaint.trim()) {
    backendData.chief_complaint = chiefComplaint;
  }

  const duration = record.duration || record.basicInfo?.duration;
  if (duration && duration.trim()) {
    backendData.duration = duration;
  }

  if (symptoms) backendData.symptoms = symptoms;

  // Complex objects/arrays - only include if defined
  if (vitalSigns) backendData.vital_signs = vitalSigns;
  if (antecedents) backendData.antecedents = antecedents;
  if (allergies) backendData.allergies = allergies;
  if (diagnosis) backendData.diagnosis = diagnosis;
  if (chronicConditions) backendData.chronic_conditions = chronicConditions;
  if (physicalExam) backendData.physical_exam = physicalExam;
  if (treatments) backendData.treatments = treatments;
  if (treatmentPlan) backendData.treatment_plan = treatmentPlan;
  if (currentMedications) backendData.current_medications = currentMedications;

  // Appointment link
  if (record.appointmentId) {
    backendData.appointment_id = record.appointmentId;
  }
  if (record.originalTreatments) {
    backendData.original_treatments = record.originalTreatments;
  }

  // Blood type
  if (record.bloodType && record.bloodType.trim()) {
    backendData.blood_type = record.bloodType;
  }

  // Current illness (free-text)
  if (record.currentIllness && record.currentIllness.trim()) {
    backendData.current_illness = record.currentIllness;
  }

  // Evolution notes (free-text)
  if (record.evolution && record.evolution.trim()) {
    backendData.evolution = record.evolution;
  }

  // Notes
  if (record.notes && record.notes.trim()) {
    backendData.notes = record.notes;
  }
  if (record.privateNotes && record.privateNotes.trim()) {
    backendData.private_notes = record.privateNotes;
  }

  return backendData;
}

/**
 * Transform list of medical records from backend
 */
function transformMedicalRecordListFromBackend(records) {
  if (!Array.isArray(records)) return [];
  return records.map(transformMedicalRecordFromBackend);
}

/**
 * ============================================================================
 * CONSENTS (Consentements RGPD et médicaux)
 * ============================================================================
 */

/**
 * Map frontend status to backend status
 * Frontend: granted/revoked → Backend: pending/accepted/rejected
 */
function mapConsentStatusToBackend(status) {
  const statusMap = {
    'granted': 'accepted',
    'revoked': 'rejected',
    'pending': 'pending'
  };
  return statusMap[status] || 'pending';
}

/**
 * Map backend status to frontend status
 * Backend: pending/accepted/rejected → Frontend: pending/granted/revoked
 */
function mapConsentStatusFromBackend(status) {
  const statusMap = {
    'accepted': 'granted',
    'rejected': 'revoked',
    'pending': 'pending'
  };
  return statusMap[status] || 'pending';
}

/**
 * Transform backend consent to frontend format
 * Backend: snake_case → Frontend: camelCase with specific field mappings
 */
function transformConsentFromBackend(consent) {
  if (!consent) return null;

  return {
    id: consent.id,
    patientId: consent.patient_id,
    appointmentId: consent.appointment_id,
    productServiceId: consent.product_service_id,
    consentTemplateId: consent.consent_template_id,

    // Type mapping
    type: consent.consent_type,
    consentType: consent.consent_type,

    // Content
    title: consent.title,
    description: consent.description,
    terms: consent.terms,
    purpose: consent.purpose || consent.description, // Use purpose if available, fallback to description

    // Status mapping
    status: mapConsentStatusFromBackend(consent.status),

    // Configuration
    isRequired: consent.is_required || consent.is_mandatory || false,

    // Signature info
    signedAt: consent.signed_at,
    collectionMethod: consent.signature_method || 'digital',
    signatureMethod: consent.signature_method,
    ipAddress: consent.ip_address,
    deviceInfo: consent.device_info || {},

    // Related documents
    relatedDocumentId: consent.related_document_id,

    // Expiration
    expiresAt: consent.expires_at || consent.valid_until || null,

    // Witness (for verbal consents)
    witness: consent.witness || { name: '', role: '', signature: '' },

    // Specific details (for medical-specific consents)
    specificDetails: consent.specific_details ? {
      procedure: consent.specific_details.procedure || '',
      risks: consent.specific_details.risks || '',
      alternatives: consent.specific_details.alternatives || '',
      expectedResults: consent.specific_details.expected_results || consent.specific_details.expectedResults || ''
    } : { procedure: '', risks: '', alternatives: '', expectedResults: '' },

    // Revocation
    revocationReason: consent.revocation_reason,

    // Audit trail compatibility
    auditTrail: consent.audit_trail || [{
      action: 'created',
      userId: consent.created_by,
      timestamp: consent.created_at,
      ipAddress: consent.ip_address
    }],

    // Timestamps
    createdAt: consent.created_at,
    updatedAt: consent.updated_at,
    createdBy: consent.created_by,
    revokedAt: consent.status === 'rejected' ? consent.updated_at : null
  };
}

/**
 * Transform frontend consent to backend format
 * Frontend: camelCase → Backend: snake_case
 */
function transformConsentToBackend(consent) {
  if (!consent) return null;

  // Backend Joi schema expects camelCase keys; onBeforeCreate converts to snake_case for DB
  const backendData = {
    // Relations
    patientId: consent.patientId,
    appointmentId: consent.appointmentId,
    productServiceId: consent.productServiceId,
    consentTemplateId: consent.consentTemplateId,

    // Type
    consentType: consent.type || consent.consentType || 'medical_treatment',

    // Content
    title: consent.title,
    description: consent.description,
    terms: consent.terms || consent.description || consent.title,

    // Multilingual support
    languageCode: consent.languageCode,
    templateVersion: consent.templateVersion,

    // Related document
    relatedDocumentId: consent.relatedDocumentId
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
 * Transform list of consents from backend
 */
function transformConsentListFromBackend(consents) {
  if (!Array.isArray(consents)) return [];
  return consents.map(transformConsentFromBackend);
}

/**
 * ============================================================================
 * CONSENT TEMPLATES (Modèles de consentements)
 * ============================================================================
 */

/**
 * Transform backend consent template to frontend format
 */
function transformConsentTemplateFromBackend(template) {
  if (!template) return null;

  // Extract metadata fields
  const metadata = template.metadata || {};

  return {
    id: template.id,
    code: template.code,
    title: template.title,
    description: template.description,
    content: template.terms, // Map terms to content for editor compatibility
    terms: template.terms,
    version: template.version,

    // Type and category
    consentType: template.consent_type,
    type: template.consent_type,
    category: template.consent_type, // Map for UI compatibility

    // Settings
    isMandatory: template.is_mandatory,
    isRequired: template.is_mandatory,
    autoSend: template.auto_send,

    // Validity period
    validFrom: template.valid_from,
    validUntil: template.valid_until,

    // Template lifecycle status (from backend or computed from validity)
    status: template.status || (template.valid_until && new Date(template.valid_until) < new Date() ? 'inactive' : 'active'),

    // Metadata fields (speciality, variables, tags, requiredFields)
    speciality: metadata.speciality || 'general',
    variables: metadata.variables || [],
    tags: metadata.tags || [],
    requiredFields: metadata.requiredFields || [],
    metadata: metadata,

    // Default language
    defaultLanguage: template.default_language || 'fr',

    // Usage stats (from backend or defaults)
    usage: template.usage || {
      timesUsed: 0,
      lastUsed: null,
      patientsCount: 0
    },

    // Audit trail
    auditTrail: template.audit_trail || [{
      action: 'created',
      userId: template.created_by,
      timestamp: template.created_at,
      version: template.version
    }],

    // Timestamps
    createdAt: template.created_at,
    updatedAt: template.updated_at,
    createdBy: template.created_by
  };
}

/**
 * Transform frontend consent template to backend format
 */
function transformConsentTemplateToBackend(template) {
  if (!template) return null;

  // Build metadata object from frontend fields
  const metadata = {
    speciality: template.speciality || template.metadata?.speciality,
    variables: template.variables || template.metadata?.variables || [],
    tags: template.tags || template.metadata?.tags || [],
    requiredFields: template.requiredFields || template.metadata?.requiredFields || []
  };

  const backendData = {
    code: template.code,
    title: template.title?.trim(),
    description: template.description,
    terms: template.content || template.terms, // Map content to terms
    version: template.version || '1.0',

    // Type - backend expects camelCase
    consentType: template.consentType || template.type || template.category || 'medical_treatment',

    // Settings - backend expects camelCase
    isMandatory: template.isMandatory || template.isRequired || false,
    autoSend: template.autoSend || false,

    // Validity - backend expects camelCase
    validFrom: template.validFrom || new Date().toISOString(),
    validUntil: template.validUntil,

    // Template lifecycle status
    status: template.status || 'draft',

    // Metadata (speciality, variables, tags, requiredFields)
    metadata: metadata
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
 * Transform list of consent templates from backend
 */
function transformConsentTemplateListFromBackend(templates) {
  if (!Array.isArray(templates)) return [];
  return templates.map(transformConsentTemplateFromBackend);
}

/**
 * ============================================================================
 * CONSENT SIGNING REQUESTS (Demandes de signature de consentement)
 * ============================================================================
 */

/**
 * Transform backend consent signing request to frontend format
 * Backend: snake_case → Frontend: camelCase
 */
function transformConsentSigningRequestFromBackend(request) {
  if (!request) return null;

  return {
    id: request.id,
    companyId: request.company_id,
    patientId: request.patient_id,
    consentTemplateId: request.consent_template_id,
    appointmentId: request.appointment_id,

    // Token and URL
    signingToken: request.signing_token,
    signingUrl: request.signingUrl, // May be added by backend

    // Status and dates
    status: request.status,
    expiresAt: request.expires_at,
    sentAt: request.sent_at,
    signedAt: request.signed_at,

    // Delivery info
    sentVia: request.sent_via,
    recipientEmail: request.recipient_email,
    recipientPhone: request.recipient_phone,
    languageCode: request.language_code,
    customMessage: request.custom_message,

    // Reminder tracking
    reminderCount: request.reminder_count,
    reminderSentAt: request.reminder_sent_at,

    // IP tracking
    ipAddressSent: request.ip_address_sent,
    ipAddressSigned: request.ip_address_signed,
    deviceInfoSigned: request.device_info_signed,

    // View tracking
    viewedAt: request.viewed_at,

    // Signed consent reference
    signedConsentId: request.signed_consent_id,

    // Audit
    createdBy: request.created_by,
    createdAt: request.created_at,
    updatedAt: request.updated_at,

    // Related objects (if included by backend)
    patient: request.patient ? {
      id: request.patient.id,
      firstName: request.patient.first_name || request.patient.firstName,
      lastName: request.patient.last_name || request.patient.lastName,
      email: request.patient.email
    } : null,

    template: request.template ? {
      id: request.template.id,
      title: request.template.title,
      consentType: request.template.consent_type || request.template.consentType
    } : null
  };
}

/**
 * Transform frontend consent signing request to backend format
 * Frontend: camelCase → Backend: camelCase (Joi validation)
 * Note: Backend Joi schema accepts camelCase
 */
function transformConsentSigningRequestToBackend(request) {
  if (!request) return null;

  return {
    patientId: request.patientId,
    consentTemplateId: request.consentTemplateId,
    appointmentId: request.appointmentId,
    sentVia: request.sentVia || 'email',
    recipientEmail: request.recipientEmail,
    recipientPhone: request.recipientPhone,
    languageCode: request.languageCode || 'fr',
    customMessage: request.customMessage,
    expiresInHours: request.expiresInHours || 48
  };
}

/**
 * Transform list of consent signing requests from backend
 */
function transformConsentSigningRequestListFromBackend(requests) {
  if (!Array.isArray(requests)) return [];
  return requests.map(transformConsentSigningRequestFromBackend);
}

/**
 * ============================================================================
 * USERS (Utilisateurs clinique - gestion administrative)
 * ============================================================================
 */

/**
 * Transform backend user to frontend format
 * Backend: snake_case → Frontend: camelCase
 */
function transformUserFromBackend(user) {
  if (!user) return null;

  const firstName = user.firstName || user.first_name || '';
  const lastName = user.lastName || user.last_name || '';

  return {
    id: user.id,
    email: user.email,
    firstName,
    lastName,
    name: user.name || `${firstName} ${lastName}`.trim(),
    phone: user.phone || '',
    role: user.role,
    administrativeRole: user.administrativeRole || user.administrative_role || '',
    department: user.department || '',
    speciality: user.speciality || '',
    licenseNumber: user.licenseNumber || user.license_number || null,
    permissions: user.permissions || {},
    isActive: user.isActive !== undefined ? user.isActive : user.is_active !== false,
    isEmailVerified: user.isEmailVerified || user.email_verified || false,
    lastLogin: user.lastLogin || user.last_login || null,
    createdAt: user.createdAt || user.created_at,
    updatedAt: user.updatedAt || user.updated_at
  };
}

/**
 * Transform frontend user to backend format
 * Frontend: camelCase → Backend: camelCase (Joi validation accepts camelCase)
 */
function transformUserToBackend(userData) {
  if (!userData) return null;

  const backendData = {};

  // Central user fields only (users table)
  // Note: phone, department, speciality, licenseNumber, administrativeRole
  // belong to healthcare_providers — use healthcareProvidersApi for those.
  if (userData.email !== undefined) backendData.email = userData.email;
  if (userData.password !== undefined) backendData.password = userData.password;
  if (userData.firstName !== undefined) backendData.firstName = userData.firstName;
  if (userData.lastName !== undefined) backendData.lastName = userData.lastName;
  if (userData.role !== undefined) backendData.role = userData.role;
  if (userData.permissions !== undefined) backendData.permissions = userData.permissions;
  if (userData.isActive !== undefined) backendData.isActive = userData.isActive;

  return backendData;
}

/**
 * Transform list of users from backend
 */
function transformUserListFromBackend(users) {
  if (!Array.isArray(users)) return [];
  return users.map(transformUserFromBackend);
}

/**
 * ============================================================================
 * TEAMS (Équipes)
 * ============================================================================
 */

/**
 * Transform backend team to frontend format
 */
function transformTeamFromBackend(team) {
  if (!team) return null;

  return {
    id: team.id,
    name: team.name,
    description: team.description,
    department: team.department,
    specialties: team.specialties || [],
    isActive: team.is_active,
    memberCount: team.member_count || 0,
    createdAt: team.created_at,
    updatedAt: team.updated_at
  };
}

/**
 * Transform frontend team to backend format
 */
function transformTeamToBackend(team) {
  if (!team) return null;

  return {
    name: team.name,
    description: team.description,
    department: team.department,
    specialties: team.specialties || [],
    is_active: team.isActive !== undefined ? team.isActive : true
  };
}

/**
 * Transform list of teams from backend
 */
function transformTeamListFromBackend(teams) {
  if (!Array.isArray(teams)) return [];
  return teams.map(transformTeamFromBackend);
}

export const dataTransform = {
  // Utility functions
  toNumber,
  toInteger,
  toDateOrNull,
  toStringOrNull,
  cleanObject,
  cleanArray,
  isEmpty,

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

  // Medical Records transformation
  transformMedicalRecordFromBackend,
  transformMedicalRecordToBackend,
  transformMedicalRecordListFromBackend,

  // Consent transformation
  transformConsentFromBackend,
  transformConsentToBackend,
  transformConsentListFromBackend,
  mapConsentStatusToBackend,
  mapConsentStatusFromBackend,

  // Consent Template transformation
  transformConsentTemplateFromBackend,
  transformConsentTemplateToBackend,
  transformConsentTemplateListFromBackend,

  // Consent Signing Request transformation
  transformConsentSigningRequestFromBackend,
  transformConsentSigningRequestToBackend,
  transformConsentSigningRequestListFromBackend,

  // User transformation
  transformUserFromBackend,
  transformUserToBackend,
  transformUserListFromBackend,

  // Team transformation
  transformTeamFromBackend,
  transformTeamToBackend,
  transformTeamListFromBackend,

  // Response handling
  unwrapResponse
};
