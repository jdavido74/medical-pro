// components/calendar/AvailabilityManager.js
import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, Plus, Edit2, Trash2, Settings,
  ChevronLeft, ChevronRight, User, AlertCircle,
  Save, X, RotateCcw, Copy, CalendarDays
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { appointmentsStorage } from '../../utils/appointmentsStorage';

const AvailabilityManager = ({ onAppointmentScheduled, selectedPractitioner }) => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week'); // 'week', 'day'
  const [selectedDate, setSelectedDate] = useState(null);
  const [availabilities, setAvailabilities] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [isEditingAvailability, setIsEditingAvailability] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const [weeklyAvailability, setWeeklyAvailability] = useState(defaultAvailability);

  // Charger les données
  useEffect(() => {
    loadData();
  }, [currentDate, selectedPractitioner]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Charger les rendez-vous pour la période affichée
      const allAppointments = appointmentsStorage.getAll();

      // Filtrer par praticien si sélectionné
      const filteredAppointments = allAppointments.filter(apt => {
        if (selectedPractitioner && apt.practitionerId !== selectedPractitioner.id) return false;
        if (!selectedPractitioner && user?.role !== 'super_admin' && apt.practitionerId !== user.id) return false;
        return !apt.deleted;
      });

      setAppointments(filteredAppointments);

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
    // Simulation du chargement des disponibilités
    // En production, cela viendrait d'une API
    const savedAvailability = localStorage.getItem(`availability_${selectedPractitioner?.id || user?.id}`);
    if (savedAvailability) {
      try {
        setWeeklyAvailability(JSON.parse(savedAvailability));
      } catch (error) {
        console.error('Erreur lors du parsing des disponibilités:', error);
        setWeeklyAvailability(defaultAvailability);
      }
    } else {
      setWeeklyAvailability(defaultAvailability);
    }
  };

  const saveAvailabilities = () => {
    // Simulation de la sauvegarde
    localStorage.setItem(`availability_${selectedPractitioner?.id || user?.id}`, JSON.stringify(weeklyAvailability));
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

  // Obtenir les rendez-vous pour une date
  const getAppointmentsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return appointments.filter(apt => apt.date === dateStr);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestion des disponibilités</h2>
          <p className="text-gray-600">
            {selectedPractitioner ? `Disponibilités de ${selectedPractitioner.name}` : 'Gérez vos créneaux et disponibilités'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsEditingAvailability(!isEditingAvailability)}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
              isEditingAvailability ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Settings className="h-4 w-4" />
            <span>{isEditingAvailability ? 'Terminer' : 'Modifier'}</span>
          </button>
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
                  const appointmentAtTime = dayAppointments.find(apt => apt.startTime === time);

                  return (
                    <div key={dayIndex} className="p-1 border-l border-gray-200 h-12 relative">
                      {appointmentAtTime ? (
                        <div className="bg-blue-100 text-blue-800 text-xs p-1 rounded truncate h-full">
                          {appointmentAtTime.title}
                        </div>
                      ) : timeSlot ? (
                        <div
                          className={`h-full rounded cursor-pointer transition-colors ${
                            timeSlot.available
                              ? 'bg-green-100 hover:bg-green-200 border border-green-300'
                              : 'bg-red-100 border border-red-300'
                          }`}
                          onClick={() => timeSlot.available && onAppointmentScheduled?.(day, time)}
                        >
                          {!timeSlot.available && (
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
                const appointmentAtTime = dayAppointments.find(apt => apt.startTime === slot.start);

                return (
                  <div
                    key={index}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      appointmentAtTime
                        ? 'bg-blue-50 border-blue-200'
                        : slot.available
                          ? 'bg-green-50 border-green-200 hover:bg-green-100'
                          : 'bg-red-50 border-red-200'
                    }`}
                    onClick={() => slot.available && !appointmentAtTime && onAppointmentScheduled?.(currentDate, slot.start)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-600" />
                        <span className="font-medium">{slot.start} - {slot.end}</span>
                      </div>
                      {appointmentAtTime ? (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          Occupé
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
                    {appointmentAtTime && (
                      <div className="mt-2 text-sm text-gray-600">
                        <div className="font-medium">{appointmentAtTime.title}</div>
                        <div className="text-xs">{appointmentAtTime.patientName}</div>
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