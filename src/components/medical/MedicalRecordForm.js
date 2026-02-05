// components/medical/MedicalRecordForm.js
import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import {
  FileText, Activity, Heart, AlertTriangle, Plus, X, Save,
  Stethoscope, Thermometer, Scale, Ruler, Droplets, Clock,
  Pill, CheckCircle, Trash2, User, Search, Check, Loader2,
  FileSignature, Eye, Printer, Settings, Edit3, Calendar, Users, Package
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { medicalRecordsApi } from '../../api/medicalRecordsApi';
import { prescriptionsApi } from '../../api/prescriptionsApi';
import { healthcareProvidersApi } from '../../api/healthcareProvidersApi';
import PrescriptionPreview from './PrescriptionPreview';
import SmokingAssessment from './SmokingAssessment';
import AlcoholAssessment from './AlcoholAssessment';
import CatalogProductSelector from '../common/CatalogProductSelector';
import { catalogStorage } from '../../utils/catalogStorage';
import { useTranslation } from 'react-i18next';

// Accept both single patient or patients array, and both onSave/onSubmit, existingRecord/initialData
const MedicalRecordForm = forwardRef(({
  patient,
  patients = [],
  existingRecord = null,
  initialData = null,
  lastRecord = null, // Dernier dossier du patient pour pré-remplir
  initialActiveTab = 'basic', // Onglet initial à afficher
  onSave,
  onSubmit,
  onCancel,
  onClose,
  onActiveTabChange, // Callback pour notifier du changement d'onglet
  isOpen
}, ref) => {
  const { user } = useAuth();
  const { t } = useTranslation(['medical', 'common']);

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
      practitionerId: data?.practitionerId || user?.providerId || '',
      type: data?.type || 'consultation',

      // Date et heure de la consultation - éditable, par défaut maintenant
      recordDate: data?.recordDate || new Date().toISOString().slice(0, 16),

      // Assistant optionnel (infirmière, aide-soignant, etc.)
      assistantProviderId: data?.assistantProviderId || '',

      // Antécédents - repris du dossier précédent si disponible
      antecedents: {
        personal: {
          medicalHistory: data?.antecedents?.personal?.medicalHistory || prev?.antecedents?.personal?.medicalHistory || [],
          surgicalHistory: data?.antecedents?.personal?.surgicalHistory || prev?.antecedents?.personal?.surgicalHistory || [],
          allergies: data?.antecedents?.personal?.allergies || prev?.antecedents?.personal?.allergies || [],
          habits: {
            smoking: data?.antecedents?.personal?.habits?.smoking || prev?.antecedents?.personal?.habits?.smoking || {
              status: 'never',
              cigarettesPerDay: 0,
              yearsSmoking: 0,
              quitYear: null,
              packYears: 0,
              exposureLevel: 'low',
              healthAlerts: []
            },
            alcohol: data?.antecedents?.personal?.habits?.alcohol || prev?.antecedents?.personal?.habits?.alcohol || {
              status: 'never',
              drinksPerWeek: 0,
              auditC: { frequency: 0, quantity: 0, binge: 0 },
              auditCScore: 0,
              riskLevel: 'low',
              healthAlerts: []
            },
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

      // Traitement actuel - médicaments pris actuellement par le patient (persistant)
      currentMedications: data?.currentMedications || prev?.currentMedications || [],

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
    practitionerId: user?.providerId || '',
    type: 'consultation',

    // US 2.1 - Antécédents
    antecedents: {
      personal: {
        medicalHistory: [],
        surgicalHistory: [],
        allergies: [],
        habits: {
          smoking: {
            status: 'never',
            cigarettesPerDay: 0,
            yearsSmoking: 0,
            quitYear: null,
            packYears: 0,
            exposureLevel: 'low',
            healthAlerts: []
          },
          alcohol: {
            status: 'never',
            drinksPerWeek: 0,
            auditC: { frequency: 0, quantity: 0, binge: 0 },
            auditCScore: 0,
            riskLevel: 'low',
            healthAlerts: []
          },
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

    // Traitement actuel - médicaments pris actuellement par le patient
    currentMedications: [],

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
  const [activeTab, setActiveTab] = useState(initialActiveTab || 'basic');
  const [medicationWarnings, setMedicationWarnings] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCatalogSearch, setShowCatalogSearch] = useState(false);

  // Liste du personnel médical pour le champ assistant
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);

  // Initialiser le cache catalogue pour le sélecteur de traitements
  useEffect(() => {
    catalogStorage.initialize();
  }, []);

  // Charger la liste du personnel médical
  useEffect(() => {
    const loadStaff = async () => {
      try {
        setStaffLoading(true);
        const result = await healthcareProvidersApi.getHealthcareProviders({ isActive: true });
        setStaffList(result.providers || []);
      } catch (error) {
        console.error('[MedicalRecordForm] Error loading staff:', error);
      } finally {
        setStaffLoading(false);
      }
    };
    loadStaff();
  }, []);

  // Notify parent when active tab changes
  useEffect(() => {
    if (onActiveTabChange) {
      onActiveTabChange(activeTab);
    }
  }, [activeTab, onActiveTabChange]);

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
      console.log('[MedicalRecordForm] existingRecord received:', existingRecord);
      console.log('[MedicalRecordForm] basicInfo from existingRecord:', existingRecord.basicInfo);
      console.log('[MedicalRecordForm] chiefComplaint from existingRecord.basicInfo:', existingRecord.basicInfo?.chiefComplaint);
      const newFormData = ensureFormDataStructure(existingRecord);
      console.log('[MedicalRecordForm] newFormData after ensureFormDataStructure:', newFormData);
      console.log('[MedicalRecordForm] newFormData.basicInfo:', newFormData.basicInfo);
      setFormData(newFormData);
    }
  }, [existingRecord]); // ensureFormDataStructure ne change pas car définie dans le composant

  // Pré-remplir avec les données du dernier dossier lors de la création
  useEffect(() => {
    // Ne s'applique que pour un nouveau dossier (pas en mode édition)
    if (!existingRecord && lastRecord) {
      console.log('[MedicalRecordForm] Pre-filling from lastRecord:', lastRecord);
      // Pré-remplir uniquement les champs persistants: antécédents, groupe sanguin, allergies, conditions chroniques, médicaments actuels
      setFormData(prev => ({
        ...prev,
        // Antécédents - historique médical, chirurgical, habitudes
        antecedents: {
          personal: {
            medicalHistory: lastRecord.antecedents?.personal?.medicalHistory || prev.antecedents?.personal?.medicalHistory || [],
            surgicalHistory: lastRecord.antecedents?.personal?.surgicalHistory || prev.antecedents?.personal?.surgicalHistory || [],
            allergies: lastRecord.antecedents?.personal?.allergies || prev.antecedents?.personal?.allergies || [],
            habits: {
              smoking: lastRecord.antecedents?.personal?.habits?.smoking || prev.antecedents?.personal?.habits?.smoking || { status: 'never', cigarettesPerDay: 0, yearsSmoking: 0, quitYear: null, packYears: 0, exposureLevel: 'low', healthAlerts: [] },
              alcohol: lastRecord.antecedents?.personal?.habits?.alcohol || prev.antecedents?.personal?.habits?.alcohol || { status: 'never', drinksPerWeek: 0, auditC: { frequency: 0, quantity: 0, binge: 0 }, auditCScore: 0, riskLevel: 'low', healthAlerts: [] },
              exercise: lastRecord.antecedents?.personal?.habits?.exercise || prev.antecedents?.personal?.habits?.exercise || { status: 'never', details: '' }
            }
          },
          family: {
            father: lastRecord.antecedents?.family?.father || prev.antecedents?.family?.father || '',
            mother: lastRecord.antecedents?.family?.mother || prev.antecedents?.family?.mother || '',
            siblings: lastRecord.antecedents?.family?.siblings || prev.antecedents?.family?.siblings || '',
            children: lastRecord.antecedents?.family?.children || prev.antecedents?.family?.children || ''
          }
        },
        // Signes vitaux - poids et taille (référence)
        vitalSigns: {
          ...prev.vitalSigns,
          weight: lastRecord.vitalSigns?.weight || prev.vitalSigns?.weight || '',
          height: lastRecord.vitalSigns?.height || prev.vitalSigns?.height || ''
        },
        // Données persistantes du patient
        bloodType: lastRecord.bloodType || prev.bloodType || '',
        allergies: lastRecord.allergies || prev.allergies || [],
        chronicConditions: lastRecord.chronicConditions || prev.chronicConditions || [],
        // Médicaments actuels
        currentMedications: lastRecord.currentMedications || prev.currentMedications || [],
        // Référence aux dernières valeurs vitales pour comparaison
        _previousVitalSigns: lastRecord.vitalSigns || null
      }));
    }
  }, [lastRecord, existingRecord]);

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

  const addTreatmentFromCatalog = (catalogItem) => {
    const newTreatment = {
      medication: catalogItem.description,
      dosage: catalogItem._catalogProduct?.dosage || '',
      frequency: '',
      route: 'oral',
      startDate: new Date().toISOString().split('T')[0],
      endDate: null,
      status: 'active',
      prescribedBy: user?.name || '',
      notes: '',
      catalogItemId: catalogItem.catalogItemId,
      catalogItemType: catalogItem.type
    };

    setFormData(prev => ({
      ...prev,
      treatments: [...prev.treatments, newTreatment]
    }));
    setShowCatalogSearch(false);
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

  // Fonctions pour les médicaments actuels (traitement en cours du patient)
  const addCurrentMedication = () => {
    const newMedication = {
      medication: '',
      dosage: '',
      frequency: '',
      route: 'oral',
      startDate: '',
      prescribedBy: '',
      reason: '',
      status: 'active',
      notes: ''
    };

    setFormData(prev => ({
      ...prev,
      currentMedications: [...(prev.currentMedications || []), newMedication]
    }));
  };

  const updateCurrentMedication = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      currentMedications: (prev.currentMedications || []).map((med, i) =>
        i === index ? { ...med, [field]: value } : med
      )
    }));
  };

  const removeCurrentMedication = (index) => {
    setFormData(prev => ({
      ...prev,
      currentMedications: (prev.currentMedications || []).filter((_, i) => i !== index)
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
    console.log('[MedicalRecordForm] validateForm called with formData:', formData);
    const newErrors = {};

    // Pas de champs obligatoires - l'utilisateur peut sauvegarder à tout moment
    // Seule validation : cohérence des données si renseignées

    // Validation signos vitales (seulement si les deux valeurs sont renseignées)
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

      // Debug: Log treatmentPlan before save
      console.log('[MedicalRecordForm] handleSubmitInternal - formData.treatmentPlan:', JSON.stringify(formData.treatmentPlan, null, 2));

      const recordData = {
        ...formData,
        patientId, // Ensure patientId is set
        medicationWarnings,
        providerId: user?.providerId // Use clinic provider ID, not central user ID
      };

      // Debug: Log full recordData being sent
      console.log('[MedicalRecordForm] handleSubmitInternal - recordData keys:', Object.keys(recordData));
      console.log('[MedicalRecordForm] handleSubmitInternal - recordData.treatmentPlan:', JSON.stringify(recordData.treatmentPlan, null, 2));

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
    console.log('[MedicalRecordForm] handleSubmit called');
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    console.log('[MedicalRecordForm] Validating form...');
    if (!validateForm()) {
      console.log('[MedicalRecordForm] Validation failed. Errors:', errors);
      return;
    }
    console.log('[MedicalRecordForm] Validation passed, calling handleSubmitInternal');
    await handleSubmitInternal();
  };

  const tabs = [
    { id: 'basic', label: t('medical:form.tabs.basic'), icon: FileText },
    { id: 'antecedents', label: t('medical:form.tabs.antecedents'), icon: Clock },
    { id: 'vitals', label: t('medical:form.tabs.vitals'), icon: Activity },
    { id: 'currentIllness', label: t('medical:form.tabs.currentIllness'), icon: AlertTriangle },
    { id: 'currentMedications', label: t('medical:form.tabs.currentMedications'), icon: Pill },
    { id: 'diagnosis', label: t('medical:form.tabs.diagnosis'), icon: Stethoscope },
    { id: 'treatments', label: t('medical:form.tabs.treatments'), icon: Pill },
    { id: 'plan', label: t('medical:form.tabs.plan'), icon: CheckCircle },
    { id: 'prescription', label: t('medical:form.tabs.prescription'), icon: FileSignature }
  ];

  const renderBasicTab = () => {
    console.log('[MedicalRecordForm] renderBasicTab - formData.basicInfo:', formData.basicInfo);
    console.log('[MedicalRecordForm] renderBasicTab - chiefComplaint value:', formData.basicInfo?.chiefComplaint);
    return (
    <div className="space-y-6">
      {/* Date et heure de consultation et Assistant */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Calendar className="inline h-4 w-4 mr-1" />
            {t('medical:form.recordDateTime')}
          </label>
          <input
            type="datetime-local"
            value={formData.recordDate || ''}
            onChange={(e) => handleInputChange(null, 'recordDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Users className="inline h-4 w-4 mr-1" />
            {t('medical:form.assistantProvider')}
            <span className="text-gray-400 text-xs ml-1">({t('common:optional')})</span>
          </label>
          <select
            value={formData.assistantProviderId || ''}
            onChange={(e) => handleInputChange(null, 'assistantProviderId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            disabled={staffLoading}
          >
            <option value="">{staffLoading ? t('common:loading') : t('medical:form.noAssistant')}</option>
            {staffList
              .filter(staff => staff.id !== formData.practitionerId) // Exclure le praticien principal
              .map(staff => (
                <option key={staff.id} value={staff.id}>
                  {staff.firstName} {staff.lastName} - {staff.role || staff.specialty || t('common:staff')}
                </option>
              ))
            }
          </select>
          <p className="text-gray-500 text-xs mt-1">{t('medical:form.assistantProviderHelp')}</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('medical:form.recordType')}
        </label>
        <select
          value={formData.type}
          onChange={(e) => handleInputChange(null, 'type', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          <option value="consultation">{t('medical:recordTypes.consultation')}</option>
          <option value="examination">{t('medical:module.types.examination')}</option>
          <option value="treatment">{t('medical:module.types.treatment')}</option>
          <option value="follow_up">{t('medical:module.types.follow_up')}</option>
          <option value="emergency">{t('medical:recordTypes.emergency')}</option>
        </select>
      </div>
    </div>
  );
  };

  const renderCurrentIllnessTab = () => (
    <div className="space-y-6">
      <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
        <h4 className="font-semibold text-gray-900 mb-1 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
          {t('medical:form.currentIllnessTab.title')}
        </h4>
        <p className="text-sm text-gray-500 mb-4">{t('medical:form.currentIllnessTab.description')}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('medical:form.chiefComplaint')}
            </label>
            <textarea
              value={formData.basicInfo?.chiefComplaint || ''}
              onChange={(e) => handleInputChange('basicInfo', 'chiefComplaint', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                errors['basicInfo.chiefComplaint'] ? 'border-red-300' : 'border-gray-300'
              }`}
              rows={3}
              placeholder={t('medical:form.placeholders.chiefComplaint')}
            />
            {errors['basicInfo.chiefComplaint'] && (
              <p className="text-red-600 text-sm mt-1">{errors['basicInfo.chiefComplaint']}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('medical:form.symptomsDuration')}
            </label>
            <input
              type="text"
              value={formData.basicInfo.duration}
              onChange={(e) => handleInputChange('basicInfo', 'duration', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder={t('medical:form.placeholders.duration')}
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('medical:symptoms')}
          </label>
          <div className="space-y-2">
            {formData.basicInfo.symptoms.map((symptom, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={symptom}
                  onChange={(e) => handleArrayInputChange('basicInfo', 'symptoms', index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder={t('medical:form.placeholders.symptom')}
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
              <span>{t('medical:form.addSymptom')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAntecedentsTab = () => (
    <div className="space-y-6">
      {/* Antécédents personnels */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-gray-900 mb-4">{t('medical:form.antecedents.personal')}</h4>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('medical:form.antecedents.medicalHistory')}
            </label>
            <div className="space-y-2">
              {formData.antecedents.personal.medicalHistory.map((history, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={history}
                    onChange={(e) => handleArrayInputChange('antecedents.personal', 'medicalHistory', index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder={t('medical:form.placeholders.medicalHistory')}
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
                <span>{t('medical:form.antecedents.addMedicalHistory')}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('medical:form.antecedents.surgicalHistory')}
            </label>
            <div className="space-y-2">
              {formData.antecedents.personal.surgicalHistory.map((surgery, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={surgery}
                    onChange={(e) => handleArrayInputChange('antecedents.personal', 'surgicalHistory', index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder={t('medical:form.placeholders.surgicalHistory')}
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
                <span>{t('medical:form.antecedents.addSurgery')}</span>
              </button>
            </div>
          </div>

          {/* Habitudes de vie */}
          <div className="space-y-4">
            {/* Tabagisme - Composant complet avec évaluation */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <SmokingAssessment
                value={formData.antecedents.personal.habits.smoking}
                onChange={(smokingData) => handleNestedInputChange('antecedents', 'personal', 'habits', {
                  ...formData.antecedents.personal.habits,
                  smoking: smokingData
                })}
                patientAge={patient?.birthDate ? Math.floor((new Date() - new Date(patient.birthDate)) / (365.25 * 24 * 60 * 60 * 1000)) : null}
              />
            </div>

            {/* Alcool - Composant complet avec AUDIT-C */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <AlcoholAssessment
                value={formData.antecedents.personal.habits.alcohol}
                onChange={(alcoholData) => handleNestedInputChange('antecedents', 'personal', 'habits', {
                  ...formData.antecedents.personal.habits,
                  alcohol: alcoholData
                })}
                patientGender={patient?.gender || null}
              />
            </div>

            {/* Exercice */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('medical:form.habits.exercise')}
                </label>
                <select
                  value={formData.antecedents.personal.habits.exercise.status}
                  onChange={(e) => handleNestedInputChange('antecedents', 'personal', 'habits', {
                    ...formData.antecedents.personal.habits,
                    exercise: { ...formData.antecedents.personal.habits.exercise, status: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="never">{t('medical:form.habits.sedentary')}</option>
                  <option value="occasional">{t('medical:form.habits.occasional')}</option>
                  <option value="regular">{t('medical:form.habits.regular')}</option>
                  <option value="intense">{t('medical:form.habits.intense')}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Antécédents familiaux */}
      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
        <h4 className="font-semibold text-gray-900 mb-4">{t('medical:form.antecedents.family')}</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('medical:form.antecedents.father')}
            </label>
            <input
              type="text"
              value={formData.antecedents.family.father}
              onChange={(e) => handleNestedInputChange('antecedents', 'family', 'father', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder={t('medical:form.placeholders.fatherHistory')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('medical:form.antecedents.mother')}
            </label>
            <input
              type="text"
              value={formData.antecedents.family.mother}
              onChange={(e) => handleNestedInputChange('antecedents', 'family', 'mother', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder={t('medical:form.placeholders.motherHistory')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('medical:form.antecedents.siblings')}
            </label>
            <input
              type="text"
              value={formData.antecedents.family.siblings}
              onChange={(e) => handleNestedInputChange('antecedents', 'family', 'siblings', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder={t('medical:form.placeholders.siblingsHistory')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('medical:form.antecedents.children')}
            </label>
            <input
              type="text"
              value={formData.antecedents.family.children}
              onChange={(e) => handleNestedInputChange('antecedents', 'family', 'children', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder={t('medical:form.placeholders.childrenHistory')}
            />
          </div>
        </div>
      </div>

      {/* Allergies */}
      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
          {t('medical:form.allergies.title')}
        </h4>

        <div className="space-y-4">
          {formData.allergies.map((allergy, index) => (
            <div key={index} className="bg-white p-4 rounded-lg border">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('medical:form.allergies.allergen')}
                  </label>
                  <input
                    type="text"
                    value={allergy.allergen}
                    onChange={(e) => updateAllergy(index, 'allergen', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-red-500"
                    placeholder={t('medical:form.placeholders.substance')}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('medical:form.allergies.type')}
                  </label>
                  <select
                    value={allergy.type}
                    onChange={(e) => updateAllergy(index, 'type', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-red-500"
                  >
                    <option value="medicamento">{t('medical:form.allergies.types.medication')}</option>
                    <option value="alimento">{t('medical:form.allergies.types.food')}</option>
                    <option value="ambiental">{t('medical:form.allergies.types.environmental')}</option>
                    <option value="otro">{t('medical:form.allergies.types.other')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('medical:form.allergies.severity')}
                  </label>
                  <select
                    value={allergy.severity}
                    onChange={(e) => updateAllergy(index, 'severity', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-red-500"
                  >
                    <option value="leve">{t('medical:form.allergies.severities.mild')}</option>
                    <option value="moderada">{t('medical:form.allergies.severities.moderate')}</option>
                    <option value="grave">{t('medical:form.allergies.severities.severe')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('medical:form.allergies.reaction')}
                  </label>
                  <input
                    type="text"
                    value={allergy.reaction}
                    onChange={(e) => updateAllergy(index, 'reaction', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-red-500"
                    placeholder={t('medical:form.placeholders.symptoms')}
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
            <span>{t('medical:form.allergies.add')}</span>
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
          {t('medical:vitalSigns')}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              <Scale className="h-4 w-4 mr-2" />
              {t('medical:weight')} (kg)
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
              {t('medical:height')} (cm)
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
              {t('medical:form.vitals.bmi')}
            </label>
            <input
              type="text"
              value={formData.vitalSigns?.bmi || ''}
              readOnly
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
              placeholder={t('medical:form.placeholders.calculatedAuto')}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('medical:bloodPressure')} (mmHg)
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
              {t('medical:heartRate')} (bpm)
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
              {t('medical:temperature')} (°C)
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
              {t('medical:respiratoryRate')} (rpm)
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
              {t('medical:form.vitals.oxygenSaturation')} (%)
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
          {t('medical:form.vitals.bloodType')}
        </label>
        <select
          value={formData.bloodType}
          onChange={(e) => handleInputChange(null, 'bloodType', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          <option value="">{t('medical:form.vitals.selectBloodType')}</option>
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

      {/* Examen physique - fusionné dans cet onglet */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
          <Heart className="h-5 w-5 mr-2 text-blue-600" />
          {t('medical:examination')}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('medical:form.examTab.generalAppearance')}
            </label>
            <textarea
              value={formData.physicalExam.general}
              onChange={(e) => handleInputChange('physicalExam', 'general', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows={3}
              placeholder={t('medical:form.placeholders.generalState')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('medical:form.examTab.cardiovascular')}
            </label>
            <textarea
              value={formData.physicalExam.cardiovascular}
              onChange={(e) => handleInputChange('physicalExam', 'cardiovascular', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows={3}
              placeholder={t('medical:form.placeholders.cardiovascularFindings')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('medical:form.examTab.respiratory')}
            </label>
            <textarea
              value={formData.physicalExam.respiratory}
              onChange={(e) => handleInputChange('physicalExam', 'respiratory', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows={3}
              placeholder={t('medical:form.placeholders.respiratoryFindings')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('medical:form.examTab.abdomen')}
            </label>
            <textarea
              value={formData.physicalExam.abdomen}
              onChange={(e) => handleInputChange('physicalExam', 'abdomen', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows={3}
              placeholder={t('medical:form.placeholders.abdominalExam')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('medical:form.examTab.neurological')}
            </label>
            <textarea
              value={formData.physicalExam.neurological}
              onChange={(e) => handleInputChange('physicalExam', 'neurological', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows={3}
              placeholder={t('medical:form.placeholders.neurologicalExam')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('medical:form.examTab.otherSystems')}
            </label>
            <textarea
              value={formData.physicalExam.other}
              onChange={(e) => handleInputChange('physicalExam', 'other', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows={3}
              placeholder={t('medical:form.placeholders.otherFindings')}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderDiagnosisTab = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('medical:form.diagnosisTab.primaryDiagnosis')}
        </label>
        <input
          type="text"
          value={formData.diagnosis.primary}
          onChange={(e) => handleInputChange('diagnosis', 'primary', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
            errors['diagnosis.primary'] ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder={t('medical:form.placeholders.primaryDiagnosis')}
        />
        {errors['diagnosis.primary'] && (
          <p className="text-red-600 text-sm mt-1">{errors['diagnosis.primary']}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('medical:form.diagnosisTab.secondaryDiagnosis')}
        </label>
        <div className="space-y-2">
          {formData.diagnosis.secondary.map((diagnosis, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => handleArrayInputChange('diagnosis', 'secondary', index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder={t('medical:form.placeholders.secondaryDiagnosis')}
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
            <span>{t('medical:form.diagnosisTab.addSecondaryDiagnosis')}</span>
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('medical:form.diagnosisTab.icd10Codes')}
        </label>
        <div className="space-y-2">
          {formData.diagnosis.icd10.map((code, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="text"
                value={code}
                onChange={(e) => handleArrayInputChange('diagnosis', 'icd10', index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder={t('medical:form.placeholders.icd10Code')}
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
            <span>{t('medical:form.diagnosisTab.addIcd10Code')}</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Onglet Traitement actuel - médicaments que le patient prend actuellement
  const renderCurrentMedicationsTab = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-start">
          <Pill className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-blue-800">{t('medical:form.currentMedicationsTab.infoTitle')}</h4>
            <p className="text-sm text-blue-700">{t('medical:form.currentMedicationsTab.infoDescription')}</p>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-900">{t('medical:form.currentMedicationsTab.title')}</h4>
          <button
            type="button"
            onClick={addCurrentMedication}
            className="flex items-center space-x-2 bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            <span>{t('medical:form.currentMedicationsTab.add')}</span>
          </button>
        </div>

        <div className="space-y-4">
          {(formData.currentMedications || []).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Pill className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>{t('medical:form.currentMedicationsTab.noMedications')}</p>
              <p className="text-sm">{t('medical:form.currentMedicationsTab.addFirst')}</p>
            </div>
          ) : (
            (formData.currentMedications || []).map((med, index) => (
              <div key={index} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {t('medical:form.currentMedicationsTab.medication')}
                    </label>
                    <input
                      type="text"
                      value={med.medication}
                      onChange={(e) => updateCurrentMedication(index, 'medication', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                      placeholder={t('medical:form.currentMedicationsTab.medicationPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {t('medical:form.dosage')}
                    </label>
                    <input
                      type="text"
                      value={med.dosage}
                      onChange={(e) => updateCurrentMedication(index, 'dosage', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                      placeholder="10mg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {t('medical:form.frequency')}
                    </label>
                    <input
                      type="text"
                      value={med.frequency}
                      onChange={(e) => updateCurrentMedication(index, 'frequency', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                      placeholder={t('medical:form.placeholders.frequency')}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {t('medical:form.treatmentsTab.route')}
                    </label>
                    <select
                      value={med.route}
                      onChange={(e) => updateCurrentMedication(index, 'route', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                    >
                      <option value="oral">{t('medical:form.treatmentsTab.routes.oral')}</option>
                      <option value="iv">{t('medical:form.treatmentsTab.routes.iv')}</option>
                      <option value="im">{t('medical:form.treatmentsTab.routes.im')}</option>
                      <option value="topical">{t('medical:form.treatmentsTab.routes.topical')}</option>
                      <option value="inhaled">{t('medical:form.treatmentsTab.routes.inhaled')}</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeCurrentMedication(index)}
                      className="p-2 text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {t('medical:form.currentMedicationsTab.startDate')}
                    </label>
                    <input
                      type="date"
                      value={med.startDate}
                      onChange={(e) => updateCurrentMedication(index, 'startDate', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {t('medical:form.currentMedicationsTab.prescribedBy')}
                    </label>
                    <input
                      type="text"
                      value={med.prescribedBy}
                      onChange={(e) => updateCurrentMedication(index, 'prescribedBy', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                      placeholder={t('medical:form.currentMedicationsTab.prescribedByPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {t('medical:form.currentMedicationsTab.status')}
                    </label>
                    <select
                      value={med.status}
                      onChange={(e) => updateCurrentMedication(index, 'status', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                    >
                      <option value="active">{t('medical:form.treatmentsTab.statuses.active')}</option>
                      <option value="suspended">{t('medical:form.treatmentsTab.statuses.suspended')}</option>
                      <option value="completed">{t('medical:form.treatmentsTab.statuses.completed')}</option>
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {t('medical:form.currentMedicationsTab.reason')}
                    </label>
                    <input
                      type="text"
                      value={med.reason}
                      onChange={(e) => updateCurrentMedication(index, 'reason', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                      placeholder={t('medical:form.currentMedicationsTab.reasonPlaceholder')}
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {t('medical:form.notes')}
                    </label>
                    <input
                      type="text"
                      value={med.notes}
                      onChange={(e) => updateCurrentMedication(index, 'notes', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                      placeholder={t('medical:form.currentMedicationsTab.notesPlaceholder')}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
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
              <h4 className="font-medium text-red-800 mb-2">{t('medical:form.treatmentsTab.medicationAlerts')}</h4>
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
          <h4 className="font-semibold text-gray-900">{t('medical:form.treatmentsTab.treatments')}</h4>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={addTreatment}
              className="flex items-center space-x-2 bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700"
            >
              <Plus className="h-4 w-4" />
              <span>{t('medical:form.treatmentsTab.addMedication')}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowCatalogSearch(!showCatalogSearch)}
              className={`flex items-center space-x-2 px-3 py-1 rounded-lg ${
                showCatalogSearch
                  ? 'bg-blue-700 text-white'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Package className="h-4 w-4" />
              <span>{t('medical:form.treatmentsTab.addFromCatalog')}</span>
            </button>
          </div>
        </div>

        {showCatalogSearch && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <CatalogProductSelector
              onSelect={addTreatmentFromCatalog}
              filterType={null}
              placeholder={t('medical:form.treatmentsTab.searchCatalog')}
            />
          </div>
        )}

        <div className="space-y-4">
          {formData.treatments.map((treatment, index) => (
            <div key={index} className="bg-white p-4 rounded-lg border">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('medical:form.treatmentsTab.medication')}
                  </label>
                  <input
                    type="text"
                    value={treatment.medication}
                    onChange={(e) => updateTreatment(index, 'medication', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                    placeholder={t('medical:form.placeholders.medicationName')}
                  />
                  {treatment.catalogItemId && (
                    <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      <Package className="h-3 w-3 mr-1" />
                      {t('medical:form.treatmentsTab.fromCatalog')}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('medical:form.dosage')}
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
                    {t('medical:form.frequency')}
                  </label>
                  <input
                    type="text"
                    value={treatment.frequency}
                    onChange={(e) => updateTreatment(index, 'frequency', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                    placeholder={t('medical:form.placeholders.frequency')}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('medical:form.treatmentsTab.route')}
                  </label>
                  <select
                    value={treatment.route}
                    onChange={(e) => updateTreatment(index, 'route', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                  >
                    <option value="oral">{t('medical:form.treatmentsTab.routes.oral')}</option>
                    <option value="iv">{t('medical:form.treatmentsTab.routes.iv')}</option>
                    <option value="im">{t('medical:form.treatmentsTab.routes.im')}</option>
                    <option value="topical">{t('medical:form.treatmentsTab.routes.topical')}</option>
                    <option value="inhaled">{t('medical:form.treatmentsTab.routes.inhaled')}</option>
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
                    {t('medical:form.treatmentsTab.startDate')}
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
                    {t('medical:form.treatmentsTab.status')}
                  </label>
                  <select
                    value={treatment.status}
                    onChange={(e) => updateTreatment(index, 'status', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                  >
                    <option value="active">{t('medical:form.treatmentsTab.statuses.active')}</option>
                    <option value="suspended">{t('medical:form.treatmentsTab.statuses.suspended')}</option>
                    <option value="completed">{t('medical:form.treatmentsTab.statuses.completed')}</option>
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('medical:notes')}
                  </label>
                  <input
                    type="text"
                    value={treatment.notes}
                    onChange={(e) => updateTreatment(index, 'notes', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                    placeholder={t('medical:form.placeholders.additionalInstructions')}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPlanTab = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('medical:form.planTab.recommendations')}
        </label>
        <div className="space-y-2">
          {formData.treatmentPlan.recommendations.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-2">{t('medical:form.planTab.noRecommendations', 'Aucune recommandation ajoutée')}</p>
          ) : (
            formData.treatmentPlan.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={recommendation}
                  onChange={(e) => handleArrayInputChange('treatmentPlan', 'recommendations', index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder={t('medical:form.placeholders.recommendation')}
                />
                <button
                  type="button"
                  onClick={() => removeArrayItem('treatmentPlan', 'recommendations', index)}
                  className="p-2 text-red-600 hover:text-red-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
          {/* Bouton "Ajouter" en bas de la liste */}
          <button
            type="button"
            onClick={() => addArrayItem('treatmentPlan', 'recommendations')}
            className="flex items-center space-x-2 text-green-600 hover:text-green-800 mt-2"
          >
            <Plus className="h-4 w-4" />
            <span>{t('medical:form.planTab.addRecommendation')}</span>
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('medical:form.planTab.nextFollowUp')}
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
          {t('medical:form.planTab.requestedTests')}
        </label>
        <div className="space-y-2">
          {formData.treatmentPlan.tests.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-2">{t('medical:form.planTab.noTests', 'Aucun examen demandé')}</p>
          ) : (
            formData.treatmentPlan.tests.map((test, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={test}
                  onChange={(e) => handleArrayInputChange('treatmentPlan', 'tests', index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder={t('medical:form.placeholders.testOrExam')}
                />
                <button
                  type="button"
                  onClick={() => removeArrayItem('treatmentPlan', 'tests', index)}
                  className="p-2 text-red-600 hover:text-red-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
          {/* Bouton "Ajouter" en bas de la liste */}
          <button
            type="button"
            onClick={() => addArrayItem('treatmentPlan', 'tests')}
            className="flex items-center space-x-2 text-green-600 hover:text-green-800 mt-2"
          >
            <Plus className="h-4 w-4" />
            <span>{t('medical:form.planTab.addTest')}</span>
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
      providerId: user?.providerId, // Use clinic provider ID, not central user ID
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
      setErrors({ prescription: t('medical:form.prescriptionTab.addAtLeastOneMedication') });
      return;
    }
    setCurrentPrescription(buildPrescriptionObject());
    setShowPrescriptionPreview(true);
  };

  // Save prescription
  const handleSavePrescription = async () => {
    if (prescriptionData.medications.length === 0) {
      setErrors({ prescription: t('medical:form.prescriptionTab.addAtLeastOneMedication') });
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
      setErrors({ prescription: error.message || t('medical:form.prescriptionTab.saveError') });
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
      setErrors(prev => ({ ...prev, prescription: t('medical:form.prescriptionTab.addAtLeastOneMedication') }));
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
      setErrors(prev => ({ ...prev, prescription: error.message || t('medical:form.prescriptionTab.saveError') }));
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
          {t('medical:form.prescriptionTab.title')}
        </h4>
        <button
          type="button"
          onClick={resetPrescriptionForm}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Plus className="h-4 w-4" />
          <span>{t('medical:form.prescriptionTab.newPrescription')}</span>
        </button>
      </div>

      {/* Saved prescriptions list */}
      {savedPrescriptions.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg border">
          <h5 className="font-medium text-gray-900 mb-3 flex items-center">
            <FileSignature className="h-4 w-4 mr-2" />
            {t('medical:form.prescriptionTab.createdPrescriptions')} ({savedPrescriptions.length})
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
                      {prescription.prescriptionNumber || t('medical:form.prescriptionTab.prescriptionNumber', { number: index + 1 })}
                    </p>
                    <p className="text-sm text-gray-500">
                      {t('medical:form.prescriptionTab.medicationCount', { count: prescription.medications?.length || 0 })}
                      {prescription.status === 'finalized' && ` • ${t('medical:form.prescriptionTab.finalized')}`}
                      {prescription.printCount > 0 && ` • ${t('medical:form.prescriptionTab.printed', { count: prescription.printCount })}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handlePreviewSavedPrescription(prescription)}
                    className="p-2 text-gray-500 hover:text-blue-600"
                    title={t('medical:form.prescriptionTab.preview')}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  {prescription.status !== 'finalized' && (
                    <>
                      <button
                        type="button"
                        onClick={() => loadPrescriptionForEdit(prescription, index)}
                        className="p-2 text-gray-500 hover:text-blue-600"
                        title={t('medical:form.prescriptionTab.edit')}
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePrescription(index)}
                        className="p-2 text-gray-500 hover:text-red-600"
                        title={t('medical:form.prescriptionTab.delete')}
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
          {t('medical:form.prescriptionTab.configuration')}
        </h5>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column - Checkboxes */}
          <div className="space-y-4">
            <div className="space-y-3">
              <p className="text-sm text-purple-700 font-medium">{t('medical:form.prescriptionTab.elementsToInclude')}</p>
              <label className="flex items-start space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prescriptionOptions.includeVitalSigns}
                  onChange={(e) => setPrescriptionOptions(prev => ({ ...prev, includeVitalSigns: e.target.checked }))}
                  className="h-4 w-4 mt-0.5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">{t('medical:form.prescriptionTab.vitalSignsToday')}</span>
              </label>
              <label className="flex items-start space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prescriptionOptions.includeDiagnosis}
                  onChange={(e) => setPrescriptionOptions(prev => ({ ...prev, includeDiagnosis: e.target.checked }))}
                  className="h-4 w-4 mt-0.5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">{t('medical:form.prescriptionTab.diagnoses')}</span>
              </label>
            </div>
            <div className="space-y-3 pt-2 border-t border-purple-200">
              <p className="text-sm text-purple-700 font-medium">{t('medical:form.prescriptionTab.autoAddFromRecord')}</p>
              <label className="flex items-start space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prescriptionOptions.includeFromTreatments}
                  onChange={(e) => setPrescriptionOptions(prev => ({ ...prev, includeFromTreatments: e.target.checked }))}
                  className="h-4 w-4 mt-0.5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">
                  {t('medical:form.prescriptionTab.activeTreatments')}
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
                  {t('medical:form.prescriptionTab.planRecommendations')}
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
            <p className="text-purple-700 font-medium mb-2">{t('medical:form.prescriptionTab.selectedElementsPreview')}</p>

            {/* Vital Signs Preview */}
            {prescriptionOptions.includeVitalSigns && formData.vitalSigns && (
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-600 mb-1">{t('medical:form.prescriptionTab.vitalSigns')}</p>
                <div className="text-xs text-gray-500 pl-2 border-l-2 border-purple-300">
                  {formData.vitalSigns.bloodPressureSystolic && formData.vitalSigns.bloodPressureDiastolic && (
                    <span className="block">TA: {formData.vitalSigns.bloodPressureSystolic}/{formData.vitalSigns.bloodPressureDiastolic} mmHg</span>
                  )}
                  {formData.vitalSigns.heartRate && <span className="block">FC: {formData.vitalSigns.heartRate} bpm</span>}
                  {formData.vitalSigns.temperature && <span className="block">T°: {formData.vitalSigns.temperature}°C</span>}
                  {formData.vitalSigns.weight && <span className="block">{t('medical:weight')}: {formData.vitalSigns.weight} kg</span>}
                  {!formData.vitalSigns.bloodPressureSystolic && !formData.vitalSigns.heartRate && !formData.vitalSigns.temperature && !formData.vitalSigns.weight && (
                    <span className="text-gray-400 italic">{t('medical:form.prescriptionTab.noVitalSigns')}</span>
                  )}
                </div>
              </div>
            )}

            {/* Diagnosis Preview */}
            {prescriptionOptions.includeDiagnosis && (
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-600 mb-1">{t('medical:form.prescriptionTab.diagnosis')}</p>
                <div className="text-xs text-gray-500 pl-2 border-l-2 border-purple-300">
                  {formData.diagnoses?.primary ? (
                    <span className="block">{formData.diagnoses.primary}</span>
                  ) : formData.subjective?.chiefComplaint ? (
                    <span className="block">{formData.subjective.chiefComplaint}</span>
                  ) : (
                    <span className="text-gray-400 italic">{t('medical:form.prescriptionTab.noDiagnosis')}</span>
                  )}
                </div>
              </div>
            )}

            {/* Treatments Preview */}
            {prescriptionOptions.includeFromTreatments && (
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-600 mb-1">{t('medical:form.prescriptionTab.treatmentsToAdd')}</p>
                <div className="text-xs text-gray-500 pl-2 border-l-2 border-green-300">
                  {getActiveTreatments().length > 0 ? (
                    getActiveTreatments().map((treatment, i) => (
                      <span key={i} className="block">• {treatment.medication} {treatment.dosage && `- ${treatment.dosage}`} {treatment.frequency && `(${treatment.frequency})`}</span>
                    ))
                  ) : (
                    <span className="text-gray-400 italic">{t('medical:form.prescriptionTab.noActiveTreatment')}</span>
                  )}
                </div>
              </div>
            )}

            {/* Recommendations Preview */}
            {prescriptionOptions.includeFromPlan && (
              <div className="mb-2">
                <p className="text-xs font-medium text-gray-600 mb-1">{t('medical:form.prescriptionTab.recommendationsToAdd')}</p>
                <div className="text-xs text-gray-500 pl-2 border-l-2 border-blue-300">
                  {getPlanRecommendations().length > 0 ? (
                    getPlanRecommendations().map((r, i) => (
                      <span key={i} className="block">• {r}</span>
                    ))
                  ) : (
                    <span className="text-gray-400 italic">{t('medical:form.prescriptionTab.noRecommendation')}</span>
                  )}
                </div>
              </div>
            )}

            {/* No selection message */}
            {!prescriptionOptions.includeVitalSigns && !prescriptionOptions.includeDiagnosis &&
             !prescriptionOptions.includeFromTreatments && !prescriptionOptions.includeFromPlan && (
              <p className="text-gray-400 italic text-xs">{t('medical:form.prescriptionTab.checkOptionsPreview')}</p>
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
              ? t('medical:form.prescriptionTab.editingPrescription', { number: editingPrescriptionIndex + 1 })
              : t('medical:form.prescriptionTab.newPrescriptionMedications')}
          </h5>
          <div className="flex items-center space-x-2">
            {editingPrescriptionIndex !== null && (
              <button
                type="button"
                onClick={resetPrescriptionForm}
                className="text-sm text-gray-600 hover:text-gray-800 flex items-center"
              >
                <X className="h-4 w-4 mr-1" />
                {t('medical:form.prescriptionTab.cancel')}
              </button>
            )}
            <button
              type="button"
              onClick={addPrescriptionMedication}
              className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>{t('medical:form.prescriptionTab.addMedication')}</span>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {prescriptionData.medications.map((med, index) => (
            <div key={index} className="bg-white p-4 rounded-lg border shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('medical:form.prescriptionTab.medicationRequired')}</label>
                  <input
                    type="text"
                    value={med.medication}
                    onChange={(e) => updatePrescriptionMedication(index, 'medication', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    placeholder={t('medical:form.prescriptionTab.medicationPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('medical:form.prescriptionTab.dosageRequired')}</label>
                  <input
                    type="text"
                    value={med.dosage}
                    onChange={(e) => updatePrescriptionMedication(index, 'dosage', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    placeholder="10mg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('medical:form.prescriptionTab.frequencyRequired')}</label>
                  <input
                    type="text"
                    value={med.frequency}
                    onChange={(e) => updatePrescriptionMedication(index, 'frequency', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    placeholder={t('medical:form.prescriptionTab.frequencyPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('medical:form.prescriptionTab.route')}</label>
                  <select
                    value={med.route}
                    onChange={(e) => updatePrescriptionMedication(index, 'route', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="oral">{t('medical:form.prescriptionTab.routes.oral')}</option>
                    <option value="iv">{t('medical:form.prescriptionTab.routes.iv')}</option>
                    <option value="im">{t('medical:form.prescriptionTab.routes.im')}</option>
                    <option value="topical">{t('medical:form.prescriptionTab.routes.topical')}</option>
                    <option value="inhaled">{t('medical:form.prescriptionTab.routes.inhaled')}</option>
                    <option value="sublingual">{t('medical:form.prescriptionTab.routes.sublingual')}</option>
                    <option value="rectal">{t('medical:form.prescriptionTab.routes.rectal')}</option>
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
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('medical:form.prescriptionTab.duration')}</label>
                  <input
                    type="text"
                    value={med.duration}
                    onChange={(e) => updatePrescriptionMedication(index, 'duration', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    placeholder={t('medical:form.prescriptionTab.durationPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('medical:form.prescriptionTab.quantity')}</label>
                  <input
                    type="text"
                    value={med.quantity}
                    onChange={(e) => updatePrescriptionMedication(index, 'quantity', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    placeholder={t('medical:form.prescriptionTab.quantityPlaceholder')}
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('medical:form.prescriptionTab.instructions')}</label>
                  <input
                    type="text"
                    value={med.instructions}
                    onChange={(e) => updatePrescriptionMedication(index, 'instructions', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    placeholder={t('medical:form.prescriptionTab.instructionsPlaceholder')}
                  />
                </div>
              </div>
            </div>
          ))}

          {prescriptionData.medications.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <FileSignature className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>{t('medical:form.prescriptionTab.noMedication')}</p>
              <p className="text-sm">{t('medical:form.prescriptionTab.noMedicationHint')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Instructions générales */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('medical:form.prescriptionTab.generalInstructions')}
        </label>
        <textarea
          value={prescriptionData.instructions}
          onChange={(e) => setPrescriptionData(prev => ({ ...prev, instructions: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
          placeholder={t('medical:form.prescriptionTab.generalInstructionsPlaceholder')}
        />
      </div>

      {/* Notes additionnelles (médecin) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('medical:form.prescriptionTab.doctorNotes')}
        </label>
        <textarea
          value={prescriptionData.additionalNotes}
          onChange={(e) => setPrescriptionData(prev => ({ ...prev, additionalNotes: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={2}
          placeholder={t('medical:form.prescriptionTab.doctorNotesPlaceholder')}
        />
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('medical:form.prescriptionTab.validUntil')}
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
            {t('medical:form.prescriptionTab.renewable')}
          </label>
        </div>
        {prescriptionData.renewable && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('medical:form.prescriptionTab.renewalCount')}
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
          <span>{t('medical:form.prescriptionTab.preview')}</span>
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
              ? t('medical:form.prescriptionTab.saving')
              : editingPrescriptionIndex !== null
                ? t('medical:form.prescriptionTab.update')
                : t('medical:form.prescriptionTab.savePrescription')}
          </span>
        </button>
      </div>

      {/* Status message */}
      {prescriptionSaveStatus === 'saved' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center">
          <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
          <span className="text-green-800 text-sm">{t('medical:form.prescriptionTab.savedSuccess')}</span>
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
            <h3 className="text-lg font-semibold text-blue-900">{t('medical:form.patientSelector.title')}</h3>
          </div>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('medical:form.patientSelector.searchPlaceholder')}
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
              <option value="">{t('medical:form.patientSelector.selectPatient')}</option>
              {filteredPatients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName} {p.patientNumber ? `(${p.patientNumber})` : ''}
                </option>
              ))}
            </select>
            {selectedPatientId && (
              <div className="text-sm text-blue-700 bg-blue-100 px-3 py-2 rounded">
                {t('medical:form.patientSelector.selectedPatient')} <strong>{currentPatient?.firstName} {currentPatient?.lastName}</strong>
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
          {activeTab === 'currentIllness' && renderCurrentIllnessTab()}
          {activeTab === 'currentMedications' && renderCurrentMedicationsTab()}
          {activeTab === 'diagnosis' && renderDiagnosisTab()}
          {activeTab === 'treatments' && renderTreatmentsTab()}
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
              {t('medical:form.footer.savedSuccess')}
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center text-red-600">
              <AlertTriangle className="h-4 w-4 mr-2" />
              {t('medical:form.footer.saveError')}
            </span>
          )}
          {formData._previousVitalSigns && (
            <span className="flex items-center text-blue-500 text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {t('medical:form.footer.prefillNote')}
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
              {t('medical:form.footer.cancel')}
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
                <span>{t('medical:form.footer.saving')}</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>{t('medical:form.footer.saveRecord')}</span>
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