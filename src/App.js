// App.js
import React, { useState, useEffect, createContext, useContext } from 'react';
import { Heart } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { DynamicTranslationsProvider } from './contexts/DynamicTranslationsContext';
import { MedicalModulesProvider } from './contexts/MedicalModulesContext';
import { PatientProvider } from './contexts/PatientContext';
import { AppointmentProvider } from './contexts/AppointmentContext';
import { initializeAllSampleData } from './utils/dataManager';
import { detectRegion, getRegionConfig } from './utils/regionDetector';
import HomePage from './components/public/HomePage';
import LoginPage from './components/auth/LoginPage';
import SignupPage from './components/auth/SignupPage';
import Dashboard from './components/dashboard/Dashboard';

// Region Context - To keep track of the current region
const RegionContext = createContext();

export const useRegion = () => {
  const context = useContext(RegionContext);
  if (!context) {
    throw new Error('useRegion must be used within RegionProvider');
  }
  return context;
};

// Composant principal de l'application
const ClinicManagerApp = () => {
  const [region] = useState(() => detectRegion());
  const regionConfig = getRegionConfig(region);

  useEffect(() => {
    // NOTE: Demo data initialization is DISABLED
    // Users will create real data through the platform and database
    // To re-enable demo data, uncomment the line below:
    // initializeAllSampleData();

    // Log region information
    console.log(`🌍 MedicalPro Region Detected: ${regionConfig.name} (${region.toUpperCase()})`);
  }, [region, regionConfig]);

  return (
    <RegionContext.Provider value={{ region, regionConfig }}>
      <AuthProvider>
        <DynamicTranslationsProvider>
          <MedicalModulesProvider>
            <PatientProvider>
              <AppointmentProvider>
                <AppContent />
              </AppointmentProvider>
            </PatientProvider>
          </MedicalModulesProvider>
        </DynamicTranslationsProvider>
      </AuthProvider>
    </RegionContext.Provider>
  );
};

// Contenu de l'application avec gestion des routes
const AppContent = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { region } = useRegion();
  const { t } = useTranslation('common');
  const [currentPage, setCurrentPage] = useState('home');

  // Afficher un loader pendant le chargement de la session
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <Heart className="h-12 w-12 text-green-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">{t('loading')}</p>
          {/* Show region in loading screen for debugging */}
          <p className="text-xs text-gray-400 mt-2">Region: {region.toUpperCase()}</p>
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