/**
 * PractitionerAvailabilityWeekly Component
 *
 * Manages practitioner availability per calendar week.
 * Features:
 * - Week navigation (previous/next)
 * - Day-by-day availability configuration
 * - Copy from previous week
 * - Apply/save template
 * - Visual indication of clinic hours
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Save,
  FileText,
  Clock,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Calendar,
  Loader2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { practitionerAvailabilityApi } from '../../api/practitionerAvailabilityApi';

// Day names for display and data mapping
const DAYS = [
  { key: 'monday', labelKey: 'monday' },
  { key: 'tuesday', labelKey: 'tuesday' },
  { key: 'wednesday', labelKey: 'wednesday' },
  { key: 'thursday', labelKey: 'thursday' },
  { key: 'friday', labelKey: 'friday' },
  { key: 'saturday', labelKey: 'saturday' },
  { key: 'sunday', labelKey: 'sunday' }
];

// Default empty availability
const EMPTY_AVAILABILITY = {
  monday: { enabled: false, slots: [] },
  tuesday: { enabled: false, slots: [] },
  wednesday: { enabled: false, slots: [] },
  thursday: { enabled: false, slots: [] },
  friday: { enabled: false, slots: [] },
  saturday: { enabled: false, slots: [] },
  sunday: { enabled: false, slots: [] }
};

const PractitionerAvailabilityWeekly = ({
  providerId,
  providerName = '',
  canEdit = true,
  onSave,
  clinicHours = null
}) => {
  const { t } = useTranslation(['common', 'admin']);

  // Current week state
  const [currentYear, setCurrentYear] = useState(() => {
    const { year } = practitionerAvailabilityApi.getYearAndWeek(new Date());
    return year;
  });
  const [currentWeek, setCurrentWeek] = useState(() => {
    const { week } = practitionerAvailabilityApi.getYearAndWeek(new Date());
    return week;
  });

  // Availability data
  const [availability, setAvailability] = useState(EMPTY_AVAILABILITY);
  const [source, setSource] = useState('default');
  const [hasSpecificEntry, setHasSpecificEntry] = useState(false);
  const [notes, setNotes] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Week days for display
  const weekDays = practitionerAvailabilityApi.getWeekDays(currentYear, currentWeek);

  // Load availability for current week
  const loadAvailability = useCallback(async () => {
    if (!providerId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await practitionerAvailabilityApi.getWeekAvailability(
        providerId,
        currentYear,
        currentWeek
      );

      setAvailability(data.availability || EMPTY_AVAILABILITY);
      setSource(data.source || 'default');
      setHasSpecificEntry(data.hasSpecificEntry || false);
      setNotes(data.notes || '');
      setHasChanges(false);
    } catch (err) {
      console.error('[PractitionerAvailabilityWeekly] Error loading:', err);
      setError(t('common:errors.loadFailed', 'Erreur lors du chargement'));
      setAvailability(EMPTY_AVAILABILITY);
    } finally {
      setIsLoading(false);
    }
  }, [providerId, currentYear, currentWeek, t]);

  // Load on mount and when week changes
  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  // Clear success message after delay
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Navigate weeks
  const navigateWeek = (direction) => {
    let newWeek = currentWeek + direction;
    let newYear = currentYear;

    if (newWeek < 1) {
      newYear--;
      newWeek = practitionerAvailabilityApi.getWeeksInYear(newYear);
    } else if (newWeek > practitionerAvailabilityApi.getWeeksInYear(currentYear)) {
      newYear++;
      newWeek = 1;
    }

    setCurrentWeek(newWeek);
    setCurrentYear(newYear);
  };

  // Go to today's week
  const goToToday = () => {
    const { year, week } = practitionerAvailabilityApi.getYearAndWeek(new Date());
    setCurrentYear(year);
    setCurrentWeek(week);
  };

  // Toggle day enabled/disabled
  const toggleDay = (dayKey) => {
    if (!canEdit) return;

    setAvailability(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        enabled: !prev[dayKey].enabled,
        slots: !prev[dayKey].enabled && prev[dayKey].slots.length === 0
          ? [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }]
          : prev[dayKey].slots
      }
    }));
    setHasChanges(true);
  };

  // Add slot to a day
  const addSlot = (dayKey) => {
    if (!canEdit) return;

    setAvailability(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        slots: [...prev[dayKey].slots, { start: '09:00', end: '12:00' }]
      }
    }));
    setHasChanges(true);
  };

  // Remove slot from a day
  const removeSlot = (dayKey, slotIndex) => {
    if (!canEdit) return;

    setAvailability(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        slots: prev[dayKey].slots.filter((_, i) => i !== slotIndex)
      }
    }));
    setHasChanges(true);
  };

  // Update slot time
  const updateSlotTime = (dayKey, slotIndex, field, value) => {
    if (!canEdit) return;

    setAvailability(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        slots: prev[dayKey].slots.map((slot, i) =>
          i === slotIndex ? { ...slot, [field]: value } : slot
        )
      }
    }));
    setHasChanges(true);
  };

  // Save availability
  const handleSave = async () => {
    if (!canEdit || !hasChanges) return;

    setIsSaving(true);
    setError(null);

    try {
      await practitionerAvailabilityApi.saveWeekAvailability(
        providerId,
        currentYear,
        currentWeek,
        availability,
        notes
      );

      setHasChanges(false);
      setHasSpecificEntry(true);
      setSource('manual');
      setSuccessMessage(t('common:success.saved', 'Enregistré avec succès'));

      if (onSave) {
        onSave(availability);
      }
    } catch (err) {
      console.error('[PractitionerAvailabilityWeekly] Save error:', err);
      setError(t('common:errors.saveFailed', 'Erreur lors de la sauvegarde'));
    } finally {
      setIsSaving(false);
    }
  };

  // Copy from previous week
  const handleCopyPreviousWeek = async () => {
    if (!canEdit) return;

    setIsSaving(true);
    setError(null);

    try {
      const data = await practitionerAvailabilityApi.copyFromPreviousWeek(
        providerId,
        currentYear,
        currentWeek
      );

      setAvailability(data.availability || EMPTY_AVAILABILITY);
      setSource('copied');
      setHasSpecificEntry(true);
      setHasChanges(false);
      setSuccessMessage(t('admin:availability.copiedFromPrevious', 'Copié depuis la semaine précédente'));
    } catch (err) {
      console.error('[PractitionerAvailabilityWeekly] Copy error:', err);
      setError(t('common:errors.copyFailed', 'Erreur lors de la copie'));
    } finally {
      setIsSaving(false);
    }
  };

  // Apply template
  const handleApplyTemplate = async () => {
    if (!canEdit) return;

    setIsSaving(true);
    setError(null);

    try {
      const data = await practitionerAvailabilityApi.applyTemplate(
        providerId,
        currentYear,
        currentWeek
      );

      setAvailability(data.availability || EMPTY_AVAILABILITY);
      setSource('template');
      setHasSpecificEntry(true);
      setHasChanges(false);
      setSuccessMessage(t('admin:availability.templateApplied', 'Template appliqué'));
    } catch (err) {
      console.error('[PractitionerAvailabilityWeekly] Apply template error:', err);
      setError(t('common:errors.applyFailed', 'Erreur lors de l\'application du template'));
    } finally {
      setIsSaving(false);
    }
  };

  // Save as template
  const handleSaveAsTemplate = async () => {
    if (!canEdit) return;

    setIsSaving(true);
    setError(null);

    try {
      await practitionerAvailabilityApi.saveTemplate(providerId, availability);
      setSuccessMessage(t('admin:availability.templateSaved', 'Template sauvegardé'));
    } catch (err) {
      console.error('[PractitionerAvailabilityWeekly] Save template error:', err);
      setError(t('common:errors.saveFailed', 'Erreur lors de la sauvegarde du template'));
    } finally {
      setIsSaving(false);
    }
  };

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  // Check if a day is today
  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Get source badge color
  const getSourceBadge = () => {
    const badges = {
      manual: { color: 'bg-blue-100 text-blue-800', label: t('admin:availability.manual', 'Manuel') },
      copied: { color: 'bg-purple-100 text-purple-800', label: t('admin:availability.copied', 'Copié') },
      template: { color: 'bg-green-100 text-green-800', label: t('admin:availability.template', 'Template') },
      default: { color: 'bg-gray-100 text-gray-800', label: t('admin:availability.default', 'Défaut') }
    };
    return badges[source] || badges.default;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">{t('common:loading', 'Chargement...')}</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header with week navigation */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">
              {t('admin:availability.title', 'Disponibilités')}
              {providerName && <span className="text-gray-500 font-normal"> - {providerName}</span>}
            </h3>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSourceBadge().color}`}>
              {getSourceBadge().label}
            </span>
          </div>

          {/* Week navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateWeek(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title={t('admin:availability.previousWeek', 'Semaine précédente')}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm font-medium bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Calendar className="h-4 w-4 inline mr-1" />
              {t('admin:availability.today', "Aujourd'hui")}
            </button>

            <div className="px-4 py-1.5 bg-gray-100 rounded-lg text-center min-w-[160px]">
              <span className="font-semibold text-gray-900">
                {t('admin:availability.week', 'Semaine')} {currentWeek}
              </span>
              <span className="text-gray-500 ml-2">{currentYear}</span>
            </div>

            <button
              onClick={() => navigateWeek(1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title={t('admin:availability.nextWeek', 'Semaine suivante')}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Action buttons */}
        {canEdit && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopyPreviousWeek}
              disabled={isSaving}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Copy className="h-4 w-4" />
              {t('admin:availability.copyPrevious', 'Copier semaine précédente')}
            </button>

            <button
              onClick={handleApplyTemplate}
              disabled={isSaving}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              {t('admin:availability.applyTemplate', 'Appliquer mon template')}
            </button>

            <button
              onClick={handleSaveAsTemplate}
              disabled={isSaving}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {t('admin:availability.saveAsTemplate', 'Sauvegarder comme template')}
            </button>

            {hasChanges && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 ml-auto"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {t('common:save', 'Enregistrer')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="mx-4 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span className="text-green-700">{successMessage}</span>
        </div>
      )}

      {/* Days grid */}
      <div className="p-4">
        <div className="grid grid-cols-7 gap-3">
          {DAYS.map((day, index) => {
            const dayData = availability[day.key] || { enabled: false, slots: [] };
            const dayDate = weekDays[index];
            const dayIsToday = isToday(dayDate);

            return (
              <div
                key={day.key}
                className={`rounded-lg border ${
                  dayIsToday
                    ? 'border-blue-300 bg-blue-50'
                    : dayData.enabled
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                {/* Day header */}
                <div
                  className={`p-3 border-b ${
                    dayIsToday
                      ? 'border-blue-200'
                      : dayData.enabled
                      ? 'border-green-200'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`font-semibold ${dayIsToday ? 'text-blue-700' : 'text-gray-900'}`}>
                        {t(`common:days.${day.labelKey}`, day.key)}
                      </div>
                      <div className={`text-sm ${dayIsToday ? 'text-blue-600' : 'text-gray-500'}`}>
                        {formatDate(dayDate)}
                      </div>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => toggleDay(day.key)}
                        className={`relative w-10 h-6 rounded-full transition-colors ${
                          dayData.enabled ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            dayData.enabled ? 'translate-x-4' : ''
                          }`}
                        />
                      </button>
                    )}
                  </div>
                </div>

                {/* Slots */}
                <div className="p-2 min-h-[120px]">
                  {dayData.enabled ? (
                    <>
                      {dayData.slots.map((slot, slotIndex) => (
                        <div key={slotIndex} className="flex items-center gap-1 mb-2">
                          <div className="flex items-center gap-1 flex-1">
                            <input
                              type="time"
                              value={slot.start}
                              onChange={(e) => updateSlotTime(day.key, slotIndex, 'start', e.target.value)}
                              disabled={!canEdit}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                            />
                            <span className="text-gray-400">-</span>
                            <input
                              type="time"
                              value={slot.end}
                              onChange={(e) => updateSlotTime(day.key, slotIndex, 'end', e.target.value)}
                              disabled={!canEdit}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                            />
                          </div>
                          {canEdit && (
                            <button
                              onClick={() => removeSlot(day.key, slotIndex)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}

                      {canEdit && (
                        <button
                          onClick={() => addSlot(day.key)}
                          className="w-full mt-2 px-2 py-1.5 text-sm text-blue-600 border border-dashed border-blue-300 rounded hover:bg-blue-50 transition-colors flex items-center justify-center gap-1"
                        >
                          <Plus className="h-4 w-4" />
                          {t('admin:availability.addSlot', 'Ajouter')}
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                      <Clock className="h-4 w-4 mr-1" />
                      {t('admin:availability.closed', 'Fermé')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      {canEdit && (
        <div className="p-4 border-t border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('admin:availability.notes', 'Notes')}
          </label>
          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setHasChanges(true);
            }}
            placeholder={t('admin:availability.notesPlaceholder', 'Notes pour cette semaine...')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={2}
          />
        </div>
      )}
    </div>
  );
};

export default PractitionerAvailabilityWeekly;
