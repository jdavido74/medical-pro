// components/dashboard/modals/MedicalHistoryModal.js
import React, { useState, useRef, useContext, useEffect } from 'react';
import {
  X, Stethoscope, Plus, FileText, User, Calendar, Save, Loader2
} from 'lucide-react';
import MedicalHistoryViewer from '../../medical/MedicalHistoryViewer';
import MedicalRecordForm from '../../medical/MedicalRecordForm';
import { usePermissions } from '../../auth/PermissionGuard';
import { PERMISSIONS } from '../../../utils/permissionsStorage';
import { MedicalRecordContext } from '../../../contexts/MedicalRecordContext';
import { useAuth } from '../../../hooks/useAuth';
import { useTranslation } from 'react-i18next';

const MedicalHistoryModal = ({
  patient,
  isOpen,
  onClose,
  appointmentId = null
}) => {
  const { t } = useTranslation(['medical', 'common']);
  const [editingRecord, setEditingRecord] = useState(null);
  const [isRecordFormOpen, setIsRecordFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patientRecords, setPatientRecords] = useState([]);
  const formRef = useRef(null);
  const { hasPermission } = usePermissions();
  const { user } = useAuth();
  const medicalRecordContext = useContext(MedicalRecordContext);
  const { refreshRecords, getPatientRecords } = medicalRecordContext || {};

  // Charger les dossiers du patient pour obtenir le dernier
  useEffect(() => {
    const loadPatientRecords = async () => {
      if (isOpen && patient?.id && getPatientRecords) {
        try {
          const result = await getPatientRecords(patient.id);
          const records = result?.records || [];
          // Trier par date décroissante pour avoir le plus récent en premier
          const sortedRecords = [...records].sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
          );
          setPatientRecords(sortedRecords);
        } catch (error) {
          console.error('[MedicalHistoryModal] Error loading patient records:', error);
          setPatientRecords([]);
        }
      }
    };
    loadPatientRecords();
  }, [isOpen, patient?.id, getPatientRecords]);

  // Permissions pour l'historique médical
  const canViewMedicalRecords = hasPermission(PERMISSIONS.MEDICAL_RECORDS_VIEW);
  const canCreateMedicalRecords = hasPermission(PERMISSIONS.MEDICAL_RECORDS_CREATE);
  const canEditMedicalRecords = hasPermission(PERMISSIONS.MEDICAL_RECORDS_EDIT);

  if (!isOpen || !patient) return null;

  const handleCreateRecord = () => {
    setEditingRecord(null);
    setIsRecordFormOpen(true);
  };

  const handleEditRecord = (record) => {
    setEditingRecord(record);
    setIsRecordFormOpen(true);
  };

  const handleViewRecord = (record) => {
    setEditingRecord(record);
    setIsRecordFormOpen(true);
  };

  const handleSaveRecord = async (savedRecord) => {
    // Le formulaire MedicalRecordForm a déjà sauvegardé via l'API
    // Ici on rafraîchit seulement la liste et on ferme le modal
    console.log('[MedicalHistoryModal] Record saved by form, refreshing list:', savedRecord?.id);

    try {
      // Rafraîchir la liste des dossiers dans le contexte
      if (refreshRecords) {
        await refreshRecords();
      }

      // Recharger les dossiers du patient pour mettre à jour lastRecord
      if (getPatientRecords && patient?.id) {
        const result = await getPatientRecords(patient.id);
        const records = result?.records || [];
        const sortedRecords = [...records].sort((a, b) =>
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        setPatientRecords(sortedRecords);
      }
    } catch (error) {
      console.error('[MedicalHistoryModal] Error refreshing records:', error);
    }

    setIsRecordFormOpen(false);
    setEditingRecord(null);
    setIsSubmitting(false);
  };

  const handleCloseRecordForm = () => {
    setIsRecordFormOpen(false);
    setEditingRecord(null);
    setIsSubmitting(false);
  };

  const handleFormSubmit = () => {
    if (formRef.current && formRef.current.handleSubmit) {
      setIsSubmitting(true);
      formRef.current.handleSubmit();
    }
  };

  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  };

  const getGenderLabel = (gender) => {
    switch (gender) {
      case 'M': case 'male': return t('medical:gender.male', 'Masculino');
      case 'F': case 'female': return t('medical:gender.female', 'Femenino');
      default: return '';
    }
  };

  if (!canViewMedicalRecords) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <div className="text-center">
            <Stethoscope className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('medical:access.unauthorized', 'Acceso no autorizado')}
            </h3>
            <p className="text-gray-600 mb-4">
              {t('medical:access.noPermission', 'No tiene permisos para ver el historial médico.')}
            </p>
            <button
              onClick={onClose}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              {t('common:close', 'Cerrar')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[95vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 p-4 xl:p-6 border-b bg-gradient-to-r from-green-50 to-blue-50">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 truncate">
                  <Stethoscope className="h-5 w-5 text-green-600 flex-shrink-0" />
                  {patient.firstName} {patient.lastName}
                </h2>
                <p className="text-sm text-gray-500 truncate">
                  {patient.patientNumber && `#${patient.patientNumber}`}
                  {patient.birthDate && ` · ${calculateAge(patient.birthDate)} ${t('medical:years', 'años')}`}
                  {getGenderLabel(patient.gender) && ` · ${getGenderLabel(patient.gender)}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {canCreateMedicalRecords && (
                <button
                  onClick={handleCreateRecord}
                  className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden xl:inline">{t('medical:module.masterDetail.newRecord', 'Nuevo Registro')}</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Medical History Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(95vh-300px)]">
            <MedicalHistoryViewer
              patientId={patient.id}
              showStatistics={true}
              onEditRecord={canEditMedicalRecords ? handleEditRecord : null}
              onViewRecord={handleViewRecord}
            />
          </div>
        </div>
      </div>

      {/* Medical Record Form Modal - Structure complète */}
      {isRecordFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[95vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-green-50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Stethoscope className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingRecord ? t('medical:module.masterDetail.editRecord', 'Editar Historial') : t('medical:module.masterDetail.newRecord', 'Nuevo Historial')}
                  </h2>
                  <p className="text-gray-600">
                    {patient.firstName} {patient.lastName}
                    {patient.birthDate && ` - ${calculateAge(patient.birthDate)} ${t('medical:years', 'años')}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handleCloseRecordForm}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={isSubmitting}
                >
                  {t('common:cancel', 'Cancelar')}
                </button>
                <button
                  onClick={handleFormSubmit}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>{isSubmitting ? t('medical:form.footer.saving') : t('medical:form.footer.saveRecord')}</span>
                </button>
                <button
                  onClick={handleCloseRecordForm}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Cerrar"
                  disabled={isSubmitting}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Form Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(95vh-140px)]">
              <MedicalRecordForm
                ref={formRef}
                patient={patient}
                existingRecord={editingRecord}
                lastRecord={patientRecords.length > 0 ? patientRecords[0] : null}
                appointmentId={!editingRecord ? appointmentId : null}
                onSave={handleSaveRecord}
                onCancel={handleCloseRecordForm}
                hideFooter
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MedicalHistoryModal;