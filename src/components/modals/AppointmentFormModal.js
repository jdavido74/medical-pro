// components/modals/AppointmentFormModal.js
import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Stethoscope, AlertTriangle, Save, Users, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { appointmentsStorage } from '../../utils/appointmentsStorage';
import { patientsStorage } from '../../utils/patientsStorage';
import { loadPractitioners } from '../../utils/practitionersLoader';
import PatientSearchSelect from '../common/PatientSearchSelect';
import QuickPatientModal from './QuickPatientModal';

const AppointmentFormModal = ({ isOpen, onClose, onSave, editingAppointment = null, preselectedPatient = null, preselectedDate = null, preselectedTime = null, preselectedPractitioner = null }) => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;

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
  const [patients, setPatients] = useState([]);
  const [practitioners, setPractitioners] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isQuickPatientModalOpen, setIsQuickPatientModalOpen] = useState(false);
  const [quickPatientSearchQuery, setQuickPatientSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteMode, setDeleteMode] = useState(null); // 'notify' ou 'silent'

  // Types de rendez-vous
  const appointmentTypes = [
    { value: 'consultation', label: 'Consultation générale', duration: 30, color: 'bg-blue-100 text-blue-800' },
    { value: 'followup', label: 'Suivi', duration: 20, color: 'bg-green-100 text-green-800' },
    { value: 'emergency', label: 'Urgence', duration: 15, color: 'bg-red-100 text-red-800' },
    { value: 'specialist', label: 'Consultation spécialisée', duration: 45, color: 'bg-purple-100 text-purple-800' },
    { value: 'checkup', label: 'Bilan de santé', duration: 60, color: 'bg-yellow-100 text-yellow-800' },
    { value: 'vaccination', label: 'Vaccination', duration: 15, color: 'bg-teal-100 text-teal-800' },
    { value: 'surgery', label: 'Intervention chirurgicale', duration: 120, color: 'bg-orange-100 text-orange-800' }
  ];

  // Priorités
  const priorities = [
    { value: 'low', label: 'Basse', color: 'text-gray-600' },
    { value: 'normal', label: 'Normale', color: 'text-blue-600' },
    { value: 'high', label: 'Haute', color: 'text-orange-600' },
    { value: 'urgent', label: 'Urgente', color: 'text-red-600' }
  ];

  useEffect(() => {
    if (isOpen) {
      // Charger les patients
      const allPatients = patientsStorage.getAll();
      setPatients(allPatients);

      // Charger les praticiens de la clinique via la fonction centralisée
      const allPractitioners = loadPractitioners(user);
      setPractitioners(allPractitioners);

      if (editingAppointment) {
        setFormData({
          ...editingAppointment,
          additionalSlots: editingAppointment.additionalSlots || [],
          reminders: editingAppointment.reminders || {
            patient: { enabled: true, beforeMinutes: 1440 },
            practitioner: { enabled: true, beforeMinutes: 30 }
          }
        });
      } else {
        // Nouveau rendez-vous
        const newFormData = {
          patientId: preselectedPatient?.id || '',
          practitionerId: preselectedPractitioner?.id || (user?.role === 'doctor' || user?.role === 'specialist' ? user.id : ''),
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
      setErrors({});
    }
  }, [isOpen, editingAppointment, preselectedPatient, preselectedDate, preselectedTime, preselectedPractitioner, user]);

  // Calculer les créneaux disponibles quand praticien ou date change
  useEffect(() => {
    if (formData.practitionerId && formData.date && formData.duration) {
      const slots = appointmentsStorage.getAvailableSlots(
        formData.practitionerId,
        formData.date,
        formData.duration
      );
      setAvailableSlots(slots);

      // Si l'heure actuelle n'est plus disponible, la réinitialiser
      if (formData.startTime) {
        const isCurrentTimeAvailable = slots.some(slot => slot.start === formData.startTime);
        if (!isCurrentTimeAvailable) {
          setFormData(prev => ({ ...prev, startTime: '', endTime: '' }));
        }
      }
    } else {
      setAvailableSlots([]);
    }
  }, [formData.practitionerId, formData.date, formData.duration]);

  // Calculer l'heure de fin automatiquement
  useEffect(() => {
    if (formData.startTime && formData.duration) {
      const startDate = new Date(`2000-01-01T${formData.startTime}`);
      const endDate = new Date(startDate.getTime() + formData.duration * 60000);
      const endTime = endDate.toTimeString().slice(0, 5);
      setFormData(prev => ({ ...prev, endTime }));
    }
  }, [formData.startTime, formData.duration]);

  // Vérifier si une date a des disponibilités pour le praticien sélectionné
  const isDateAvailable = (dateString) => {
    if (!formData.practitionerId || !formData.duration) return true;

    const slots = appointmentsStorage.getAvailableSlots(
      formData.practitionerId,
      dateString,
      formData.duration
    );
    return slots.length > 0;
  };

  // Obtenir les jours de la semaine où le praticien a des disponibilités
  const getAvailableDaysOfWeek = () => {
    if (!formData.practitionerId) return [];

    const availability = appointmentsStorage.getPractitionerAvailability(formData.practitionerId);
    if (!availability) return [];

    return [availability.dayOfWeek];
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
  useEffect(() => {
    if (formData.practitionerId && formData.date && formData.startTime && formData.endTime) {
      // Vérifier d'abord que le créneau est dans les horaires de disponibilité
      const availabilityCheck = appointmentsStorage.isWithinPractitionerAvailability(
        formData.practitionerId,
        formData.date,
        formData.startTime,
        formData.endTime
      );

      if (!availabilityCheck.available) {
        // Créer un conflit virtuel pour afficher l'erreur de disponibilité
        setConflicts([{
          id: 'availability-error',
          title: 'Hors horaires de disponibilité',
          startTime: formData.startTime,
          endTime: formData.endTime,
          reason: availabilityCheck.reason
        }]);
        setErrors(prev => ({ ...prev, availability: availabilityCheck.reason }));
      } else {
        // Si disponible, vérifier les conflits avec d'autres rendez-vous
        const foundConflicts = appointmentsStorage.checkTimeConflicts(
          formData.practitionerId,
          formData.date,
          formData.startTime,
          formData.endTime,
          editingAppointment?.id
        );
        setConflicts(foundConflicts);
        setErrors(prev => {
          const { availability, ...rest } = prev;
          return rest;
        });
      }
    } else {
      setConflicts([]);
      setErrors(prev => {
        const { availability, ...rest } = prev;
        return rest;
      });
    }
  }, [formData.practitionerId, formData.date, formData.startTime, formData.endTime, editingAppointment]);

  // Changer le type de rendez-vous
  const handleTypeChange = (type) => {
    const appointmentType = appointmentTypes.find(t => t.value === type);
    setFormData(prev => ({
      ...prev,
      type,
      duration: appointmentType?.duration || 30,
      title: prev.title || appointmentType?.label || ''
    }));
  };

  // Fonction appelée quand l'utilisateur demande la création d'un nouveau patient
  const handleCreateNewPatient = (searchQuery) => {
    setQuickPatientSearchQuery(searchQuery);
    setIsQuickPatientModalOpen(true);
  };

  // Fonction appelée après la création réussie d'un patient
  const handlePatientCreated = (newPatient) => {
    // Recharger la liste des patients
    const updatedPatients = patientsStorage.getAll();
    setPatients(updatedPatients);

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

  // Validation du formulaire
  const validateForm = () => {
    const newErrors = {};

    if (!formData.patientId) newErrors.patientId = 'Patient requis';
    if (!formData.practitionerId) newErrors.practitionerId = 'Praticien requis';
    if (!formData.date) newErrors.date = 'Date requise';
    if (!formData.startTime) newErrors.startTime = 'Heure de début requise';
    if (!formData.title) newErrors.title = 'Titre requis';

    // Vérifier que la date n'est pas dans le passé
    if (formData.date) {
      const appointmentDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (appointmentDate < today) {
        newErrors.date = 'La date ne peut pas être dans le passé';
      }
    }

    // Vérifier que les créneaux sont continus
    if (!areSlotsContinuous()) {
      newErrors.startTime = 'Les créneaux doivent être continus (adjacents)';
    }

    // Vérifier les conflits
    if (conflicts.length > 0) {
      newErrors.time = 'Créneau en conflit avec un autre rendez-vous';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Sauvegarder le rendez-vous
  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const appointmentData = {
        ...formData,
        id: editingAppointment?.id || undefined
      };

      let savedAppointment;
      if (editingAppointment) {
        savedAppointment = appointmentsStorage.update(appointmentData.id, appointmentData);
      } else {
        savedAppointment = appointmentsStorage.create(appointmentData);
      }

      onSave?.(savedAppointment);
      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      setErrors({ general: 'Erreur lors de la sauvegarde du rendez-vous' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (mode = null) => {
    if (!editingAppointment?.id) return;

    // Si mode n'est pas spécifié, afficher le sélecteur de mode
    if (!mode) {
      setDeleteMode(null);
      return;
    }

    setIsLoading(true);
    try {
      // Soft delete - marquer comme supprimé
      const deletedAppointment = appointmentsStorage.delete(editingAppointment.id);

      // Gérer les notifications selon le mode
      if (mode === 'notify') {
        // Mode avec notifications
        console.log(`✉️ Rendez-vous ${editingAppointment.id} supprimé avec notifications.`);
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
        console.log(`🗑️ Rendez-vous ${editingAppointment.id} supprimé SANS notifications.`);
        console.log(`⚠️ Aucune notification ne sera envoyée au patient ou au praticien.`);
      }

      // Fermer les modals et notifier le parent
      setShowDeleteConfirm(false);
      setDeleteMode(null);
      onSave?.({ ...editingAppointment, deleted: true });
      onClose();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      setErrors({ general: 'Erreur lors de la suppression du rendez-vous' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedType = appointmentTypes.find(t => t.value === formData.type);
  const selectedPatient = patients.find(p => p.id === formData.patientId);
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
            {editingAppointment && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                title={t('appointments.deleteTitle')}
              >
                <Trash2 className="h-4 w-4" />
                <span>{t('common.delete')}</span>
              </button>
            )}
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

              {/* Titre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Titre du rendez-vous"
                />
                {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
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
                    {formData.practitionerId && formData.date && !isDateAvailable(formData.date) && (
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
                      formData.date && formData.practitionerId && !isDateAvailable(formData.date) ? 'border-orange-500 bg-orange-50' :
                      'border-gray-300'
                    }`}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
                  {formData.practitionerId && (
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
                  ) : availableSlots.length === 0 ? (
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-center text-orange-700 text-sm">
                      <AlertTriangle className="h-5 w-5 inline-block mr-2" />
                      Aucun créneau disponible pour cette date. Choisissez une autre date.
                    </div>
                  ) : (
                    <div>
                      {/* Sélection des créneaux (simple clic pour sélectionner/désélectionner) */}
                      <label className="text-xs font-medium text-gray-600 block mb-2">
                        Slots *
                      </label>
                      <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                        {availableSlots.map((slot, index) => {
                          const isSelected = formData.startTime === slot.start || formData.additionalSlots.some(s => s.start === slot.start);
                          const isFirstSelected = formData.startTime === slot.start;

                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  // Désélectionner le créneau
                                  if (isFirstSelected) {
                                    // Si c'est le premier créneau sélectionné, chercher le prochain
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
                                    // C'est un créneau supplémentaire
                                    setFormData(prev => ({
                                      ...prev,
                                      additionalSlots: prev.additionalSlots.filter(s => s.start !== slot.start)
                                    }));
                                  }
                                } else {
                                  // Sélectionner le créneau
                                  if (!formData.startTime) {
                                    // Premier créneau sélectionné
                                    setFormData(prev => ({
                                      ...prev,
                                      startTime: slot.start,
                                      endTime: slot.end
                                    }));
                                  } else {
                                    // Ajouter comme créneau supplémentaire
                                    setFormData(prev => ({
                                      ...prev,
                                      additionalSlots: [...prev.additionalSlots, slot]
                                    }));
                                  }
                                }
                              }}
                              className={`p-2 text-sm border rounded transition-colors ${
                                isFirstSelected
                                  ? 'border-blue-500 bg-blue-500 text-white font-medium shadow-sm'
                                  : isSelected
                                  ? 'border-green-500 bg-green-500 text-white font-medium shadow-sm'
                                  : 'border-gray-300 bg-white hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm'
                              }`}
                            >
                              {slot.start}
                            </button>
                          );
                        })}
                      </div>
                      {formData.additionalSlots.length > 0 && (
                        <p className="text-xs text-green-700 mt-2 p-2 bg-green-50 rounded">
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
                    {new Date(formData.date).toLocaleDateString('fr-FR', {
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

          {errors.general && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{errors.general || t('appointments.deletionError')}</p>
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
    </div>
  );
};

export default AppointmentFormModal;