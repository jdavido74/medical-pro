// App.js
import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, useRoutes } from 'react-router-dom';
import { SecureAuthProvider } from './contexts/SecureAuthContext';
import { DynamicTranslationsProvider } from './contexts/DynamicTranslationsContext';
import { MedicalModulesProvider } from './contexts/MedicalModulesContext';
import { PatientProvider } from './contexts/PatientContext';
import { AppointmentProvider } from './contexts/AppointmentContext';
import { UserProvider } from './contexts/UserContext';
import { ConsentProvider } from './contexts/ConsentContext';
import { MedicalRecordProvider } from './contexts/MedicalRecordContext';
import { detectRegion, getRegionConfig } from './utils/regionDetector';
import ClinicStatusGuard from './components/ClinicStatusGuard';
import routes from './routes';

// Region Context - To keep track of the current region
const RegionContext = createContext();

export const useRegion = () => {
  const context = useContext(RegionContext);
  if (!context) {
    throw new Error('useRegion must be used within RegionProvider');
  }
  return context;
};

// Composant de routage
const AppRoutes = () => {
  const routing = useRoutes(routes);
  return routing;
};

// Composant principal de l'application
const MediMaestroApp = () => {
  const [region] = useState(() => detectRegion());
  const regionConfig = getRegionConfig(region);

  useEffect(() => {
    // Log region information
    console.log(`🌍 MedicalPro Region Detected: ${regionConfig.name} (${region.toUpperCase()})`);
  }, [region, regionConfig]);

  return (
    <BrowserRouter>
      <RegionContext.Provider value={{ region, regionConfig }}>
        <SecureAuthProvider>
          <ClinicStatusGuard>
            <DynamicTranslationsProvider>
              <MedicalModulesProvider>
                <UserProvider>
                  <PatientProvider>
                    <AppointmentProvider>
                      <ConsentProvider>
                        <MedicalRecordProvider>
                          <AppRoutes />
                        </MedicalRecordProvider>
                      </ConsentProvider>
                    </AppointmentProvider>
                  </PatientProvider>
                </UserProvider>
              </MedicalModulesProvider>
            </DynamicTranslationsProvider>
          </ClinicStatusGuard>
        </SecureAuthProvider>
      </RegionContext.Provider>
    </BrowserRouter>
  );
};

export default MediMaestroApp;