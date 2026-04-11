// Phone utility functions for validation and formatting
import { countries, getCountryByCode, getPhonePrefix, getPhoneDigits } from '../data/countries';

/**
 * Phone validation rules by country
 * Each country has specific rules for local phone numbers (without prefix)
 */
export const phoneRules = {
  // — Primary markets —
  ES: {
    digits: 9,
    pattern: /^[6-9][0-9]{8}$/,
    example: '612 345 678',
    mobileStart: ['6', '7'],
    landlineStart: ['8', '9']
  },
  FR: {
    digits: 9,
    pattern: /^[1-9][0-9]{8}$/,
    example: '6 12 34 56 78',
    mobileStart: ['6', '7'],
    landlineStart: ['1', '2', '3', '4', '5', '8', '9']
  },

  // — Western Europe —
  AD: {
    digits: 6,
    minDigits: 6,
    maxDigits: 9,
    pattern: /^[0-9]{6,9}$/,
    example: '312 345'
  },
  AT: {
    digits: 10,
    minDigits: 10,
    maxDigits: 13,
    pattern: /^[0-9]{10,13}$/,
    example: '664 123 4567',
    mobileStart: ['6'],
    landlineStart: ['1', '2', '3', '4', '5', '7']
  },
  BE: {
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '471 23 45 67',
    mobileStart: ['4'],
    landlineStart: ['2', '3', '5', '6', '7', '8', '9']
  },
  CH: {
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '79 123 45 67',
    mobileStart: ['7'],
    landlineStart: ['2', '3', '4', '5', '6', '8']
  },
  DE: {
    digits: 10,
    minDigits: 10,
    maxDigits: 11,
    pattern: /^[1-9][0-9]{9,10}$/,
    example: '151 1234 5678',
    mobileStart: ['15', '16', '17'],
    landlineStart: ['2', '3', '4', '5', '6', '7', '8', '9']
  },
  GB: {
    digits: 10,
    pattern: /^[1-9][0-9]{9}$/,
    example: '7123 456 789',
    mobileStart: ['7'],
    landlineStart: ['1', '2', '3']
  },
  IE: {
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '85 123 4567',
    mobileStart: ['8'],
    landlineStart: ['1', '2', '4', '5', '6', '7', '9']
  },
  IT: {
    digits: 10,
    minDigits: 9,
    maxDigits: 10,
    pattern: /^[0-9]{9,10}$/,
    example: '312 345 6789',
    mobileStart: ['3'],
    landlineStart: ['0']
  },
  LU: {
    digits: 9,
    minDigits: 8,
    maxDigits: 9,
    pattern: /^[0-9]{8,9}$/,
    example: '621 123 456',
    mobileStart: ['6'],
    landlineStart: ['2', '3', '4', '5']
  },
  MC: {
    digits: 8,
    minDigits: 8,
    maxDigits: 9,
    pattern: /^[0-9]{8,9}$/,
    example: '6 12 34 56 7'
  },
  NL: {
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '612 345 678',
    mobileStart: ['6'],
    landlineStart: ['1', '2', '3', '4', '5', '7', '8', '9']
  },
  PT: {
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '912 345 678',
    mobileStart: ['9'],
    landlineStart: ['2']
  },

  // — Northern Europe —
  DK: {
    digits: 8,
    pattern: /^[0-9]{8}$/,
    example: '20 12 34 56',
    mobileStart: ['2', '3', '4', '5'],
    landlineStart: ['3', '4', '5', '6', '7', '8', '9']
  },
  EE: {
    digits: 8,
    minDigits: 7,
    maxDigits: 8,
    pattern: /^[0-9]{7,8}$/,
    example: '5123 4567',
    mobileStart: ['5'],
    landlineStart: ['3', '4', '6', '7']
  },
  FI: {
    digits: 9,
    minDigits: 9,
    maxDigits: 10,
    pattern: /^[0-9]{9,10}$/,
    example: '40 123 4567',
    mobileStart: ['4', '5'],
    landlineStart: ['1', '2', '3', '6', '7', '8', '9']
  },
  IS: {
    digits: 7,
    pattern: /^[0-9]{7}$/,
    example: '611 1234'
  },
  LT: {
    digits: 8,
    pattern: /^[0-9]{8}$/,
    example: '6123 4567',
    mobileStart: ['6'],
    landlineStart: ['3', '4', '5']
  },
  LV: {
    digits: 8,
    pattern: /^[0-9]{8}$/,
    example: '2123 4567',
    mobileStart: ['2'],
    landlineStart: ['6', '7']
  },
  NO: {
    digits: 8,
    pattern: /^[0-9]{8}$/,
    example: '40 12 34 56',
    mobileStart: ['4', '9'],
    landlineStart: ['2', '3', '5', '6', '7']
  },
  SE: {
    digits: 9,
    minDigits: 7,
    maxDigits: 9,
    pattern: /^[0-9]{7,9}$/,
    example: '70 123 45 67',
    mobileStart: ['7'],
    landlineStart: ['1', '2', '3', '4', '5', '6', '8', '9']
  },

  // — Central & Eastern Europe —
  AL: {
    digits: 9,
    minDigits: 8,
    maxDigits: 9,
    pattern: /^[0-9]{8,9}$/,
    example: '66 123 4567'
  },
  BA: {
    digits: 8,
    minDigits: 8,
    maxDigits: 9,
    pattern: /^[0-9]{8,9}$/,
    example: '61 234 567'
  },
  BG: {
    digits: 9,
    minDigits: 8,
    maxDigits: 9,
    pattern: /^[0-9]{8,9}$/,
    example: '87 123 4567',
    mobileStart: ['8', '9'],
    landlineStart: ['2', '3', '4', '5', '6', '7']
  },
  BY: {
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '29 123 45 67'
  },
  CZ: {
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '601 234 567',
    mobileStart: ['6', '7'],
    landlineStart: ['2', '3', '4', '5']
  },
  GE: {
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '555 12 34 56'
  },
  HR: {
    digits: 9,
    minDigits: 8,
    maxDigits: 9,
    pattern: /^[0-9]{8,9}$/,
    example: '91 234 5678',
    mobileStart: ['9'],
    landlineStart: ['1', '2', '3', '4', '5']
  },
  HU: {
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '20 123 4567',
    mobileStart: ['20', '30', '31', '50', '70'],
    landlineStart: ['1', '2', '3', '4', '5', '6', '7', '8', '9']
  },
  MD: {
    digits: 8,
    pattern: /^[0-9]{8}$/,
    example: '6912 3456'
  },
  ME: {
    digits: 8,
    minDigits: 8,
    maxDigits: 9,
    pattern: /^[0-9]{8,9}$/,
    example: '67 123 456'
  },
  MK: {
    digits: 8,
    pattern: /^[0-9]{8}$/,
    example: '7012 3456'
  },
  PL: {
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '512 345 678',
    mobileStart: ['5', '6', '7', '8'],
    landlineStart: ['1', '2', '3', '4', '9']
  },
  RO: {
    digits: 9,
    minDigits: 9,
    maxDigits: 10,
    pattern: /^[0-9]{9,10}$/,
    example: '721 234 567',
    mobileStart: ['7'],
    landlineStart: ['2', '3']
  },
  RS: {
    digits: 9,
    minDigits: 8,
    maxDigits: 9,
    pattern: /^[0-9]{8,9}$/,
    example: '60 123 4567'
  },
  RU: {
    digits: 10,
    pattern: /^[0-9]{10}$/,
    example: '912 345 6789',
    mobileStart: ['9'],
    landlineStart: ['3', '4', '8']
  },
  SI: {
    digits: 8,
    pattern: /^[0-9]{8}$/,
    example: '31 234 567',
    mobileStart: ['3', '4', '5'],
    landlineStart: ['1', '2', '7']
  },
  SK: {
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '901 234 567',
    mobileStart: ['9'],
    landlineStart: ['2', '3', '4', '5']
  },
  UA: {
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '50 123 4567',
    mobileStart: ['5', '6', '7', '9'],
    landlineStart: ['3', '4']
  },
  XK: {
    digits: 8,
    pattern: /^[0-9]{8}$/,
    example: '44 123 456'
  },

  // — Southern Europe / Mediterranean —
  CY: {
    digits: 8,
    pattern: /^[0-9]{8}$/,
    example: '96 123 456',
    mobileStart: ['9'],
    landlineStart: ['2']
  },
  GR: {
    digits: 10,
    pattern: /^[0-9]{10}$/,
    example: '69 1234 5678',
    mobileStart: ['6'],
    landlineStart: ['2']
  },
  MT: {
    digits: 8,
    pattern: /^[0-9]{8}$/,
    example: '7912 3456',
    mobileStart: ['7', '9'],
    landlineStart: ['2']
  },
  TR: {
    digits: 10,
    pattern: /^[0-9]{10}$/,
    example: '532 123 4567',
    mobileStart: ['5'],
    landlineStart: ['2', '3', '4']
  },

  // — North Africa / Maghreb —
  DZ: {
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '551 23 45 67',
    mobileStart: ['5', '6', '7'],
    landlineStart: ['2', '3', '4']
  },
  EG: {
    digits: 10,
    pattern: /^[0-9]{10}$/,
    example: '10 1234 5678',
    mobileStart: ['10', '11', '12', '15']
  },
  LY: {
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '91 234 5678'
  },
  MA: {
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '612 345 678',
    mobileStart: ['6', '7'],
    landlineStart: ['5']
  },
  TN: {
    digits: 8,
    pattern: /^[0-9]{8}$/,
    example: '20 123 456',
    mobileStart: ['2', '5', '9'],
    landlineStart: ['7']
  },

  // — Sub-Saharan Africa —
  CI: {
    digits: 10,
    pattern: /^[0-9]{10}$/,
    example: '01 23 45 67 89'
  },
  CM: {
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '6 71 23 45 67',
    mobileStart: ['6'],
    landlineStart: ['2', '3']
  },
  CD: {
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '81 234 5678'
  },
  GH: {
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '24 123 4567',
    mobileStart: ['2', '5'],
    landlineStart: ['3']
  },
  GN: {
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '622 12 34 56'
  },
  KE: {
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '712 345 678',
    mobileStart: ['7', '1'],
    landlineStart: ['2', '4']
  },
  ML: {
    digits: 8,
    pattern: /^[0-9]{8}$/,
    example: '6312 3456'
  },
  NG: {
    digits: 10,
    pattern: /^[0-9]{10}$/,
    example: '802 345 6789',
    mobileStart: ['7', '8', '9'],
    landlineStart: ['1', '2']
  },
  SN: {
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '77 123 45 67',
    mobileStart: ['7'],
    landlineStart: ['3']
  },
  ZA: {
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '71 234 5678',
    mobileStart: ['6', '7', '8'],
    landlineStart: ['1', '2', '3', '4', '5']
  },

  // — Middle East —
  AE: {
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '50 123 4567',
    mobileStart: ['5'],
    landlineStart: ['2', '3', '4', '6', '7']
  },
  IL: {
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '50 123 4567',
    mobileStart: ['5'],
    landlineStart: ['2', '3', '4', '8', '9']
  },
  JO: {
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '79 123 4567',
    mobileStart: ['7'],
    landlineStart: ['2', '3', '4', '5', '6']
  },
  LB: {
    digits: 8,
    minDigits: 7,
    maxDigits: 8,
    pattern: /^[0-9]{7,8}$/,
    example: '71 123 456',
    mobileStart: ['3', '7'],
    landlineStart: ['1', '4', '5', '6', '8', '9']
  },
  SA: {
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '51 234 5678',
    mobileStart: ['5'],
    landlineStart: ['1']
  },

  // — Asia —
  BD: {
    digits: 10,
    pattern: /^[0-9]{10}$/,
    example: '1712 345 678',
    mobileStart: ['1']
  },
  CN: {
    digits: 11,
    pattern: /^1[0-9]{10}$/,
    example: '138 1234 5678',
    mobileStart: ['1']
  },
  ID: {
    digits: 10,
    minDigits: 9,
    maxDigits: 12,
    pattern: /^[0-9]{9,12}$/,
    example: '812 345 6789',
    mobileStart: ['8'],
    landlineStart: ['2', '3', '4', '5', '6', '7']
  },
  IN: {
    digits: 10,
    pattern: /^[6-9][0-9]{9}$/,
    example: '98765 43210',
    mobileStart: ['6', '7', '8', '9']
  },
  JP: {
    digits: 10,
    minDigits: 9,
    maxDigits: 10,
    pattern: /^[0-9]{9,10}$/,
    example: '90 1234 5678',
    mobileStart: ['7', '8', '9'],
    landlineStart: ['1', '2', '3', '4', '5', '6']
  },
  KR: {
    digits: 10,
    minDigits: 9,
    maxDigits: 10,
    pattern: /^[0-9]{9,10}$/,
    example: '10 1234 5678',
    mobileStart: ['1'],
    landlineStart: ['2', '3', '4', '5', '6']
  },
  MY: {
    digits: 10,
    minDigits: 9,
    maxDigits: 10,
    pattern: /^[0-9]{9,10}$/,
    example: '12 345 6789',
    mobileStart: ['1'],
    landlineStart: ['3', '4', '5', '6', '7', '8', '9']
  },
  PH: {
    digits: 10,
    pattern: /^[0-9]{10}$/,
    example: '917 123 4567',
    mobileStart: ['9']
  },
  PK: {
    digits: 10,
    pattern: /^[0-9]{10}$/,
    example: '300 123 4567',
    mobileStart: ['3']
  },
  SG: {
    digits: 8,
    pattern: /^[0-9]{8}$/,
    example: '9123 4567',
    mobileStart: ['8', '9'],
    landlineStart: ['3', '6']
  },
  TH: {
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '81 234 5678',
    mobileStart: ['6', '8', '9'],
    landlineStart: ['2', '3', '4', '5', '7']
  },
  VN: {
    digits: 9,
    minDigits: 9,
    maxDigits: 10,
    pattern: /^[0-9]{9,10}$/,
    example: '91 234 56 78',
    mobileStart: ['3', '5', '7', '8', '9']
  },

  // — North America —
  US: {
    digits: 10,
    pattern: /^[2-9][0-9]{9}$/,
    example: '212 555 1234',
    mobileStart: ['2', '3', '4', '5', '6', '7', '8', '9'],
    landlineStart: ['2', '3', '4', '5', '6', '7', '8', '9']
  },
  CA: {
    digits: 10,
    pattern: /^[2-9][0-9]{9}$/,
    example: '416 555 1234',
    mobileStart: ['2', '3', '4', '5', '6', '7', '8', '9'],
    landlineStart: ['2', '3', '4', '5', '6', '7', '8', '9']
  },
  MX: {
    digits: 10,
    pattern: /^[0-9]{10}$/,
    example: '55 1234 5678',
    mobileStart: ['1', '2', '3', '4', '5', '6', '7', '8', '9']
  },

  // — Central America & Caribbean —
  CR: {
    digits: 8,
    pattern: /^[0-9]{8}$/,
    example: '8312 3456'
  },
  CU: {
    digits: 8,
    pattern: /^[0-9]{8}$/,
    example: '5123 4567',
    mobileStart: ['5']
  },
  DO: {
    digits: 10,
    pattern: /^[2-9][0-9]{9}$/,
    example: '809 555 1234'
  },
  GT: {
    digits: 8,
    pattern: /^[0-9]{8}$/,
    example: '5123 4567'
  },
  HN: {
    digits: 8,
    pattern: /^[0-9]{8}$/,
    example: '9412 3456'
  },
  NI: {
    digits: 8,
    pattern: /^[0-9]{8}$/,
    example: '8123 4567'
  },
  PA: {
    digits: 8,
    pattern: /^[0-9]{8}$/,
    example: '6123 4567'
  },
  SV: {
    digits: 8,
    pattern: /^[0-9]{8}$/,
    example: '7123 4567'
  },

  // — South America —
  AR: {
    digits: 10,
    pattern: /^[0-9]{10}$/,
    example: '11 2345 6789',
    mobileStart: ['1', '2', '3']
  },
  BO: {
    digits: 8,
    pattern: /^[0-9]{8}$/,
    example: '7123 4567'
  },
  BR: {
    digits: 11,
    minDigits: 10,
    maxDigits: 11,
    pattern: /^[0-9]{10,11}$/,
    example: '11 91234 5678',
    mobileStart: ['1', '2', '3', '4', '5', '6', '7', '8', '9']
  },
  CL: {
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '9 1234 5678',
    mobileStart: ['9']
  },
  CO: {
    digits: 10,
    pattern: /^[0-9]{10}$/,
    example: '312 345 6789',
    mobileStart: ['3']
  },
  EC: {
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '99 123 4567',
    mobileStart: ['9']
  },
  PE: {
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '912 345 678',
    mobileStart: ['9']
  },
  PY: {
    digits: 9,
    minDigits: 8,
    maxDigits: 9,
    pattern: /^[0-9]{8,9}$/,
    example: '981 234 567'
  },
  UY: {
    digits: 8,
    pattern: /^[0-9]{8}$/,
    example: '91 234 567',
    mobileStart: ['9']
  },
  VE: {
    digits: 10,
    pattern: /^[0-9]{10}$/,
    example: '412 345 6789',
    mobileStart: ['4']
  },

  // — Oceania —
  AU: {
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '412 345 678',
    mobileStart: ['4'],
    landlineStart: ['2', '3', '7', '8']
  },
  NZ: {
    digits: 9,
    minDigits: 8,
    maxDigits: 9,
    pattern: /^[0-9]{8,9}$/,
    example: '21 234 5678',
    mobileStart: ['2'],
    landlineStart: ['3', '4', '6', '7', '9']
  },
};

