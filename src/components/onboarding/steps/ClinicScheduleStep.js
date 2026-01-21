/**
 * ClinicScheduleStep - Step for configuring clinic opening hours during onboarding
 *
 * Allows admin to configure:
 * - Operating days (which days the clinic is open)
 * - Operating hours per day (with optional lunch break)
 *
 * This step is important for:
 * - Appointment scheduling
 * - Practitioner availability management
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { baseClient } from '../../../api/baseClient';
import { clinicConfigStorage } from '../../../utils/clinicConfigStorage';
import { Clock, ArrowRight, ArrowLeft, Loader2, Check, X } from 'lucide-react';

const DAYS_OF_WEEK = [
  { id: 'monday', labelKey: 'monday' },
  { id: 'tuesday', labelKey: 'tuesday' },
  { id: 'wednesday', labelKey: 'wednesday' },
  { id: 'thursday', labelKey: 'thursday' },
  { id: 'friday', labelKey: 'friday' },
  { id: 'saturday', labelKey: 'saturday' },
  { id: 'sunday', labelKey: 'sunday' }
];

const DEFAULT_HOURS = {
  morning: { start: '08:00', end: '12:00' },
  afternoon: { start: '14:00', end: '18:00' }
};

const ClinicScheduleStep = ({ onComplete, onBack, canGoBack, isLastStep, isCompleting }) => {
  const { t } = useTranslation('onboarding');

  const [schedule, setSchedule] = useState(() => {
    // Initialize with default schedule
    const defaultSchedule = {};
    DAYS_OF_WEEK.forEach(day => {
      defaultSchedule[day.id] = {
        enabled: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(day.id),
        hasLunchBreak: true,
        morning: { ...DEFAULT_HOURS.morning },
        afternoon: { ...DEFAULT_HOURS.afternoon }
      };
    });
    return defaultSchedule;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load existing schedule if available
  useEffect(() => {
    const config = clinicConfigStorage.getConfig();
    if (config?.operatingHours) {
      setSchedule(prev => ({
        ...prev,
        ...config.operatingHours
      }));
    }
  }, []);

  const toggleDay = (dayId) => {
    setSchedule(prev => ({
      ...prev,
      [dayId]: {
        ...prev[dayId],
        enabled: !prev[dayId].enabled
      }
    }));
  };

  const toggleLunchBreak = (dayId) => {
    setSchedule(prev => ({
      ...prev,
      [dayId]: {
        ...prev[dayId],
        hasLunchBreak: !prev[dayId].hasLunchBreak
      }
    }));
  };

  const updateHours = (dayId, period, field, value) => {
    setSchedule(prev => ({
      ...prev,
      [dayId]: {
        ...prev[dayId],
        [period]: {
          ...prev[dayId][period],
          [field]: value
        }
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate at least one day is enabled
    const hasEnabledDay = Object.values(schedule).some(day => day.enabled);
    if (!hasEnabledDay) {
      setError(t('onboarding.steps.schedule.errors.noDayEnabled'));
      return;
    }

    try {
      setIsLoading(true);

      // Calculate operating days for the backend (0 = Sunday, 1 = Monday, etc.)
      const dayIndexMap = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
        thursday: 4, friday: 5, saturday: 6
      };
      const operatingDays = Object.entries(schedule)
        .filter(([_, config]) => config.enabled)
        .map(([day]) => dayIndexMap[day]);

      // Save to backend - use clinic-settings endpoint for operating hours
      await baseClient.put('/clinic-settings', {
        operating_hours: schedule,
        operating_days: operatingDays
      });

      // Also save locally for offline use
      const config = clinicConfigStorage.getConfig();
      clinicConfigStorage.saveConfig({
        ...config,
        operatingHours: schedule,
        operatingDays
      });

      onComplete({ schedule, operatingDays });
    } catch (error) {
      console.error('[ClinicScheduleStep] Failed to save:', error);
      setError(error.message || t('onboarding.steps.schedule.errors.saveFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  // Apply same hours to all enabled weekdays
  const applyToAllWeekdays = () => {
    const mondayHours = schedule.monday;
    setSchedule(prev => {
      const updated = { ...prev };
      ['tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
        if (prev[day].enabled) {
          updated[day] = {
            ...prev[day],
            hasLunchBreak: mondayHours.hasLunchBreak,
            morning: { ...mondayHours.morning },
            afternoon: { ...mondayHours.afternoon }
          };
        }
      });
      return updated;
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Intro text */}
      <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
        <p>{t('onboarding.steps.schedule.intro')}</p>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Quick action */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={applyToAllWeekdays}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {t('onboarding.steps.schedule.applyToAllWeekdays')}
        </button>
      </div>

      {/* Schedule grid */}
      <div className="space-y-4">
        {DAYS_OF_WEEK.map(day => (
          <div
            key={day.id}
            className={`p-4 rounded-lg border ${
              schedule[day.id].enabled
                ? 'bg-white border-gray-200'
                : 'bg-gray-50 border-gray-100'
            }`}
          >
            {/* Day header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => toggleDay(day.id)}
                  className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                    schedule[day.id].enabled
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {schedule[day.id].enabled ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </button>
                <span className={`font-medium ${
                  schedule[day.id].enabled ? 'text-gray-900' : 'text-gray-400'
                }`}>
                  {t(`onboarding.steps.schedule.days.${day.labelKey}`)}
                </span>
              </div>

              {schedule[day.id].enabled && (
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={schedule[day.id].hasLunchBreak}
                    onChange={() => toggleLunchBreak(day.id)}
                    className="rounded text-blue-600"
                  />
                  <span className="text-gray-600">
                    {t('onboarding.steps.schedule.lunchBreak')}
                  </span>
                </label>
              )}
            </div>

            {/* Time inputs */}
            {schedule[day.id].enabled && (
              <div className="grid grid-cols-2 gap-4 mt-3">
                {/* Morning */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {t('onboarding.steps.schedule.morning')}
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="time"
                      value={schedule[day.id].morning.start}
                      onChange={(e) => updateHours(day.id, 'morning', 'start', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                      type="time"
                      value={schedule[day.id].morning.end}
                      onChange={(e) => updateHours(day.id, 'morning', 'end', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>

                {/* Afternoon (only if lunch break) */}
                {schedule[day.id].hasLunchBreak && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {t('onboarding.steps.schedule.afternoon')}
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="time"
                        value={schedule[day.id].afternoon.start}
                        onChange={(e) => updateHours(day.id, 'afternoon', 'start', e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <span className="text-gray-400">-</span>
                      <input
                        type="time"
                        value={schedule[day.id].afternoon.end}
                        onChange={(e) => updateHours(day.id, 'afternoon', 'end', e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div className="flex justify-between pt-6 border-t">
        {canGoBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center space-x-2 px-6 py-2 text-gray-600 hover:text-gray-900"
            disabled={isLoading}
          >
            <ArrowLeft className="h-5 w-5" />
            <span>{t('onboarding.buttons.back')}</span>
          </button>
        ) : (
          <div />
        )}

        <button
          type="submit"
          disabled={isLoading || isCompleting}
          className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <span>{t('onboarding.buttons.next')}</span>
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default ClinicScheduleStep;
