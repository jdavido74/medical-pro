import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { detectRegion, getRegionLanguage } from './utils/regionDetector';
import { detectPreferredLocale, getLocaleConfig, LOCALE_CONFIG } from './config/locales';

// Import French translations
import frCommon from './locales/fr/common.json';
import frAuth from './locales/fr/auth.json';
import frNav from './locales/fr/nav.json';
import frHome from './locales/fr/home.json';
import frPublic from './locales/fr/public.json';
import frDashboard from './locales/fr/dashboard.json';
import frPatients from './locales/fr/patients.json';
import frAppointments from './locales/fr/appointments.json';
import frMedical from './locales/fr/medical.json';
import frConsents from './locales/fr/consents.json';
import frInvoices from './locales/fr/invoices.json';
import frAnalytics from './locales/fr/analytics.json';
import frAdmin from './locales/fr/admin.json';
import frOnboarding from './locales/fr/onboarding.json';

// Import English translations
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enNav from './locales/en/nav.json';
import enHome from './locales/en/home.json';
import enPublic from './locales/en/public.json';
import enDashboard from './locales/en/dashboard.json';
import enPatients from './locales/en/patients.json';
import enAppointments from './locales/en/appointments.json';
import enMedical from './locales/en/medical.json';
import enConsents from './locales/en/consents.json';
import enInvoices from './locales/en/invoices.json';
import enAnalytics from './locales/en/analytics.json';
import enAdmin from './locales/en/admin.json';
import enOnboarding from './locales/en/onboarding.json';

// Import Spanish translations
import esCommon from './locales/es/common.json';
import esAuth from './locales/es/auth.json';
import esNav from './locales/es/nav.json';
import esHome from './locales/es/home.json';
import esPublic from './locales/es/public.json';
import esDashboard from './locales/es/dashboard.json';
import esPatients from './locales/es/patients.json';
import esAppointments from './locales/es/appointments.json';
import esMedical from './locales/es/medical.json';
import esConsents from './locales/es/consents.json';
import esInvoices from './locales/es/invoices.json';
import esAnalytics from './locales/es/analytics.json';
import esAdmin from './locales/es/admin.json';
import esOnboarding from './locales/es/onboarding.json';

/**
 * Detect language from URL locale first, then fall back to region detection
 * Priority:
 * 1. URL locale (e.g., /fr-FR/dashboard -> 'fr')
 * 2. Stored preference
 * 3. Browser language
 * 4. Default (fr)
 */
function detectInitialLanguage() {
  // Try to get locale from URL path
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname;
    const localeMatch = pathname.match(/^\/(fr-FR|es-ES|en-GB|en-US)/);
    if (localeMatch) {
      const urlLocale = localeMatch[1];
      const config = LOCALE_CONFIG[urlLocale];
      if (config) {
        return config.language;
      }
    }
  }

  // Fall back to preferred locale detection
  const preferredLocale = detectPreferredLocale();
  const localeConfig = getLocaleConfig(preferredLocale);
  return localeConfig.language;
}

// Detect region (for backward compatibility) and language
const region = detectRegion();
const defaultLanguage = detectInitialLanguage();

// Configure i18next
i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: {
        common: frCommon,
        auth: frAuth,
        nav: frNav,
        home: frHome,
        public: frPublic,
        dashboard: frDashboard,
        patients: frPatients,
        appointments: frAppointments,
        medical: frMedical,
        consents: frConsents,
        invoices: frInvoices,
        analytics: frAnalytics,
        admin: frAdmin,
        onboarding: frOnboarding
      },
      en: {
        common: enCommon,
        auth: enAuth,
        nav: enNav,
        home: enHome,
        public: enPublic,
        dashboard: enDashboard,
        patients: enPatients,
        appointments: enAppointments,
        medical: enMedical,
        consents: enConsents,
        invoices: enInvoices,
        analytics: enAnalytics,
        admin: enAdmin,
        onboarding: enOnboarding
      },
      es: {
        common: esCommon,
        auth: esAuth,
        nav: esNav,
        home: esHome,
        public: esPublic,
        dashboard: esDashboard,
        patients: esPatients,
        appointments: esAppointments,
        medical: esMedical,
        consents: esConsents,
        invoices: esInvoices,
        analytics: esAnalytics,
        admin: esAdmin,
        onboarding: esOnboarding
      }
    },
    lng: defaultLanguage,
    fallbackLng: 'fr', // French as fallback for missing translations
    defaultNS: 'common',
    ns: ['common', 'auth', 'nav', 'home', 'public', 'dashboard', 'patients', 'appointments', 'medical', 'consents', 'invoices', 'analytics', 'admin', 'onboarding'],

    interpolation: {
      escapeValue: false // React already escapes values
    },

    react: {
      useSuspense: false
    }
  });

export default i18n;
export { region, defaultLanguage };
