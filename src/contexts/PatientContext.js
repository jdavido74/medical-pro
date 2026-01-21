/**
 * Contexte réactif et sécurisé pour les patients
 *
 * Version 2.0: API Backend Integration
 * Fournit:
 * - Liste des patients (synchro API)
 * - Opérations multi-tenant (create, update, delete)
 * - Gestion d'erreurs robuste
 * - Optimistic updates via useSyncMutation
 * - Compatibilité complète avec composants existants
 *
 * @see SYNC_ARCHITECTURE.md pour la documentation complète
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { patientsApi } from '../api';

export const PatientContext = createContext();

/**
 * Hook pour accéder au contexte Patient
 * @returns {Object} Contexte patient avec état et opérations
 */
export const usePatients = () => {
  const context = useContext(PatientContext);
  if (!context) {
    throw new Error('usePatients must be used within a PatientProvider');
  }
  return context;
};

export const PatientProvider = ({ children }) => {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Charger les patients au démarrage depuis l'API
   */
  useEffect(() => {
    const loadPatients = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (user) {
          const result = await patientsApi.getPatients({ page: 1, limit: 100 });
          setPatients(result.patients || []);
        }
        setIsInitialized(true);
      } catch (error) {
        console.error('[PatientContext] Error loading patients:', error);
        setError(error.message || 'Failed to load patients');
        setIsInitialized(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadPatients();
  }, [user]);

  /**
   * Créer un patient avec optimistic update
   * 1. Mettre à jour la liste immédiatement (optimistic update)
   * 2. Appeler l'API en background
   * 3. Synchroniser le résultat
   */
  const createPatient = useCallback(
    async (patientData) => {
      try {
        // Effacer l'erreur précédente
        setError(null);

        // ✅ SYNCHRONISATION IMMÉDIATE : Générer ID temporaire
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const optimisticPatient = {
          ...patientData,
          id: tempId,
          createdAt: new Date().toISOString()
        };

        // 1. Mettre à jour la liste IMMÉDIATEMENT (optimistic)
        setPatients((prev) => [...prev, optimisticPatient]);

        // 2. Appeler l'API en background
        const newPatient = await patientsApi.createPatient(patientData);

        // 3. Remplacer le patient temporaire par le patient API
        setPatients((prev) =>
          prev.map((p) => (p.id === tempId ? newPatient : p))
        );

        return newPatient;
      } catch (error) {
        console.error('[PatientContext] Error creating patient:', error);
        // Nettoyer le patient optimiste en cas d'erreur
        setPatients((prev) =>
          prev.filter((p) => !p.id.startsWith('temp_'))
        );
        setError(error.message || 'Failed to create patient');
        throw error;
      }
    },
    []
  );

  /**
   * Mettre à jour un patient
   */
  const updatePatient = useCallback(
    async (patientId, patientData) => {
      try {
        // Effacer l'erreur précédente
        setError(null);

        // Sauvegarder l'état précédent pour rollback
        const previousPatient = patients.find((p) => p.id === patientId);

        // ✅ SYNCHRONISATION IMMÉDIATE : Mettre à jour la liste
        const optimisticPatient = { ...previousPatient, ...patientData };
        setPatients((prev) =>
          prev.map((p) => (p.id === patientId ? optimisticPatient : p))
        );

        // 2. Appeler l'API en background
        const updatedPatient = await patientsApi.updatePatient(patientId, patientData);

        // 3. Mettre à jour avec la réponse API
        setPatients((prev) =>
          prev.map((p) => (p.id === patientId ? updatedPatient : p))
        );

        return updatedPatient;
      } catch (error) {
        console.error('[PatientContext] Error updating patient:', error);
        // Rollback en cas d'erreur
        setPatients((prev) =>
          prev.map((p) =>
            p.id === patientId ? patients.find((x) => x.id === patientId) : p
          )
        );
        setError(error.message || 'Failed to update patient');
        throw error;
      }
    },
    [patients]
  );

  /**
   * Supprimer un patient (soft delete)
   */
  const deletePatient = useCallback(
    async (patientId) => {
      try {
        // Effacer l'erreur précédente
        setError(null);

        // ✅ SYNCHRONISATION IMMÉDIATE : Retirer de la liste
        setPatients((prev) => prev.filter((p) => p.id !== patientId));

        // 2. Appeler l'API en background
        await patientsApi.deletePatient(patientId);

        return { success: true };
      } catch (error) {
        console.error('[PatientContext] Error deleting patient:', error);
        // Rollback en cas d'erreur - recharger les patients
        const result = await patientsApi.getPatients({ page: 1, limit: 100 });
        setPatients(result.patients || []);
        setError(error.message || 'Failed to delete patient');
        throw error;
      }
    },
    []
  );

  /**
   * Obtenir un patient par ID
   */
  const getPatientById = useCallback(
    async (patientId) => {
      try {
        return await patientsApi.getPatientById(patientId);
      } catch (error) {
        console.error('[PatientContext] Error getting patient:', error);
        setError(error.message || 'Failed to fetch patient');
        throw error;
      }
    },
    []
  );

  /**
   * Rechercher des patients localement dans la liste chargée
   * Utile pour le search en temps réel sans appel API
   */
  const searchPatients = useCallback(
    (query) => {
      if (!query) return patients;

      const lowerQuery = query.toLowerCase();
      return patients.filter((patient) => {
        const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
        const email = patient.contact?.email?.toLowerCase() || '';
        const phone = patient.contact?.phone?.toLowerCase() || '';
        const patientNumber = patient.patientNumber?.toLowerCase() || '';

        return (
          fullName.includes(lowerQuery) ||
          email.includes(lowerQuery) ||
          phone.includes(lowerQuery) ||
          patientNumber.includes(lowerQuery)
        );
      });
    },
    [patients]
  );

  /**
   * Vérifier si l'utilisateur peut créer des patients
   * Basé sur les rôles de l'utilisateur depuis AuthContext
   */
  const canCreatePatient = useCallback(() => {
    if (!user) return false;
    // Vérifier le rôle - admin, secretary, doctor peuvent créer des patients
    return ['admin', 'secretary', 'doctor', 'super_admin'].includes(user.role);
  }, [user]);

  /**
   * Vérifier si l'utilisateur peut voir les données sensibles
   * Basé sur les rôles de l'utilisateur
   */
  const canViewSensitiveData = useCallback(() => {
    if (!user) return false;
    // Tous les rôles authentifiés peuvent voir
    return true;
  }, [user]);

  /**
   * Vérifier si un patient existe déjà (par email ou nom) - recherche locale
   * Utile pour la validation de doublons avant création
   */
  const checkDuplicate = useCallback(
    (firstName, lastName, email) => {
      if (!firstName || !lastName) return null;

      const duplicate = patients.find(patient => {
        const nameMatch =
          patient.firstName?.toLowerCase() === firstName?.toLowerCase() &&
          patient.lastName?.toLowerCase() === lastName?.toLowerCase();

        const emailMatch = email && patient.contact?.email?.toLowerCase() === email?.toLowerCase();

        return nameMatch || (email && emailMatch);
      });

      return duplicate || null;
    },
    [patients]
  );

  /**
   * Obtenir les statistiques sur les patients
   */
  const getPatientStatistics = useCallback(() => {
    return {
      total: patients.length,
      active: patients.filter(p => p.status === 'active').length,
      inactive: patients.filter(p => p.status !== 'active').length,
      incomplete: patients.filter(p => p.isIncomplete).length,
      deleted: patients.filter(p => p.deleted).length
    };
  }, [patients]);

  /**
   * Obtenir les patients incomplets (créés en mode rapide)
   */
  const getIncompletePatients = useCallback(() => {
    return patients.filter(p => p.isIncomplete && !p.deleted);
  }, [patients]);

  /**
   * Compléter un patient (passer de incomplete à complete)
   */
  const completePatient = useCallback(
    async (patientId, additionalData) => {
      try {
        return await updatePatient(patientId, {
          ...additionalData,
          isIncomplete: false
        }, {
          reason: 'Patient profile completed'
        });
      } catch (error) {
        console.error('[PatientContext] Error completing patient:', error);
        throw error;
      }
    },
    [updatePatient]
  );

  /**
   * Effacer l'erreur du contexte
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    // État
    patients,
    isLoading,
    error,
    isInitialized,

    // Opérations principales
    createPatient,
    updatePatient,
    deletePatient,
    getPatientById,
    searchPatients,

    // Opérations utilitaires
    checkDuplicate,
    getPatientStatistics,
    getIncompletePatients,
    completePatient,
    clearError,

    // Permissions
    canCreatePatient,
    canViewSensitiveData
  };

  return (
    <PatientContext.Provider value={value}>
      {children}
    </PatientContext.Provider>
  );
};

export default PatientContext;
