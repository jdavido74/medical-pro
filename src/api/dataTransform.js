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
 * Backend: { id, company_id, first_name, last_name, email, phone, date_of_birth, ... }
 * Frontend: { id, firstName, lastName, contact: { email, phone }, dateOfBirth, ... }
 */
function transformPatientFromBackend(patient) {
  if (!patient) return null;

  return {
    // Basic info
    id: patient.id,
    firstName: patient.first_name,
    lastName: patient.last_name,
    dateOfBirth: patient.date_of_birth,
    gender: patient.gender,
    patientNumber: patient.patient_number,

    // Contact info (nested)
    contact: {
      email: patient.email,
      phone: patient.phone,
      address: patient.address || {},
      city: patient.city,
      postalCode: patient.postal_code,
      country: patient.country
    },

    // Medical info
    medicalHistory: patient.medical_history || {},
    allergies: patient.allergies || [],
    currentMedications: patient.current_medications || [],
    socialSecurityNumber: patient.social_security_number,

    // Status
    status: patient.status || 'active',
    isIncomplete: patient.is_incomplete || false,

    // Timestamps
    createdAt: patient.created_at,
    updatedAt: patient.updated_at,
    deletedAt: patient.deleted_at,

    // Company
    companyId: patient.company_id
  };
}

/**
 * Transform frontend patient data to backend format for API
 */
function transformPatientToBackend(patient) {
  if (!patient) return null;

  return {
    // Basic info
    first_name: patient.firstName,
    last_name: patient.lastName,
    date_of_birth: patient.dateOfBirth,
    gender: patient.gender,
    patient_number: patient.patientNumber,

    // Contact info (flattened)
    email: patient.contact?.email,
    phone: patient.contact?.phone,
    address: patient.contact?.address,
    city: patient.contact?.city,
    postal_code: patient.contact?.postalCode,
    country: patient.contact?.country,

    // Medical info
    medical_history: patient.medicalHistory || {},
    allergies: Array.isArray(patient.allergies) ? patient.allergies : [],
    current_medications: Array.isArray(patient.currentMedications) ? patient.currentMedications : [],
    social_security_number: patient.socialSecurityNumber,

    // Status
    status: patient.status || 'active',
    is_incomplete: patient.isIncomplete || false
  };
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

  // Response handling
  unwrapResponse
};
