// components/medical/MedicalRecordForm.js
import React, { useState, useEffect } from 'react';
import {
  FileText, User, Activity, Heart, AlertTriangle, Plus, X, Save,
  Stethoscope, Thermometer, Scale, Ruler, Droplets, Clock,
  Pill, CheckCircle, Calendar, Edit2, Trash2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { medicalRecordsStorage } from '../../utils/medicalRecordsStorage';

const MedicalRecordForm = ({ patient, existingRecord = null, onSave, onCancel }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    patientId: patient?.id || '',
    practitionerId: user?.id || '',
    type: 'consultation',

    // US 2.1 - Antécédents
    antecedents: {
      personal: {
        medicalHistory: [],
        surgicalHistory: [],
        allergies: [],
        habits: {
          smoking: { status: 'never', details: '' },
          alcohol: { status: 'never', details: '' },
          exercise: { status: 'never', details: '' }
        }
      },
      family: {
        father: '',
        mother: '',
        siblings: '',
        children: ''
      }
    },

    // US 2.2 - Données cliniques de base
    vitalSigns: {
      weight: '',
      height: '',
      bmi: '',
      bloodPressure: { systolic: '', diastolic: '' },
      heartRate: '',
      temperature: '',
      respiratoryRate: '',
      oxygenSaturation: ''
    },

    bloodType: '',

    allergies: [],

    // US 2.3 - Pathologies & diagnostics
    diagnosis: {
      primary: '',
      secondary: [],
      icd10: []
    },

    chronicConditions: [],

    // US 2.4 - Traitements
    treatments: [],

    // Información de la consulta
    basicInfo: {
      chiefComplaint: '',
      symptoms: [],
      duration: ''
    },

    physicalExam: {
      general: '',
      cardiovascular: '',
      respiratory: '',
      abdomen: '',
      neurological: '',
      other: ''
    },

    treatmentPlan: {
      recommendations: [],
      followUp: '',
      tests: []
    }
  });

  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState('basic');
  const [medicationWarnings, setMedicationWarnings] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cargar données existantes si modification
  useEffect(() => {
    if (existingRecord) {
      setFormData(existingRecord);
    }
  }, [existingRecord]);

  // Calculer BMI automatiquement
  useEffect(() => {
    const { weight, height } = formData.vitalSigns;
    if (weight && height && weight > 0 && height > 0) {
      const heightInMeters = height / 100;
      const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(1);
      setFormData(prev => ({
        ...prev,
        vitalSigns: { ...prev.vitalSigns, bmi }
      }));
    }
  }, [formData.vitalSigns.weight, formData.vitalSigns.height]);

  // Vérifier interactions médicamenteuses
  useEffect(() => {
    if (formData.treatments.length > 0) {
      const warnings = medicalRecordsStorage.checkMedicationInteractions(formData.treatments);
      setMedicationWarnings(warnings);
    } else {
      setMedicationWarnings([]);
    }
  }, [formData.treatments]);

  const handleInputChange = (section, field, value) => {
    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }

    // Clear error when user starts typing
    const errorKey = section ? `${section}.${field}` : field;
    if (errors[errorKey]) {
      setErrors(prev => ({
        ...prev,
        [errorKey]: null
      }));
    }
  };

  const handleNestedInputChange = (section, subsection, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: {
          ...prev[section][subsection],
          [field]: value
        }
      }
    }));
  };

  const handleArrayInputChange = (section, field, index, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: prev[section][field].map((item, i) => i === index ? value : item)
      }
    }));
  };

  const addArrayItem = (section, field, defaultValue = '') => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: [...prev[section][field], defaultValue]
      }
    }));
  };

  const removeArrayItem = (section, field, index) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: prev[section][field].filter((_, i) => i !== index)
      }
    }));
  };

  const addTreatment = () => {
    const newTreatment = {
      medication: '',
      dosage: '',
      frequency: '',
      route: 'oral',
      startDate: new Date().toISOString().split('T')[0],
      endDate: null,
      status: 'active',
      prescribedBy: user?.name || '',
      notes: ''
    };

    setFormData(prev => ({
      ...prev,
      treatments: [...prev.treatments, newTreatment]
    }));
  };

  const updateTreatment = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      treatments: prev.treatments.map((treatment, i) =>
        i === index ? { ...treatment, [field]: value } : treatment
      )
    }));
  };

  const removeTreatment = (index) => {
    setFormData(prev => ({
      ...prev,
      treatments: prev.treatments.filter((_, i) => i !== index)
    }));
  };

  const addAllergy = () => {
    const newAllergy = {
      allergen: '',
      type: 'medicamento',
      severity: 'leve',
      reaction: '',
      dateDiscovered: new Date().toISOString().split('T')[0]
    };

    setFormData(prev => ({
      ...prev,
      allergies: [...prev.allergies, newAllergy]
    }));
  };

  const updateAllergy = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies.map((allergy, i) =>
        i === index ? { ...allergy, [field]: value } : allergy
      )
    }));
  };

  const removeAllergy = (index) => {
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    // Validation obligatoire
    if (!formData.basicInfo.chiefComplaint.trim()) {
      newErrors['basicInfo.chiefComplaint'] = 'El motivo de consulta es obligatorio';
    }

    if (!formData.diagnosis.primary.trim()) {
      newErrors['diagnosis.primary'] = 'El diagnóstico principal es obligatorio';
    }

    // Validation signos vitales
    if (formData.vitalSigns.bloodPressure.systolic && formData.vitalSigns.bloodPressure.diastolic) {
      const systolic = parseInt(formData.vitalSigns.bloodPressure.systolic);
      const diastolic = parseInt(formData.vitalSigns.bloodPressure.diastolic);

      if (systolic <= diastolic) {
        newErrors['vitalSigns.bloodPressure'] = 'La presión sistólica debe ser mayor que la diastólica';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const recordData = {
        ...formData,
        medicationWarnings
      };

      if (existingRecord) {
        await medicalRecordsStorage.update(existingRecord.id, recordData, user?.id);
      } else {
        await medicalRecordsStorage.create(recordData, user?.id);
      }

      onSave && onSave();
    } catch (error) {
      console.error('Error saving medical record:', error);
      setErrors({ submit: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { id: 'basic', label: 'Información Básica', icon: FileText },
    { id: 'antecedents', label: 'Antecedentes', icon: Clock },
    { id: 'vitals', label: 'Signos Vitales', icon: Activity },
    { id: 'diagnosis', label: 'Diagnóstico', icon: Stethoscope },
    { id: 'treatments', label: 'Tratamientos', icon: Pill },
    { id: 'exam', label: 'Examen Físico', icon: Heart },
    { id: 'plan', label: 'Plan', icon: CheckCircle }
  ];

  const renderBasicTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Motivo de Consulta *
          </label>
          <textarea
            value={formData.basicInfo.chiefComplaint}
            onChange={(e) => handleInputChange('basicInfo', 'chiefComplaint', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
              errors['basicInfo.chiefComplaint'] ? 'border-red-300' : 'border-gray-300'
            }`}
            rows={3}
            placeholder="Describa el motivo principal de la consulta..."
          />
          {errors['basicInfo.chiefComplaint'] && (
            <p className="text-red-600 text-sm mt-1">{errors['basicInfo.chiefComplaint']}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duración de los Síntomas
          </label>
          <input
            type="text"
            value={formData.basicInfo.duration}
            onChange={(e) => handleInputChange('basicInfo', 'duration', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Ej: 3 días, 1 semana..."
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Síntomas
        </label>
        <div className="space-y-2">
          {formData.basicInfo.symptoms.map((symptom, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="text"
                value={symptom}
                onChange={(e) => handleArrayInputChange('basicInfo', 'symptoms', index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Describe el síntoma..."
              />
              <button
                type="button"
                onClick={() => removeArrayItem('basicInfo', 'symptoms', index)}
                className="p-2 text-red-600 hover:text-red-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => addArrayItem('basicInfo', 'symptoms')}
            className="flex items-center space-x-2 text-green-600 hover:text-green-800"
          >
            <Plus className="h-4 w-4" />
            <span>Agregar síntoma</span>
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tipo de Consulta
        </label>
        <select
          value={formData.type}
          onChange={(e) => handleInputChange(null, 'type', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          <option value="consultation">Consulta</option>
          <option value="examination">Examen</option>
          <option value="treatment">Tratamiento</option>
          <option value="follow_up">Seguimiento</option>
          <option value="emergency">Urgencia</option>
        </select>
      </div>
    </div>
  );

  const renderAntecedentsTab = () => (
    <div className="space-y-6">
      {/* Antécédents personnels */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-gray-900 mb-4">Antecedentes Personales</h4>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Historial Médico
            </label>
            <div className="space-y-2">
              {formData.antecedents.personal.medicalHistory.map((history, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={history}
                    onChange={(e) => handleArrayInputChange('antecedents.personal', 'medicalHistory', index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Ej: Diabetes tipo 2 (2020)"
                  />
                  <button
                    type="button"
                    onClick={() => removeArrayItem('antecedents.personal', 'medicalHistory', index)}
                    className="p-2 text-red-600 hover:text-red-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem('antecedents.personal', 'medicalHistory')}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
              >
                <Plus className="h-4 w-4" />
                <span>Agregar antecedente médico</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Historial Quirúrgico
            </label>
            <div className="space-y-2">
              {formData.antecedents.personal.surgicalHistory.map((surgery, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={surgery}
                    onChange={(e) => handleArrayInputChange('antecedents.personal', 'surgicalHistory', index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Ej: Apendicectomía (2015)"
                  />
                  <button
                    type="button"
                    onClick={() => removeArrayItem('antecedents.personal', 'surgicalHistory', index)}
                    className="p-2 text-red-600 hover:text-red-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem('antecedents.personal', 'surgicalHistory')}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
              >
                <Plus className="h-4 w-4" />
                <span>Agregar cirugía</span>
              </button>
            </div>
          </div>

          {/* Hábitos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tabaquismo
              </label>
              <select
                value={formData.antecedents.personal.habits.smoking.status}
                onChange={(e) => handleNestedInputChange('antecedents', 'personal', 'habits', {
                  ...formData.antecedents.personal.habits,
                  smoking: { ...formData.antecedents.personal.habits.smoking, status: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="never">Nunca</option>
                <option value="former">Ex-fumador</option>
                <option value="current">Fumador actual</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alcohol
              </label>
              <select
                value={formData.antecedents.personal.habits.alcohol.status}
                onChange={(e) => handleNestedInputChange('antecedents', 'personal', 'habits', {
                  ...formData.antecedents.personal.habits,
                  alcohol: { ...formData.antecedents.personal.habits.alcohol, status: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="never">Nunca</option>
                <option value="occasional">Ocasional</option>
                <option value="regular">Regular</option>
                <option value="excessive">Excesivo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ejercicio
              </label>
              <select
                value={formData.antecedents.personal.habits.exercise.status}
                onChange={(e) => handleNestedInputChange('antecedents', 'personal', 'habits', {
                  ...formData.antecedents.personal.habits,
                  exercise: { ...formData.antecedents.personal.habits.exercise, status: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="never">Sedentario</option>
                <option value="occasional">Ocasional</option>
                <option value="regular">Regular</option>
                <option value="intense">Intenso</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Antécédents familiaux */}
      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
        <h4 className="font-semibold text-gray-900 mb-4">Antecedentes Familiares</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Padre
            </label>
            <input
              type="text"
              value={formData.antecedents.family.father}
              onChange={(e) => handleNestedInputChange('antecedents', 'family', 'father', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Antecedentes paternos..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Madre
            </label>
            <input
              type="text"
              value={formData.antecedents.family.mother}
              onChange={(e) => handleNestedInputChange('antecedents', 'family', 'mother', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Antecedentes maternos..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hermanos
            </label>
            <input
              type="text"
              value={formData.antecedents.family.siblings}
              onChange={(e) => handleNestedInputChange('antecedents', 'family', 'siblings', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Antecedentes en hermanos..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hijos
            </label>
            <input
              type="text"
              value={formData.antecedents.family.children}
              onChange={(e) => handleNestedInputChange('antecedents', 'family', 'children', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Antecedentes en hijos..."
            />
          </div>
        </div>
      </div>

      {/* Allergies */}
      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
          Alergias
        </h4>

        <div className="space-y-4">
          {formData.allergies.map((allergy, index) => (
            <div key={index} className="bg-white p-4 rounded-lg border">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Alérgeno
                  </label>
                  <input
                    type="text"
                    value={allergy.allergen}
                    onChange={(e) => updateAllergy(index, 'allergen', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-red-500"
                    placeholder="Sustancia..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <select
                    value={allergy.type}
                    onChange={(e) => updateAllergy(index, 'type', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-red-500"
                  >
                    <option value="medicamento">Medicamento</option>
                    <option value="alimento">Alimento</option>
                    <option value="ambiental">Ambiental</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Severidad
                  </label>
                  <select
                    value={allergy.severity}
                    onChange={(e) => updateAllergy(index, 'severity', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-red-500"
                  >
                    <option value="leve">Leve</option>
                    <option value="moderada">Moderada</option>
                    <option value="grave">Grave</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Reacción
                  </label>
                  <input
                    type="text"
                    value={allergy.reaction}
                    onChange={(e) => updateAllergy(index, 'reaction', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-red-500"
                    placeholder="Síntomas..."
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeAllergy(index)}
                    className="p-2 text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addAllergy}
            className="flex items-center space-x-2 text-red-600 hover:text-red-800"
          >
            <Plus className="h-4 w-4" />
            <span>Agregar alergia</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderVitalsTab = () => (
    <div className="space-y-6">
      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
          <Activity className="h-5 w-5 mr-2 text-green-600" />
          Signos Vitales
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <Scale className="h-4 w-4 mr-2" />
              Peso (kg)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.vitalSigns.weight}
              onChange={(e) => handleInputChange('vitalSigns', 'weight', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="75.5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <Ruler className="h-4 w-4 mr-2" />
              Altura (cm)
            </label>
            <input
              type="number"
              value={formData.vitalSigns.height}
              onChange={(e) => handleInputChange('vitalSigns', 'height', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="170"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IMC
            </label>
            <input
              type="text"
              value={formData.vitalSigns.bmi}
              readOnly
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
              placeholder="Calculado automáticamente"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Presión Arterial (mmHg)
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={formData.vitalSigns.bloodPressure.systolic}
                onChange={(e) => handleNestedInputChange('vitalSigns', 'bloodPressure', 'systolic', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  errors['vitalSigns.bloodPressure'] ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="120"
              />
              <span className="text-gray-500">/</span>
              <input
                type="number"
                value={formData.vitalSigns.bloodPressure.diastolic}
                onChange={(e) => handleNestedInputChange('vitalSigns', 'bloodPressure', 'diastolic', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  errors['vitalSigns.bloodPressure'] ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="80"
              />
            </div>
            {errors['vitalSigns.bloodPressure'] && (
              <p className="text-red-600 text-sm mt-1">{errors['vitalSigns.bloodPressure']}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <Heart className="h-4 w-4 mr-2" />
              Frecuencia Cardíaca (lpm)
            </label>
            <input
              type="number"
              value={formData.vitalSigns.heartRate}
              onChange={(e) => handleInputChange('vitalSigns', 'heartRate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="72"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <Thermometer className="h-4 w-4 mr-2" />
              Temperatura (°C)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.vitalSigns.temperature}
              onChange={(e) => handleInputChange('vitalSigns', 'temperature', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="36.5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Frecuencia Respiratoria (rpm)
            </label>
            <input
              type="number"
              value={formData.vitalSigns.respiratoryRate}
              onChange={(e) => handleInputChange('vitalSigns', 'respiratoryRate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="16"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Saturación O₂ (%)
            </label>
            <input
              type="number"
              value={formData.vitalSigns.oxygenSaturation}
              onChange={(e) => handleInputChange('vitalSigns', 'oxygenSaturation', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="98"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
          <Droplets className="h-4 w-4 mr-2 text-red-600" />
          Grupo Sanguíneo
        </label>
        <select
          value={formData.bloodType}
          onChange={(e) => handleInputChange(null, 'bloodType', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          <option value="">Seleccionar grupo sanguíneo</option>
          <option value="A+">A+</option>
          <option value="A-">A-</option>
          <option value="B+">B+</option>
          <option value="B-">B-</option>
          <option value="AB+">AB+</option>
          <option value="AB-">AB-</option>
          <option value="O+">O+</option>
          <option value="O-">O-</option>
        </select>
      </div>
    </div>
  );

  const renderDiagnosisTab = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Diagnóstico Principal *
        </label>
        <input
          type="text"
          value={formData.diagnosis.primary}
          onChange={(e) => handleInputChange('diagnosis', 'primary', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
            errors['diagnosis.primary'] ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Diagnóstico principal..."
        />
        {errors['diagnosis.primary'] && (
          <p className="text-red-600 text-sm mt-1">{errors['diagnosis.primary']}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Diagnósticos Secundarios
        </label>
        <div className="space-y-2">
          {formData.diagnosis.secondary.map((diagnosis, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => handleArrayInputChange('diagnosis', 'secondary', index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Diagnóstico secundario..."
              />
              <button
                type="button"
                onClick={() => removeArrayItem('diagnosis', 'secondary', index)}
                className="p-2 text-red-600 hover:text-red-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => addArrayItem('diagnosis', 'secondary')}
            className="flex items-center space-x-2 text-green-600 hover:text-green-800"
          >
            <Plus className="h-4 w-4" />
            <span>Agregar diagnóstico secundario</span>
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Códigos CIE-10
        </label>
        <div className="space-y-2">
          {formData.diagnosis.icd10.map((code, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="text"
                value={code}
                onChange={(e) => handleArrayInputChange('diagnosis', 'icd10', index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Ej: I10, E11.9..."
              />
              <button
                type="button"
                onClick={() => removeArrayItem('diagnosis', 'icd10', index)}
                className="p-2 text-red-600 hover:text-red-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => addArrayItem('diagnosis', 'icd10')}
            className="flex items-center space-x-2 text-green-600 hover:text-green-800"
          >
            <Plus className="h-4 w-4" />
            <span>Agregar código CIE-10</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderTreatmentsTab = () => (
    <div className="space-y-6">
      {/* Alertas de interacciones */}
      {medicationWarnings.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-red-800 mb-2">Alertas de Medicación</h4>
              <div className="space-y-2">
                {medicationWarnings.map((warning, index) => (
                  <div key={index} className="text-sm text-red-700">
                    <p className="font-medium">{warning.warning}</p>
                    <p className="text-red-600">{warning.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-900">Tratamientos</h4>
          <button
            type="button"
            onClick={addTreatment}
            className="flex items-center space-x-2 bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            <span>Agregar Tratamiento</span>
          </button>
        </div>

        <div className="space-y-4">
          {formData.treatments.map((treatment, index) => (
            <div key={index} className="bg-white p-4 rounded-lg border">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Medicamento
                  </label>
                  <input
                    type="text"
                    value={treatment.medication}
                    onChange={(e) => updateTreatment(index, 'medication', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                    placeholder="Nombre del medicamento..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Dosis
                  </label>
                  <input
                    type="text"
                    value={treatment.dosage}
                    onChange={(e) => updateTreatment(index, 'dosage', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                    placeholder="10mg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Frecuencia
                  </label>
                  <input
                    type="text"
                    value={treatment.frequency}
                    onChange={(e) => updateTreatment(index, 'frequency', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                    placeholder="1 vez al día"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Vía
                  </label>
                  <select
                    value={treatment.route}
                    onChange={(e) => updateTreatment(index, 'route', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                  >
                    <option value="oral">Oral</option>
                    <option value="iv">Intravenosa</option>
                    <option value="im">Intramuscular</option>
                    <option value="topical">Tópica</option>
                    <option value="inhaled">Inhalada</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeTreatment(index)}
                    className="p-2 text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    value={treatment.startDate}
                    onChange={(e) => updateTreatment(index, 'startDate', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={treatment.status}
                    onChange={(e) => updateTreatment(index, 'status', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                  >
                    <option value="active">Activo</option>
                    <option value="suspended">Suspendido</option>
                    <option value="completed">Completado</option>
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Notas
                  </label>
                  <input
                    type="text"
                    value={treatment.notes}
                    onChange={(e) => updateTreatment(index, 'notes', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                    placeholder="Instrucciones adicionales..."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderExamTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Aspecto General
          </label>
          <textarea
            value={formData.physicalExam.general}
            onChange={(e) => handleInputChange('physicalExam', 'general', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            rows={3}
            placeholder="Estado general del paciente..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sistema Cardiovascular
          </label>
          <textarea
            value={formData.physicalExam.cardiovascular}
            onChange={(e) => handleInputChange('physicalExam', 'cardiovascular', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            rows={3}
            placeholder="Hallazgos cardiovasculares..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sistema Respiratorio
          </label>
          <textarea
            value={formData.physicalExam.respiratory}
            onChange={(e) => handleInputChange('physicalExam', 'respiratory', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            rows={3}
            placeholder="Hallazgos respiratorios..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Abdomen
          </label>
          <textarea
            value={formData.physicalExam.abdomen}
            onChange={(e) => handleInputChange('physicalExam', 'abdomen', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            rows={3}
            placeholder="Exploración abdominal..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sistema Neurológico
          </label>
          <textarea
            value={formData.physicalExam.neurological}
            onChange={(e) => handleInputChange('physicalExam', 'neurological', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            rows={3}
            placeholder="Exploración neurológica..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Otros Sistemas
          </label>
          <textarea
            value={formData.physicalExam.other}
            onChange={(e) => handleInputChange('physicalExam', 'other', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            rows={3}
            placeholder="Otros hallazgos relevantes..."
          />
        </div>
      </div>
    </div>
  );

  const renderPlanTab = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Recomendaciones
        </label>
        <div className="space-y-2">
          {formData.treatmentPlan.recommendations.map((recommendation, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="text"
                value={recommendation}
                onChange={(e) => handleArrayInputChange('treatmentPlan', 'recommendations', index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Recomendación..."
              />
              <button
                type="button"
                onClick={() => removeArrayItem('treatmentPlan', 'recommendations', index)}
                className="p-2 text-red-600 hover:text-red-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => addArrayItem('treatmentPlan', 'recommendations')}
            className="flex items-center space-x-2 text-green-600 hover:text-green-800"
          >
            <Plus className="h-4 w-4" />
            <span>Agregar recomendación</span>
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Próximo Seguimiento
        </label>
        <input
          type="date"
          value={formData.treatmentPlan.followUp}
          onChange={(e) => handleInputChange('treatmentPlan', 'followUp', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Pruebas Solicitadas
        </label>
        <div className="space-y-2">
          {formData.treatmentPlan.tests.map((test, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="text"
                value={test}
                onChange={(e) => handleArrayInputChange('treatmentPlan', 'tests', index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Prueba o examen..."
              />
              <button
                type="button"
                onClick={() => removeArrayItem('treatmentPlan', 'tests', index)}
                className="p-2 text-red-600 hover:text-red-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => addArrayItem('treatmentPlan', 'tests')}
            className="flex items-center space-x-2 text-green-600 hover:text-green-800"
          >
            <Plus className="h-4 w-4" />
            <span>Agregar prueba</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {existingRecord ? 'Editar' : 'Nuevo'} Dossier Médico
            </h2>
            <p className="text-gray-600">
              Paciente: {patient?.firstName} {patient?.lastName}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>{isSubmitting ? 'Guardando...' : 'Guardar'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b bg-gray-50">
        <nav className="flex space-x-8 px-6">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'basic' && renderBasicTab()}
        {activeTab === 'antecedents' && renderAntecedentsTab()}
        {activeTab === 'vitals' && renderVitalsTab()}
        {activeTab === 'diagnosis' && renderDiagnosisTab()}
        {activeTab === 'treatments' && renderTreatmentsTab()}
        {activeTab === 'exam' && renderExamTab()}
        {activeTab === 'plan' && renderPlanTab()}
      </div>

      {/* Error de soumission */}
      {errors.submit && (
        <div className="mx-6 mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-800">{errors.submit}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalRecordForm;