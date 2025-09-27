// components/dashboard/modals/MedicalRecordFormModal.js
import React, { useState, useEffect } from 'react';
import {
  X, Save, Stethoscope, FileText, Eye
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

const MedicalRecordFormModal = ({
  record,
  patient,
  isOpen,
  onClose,
  onSave,
  readonly = false
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    type: 'consultation',
    date: new Date().toISOString().split('T')[0],
    practitionerId: user?.id || 'unknown',
    basicInfo: {
      chiefComplaint: '',
      symptoms: '',
      duration: ''
    },
    diagnosis: {
      primary: '',
      secondary: ''
    },
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (record && !record.isNew) {
      setFormData({
        type: record.type || 'consultation',
        date: record.date || new Date().toISOString().split('T')[0],
        practitionerId: record.practitionerId || user?.id || 'unknown',
        basicInfo: record.basicInfo || {
          chiefComplaint: '',
          symptoms: '',
          duration: ''
        },
        diagnosis: record.diagnosis || {
          primary: '',
          secondary: ''
        },
        notes: record.notes || ''
      });
    }
  }, [record, user]);

  if (!isOpen) return null;

  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleDirectChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.basicInfo.chiefComplaint.trim()) {
      newErrors.chiefComplaint = 'El motivo de consulta es obligatorio';
    }

    if (!formData.diagnosis.primary.trim()) {
      newErrors.primaryDiagnosis = 'El diagnóstico principal es obligatorio';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (readonly) return;

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error saving medical record:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getRecordTypeLabel = (type) => {
    const types = {
      consultation: 'Consulta',
      examination: 'Examen',
      treatment: 'Tratamiento',
      follow_up: 'Seguimiento',
      emergency: 'Urgencia'
    };
    return types[type] || type;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-green-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              {readonly ? (
                <Eye className="h-6 w-6 text-blue-600" />
              ) : (
                <Stethoscope className="h-6 w-6 text-green-600" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {readonly ? 'Ver Registro Médico' :
                 record?.isNew ? 'Nuevo Registro Médico' : 'Editar Registro Médico'}
              </h2>
              <p className="text-gray-600">
                {patient.firstName} {patient.lastName} - {getRecordTypeLabel(formData.type)}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {!readonly && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(95vh-140px)]">
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Registro
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleDirectChange('type', e.target.value)}
                  disabled={readonly}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="consultation">Consulta</option>
                  <option value="examination">Examen</option>
                  <option value="treatment">Tratamiento</option>
                  <option value="follow_up">Seguimiento</option>
                  <option value="emergency">Urgencia</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleDirectChange('date', e.target.value)}
                  disabled={readonly}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Médico
                </label>
                <input
                  type="text"
                  value={`Dr. ${formData.practitionerId}`}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Chief Complaint */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo de Consulta *
              </label>
              <textarea
                value={formData.basicInfo.chiefComplaint}
                onChange={(e) => handleInputChange('basicInfo', 'chiefComplaint', e.target.value)}
                disabled={readonly}
                rows="2"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
                  errors.chiefComplaint ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Describa el motivo principal de la consulta..."
              />
              {errors.chiefComplaint && (
                <p className="text-red-600 text-sm mt-1">{errors.chiefComplaint}</p>
              )}
            </div>

            {/* Symptoms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Síntomas
                </label>
                <textarea
                  value={formData.basicInfo.symptoms}
                  onChange={(e) => handleInputChange('basicInfo', 'symptoms', e.target.value)}
                  disabled={readonly}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Describa los síntomas presentados..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duración
                </label>
                <input
                  type="text"
                  value={formData.basicInfo.duration}
                  onChange={(e) => handleInputChange('basicInfo', 'duration', e.target.value)}
                  disabled={readonly}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="ej: 3 días, 2 semanas..."
                />
              </div>
            </div>

            {/* Diagnosis */}
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-yellow-600" />
                Diagnóstico
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Diagnóstico Principal *
                  </label>
                  <input
                    type="text"
                    value={formData.diagnosis.primary}
                    onChange={(e) => handleInputChange('diagnosis', 'primary', e.target.value)}
                    disabled={readonly}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
                      errors.primaryDiagnosis ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Diagnóstico principal del paciente..."
                  />
                  {errors.primaryDiagnosis && (
                    <p className="text-red-600 text-sm mt-1">{errors.primaryDiagnosis}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Diagnóstico Secundario
                  </label>
                  <input
                    type="text"
                    value={formData.diagnosis.secondary}
                    onChange={(e) => handleInputChange('diagnosis', 'secondary', e.target.value)}
                    disabled={readonly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Diagnóstico secundario..."
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas Adicionales
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleDirectChange('notes', e.target.value)}
                disabled={readonly}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Notas adicionales, observaciones especiales..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicalRecordFormModal;