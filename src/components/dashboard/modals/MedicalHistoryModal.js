// components/dashboard/modals/MedicalHistoryModal.js
// Lightweight modal: shows list of medical records for a patient
// Clicking a record or "New" navigates to the full medical-records module
import React, { useState, useEffect, useContext } from 'react';
import {
  X, Stethoscope, Plus, FileText, Clock, Eye, Edit2, Pill, Activity
} from 'lucide-react';
import { usePermissions } from '../../auth/PermissionGuard';
import { PERMISSIONS } from '../../../utils/permissionsStorage';
import { MedicalRecordContext } from '../../../contexts/MedicalRecordContext';
import { useTranslation } from 'react-i18next';
import { useLocaleNavigation } from '../../../hooks/useLocaleNavigation';

const MedicalHistoryModal = ({
  patient,
  isOpen,
  onClose
}) => {
  const { t, i18n } = useTranslation(['medical', 'common']);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const { hasPermission } = usePermissions();
  const { navigateTo } = useLocaleNavigation();
  const medicalRecordContext = useContext(MedicalRecordContext);
  const { getPatientRecords } = medicalRecordContext || {};

  const canViewRecords = hasPermission(PERMISSIONS.MEDICAL_RECORDS_VIEW);
  const canCreateRecords = hasPermission(PERMISSIONS.MEDICAL_RECORDS_CREATE);

  useEffect(() => {
    const loadRecords = async () => {
      if (isOpen && patient?.id && getPatientRecords) {
        setLoading(true);
        try {
          const result = await getPatientRecords(patient.id);
          const sorted = [...(result?.records || [])].sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
          );
          setRecords(sorted);
        } catch (err) {
          console.error('[MedicalHistoryModal] Error loading records:', err);
          setRecords([]);
        } finally {
          setLoading(false);
        }
      }
    };
    loadRecords();
  }, [isOpen, patient?.id, getPatientRecords]);

  if (!isOpen || !patient) return null;

  const formatDate = (date) => {
    if (!date) return '-';
    const locale = i18n.language === 'es' ? 'es-ES' : i18n.language === 'en' ? 'en-US' : 'fr-FR';
    const d = new Date(date);
    const datePart = d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
    const timePart = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    return `${datePart} ${timePart}`;
  };

  const getTypeLabel = (type) => {
    return t(`medical:module.types.${type}`, type || 'consultation');
  };

  const getTypeColor = (type) => {
    const colors = {
      consultation: 'bg-blue-100 text-blue-700',
      examination: 'bg-green-100 text-green-700',
      treatment: 'bg-purple-100 text-purple-700',
      follow_up: 'bg-cyan-100 text-cyan-700',
      emergency: 'bg-red-100 text-red-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const handleNavigateToRecord = (record) => {
    onClose();
    navigateTo(`/medical-records`, { state: { patientId: patient.id, recordId: record.id } });
  };

  const handleNavigateToNew = () => {
    onClose();
    navigateTo(`/medical-records`, { state: { patientId: patient.id, createNew: true } });
  };

  if (!canViewRecords) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 text-center">
          <Stethoscope className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t('medical:access.unauthorized', 'Acceso no autorizado')}
          </h3>
          <p className="text-gray-600 mb-4">
            {t('medical:access.noPermission', 'No tiene permisos para ver el historial médico.')}
          </p>
          <button onClick={onClose} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
            {t('common:close', 'Cerrar')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b bg-gradient-to-r from-green-50 to-blue-50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <Stethoscope className="h-5 w-5 text-green-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-gray-900 truncate">
                {patient.firstName} {patient.lastName}
              </h2>
              <p className="text-sm text-gray-500">
                {t('medical:module.masterDetail.patientRecords', 'Historial clínico')}
                {records.length > 0 && ` (${records.length})`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {canCreateRecords && (
              <button
                onClick={handleNavigateToNew}
                className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t('medical:module.masterDetail.newRecord', 'Nuevo')}</span>
              </button>
            )}
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto" />
              <p className="mt-3 text-sm text-gray-500">{t('common:loading', 'Cargando...')}</p>
            </div>
          ) : records.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 mb-4">{t('medical:module.masterDetail.noRecordsForPatient', 'No hay historiales para este paciente')}</p>
              {canCreateRecords && (
                <button
                  onClick={handleNavigateToNew}
                  className="text-green-600 hover:text-green-700 font-medium text-sm flex items-center gap-2 mx-auto"
                >
                  <Plus className="h-4 w-4" />
                  {t('medical:module.masterDetail.newRecord', 'Crear historial')}
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {records.map((record) => {
                const hasTreatments = record.treatments?.length > 0;
                const hasMedications = record.currentMedications?.length > 0;
                const hasVitals = record.vitalSigns && Object.values(record.vitalSigns).some(v => v && v !== '');

                return (
                  <button
                    key={record.id}
                    onClick={() => handleNavigateToRecord(record)}
                    className="w-full px-5 py-4 text-left hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Date + Type */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-semibold text-gray-900">{formatDate(record.createdAt)}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(record.type)}`}>
                            {getTypeLabel(record.type)}
                          </span>
                        </div>

                        {/* Chief complaint / diagnosis */}
                        <p className="text-sm text-gray-700 truncate mb-2">
                          {record.basicInfo?.chiefComplaint || record.diagnosis?.primary || t('medical:module.masterDetail.noDescription', 'Sin descripción')}
                        </p>

                        {/* Indicators */}
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          {hasVitals && (
                            <span className="flex items-center gap-1 text-blue-600">
                              <Activity className="h-3.5 w-3.5" />
                              {t('medical:form.tabs.vitals', 'Vitales')}
                            </span>
                          )}
                          {hasTreatments && (
                            <span className="flex items-center gap-1 text-purple-600">
                              <Pill className="h-3.5 w-3.5" />
                              {record.treatments.length} {t('medical:form.tabs.treatments', 'tratamientos')}
                            </span>
                          )}
                          {hasMedications && (
                            <span className="flex items-center gap-1 text-cyan-600">
                              <Pill className="h-3.5 w-3.5" />
                              {record.currentMedications.length} {t('medical:form.tabs.currentMedications', 'medicamentos')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="text-gray-300 group-hover:text-green-600 transition-colors mt-1">
                        <Eye className="h-5 w-5" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MedicalHistoryModal;
