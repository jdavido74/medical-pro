// components/dashboard/modules/MedicalRecordsModule.js
// Refonte UX : Liste d'historiques avec formulaire au-dessus
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Plus, Search, Edit2, Trash2, User,
  AlertTriangle, ChevronRight, ChevronDown,
  X, Check, UserPlus, Clock, Save, ArrowLeft,
  Pill, FileText, Stethoscope, Eye, Activity, Heart
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
  const formSectionRef = useRef(null);

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
  const [dateFilter, setDateFilter] = useState('all');

  // Rendez-vous du jour
  const [todayAppointments, setTodayAppointments] = useState([]);

  // État du formulaire - null = pas de formulaire ouvert
  const [formState, setFormState] = useState(null); // null | { mode: 'create' } | { mode: 'edit', record: {...} }

  // Onglet actif du formulaire (pour le préserver après sauvegarde)
  const [currentFormTab, setCurrentFormTab] = useState('basic');

  // État de la modal de confirmation de suppression
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ show: false, recordId: null, recordDate: null });

  // État de la modal de visualisation complète du dossier
  const [viewRecordModal, setViewRecordModal] = useState({ show: false, record: null });

  // État de chargement combiné
  const isLoading = patientsLoading || recordsLoading;

  // Permissions
  const canCreateRecords = hasPermission(PERMISSIONS.MEDICAL_RECORDS_CREATE);
  const canEditRecords = hasPermission(PERMISSIONS.MEDICAL_RECORDS_EDIT);
  const canDeleteRecords = hasPermission(PERMISSIONS.MEDICAL_RECORDS_DELETE);

  const patients = useMemo(() => contextPatients, [contextPatients]);

  // Chargement des dossiers du patient sélectionné
  const loadPatientRecords = useCallback(async (patientId) => {
    if (!patientId) {
      setPatientRecords([]);
      return;
    }

    try {
      setIsLoadingRecords(true);
      const result = await fetchPatientRecords(patientId);
      const records = result?.records || result || [];
      // Trier par date décroissante
      const sortedRecords = Array.isArray(records)
        ? [...records].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        : [];
      setPatientRecords(sortedRecords);
    } catch (err) {
      console.error('Error loading patient records:', err);
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
      const todayAppts = (response.appointments || []).filter(apt =>
        apt.date === today && ['scheduled', 'confirmed', 'in_progress'].includes(apt.status)
      );
      todayAppts.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
      setTodayAppointments(todayAppts);
    } catch (err) {
      console.error('Error loading today appointments:', err);
      setTodayAppointments([]);
    }
  }, []);

  useEffect(() => {
    loadTodayAppointments();
  }, [loadTodayAppointments]);

  useEffect(() => {
    if (selectedPatient?.id) {
      loadPatientRecords(selectedPatient.id);
      // Fermer le formulaire quand on change de patient
      setFormState(null);
    }
  }, [selectedPatient?.id, loadPatientRecords]);

  // Filtrer les patients
  const filteredPatients = patients.filter(patient => {
    if (patientSearchQuery) {
      const query = patientSearchQuery.toLowerCase();
      const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
      const patientNumber = (patient.patientNumber || '').toLowerCase();
      if (!fullName.includes(query) && !patientNumber.includes(query)) {
        return false;
      }
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const patientDate = new Date(patient.lastVisit || patient.createdAt);
      if (dateFilter === 'recent' && patientDate < thirtyDaysAgo) return false;
      if (dateFilter === 'older' && patientDate >= thirtyDaysAgo) return false;
    }

    return true;
  });

  // Patients avec rendez-vous aujourd'hui
  const todayPatientIds = new Set(todayAppointments.map(apt => apt.patientId));

  const patientsWithTodayAppointment = useMemo(() => {
    const appointmentsByPatient = todayAppointments.reduce((acc, apt) => {
      if (!acc[apt.patientId]) acc[apt.patientId] = [];
      acc[apt.patientId].push({ time: apt.startTime, type: apt.type, status: apt.status });
      return acc;
    }, {});

    return Object.entries(appointmentsByPatient)
      .map(([patientId, appointments]) => {
        const patient = patients.find(p => p.id === patientId);
        if (patient) {
          appointments.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
          return {
            ...patient,
            appointments,
            appointmentTimes: appointments.map(a => a.time).filter(Boolean),
            firstAppointmentTime: appointments[0]?.time
          };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => (a.firstAppointmentTime || '').localeCompare(b.firstAppointmentTime || ''))
      .filter(patient => {
        if (!patientSearchQuery) return true;
        const query = patientSearchQuery.toLowerCase();
        const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
        const patientNumber = (patient.patientNumber || '').toLowerCase();
        return fullName.includes(query) || patientNumber.includes(query);
      });
  }, [todayAppointments, patients, patientSearchQuery]);

  const otherPatients = filteredPatients.filter(p => !todayPatientIds.has(p.id));

  // Sélection d'un patient
  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setFormState(null);
    setSuccessMessage(null);
    setError(null);
  };

  // Créer un nouveau dossier
  const handleCreateRecord = () => {
    setFormState({ mode: 'create' });
    setCurrentFormTab('basic'); // Reset tab to basic for new records
    setSuccessMessage(null);
    setError(null);
    // Scroll vers le formulaire
    setTimeout(() => {
      formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Éditer un dossier existant
  const handleEditRecord = async (record) => {
    try {
      setIsLoadingRecords(true);
      const fullRecord = await getRecordById(record.id);
      setFormState({ mode: 'edit', record: fullRecord });
      setSuccessMessage(null);
      setError(null);
      // Scroll vers le formulaire
      setTimeout(() => {
        formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      console.error('Error loading record:', err);
      setFormState({ mode: 'edit', record });
    } finally {
      setIsLoadingRecords(false);
    }
  };

  // Ouvrir la modal de visualisation complète
  const handleViewRecord = async (record) => {
    try {
      setIsLoadingRecords(true);
      const fullRecord = await getRecordById(record.id);
      setViewRecordModal({ show: true, record: fullRecord });
    } catch (err) {
      console.error('Error loading record for view:', err);
      setViewRecordModal({ show: true, record });
    } finally {
      setIsLoadingRecords(false);
    }
  };

  // Ouvrir la modal de confirmation de suppression
  const handleDeleteRecord = (record) => {
    const recordDate = record.createdAt
      ? new Date(record.createdAt).toLocaleDateString(i18n.language, { day: '2-digit', month: 'long', year: 'numeric' })
      : '';
    setDeleteConfirmModal({ show: true, recordId: record.id, recordDate });
  };

  // Confirmer la suppression
  const confirmDelete = async () => {
    const { recordId } = deleteConfirmModal;
    setDeleteConfirmModal({ show: false, recordId: null, recordDate: null });

    try {
      await archiveRecord(recordId);
      await loadPatientRecords(selectedPatient?.id);
      setSuccessMessage(t('medical:module.messages.deleteSuccess'));
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(t('medical:module.messages.deleteError'));
    }
  };

  // Annuler la suppression
  const cancelDelete = () => {
    setDeleteConfirmModal({ show: false, recordId: null, recordDate: null });
  };

  // Fermer le formulaire et retourner à la liste
  const handleBackToList = () => {
    setFormState(null);
    setSuccessMessage(null);
  };

  // Soumission du formulaire
  const handleFormSubmit = async (formData) => {
    try {
      if (formState?.mode === 'edit' && formState.record?.id) {
        // Mode édition - exclure patientId
        const { patientId, ...dataWithoutPatientId } = formData;
        await updateRecord(formState.record.id, dataWithoutPatientId);
        setSuccessMessage(t('medical:module.messages.updateSuccess'));

        // Mettre à jour le record dans formState avec les nouvelles données
        const updatedRecord = await getRecordById(formState.record.id);
        setFormState({ mode: 'edit', record: updatedRecord });
      } else {
        // Mode création
        const dataWithPatient = {
          ...formData,
          patientId: selectedPatient?.id
        };
        const newRecord = await createRecord(dataWithPatient);
        setSuccessMessage(t('medical:module.messages.createSuccess'));

        // Passer en mode édition sur le nouveau record
        if (newRecord?.id) {
          const fullRecord = await getRecordById(newRecord.id);
          setFormState({ mode: 'edit', record: fullRecord });
        }
      }

      // Recharger les dossiers du patient
      await loadPatientRecords(selectedPatient?.id);

    } catch (err) {
      console.error('Error saving record:', err);
      setError(t('medical:module.messages.saveError'));
    }
  };

  // Formater la date
  const formatDate = (date) => {
    if (!date) return '-';
    const locale = i18n.language === 'es' ? 'es-ES' : i18n.language === 'en' ? 'en-US' : 'fr-FR';
    return new Date(date).toLocaleDateString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

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

  // Vérifier si un dossier a des traitements ou prescriptions
  const hasContent = (record) => {
    const hasTreatments = record.treatments && record.treatments.length > 0;
    const hasPrescriptions = record.prescriptions && record.prescriptions.length > 0;
    const hasMedications = record.currentMedications && record.currentMedications.length > 0;
    return { hasTreatments, hasPrescriptions, hasMedications };
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
      {/* Messages globaux */}
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
              {['all', 'recent', 'older'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setDateFilter(filter)}
                  className={`flex-1 px-2 py-1.5 text-xs rounded ${
                    dateFilter === filter
                      ? 'bg-green-100 text-green-700 font-medium'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t(`medical:module.masterDetail.filters.${filter}`)}
                </button>
              ))}
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
                                {patient.appointmentTimes?.join(' • ') || patient.appointmentTime}
                                {patient.appointments?.length > 1 && (
                                  <span className="ml-1 text-blue-400">({patient.appointments.length} RDV)</span>
                                )}
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
            /* Patient sélectionné */
            <div className="flex-1 overflow-y-auto">
              {/* En-tête patient */}
              <div className="border-b bg-gray-50 p-4 sticky top-0 z-10">
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
                </div>
              </div>

              {/* Zone de contenu scrollable */}
              <div className="p-4 space-y-4">
                {/* Section Formulaire (si ouvert) */}
                {formState && (
                  <div ref={formSectionRef} className="bg-white border rounded-lg shadow-sm">
                    {/* En-tête du formulaire */}
                    <div className="border-b bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-t-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-white rounded-lg shadow-sm">
                            <Stethoscope className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {formState.mode === 'create'
                                ? t('medical:module.masterDetail.newRecord')
                                : `${formatDate(formState.record?.createdAt)} - ${selectedPatient.firstName} ${selectedPatient.lastName}`}
                            </h3>
                            {formState.mode === 'create' && (
                              <p className="text-sm text-gray-600">
                                {selectedPatient.firstName} {selectedPatient.lastName}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={handleBackToList}
                            className="px-3 py-2 text-gray-600 bg-white border rounded-lg hover:bg-gray-50 text-sm flex items-center space-x-2"
                          >
                            <ArrowLeft className="h-4 w-4" />
                            <span>{t('medical:module.masterDetail.backToList')}</span>
                          </button>
                          {canCreateRecords && (
                            <button
                              onClick={() => formRef.current?.handleSubmit()}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 text-sm"
                            >
                              <Save className="h-4 w-4" />
                              <span>{t('medical:module.masterDetail.save')}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Message de succès dans le formulaire */}
                      {successMessage && (
                        <div className="mt-3 bg-green-100 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                          <div className="flex items-center">
                            <Check className="h-4 w-4 text-green-600 mr-2" />
                            <span className="text-green-800 text-sm">{successMessage}</span>
                          </div>
                          <button onClick={() => setSuccessMessage(null)} className="text-green-600 hover:text-green-800">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Contenu du formulaire */}
                    <div className="p-4">
                      <MedicalRecordForm
                        ref={formRef}
                        patient={selectedPatient}
                        patients={[selectedPatient]}
                        existingRecord={formState.mode === 'edit' ? formState.record : null}
                        lastRecord={patientRecords.length > 0 ? patientRecords[0] : null}
                        initialActiveTab={currentFormTab}
                        onSave={handleFormSubmit}
                        onCancel={handleBackToList}
                        onActiveTabChange={setCurrentFormTab}
                      />
                    </div>
                  </div>
                )}

                {/* Section Liste des historiques */}
                <div className="bg-white border rounded-lg">
                  {/* En-tête de la liste */}
                  <div className="border-b bg-gray-50 p-4 rounded-t-lg flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-gray-600" />
                      <h3 className="font-semibold text-gray-900">
                        {t('medical:module.masterDetail.patientRecords')}
                      </h3>
                      <span className="text-sm text-gray-500">({patientRecords.length})</span>
                    </div>
                    {canCreateRecords && !formState && (
                      <button
                        onClick={handleCreateRecord}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 text-sm"
                      >
                        <Plus className="h-4 w-4" />
                        <span>{t('medical:module.masterDetail.newRecord')}</span>
                      </button>
                    )}
                  </div>

                  {/* Liste des dossiers */}
                  {isLoadingRecords ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                    </div>
                  ) : patientRecords.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>{t('medical:module.masterDetail.noRecordsForPatient')}</p>
                      {canCreateRecords && !formState && (
                        <button
                          onClick={handleCreateRecord}
                          className="mt-4 text-green-600 hover:text-green-700 font-medium text-sm"
                        >
                          {t('medical:module.masterDetail.createFirstRecord')}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {patientRecords.map((record) => {
                        const content = hasContent(record);
                        const isCurrentlyEditing = formState?.mode === 'edit' && formState.record?.id === record.id;

                        return (
                          <div
                            key={record.id}
                            className={`p-4 hover:bg-gray-50 transition-colors ${
                              isCurrentlyEditing ? 'bg-green-50 border-l-4 border-green-500' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                {/* Date en majeur */}
                                <div className="flex items-center space-x-3 mb-2">
                                  <span className="text-lg font-bold text-gray-900">
                                    {formatDate(record.createdAt)}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(record.type)}`}>
                                    {getTypeLabel(record.type)}
                                  </span>
                                  {record.status === 'signed' && (
                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                                      Signé
                                    </span>
                                  )}
                                </div>

                                {/* Motif de consultation */}
                                <p className="text-gray-700 mb-2">
                                  {record.basicInfo?.chiefComplaint || record.diagnosis?.primary || t('medical:module.masterDetail.noDescription')}
                                </p>

                                {/* Icônes indicateurs */}
                                <div className="flex items-center space-x-3 text-sm">
                                  {content.hasTreatments && (
                                    <span className="flex items-center text-purple-600" title="Traitements">
                                      <Pill className="h-4 w-4 mr-1" />
                                      <span>{record.treatments?.length}</span>
                                    </span>
                                  )}
                                  {content.hasMedications && (
                                    <span className="flex items-center text-blue-600" title="Médicaments actuels">
                                      <Stethoscope className="h-4 w-4 mr-1" />
                                      <span>{record.currentMedications?.length}</span>
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center space-x-1 ml-4">
                                {/* Voir le dossier complet */}
                                <button
                                  onClick={() => handleViewRecord(record)}
                                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title={t('medical:module.masterDetail.viewRecord', 'Voir le dossier')}
                                >
                                  <Eye className="h-5 w-5" />
                                </button>
                                {canEditRecords && (
                                  <button
                                    onClick={() => handleEditRecord(record)}
                                    className={`p-2 rounded-lg transition-colors ${
                                      isCurrentlyEditing
                                        ? 'bg-green-100 text-green-700'
                                        : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                                    }`}
                                    title={t('common:edit')}
                                  >
                                    <Edit2 className="h-5 w-5" />
                                  </button>
                                )}
                                {canDeleteRecords && (
                                  <button
                                    onClick={() => handleDeleteRecord(record)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title={t('common:delete')}
                                  >
                                    <Trash2 className="h-5 w-5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmation de suppression */}
      {deleteConfirmModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={cancelDelete}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-red-50 px-6 py-4 border-b border-red-100">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('medical:module.deleteModal.title')}
                </h3>
              </div>
            </div>
            {/* Content */}
            <div className="px-6 py-4">
              <p className="text-gray-600">
                {t('medical:module.deleteModal.message')}
              </p>
              {deleteConfirmModal.recordDate && (
                <p className="mt-2 text-sm text-gray-500">
                  {t('medical:module.deleteModal.recordDate')}: <span className="font-medium">{deleteConfirmModal.recordDate}</span>
                </p>
              )}
              <p className="mt-3 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                {t('medical:module.deleteModal.warning')}
              </p>
            </div>
            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('common:cancel')}
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>{t('common:delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de visualisation du dossier complet */}
      {viewRecordModal.show && viewRecordModal.record && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setViewRecordModal({ show: false, record: null })}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-50 to-green-50 px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {formatDate(viewRecordModal.record.createdAt)} - {selectedPatient?.firstName} {selectedPatient?.lastName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {getTypeLabel(viewRecordModal.record.type)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewRecordModal({ show: false, record: null })}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* === INFORMATIONS DE BASE === */}
              <div className="border-b pb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {t('medical:form.tabs.basic', 'Informations de base')}
                </h4>

                {/* Motif de consultation */}
                {viewRecordModal.record.basicInfo?.chiefComplaint && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">{t('medical:form.chiefComplaint', 'Motif de consultation')}</p>
                    <p className="text-gray-800 bg-gray-50 p-3 rounded-lg">{viewRecordModal.record.basicInfo.chiefComplaint}</p>
                  </div>
                )}

                {/* Symptômes */}
                {viewRecordModal.record.basicInfo?.symptoms?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">{t('medical:form.symptoms', 'Symptômes')}</p>
                    <div className="flex flex-wrap gap-2">
                      {viewRecordModal.record.basicInfo.symptoms.map((s, i) => s && (
                        <span key={i} className="px-2 py-1 bg-orange-100 text-orange-800 text-sm rounded-full">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Durée des symptômes */}
                {viewRecordModal.record.basicInfo?.duration && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('medical:form.symptomsDuration', 'Durée des symptômes')}</p>
                    <p className="text-gray-800">{viewRecordModal.record.basicInfo.duration}</p>
                  </div>
                )}
              </div>

              {/* === SIGNES VITAUX === */}
              {viewRecordModal.record.vitalSigns && Object.values(viewRecordModal.record.vitalSigns).some(v => v && v !== '') && (
                <div className="border-b pb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    {t('medical:form.tabs.vitals', 'Signes vitaux')}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {viewRecordModal.record.vitalSigns.weight && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-xs text-blue-600">{t('medical:form.vitals.weight', 'Poids')}</p>
                        <p className="text-lg font-semibold">{viewRecordModal.record.vitalSigns.weight} kg</p>
                      </div>
                    )}
                    {viewRecordModal.record.vitalSigns.height && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-xs text-blue-600">{t('medical:form.vitals.height', 'Taille')}</p>
                        <p className="text-lg font-semibold">{viewRecordModal.record.vitalSigns.height} cm</p>
                      </div>
                    )}
                    {viewRecordModal.record.vitalSigns.bmi && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-xs text-blue-600">{t('medical:form.vitals.bmi', 'IMC')}</p>
                        <p className="text-lg font-semibold">{viewRecordModal.record.vitalSigns.bmi}</p>
                      </div>
                    )}
                    {viewRecordModal.record.vitalSigns.bloodPressure?.systolic && (
                      <div className="bg-red-50 p-3 rounded-lg">
                        <p className="text-xs text-red-600">{t('medical:form.vitals.bloodPressure', 'Tension')}</p>
                        <p className="text-lg font-semibold">{viewRecordModal.record.vitalSigns.bloodPressure.systolic}/{viewRecordModal.record.vitalSigns.bloodPressure.diastolic}</p>
                      </div>
                    )}
                    {viewRecordModal.record.vitalSigns.heartRate && (
                      <div className="bg-pink-50 p-3 rounded-lg">
                        <p className="text-xs text-pink-600">{t('medical:form.vitals.heartRate', 'Fréquence cardiaque')}</p>
                        <p className="text-lg font-semibold">{viewRecordModal.record.vitalSigns.heartRate} bpm</p>
                      </div>
                    )}
                    {viewRecordModal.record.vitalSigns.temperature && (
                      <div className="bg-orange-50 p-3 rounded-lg">
                        <p className="text-xs text-orange-600">{t('medical:form.vitals.temperature', 'Température')}</p>
                        <p className="text-lg font-semibold">{viewRecordModal.record.vitalSigns.temperature} °C</p>
                      </div>
                    )}
                    {viewRecordModal.record.vitalSigns.respiratoryRate && (
                      <div className="bg-teal-50 p-3 rounded-lg">
                        <p className="text-xs text-teal-600">{t('medical:form.vitals.respiratoryRate', 'Fréquence respiratoire')}</p>
                        <p className="text-lg font-semibold">{viewRecordModal.record.vitalSigns.respiratoryRate} /min</p>
                      </div>
                    )}
                    {viewRecordModal.record.vitalSigns.oxygenSaturation && (
                      <div className="bg-cyan-50 p-3 rounded-lg">
                        <p className="text-xs text-cyan-600">{t('medical:form.vitals.oxygenSaturation', 'Saturation O2')}</p>
                        <p className="text-lg font-semibold">{viewRecordModal.record.vitalSigns.oxygenSaturation} %</p>
                      </div>
                    )}
                  </div>
                  {/* Groupe sanguin */}
                  {viewRecordModal.record.bloodType && (
                    <div className="mt-3">
                      <span className="text-xs text-gray-500">{t('medical:form.vitals.bloodType', 'Groupe sanguin')}:</span>
                      <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-sm font-semibold rounded">{viewRecordModal.record.bloodType}</span>
                    </div>
                  )}
                </div>
              )}

              {/* === ANTÉCÉDENTS === */}
              {viewRecordModal.record.antecedents && (
                <div className="border-b pb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {t('medical:form.tabs.antecedents', 'Antécédents')}
                  </h4>

                  {/* Antécédents personnels - Historique médical */}
                  {viewRecordModal.record.antecedents.personal?.medicalHistory?.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">{t('medical:form.antecedents.medicalHistory', 'Historique médical')}</p>
                      <ul className="list-disc list-inside text-gray-800 bg-gray-50 p-3 rounded-lg text-sm">
                        {viewRecordModal.record.antecedents.personal.medicalHistory.map((h, i) => h && <li key={i}>{h}</li>)}
                      </ul>
                    </div>
                  )}

                  {/* Antécédents personnels - Historique chirurgical */}
                  {viewRecordModal.record.antecedents.personal?.surgicalHistory?.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">{t('medical:form.antecedents.surgicalHistory', 'Historique chirurgical')}</p>
                      <ul className="list-disc list-inside text-gray-800 bg-gray-50 p-3 rounded-lg text-sm">
                        {viewRecordModal.record.antecedents.personal.surgicalHistory.map((s, i) => s && <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}

                  {/* Habitudes - Tabac */}
                  {viewRecordModal.record.antecedents.personal?.habits?.smoking?.status &&
                   viewRecordModal.record.antecedents.personal.habits.smoking.status !== 'never' && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">{t('medical:form.habits.smoking', 'Tabagisme')}</p>
                      <div className="bg-amber-50 p-3 rounded-lg text-sm">
                        <p><span className="font-medium">{t('medical:form.habits.smokingAssessment.status', 'Statut')}:</span> {t(`medical:form.habits.${viewRecordModal.record.antecedents.personal.habits.smoking.status}`, viewRecordModal.record.antecedents.personal.habits.smoking.status)}</p>
                        {viewRecordModal.record.antecedents.personal.habits.smoking.cigarettesPerDay > 0 && (
                          <p><span className="font-medium">{t('medical:form.habits.smokingAssessment.cigarettesPerDay', 'Cigarettes/jour')}:</span> {viewRecordModal.record.antecedents.personal.habits.smoking.cigarettesPerDay}</p>
                        )}
                        {viewRecordModal.record.antecedents.personal.habits.smoking.packYears > 0 && (
                          <p><span className="font-medium">{t('medical:form.habits.smokingAssessment.packYears', 'Paquets-années')}:</span> {viewRecordModal.record.antecedents.personal.habits.smoking.packYears}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Habitudes - Alcool */}
                  {viewRecordModal.record.antecedents.personal?.habits?.alcohol?.status &&
                   viewRecordModal.record.antecedents.personal.habits.alcohol.status !== 'never' && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">{t('medical:form.habits.alcohol', 'Alcool')}</p>
                      <div className="bg-purple-50 p-3 rounded-lg text-sm">
                        <p><span className="font-medium">{t('medical:form.habits.smokingAssessment.status', 'Statut')}:</span> {t(`medical:form.habits.${viewRecordModal.record.antecedents.personal.habits.alcohol.status}`, viewRecordModal.record.antecedents.personal.habits.alcohol.status)}</p>
                        {viewRecordModal.record.antecedents.personal.habits.alcohol.auditCScore > 0 && (
                          <p><span className="font-medium">Score AUDIT-C:</span> {viewRecordModal.record.antecedents.personal.habits.alcohol.auditCScore}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Antécédents familiaux */}
                  {viewRecordModal.record.antecedents.family && Object.values(viewRecordModal.record.antecedents.family).some(v => v) && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t('medical:form.antecedents.family', 'Antécédents familiaux')}</p>
                      <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
                        {viewRecordModal.record.antecedents.family.father && (
                          <p><span className="font-medium">{t('medical:form.antecedents.father', 'Père')}:</span> {viewRecordModal.record.antecedents.family.father}</p>
                        )}
                        {viewRecordModal.record.antecedents.family.mother && (
                          <p><span className="font-medium">{t('medical:form.antecedents.mother', 'Mère')}:</span> {viewRecordModal.record.antecedents.family.mother}</p>
                        )}
                        {viewRecordModal.record.antecedents.family.siblings && (
                          <p><span className="font-medium">{t('medical:form.antecedents.siblings', 'Frères/Sœurs')}:</span> {viewRecordModal.record.antecedents.family.siblings}</p>
                        )}
                        {viewRecordModal.record.antecedents.family.children && (
                          <p><span className="font-medium">{t('medical:form.antecedents.children', 'Enfants')}:</span> {viewRecordModal.record.antecedents.family.children}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* === ALLERGIES === */}
              {viewRecordModal.record.allergies?.length > 0 && (
                <div className="border-b pb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    {t('medical:form.allergies.title', 'Allergies')}
                  </h4>
                  <div className="space-y-2">
                    {viewRecordModal.record.allergies.map((a, i) => (
                      <div key={i} className="bg-red-50 p-3 rounded-lg border-l-4 border-red-400">
                        <p className="font-medium text-red-800">{a.allergen || a}</p>
                        {a.severity && <p className="text-sm text-red-600">{t('medical:form.allergies.severity', 'Sévérité')}: {a.severity}</p>}
                        {a.reaction && <p className="text-sm text-red-600">{t('medical:form.allergies.reaction', 'Réaction')}: {a.reaction}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* === CONDITIONS CHRONIQUES === */}
              {viewRecordModal.record.chronicConditions?.length > 0 && (
                <div className="border-b pb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('medical:form.chronicConditions.title', 'Conditions chroniques')}</h4>
                  <div className="space-y-2">
                    {viewRecordModal.record.chronicConditions.map((c, i) => (
                      <div key={i} className="bg-amber-50 p-3 rounded-lg">
                        <p className="font-medium text-amber-800">{c.condition || c}</p>
                        {c.diagnosisDate && <p className="text-sm text-amber-600">{t('medical:form.chronicConditions.diagnosisDate', 'Date diagnostic')}: {formatDate(c.diagnosisDate)}</p>}
                        {c.status && <p className="text-sm text-amber-600">{t('medical:form.chronicConditions.status', 'Statut')}: {c.status}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* === TRAITEMENT ACTUEL (Médicaments en cours) === */}
              {viewRecordModal.record.currentMedications?.length > 0 && (
                <div className="border-b pb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Pill className="h-4 w-4 text-blue-500" />
                    {t('medical:form.tabs.currentMedications', 'Traitement actuel')}
                  </h4>
                  <div className="space-y-2">
                    {viewRecordModal.record.currentMedications.map((m, i) => (
                      <div key={i} className="bg-blue-50 p-3 rounded-lg flex items-start gap-3">
                        <Pill className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-gray-900">{m.medication}</p>
                          {(m.dosage || m.frequency) && <p className="text-sm text-gray-600">{m.dosage} {m.frequency && `- ${m.frequency}`}</p>}
                          {m.notes && <p className="text-xs text-gray-500 mt-1">{m.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* === DIAGNOSTIC === */}
              {(viewRecordModal.record.diagnosis?.primary || viewRecordModal.record.diagnosis?.secondary?.length > 0) && (
                <div className="border-b pb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Stethoscope className="h-4 w-4" />
                    {t('medical:form.tabs.diagnosis', 'Diagnostic')}
                  </h4>
                  {viewRecordModal.record.diagnosis.primary && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">{t('medical:form.diagnosis.primary', 'Diagnostic principal')}</p>
                      <p className="text-gray-800 bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-400 font-medium">{viewRecordModal.record.diagnosis.primary}</p>
                    </div>
                  )}
                  {viewRecordModal.record.diagnosis.secondary?.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">{t('medical:form.diagnosis.secondary', 'Diagnostics secondaires')}</p>
                      <ul className="list-disc list-inside text-gray-700 text-sm bg-yellow-50/50 p-3 rounded-lg">
                        {viewRecordModal.record.diagnosis.secondary.map((d, i) => d && <li key={i}>{d}</li>)}
                      </ul>
                    </div>
                  )}
                  {viewRecordModal.record.diagnosis.icd10?.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t('medical:form.diagnosis.icd10Codes', 'Codes CIM-10')}</p>
                      <div className="flex flex-wrap gap-2">
                        {viewRecordModal.record.diagnosis.icd10.map((code, i) => code && (
                          <span key={i} className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded font-mono">{code}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* === EXAMEN PHYSIQUE === */}
              {viewRecordModal.record.physicalExam && Object.values(viewRecordModal.record.physicalExam).some(v => v) && (
                <div className="border-b pb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    {t('medical:form.tabs.exam', 'Examen physique')}
                  </h4>
                  <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
                    {viewRecordModal.record.physicalExam.general && (
                      <div><span className="text-xs text-gray-500 font-medium">{t('medical:form.physicalExam.general', 'Général')}:</span> <span className="text-gray-800">{viewRecordModal.record.physicalExam.general}</span></div>
                    )}
                    {viewRecordModal.record.physicalExam.cardiovascular && (
                      <div><span className="text-xs text-gray-500 font-medium">{t('medical:form.physicalExam.cardiovascular', 'Cardiovasculaire')}:</span> <span className="text-gray-800">{viewRecordModal.record.physicalExam.cardiovascular}</span></div>
                    )}
                    {viewRecordModal.record.physicalExam.respiratory && (
                      <div><span className="text-xs text-gray-500 font-medium">{t('medical:form.physicalExam.respiratory', 'Respiratoire')}:</span> <span className="text-gray-800">{viewRecordModal.record.physicalExam.respiratory}</span></div>
                    )}
                    {viewRecordModal.record.physicalExam.abdomen && (
                      <div><span className="text-xs text-gray-500 font-medium">{t('medical:form.physicalExam.abdomen', 'Abdomen')}:</span> <span className="text-gray-800">{viewRecordModal.record.physicalExam.abdomen}</span></div>
                    )}
                    {viewRecordModal.record.physicalExam.neurological && (
                      <div><span className="text-xs text-gray-500 font-medium">{t('medical:form.physicalExam.neurological', 'Neurologique')}:</span> <span className="text-gray-800">{viewRecordModal.record.physicalExam.neurological}</span></div>
                    )}
                    {viewRecordModal.record.physicalExam.other && (
                      <div><span className="text-xs text-gray-500 font-medium">{t('medical:form.physicalExam.otherSystems', 'Autre')}:</span> <span className="text-gray-800">{viewRecordModal.record.physicalExam.other}</span></div>
                    )}
                  </div>
                </div>
              )}

              {/* === TRAITEMENTS PRESCRITS === */}
              {viewRecordModal.record.treatments?.length > 0 && (
                <div className="border-b pb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Pill className="h-4 w-4 text-purple-500" />
                    {t('medical:form.tabs.treatments', 'Traitements prescrits')}
                  </h4>
                  <div className="space-y-2">
                    {viewRecordModal.record.treatments.map((tr, i) => (
                      <div key={i} className="bg-purple-50 p-3 rounded-lg">
                        <p className="font-medium text-gray-900">{tr.medication}</p>
                        <div className="text-sm text-gray-600 mt-1 space-y-0.5">
                          {tr.dosage && <p>{t('medical:form.dosage', 'Dosage')}: {tr.dosage}</p>}
                          {tr.frequency && <p>{t('medical:form.frequency', 'Fréquence')}: {tr.frequency}</p>}
                          {tr.route && <p>{t('medical:form.treatment.route', 'Voie')}: {tr.route}</p>}
                          {tr.duration && <p>{t('medical:form.duration', 'Durée')}: {tr.duration}</p>}
                          {tr.startDate && <p>{t('medical:form.treatment.startDate', 'Début')}: {formatDate(tr.startDate)}</p>}
                          {tr.endDate && <p>{t('medical:form.treatment.endDate', 'Fin')}: {formatDate(tr.endDate)}</p>}
                          {tr.status && <p>{t('medical:form.treatment.status', 'Statut')}: <span className={`px-1.5 py-0.5 rounded text-xs ${tr.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{tr.status}</span></p>}
                        </div>
                        {tr.notes && <p className="text-xs text-gray-500 mt-2 italic">{tr.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* === PLAN DE TRAITEMENT === */}
              {viewRecordModal.record.treatmentPlan && (viewRecordModal.record.treatmentPlan.recommendations?.length > 0 || viewRecordModal.record.treatmentPlan.followUp || viewRecordModal.record.treatmentPlan.tests?.length > 0) && (
                <div className="border-b pb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {t('medical:form.tabs.plan', 'Plan')}
                  </h4>
                  {viewRecordModal.record.treatmentPlan.recommendations?.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">{t('medical:form.planTab.recommendations', 'Recommandations')}</p>
                      <ul className="list-disc list-inside text-gray-800 bg-green-50 p-3 rounded-lg">
                        {viewRecordModal.record.treatmentPlan.recommendations.map((r, i) => r && <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}
                  {viewRecordModal.record.treatmentPlan.followUp && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">{t('medical:form.planTab.nextFollowUp', 'Prochain suivi')}</p>
                      <p className="text-gray-800 bg-blue-50 p-2 rounded inline-block">{formatDate(viewRecordModal.record.treatmentPlan.followUp)}</p>
                    </div>
                  )}
                  {viewRecordModal.record.treatmentPlan.tests?.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t('medical:form.planTab.requestedTests', 'Examens demandés')}</p>
                      <ul className="list-disc list-inside text-gray-800 bg-cyan-50 p-3 rounded-lg">
                        {viewRecordModal.record.treatmentPlan.tests.map((te, i) => te && <li key={i}>{te}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* === NOTES === */}
              {viewRecordModal.record.notes && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('medical:form.notes', 'Notes')}</h4>
                  <p className="text-gray-800 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">{viewRecordModal.record.notes}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center flex-shrink-0">
              <button
                onClick={() => {
                  setViewRecordModal({ show: false, record: null });
                  handleEditRecord(viewRecordModal.record);
                }}
                className="px-4 py-2 text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors flex items-center space-x-2"
              >
                <Edit2 className="h-4 w-4" />
                <span>{t('common:edit')}</span>
              </button>
              <button
                onClick={() => setViewRecordModal({ show: false, record: null })}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('common:close', 'Fermer')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalRecordsModule;
