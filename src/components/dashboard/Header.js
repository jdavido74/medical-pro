// components/dashboard/Header.js
import React, { useState, useEffect, useRef } from 'react';
import { Bell, ChevronDown, Users, Shield, UserCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import NotificationCenter from '../notifications/NotificationCenter';
import { loadPractitioners } from '../../utils/practitionersLoader';

const Header = ({ activeModule }) => {
  const { user, login } = useAuth();
  const { t } = useTranslation();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [testProfiles, setTestProfiles] = useState([]);
  const dropdownRef = useRef(null);

  // Charger les praticiens réels depuis localStorage
  useEffect(() => {
    const realPractitioners = loadPractitioners();

    // Créer les profils de test basés sur les praticiens réels
    const baseProfiles = [
      {
        id: 'super_admin',
        role: 'super_admin',
        email: 'superadmin@medicalpro.com',
        firstName: 'Super',
        lastName: 'Admin',
        name: t('nav.header.profiles.superAdmin.name'),
        company: 'Medical Pro SaaS',
        description: t('nav.header.profiles.superAdmin.description'),
        icon: Shield,
        color: 'text-purple-600 bg-purple-100'
      },
      {
        id: 'admin',
        role: 'admin',
        email: 'admin@clinique-example.com',
        firstName: 'Dr. Elena',
        lastName: 'Rodriguez',
        name: t('nav.header.profiles.admin.name'),
        company: 'Clínica Rodriguez',
        description: t('nav.header.profiles.admin.description'),
        icon: UserCheck,
        color: 'text-blue-600 bg-blue-100'
      },
      {
        id: 'secretary',
        role: 'secretary',
        email: 'secretaria@clinique-example.com',
        firstName: 'Laura',
        lastName: 'Fernandez',
        name: t('nav.header.profiles.secretary.name'),
        company: 'Clínica Rodriguez',
        description: t('nav.header.profiles.secretary.description'),
        icon: Users,
        color: 'text-orange-600 bg-orange-100'
      },
      {
        id: 'readonly',
        role: 'readonly',
        email: 'readonly@clinique-example.com',
        firstName: 'Observer',
        lastName: 'Demo',
        name: t('nav.header.profiles.readonly.name'),
        company: 'Clínica Rodriguez',
        description: t('nav.header.profiles.readonly.description'),
        icon: Users,
        color: 'text-gray-600 bg-gray-100'
      }
    ];

    // Ajouter les praticiens réels de la clinique
    const practitionerProfiles = realPractitioners.map(practitioner => {
      // Déterminer la couleur en fonction du rôle
      let color = 'text-green-600 bg-green-100';
      let roleKey = 'doctor';
      if (practitioner.role === 'specialist') {
        color = 'text-teal-600 bg-teal-100';
        roleKey = 'specialist';
      } else if (practitioner.role === 'nurse') {
        color = 'text-pink-600 bg-pink-100';
        roleKey = 'nurse';
      }

      return {
        id: practitioner.id,
        role: practitioner.role || 'doctor',
        email: practitioner.email || `${practitioner.id}@clinique-example.com`,
        firstName: practitioner.firstName || practitioner.name.split(' ')[0] || practitioner.name,
        lastName: practitioner.lastName || practitioner.name.split(' ').slice(1).join(' ') || '',
        name: practitioner.name,
        company: 'Clínica Rodriguez',
        description: `${t(`nav.header.profiles.${roleKey}.description`)} - ${practitioner.name}`,
        icon: Users,
        color: color,
        specialty: practitioner.specialty
      };
    });

    // Combiner les profils de base avec les praticiens réels
    setTestProfiles([...baseProfiles, ...practitionerProfiles]);
  }, [t]);

  // Fermer le dropdown quand on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fonction pour changer de profil de test
  const handleProfileChange = (profile) => {
    login({
      id: profile.id,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      name: profile.name,
      role: profile.role,
      company: profile.company,
      specialty: profile.specialty,
      provider: 'demo',
      isDemo: true
    });
    setIsProfileDropdownOpen(false);
  };

  // Obtenir le profil actuel
  const getCurrentProfile = () => {
    // D'abord chercher par ID exact
    const profileById = testProfiles.find(p => p.id === user?.id);
    if (profileById) return profileById;

    // Sinon chercher par role
    const profileByRole = testProfiles.find(p => p.role === user?.role);
    if (profileByRole) return profileByRole;

    // Par défaut, retourner le premier profil
    return testProfiles[0] || {
      firstName: user?.firstName || 'User',
      lastName: user?.lastName || '',
      description: user?.role || 'User',
      icon: Users,
      color: 'text-gray-600 bg-gray-100'
    };
  };

  const currentProfile = getCurrentProfile();

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
          {/* Menu de changement de profil */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border"
            >
              <div className={`p-2 rounded-full ${currentProfile.color}`}>
                <currentProfile.icon className="h-4 w-4" />
              </div>
              <div className="text-left">
                <div className="font-medium text-gray-900 text-sm">
                  {currentProfile.firstName} {currentProfile.lastName}
                </div>
                <div className="text-xs text-gray-600">
                  {currentProfile.description}
                </div>
              </div>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isProfileDropdownOpen ? 'transform rotate-180' : ''}`} />
            </button>

            {/* Dropdown des profils */}
            {isProfileDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
                <div className="py-2">
                  <div className="px-4 py-2 border-b">
                    <h3 className="font-medium text-gray-900">{t('nav.header.testProfiles')}</h3>
                    <p className="text-xs text-gray-600">{t('nav.header.testProfilesDesc')}</p>
                  </div>
                  {testProfiles.map((profile) => {
                    const ProfileIcon = profile.icon;
                    // Match par ID exact d'abord, puis par role
                    const isActive = profile.id === user?.id || (profile.role === user?.role && !testProfiles.find(p => p.id === user?.id));

                    return (
                      <button
                        key={profile.id}
                        onClick={() => handleProfileChange(profile)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                          isActive ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                        }`}
                      >
                        <div className={`p-2 rounded-full ${profile.color}`}>
                          <ProfileIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className={`font-medium text-sm ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                            {profile.firstName} {profile.lastName}
                          </div>
                          <div className={`text-xs ${isActive ? 'text-blue-600' : 'text-gray-600'}`}>
                            {profile.description}
                          </div>
                          <div className={`text-xs ${isActive ? 'text-blue-500' : 'text-gray-500'}`}>
                            {profile.company}
                          </div>
                        </div>
                        {isActive && (
                          <div className="text-blue-500">
                            <UserCheck className="h-4 w-4" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

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