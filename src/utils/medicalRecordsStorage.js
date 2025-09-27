// utils/medicalRecordsStorage.js
import { generateMedicalRecordId } from './idGenerator';

const MEDICAL_RECORDS_STORAGE_KEY = 'medicalPro_medical_records';

// Base de données des médicaments pour vérification des interactions
const MEDICATIONS_DATABASE = {
  'warfarina': {
    name: 'Warfarina',
    type: 'anticoagulante',
    interactions: ['aspirina', 'ibuprofeno', 'diclofenaco'],
    warnings: ['Evitar con AINE', 'Controlar INR']
  },
  'aspirina': {
    name: 'Aspirina',
    type: 'antiinflamatorio',
    interactions: ['warfarina', 'metotrexato'],
    warnings: ['Riesgo de sangrado con anticoagulantes']
  },
  'metformina': {
    name: 'Metformina',
    type: 'antidiabético',
    interactions: ['alcohol'],
    warnings: ['Contraindicado en insuficiencia renal']
  },
  'lisinopril': {
    name: 'Lisinopril',
    type: 'antihipertensivo',
    interactions: ['ibuprofeno', 'potasio'],
    warnings: ['Monitorizar función renal']
  }
};

// Service de gestion des dossiers médicaux
export const medicalRecordsStorage = {
  // Récupérer tous les dossiers médicaux
  getAll: () => {
    try {
      const records = localStorage.getItem(MEDICAL_RECORDS_STORAGE_KEY);
      return records ? JSON.parse(records) : [];
    } catch (error) {
      console.error('Erreur lecture dossiers médicaux:', error);
      return [];
    }
  },

  // Récupérer les dossiers d'un patient
  getByPatientId: (patientId) => {
    const records = medicalRecordsStorage.getAll();
    return records.filter(record => record.patientId === patientId && !record.deleted);
  },

  // Récupérer un dossier par ID
  getById: (id) => {
    const records = medicalRecordsStorage.getAll();
    return records.find(record => record.id === id && !record.deleted);
  },

  // Créer un nouveau dossier médical - US 2.1 à 2.5
  create: (medicalData, userId = 'system') => {
    try {
      const records = medicalRecordsStorage.getAll();

      const newRecord = {
        id: generateMedicalRecordId(),
        ...medicalData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: userId,

        // Métadonnées de sécurité et conformité
        accessLog: [{
          action: 'create',
          userId: userId,
          timestamp: new Date().toISOString(),
          ipAddress: 'localhost'
        }],

        // Validation des interactions médicamenteuses
        medicationWarnings: medicalData.treatments ?
          medicalRecordsStorage.checkMedicationInteractions(medicalData.treatments) : []
      };

      records.push(newRecord);
      localStorage.setItem(MEDICAL_RECORDS_STORAGE_KEY, JSON.stringify(records));
      return newRecord;
    } catch (error) {
      console.error('Erreur création dossier médical:', error);
      throw error;
    }
  },

  // Mettre à jour un dossier médical
  update: (id, medicalData, userId = 'system') => {
    try {
      const records = medicalRecordsStorage.getAll();
      const index = records.findIndex(record => record.id === id);

      if (index === -1) {
        throw new Error('Dossier médical non trouvé');
      }

      const currentRecord = records[index];
      const updatedRecord = {
        ...currentRecord,
        ...medicalData,
        updatedAt: new Date().toISOString(),
        accessLog: [
          ...currentRecord.accessLog,
          {
            action: 'update',
            userId: userId,
            timestamp: new Date().toISOString(),
            ipAddress: 'localhost',
            changes: Object.keys(medicalData)
          }
        ],

        // Re-vérifier les interactions médicamenteuses
        medicationWarnings: medicalData.treatments ?
          medicalRecordsStorage.checkMedicationInteractions(medicalData.treatments) :
          currentRecord.medicationWarnings || []
      };

      records[index] = updatedRecord;
      localStorage.setItem(MEDICAL_RECORDS_STORAGE_KEY, JSON.stringify(records));
      return updatedRecord;
    } catch (error) {
      console.error('Erreur mise à jour dossier médical:', error);
      throw error;
    }
  },

  // Vérification des interactions médicamenteuses - US 2.4
  checkMedicationInteractions: (treatments) => {
    const warnings = [];
    const activemedications = treatments.filter(t => t.status === 'active');

    for (let i = 0; i < activemedications.length; i++) {
      for (let j = i + 1; j < activemedications.length; j++) {
        const med1 = activemedications[i].medication.toLowerCase();
        const med2 = activemedications[j].medication.toLowerCase();

        const med1Data = MEDICATIONS_DATABASE[med1];
        const med2Data = MEDICATIONS_DATABASE[med2];

        if (med1Data && med1Data.interactions.includes(med2)) {
          warnings.push({
            type: 'interaction',
            severity: 'high',
            medications: [activemedications[i].medication, activemedications[j].medication],
            warning: `Interacción detectada entre ${activemedications[i].medication} y ${activemedications[j].medication}`,
            recommendation: med1Data.warnings[0] || 'Consultar con el médico'
          });
        }

        if (med2Data && med2Data.interactions.includes(med1)) {
          warnings.push({
            type: 'interaction',
            severity: 'high',
            medications: [activemedications[j].medication, activemedications[i].medication],
            warning: `Interacción detectada entre ${activemedications[j].medication} y ${activemedications[i].medication}`,
            recommendation: med2Data.warnings[0] || 'Consultar con el médico'
          });
        }
      }
    }

    return warnings;
  },

  // Journaliser un accès au dossier médical - US 6.2
  logAccess: (recordId, action, userId = 'system', details = {}) => {
    try {
      const records = medicalRecordsStorage.getAll();
      const index = records.findIndex(record => record.id === recordId);

      if (index !== -1) {
        records[index].accessLog.push({
          action,
          userId,
          timestamp: new Date().toISOString(),
          ipAddress: 'localhost',
          details
        });

        localStorage.setItem(MEDICAL_RECORDS_STORAGE_KEY, JSON.stringify(records));
      }
    } catch (error) {
      console.error('Erreur journalisation accès dossier médical:', error);
    }
  },

  // Rechercher dans les dossiers médicaux
  search: (query, filters = {}) => {
    const records = medicalRecordsStorage.getAll().filter(r => !r.deleted);
    const searchTerm = query.toLowerCase();

    let filtered = records.filter(record => {
      // Recherche textuelle
      if (query) {
        const searchableText = [
          record.basicInfo?.chiefComplaint,
          record.basicInfo?.symptoms?.join(' '),
          record.diagnosis?.primary,
          record.diagnosis?.secondary?.join(' '),
          record.treatments?.map(t => t.medication).join(' ')
        ].join(' ').toLowerCase();

        if (!searchableText.includes(searchTerm)) {
          return false;
        }
      }

      // Filtres par patient
      if (filters.patientId && record.patientId !== filters.patientId) {
        return false;
      }

      // Filtres par praticien
      if (filters.practitionerId && record.practitionerId !== filters.practitionerId) {
        return false;
      }

      // Filtres par date
      if (filters.dateFrom) {
        if (new Date(record.createdAt) < new Date(filters.dateFrom)) {
          return false;
        }
      }

      if (filters.dateTo) {
        if (new Date(record.createdAt) > new Date(filters.dateTo)) {
          return false;
        }
      }

      // Filtres par type
      if (filters.type) {
        if (record.type !== filters.type) {
          return false;
        }
      }

      return true;
    });

    return filtered;
  },

  // Obtenir l'historique médical complet d'un patient - US 2.5
  getPatientMedicalHistory: (patientId, options = {}) => {
    const records = medicalRecordsStorage.getByPatientId(patientId);

    // Trier par date (plus récent en premier)
    records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Appliquer les filtres si fournis
    let filtered = records;

    if (options.type) {
      filtered = filtered.filter(record => record.type === options.type);
    }

    if (options.practitioner) {
      filtered = filtered.filter(record => record.practitionerId === options.practitioner);
    }

    if (options.dateFrom) {
      filtered = filtered.filter(record =>
        new Date(record.createdAt) >= new Date(options.dateFrom)
      );
    }

    if (options.dateTo) {
      filtered = filtered.filter(record =>
        new Date(record.createdAt) <= new Date(options.dateTo)
      );
    }

    // Grouper par type si demandé
    if (options.groupByType) {
      const grouped = {};
      filtered.forEach(record => {
        const type = record.type || 'general';
        if (!grouped[type]) {
          grouped[type] = [];
        }
        grouped[type].push(record);
      });
      return grouped;
    }

    return filtered;
  },

  // Supprimer un dossier médical (soft delete)
  delete: (id, userId = 'system') => {
    try {
      const records = medicalRecordsStorage.getAll();
      const index = records.findIndex(record => record.id === id);

      if (index === -1) {
        throw new Error('Dossier médical non trouvé');
      }

      records[index] = {
        ...records[index],
        deleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
        accessLog: [
          ...records[index].accessLog,
          {
            action: 'delete',
            userId: userId,
            timestamp: new Date().toISOString(),
            ipAddress: 'localhost'
          }
        ]
      };

      localStorage.setItem(MEDICAL_RECORDS_STORAGE_KEY, JSON.stringify(records));
      return true;
    } catch (error) {
      console.error('Erreur suppression dossier médical:', error);
      throw error;
    }
  },

  // Statistiques médicales
  getStatistics: (patientId = null) => {
    const records = patientId ?
      medicalRecordsStorage.getByPatientId(patientId) :
      medicalRecordsStorage.getAll().filter(r => !r.deleted);

    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisYear = new Date(now.getFullYear(), 0, 1);

    return {
      total: records.length,
      thisMonth: records.filter(r => new Date(r.createdAt) >= thisMonth).length,
      thisYear: records.filter(r => new Date(r.createdAt) >= thisYear).length,
      byType: {
        consultation: records.filter(r => r.type === 'consultation').length,
        examination: records.filter(r => r.type === 'examination').length,
        treatment: records.filter(r => r.type === 'treatment').length,
        followUp: records.filter(r => r.type === 'follow_up').length
      },
      activeTreatments: records.reduce((count, record) => {
        if (record.treatments) {
          return count + record.treatments.filter(t => t.status === 'active').length;
        }
        return count;
      }, 0),
      medicationWarnings: records.reduce((count, record) => {
        return count + (record.medicationWarnings?.length || 0);
      }, 0)
    };
  }
};

