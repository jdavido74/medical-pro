// components/admin/AdminDashboard.js
// Dashboard d'administration pour les administrateurs de CLINIQUE uniquement
// Les super_admin doivent utiliser le SaasAdminDashboard
import React, { useState } from 'react';
import {
  Users, Settings, Shield, BarChart3,
  Stethoscope, Activity, Calendar, UserCheck
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useDynamicTranslations } from '../../contexts/DynamicTranslationsContext';

import UserManagementModule from './UserManagementModule';
import RoleManagementModule from './RoleManagementModule';
import TeamManagementModule from './TeamManagementModule';
import AuditManagementModule from './AuditManagementModule';
import ClinicConfigurationModule from './ClinicConfigurationModule';

const AdminDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isLoading: translationsLoading, getAvailableSpecialties } = useDynamicTranslations();
  const [activeTab, setActiveTab] = useState('overview');

  // Vérifier si l'utilisateur est admin clinique uniquement
  const isClinicAdmin = user?.role === 'admin';

  if (!isClinicAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {t('admin.accessDenied', 'Acceso Denegado')}
          </h2>
          <p className="text-gray-600">
            {t('admin.noPermissionClinic', 'No tienes permisos para acceder al panel de administración de clínica.')}
          </p>
        </div>
      </div>
    );
  }

  // Datos de ejemplo para el dashboard de clínica
  const dashboardStats = {
    totalUsers: 15,
    activeUsers: 12,
    practitioners: 8,
    totalPatients: 456,
    appointmentsThisMonth: 234,
    activeSpecialties: getAvailableSpecialties().length
  };

  const recentActivity = [
    { id: 1, type: 'user_created', message: 'Dr. García agregado al equipo', time: '2 min' },
    { id: 2, type: 'practitioner_updated', message: 'Disponibilidad actualizada para enfermera López', time: '15 min' },
    { id: 3, type: 'role_changed', message: 'Permisos actualizados para secretaria', time: '1h' },
    { id: 4, type: 'config_updated', message: 'Configuración de clínica modificada', time: '2h' }
  ];

  const tabsConfig = [
    {
      id: 'overview',
      label: t('admin.overview', 'Vista General'),
      icon: BarChart3,
      visible: true
    },
    {
      id: 'clinic-config',
      label: t('admin.clinicConfig', 'Configuración de Clínica'),
      icon: Calendar,
      visible: true
    },
    {
      id: 'users',
      label: t('admin.users', 'Usuarios'),
      icon: Users,
      visible: true
    },
    {
      id: 'roles',
      label: t('admin.roles', 'Roles y Permisos'),
      icon: Shield,
      visible: true
    },
    {
      id: 'teams',
      label: t('admin.teams', 'Equipos y Delegaciones'),
      icon: Users,
      visible: true
    },
    {
      id: 'audit',
      label: t('admin.audit', 'Auditoría y Logs'),
      icon: Activity,
      visible: true
    }
  ];

  const visibleTabs = tabsConfig.filter(tab => tab.visible);

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                {t('admin.totalUsers', 'Usuarios Totales')}
              </p>
              <p className="text-2xl font-bold text-gray-900">{dashboardStats.totalUsers}</p>
              <p className="text-xs text-green-600 mt-1">
                {dashboardStats.activeUsers} {t('admin.active', 'activos')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                {t('admin.practitioners', 'Praticiens')}
              </p>
              <p className="text-2xl font-bold text-gray-900">{dashboardStats.practitioners}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                {t('admin.appointmentsMonth', 'RDV ce mois')}
              </p>
              <p className="text-2xl font-bold text-gray-900">{dashboardStats.appointmentsThisMonth}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Estado del sistema */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Especialidades configuradas */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('admin.configuredSpecialties', 'Especialidades Configuradas')}
          </h3>
          {translationsLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {getAvailableSpecialties().slice(0, 5).map(specialty => (
                <div key={specialty.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    <span className="font-medium text-gray-900">{specialty.name}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {t('admin.active', 'Activa')}
                  </span>
                </div>
              ))}
              {getAvailableSpecialties().length > 5 && (
                <div className="text-sm text-blue-600 font-medium">
                  +{getAvailableSpecialties().length - 5} {t('admin.moreSpecialties', 'especialidades más')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actividad reciente */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('admin.recentActivity', 'Actividad Reciente')}
          </h3>
          <div className="space-y-3">
            {recentActivity.map(activity => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500">
                    {t('admin.timeAgo', 'Hace {{time}}', { time: activity.time })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Información del usuario actual */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('admin.yourInfo', 'Tu Información de Administrador')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="text-3xl">{user?.avatar || '👤'}</div>
              <div>
                <h4 className="font-medium text-gray-900">{user?.name}</h4>
                <p className="text-sm text-gray-600">{user?.email}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{t('admin.role', 'Rol')}:</span>
                <span className="text-sm font-medium text-gray-900">
                  {t('admin.clinicAdmin', 'Administrador de Clínica')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{t('admin.clinic', 'Clínica')}:</span>
                <span className="text-sm font-medium text-gray-900">{user?.company}</span>
              </div>
            </div>
          </div>

          <div>
            <h5 className="font-medium text-gray-900 mb-3">
              {t('admin.adminPermissions', 'Permisos de Administración')}
            </h5>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-green-600">
                <Users className="h-4 w-4 mr-2" />
                {t('admin.manageClinicUsers', 'Gestionar usuarios de la clínica')}
              </div>
              <div className="flex items-center text-sm text-green-600">
                <Stethoscope className="h-4 w-4 mr-2" />
                {t('admin.assignSpecialties', 'Asignar especialidades a usuarios')}
              </div>
              <div className="flex items-center text-sm text-green-600">
                <Calendar className="h-4 w-4 mr-2" />
                {t('admin.manageAvailability', 'Gestionar disponibilidad de praticiens')}
              </div>
              <div className="flex items-center text-sm text-green-600">
                <Shield className="h-4 w-4 mr-2" />
                {t('admin.manageRoles', 'Gestionar roles y permisos')}
              </div>
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
      case 'clinic-config':
        return <ClinicConfigurationModule />;
      case 'users':
        return <UserManagementModule />;
      case 'roles':
        return <RoleManagementModule />;
      case 'teams':
        return <TeamManagementModule />;
      case 'audit':
        return <AuditManagementModule />;
      default:
        return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t('admin.clinicAdminPanel', 'Panel de Administración de Clínica')}
              </h1>
              <p className="text-gray-600">
                {user?.company || t('admin.clinicManagement', 'Administración de Clínica')}
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                <Shield className="h-4 w-4 mr-1" />
                {t('admin.clinicAdmin', 'Admin Clínica')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {visibleTabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default AdminDashboard;
