// components/calendar/AvailabilityManager.js
import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, Plus, Edit2, Trash2, Settings,
  ChevronLeft, ChevronRight, User, AlertCircle,
  Save, X, RotateCcw, Copy, CalendarDays, RefreshCw,
  CheckCircle, Zap, Sun, Moon
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { appointmentsStorage, availabilityStorage } from '../../utils/appointmentsStorage';
import { patientsStorage } from '../../utils/patientsStorage';
import { usePermissions } from '../auth/PermissionGuard';
import { PERMISSIONS } from '../../utils/permissionsStorage';
import { loadPractitioners } from '../../utils/practitionersLoader';
import PractitionerFilter from '../common/PractitionerFilter';

const AvailabilityManager = ({
  onAppointmentScheduled,
  onAppointmentUpdated,
  onAppointmentEdit,
  selectedPractitioner,
  canViewAllPractitioners = false,
  refreshKey = 0,
  filterPractitioner = 'all',
  onFilterPractitionerChange
}) => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();

  const isPractitioner = user?.role === 'doctor' || user?.role === 'nurse' || user?.role === 'practitioner';

  // Auto-filtrer pour les praticiens au chargement initial
  useEffect(() => {
    if (isPractitioner && user && filterPractitioner === 'all') {
      onFilterPractitionerChange?.(user.id);
    }
  }, [isPractitioner, user]);

  // Déterminer le praticien actif pour le filtrage
  const activePractitioner = selectedPractitioner ||
    (filterPractitioner !== 'all'
      ? { id: filterPractitioner }
      : user);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week'); // 'week', 'day'
  const [selectedDate, setSelectedDate] = useState(null);
  const [availabilities, setAvailabilities] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [isEditingAvailability, setIsEditingAvailability] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [practitioners, setPractitioners] = useState([]);

  // Configuration des créneaux par défaut
  const defaultAvailability = {
    monday: { enabled: true, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
    tuesday: { enabled: true, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
    wednesday: { enabled: true, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
    thursday: { enabled: true, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
    friday: { enabled: true, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '17:00' }] },
    saturday: { enabled: false, slots: [] },
    sunday: { enabled: false, slots: [] }
  };

  // Templates de disponibilité prédéfinis
  const availabilityTemplates = {
    standard: {
      name: 'Horaires standards',
      icon: Clock,
      description: 'Lun-Ven: 9h-12h, 14h-18h',
      config: {
        monday: { enabled: true, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
        tuesday: { enabled: true, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
        wednesday: { enabled: true, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
        thursday: { enabled: true, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
        friday: { enabled: true, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '17:00' }] },
        saturday: { enabled: false, slots: [] },
        sunday: { enabled: false, slots: [] }
      }
    },
    morning: {
      name: 'Matinées uniquement',
      icon: Sun,
      description: 'Lun-Ven: 8h-12h',
      config: {
        monday: { enabled: true, slots: [{ start: '08:00', end: '12:00' }] },
        tuesday: { enabled: true, slots: [{ start: '08:00', end: '12:00' }] },
        wednesday: { enabled: true, slots: [{ start: '08:00', end: '12:00' }] },
        thursday: { enabled: true, slots: [{ start: '08:00', end: '12:00' }] },
        friday: { enabled: true, slots: [{ start: '08:00', end: '12:00' }] },
        saturday: { enabled: false, slots: [] },
        sunday: { enabled: false, slots: [] }
      }
    },
    evening: {
      name: 'Après-midi/Soir',
      icon: Moon,
      description: 'Lun-Ven: 14h-20h',
      config: {
        monday: { enabled: true, slots: [{ start: '14:00', end: '20:00' }] },
        tuesday: { enabled: true, slots: [{ start: '14:00', end: '20:00' }] },
        wednesday: { enabled: true, slots: [{ start: '14:00', end: '20:00' }] },
        thursday: { enabled: true, slots: [{ start: '14:00', end: '20:00' }] },
        friday: { enabled: true, slots: [{ start: '14:00', end: '18:00' }] },
        saturday: { enabled: false, slots: [] },
        sunday: { enabled: false, slots: [] }
      }
    },
    intensive: {
      name: 'Horaires étendus',
      icon: Zap,
      description: 'Lun-Sam: 8h-20h',
      config: {
        monday: { enabled: true, slots: [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '20:00' }] },
        tuesday: { enabled: true, slots: [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '20:00' }] },
        wednesday: { enabled: true, slots: [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '20:00' }] },
        thursday: { enabled: true, slots: [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '20:00' }] },
        friday: { enabled: true, slots: [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '18:00' }] },
        saturday: { enabled: true, slots: [{ start: '09:00', end: '13:00' }] },
        sunday: { enabled: false, slots: [] }
      }
    }
  };

  const [weeklyAvailability, setWeeklyAvailability] = useState(defaultAvailability);

  // Charger les praticiens au démarrage
  useEffect(() => {
    const allPractitioners = loadPractitioners(user);
    setPractitioners(allPractitioners);
  }, [user]);

  // Charger les données
  useEffect(() => {
    loadData();
  }, [currentDate, selectedPractitioner, filterPractitioner, refreshKey]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Charger les praticiens
      const allPractitioners = loadPractitioners(user);

      // Charger les rendez-vous pour la période affichée
      const allAppointments = appointmentsStorage.getAll();

      // Filtrer par praticien selon les droits ET vérifier que le praticien existe
      const filteredAppointments = allAppointments.filter(apt => {
        // IMPORTANT: Vérifier que le praticien existe dans localStorage
        const practitionerExists = allPractitioners.some(p => p.id === apt.practitionerId);
        if (!practitionerExists) {
          console.warn(`Rendez-vous ${apt.id} ignoré: praticien ${apt.practitionerId} inexistant`);
          return false;
        }

        // Vérifier si le RDV est marqué comme supprimé
        if (apt.deleted) {
          console.debug(`Rendez-vous ${apt.id} ignoré: marqué comme supprimé`);
          return false;
        }

        // Utiliser le filtre du parent
        if (filterPractitioner !== 'all') {
          if (apt.practitionerId !== filterPractitioner) {
            console.debug(`Rendez-vous ${apt.id} ignoré: praticien ${apt.practitionerId} ne correspond pas au filtre ${filterPractitioner}`);
            return false;
          }
        } else if (isPractitioner && user) {
          // Praticien sans filtre = seulement ses RDV
          if (apt.practitionerId !== user.id) {
            console.debug(`Rendez-vous ${apt.id} ignoré: appartient au praticien ${apt.practitionerId}, pas à ${user.id}`);
            return false;
          }
        }

        return true;
      });

      setAppointments(filteredAppointments);
      console.log(`[AvailabilityManager] Chargement des RDV: ${allAppointments.length} total, ${filteredAppointments.length} après filtrage`);
      console.log('[AvailabilityManager] RDV filtrés:', filteredAppointments.map(a => ({ id: a.id, patient: a.patientId, praticien: a.practitionerId, date: a.date, deleted: a.deleted })));

      // Charger les disponibilités personnalisées (simulation)
      // Dans une vraie app, cela viendrait de la base de données
      loadAvailabilities();
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailabilities = () => {
    try {
      const practitionerId = selectedPractitioner?.id || user?.id;
      if (!practitionerId) {
        setWeeklyAvailability(defaultAvailability);
        return;
      }

      // Charger les disponibilités pour chaque jour de la semaine
      const weekAvailability = { ...defaultAvailability };
      const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

      dayNames.forEach((dayName, index) => {
        const dayOfWeek = index + 1; // 1 = Monday, 7 = Sunday
        const availability = availabilityStorage.getPractitionerAvailability(practitionerId, dayOfWeek);

        if (availability) {
          weekAvailability[dayName] = {
            enabled: true,
            slots: availability.timeSlots || []
          };
        }
      });

      setWeeklyAvailability(weekAvailability);
    } catch (error) {
      console.error('Erreur lors du chargement des disponibilités:', error);
      setWeeklyAvailability(defaultAvailability);
    }
  };

  const saveAvailabilities = () => {
    try {
      const practitionerId = selectedPractitioner?.id || user?.id;
      if (!practitionerId) {
        console.error('Aucun praticien sélectionné pour sauvegarder les disponibilités');
        return;
      }

      const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

      dayNames.forEach((dayName, index) => {
        const dayOfWeek = index + 1; // 1 = Monday, 7 = Sunday
        const dayConfig = weeklyAvailability[dayName];

        if (dayConfig?.enabled && dayConfig.slots?.length > 0) {
          availabilityStorage.setAvailability(
            practitionerId,
            dayOfWeek,
            dayConfig.slots,
            user?.id || 'system'
          );
        }
      });

      // Also keep localStorage backup for compatibility
      localStorage.setItem(`availability_${practitionerId}`, JSON.stringify(weeklyAvailability));

      console.log('Disponibilités sauvegardées avec succès');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des disponibilités:', error);
    }
  };

  // Navigation dans le calendrier
  const navigateWeek = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction * 7));
    setCurrentDate(newDate);
  };

  const navigateDay = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + direction);
    setCurrentDate(newDate);
  };

  // Obtenir les jours de la semaine
  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    const dayOfWeek = startOfWeek.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startOfWeek.setDate(startOfWeek.getDate() + mondayOffset);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getDayName = (date) => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  };

  const getDayNameFr = (date) => {
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return days[date.getDay()];
  };

  // Obtenir les créneaux disponibles pour une date
  const getAvailableSlotsForDate = (date) => {
    const dayName = getDayName(date);
    const dayAvailability = weeklyAvailability[dayName];

    if (!dayAvailability?.enabled) return [];

    const slots = [];
    const dateStr = date.toISOString().split('T')[0];

    dayAvailability.slots.forEach(slot => {
      const slotStart = new Date(`${dateStr}T${slot.start}`);
      const slotEnd = new Date(`${dateStr}T${slot.end}`);

      // Générer des créneaux de 30 minutes
      let currentTime = new Date(slotStart);
      while (currentTime < slotEnd) {
        const nextTime = new Date(currentTime.getTime() + 30 * 60000);
        if (nextTime <= slotEnd) {
          const startTime = currentTime.toTimeString().slice(0, 5);
          const endTime = nextTime.toTimeString().slice(0, 5);

          // Vérifier s'il y a un conflit avec un rendez-vous existant
          const hasConflict = appointments.some(apt => {
            if (apt.date !== dateStr) return false;
            const aptStart = new Date(`${dateStr}T${apt.startTime}`);
            const aptEnd = new Date(`${dateStr}T${apt.endTime}`);
            return (currentTime < aptEnd && nextTime > aptStart);
          });

          slots.push({
            start: startTime,
            end: endTime,
            available: !hasConflict,
            conflict: hasConflict
          });
        }
        currentTime = nextTime;
      }
    });

    return slots;
  };

  // Obtenir les rendez-vous pour une date avec enrichissement des données
  const getAppointmentsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    const dayAppointments = appointments.filter(apt => apt.date === dateStr);

    // Enrichir les rendez-vous avec les données des patients selon les permissions
    return dayAppointments.map(appointment => {
      const patient = patientsStorage.getById(appointment.patientId);
      const enrichedAppointment = { ...appointment };

      // Rôles de l'utilisateur
      const isAdminClinic = user?.role === 'clinic_admin';
      const isSecretary = user?.role === 'secretary';
      const isPractitioner = user?.role === 'doctor' || user?.role === 'nurse' || user?.role === 'practitioner';
      const isOwnAppointment = appointment.practitionerId === user?.id;

      // Les admins clinique et secrétaires DOIVENT voir toutes les données (pas de masquage)
      // Les praticiens voient les données de leurs propres RDV
      // Les autres rôles verront "Rendez-vous masqué"
      const shouldShowPatientDetails = isAdminClinic || isSecretary || isOwnAppointment || isPractitioner;

      if (shouldShowPatientDetails) {
        if (patient) {
          enrichedAppointment.patientName = `${patient.firstName} ${patient.lastName}`;
          enrichedAppointment.patientPhone = patient.phone;
          enrichedAppointment.patientAge = calculateAge(patient.birthDate);
          enrichedAppointment.patientNumber = patient.patientNumber;
        } else {
          // Patient non trouvé
          console.warn(`[getAppointmentsForDate] Patient ${appointment.patientId} non trouvé pour RDV ${appointment.id}`);
          enrichedAppointment.patientName = 'Patient inconnu';
        }
      } else {
        // Masquer les détails si pas autorisé (rôle utilisateur rare, ex: super_admin externe)
        console.debug(`[getAppointmentsForDate] RDV ${appointment.id} masqué: role=${user?.role}, own=${isOwnAppointment}`);
        enrichedAppointment.patientName = 'Rendez-vous masqué';
        enrichedAppointment.title = 'RDV privé';
        enrichedAppointment.description = '';
      }

      return enrichedAppointment;
    });
  };

  // Calculer l'âge à partir de la date de naissance
  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  };

  // Obtenir la couleur d'un rendez-vous selon son statut
  const getAppointmentColor = (status) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 border border-blue-300';
      case 'confirmed': return 'bg-green-100 text-green-800 border border-green-300';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
      case 'completed': return 'bg-gray-100 text-gray-700 border border-gray-300';
      case 'cancelled': return 'bg-red-100 text-red-800 border border-red-300';
      case 'no_show': return 'bg-orange-100 text-orange-800 border border-orange-300';
      default: return 'bg-blue-100 text-blue-800 border border-blue-300';
    }
  };

  // Obtenir le tooltip d'un rendez-vous
  const getAppointmentTooltip = (appointment) => {
    if (appointment.title === 'RDV privé') {
      return 'Rendez-vous privé - Accès restreint';
    }

    const parts = [];
    if (appointment.patientName) parts.push(`Patient: ${appointment.patientName}`);
    if (appointment.title) parts.push(`Type: ${appointment.title}`);
    if (appointment.startTime && appointment.endTime) {
      parts.push(`Horaire: ${appointment.startTime} - ${appointment.endTime}`);
      // Ajouter les créneaux supplémentaires s'ils existent
      if (appointment.additionalSlots && appointment.additionalSlots.length > 0) {
        const additionalTimes = appointment.additionalSlots.map(s => `${s.start} - ${s.end}`).join(', ');
        parts.push(`Créneaux supplémentaires: ${additionalTimes}`);
      }
    }
    if (appointment.duration) parts.push(`Durée: ${appointment.duration}min`);
    if (appointment.description) parts.push(`Description: ${appointment.description}`);

    const statusLabels = {
      'scheduled': 'Programmé',
      'confirmed': 'Confirmé',
      'in_progress': 'En cours',
      'completed': 'Terminé',
      'cancelled': 'Annulé',
      'no_show': 'Absent'
    };

    if (appointment.status) {
      parts.push(`Statut: ${statusLabels[appointment.status] || appointment.status}`);
    }

    return parts.join('\n');
  };

  // Gérer le clic sur un rendez-vous
  const handleAppointmentClick = (appointment) => {
    // Afficher plus de détails ou permettre l'édition selon les permissions
    const canEdit = hasPermission(PERMISSIONS.APPOINTMENTS_EDIT);
    const isOwnAppointment = appointment.practitionerId === user?.id;
    const isAdminClinic = user?.role === 'clinic_admin';
    const isSecretary = user?.role === 'secretary';
    const isPractitioner = user?.role === 'doctor' || user?.role === 'nurse' || user?.role === 'practitioner';

    // Permettre l'édition si:
    // - L'utilisateur a la permission APPOINTMENTS_EDIT
    // - C'est son propre rendez-vous (le praticien peut toujours éditer ses propres RDV)
    // - L'utilisateur est admin clinique
    // - L'utilisateur est secrétaire
    // - L'utilisateur est un praticien (médecin) - les médecins peuvent éditer les RDV affichés dans leur vue
    const canEditAppointment = canEdit || isOwnAppointment || isAdminClinic || isSecretary || isPractitioner;

    if (canEditAppointment) {
      // Ouvrir le modal d'édition
      if (onAppointmentEdit) {
        onAppointmentEdit(appointment);
      } else {
        console.log('Édition du rendez-vous:', appointment);
      }
    } else {
      console.log('Consultation du rendez-vous:', appointment);
      // onAppointmentView && onAppointmentView(appointment);
    }
  };

  // Obtenir la couleur du badge de statut
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-700';
      case 'confirmed': return 'bg-green-100 text-green-700';
      case 'in_progress': return 'bg-yellow-100 text-yellow-700';
      case 'completed': return 'bg-gray-100 text-gray-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      case 'no_show': return 'bg-orange-100 text-orange-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  // Obtenir le libellé du statut
  const getStatusLabel = (status) => {
    switch (status) {
      case 'scheduled': return 'Programmé';
      case 'confirmed': return 'Confirmé';
      case 'in_progress': return 'En cours';
      case 'completed': return 'Terminé';
      case 'cancelled': return 'Annulé';
      case 'no_show': return 'Absent';
      default: return status;
    }
  };

  // Modifier les disponibilités
  const updateDayAvailability = (dayName, enabled) => {
    setWeeklyAvailability(prev => ({
      ...prev,
      [dayName]: {
        ...prev[dayName],
        enabled
      }
    }));
  };

  const addTimeSlot = (dayName) => {
    setWeeklyAvailability(prev => ({
      ...prev,
      [dayName]: {
        ...prev[dayName],
        slots: [...prev[dayName].slots, { start: '09:00', end: '10:00' }]
      }
    }));
  };

  const updateTimeSlot = (dayName, slotIndex, field, value) => {
    setWeeklyAvailability(prev => ({
      ...prev,
      [dayName]: {
        ...prev[dayName],
        slots: prev[dayName].slots.map((slot, index) =>
          index === slotIndex ? { ...slot, [field]: value } : slot
        )
      }
    }));
  };

  const removeTimeSlot = (dayName, slotIndex) => {
    setWeeklyAvailability(prev => ({
      ...prev,
      [dayName]: {
        ...prev[dayName],
        slots: prev[dayName].slots.filter((_, index) => index !== slotIndex)
      }
    }));
  };

  const resetToDefault = () => {
    if (window.confirm('Êtes-vous sûr de vouloir réinitialiser aux disponibilités par défaut ?')) {
      setWeeklyAvailability(defaultAvailability);
    }
  };

  const copyWeekTemplate = (sourceDayName) => {
    const sourceDay = weeklyAvailability[sourceDayName];
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    const newAvailability = { ...weeklyAvailability };
    dayNames.forEach(dayName => {
      if (dayName !== sourceDayName) {
        newAvailability[dayName] = {
          enabled: sourceDay.enabled,
          slots: [...sourceDay.slots]
        };
      }
    });

    setWeeklyAvailability(newAvailability);
  };

  const applyTemplate = (templateKey) => {
    if (window.confirm(`Êtes-vous sûr de vouloir appliquer le template "${availabilityTemplates[templateKey].name}" ? Cela remplacera votre configuration actuelle.`)) {
      setWeeklyAvailability(availabilityTemplates[templateKey].config);
    }
  };

  const timeSlots = [];
  for (let hour = 8; hour < 20; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des disponibilités...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtres et actions - sur une seule ligne */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtre de praticiens compact intégré */}
          <PractitionerFilter
            practitioners={practitioners}
            selectedPractitionerId={filterPractitioner}
            onPractitionerChange={onFilterPractitionerChange}
            canViewAll={canViewAllPractitioners}
            isPractitioner={isPractitioner}
            currentUser={user}
          />

          <button
            onClick={() => setIsEditingAvailability(!isEditingAvailability)}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors ${
              isEditingAvailability ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">{isEditingAvailability ? 'Terminer' : 'Modifier'}</span>
          </button>
        </div>
        <div className="flex items-center bg-gray-100 rounded-lg">
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-2 text-sm rounded-lg transition-colors ${
              viewMode === 'week' ? 'bg-white shadow-sm' : ''
            }`}
          >
            Semaine
          </button>
          <button
            onClick={() => setViewMode('day')}
            className={`px-3 py-2 text-sm rounded-lg transition-colors ${
              viewMode === 'day' ? 'bg-white shadow-sm' : ''
            }`}
          >
            Jour
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border p-4">
        <button
          onClick={() => viewMode === 'week' ? navigateWeek(-1) : navigateDay(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            {viewMode === 'week' ? (
              `Semaine du ${getWeekDays()[0].toLocaleDateString('fr-FR')} au ${getWeekDays()[6].toLocaleDateString('fr-FR')}`
            ) : (
              currentDate.toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })
            )}
          </h3>
        </div>

        <button
          onClick={() => viewMode === 'week' ? navigateWeek(1) : navigateDay(1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Configuration des disponibilités */}
      {isEditingAvailability && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Configuration des disponibilités</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={resetToDefault}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors flex items-center space-x-1"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Réinitialiser</span>
              </button>
              <button
                onClick={saveAvailabilities}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>Sauvegarder</span>
              </button>
            </div>
          </div>

          {/* Templates prédéfinis */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Templates prédéfinis</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.entries(availabilityTemplates).map(([key, template]) => {
                const IconComponent = template.icon;
                return (
                  <button
                    key={key}
                    onClick={() => applyTemplate(key)}
                    className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <IconComponent className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-sm text-gray-900">{template.name}</span>
                    </div>
                    <p className="text-xs text-gray-600">{template.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            {Object.entries(weeklyAvailability).map(([dayName, dayConfig]) => {
              const dayNameFr = {
                monday: 'Lundi',
                tuesday: 'Mardi',
                wednesday: 'Mercredi',
                thursday: 'Jeudi',
                friday: 'Vendredi',
                saturday: 'Samedi',
                sunday: 'Dimanche'
              }[dayName];

              return (
                <div key={dayName} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={dayConfig.enabled}
                        onChange={(e) => updateDayAvailability(dayName, e.target.checked)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <h4 className="font-medium text-gray-900">{dayNameFr}</h4>
                    </div>
                    {dayConfig.enabled && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => copyWeekTemplate(dayName)}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Copier vers tous les jours de semaine"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => addTimeSlot(dayName)}
                          className="p-1 text-blue-600 hover:text-blue-700 transition-colors"
                          title="Ajouter un créneau"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {dayConfig.enabled && (
                    <div className="space-y-2">
                      {dayConfig.slots.map((slot, slotIndex) => (
                        <div key={slotIndex} className="flex items-center space-x-2">
                          <select
                            value={slot.start}
                            onChange={(e) => updateTimeSlot(dayName, slotIndex, 'start', e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded text-sm"
                          >
                            {timeSlots.map(time => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>
                          <span className="text-gray-500">à</span>
                          <select
                            value={slot.end}
                            onChange={(e) => updateTimeSlot(dayName, slotIndex, 'end', e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded text-sm"
                          >
                            {timeSlots.map(time => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => removeTimeSlot(dayName, slotIndex)}
                            className="p-1 text-red-600 hover:text-red-700 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Vue calendrier */}
      {viewMode === 'week' ? (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="grid grid-cols-8 border-b border-gray-200">
            <div className="p-4 text-sm font-medium text-gray-500">Heure</div>
            {getWeekDays().map((day, index) => {
              const isToday = day.toDateString() === new Date().toDateString();
              const appointmentsCount = getAppointmentsForDate(day).length;
              const availableSlotsCount = getAvailableSlotsForDate(day).filter(slot => slot.available).length;

              return (
                <div key={index} className={`p-4 text-center border-l border-gray-200 ${isToday ? 'bg-blue-50' : ''}`}>
                  <div className="font-medium text-gray-900">{getDayNameFr(day)}</div>
                  <div className={`text-2xl font-bold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                    {day.getDate()}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {appointmentsCount} RDV / {availableSlotsCount} libres
                  </div>
                </div>
              );
            })}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {timeSlots.slice(0, 24).map((time, timeIndex) => (
              <div key={timeIndex} className="grid grid-cols-8 border-b border-gray-100">
                <div className="p-2 text-xs text-gray-500 border-r border-gray-200 bg-gray-50">
                  {time}
                </div>
                {getWeekDays().map((day, dayIndex) => {
                  const daySlots = getAvailableSlotsForDate(day);
                  const timeSlot = daySlots.find(slot => slot.start === time);
                  const dayAppointments = getAppointmentsForDate(day);
                  // IMPORTANT: Vérifier que l'appointment chevauche ce créneau horaire, pas juste commencer à cette heure
                  const appointmentAtTime = dayAppointments.find(apt => {
                    const apptStart = new Date(`${day}T${apt.startTime}`);
                    const apptEnd = new Date(`${day}T${apt.endTime}`);
                    const slotStart = new Date(`${day}T${time}`);
                    const slotEnd = new Date(`${day}T${daySlots.find(s => s.start === time)?.end || time}`);
                    return apptStart <= slotStart && apptEnd > slotStart;
                  });

                  return (
                    <div key={dayIndex} className="p-1 border-l border-gray-200 h-12 relative">
                      {appointmentAtTime ? (
                        <div
                          className={`text-xs p-1 rounded truncate h-full cursor-pointer transition-colors ${
                            appointmentAtTime.title === 'RDV privé'
                              ? 'bg-gray-100 text-gray-600 border border-gray-300'
                              : getAppointmentColor(appointmentAtTime.status)
                          }`}
                          title={getAppointmentTooltip(appointmentAtTime)}
                          onClick={() => handleAppointmentClick(appointmentAtTime)}
                        >
                          <div className="font-medium truncate">
                            {appointmentAtTime.patientName || appointmentAtTime.title}
                          </div>
                          {appointmentAtTime.patientName && appointmentAtTime.patientName !== 'Rendez-vous masqué' && (
                            <div className="text-xs opacity-75 truncate">
                              {appointmentAtTime.startTime} - {appointmentAtTime.endTime}
                            </div>
                          )}
                        </div>
                      ) : timeSlot ? (
                        <div
                          className={`h-full rounded cursor-pointer transition-colors ${
                            timeSlot.available
                              ? 'bg-green-100 hover:bg-green-200 border border-green-300'
                              : 'bg-red-100 border border-red-300'
                          }`}
                          onClick={() => timeSlot.available && onAppointmentScheduled?.(day, time)}
                          title={!timeSlot.available && appointmentAtTime ? getAppointmentTooltip(appointmentAtTime) : ''}
                        >
                          {timeSlot.available ? (
                            <div className="text-xs text-green-700 p-1">Libre</div>
                          ) : appointmentAtTime ? (
                            // Afficher les données du RDV si un appointment occupe le créneau
                            <div className="text-xs p-1">
                              <div className="font-medium truncate text-gray-900">
                                {appointmentAtTime.patientName || 'RDV'}
                              </div>
                              <div className="text-gray-600 truncate">
                                {appointmentAtTime.startTime} - {appointmentAtTime.endTime}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-red-600 p-1">Occupé</div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-gray-100 h-full rounded"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Vue jour
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">
              Créneaux pour le {currentDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {getAvailableSlotsForDate(currentDate).map((slot, index) => {
                const dayAppointments = getAppointmentsForDate(currentDate);
                // IMPORTANT: Vérifier que l'appointment chevauche ce créneau horaire, pas juste commencer à cette heure
                const appointmentAtTime = dayAppointments.find(apt => {
                  const apptStart = new Date(`${currentDate.toISOString().split('T')[0]}T${apt.startTime}`);
                  const apptEnd = new Date(`${currentDate.toISOString().split('T')[0]}T${apt.endTime}`);
                  const slotStart = new Date(`${currentDate.toISOString().split('T')[0]}T${slot.start}`);
                  const slotEnd = new Date(`${currentDate.toISOString().split('T')[0]}T${slot.end}`);
                  return apptStart <= slotStart && apptEnd > slotStart;
                });

                return (
                  <div
                    key={index}
                    className={`p-3 border rounded-lg transition-colors ${
                      appointmentAtTime
                        ? appointmentAtTime.title === 'RDV privé'
                          ? 'bg-gray-50 border-gray-200 cursor-default'
                          : `cursor-pointer ${getAppointmentColor(appointmentAtTime.status).replace('border border-', 'border-')}`
                        : slot.available
                          ? 'bg-green-50 border-green-200 hover:bg-green-100 cursor-pointer'
                          : 'bg-red-50 border-red-200 cursor-default'
                    }`}
                    title={appointmentAtTime ? getAppointmentTooltip(appointmentAtTime) : ''}
                    onClick={() => {
                      if (appointmentAtTime) {
                        handleAppointmentClick(appointmentAtTime);
                      } else if (slot.available) {
                        onAppointmentScheduled?.(currentDate, slot.start);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-600" />
                        <span className="font-medium">{slot.start} - {slot.end}</span>
                      </div>
                      {appointmentAtTime ? (
                        <span className={`text-xs px-2 py-1 rounded ${
                          appointmentAtTime.title === 'RDV privé'
                            ? 'bg-gray-100 text-gray-600'
                            : getStatusBadgeColor(appointmentAtTime.status)
                        }`}>
                          {getStatusLabel(appointmentAtTime.status)}
                        </span>
                      ) : slot.available ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          Libre
                        </span>
                      ) : (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                          Indisponible
                        </span>
                      )}
                    </div>
                    {appointmentAtTime && appointmentAtTime.title !== 'RDV privé' && (
                      <div className="mt-2 text-sm">
                        <div className="font-medium text-gray-900 truncate">
                          {appointmentAtTime.patientName}
                        </div>
                        <div className="text-xs text-gray-600 truncate">
                          {appointmentAtTime.title}
                        </div>
                        {appointmentAtTime.description && (
                          <div className="text-xs text-gray-500 mt-1 truncate">
                            {appointmentAtTime.description}
                          </div>
                        )}
                      </div>
                    )}
                    {appointmentAtTime && appointmentAtTime.title === 'RDV privé' && (
                      <div className="mt-2 text-sm text-gray-500">
                        <div className="text-xs">Accès restreint</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Légende */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h3 className="font-medium text-gray-900 mb-3">Légende</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
            <span>Créneau libre</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
            <span>Rendez-vous programmé</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
            <span>Créneau occupé</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
            <span>Non disponible</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityManager;