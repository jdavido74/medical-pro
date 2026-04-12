// contexts/ClinicSettingsContext.js
// Shared clinic settings (operating days/hours, closed dates, slot config).
// Any component that saves settings via updateSettings() triggers a re-render
// across all consumers — no hard refresh or manual reload needed.

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { clinicSettingsApi } from '../api/clinicSettingsApi';

const ClinicSettingsContext = createContext(null);

export const ClinicSettingsProvider = ({ children }) => {
  const [clinicSettings, setClinicSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const settings = await clinicSettingsApi.getClinicSettings();
      setClinicSettings(settings);
      return settings;
    } catch (err) {
      console.error('[ClinicSettingsContext] Failed to load settings:', err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refresh().catch(() => {
      // Error already logged in refresh(); don't crash the provider
    });
  }, [refresh]);

  // Save settings through the API and update local state so all consumers
  // re-render immediately without a manual refresh.
  const updateSettings = useCallback(async (settingsData) => {
    const saved = await clinicSettingsApi.updateClinicSettings(settingsData);
    setClinicSettings(saved);
    return saved;
  }, []);

  // Add a closed date and refresh to pick up the new entry
  const addClosedDate = useCallback(async (date, reason, type = 'other') => {
    await clinicSettingsApi.addClosedDate(date, reason, type);
    await refresh();
  }, [refresh]);

  // Remove a closed date and refresh
  const removeClosedDate = useCallback(async (dateId) => {
    await clinicSettingsApi.removeClosedDate(dateId);
    await refresh();
  }, [refresh]);

  const value = {
    clinicSettings,
    loading,
    error,
    refresh,
    updateSettings,
    addClosedDate,
    removeClosedDate
  };

  return (
    <ClinicSettingsContext.Provider value={value}>
      {children}
    </ClinicSettingsContext.Provider>
  );
};

export const useClinicSettings = () => {
  const context = useContext(ClinicSettingsContext);
  if (!context) {
    throw new Error('useClinicSettings must be used within ClinicSettingsProvider');
  }
  return context;
};

export default ClinicSettingsContext;
