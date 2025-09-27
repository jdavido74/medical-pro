// components/medical/modules/PediatricsModule.js
import React, { useState } from 'react';
import {
  Baby, TrendingUp, Shield, Calendar, AlertCircle, AlertTriangle,
  Edit2, Save, X, Plus, Trash2, Ruler
} from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useMedicalModules } from '../../../contexts/MedicalModulesContext';

const PediatricsModule = ({ patientData, recordData, onUpdate, canEdit = true }) => {
  const { t } = useLanguage();
  const { canEditModule } = useMedicalModules();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(recordData?.pediatrics || {
    growth: {
      weight: '',
      height: '',
      headCircumference: '',
      bmi: '',
      percentiles: {
        weight: '',
        height: '',
        headCircumference: ''
      }
    },
    development: {
      motor: {
        gross: '',
        fine: '',
        milestones: []
      },
      language: {
        receptive: '',
        expressive: '',
        milestones: []
      },
      cognitive: {
        level: '',
        attention: '',
        memory: ''
      },
      social: {
        interaction: '',
        behavior: '',
        adaptation: ''
      }
    },
    vaccines: {
      upToDate: true,
      recent: [],
      pending: [],
      reactions: []
    },
    feeding: {
      type: '',
      frequency: '',
      appetite: '',
      issues: []
    },
    sleep: {
      pattern: '',
      duration: '',
      quality: '',
      issues: []
    },
    pediatricExam: {
      general: '',
      head: '',
      eyes: '',
      ears: '',
      nose: '',
      throat: '',
      neck: '',
      chest: '',
      heart: '',
      abdomen: '',
      genitals: '',
      extremities: '',
      neurological: ''
    }
  });

  const isEditable = canEdit && canEditModule('pediatric');

  const handleSave = () => {
    onUpdate && onUpdate({ pediatrics: formData });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(recordData?.pediatrics || {});
    setIsEditing(false);
  };

  const updateGrowth = (field, value) => {
    setFormData(prev => ({
      ...prev,
      growth: { ...prev.growth, [field]: value }
    }));
  };

  const updatePercentile = (field, value) => {
    setFormData(prev => ({
      ...prev,
      growth: {
        ...prev.growth,
        percentiles: { ...prev.growth.percentiles, [field]: value }
      }
    }));
  };

  const updateDevelopment = (area, field, value) => {
    setFormData(prev => ({
      ...prev,
      development: {
        ...prev.development,
        [area]: { ...prev.development[area], [field]: value }
      }
    }));
  };

  const addMilestone = (area) => {
    const milestone = { age: '', description: '', achieved: false, date: '' };
    setFormData(prev => ({
      ...prev,
      development: {
        ...prev.development,
        [area]: {
          ...prev.development[area],
          milestones: [...prev.development[area].milestones, milestone]
        }
      }
    }));
  };

  const updateMilestone = (area, index, field, value) => {
    setFormData(prev => ({
      ...prev,
      development: {
        ...prev.development,
        [area]: {
          ...prev.development[area],
          milestones: prev.development[area].milestones.map((milestone, i) =>
            i === index ? { ...milestone, [field]: value } : milestone
          )
        }
      }
    }));
  };

  const addVaccine = (type) => {
    const vaccine = { name: '', date: '', batch: '', notes: '' };
    setFormData(prev => ({
      ...prev,
      vaccines: {
        ...prev.vaccines,
        [type]: [...prev.vaccines[type], vaccine]
      }
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header del módulo */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Baby className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Módulo Pediátrico</h3>
            <p className="text-sm text-gray-600">Evaluación especializada para pacientes pediátricos</p>
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

      {/* Crecimiento y desarrollo */}
      <div className="bg-white rounded-lg border p-4">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center">
          <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
          Crecimiento y Antropometría
        </h4>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
            {isEditing ? (
              <input
                type="number"
                step="0.1"
                value={formData.growth.weight}
                onChange={(e) => updateGrowth('weight', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="12.5"
              />
            ) : (
              <p className="font-semibold text-gray-900">
                {formData.growth.weight ? `${formData.growth.weight} kg` : '---'}
              </p>
            )}
            {formData.growth.percentiles.weight && (
              <p className="text-xs text-blue-600">P{formData.growth.percentiles.weight}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Altura (cm)</label>
            {isEditing ? (
              <input
                type="number"
                step="0.1"
                value={formData.growth.height}
                onChange={(e) => updateGrowth('height', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="85.5"
              />
            ) : (
              <p className="font-semibold text-gray-900">
                {formData.growth.height ? `${formData.growth.height} cm` : '---'}
              </p>
            )}
            {formData.growth.percentiles.height && (
              <p className="text-xs text-blue-600">P{formData.growth.percentiles.height}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Perímetro Cefálico (cm)</label>
            {isEditing ? (
              <input
                type="number"
                step="0.1"
                value={formData.growth.headCircumference}
                onChange={(e) => updateGrowth('headCircumference', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="48.2"
              />
            ) : (
              <p className="font-semibold text-gray-900">
                {formData.growth.headCircumference ? `${formData.growth.headCircumference} cm` : '---'}
              </p>
            )}
            {formData.growth.percentiles.headCircumference && (
              <p className="text-xs text-blue-600">P{formData.growth.percentiles.headCircumference}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">IMC</label>
            {isEditing ? (
              <input
                type="number"
                step="0.1"
                value={formData.growth.bmi}
                onChange={(e) => updateGrowth('bmi', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="17.2"
              />
            ) : (
              <p className="font-semibold text-gray-900">
                {formData.growth.bmi || '---'}
              </p>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="border-t pt-4">
            <h5 className="font-medium text-gray-700 mb-2">Percentiles</h5>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Percentil Peso</label>
                <input
                  type="number"
                  value={formData.growth.percentiles.weight}
                  onChange={(e) => updatePercentile('weight', e.target.value)}
                  className="w-full px-2 py-1 border rounded text-sm"
                  placeholder="50"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Percentil Altura</label>
                <input
                  type="number"
                  value={formData.growth.percentiles.height}
                  onChange={(e) => updatePercentile('height', e.target.value)}
                  className="w-full px-2 py-1 border rounded text-sm"
                  placeholder="75"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Percentil PC</label>
                <input
                  type="number"
                  value={formData.growth.percentiles.headCircumference}
                  onChange={(e) => updatePercentile('headCircumference', e.target.value)}
                  className="w-full px-2 py-1 border rounded text-sm"
                  placeholder="60"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desarrollo psicomotor */}
      <div className="bg-white rounded-lg border p-4">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center">
          <Ruler className="h-4 w-4 mr-2 text-purple-500" />
          Desarrollo Psicomotor
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Desarrollo motor */}
          <div>
            <h5 className="font-medium text-gray-700 mb-3">Desarrollo Motor</h5>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Motor Grueso</label>
                {isEditing ? (
                  <select
                    value={formData.development.motor.gross}
                    onChange={(e) => updateDevelopment('motor', 'gross', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar</option>
                    <option value="normal">Normal para la edad</option>
                    <option value="avanzado">Avanzado</option>
                    <option value="retraso_leve">Retraso leve</option>
                    <option value="retraso_moderado">Retraso moderado</option>
                  </select>
                ) : (
                  <p className="text-sm text-gray-900">{formData.development.motor.gross || '---'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Motor Fino</label>
                {isEditing ? (
                  <select
                    value={formData.development.motor.fine}
                    onChange={(e) => updateDevelopment('motor', 'fine', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar</option>
                    <option value="normal">Normal para la edad</option>
                    <option value="avanzado">Avanzado</option>
                    <option value="retraso_leve">Retraso leve</option>
                    <option value="retraso_moderado">Retraso moderado</option>
                  </select>
                ) : (
                  <p className="text-sm text-gray-900">{formData.development.motor.fine || '---'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Desarrollo del lenguaje */}
          <div>
            <h5 className="font-medium text-gray-700 mb-3">Desarrollo del Lenguaje</h5>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Lenguaje Receptivo</label>
                {isEditing ? (
                  <select
                    value={formData.development.language.receptive}
                    onChange={(e) => updateDevelopment('language', 'receptive', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar</option>
                    <option value="normal">Normal para la edad</option>
                    <option value="avanzado">Avanzado</option>
                    <option value="retraso_leve">Retraso leve</option>
                    <option value="retraso_moderado">Retraso moderado</option>
                  </select>
                ) : (
                  <p className="text-sm text-gray-900">{formData.development.language.receptive || '---'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Lenguaje Expresivo</label>
                {isEditing ? (
                  <select
                    value={formData.development.language.expressive}
                    onChange={(e) => updateDevelopment('language', 'expressive', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar</option>
                    <option value="normal">Normal para la edad</option>
                    <option value="avanzado">Avanzado</option>
                    <option value="retraso_leve">Retraso leve</option>
                    <option value="retraso_moderado">Retraso moderado</option>
                  </select>
                ) : (
                  <p className="text-sm text-gray-900">{formData.development.language.expressive || '---'}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vacunación */}
      <div className="bg-white rounded-lg border p-4">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center">
          <Shield className="h-4 w-4 mr-2 text-green-500" />
          Estado Vacunal
        </h4>

        <div className="mb-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.vaccines.upToDate}
              onChange={(e) => isEditing && setFormData(prev => ({
                ...prev,
                vaccines: { ...prev.vaccines, upToDate: e.target.checked }
              }))}
              disabled={!isEditing}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <label className="text-sm font-medium text-gray-700">
              Vacunación al día según calendario
            </label>
          </div>
        </div>

        {!formData.vaccines.upToDate && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
              <span className="text-sm text-yellow-800">Vacunación incompleta - Revisar calendario</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <h5 className="font-medium text-gray-700">Vacunas Recientes</h5>
              {isEditing && (
                <button
                  onClick={() => addVaccine('recent')}
                  className="text-xs bg-green-600 text-white px-2 py-1 rounded"
                >
                  <Plus className="h-3 w-3 inline mr-1" />
                  Añadir
                </button>
              )}
            </div>
            {formData.vaccines.recent.length > 0 ? (
              <div className="space-y-2">
                {formData.vaccines.recent.map((vaccine, index) => (
                  <div key={index} className="bg-gray-50 p-2 rounded text-sm">
                    <div className="font-medium">{vaccine.name}</div>
                    <div className="text-gray-600">{vaccine.date}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Sin vacunas recientes registradas</p>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h5 className="font-medium text-gray-700">Vacunas Pendientes</h5>
              {isEditing && (
                <button
                  onClick={() => addVaccine('pending')}
                  className="text-xs bg-orange-600 text-white px-2 py-1 rounded"
                >
                  <Plus className="h-3 w-3 inline mr-1" />
                  Añadir
                </button>
              )}
            </div>
            {formData.vaccines.pending.length > 0 ? (
              <div className="space-y-2">
                {formData.vaccines.pending.map((vaccine, index) => (
                  <div key={index} className="bg-orange-50 p-2 rounded text-sm">
                    <div className="font-medium">{vaccine.name}</div>
                    <div className="text-gray-600">Programada: {vaccine.date}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Sin vacunas pendientes</p>
            )}
          </div>
        </div>
      </div>

      {/* Alimentación y sueño */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Alimentación */}
        <div className="bg-white rounded-lg border p-4">
          <h4 className="font-medium text-gray-900 mb-4">Alimentación</h4>

          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Tipo de Alimentación</label>
              {isEditing ? (
                <select
                  value={formData.feeding.type}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    feeding: { ...prev.feeding, type: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar</option>
                  <option value="lactancia_materna">Lactancia materna exclusiva</option>
                  <option value="lactancia_mixta">Lactancia mixta</option>
                  <option value="formula">Fórmula</option>
                  <option value="alimentacion_complementaria">Alimentación complementaria</option>
                  <option value="alimentacion_variada">Alimentación variada</option>
                </select>
              ) : (
                <p className="text-sm text-gray-900">{formData.feeding.type || '---'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Apetito</label>
              {isEditing ? (
                <select
                  value={formData.feeding.appetite}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    feeding: { ...prev.feeding, appetite: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar</option>
                  <option value="bueno">Bueno</option>
                  <option value="regular">Regular</option>
                  <option value="pobre">Pobre</option>
                  <option value="selectivo">Selectivo</option>
                </select>
              ) : (
                <p className="text-sm text-gray-900">{formData.feeding.appetite || '---'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Sueño */}
        <div className="bg-white rounded-lg border p-4">
          <h4 className="font-medium text-gray-900 mb-4">Patrón de Sueño</h4>

          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Duración (horas)</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.sleep.duration}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    sleep: { ...prev.sleep, duration: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="10-12 horas"
                />
              ) : (
                <p className="text-sm text-gray-900">{formData.sleep.duration || '---'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Calidad</label>
              {isEditing ? (
                <select
                  value={formData.sleep.quality}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    sleep: { ...prev.sleep, quality: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar</option>
                  <option value="buena">Buena</option>
                  <option value="regular">Regular</option>
                  <option value="mala">Mala</option>
                  <option value="fragmentado">Fragmentado</option>
                </select>
              ) : (
                <p className="text-sm text-gray-900">{formData.sleep.quality || '---'}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PediatricsModule;