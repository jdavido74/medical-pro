// components/calendar/AvailabilityManager.js
import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, Plus, Edit2, Trash2, Settings,
  ChevronLeft, ChevronRight, User, AlertCircle,
  Save, X, RotateCcw, Copy, CalendarDays, RefreshCw,
  CheckCircle, Zap, Sun, Moon, Ban
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { availabilityStorage } from '../../utils/appointmentsStorage';
import { patientsStorage } from '../../utils/patientsStorage';
import { usePermissions } from '../auth/PermissionGuard';
import { PERMISSIONS } from '../../utils/permissionsStorage';
import { loadPractitioners } from '../../utils/practitionersLoader';
import { isPractitionerRole } from '../../utils/userRoles';
import PractitionerFilter from '../common/PractitionerFilter';
import {
  enrichAppointmentWithPermissions,
  filterAppointmentsByPermissions,
  shouldShowPractitionerFilter
} from '../../utils/appointmentPermissions';
import { useLocale } from '../../contexts/LocaleContext';
import { clinicSettingsApi } from '../../api/clinicSettingsApi';
import { useTranslation } from 'react-i18next';

const AvailabilityManager = ({
  onAppointmentScheduled,
  onAppointmentUpdated,
  onAppointmentEdit,
  selectedPractitioner,
  canViewAllPractitioners = false,
  refreshKey = 0,
  filterPractitioner = 'all',
  onFilterPractitionerChange,
  contextAppointments = [] // Rendez-vous depuis AppointmentContext (API)
}) => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { locale } = useLocale();
  const { t } = useTranslation();

  const isPractitioner = isPractitionerRole(user?.role);

  // État pour les paramètres de la clinique (horaires d'ouverture, jours fermés)
  const [clinicSettings, setClinicSettings] = useState(null);

  // Mapping des jours pour vérifier les fermetures de la clinique
  const DAY_NAMES_MAP = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  // Vérifier si un jour est fermé par la clinique
  const isClinicClosedOnDay = (date) => {
    if (!clinicSettings || !date) return false;

    const dayName = DAY_NAMES_MAP[date.getDay()];
    const dateStr = date.toISOString().split('T')[0];

    // Vérifier les jours de fermeture récurrents (operating_hours)
    if (clinicSettings.operatingHours) {
      const dayConfig = clinicSettings.operatingHours[dayName];
      if (dayConfig && dayConfig.enabled === false) {
        return true;
      }
    }

    // Vérifier les dates de fermeture exceptionnelles (holidays, etc.)
    if (clinicSettings.closedDates && Array.isArray(clinicSettings.closedDates)) {
      const isClosedDate = clinicSettings.closedDates.some(cd => {
        const closedDateStr = typeof cd.date === 'string' ? cd.date.split('T')[0] : cd.date;
        return closedDateStr === dateStr;
      });
      if (isClosedDate) return true;
    }

    return false;
  };

  // Vérifier si un jour de la semaine est fermé (pour la configuration)
  const isClinicClosedOnDayName = (dayName) => {
    if (!clinicSettings?.operatingHours) return false;
    const dayConfig = clinicSettings.operatingHours[dayName];
    return dayConfig && dayConfig.enabled === false;
  };

  // Charger les paramètres de la clinique
  useEffect(() => {
    const fetchClinicSettings = async () => {
      try {
        const settings = await clinicSettingsApi.getClinicSettings();
        setClinicSettings(settings);
      } catch (error) {
        console.error('[AvailabilityManager] Error loading clinic settings:', error);
      }
    };
    fetchClinicSettings();
  }, []);

  // Auto-filtrer pour les praticiens au chargement initial
  // Utiliser providerId (healthcare_provider.id) et non user.id (central user id)
  useEffect(() => {
    if (isPractitioner && user?.providerId && filterPractitioner === 'all') {
      onFilterPractitionerChange?.(user.providerId);
    }
  }, [isPractitioner, user?.providerId]);

  // Déterminer le praticien actif pour le filtrage
  const activePractitioner = selectedPractitioner ||
    (filterPractitioner !== 'all'
      ? { id: filterPractitioner }
      : user);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week'); // 'week', 'day'
  const [selectedDate, setSelectedDate] = useState(null);
  const [availabilities, setAvailabilities] = useState([]);
  const [appointments, setAppointments] = useState([]); // RDV filtrés selon les permissions
  const [allAppointments, setAllAppointments] = useState([]); // Tous les RDV (pour les conflits)
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

  // Charger les données - recharger quand les RDV du contexte changent
  useEffect(() => {
    loadData();
  }, [currentDate, selectedPractitioner, filterPractitioner, refreshKey, contextAppointments]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Charger les praticiens
      const allPractitioners = loadPractitioners(user);

      // Utiliser les rendez-vous du contexte (API) au lieu du localStorage
      let validAppointments = [...contextAppointments];

      if (process.env.NODE_ENV === 'development') {
        console.log('[AvailabilityManager] Appointments from context:', {
          count: validAppointments.length,
          firstAppointment: validAppointments[0],
          hasIds: validAppointments.every(apt => !!apt.id)
        });
      }

      // Filtrer les RDV supprimés
      validAppointments = validAppointments.filter(apt => !apt.deleted);

      // Filtrer les RDV avec des praticiens inexistants
      validAppointments = validAppointments.filter(apt => {
        const practitionerExists = allPractitioners.some(p => p.id === apt.practitionerId);
        if (!practitionerExists) {
          console.warn(`Rendez-vous ${apt.id} ignoré: praticien ${apt.practitionerId} inexistant`);
        }
        return practitionerExists;
      });

      // FILTRER selon les permissions: voir tous les RDV ou seulement les siens
      let filteredByPermissions = filterAppointmentsByPermissions(validAppointments, user, hasPermission);

      // FILTRER par praticien spécifique si un filtre est appliqué
      if (filterPractitioner !== 'all') {
        filteredByPermissions = filteredByPermissions.filter(apt => apt.practitionerId === filterPractitioner);
      }

      // SAUVEGARDER les RDV filtrés pour les vérifications de conflits
      // Cela garantit qu'un praticien ne voit les créneaux occupés que pour ses propres RDV
      setAllAppointments(filteredByPermissions);

      // Charger les patients pour l'enrichissement
      const allPatients = patientsStorage.getAll();

      // ENRICHIR les RDV avec les données patient et praticien en respectant les permissions
      const enrichedAppointments = filteredByPermissions.map(appointment => {
        const patient = allPatients.find(p => p.id === appointment.patientId);
        const practitioner = allPractitioners.find(p => p.id === appointment.practitionerId);
        const enriched = enrichAppointmentWithPermissions(appointment, patient, practitioner, user, hasPermission);

        // Vérifier que l'ID est préservé
        if (!enriched.id && process.env.NODE_ENV === 'development') {
          console.error('[AvailabilityManager] Enriched appointment missing ID:', {
            originalId: appointment.id,
            enrichedId: enriched.id,
            appointment,
            enriched
          });
        }

        return enriched;
      });

      setAppointments(enrichedAppointments);
      console.log(`[AvailabilityManager] Chargement des RDV: ${validAppointments.length} valides, ${filteredByPermissions.length} après permissions`);

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

          // IMPORTANT: Vérifier s'il y a un conflit avec TOUS les rendez-vous (pas juste les visibles)
          // Cela permet de voir "Occupé" même pour les RDV que l'utilisateur ne peut pas voir
          const hasConflict = allAppointments.some(apt => {
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

  // Obtenir les rendez-vous pour une date
  // NOTE: Les RDV sont déjà enrichis avec patientName, practitionerName, etc. dans loadData()
  // Les RDV sont également déjà filtrés selon les permissions de l'utilisateur
  const getAppointmentsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return appointments.filter(apt => apt.date === dateStr);
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
    // Afficher le praticien si l'utilisateur a la permission
    if (hasPermission(PERMISSIONS.APPOINTMENTS_VIEW_PRACTITIONER) && appointment.practitionerName) {
      let practitionerInfo = `Praticien: ${appointment.practitionerName}`;
      if (appointment.practitionerSpecialty) {
        practitionerInfo += ` (${appointment.practitionerSpecialty})`;
      }
      parts.push(practitionerInfo);
    }
    if (appointment.title || appointment.patientName) parts.push(`Type: ${appointment.title || appointment.patientName}`);
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
    // Utiliser la permission APPOINTMENTS_EDIT pour permettre l'édition
    const canEdit = hasPermission(PERMISSIONS.APPOINTMENTS_EDIT);

    if (canEdit) {
      // Ouvrir le modal d'édition
      if (onAppointmentEdit) {
        onAppointmentEdit(appointment);
      } else {
        console.log('Édition du rendez-vous:', appointment);
      }
    } else {
      console.debug('Utilisateur n\'a pas les permissions pour éditer ce rendez-vous');
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
              `Semaine du ${getWeekDays()[0].toLocaleDateString(locale)} au ${getWeekDays()[6].toLocaleDateString(locale)}`
            ) : (
              currentDate.toLocaleDateString(locale, {
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

              const isClinicClosed = isClinicClosedOnDayName(dayName);

              return (
                <div key={dayName} className={`border rounded-lg p-4 ${
                  isClinicClosed ? 'border-gray-300 bg-gray-100 opacity-75' : 'border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={dayConfig.enabled}
                        onChange={(e) => updateDayAvailability(dayName, e.target.checked)}
                        className="w-4 h-4 text-blue-600"
                        disabled={isClinicClosed}
                      />
                      <h4 className={`font-medium ${isClinicClosed ? 'text-gray-500' : 'text-gray-900'}`}>
                        {dayNameFr}
                      </h4>
                      {isClinicClosed && (
                        <span className="text-xs text-red-600 font-medium flex items-center gap-1 bg-red-50 px-2 py-1 rounded">
                          <Ban className="h-3 w-3" />
                          {t('appointments.messages.clinicClosed')}
                        </span>
                      )}
                    </div>
                    {dayConfig.enabled && !isClinicClosed && (
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

                  {isClinicClosed ? (
                    <div className="text-sm text-gray-500 italic">
                      {t('appointments.clinicClosedNoAvailability', 'La clinique est fermée ce jour. Aucune disponibilité ne peut être configurée.')}
                    </div>
                  ) : dayConfig.enabled && (
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
              const isClosed = isClinicClosedOnDay(day);
              const appointmentsCount = getAppointmentsForDate(day).length;
              const availableSlotsCount = getAvailableSlotsForDate(day).filter(slot => slot.available).length;

              return (
                <div key={index} className={`p-4 text-center border-l border-gray-200 ${
                  isClosed ? 'bg-gray-200' : isToday ? 'bg-blue-50' : ''
                }`}>
                  <div className={`font-medium ${isClosed ? 'text-gray-500' : 'text-gray-900'}`}>{getDayNameFr(day)}</div>
                  <div className={`text-2xl font-bold ${
                    isClosed ? 'text-gray-400' : isToday ? 'text-blue-600' : 'text-gray-900'
                  }`}>
                    {day.getDate()}
                  </div>
                  {isClosed ? (
                    <div className="text-xs text-red-600 mt-1 font-medium flex items-center justify-center gap-1">
                      <Ban className="h-3 w-3" />
                      {t('appointments.messages.clinicClosed')}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 mt-1">
                      {appointmentsCount} RDV / {availableSlotsCount} libres
                    </div>
                  )}
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
                  const isClosed = isClinicClosedOnDay(day);
                  const daySlots = getAvailableSlotsForDate(day);
                  const timeSlot = daySlots.find(slot => slot.start === time);
                  const dayAppointments = getAppointmentsForDate(day);
                  const dateStr = day.toISOString().split('T')[0];
                  // IMPORTANT: Obtenir TOUS les appointments qui chevauchent ce créneau
                  // Un RDV chevauche si: il commence avant la fin du slot ET il finit après le début du slot
                  const slotStartTime = new Date(`${dateStr}T${time}`);
                  const slotEndTime = new Date(slotStartTime.getTime() + 30 * 60000); // Slot de 30min
                  const appointmentsAtTime = dayAppointments.filter(apt => {
                    const apptStart = new Date(`${dateStr}T${apt.startTime}`);
                    const apptEnd = new Date(`${dateStr}T${apt.endTime}`);
                    // Chevauchement: apptStart < slotEnd ET apptEnd > slotStart
                    return apptStart < slotEndTime && apptEnd > slotStartTime;
                  });
                  // Pour compatibilité, garder le premier appointment pour la logique existante
                  const appointmentAtTime = appointmentsAtTime[0];
                  const appointmentsToShow = appointmentsAtTime;
                  // Hauteur fixe pour toutes les cellules
                  const cellHeight = 48;

                  // Si la clinique est fermée ce jour-là, afficher une cellule grisée
                  if (isClosed) {
                    return (
                      <div
                        key={dayIndex}
                        className="p-1 border-l border-gray-200 relative bg-gray-200"
                        style={{ minHeight: `${cellHeight}px` }}
                      >
                        <div className="h-full flex items-center justify-center">
                          <span className="text-xs text-gray-400">-</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={dayIndex}
                      className="p-1 border-l border-gray-200 relative"
                      style={{ minHeight: `${cellHeight}px` }}
                    >
                      {appointmentsAtTime.length > 0 ? (
                        <div
                          className={`h-full rounded cursor-pointer transition-colors flex flex-col justify-center ${
                            appointmentsToShow[0]?.title === 'RDV privé'
                              ? 'bg-gray-100 text-gray-600 border border-gray-300'
                              : getAppointmentColor(appointmentsToShow[0]?.status)
                          }`}
                          title={getAppointmentTooltip(appointmentsToShow[0])}
                          onClick={() => handleAppointmentClick(appointmentsToShow[0])}
                        >
                          <div className="p-1">
                            <div className="font-medium truncate text-xs leading-tight">
                              {appointmentsToShow[0]?.patientName || appointmentsToShow[0]?.title}
                            </div>
                            {hasPermission(PERMISSIONS.APPOINTMENTS_VIEW_PRACTITIONER) && appointmentsToShow[0]?.practitionerName && (
                              <div className="text-xs opacity-75 truncate font-semibold leading-tight">
                                {appointmentsToShow[0]?.practitionerName}
                              </div>
                            )}
                            {appointmentsAtTime.length > 1 && (
                              <div className="text-xs opacity-75 mt-0.5">
                                +{appointmentsAtTime.length - 1} autre(s)
                              </div>
                            )}
                          </div>
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
              Créneaux pour le {currentDate.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
              {isClinicClosedOnDay(currentDate) && (
                <span className="ml-3 text-xs text-red-600 font-medium inline-flex items-center gap-1 bg-red-50 px-2 py-1 rounded">
                  <Ban className="h-3 w-3" />
                  {t('appointments.messages.clinicClosed')}
                </span>
              )}
            </h3>
          </div>
          <div className="p-4">
            {isClinicClosedOnDay(currentDate) ? (
              <div className="text-center py-8 bg-gray-100 rounded-lg">
                <Ban className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">{t('appointments.messages.clinicClosed')}</p>
                <p className="text-sm text-gray-500 mt-1">{t('appointments.selectAnotherDate')}</p>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {getAvailableSlotsForDate(currentDate).map((slot, index) => {
                const dayAppointments = getAppointmentsForDate(currentDate);
                const dateStr = currentDate.toISOString().split('T')[0];
                // IMPORTANT: Vérifier que l'appointment chevauche ce créneau horaire
                // Chevauchement: apptStart < slotEnd ET apptEnd > slotStart
                const slotStartTime = new Date(`${dateStr}T${slot.start}`);
                const slotEndTime = new Date(`${dateStr}T${slot.end}`);
                const appointmentAtTime = dayAppointments.find(apt => {
                  const apptStart = new Date(`${dateStr}T${apt.startTime}`);
                  const apptEnd = new Date(`${dateStr}T${apt.endTime}`);
                  return apptStart < slotEndTime && apptEnd > slotStartTime;
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
                        {hasPermission(PERMISSIONS.APPOINTMENTS_VIEW_PRACTITIONER) && appointmentAtTime.practitionerName && (
                          <div className="text-xs text-blue-600 font-semibold truncate">
                            {appointmentAtTime.practitionerName}
                            {appointmentAtTime.practitionerSpecialty && ` (${appointmentAtTime.practitionerSpecialty})`}
                          </div>
                        )}
                        <div className="text-xs text-gray-600 truncate">
                          {appointmentAtTime.title || appointmentAtTime.patientName}
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
            )}
          </div>
        </div>
      )}

      {/* Légende */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h3 className="font-medium text-gray-900 mb-3">Légende</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
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
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-200 border border-gray-300 rounded flex items-center justify-center">
              <Ban className="h-3 w-3 text-gray-400" />
            </div>
            <span>{t('appointments.messages.clinicClosed')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityManager;