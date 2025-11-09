/**
 * Couche d'abstraction pour les accès sécurisés aux données
 *
 * Gère:
 * - Vérification des permissions AVANT d'accéder aux données
 * - Audit logging de chaque accès
 * - Gestion des erreurs de sécurité
 *
 * Tous les accès aux données (PATIENT, APPOINTMENT, etc.) passent par ici
 *
 * @see SECURITY_ARCHITECTURE.md pour la documentation complète
 */

import auditStorage from '../auditStorage';
import { permissionsStorage } from '../permissionsStorage';
import { dataEncryption } from './dataEncryption';
import { isHighlySensitive } from './sensitiveLevels';

/**
 * Classe pour gérer les accès sécurisés aux données
 */
class SecureDataAccessManager {
  constructor() {
    this.auditLog = auditStorage;
    this.permissions = permissionsStorage;
  }

  /**
   * Vérifier si un utilisateur a la permission d'accéder à une donnée
   *
   * @param {Object} user - Utilisateur (de AuthContext)
   * @param {string} action - Action ('READ', 'CREATE', 'UPDATE', 'DELETE')
   * @param {string} dataType - Type de données ('PATIENT', 'APPOINTMENT', etc.)
   * @param {Object} targetData - Donnée cible (optionnel, pour vérifications additionnelles)
   * @returns {Promise<{allowed: boolean, reason: string}>}
   */
  async checkPermission(user, action, dataType, targetData = null) {
    if (!user) {
      return {
        allowed: false,
        reason: 'Utilisateur non authentifié'
      };
    }

    // Construire le nom de permission
    const permissionName = `${dataType}_${action}`;

    // Obtenir les permissions de l'utilisateur
    const userPermissions = this.permissions.getUserPermissions(user);

    // Vérifier la permission de base
    const hasBasicPermission = this.permissions.hasPermission(userPermissions, permissionName);

    if (!hasBasicPermission) {
      console.warn(`[SecureAccess] Permission denied: ${user.id} - ${permissionName}`, {
        userPermissions,
        requiredPermission: permissionName
      });
      return {
        allowed: false,
        reason: `Vous n'avez pas la permission d'${action.toLowerCase()} ${dataType.toLowerCase()}`
      };
    }

    // Vérifications additionnelles pour données sensibles
    if (isHighlySensitive(dataType) && action === 'READ') {
      const sensitivePermission = `${dataType}_VIEW_SENSITIVE`;
      const hasSensitivePermission = this.permissions.hasPermission(user, sensitivePermission);

      if (!hasSensitivePermission) {
        console.warn(`[SecureAccess] Sensitive data access denied: ${user.id} - ${sensitivePermission}`);
        return {
          allowed: false,
          reason: `Vous n'avez pas la permission d'accéder aux données sensibles de ${dataType.toLowerCase()}`
        };
      }
    }

    return {
      allowed: true,
      reason: null
    };
  }

  /**
   * Accéder à une donnée avec vérification de permission et audit logging
   *
   * @param {Object} user - Utilisateur
   * @param {string} action - Action (READ, CREATE, UPDATE, DELETE)
   * @param {string} dataType - Type de données
   * @param {Function} accessFn - Fonction qui retourne la donnée
   * @param {Object} options - Options additionnelles
   * @returns {Promise<*>} La donnée si accès autorisé
   *
   * @example
   * const patient = await secureDataAccess.accessSecure(
   *   user,
   *   'READ',
   *   'PATIENT',
   *   () => patientsStorage.getById(patientId),
   *   { targetId: patientId, reason: 'View patient profile' }
   * );
   */
  async accessSecure(user, action, dataType, accessFn, options = {}) {
    try {
      // 1. Vérifier les permissions
      const permissionCheck = await this.checkPermission(user, action, dataType, options.targetData);

      if (!permissionCheck.allowed) {
        // Logger la tentative d'accès non autorisée
        this.auditLog.log({
          action: `${dataType}_${action}_DENIED`,
          userId: user?.id || 'anonymous',
          targetId: options.targetId,
          reason: permissionCheck.reason,
          status: 'denied',
          ipAddress: 'localhost'
        });

        throw new Error(permissionCheck.reason);
      }

      // 2. Exécuter l'accès aux données
      const data = await accessFn();

      // 3. Logger l'accès autorisé
      this.auditLog.log({
        action: `${dataType}_${action}`,
        userId: user.id,
        targetId: options.targetId || (data?.id),
        reason: options.reason || `${action} ${dataType}`,
        status: 'success',
        ipAddress: 'localhost',
        // Pour les données sensibles, ne pas logger la donnée elle-même
        ...(isHighlySensitive(dataType) && {
          details: `[SENSITIVE DATA - ${dataType}]`
        })
      });

      // 4. Déchiffrer si nécessaire (future use avec backend)
      if (data) {
        return await dataEncryption.decrypt(data);
      }

      return data;
    } catch (error) {
      console.error(`[SecureAccess] Error accessing ${dataType}:`, error);

      // Logger l'erreur
      this.auditLog.log({
        action: `${dataType}_${action}_ERROR`,
        userId: user?.id || 'anonymous',
        targetId: options.targetId,
        reason: options.reason || `${action} ${dataType}`,
        status: 'error',
        error: error.message,
        ipAddress: 'localhost'
      });

      throw error;
    }
  }

