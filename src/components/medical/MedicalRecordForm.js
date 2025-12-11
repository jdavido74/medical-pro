// components/medical/MedicalRecordForm.js
import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import {
  FileText, Activity, Heart, AlertTriangle, Plus, X, Save,
  Stethoscope, Thermometer, Scale, Ruler, Droplets, Clock,
  Pill, CheckCircle, Trash2, User, Search, Check, Loader2,
  FileSignature, Eye, Printer, Settings, Edit3
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { medicalRecordsApi } from '../../api/medicalRecordsApi';
import { prescriptionsApi } from '../../api/prescriptionsApi';
import PrescriptionPreview from './PrescriptionPreview';

// Accept both single patient or patients array, and both onSave/onSubmit, existingRecord/initialData
const MedicalRecordForm = forwardRef(({
  patient,
  patients = [],
  existingRecord = null,
  initialData = null,
  lastRecord = null, // Dernier dossier du patient pour pré-remplir
  onSave,
  onSubmit,
  onCancel,
  onClose,
  isOpen
}, ref) => {
  const { user } = useAuth();

  // Normalize props - support both naming conventions
  const record = existingRecord || initialData;
  const handleSaveCallback = onSave || onSubmit;
  const handleClose = onCancel || onClose;

  // State for patient selection when no patient is pre-selected
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientSearchQuery, setPatientSearchQuery] = useState('');

  // Save state
  const [saveStatus, setSaveStatus] = useState('idle'); // idle, saving, saved, error
  const [currentRecordId, setCurrentRecordId] = useState(record?.id || null);

  // Get the actual patient (either from prop or from selected)
  const getPatientId = () => {
    if (patient?.id) return patient.id;
    if (record?.patientId) return record.patientId;
    return selectedPatientId;
  };

  // Filter patients for search
  const filteredPatients = patients.filter(p => {
    if (!patientSearchQuery) return true;
    const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
    return fullName.includes(patientSearchQuery.toLowerCase());
  });

  // Fonction pour sécuriser les données et éviter les erreurs undefined
  // previousRecord permet de pré-remplir les données persistantes du patient
  const ensureFormDataStructure = (data, previousRecord = null) => {
    // Données du dossier précédent à reprendre (antécédents, groupe sanguin, allergies, conditions chroniques)
    const prev = previousRecord || lastRecord;

    return {
      patientId: data?.patientId || patient?.id || selectedPatientId || '',
      practitionerId: data?.practitionerId || user?.id || '',
      type: data?.type || 'consultation',

      // Antécédents - repris du dossier précédent si disponible
      antecedents: {
        personal: {
          medicalHistory: data?.antecedents?.personal?.medicalHistory || prev?.antecedents?.personal?.medicalHistory || [],
          surgicalHistory: data?.antecedents?.personal?.surgicalHistory || prev?.antecedents?.personal?.surgicalHistory || [],
          allergies: data?.antecedents?.personal?.allergies || prev?.antecedents?.personal?.allergies || [],
          habits: {
            smoking: data?.antecedents?.personal?.habits?.smoking || prev?.antecedents?.personal?.habits?.smoking || { status: 'never', details: '' },
            alcohol: data?.antecedents?.personal?.habits?.alcohol || prev?.antecedents?.personal?.habits?.alcohol || { status: 'never', details: '' },
            exercise: data?.antecedents?.personal?.habits?.exercise || prev?.antecedents?.personal?.habits?.exercise || { status: 'never', details: '' }
          }
        },
        family: {
          father: data?.antecedents?.family?.father || prev?.antecedents?.family?.father || '',
          mother: data?.antecedents?.family?.mother || prev?.antecedents?.family?.mother || '',
          siblings: data?.antecedents?.family?.siblings || prev?.antecedents?.family?.siblings || '',
          children: data?.antecedents?.family?.children || prev?.antecedents?.family?.children || ''
        }
      },

      // Signes vitaux - repris comme référence mais modifiables
      vitalSigns: {
        weight: data?.vitalSigns?.weight || prev?.vitalSigns?.weight || '',
        height: data?.vitalSigns?.height || prev?.vitalSigns?.height || '',
        bmi: data?.vitalSigns?.bmi || '',
        bloodPressure: {
          systolic: data?.vitalSigns?.bloodPressure?.systolic || '',
          diastolic: data?.vitalSigns?.bloodPressure?.diastolic || ''
        },
        heartRate: data?.vitalSigns?.heartRate || '',
        temperature: data?.vitalSigns?.temperature || '',
        respiratoryRate: data?.vitalSigns?.respiratoryRate || '',
        oxygenSaturation: data?.vitalSigns?.oxygenSaturation || ''
      },

      // Données persistantes du patient - repris du dossier précédent
      bloodType: data?.bloodType || prev?.bloodType || '',
      allergies: data?.allergies || prev?.allergies || [],
      chronicConditions: data?.chronicConditions || prev?.chronicConditions || [],

      // Diagnostics - nouveau à chaque visite
      diagnosis: {
        primary: data?.diagnosis?.primary || '',
        secondary: data?.diagnosis?.secondary || [],
        icd10: data?.diagnosis?.icd10 || []
      },

      treatments: data?.treatments || [],

      // Informations basiques - nouveau à chaque visite
      basicInfo: {
        chiefComplaint: data?.basicInfo?.chiefComplaint || '',
        symptoms: data?.basicInfo?.symptoms || [],
        duration: data?.basicInfo?.duration || ''
      },

      // Examen physique - nouveau à chaque visite
      physicalExam: {
        general: data?.physicalExam?.general || '',
        cardiovascular: data?.physicalExam?.cardiovascular || '',
        respiratory: data?.physicalExam?.respiratory || '',
        abdomen: data?.physicalExam?.abdomen || '',
        neurological: data?.physicalExam?.neurological || '',
        other: data?.physicalExam?.other || ''
      },

      // Plan de traitement - nouveau à chaque visite
      treatmentPlan: {
        recommendations: data?.treatmentPlan?.recommendations || [],
        followUp: data?.treatmentPlan?.followUp || '',
        tests: data?.treatmentPlan?.tests || []
      },

      // Référence aux dernières valeurs vitales pour comparaison
      _previousVitalSigns: prev?.vitalSigns || null
    };
  };

  const [formData, setFormData] = useState(() => ensureFormDataStructure({
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
  }));

  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState('basic');
  const [medicationWarnings, setMedicationWarnings] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prescription (Ordonnance) state
  const [prescriptionData, setPrescriptionData] = useState({
    medications: [],
    instructions: '',
    additionalNotes: '',
    validUntil: '',
    renewable: false,
    renewalsRemaining: 0
  });
  // Options pour configurer ce qui est inclus dans l'ordonnance
  const [prescriptionOptions, setPrescriptionOptions] = useState({
    includeVitalSigns: true,
    includeDiagnosis: true,
    includeFromTreatments: false,  // Copier depuis l'onglet Traitements
    includeFromPlan: false          // Copier depuis l'onglet Plan
  });
  const [showPrescriptionPreview, setShowPrescriptionPreview] = useState(false);
  const [currentPrescription, setCurrentPrescription] = useState(null);
  const [prescriptionSaveStatus, setPrescriptionSaveStatus] = useState('idle');
  // Liste des ordonnances créées pour ce dossier
  const [savedPrescriptions, setSavedPrescriptions] = useState([]);
  const [editingPrescriptionIndex, setEditingPrescriptionIndex] = useState(null);

  // Cargar données existantes si modification
  useEffect(() => {
    if (existingRecord) {
      setFormData(ensureFormDataStructure(existingRecord));
    }
  }, [existingRecord]); // ensureFormDataStructure ne change pas car définie dans le composant

  // Charger les ordonnances existantes pour ce dossier médical
  useEffect(() => {
    const loadExistingPrescriptions = async () => {
      if (existingRecord?.id) {
        try {
          const prescriptions = await prescriptionsApi.getMedicalRecordPrescriptions(existingRecord.id);
          if (prescriptions && prescriptions.length > 0) {
            setSavedPrescriptions(prescriptions);
          }
        } catch (error) {
          console.error('Error loading prescriptions:', error);
        }
      }
    };
    loadExistingPrescriptions();
  }, [existingRecord?.id]);

  // Calculer BMI automatiquement
  useEffect(() => {
    const vitalSigns = formData.vitalSigns || {};
    const { weight, height } = vitalSigns;
    if (weight && height && weight > 0 && height > 0) {
      const heightInMeters = height / 100;
      const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(1);
      setFormData(prev => ({
        ...prev,
        vitalSigns: { ...prev.vitalSigns, bmi }
      }));
    }
  }, [formData.vitalSigns?.weight, formData.vitalSigns?.height]);

  // Vérifier interactions médicamenteuses (client-side check)
  useEffect(() => {
    if (formData.treatments && formData.treatments.length > 0) {
      // Simple client-side medication interaction check
      const warnings = checkMedicationInteractions(formData.treatments);
      setMedicationWarnings(warnings);
    } else {
      setMedicationWarnings([]);
    }
  }, [formData.treatments]);

  // Simple medication interaction checker (client-side)
  const checkMedicationInteractions = (treatments) => {
    const warnings = [];
    const knownInteractions = [
      { drugs: ['warfarin', 'aspirin'], warning: 'Riesgo de sangrado aumentado', recommendation: 'Monitorear INR' },
      { drugs: ['ibuprofen', 'aspirin'], warning: 'Riesgo gastrointestinal aumentado', recommendation: 'Considerar gastroprotección' },
      { drugs: ['metformin', 'contraste'], warning: 'Riesgo de acidosis láctica', recommendation: 'Suspender metformina antes de contraste' },
      { drugs: ['enalapril', 'potasio'], warning: 'Riesgo de hiperpotasemia', recommendation: 'Monitorear niveles de potasio' }
    ];

    const medications = treatments
      .filter(t => t.medication && t.status === 'active')
      .map(t => t.medication.toLowerCase());

    for (const interaction of knownInteractions) {
      const matches = interaction.drugs.filter(drug =>
        medications.some(med => med.includes(drug))
      );
      if (matches.length >= 2) {
        warnings.push({
          warning: interaction.warning,
          recommendation: interaction.recommendation,
          drugs: matches
        });
      }
    }

    return warnings;
  };

  // Exposer la méthode handleSubmit au composant parent
  useImperativeHandle(ref, () => ({
    handleSubmit: () => {
      if (!validateForm()) {
        return;
      }
      handleSubmitInternal();
    }
  }));

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

  // Helper pour accéder aux propriétés imbriquées avec chemin en dot-notation
  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  };

  // Helper pour définir une valeur imbriquée
  const setNestedValue = (obj, path, value) => {
    const parts = path.split('.');
    const result = { ...obj };
    let current = result;

    for (let i = 0; i < parts.length - 1; i++) {
      current[parts[i]] = { ...current[parts[i]] };
      current = current[parts[i]];
    }

    current[parts[parts.length - 1]] = value;
    return result;
  };

  const handleArrayInputChange = (section, field, index, value) => {
    setFormData(prev => {
      // Gérer les chemins imbriqués (ex: 'antecedents.personal')
      if (section.includes('.')) {
        const sectionValue = getNestedValue(prev, section);
        const currentArray = sectionValue?.[field] || [];
        const newSectionValue = {
          ...sectionValue,
          [field]: currentArray.map((item, i) => i === index ? value : item)
        };
        return setNestedValue(prev, section, newSectionValue);
      }

      // Cas simple (section de premier niveau)
      const currentArray = prev[section]?.[field] || [];
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: currentArray.map((item, i) => i === index ? value : item)
        }
      };
    });
  };

  const addArrayItem = (section, field, defaultValue = '') => {
    setFormData(prev => {
      // Gérer les chemins imbriqués (ex: 'antecedents.personal')
      if (section.includes('.')) {
        const sectionValue = getNestedValue(prev, section);
        const currentArray = sectionValue?.[field] || [];
        const newSectionValue = {
          ...sectionValue,
          [field]: [...currentArray, defaultValue]
        };
        return setNestedValue(prev, section, newSectionValue);
      }

      // Cas simple (section de premier niveau)
      const currentArray = prev[section]?.[field] || [];
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: [...currentArray, defaultValue]
        }
      };
    });
  };

  const removeArrayItem = (section, field, index) => {
    setFormData(prev => {
      // Gérer les chemins imbriqués (ex: 'antecedents.personal')
      if (section.includes('.')) {
        const sectionValue = getNestedValue(prev, section);
        const currentArray = sectionValue?.[field] || [];
        const newSectionValue = {
          ...sectionValue,
          [field]: currentArray.filter((_, i) => i !== index)
        };
        return setNestedValue(prev, section, newSectionValue);
      }

      // Cas simple (section de premier niveau)
      const currentArray = prev[section]?.[field] || [];
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: currentArray.filter((_, i) => i !== index)
        }
      };
    });
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
    if (!formData.basicInfo?.chiefComplaint?.trim()) {
      newErrors['basicInfo.chiefComplaint'] = 'El motivo de consulta es obligatorio';
    }

    if (!formData.diagnosis?.primary?.trim()) {
      newErrors['diagnosis.primary'] = 'El diagnóstico principal es obligatorio';
    }

    // Validation signos vitales
    if (formData.vitalSigns?.bloodPressure?.systolic && formData.vitalSigns?.bloodPressure?.diastolic) {
      const systolic = parseInt(formData.vitalSigns.bloodPressure.systolic);
      const diastolic = parseInt(formData.vitalSigns.bloodPressure.diastolic);

      if (systolic <= diastolic) {
        newErrors['vitalSigns.bloodPressure'] = 'La presión sistólica debe ser mayor que la diastólica';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitInternal = async () => {
    setIsSubmitting(true);
    try {
      // Ensure patientId is set from selected patient if not from props
      const patientId = formData.patientId || patient?.id || selectedPatientId;

      if (!patientId) {
        setErrors({ submit: 'Por favor seleccione un paciente' });
        setIsSubmitting(false);
        return;
      }

      const recordData = {
        ...formData,
        patientId, // Ensure patientId is set
        medicationWarnings,
        providerId: user?.id
      };

      let savedRecord;
      if (currentRecordId || (record && record.id)) {
        savedRecord = await medicalRecordsApi.updateMedicalRecord(currentRecordId || record.id, recordData);
      } else {
        savedRecord = await medicalRecordsApi.createMedicalRecord(recordData);
        // Store the new record ID for subsequent saves
        if (savedRecord?.id) {
          setCurrentRecordId(savedRecord.id);
        }
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);

      handleSaveCallback && handleSaveCallback(savedRecord || recordData);
    } catch (error) {
      console.error('Error saving medical record:', error);
      setErrors({ submit: error.message || 'Error al guardar el registro médico' });
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    await handleSubmitInternal();
  };

  const tabs = [
    { id: 'basic', label: 'Información Básica', icon: FileText },
    { id: 'antecedents', label: 'Antecedentes', icon: Clock },
    { id: 'vitals', label: 'Signos Vitales', icon: Activity },
    { id: 'diagnosis', label: 'Diagnóstico', icon: Stethoscope },
    { id: 'treatments', label: 'Tratamientos', icon: Pill },
    { id: 'exam', label: 'Examen Físico', icon: Heart },
    { id: 'plan', label: 'Plan', icon: CheckCircle },
    { id: 'prescription', label: 'Ordonnance', icon: FileSignature }
  ];

  const renderBasicTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Motivo de Consulta *
          </label>
          <textarea
            value={formData.basicInfo?.chiefComplaint || ''}
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
              value={formData.vitalSigns?.weight || ''}
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
              value={formData.vitalSigns?.height || ''}
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
              value={formData.vitalSigns?.bmi || ''}
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

  // === Prescription (Ordonnance) Tab ===

  // Add medication to prescription
  const addPrescriptionMedication = () => {
    setPrescriptionData(prev => ({
      ...prev,
      medications: [
        ...prev.medications,
        {
          medication: '',
          dosage: '',
          frequency: '',
          route: 'oral',
          duration: '',
          quantity: '',
          instructions: ''
        }
      ]
    }));
  };

  // Update medication in prescription
  const updatePrescriptionMedication = (index, field, value) => {
    setPrescriptionData(prev => ({
      ...prev,
      medications: prev.medications.map((med, i) =>
        i === index ? { ...med, [field]: value } : med
      )
    }));
  };

  // Remove medication from prescription
  const removePrescriptionMedication = (index) => {
    setPrescriptionData(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }));
  };

  // Copy treatments to prescription
  const copyTreatmentsToPrescription = () => {
    if (formData.treatments && formData.treatments.length > 0) {
      const newMedications = formData.treatments
        .filter(t => t.medication && t.status === 'active')
        .map(t => ({
          medication: t.medication || '',
          dosage: t.dosage || '',
          frequency: t.frequency || '',
          route: t.route || 'oral',
          duration: '',
          quantity: '',
          instructions: t.notes || ''
        }));

      setPrescriptionData(prev => ({
        ...prev,
        medications: [...prev.medications, ...newMedications]
      }));
    }
  };

  // Build prescription object for preview/save
  const buildPrescriptionObject = () => {
    const patientData = patient || {};
    return {
      patientId: getPatientId(),
      providerId: user?.id,
      medicalRecordId: currentRecordId,
      medications: prescriptionData.medications,
      instructions: prescriptionData.instructions,
      additionalNotes: prescriptionData.additionalNotes,
      prescribedDate: new Date().toISOString().split('T')[0],
      validUntil: prescriptionData.validUntil || null,
      renewable: prescriptionData.renewable,
      renewalsRemaining: prescriptionData.renewalsRemaining,
      // Snapshots
      patientSnapshot: {
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        birthDate: patientData.birthDate,
        gender: patientData.gender,
        patientNumber: patientData.patientNumber,
        address: patientData.address,
        phone: patientData.phone
      },
      providerSnapshot: {
        firstName: user?.firstName,
        lastName: user?.lastName,
        specialty: user?.specialty,
        rpps: user?.rpps,
        adeli: user?.adeli
      },
      vitalSigns: formData.vitalSigns,
      diagnosis: formData.diagnosis
    };
  };

  // Preview prescription
  const handlePreviewPrescription = () => {
    if (prescriptionData.medications.length === 0) {
      setErrors({ prescription: 'Ajoutez au moins un médicament avant de prévisualiser' });
      return;
    }
    setCurrentPrescription(buildPrescriptionObject());
    setShowPrescriptionPreview(true);
  };

  // Save prescription
  const handleSavePrescription = async () => {
    if (prescriptionData.medications.length === 0) {
      setErrors({ prescription: 'Ajoutez au moins un médicament' });
      return;
    }

    setPrescriptionSaveStatus('saving');
    try {
      const prescriptionObj = buildPrescriptionObject();
      const saved = await prescriptionsApi.createPrescription(prescriptionObj);
      setCurrentPrescription(saved);
      setPrescriptionSaveStatus('saved');
      setTimeout(() => setPrescriptionSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving prescription:', error);
      setPrescriptionSaveStatus('error');
      setErrors({ prescription: error.message || 'Erreur lors de l\'enregistrement' });
    }
  };

  // Finalize prescription
  const handleFinalizePrescription = async () => {
    if (!currentPrescription?.id) {
      // Save first
      await handleSavePrescription();
    }
    if (currentPrescription?.id) {
      try {
        const finalized = await prescriptionsApi.finalizePrescription(currentPrescription.id);
        setCurrentPrescription(finalized);
      } catch (error) {
        console.error('Error finalizing prescription:', error);
        setErrors({ prescription: error.message });
      }
    }
  };

  // Mark as printed
  const handlePrescriptionPrinted = async () => {
    if (currentPrescription?.id) {
      try {
        await prescriptionsApi.markPrescriptionPrinted(currentPrescription.id);
      } catch (error) {
        console.error('Error marking printed:', error);
      }
    }
  };

  // Reset prescription form for new prescription
  const resetPrescriptionForm = () => {
    setPrescriptionData({
      medications: [],
      instructions: '',
      additionalNotes: '',
      validUntil: '',
      renewable: false,
      renewalsRemaining: 0
    });
    setEditingPrescriptionIndex(null);
    setPrescriptionSaveStatus('idle');
  };

  // Load prescription into form for editing
  const loadPrescriptionForEdit = (prescription, index) => {
    setPrescriptionData({
      medications: prescription.medications || [],
      instructions: prescription.instructions || '',
      additionalNotes: prescription.additionalNotes || '',
      validUntil: prescription.validUntil ? prescription.validUntil.split('T')[0] : '',
      renewable: prescription.renewable || false,
      renewalsRemaining: prescription.renewalsRemaining || 0
    });
    setCurrentPrescription(prescription);
    setEditingPrescriptionIndex(index);
    setPrescriptionSaveStatus('idle');
  };

  // Get active treatments from the treatments tab
  const getActiveTreatments = useCallback(() => {
    if (!formData.treatments) return [];
    return formData.treatments
      .filter(t => t.medication && t.status === 'active')
      .map(t => ({
        medication: t.medication || '',
        dosage: t.dosage || '',
        frequency: t.frequency || '',
        route: t.route || 'oral',
        duration: t.duration || '',
        quantity: '',
        instructions: t.instructions || ''
      }));
  }, [formData.treatments]);

  // Get recommendations from plan tab
  const getPlanRecommendations = useCallback(() => {
    if (!formData.treatmentPlan?.recommendations) return [];
    return formData.treatmentPlan.recommendations.filter(r => r && r.trim());
  }, [formData.treatmentPlan?.recommendations]);

  // Auto-apply treatments when checkbox is toggled
  useEffect(() => {
    if (prescriptionOptions.includeFromTreatments) {
      const treatmentMeds = getActiveTreatments();
      if (treatmentMeds.length > 0) {
        setPrescriptionData(prev => {
          // Avoid duplicates
          const existingMedNames = prev.medications.map(m => m.medication.toLowerCase());
          const newMeds = treatmentMeds.filter(m => !existingMedNames.includes(m.medication.toLowerCase()));
          if (newMeds.length > 0) {
            return { ...prev, medications: [...prev.medications, ...newMeds] };
          }
          return prev;
        });
      }
    }
  }, [prescriptionOptions.includeFromTreatments, getActiveTreatments]);

  // Auto-apply recommendations when checkbox is toggled
  useEffect(() => {
    if (prescriptionOptions.includeFromPlan) {
      const recommendations = getPlanRecommendations();
      if (recommendations.length > 0) {
        const recommendationsText = recommendations.join('\n- ');
        setPrescriptionData(prev => {
          // Only add if not already present
          if (!prev.instructions.includes('Recommandations:')) {
            const newInstructions = prev.instructions
              ? `${prev.instructions}\n\nRecommandations:\n- ${recommendationsText}`
              : `Recommandations:\n- ${recommendationsText}`;
            return { ...prev, instructions: newInstructions };
          }
          return prev;
        });
      }
    }
  }, [prescriptionOptions.includeFromPlan, getPlanRecommendations]);

  // Save current prescription to list
  const handleSavePrescriptionToList = async () => {
    if (prescriptionData.medications.length === 0) {
      setErrors(prev => ({ ...prev, prescription: 'Ajoutez au moins un médicament' }));
      return;
    }

    setPrescriptionSaveStatus('saving');

    try {
      const prescriptionPayload = {
        patientId: getPatientId(),
        medicalRecordId: existingRecord?.id || null,
        medications: prescriptionData.medications,
        instructions: prescriptionData.instructions,
        additionalNotes: prescriptionData.additionalNotes,
        validUntil: prescriptionData.validUntil || null,
        renewable: prescriptionData.renewable,
        renewalsRemaining: prescriptionData.renewalsRemaining,
        // Include snapshots based on options
        vitalSigns: prescriptionOptions.includeVitalSigns ? (formData.vitalSigns || {}) : {},
        diagnosis: prescriptionOptions.includeDiagnosis ? {
          primaryDiagnosis: formData.diagnoses?.primary || '',
          secondaryDiagnoses: formData.diagnoses?.secondary || [],
          clinicalNotes: formData.subjective?.chiefComplaint || ''
        } : {},
        patientSnapshot: {
          firstName: patient?.firstName || '',
          lastName: patient?.lastName || '',
          dateOfBirth: patient?.dateOfBirth || '',
          gender: patient?.gender || '',
          address: patient?.address || {}
        },
        providerSnapshot: {
          name: user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
          specialty: user?.specialty || '',
          license: user?.licenseNumber || ''
        }
      };

      let savedPrescription;

      if (editingPrescriptionIndex !== null && savedPrescriptions[editingPrescriptionIndex]?.id) {
        // Update existing prescription
        savedPrescription = await prescriptionsApi.updatePrescription(
          savedPrescriptions[editingPrescriptionIndex].id,
          prescriptionPayload
        );

        setSavedPrescriptions(prev => {
          const updated = [...prev];
          updated[editingPrescriptionIndex] = savedPrescription;
          return updated;
        });
      } else {
        // Create new prescription
        savedPrescription = await prescriptionsApi.createPrescription(prescriptionPayload);
        setSavedPrescriptions(prev => [...prev, savedPrescription]);
      }

      setCurrentPrescription(savedPrescription);
      setPrescriptionSaveStatus('saved');

      // Reset for new prescription after short delay
      setTimeout(() => {
        resetPrescriptionForm();
      }, 1500);

    } catch (error) {
      console.error('Error saving prescription:', error);
      setErrors(prev => ({ ...prev, prescription: error.message || 'Erreur lors de la sauvegarde' }));
      setPrescriptionSaveStatus('error');
    }
  };

  // Delete a saved prescription
  const handleDeletePrescription = async (index) => {
    const prescription = savedPrescriptions[index];

    if (prescription?.id) {
      try {
        await prescriptionsApi.cancelPrescription(prescription.id);
      } catch (error) {
        console.error('Error canceling prescription:', error);
      }
    }

    setSavedPrescriptions(prev => prev.filter((_, i) => i !== index));

    if (editingPrescriptionIndex === index) {
      resetPrescriptionForm();
    }
  };

  // Preview a saved prescription
  const handlePreviewSavedPrescription = (prescription) => {
    setCurrentPrescription({
      ...prescription,
      patientSnapshot: prescription.patientSnapshot || {
        firstName: patient?.firstName || '',
        lastName: patient?.lastName || '',
        dateOfBirth: patient?.dateOfBirth || ''
      },
      providerSnapshot: prescription.providerSnapshot || {
        name: user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
        specialty: user?.specialty || ''
      },
      vitalSigns: prescription.vitalSigns || (prescriptionOptions.includeVitalSigns ? formData.vitalSigns : {}),
      diagnosis: prescription.diagnosis || {}
    });
    setShowPrescriptionPreview(true);
  };

  const renderPrescriptionTab = () => (
    <div className="space-y-6">
      {/* Header with new prescription button */}
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-semibold text-gray-900 flex items-center">
          <FileSignature className="h-5 w-5 mr-2 text-blue-600" />
          Ordonnances Médicales
        </h4>
        <button
          type="button"
          onClick={resetPrescriptionForm}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Plus className="h-4 w-4" />
          <span>Nouvelle ordonnance</span>
        </button>
      </div>

      {/* Saved prescriptions list */}
      {savedPrescriptions.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg border">
          <h5 className="font-medium text-gray-900 mb-3 flex items-center">
            <FileSignature className="h-4 w-4 mr-2" />
            Ordonnances créées ({savedPrescriptions.length})
          </h5>
          <div className="space-y-2">
            {savedPrescriptions.map((prescription, index) => (
              <div
                key={prescription.id || index}
                className={`flex items-center justify-between p-3 bg-white rounded-lg border ${
                  editingPrescriptionIndex === index ? 'border-blue-500 ring-2 ring-blue-200' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    prescription.status === 'finalized' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {prescription.prescriptionNumber || `Ordonnance #${index + 1}`}
                    </p>
                    <p className="text-sm text-gray-500">
                      {prescription.medications?.length || 0} médicament(s)
                      {prescription.status === 'finalized' && ' • Finalisée'}
                      {prescription.printCount > 0 && ` • Imprimée ${prescription.printCount}x`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handlePreviewSavedPrescription(prescription)}
                    className="p-2 text-gray-500 hover:text-blue-600"
                    title="Prévisualiser"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  {prescription.status !== 'finalized' && (
                    <>
                      <button
                        type="button"
                        onClick={() => loadPrescriptionForEdit(prescription, index)}
                        className="p-2 text-gray-500 hover:text-blue-600"
                        title="Modifier"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePrescription(index)}
                        className="p-2 text-gray-500 hover:text-red-600"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Configuration options with live preview */}
      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
        <h5 className="font-medium text-purple-900 mb-3 flex items-center">
          <Settings className="h-4 w-4 mr-2" />
          Configuration de l'ordonnance
        </h5>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column - Checkboxes */}
          <div className="space-y-4">
            <div className="space-y-3">
              <p className="text-sm text-purple-700 font-medium">Éléments à inclure dans l'ordonnance :</p>
              <label className="flex items-start space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prescriptionOptions.includeVitalSigns}
                  onChange={(e) => setPrescriptionOptions(prev => ({ ...prev, includeVitalSigns: e.target.checked }))}
                  className="h-4 w-4 mt-0.5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Signes vitaux du jour</span>
              </label>
              <label className="flex items-start space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prescriptionOptions.includeDiagnosis}
                  onChange={(e) => setPrescriptionOptions(prev => ({ ...prev, includeDiagnosis: e.target.checked }))}
                  className="h-4 w-4 mt-0.5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Diagnostic(s)</span>
              </label>
            </div>
            <div className="space-y-3 pt-2 border-t border-purple-200">
              <p className="text-sm text-purple-700 font-medium">Ajouter automatiquement depuis le dossier :</p>
              <label className="flex items-start space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prescriptionOptions.includeFromTreatments}
                  onChange={(e) => setPrescriptionOptions(prev => ({ ...prev, includeFromTreatments: e.target.checked }))}
                  className="h-4 w-4 mt-0.5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">
                  Traitements actifs
                  {getActiveTreatments().length > 0 && (
                    <span className="ml-1 text-purple-600 font-medium">
                      ({getActiveTreatments().length})
                    </span>
                  )}
                </span>
              </label>
              <label className="flex items-start space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prescriptionOptions.includeFromPlan}
                  onChange={(e) => setPrescriptionOptions(prev => ({ ...prev, includeFromPlan: e.target.checked }))}
                  className="h-4 w-4 mt-0.5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">
                  Recommandations du plan
                  {getPlanRecommendations().length > 0 && (
                    <span className="ml-1 text-purple-600 font-medium">
                      ({getPlanRecommendations().length})
                    </span>
                  )}
                </span>
              </label>
            </div>
          </div>

          {/* Right column - Live preview */}
          <div className="bg-white p-3 rounded-lg border border-purple-200 text-sm">
            <p className="text-purple-700 font-medium mb-2">Aperçu des éléments sélectionnés :</p>

            {/* Vital Signs Preview */}
            {prescriptionOptions.includeVitalSigns && formData.vitalSigns && (
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-600 mb-1">Signes vitaux :</p>
                <div className="text-xs text-gray-500 pl-2 border-l-2 border-purple-300">
                  {formData.vitalSigns.bloodPressureSystolic && formData.vitalSigns.bloodPressureDiastolic && (
                    <span className="block">TA: {formData.vitalSigns.bloodPressureSystolic}/{formData.vitalSigns.bloodPressureDiastolic} mmHg</span>
                  )}
                  {formData.vitalSigns.heartRate && <span className="block">FC: {formData.vitalSigns.heartRate} bpm</span>}
                  {formData.vitalSigns.temperature && <span className="block">T°: {formData.vitalSigns.temperature}°C</span>}
                  {formData.vitalSigns.weight && <span className="block">Poids: {formData.vitalSigns.weight} kg</span>}
                  {!formData.vitalSigns.bloodPressureSystolic && !formData.vitalSigns.heartRate && !formData.vitalSigns.temperature && !formData.vitalSigns.weight && (
                    <span className="text-gray-400 italic">Aucun signe vital renseigné</span>
                  )}
                </div>
              </div>
            )}

            {/* Diagnosis Preview */}
            {prescriptionOptions.includeDiagnosis && (
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-600 mb-1">Diagnostic :</p>
                <div className="text-xs text-gray-500 pl-2 border-l-2 border-purple-300">
                  {formData.diagnoses?.primary ? (
                    <span className="block">{formData.diagnoses.primary}</span>
                  ) : formData.subjective?.chiefComplaint ? (
                    <span className="block">{formData.subjective.chiefComplaint}</span>
                  ) : (
                    <span className="text-gray-400 italic">Aucun diagnostic renseigné</span>
                  )}
                </div>
              </div>
            )}

            {/* Treatments Preview */}
            {prescriptionOptions.includeFromTreatments && (
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-600 mb-1">Traitements à ajouter :</p>
                <div className="text-xs text-gray-500 pl-2 border-l-2 border-green-300">
                  {getActiveTreatments().length > 0 ? (
                    getActiveTreatments().map((t, i) => (
                      <span key={i} className="block">• {t.medication} {t.dosage && `- ${t.dosage}`} {t.frequency && `(${t.frequency})`}</span>
                    ))
                  ) : (
                    <span className="text-gray-400 italic">Aucun traitement actif</span>
                  )}
                </div>
              </div>
            )}

            {/* Recommendations Preview */}
            {prescriptionOptions.includeFromPlan && (
              <div className="mb-2">
                <p className="text-xs font-medium text-gray-600 mb-1">Recommandations à ajouter :</p>
                <div className="text-xs text-gray-500 pl-2 border-l-2 border-blue-300">
                  {getPlanRecommendations().length > 0 ? (
                    getPlanRecommendations().map((r, i) => (
                      <span key={i} className="block">• {r}</span>
                    ))
                  ) : (
                    <span className="text-gray-400 italic">Aucune recommandation</span>
                  )}
                </div>
              </div>
            )}

            {/* No selection message */}
            {!prescriptionOptions.includeVitalSigns && !prescriptionOptions.includeDiagnosis &&
             !prescriptionOptions.includeFromTreatments && !prescriptionOptions.includeFromPlan && (
              <p className="text-gray-400 italic text-xs">Cochez les options pour voir l'aperçu</p>
            )}
          </div>
        </div>
      </div>

      {/* Error display */}
      {errors.prescription && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-red-800 text-sm">{errors.prescription}</span>
        </div>
      )}

      {/* Current prescription form */}
      <div className={`bg-blue-50 p-4 rounded-lg border border-blue-200 ${editingPrescriptionIndex !== null ? 'ring-2 ring-blue-400' : ''}`}>
        <div className="flex justify-between items-center mb-4">
          <h5 className="font-medium text-blue-900">
            {editingPrescriptionIndex !== null
              ? `Modification de l'ordonnance #${editingPrescriptionIndex + 1}`
              : 'Nouvelle ordonnance - Médicaments prescrits'}
          </h5>
          <div className="flex items-center space-x-2">
            {editingPrescriptionIndex !== null && (
              <button
                type="button"
                onClick={resetPrescriptionForm}
                className="text-sm text-gray-600 hover:text-gray-800 flex items-center"
              >
                <X className="h-4 w-4 mr-1" />
                Annuler
              </button>
            )}
            <button
              type="button"
              onClick={addPrescriptionMedication}
              className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Ajouter médicament</span>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {prescriptionData.medications.map((med, index) => (
            <div key={index} className="bg-white p-4 rounded-lg border shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Médicament *</label>
                  <input
                    type="text"
                    value={med.medication}
                    onChange={(e) => updatePrescriptionMedication(index, 'medication', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    placeholder="Nom du médicament..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Dosage *</label>
                  <input
                    type="text"
                    value={med.dosage}
                    onChange={(e) => updatePrescriptionMedication(index, 'dosage', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    placeholder="10mg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fréquence *</label>
                  <input
                    type="text"
                    value={med.frequency}
                    onChange={(e) => updatePrescriptionMedication(index, 'frequency', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    placeholder="3x/jour"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Voie</label>
                  <select
                    value={med.route}
                    onChange={(e) => updatePrescriptionMedication(index, 'route', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="oral">Orale</option>
                    <option value="iv">IV</option>
                    <option value="im">IM</option>
                    <option value="topical">Topique</option>
                    <option value="inhaled">Inhalée</option>
                    <option value="sublingual">Sublinguale</option>
                    <option value="rectal">Rectale</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removePrescriptionMedication(index)}
                    className="p-2 text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Durée</label>
                  <input
                    type="text"
                    value={med.duration}
                    onChange={(e) => updatePrescriptionMedication(index, 'duration', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    placeholder="7 jours"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Quantité</label>
                  <input
                    type="text"
                    value={med.quantity}
                    onChange={(e) => updatePrescriptionMedication(index, 'quantity', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    placeholder="1 boîte"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Instructions</label>
                  <input
                    type="text"
                    value={med.instructions}
                    onChange={(e) => updatePrescriptionMedication(index, 'instructions', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    placeholder="À prendre pendant les repas..."
                  />
                </div>
              </div>
            </div>
          ))}

          {prescriptionData.medications.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <FileSignature className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Aucun médicament ajouté</p>
              <p className="text-sm">Cliquez sur "Ajouter médicament" ou utilisez la configuration ci-dessus</p>
            </div>
          )}
        </div>
      </div>

      {/* Instructions générales */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Instructions générales pour le patient
        </label>
        <textarea
          value={prescriptionData.instructions}
          onChange={(e) => setPrescriptionData(prev => ({ ...prev, instructions: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
          placeholder="Instructions supplémentaires pour le patient..."
        />
      </div>

      {/* Notes additionnelles (médecin) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes additionnelles du médecin
        </label>
        <textarea
          value={prescriptionData.additionalNotes}
          onChange={(e) => setPrescriptionData(prev => ({ ...prev, additionalNotes: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={2}
          placeholder="Notes personnelles (seront incluses dans l'ordonnance)..."
        />
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Valide jusqu'au
          </label>
          <input
            type="date"
            value={prescriptionData.validUntil}
            onChange={(e) => setPrescriptionData(prev => ({ ...prev, validUntil: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="renewable"
            checked={prescriptionData.renewable}
            onChange={(e) => setPrescriptionData(prev => ({ ...prev, renewable: e.target.checked }))}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="renewable" className="ml-2 text-sm text-gray-700">
            Renouvelable
          </label>
        </div>
        {prescriptionData.renewable && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de renouvellements
            </label>
            <input
              type="number"
              min="0"
              max="12"
              value={prescriptionData.renewalsRemaining}
              onChange={(e) => setPrescriptionData(prev => ({ ...prev, renewalsRemaining: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={handlePreviewPrescription}
          disabled={prescriptionData.medications.length === 0}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Eye className="h-4 w-4" />
          <span>Prévisualiser</span>
        </button>
        <button
          type="button"
          onClick={handleSavePrescriptionToList}
          disabled={prescriptionData.medications.length === 0 || prescriptionSaveStatus === 'saving'}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {prescriptionSaveStatus === 'saving' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>
            {prescriptionSaveStatus === 'saving'
              ? 'Enregistrement...'
              : editingPrescriptionIndex !== null
                ? 'Mettre à jour'
                : 'Enregistrer l\'ordonnance'}
          </span>
        </button>
      </div>

      {/* Status message */}
      {prescriptionSaveStatus === 'saved' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center">
          <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
          <span className="text-green-800 text-sm">Ordonnance enregistrée avec succès</span>
        </div>
      )}
    </div>
  );

  // Check if we need to show patient selector
  const showPatientSelector = !patient && !record?.patientId && patients.length > 0;
  const currentPatientId = getPatientId();
  const currentPatient = patients.find(p => p.id === currentPatientId);

  return (
    <div className="h-full flex flex-col bg-white">{/* Structure flex pour footer sticky */}

      {/* Patient Selector - shown when no patient is pre-selected */}
      {showPatientSelector && (
        <div className="p-6 border-b bg-blue-50">
          <div className="flex items-center mb-3">
            <User className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-blue-900">Seleccionar Paciente</h3>
          </div>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar paciente por nombre..."
                value={patientSearchQuery}
                onChange={(e) => setPatientSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={selectedPatientId}
              onChange={(e) => {
                setSelectedPatientId(e.target.value);
                // Update formData with new patientId
                setFormData(prev => ({ ...prev, patientId: e.target.value }));
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">-- Seleccione un paciente --</option>
              {filteredPatients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName} {p.patientNumber ? `(${p.patientNumber})` : ''}
                </option>
              ))}
            </select>
            {selectedPatientId && (
              <div className="text-sm text-blue-700 bg-blue-100 px-3 py-2 rounded">
                Paciente seleccionado: <strong>{currentPatient?.firstName} {currentPatient?.lastName}</strong>
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* Zone scrollable du contenu */}
      <div className="flex-1 overflow-y-auto">
        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'basic' && renderBasicTab()}
          {activeTab === 'antecedents' && renderAntecedentsTab()}
          {activeTab === 'vitals' && renderVitalsTab()}
          {activeTab === 'diagnosis' && renderDiagnosisTab()}
          {activeTab === 'treatments' && renderTreatmentsTab()}
          {activeTab === 'exam' && renderExamTab()}
          {activeTab === 'plan' && renderPlanTab()}
          {activeTab === 'prescription' && renderPrescriptionTab()}
        </div>

        {/* Error de soumission */}
        {errors.submit && (
          <div className="mx-6 mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800">{errors.submit}</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer fixe avec bouton Enregistrer */}
      <div className="shrink-0 bg-white border-t px-6 py-3 flex items-center justify-between shadow-lg">
        {/* Indicateur de statut */}
        <div className="flex items-center text-sm">
          {saveStatus === 'saved' && (
            <span className="flex items-center text-green-600">
              <Check className="h-4 w-4 mr-2" />
              Enregistré avec succès
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center text-red-600">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Erreur lors de l'enregistrement
            </span>
          )}
          {formData._previousVitalSigns && (
            <span className="flex items-center text-blue-500 text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Données pré-remplies depuis le dernier dossier
            </span>
          )}
        </div>

        {/* Boutons d'action */}
        <div className="flex items-center space-x-3">
          {handleClose && (
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Annuler
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Enregistrement...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Enregistrer le dossier</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Prescription Preview Modal */}
      {showPrescriptionPreview && currentPrescription && (
        <PrescriptionPreview
          prescription={currentPrescription}
          patient={patient}
          provider={user}
          clinicInfo={{
            name: 'Clinique Médicale',
            address: '',
            phone: '',
            city: ''
          }}
          onClose={() => setShowPrescriptionPreview(false)}
          onPrint={handlePrescriptionPrinted}
          onFinalize={handleFinalizePrescription}
          isFinalized={currentPrescription?.status === 'finalized' || currentPrescription?.status === 'printed'}
        />
      )}
    </div>
  );
});

MedicalRecordForm.displayName = 'MedicalRecordForm';

export default MedicalRecordForm;