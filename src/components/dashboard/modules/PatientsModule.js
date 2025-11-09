// components/dashboard/modules/PatientsModule.js
import React, { useState, useEffect, useContext } from 'react';
import {
  Users, Search, Edit2, Eye, UserPlus,
  Phone, Mail, MapPin, Calendar, AlertCircle,
  Heart, Shield, Activity, Archive, Stethoscope
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { PatientContext } from '../../../contexts/PatientContext';
import { usePermissions } from '../../auth/PermissionGuard';
import { PERMISSIONS } from '../../../utils/permissionsStorage';
import { initializeSamplePatients, patientsStorage } from '../../../utils/patientsStorage';
import PatientFormModal from '../modals/PatientFormModal';
import PatientDetailModal from '../modals/PatientDetailModal';
import MedicalHistoryModal from '../modals/MedicalHistoryModal';

const PatientsModule = ({ selectedPatientId, setSelectedPatientId }) => {
  const { t } = useTranslation('patients');
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const patientContext = useContext(PatientContext);

  // État local du module
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('active');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isMedicalHistoryModalOpen, setIsMedicalHistoryModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [viewingPatient, setViewingPatient] = useState(null);
  const [viewingMedicalHistory, setViewingMedicalHistory] = useState(null);

  // Permissions basées sur les permissions système - US nouvelles
  const canViewMedicalData = hasPermission(PERMISSIONS.MEDICAL_RECORDS_VIEW);
  const canEditPatients = hasPermission(PERMISSIONS.PATIENTS_EDIT);
  const canCreatePatients = hasPermission(PERMISSIONS.PATIENTS_CREATE);
  const canDeletePatients = hasPermission(PERMISSIONS.PATIENTS_DELETE);
  const canViewAllData = hasPermission(PERMISSIONS.PATIENTS_VIEW_ALL);

  useEffect(() => {
    // Initialiser les données de démonstration si c'est la première visite
    initializeSamplePatients();
  }, []);

  useEffect(() => {
    if (selectedPatientId && patientContext?.patients?.length > 0) {
      const patient = patientContext.patients.find(p => p.id === selectedPatientId);
      if (patient) {
        handleViewPatient(patient);
        setSelectedPatientId && setSelectedPatientId(null);
      }
    }
  }, [selectedPatientId, patientContext?.patients, setSelectedPatientId]);

  useEffect(() => {
    filterPatients();
  }, [patientContext?.patients, searchQuery, filterType]);

  const filterPatients = () => {
    let filtered = [...(patientContext?.patients || [])];

    // Filtre par statut
    if (filterType === 'active') {
      filtered = filtered.filter(p => p.status === 'active');
    } else if (filterType === 'inactive') {
      filtered = filtered.filter(p => p.status === 'inactive');
    }

    // Recherche textuelle
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(patient =>
        patient.firstName?.toLowerCase().includes(query) ||
        patient.lastName?.toLowerCase().includes(query) ||
        patient.patientNumber?.toLowerCase().includes(query) ||
        patient.contact?.email?.toLowerCase().includes(query) ||
        patient.contact?.phone?.includes(query)
      );
    }

    setFilteredPatients(filtered);
  };

  const handleCreatePatient = () => {
    setEditingPatient(null);
    setIsFormModalOpen(true);
  };

  const handleEditPatient = (patient) => {
    // Journaliser l'accès - US 6.2
    patientsStorage.logAccess(patient.id, 'edit_access', user?.id || 'unknown', {
      userRole: user?.role,
      timestamp: new Date().toISOString()
    });

    setEditingPatient(patient);
    setIsFormModalOpen(true);
  };

  const handleViewPatient = (patient) => {
    // Journaliser l'accès - US 6.2
    patientsStorage.logAccess(patient.id, 'view_access', user?.id || 'unknown', {
      userRole: user?.role,
      timestamp: new Date().toISOString()
    });

    setViewingPatient(patient);
    setIsDetailModalOpen(true);
  };

  const handleViewMedicalHistory = (patient) => {
    // Journaliser l'accès au dossier médical
    patientsStorage.logAccess(patient.id, 'medical_history_access', user?.id || 'unknown', {
      userRole: user?.role,
      timestamp: new Date().toISOString()
    });

    setViewingMedicalHistory(patient);
    setIsMedicalHistoryModalOpen(true);
  };

  const handleSavePatient = async (patientData) => {
    try {
      if (editingPatient) {
        // Mise à jour via contexte (permissions + audit automatiques)
        await patientContext.updatePatient(editingPatient.id, patientData, {
          reason: 'Patient profile updated'
        });
      } else {
        // Création via contexte (permissions + audit automatiques)
        await patientContext.createPatient(
          {
            ...patientData,
            createdBy: user?.id || 'system'
          },
          {
            reason: 'Patient created from patients module'
          }
        );
      }

      // Les données sont synchrones via PatientContext
      setIsFormModalOpen(false);
      setEditingPatient(null);
    } catch (error) {
      console.error('[PatientsModule] Erreur sauvegarde patient:', error);
    }
  };

  const handleDeletePatient = async (patientId) => {
    if (window.confirm(t('confirmations.archivePatient'))) {
      try {
        // Suppression via contexte (permissions + audit automatiques)
        await patientContext.deletePatient(patientId, {
          reason: 'Patient archived from patients module'
        });
        // Les données sont synchrones via PatientContext
      } catch (error) {
        console.error('[PatientsModule] Erreur suppression patient:', error);
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getGenderIcon = (gender) => {
    switch (gender) {
      case 'male': return '👨';
      case 'female': return '👩';
      default: return '👤';
    }
  };

  if (patientContext?.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Activity className="h-8 w-8 text-green-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">{t('messagesLoading.loading')}</p>
        </div>
      </div>
    );
  }

  // Obtenir les statistiques du contexte
  const stats = patientContext?.getPatientStatistics?.() || {
    total: 0,
    active: 0,
    inactive: 0,
    incomplete: 0,
    deleted: 0
  };

  return (
    <div className="space-y-6">
      {/* Afficher les erreurs si présentes */}
      {patientContext?.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{patientContext.error}</p>
        </div>
      )}

      {/* En-tête avec statistiques */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('title')} ({stats.total || 0})
          </h1>
          <p className="text-gray-600 mt-1">
            {t('labels.subtitle')}
          </p>
        </div>

        {canCreatePatients && (
          <div className="mt-4 lg:mt-0">
            <button
              onClick={handleCreatePatient}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <UserPlus className="h-4 w-4" />
              <span>{t('buttons.newPatient')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">{t('stats.totalPatients')}</p>
              <p className="text-xl font-bold text-gray-900">{stats.total || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <Heart className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">{t('stats.active')}</p>
              <p className="text-xl font-bold text-gray-900">{stats.active || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-orange-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">{t('stats.newMonth')}</p>
              <p className="text-xl font-bold text-gray-900">{stats.incomplete || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">{t('stats.newYear')}</p>
              <p className="text-xl font-bold text-gray-900">{stats.deleted || 0}</p>
            </div>
          </div>
        </div>
      </div>


      {/* Barre de recherche et filtres */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('placeholders.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">{t('filters.all')}</option>
              <option value="active">{t('filters.active')}</option>
              <option value="inactive">{t('filters.inactive')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste des patients */}
      <div className="bg-white rounded-lg border">
        {filteredPatients.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? t('messagesLoading.noSearchResults') : t('messagesLoading.noPatients')}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery
                ? t('messagesLoading.tryOtherSearchTerms')
                : t('messagesLoading.createFirstPatient')}
            </p>
            {canCreatePatients && !searchQuery && (
              <button
                onClick={handleCreatePatient}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                {t('buttons.createFirstPatient')}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">{t('tableHeaders.patient')}</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">{t('tableHeaders.contact')}</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">{t('tableHeaders.information')}</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">{t('tableHeaders.status')}</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">{t('tableHeaders.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">
                          {getGenderIcon(patient.gender)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {patient.firstName} {patient.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {patient.patientNumber}
                          </div>
                          <div className="text-xs text-gray-400">
                            {t('labels.birthDateShort')} {new Date(patient.birthDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        {patient.contact?.phone && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="h-3 w-3 mr-2" />
                            {patient.contact.phone}
                          </div>
                        )}
                        {patient.contact?.email && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Mail className="h-3 w-3 mr-2" />
                            {patient.contact.email}
                          </div>
                        )}
                        {patient.address?.city && (
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="h-3 w-3 mr-2" />
                            {patient.address.city}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <div className="text-sm text-gray-600">
                          {t('labels.idNumber')} {patient.idNumber}
                        </div>
                        {patient.insurance?.provider && (
                          <div className="text-sm text-gray-600">
                            {t('labels.insurance')} {patient.insurance.provider}
                          </div>
                        )}
                        <div className="text-xs text-gray-400">
                          {t('labels.created')} {new Date(patient.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(patient.status)}`}>
                        {patient.status === 'active' ? t('statuses.active') : t('statuses.inactive')}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleViewPatient(patient)}
                          className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                          title={t('tooltips.viewDetails')}
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {canViewMedicalData && (
                          <button
                            onClick={() => handleViewMedicalHistory(patient)}
                            className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                            title={t('tooltips.medicalHistory')}
                          >
                            <Stethoscope className="h-4 w-4" />
                          </button>
                        )}

                        {canEditPatients && (
                          <button
                            onClick={() => handleEditPatient(patient)}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                            title={t('tooltips.edit')}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}

                        {canDeletePatients && (
                          <button
                            onClick={() => handleDeletePatient(patient.id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title={t('tooltips.archive')}
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modales */}
      {isFormModalOpen && (
        <PatientFormModal
          patient={editingPatient}
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setEditingPatient(null);
          }}
          onSave={handleSavePatient}
        />
      )}

      {isDetailModalOpen && viewingPatient && (
        <PatientDetailModal
          patient={viewingPatient}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setViewingPatient(null);
          }}
          onEdit={canEditPatients ? () => {
            setIsDetailModalOpen(false);
            handleEditPatient(viewingPatient);
          } : null}
          canViewMedicalData={canViewMedicalData}
          canViewAllData={canViewAllData}
        />
      )}

      {isMedicalHistoryModalOpen && viewingMedicalHistory && (
        <MedicalHistoryModal
          patient={viewingMedicalHistory}
          isOpen={isMedicalHistoryModalOpen}
          onClose={() => {
            setIsMedicalHistoryModalOpen(false);
            setViewingMedicalHistory(null);
          }}
        />
      )}
    </div>
  );
};

export default PatientsModule;