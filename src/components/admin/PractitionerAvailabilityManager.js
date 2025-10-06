// components/admin/PractitionerAvailabilityManager.js - Gestion des disponibilités des praticiens
import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Plus, Trash2, User, Save } from 'lucide-react';
import { practitionersStorage } from '../../utils/clinicConfigStorage';
import { useTranslation } from 'react-i18next';

const PractitionerAvailabilityManager = ({ isOpen, onClose, practitionerId, onSave }) => {
  const { t } = useTranslation();
  const [practitioner, setPractitioner] = useState(null);
  const [availability, setAvailability] = useState({});
  const [selectedDay, setSelectedDay] = useState('monday');
  const [newSlot, setNewSlot] = useState({ start: '09:00', end: '17:00' });

  useEffect(() => {
    if (isOpen && practitionerId) {
      const practitionerData = practitionersStorage.getById(practitionerId);
      setPractitioner(practitionerData);
      setAvailability(practitionerData?.availability || {});
    }
  }, [isOpen, practitionerId]);

  const handleSave = () => {
    if (practitioner) {
      practitionersStorage.updateAvailability(practitioner.id, selectedDay, availability[selectedDay]);
      onSave?.();
    }
  };

  const handleSaveAll = () => {
    if (practitioner) {
      // Sauvegarder toutes les disponibilités
      Object.entries(availability).forEach(([day, dayAvailability]) => {
        practitionersStorage.updateAvailability(practitioner.id, day, dayAvailability);
      });
      onSave?.();
      onClose();
    }
  };

  const toggleDayEnabled = (day) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day]?.enabled,
        slots: prev[day]?.slots || []
      }
    }));
  };

  const addSlot = (day) => {
    if (newSlot.start && newSlot.end && newSlot.start < newSlot.end) {
      setAvailability(prev => ({
        ...prev,
        [day]: {
          ...prev[day],
          enabled: prev[day]?.enabled !== false,
          slots: [...(prev[day]?.slots || []), { ...newSlot }]
        }
      }));
      setNewSlot({ start: '09:00', end: '17:00' });
    }
  };

  const removeSlot = (day, slotIndex) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day]?.slots?.filter((_, index) => index !== slotIndex) || []
      }
    }));
  };

  const copyDayToOthers = (sourceDay) => {
    const sourceDayData = availability[sourceDay];
    if (!sourceDayData) return;

    const workDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const newAvailability = { ...availability };

    workDays.forEach(day => {
      if (day !== sourceDay) {
        newAvailability[day] = {
          enabled: sourceDayData.enabled,
          slots: [...(sourceDayData.slots || [])]
        };
      }
    });

    setAvailability(newAvailability);
  };

  const applyStandardSchedule = () => {
    const standardSchedule = {
      enabled: true,
      slots: [
        { start: '09:00', end: '12:00' },
        { start: '14:00', end: '18:00' }
      ]
    };

    const newAvailability = {};
    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
      newAvailability[day] = { ...standardSchedule };
    });

    ['saturday', 'sunday'].forEach(day => {
      newAvailability[day] = {
        enabled: false,
        slots: []
      };
    });

    setAvailability(newAvailability);
  };

  if (!isOpen || !practitioner) return null;

  const dayNames = {
    monday: 'Lundi',
    tuesday: 'Mardi',
    wednesday: 'Mercredi',
    thursday: 'Jeudi',
    friday: 'Vendredi',
    saturday: 'Samedi',
    sunday: 'Dimanche'
  };

  const getColorClass = (color) => {
    const colorMap = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      red: 'bg-red-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      teal: 'bg-teal-500',
      pink: 'bg-pink-500',
      indigo: 'bg-indigo-500'
    };
    return colorMap[color] || 'bg-blue-500';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-600 to-purple-700">
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
              getColorClass(practitioner.color)
            }`}>
              {practitioner.firstName?.[0]}{practitioner.lastName?.[0]}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                Disponibilités - {practitioner.firstName} {practitioner.lastName}
              </h2>
              <p className="text-purple-100 text-sm">{practitioner.speciality}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-200 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Actions rapides */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <button
              onClick={applyStandardSchedule}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
            >
              Appliquer horaires standard
            </button>
            <span className="text-gray-400">|</span>
            <span className="text-sm text-gray-600">Actions rapides:</span>
            {Object.keys(dayNames).map(day => (
              <button
                key={day}
                onClick={() => copyDayToOthers(day)}
                className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                title={`Copier ${dayNames[day]} vers les autres jours`}
              >
                Copier {dayNames[day].substr(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[60vh]">
          {/* Sidebar - Liste des jours */}
          <div className="w-1/4 border-r border-gray-200 bg-gray-50">
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-4">Jours de la semaine</h3>
              <div className="space-y-2">
                {Object.entries(dayNames).map(([day, name]) => {
                  const dayData = availability[day] || { enabled: false, slots: [] };
                  const isSelected = selectedDay === day;
                  const isEnabled = dayData.enabled;
                  const slotsCount = dayData.slots?.length || 0;

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-purple-100 text-purple-800 border-2 border-purple-300'
                          : 'bg-white hover:bg-gray-100 border-2 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{name}</span>
                        <div className="flex items-center space-x-2">
                          {isEnabled && (
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                              {slotsCount} créneaux
                            </span>
                          )}
                          {!isEnabled && (
                            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                              Fermé
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main content - Configuration du jour sélectionné */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Configuration - {dayNames[selectedDay]}
                </h3>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={availability[selectedDay]?.enabled || false}
                    onChange={() => toggleDayEnabled(selectedDay)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Jour d'ouverture</span>
                </label>
              </div>

              {availability[selectedDay]?.enabled && (
                <div>
                  {/* Créneaux existants */}
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">Créneaux de disponibilité</h4>
                    {availability[selectedDay]?.slots?.length > 0 ? (
                      <div className="space-y-2">
                        {availability[selectedDay].slots.map((slot, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-4">
                              <Clock className="h-4 w-4 text-gray-500" />
                              <span className="font-medium text-gray-900">
                                {slot.start} - {slot.end}
                              </span>
                              <span className="text-sm text-gray-600">
                                ({Math.round((
                                  (parseInt(slot.end.split(':')[0]) * 60 + parseInt(slot.end.split(':')[1])) -
                                  (parseInt(slot.start.split(':')[0]) * 60 + parseInt(slot.start.split(':')[1]))
                                ) / 60 * 10) / 10}h)
                              </span>
                            </div>
                            <button
                              onClick={() => removeSlot(selectedDay, index)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                              title="Supprimer ce créneau"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">Aucun créneau configuré</p>
                    )}
                  </div>

                  {/* Ajouter un nouveau créneau */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Ajouter un créneau</h4>
                    <div className="flex items-center space-x-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Début</label>
                        <input
                          type="time"
                          value={newSlot.start}
                          onChange={(e) => setNewSlot(prev => ({ ...prev, start: e.target.value }))}
                          className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fin</label>
                        <input
                          type="time"
                          value={newSlot.end}
                          onChange={(e) => setNewSlot(prev => ({ ...prev, end: e.target.value }))}
                          className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={() => addSlot(selectedDay)}
                          disabled={!newSlot.start || !newSlot.end || newSlot.start >= newSlot.end}
                          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Ajouter
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Créneaux suggérés */}
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 mb-3">Créneaux suggérés</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { start: '08:00', end: '12:00', label: 'Matinée' },
                        { start: '14:00', end: '18:00', label: 'Après-midi' },
                        { start: '09:00', end: '17:00', label: 'Journée continue' },
                        { start: '07:00', end: '15:00', label: 'Début de journée' }
                      ].map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => setNewSlot(suggestion)}
                          className="p-2 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors text-left"
                        >
                          <div className="font-medium text-gray-900">{suggestion.label}</div>
                          <div className="text-gray-600">{suggestion.start} - {suggestion.end}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {!availability[selectedDay]?.enabled && (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Ce jour est marqué comme fermé</p>
                  <p className="text-sm text-gray-400">
                    Activez le jour d'ouverture pour configurer les créneaux de disponibilité
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Les modifications sont sauvegardées automatiquement
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSaveAll}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center"
            >
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder tout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PractitionerAvailabilityManager;