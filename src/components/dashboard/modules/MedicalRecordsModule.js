// components/dashboard/modules/MedicalRecordsModule.js
// Refonte UX : Layout Master-Detail pour une saisie optimisée
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Plus, Search, Edit2, Trash2, Eye, User,
  AlertTriangle, ChevronRight, ChevronDown,
  X, Check, History, UserPlus, Clock, Save
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../auth/PermissionGuard';
import { PERMISSIONS } from '../../../utils/permissionsStorage';
import { useMedicalRecords } from '../../../contexts/MedicalRecordContext';
import { usePatients } from '../../../contexts/PatientContext';
import { appointmentsApi } from '../../../api/appointmentsApi';
import MedicalRecordForm from '../../medical/MedicalRecordForm';

const MedicalRecordsModule = ({ navigateToPatient }) => {
  const { t, i18n } = useTranslation(['medical', 'common']);
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const formRef = useRef(null);

  // Utiliser les contextes
  const {
    isLoading: recordsLoading,
    createRecord,
    updateRecord,
    archiveRecord,
    getRecordById,
    getPatientRecords: fetchPatientRecords,
    getRecordsByPatient
  } = useMedicalRecords();

  const { patients: contextPatients, isLoading: patientsLoading } = usePatients();

  // State local pour l'UI
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientRecords, setPatientRecords] = useState([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Filtres patients
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // all, recent, older

  // Rendez-vous du jour
  const [todayAppointments, setTodayAppointments] = useState([]);

  // État du formulaire
  const [formMode, setFormMode] = useState('new'); // 'new' | 'edit' | 'view'
  const [editingRecord, setEditingRecord] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  // État de chargement combiné
  const isLoading = patientsLoading || recordsLoading;

  // Permissions depuis le système de permissions (clinic_roles)
  const canCreateRecords = hasPermission(PERMISSIONS.MEDICAL_RECORDS_CREATE);
  const canEditRecords = hasPermission(PERMISSIONS.MEDICAL_RECORDS_EDIT);
  const canDeleteRecords = hasPermission(PERMISSIONS.MEDICAL_RECORDS_DELETE);
  const canViewAllPatients = hasPermission(PERMISSIONS.MEDICAL_RECORDS_VIEW_ALL) || hasPermission(PERMISSIONS.PATIENTS_VIEW_ALL);

  // Les patients sont déjà filtrés par le backend selon l'équipe de soins (patient_care_team)
  // Pas besoin de filtrage supplémentaire côté client car:
  // - L'API /patients retourne uniquement les patients auxquels l'utilisateur a accès
  // - Le middleware backend vérifie les permissions via patient_care_team
  const patients = useMemo(() => {
    return contextPatients;
  }, [contextPatients]);

  // Chargement des dossiers du patient sélectionné via le contexte
  const loadPatientRecords = useCallback(async (patientId) => {
    if (!patientId) {
      setPatientRecords([]);
      return;
    }

    try {
      setIsLoadingRecords(true);
      // Utiliser la méthode du contexte pour récupérer les dossiers du patient
      const records = await fetchPatientRecords(patientId);
      setPatientRecords(records || []);
    } catch (err) {
      console.error('Error loading patient records:', err);
      // Fallback: filtrer localement si l'API échoue
      const localRecords = getRecordsByPatient(patientId);
      setPatientRecords(localRecords);
    } finally {
      setIsLoadingRecords(false);
    }
  }, [fetchPatientRecords, getRecordsByPatient]);

  // Chargement des rendez-vous du jour
  const loadTodayAppointments = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await appointmentsApi.getAppointments({ limit: 100 });

      // Filtrer les rendez-vous du jour avec statut scheduled ou confirmed
      const todayAppts = (response.appointments || []).filter(apt =>
        apt.date === today && ['scheduled', 'confirmed', 'in_progress'].includes(apt.status)
      );

      // Trier par heure de début
      todayAppts.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

      setTodayAppointments(todayAppts);
    } catch (err) {
      console.error('Error loading today appointments:', err);
      setTodayAppointments([]);
    }
  }, []);

  // Charger les rendez-vous du jour au démarrage
  useEffect(() => {
    loadTodayAppointments();
  }, [loadTodayAppointments]);

  useEffect(() => {
    if (selectedPatient?.id) {
      loadPatientRecords(selectedPatient.id);
    }
  }, [selectedPatient?.id, loadPatientRecords]);

  // Filtrer les patients
  const filteredPatients = patients.filter(patient => {
    // Filtre recherche
    if (patientSearchQuery) {
      const query = patientSearchQuery.toLowerCase();
      const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
      const patientNumber = (patient.patientNumber || '').toLowerCase();
      if (!fullName.includes(query) && !patientNumber.includes(query)) {
        return false;
      }
    }

    // Filtre date (basé sur le dernier dossier ou date de création)
    if (dateFilter !== 'all') {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const patientDate = new Date(patient.lastVisit || patient.createdAt);

      if (dateFilter === 'recent' && patientDate < thirtyDaysAgo) {
        return false;
      }
      if (dateFilter === 'older' && patientDate >= thirtyDaysAgo) {
        return false;
      }
    }

    return true;
  });

  // Patients avec rendez-vous aujourd'hui (triés par heure)
  const todayPatientIds = new Set(todayAppointments.map(apt => apt.patientId));

  // Associer les patients aux rendez-vous du jour pour afficher l'heure
  const patientsWithTodayAppointment = todayAppointments
    .map(apt => {
      const patient = patients.find(p => p.id === apt.patientId);
      if (patient) {
        return {
          ...patient,
          appointmentTime: apt.startTime,
          appointmentType: apt.type,
          appointmentStatus: apt.status
        };
      }
      return null;
    })
    .filter(Boolean)
    // Appliquer le filtre de recherche aux patients du jour aussi
    .filter(patient => {
      if (!patientSearchQuery) return true;
      const query = patientSearchQuery.toLowerCase();
      const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
      const patientNumber = (patient.patientNumber || '').toLowerCase();
      return fullName.includes(query) || patientNumber.includes(query);
    });

  // Autres patients (sans rendez-vous aujourd'hui)
  const otherPatients = filteredPatients.filter(p => !todayPatientIds.has(p.id));

  // Sélection d'un patient
  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setFormMode('new');
    setEditingRecord(null);
    setShowHistory(false);
    setSuccessMessage(null);
  };

  // Créer un nouveau dossier
  const handleNewRecord = () => {
    setFormMode('new');
    setEditingRecord(null);
    setShowHistory(false);
  };

  // Éditer un dossier existant
  const handleEditRecord = async (record) => {
    try {
      // Utiliser la méthode du contexte
      const fullRecord = await getRecordById(record.id);
      setEditingRecord(fullRecord);
      setFormMode('edit');
      setShowHistory(false);
    } catch (err) {
      console.error('Error loading record:', err);
      setEditingRecord(record);
      setFormMode('edit');
    }
  };

  // Voir un dossier
  const handleViewRecord = async (record) => {
    try {
      // Utiliser la méthode du contexte
      const fullRecord = await getRecordById(record.id);
      setEditingRecord(fullRecord);
      setFormMode('view');
    } catch (err) {
      setEditingRecord(record);
      setFormMode('view');
    }
  };

  // Supprimer un dossier
  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm(t('medical:module.messages.deleteConfirm'))) return;

    try {
      // Utiliser la méthode du contexte (optimistic update inclus)
      await archiveRecord(recordId);
      // Recharger les dossiers du patient
      await loadPatientRecords(selectedPatient?.id);
      setSuccessMessage(t('medical:module.messages.deleteSuccess'));
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(t('medical:module.messages.deleteError'));
    }
  };

  // Soumission du formulaire
  const handleFormSubmit = async (formData) => {
    try {
      const dataWithPatient = {
        ...formData,
        patientId: selectedPatient?.id
      };

      if (formMode === 'edit' && editingRecord?.id) {
        // Utiliser la méthode du contexte (optimistic update inclus)
        await updateRecord(editingRecord.id, dataWithPatient);
        setSuccessMessage(t('medical:module.messages.updateSuccess'));
      } else {
        // Utiliser la méthode du contexte (optimistic update inclus)
        await createRecord(dataWithPatient);
        setSuccessMessage(t('medical:module.messages.createSuccess'));
      }

      // Recharger les dossiers du patient
      await loadPatientRecords(selectedPatient?.id);

      // Réinitialiser le formulaire
      setFormMode('new');
      setEditingRecord(null);

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error saving record:', err);
      setError(t('medical:module.messages.saveError'));
    }
  };

  // Formater la date selon la locale
  const formatDate = (date) => {
    if (!date) return '-';
    const locale = i18n.language === 'es' ? 'es-ES' : i18n.language === 'en' ? 'en-US' : 'fr-FR';
    return new Date(date).toLocaleDateString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Type de consultation avec traduction
  const getTypeLabel = (type) => {
    return t(`medical:module.types.${type}`) || type || t('medical:module.types.consultation');
  };

  const getTypeColor = (type) => {
    const colors = {
      consultation: 'bg-blue-100 text-blue-700',
      examination: 'bg-green-100 text-green-700',
      treatment: 'bg-purple-100 text-purple-700',
      follow_up: 'bg-orange-100 text-orange-700',
      emergency: 'bg-red-100 text-red-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('medical:module.masterDetail.loadingPatients')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Messages */}
      {error && (
        <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
            <span className="text-red-800 text-sm">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="mx-4 mt-3 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center">
            <Check className="h-4 w-4 text-green-600 mr-2" />
            <span className="text-green-800 text-sm">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-green-600 hover:text-green-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Layout Master-Detail */}
      <div className="flex-1 flex overflow-hidden">
        {/* Panel gauche - Liste des patients */}
        <div className="w-80 border-r bg-gray-50 flex flex-col">
          {/* Recherche et filtres patients */}
          <div className="p-3 border-b bg-white space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('medical:module.masterDetail.searchPatients')}
                value={patientSearchQuery}
                onChange={(e) => setPatientSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="flex space-x-1">
              <button
                onClick={() => setDateFilter('all')}
                className={`flex-1 px-2 py-1.5 text-xs rounded ${
                  dateFilter === 'all'
                    ? 'bg-green-100 text-green-700 font-medium'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t('medical:module.masterDetail.filters.all')}
              </button>
              <button
                onClick={() => setDateFilter('recent')}
                className={`flex-1 px-2 py-1.5 text-xs rounded ${
                  dateFilter === 'recent'
                    ? 'bg-green-100 text-green-700 font-medium'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t('medical:module.masterDetail.filters.recent')}
              </button>
              <button
                onClick={() => setDateFilter('older')}
                className={`flex-1 px-2 py-1.5 text-xs rounded ${
                  dateFilter === 'older'
                    ? 'bg-green-100 text-green-700 font-medium'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t('medical:module.masterDetail.filters.older')}
              </button>
            </div>
          </div>

          {/* Liste des patients */}
          <div className="flex-1 overflow-y-auto">
            {patientsWithTodayAppointment.length === 0 && otherPatients.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                <User className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>{t('medical:module.masterDetail.noPatientFound')}</p>
              </div>
            ) : (
              <>
                {/* Section: Rendez-vous du jour */}
                {patientsWithTodayAppointment.length > 0 && (
                  <div>
                    <div className="px-3 py-2 bg-blue-50 border-b border-blue-100 sticky top-0 z-10">
                      <div className="flex items-center text-blue-700 text-xs font-semibold">
                        <Clock className="h-3.5 w-3.5 mr-1.5" />
                        {t('medical:module.masterDetail.todayAppointments')} ({patientsWithTodayAppointment.length})
                      </div>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {patientsWithTodayAppointment.map((patient) => (
                        <button
                          key={`today-${patient.id}`}
                          onClick={() => handleSelectPatient(patient)}
                          className={`w-full p-3 text-left hover:bg-blue-50 transition-colors ${
                            selectedPatient?.id === patient.id ? 'bg-blue-100 border-l-4 border-blue-500' : 'bg-blue-50/30'
                          }`}
                        >
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                              <Clock className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {patient.firstName} {patient.lastName}
                              </p>
                              <p className="text-xs text-blue-600 font-medium">
                                {patient.appointmentTime} • {patient.appointmentType || t('medical:module.types.consultation')}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-blue-400" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section: Autres patients */}
                {otherPatients.length > 0 && (
                  <div>
                    {patientsWithTodayAppointment.length > 0 && (
                      <div className="px-3 py-2 bg-gray-100 border-b border-gray-200 sticky top-0 z-10">
                        <div className="flex items-center text-gray-600 text-xs font-semibold">
                          <User className="h-3.5 w-3.5 mr-1.5" />
                          {t('medical:module.masterDetail.allPatients')} ({otherPatients.length})
                        </div>
                      </div>
                    )}
                    <div className="divide-y divide-gray-200">
                      {otherPatients.map((patient) => (
                        <button
                          key={patient.id}
                          onClick={() => handleSelectPatient(patient)}
                          className={`w-full p-3 text-left hover:bg-gray-100 transition-colors ${
                            selectedPatient?.id === patient.id ? 'bg-green-50 border-l-4 border-green-500' : ''
                          }`}
                        >
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
                              <User className="h-5 w-5 text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {patient.firstName} {patient.lastName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {patient.patientNumber || t('medical:module.masterDetail.noPatientNumber')}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Compteur patients */}
          <div className="p-2 border-t bg-white text-center text-xs text-gray-500">
            {t('medical:module.masterDetail.patientCount', { count: patientsWithTodayAppointment.length + otherPatients.length })}
          </div>
        </div>

        {/* Panel droit - Zone de travail */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {!selectedPatient ? (
            /* État initial - Pas de patient sélectionné */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <UserPlus className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h2 className="text-xl font-semibold text-gray-600 mb-2">
                  {t('medical:module.masterDetail.selectPatient')}
                </h2>
                <p className="text-gray-500 max-w-md">
                  {t('medical:module.masterDetail.selectPatientDescription')}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* En-tête patient sélectionné */}
              <div className="border-b bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mr-4">
                      <User className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">
                        {selectedPatient.firstName} {selectedPatient.lastName}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {selectedPatient.patientNumber && `N° ${selectedPatient.patientNumber} • `}
                        {t('medical:module.masterDetail.records', { count: patientRecords.length })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Toggle historique */}
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className={`px-3 py-2 rounded-lg text-sm flex items-center space-x-2 transition-colors ${
                        showHistory
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <History className="h-4 w-4" />
                      <span>{t('medical:module.masterDetail.history')}</span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Bouton Enregistrer */}
                    {canCreateRecords && formMode !== 'view' && (
                      <button
                        onClick={() => formRef.current?.handleSubmit()}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 text-sm"
                      >
                        <Save className="h-4 w-4" />
                        <span>{t('medical:module.masterDetail.save')}</span>
                      </button>
                    )}

                    {/* Nouveau dossier */}
                    {canCreateRecords && (
                      <button
                        onClick={handleNewRecord}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 text-sm"
                      >
                        <Plus className="h-4 w-4" />
                        <span>{t('medical:module.masterDetail.newRecord')}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Historique dropdown */}
                {showHistory && patientRecords.length > 0 && (
                  <div className="mt-4 bg-white rounded-lg border max-h-48 overflow-y-auto">
                    {patientRecords.map((record) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-3 hover:bg-gray-50 border-b last:border-b-0"
                      >
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(record.type)}`}>
                            {getTypeLabel(record.type)}
                          </span>
                          <span className="text-sm text-gray-900">
                            {record.basicInfo?.chiefComplaint || record.diagnosis?.primary || t('medical:module.masterDetail.noDescription')}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(record.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleViewRecord(record)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title={t('medical:module.masterDetail.view')}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {canEditRecords && (
                            <button
                              onClick={() => handleEditRecord(record)}
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                              title={t('common:edit')}
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                          {canDeleteRecords && (
                            <button
                              onClick={() => handleDeleteRecord(record.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title={t('common:delete')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {showHistory && patientRecords.length === 0 && (
                  <div className="mt-4 bg-gray-100 rounded-lg p-4 text-center text-sm text-gray-500">
                    {t('medical:module.masterDetail.noRecordsForPatient')}
                  </div>
                )}
              </div>

              {/* Zone formulaire */}
              <div className="flex-1 overflow-y-auto">
                {isLoadingRecords ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                  </div>
                ) : (
                  <div className="h-full">
                    {formMode === 'view' && editingRecord ? (
                      /* Mode visualisation */
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {t('medical:module.masterDetail.viewRecord')}
                          </h3>
                          <div className="flex space-x-2">
                            {canEditRecords && (
                              <button
                                onClick={() => setFormMode('edit')}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center space-x-2"
                              >
                                <Edit2 className="h-4 w-4" />
                                <span>{t('common:edit')}</span>
                              </button>
                            )}
                            <button
                              onClick={() => { setFormMode('new'); setEditingRecord(null); }}
                              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                            >
                              {t('medical:module.masterDetail.close')}
                            </button>
                          </div>
                        </div>

                        {/* Affichage en lecture seule */}
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-500 mb-1">{t('medical:module.masterDetail.type')}</label>
                              <p className="text-gray-900">{getTypeLabel(editingRecord.type)}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-500 mb-1">{t('medical:module.masterDetail.date')}</label>
                              <p className="text-gray-900">{formatDate(editingRecord.createdAt)}</p>
                            </div>
                          </div>

                          {editingRecord.basicInfo?.chiefComplaint && (
                            <div>
                              <label className="block text-sm font-medium text-gray-500 mb-1">{t('medical:module.masterDetail.consultationReason')}</label>
                              <p className="text-gray-900">{editingRecord.basicInfo.chiefComplaint}</p>
                            </div>
                          )}

                          {editingRecord.diagnosis?.primary && (
                            <div>
                              <label className="block text-sm font-medium text-gray-500 mb-1">{t('medical:diagnosis')}</label>
                              <p className="text-gray-900">{editingRecord.diagnosis.primary}</p>
                            </div>
                          )}

                          {editingRecord.treatments?.length > 0 && (
                            <div>
                              <label className="block text-sm font-medium text-gray-500 mb-1">{t('medical:module.masterDetail.treatments')}</label>
                              <ul className="list-disc list-inside text-gray-900">
                                {editingRecord.treatments.map((t, i) => (
                                  <li key={i}>{t.medication} - {t.dosage}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {editingRecord.notes && (
                            <div>
                              <label className="block text-sm font-medium text-gray-500 mb-1">{t('medical:notes')}</label>
                              <p className="text-gray-900 whitespace-pre-wrap">{editingRecord.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Mode formulaire (new ou edit) */
                      <MedicalRecordForm
                        ref={formRef}
                        patient={selectedPatient}
                        patients={[selectedPatient]}
                        existingRecord={editingRecord}
                        lastRecord={patientRecords.length > 0 ? patientRecords[0] : null}
                        onSave={handleFormSubmit}
                        onCancel={() => { setFormMode('new'); setEditingRecord(null); }}
                      />
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MedicalRecordsModule;
