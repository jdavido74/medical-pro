// components/admin/AdminDashboard.js
import React, { useState } from 'react';
import {
  Users, Settings, Globe, Shield, BarChart3,
  Crown, Stethoscope, Building2, Activity, Calendar
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useDynamicTranslations } from '../../contexts/DynamicTranslationsContext';
import { useMedicalModules } from '../../contexts/MedicalModulesContext';

import SpecialtiesAdminModule from './SpecialtiesAdminModule';
import UserManagementModule from './UserManagementModule';
import RoleManagementModule from './RoleManagementModule';
import TeamManagementModule from './TeamManagementModule';
import AuditManagementModule from './AuditManagementModule';
import BackupManagementModule from './BackupManagementModule';
import ClinicConfigurationModule from './ClinicConfigurationModule';

const AdminDashboard = () => {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const { user } = useAuth();
  const { isLoading: translationsLoading, getAvailableSpecialties } = useDynamicTranslations();
  const { isLoadingConfig, dynamicSpecialties } = useMedicalModules();
  const [activeTab, setActiveTab] = useState('overview');

  // Vérifier si l'utilisateur a les permissions d'admin
  const isSuperAdmin = user?.role === 'super_admin';
  const isClinicAdmin = user?.role === 'admin';
  const hasAdminRights = isSuperAdmin || isClinicAdmin;

  if (!hasAdminRights) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600">No tienes permisos para acceder al panel de administración.</p>
        </div>
      </div>
    );
  }

  // Datos de ejemplo para el dashboard
  const dashboardStats = {
    totalClinics: 45,
    totalUsers: 234,
    activeSpecialties: getAvailableSpecialties().length,
    totalModules: 8,
    activeUsers: 189,
    monthlyRevenue: '€15,432'
  };

  const recentActivity = [
    { id: 1, type: 'user_created', message: 'Dr. García creado en Clínica Madrid', time: '2 min' },
    { id: 2, type: 'specialty_added', message: 'Nueva especialidad: Neurología', time: '15 min' },
    { id: 3, type: 'clinic_upgraded', message: 'Clínica Barcelona actualizó a Premium', time: '1h' },
    { id: 4, type: 'module_activated', message: 'Módulo Pediatría activado en 3 clínicas', time: '2h' }
  ];

  const tabsConfig = [
    {
      id: 'overview',
      label: 'Vista General',
      icon: BarChart3,
      visible: true
    },
    {
      id: 'clinic-config',
      label: 'Configuración de Clínica',
      icon: Calendar,
      visible: isClinicAdmin || isSuperAdmin
    },
    {
      id: 'specialties',
      label: 'Especialidades',
      icon: Stethoscope,
      visible: isSuperAdmin
    },
    {
      id: 'users',
      label: 'Usuarios',
      icon: Users,
      visible: isClinicAdmin || isSuperAdmin
    },
    {
      id: 'roles',
      label: 'Roles y Permisos',
      icon: Shield,
      visible: isSuperAdmin || isClinicAdmin
    },
    {
      id: 'teams',
      label: 'Equipos y Delegaciones',
      icon: Users,
      visible: isSuperAdmin || isClinicAdmin
    },
    {
      id: 'audit',
      label: 'Auditoría y Logs',
      icon: Shield,
      visible: isSuperAdmin || isClinicAdmin
    },
    {
      id: 'backup',
      label: 'Respaldos',
      icon: Globe,
      visible: isSuperAdmin
    },
    {
      id: 'clinics',
      label: 'Clínicas',
      icon: Building2,
      visible: isSuperAdmin
    },
    {
      id: 'system',
      label: 'Sistema',
      icon: Settings,
      visible: isSuperAdmin
    }
  ];

  const visibleTabs = tabsConfig.filter(tab => tab.visible);

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isSuperAdmin && (
          <>
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Clínicas Totales</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardStats.totalClinics}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Stethoscope className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Especialidades Activas</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardStats.activeSpecialties}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Activity className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Módulos Disponibles</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardStats.totalModules}</p>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Usuarios Totales</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardStats.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Usuarios Activos</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardStats.activeUsers}</p>
            </div>
          </div>
        </div>

        {isSuperAdmin && (
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Crown className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ingresos Mensuales</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardStats.monthlyRevenue}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Estado del sistema */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Especialidades configuradas */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Especialidades Configuradas
          </h3>
          {translationsLoading || isLoadingConfig ? (
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
                  <span className="text-sm text-gray-500">Activa</span>
                </div>
              ))}
              {getAvailableSpecialties().length > 5 && (
                <div className="text-sm text-blue-600 font-medium">
                  +{getAvailableSpecialties().length - 5} especialidades más
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actividad reciente */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Actividad Reciente
          </h3>
          <div className="space-y-3">
            {recentActivity.map(activity => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500">{activity.time} ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Información del usuario actual */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Tu Información de Administrador
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
                <span className="text-sm text-gray-600">Rol:</span>
                <span className="text-sm font-medium text-gray-900">
                  {isSuperAdmin ? 'Super Administrador' : 'Administrador de Clínica'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Clínica:</span>
                <span className="text-sm font-medium text-gray-900">{user?.companyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Plan:</span>
                <span className={`text-sm font-medium ${
                  user?.plan === 'premium' ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {user?.plan === 'premium' ? '👑 Premium' : '🆓 Gratuito'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h5 className="font-medium text-gray-900 mb-3">Permisos de Administración</h5>
            <div className="space-y-2">
              {isSuperAdmin && (
                <>
                  <div className="flex items-center text-sm text-green-600">
                    <Shield className="h-4 w-4 mr-2" />
                    Gestionar especialidades del SaaS
                  </div>
                  <div className="flex items-center text-sm text-green-600">
                    <Building2 className="h-4 w-4 mr-2" />
                    Administrar todas las clínicas
                  </div>
                  <div className="flex items-center text-sm text-green-600">
                    <Globe className="h-4 w-4 mr-2" />
                    Configurar traducciones
                  </div>
                </>
              )}

              <div className="flex items-center text-sm text-green-600">
                <Users className="h-4 w-4 mr-2" />
                Gestionar usuarios {isClinicAdmin && 'de la clínica'}
              </div>
              <div className="flex items-center text-sm text-green-600">
                <Stethoscope className="h-4 w-4 mr-2" />
                Asignar especialidades a usuarios
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
      case 'specialties':
        return <SpecialtiesAdminModule />;
      case 'users':
        return <UserManagementModule />;
      case 'roles':
        return <RoleManagementModule />;
      case 'teams':
        return <TeamManagementModule />;
      case 'audit':
        return <AuditManagementModule />;
      case 'backup':
        return <BackupManagementModule />;
      case 'clinics':
        return (
          <div className="text-center py-12">
            <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Gestión de Clínicas</h3>
            <p className="text-gray-600">Funcionalidad en desarrollo</p>
          </div>
        );
      case 'system':
        return (
          <div className="text-center py-12">
            <Settings className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Configuración del Sistema</h3>
            <p className="text-gray-600">Funcionalidad en desarrollo</p>
          </div>
        );
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
                Panel de Administración
              </h1>
              <p className="text-gray-600">
                {isSuperAdmin ? 'Administración Global del SaaS' : 'Administración de Clínica'}
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                isSuperAdmin
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {isSuperAdmin ? (
                  <>
                    <Crown className="h-4 w-4 mr-1" />
                    Super Admin
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-1" />
                    Admin Clínica
                  </>
                )}
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