// Initialiser quelques dossiers médicaux de démonstration
export const initializeSampleMedicalRecords = () => {
  const existingRecords = medicalRecordsStorage.getAll();
  if (existingRecords.length === 0) {
    const sampleRecords = [
      {
        patientId: 'demo_patient_1',
        practitionerId: 'demo_doctor_1',
        type: 'consultation',

        // US 2.1 - Antécédents
        antecedents: {
          personal: {
            medicalHistory: ['Hipertensión arterial (2018)', 'Diabetes tipo 2 (2020)'],
            surgicalHistory: ['Apendicectomía (2015)'],
            allergies: ['Penicilina', 'Mariscos'],
            habits: {
              smoking: { status: 'former', details: 'Dejó hace 5 años, 10 cigarrillos/día' },
              alcohol: { status: 'occasional', details: 'Vino los fines de semana' },
              exercise: { status: 'regular', details: 'Camina 30 min/día' }
            }
          },
          family: {
            father: 'Infarto de miocardio (65 años)',
            mother: 'Diabetes tipo 2',
            siblings: 'Hermana con cáncer de mama',
            children: 'Sin antecedentes relevantes'
          }
        },

        // US 2.2 - Données cliniques de base
        vitalSigns: {
          weight: 78,
          height: 170,
          bmi: 27.0,
          bloodPressure: { systolic: 140, diastolic: 90 },
          heartRate: 72,
          temperature: 36.5,
          respiratoryRate: 16,
          oxygenSaturation: 98
        },

        bloodType: 'A+',

        // US 2.2 - Allergies (détaillées)
        allergies: [
          {
            allergen: 'Penicilina',
            type: 'medicamento',
            severity: 'grave',
            reaction: 'Erupción cutánea, dificultad respiratoria',
            dateDiscovered: '2015-03-10'
          },
          {
            allergen: 'Mariscos',
            type: 'alimento',
            severity: 'moderada',
            reaction: 'Urticaria',
            dateDiscovered: '2018-07-15'
          }
        ],

        // US 2.3 - Pathologies & diagnostics
        diagnosis: {
          primary: 'Hipertensión arterial esencial',
          secondary: ['Diabetes mellitus tipo 2', 'Sobrepeso'],
          icd10: ['I10', 'E11.9', 'E66.9']
        },

        chronicConditions: [
          {
            condition: 'Hipertensión arterial',
            diagnosisDate: '2018-05-15',
            practitioner: 'Dr. García',
            status: 'active',
            notes: 'Bien controlada con medicación'
          },
          {
            condition: 'Diabetes mellitus tipo 2',
            diagnosisDate: '2020-02-20',
            practitioner: 'Dr. García',
            status: 'active',
            notes: 'HbA1c objetivo <7%'
          }
        ],

        // US 2.4 - Traitements
        treatments: [
          {
            medication: 'Lisinopril',
            dosage: '10mg',
            frequency: '1 vez al día',
            route: 'oral',
            startDate: '2018-05-15',
            endDate: null,
            status: 'active',
            prescribedBy: 'Dr. García',
            notes: 'Tomar por la mañana'
          },
          {
            medication: 'Metformina',
            dosage: '850mg',
            frequency: '2 veces al día',
            route: 'oral',
            startDate: '2020-02-20',
            endDate: null,
            status: 'active',
            prescribedBy: 'Dr. García',
            notes: 'Con las comidas principales'
          }
        ],

        // Información de la consulta
        basicInfo: {
          chiefComplaint: 'Control rutinario diabetes e hipertensión',
          symptoms: ['Ningún síntoma nuevo'],
          duration: 'N/A'
        },

        // Examen físico
        physicalExam: {
          general: 'Paciente en buen estado general',
          cardiovascular: 'Ruidos cardíacos rítmicos, sin soplos',
          respiratory: 'Murmullo vesicular conservado',
          abdomen: 'Blando, depresible, sin masas',
          neurological: 'Sin alteraciones'
        },

        // Plan de tratamiento
        treatmentPlan: {
          recommendations: [
            'Continuar con medicación actual',
            'Dieta baja en sodio y azúcares',
            'Ejercicio regular',
            'Control en 3 meses'
          ],
          followUp: '2024-01-15',
          tests: ['Hemoglobina glicosilada', 'Perfil lipídico']
        },

        createdBy: 'demo'
      }
    ];

    sampleRecords.forEach(recordData => {
      try {
        medicalRecordsStorage.create(recordData, 'demo');
      } catch (error) {
        console.log('Dossier médical démonstration déjà existant:', error.message);
      }
    });
  }
};

export default medicalRecordsStorage;