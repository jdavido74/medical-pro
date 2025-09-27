// components/dashboard/Header.js
import React, { useState, useEffect, useRef } from 'react';
import { Bell, ChevronDown, Users, Shield, UserCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import NotificationCenter from '../notifications/NotificationCenter';

const Header = ({ activeModule }) => {
  const { user, login } = useAuth();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  // Profils de test disponibles pour les démonstrations
  const testProfiles = [
    {
      id: 'super_admin',
      role: 'super_admin',
      email: 'superadmin@medicalpro.com',
      firstName: 'Super',
      lastName: 'Admin',
      company: 'Medical Pro SaaS',
      description: 'Accès complet - Gestion globale',
      icon: Shield,
      color: 'text-purple-600 bg-purple-100'
    },
    {
      id: 'admin',
      role: 'admin',
      email: 'admin@clinique-example.com',
      firstName: 'Dr. Elena',
      lastName: 'Rodriguez',
      company: 'Clínica Rodriguez',
      description: 'Admin clinique - Gestion complète',
      icon: UserCheck,
      color: 'text-blue-600 bg-blue-100'
    },
    {
      id: 'doctor',
      role: 'doctor',
      email: 'doctor@clinique-example.com',
      firstName: 'Dr. Carlos',
      lastName: 'Garcia',
      company: 'Clínica Rodriguez',
      description: 'Médecin - Consultations & diagnostics',
      icon: Users,
      color: 'text-green-600 bg-green-100'
    },
    {
      id: 'specialist',
      role: 'specialist',
      email: 'cardio@clinique-example.com',
      firstName: 'Dr. Maria',
      lastName: 'Lopez',
      company: 'Clínica Rodriguez',
      description: 'Spécialiste - Cardiologie',
      icon: Users,
      color: 'text-teal-600 bg-teal-100'
    },
    {
      id: 'nurse',
      role: 'nurse',
      email: 'nurse@clinique-example.com',
      firstName: 'Ana',
      lastName: 'Martinez',
      company: 'Clínica Rodriguez',
      description: 'Infirmière - Soins & suivi',
      icon: Users,
      color: 'text-pink-600 bg-pink-100'
    },
    {
      id: 'secretary',
      role: 'secretary',
      email: 'secretaria@clinique-example.com',
      firstName: 'Laura',
      lastName: 'Fernandez',
      company: 'Clínica Rodriguez',
      description: 'Secrétaire - Gestion administrative',
      icon: Users,
      color: 'text-orange-600 bg-orange-100'
    },
    {
      id: 'readonly',
      role: 'readonly',
      email: 'readonly@clinique-example.com',
      firstName: 'Observer',
      lastName: 'Demo',
      company: 'Clínica Rodriguez',
      description: 'Lecture seule - Consultation uniquement',
      icon: Users,
      color: 'text-gray-600 bg-gray-100'
    }
  ];

  // Fonction pour changer de profil de test
  const handleProfileChange = (profile) => {
    login({
      id: profile.id,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      role: profile.role,
      company: profile.company,
      provider: 'demo',
      isDemo: true
    });
    setIsProfileDropdownOpen(false);
  };

  // Obtenir le profil actuel
  const getCurrentProfile = () => {
    return testProfiles.find(p => p.role === user?.role) || testProfiles[0];
  };

  const currentProfile = getCurrentProfile();

  const getModuleTitle = (module) => {
    const modules = {
      home: 'Accueil',
      patients: 'Gestion des patients',
      appointments: 'Rendez-vous',
      'medical-records': 'Dossiers médicaux',
      consents: 'Gestion des consentements',
      'consent-templates': 'Modèles de consentements',
      analytics: 'Statistiques médicales',
      settings: 'Paramètres'
    };
    return modules[module] || 'Dashboard';
  };

  const getModuleDescription = (module) => {
    const descriptions = {
      home: 'Vue d\'ensemble de votre cabinet médical',
      patients: 'Gérez vos patients et leur suivi',
      appointments: 'Planifiez et organisez les consultations',
      'medical-records': 'Consultations, diagnostics et prescriptions',
      consents: 'Gérez les consentements RGPD et médicaux',
      'consent-templates': 'Créez et gérez vos modèles de consentements personnalisés',
      analytics: 'Analysez votre activité médicale',
      settings: 'Configurez votre cabinet et vos préférences'
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
                    <h3 className="font-medium text-gray-900">🧪 Profils de test</h3>
                    <p className="text-xs text-gray-600">Changez de profil pour tester les permissions</p>
                  </div>
                  {testProfiles.map((profile) => {
                    const ProfileIcon = profile.icon;
                    const isActive = profile.role === user?.role;

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
                  Connecté via {getProviderText(user.provider)}
                </span>
              )}
              {user?.isDemo && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                  🧪 Mode Démo
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