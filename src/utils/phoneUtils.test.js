// phoneUtils.test.js - Unit tests for phone utilities
import {
  phoneRules,
  getPhoneRules,
  cleanPhoneNumber,
  removeLeadingZero,
  validatePhoneForCountry,
  formatPhoneDisplay,
  buildFullPhoneNumber,
  parseFullPhoneNumber,
  validateFullPhoneNumber,
  getPhonePlaceholder,
  isMobilePhone,
  countries,
  getCountryByCode,
  getPhonePrefix,
  getPhoneDigits
} from './phoneUtils';

describe('phoneUtils', () => {
  // =========================================
  // cleanPhoneNumber
  // =========================================
  describe('cleanPhoneNumber', () => {
    it('should remove all non-digit characters', () => {
      expect(cleanPhoneNumber('06 12 34 56 78')).toBe('0612345678');
      expect(cleanPhoneNumber('+33 6 12 34 56 78')).toBe('33612345678');
      expect(cleanPhoneNumber('(612) 345-678')).toBe('612345678');
      expect(cleanPhoneNumber('+34-612.345.678')).toBe('34612345678');
    });

    it('should handle empty or null values', () => {
      expect(cleanPhoneNumber('')).toBe('');
      expect(cleanPhoneNumber(null)).toBe('');
      expect(cleanPhoneNumber(undefined)).toBe('');
    });

    it('should handle already clean numbers', () => {
      expect(cleanPhoneNumber('612345678')).toBe('612345678');
    });
  });

  // =========================================
  // removeLeadingZero
  // =========================================
  describe('removeLeadingZero', () => {
    it('should remove leading zero from French-style numbers', () => {
      expect(removeLeadingZero('0612345678')).toBe('612345678');
      expect(removeLeadingZero('06 12 34 56 78')).toBe('612345678');
    });

    it('should not modify numbers without leading zero', () => {
      expect(removeLeadingZero('612345678')).toBe('612345678');
      expect(removeLeadingZero('712345678')).toBe('712345678');
    });

    it('should handle empty values', () => {
      expect(removeLeadingZero('')).toBe('');
      expect(removeLeadingZero(null)).toBe('');
    });
  });

  // =========================================
  // getPhoneRules
  // =========================================
  describe('getPhoneRules', () => {
    it('should return rules for France', () => {
      const rules = getPhoneRules('FR');
      expect(rules.digits).toBe(9);
      expect(rules.example).toBe('6 12 34 56 78');
    });

    it('should return rules for Spain', () => {
      const rules = getPhoneRules('ES');
      expect(rules.digits).toBe(9);
      expect(rules.pattern).toBeInstanceOf(RegExp);
    });

    it('should return rules for Germany', () => {
      const rules = getPhoneRules('DE');
      expect(rules.digits).toBe(10);
      expect(rules.minDigits).toBe(10);
      expect(rules.maxDigits).toBe(11);
    });

    it('should return rules for Denmark (8 digits)', () => {
      const rules = getPhoneRules('DK');
      expect(rules.digits).toBe(8);
    });

    it('should return default rules for unknown country', () => {
      const rules = getPhoneRules('XX');
      expect(rules.digits).toBe(9);
      expect(rules.minDigits).toBe(8);
      expect(rules.maxDigits).toBe(15);
    });
  });

  // =========================================
  // validatePhoneForCountry
  // =========================================
  describe('validatePhoneForCountry', () => {
    describe('France (FR)', () => {
      it('should validate correct French mobile numbers', () => {
        expect(validatePhoneForCountry('612345678', 'FR').isValid).toBe(true);
        expect(validatePhoneForCountry('712345678', 'FR').isValid).toBe(true);
        expect(validatePhoneForCountry('6 12 34 56 78', 'FR').isValid).toBe(true);
      });

      it('should validate French numbers with leading zero', () => {
        // Leading zero is stripped for international format
        expect(validatePhoneForCountry('0612345678', 'FR').isValid).toBe(true);
      });

      it('should reject too short French numbers', () => {
        const result = validatePhoneForCountry('61234567', 'FR');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('too_short');
      });

      it('should reject too long French numbers', () => {
        const result = validatePhoneForCountry('6123456789', 'FR');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('too_long');
      });
    });

    describe('Spain (ES)', () => {
      it('should validate correct Spanish mobile numbers', () => {
        expect(validatePhoneForCountry('612345678', 'ES').isValid).toBe(true);
        expect(validatePhoneForCountry('712345678', 'ES').isValid).toBe(true);
      });

      it('should validate Spanish landline numbers', () => {
        expect(validatePhoneForCountry('912345678', 'ES').isValid).toBe(true);
        expect(validatePhoneForCountry('812345678', 'ES').isValid).toBe(true);
      });

      it('should reject numbers starting with invalid digits', () => {
        // 0 is stripped as leading zero, so 012345678 becomes 12345678 (8 digits = too short)
        const result = validatePhoneForCountry('012345678', 'ES');
        expect(result.isValid).toBe(false);
        // After stripping leading zero, we have 8 digits instead of 9
        expect(result.error).toBe('too_short');
      });

      it('should reject 9-digit numbers with invalid first digit', () => {
        // Use 512345678 which starts with 5 (invalid for Spain)
        const result = validatePhoneForCountry('512345678', 'ES');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('invalid_format');
      });
    });

    describe('Germany (DE)', () => {
      it('should validate 10-digit German numbers', () => {
        expect(validatePhoneForCountry('1511234567', 'DE').isValid).toBe(true);
      });

      it('should validate 11-digit German numbers', () => {
        expect(validatePhoneForCountry('15112345678', 'DE').isValid).toBe(true);
      });

      it('should reject 9-digit German numbers', () => {
        const result = validatePhoneForCountry('151123456', 'DE');
        expect(result.isValid).toBe(false);
      });
    });

    describe('United Kingdom (GB)', () => {
      it('should validate correct UK mobile numbers', () => {
        expect(validatePhoneForCountry('7123456789', 'GB').isValid).toBe(true);
      });

      it('should reject 9-digit UK numbers', () => {
        const result = validatePhoneForCountry('712345678', 'GB');
        expect(result.isValid).toBe(false);
      });
    });

    describe('Denmark (DK) - 8 digits', () => {
      it('should validate correct Danish numbers', () => {
        expect(validatePhoneForCountry('20123456', 'DK').isValid).toBe(true);
      });

      it('should reject 9-digit Danish numbers', () => {
        const result = validatePhoneForCountry('201234567', 'DK');
        expect(result.isValid).toBe(false);
      });
    });

    describe('Edge cases', () => {
      it('should reject empty phone number', () => {
        const result = validatePhoneForCountry('', 'FR');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('phone_required');
      });

      it('should reject null phone number', () => {
        const result = validatePhoneForCountry(null, 'FR');
        expect(result.isValid).toBe(false);
      });
    });
  });

  // =========================================
  // formatPhoneDisplay
  // =========================================
  describe('formatPhoneDisplay', () => {
    it('should format French numbers', () => {
      expect(formatPhoneDisplay('612345678', 'FR')).toBe('6 12 34 56 78');
    });

    it('should format Spanish numbers', () => {
      expect(formatPhoneDisplay('612345678', 'ES')).toBe('612 345 678');
    });

    it('should format UK numbers', () => {
      expect(formatPhoneDisplay('7123456789', 'GB')).toBe('7123 456 789');
    });

    it('should format German numbers', () => {
      expect(formatPhoneDisplay('1511234567', 'DE')).toBe('151 1234 567');
    });

    it('should handle empty values', () => {
      expect(formatPhoneDisplay('', 'FR')).toBe('');
    });

    it('should use generic format for unknown countries', () => {
      const result = formatPhoneDisplay('123456789', 'XX');
      expect(result).toBe('123 456 789');
    });
  });

  // =========================================
  // buildFullPhoneNumber
  // =========================================
  describe('buildFullPhoneNumber', () => {
    it('should build French number with +33 prefix', () => {
      expect(buildFullPhoneNumber('612345678', 'FR')).toBe('+33612345678');
    });

    it('should build Spanish number with +34 prefix', () => {
      expect(buildFullPhoneNumber('612345678', 'ES')).toBe('+34612345678');
    });

    it('should build UK number with +44 prefix', () => {
      expect(buildFullPhoneNumber('7123456789', 'GB')).toBe('+447123456789');
    });

    it('should strip leading zero before adding prefix', () => {
      expect(buildFullPhoneNumber('0612345678', 'FR')).toBe('+33612345678');
    });

    it('should handle empty values', () => {
      expect(buildFullPhoneNumber('', 'FR')).toBe('');
    });

    it('should work with formatted numbers', () => {
      expect(buildFullPhoneNumber('6 12 34 56 78', 'FR')).toBe('+33612345678');
    });
  });

  // =========================================
  // parseFullPhoneNumber
  // =========================================
  describe('parseFullPhoneNumber', () => {
    it('should parse French number', () => {
      const result = parseFullPhoneNumber('+33612345678');
      expect(result.countryCode).toBe('FR');
      expect(result.prefix).toBe('+33');
      expect(result.localNumber).toBe('612345678');
    });

    it('should parse Spanish number', () => {
      const result = parseFullPhoneNumber('+34612345678');
      expect(result.countryCode).toBe('ES');
      expect(result.prefix).toBe('+34');
      expect(result.localNumber).toBe('612345678');
    });

    it('should parse UK number', () => {
      const result = parseFullPhoneNumber('+447123456789');
      expect(result.countryCode).toBe('GB');
      expect(result.prefix).toBe('+44');
      expect(result.localNumber).toBe('7123456789');
    });

    it('should parse Portuguese number with +351', () => {
      const result = parseFullPhoneNumber('+351912345678');
      expect(result.countryCode).toBe('PT');
      expect(result.prefix).toBe('+351');
      expect(result.localNumber).toBe('912345678');
    });

    it('should handle numbers without + sign', () => {
      const result = parseFullPhoneNumber('33612345678');
      expect(result.countryCode).toBe('FR');
      expect(result.localNumber).toBe('612345678');
    });

    it('should handle formatted numbers', () => {
      const result = parseFullPhoneNumber('+33 6 12 34 56 78');
      expect(result.countryCode).toBe('FR');
      expect(result.localNumber).toBe('612345678');
    });

    it('should return null for unknown prefix', () => {
      const result = parseFullPhoneNumber('+99612345678');
      expect(result.countryCode).toBeNull();
      expect(result.prefix).toBeNull();
    });

    it('should handle empty values', () => {
      const result = parseFullPhoneNumber('');
      expect(result.countryCode).toBeNull();
    });
  });

  // =========================================
  // validateFullPhoneNumber
  // =========================================
  describe('validateFullPhoneNumber', () => {
    it('should validate complete French number', () => {
      const result = validateFullPhoneNumber('+33612345678');
      expect(result.isValid).toBe(true);
    });

    it('should validate complete Spanish number', () => {
      const result = validateFullPhoneNumber('+34612345678');
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid French number', () => {
      const result = validateFullPhoneNumber('+33612');
      expect(result.isValid).toBe(false);
    });

    it('should reject unknown prefix', () => {
      const result = validateFullPhoneNumber('+99612345678');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('unknown_prefix');
    });

    it('should reject empty number', () => {
      const result = validateFullPhoneNumber('');
      expect(result.isValid).toBe(false);
    });
  });

  // =========================================
  // getPhonePlaceholder
  // =========================================
  describe('getPhonePlaceholder', () => {
    it('should return French placeholder', () => {
      expect(getPhonePlaceholder('FR')).toBe('6 12 34 56 78');
    });

    it('should return Spanish placeholder', () => {
      expect(getPhonePlaceholder('ES')).toBe('612 345 678');
    });

    it('should return default placeholder for unknown country', () => {
      expect(getPhonePlaceholder('XX')).toBe('123 456 789');
    });
  });

  // =========================================
  // isMobilePhone
  // =========================================
  describe('isMobilePhone', () => {
    describe('France', () => {
      it('should identify mobile numbers (starting with 6 or 7)', () => {
        expect(isMobilePhone('612345678', 'FR')).toBe(true);
        expect(isMobilePhone('712345678', 'FR')).toBe(true);
      });

      it('should identify landline numbers', () => {
        expect(isMobilePhone('112345678', 'FR')).toBe(false);
        expect(isMobilePhone('212345678', 'FR')).toBe(false);
      });
    });

    describe('Spain', () => {
      it('should identify mobile numbers (starting with 6 or 7)', () => {
        expect(isMobilePhone('612345678', 'ES')).toBe(true);
        expect(isMobilePhone('712345678', 'ES')).toBe(true);
      });

      it('should identify landline numbers', () => {
        expect(isMobilePhone('912345678', 'ES')).toBe(false);
        expect(isMobilePhone('812345678', 'ES')).toBe(false);
      });
    });

    describe('UK', () => {
      it('should identify mobile numbers (starting with 7)', () => {
        expect(isMobilePhone('7123456789', 'GB')).toBe(true);
      });

      it('should identify landline numbers', () => {
        expect(isMobilePhone('2012345678', 'GB')).toBe(false);
      });
    });

    it('should return null for empty input', () => {
      expect(isMobilePhone('', 'FR')).toBeNull();
    });
  });

  // =========================================
  // Country helpers (re-exported)
  // =========================================
  describe('Country helpers', () => {
    describe('countries', () => {
      it('should have France', () => {
        const france = countries.find(c => c.code === 'FR');
        expect(france).toBeDefined();
        expect(france.phone).toBe('+33');
        expect(france.digits).toBe(9);
      });

      it('should have Spain', () => {
        const spain = countries.find(c => c.code === 'ES');
        expect(spain).toBeDefined();
        expect(spain.phone).toBe('+34');
      });

      it('should have at least 20 countries', () => {
        expect(countries.length).toBeGreaterThanOrEqual(20);
      });
    });

    describe('getCountryByCode', () => {
      it('should return France for FR', () => {
        const france = getCountryByCode('FR');
        expect(france.name).toBe('France');
        expect(france.flag).toBe('🇫🇷');
      });

      it('should return undefined for unknown code', () => {
        expect(getCountryByCode('XX')).toBeUndefined();
      });
    });

    describe('getPhonePrefix', () => {
      it('should return +33 for France', () => {
        expect(getPhonePrefix('FR')).toBe('+33');
      });

      it('should return +34 for Spain', () => {
        expect(getPhonePrefix('ES')).toBe('+34');
      });

      it('should return + for unknown country', () => {
        expect(getPhonePrefix('XX')).toBe('+');
      });
    });

    describe('getPhoneDigits', () => {
      it('should return 9 for France', () => {
        expect(getPhoneDigits('FR')).toBe(9);
      });

      it('should return 10 for UK', () => {
        expect(getPhoneDigits('GB')).toBe(10);
      });

      it('should return 8 for Denmark', () => {
        expect(getPhoneDigits('DK')).toBe(8);
      });

      it('should return null for unknown country', () => {
        expect(getPhoneDigits('XX')).toBeNull();
      });
    });
  });

  // =========================================
  // Real-world test cases
  // =========================================
  describe('Real-world scenarios', () => {
    it('should handle typical French mobile signup', () => {
      const input = '06 12 34 56 78';
      const cleaned = removeLeadingZero(input);
      const validation = validatePhoneForCountry(cleaned, 'FR');
      const fullNumber = buildFullPhoneNumber(input, 'FR');

      expect(validation.isValid).toBe(true);
      expect(fullNumber).toBe('+33612345678');
    });

    it('should handle typical Spanish mobile signup', () => {
      const input = '612 345 678';
      const validation = validatePhoneForCountry(input, 'ES');
      const fullNumber = buildFullPhoneNumber(input, 'ES');

      expect(validation.isValid).toBe(true);
      expect(fullNumber).toBe('+34612345678');
    });

    it('should roundtrip: build and parse', () => {
      const localNumber = '612345678';
      const country = 'FR';

      const full = buildFullPhoneNumber(localNumber, country);
      const parsed = parseFullPhoneNumber(full);

      expect(parsed.countryCode).toBe(country);
      expect(parsed.localNumber).toBe(localNumber);
    });

    it('should display formatted number correctly', () => {
      const fullNumber = '+33612345678';
      const parsed = parseFullPhoneNumber(fullNumber);
      const formatted = formatPhoneDisplay(parsed.localNumber, parsed.countryCode);

      expect(formatted).toBe('6 12 34 56 78');
    });
  });
});
