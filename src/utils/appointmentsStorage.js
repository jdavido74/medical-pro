// utils/appointmentsStorage.js
import { generateAppointmentId } from './idGenerator';

const APPOINTMENTS_STORAGE_KEY = 'medicalPro_appointments';
const AVAILABILITY_STORAGE_KEY = 'medicalPro_availability';

// Types de rendez-vous
export const APPOINTMENT_TYPES = {
  consultation: 'Consultation',
  follow_up: 'Suivi',
  emergency: 'Urgence',
  specialist: 'Spécialiste',
  exam: 'Examen',
  surgery: 'Chirurgie'
};

// Statuts des rendez-vous
export const APPOINTMENT_STATUS = {
  scheduled: 'Programmé',
  confirmed: 'Confirmé',
  in_progress: 'En cours',
  completed: 'Terminé',
  cancelled: 'Annulé',
  no_show: 'Absent'
};

// Priorités des rendez-vous
export const APPOINTMENT_PRIORITY = {
  low: 'Basse',
  normal: 'Normale',
  high: 'Haute',
  urgent: 'Urgente'
};

/**
 * Enrichir les rendez-vous avec les données des patients et praticiens
 * Fonction partagée entre la liste des RDV et la vue calendrier
 * @param {Array} appointments - Les rendez-vous bruts
 * @param {Array} patients - Les patients
 * @param {Array} practitioners - Les praticiens
 * @returns {Array} RDV enrichis avec patientName, practitionerName, etc.
 */
export const enrichAppointments = (appointments, patients, practitioners) => {
  return appointments.map(appointment => {
    const patient = patients?.find(p => p.id === appointment.patientId);
    const practitioner = practitioners?.find(p => p.id === appointment.practitionerId);
    return {
      ...appointment,
      patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Patient inconnu',
      patientPhone: patient?.phone || '',
      patientNumber: patient?.patientNumber || '',
      practitionerName: practitioner?.name || 'Non assigné',
      practitionerSpecialty: practitioner?.specialty || ''
    };
  });
};

/**
 * Migrer les rendez-vous avec des IDs de praticien obsolètes
 * Corrige les appointments qui utilisaient les anciens IDs (demo_doctor_1, etc.)
 * vers les nouveaux IDs (demo_pract_002, etc.)
 * @param {Array} practitioners - Liste des praticiens actuels
 */
export const migrateAppointmentPractitionerIds = (practitioners) => {
  const allAppointments = appointmentsStorage.getAll();

  // Map des anciens IDs vers les nouveaux
  const idMap = {
    'demo_doctor_1': 'demo_pract_002' // Dr. Carlos Garcia
  };

  let migrated = 0;
  const migratedAppointments = allAppointments.map(apt => {
    if (idMap[apt.practitionerId]) {
      const newId = idMap[apt.practitionerId];
      // Vérifier que le nouveau praticien existe
      if (practitioners.some(p => p.id === newId)) {
        console.log(`[Migration] RDV ${apt.id}: praticien ${apt.practitionerId} -> ${newId}`);
        migrated++;
        return {
          ...apt,
          practitionerId: newId
        };
      }
    }
    return apt;
  });

  if (migrated > 0) {
    localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(migratedAppointments));
    console.log(`[Migration] ${migrated} rendez-vous migrés avec succès`);
  }

  return migrated;
};