  /**
   * Créer une donnée avec chiffrement et audit logging
   *
   * @param {Object} user - Utilisateur
   * @param {string} dataType - Type de données
   * @param {Object} dataToCreate - Donnée à créer
   * @param {Function} createFn - Fonction qui crée la donnée
   * @param {Object} options - Options additionnelles
   * @returns {Promise<*>} La donnée créée
   *
   * @example
   * const newPatient = await secureDataAccess.createSecure(
   *   user,
   *   'PATIENT',
   *   patientData,
   *   (data) => patientsStorage.create(data),
   *   { reason: 'Quick patient creation from appointment' }
   * );
   */
  async createSecure(user, dataType, dataToCreate, createFn, options = {}) {
    try {
      // 1. Vérifier les permissions
      const permissionCheck = await this.checkPermission(user, 'CREATE', dataType);

      if (!permissionCheck.allowed) {
        this.auditLog.log({
          action: `${dataType}_CREATE_DENIED`,
          userId: user?.id || 'anonymous',
          reason: permissionCheck.reason,
          status: 'denied',
          ipAddress: 'localhost'
        });

        throw new Error(permissionCheck.reason);
      }

      // 2. Chiffrer les données sensibles
      const encryptedData = await dataEncryption.encrypt(dataToCreate, dataType);

      // 3. Créer la donnée
      const createdData = await createFn(encryptedData);

      // 4. Logger la création
      this.auditLog.log({
        action: `${dataType}_CREATE`,
        userId: user.id,
        targetId: createdData?.id,
        reason: options.reason || `Created new ${dataType}`,
        status: 'success',
        ipAddress: 'localhost',
        details: isHighlySensitive(dataType) ? `[SENSITIVE DATA - ${dataType}]` : null
      });

      return createdData;
    } catch (error) {
      console.error(`[SecureAccess] Error creating ${dataType}:`, error);

      this.auditLog.log({
        action: `${dataType}_CREATE_ERROR`,
        userId: user?.id || 'anonymous',
        reason: options.reason || `Create ${dataType}`,
        status: 'error',
        error: error.message,
        ipAddress: 'localhost'
      });

      throw error;
    }
  }

  /**
   * Mettre à jour une donnée avec audit logging
   */
  async updateSecure(user, dataType, dataId, dataToUpdate, updateFn, options = {}) {
    try {
      const permissionCheck = await this.checkPermission(user, 'UPDATE', dataType);

      if (!permissionCheck.allowed) {
        this.auditLog.log({
          action: `${dataType}_UPDATE_DENIED`,
          userId: user?.id || 'anonymous',
          targetId: dataId,
          reason: permissionCheck.reason,
          status: 'denied',
          ipAddress: 'localhost'
        });

        throw new Error(permissionCheck.reason);
      }

      const encryptedData = await dataEncryption.encrypt(dataToUpdate, dataType);
      const updatedData = await updateFn(dataId, encryptedData);

      this.auditLog.log({
        action: `${dataType}_UPDATE`,
        userId: user.id,
        targetId: dataId,
        reason: options.reason || `Updated ${dataType}`,
        status: 'success',
        ipAddress: 'localhost',
        changes: Object.keys(dataToUpdate),
        details: isHighlySensitive(dataType) ? `[SENSITIVE DATA - ${dataType}]` : null
      });

      return updatedData;
    } catch (error) {
      console.error(`[SecureAccess] Error updating ${dataType}:`, error);

      this.auditLog.log({
        action: `${dataType}_UPDATE_ERROR`,
        userId: user?.id || 'anonymous',
        targetId: dataId,
        reason: options.reason || `Update ${dataType}`,
        status: 'error',
        error: error.message,
        ipAddress: 'localhost'
      });

      throw error;
    }
  }

  /**
   * Supprimer une donnée avec audit logging
   */
  async deleteSecure(user, dataType, dataId, deleteFn, options = {}) {
    try {
      const permissionCheck = await this.checkPermission(user, 'DELETE', dataType);

      if (!permissionCheck.allowed) {
        this.auditLog.log({
          action: `${dataType}_DELETE_DENIED`,
          userId: user?.id || 'anonymous',
          targetId: dataId,
          reason: permissionCheck.reason,
          status: 'denied',
          ipAddress: 'localhost'
        });

        throw new Error(permissionCheck.reason);
      }

      const deletedData = await deleteFn(dataId);

      this.auditLog.log({
        action: `${dataType}_DELETE`,
        userId: user.id,
        targetId: dataId,
        reason: options.reason || `Deleted ${dataType}`,
        status: 'success',
        ipAddress: 'localhost'
      });

      return deletedData;
    } catch (error) {
      console.error(`[SecureAccess] Error deleting ${dataType}:`, error);

      this.auditLog.log({
        action: `${dataType}_DELETE_ERROR`,
        userId: user?.id || 'anonymous',
        targetId: dataId,
        reason: options.reason || `Delete ${dataType}`,
        status: 'error',
        error: error.message,
        ipAddress: 'localhost'
      });

      throw error;
    }
  }

  /**
   * Filtrer une liste de données selon les permissions
   * Utile pour les listes où seules certaines données doivent être visibles
   */
  filterByPermission(user, dataType, dataList) {
    if (!Array.isArray(dataList)) return [];

    const userPermissions = this.permissions.getUserPermissions(user);
    const hasPermission = this.permissions.hasPermission(userPermissions, `${dataType}_READ`);

    if (!hasPermission) {
      console.warn(`[SecureAccess] User ${user.id} cannot read ${dataType}`);
      return [];
    }

    // Optionnel: filtrer par propriétaires (pour les données de l'utilisateur seulement)
    // if (dataType === 'APPOINTMENT') {
    //   return dataList.filter(item => item.practitionerId === user.id || user.role === 'admin');
    // }

    return dataList;
  }

  /**
   * Redacter les données sensibles pour le logging/debugging
   */
  getRedactedDataForLogging(dataType, data) {
    return dataEncryption.redactSensitiveData(data, dataType);
  }
}

// Export singleton
export const secureDataAccess = new SecureDataAccessManager();

export default secureDataAccess;
