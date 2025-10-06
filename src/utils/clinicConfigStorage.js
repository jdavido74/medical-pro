// utils/clinicConfigStorage.js - Gestion de la configuration de la clinique

import { generateId } from './idGenerator';

const CLINIC_CONFIG_STORAGE_KEY = 'medicalPro_clinic_config';
const PRACTITIONERS_STORAGE_KEY = 'medicalPro_practitioners';

// Configuration par défaut de la clinique
const DEFAULT_CLINIC_CONFIG = {
  id: 'clinic_default',
  name: 'Clinique Médicale Pro',

  // Jours d'ouverture (0 = Dimanche, 1 = Lundi, etc.)
  operatingDays: [1, 2, 3, 4, 5], // Lundi à Vendredi par défaut

  // Horaires généraux de la clinique
  operatingHours: {
    monday: { enabled: true, start: '08:00', end: '18:00' },
    tuesday: { enabled: true, start: '08:00', end: '18:00' },
    wednesday: { enabled: true, start: '08:00', end: '18:00' },
    thursday: { enabled: true, start: '08:00', end: '18:00' },
    friday: { enabled: true, start: '08:00', end: '17:00' },
    saturday: { enabled: false, start: '09:00', end: '13:00' },
    sunday: { enabled: false, start: '09:00', end: '13:00' }
  },

  // Configuration des créneaux
  slotSettings: {
    defaultDuration: 30, // Durée par défaut en minutes
    availableDurations: [15, 20, 30, 45, 60, 90, 120], // Durées possibles
    bufferTime: 5, // Temps de battement entre rendez-vous (en minutes)
    maxAdvanceBooking: 90, // Nombre de jours maximum à l'avance
    minAdvanceBooking: 1, // Nombre d'heures minimum à l'avance
    allowWeekendBooking: false
  },

  // Jours de fermeture exceptionnelle
  closedDates: [
    // Format: { date: 'YYYY-MM-DD', reason: 'Raison', type: 'holiday|maintenance|other' }
  ],

  // Configuration des types de rendez-vous
  appointmentTypes: [
    { id: 'consultation', name: 'Consultation', duration: 30, color: 'blue' },
    { id: 'follow_up', name: 'Suivi', duration: 20, color: 'green' },
    { id: 'emergency', name: 'Urgence', duration: 45, color: 'red' },
    { id: 'specialist', name: 'Spécialiste', duration: 60, color: 'purple' },
    { id: 'exam', name: 'Examen', duration: 45, color: 'orange' },
    { id: 'vaccination', name: 'Vaccination', duration: 15, color: 'teal' }
  ],

  // Paramètres de notification
  notifications: {
    patientReminders: {
      enabled: true,
      timeBefore: [24, 2], // Heures avant le rendez-vous
      methods: ['email', 'sms']
    },
    practitionerReminders: {
      enabled: true,
      timeBefore: [30], // Minutes avant le rendez-vous
      methods: ['email']
    }
  },

  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// Service de gestion de la configuration de la clinique
export const clinicConfigStorage = {
  // Récupérer la configuration de la clinique
  getConfig: () => {
    try {
      const config = localStorage.getItem(CLINIC_CONFIG_STORAGE_KEY);
      return config ? JSON.parse(config) : DEFAULT_CLINIC_CONFIG;
    } catch (error) {
      console.error('Erreur lecture configuration clinique:', error);
      return DEFAULT_CLINIC_CONFIG;
    }
  },

  // Sauvegarder la configuration de la clinique
  saveConfig: (config) => {
    try {
      const updatedConfig = {
        ...config,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(CLINIC_CONFIG_STORAGE_KEY, JSON.stringify(updatedConfig));
      return updatedConfig;
    } catch (error) {
      console.error('Erreur sauvegarde configuration clinique:', error);
      return null;
    }
  },

  // Mettre à jour les horaires d'ouverture
  updateOperatingHours: (dayOfWeek, hours) => {
    const config = clinicConfigStorage.getConfig();
    config.operatingHours[dayOfWeek] = hours;
    return clinicConfigStorage.saveConfig(config);
  },

  // Ajouter un jour de fermeture
  addClosedDate: (date, reason, type = 'other') => {
    const config = clinicConfigStorage.getConfig();
    config.closedDates.push({ date, reason, type, id: generateId() });
    return clinicConfigStorage.saveConfig(config);
  },

  // Supprimer un jour de fermeture
  removeClosedDate: (dateId) => {
    const config = clinicConfigStorage.getConfig();
    config.closedDates = config.closedDates.filter(d => d.id !== dateId);
    return clinicConfigStorage.saveConfig(config);
  },

  // Vérifier si la clinique est ouverte à une date/heure donnée
  isClinicOpen: (date, time) => {
    const config = clinicConfigStorage.getConfig();
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];

    // Vérifier les jours d'ouverture
    if (!config.operatingDays.includes(dayOfWeek)) {
      return false;
    }

    // Vérifier les horaires du jour
    const dayHours = config.operatingHours[dayName];
    if (!dayHours.enabled) {
      return false;
    }

    // Vérifier l'heure
    if (time) {
      const timeMinutes = timeToMinutes(time);
      const startMinutes = timeToMinutes(dayHours.start);
      const endMinutes = timeToMinutes(dayHours.end);

      if (timeMinutes < startMinutes || timeMinutes > endMinutes) {
        return false;
      }
    }

    // Vérifier les jours de fermeture exceptionnelle
    const dateStr = targetDate.toISOString().split('T')[0];
    const isClosedDate = config.closedDates.some(closedDate => closedDate.date === dateStr);

    return !isClosedDate;
  },

  // Obtenir les créneaux disponibles pour un jour donné
  getAvailableSlots: (date) => {
    const config = clinicConfigStorage.getConfig();

    if (!clinicConfigStorage.isClinicOpen(date)) {
      return [];
    }

    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
    const dayHours = config.operatingHours[dayName];

    const slots = [];
    const startMinutes = timeToMinutes(dayHours.start);
    const endMinutes = timeToMinutes(dayHours.end);
    const slotDuration = config.slotSettings.defaultDuration;
    const bufferTime = config.slotSettings.bufferTime;

    for (let minutes = startMinutes; minutes < endMinutes; minutes += slotDuration + bufferTime) {
      const slotEnd = minutes + slotDuration;
      if (slotEnd <= endMinutes) {
        slots.push({
          start: minutesToTime(minutes),
          end: minutesToTime(slotEnd),
          duration: slotDuration
        });
      }
    }

    return slots;
  }
};

// Service de gestion des praticiens
export const practitionersStorage = {
  // Récupérer tous les praticiens
  getAll: () => {
    try {
      const practitioners = localStorage.getItem(PRACTITIONERS_STORAGE_KEY);
      return practitioners ? JSON.parse(practitioners) : [];
    } catch (error) {
      console.error('Erreur lecture praticiens:', error);
      return [];
    }
  },

  // Récupérer un praticien par ID
  getById: (id) => {
    const practitioners = practitionersStorage.getAll();
    return practitioners.find(p => p.id === id);
  },

  // Ajouter un praticien
  add: (practitionerData) => {
    const practitioners = practitionersStorage.getAll();
    const newPractitioner = {
      id: practitionerData.id || generateId(), // Utiliser l'ID fourni ou en générer un
      ...practitionerData,
      availability: {
        monday: { enabled: true, slots: [] },
        tuesday: { enabled: true, slots: [] },
        wednesday: { enabled: true, slots: [] },
        thursday: { enabled: true, slots: [] },
        friday: { enabled: true, slots: [] },
        saturday: { enabled: false, slots: [] },
        sunday: { enabled: false, slots: [] }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    practitioners.push(newPractitioner);
    localStorage.setItem(PRACTITIONERS_STORAGE_KEY, JSON.stringify(practitioners));
    return newPractitioner;
  },

  // Mettre à jour un praticien
  update: (id, updates) => {
    const practitioners = practitionersStorage.getAll();
    const index = practitioners.findIndex(p => p.id === id);

    if (index === -1) return null;

    practitioners[index] = {
      ...practitioners[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(PRACTITIONERS_STORAGE_KEY, JSON.stringify(practitioners));
    return practitioners[index];
  },

  // Supprimer un praticien
  delete: (id) => {
    const practitioners = practitionersStorage.getAll();
    const filteredPractitioners = practitioners.filter(p => p.id !== id);
    localStorage.setItem(PRACTITIONERS_STORAGE_KEY, JSON.stringify(filteredPractitioners));
    return true;
  },

  // Mettre à jour les disponibilités d'un praticien
  updateAvailability: (practitionerId, dayOfWeek, availability) => {
    const practitioner = practitionersStorage.getById(practitionerId);
    if (!practitioner) return null;

    practitioner.availability[dayOfWeek] = availability;
    return practitionersStorage.update(practitionerId, { availability: practitioner.availability });
  },

  // Obtenir les praticiens disponibles à une date/heure donnée
  getAvailablePractitioners: (date, startTime, duration = 30) => {
    const practitioners = practitionersStorage.getAll();
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];

    return practitioners.filter(practitioner => {
      if (!practitioner.isActive) return false;

      const dayAvailability = practitioner.availability[dayName];
      if (!dayAvailability?.enabled) return false;

      // Vérifier si le créneau demandé est dans les disponibilités
      const requestStartMinutes = timeToMinutes(startTime);
      const requestEndMinutes = requestStartMinutes + duration;

      return dayAvailability.slots.some(slot => {
        const slotStartMinutes = timeToMinutes(slot.start);
        const slotEndMinutes = timeToMinutes(slot.end);

        return requestStartMinutes >= slotStartMinutes && requestEndMinutes <= slotEndMinutes;
      });
    });
  }
};

// Fonctions utilitaires
const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Initialiser les données de démonstration
export const initializeSamplePractitioners = () => {
  const practitioners = practitionersStorage.getAll();

  if (practitioners.length === 0) {
    const samplePractitioners = [
      {
        firstName: 'Dr. Marie',
        lastName: 'Dubois',
        email: 'marie.dubois@clinic.com',
        phone: '+33 1 23 45 67 89',
        speciality: 'Médecine Générale',
        license: 'MG123456',
        isActive: true,
        type: 'doctor',
        color: 'blue'
      },
      {
        firstName: 'Dr. Pierre',
        lastName: 'Martin',
        email: 'pierre.martin@clinic.com',
        phone: '+33 1 23 45 67 90',
        speciality: 'Cardiologie',
        license: 'CA789012',
        isActive: true,
        type: 'doctor',
        color: 'red'
      },
      {
        firstName: 'Sophie',
        lastName: 'Leroy',
        email: 'sophie.leroy@clinic.com',
        phone: '+33 1 23 45 67 91',
        speciality: 'Soins Infirmiers',
        license: 'SI345678',
        isActive: true,
        type: 'nurse',
        color: 'green'
      }
    ];

    samplePractitioners.forEach(practitionerData => {
      const practitioner = practitionersStorage.add(practitionerData);

      // Configurer des disponibilités par défaut
      const defaultSlots = [
        { start: '09:00', end: '12:00' },
        { start: '14:00', end: '18:00' }
      ];

      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
        practitionersStorage.updateAvailability(practitioner.id, day, {
          enabled: true,
          slots: defaultSlots
        });
      });
    });

    console.log('Praticiens de démonstration initialisés');
  }
};

// Initialiser la configuration par défaut
export const initializeClinicConfig = () => {
  const config = clinicConfigStorage.getConfig();
  if (config === DEFAULT_CLINIC_CONFIG) {
    clinicConfigStorage.saveConfig(DEFAULT_CLINIC_CONFIG);
    console.log('Configuration de clinique initialisée');
  }
};

export default {
  clinicConfigStorage,
  practitionersStorage,
  initializeSamplePractitioners,
  initializeClinicConfig
};