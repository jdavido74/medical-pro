// components/dashboard/Dashboard.js
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import HomeModule from './modules/HomeModule';
import PatientsModule from './modules/PatientsModule';
import MedicalRecordsModule from './modules/MedicalRecordsModule';
import AppointmentsModule from './modules/AppointmentsModule';
import QuotesModule from './modules/QuotesModule';
import InvoicesModule from './modules/InvoicesModule';
import ConsentManagementModule from './modules/ConsentManagementModule';
import ConsentTemplatesModule from './modules/ConsentTemplatesModule';
import SettingsModule from './modules/SettingsModule';
import AdminDashboard from '../admin/AdminDashboard';
import SaasAdminDashboard from '../saas-admin/SaasAdminDashboard';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';

const Dashboard = ({ setCurrentPage }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeModule, setActiveModule] = useState('home');
  const [selectedPatientId, setSelectedPatientId] = useState(null);

  // Détecter si l'utilisateur est super_admin pour redirection automatique
  const isSuperAdmin = user?.role === 'super_admin';

  // Fonction pour naviguer vers la fiche d'un patient spécifique
  const navigateToPatient = (patientId) => {
    setSelectedPatientId(patientId);
    setActiveModule('patients');
  };

  const renderModule = () => {
    switch (activeModule) {
      case 'home':
        return <HomeModule setActiveModule={setActiveModule} />;
      case 'patients':
        return <PatientsModule selectedPatientId={selectedPatientId} setSelectedPatientId={setSelectedPatientId} />;
      case 'medical-records':
        return <MedicalRecordsModule navigateToPatient={navigateToPatient} />;
      case 'appointments':
        return <AppointmentsModule navigateToPatient={navigateToPatient} />;
      case 'quotes':
        return <QuotesModule navigateToPatient={navigateToPatient} />;
      case 'invoices':
        return <InvoicesModule navigateToPatient={navigateToPatient} />;
      case 'consents':
        return <ConsentManagementModule navigateToPatient={navigateToPatient} />;
      case 'consent-templates':
        return <ConsentTemplatesModule />;
      case 'analytics':
        return (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('analytics.title')}</h3>
            <p className="text-gray-600">{t('analytics.comingSoon')}</p>
          </div>
        );
      case 'admin':
        // Rediriger vers le bon dashboard selon le rôle
        return isSuperAdmin ? <SaasAdminDashboard /> : <AdminDashboard />;
      case 'settings':
        return <SettingsModule />;
      default:
        return <HomeModule setActiveModule={setActiveModule} />;
    }
  };

  // Si l'utilisateur est super_admin et sur la page d'accueil, afficher directement le SaaS Admin
  if (isSuperAdmin && activeModule === 'home') {
    return <SaasAdminDashboard />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} setCurrentPage={setCurrentPage} />
      
      {/* Contenu principal */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header activeModule={activeModule} />
        
        {/* Contenu */}
        <main className="flex-1 p-6">
          {renderModule()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;