// components/admin/ClinicConfigModal.js - Modal de configuration de clinique
import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, Settings, Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { clinicSettingsApi } from '../../api/clinicSettingsApi';
import { useTranslation } from 'react-i18next';

const ClinicConfigModal = ({ isOpen, onClose, onSave }) => {
  const { t } = useTranslation(['admin', 'common']);
  const [config, setConfig] = useState(null);
  const [activeTab, setActiveTab] = useState('schedule');
  const [newClosedDate, setNewClosedDate] = useState({ date: '', reason: '', type: 'holiday' });
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  // Auto-hide notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const loadConfig = async () => {
    try {
      const clinicSettings = await clinicSettingsApi.getClinicSettings();
      setConfig(clinicSettings);
    } catch (error) {
      console.error('[ClinicConfigModal] Error loading config:', error);
      setNotification({ type: 'error', message: t('admin:clinicConfiguration.messages.loadError') });
    }
  };

  const handleSave = async () => {
    if (!config) return;

    try {
      setIsSaving(true);
      setNotification(null);

      const savedConfig = await clinicSettingsApi.updateClinicSettings(config);
      setConfig(savedConfig);
      onSave?.(savedConfig);

      setNotification({ type: 'success', message: t('admin:clinicConfiguration.messages.saveSuccess') });
      // Ne pas fermer le modal - rester sur l'onglet actif
    } catch (error) {
      console.error('[ClinicConfigModal] Error saving config:', error);
      const errorMessage = error.details || error.message || t('admin:clinicConfiguration.messages.saveError');
      setNotification({ type: 'error', message: errorMessage });
    } finally {
      setIsSaving(false);
    }
  };

  const updateOperatingHours = (day, field, value) => {
    setConfig(prev => {
      const currentDayHours = prev.operatingHours?.[day] || { enabled: true, hasLunchBreak: false, start: '08:00', end: '18:00' };

      // Gérer les champs imbriqués (morning.start, afternoon.end, etc.)
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        return {
          ...prev,
          operatingHours: {
            ...(prev.operatingHours || {}),
            [day]: {
              ...currentDayHours,
              [parent]: {
                ...(currentDayHours[parent] || {}),
                [child]: value
              }
            }
          }
        };
      }

      // Gérer le changement de hasLunchBreak
      if (field === 'hasLunchBreak') {
        const newDayHours = { ...currentDayHours, hasLunchBreak: value };

        // Si on active la pause du midi, initialiser les horaires matin/après-midi
        if (value) {
          newDayHours.morning = currentDayHours.morning || {
            start: currentDayHours.start || '08:00',
            end: '12:00'
          };
          newDayHours.afternoon = currentDayHours.afternoon || {
            start: '14:00',
            end: currentDayHours.end || '18:00'
          };
          // Supprimer les champs start/end simples
          delete newDayHours.start;
          delete newDayHours.end;
        } else {
          // Si on désactive la pause, revenir à une seule plage
          newDayHours.start = currentDayHours.morning?.start || currentDayHours.start || '08:00';
          newDayHours.end = currentDayHours.afternoon?.end || currentDayHours.end || '18:00';
          // Supprimer les objets morning/afternoon
          delete newDayHours.morning;
          delete newDayHours.afternoon;
        }

        return {
          ...prev,
          operatingHours: {
            ...(prev.operatingHours || {}),
            [day]: newDayHours
          }
        };
      }

      // Champs simples
      return {
        ...prev,
        operatingHours: {
          ...(prev.operatingHours || {}),
          [day]: {
            ...currentDayHours,
            [field]: value
          }
        }
      };
    });
  };

  const updateSlotSettings = (field, value) => {
    setConfig(prev => ({
      ...prev,
      slotSettings: {
        ...(prev.slotSettings || {}),
        [field]: value
      }
    }));
  };

  const addClosedDate = async () => {
    if (!newClosedDate.date || !newClosedDate.reason) return;

    try {
      await clinicSettingsApi.addClosedDate(newClosedDate.date, newClosedDate.reason, newClosedDate.type);
      await loadConfig();
      setNewClosedDate({ date: '', reason: '', type: 'holiday' });
      setNotification({ type: 'success', message: t('admin:clinicConfiguration.messages.closedAdded') });
    } catch (error) {
      console.error('[ClinicConfigModal] Error adding closed date:', error);
      setNotification({ type: 'error', message: t('admin:clinicConfiguration.messages.closedAddError') });
    }
  };

  const removeClosedDate = async (dateId) => {
    try {
      await clinicSettingsApi.removeClosedDate(dateId);
      await loadConfig();
      setNotification({ type: 'success', message: t('admin:clinicConfiguration.messages.closedRemoved') });
    } catch (error) {
      console.error('[ClinicConfigModal] Error removing closed date:', error);
      setNotification({ type: 'error', message: t('admin:clinicConfiguration.messages.closedRemoveError') });
    }
  };

  const toggleOperatingDay = (dayIndex) => {
    setConfig(prev => {
      const currentDays = prev.operatingDays || [];
      return {
        ...prev,
        operatingDays: currentDays.includes(dayIndex)
          ? currentDays.filter(d => d !== dayIndex)
          : [...currentDays, dayIndex].sort()
      };
    });
  };

  if (!isOpen || !config) return null;

  const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const dayNumbers = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Notification */}
        {notification && (
          <div className="absolute top-4 right-4 z-50 animate-slide-in-right">
            <div className={`rounded-lg shadow-lg p-4 flex items-center space-x-3 min-w-[320px] ${
              notification.type === 'success'
                ? 'bg-green-50 border-l-4 border-green-500'
                : 'bg-red-50 border-l-4 border-red-500'
            }`}>
              {notification.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              )}
              <p className={`flex-1 text-sm font-medium ${
                notification.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {notification.message}
              </p>
              <button
                onClick={() => setNotification(null)}
                className={`flex-shrink-0 ${
                  notification.type === 'success'
                    ? 'text-green-600 hover:text-green-800'
                    : 'text-red-600 hover:text-red-800'
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center space-x-3">
            <Settings className="h-6 w-6 text-white" />
            <h2 className="text-xl font-semibold text-white">{t('admin:clinicConfiguration.title')}</h2>
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
              {t('admin:clinicConfiguration.tabs.schedule')}
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
              {t('admin:clinicConfiguration.tabs.slots')}
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
              {t('admin:clinicConfiguration.tabs.closed')}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">{t('admin:clinicConfiguration.schedule.openingDays')}</h3>
                <div className="grid grid-cols-7 gap-3">
                  {dayKeys.map((key) => {
                    const dayNumber = dayNumbers[key];
                    const isOpen = config.operatingDays?.includes(dayNumber) ?? false;
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
                        {t(`common:dayNames.${key}`)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">{t('admin:clinicConfiguration.schedule.hoursPerDay')}</h3>
                <div className="space-y-4">
                  {dayKeys.map((key) => {
                    const dayNumber = dayNumbers[key];
                    const isDayOpen = config.operatingDays?.includes(dayNumber) ?? false;

                    // Ne pas afficher la configuration des horaires si le jour est fermé
                    if (!isDayOpen) {
                      return (
                        <div key={key} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                          <div className="w-24 font-medium text-gray-500">{t(`common:dayNames.${key}`)}</div>
                          <span className="text-sm text-gray-500 italic">{t('admin:clinicConfiguration.schedule.dayClosed')}</span>
                        </div>
                      );
                    }

                    const dayHours = config.operatingHours?.[key] || {};
                    const hasLunchBreak = dayHours.hasLunchBreak ?? false;

                    return (
                      <div key={key} className="p-4 border border-gray-200 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="w-24 font-medium text-gray-700">{t(`common:dayNames.${key}`)}</div>
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={hasLunchBreak}
                              onChange={(e) => updateOperatingHours(key, 'hasLunchBreak', e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-600">{t('admin:clinicConfiguration.schedule.lunchBreak')}</span>
                          </label>
                        </div>

                        {hasLunchBreak ? (
                          // Deux tranches horaires : matin et après-midi
                          <div className="space-y-2 pl-6">
                            <div className="flex items-center space-x-4">
                              <span className="text-xs font-medium text-gray-500 w-20">{t('admin:clinicConfiguration.schedule.morning')}:</span>
                              <div className="flex items-center space-x-2">
                                <label className="text-sm text-gray-600">{t('admin:clinicConfiguration.schedule.from')}:</label>
                                <input
                                  type="time"
                                  value={dayHours.morning?.start || '08:00'}
                                  onChange={(e) => updateOperatingHours(key, 'morning.start', e.target.value)}
                                  className="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              <div className="flex items-center space-x-2">
                                <label className="text-sm text-gray-600">{t('admin:clinicConfiguration.schedule.to')}:</label>
                                <input
                                  type="time"
                                  value={dayHours.morning?.end || '12:00'}
                                  onChange={(e) => updateOperatingHours(key, 'morning.end', e.target.value)}
                                  className="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <span className="text-xs font-medium text-gray-500 w-20">{t('admin:clinicConfiguration.schedule.afternoon')}:</span>
                              <div className="flex items-center space-x-2">
                                <label className="text-sm text-gray-600">{t('admin:clinicConfiguration.schedule.from')}:</label>
                                <input
                                  type="time"
                                  value={dayHours.afternoon?.start || '14:00'}
                                  onChange={(e) => updateOperatingHours(key, 'afternoon.start', e.target.value)}
                                  className="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              <div className="flex items-center space-x-2">
                                <label className="text-sm text-gray-600">{t('admin:clinicConfiguration.schedule.to')}:</label>
                                <input
                                  type="time"
                                  value={dayHours.afternoon?.end || '18:00'}
                                  onChange={(e) => updateOperatingHours(key, 'afternoon.end', e.target.value)}
                                  className="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          // Une seule tranche horaire
                          <div className="flex items-center space-x-4 pl-6">
                            <div className="flex items-center space-x-2">
                              <label className="text-sm text-gray-600">{t('admin:clinicConfiguration.schedule.from')}:</label>
                              <input
                                type="time"
                                value={dayHours.start || '08:00'}
                                onChange={(e) => updateOperatingHours(key, 'start', e.target.value)}
                                className="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <label className="text-sm text-gray-600">{t('admin:clinicConfiguration.schedule.to')}:</label>
                              <input
                                type="time"
                                value={dayHours.end || '18:00'}
                                onChange={(e) => updateOperatingHours(key, 'end', e.target.value)}
                                className="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'slots' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">{t('admin:clinicConfiguration.slots.title')}</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin:clinicConfiguration.slots.defaultDuration')}
                    </label>
                    <select
                      value={config.slotSettings?.defaultDuration || 30}
                      onChange={(e) => updateSlotSettings('defaultDuration', parseInt(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {(config.slotSettings?.availableDurations || [15, 20, 30, 45, 60, 90, 120]).map(duration => (
                        <option key={duration} value={duration}>{duration} {t('admin:clinicConfiguration.slots.minutes')}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin:clinicConfiguration.slots.bufferTime')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={config.slotSettings?.bufferTime || 5}
                      onChange={(e) => updateSlotSettings('bufferTime', parseInt(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin:clinicConfiguration.slots.maxAdvanceBooking')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={config.slotSettings?.maxAdvanceBooking || 90}
                      onChange={(e) => updateSlotSettings('maxAdvanceBooking', parseInt(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin:clinicConfiguration.slots.minAdvanceBooking')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="72"
                      value={config.slotSettings?.minAdvanceBooking || 1}
                      onChange={(e) => updateSlotSettings('minAdvanceBooking', parseInt(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={config.slotSettings?.allowWeekendBooking ?? false}
                      onChange={(e) => updateSlotSettings('allowWeekendBooking', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{t('admin:clinicConfiguration.slots.allowWeekendBooking')}</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'closed' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">{t('admin:clinicConfiguration.closedDates.title')}</h3>

                {/* Ajouter une fermeture */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">{t('admin:clinicConfiguration.closedDates.addClosure')}</h4>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:clinicConfiguration.closedDates.date')}</label>
                      <input
                        type="date"
                        value={newClosedDate.date}
                        onChange={(e) => setNewClosedDate(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:clinicConfiguration.closedDates.type')}</label>
                      <select
                        value={newClosedDate.type}
                        onChange={(e) => setNewClosedDate(prev => ({ ...prev, type: e.target.value }))}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="holiday">{t('admin:clinicConfiguration.closedDates.holiday')}</option>
                        <option value="maintenance">{t('admin:clinicConfiguration.closedDates.maintenance')}</option>
                        <option value="other">{t('admin:clinicConfiguration.closedDates.other')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:clinicConfiguration.closedDates.reason')}</label>
                      <input
                        type="text"
                        value={newClosedDate.reason}
                        onChange={(e) => setNewClosedDate(prev => ({ ...prev, reason: e.target.value }))}
                        placeholder={t('admin:clinicConfiguration.closedDates.reasonPlaceholder')}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={addClosedDate}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {t('admin:clinicConfiguration.buttons.add')}
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
                            {closedDate.type === 'holiday' ? t('admin:clinicConfiguration.closedDates.holiday') :
                             closedDate.type === 'maintenance' ? t('admin:clinicConfiguration.closedDates.maintenance') : t('admin:clinicConfiguration.closedDates.other')}
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
                    <p className="text-gray-500 text-center py-8">{t('admin:clinicConfiguration.closedDates.noClosed')}</p>
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
            disabled={isSaving}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('admin:clinicConfiguration.buttons.close')}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !config}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('admin:clinicConfiguration.buttons.saving')}
              </>
            ) : (
              t('admin:clinicConfiguration.buttons.save')
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClinicConfigModal;
