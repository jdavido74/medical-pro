// components/dashboard/modals/MedicalHistoryModal.js
import React, { useState, useRef, useContext, useEffect } from 'react';
import {
  X, Stethoscope, Plus, FileText, User, Calendar, Save
} from 'lucide-react';
import MedicalHistoryViewer from '../../medical/MedicalHistoryViewer';
import MedicalRecordForm from '../../medical/MedicalRecordForm';
import { usePermissions } from '../../auth/PermissionGuard';
import { PERMISSIONS } from '../../../utils/permissionsStorage';
import { MedicalRecordContext } from '../../../contexts/MedicalRecordContext';
import { useAuth } from '../../../hooks/useAuth';

const MedicalHistoryModal = ({
  patient,
  isOpen,
  onClose
}) => {
  const [editingRecord, setEditingRecord] = useState(null);
  const [isRecordFormOpen, setIsRecordFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patientRecords, setPatientRecords] = useState([]);
  const formRef = useRef(null);
  const { hasPermission } = usePermissions();
  const { user } = useAuth();
  const medicalRecordContext = useContext(MedicalRecordContext);
  const { createRecord, updateRecord, refreshRecords, getPatientRecords } = medicalRecordContext || {};

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

  const handleSaveRecord = async (recordData) => {
    try {
      console.log('[MedicalHistoryModal] Saving medical record:', recordData);

      if (editingRecord && !editingRecord.isNew && updateRecord) {
        // Mettre à jour un dossier existant via l'API
        // Exclure patientId car non autorisé par le backend lors d'une mise à jour
        const { patientId, ...dataWithoutPatientId } = recordData;
        console.log('[MedicalHistoryModal] Updating existing record:', editingRecord.id);
        await updateRecord(editingRecord.id, dataWithoutPatientId);
      } else if (createRecord) {
        // Créer un nouveau dossier médical via l'API
        console.log('[MedicalHistoryModal] Creating new record for patient:', patient.id);
        await createRecord({
          ...recordData,
          patientId: patient.id
        });
      } else {
        console.error('[MedicalHistoryModal] MedicalRecordContext not available');
        throw new Error('MedicalRecordContext not available');
      }

      // Rafraîchir la liste des dossiers
      if (refreshRecords) {
        await refreshRecords();
      }

      // Recharger les dossiers du patient pour mettre à jour lastRecord
      if (getPatientRecords && patient?.id) {
        try {
          const result = await getPatientRecords(patient.id);
          const records = result?.records || [];
          const sortedRecords = [...records].sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
          );
          setPatientRecords(sortedRecords);
        } catch (error) {
          console.error('[MedicalHistoryModal] Error reloading patient records:', error);
        }
      }

      setIsRecordFormOpen(false);
      setEditingRecord(null);
      setIsSubmitting(false);
    } catch (error) {
      console.error('[MedicalHistoryModal] Error saving medical record:', error);
      setIsSubmitting(false);
      // TODO: Afficher une notification d'erreur à l'utilisateur
    }
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

  const getGenderIcon = (gender) => {
    switch (gender) {
      case 'male': return '👨';
      case 'female': return '👩';
      default: return '👤';
    }
  };

  if (!canViewMedicalRecords) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <div className="text-center">
            <Stethoscope className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Acceso no autorizado
            </h3>
            <p className="text-gray-600 mb-4">
              No tiene permisos para ver el historial médico.
            </p>
            <button
              onClick={onClose}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cerrar
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
          <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-green-50 to-blue-50">
            <div className="flex items-center space-x-4">
              <div className="text-3xl">
                {getGenderIcon(patient.gender)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <Stethoscope className="h-6 w-6 mr-2 text-green-600" />
                  Historial Médico
                </h2>
                <p className="text-gray-600">
                  {patient.firstName} {patient.lastName} - {calculateAge(patient.birthDate)} años
                </p>
                <p className="text-sm text-gray-500">
                  Paciente #{patient.patientNumber} | ID: {patient.idNumber}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {canCreateMedicalRecords && (
                <button
                  onClick={handleCreateRecord}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                  title="Crear nuevo registro médico"
                >
                  <Plus className="h-4 w-4" />
                  <span>Nuevo Registro</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Cerrar"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Patient Info Summary */}
          <div className="px-6 py-4 bg-gray-50 border-b">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Nac:</span>
                <span className="font-medium">{new Date(patient.birthDate).toLocaleDateString('es-ES')}</span>
              </div>

              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">Registro:</span>
                <span className="font-medium">{new Date(patient.createdAt).toLocaleDateString('es-ES')}</span>
              </div>

              {patient.insurance?.provider && (
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Seguro:</span>
                  <span className="font-medium">{patient.insurance.provider}</span>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  patient.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {patient.status === 'active' ? 'Activo' : 'Inactivo'}
                </span>
              </div>
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
                    {editingRecord ? 'Editar Historial Médico' : 'Nuevo Historial Médico'}
                  </h2>
                  <p className="text-gray-600">
                    {patient.firstName} {patient.lastName} - {calculateAge(patient.birthDate)} años
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handleCloseRecordForm}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleFormSubmit}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSubmitting ? 'Guardando...' : 'Guardar'}</span>
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
                onSave={handleSaveRecord}
                onCancel={handleCloseRecordForm}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MedicalHistoryModal;