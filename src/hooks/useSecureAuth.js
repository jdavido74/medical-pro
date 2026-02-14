/**
 * useSecureAuth Hook
 * 🔐 Hook de sécurité pour l'authentification
 *
 * RÈGLES CRITIQUES:
 * 1. Les permissions VIENNENT TOUJOURS du backend (/api/v1/auth/me)
 * 2. localStorage ne stocke QUE le JWT
 * 3. Les données utilisateur sont validées vs le JWT
 * 4. Le rôle ne peut pas être modifié en localStorage
 */

import { useEffect, useState, useCallback } from 'react';
import { baseClient } from '../api/baseClient';

export const useSecureAuth = () => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTokenValid, setIsTokenValid] = useState(true);

  /**
   * 🔐 Récupérer les données utilisateur et permissions du backend
   * SOURCE DE VÉRITÉ: /api/v1/auth/me
   */
  const fetchUserData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Appeler le backend pour obtenir les infos sécurisées
      const response = await baseClient.get('/auth/me');

      if (!response.success) {
        setIsTokenValid(false);
        setUser(null);
        setPermissions([]);
        return false;
      }

      const { user: userData, permissions: userPermissions, company } = response.data;

      // 🔐 VALIDER QUE LES DONNÉES FONT SENS
      if (!userData || !userData.id) {
        console.error('[useSecureAuth] Invalid user data from backend');
        setIsTokenValid(false);
        return false;
      }

      // Stocker les données sécurisées dans le state (NOT localStorage)
      setUser({
        id: userData.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        name: userData.name,
        role: userData.role,
        isActive: userData.isActive,
        company
      });

      // Stocker les permissions (de la BD, source de vérité)
      setPermissions(userPermissions || []);

      // Token valide
      setIsTokenValid(true);

      console.log('[useSecureAuth] User authenticated successfully', {
        userId: userData.id,
        role: userData.role,
        permissionsCount: userPermissions?.length || 0
      });

      return true;
    } catch (error) {
      console.error('[useSecureAuth] Failed to fetch user data', error);

      // Si erreur 401: token invalide
      if (error.response?.status === 401) {
        setIsTokenValid(false);
        baseClient.clearAccessToken();
      }

      setError(error.message);
      setIsTokenValid(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 🔐 Vérifier si l'utilisateur a une permission
   * TOUJOURS vérifier les permissions depuis le state
   * (qui viennent du backend)
   */
  const hasPermission = useCallback((permission) => {
    if (!isTokenValid || !permissions) {
      return false;
    }
    return permissions.includes(permission);
  }, [permissions, isTokenValid]);

  /**
   * 🔐 Vérifier si l'utilisateur a TOUTES les permissions
   */
  const hasAllPermissions = useCallback((requiredPermissions) => {
    if (!isTokenValid || !permissions) {
      return false;
    }
    return requiredPermissions.every(perm => permissions.includes(perm));
  }, [permissions, isTokenValid]);

  /**
   * 🔐 Vérifier si l'utilisateur a AU MOINS UNE permission
   */
  const hasAnyPermission = useCallback((requiredPermissions) => {
    if (!isTokenValid || !permissions) {
      return false;
    }
    return requiredPermissions.some(perm => permissions.includes(perm));
  }, [permissions, isTokenValid]);

  /**
   * 🔐 Charger les données utilisateur au montage
   * Ou quand le token change
   */
  useEffect(() => {
    const token = baseClient.getAuthToken();

    if (!token) {
      setIsLoading(false);
      setUser(null);
      setPermissions([]);
      return;
    }

    // Charger les infos utilisateur depuis le backend
    fetchUserData();
  }, [fetchUserData]);

  /**
   * 🔐 Refraîchir les permissions
   * Appelé après chaque action sensible ou périodiquement
   */
  const refreshPermissions = useCallback(async () => {
    return fetchUserData();
  }, [fetchUserData]);

  return {
    user,
    permissions,
    isLoading,
    isTokenValid,
    error,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    refreshPermissions,
    fetchUserData
  };
};

export default useSecureAuth;
