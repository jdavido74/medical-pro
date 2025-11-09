/**
 * Hook réutilisable pour créer des contextes sécurisés
 *
 * Ce hook encapsule la logique de sécurité pour TOUS les types de données
 * (PATIENT, APPOINTMENT, MEDICAL_RECORD, etc.)
 *
 * Avantages:
 * - Une seule implémentation pour tous les contextes
 * - Permissions/audit appliqués automatiquement
 * - Migration localStorage → API transparente
 * - Code limité et maintenable dans les contextes
 *
 * @see SECURITY_ARCHITECTURE.md pour la documentation complète
 * @see PatientContext.js pour un exemple d'utilisation
 *
 * @example
 * const PatientContext = createContext();
 *
 * export const PatientProvider = ({ children }) => {
 *   const { user } = useAuth();
 *   const secureOps = useSecureDataContext(
 *     'PATIENT',
 *     patientsStorage,
 *     user
 *   );
 *
 *   return (
 *     <PatientContext.Provider value={secureOps}>
 *       {children}
 *     </PatientContext.Provider>
 *   );
 * };
 */

import { useState, useCallback, useEffect } from 'react';
import { secureDataAccess, dataEncryption, isHighlySensitive } from '../utils/security';

/**
 * Créer un ensemble d'opérations sécurisées pour un type de données
 *
 * @param {string} dataType - Type de données ('PATIENT', 'APPOINTMENT', etc.)
 * @param {Object} storageUtility - Utilitaire de stockage (patientsStorage, appointmentsStorage, etc.)
 * @param {Object} user - Utilisateur courant (de AuthContext)
 * @returns {Object} Opérations sécurisées (get, create, update, delete, list)
 */
export const useSecureDataContext = (dataType, storageUtility, user) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Obtenir une donnée par ID avec vérification de permission
   */
  const getById = useCallback(
    async (id) => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await secureDataAccess.accessSecure(
          user,
          'READ',
          dataType,
          () => storageUtility.getById(id),
          {
            targetId: id,
            reason: `View ${dataType} details`
          }
        );

        return data;
      } catch (err) {
        setError(err.message);
        console.error(`[${dataType}Context] Error getting ${id}:`, err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [dataType, storageUtility, user]
  );

  /**
   * Récupérer toutes les données accessibles par l'utilisateur
   * Filtre automatiquement selon les permissions
   */
  const getAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const allData = await secureDataAccess.accessSecure(
        user,
        'READ',
        dataType,
        () => storageUtility.getAll(),
        {
          reason: `List all ${dataType}`
        }
      );

      // Filtrer par permissions
      const filtered = secureDataAccess.filterByPermission(user, dataType, allData);

      return filtered;
    } catch (err) {
      setError(err.message);
      console.error(`[${dataType}Context] Error getting all:`, err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [dataType, storageUtility, user]);

  /**
   * Créer une nouvelle donnée
   */
  const create = useCallback(
    async (dataToCreate, options = {}) => {
      setIsLoading(true);
      setError(null);

      try {
        const createdData = await secureDataAccess.createSecure(
          user,
          dataType,
          dataToCreate,
          (data) => storageUtility.create(data),
          {
            reason: options.reason || `Create new ${dataType}`
          }
        );

        return createdData;
      } catch (err) {
        setError(err.message);
        console.error(`[${dataType}Context] Error creating:`, err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [dataType, storageUtility, user]
  );

  /**
   * Mettre à jour une donnée
   */
  const update = useCallback(
    async (id, dataToUpdate, options = {}) => {
      setIsLoading(true);
      setError(null);

      try {
        const updatedData = await secureDataAccess.updateSecure(
          user,
          dataType,
          id,
          dataToUpdate,
          (dataId, data) => storageUtility.update(dataId, data),
          {
            reason: options.reason || `Update ${dataType}`
          }
        );

        return updatedData;
      } catch (err) {
        setError(err.message);
        console.error(`[${dataType}Context] Error updating ${id}:`, err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [dataType, storageUtility, user]
  );

  /**
   * Supprimer une donnée
   */
  const delete_ = useCallback(
    async (id, options = {}) => {
      setIsLoading(true);
      setError(null);

      try {
        const deletedData = await secureDataAccess.deleteSecure(
          user,
          dataType,
          id,
          (dataId) => storageUtility.delete(dataId, user?.id || 'system'),
          {
            reason: options.reason || `Delete ${dataType}`
          }
        );

        return deletedData;
      } catch (err) {
        setError(err.message);
        console.error(`[${dataType}Context] Error deleting ${id}:`, err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [dataType, storageUtility, user]
  );

  /**
   * Obtenir la version redactée d'une donnée (pour logging)
   */
  const getRedacted = useCallback(
    (data) => {
      return dataEncryption.redactSensitiveData(data, dataType);
    },
    [dataType]
  );

  /**
   * Vérifier les permissions sans accéder aux données
   */
  const checkPermission = useCallback(
    async (action) => {
      try {
        const check = await secureDataAccess.checkPermission(user, action, dataType);
        return check.allowed;
      } catch (err) {
        console.error(`[${dataType}Context] Error checking permission:`, err);
        return false;
      }
    },
    [dataType, user]
  );

  /**
   * Obtenir les informations d'une donnée sensible sans révéler son contenu
   * Utile pour afficher "Patient: [REDACTED]" au lieu du vrai nom
   */
  const getSecurityInfo = useCallback((data) => {
    if (!data) return null;

    return {
      isSensitive: isHighlySensitive(dataType),
      type: dataType,
      encryptionEnabled: dataEncryption.isEncryptionEnabled(),
      redacted: getRedacted(data)
    };
  }, [dataType, getRedacted]);

  return {
    // Opérations de données
    getById,
    getAll,
    create,
    update,
    delete: delete_,

    // Utilitaires
    getRedacted,
    getSecurityInfo,
    checkPermission,

    // État
    isLoading,
    error,

    // Info
    dataType,
    isSensitive: isHighlySensitive(dataType),
    encryptionEnabled: dataEncryption.isEncryptionEnabled()
  };
};

export default useSecureDataContext;
