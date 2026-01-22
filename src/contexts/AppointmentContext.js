/**
 * Contexte réactif et sécurisé pour les rendez-vous
 *
 * Version 2.0: API Backend Integration
 * Fournit:
 * - Liste des rendez-vous (synchro API)
 * - Opérations multi-tenant (create, update, delete)
 * - Gestion d'erreurs robuste
 * - Optimistic updates pour synchronicity immédiate
 * - Compatibilité complète avec composants existants
 *
 * @see SYNC_ARCHITECTURE.md pour la documentation complète
 */

import React, { createContext, useCallback, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { appointmentsApi } from '../api';

export const AppointmentContext = createContext();

export const AppointmentProvider = ({ children }) => {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Log on mount
  console.log('[AppointmentProvider] Mounted/Rendered - user:', user?.email || 'null', 'authLoading:', authLoading, 'isAuthenticated:', isAuthenticated);

  /**
   * Charger les rendez-vous au démarrage depuis l'API
   * Attendre que l'authentification soit terminée avant de charger
   */
  useEffect(() => {
    // Log immédiat pour vérifier que useEffect est déclenché
    console.log('[AppointmentContext] useEffect triggered - authLoading:', authLoading, 'isAuthenticated:', isAuthenticated, 'user:', user?.email || 'null');

    // Attendre que l'authentification soit terminée
    if (authLoading) {
      console.log('[AppointmentContext] Auth still loading, waiting...');
      return;
    }

    const loadAppointments = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (user && isAuthenticated) {
          console.log('[AppointmentContext] Loading appointments for user:', user.email);
          try {
            const result = await appointmentsApi.getAppointments({ page: 1, limit: 500 });
            console.log('[AppointmentContext] API response:', result);
            console.log('[AppointmentContext] Loaded appointments:', result.appointments?.length || 0);
            setAppointments(result.appointments || []);
          } catch (apiError) {
            console.error('[AppointmentContext] API call failed:', apiError);
            throw apiError;
          }
        } else {
          console.log('[AppointmentContext] No user or not authenticated, skipping appointment load');
        }
        setIsInitialized(true);
      } catch (error) {
        console.error('[AppointmentContext] Error loading appointments:', error);
        setError(error.message || 'Failed to load appointments');
        setIsInitialized(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadAppointments();
  }, [user, authLoading, isAuthenticated]);

  /**
   * Créer un rendez-vous avec optimistic update
   */
  const createAppointment = useCallback(
    async (appointmentData) => {
      try {
        // ✅ SYNCHRONISATION IMMÉDIATE : Générer ID temporaire
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const optimisticAppointment = {
          ...appointmentData,
          id: tempId,
          createdAt: new Date().toISOString()
        };

        // 1. Mettre à jour la liste IMMÉDIATEMENT (optimistic)
        setAppointments((prev) => [...prev, optimisticAppointment]);

        // 2. Appeler l'API en background
        const newAppointment = await appointmentsApi.createAppointment(appointmentData);

        // 3. Remplacer le rendez-vous temporaire par le rendez-vous API
        setAppointments((prev) =>
          prev.map((a) => (a.id === tempId ? newAppointment : a))
        );

        return newAppointment;
      } catch (error) {
        console.error('[AppointmentContext] Error creating appointment:', error);
        // Nettoyer le rendez-vous optimiste en cas d'erreur
        setAppointments((prev) =>
          prev.filter((a) => !a.id.startsWith('temp_'))
        );
        setError(error.message || 'Failed to create appointment');
        throw error;
      }
    },
    []
  );

  /**
   * Mettre à jour un rendez-vous
   */
  const updateAppointment = useCallback(
    async (appointmentId, appointmentData) => {
      try {
        // Sauvegarder l'état précédent pour rollback
        const previousAppointment = appointments.find((a) => a.id === appointmentId);

        // ✅ SYNCHRONISATION IMMÉDIATE : Mettre à jour la liste
        const optimisticAppointment = { ...previousAppointment, ...appointmentData };
        setAppointments((prev) =>
          prev.map((a) => (a.id === appointmentId ? optimisticAppointment : a))
        );

        // 2. Appeler l'API en background
        const updatedAppointment = await appointmentsApi.updateAppointment(appointmentId, appointmentData);

        // 3. Mettre à jour avec la réponse API
        setAppointments((prev) =>
          prev.map((a) => (a.id === appointmentId ? updatedAppointment : a))
        );

        return updatedAppointment;
      } catch (error) {
        console.error('[AppointmentContext] Error updating appointment:', error);
        // Rollback en cas d'erreur
        setAppointments((prev) =>
          prev.map((a) =>
            a.id === appointmentId ? appointments.find((x) => x.id === appointmentId) : a
          )
        );
        setError(error.message || 'Failed to update appointment');
        throw error;
      }
    },
    [appointments]
  );

  /**
   * Supprimer un rendez-vous (soft delete)
   */
  const deleteAppointment = useCallback(
    async (appointmentId) => {
      try {
        // ✅ SYNCHRONISATION IMMÉDIATE : Retirer de la liste
        setAppointments((prev) => prev.filter((a) => a.id !== appointmentId));

        // 2. Appeler l'API en background
        await appointmentsApi.deleteAppointment(appointmentId);

        return { success: true };
      } catch (error) {
        console.error('[AppointmentContext] Error deleting appointment:', error);
        // Rollback en cas d'erreur - recharger les rendez-vous
        const result = await appointmentsApi.getAppointments({ page: 1, limit: 500 });
        setAppointments(result.appointments || []);
        setError(error.message || 'Failed to delete appointment');
        throw error;
      }
    },
    []
  );

  /**
   * Obtenir un rendez-vous par ID
   */
  const getAppointmentById = useCallback(
    async (appointmentId) => {
      try {
        return await appointmentsApi.getAppointmentById(appointmentId);
      } catch (error) {
        console.error('[AppointmentContext] Error getting appointment:', error);
        setError(error.message || 'Failed to fetch appointment');
        throw error;
      }
    },
    []
  );

  /**
   * Filtrer les rendez-vous par patient
   */
  const getAppointmentsByPatient = useCallback(
    (patientId) => {
      return appointments.filter((apt) => apt.patientId === patientId);
    },
    [appointments]
  );

  /**
   * Filtrer les rendez-vous par praticien
   */
  const getAppointmentsByPractitioner = useCallback(
    (practitionerId) => {
      return appointments.filter((apt) => apt.practitionerId === practitionerId);
    },
    [appointments]
  );

  /**
   * Filtrer les rendez-vous par date
   */
  const getAppointmentsByDate = useCallback(
    (date) => {
      return appointments.filter((apt) => apt.date === date);
    },
    [appointments]
  );

  /**
   * Obtenir les rendez-vous à venir
   */
  const getUpcomingAppointments = useCallback(
    (days = 7) => {
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + days);

      return appointments.filter((apt) => {
        const aptDate = new Date(apt.date);
        return aptDate >= today && aptDate <= futureDate;
      });
    },
    [appointments]
  );

  /**
   * Vérifier les conflits de créneau
   */
  const checkTimeConflict = useCallback(
    (practitionerId, date, startTime, endTime, excludeAppointmentId = null) => {
      return appointments.some((apt) => {
        if (apt.id === excludeAppointmentId) return false;
        if (apt.practitionerId !== practitionerId || apt.date !== date) return false;

        // Vérifier le chevauchement des heures
        return !(endTime <= apt.startTime || startTime >= apt.endTime);
      });
    },
    [appointments]
  );

  /**
   * Vérifier si l'utilisateur peut créer des rendez-vous
   * Basé sur les rôles de l'utilisateur
   */
  const canCreateAppointment = useCallback(() => {
    if (!user) return false;
    // admin, secretary, doctor peuvent créer des rendez-vous
    return ['admin', 'secretary', 'doctor', 'super_admin'].includes(user.role);
  }, [user]);

  /**
   * Vérifier si l'utilisateur peut voir les données sensibles
   */
  const canViewSensitiveData = useCallback(() => {
    if (!user) return false;
    // Tous les rôles authentifiés peuvent voir
    return true;
  }, [user]);

  const value = {
    // État
    appointments,
    isLoading,
    error,
    isInitialized,

    // Opérations
    createAppointment,
    updateAppointment,
    deleteAppointment,
    getAppointmentById,

    // Filtres
    getAppointmentsByPatient,
    getAppointmentsByPractitioner,
    getAppointmentsByDate,
    getUpcomingAppointments,

    // Vérifications
    checkTimeConflict,

    // Permissions
    canCreateAppointment,
    canViewSensitiveData
  };

  return (
    <AppointmentContext.Provider value={value}>
      {children}
    </AppointmentContext.Provider>
  );
};

export default AppointmentContext;