/**
 * Default phone rules for countries not explicitly defined
 */
const defaultPhoneRules = {
  digits: 9,
  minDigits: 8,
  maxDigits: 15,
  pattern: /^[0-9]{8,15}$/,
  example: '123 456 789'
};

/**
 * Get phone rules for a country
 * @param {string} countryCode - ISO country code (e.g., 'FR', 'ES')
 * @returns {Object} Phone rules for the country
 */
export const getPhoneRules = (countryCode) => {
  return phoneRules[countryCode] || defaultPhoneRules;
};

/**
 * Clean phone number - remove all non-digit characters
 * @param {string} phone - Phone number to clean
 * @returns {string} Cleaned phone number (digits only)
 */
export const cleanPhoneNumber = (phone) => {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '');
};

/**
 * Remove leading zero from phone number if present
 * Many countries use leading 0 for local dialing but not in international format
 * @param {string} phone - Phone number
 * @returns {string} Phone number without leading zero
 */
export const removeLeadingZero = (phone) => {
  const cleaned = cleanPhoneNumber(phone);
  if (cleaned.startsWith('0')) {
    return cleaned.substring(1);
  }
  return cleaned;
};

/**
 * Validate phone number for a specific country
 * @param {string} phone - Phone number (without country prefix)
 * @param {string} countryCode - ISO country code
 * @returns {Object} Validation result with isValid, error message, and details
 */
