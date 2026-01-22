// components/modals/AppointmentFormModal.js
import React, { useState, useEffect, useContext } from 'react';
import { X, Calendar, Clock, User, Stethoscope, AlertTriangle, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { PatientContext } from '../../contexts/PatientContext';
import { AppointmentContext } from '../../contexts/AppointmentContext';
import { useTranslation } from 'react-i18next';
import { normalizePractitioner } from '../../utils/practitionersLoader';
import { isPractitionerRole, filterPractitioners } from '../../utils/userRoles';
import { usePermissions } from '../auth/PermissionGuard';
import { PERMISSIONS } from '../../utils/permissionsStorage';
import practitionerAvailabilityApi from '../../api/practitionerAvailabilityApi';
import { healthcareProvidersApi } from '../../api/healthcareProvidersApi';
import { clinicSettingsApi } from '../../api/clinicSettingsApi';
import PatientSearchSelect from '../common/PatientSearchSelect';
import QuickPatientModal from './QuickPatientModal';
import { useLocale } from '../../contexts/LocaleContext';
import { useFormErrors } from '../../hooks/useFormErrors';
import {
  APPOINTMENT_TYPES,
  APPOINTMENT_TYPE_KEYS,
  APPOINTMENT_PRIORITIES,
  getAppointmentDuration,
  getAppointmentTypeColor,
  getPriorityColor
} from '../../utils/medicalConstants';

const AppointmentFormModal = ({ isOpen, onClose, onSave, editingAppointment = null, preselectedPatient = null, preselectedDate = null, preselectedTime = null, preselectedPractitioner = null }) => {
  const { user } = useAuth();
  const patientContext = useContext(PatientContext);
  const appointmentContext = useContext(AppointmentContext);
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const { locale } = useLocale();

  const [formData, setFormData] = useState({
    patientId: '',
    practitionerId: '',
    type: 'consultation',
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    duration: 30,
    status: 'scheduled',
    priority: 'normal',
    location: '',
    notes: '',
    additionalSlots: [], // Créneaux supplémentaires pour le même rendez-vous
    reminders: {
      patient: { enabled: true, beforeMinutes: 1440 }, // 24h avant
      practitioner: { enabled: true, beforeMinutes: 30 }
    }
  });

  const [conflicts, setConflicts] = useState([]);
  const [practitioners, setPractitioners] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSlotsLoading, setIsSlotsLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isQuickPatientModalOpen, setIsQuickPatientModalOpen] = useState(false);
  const [quickPatientSearchQuery, setQuickPatientSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteMode, setDeleteMode] = useState(null); // 'notify' ou 'silent'
  const [clinicSettings, setClinicSettings] = useState(null);
  const [isClinicClosedOnSelectedDate, setIsClinicClosedOnSelectedDate] = useState(false);
  const [occupiedSlots, setOccupiedSlots] = useState([]); // Slots occupés par d'autres RDV
  const [slotDeselectionConfirm, setSlotDeselectionConfirm] = useState({ show: false, slot: null }); // Confirmation de désélection

  // Hook for standardized form error handling
  const {
    errors,
    generalError,
    setFieldError,
    clearFieldError,
    clearErrors,
    handleBackendError,
    getFieldError
  } = useFormErrors();

  // Generate appointment types from constants with translation
  const appointmentTypes = APPOINTMENT_TYPE_KEYS.map(key => ({
    value: key,
    label: t(`appointments.types.${key}`, APPOINTMENT_TYPES[key]?.label || key),
    duration: getAppointmentDuration(key),
    color: getAppointmentTypeColor(key)
  }));

  // Generate priorities from constants with translation
  const priorities = APPOINTMENT_PRIORITIES.map(priority => ({
    value: priority,
    label: t(`appointments.priorities.${priority}`, priority),
    color: getPriorityColor(priority)
  }));

  // Day name mapping for clinic operating hours
  const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  // Helper function to check if a date is a clinic closed day
  const isClinicClosedOnDate = (dateString) => {
    if (!clinicSettings || !dateString) return false;

    const date = new Date(dateString);
    const dayName = DAY_NAMES[date.getDay()];

    // Check recurring closed days (operating_hours)
    if (clinicSettings.operatingHours) {
      const dayConfig = clinicSettings.operatingHours[dayName];
      if (dayConfig && dayConfig.enabled === false) {
        return true;
      }
    }

    // Check specific closed dates (holidays, etc.)
    if (clinicSettings.closedDates && Array.isArray(clinicSettings.closedDates)) {
      const isClosedDate = clinicSettings.closedDates.some(cd => {
        const closedDateStr = typeof cd.date === 'string' ? cd.date.split('T')[0] : cd.date;
        return closedDateStr === dateString;
      });
      if (isClosedDate) return true;
    }

    return false;
  };

  // Fetch clinic settings on mount
  useEffect(() => {
    const fetchClinicSettings = async () => {
      try {
        const settings = await clinicSettingsApi.getClinicSettings();
        setClinicSettings(settings);
      } catch (error) {
        console.error('[AppointmentFormModal] Error loading clinic settings:', error);
      }
    };
    fetchClinicSettings();
  }, []);

  // Update isClinicClosedOnSelectedDate when date changes
  useEffect(() => {
    if (formData.date && clinicSettings) {
      setIsClinicClosedOnSelectedDate(isClinicClosedOnDate(formData.date));
    } else {
      setIsClinicClosedOnSelectedDate(false);
    }
  }, [formData.date, clinicSettings]);

  useEffect(() => {
    if (isOpen) {
      // Charger les praticiens de la clinique depuis l'API backend
      const fetchPractitioners = async () => {
        try {
          const result = await healthcareProvidersApi.getHealthcareProviders({ limit: 100 });
          // Filter only practitioner roles and normalize
          const practitionerList = filterPractitioners(result.providers || [])
            .map(normalizePractitioner);

          // S'assurer que l'utilisateur courant est dans la liste s'il est praticien
          if (user && isPractitionerRole(user.role)) {
            const currentUserInList = practitionerList.find(p => p.id === user.providerId || p.id === user.id);
            if (!currentUserInList) {
              practitionerList.unshift(normalizePractitioner({
                id: user.providerId || user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                name: user.name,
                role: user.role,
                specialty: user.specialty || 'Médecine générale'
              }));
            }
          }

          setPractitioners(practitionerList);
        } catch (error) {
          console.error('[AppointmentFormModal] Error loading practitioners:', error);
          // Fallback: ajouter au moins l'utilisateur courant s'il est praticien
          if (user && isPractitionerRole(user.role)) {
            setPractitioners([normalizePractitioner({
              id: user.providerId || user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              name: user.name,
              role: user.role,
              specialty: user.specialty || 'Médecine générale'
            })]);
          }
        }
      };
      fetchPractitioners();

      if (editingAppointment) {
        console.log('[AppointmentFormModal] Setting formData from editingAppointment:', {
          appointmentId: editingAppointment.id,
          hasAdditionalSlots: !!editingAppointment.additionalSlots
        });

        setFormData({
          ...editingAppointment,
          // Assurer explicitement que l'ID est présent
          id: editingAppointment.id,
          additionalSlots: editingAppointment.additionalSlots || [],
          reminders: editingAppointment.reminders || {
            patient: { enabled: true, beforeMinutes: 1440 },
            practitioner: { enabled: true, beforeMinutes: 30 }
          }
        });
      } else {
        // Nouveau rendez-vous
        // Utiliser providerId (healthcare_provider.id) et non user.id (central user id)
        const newFormData = {
          patientId: preselectedPatient?.id || '',
          practitionerId: preselectedPractitioner?.id || (isPractitionerRole(user?.role) ? (user.providerId || user.id) : ''),
          type: 'consultation',
          title: '',
          description: '',
          date: preselectedDate || '',
          startTime: preselectedTime || '',
          endTime: '',
          duration: 30,
          status: 'scheduled',
          priority: 'normal',
          location: '',
          notes: '',
          additionalSlots: [],
          reminders: {
            patient: { enabled: true, beforeMinutes: 1440 },
            practitioner: { enabled: true, beforeMinutes: 30 }
          }
        };
        setFormData(newFormData);
      }

      setConflicts([]);
      clearErrors(); // Use useFormErrors clearErrors
      setShowDeleteConfirm(false);
      setDeleteMode(null);
    }
  }, [isOpen, editingAppointment, preselectedPatient, preselectedDate, preselectedTime, preselectedPractitioner, user, clearErrors]);

  // Note: La vérification des conflits est faite dans un useEffect plus bas (lignes ~290-340)
  // qui vérifie à la fois la disponibilité ET les conflits

  // Calculer l'heure de fin automatiquement
  useEffect(() => {
    if (formData.startTime && formData.duration) {
      const startDate = new Date(`2000-01-01T${formData.startTime}`);
      const endDate = new Date(startDate.getTime() + formData.duration * 60000);
      const endTime = endDate.toTimeString().slice(0, 5);
      setFormData(prev => ({ ...prev, endTime }));
    }
  }, [formData.startTime, formData.duration]);

  // Charger les créneaux disponibles depuis le backend ET identifier les slots occupés
  useEffect(() => {
    const loadAvailableSlots = async () => {
      if (!formData.practitionerId || !formData.date) {
        setAvailableSlots([]);
        setOccupiedSlots([]);
        setIsSlotsLoading(false);
        return;
      }

      setIsSlotsLoading(true);
      try {
        console.log('[AppointmentFormModal] Loading available slots for:', {
          providerId: formData.practitionerId,
          date: formData.date,
          duration: formData.duration
        });

        const response = await practitionerAvailabilityApi.getAvailableSlots(
          formData.practitionerId,
          formData.date,
          formData.duration || 30
        );

        if (response.success && response.data?.slots) {
          let slots = response.data.slots;
          console.log('[AppointmentFormModal] Loaded slots:', slots.length);

          // Identifier les slots occupés par d'autres RDV (depuis le contexte)
          const otherAppointments = appointmentContext?.appointments?.filter(apt =>
            apt.date === formData.date &&
            apt.practitionerId === formData.practitionerId &&
            apt.id !== editingAppointment?.id &&
            apt.status !== 'cancelled'
          ) || [];

          const occupied = [];
          otherAppointments.forEach(apt => {
            // Ajouter le slot principal
            if (apt.startTime) {
              occupied.push({
                start: apt.startTime,
                end: apt.endTime,
                appointmentId: apt.id,
                patientName: apt.patientName || 'Patient'
              });
            }
            // Ajouter les slots supplémentaires
            if (apt.additionalSlots && apt.additionalSlots.length > 0) {
              apt.additionalSlots.forEach(s => {
                occupied.push({
                  start: s.start,
                  end: s.end,
                  appointmentId: apt.id,
                  patientName: apt.patientName || 'Patient'
                });
              });
            }
          });
          setOccupiedSlots(occupied);

          // En mode édition, ajouter les slots du RDV actuel s'ils ne sont pas déjà dans la liste
          // (car le backend les exclut puisqu'ils sont réservés)
          if (editingAppointment && editingAppointment.date === formData.date && editingAppointment.practitionerId === formData.practitionerId) {
            const existingStarts = new Set(slots.map(s => s.start));

            // Ajouter le slot principal s'il n'existe pas
            if (editingAppointment.startTime && !existingStarts.has(editingAppointment.startTime)) {
              slots = [...slots, { start: editingAppointment.startTime, end: editingAppointment.endTime }];
            }

            // Ajouter les slots supplémentaires s'ils n'existent pas
            if (editingAppointment.additionalSlots && editingAppointment.additionalSlots.length > 0) {
              editingAppointment.additionalSlots.forEach(additionalSlot => {
                if (!existingStarts.has(additionalSlot.start)) {
                  slots = [...slots, { start: additionalSlot.start, end: additionalSlot.end }];
                }
              });
            }
          }

          // Ajouter les slots occupés à la liste pour qu'ils soient visibles (en grisé)
          const occupiedStarts = new Set(occupied.map(s => s.start));
          const slotsWithOccupied = [...slots];
          occupied.forEach(occSlot => {
            if (!slots.find(s => s.start === occSlot.start)) {
              slotsWithOccupied.push({ start: occSlot.start, end: occSlot.end, occupied: true });
            }
          });

          // Trier les slots par heure de début
          slotsWithOccupied.sort((a, b) => a.start.localeCompare(b.start));
          console.log('[AppointmentFormModal] Total slots (with occupied):', slotsWithOccupied.length, 'occupied:', occupied.length);

          setAvailableSlots(slotsWithOccupied);
        } else {
          console.warn('[AppointmentFormModal] No slots returned:', response);
          setAvailableSlots([]);
          setOccupiedSlots([]);
        }
      } catch (error) {
        console.error('[AppointmentFormModal] Error loading available slots:', error);
        setAvailableSlots([]);
        setOccupiedSlots([]);
      } finally {
        setIsSlotsLoading(false);
      }
    };

    loadAvailableSlots();
  }, [formData.practitionerId, formData.date, formData.duration, editingAppointment?.startTime, appointmentContext?.appointments]);

  // Vérifier si une date a des disponibilités pour le praticien sélectionné
  const isDateAvailable = (dateString) => {
    // Si on a déjà chargé les slots pour cette date, utiliser le state
    if (dateString === formData.date) {
      return availableSlots.length > 0;
    }
    // Sinon, on ne sait pas encore - retourner true par défaut
    return true;
  };

  // Obtenir les jours de la semaine où le praticien a des disponibilités (non utilisé avec le backend)
  const getAvailableDaysOfWeek = () => {
    // Cette fonction n'est plus utilisée avec le backend API
    // Les disponibilités sont chargées dynamiquement par date
    return [];
  };

  // Mettre à jour l'endTime quand des créneaux supplémentaires sont ajoutés
  useEffect(() => {
    if (formData.additionalSlots.length > 0) {
      // Mettre à jour endTime pour refléter le dernier créneau sélectionné
      const lastSlot = formData.additionalSlots[formData.additionalSlots.length - 1];
      setFormData(prev => ({
        ...prev,
        endTime: lastSlot.end
      }));
    }
  }, [formData.additionalSlots]);

  // Vérifier les conflits et la disponibilité en temps réel
  // Note: Le backend retourne uniquement les créneaux disponibles (non réservés)
  // donc la validation est simplifiée - si le créneau est dans availableSlots, il est valide
  // EXCEPTION: En mode édition, le créneau actuel du RDV est considéré comme disponible
  useEffect(() => {
    // Ne pas valider pendant le chargement des créneaux
    if (isSlotsLoading) {
      return;
    }

    // En mode édition, vérifier si on est sur le créneau du RDV en cours d'édition
    // Dans ce cas, ne jamais afficher d'alerte (c'est le même RDV)
    const isEditingCurrentSlot = editingAppointment &&
      editingAppointment.date === formData.date &&
      editingAppointment.startTime === formData.startTime &&
      editingAppointment.practitionerId === formData.practitionerId;

    // Si on édite le créneau actuel, pas d'alerte
    if (isEditingCurrentSlot) {
      setConflicts([]);
      clearFieldError('availability');
      return;
    }

    // Validation uniquement si tous les champs sont remplis et les créneaux sont chargés
    if (formData.practitionerId && formData.date && formData.startTime && formData.endTime && availableSlots.length > 0) {
      // Vérifier que le créneau sélectionné est dans les créneaux disponibles
      const isSlotAvailable = availableSlots.some(slot => slot.start === formData.startTime);

      if (!isSlotAvailable) {
        // Le créneau sélectionné n'est pas disponible (hors des disponibilités ou déjà réservé)
        setConflicts([{
          id: 'availability-error',
          title: 'Créneau non disponible',
          startTime: formData.startTime,
          endTime: formData.endTime,
          reason: 'Ce créneau n\'est pas disponible pour ce praticien'
        }]);
        setFieldError('availability', 'Créneau non disponible');
      } else {
        // Créneau valide
        setConflicts([]);
        clearFieldError('availability');
      }
    } else {
      // Pas assez de données pour valider - pas d'alerte
      setConflicts([]);
      clearFieldError('availability');
    }
  }, [formData.practitionerId, formData.date, formData.startTime, formData.endTime, availableSlots, editingAppointment, isSlotsLoading, setFieldError, clearFieldError]);

  // Changer le type de rendez-vous
  const handleTypeChange = (type) => {
    const appointmentType = appointmentTypes.find(t => t.value === type);
    const newDuration = appointmentType?.duration || 30;

    setFormData(prev => {
      // Si la durée change, réinitialiser les créneaux sélectionnés
      // car les créneaux disponibles seront différents
      const durationChanged = newDuration !== prev.duration;

      return {
        ...prev,
        type,
        duration: newDuration,
        title: prev.title || appointmentType?.label || '',
        // Réinitialiser les créneaux si la durée a changé
        startTime: durationChanged ? '' : prev.startTime,
        endTime: durationChanged ? '' : prev.endTime,
        additionalSlots: durationChanged ? [] : prev.additionalSlots
      };
    });
  };

  // Fonction appelée quand l'utilisateur demande la création d'un nouveau patient
  const handleCreateNewPatient = (searchQuery) => {
    setQuickPatientSearchQuery(searchQuery);
    setIsQuickPatientModalOpen(true);
  };

  // Fonction appelée après la création réussie d'un patient
  const handlePatientCreated = (newPatient) => {
    // ✅ PatientContext gère automatiquement la synchronisation
    // Le nouveau patient est déjà dans patientContext.patients

    // Pré-sélectionner le nouveau patient
    setFormData(prev => ({ ...prev, patientId: newPatient.id }));

    // Fermer la modal de création rapide
    setIsQuickPatientModalOpen(false);
    setQuickPatientSearchQuery('');
  };

  // Vérifier que les créneaux sélectionnés sont continus
  const areSlotsContinuous = () => {
    if (!formData.startTime || formData.additionalSlots.length === 0) {
      return true; // Pas de vérification si un seul créneau
    }

    // Créer une liste de tous les créneaux sélectionnés (principal + supplémentaires)
    const selectedSlots = [
      { start: formData.startTime },
      ...formData.additionalSlots
    ];

    // Vérifier qu'ils sont continus en vérifiant si chaque créneau est suivi du suivant
    for (let i = 0; i < selectedSlots.length - 1; i++) {
      const currentSlot = availableSlots.find(s => s.start === selectedSlots[i].start);
      const nextSlot = availableSlots.find(s => s.start === selectedSlots[i + 1].start);

      if (!currentSlot || !nextSlot) continue;

      // Vérifier que la fin du créneau actuel = début du suivant
      if (currentSlot.end !== nextSlot.start) {
        return false; // Les créneaux ne sont pas continus
      }
    }

    return true;
  };

  // Validation du formulaire - Using useFormErrors
  const validateForm = () => {
    clearErrors();
    let isValid = true;

    if (!formData.patientId) {
      setFieldError('patientId', t('appointments.validation.patientRequired', 'Patient requis'));
      isValid = false;
    }
    if (!formData.practitionerId) {
      setFieldError('practitionerId', t('appointments.validation.practitionerRequired', 'Praticien requis'));
      isValid = false;
    }
    if (!formData.date) {
      setFieldError('date', t('appointments.validation.dateRequired', 'Date requise'));
      isValid = false;
    }
    if (!formData.startTime) {
      setFieldError('startTime', t('appointments.validation.timeRequired', 'Heure de début requise'));
      isValid = false;
    }
    // Title is optional - if not provided, patient name will be used as fallback

    // Vérifier que la date n'est pas dans le passé
    if (formData.date) {
      const appointmentDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (appointmentDate < today) {
        setFieldError('date', t('appointments.validation.dateInPast', 'La date ne peut pas être dans le passé'));
        isValid = false;
      }
    }

    // Vérifier que les créneaux sont continus
    if (!areSlotsContinuous()) {
      setFieldError('startTime', t('appointments.validation.slotsContinuous', 'Les créneaux doivent être continus (adjacents)'));
      isValid = false;
    }

    // Vérifier les conflits
    if (conflicts.length > 0) {
      setFieldError('time', t('appointments.validation.slotConflict', 'Créneau en conflit avec un autre rendez-vous'));
      isValid = false;
    }

    return isValid;
  };

  // Sauvegarder le rendez-vous
  const handleSave = async () => {
    if (!validateForm()) return;

    // Validation métier: Un praticien ne peut créer que pour lui-même
    const isPractitioner = isPractitionerRole(user?.role);
    const isCreating = !editingAppointment;
    // Comparer avec providerId (healthcare_provider.id) qui est l'ID utilisé dans le formulaire
    const userProviderId = user?.providerId || user?.id;

    if (isPractitioner && isCreating && formData.practitionerId !== userProviderId) {
      setFieldError('general', t('appointments.validation.selfOnly', 'Un médecin ne peut créer que des rendez-vous pour lui-même'));
      return;
    }

    if (!appointmentContext) {
      setFieldError('general', t('appointments.validation.contextError', 'Appointment context not available'));
      return;
    }

    setIsLoading(true);
    try {
      // ✅ SYNCHRONISATION IMMÉDIATE : Utiliser AppointmentContext
      // AppointmentContext gère l'optimistic update + API sync en background
      let savedAppointment;
      if (editingAppointment?.id) {
        // MISE À JOUR : Utiliser updateAppointment du contexte
        savedAppointment = await appointmentContext.updateAppointment(editingAppointment.id, formData);
      } else {
        // CRÉATION : Utiliser createAppointment du contexte
        savedAppointment = await appointmentContext.createAppointment(formData);
      }

      onSave?.(savedAppointment);
      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      handleBackendError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (mode = null) => {
    console.log('[handleDelete] DEBUG:', {
      editingAppointment,
      formDataId: formData.id,
      editingAppointmentId: editingAppointment?.id,
      mode
    });

    // Utiliser formData.id si editingAppointment.id n'existe pas
    const appointmentId = editingAppointment?.id || formData.id;

    if (!appointmentId) {
      console.error('[handleDelete] No appointment ID to delete', {
        editingAppointment,
        formData,
        hasEditingId: !!editingAppointment?.id,
        hasFormDataId: !!formData.id
      });
      return;
    }

    // Si mode n'est pas spécifié, afficher le sélecteur de mode
    if (!mode) {
      console.warn('[handleDelete] No deletion mode selected');
      setDeleteMode(null);
      return;
    }

    console.log('[handleDelete] Starting deletion with mode:', mode, 'appointmentId:', appointmentId);

    if (!appointmentContext) {
      setFieldError('general', t('appointments.validation.contextError', 'Appointment context not available'));
      return;
    }

    setIsLoading(true);
    try {
      // ✅ SYNCHRONISATION IMMÉDIATE : Utiliser deleteAppointment du contexte
      // AppointmentContext gère le soft delete + API sync en background
      await appointmentContext.deleteAppointment(appointmentId);
      console.log('[handleDelete] Appointment deleted:', appointmentId);

      // Gérer les notifications selon le mode
      if (mode === 'notify') {
        // Mode avec notifications
        console.log(`✉️ Rendez-vous ${appointmentId} supprimé avec notifications.`);
        console.log(`📧 Email d'annulation envoyé au patient: ${selectedPatient?.email || 'N/A'}`);
        console.log(`📧 Email d'annulation envoyé au praticien: ${selectedPractitioner?.email || 'N/A'}`);
        console.log(`📱 SMS d'annulation envoyé au patient: ${selectedPatient?.phone || 'N/A'}`);

        // TODO: Intégrer avec système de notifications email/SMS
        // Placeholder pour notifications
        const notificationData = {
          appointmentId: editingAppointment.id,
          patient: {
            id: selectedPatient?.id,
            email: selectedPatient?.email,
            phone: selectedPatient?.phone,
            name: `${selectedPatient?.firstName} ${selectedPatient?.lastName}`
          },
          practitioner: {
            id: selectedPractitioner?.id,
            email: selectedPractitioner?.email,
            name: selectedPractitioner?.name
          },
          appointmentDetails: {
            date: formData.date,
            time: formData.startTime,
            type: formData.type
          },
          notificationType: 'appointment_cancelled'
        };
        // await notificationService.sendCancellationNotifications(notificationData);
        console.log('Données de notification préparées:', notificationData);
      } else if (mode === 'silent') {
        // Mode sans notifications
        console.log(`🗑️ Rendez-vous ${appointmentId} supprimé SANS notifications.`);
        console.log(`⚠️ Aucune notification ne sera envoyée au patient ou au praticien.`);
      }

      // Fermer les modals et notifier le parent
      setShowDeleteConfirm(false);
      setDeleteMode(null);
      onSave?.({ ...(editingAppointment || formData), id: appointmentId, deleted: true });
      onClose();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      handleBackendError(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedType = appointmentTypes.find(t => t.value === formData.type);
  const selectedPatient = patientContext?.patients?.find(p => p.id === formData.patientId);
  const selectedPractitioner = practitioners.find(p => p.id === formData.practitionerId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {editingAppointment ? t('appointments.edit') : t('appointments.new')}
              </h2>
              <p className="text-sm text-gray-500">
                {editingAppointment ? 'Modifique los detalles de la cita' : 'Programe una nueva cita'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {editingAppointment && (() => {
              // Déterminer si l'utilisateur peut supprimer le RDV
              const canDelete = hasPermission(PERMISSIONS.APPOINTMENTS_DELETE);

              if (process.env.NODE_ENV === 'development') {
                console.log('[AppointmentFormModal] Delete button check:', {
                  editingAppointment: !!editingAppointment,
                  canDelete,
                  permission: PERMISSIONS.APPOINTMENTS_DELETE,
                  userRole: user?.role
                });
              }

              if (!canDelete) return null;

              return (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  title={t('appointments.deleteTitle')}
                >
                  <Trash2 className="h-4 w-4" />
                  <span>{t('common.delete')}</span>
                </button>
              );
            })()}
            <button
              onClick={handleSave}
              disabled={isLoading || conflicts.length > 0}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              title={t('appointments.save')}
            >
              <Save className="h-4 w-4" />
              <span>{isLoading ? `${t('common.saving')}...` : t('appointments.save')}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Alertes de conflit et disponibilité */}
          {conflicts.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h3 className="font-medium text-red-800">
                  {conflicts[0]?.id === 'availability-error' ? '⚠️ Hors des horaires de disponibilité' : 'Conflit de créneau détecté'}
                </h3>
              </div>
              <div className="text-sm text-red-700">
                {conflicts.map((conflict, index) => (
                  <div key={index} className="mb-1">
                    {conflict.id === 'availability-error' ? (
                      <div>
                        <strong>{conflict.reason}</strong>
                        <p className="mt-1 text-xs">Veuillez choisir un créneau horaire pendant les heures de disponibilité du praticien.</p>
                      </div>
                    ) : (
                      <div>Conflit avec: {conflict.title} ({conflict.startTime} - {conflict.endTime})</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Colonne gauche - Informations principales */}
            <div className="space-y-6">
              {/* Patient - Utiliser le composant de recherche */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Patient *
                </label>
                <PatientSearchSelect
                  value={formData.patientId}
                  onChange={(patientId) => setFormData(prev => ({ ...prev, patientId }))}
                  onCreateNew={handleCreateNewPatient}
                  error={errors.patientId}
                  disabled={!!preselectedPatient}
                  placeholder="Rechercher ou créer un patient..."
                />
              </div>

              {/* Praticien */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Praticien *
                </label>
                {(() => {
                  // Seuls les admins et secrétaires peuvent changer le praticien
                  // Les praticiens ne peuvent créer/modifier que leurs propres RDV
                  const isPractitioner = isPractitionerRole(user?.role);
                  const canEditPractitioner = !isPractitioner; // Seuls admin/secrétaire peuvent changer

                  if (!canEditPractitioner) {
                    // Afficher le praticien en lecture seule pour les praticiens
                    const selectedPractitionerName = practitioners.find(p => p.id === formData.practitionerId)?.name || 'Non sélectionné';
                    return (
                      <>
                        <div className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-700">
                          {selectedPractitionerName}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Seuls les administrateurs et secrétaires peuvent modifier le praticien</p>
                      </>
                    );
                  }

                  return (
                    <select
                      value={formData.practitionerId}
                      onChange={(e) => setFormData(prev => ({ ...prev, practitionerId: e.target.value }))}
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.practitionerId ? 'border-red-500' : 'border-gray-300'}`}
                    >
                      <option value="">Sélectionner un praticien</option>
                      {practitioners.map(practitioner => (
                        <option key={practitioner.id} value={practitioner.id}>
                          {practitioner.name} - {practitioner.specialty}
                        </option>
                      ))}
                    </select>
                  );
                })()}
                {errors.practitionerId && <p className="text-red-500 text-sm mt-1">{errors.practitionerId}</p>}
              </div>

              {/* Type de rendez-vous */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de rendez-vous *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {appointmentTypes.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleTypeChange(type.value)}
                      className={`p-3 text-left border rounded-lg transition-colors ${
                        formData.type === type.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="font-medium text-sm">{type.label}</div>
                      <div className="text-xs text-gray-500">{type.duration} min</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Titre (optionnel - nom du patient par défaut) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('appointments.title', 'Titre')}
                  <span className="text-gray-400 text-xs ml-1">({t('common.optional', 'optionnel')})</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('appointments.titlePlaceholder', 'Laisser vide pour utiliser le nom du patient')}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Description du rendez-vous"
                />
              </div>
            </div>

            {/* Colonne droite - Planification et détails */}
            <div className="space-y-6">
              {/* Date et horaires */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date *
                    {isClinicClosedOnSelectedDate && (
                      <span className="ml-2 text-xs text-red-600 font-medium">
                        🚫 {t('appointments.messages.clinicClosed')}
                      </span>
                    )}
                    {!isClinicClosedOnSelectedDate && formData.practitionerId && formData.date && !isDateAvailable(formData.date) && (
                      <span className="ml-2 text-xs text-orange-600">
                        ⚠️ Aucun créneau disponible pour cette date
                      </span>
                    )}
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        date: newDate,
                        // Réinitialiser l'heure si la date change
                        startTime: '',
                        endTime: ''
                      }));
                    }}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.date ? 'border-red-500' :
                      isClinicClosedOnSelectedDate ? 'border-red-500 bg-red-50' :
                      formData.date && formData.practitionerId && !isDateAvailable(formData.date) ? 'border-orange-500 bg-orange-50' :
                      'border-gray-300'
                    }`}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
                  {isClinicClosedOnSelectedDate && (
                    <p className="text-xs text-red-600 mt-1 font-medium">
                      🚫 {t('appointments.messages.clinicClosed')} - {t('appointments.selectAnotherDate')}
                    </p>
                  )}
                  {!isClinicClosedOnSelectedDate && formData.practitionerId && (
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Astuce : Sélectionnez une date où le praticien a des disponibilités
                    </p>
                  )}
                </div>

                {/* Sélection de l'heure parmi les créneaux disponibles */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('appointments.timeSlots')}
                    {formData.practitionerId && formData.date && (
                      <span className="ml-2 text-xs text-gray-500">
                        ({availableSlots.length} disponibles)
                      </span>
                    )}
                  </label>

                  {!formData.practitionerId || !formData.date ? (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center text-gray-500 text-sm">
                      {!formData.practitionerId ? '⚠️ Sélectionnez d\'abord un praticien' : '⚠️ Sélectionnez d\'abord une date'}
                    </div>
                  ) : isSlotsLoading ? (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center text-blue-700 text-sm">
                      <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                      Chargement des créneaux disponibles...
                    </div>
                  ) : availableSlots.length === 0 ? (
                    isClinicClosedOnSelectedDate ? (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center text-red-700 text-sm">
                        <AlertTriangle className="h-5 w-5 inline-block mr-2" />
                        <strong>{t('appointments.messages.clinicClosed')}</strong>
                        <p className="mt-1 text-xs">{t('appointments.selectAnotherDate', 'Veuillez sélectionner une autre date.')}</p>
                      </div>
                    ) : (
                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-center text-orange-700 text-sm">
                        <AlertTriangle className="h-5 w-5 inline-block mr-2" />
                        Aucun créneau disponible pour cette date. Vérifiez que le praticien a défini ses disponibilités.
                      </div>
                    )
                  ) : (
                    <div>
                      {/* Sélection des créneaux (simple clic pour sélectionner/désélectionner) */}
                      <label className="text-xs font-medium text-gray-600 block mb-2">
                        Slots * <span className="text-gray-400 font-normal">(rouge = occupé par un autre RDV)</span>
                      </label>
                      <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                        {availableSlots.map((slot, index) => {
                          const isSelected = formData.startTime === slot.start || formData.additionalSlots.some(s => s.start === slot.start);
                          const isFirstSelected = formData.startTime === slot.start;
                          const isOccupied = occupiedSlots.some(s => s.start === slot.start);
                          const occupiedBy = occupiedSlots.find(s => s.start === slot.start);

                          // Vérifier si ce slot fait partie du RDV original (en édition)
                          const isOriginalSlot = editingAppointment && (
                            editingAppointment.startTime === slot.start ||
                            (editingAppointment.additionalSlots || []).some(s => s.start === slot.start)
                          );

                          // Fonction de désélection avec confirmation si nécessaire
                          const handleDeselect = () => {
                            if (isFirstSelected) {
                              const nextSelected = formData.additionalSlots[0];
                              if (nextSelected) {
                                setFormData(prev => ({
                                  ...prev,
                                  startTime: nextSelected.start,
                                  endTime: nextSelected.end,
                                  additionalSlots: prev.additionalSlots.slice(1)
                                }));
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  startTime: '',
                                  endTime: '',
                                  additionalSlots: []
                                }));
                              }
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                additionalSlots: prev.additionalSlots.filter(s => s.start !== slot.start)
                              }));
                            }
                          };

                          return (
                            <button
                              key={index}
                              type="button"
                              title={isOccupied ? `Occupé par: ${occupiedBy?.patientName || 'autre RDV'}` : ''}
                              onClick={() => {
                                // Si occupé par un autre RDV, ne rien faire
                                if (isOccupied && !isSelected) return;

                                if (isSelected) {
                                  // Désélectionner le créneau
                                  // Si c'est un slot original du RDV en édition, demander confirmation
                                  if (isOriginalSlot) {
                                    setSlotDeselectionConfirm({ show: true, slot, handleDeselect });
                                  } else {
                                    handleDeselect();
                                  }
                                } else {
                                  // Sélectionner le créneau
                                  if (!formData.startTime) {
                                    setFormData(prev => ({
                                      ...prev,
                                      startTime: slot.start,
                                      endTime: slot.end
                                    }));
                                  } else {
                                    const lastSlot = formData.additionalSlots.length > 0
                                      ? formData.additionalSlots[formData.additionalSlots.length - 1]
                                      : availableSlots.find(s => s.start === formData.startTime);

                                    if (lastSlot && lastSlot.end === slot.start) {
                                      setFormData(prev => ({
                                        ...prev,
                                        additionalSlots: [...prev.additionalSlots, slot]
                                      }));
                                    }
                                  }
                                }
                              }}
                              disabled={(isOccupied && !isSelected) || (!isSelected && formData.startTime && (formData.additionalSlots.length > 0
                                ? formData.additionalSlots[formData.additionalSlots.length - 1].end !== slot.start
                                : availableSlots.find(s => s.start === formData.startTime)?.end !== slot.start
                              ))}
                              className={`p-2 text-sm border rounded transition-colors ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-500 text-white font-medium shadow-sm'
                                  : isOccupied
                                  ? 'border-red-300 bg-red-100 text-red-500 cursor-not-allowed'
                                  : !isSelected && formData.startTime && (formData.additionalSlots.length > 0
                                    ? formData.additionalSlots[formData.additionalSlots.length - 1].end !== slot.start
                                    : availableSlots.find(s => s.start === formData.startTime)?.end !== slot.start)
                                  ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                                  : 'border-gray-300 bg-white hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm'
                              }`}
                            >
                              {slot.start}
                              {isOccupied && !isSelected && <span className="block text-[10px]">occupé</span>}
                            </button>
                          );
                        })}
                      </div>
                      {formData.additionalSlots.length > 0 && (
                        <p className="text-xs text-blue-700 mt-2 p-2 bg-blue-50 rounded">
                          ✓ {1 + formData.additionalSlots.length} slot(s) sélectionné(s): {formData.startTime}
                          {formData.additionalSlots.map(s => ` + ${s.start}`).join('')}
                        </p>
                      )}
                    </div>
                  )}
                  {errors.startTime && <p className="text-red-500 text-sm mt-1">{errors.startTime}</p>}

                  {formData.startTime && formData.endTime && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mt-2">
                      <div className="flex items-center space-x-2 text-sm text-blue-700">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">
                          Créneaux sélectionnés: {formData.startTime}
                          {formData.additionalSlots.map((s, i) => (
                            <span key={i}>, {s.start}</span>
                          ))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Priorité */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priorité
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {priorities.map(priority => (
                    <option key={priority.value} value={priority.value}>
                      {priority.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lieu */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lieu
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Salle de consultation, cabinet..."
                />
              </div>

              {/* Rappels */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Rappels automatiques
                </label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <User className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium">Rappel patient</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <select
                        value={formData.reminders.patient.beforeMinutes}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          reminders: {
                            ...prev.reminders,
                            patient: { ...prev.reminders.patient, beforeMinutes: parseInt(e.target.value) }
                          }
                        }))}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                        disabled={!formData.reminders.patient.enabled}
                      >
                        <option value={30}>30 min avant</option>
                        <option value={60}>1h avant</option>
                        <option value={1440}>24h avant</option>
                        <option value={2880}>48h avant</option>
                      </select>
                      <input
                        type="checkbox"
                        checked={formData.reminders.patient.enabled}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          reminders: {
                            ...prev.reminders,
                            patient: { ...prev.reminders.patient, enabled: e.target.checked }
                          }
                        }))}
                        className="w-4 h-4 text-blue-600"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Stethoscope className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium">Rappel praticien</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <select
                        value={formData.reminders.practitioner.beforeMinutes}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          reminders: {
                            ...prev.reminders,
                            practitioner: { ...prev.reminders.practitioner, beforeMinutes: parseInt(e.target.value) }
                          }
                        }))}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                        disabled={!formData.reminders.practitioner.enabled}
                      >
                        <option value={15}>15 min avant</option>
                        <option value={30}>30 min avant</option>
                        <option value={60}>1h avant</option>
                      </select>
                      <input
                        type="checkbox"
                        checked={formData.reminders.practitioner.enabled}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          reminders: {
                            ...prev.reminders,
                            practitioner: { ...prev.reminders.practitioner, enabled: e.target.checked }
                          }
                        }))}
                        className="w-4 h-4 text-blue-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes internes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Notes internes (non visibles par le patient)"
                />
              </div>
            </div>
          </div>

          {/* Résumé */}
          {selectedPatient && selectedPractitioner && formData.date && formData.startTime && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Résumé du rendez-vous</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Patient:</span>
                  <span className="ml-2 font-medium">{selectedPatient.firstName} {selectedPatient.lastName}</span>
                </div>
                <div>
                  <span className="text-blue-700">Praticien:</span>
                  <span className="ml-2 font-medium">{selectedPractitioner.name}</span>
                </div>
                <div>
                  <span className="text-blue-700">Date:</span>
                  <span className="ml-2 font-medium">
                    {new Date(formData.date).toLocaleDateString(locale, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Horaire:</span>
                  <span className="ml-2 font-medium">{formData.startTime} - {formData.endTime}</span>
                </div>
                <div>
                  <span className="text-blue-700">Type:</span>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${selectedType?.color}`}>
                    {selectedType?.label}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Durée:</span>
                  <span className="ml-2 font-medium">{formData.duration} minutes</span>
                </div>
              </div>
            </div>
          )}

          {(getFieldError('general') || generalError) && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{getFieldError('general') || generalError?.message || t('appointments.deletionError')}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-500">
            {conflicts.length > 0 && (
              <span className="text-red-600 font-medium">
                ⚠️ {t('appointments.slotConflict')}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              disabled={isLoading}
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || conflicts.length > 0}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              <span>{isLoading ? `${t('common.saving')}...` : t('appointments.save')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal de création rapide de patient */}
      <QuickPatientModal
        isOpen={isQuickPatientModalOpen}
        onClose={() => {
          setIsQuickPatientModalOpen(false);
          setQuickPatientSearchQuery('');
        }}
        onSave={handlePatientCreated}
        initialSearchQuery={quickPatientSearchQuery}
      />

      {/* Modal de confirmation de suppression */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md shadow-lg">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                {t('appointments.deleteTitle')}
              </h3>
              <p className="text-gray-600 text-center mb-4 text-sm">
                Elija cómo cancelar esta cita:
              </p>

              {/* Détails du rendez-vous */}
              <div className="bg-gray-50 p-3 rounded-lg mb-6 text-sm text-gray-700">
                <div><strong>Patient:</strong> {selectedPatient?.firstName} {selectedPatient?.lastName}</div>
                <div><strong>Praticien:</strong> {selectedPractitioner?.name}</div>
                <div><strong>Date:</strong> {formData.date} à {formData.startTime}</div>
              </div>

              {/* Choix du mode de suppression */}
              <div className="space-y-3 mb-6">
                {/* Option 1: Supprimer avec notification */}
                <button
                  onClick={() => setDeleteMode('notify')}
                  disabled={isLoading}
                  className={`w-full p-3 rounded-lg border-2 transition-colors text-left ${
                    deleteMode === 'notify'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 bg-white'
                  } disabled:opacity-50`}
                >
                  <div className="font-medium text-gray-900">📧 {t('appointments.deleteWithNotification')}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {t('appointments.notifyPatient')} / {t('appointments.notifyPractitioner')}
                  </div>
                </button>

                {/* Option 2: Supprimer sans notification */}
                <button
                  onClick={() => setDeleteMode('silent')}
                  disabled={isLoading}
                  className={`w-full p-3 rounded-lg border-2 transition-colors text-left ${
                    deleteMode === 'silent'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-orange-300 bg-white'
                  } disabled:opacity-50`}
                >
                  <div className="font-medium text-gray-900">⚠️ {t('appointments.deleteSilent')}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {t('appointments.noNotification')}
                  </div>
                </button>
              </div>

              {/* Avertissement si mode silencieux sélectionné */}
              {deleteMode === 'silent' && (
                <div className="mb-6 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
                  <strong>⚠️ Atención:</strong> El paciente y el médico no serán notificados de esta cancelación.
                </div>
              )}
            </div>

            {/* Boutons d'action */}
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between space-x-3 rounded-b-lg border-t">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteMode(null);
                }}
                disabled={isLoading}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => handleDelete(deleteMode)}
                disabled={isLoading || !deleteMode}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <Trash2 className="h-4 w-4" />
                <span>
                  {isLoading ? 'Eliminando...' : deleteMode === 'notify' ? t('appointments.deleteWithNotification') : deleteMode === 'silent' ? t('appointments.deleteSilent') : t('common.delete')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de désélection de slot */}
      {slotDeselectionConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-orange-100 rounded-full mr-3">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Confirmer la désélection
              </h3>
            </div>

            <p className="text-gray-600 mb-4">
              Vous êtes sur le point de désélectionner le créneau <strong>{slotDeselectionConfirm.slot?.start}</strong> qui fait partie du rendez-vous actuel.
            </p>
            <p className="text-sm text-orange-600 mb-6">
              ⚠️ Ce créneau sera libéré et pourra être réservé par un autre patient.
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setSlotDeselectionConfirm({ show: false, slot: null })}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  slotDeselectionConfirm.handleDeselect?.();
                  setSlotDeselectionConfirm({ show: false, slot: null });
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
              >
                Confirmer la désélection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentFormModal;