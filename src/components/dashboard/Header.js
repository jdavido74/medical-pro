// components/dashboard/Header.js
import React from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import NotificationCenter from '../notifications/NotificationCenter';

const Header = ({ activeModule }) => {
  const { user } = useAuth();
  const { t } = useTranslation();


  const getModuleTitle = (module) => {
    const modules = {
      home: t('modules.home.title'),
      patients: t('modules.patients.title'),
      appointments: t('modules.appointments.title'),
      'medical-records': t('modules.medicalRecords.title'),
      consents: t('modules.consents.title'),
      'consent-templates': t('modules.consentTemplates.title'),
      analytics: t('modules.analytics.title'),
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
      analytics: t('modules.analytics.description'),
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
          {/* Centre de notifications */}
          <NotificationCenter />
          
          {/* Date actuelle */}
          <div className="text-sm text-gray-600 hidden md:block">
            {new Date().toLocaleDateString('fr-FR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;