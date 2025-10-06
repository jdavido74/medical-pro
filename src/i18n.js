import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import French translations
import frCommon from './locales/fr/common.json';
import frAuth from './locales/fr/auth.json';
import frNav from './locales/fr/nav.json';
import frHome from './locales/fr/home.json';
import frPatients from './locales/fr/patients.json';
import frAppointments from './locales/fr/appointments.json';
import frMedical from './locales/fr/medical.json';
import frConsents from './locales/fr/consents.json';
import frInvoices from './locales/fr/invoices.json';
import frAnalytics from './locales/fr/analytics.json';
import frAdmin from './locales/fr/admin.json';

// Import English translations
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enNav from './locales/en/nav.json';
import enHome from './locales/en/home.json';
import enPatients from './locales/en/patients.json';
import enAppointments from './locales/en/appointments.json';
import enMedical from './locales/en/medical.json';
import enConsents from './locales/en/consents.json';
import enInvoices from './locales/en/invoices.json';
import enAnalytics from './locales/en/analytics.json';
import enAdmin from './locales/en/admin.json';

// Import Spanish translations
import esCommon from './locales/es/common.json';
import esAuth from './locales/es/auth.json';
import esNav from './locales/es/nav.json';
import esHome from './locales/es/home.json';
import esPatients from './locales/es/patients.json';
import esAppointments from './locales/es/appointments.json';
import esMedical from './locales/es/medical.json';
import esConsents from './locales/es/consents.json';
import esInvoices from './locales/es/invoices.json';
import esAnalytics from './locales/es/analytics.json';
import esAdmin from './locales/es/admin.json';

const LANGUAGE_STORAGE_KEY = 'clinicmanager_language';

// Configure i18next
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: {
        common: frCommon,
        auth: frAuth,
        nav: frNav,
        home: frHome,
        patients: frPatients,
        appointments: frAppointments,
        medical: frMedical,
        consents: frConsents,
        invoices: frInvoices,
        analytics: frAnalytics,
        admin: frAdmin
      },
      en: {
        common: enCommon,
        auth: enAuth,
        nav: enNav,
        home: enHome,
        patients: enPatients,
        appointments: enAppointments,
        medical: enMedical,
        consents: enConsents,
        invoices: enInvoices,
        analytics: enAnalytics,
        admin: enAdmin
      },
      es: {
        common: esCommon,
        auth: esAuth,
        nav: esNav,
        home: esHome,
        patients: esPatients,
        appointments: esAppointments,
        medical: esMedical,
        consents: esConsents,
        invoices: esInvoices,
        analytics: esAnalytics,
        admin: esAdmin
      }
    },
    fallbackLng: 'fr',
    defaultNS: 'common',
    ns: ['common', 'auth', 'nav', 'home', 'patients', 'appointments', 'medical', 'consents', 'invoices', 'analytics', 'admin'],

    interpolation: {
      escapeValue: false // React already escapes values
    },

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY
    },

    react: {
      useSuspense: false
    }
  });

export default i18n;