export const validatePhoneForCountry = (phone, countryCode) => {
  if (!phone) {
    return { isValid: false, error: 'phone_required', message: 'Phone number is required' };
  }

  const cleaned = cleanPhoneNumber(phone);

  // Remove leading zero for validation (international format doesn't use it)
  const withoutLeadingZero = removeLeadingZero(phone);

  const rules = getPhoneRules(countryCode);
  const country = getCountryByCode(countryCode);
  const countryName = country?.name || countryCode;

  const minDigits = rules.minDigits || rules.digits;
  const maxDigits = rules.maxDigits || rules.digits;

  // Check length
  if (withoutLeadingZero.length < minDigits) {
    return {
      isValid: false,
      error: 'too_short',
      message: `Phone number too short for ${countryName} (minimum ${minDigits} digits)`,
      expected: minDigits,
      actual: withoutLeadingZero.length
    };
  }

  if (withoutLeadingZero.length > maxDigits) {
    return {
      isValid: false,
      error: 'too_long',
      message: `Phone number too long for ${countryName} (maximum ${maxDigits} digits)`,
      expected: maxDigits,
      actual: withoutLeadingZero.length
    };
  }

  // Check pattern if defined (using cleaned number without leading zero)
  if (rules.pattern && !rules.pattern.test(withoutLeadingZero)) {
    return {
      isValid: false,
      error: 'invalid_format',
      message: `Invalid phone format for ${countryName}`,
      example: rules.example
    };
  }

  return { isValid: true, cleaned: withoutLeadingZero };
};

