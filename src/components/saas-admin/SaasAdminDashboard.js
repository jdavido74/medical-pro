// components/saas-admin/SaasAdminDashboard.js
import React, { useState } from 'react';
import {
  Building2, Users, Globe, Shield, BarChart3,
  Crown, Stethoscope, Database, TrendingUp, Settings
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useDynamicTranslations } from '../../contexts/DynamicTranslationsContext';
import { useMedicalModules } from '../../contexts/MedicalModulesContext';

import SpecialtiesAdminModule from '../admin/SpecialtiesAdminModule';
import BackupManagementModule from '../admin/BackupManagementModule';
import ClinicsManagementModule from './ClinicsManagementModule';
import SaasUsersModule from './SaasUsersModule';
import SaasAnalyticsModule from './SaasAnalyticsModule';
import SubscriptionsModule from './SubscriptionsModule';
import GlobalSettingsModule from './GlobalSettingsModule';

const SaasAdminDashboard = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { getAvailableSpecialties } = useDynamicTranslations();
  const [activeTab, setActiveTab] = useState('overview');

  // Vérifier si l'utilisateur est super admin
  const isSuperAdmin = user?.role === 'super_admin';

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {t('admin.accessDenied', 'Acceso Denegado')}
          </h2>
          <p className="text-gray-600">
            {t('admin.noPermissionSaas', 'No tienes permisos para acceder al panel de administración SaaS.')}
          </p>
        </div>
      </div>
    );
  }

  // Statistiques globales du SaaS
  const saasStats = {
    totalClinics: 45,
    activeClinics: 38,
    totalUsers: 234,
    activeSpecialties: getAvailableSpecialties().length,
    monthlyRevenue: '€15,432',
    growthRate: '+12.5%'
  };

  const recentActivity = [
    { id: 1, type: 'clinic_created', message: 'Nueva clínica registrada: Clínica Madrid', time: '2 min', icon: Building2 },
    { id: 2, type: 'specialty_added', message: 'Nueva especialidad global: Neurología', time: '15 min', icon: Stethoscope },
    { id: 3, type: 'subscription_upgraded', message: 'Clínica Barcelona actualizó a Premium', time: '1h', icon: TrendingUp },
    { id: 4, type: 'user_milestone', message: '200+ usuarios activos alcanzados', time: '2h', icon: Users }
  ];

  const tabsConfig = [
    {
      id: 'overview',
      label: t('admin.overview', 'Vista General'),
      icon: BarChart3,
      visible: true
    },
    {
      id: 'clinics',
      label: t('admin.clinics', 'Clínicas'),
      icon: Building2,
      visible: true
    },
    {
      id: 'users',
      label: t('admin.allUsers', 'Todos los Usuarios'),
      icon: Users,
      visible: true
    },
    {
      id: 'subscriptions',
      label: t('admin.subscriptions', 'Suscripciones'),
      icon: Crown,
      visible: true
    },
    {
      id: 'specialties',
      label: t('admin.specialties', 'Especialidades Globales'),
      icon: Stethoscope,
      visible: true
    },
    {
      id: 'analytics',
      label: t('admin.analytics', 'Analíticas'),
      icon: TrendingUp,
      visible: true
    },
    {
      id: 'backup',
      label: t('admin.backup', 'Respaldos'),
      icon: Database,
      visible: true
    },
    {
      id: 'settings',
      label: t('admin.globalSettings', 'Configuración Global'),
      icon: Settings,
      visible: true
    }
  ];

  const visibleTabs = tabsConfig.filter(tab => tab.visible);

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('admin.totalClinics', 'Total Clínicas')}</p>
              <p className="text-3xl font-bold text-gray-900">{saasStats.totalClinics}</p>
              <p className="text-xs text-green-600 mt-1">
                {saasStats.activeClinics} {t('admin.active', 'activas')}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('admin.totalUsers', 'Total Usuarios')}</p>
              <p className="text-3xl font-bold text-gray-900">{saasStats.totalUsers}</p>
              <p className="text-xs text-green-600 mt-1">{saasStats.growthRate} {t('admin.thisMonth', 'este mes')}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('admin.monthlyRevenue', 'Ingresos Mensuales')}</p>
              <p className="text-3xl font-bold text-gray-900">{saasStats.monthlyRevenue}</p>
              <p className="text-xs text-green-600 mt-1">{saasStats.growthRate} vs mes anterior</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Actividad reciente */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('admin.recentActivity', 'Actividad Reciente')}
          </h3>
        </div>
        <div className="divide-y">
          {recentActivity.map((activity) => {
            const Icon = activity.icon;
            return (
              <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 rounded-full">
                    <Icon className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500">{t('admin.timeAgo', 'Hace {{time}}', { time: activity.time })}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Información del SaaS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-3 mb-4">
            <Crown className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              {t('admin.platformStatus', 'Estado de la Plataforma')}
            </h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">{t('admin.systemStatus', 'Sistema')}</span>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                {t('admin.operational', 'Operativo')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">{t('admin.uptime', 'Uptime')}</span>
              <span className="text-sm font-medium text-gray-900">99.9%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">{t('admin.version', 'Versión')}</span>
              <span className="text-sm font-medium text-gray-900">v2.1.0</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
          <div className="flex items-center space-x-3 mb-4">
            <Stethoscope className="h-6 w-6 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              {t('admin.specialtiesOverview', 'Especialidades')}
            </h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">{t('admin.activeSpecialties', 'Activas')}</span>
              <span className="text-sm font-medium text-gray-900">{saasStats.activeSpecialties}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">{t('admin.mostUsed', 'Más usada')}</span>
              <span className="text-sm font-medium text-gray-900">Cardiología</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'clinics':
        return <ClinicsManagementModule />;
      case 'users':
        return <SaasUsersModule />;
      case 'subscriptions':
        return <SubscriptionsModule />;
      case 'specialties':
        return <SpecialtiesAdminModule />;
      case 'analytics':
        return <SaasAnalyticsModule />;
      case 'backup':
        return <BackupManagementModule />;
      case 'settings':
        return <GlobalSettingsModule />;
      default:
        return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header SaaS Admin */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                <Crown className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  {t('admin.saasAdminPanel', 'Panel de Administración SaaS')}
                </h1>
                <p className="text-blue-100 text-sm">
                  {t('admin.globalPlatformManagement', 'Gestión global de la plataforma MedicalPro')}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-blue-100">{t('admin.superAdmin', 'Super Administrador')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium text-sm">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </div>
    </div>
  );
};

export default SaasAdminDashboard;
