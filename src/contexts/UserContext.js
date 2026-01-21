/**
 * Contexte pour la gestion des utilisateurs de la clinique
 *
 * Version 2.0: API Backend Integration
 * Fournit:
 * - Liste des utilisateurs (synchro API)
 * - Operations CRUD avec optimistic updates
 * - Gestion des roles et permissions
 * - Statistiques utilisateurs
 * - Recherche et filtrage
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usersApi } from '../api';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statistics, setStatistics] = useState(null);

  /**
   * Charger les utilisateurs au demarrage depuis l'API
   */
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (currentUser) {
          const result = await usersApi.getUsers({ page: 1, limit: 100 });
          setUsers(result.users || []);
        }
        setIsInitialized(true);
      } catch (error) {
        console.error('[UserContext] Error loading users:', error);
        setError(error.message || 'Failed to load users');
        setIsInitialized(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
  }, [currentUser]);

  /**
   * Recharger les utilisateurs
   */
  const refreshUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await usersApi.getUsers({ page: 1, limit: 100 });
      setUsers(result.users || []);
    } catch (error) {
      console.error('[UserContext] Error refreshing users:', error);
      setError(error.message || 'Failed to refresh users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Charger les statistiques
   */
  const loadStatistics = useCallback(async () => {
    try {
      const stats = await usersApi.getUserStats();
      setStatistics(stats);
      return stats;
    } catch (error) {
      console.error('[UserContext] Error loading statistics:', error);
      throw error;
    }
  }, []);

  /**
   * Creer un utilisateur avec optimistic update
   */
  const createUser = useCallback(
    async (userData) => {
      try {
        setError(null);

        // Optimistic update
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const optimisticUser = {
          ...userData,
          id: tempId,
          isActive: true,
          createdAt: new Date().toISOString()
        };

        setUsers((prev) => [...prev, optimisticUser]);

        // API call
        const newUser = await usersApi.createUser(userData);

        // Replace temp with real
        setUsers((prev) =>
          prev.map((u) => (u.id === tempId ? newUser : u))
        );

        return newUser;
      } catch (error) {
        console.error('[UserContext] Error creating user:', error);
        setUsers((prev) =>
          prev.filter((u) => !u.id.startsWith('temp_'))
        );
        setError(error.message || 'Failed to create user');
        throw error;
      }
    },
    []
  );

  /**
   * Mettre a jour un utilisateur
   */
  const updateUser = useCallback(
    async (userId, userData) => {
      try {
        setError(null);

        const previousUser = users.find((u) => u.id === userId);

        // Optimistic update
        const optimisticUser = { ...previousUser, ...userData };
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? optimisticUser : u))
        );

        // API call
        const updatedUser = await usersApi.updateUser(userId, userData);

        // Update with API response
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? updatedUser : u))
        );

        return updatedUser;
      } catch (error) {
        console.error('[UserContext] Error updating user:', error);
        // Rollback
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? users.find((x) => x.id === userId) : u
          )
        );
        setError(error.message || 'Failed to update user');
        throw error;
      }
    },
    [users]
  );

  /**
   * Supprimer un utilisateur (soft delete)
   */
  const deleteUser = useCallback(
    async (userId) => {
      try {
        setError(null);

        // Prevent self-deletion
        if (userId === currentUser?.id) {
          throw new Error('You cannot delete your own account');
        }

        // Optimistic update - mark as inactive instead of removing
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, isActive: false } : u
          )
        );

        // API call
        await usersApi.deleteUser(userId);

        return { success: true };
      } catch (error) {
        console.error('[UserContext] Error deleting user:', error);
        await refreshUsers();
        setError(error.message || 'Failed to delete user');
        throw error;
      }
    },
    [currentUser, refreshUsers]
  );

  /**
   * Restaurer un utilisateur supprime
   */
  const restoreUser = useCallback(
    async (userId) => {
      try {
        setError(null);

        // Optimistic update
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, isActive: true } : u
          )
        );

        // API call
        const restoredUser = await usersApi.restoreUser(userId);

        // Update with API response
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? restoredUser : u))
        );

        return restoredUser;
      } catch (error) {
        console.error('[UserContext] Error restoring user:', error);
        await refreshUsers();
        setError(error.message || 'Failed to restore user');
        throw error;
      }
    },
    [refreshUsers]
  );

  /**
   * Reinitialiser le mot de passe d'un utilisateur
   */
  const resetUserPassword = useCallback(
    async (userId, newPassword) => {
      try {
        setError(null);
        await usersApi.resetUserPassword(userId, newPassword);
        return { success: true };
      } catch (error) {
        console.error('[UserContext] Error resetting password:', error);
        setError(error.message || 'Failed to reset password');
        throw error;
      }
    },
    []
  );

  /**
   * Obtenir un utilisateur par ID
   */
  const getUserById = useCallback(
    async (userId) => {
      try {
        return await usersApi.getUserById(userId);
      } catch (error) {
        console.error('[UserContext] Error getting user:', error);
        setError(error.message || 'Failed to fetch user');
        throw error;
      }
    },
    []
  );

  /**
   * Basculer le statut actif/inactif d'un utilisateur
   */
  const toggleUserStatus = useCallback(
    async (userId) => {
      const user = users.find((u) => u.id === userId);
      if (!user) {
        throw new Error('User not found');
      }

      return await updateUser(userId, { isActive: !user.isActive });
    },
    [users, updateUser]
  );

  /**
   * Filtrer les utilisateurs par role (local)
   */
  const getUsersByRole = useCallback(
    (role) => {
      return users.filter((user) => user.role === role);
    },
    [users]
  );

  /**
   * Filtrer les utilisateurs par departement (local)
   */
  const getUsersByDepartment = useCallback(
    (department) => {
      return users.filter((user) =>
        user.department?.toLowerCase().includes(department.toLowerCase())
      );
    },
    [users]
  );

  /**
   * Obtenir les utilisateurs actifs
   */
  const getActiveUsers = useCallback(() => {
    return users.filter((user) => user.isActive);
  }, [users]);

  /**
   * Obtenir les utilisateurs inactifs
   */
  const getInactiveUsers = useCallback(() => {
    return users.filter((user) => !user.isActive);
  }, [users]);

  /**
   * Rechercher des utilisateurs (local)
   */
  const searchUsers = useCallback(
    (query) => {
      if (!query) return users;

      const lowerQuery = query.toLowerCase();
      return users.filter((user) => {
        const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
        const email = user.email?.toLowerCase() || '';
        const department = user.department?.toLowerCase() || '';

        return (
          fullName.includes(lowerQuery) ||
          email.includes(lowerQuery) ||
          department.includes(lowerQuery)
        );
      });
    },
    [users]
  );

  /**
   * Obtenir les statistiques des utilisateurs (local)
   */
  const getUserStatistics = useCallback(() => {
    return {
      total: users.length,
      active: users.filter((u) => u.isActive).length,
      inactive: users.filter((u) => !u.isActive).length,
      byRole: users.reduce((acc, u) => {
        acc[u.role] = (acc[u.role] || 0) + 1;
        return acc;
      }, {}),
      byDepartment: users.reduce((acc, u) => {
        if (u.department) {
          acc[u.department] = (acc[u.department] || 0) + 1;
        }
        return acc;
      }, {})
    };
  }, [users]);

  /**
   * Verifier si l'utilisateur peut gerer les utilisateurs
   */
  const canManageUsers = useCallback(() => {
    if (!currentUser) return false;
    return ['admin', 'super_admin'].includes(currentUser.role);
  }, [currentUser]);

  /**
   * Verifier si l'utilisateur peut creer des utilisateurs
   */
  const canCreateUser = useCallback(() => {
    if (!currentUser) return false;
    return ['admin', 'super_admin'].includes(currentUser.role);
  }, [currentUser]);

  /**
   * Verifier si l'utilisateur peut supprimer des utilisateurs
   */
  const canDeleteUser = useCallback(() => {
    if (!currentUser) return false;
    return ['admin', 'super_admin'].includes(currentUser.role);
  }, [currentUser]);

  /**
   * Effacer l'erreur
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    // Etat
    users,
    isLoading,
    error,
    isInitialized,
    statistics,

    // Operations principales
    createUser,
    updateUser,
    deleteUser,
    restoreUser,
    resetUserPassword,
    getUserById,
    toggleUserStatus,
    refreshUsers,
    loadStatistics,

    // Filtres locaux
    getUsersByRole,
    getUsersByDepartment,
    getActiveUsers,
    getInactiveUsers,
    searchUsers,

    // Statistiques
    getUserStatistics,

    // Permissions
    canManageUsers,
    canCreateUser,
    canDeleteUser,

    // Utilitaires
    clearError
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

/**
 * Hook pour utiliser le contexte des utilisateurs
 */
export const useUsers = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUsers must be used within a UserProvider');
  }
  return context;
};

export default UserContext;
