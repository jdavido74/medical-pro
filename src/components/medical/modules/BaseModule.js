// components/medical/modules/BaseModule.js
import React, { useState } from 'react';
import {
  User, Calendar, Thermometer, Heart, Scale,
  Activity, AlertCircle, Edit2, Save, X
} from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useMedicalModules } from '../../../contexts/MedicalModulesContext';

const BaseModule = ({ patientData, recordData, onUpdate, canEdit = true }) => {
  const { t } = useLanguage();
  const { canEditModule } = useMedicalModules();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(recordData || {
    vitalSigns: {
      temperature: '',
      bloodPressure: '',
      heartRate: '',
      weight: '',
      height: '',
      oxygenSaturation: ''
    },
    symptoms: [],
    diagnosis: '',
    treatment: '',
    notes: ''
  });

  const isEditable = canEdit && canEditModule('base');

  const handleSave = () => {
    onUpdate && onUpdate(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(recordData || {});
    setIsEditing(false);
  };

  const updateVitalSign = (key, value) => {
    setFormData(prev => ({
      ...prev,
      vitalSigns: {
        ...prev.vitalSigns,
        [key]: value
      }
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header del módulo */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-green-100 rounded-lg">
            <User className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Dossier Médical de Base</h3>
            <p className="text-sm text-gray-600">Informations médicales essentielles</p>
          </div>
        </div>

        {isEditable && (
          <div className="flex space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="flex items-center space-x-1 bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 text-sm"
                >
                  <Save className="h-4 w-4" />
                  <span>Guardar</span>
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center space-x-1 bg-gray-500 text-white px-3 py-1.5 rounded-lg hover:bg-gray-600 text-sm"
                >
                  <X className="h-4 w-4" />
                  <span>Cancelar</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm"
              >
                <Edit2 className="h-4 w-4" />
                <span>Editar</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Signos vitales */}
      <div className="bg-white rounded-lg border p-4">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center">
          <Activity className="h-4 w-4 mr-2 text-red-500" />
          Signos Vitales
        </h4>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Temperatura */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Thermometer className="h-4 w-4 inline mr-1" />
              Temperatura (°C)
            </label>
            {isEditing ? (
              <input
                type="number"
                step="0.1"
                value={formData.vitalSigns.temperature}
                onChange={(e) => updateVitalSign('temperature', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="36.5"
              />
            ) : (
              <p className="text-lg font-semibold text-gray-900">
                {formData.vitalSigns.temperature ? `${formData.vitalSigns.temperature}°C` : '---'}
              </p>
            )}
          </div>

          {/* Tensión arterial */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Heart className="h-4 w-4 inline mr-1" />
              Tensión Arterial
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.vitalSigns.bloodPressure}
                onChange={(e) => updateVitalSign('bloodPressure', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="120/80"
              />
            ) : (
              <p className="text-lg font-semibold text-gray-900">
                {formData.vitalSigns.bloodPressure || '---'}
              </p>
            )}
          </div>

          {/* Frecuencia cardíaca */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Activity className="h-4 w-4 inline mr-1" />
              Frecuencia Cardíaca
            </label>
            {isEditing ? (
              <input
                type="number"
                value={formData.vitalSigns.heartRate}
                onChange={(e) => updateVitalSign('heartRate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="72"
              />
            ) : (
              <p className="text-lg font-semibold text-gray-900">
                {formData.vitalSigns.heartRate ? `${formData.vitalSigns.heartRate} bpm` : '---'}
              </p>
            )}
          </div>

          {/* Peso */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Scale className="h-4 w-4 inline mr-1" />
              Peso (kg)
            </label>
            {isEditing ? (
              <input
                type="number"
                step="0.1"
                value={formData.vitalSigns.weight}
                onChange={(e) => updateVitalSign('weight', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="70.5"
              />
            ) : (
              <p className="text-lg font-semibold text-gray-900">
                {formData.vitalSigns.weight ? `${formData.vitalSigns.weight} kg` : '---'}
              </p>
            )}
          </div>

          {/* Altura */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Altura (cm)
            </label>
            {isEditing ? (
              <input
                type="number"
                value={formData.vitalSigns.height}
                onChange={(e) => updateVitalSign('height', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="170"
              />
            ) : (
              <p className="text-lg font-semibold text-gray-900">
                {formData.vitalSigns.height ? `${formData.vitalSigns.height} cm` : '---'}
              </p>
            )}
          </div>

          {/* Saturación de oxígeno */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Saturación O₂ (%)
            </label>
            {isEditing ? (
              <input
                type="number"
                value={formData.vitalSigns.oxygenSaturation}
                onChange={(e) => updateVitalSign('oxygenSaturation', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="98"
              />
            ) : (
              <p className="text-lg font-semibold text-gray-900">
                {formData.vitalSigns.oxygenSaturation ? `${formData.vitalSigns.oxygenSaturation}%` : '---'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Síntomas */}
      <div className="bg-white rounded-lg border p-4">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center">
          <AlertCircle className="h-4 w-4 mr-2 text-orange-500" />
          Síntomas Reportados
        </h4>
        {isEditing ? (
          <textarea
            value={Array.isArray(formData.symptoms) ? formData.symptoms.join(', ') : formData.symptoms || ''}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              symptoms: e.target.value.split(',').map(s => s.trim()).filter(s => s)
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            rows={3}
            placeholder="Dolor de cabeza, fatiga, náuseas..."
          />
        ) : (
          <div className="space-y-2">
            {formData.symptoms && formData.symptoms.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {formData.symptoms.map((symptom, index) => (
                  <span
                    key={index}
                    className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-sm"
                  >
                    {symptom}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No se han reportado síntomas</p>
            )}
          </div>
        )}
      </div>

      {/* Diagnóstico */}
      <div className="bg-white rounded-lg border p-4">
        <h4 className="font-medium text-gray-900 mb-4">Diagnóstico</h4>
        {isEditing ? (
          <textarea
            value={formData.diagnosis}
            onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            rows={3}
            placeholder="Diagnóstico principal y secundarios..."
          />
        ) : (
          <p className="text-gray-900">
            {formData.diagnosis || <span className="text-gray-500 italic">Sin diagnóstico registrado</span>}
          </p>
        )}
      </div>

      {/* Tratamiento */}
      <div className="bg-white rounded-lg border p-4">
        <h4 className="font-medium text-gray-900 mb-4">Tratamiento</h4>
        {isEditing ? (
          <textarea
            value={formData.treatment}
            onChange={(e) => setFormData(prev => ({ ...prev, treatment: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            rows={3}
            placeholder="Plan de tratamiento, medicación, recomendaciones..."
          />
        ) : (
          <p className="text-gray-900">
            {formData.treatment || <span className="text-gray-500 italic">Sin tratamiento registrado</span>}
          </p>
        )}
      </div>

      {/* Notas adicionales */}
      <div className="bg-white rounded-lg border p-4">
        <h4 className="font-medium text-gray-900 mb-4">Notas Adicionales</h4>
        {isEditing ? (
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            rows={2}
            placeholder="Observaciones, seguimiento..."
          />
        ) : (
          <p className="text-gray-900">
            {formData.notes || <span className="text-gray-500 italic">Sin notas adicionales</span>}
          </p>
        )}
      </div>
    </div>
  );
};

export default BaseModule;