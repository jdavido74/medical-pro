// utils/patientsStorage.js
import { generateId } from './idGenerator';

const PATIENTS_STORAGE_KEY = 'medicalPro_patients';

// Service de gestion des patients conforme aux exigences médicales
export const patientsStorage = {
  // Récupérer tous les patients
  getAll: () => {
    try {
      const patients = localStorage.getItem(PATIENTS_STORAGE_KEY);
      return patients ? JSON.parse(patients) : [];
    } catch (error) {
      console.error('Erreur lecture patients:', error);
      return [];
    }
  },

  // Récupérer un patient par ID
  getById: (id) => {
    const patients = patientsStorage.getAll();
    return patients.find(patient => patient.id === id);
  },

  // Vérifier les doublons (même nom + date de naissance) - US 1.1
  checkDuplicate: (firstName, lastName, birthDate, excludeId = null) => {
    const patients = patientsStorage.getAll();
    return patients.find(patient =>
      patient.id !== excludeId &&
      patient.firstName?.toLowerCase() === firstName?.toLowerCase() &&
      patient.lastName?.toLowerCase() === lastName?.toLowerCase() &&
      patient.birthDate === birthDate
    );
  },

  // Générer un numéro patient unique - US 1.1
  generatePatientNumber: () => {
    const patients = patientsStorage.getAll();
    const currentYear = new Date().getFullYear();
    const yearSuffix = currentYear.toString().slice(-2);

    // Trouver le prochain numéro séquentiel pour l'année
    const existingNumbers = patients
      .map(p => p.patientNumber)
      .filter(num => num && num.startsWith(`P${yearSuffix}`))
      .map(num => parseInt(num.slice(3)))
      .filter(num => !isNaN(num))
      .sort((a, b) => b - a);

    const nextNumber = existingNumbers.length > 0 ? existingNumbers[0] + 1 : 1;
    return `P${yearSuffix}${nextNumber.toString().padStart(4, '0')}`;
  },

  // Créer un nouveau patient - US 1.1
  create: (patientData) => {
    try {
      // Vérifier les doublons
      const duplicate = patientsStorage.checkDuplicate(
        patientData.firstName,
        patientData.lastName,
        patientData.birthDate
      );

      if (duplicate) {
        throw new Error(`Un patient avec le même nom et date de naissance existe déjà (${duplicate.patientNumber})`);
      }

      const patients = patientsStorage.getAll();
      const newPatient = {
        id: generateId(),
        patientNumber: patientsStorage.generatePatientNumber(),
        ...patientData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: patientData.createdBy || 'system',
        // Métadonnées de sécurité
        accessLog: [{
          action: 'create',
          userId: patientData.createdBy || 'system',
          timestamp: new Date().toISOString(),
          ipAddress: 'localhost' // En production, récupérer la vraie IP
        }]
      };

      patients.push(newPatient);
      localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(patients));
      return newPatient;
    } catch (error) {
      console.error('Erreur création patient:', error);
      throw error;
    }
  },

  // Mettre à jour un patient
  update: (id, patientData, userId = 'system') => {
    try {
      const patients = patientsStorage.getAll();
      const index = patients.findIndex(patient => patient.id === id);

      if (index === -1) {
        throw new Error('Patient non trouvé');
      }

      // Vérifier les doublons (en excluant le patient actuel)
      if (patientData.firstName && patientData.lastName && patientData.birthDate) {
        const duplicate = patientsStorage.checkDuplicate(
          patientData.firstName,
          patientData.lastName,
          patientData.birthDate,
          id
        );

        if (duplicate) {
          throw new Error(`Un autre patient avec le même nom et date de naissance existe déjà (${duplicate.patientNumber})`);
        }
      }

      // Conserver l'historique d'accès
      const currentPatient = patients[index];
      const updatedPatient = {
        ...currentPatient,
        ...patientData,
        updatedAt: new Date().toISOString(),
        accessLog: [
          ...currentPatient.accessLog,
          {
            action: 'update',
            userId: userId,
            timestamp: new Date().toISOString(),
            ipAddress: 'localhost',
            changes: Object.keys(patientData)
          }
        ]
      };

      patients[index] = updatedPatient;
      localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(patients));
      return updatedPatient;
    } catch (error) {
      console.error('Erreur mise à jour patient:', error);
      throw error;
    }
  },

  // Supprimer un patient (soft delete pour conformité)
  delete: (id, userId = 'system') => {
    try {
      const patients = patientsStorage.getAll();
      const index = patients.findIndex(patient => patient.id === id);

      if (index === -1) {
        throw new Error('Patient non trouvé');
      }

      // Soft delete - marquer comme supprimé au lieu de supprimer
      patients[index] = {
        ...patients[index],
        deleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
        accessLog: [
          ...patients[index].accessLog,
          {
            action: 'delete',
            userId: userId,
            timestamp: new Date().toISOString(),
            ipAddress: 'localhost'
          }
        ]
      };

      localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(patients));
      return true;
    } catch (error) {
      console.error('Erreur suppression patient:', error);
      throw error;
    }
  },

  // Rechercher des patients
  search: (query) => {
    const patients = patientsStorage.getAll().filter(p => !p.deleted);
    const searchTerm = query.toLowerCase();

    return patients.filter(patient =>
      patient.firstName?.toLowerCase().includes(searchTerm) ||
      patient.lastName?.toLowerCase().includes(searchTerm) ||
      patient.patientNumber?.toLowerCase().includes(searchTerm) ||
      patient.email?.toLowerCase().includes(searchTerm) ||
      patient.phone?.includes(searchTerm)
    );
  },

  // Journaliser un accès au dossier patient - US 6.2
  logAccess: (patientId, action, userId = 'system', details = {}) => {
    try {
      const patients = patientsStorage.getAll();
      const index = patients.findIndex(patient => patient.id === patientId);

      if (index !== -1) {
        patients[index].accessLog.push({
          action,
          userId,
          timestamp: new Date().toISOString(),
          ipAddress: 'localhost',
          details
        });

        localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(patients));
      }
    } catch (error) {
      console.error('Erreur journalisation accès:', error);
    }
  },

  // Statistiques
  getStatistics: () => {
    const patients = patientsStorage.getAll().filter(p => !p.deleted);
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisYear = new Date(now.getFullYear(), 0, 1);

    return {
      total: patients.length,
      active: patients.filter(p => p.status === 'active').length,
      newThisMonth: patients.filter(p => new Date(p.createdAt) >= thisMonth).length,
      newThisYear: patients.filter(p => new Date(p.createdAt) >= thisYear).length,
      byGender: {
        male: patients.filter(p => p.gender === 'male').length,
        female: patients.filter(p => p.gender === 'female').length,
        other: patients.filter(p => p.gender === 'other').length
      }
    };
  }
};

