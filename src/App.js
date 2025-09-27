// App.js
import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { DynamicTranslationsProvider } from './contexts/DynamicTranslationsContext';
import { MedicalModulesProvider } from './contexts/MedicalModulesContext';
import { initializeDefaultCatalog } from './utils/productsStorage';
import { initializeSampleConsents } from './utils/consentsStorage';
import { initializeSampleTemplates } from './utils/consentTemplatesStorage';
import HomePage from './components/public/HomePage';
import LoginPage from './components/auth/LoginPage';
import SignupPage from './components/auth/SignupPage';
import Dashboard from './components/dashboard/Dashboard';

// Composant principal de l'application
const ClinicManagerApp = () => {
  useEffect(() => {
    // Initialiser le catalogue médical par défaut au démarrage
    initializeDefaultCatalog();
    // Initialiser les consentements de démonstration
    initializeSampleConsents();
    // Initialiser les modèles de consentements de démonstration
    initializeSampleTemplates();
  }, []);

  return (
    <LanguageProvider>
      <AuthProvider>
        <DynamicTranslationsProvider>
          <MedicalModulesProvider>
            <AppContent />
          </MedicalModulesProvider>
        </DynamicTranslationsProvider>
      </AuthProvider>
    </LanguageProvider>
  );
};

// Contenu de l'application avec gestion des routes
const AppContent = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = useState('home');

  // Afficher un loader pendant le chargement de la session
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <Heart className="h-12 w-12 text-green-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }
  
  // Si l'utilisateur est connecté, afficher le dashboard
  if (isAuthenticated) {
    return <Dashboard setCurrentPage={setCurrentPage} />;
  }
  
  // Sinon, afficher les pages publiques selon la navigation
  switch (currentPage) {
    case 'login':
      return <LoginPage setCurrentPage={setCurrentPage} />;
    case 'signup':
      return <SignupPage setCurrentPage={setCurrentPage} />;
    case 'home':
    default:
      return <HomePage setCurrentPage={setCurrentPage} />;
  }
};

export default ClinicManagerApp;