// Service de gestion des rendez-vous
export const appointmentsStorage = {
  // Récupérer tous les rendez-vous
  getAll: () => {
    try {
      const appointments = localStorage.getItem(APPOINTMENTS_STORAGE_KEY);
      return appointments ? JSON.parse(appointments) : [];
    } catch (error) {
      console.error('Erreur lecture rendez-vous:', error);
      return [];
    }
  },

  // Récupérer les rendez-vous par patient
  getByPatientId: (patientId) => {
    const appointments = appointmentsStorage.getAll();
    return appointments.filter(appointment =>
      appointment.patientId === patientId && !appointment.deleted
    );
  },

  // Récupérer les rendez-vous par praticien
  getByPractitionerId: (practitionerId) => {
    const appointments = appointmentsStorage.getAll();
    return appointments.filter(appointment =>
      appointment.practitionerId === practitionerId && !appointment.deleted
    );
  },

  // Récupérer un rendez-vous par ID
  getById: (id) => {
    const appointments = appointmentsStorage.getAll();
    return appointments.find(appointment => appointment.id === id && !appointment.deleted);
  },

  // Créer un nouveau rendez-vous - US 3.1
  create: (appointmentData, userId = 'system') => {
    try {
      const appointments = appointmentsStorage.getAll();

      // IMPORTANT: Vérifier d'abord que le créneau est dans les horaires de disponibilité du praticien
      const availabilityCheck = appointmentsStorage.isWithinPractitionerAvailability(
        appointmentData.practitionerId,
        appointmentData.date,
        appointmentData.startTime,
        appointmentData.endTime
      );

      if (!availabilityCheck.available) {
        throw new Error(availabilityCheck.reason);
      }

      // Vérifier les conflits de créneaux avec d'autres rendez-vous (incluant les créneaux supplémentaires)
      const conflicts = appointmentsStorage.checkTimeConflicts(
        appointmentData.practitionerId,
        appointmentData.date,
        appointmentData.startTime,
        appointmentData.endTime,
        null, // Pas d'ID à exclure (création)
        appointmentData.additionalSlots || []
      );

      if (conflicts.length > 0) {
        throw new Error('Conflit de créneaux détecté avec un autre rendez-vous');
      }

      const newAppointment = {
        id: generateAppointmentId(),
        ...appointmentData,
        status: appointmentData.status || 'scheduled',
        priority: appointmentData.priority || 'normal',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: userId,

        // Métadonnées de conformité
        accessLog: [{
          action: 'create',
          userId: userId,
          timestamp: new Date().toISOString(),
          ipAddress: 'localhost'
        }],

        // Rappels automatiques
        reminders: appointmentData.reminders || [
          { type: 'email', time: '24h_before', sent: false },
          { type: 'sms', time: '2h_before', sent: false }
        ]
      };

      appointments.push(newAppointment);
      localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(appointments));
      return newAppointment;
    } catch (error) {
      console.error('Erreur création rendez-vous:', error);
      throw error;
    }
  },

  // Mettre à jour un rendez-vous
  update: (id, appointmentData, userId = 'system') => {
    try {
      if (!id) {
        throw new Error('ID du rendez-vous requis pour la mise à jour');
      }

      const appointments = appointmentsStorage.getAll();
      const index = appointments.findIndex(appointment => appointment.id === id);

      if (index === -1) {
        console.error(`Rendez-vous avec ID ${id} non trouvé`);
        console.error('IDs disponibles:', appointments.map(a => a.id));
        throw new Error('Rendez-vous non trouvé');
      }

      // Log pour debugging
      console.log(`Mise à jour du rendez-vous ${id}`, {
        currentData: appointments[index],
        newData: appointmentData
      });

      // Vérifier les conflits si l'heure change
      if (appointmentData.date || appointmentData.startTime || appointmentData.endTime || appointmentData.practitionerId) {
        const currentAppointment = appointments[index];
        const finalPractitionerId = appointmentData.practitionerId || currentAppointment.practitionerId;
        const finalDate = appointmentData.date || currentAppointment.date;
        const finalStartTime = appointmentData.startTime || currentAppointment.startTime;
        const finalEndTime = appointmentData.endTime || currentAppointment.endTime;
        const finalAdditionalSlots = appointmentData.additionalSlots !== undefined
          ? appointmentData.additionalSlots
          : (currentAppointment.additionalSlots || []);

        // IMPORTANT: Vérifier d'abord que le créneau est dans les horaires de disponibilité du praticien
        const availabilityCheck = appointmentsStorage.isWithinPractitionerAvailability(
          finalPractitionerId,
          finalDate,
          finalStartTime,
          finalEndTime
        );

        if (!availabilityCheck.available) {
          throw new Error(availabilityCheck.reason);
        }

        // Vérifier les conflits avec d'autres rendez-vous (incluant les créneaux supplémentaires)
        const conflicts = appointmentsStorage.checkTimeConflicts(
          finalPractitionerId,
          finalDate,
          finalStartTime,
          finalEndTime,
          id, // Exclure le rendez-vous actuel
          finalAdditionalSlots
        );

        if (conflicts.length > 0) {
          throw new Error('Conflit de créneaux détecté avec un autre rendez-vous');
        }
      }

      const currentAppointment = appointments[index];
      const updatedAppointment = {
        ...currentAppointment,
        ...appointmentData,
        updatedAt: new Date().toISOString(),
        accessLog: [
          ...currentAppointment.accessLog,
          {
            action: 'update',
            userId: userId,
            timestamp: new Date().toISOString(),
            ipAddress: 'localhost',
            changes: Object.keys(appointmentData)
          }
        ]
      };

      appointments[index] = updatedAppointment;
      localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(appointments));
      return updatedAppointment;
    } catch (error) {
      console.error('Erreur mise à jour rendez-vous:', error);
      throw error;
    }
  },

  // Vérifier si un créneau est dans les horaires de disponibilité du praticien
  isWithinPractitionerAvailability: (practitionerId, date, startTime, endTime) => {
    let availability = appointmentsStorage.getPractitionerAvailability(practitionerId, date);

    // Si pas de disponibilité définie, utiliser les horaires standard par défaut
    if (!availability || !availability.timeSlots || availability.timeSlots.length === 0) {
      const dayOfWeek = new Date(date).getDay();

      // Dimanche = 0, Samedi = 6
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return {
          available: false,
          reason: 'Le praticien n\'est pas disponible le weekend'
        };
      }

      // Utiliser les horaires standards
      availability = {
        timeSlots: [
          { start: '09:00', end: '12:00' },
          { start: '14:00', end: '18:00' }
        ]
      };
    }

    const newStart = new Date(`${date}T${startTime}`);
    const newEnd = new Date(`${date}T${endTime}`);

    // Vérifier si le créneau demandé est complètement inclus dans au moins une plage de disponibilité
    const isInAvailability = availability.timeSlots.some(slot => {
      const slotStart = new Date(`${date}T${slot.start}`);
      const slotEnd = new Date(`${date}T${slot.end}`);

      // Le créneau doit être entièrement dans la plage de disponibilité
      return newStart >= slotStart && newEnd <= slotEnd;
    });

    if (!isInAvailability) {
      const availableSlots = availability.timeSlots
        .map(slot => `${slot.start}-${slot.end}`)
        .join(', ');
      return {
        available: false,
        reason: `Le praticien n'est disponible que de ${availableSlots} ce jour-là`
      };
    }

    return { available: true };
  },

  // Vérifier les conflits de créneaux - US 3.2
  checkTimeConflicts: (practitionerId, date, startTime, endTime, excludeId = null, additionalSlots = []) => {
    const appointments = appointmentsStorage.getAll();

    const conflicts = appointments.filter(appointment => {
      if (appointment.deleted || appointment.id === excludeId) return false;
      if (appointment.practitionerId !== practitionerId) return false;
      if (appointment.date !== date) return false;
      if (['cancelled', 'no_show'].includes(appointment.status)) return false;

      // Créer une liste de tous les créneaux à vérifier (principal + supplémentaires)
      const allNewSlots = [
        { start: startTime, end: endTime },
        ...additionalSlots
      ];

      // Vérifier le chevauchement pour chaque créneau
      for (const newSlot of allNewSlots) {
        const existingStart = new Date(`${date}T${appointment.startTime}`);
        const existingEnd = new Date(`${date}T${appointment.endTime}`);
        const newStart = new Date(`${date}T${newSlot.start}`);
        const newEnd = new Date(`${date}T${newSlot.end}`);

        if (newStart < existingEnd && newEnd > existingStart) {
          return true; // Conflit détecté
        }
      }

      return false;
    });

    return conflicts;
  },

  // Obtenir les créneaux disponibles - US 3.2
  getAvailableSlots: (practitionerId, date, duration = 30) => {
    let availability = appointmentsStorage.getPractitionerAvailability(practitionerId, date);
    let usingDefaults = false;

    // Si pas de disponibilité définie, utiliser les horaires standard par défaut
    if (!availability) {
      // Horaires standards: 9h-12h et 14h-18h du lundi au vendredi, fermé weekend
      const dayOfWeek = new Date(date).getDay();

      // Dimanche = 0, Samedi = 6
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return []; // Pas de créneaux le weekend
      }

      // Utiliser les horaires standards
      availability = {
        timeSlots: [
          { start: '09:00', end: '12:00' },
          { start: '14:00', end: '18:00' }
        ]
      };
      usingDefaults = true;
      console.log(`getAvailableSlots: Pas de disponibilité définie pour praticien ${practitionerId}, utilisation des horaires standards`);
    }

    const appointments = appointmentsStorage.getByPractitionerId(practitionerId)
      .filter(apt => apt.date === date && !['cancelled', 'no_show'].includes(apt.status));

    const slots = [];

    availability.timeSlots.forEach(slot => {
      const startTime = new Date(`${date}T${slot.start}`);
      const endTime = new Date(`${date}T${slot.end}`);

      let currentTime = new Date(startTime);

      while (currentTime < endTime) {
        const slotEnd = new Date(currentTime.getTime() + duration * 60000);

        if (slotEnd <= endTime) {
          // Vérifier s'il n'y a pas de conflit
          const hasConflict = appointments.some(apt => {
            const aptStart = new Date(`${date}T${apt.startTime}`);
            const aptEnd = new Date(`${date}T${apt.endTime}`);
            return (currentTime < aptEnd && slotEnd > aptStart);
          });

          if (!hasConflict) {
            slots.push({
              start: currentTime.toTimeString().slice(0, 5),
              end: slotEnd.toTimeString().slice(0, 5),
              available: true
            });
          }
        }

        currentTime = new Date(currentTime.getTime() + duration * 60000);
      }
    });

    return slots;
  },

  // Rechercher des rendez-vous
  search: (query, filters = {}) => {
    const appointments = appointmentsStorage.getAll().filter(a => !a.deleted);
    const searchTerm = query.toLowerCase();

    let filtered = appointments.filter(appointment => {
      // Recherche textuelle
      if (query) {
        const searchableText = [
          appointment.title,
          appointment.notes,
          appointment.type,
          appointment.reason
        ].join(' ').toLowerCase();

        if (!searchableText.includes(searchTerm)) {
          return false;
        }
      }

      // Filtres
      if (filters.patientId && appointment.patientId !== filters.patientId) return false;
      if (filters.practitionerId && appointment.practitionerId !== filters.practitionerId) return false;
      if (filters.status && appointment.status !== filters.status) return false;
      if (filters.type && appointment.type !== filters.type) return false;
      if (filters.priority && appointment.priority !== filters.priority) return false;

      if (filters.dateFrom) {
        if (new Date(appointment.date) < new Date(filters.dateFrom)) return false;
      }

      if (filters.dateTo) {
        if (new Date(appointment.date) > new Date(filters.dateTo)) return false;
      }

      return true;
    });

    return filtered;
  },

  // Obtenir les rendez-vous du jour
  getTodayAppointments: (practitionerId = null) => {
    const today = new Date().toISOString().split('T')[0];
    const appointments = appointmentsStorage.getAll();

    return appointments.filter(appointment => {
      if (appointment.deleted) return false;
      if (appointment.date !== today) return false;
      if (practitionerId && appointment.practitionerId !== practitionerId) return false;
      return true;
    }).sort((a, b) => a.startTime.localeCompare(b.startTime));
  },

  // Obtenir les rendez-vous de la semaine
  getWeekAppointments: (startDate, practitionerId = null) => {
    const appointments = appointmentsStorage.getAll();
    const start = new Date(startDate);
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

    return appointments.filter(appointment => {
      if (appointment.deleted) return false;
      const aptDate = new Date(appointment.date);
      if (aptDate < start || aptDate >= end) return false;
      if (practitionerId && appointment.practitionerId !== practitionerId) return false;
      return true;
    });
  },

  // Marquer un rappel comme envoyé - US 3.3
  markReminderSent: (appointmentId, reminderType, reminderTime) => {
    try {
      const appointments = appointmentsStorage.getAll();
      const index = appointments.findIndex(apt => apt.id === appointmentId);

      if (index !== -1) {
        const appointment = appointments[index];
        if (appointment.reminders) {
          const reminder = appointment.reminders.find(r =>
            r.type === reminderType && r.time === reminderTime
          );
          if (reminder) {
            reminder.sent = true;
            reminder.sentAt = new Date().toISOString();
          }
        }

        localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(appointments));
      }
    } catch (error) {
      console.error('Erreur marquage rappel:', error);
    }
  },

  // Obtenir les rappels à envoyer - US 3.3
  getPendingReminders: () => {
    const appointments = appointmentsStorage.getAll();
    const now = new Date();
    const pendingReminders = [];

    appointments.forEach(appointment => {
      if (appointment.deleted || ['cancelled', 'completed', 'no_show'].includes(appointment.status)) {
        return;
      }

      const appointmentDateTime = new Date(`${appointment.date}T${appointment.startTime}`);

      appointment.reminders?.forEach(reminder => {
        if (reminder.sent) return;

        let triggerTime;
        switch (reminder.time) {
          case '24h_before':
            triggerTime = new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000);
            break;
          case '2h_before':
            triggerTime = new Date(appointmentDateTime.getTime() - 2 * 60 * 60 * 1000);
            break;
          case '30m_before':
            triggerTime = new Date(appointmentDateTime.getTime() - 30 * 60 * 1000);
            break;
          default:
            return;
        }

        if (now >= triggerTime) {
          pendingReminders.push({
            appointmentId: appointment.id,
            appointment: appointment,
            reminder: reminder
          });
        }
      });
    });

    return pendingReminders;
  },

  // Supprimer un rendez-vous (soft delete)
  delete: (id, userId = 'system') => {
    try {
      const appointments = appointmentsStorage.getAll();
      const index = appointments.findIndex(appointment => appointment.id === id);

      if (index === -1) {
        throw new Error('Rendez-vous non trouvé');
      }

      appointments[index] = {
        ...appointments[index],
        deleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
        accessLog: [
          ...appointments[index].accessLog,
          {
            action: 'delete',
            userId: userId,
            timestamp: new Date().toISOString(),
            ipAddress: 'localhost'
          }
        ]
      };

      localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(appointments));
      return true;
    } catch (error) {
      console.error('Erreur suppression rendez-vous:', error);
      throw error;
    }
  },

  // Journaliser un accès
  logAccess: (appointmentId, action, userId = 'system', details = {}) => {
    try {
      const appointments = appointmentsStorage.getAll();
      const index = appointments.findIndex(appointment => appointment.id === appointmentId);

      if (index !== -1) {
        appointments[index].accessLog.push({
          action,
          userId,
          timestamp: new Date().toISOString(),
          ipAddress: 'localhost',
          details
        });

        localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(appointments));
      }
    } catch (error) {
      console.error('Erreur journalisation accès rendez-vous:', error);
    }
  },

  // Système de rappels et notifications - US 3.3
  getPendingReminders: () => {
    const now = new Date();
    const appointments = appointmentsStorage.getAll();
    const pendingReminders = [];

    appointments.forEach(appointment => {
      if (appointment.deleted || ['cancelled', 'completed', 'no_show'].includes(appointment.status)) {
        return;
      }

      const appointmentDateTime = new Date(`${appointment.date}T${appointment.startTime}`);

      // Vérifier les rappels patient
      if (appointment.reminders?.patient?.enabled) {
        const reminderTime = new Date(appointmentDateTime.getTime() - (appointment.reminders.patient.beforeMinutes * 60000));
        if (now >= reminderTime && now < appointmentDateTime) {
          const reminderKey = `patient_${appointment.id}_${appointment.reminders.patient.beforeMinutes}`;
          const lastSent = localStorage.getItem(`reminder_sent_${reminderKey}`);

          if (!lastSent || new Date(lastSent) < reminderTime) {
            pendingReminders.push({
              id: reminderKey,
              appointmentId: appointment.id,
              type: 'patient',
              recipientType: 'patient',
              patientName: appointment.patientName,
              practitionerName: appointment.practitionerName,
              appointmentDate: appointment.date,
              appointmentTime: appointment.startTime,
              title: appointment.title,
              beforeMinutes: appointment.reminders.patient.beforeMinutes,
              reminderTime: reminderTime,
              message: appointmentsStorage.generateReminderMessage('patient', appointment)
            });
          }
        }
      }

      // Vérifier les rappels praticien
      if (appointment.reminders?.practitioner?.enabled) {
        const reminderTime = new Date(appointmentDateTime.getTime() - (appointment.reminders.practitioner.beforeMinutes * 60000));
        if (now >= reminderTime && now < appointmentDateTime) {
          const reminderKey = `practitioner_${appointment.id}_${appointment.reminders.practitioner.beforeMinutes}`;
          const lastSent = localStorage.getItem(`reminder_sent_${reminderKey}`);

          if (!lastSent || new Date(lastSent) < reminderTime) {
            pendingReminders.push({
              id: reminderKey,
              appointmentId: appointment.id,
              type: 'practitioner',
              recipientType: 'practitioner',
              patientName: appointment.patientName,
              practitionerName: appointment.practitionerName,
              appointmentDate: appointment.date,
              appointmentTime: appointment.startTime,
              title: appointment.title,
              beforeMinutes: appointment.reminders.practitioner.beforeMinutes,
              reminderTime: reminderTime,
              message: appointmentsStorage.generateReminderMessage('practitioner', appointment)
            });
          }
        }
      }
    });

    return pendingReminders;
  },

  generateReminderMessage: (type, appointment) => {
    if (type === 'patient') {
      const timeText = appointmentsStorage.getTimeText(appointment.reminders.patient.beforeMinutes);
      return `Rappel: Vous avez un rendez-vous ${timeText} le ${new Date(appointment.date).toLocaleDateString('fr-FR')} à ${appointment.startTime} pour "${appointment.title}".`;
    } else {
      const timeText = appointmentsStorage.getTimeText(appointment.reminders.practitioner.beforeMinutes);
      return `Rappel: Rendez-vous ${timeText} avec ${appointment.patientName} le ${new Date(appointment.date).toLocaleDateString('fr-FR')} à ${appointment.startTime} pour "${appointment.title}".`;
    }
  },

  getTimeText: (minutes) => {
    if (minutes < 60) {
      return `dans ${minutes} minutes`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      return `dans ${hours} heure${hours > 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(minutes / 1440);
      return `dans ${days} jour${days > 1 ? 's' : ''}`;
    }
  },

  markReminderAsSent: (reminderId) => {
    localStorage.setItem(`reminder_sent_${reminderId}`, new Date().toISOString());
  },

  // Obtenir les rendez-vous nécessitant un suivi
  getFollowUpAppointments: () => {
    const appointments = appointmentsStorage.getAll();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return appointments.filter(appointment => {
      if (appointment.deleted) return false;

      const appointmentDate = new Date(appointment.date);

      // Rendez-vous non confirmés proches (dans les 24h)
      if (appointment.status === 'scheduled' && appointmentDate <= oneDayAgo) {
        return true;
      }

      // Rendez-vous marqués comme "no_show" récents (dans la semaine)
      if (appointment.status === 'no_show' && appointmentDate >= oneWeekAgo) {
        return true;
      }

      // Rendez-vous de suivi recommandés (follow-up après consultation)
      if (appointment.type === 'consultation' && appointment.status === 'completed') {
        const daysSinceAppointment = Math.floor((now - appointmentDate) / (1000 * 60 * 60 * 24));
        // Suggérer un suivi après 7-14 jours pour certains types de consultation
        if (daysSinceAppointment >= 7 && daysSinceAppointment <= 14) {
          return true;
        }
      }

      return false;
    });
  },

  // Générer un rapport de suivi des rendez-vous
  generateFollowUpReport: () => {
    const appointments = appointmentsStorage.getAll();
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const report = {
      totalAppointments: 0,
      completed: 0,
      cancelled: 0,
      noShow: 0,
      completionRate: 0,
      noShowRate: 0,
      avgDuration: 0,
      followUpNeeded: 0,
      upcoming: 0
    };

    const recentAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.date);
      return aptDate >= last30Days && !apt.deleted;
    });

    report.totalAppointments = recentAppointments.length;
    report.completed = recentAppointments.filter(apt => apt.status === 'completed').length;
    report.cancelled = recentAppointments.filter(apt => apt.status === 'cancelled').length;
    report.noShow = recentAppointments.filter(apt => apt.status === 'no_show').length;
    report.upcoming = recentAppointments.filter(apt => {
      const aptDate = new Date(apt.date);
      return aptDate > now && ['scheduled', 'confirmed'].includes(apt.status);
    }).length;

    if (report.totalAppointments > 0) {
      report.completionRate = Math.round((report.completed / report.totalAppointments) * 100);
      report.noShowRate = Math.round((report.noShow / report.totalAppointments) * 100);
    }

    const completedAppointments = recentAppointments.filter(apt => apt.status === 'completed');
    if (completedAppointments.length > 0) {
      const totalDuration = completedAppointments.reduce((sum, apt) => sum + (apt.duration || 30), 0);
      report.avgDuration = Math.round(totalDuration / completedAppointments.length);
    }

    report.followUpNeeded = appointmentsStorage.getFollowUpAppointments().length;

    return report;
  },

  // Obtenir les notifications en temps réel
  getRealTimeNotifications: () => {
    const notifications = [];
    const now = new Date();
    const in15Minutes = new Date(now.getTime() + 15 * 60 * 1000);
    const in30Minutes = new Date(now.getTime() + 30 * 60 * 1000);

    const appointments = appointmentsStorage.getAll();

    appointments.forEach(appointment => {
      if (appointment.deleted || !['confirmed', 'scheduled'].includes(appointment.status)) {
        return;
      }

      const appointmentDateTime = new Date(`${appointment.date}T${appointment.startTime}`);

      // Notifications pour les rendez-vous imminents
      if (appointmentDateTime >= now && appointmentDateTime <= in30Minutes) {
        const minutesUntil = Math.floor((appointmentDateTime - now) / (1000 * 60));

        notifications.push({
          id: `upcoming_${appointment.id}`,
          type: 'upcoming',
          level: minutesUntil <= 15 ? 'urgent' : 'warning',
          title: `Rendez-vous dans ${minutesUntil} minutes`,
          message: `${appointment.patientName} - ${appointment.title}`,
          appointmentId: appointment.id,
          time: appointmentDateTime
        });
      }

      // Notifications pour les retards
      if (appointmentDateTime < now && appointment.status === 'confirmed') {
        const minutesLate = Math.floor((now - appointmentDateTime) / (1000 * 60));

        if (minutesLate <= 30) { // Notifications de retard pendant 30 minutes max
          notifications.push({
            id: `late_${appointment.id}`,
            type: 'late',
            level: 'error',
            title: `Rendez-vous en retard de ${minutesLate} minutes`,
            message: `${appointment.patientName} - ${appointment.title}`,
            appointmentId: appointment.id,
            time: appointmentDateTime
          });
        }
      }
    });

    return notifications.sort((a, b) => a.time - b.time);
  },

  // Statistiques des rendez-vous
  getStatistics: (practitionerId = null) => {
    const appointments = appointmentsStorage.getAll().filter(a => !a.deleted);
    const filtered = practitionerId ?
      appointments.filter(a => a.practitionerId === practitionerId) :
      appointments;

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisWeek = new Date(now.getTime() - now.getDay() * 24 * 60 * 60 * 1000);

    return {
      total: filtered.length,
      today: filtered.filter(a => a.date === today).length,
      thisWeek: filtered.filter(a => new Date(a.date) >= thisWeek).length,
      thisMonth: filtered.filter(a => new Date(a.createdAt) >= thisMonth).length,
      byStatus: {
        scheduled: filtered.filter(a => a.status === 'scheduled').length,
        confirmed: filtered.filter(a => a.status === 'confirmed').length,
        completed: filtered.filter(a => a.status === 'completed').length,
        cancelled: filtered.filter(a => a.status === 'cancelled').length,
        no_show: filtered.filter(a => a.status === 'no_show').length
      },
      byType: {
        consultation: filtered.filter(a => a.type === 'consultation').length,
        follow_up: filtered.filter(a => a.type === 'follow_up').length,
        emergency: filtered.filter(a => a.type === 'emergency').length,
        specialist: filtered.filter(a => a.type === 'specialist').length
      },
      pendingReminders: appointmentsStorage.getPendingReminders().length
    };
  },

  // Récupérer la disponibilité d'un praticien pour une date
  // Note: Cette fonction fait un pont vers availabilityStorage qui est défini plus bas
  getPractitionerAvailability: (practitionerId, date) => {
    const availabilities = availabilityStorage.getAll();
    const dayOfWeek = new Date(date).getDay();

    return availabilities.find(avail =>
      avail.practitionerId === practitionerId &&
      avail.dayOfWeek === dayOfWeek &&
      !avail.deleted
    );
  }
};

// Gestion des disponibilités des praticiens - US 3.2
export const availabilityStorage = {
  // Récupérer toutes les disponibilités
  getAll: () => {
    try {
      const availability = localStorage.getItem(AVAILABILITY_STORAGE_KEY);
      return availability ? JSON.parse(availability) : [];
    } catch (error) {
      console.error('Erreur lecture disponibilités:', error);
      return [];
    }
  },

  // Récupérer la disponibilité d'un praticien pour une date
  getPractitionerAvailability: (practitionerId, date) => {
    const availabilities = availabilityStorage.getAll();
    const dayOfWeek = new Date(date).getDay();

    return availabilities.find(avail =>
      avail.practitionerId === practitionerId &&
      avail.dayOfWeek === dayOfWeek &&
      !avail.deleted
    );
  },

  // Créer/Mettre à jour la disponibilité
  setAvailability: (practitionerId, dayOfWeek, timeSlots, userId = 'system') => {
    try {
      const availabilities = availabilityStorage.getAll();
      const existingIndex = availabilities.findIndex(avail =>
        avail.practitionerId === practitionerId && avail.dayOfWeek === dayOfWeek
      );

      const availabilityData = {
        practitionerId,
        dayOfWeek,
        timeSlots, // [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }]
        updatedAt: new Date().toISOString(),
        updatedBy: userId
      };

      if (existingIndex >= 0) {
        availabilities[existingIndex] = {
          ...availabilities[existingIndex],
          ...availabilityData
        };
      } else {
        availabilities.push({
          id: `avail_${practitionerId}_${dayOfWeek}`,
          createdAt: new Date().toISOString(),
          createdBy: userId,
          ...availabilityData
        });
      }

      localStorage.setItem(AVAILABILITY_STORAGE_KEY, JSON.stringify(availabilities));
      return availabilityData;
    } catch (error) {
      console.error('Erreur sauvegarde disponibilité:', error);
      throw error;
    }
  }
};

// Fonction d'initialisation avec des données de démonstration
export const initializeSampleAppointments = () => {
  const existingAppointments = appointmentsStorage.getAll();
  if (existingAppointments.length === 0) {
    const sampleAppointments = [
      {
        patientId: 'demo_patient_1',
        practitionerId: 'demo_pract_002', // Dr. Carlos Garcia
        title: 'Consultation de routine',
        type: 'consultation',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Demain
        startTime: '09:00',
        endTime: '09:30',
        status: 'scheduled',
        priority: 'normal',
        reason: 'Contrôle régulier',
        notes: 'Patient en bonne santé générale',
        createdBy: 'demo'
      },
      {
        patientId: 'demo_patient_1',
        practitionerId: 'demo_pract_002', // Dr. Carlos Garcia
        title: 'Suivi diabète',
        type: 'follow_up',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Dans une semaine
        startTime: '10:00',
        endTime: '10:30',
        status: 'scheduled',
        priority: 'high',
        reason: 'Suivi diabète type 2',
        notes: 'Contrôle de la glycémie',
        createdBy: 'demo'
      }
    ];

    sampleAppointments.forEach(appointmentData => {
      try {
        appointmentsStorage.create(appointmentData, 'demo');
      } catch (error) {
        console.log('Rendez-vous démonstration déjà existant:', error.message);
      }
    });
  }

  // Initialiser quelques disponibilités de base
  const existingAvailabilities = availabilityStorage.getAll();
  if (existingAvailabilities.length === 0) {
    // Disponibilités des praticiens (Lundi à Vendredi)
    const practitioners = ['demo_pract_001', 'demo_pract_002', 'demo_pract_003'];
    for (const practitionerId of practitioners) {
      for (let day = 1; day <= 5; day++) {
        availabilityStorage.setAvailability(practitionerId, day, [
          { start: '08:00', end: '12:00' },
          { start: '14:00', end: '18:00' }
        ], 'demo');
      }
    }
  }
};

export default appointmentsStorage;