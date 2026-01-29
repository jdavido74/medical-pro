/**
 * Page d'aperçu du dashboard d'administration
 * Vue d'ensemble des statistiques et de l'activité
 */

import React, { useState, useEffect } from 'react';
import {
  Users, Calendar, UserCheck, Activity
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useDynamicTranslations } from '../../contexts/DynamicTranslationsContext';
import { healthcareProvidersApi } from '../../api/healthcareProvidersApi';
import { patientsStorage } from '../../utils/patientsStorage';
import { appointmentsStorage } from '../../utils/appointmentsStorage';
import auditStorage from '../../utils/auditStorage';
import { getUserStats, filterActiveUsers } from '../../utils/userRoles';

const AdminOverview = () => {
  const { t } = useTranslation();
  const { user, company } = useAuth();
  const { isLoading: translationsLoading, getAvailableSpecialties } = useDynamicTranslations();
  const [dashboardStats, setDashboardStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    practitioners: 0,
    totalPatients: 0,
    appointmentsThisMonth: 0,
    activeSpecialties: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Charger les statistiques réelles depuis la base de données
  const loadDashboardStats = async () => {
    try {
      setIsLoadingStats(true);

      // 1. Charger les utilisateurs (healthcare providers)
      const usersData = await healthcareProvidersApi.getHealthcareProviders({ limit: 100 });
      const users = usersData.providers || [];

      // 2. Charger les patients
      const patients = patientsStorage.getAll();

      // 3. Charger les rendez-vous du mois en cours
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const appointments = appointmentsStorage.search('', {
        dateFrom: startOfMonth.toISOString().split('T')[0],
        dateTo: endOfMonth.toISOString().split('T')[0]
      });

      // 4. Charger l'activité récente depuis l'audit
      const auditLogs = (auditStorage.getAllLogs() || []).slice(0, 5);
      const formattedActivity = auditLogs.map((log, index) => ({
        id: index + 1,
        type: log.eventType,
        message: log.description || `${log.eventType} - ${log.userName}`,
        time: formatTimeAgo(log.timestamp)
      }));

      // Calculer les statistiques avec l'utilitaire centralisé
      const userStats = getUserStats(users);
      setDashboardStats({
        totalUsers: userStats.total,
        activeUsers: userStats.active,
        practitioners: userStats.practitioners.total,
        totalPatients: patients.length,
        appointmentsThisMonth: appointments.length,
        activeSpecialties: getAvailableSpecialties().length
      });

      setRecentActivity(formattedActivity);
    } catch (error) {
      console.error('[AdminOverview] Error loading stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Fonction pour formater le temps écoulé
  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
    if (diffInMinutes < 1440) return `Il y a ${Math.floor(diffInMinutes / 60)} h`;
    return `Il y a ${Math.floor(diffInMinutes / 1440)} j`;
  };

  // Charger les stats au montage du composant
  useEffect(() => {
    loadDashboardStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                {t('admin.totalUsers')}
              </p>
              <p className="text-2xl font-bold text-gray-900">{dashboardStats.totalUsers}</p>
              <p className="text-xs text-green-600 mt-1">
                {dashboardStats.activeUsers} {t('admin.active')}
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
                {t('admin.practitioners')}
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
                {t('admin.appointmentsMonth')}
              </p>
              <p className="text-2xl font-bold text-gray-900">{dashboardStats.appointmentsThisMonth}</p>
            </div>
          </div>
        </div>
      </div>

      {/* État du système */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spécialités configurées */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('admin.configuredSpecialties')}
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
                    {t('admin.active')}
                  </span>
                </div>
              ))}
              {getAvailableSpecialties().length > 5 && (
                <div className="text-sm text-blue-600 font-medium">
                  +{getAvailableSpecialties().length - 5} {t('admin.moreSpecialties')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Activité récente */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('admin.recentActivity')}
          </h3>
          <div className="space-y-3">
            {recentActivity.map(activity => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500">
                    {t('admin.timeAgo', { time: activity.time })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Informations du utilisateur actuel */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('admin.yourInfo')}
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
                <span className="text-sm text-gray-600">{t('admin.role')}:</span>
                <span className="text-sm font-medium text-gray-900">
                  {t('admin.clinicAdmin')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{t('admin.clinic')}:</span>
                <span className="text-sm font-medium text-gray-900">
                  {company?.name || user?.companyName || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h5 className="font-medium text-gray-900 mb-3">
              {t('admin.adminPermissions')}
            </h5>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-green-600">
                <Users className="h-4 w-4 mr-2" />
                {t('admin.manageClinicUsers')}
              </div>
              <div className="flex items-center text-sm text-green-600">
                <Activity className="h-4 w-4 mr-2" />
                {t('admin.assignSpecialties')}
              </div>
              <div className="flex items-center text-sm text-green-600">
                <Calendar className="h-4 w-4 mr-2" />
                {t('admin.manageAvailability')}
              </div>
              <div className="flex items-center text-sm text-green-600">
                <Activity className="h-4 w-4 mr-2" />
                {t('admin.manageRoles')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
