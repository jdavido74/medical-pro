// Phone utility functions for validation and formatting
import { countries, getCountryByCode, getPhonePrefix, getPhoneDigits } from '../data/countries';

/**
 * Phone validation rules by country
 * Each country has specific rules for local phone numbers (without prefix)
 */
export const phoneRules = {
  ES: {
    // Spain: 9 digits, starts with 6, 7, 8, or 9
    digits: 9,
    pattern: /^[6-9][0-9]{8}$/,
    example: '612 345 678',
    mobileStart: ['6', '7'],
    landlineStart: ['8', '9']
  },
  FR: {
    // France: 9 digits (without leading 0), starts with 1-9
    // Mobile: 6, 7 | Landline: 1-5, 8, 9
    digits: 9,
    pattern: /^[1-9][0-9]{8}$/,
    example: '6 12 34 56 78',
    mobileStart: ['6', '7'],
    landlineStart: ['1', '2', '3', '4', '5', '8', '9']
  },
  GB: {
    // UK: 10 digits, starts with 7 (mobile) or 1, 2, 3 (landline)
    digits: 10,
    pattern: /^[1-9][0-9]{9}$/,
    example: '7123 456 789',
    mobileStart: ['7'],
    landlineStart: ['1', '2', '3']
  },
  DE: {
    // Germany: 10-11 digits, flexible
    digits: 10,
    minDigits: 10,
    maxDigits: 11,
    pattern: /^[1-9][0-9]{9,10}$/,
    example: '151 1234 5678',
    mobileStart: ['15', '16', '17'],
    landlineStart: ['2', '3', '4', '5', '6', '7', '8', '9']
  },
  IT: {
    // Italy: 9-10 digits, mobile starts with 3
    digits: 10,
    minDigits: 9,
    maxDigits: 10,
    pattern: /^[0-9]{9,10}$/,
    example: '312 345 6789',
    mobileStart: ['3'],
    landlineStart: ['0']
  },
  PT: {
    // Portugal: 9 digits, mobile starts with 9
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '912 345 678',
    mobileStart: ['9'],
    landlineStart: ['2']
  },
  BE: {
    // Belgium: 9 digits
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '471 23 45 67',
    mobileStart: ['4'],
    landlineStart: ['2', '3', '5', '6', '7', '8', '9']
  },
  NL: {
    // Netherlands: 9 digits
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '612 345 678',
    mobileStart: ['6'],
    landlineStart: ['1', '2', '3', '4', '5', '7', '8', '9']
  },
  CH: {
    // Switzerland: 9 digits
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '79 123 45 67',
    mobileStart: ['7'],
    landlineStart: ['2', '3', '4', '5', '6', '8']
  },
  AT: {
    // Austria: 10-13 digits, flexible
    digits: 10,
    minDigits: 10,
    maxDigits: 13,
    pattern: /^[0-9]{10,13}$/,
    example: '664 123 4567',
    mobileStart: ['6'],
    landlineStart: ['1', '2', '3', '4', '5', '7']
  },
  IE: {
    // Ireland: 9 digits
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '85 123 4567',
    mobileStart: ['8'],
    landlineStart: ['1', '2', '4', '5', '6', '7', '9']
  },
  LU: {
    // Luxembourg: 8-9 digits
    digits: 9,
    minDigits: 8,
    maxDigits: 9,
    pattern: /^[0-9]{8,9}$/,
    example: '621 123 456',
    mobileStart: ['6'],
    landlineStart: ['2', '3', '4', '5']
  },
  DK: {
    // Denmark: 8 digits
    digits: 8,
    pattern: /^[0-9]{8}$/,
    example: '20 12 34 56',
    mobileStart: ['2', '3', '4', '5'],
    landlineStart: ['3', '4', '5', '6', '7', '8', '9']
  },
  SE: {
    // Sweden: 9 digits
    digits: 9,
    minDigits: 7,
    maxDigits: 9,
    pattern: /^[0-9]{7,9}$/,
    example: '70 123 45 67',
    mobileStart: ['7'],
    landlineStart: ['1', '2', '3', '4', '5', '6', '8', '9']
  },
  NO: {
    // Norway: 8 digits
    digits: 8,
    pattern: /^[0-9]{8}$/,
    example: '40 12 34 56',
    mobileStart: ['4', '9'],
    landlineStart: ['2', '3', '5', '6', '7']
  },
  FI: {
    // Finland: 9-10 digits
    digits: 9,
    minDigits: 9,
    maxDigits: 10,
    pattern: /^[0-9]{9,10}$/,
    example: '40 123 4567',
    mobileStart: ['4', '5'],
    landlineStart: ['1', '2', '3', '6', '7', '8', '9']
  },
  PL: {
    // Poland: 9 digits
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '512 345 678',
    mobileStart: ['5', '6', '7', '8'],
    landlineStart: ['1', '2', '3', '4', '9']
  },
  CZ: {
    // Czech Republic: 9 digits
    digits: 9,
    pattern: /^[0-9]{9}$/,
    example: '601 234 567',
    mobileStart: ['6', '7'],
    landlineStart: ['2', '3', '4', '5']
  },
  GR: {
    // Greece: 10 digits
    digits: 10,
    pattern: /^[0-9]{10}$/,
    example: '69 1234 5678',
    mobileStart: ['6'],
    landlineStart: ['2']
  },
  RO: {
    // Romania: 9 digits
    digits: 9,
    minDigits: 9,
    maxDigits: 10,
    pattern: /^[0-9]{9,10}$/,
    example: '721 234 567',
    mobileStart: ['7'],
    landlineStart: ['2', '3']
  }
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

  // Try to match country prefix
  for (const country of countries) {
    const prefix = country.phone;
    if (cleaned.startsWith(prefix)) {
      const localNumber = cleaned.substring(prefix.length);
      return {
        countryCode: country.code,
        prefix: prefix,
        localNumber: localNumber
      };
    }
    // Also check without + sign
    const prefixWithoutPlus = prefix.replace('+', '');
    if (cleaned.startsWith(prefixWithoutPlus) && !cleaned.startsWith('+')) {
      const localNumber = cleaned.substring(prefixWithoutPlus.length);
      return {
        countryCode: country.code,
        prefix: prefix,
        localNumber: localNumber
      };
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
