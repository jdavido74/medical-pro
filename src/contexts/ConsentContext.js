/**
 * Contexte pour les consentements patients
 *
 * Version 2.0: API Backend Integration
 * Fournit:
 * - Liste des consentements (synchro API)
 * - Opérations CRUD avec optimistic updates
 * - Signature electronique (GDPR-compliant)
 * - Filtrage par patient, type, statut
 * - Gestion d'erreurs robuste
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { consentsApi } from '../api';

export const ConsentContext = createContext();

export const ConsentProvider = ({ children }) => {
  const { user } = useAuth();
  const [consents, setConsents] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Charger les consentements au demarrage depuis l'API
   */
  useEffect(() => {
    const loadConsents = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (user) {
          const result = await consentsApi.getConsents({ page: 1, limit: 100 });
          setConsents(result.consents || []);
        }
        setIsInitialized(true);
      } catch (error) {
        console.error('[ConsentContext] Error loading consents:', error);
        setError(error.message || 'Failed to load consents');
        setIsInitialized(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadConsents();
  }, [user]);

  /**
   * Recharger les consentements
   */
  const refreshConsents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await consentsApi.getConsents({ page: 1, limit: 100 });
      setConsents(result.consents || []);
    } catch (error) {
      console.error('[ConsentContext] Error refreshing consents:', error);
      setError(error.message || 'Failed to refresh consents');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Creer un consentement avec optimistic update
   */
  const createConsent = useCallback(
    async (consentData) => {
      try {
        setError(null);

        // Optimistic update
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const optimisticConsent = {
          ...consentData,
          id: tempId,
          status: 'pending',
          createdAt: new Date().toISOString()
        };

        setConsents((prev) => [...prev, optimisticConsent]);

        // API call
        const newConsent = await consentsApi.createConsent(consentData);

        // Replace temp with real
        setConsents((prev) =>
          prev.map((c) => (c.id === tempId ? newConsent : c))
        );

        return newConsent;
      } catch (error) {
        console.error('[ConsentContext] Error creating consent:', error);
        setConsents((prev) =>
          prev.filter((c) => !c.id.startsWith('temp_'))
        );
        setError(error.message || 'Failed to create consent');
        throw error;
      }
    },
    []
  );

  /**
   * Mettre a jour un consentement
   */
  const updateConsent = useCallback(
    async (consentId, consentData) => {
      try {
        setError(null);

        const previousConsent = consents.find((c) => c.id === consentId);

        // Optimistic update
        const optimisticConsent = { ...previousConsent, ...consentData };
        setConsents((prev) =>
          prev.map((c) => (c.id === consentId ? optimisticConsent : c))
        );

        // API call
        const updatedConsent = await consentsApi.updateConsent(consentId, consentData);

        // Update with API response
        setConsents((prev) =>
          prev.map((c) => (c.id === consentId ? updatedConsent : c))
        );

        return updatedConsent;
      } catch (error) {
        console.error('[ConsentContext] Error updating consent:', error);
        // Rollback
        setConsents((prev) =>
          prev.map((c) =>
            c.id === consentId ? consents.find((x) => x.id === consentId) : c
          )
        );
        setError(error.message || 'Failed to update consent');
        throw error;
      }
    },
    [consents]
  );

  /**
   * Signer un consentement electroniquement
   */
  const signConsent = useCallback(
    async (consentId, options = {}) => {
      try {
        setError(null);

        // Optimistic update
        setConsents((prev) =>
          prev.map((c) =>
            c.id === consentId
              ? { ...c, status: 'accepted', signedAt: new Date().toISOString() }
              : c
          )
        );

        // API call
        const signedConsent = await consentsApi.signConsent(consentId, options);

        // Update with API response
        setConsents((prev) =>
          prev.map((c) => (c.id === consentId ? signedConsent : c))
        );

        return signedConsent;
      } catch (error) {
        console.error('[ConsentContext] Error signing consent:', error);
        // Rollback
        await refreshConsents();
        setError(error.message || 'Failed to sign consent');
        throw error;
      }
    },
    [refreshConsents]
  );

  /**
   * Revoquer un consentement
   */
  const revokeConsent = useCallback(
    async (consentId, reason = 'patient_request') => {
      try {
        setError(null);

        // Optimistic update
        setConsents((prev) =>
          prev.map((c) =>
            c.id === consentId ? { ...c, status: 'rejected' } : c
          )
        );

        // API call
        const revokedConsent = await consentsApi.revokeConsent(consentId, reason);

        // Update with API response
        setConsents((prev) =>
          prev.map((c) => (c.id === consentId ? revokedConsent : c))
        );

        return revokedConsent;
      } catch (error) {
        console.error('[ConsentContext] Error revoking consent:', error);
        await refreshConsents();
        setError(error.message || 'Failed to revoke consent');
        throw error;
      }
    },
    [refreshConsents]
  );

  /**
   * Supprimer un consentement
   */
  const deleteConsent = useCallback(
    async (consentId) => {
      try {
        setError(null);

        // Optimistic update
        setConsents((prev) => prev.filter((c) => c.id !== consentId));

        // API call
        await consentsApi.deleteConsent(consentId);

        return { success: true };
      } catch (error) {
        console.error('[ConsentContext] Error deleting consent:', error);
        await refreshConsents();
        setError(error.message || 'Failed to delete consent');
        throw error;
      }
    },
    [refreshConsents]
  );

  /**
   * Obtenir un consentement par ID
   */
  const getConsentById = useCallback(
    async (consentId) => {
      try {
        return await consentsApi.getConsentById(consentId);
      } catch (error) {
        console.error('[ConsentContext] Error getting consent:', error);
        setError(error.message || 'Failed to fetch consent');
        throw error;
      }
    },
    []
  );

  /**
   * Filtrer les consentements par patient (local)
   */
  const getConsentsByPatient = useCallback(
    (patientId) => {
      return consents.filter((consent) => consent.patientId === patientId);
    },
    [consents]
  );

  /**
   * Filtrer les consentements par type (local)
   */
  const getConsentsByType = useCallback(
    (consentType) => {
      return consents.filter((consent) => consent.type === consentType);
    },
    [consents]
  );

  /**
   * Filtrer les consentements par statut (local)
   */
  const getConsentsByStatus = useCallback(
    (status) => {
      return consents.filter((consent) => consent.status === status);
    },
    [consents]
  );

  /**
   * Verifier si un patient a un consentement valide d'un type specifique
   */
  const hasValidConsent = useCallback(
    (patientId, consentType) => {
      return consents.some(
        (consent) =>
          consent.patientId === patientId &&
          consent.type === consentType &&
          consent.status === 'accepted'
      );
    },
    [consents]
  );

  /**
   * Obtenir les consentements en attente
   */
  const getPendingConsents = useCallback(() => {
    return consents.filter((consent) => consent.status === 'pending');
  }, [consents]);

  /**
   * Obtenir les statistiques des consentements
   */
  const getConsentStatistics = useCallback(() => {
    return {
      total: consents.length,
      pending: consents.filter((c) => c.status === 'pending').length,
      accepted: consents.filter((c) => c.status === 'accepted').length,
      rejected: consents.filter((c) => c.status === 'rejected').length,
      expired: consents.filter((c) => c.status === 'expired').length
    };
  }, [consents]);

  /**
   * Verifier si l'utilisateur peut creer des consentements
   */
  const canCreateConsent = useCallback(() => {
    if (!user) return false;
    return ['admin', 'secretary', 'doctor', 'physician', 'super_admin'].includes(user.role);
  }, [user]);

  /**
   * Verifier si l'utilisateur peut signer des consentements
   */
  const canSignConsent = useCallback(() => {
    if (!user) return false;
    return ['admin', 'doctor', 'physician', 'practitioner', 'super_admin'].includes(user.role);
  }, [user]);

  /**
   * Effacer l'erreur
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    // Etat
    consents,
    isLoading,
    error,
    isInitialized,

    // Operations principales
    createConsent,
    updateConsent,
    deleteConsent,
    signConsent,
    revokeConsent,
    getConsentById,
    refreshConsents,

    // Filtres locaux
    getConsentsByPatient,
    getConsentsByType,
    getConsentsByStatus,
    getPendingConsents,

    // Verifications
    hasValidConsent,
    getConsentStatistics,

    // Permissions
    canCreateConsent,
    canSignConsent,

    // Utilitaires
    clearError
  };

  return (
    <ConsentContext.Provider value={value}>
      {children}
    </ConsentContext.Provider>
  );
};

/**
 * Hook pour utiliser le contexte des consentements
 */
export const useConsents = () => {
  const context = useContext(ConsentContext);
  if (!context) {
    throw new Error('useConsents must be used within a ConsentProvider');
  }
  return context;
};

export default ConsentContext;