// Initialiser quelques patients de démonstration
export const initializeSamplePatients = () => {
  const existingPatients = patientsStorage.getAll();
  if (existingPatients.length === 0) {
    const samplePatients = [
      {
        firstName: 'María',
        lastName: 'García López',
        birthDate: '1985-03-15',
        gender: 'female',
        idNumber: '12345678A',
        nationality: 'Española',
        address: {
          street: 'Calle Mayor 123',
          city: 'Madrid',
          postalCode: '28001',
          country: 'España'
        },
        contact: {
          phone: '+34 600 123 456',
          email: 'maria.garcia@email.com',
          emergencyContact: {
            name: 'Juan García',
            relationship: 'Esposo',
            phone: '+34 600 654 321'
          }
        },
        insurance: {
          provider: 'Seguridad Social',
          number: 'SS123456789',
          type: 'Pública'
        },
        status: 'active',
        createdBy: 'demo'
      },
      {
        firstName: 'Carlos',
        lastName: 'Rodríguez Martín',
        birthDate: '1978-11-22',
        gender: 'male',
        idNumber: '87654321B',
        nationality: 'Española',
        address: {
          street: 'Avenida de la Paz 45',
          city: 'Barcelona',
          postalCode: '08001',
          country: 'España'
        },
        contact: {
          phone: '+34 620 987 654',
          email: 'carlos.rodriguez@email.com',
          emergencyContact: {
            name: 'Ana Martín',
            relationship: 'Esposa',
            phone: '+34 620 456 789'
          }
        },
        insurance: {
          provider: 'Sanitas',
          number: 'SAN987654321',
          type: 'Privada'
        },
        status: 'active',
        createdBy: 'demo'
      }
    ];

    samplePatients.forEach(patientData => {
      try {
        patientsStorage.create(patientData);
      } catch (error) {
        console.log('Patient démonstration déjà existant:', error.message);
      }
    });
  }
};

export default patientsStorage;