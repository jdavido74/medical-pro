// components/admin/ClinicConfigurationModule.js - Module de configuration de clinique
import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, Users, Settings, Plus,
  ChevronRight, Building2, UserPlus, Edit2,
  CheckCircle, AlertCircle, X
} from 'lucide-react';
import { clinicSettingsApi } from '../../api/clinicSettingsApi';
import { healthcareProvidersApi } from '../../api/healthcareProvidersApi';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';

import ClinicConfigModal from './ClinicConfigModal';
import PractitionerManagementModal from './PractitionerManagementModal';
import PractitionerAvailabilityManager from './PractitionerAvailabilityManager';
import {
  filterPractitioners,
  countPractitionersByType,
  getPractitionerStats
} from '../../utils/userRoles';

const ClinicConfigurationModule = () => {
  const { t } = useTranslation('admin');
  const { user } = useAuth();
  const [config, setConfig] = useState(null);
  const [practitioners, setPractitioners] = useState([]);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isPractitionerModalOpen, setIsPractitionerModalOpen] = useState(false);
  const [availabilityModalOpen, setAvailabilityModalOpen] = useState(false);
  const [selectedPractitionerId, setSelectedPractitionerId] = useState(null);

  // États pour le chargement et les notifications
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  // Auto-hide notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Fonction pour afficher une notification
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Charger les paramètres de la clinique
      const clinicSettings = await clinicSettingsApi.getClinicSettings();
      setConfig(clinicSettings);

      // Charger la liste des praticiens
      const providersData = await healthcareProvidersApi.getHealthcareProviders();
      setPractitioners(providersData.providers || []);

    } catch (error) {
      console.error('[ClinicConfigurationModule] Error loading data:', error);
      setError(t('clinicConfig.messages.loadError') || 'Erreur lors du chargement des données');
      showNotification(t('clinicConfig.messages.loadError') || 'Erreur lors du chargement', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigSave = () => {
    loadData();
  };

  const handleManageAvailability = (practitionerId) => {
    setSelectedPractitionerId(practitionerId);
    setAvailabilityModalOpen(true);
  };

  const getOperatingDaysText = () => {
    if (!config || !config.operatingDays) return '';

    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const openDays = config.operatingDays.map(dayIndex => dayNames[dayIndex]);
    return openDays.join(', ');
  };

  // Utiliser l'utilitaire centralisé pour filtrer les praticiens
  const getActivePractitioners = () => {
    return filterPractitioners(practitioners);
  };

  // Utiliser l'utilitaire centralisé pour compter par type
  const getPractitionersByType = (type) => {
    return countPractitionersByType(practitioners, type);
  };

  const getPractitionerAvailabilitySummary = (practitioner) => {
    if (!practitioner.availability) return 'Non configuré';

    const availableDays = Object.entries(practitioner.availability)
      .filter(([day, config]) => config.enabled)
      .length;

    return availableDays > 0 ? `${availableDays} jours configurés` : 'Aucune disponibilité';
  };

  const getColorClass = (color) => {
    const colorMap = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      red: 'bg-red-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      teal: 'bg-teal-500',
      pink: 'bg-pink-500',
      indigo: 'bg-indigo-500'
    };
    return colorMap[color] || 'bg-blue-500';
  };

  if (!config) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
          <div className={`rounded-lg shadow-lg p-4 flex items-center space-x-3 min-w-[320px] max-w-md ${
            notification.type === 'success'
              ? 'bg-green-50 border-l-4 border-green-500'
              : 'bg-red-50 border-l-4 border-red-500'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            )}
            <p className={`flex-1 text-sm font-medium ${
              notification.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {notification.message}
            </p>
            <button
              onClick={() => setNotification(null)}
              className={`flex-shrink-0 ${
                notification.type === 'success'
                  ? 'text-green-600 hover:text-green-800'
                  : 'text-red-600 hover:text-red-800'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Configuration de la Clinique</h2>
          <p className="text-gray-600 mt-1">
            Gérez les horaires, créneaux et disponibilités des praticiens
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsPractitionerModalOpen(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Gérer les praticiens
          </button>
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configurer la clinique
          </button>
        </div>
      </div>

      {/* Vue d'ensemble de la configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Horaires de la clinique */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <h3 className="font-medium text-gray-900">Horaires d'ouverture</h3>
              <p className="text-sm text-gray-600">Configuration générale</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-700">Jours d'ouverture:</span>
              <p className="text-sm text-gray-900 mt-1">{getOperatingDaysText()}</p>
            </div>

            <div>
              <span className="text-sm font-medium text-gray-700">Durée des créneaux:</span>
              <p className="text-sm text-gray-900 mt-1">{config.slotSettings.defaultDuration} minutes</p>
            </div>

            <div>
              <span className="text-sm font-medium text-gray-700">Temps de battement:</span>
              <p className="text-sm text-gray-900 mt-1">{config.slotSettings.bufferTime} minutes</p>
            </div>

            <div>
              <span className="text-sm font-medium text-gray-700">Jours de fermeture:</span>
              <p className="text-sm text-gray-900 mt-1">
                {config.closedDates?.length || 0} configurés
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="mt-4 w-full text-sm text-blue-600 hover:text-blue-800 flex items-center justify-center"
          >
            Modifier la configuration
            <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        </div>

        {/* Statistiques des praticiens */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-3">
              <h3 className="font-medium text-gray-900">Praticiens</h3>
              <p className="text-sm text-gray-600">Équipe médicale</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total praticiens:</span>
              <span className="text-sm font-medium text-gray-900">{getActivePractitioners().length}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Médecins:</span>
              <span className="text-sm font-medium text-gray-900">
                {getPractitionersByType('doctor').length}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Spécialistes:</span>
              <span className="text-sm font-medium text-gray-900">
                {getPractitionersByType('specialist').length}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Infirmiers:</span>
              <span className="text-sm font-medium text-gray-900">
                {getPractitionersByType('nurse').length}
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsPractitionerModalOpen(true)}
            className="mt-4 w-full text-sm text-green-600 hover:text-green-800 flex items-center justify-center"
          >
            Gérer les praticiens
            <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        </div>

        {/* Disponibilités */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-3">
              <h3 className="font-medium text-gray-900">Disponibilités</h3>
              <p className="text-sm text-gray-600">Créneaux praticiens</p>
            </div>
          </div>

          <div className="space-y-2">
            {getActivePractitioners().slice(0, 3).map((practitioner) => (
              <div key={practitioner.id} className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${getColorClass(practitioner.color)}`}></div>
                  <span className="text-sm text-gray-900">
                    {practitioner.firstName} {practitioner.lastName}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {getPractitionerAvailabilitySummary(practitioner)}
                </span>
              </div>
            ))}

            {getActivePractitioners().length > 3 && (
              <p className="text-xs text-gray-500 pt-2">
                +{getActivePractitioners().length - 3} autres praticiens
              </p>
            )}
          </div>

          <button
            onClick={() => setIsPractitionerModalOpen(true)}
            className="mt-4 w-full text-sm text-purple-600 hover:text-purple-800 flex items-center justify-center"
          >
            Configurer les disponibilités
            <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>

      {/* Liste détaillée des praticiens */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Praticiens et Disponibilités</h3>
            <button
              onClick={() => setIsPractitionerModalOpen(true)}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
            >
              <Plus className="h-4 w-4 mr-1" />
              Ajouter un praticien
            </button>
          </div>
        </div>

        <div className="p-6">
          {getActivePractitioners().length > 0 ? (
            <div className="space-y-4">
              {getActivePractitioners().map((practitioner) => (
                <div key={practitioner.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-medium ${
                        getColorClass(practitioner.color)
                      }`}>
                        {practitioner.firstName?.[0]}{practitioner.lastName?.[0]}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {practitioner.firstName} {practitioner.lastName}
                        </h4>
                        <p className="text-sm text-gray-600">{practitioner.speciality}</p>
                        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                          <span>{practitioner.email}</span>
                          {practitioner.phone && <span>{practitioner.phone}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {getPractitionerAvailabilitySummary(practitioner)}
                        </p>
                        <p className="text-xs text-gray-500">Disponibilités</p>
                      </div>
                      <button
                        onClick={() => handleManageAvailability(practitioner.id)}
                        className="bg-purple-100 text-purple-700 px-3 py-1 rounded-lg hover:bg-purple-200 transition-colors flex items-center text-sm"
                      >
                        <Calendar className="h-4 w-4 mr-1" />
                        Configurer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">Aucun praticien configuré</h4>
              <p className="text-gray-600 mb-4">
                Ajoutez des praticiens pour commencer à configurer les disponibilités
              </p>
              <button
                onClick={() => setIsPractitionerModalOpen(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Ajouter le premier praticien
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ClinicConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onSave={handleConfigSave}
      />

      <PractitionerManagementModal
        isOpen={isPractitionerModalOpen}
        onClose={() => setIsPractitionerModalOpen(false)}
        onSave={loadData}
      />

      <PractitionerAvailabilityManager
        isOpen={availabilityModalOpen}
        onClose={() => setAvailabilityModalOpen(false)}
        practitionerId={selectedPractitionerId}
        onSave={loadData}
      />
    </div>
  );
};

export default ClinicConfigurationModule;