/**
 * Format phone number for display
 * @param {string} phone - Phone number (digits only)
 * @param {string} countryCode - ISO country code
 * @returns {string} Formatted phone number
 */
export const formatPhoneDisplay = (phone, countryCode) => {
  const cleaned = cleanPhoneNumber(phone);
  if (!cleaned) return '';

  switch (countryCode) {
    case 'FR':
      // French format: X XX XX XX XX
      if (cleaned.length === 9) {
        return `${cleaned[0]} ${cleaned.slice(1, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7, 9)}`;
      }
      break;
    case 'ES':
      // Spanish format: XXX XXX XXX
      if (cleaned.length === 9) {
        return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)}`;
      }
      break;
    case 'GB':
      // UK format: XXXX XXX XXXX
      if (cleaned.length === 10) {
        return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 10)}`;
      }
      break;
    case 'DE':
      // German format: XXX XXXX XXXX
      if (cleaned.length >= 10) {
        return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 7)} ${cleaned.slice(7)}`;
      }
      break;
    case 'US':
    case 'CA':
      // NANP format: (XXX) XXX-XXXX
      if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
      }
      break;
    default:
      // Generic format: groups of 3
      return cleaned.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
  }

  // Fallback: groups of 3
  return cleaned.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
};

/**
 * Build full international phone number
 * @param {string} phone - Local phone number (without prefix)
 * @param {string} countryCode - ISO country code
 * @returns {string} Full international phone number with prefix
 */
export const buildFullPhoneNumber = (phone, countryCode) => {
  const cleaned = removeLeadingZero(phone);
  if (!cleaned) return '';

  const prefix = getPhonePrefix(countryCode);
  return `${prefix}${cleaned}`;
};

/**
 * Parse a full international phone number
 * @param {string} fullPhone - Full phone number with prefix
 * @returns {Object} Parsed result with countryCode, prefix, localNumber
 */
export const parseFullPhoneNumber = (fullPhone) => {
  if (!fullPhone) {
    return { countryCode: null, prefix: null, localNumber: '' };
  }

  const cleaned = fullPhone.replace(/[^0-9+]/g, '');

  // Sort countries by prefix length (longest first) to avoid partial matches
  // e.g. +351 (Portugal) must be checked before +35x, +593 (Ecuador) before +59
  const sortedCountries = [...countries].sort(
    (a, b) => b.phone.length - a.phone.length
  );

  // Try to match country prefix
  for (const country of sortedCountries) {
    const prefix = country.phone;
    if (cleaned.startsWith(prefix)) {
      const localNumber = cleaned.substring(prefix.length);
      return {
        countryCode: country.code,
        prefix: prefix,
        localNumber: localNumber
      };
    }
    // Also check without + sign, but only if the remaining digits
    // form a plausible local number (at least 6 digits) to avoid
    // false matches on short local numbers (e.g. "612345678" ≠ AU +61)
    const prefixWithoutPlus = prefix.replace('+', '');
    if (cleaned.startsWith(prefixWithoutPlus) && !cleaned.startsWith('+')) {
      const localNumber = cleaned.substring(prefixWithoutPlus.length);
      const rules = phoneRules[country.code];
      const minDigits = (rules && rules.minDigits) || country.digits || 7;
      if (localNumber.length >= minDigits) {
        return {
          countryCode: country.code,
          prefix: prefix,
          localNumber: localNumber
        };
      }
    }
  }

  // No matching prefix found
  return {
    countryCode: null,
    prefix: null,
    localNumber: cleaned.replace('+', '')
  };
};

/**
 * Validate a full international phone number
 * @param {string} fullPhone - Full phone number with prefix
 * @returns {Object} Validation result
 */
export const validateFullPhoneNumber = (fullPhone) => {
  if (!fullPhone) {
    return { isValid: false, error: 'phone_required' };
  }

  const parsed = parseFullPhoneNumber(fullPhone);

  if (!parsed.countryCode) {
    return { isValid: false, error: 'unknown_prefix', message: 'Unknown country prefix' };
  }

  return validatePhoneForCountry(parsed.localNumber, parsed.countryCode);
};

/**
 * Get placeholder example for a country
 * @param {string} countryCode - ISO country code
 * @returns {string} Example phone number
 */
export const getPhonePlaceholder = (countryCode) => {
  const rules = getPhoneRules(countryCode);
  return rules.example || '123 456 789';
};

/**
 * Check if phone number is mobile
 * @param {string} phone - Local phone number
 * @param {string} countryCode - ISO country code
 * @returns {boolean|null} True if mobile, false if landline, null if unknown
 */
export const isMobilePhone = (phone, countryCode) => {
  const cleaned = removeLeadingZero(phone);
  if (!cleaned) return null;

  const rules = getPhoneRules(countryCode);

  if (rules.mobileStart) {
    for (const prefix of rules.mobileStart) {
      if (cleaned.startsWith(prefix)) return true;
    }
  }

  if (rules.landlineStart) {
    for (const prefix of rules.landlineStart) {
      if (cleaned.startsWith(prefix)) return false;
    }
  }

  return null;
};

// Re-export from countries.js for convenience
export { countries, getCountryByCode, getPhonePrefix, getPhoneDigits };
