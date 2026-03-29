// components/dashboard/modules/MedicalRecordsModule.js
// Refonte UX : Liste d'historiques avec formulaire au-dessus
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Plus, Search, Edit2, Trash2, User,
  AlertTriangle, ChevronRight, ChevronLeft, ChevronDown,
  X, Check, UserPlus, Clock, Save, ArrowLeft,
  Pill, FileText, Stethoscope, Eye, Activity, Heart, Printer
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../auth/PermissionGuard';
import { PERMISSIONS } from '../../../utils/permissionsStorage';
import { useMedicalRecords } from '../../../contexts/MedicalRecordContext';
import { usePatients } from '../../../contexts/PatientContext';
import { appointmentsApi } from '../../../api/appointmentsApi';
import MedicalRecordForm from '../../medical/MedicalRecordForm';

// Sous-composant pour la liste groupée par épisode (accordéon parent/enfants)
const GroupedRecordsList = React.memo(({
  patientRecords, formState, hasContent, formatDate, getTypeColor, getTypeLabel,
  handleViewRecord, handleEditRecord, handleDeleteRecord, handleCreateEvolution,
  canEditRecords, canDeleteRecords, t
}) => {
  const [expandedParents, setExpandedParents] = useState({});

  const toggleParent = useCallback((parentId) => {
    setExpandedParents(prev => ({ ...prev, [parentId]: !prev[parentId] }));
  }, []);

  // Group records: parents with their evolutions sorted chronologically
  const groupedParents = useMemo(() => {
    if (!patientRecords.length) return [];

    const sorted = [...patientRecords].sort(
      (a, b) => new Date(b.recordDate || b.createdAt) - new Date(a.recordDate || a.createdAt)
    );

    const parentMap = new Map();
    const parents = [];

    for (const record of sorted) {
      if (record.parentRecordId) {
        if (!parentMap.has(record.parentRecordId)) {
          parentMap.set(record.parentRecordId, []);
        }
        parentMap.get(record.parentRecordId).push(record);
      } else {
        parents.push(record);
      }
    }

    const result = [];
    for (const parent of parents) {
      const evos = (parentMap.get(parent.id) || []).sort(
        (a, b) => new Date(a.recordDate || a.createdAt) - new Date(b.recordDate || b.createdAt)
      );
      result.push({ ...parent, _evolutions: evos });
      parentMap.delete(parent.id);
    }

    // Orphaned evolutions (parent not loaded) — show as standalone
    for (const [, evos] of parentMap) {
      for (const evo of evos) {
        result.push({ ...evo, _evolutions: [], _isOrphan: true });
      }
    }

    return result;
  }, [patientRecords]);

  // Action buttons for a record row
  const renderActions = (record, isEvolution = false) => {
    const isCurrentlyEditing = formState?.mode === 'edit' && formState.record?.id === record.id;
    return (
      <div className="flex items-center gap-1 ml-3 flex-shrink-0">
        <button
          onClick={() => handleViewRecord(record)}
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title={t('medical:module.masterDetail.viewRecord', 'Ver historial')}
        >
          <Eye className={isEvolution ? 'h-4 w-4' : 'h-5 w-5'} />
        </button>
        {canEditRecords && (
          <button
            onClick={() => handleEditRecord(record)}
            className={`p-1.5 rounded-lg transition-colors ${
              isCurrentlyEditing
                ? 'bg-green-100 text-green-700'
                : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
            }`}
            title={t('common:edit')}
          >
            <Edit2 className={isEvolution ? 'h-4 w-4' : 'h-5 w-5'} />
          </button>
        )}
        {canDeleteRecords && (
          <button
            onClick={() => handleDeleteRecord(record)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title={t('common:delete')}
          >
            <Trash2 className={isEvolution ? 'h-4 w-4' : 'h-5 w-5'} />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="divide-y overflow-hidden">
      {groupedParents.map((parent) => {
        const hasEvolutions = parent._evolutions.length > 0;
        const isExpanded = expandedParents[parent.id] ?? false;
        const content = hasContent(parent);
        const isCurrentlyEditing = formState?.mode === 'edit' && formState.record?.id === parent.id;
        // A parent is "active" (can receive evolutions) if it's not signed/archived
        // and is the most recent parent (first in the list)
        const isActiveParent = parent.status !== 'signed' && parent.status !== 'archived';

        return (
          <div key={parent.id} className={`bg-white ${isCurrentlyEditing ? 'ring-2 ring-green-300 ring-inset' : ''}`}>
            {/* Parent row */}
            <div className="flex items-center">
              {/* Chevron */}
              <button
                onClick={() => hasEvolutions && toggleParent(parent.id)}
                className={`flex items-center justify-center w-8 flex-shrink-0 self-stretch transition-colors ${
                  hasEvolutions ? 'hover:bg-gray-100 cursor-pointer text-gray-500' : 'text-gray-200 cursor-default'
                }`}
              >
                {hasEvolutions ? (
                  isExpanded
                    ? <ChevronDown className="h-4 w-4" />
                    : <ChevronRight className="h-4 w-4" />
                ) : (
                  <span className="w-4" />
                )}
              </button>

              {/* Parent content — single compact line */}
              <div className="flex-1 min-w-0 py-3 pr-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <span className="font-bold text-gray-900 whitespace-nowrap">
                      {formatDate(parent.recordDate || parent.createdAt)}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${getTypeColor(parent.type)}`}>
                      {getTypeLabel(parent.type)}
                    </span>
                    {hasEvolutions && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 whitespace-nowrap">
                        {t('medical:episode.badge', 'Episodio')} ({parent._evolutions.length})
                      </span>
                    )}
                    {parent.status === 'signed' && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 whitespace-nowrap">
                        {t('medical:episode.signed', 'Firmado')}
                      </span>
                    )}
                    {content.hasTreatments && (
                      <span className="flex items-center text-purple-500 text-xs whitespace-nowrap">
                        <Pill className="h-3.5 w-3.5 mr-0.5" />{parent.treatments?.length}
                      </span>
                    )}
                    {content.hasMedications && (
                      <span className="flex items-center text-blue-500 text-xs whitespace-nowrap">
                        <Stethoscope className="h-3.5 w-3.5 mr-0.5" />{parent.currentMedications?.length}
                      </span>
                    )}
                  </div>
                  {renderActions(parent)}
                </div>
                <p className="text-sm text-gray-600 truncate mt-0.5">
                  {parent.basicInfo?.chiefComplaint || parent.diagnosis?.primary || t('medical:module.masterDetail.noDescription')}
                </p>
              </div>
            </div>

            {/* Collapsed hint: clickable episode count */}
            {hasEvolutions && !isExpanded && (
              <div className="pl-8 pb-1">
                <button
                  onClick={() => toggleParent(parent.id)}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <Activity className="h-3 w-3" />
                  {parent._evolutions.length} {t('medical:episode.evolutions', 'evolución(es)')}
                </button>
              </div>
            )}

            {/* Expanded accordion: evolutions */}
            {isExpanded && (
              <div className="bg-gray-50/30" style={{ maxWidth: '100%' }}>
                {parent._evolutions.map((evo) => {
                  const evoEditing = formState?.mode === 'edit' && formState.record?.id === evo.id;
                  return (
                    <div
                      key={evo.id}
                      className={`border-l-2 border-blue-200 ml-8 py-2 px-3 hover:bg-blue-50/40 transition-colors ${
                        evoEditing ? 'bg-green-50 border-l-4 border-green-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-blue-400">↳</span>
                            <span className="text-sm font-medium text-gray-700">
                              {formatDate(evo.recordDate || evo.createdAt)}
                            </span>
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600">
                              {t('medical:episode.evolution', 'Evolución')}
                            </span>
                          </div>
                          {(evo.basicInfo?.chiefComplaint || evo.evolution) && (
                            <p className="text-xs text-gray-500 mt-1 break-words">
                              {evo.basicInfo?.chiefComplaint || evo.evolution}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          {renderActions(evo, true)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Action buttons — ALWAYS visible for active parents */}
            {canEditRecords && isActiveParent && (
              <div className="pl-8 py-1.5 flex items-center gap-2">
                <button
                  onClick={() => handleCreateEvolution(parent)}
                  className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 text-xs font-medium"
                >
                  {t('medical:episode.addEvolution', 'Añadir una evolución')}
                </button>
                <button
                  onClick={() => handleViewRecord(parent)}
                  className="border border-gray-300 text-gray-600 px-3 py-1 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1.5 text-xs font-medium"
                >
                  <FileText className="h-3.5 w-3.5" />
                  {t('medical:episode.finishHistory', 'Terminar el historial')}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});

const MedicalRecordsModule = ({ navigateToPatient }) => {
  const { t, i18n } = useTranslation(['medical', 'common']);
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const location = useLocation();
  const formRef = useRef(null);
  const formSectionRef = useRef(null);

  // Utiliser les contextes
  const {
    isLoading: recordsLoading,
    archiveRecord,
    getRecordById,
    getPatientRecords: fetchPatientRecords,
    getRecordsByPatient,
    refreshRecords
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
  const [panelCollapsed, setPanelCollapsed] = useState(false); // Patient list panel collapsed

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

  // Handle navigation from patient detail modal (location.state)
  useEffect(() => {
    if (location.state?.patientId && patients.length > 0) {
      const targetPatient = patients.find(p => p.id === location.state.patientId);
      if (targetPatient && selectedPatient?.id !== targetPatient.id) {
        setSelectedPatient(targetPatient);
        if (location.state.createNew) {
          setTimeout(() => {
            setFormState({ mode: 'create' });
            setPanelCollapsed(true);
          }, 100);
        } else if (location.state.recordId) {
          setTimeout(async () => {
            try {
              const fullRecord = await getRecordById(location.state.recordId);
              setFormState({ mode: 'edit', record: fullRecord });
              setPanelCollapsed(true);
            } catch (err) {
              console.error('Error loading record from navigation:', err);
            }
          }, 100);
        }
      }
      // Clear location state to avoid re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [location.state, patients]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setPanelCollapsed(true);
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
      setPanelCollapsed(true);
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

  // Créer une évolution liée à un dossier parent (épisode clinique)
  const handleCreateEvolution = (parentRecord) => {
    setFormState({ mode: 'create', parentRecordId: parentRecord.id });
    setCurrentFormTab('vitals');
    setPanelCollapsed(true);
    setSuccessMessage(null);
    setError(null);
    setTimeout(() => {
      formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
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
    setPanelCollapsed(false);
    setSuccessMessage(null);
  };

  // Soumission du formulaire
  // Callback appelé par MedicalRecordForm APRÈS qu'il a déjà sauvegardé via l'API.
  // On ne refait PAS d'appel API ici — on met juste à jour l'état local.
  const handleFormSubmit = async (savedRecord) => {
    try {
      if (formState?.mode === 'edit' && formState.record?.id) {
        setSuccessMessage(t('medical:module.messages.updateSuccess'));

        // Mettre à jour le record dans formState avec les nouvelles données
        const updatedRecord = await getRecordById(formState.record.id);
        setFormState({ mode: 'edit', record: updatedRecord });
      } else {
        // Mode création — le record a déjà été créé par MedicalRecordForm
        setSuccessMessage(t('medical:module.messages.createSuccess'));

        // Passer en mode édition sur le nouveau record
        const recordId = savedRecord?.id;
        if (recordId) {
          const fullRecord = await getRecordById(recordId);
          setFormState({ mode: 'edit', record: fullRecord });
        }
      }

      // Rafraîchir le contexte et les dossiers du patient
      if (refreshRecords) {
        await refreshRecords();
      }
      await loadPatientRecords(selectedPatient?.id);

    } catch (err) {
      console.error('Error saving record:', err);
      setError(t('medical:module.messages.saveError'));
    }
  };

  // Formater la date
  const formatDate = (date, includeTime = true) => {
    if (!date) return '-';
    const locale = i18n.language === 'es' ? 'es-ES' : i18n.language === 'en' ? 'en-US' : 'fr-FR';
    const d = new Date(date);
    const datePart = d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
    if (!includeTime) return datePart;
    const timePart = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    return `${datePart} ${timePart}`;
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
        {/* Panel gauche - Liste des patients (collapsible) */}
        {!panelCollapsed && (
          <div className="w-64 xl:w-80 border-r bg-gray-50 flex flex-col flex-shrink-0">
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
        )}

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
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              {/* En-tête patient */}
              <div className="border-b bg-gray-50 p-4 sticky top-0 z-10">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center min-w-0">
                    <button
                      onClick={() => setPanelCollapsed(!panelCollapsed)}
                      className="p-1.5 mr-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                      title={panelCollapsed
                        ? t('medical:module.masterDetail.showPatients', 'Afficher les patients')
                        : t('medical:module.masterDetail.hidePatients', 'Masquer les patients')
                      }
                    >
                      {panelCollapsed
                        ? <ChevronRight className="h-5 w-5 text-gray-500" />
                        : <ChevronLeft className="h-5 w-5 text-gray-500" />
                      }
                    </button>
                    <div className="w-10 h-10 xl:w-12 xl:h-12 rounded-full bg-green-100 flex items-center justify-center mr-3 flex-shrink-0">
                      <User className="h-5 w-5 xl:h-6 xl:w-6 text-green-600" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base xl:text-lg font-bold text-gray-900 truncate">
                        {selectedPatient.firstName} {selectedPatient.lastName}
                      </h2>
                      <p className="text-sm text-gray-500 truncate">
                        {selectedPatient.patientNumber && `N° ${selectedPatient.patientNumber} • `}
                        {t('medical:module.masterDetail.records', { count: patientRecords.length })}
                      </p>
                    </div>
                  </div>
                  {!formState && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {panelCollapsed && (
                        <button
                          onClick={() => setPanelCollapsed(false)}
                          className="px-3 py-2 text-gray-600 bg-white border rounded-lg hover:bg-gray-50 text-sm flex items-center gap-2"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          <span className="hidden xl:inline">{t('medical:module.masterDetail.backToList', 'Volver')}</span>
                        </button>
                      )}
                      {canCreateRecords && (
                        <button
                          onClick={handleCreateRecord}
                          className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
                        >
                          <Plus className="h-4 w-4" />
                          <span className="hidden xl:inline">{t('medical:module.masterDetail.newRecord')}</span>
                        </button>
                      )}
                    </div>
                  )}
                  {formState && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={handleBackToList}
                        className="px-3 py-2 text-gray-600 bg-white border rounded-lg hover:bg-gray-50 text-sm flex items-center gap-2"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="hidden xl:inline">{t('medical:module.masterDetail.backToList')}</span>
                      </button>
                      {canCreateRecords && (
                        <button
                          onClick={() => formRef.current?.handleSubmit()}
                          className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
                        >
                          <Save className="h-4 w-4" />
                          <span className="hidden xl:inline">{t('medical:module.masterDetail.save')}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Zone de contenu scrollable */}
              <div className="p-4 space-y-4">
                {/* Section Formulaire (si ouvert) */}
                {formState && (
                  <div ref={formSectionRef} className="bg-white border rounded-lg shadow-sm">
                    {/* En-tête du formulaire */}
                    <div className="border-b bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-t-lg">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-white rounded-lg shadow-sm flex-shrink-0">
                          <Stethoscope className="h-5 w-5 text-green-600" />
                        </div>
                        <h3 className="font-semibold text-gray-900 truncate">
                          {formState.mode === 'create'
                            ? (formState.parentRecordId
                              ? t('medical:episode.newEvolution', 'Nueva evolución')
                              : t('medical:module.masterDetail.newRecord'))
                            : formatDate(formState.record?.createdAt)}
                        </h3>
                        {formState.mode === 'edit' && !formState.record?.parentRecordId && canEditRecords && (
                          <button
                            onClick={() => handleCreateEvolution(formState.record)}
                            className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors flex items-center gap-1 flex-shrink-0"
                          >
                            <Plus className="h-4 w-4" />
                            {t('medical:episode.addEvolution', 'Évolution')}
                          </button>
                        )}
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
                        parentRecordId={formState?.parentRecordId || null}
                        onSave={handleFormSubmit}
                        onCancel={handleBackToList}
                        onActiveTabChange={setCurrentFormTab}
                        hideFooter
                      />
                    </div>
                  </div>
                )}

                {/* Section Liste des historiques */}
                <div className="bg-white border rounded-lg">
                  {/* En-tête de la liste */}
                  <div className="border-b bg-gray-50 p-4 rounded-t-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-gray-600 flex-shrink-0" />
                    <h3 className="font-semibold text-gray-900">
                      {t('medical:module.masterDetail.patientRecords')}
                    </h3>
                    <span className="text-sm text-gray-500">({patientRecords.length})</span>
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
                    <GroupedRecordsList
                      patientRecords={patientRecords}
                      formState={formState}
                      hasContent={hasContent}
                      formatDate={formatDate}
                      getTypeColor={getTypeColor}
                      getTypeLabel={getTypeLabel}
                      handleViewRecord={handleViewRecord}
                      handleEditRecord={handleEditRecord}
                      handleDeleteRecord={handleDeleteRecord}
                      handleCreateEvolution={handleCreateEvolution}
                      canEditRecords={canEditRecords}
                      canDeleteRecords={canDeleteRecords}
                      t={t}
                    />
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
            {(() => { const record = viewRecordModal.record; return (
            <div className="flex-1 overflow-y-auto p-6 space-y-4" data-print-record>

              {/* Parent link if this is an evolution */}
              {record.parentRecordId && (
                <div className="text-sm text-blue-600 italic mb-2">
                  {t('medical:episode.evolutionOf', 'Evolución del historial inicial')}
                </div>
              )}

              {/* === INFORMACIÓN BÁSICA === */}
              <section className="border-b border-gray-200 pb-4">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                  {t('medical:form.tabs.basic', 'Informations de base')}
                </h4>
                {record.basicInfo?.chiefComplaint && (
                  <div className="mb-2">
                    <p className="text-sm text-gray-500 mb-1">{t('medical:form.chiefComplaint', 'Motif de consultation')}</p>
                    <p className="text-sm text-gray-700">{record.basicInfo.chiefComplaint}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-6 mb-2">
                  {record.recordDate && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">{t('medical:form.recordDate', 'Date')}</p>
                      <p className="text-sm text-gray-700">{formatDate(record.recordDate)}</p>
                    </div>
                  )}
                  {record.type && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">{t('medical:form.recordType', 'Type')}</p>
                      <p className="text-sm text-gray-700">{getTypeLabel(record.type)}</p>
                    </div>
                  )}
                </div>
                {record.basicInfo?.symptoms?.length > 0 && (
                  <div className="mb-2">
                    <p className="text-sm text-gray-500 mb-1">{t('medical:form.symptoms', 'Symptômes')}</p>
                    <p className="text-sm text-gray-700">{record.basicInfo.symptoms.filter(Boolean).join(', ')}</p>
                  </div>
                )}
                {record.basicInfo?.duration && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">{t('medical:form.symptomsDuration', 'Durée des symptômes')}</p>
                    <p className="text-sm text-gray-700">{record.basicInfo.duration}</p>
                  </div>
                )}
              </section>

              {/* === ENFERMEDAD ACTUAL === */}
              {record.currentIllness && (
                <section className="border-b border-gray-200 pb-4">
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                    {t('medical:form.tabs.currentIllness', 'Maladie actuelle')}
                  </h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{record.currentIllness}</p>
                </section>
              )}

              {/* === CONSTANTES VITALES === */}
              {record.vitalSigns && Object.values(record.vitalSigns).some(v => v && v !== '') && (
                <section className="border-b border-gray-200 pb-4">
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                    {t('medical:form.tabs.vitals', 'Signes vitaux')}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2">
                    {record.vitalSigns.weight && (
                      <div>
                        <p className="text-sm text-gray-500">{t('medical:form.vitals.weight', 'Poids')}</p>
                        <p className="text-sm text-gray-700">{record.vitalSigns.weight} kg</p>
                      </div>
                    )}
                    {record.vitalSigns.height && (
                      <div>
                        <p className="text-sm text-gray-500">{t('medical:form.vitals.height', 'Taille')}</p>
                        <p className="text-sm text-gray-700">{record.vitalSigns.height} cm</p>
                      </div>
                    )}
                    {record.vitalSigns.bmi && (
                      <div>
                        <p className="text-sm text-gray-500">{t('medical:form.vitals.bmi', 'IMC')}</p>
                        <p className="text-sm text-gray-700">{record.vitalSigns.bmi}</p>
                      </div>
                    )}
                    {record.vitalSigns.bloodPressure?.systolic && (
                      <div>
                        <p className="text-sm text-gray-500">{t('medical:form.vitals.bloodPressure', 'Tension')}</p>
                        <p className="text-sm text-gray-700">{record.vitalSigns.bloodPressure.systolic}/{record.vitalSigns.bloodPressure.diastolic}</p>
                      </div>
                    )}
                    {record.vitalSigns.heartRate && (
                      <div>
                        <p className="text-sm text-gray-500">{t('medical:form.vitals.heartRate', 'Fréquence cardiaque')}</p>
                        <p className="text-sm text-gray-700">{record.vitalSigns.heartRate} bpm</p>
                      </div>
                    )}
                    {record.vitalSigns.temperature && (
                      <div>
                        <p className="text-sm text-gray-500">{t('medical:form.vitals.temperature', 'Température')}</p>
                        <p className="text-sm text-gray-700">{record.vitalSigns.temperature} °C</p>
                      </div>
                    )}
                    {record.vitalSigns.respiratoryRate && (
                      <div>
                        <p className="text-sm text-gray-500">{t('medical:form.vitals.respiratoryRate', 'Fréquence respiratoire')}</p>
                        <p className="text-sm text-gray-700">{record.vitalSigns.respiratoryRate} /min</p>
                      </div>
                    )}
                    {record.vitalSigns.oxygenSaturation && (
                      <div>
                        <p className="text-sm text-gray-500">{t('medical:form.vitals.oxygenSaturation', 'Saturation O2')}</p>
                        <p className="text-sm text-gray-700">{record.vitalSigns.oxygenSaturation} %</p>
                      </div>
                    )}
                    {record.vitalSigns.bloodGlucose && (
                      <div>
                        <p className="text-sm text-gray-500">{t('medical:form.vitals.bloodGlucose', 'Glycémie')}</p>
                        <p className="text-sm text-gray-700">{record.vitalSigns.bloodGlucose} mg/dL</p>
                      </div>
                    )}
                  </div>
                  {record.bloodType && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">{t('medical:form.vitals.bloodType', 'Groupe sanguin')}</p>
                      <p className="text-sm text-gray-700">{record.bloodType}</p>
                    </div>
                  )}
                </section>
              )}

              {/* === ANTÉCÉDENTS === */}
              {record.antecedents && (
                <section className="border-b border-gray-200 pb-4">
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                    {t('medical:form.tabs.antecedents', 'Antécédents')}
                  </h4>
                  {record.antecedents.personal?.medicalHistory?.length > 0 && (
                    <div className="mb-2">
                      <p className="text-sm text-gray-500 mb-1">{t('medical:form.antecedents.medicalHistory', 'Historique médical')}</p>
                      <ul className="list-disc list-inside text-sm text-gray-700">
                        {record.antecedents.personal.medicalHistory.map((h, i) => h && <li key={i}>{h}</li>)}
                      </ul>
                    </div>
                  )}
                  {record.antecedents.personal?.surgicalHistory?.length > 0 && (
                    <div className="mb-2">
                      <p className="text-sm text-gray-500 mb-1">{t('medical:form.antecedents.surgicalHistory', 'Historique chirurgical')}</p>
                      <ul className="list-disc list-inside text-sm text-gray-700">
                        {record.antecedents.personal.surgicalHistory.map((s, i) => s && <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {record.antecedents.personal?.habits?.smoking?.status &&
                   record.antecedents.personal.habits.smoking.status !== 'never' && (
                    <div className="mb-2">
                      <p className="text-sm text-gray-500 mb-1">{t('medical:form.habits.smoking', 'Tabagisme')}</p>
                      <div className="text-sm text-gray-700 space-y-0.5">
                        <p>{t('medical:form.habits.smokingAssessment.status', 'Statut')}: {t(`medical:form.habits.${record.antecedents.personal.habits.smoking.status}`, record.antecedents.personal.habits.smoking.status)}</p>
                        {record.antecedents.personal.habits.smoking.cigarettesPerDay > 0 && (
                          <p>{t('medical:form.habits.smokingAssessment.cigarettesPerDay', 'Cigarettes/jour')}: {record.antecedents.personal.habits.smoking.cigarettesPerDay}</p>
                        )}
                        {record.antecedents.personal.habits.smoking.packYears > 0 && (
                          <p>{t('medical:form.habits.smokingAssessment.packYears', 'Paquets-années')}: {record.antecedents.personal.habits.smoking.packYears}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {record.antecedents.personal?.habits?.alcohol?.status &&
                   record.antecedents.personal.habits.alcohol.status !== 'never' && (
                    <div className="mb-2">
                      <p className="text-sm text-gray-500 mb-1">{t('medical:form.habits.alcohol', 'Alcool')}</p>
                      <div className="text-sm text-gray-700 space-y-0.5">
                        <p>{t('medical:form.habits.smokingAssessment.status', 'Statut')}: {t(`medical:form.habits.${record.antecedents.personal.habits.alcohol.status}`, record.antecedents.personal.habits.alcohol.status)}</p>
                        {record.antecedents.personal.habits.alcohol.auditCScore > 0 && (
                          <p>Score AUDIT-C: {record.antecedents.personal.habits.alcohol.auditCScore}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {record.antecedents.family && Object.values(record.antecedents.family).some(v => v) && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">{t('medical:form.antecedents.family', 'Antécédents familiaux')}</p>
                      <div className="text-sm text-gray-700 space-y-0.5">
                        {record.antecedents.family.father && (
                          <p>{t('medical:form.antecedents.father', 'Père')}: {record.antecedents.family.father}</p>
                        )}
                        {record.antecedents.family.mother && (
                          <p>{t('medical:form.antecedents.mother', 'Mère')}: {record.antecedents.family.mother}</p>
                        )}
                        {record.antecedents.family.siblings && (
                          <p>{t('medical:form.antecedents.siblings', 'Frères/Sœurs')}: {record.antecedents.family.siblings}</p>
                        )}
                        {record.antecedents.family.children && (
                          <p>{t('medical:form.antecedents.children', 'Enfants')}: {record.antecedents.family.children}</p>
                        )}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* === ALLERGIES === */}
              {record.allergies?.length > 0 && (
                <section className="border-b border-gray-200 pb-4">
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                    {t('medical:form.allergies.title', 'Allergies')}
                  </h4>
                  <div className="space-y-1">
                    {record.allergies.map((a, i) => (
                      <div key={i} className="text-sm text-gray-700">
                        <span>{a.allergen || a}</span>
                        {a.severity && <span> — {t('medical:form.allergies.severity', 'Sévérité')}: {a.severity}</span>}
                        {a.reaction && <span> — {t('medical:form.allergies.reaction', 'Réaction')}: {a.reaction}</span>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* === CONDITIONS CHRONIQUES === */}
              {record.chronicConditions?.length > 0 && (
                <section className="border-b border-gray-200 pb-4">
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                    {t('medical:form.chronicConditions.title', 'Conditions chroniques')}
                  </h4>
                  <div className="space-y-1">
                    {record.chronicConditions.map((c, i) => (
                      <div key={i} className="text-sm text-gray-700">
                        <span>{c.condition || c}</span>
                        {c.diagnosisDate && <span> — {t('medical:form.chronicConditions.diagnosisDate', 'Date diagnostic')}: {formatDate(c.diagnosisDate)}</span>}
                        {c.status && <span> — {t('medical:form.chronicConditions.status', 'Statut')}: {c.status}</span>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* === TRAITEMENT ACTUEL === */}
              {record.currentMedications?.length > 0 && (
                <section className="border-b border-gray-200 pb-4">
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                    {t('medical:form.tabs.currentMedications', 'Traitement actuel')}
                  </h4>
                  <div className="space-y-1">
                    {record.currentMedications.map((m, i) => (
                      <div key={i} className="text-sm text-gray-700">
                        <span>{m.medication}</span>
                        {(m.dosage || m.frequency) && <span> — {m.dosage}{m.frequency && ` - ${m.frequency}`}</span>}
                        {m.notes && <span className="text-gray-500"> ({m.notes})</span>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* === DIAGNOSTIC === */}
              {(record.diagnosis?.primary || record.diagnosis?.secondary?.length > 0) && (
                <section className="border-b border-gray-200 pb-4">
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                    {t('medical:form.tabs.diagnosis', 'Diagnostic')}
                  </h4>
                  {record.diagnosis.primary && (
                    <div className="mb-2">
                      <p className="text-sm text-gray-500 mb-1">{t('medical:form.diagnosis.primary', 'Diagnostic principal')}</p>
                      <p className="text-sm text-gray-700">{record.diagnosis.primary}</p>
                    </div>
                  )}
                  {record.diagnosis.secondary?.length > 0 && (
                    <div className="mb-2">
                      <p className="text-sm text-gray-500 mb-1">{t('medical:form.diagnosis.secondary', 'Diagnostics secondaires')}</p>
                      <ul className="list-disc list-inside text-sm text-gray-700">
                        {record.diagnosis.secondary.map((d, i) => d && <li key={i}>{d}</li>)}
                      </ul>
                    </div>
                  )}
                  {record.diagnosis.icd10?.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">{t('medical:form.diagnosis.icd10Codes', 'Codes CIM-10')}</p>
                      <p className="text-sm text-gray-700">{record.diagnosis.icd10.filter(Boolean).join(', ')}</p>
                    </div>
                  )}
                </section>
              )}

              {/* === EXAMEN PHYSIQUE === */}
              {record.physicalExam && Object.values(record.physicalExam).some(v => v) && (
                <section className="border-b border-gray-200 pb-4">
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                    {t('medical:form.tabs.exam', 'Examen physique')}
                  </h4>
                  <div className="space-y-1">
                    {record.physicalExam.general && (
                      <div className="text-sm"><span className="text-gray-500">{t('medical:form.physicalExam.general', 'Général')}:</span> <span className="text-gray-700">{record.physicalExam.general}</span></div>
                    )}
                    {record.physicalExam.cardiovascular && (
                      <div className="text-sm"><span className="text-gray-500">{t('medical:form.physicalExam.cardiovascular', 'Cardiovasculaire')}:</span> <span className="text-gray-700">{record.physicalExam.cardiovascular}</span></div>
                    )}
                    {record.physicalExam.respiratory && (
                      <div className="text-sm"><span className="text-gray-500">{t('medical:form.physicalExam.respiratory', 'Respiratoire')}:</span> <span className="text-gray-700">{record.physicalExam.respiratory}</span></div>
                    )}
                    {record.physicalExam.abdomen && (
                      <div className="text-sm"><span className="text-gray-500">{t('medical:form.physicalExam.abdomen', 'Abdomen')}:</span> <span className="text-gray-700">{record.physicalExam.abdomen}</span></div>
                    )}
                    {record.physicalExam.neurological && (
                      <div className="text-sm"><span className="text-gray-500">{t('medical:form.physicalExam.neurological', 'Neurologique')}:</span> <span className="text-gray-700">{record.physicalExam.neurological}</span></div>
                    )}
                    {record.physicalExam.other && (
                      <div className="text-sm"><span className="text-gray-500">{t('medical:form.physicalExam.otherSystems', 'Autre')}:</span> <span className="text-gray-700">{record.physicalExam.other}</span></div>
                    )}
                  </div>
                </section>
              )}

              {/* === ÉVOLUTION === */}
              {record.evolution && (
                <section className="border-b border-gray-200 pb-4">
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                    {t('medical:form.tabs.evolution', 'Évolution')}
                  </h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{record.evolution}</p>
                </section>
              )}

              {/* === EVOLUCIONES (child records — clinical episode) === */}
              {record.evolutions?.length > 0 && (
                <section className="border-b border-gray-200 pb-4">
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                    {t('medical:episode.evolutions', 'Evoluciones')} ({record.evolutions.length})
                  </h4>
                  <div className="space-y-3">
                    {record.evolutions.map((evo) => (
                      <div key={evo.id} className="py-2">
                        <p className="text-sm font-semibold text-gray-900 mb-1">{formatDate(evo.recordDate)}</p>
                        {evo.chiefComplaint && (
                          <div className="mb-1">
                            <p className="text-xs text-gray-500">{t('medical:form.chiefComplaint', 'Motivo')}</p>
                            <p className="text-sm text-gray-700">{evo.chiefComplaint}</p>
                          </div>
                        )}
                        {evo.evolution && (
                          <div className="mb-1">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{evo.evolution}</p>
                          </div>
                        )}
                        {evo.currentIllness && (
                          <div className="mb-1">
                            <p className="text-xs text-gray-500">{t('medical:form.tabs.currentIllness', 'Enfermedad actual')}</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{evo.currentIllness}</p>
                          </div>
                        )}
                        {evo.diagnosis?.primary && (
                          <div className="mb-1">
                            <p className="text-xs text-gray-500">{t('medical:form.tabs.diagnosis', 'Diagnóstico')}</p>
                            <p className="text-sm text-gray-700">{evo.diagnosis.primary}</p>
                          </div>
                        )}
                        {evo.treatments?.length > 0 && (
                          <div className="mb-1">
                            <p className="text-xs text-gray-500">{t('medical:form.tabs.treatments', 'Tratamientos')}</p>
                            <div className="text-sm text-gray-700">
                              {evo.treatments.map((tr, i) => (
                                <span key={i}>{tr.medication}{tr.dosage ? ` (${tr.dosage})` : ''}{i < evo.treatments.length - 1 ? ', ' : ''}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {evo.vitalSigns && Object.values(evo.vitalSigns).some(v => v) && (
                          <div className="mb-1">
                            <p className="text-xs text-gray-500">{t('medical:form.tabs.vitals', 'Constantes')}</p>
                            <div className="text-sm text-gray-700 flex flex-wrap gap-3">
                              {evo.vitalSigns.weight && <span>Peso: {evo.vitalSigns.weight}kg</span>}
                              {evo.vitalSigns.bloodPressure?.systolic && <span>TA: {evo.vitalSigns.bloodPressure.systolic}/{evo.vitalSigns.bloodPressure.diastolic}</span>}
                              {evo.vitalSigns.heartRate && <span>FC: {evo.vitalSigns.heartRate}</span>}
                              {evo.vitalSigns.temperature && <span>T°: {evo.vitalSigns.temperature}°C</span>}
                              {evo.vitalSigns.oxygenSaturation && <span>SpO2: {evo.vitalSigns.oxygenSaturation}%</span>}
                            </div>
                          </div>
                        )}
                        {evo.notes && (
                          <div>
                            <p className="text-xs text-gray-500">{t('medical:form.notes', 'Notas')}</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{evo.notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* === TRAITEMENTS PRESCRITS === */}
              {record.treatments?.length > 0 && (
                <section className="border-b border-gray-200 pb-4">
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                    {t('medical:form.tabs.treatments', 'Traitements prescrits')}
                  </h4>
                  <div className="space-y-2">
                    {record.treatments.map((tr, i) => (
                      <div key={i} className="text-sm text-gray-700">
                        <p>{tr.medication}</p>
                        <div className="text-sm text-gray-700 space-y-0.5 ml-2">
                          {tr.dosage && <p>{t('medical:form.dosage', 'Dosage')}: {tr.dosage}</p>}
                          {tr.frequency && <p>{t('medical:form.frequency', 'Fréquence')}: {tr.frequency}</p>}
                          {tr.route && <p>{t('medical:form.treatment.route', 'Voie')}: {tr.route}</p>}
                          {tr.duration && <p>{t('medical:form.duration', 'Durée')}: {tr.duration}</p>}
                          {tr.startDate && <p>{t('medical:form.treatment.startDate', 'Début')}: {formatDate(tr.startDate)}</p>}
                          {tr.endDate && <p>{t('medical:form.treatment.endDate', 'Fin')}: {formatDate(tr.endDate)}</p>}
                          {tr.status && <p>{t('medical:form.treatment.status', 'Statut')}: {tr.status}</p>}
                        </div>
                        {tr.notes && <p className="text-sm text-gray-500 ml-2 italic">{tr.notes}</p>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* === PLAN DE TRAITEMENT === */}
              {record.treatmentPlan && (record.treatmentPlan.recommendations?.length > 0 || record.treatmentPlan.followUp || record.treatmentPlan.tests?.length > 0) && (
                <section className="border-b border-gray-200 pb-4">
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                    {t('medical:form.tabs.plan', 'Plan')}
                  </h4>
                  {record.treatmentPlan.recommendations?.length > 0 && (
                    <div className="mb-2">
                      <p className="text-sm text-gray-500 mb-1">{t('medical:form.planTab.recommendations', 'Recommandations')}</p>
                      <ul className="list-disc list-inside text-sm text-gray-700">
                        {record.treatmentPlan.recommendations.map((r, i) => r && <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}
                  {record.treatmentPlan.followUp && (
                    <div className="mb-2">
                      <p className="text-sm text-gray-500 mb-1">{t('medical:form.planTab.nextFollowUp', 'Prochain suivi')}</p>
                      <p className="text-sm text-gray-700">{formatDate(record.treatmentPlan.followUp)}</p>
                    </div>
                  )}
                  {record.treatmentPlan.tests?.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">{t('medical:form.planTab.requestedTests', 'Examens demandés')}</p>
                      <ul className="list-disc list-inside text-sm text-gray-700">
                        {record.treatmentPlan.tests.map((te, i) => te && <li key={i}>{te}</li>)}
                      </ul>
                    </div>
                  )}
                </section>
              )}

              {/* === NOTES === */}
              {record.notes && (
                <section>
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                    {t('medical:form.notes', 'Notes')}
                  </h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{record.notes}</p>
                </section>
              )}
            </div>
            ); })()}

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-2">
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
                  onClick={() => {
                    // Print the modal content as PDF via browser print dialog
                    const contentEl = document.querySelector('[data-print-record]');
                    if (!contentEl) return;
                    const printFrame = document.createElement('iframe');
                    printFrame.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:800px;height:600px;';
                    document.body.appendChild(printFrame);
                    const doc = printFrame.contentDocument;
                    const style = doc.createElement('style');
                    style.textContent = `
                      body { font-family: Arial, sans-serif; padding: 40px; color: #111; max-width: 800px; margin: 0 auto; font-size: 14px; }
                      h1 { font-size: 20px; border-bottom: 2px solid #111; padding-bottom: 8px; }
                      h4 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin: 16px 0 8px 0; }
                      section { border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 4px; }
                      p { margin: 4px 0; }
                      .print-footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #ccc; font-size: 11px; color: #9ca3af; }
                    `;
                    doc.head.appendChild(style);
                    const header = doc.createElement('h1');
                    header.textContent = `${selectedPatient?.firstName || ''} ${selectedPatient?.lastName || ''} — ${formatDate(viewRecordModal.record.recordDate || viewRecordModal.record.createdAt)}`;
                    doc.body.appendChild(header);
                    // Clone the scrollable content
                    const clone = contentEl.cloneNode(true);
                    doc.body.appendChild(clone);
                    // Footer
                    const footer = doc.createElement('div');
                    footer.className = 'print-footer';
                    footer.textContent = `${t('medical:print.generated', 'Generado el')} ${new Date().toLocaleDateString()} — MediMaestro`;
                    doc.body.appendChild(footer);
                    printFrame.contentWindow.onafterprint = () => document.body.removeChild(printFrame);
                    setTimeout(() => { printFrame.contentWindow.print(); }, 300);
                  }}
                  className="px-4 py-2 text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors flex items-center space-x-2"
                >
                  <Printer className="h-4 w-4" />
                  <span>{t('medical:print.button', 'Imprimir PDF')}</span>
                </button>
              </div>
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
