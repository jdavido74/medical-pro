// components/admin/ClinicConfigModal.js - Modal de configuration de clinique
import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, Settings, Plus, Trash2 } from 'lucide-react';
import { clinicConfigStorage } from '../../utils/clinicConfigStorage';
import { useTranslation } from 'react-i18next';

const ClinicConfigModal = ({ isOpen, onClose, onSave }) => {
  const { t } = useTranslation();
  const [config, setConfig] = useState(null);
  const [activeTab, setActiveTab] = useState('schedule');
  const [newClosedDate, setNewClosedDate] = useState({ date: '', reason: '', type: 'holiday' });

  useEffect(() => {
    if (isOpen) {
      const currentConfig = clinicConfigStorage.getConfig();
      setConfig(currentConfig);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (config) {
      const savedConfig = clinicConfigStorage.saveConfig(config);
      onSave?.(savedConfig);
      onClose();
    }
  };

  const updateOperatingHours = (day, field, value) => {
    setConfig(prev => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: {
          ...prev.operatingHours[day],
          [field]: value
        }
      }
    }));
  };

  const updateSlotSettings = (field, value) => {
    setConfig(prev => ({
      ...prev,
      slotSettings: {
        ...prev.slotSettings,
        [field]: value
      }
    }));
  };

  const addClosedDate = () => {
    if (newClosedDate.date && newClosedDate.reason) {
      clinicConfigStorage.addClosedDate(newClosedDate.date, newClosedDate.reason, newClosedDate.type);
      setConfig(clinicConfigStorage.getConfig());
      setNewClosedDate({ date: '', reason: '', type: 'holiday' });
    }
  };

  const removeClosedDate = (dateId) => {
    clinicConfigStorage.removeClosedDate(dateId);
    setConfig(clinicConfigStorage.getConfig());
  };

  const toggleOperatingDay = (dayIndex) => {
    setConfig(prev => ({
      ...prev,
      operatingDays: prev.operatingDays.includes(dayIndex)
        ? prev.operatingDays.filter(d => d !== dayIndex)
        : [...prev.operatingDays, dayIndex].sort()
    }));
  };

  if (!isOpen || !config) return null;

  const dayNames = {
    monday: 'Lundi',
    tuesday: 'Mardi',
    wednesday: 'Mercredi',
    thursday: 'Jeudi',
    friday: 'Vendredi',
    saturday: 'Samedi',
    sunday: 'Dimanche'
  };

  const dayNumbers = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center space-x-3">
            <Settings className="h-6 w-6 text-white" />
            <h2 className="text-xl font-semibold text-white">Configuration de la Clinique</h2>
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-200 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'schedule'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Clock className="h-4 w-4 inline mr-2" />
              Horaires d'ouverture
            </button>
            <button
              onClick={() => setActiveTab('slots')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'slots'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Settings className="h-4 w-4 inline mr-2" />
              Créneaux
            </button>
            <button
              onClick={() => setActiveTab('closed')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'closed'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Calendar className="h-4 w-4 inline mr-2" />
              Jours de fermeture
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Jours d'ouverture</h3>
                <div className="grid grid-cols-7 gap-3">
                  {Object.entries(dayNames).map(([key, name]) => {
                    const dayNumber = dayNumbers[key];
                    const isOpen = config.operatingDays.includes(dayNumber);
                    return (
                      <button
                        key={key}
                        onClick={() => toggleOperatingDay(dayNumber)}
                        className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                          isOpen
                            ? 'bg-green-100 text-green-800 border-2 border-green-300'
                            : 'bg-gray-100 text-gray-600 border-2 border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Horaires par jour</h3>
                <div className="space-y-4">
                  {Object.entries(dayNames).map(([key, name]) => (
                    <div key={key} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                      <div className="w-24 font-medium text-gray-700">{name}</div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={config.operatingHours[key].enabled}
                          onChange={(e) => updateOperatingHours(key, 'enabled', e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600">Ouvert</span>
                      </div>
                      {config.operatingHours[key].enabled && (
                        <>
                          <div className="flex items-center space-x-2">
                            <label className="text-sm text-gray-600">De:</label>
                            <input
                              type="time"
                              value={config.operatingHours[key].start}
                              onChange={(e) => updateOperatingHours(key, 'start', e.target.value)}
                              className="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <label className="text-sm text-gray-600">À:</label>
                            <input
                              type="time"
                              value={config.operatingHours[key].end}
                              onChange={(e) => updateOperatingHours(key, 'end', e.target.value)}
                              className="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'slots' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Configuration des créneaux</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Durée par défaut (minutes)
                    </label>
                    <select
                      value={config.slotSettings.defaultDuration}
                      onChange={(e) => updateSlotSettings('defaultDuration', parseInt(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {config.slotSettings.availableDurations.map(duration => (
                        <option key={duration} value={duration}>{duration} minutes</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Temps de battement (minutes)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={config.slotSettings.bufferTime}
                      onChange={(e) => updateSlotSettings('bufferTime', parseInt(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Réservation max à l'avance (jours)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={config.slotSettings.maxAdvanceBooking}
                      onChange={(e) => updateSlotSettings('maxAdvanceBooking', parseInt(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Réservation min à l'avance (heures)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="72"
                      value={config.slotSettings.minAdvanceBooking}
                      onChange={(e) => updateSlotSettings('minAdvanceBooking', parseInt(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={config.slotSettings.allowWeekendBooking}
                      onChange={(e) => updateSlotSettings('allowWeekendBooking', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Autoriser les réservations le weekend</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'closed' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Jours de fermeture exceptionnelle</h3>

                {/* Ajouter une fermeture */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Ajouter une fermeture</h4>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <input
                        type="date"
                        value={newClosedDate.date}
                        onChange={(e) => setNewClosedDate(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={newClosedDate.type}
                        onChange={(e) => setNewClosedDate(prev => ({ ...prev, type: e.target.value }))}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="holiday">Jour férié</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="other">Autre</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Raison</label>
                      <input
                        type="text"
                        value={newClosedDate.reason}
                        onChange={(e) => setNewClosedDate(prev => ({ ...prev, reason: e.target.value }))}
                        placeholder="Motif de fermeture"
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={addClosedDate}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Ajouter
                      </button>
                    </div>
                  </div>
                </div>

                {/* Liste des fermetures */}
                <div className="space-y-2">
                  {config.closedDates?.length > 0 ? (
                    config.closedDates.map((closedDate) => (
                      <div key={closedDate.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <span className="font-medium text-gray-900">{closedDate.date}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            closedDate.type === 'holiday' ? 'bg-red-100 text-red-800' :
                            closedDate.type === 'maintenance' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {closedDate.type === 'holiday' ? 'Jour férié' :
                             closedDate.type === 'maintenance' ? 'Maintenance' : 'Autre'}
                          </span>
                          <span className="text-gray-600">{closedDate.reason}</span>
                        </div>
                        <button
                          onClick={() => removeClosedDate(closedDate.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-8">Aucun jour de fermeture configuré</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClinicConfigModal;