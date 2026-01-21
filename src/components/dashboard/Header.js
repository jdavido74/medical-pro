// components/dashboard/Header.js
import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Globe } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import NotificationCenter from '../notifications/NotificationCenter';
import { useLocale } from '../../contexts/LocaleContext';
import { getActiveLocales } from '../../config/locales';

const Header = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const { locale, flag, nativeName, formatDate, changeLocale } = useLocale();
  const [showLocaleSelector, setShowLocaleSelector] = useState(false);
  const availableLocales = getActiveLocales();

  // Déduire le module actuel depuis l'URL (en ignorant le préfixe locale)
  const activeModule = useMemo(() => {
    const path = location.pathname;
    // Remove locale prefix if present (e.g., /fr-FR/dashboard -> /dashboard)
    const pathWithoutLocale = path.replace(/^\/[a-z]{2}-[A-Z]{2}/, '');

    if (pathWithoutLocale === '/dashboard' || pathWithoutLocale === '/home' || pathWithoutLocale === '') return 'home';
    if (pathWithoutLocale.startsWith('/patients')) return 'patients';
    if (pathWithoutLocale.startsWith('/appointments')) return 'appointments';
    if (pathWithoutLocale.startsWith('/medical-records')) return 'medical-records';
    if (pathWithoutLocale.startsWith('/consents')) return 'consents';
    if (pathWithoutLocale.startsWith('/consent-templates')) return 'consent-templates';
    if (pathWithoutLocale.startsWith('/quotes')) return 'quotes';
    if (pathWithoutLocale.startsWith('/invoices')) return 'invoices';
    if (pathWithoutLocale.startsWith('/analytics')) return 'analytics';
    if (pathWithoutLocale.startsWith('/admin')) return 'admin';
    if (pathWithoutLocale.startsWith('/settings')) return 'settings';
    return 'home';
  }, [location.pathname]);

  const getModuleTitle = (module) => {
    const modules = {
      home: t('modules.home.title'),
      patients: t('modules.patients.title'),
      appointments: t('modules.appointments.title'),
      'medical-records': t('modules.medicalRecords.title'),
      consents: t('modules.consents.title'),
      'consent-templates': t('modules.consentTemplates.title'),
      quotes: t('modules.quotes.title'),
      invoices: t('modules.invoices.title'),
      analytics: t('modules.analytics.title'),
      admin: t('admin.title'),
      settings: t('modules.settings.title')
    };
    return modules[module] || t('common.dashboard');
  };

  const getModuleDescription = (module) => {
    const descriptions = {
      home: t('modules.home.description'),
      patients: t('modules.patients.description'),
      appointments: t('modules.appointments.description'),
      'medical-records': t('modules.medicalRecords.description'),
      consents: t('modules.consents.description'),
      'consent-templates': t('modules.consentTemplates.description'),
      quotes: t('modules.quotes.description'),
      invoices: t('modules.invoices.description'),
      analytics: t('modules.analytics.description'),
      admin: t('admin.description'),
      settings: t('modules.settings.description')
    };
    return descriptions[module] || '';
  };

  const getProviderText = (provider) => {
    switch (provider) {
      case 'google':
        return 'Google Business';
      case 'microsoft':
        return 'Microsoft';
      case 'classic':
        return 'Email';
      default:
        return 'Email';
    }
  };

  return (
    <header className="bg-white shadow-sm border-b px-6 py-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-6">
          {/* Informations du module */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {getModuleTitle(activeModule)}
            </h2>
            <div className="flex items-center space-x-4 mt-1">
              <p className="text-sm text-gray-600">
                {getModuleDescription(activeModule)}
              </p>
              {user?.provider && user.provider !== 'demo' && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                  {t('nav.header.connectedVia')} {getProviderText(user.provider)}
                </span>
              )}
              {user?.isDemo && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                  {t('nav.header.demoMode')}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Sélecteur de langue */}
          <div className="relative">
            <button
              onClick={() => setShowLocaleSelector(!showLocaleSelector)}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title={t('common.changeLanguage', 'Changer de langue')}
            >
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">{flag}</span>
              <span className="hidden md:inline">{nativeName}</span>
            </button>

            {showLocaleSelector && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowLocaleSelector(false)}
                />
                {/* Dropdown */}
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-20">
                  <div className="py-1">
                    {availableLocales.map((loc) => (
                      <button
                        key={loc.code}
                        onClick={() => {
                          changeLocale(loc.code);
                          setShowLocaleSelector(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm flex items-center space-x-3 hover:bg-gray-100 ${
                          locale === loc.code ? 'bg-green-50 text-green-700' : 'text-gray-700'
                        }`}
                      >
                        <span className="text-lg">{loc.flag}</span>
                        <span>{loc.nativeName}</span>
                        {locale === loc.code && (
                          <span className="ml-auto text-green-600">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Centre de notifications */}
          <NotificationCenter />

          {/* Date actuelle (formatée selon la locale) */}
          <div className="text-sm text-gray-600 hidden md:block">
            {formatDate(new Date(), { includeTime: false })}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;