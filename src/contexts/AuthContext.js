// contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { permissionsStorage } from '../utils/permissionsStorage';
import auditStorage from '../utils/auditStorage';

const AuthContext = createContext();

const AUTH_STORAGE_KEY = 'clinicmanager_auth';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userPermissions, setUserPermissions] = useState([]);
  const [sessionInfo, setSessionInfo] = useState(null);

  // Fonction pour charger les permissions utilisateur
  const loadUserPermissions = (userData) => {
    try {
      // Initialiser les rôles par défaut
      permissionsStorage.initializeDefaultRoles();

      // Obtenir les permissions de l'utilisateur
      const permissions = permissionsStorage.getUserPermissions(userData);
      setUserPermissions(permissions);

      return permissions;
    } catch (error) {
      console.error('Erreur chargement permissions:', error);
      setUserPermissions([]);
      return [];
    }
  };

  // Fonction pour créer les informations de session
  const createSessionInfo = (userData, permissions) => {
    const now = new Date();
    const sessionInfo = {
      loginTime: now.toISOString(),
      lastActivity: now.toISOString(),
      ipAddress: '127.0.0.1', // En production, obtenir l'IP réelle
      userAgent: navigator.userAgent,
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      permissions: permissions,
      role: userData.role
    };
    setSessionInfo(sessionInfo);
    return sessionInfo;
  };

  // Charger les données de session au démarrage
  useEffect(() => {
    try {
      const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
      if (savedAuth) {
        const authData = JSON.parse(savedAuth);
        // Vérifier que les données ne sont pas trop anciennes (7 jours max)
        const savedTime = new Date(authData.timestamp);
        const now = new Date();
        const daysDiff = (now - savedTime) / (1000 * 60 * 60 * 24);

        if (daysDiff < 7) {
          setUser(authData.user);
          setIsAuthenticated(true);

          // Charger les permissions
          const permissions = loadUserPermissions(authData.user);

          // Restaurer ou créer les informations de session
          if (authData.sessionInfo) {
            // Mettre à jour la dernière activité
            const updatedSessionInfo = {
              ...authData.sessionInfo,
              lastActivity: now.toISOString(),
              permissions: permissions
            };
            setSessionInfo(updatedSessionInfo);
          } else {
            // Créer de nouvelles informations de session pour les anciennes sessions
            createSessionInfo(authData.user, permissions);
          }
        } else {
          // Session expirée, nettoyer
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('Erreur chargement session:', error);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);

    // Charger les permissions
    const permissions = loadUserPermissions(userData);

    // Créer les informations de session
    const sessionData = createSessionInfo(userData, permissions);

    // Enregistrer l'événement de connexion dans l'audit
    auditStorage.logEvent(auditStorage.constructor.EVENT_TYPES.LOGIN, {
      userId: userData.id,
      userName: `${userData.firstName} ${userData.lastName}`,
      userRole: userData.role,
      sessionId: sessionData.sessionId,
      loginMethod: 'credentials',
      permissionsCount: permissions.length
    });

    // Sauvegarder dans localStorage
    try {
      const authData = {
        user: userData,
        timestamp: new Date().toISOString(),
        sessionInfo: sessionData
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
    } catch (error) {
      console.error('Erreur sauvegarde session:', error);
      // Logger l'erreur dans l'audit
      auditStorage.logEvent(auditStorage.constructor.EVENT_TYPES.SYSTEM_ERROR, {
        errorType: 'session_save_failed',
        errorMessage: error.message,
        context: 'login'
      });
    }
  };

  const logout = () => {
    // Enregistrer l'événement de déconnexion avant de nettoyer les données
    if (user && sessionInfo) {
      auditStorage.logEvent(auditStorage.constructor.EVENT_TYPES.LOGOUT, {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userRole: user.role,
        sessionId: sessionInfo.sessionId,
        sessionDuration: getSessionDuration(),
        logoutType: 'manual'
      });
    }

    setUser(null);
    setIsAuthenticated(false);
    setUserPermissions([]);
    setSessionInfo(null);

    // Nettoyer localStorage
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (error) {
      console.error('Erreur nettoyage session:', error);
      // Logger l'erreur dans l'audit
      auditStorage.logEvent(auditStorage.constructor.EVENT_TYPES.SYSTEM_ERROR, {
        errorType: 'session_cleanup_failed',
        errorMessage: error.message,
        context: 'logout'
      });
    }
  };

  const updateUser = (updatedData) => {
    const newUserData = { ...user, ...updatedData };
    setUser(newUserData);

    // Recharger les permissions si le rôle a changé
    if (updatedData.role && updatedData.role !== user?.role) {
      const permissions = loadUserPermissions(newUserData);

      // Mettre à jour les informations de session
      if (sessionInfo) {
        const updatedSessionInfo = {
          ...sessionInfo,
          lastActivity: new Date().toISOString(),
          permissions: permissions,
          role: newUserData.role
        };
        setSessionInfo(updatedSessionInfo);
      }
    }

    // Mettre à jour localStorage
    try {
      const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
      if (savedAuth) {
        const authData = JSON.parse(savedAuth);
        authData.user = newUserData;
        authData.timestamp = new Date().toISOString();

        if (sessionInfo) {
          authData.sessionInfo = {
            ...sessionInfo,
            lastActivity: new Date().toISOString()
          };
        }

        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
      }
    } catch (error) {
      console.error('Erreur mise à jour session:', error);
    }
  };

  // Nouvelles méthodes pour la gestion des permissions
  const hasPermission = (permission) => {
    return permissionsStorage.hasPermission(userPermissions, permission);
  };

  const hasAnyPermission = (permissions) => {
    return permissionsStorage.hasAnyPermission(userPermissions, permissions);
  };

  const hasAllPermissions = (permissions) => {
    return permissionsStorage.hasAllPermissions(userPermissions, permissions);
  };

  const refreshPermissions = () => {
    if (user) {
      const permissions = loadUserPermissions(user);

      // Mettre à jour les informations de session
      if (sessionInfo) {
        const updatedSessionInfo = {
          ...sessionInfo,
          lastActivity: new Date().toISOString(),
          permissions: permissions
        };
        setSessionInfo(updatedSessionInfo);
      }

      return permissions;
    }
    return [];
  };

  const updateLastActivity = () => {
    if (sessionInfo) {
      const updatedSessionInfo = {
        ...sessionInfo,
        lastActivity: new Date().toISOString()
      };
      setSessionInfo(updatedSessionInfo);

      // Mettre à jour localStorage
      try {
        const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
        if (savedAuth) {
          const authData = JSON.parse(savedAuth);
          authData.sessionInfo = updatedSessionInfo;
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
        }
      } catch (error) {
        console.error('Erreur mise à jour activité:', error);
      }
    }
  };

  const getSessionDuration = () => {
    if (sessionInfo?.loginTime) {
      const loginTime = new Date(sessionInfo.loginTime);
      const now = new Date();
      return Math.floor((now - loginTime) / (1000 * 60)); // en minutes
    }
    return 0;
  };

  const isSessionExpired = () => {
    if (sessionInfo?.lastActivity) {
      const lastActivity = new Date(sessionInfo.lastActivity);
      const now = new Date();
      const inactiveMinutes = (now - lastActivity) / (1000 * 60);
      return inactiveMinutes > 480; // 8 heures d'inactivité
    }
    return false;
  };

  return (
    <AuthContext.Provider value={{
      // État de base
      user,
      isAuthenticated,
      isLoading,
      userPermissions,
      sessionInfo,

      // Méthodes d'authentification
      login,
      logout,
      updateUser,

      // Méthodes de permissions
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      refreshPermissions,

      // Méthodes de session
      updateLastActivity,
      getSessionDuration,
      isSessionExpired
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};