/**
 * Contexte pour les dossiers medicaux
 *
 * Version 2.0: API Backend Integration
 * Fournit:
 * - Liste des dossiers medicaux (synchro API)
 * - Operations CRUD avec optimistic updates
 * - Signature et verrouillage des dossiers
 * - Filtrage par patient, type, praticien
 * - Conformite RGPD et Secret Medical (Art. L1110-4 CSP)
 *
 * @see SYNC_ARCHITECTURE.md pour la documentation complete
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { medicalRecordsApi } from '../api';

export const MedicalRecordContext = createContext();

export const MedicalRecordProvider = ({ children }) => {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statistics, setStatistics] = useState(null);

  /**
   * Charger les dossiers medicaux au demarrage depuis l'API
   */
  useEffect(() => {
    const loadRecords = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (user) {
          const result = await medicalRecordsApi.getMedicalRecords({ page: 1, limit: 100 });
          setRecords(result.records || []);
        }
        setIsInitialized(true);
      } catch (error) {
        console.error('[MedicalRecordContext] Error loading records:', error);
        setError(error.message || 'Failed to load medical records');
        setIsInitialized(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadRecords();
  }, [user]);

  /**
   * Recharger les dossiers medicaux
   */
  const refreshRecords = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await medicalRecordsApi.getMedicalRecords({ page: 1, limit: 100 });
      setRecords(result.records || []);
    } catch (error) {
      console.error('[MedicalRecordContext] Error refreshing records:', error);
      setError(error.message || 'Failed to refresh medical records');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Charger les statistiques
   */
  const loadStatistics = useCallback(async () => {
    try {
      const stats = await medicalRecordsApi.getStatistics();
      setStatistics(stats);
      return stats;
    } catch (error) {
      console.error('[MedicalRecordContext] Error loading statistics:', error);
      throw error;
    }
  }, []);

  /**
   * Creer un dossier medical avec optimistic update
   */
  const createRecord = useCallback(
    async (recordData) => {
      try {
        setError(null);

        // Optimistic update
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const optimisticRecord = {
          ...recordData,
          id: tempId,
          status: 'draft',
          createdAt: new Date().toISOString()
        };

        setRecords((prev) => [...prev, optimisticRecord]);

        // API call
        const newRecord = await medicalRecordsApi.createMedicalRecord(recordData);

        // Replace temp with real
        setRecords((prev) =>
          prev.map((r) => (r.id === tempId ? newRecord : r))
        );

        return newRecord;
      } catch (error) {
        console.error('[MedicalRecordContext] Error creating record:', error);
        setRecords((prev) =>
          prev.filter((r) => !r.id.startsWith('temp_'))
        );
        setError(error.message || 'Failed to create medical record');
        throw error;
      }
    },
    []
  );

  /**
   * Mettre a jour un dossier medical
   */
  const updateRecord = useCallback(
    async (recordId, recordData) => {
      try {
        setError(null);

        const previousRecord = records.find((r) => r.id === recordId);

        // Check if record is locked
        if (previousRecord?.isLocked) {
          throw new Error('Cannot modify a signed/locked medical record');
        }

        // Optimistic update
        const optimisticRecord = { ...previousRecord, ...recordData };
        setRecords((prev) =>
          prev.map((r) => (r.id === recordId ? optimisticRecord : r))
        );

        // API call
        const updatedRecord = await medicalRecordsApi.updateMedicalRecord(recordId, recordData);

        // Update with API response
        setRecords((prev) =>
          prev.map((r) => (r.id === recordId ? updatedRecord : r))
        );

        return updatedRecord;
      } catch (error) {
        console.error('[MedicalRecordContext] Error updating record:', error);
        // Rollback
        setRecords((prev) =>
          prev.map((r) =>
            r.id === recordId ? records.find((x) => x.id === recordId) : r
          )
        );
        setError(error.message || 'Failed to update medical record');
        throw error;
      }
    },
    [records]
  );

  /**
   * Signer et verrouiller un dossier medical
   */
  const signRecord = useCallback(
    async (recordId) => {
      try {
        setError(null);

        // Optimistic update
        setRecords((prev) =>
          prev.map((r) =>
            r.id === recordId
              ? { ...r, isLocked: true, signedAt: new Date().toISOString(), status: 'signed' }
              : r
          )
        );

        // API call
        const signedRecord = await medicalRecordsApi.signMedicalRecord(recordId);

        // Update with API response
        setRecords((prev) =>
          prev.map((r) => (r.id === recordId ? signedRecord : r))
        );

        return signedRecord;
      } catch (error) {
        console.error('[MedicalRecordContext] Error signing record:', error);
        await refreshRecords();
        setError(error.message || 'Failed to sign medical record');
        throw error;
      }
    },
    [refreshRecords]
  );

  /**
   * Archiver un dossier medical (soft delete)
   */
  const archiveRecord = useCallback(
    async (recordId) => {
      try {
        setError(null);

        // Optimistic update
        setRecords((prev) => prev.filter((r) => r.id !== recordId));

        // API call
        await medicalRecordsApi.archiveMedicalRecord(recordId);

        return { success: true };
      } catch (error) {
        console.error('[MedicalRecordContext] Error archiving record:', error);
        await refreshRecords();
        setError(error.message || 'Failed to archive medical record');
        throw error;
      }
    },
    [refreshRecords]
  );

  /**
   * Restaurer un dossier archive
   */
  const restoreRecord = useCallback(
    async (recordId) => {
      try {
        setError(null);

        // API call
        const restoredRecord = await medicalRecordsApi.restoreMedicalRecord(recordId);

        // Add back to list
        setRecords((prev) => [...prev, restoredRecord]);

        return restoredRecord;
      } catch (error) {
        console.error('[MedicalRecordContext] Error restoring record:', error);
        setError(error.message || 'Failed to restore medical record');
        throw error;
      }
    },
    []
  );

  /**
   * Obtenir un dossier medical par ID
   */
  const getRecordById = useCallback(
    async (recordId) => {
      try {
        return await medicalRecordsApi.getMedicalRecordById(recordId);
      } catch (error) {
        console.error('[MedicalRecordContext] Error getting record:', error);
        setError(error.message || 'Failed to fetch medical record');
        throw error;
      }
    },
    []
  );

  /**
   * Obtenir les dossiers d'un patient via API
   */
  const getPatientRecords = useCallback(
    async (patientId) => {
      try {
        const result = await medicalRecordsApi.getPatientMedicalRecords(patientId);
        return result;
      } catch (error) {
        console.error('[MedicalRecordContext] Error getting patient records:', error);
        throw error;
      }
    },
    []
  );

  /**
   * Filtrer les dossiers par patient (local)
   */
  const getRecordsByPatient = useCallback(
    (patientId) => {
      return records.filter((record) => record.patientId === patientId);
    },
    [records]
  );

  /**
   * Filtrer les dossiers par type (local)
   */
  const getRecordsByType = useCallback(
    (recordType) => {
      return records.filter((record) => record.recordType === recordType);
    },
    [records]
  );

  /**
   * Filtrer les dossiers par praticien (local)
   */
  const getRecordsByProvider = useCallback(
    (providerId) => {
      return records.filter((record) => record.providerId === providerId);
    },
    [records]
  );

  /**
   * Obtenir les dossiers recents
   */
  const getRecentRecords = useCallback(
    (days = 7) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      return records.filter((record) => {
        const recordDate = new Date(record.createdAt);
        return recordDate >= cutoffDate;
      });
    },
    [records]
  );

  /**
   * Obtenir les dossiers en brouillon
   */
  const getDraftRecords = useCallback(() => {
    return records.filter((record) => record.status === 'draft');
  }, [records]);

  /**
   * Obtenir les statistiques des dossiers (local)
   */
  const getRecordStatistics = useCallback(() => {
    return {
      total: records.length,
      draft: records.filter((r) => r.status === 'draft').length,
      signed: records.filter((r) => r.status === 'signed' || r.isLocked).length,
      archived: records.filter((r) => r.isArchived).length,
      byType: records.reduce((acc, r) => {
        acc[r.recordType] = (acc[r.recordType] || 0) + 1;
        return acc;
      }, {})
    };
  }, [records]);

  /**
   * Rechercher dans les dossiers (local)
   */
  const searchRecords = useCallback(
    (query) => {
      if (!query) return records;

      const lowerQuery = query.toLowerCase();
      return records.filter((record) => {
        const content = record.content?.toLowerCase() || '';
        const diagnosis = record.diagnosis?.toLowerCase() || '';
        const notes = record.notes?.toLowerCase() || '';

        return (
          content.includes(lowerQuery) ||
          diagnosis.includes(lowerQuery) ||
          notes.includes(lowerQuery)
        );
      });
    },
    [records]
  );

  /**
   * Verifier si l'utilisateur peut creer des dossiers medicaux
   */
  const canCreateRecord = useCallback(() => {
    if (!user) return false;
    return ['doctor', 'physician', 'practitioner', 'super_admin'].includes(user.role);
  }, [user]);

  /**
   * Verifier si l'utilisateur peut voir les dossiers medicaux
   */
  const canViewRecords = useCallback(() => {
    if (!user) return false;
    return ['doctor', 'physician', 'practitioner', 'admin', 'super_admin', 'readonly'].includes(user.role);
  }, [user]);

  /**
   * Verifier si l'utilisateur peut signer des dossiers
   */
  const canSignRecord = useCallback(() => {
    if (!user) return false;
    return ['doctor', 'physician', 'super_admin'].includes(user.role);
  }, [user]);

  /**
   * Effacer l'erreur
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    // Etat
    records,
    isLoading,
    error,
    isInitialized,
    statistics,

    // Operations principales
    createRecord,
    updateRecord,
    archiveRecord,
    restoreRecord,
    signRecord,
    getRecordById,
    getPatientRecords,
    refreshRecords,
    loadStatistics,

    // Filtres locaux
    getRecordsByPatient,
    getRecordsByType,
    getRecordsByProvider,
    getRecentRecords,
    getDraftRecords,
    searchRecords,

    // Statistiques
    getRecordStatistics,

    // Permissions
    canCreateRecord,
    canViewRecords,
    canSignRecord,

    // Utilitaires
    clearError
  };

  return (
    <MedicalRecordContext.Provider value={value}>
      {children}
    </MedicalRecordContext.Provider>
  );
};

/**
 * Hook pour utiliser le contexte des dossiers medicaux
 */
export const useMedicalRecords = () => {
  const context = useContext(MedicalRecordContext);
  if (!context) {
    throw new Error('useMedicalRecords must be used within a MedicalRecordProvider');
  }
  return context;
};

export default MedicalRecordContext;
