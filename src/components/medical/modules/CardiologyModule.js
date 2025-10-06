// components/medical/modules/CardiologyModule.js
import React, { useState } from 'react';
import {
  Heart, Activity, Zap, TrendingUp, AlertTriangle,
  Edit2, Save, X, Plus, Trash2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMedicalModules } from '../../../contexts/MedicalModulesContext';

const CardiologyModule = ({ patientData, recordData, onUpdate, canEdit = true }) => {
  const { t } = useTranslation();
  const { canEditModule } = useMedicalModules();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(recordData?.cardiology || {
    ecg: {
      rhythm: '',
      rate: '',
      pr: '',
      qrs: '',
      qt: '',
      axis: '',
      interpretation: '',
      date: ''
    },
    cardiacExam: {
      heartSounds: {
        s1: 'normal',
        s2: 'normal',
        murmurs: '',
        gallop: false
      },
      pulses: {
        carotid: 'normal',
        radial: 'normal',
        femoral: 'normal',
        pedal: 'normal'
      },
      jugularVeins: 'normal',
      edema: 'none'
    },
    riskFactors: {
      hypertension: false,
      diabetes: false,
      smoking: false,
      familyHistory: false,
      cholesterol: false,
      obesity: false
    },
    medications: [],
    followUp: {
      nextVisit: '',
      recommendations: '',
      monitoring: []
    }
  });

  const isEditable = canEdit && canEditModule('cardiac');

  const handleSave = () => {
    onUpdate && onUpdate({ cardiology: formData });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(recordData?.cardiology || {});
    setIsEditing(false);
  };

  const updateECG = (field, value) => {
    setFormData(prev => ({
      ...prev,
      ecg: { ...prev.ecg, [field]: value }
    }));
  };

  const updateCardiacExam = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      cardiacExam: {
        ...prev.cardiacExam,
        [section]: { ...prev.cardiacExam[section], [field]: value }
      }
    }));
  };

  const toggleRiskFactor = (factor) => {
    setFormData(prev => ({
      ...prev,
      riskFactors: {
        ...prev.riskFactors,
        [factor]: !prev.riskFactors[factor]
      }
    }));
  };

  const addMedication = () => {
    setFormData(prev => ({
      ...prev,
      medications: [...prev.medications, { name: '', dose: '', frequency: '', notes: '' }]
    }));
  };

  const removeMedication = (index) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }));
  };

  const updateMedication = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.map((med, i) =>
        i === index ? { ...med, [field]: value } : med
      )
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header del módulo */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-red-100 rounded-lg">
            <Heart className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Módulo Cardiológico</h3>
            <p className="text-sm text-gray-600">Evaluación cardiovascular especializada</p>
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

      {/* ECG */}
      <div className="bg-white rounded-lg border p-4">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center">
          <Zap className="h-4 w-4 mr-2 text-yellow-500" />
          Electrocardiograma (ECG)
        </h4>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ritmo</label>
            {isEditing ? (
              <select
                value={formData.ecg.rhythm}
                onChange={(e) => updateECG('rhythm', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              >
                <option value="">Seleccionar</option>
                <option value="sinusal">Sinusal</option>
                <option value="fibrilacion_auricular">Fibrilación Auricular</option>
                <option value="taquicardia">Taquicardia</option>
                <option value="bradicardia">Bradicardia</option>
                <option value="irregular">Irregular</option>
              </select>
            ) : (
              <p className="font-semibold text-gray-900">{formData.ecg.rhythm || '---'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia</label>
            {isEditing ? (
              <input
                type="number"
                value={formData.ecg.rate}
                onChange={(e) => updateECG('rate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="72"
              />
            ) : (
              <p className="font-semibold text-gray-900">
                {formData.ecg.rate ? `${formData.ecg.rate} bpm` : '---'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PR (ms)</label>
            {isEditing ? (
              <input
                type="number"
                value={formData.ecg.pr}
                onChange={(e) => updateECG('pr', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="160"
              />
            ) : (
              <p className="font-semibold text-gray-900">{formData.ecg.pr || '---'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">QRS (ms)</label>
            {isEditing ? (
              <input
                type="number"
                value={formData.ecg.qrs}
                onChange={(e) => updateECG('qrs', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="100"
              />
            ) : (
              <p className="font-semibold text-gray-900">{formData.ecg.qrs || '---'}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Interpretación ECG</label>
          {isEditing ? (
            <textarea
              value={formData.ecg.interpretation}
              onChange={(e) => updateECG('interpretation', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              rows={3}
              placeholder="ECG dentro de límites normales..."
            />
          ) : (
            <p className="text-gray-900">
              {formData.ecg.interpretation || <span className="text-gray-500 italic">Sin interpretación registrada</span>}
            </p>
          )}
        </div>
      </div>

      {/* Examen cardíaco */}
      <div className="bg-white rounded-lg border p-4">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center">
          <Heart className="h-4 w-4 mr-2 text-red-500" />
          Examen Cardíaco
        </h4>

        {/* Ruidos cardíacos */}
        <div className="mb-4">
          <h5 className="font-medium text-gray-700 mb-2">Ruidos Cardíacos</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">S1</label>
              {isEditing ? (
                <select
                  value={formData.cardiacExam.heartSounds.s1}
                  onChange={(e) => updateCardiacExam('heartSounds', 's1', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  <option value="normal">Normal</option>
                  <option value="aumentado">Aumentado</option>
                  <option value="disminuido">Disminuido</option>
                  <option value="ausente">Ausente</option>
                </select>
              ) : (
                <p className="text-sm font-medium text-gray-900">{formData.cardiacExam.heartSounds.s1}</p>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">S2</label>
              {isEditing ? (
                <select
                  value={formData.cardiacExam.heartSounds.s2}
                  onChange={(e) => updateCardiacExam('heartSounds', 's2', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  <option value="normal">Normal</option>
                  <option value="desdoblado">Desdoblado</option>
                  <option value="aumentado">Aumentado</option>
                  <option value="disminuido">Disminuido</option>
                </select>
              ) : (
                <p className="text-sm font-medium text-gray-900">{formData.cardiacExam.heartSounds.s2}</p>
              )}
            </div>

            <div className="col-span-2">
              <label className="block text-sm text-gray-600 mb-1">Soplos</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.cardiacExam.heartSounds.murmurs}
                  onChange={(e) => updateCardiacExam('heartSounds', 'murmurs', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  placeholder="Descripción de soplos..."
                />
              ) : (
                <p className="text-sm font-medium text-gray-900">
                  {formData.cardiacExam.heartSounds.murmurs || 'Sin soplos'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Pulsos */}
        <div className="mb-4">
          <h5 className="font-medium text-gray-700 mb-2">Pulsos</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(formData.cardiacExam.pulses).map(([pulse, value]) => (
              <div key={pulse}>
                <label className="block text-sm text-gray-600 mb-1 capitalize">
                  {pulse === 'pedal' ? 'Pedio' : pulse}
                </label>
                {isEditing ? (
                  <select
                    value={value}
                    onChange={(e) => updateCardiacExam('pulses', pulse, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="aumentado">Aumentado</option>
                    <option value="disminuido">Disminuido</option>
                    <option value="ausente">Ausente</option>
                  </select>
                ) : (
                  <p className="text-sm font-medium text-gray-900">{value}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Factores de riesgo */}
      <div className="bg-white rounded-lg border p-4">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center">
          <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />
          Factores de Riesgo Cardiovascular
        </h4>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(formData.riskFactors).map(([factor, active]) => (
            <div key={factor} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={active}
                onChange={() => isEditing && toggleRiskFactor(factor)}
                disabled={!isEditing}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
              <label className="text-sm text-gray-700 capitalize">
                {factor === 'hypertension' ? 'Hipertensión' :
                 factor === 'diabetes' ? 'Diabetes' :
                 factor === 'smoking' ? 'Tabaquismo' :
                 factor === 'familyHistory' ? 'Antecedentes familiares' :
                 factor === 'cholesterol' ? 'Colesterol alto' :
                 factor === 'obesity' ? 'Obesidad' : factor}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Medicación cardíaca */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-medium text-gray-900 flex items-center">
            <TrendingUp className="h-4 w-4 mr-2 text-blue-500" />
            Medicación Cardíaca
          </h4>
          {isEditing && (
            <button
              onClick={addMedication}
              className="flex items-center space-x-1 bg-blue-600 text-white px-2 py-1 rounded text-sm"
            >
              <Plus className="h-3 w-3" />
              <span>Añadir</span>
            </button>
          )}
        </div>

        {formData.medications.length > 0 ? (
          <div className="space-y-3">
            {formData.medications.map((medication, index) => (
              <div key={index} className="border rounded-lg p-3 bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 flex-1">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Medicamento</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={medication.name}
                          onChange={(e) => updateMedication(index, 'name', e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm"
                          placeholder="Enalapril"
                        />
                      ) : (
                        <p className="font-medium text-sm">{medication.name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Dosis</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={medication.dose}
                          onChange={(e) => updateMedication(index, 'dose', e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm"
                          placeholder="10mg"
                        />
                      ) : (
                        <p className="text-sm">{medication.dose}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Frecuencia</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={medication.frequency}
                          onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm"
                          placeholder="1/día"
                        />
                      ) : (
                        <p className="text-sm">{medication.frequency}</p>
                      )}
                    </div>
                  </div>
                  {isEditing && (
                    <button
                      onClick={() => removeMedication(index)}
                      className="ml-2 text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">Sin medicación cardíaca registrada</p>
        )}
      </div>

      {/* Seguimiento */}
      <div className="bg-white rounded-lg border p-4">
        <h4 className="font-medium text-gray-900 mb-4">Plan de Seguimiento</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Próxima Visita</label>
            {isEditing ? (
              <input
                type="date"
                value={formData.followUp.nextVisit}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  followUp: { ...prev.followUp, nextVisit: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              />
            ) : (
              <p className="font-medium text-gray-900">
                {formData.followUp.nextVisit || 'No programada'}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Recomendaciones</label>
          {isEditing ? (
            <textarea
              value={formData.followUp.recommendations}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                followUp: { ...prev.followUp, recommendations: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              rows={3}
              placeholder="Continuar medicación, control de peso, ejercicio moderado..."
            />
          ) : (
            <p className="text-gray-900">
              {formData.followUp.recommendations ||
               <span className="text-gray-500 italic">Sin recomendaciones específicas</span>}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CardiologyModule;