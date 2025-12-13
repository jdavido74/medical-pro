/**
 * Tests for locale configuration
 */

import {
  LOCALE_CONFIG,
  DEFAULT_LOCALE,
  ACTIVE_LOCALES,
  getLocaleConfig,
  isValidLocale,
  getActiveLocales,
  getLocaleByCountry,
  getLocaleByLanguage,
  detectPreferredLocale,
  savePreferredLocale
} from './locales';

describe('Locale Configuration', () => {
  describe('LOCALE_CONFIG', () => {
    it('should have fr-FR locale configured', () => {
      expect(LOCALE_CONFIG['fr-FR']).toBeDefined();
      expect(LOCALE_CONFIG['fr-FR'].country).toBe('FR');
      expect(LOCALE_CONFIG['fr-FR'].language).toBe('fr');
      expect(LOCALE_CONFIG['fr-FR'].currency).toBe('EUR');
    });

    it('should have es-ES locale configured', () => {
      expect(LOCALE_CONFIG['es-ES']).toBeDefined();
      expect(LOCALE_CONFIG['es-ES'].country).toBe('ES');
      expect(LOCALE_CONFIG['es-ES'].language).toBe('es');
      expect(LOCALE_CONFIG['es-ES'].currency).toBe('EUR');
    });

    it('should have en-GB locale configured', () => {
      expect(LOCALE_CONFIG['en-GB']).toBeDefined();
      expect(LOCALE_CONFIG['en-GB'].country).toBe('GB');
      expect(LOCALE_CONFIG['en-GB'].language).toBe('en');
      expect(LOCALE_CONFIG['en-GB'].currency).toBe('GBP');
    });

    it('should have all required fields for each locale', () => {
      const requiredFields = [
        'code', 'country', 'language', 'currency', 'currencySymbol',
        'dateFormat', 'timeFormat', 'phonePrefix', 'phoneDigits',
        'name', 'nativeName', 'flag', 'timezone'
      ];

      Object.values(LOCALE_CONFIG).forEach(config => {
        requiredFields.forEach(field => {
          expect(config[field]).toBeDefined();
        });
      });
    });
  });

  describe('DEFAULT_LOCALE', () => {
    it('should be fr-FR', () => {
      expect(DEFAULT_LOCALE).toBe('fr-FR');
    });
  });

  describe('ACTIVE_LOCALES', () => {
    it('should contain fr-FR, es-ES, and en-GB', () => {
      expect(ACTIVE_LOCALES).toContain('fr-FR');
      expect(ACTIVE_LOCALES).toContain('es-ES');
      expect(ACTIVE_LOCALES).toContain('en-GB');
    });
  });

  describe('getLocaleConfig', () => {
    it('should return correct config for valid locale', () => {
      const config = getLocaleConfig('fr-FR');
      expect(config.country).toBe('FR');
      expect(config.language).toBe('fr');
    });

    it('should return default config for invalid locale', () => {
      const config = getLocaleConfig('invalid');
      expect(config.country).toBe('FR'); // Default is fr-FR
    });

    it('should return default config for null', () => {
      const config = getLocaleConfig(null);
      expect(config.country).toBe('FR');
    });
  });

  describe('isValidLocale', () => {
    it('should return true for active locales', () => {
      expect(isValidLocale('fr-FR')).toBe(true);
      expect(isValidLocale('es-ES')).toBe(true);
      expect(isValidLocale('en-GB')).toBe(true);
    });

    it('should return false for inactive locales', () => {
      expect(isValidLocale('de-DE')).toBe(false);
      expect(isValidLocale('it-IT')).toBe(false);
    });

    it('should return false for invalid locales', () => {
      expect(isValidLocale('invalid')).toBe(false);
      expect(isValidLocale('')).toBe(false);
      expect(isValidLocale(null)).toBe(false);
    });
  });

  describe('getActiveLocales', () => {
    it('should return array of locale configs', () => {
      const locales = getActiveLocales();
      expect(Array.isArray(locales)).toBe(true);
      expect(locales.length).toBe(ACTIVE_LOCALES.length);
    });

    it('should include code in each config', () => {
      const locales = getActiveLocales();
      locales.forEach(locale => {
        expect(locale.code).toBeDefined();
        expect(ACTIVE_LOCALES).toContain(locale.code);
      });
    });
  });

  describe('getLocaleByCountry', () => {
    it('should return correct locale for FR', () => {
      expect(getLocaleByCountry('FR')).toBe('fr-FR');
    });

    it('should return correct locale for ES', () => {
      expect(getLocaleByCountry('ES')).toBe('es-ES');
    });

    it('should return correct locale for GB', () => {
      expect(getLocaleByCountry('GB')).toBe('en-GB');
    });

    it('should return default locale for unknown country', () => {
      expect(getLocaleByCountry('XX')).toBe(DEFAULT_LOCALE);
    });
  });

  describe('getLocaleByLanguage', () => {
    it('should return correct locale for fr', () => {
      expect(getLocaleByLanguage('fr')).toBe('fr-FR');
    });

    it('should return correct locale for es', () => {
      expect(getLocaleByLanguage('es')).toBe('es-ES');
    });

    it('should return correct locale for en', () => {
      // en-GB is active, not en-US
      expect(getLocaleByLanguage('en')).toBe('en-GB');
    });

    it('should return default locale for unknown language', () => {
      expect(getLocaleByLanguage('xx')).toBe(DEFAULT_LOCALE);
    });
  });

  describe('detectPreferredLocale', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('should return stored locale if valid', () => {
      localStorage.setItem('preferred_locale', 'es-ES');
      expect(detectPreferredLocale()).toBe('es-ES');
    });

    it('should ignore invalid stored locale', () => {
      localStorage.setItem('preferred_locale', 'invalid');
      // Should fall back to browser detection or default
      const result = detectPreferredLocale();
      expect(ACTIVE_LOCALES).toContain(result);
    });

    it('should return default if no preference stored', () => {
      const result = detectPreferredLocale();
      expect(ACTIVE_LOCALES).toContain(result);
    });
  });

  describe('savePreferredLocale', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('should save valid locale to localStorage', () => {
      savePreferredLocale('es-ES');
      expect(localStorage.getItem('preferred_locale')).toBe('es-ES');
    });

    it('should not save invalid locale', () => {
      savePreferredLocale('invalid');
      expect(localStorage.getItem('preferred_locale')).toBeNull();
    });
  });
});

describe('Locale Config Values', () => {
  describe('Phone configuration', () => {
    it('should have correct phone digits for France', () => {
      expect(LOCALE_CONFIG['fr-FR'].phoneDigits).toBe(9);
      expect(LOCALE_CONFIG['fr-FR'].phonePrefix).toBe('+33');
    });

    it('should have correct phone digits for Spain', () => {
      expect(LOCALE_CONFIG['es-ES'].phoneDigits).toBe(9);
      expect(LOCALE_CONFIG['es-ES'].phonePrefix).toBe('+34');
    });

    it('should have correct phone digits for UK', () => {
      expect(LOCALE_CONFIG['en-GB'].phoneDigits).toBe(10);
      expect(LOCALE_CONFIG['en-GB'].phonePrefix).toBe('+44');
    });
  });

  describe('Date format configuration', () => {
    it('should use DD/MM/YYYY for European locales', () => {
      expect(LOCALE_CONFIG['fr-FR'].dateFormat).toBe('DD/MM/YYYY');
      expect(LOCALE_CONFIG['es-ES'].dateFormat).toBe('DD/MM/YYYY');
      expect(LOCALE_CONFIG['en-GB'].dateFormat).toBe('DD/MM/YYYY');
    });

    it('should use MM/DD/YYYY for US locale', () => {
      expect(LOCALE_CONFIG['en-US'].dateFormat).toBe('MM/DD/YYYY');
    });
  });

  describe('Currency configuration', () => {
    it('should use EUR for Eurozone countries', () => {
      expect(LOCALE_CONFIG['fr-FR'].currency).toBe('EUR');
      expect(LOCALE_CONFIG['es-ES'].currency).toBe('EUR');
    });

    it('should use GBP for UK', () => {
      expect(LOCALE_CONFIG['en-GB'].currency).toBe('GBP');
    });

    it('should use USD for US', () => {
      expect(LOCALE_CONFIG['en-US'].currency).toBe('USD');
    });

    it('should use CHF for Switzerland', () => {
      expect(LOCALE_CONFIG['fr-CH'].currency).toBe('CHF');
    });
  });

  describe('Medical configuration', () => {
    it('should have healthcare system defined', () => {
      expect(LOCALE_CONFIG['fr-FR'].healthcareSystem).toBe('CPAM');
      expect(LOCALE_CONFIG['es-ES'].healthcareSystem).toBe('SNS');
      expect(LOCALE_CONFIG['en-GB'].healthcareSystem).toBe('NHS');
    });
  });
});
