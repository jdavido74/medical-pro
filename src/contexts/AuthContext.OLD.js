// contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { permissionsStorage } from '../utils/permissionsStorage';
import auditStorage from '../utils/auditStorage';
import { baseClient } from '../api/baseClient';

const AuthContext = createContext();

const AUTH_STORAGE_KEY = 'clinicmanager_auth';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
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

  // Valider le token auprès du backend
  const validateToken = async (token) => {
    try {
      console.log('[AuthContext] 🔐 Validation du token auprès du backend...');
      const response = await baseClient.get('/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.success && response.data?.user) {
        console.log('[AuthContext] ✅ Token valide, utilisateur:', response.data.user.email);
        return { valid: true, user: response.data.user, company: response.data.company };
      }

      console.log('[AuthContext] ❌ Token invalide (réponse inattendue)');
      return { valid: false };
    } catch (error) {
      console.error('[AuthContext] ❌ Erreur validation token:', error.message);
      return { valid: false };
    }
  };

  // Charger les données de session au démarrage avec validation
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
        const savedToken = localStorage.getItem('clinicmanager_token');

        if (!savedAuth || !savedToken) {
          console.log('[AuthContext] 📭 Pas de session sauvegardée');
          setIsLoading(false);
          return;
        }

        const authData = JSON.parse(savedAuth);
        const savedTime = new Date(authData.timestamp);
        const now = new Date();
        const hoursDiff = (now - savedTime) / (1000 * 60 * 60);

        // Vérifier que les données ne sont pas trop anciennes (24 heures max au lieu de 7 jours)
        if (hoursDiff > 24) {
          console.log('[AuthContext] ⏱️ Session expirée (> 24h), nettoyage...');
          localStorage.removeItem(AUTH_STORAGE_KEY);
          localStorage.removeItem('clinicmanager_token');
          setIsLoading(false);
          return;
        }

        // Vérifier l'inactivité (8 heures max)
        if (authData.sessionInfo?.lastActivity) {
          const lastActivity = new Date(authData.sessionInfo.lastActivity);
          const inactiveHours = (now - lastActivity) / (1000 * 60 * 60);

          if (inactiveHours > 8) {
            console.log('[AuthContext] 💤 Session inactive (> 8h), nettoyage...');
            localStorage.removeItem(AUTH_STORAGE_KEY);
            localStorage.removeItem('clinicmanager_token');
            setIsLoading(false);
            return;
          }
        }

        // Valider le token auprès du backend
        console.log('[AuthContext] 🔍 Validation du token...');
        const validation = await validateToken(savedToken);

        if (!validation.valid) {
          console.log('[AuthContext] ❌ Token invalide ou expiré, nettoyage de la session...');
          localStorage.removeItem(AUTH_STORAGE_KEY);
          localStorage.removeItem('clinicmanager_token');
          setIsLoading(false);
          return;
        }

        // Token valide, restaurer la session
        console.log('[AuthContext] ✅ Session valide, restauration...');
        setUser(validation.user || authData.user);
        setCompany(validation.company || authData.company || null);
        setIsAuthenticated(true);

        // Charger les permissions
        const permissions = loadUserPermissions(validation.user || authData.user);

        // Restaurer ou créer les informations de session
        if (authData.sessionInfo) {
          const updatedSessionInfo = {
            ...authData.sessionInfo,
            lastActivity: now.toISOString(),
            permissions: permissions
          };
          setSessionInfo(updatedSessionInfo);

          // Sauvegarder la session mise à jour
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
            ...authData,
            sessionInfo: updatedSessionInfo,
            timestamp: now.toISOString()
          }));
        } else {
          createSessionInfo(validation.user || authData.user, permissions);
        }
      } catch (error) {
        console.error('[AuthContext] ❌ Erreur initialisation session:', error);
        // En cas d'erreur, nettoyer la session pour éviter les problèmes
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem('clinicmanager_token');
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();
  }, []);

  const register = async (registrationData) => {
    try {
      // Map form data to backend API structure
      const backendData = {
        // Company data (mapped from form)
        companyName: registrationData.clinicName,
        country: registrationData.country || 'FR', // Default to FR if not provided
        locale: registrationData.locale || 'fr-FR', // Full locale code
        companyEmail: registrationData.email,
        companyPhone: registrationData.phone,

        // User data
        email: registrationData.email,
        password: registrationData.password,
        firstName: registrationData.firstName,
        lastName: registrationData.lastName,

        // Terms acceptance
        acceptTerms: registrationData.acceptTerms === true
      };

      // Appel API pour créer le compte using baseClient with correct backend URL
      const responseData = await baseClient.post('/auth/register', backendData);

      // Return the response but don't auto-login yet - user needs to verify email first
      return responseData;
    } catch (error) {
      console.error('Erreur inscription:', error);
      // Format error message for user-friendly display
      const errorMessage = error.message || error.data?.message || 'Erreur lors de la création du compte';
      throw new Error(errorMessage);
    }
  };

  const login = (userData, companyData) => {
    setUser(userData);
    setCompany(companyData);
    setIsAuthenticated(true);

    // Charger les permissions
    const permissions = loadUserPermissions(userData);

    // Créer les informations de session
    const sessionData = createSessionInfo(userData, permissions);

    // Enregistrer l'événement de connexion dans l'audit
    auditStorage.logEvent(auditStorage.constructor.EVENT_TYPES.LOGIN, {
      userId: userData.id,
      userName: `${userData.name || userData.firstName + ' ' + userData.lastName}`,
      userRole: userData.role,
      sessionId: sessionData.sessionId,
      loginMethod: 'credentials',
      permissionsCount: permissions.length
    });

    // Sauvegarder dans localStorage
    try {
      const authData = {
        user: userData,
        company: companyData,
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

  const logout = (rememberEmail = false) => {
    // Enregistrer l'événement de déconnexion avant de nettoyer les données
    if (user && sessionInfo) {
      auditStorage.logEvent(auditStorage.constructor.EVENT_TYPES.LOGOUT, {
        userId: user.id,
        userName: `${user.name || user.firstName + ' ' + user.lastName}`,
        userRole: user.role,
        sessionId: sessionInfo.sessionId,
        sessionDuration: getSessionDuration(),
        logoutType: 'manual'
      });
    }

    // Préparer les données à conserver (si "Se rappeler de moi" était activé)
    const emailToRemember = rememberEmail && user ? user.email : null;

    setUser(null);
    setCompany(null);
    setIsAuthenticated(false);
    setUserPermissions([]);
    setSessionInfo(null);

    // Nettoyer localStorage - clear ALL session-related data
    try {
      // Conserver les clés à supprimer
      const keysToRemove = [
        AUTH_STORAGE_KEY,
        'clinicmanager_token',
        'clinicmanager_user',
        'clinicmanager_company',
        'clinicmanager_permissions',
        'clinicmanager_session_info'
      ];

      // Supprimer toutes les clés de session
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });

      // Si l'utilisateur avait coché "Se rappeler de moi", conserver l'email
      if (emailToRemember) {
        localStorage.setItem('clinicmanager_remember_email', emailToRemember);
      } else {
        localStorage.removeItem('clinicmanager_remember_email');
      }
    } catch (error) {
      console.error('Erreur nettoyage session:', error);
      // Logger l'erreur dans l'audit
      auditStorage.logEvent(auditStorage.constructor.EVENT_TYPES.SYSTEM_ERROR, {
        errorType: 'session_cleanup_failed',
        errorMessage: error.message,
        context: 'logout'
      });
    }

    // Rediriger vers la page de connexion avec URL nettoyée
    window.location.href = '/';
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

  const updateCompany = (updatedData) => {
    const newCompanyData = { ...company, ...updatedData };
    setCompany(newCompanyData);

    // Mettre à jour localStorage
    try {
      const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
      if (savedAuth) {
        const authData = JSON.parse(savedAuth);
        authData.company = newCompanyData;
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
      console.error('Erreur mise à jour company:', error);
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
      company,
      isAuthenticated,
      isLoading,
      userPermissions,
      sessionInfo,

      // Méthodes d'authentification
      register,
      login,
      logout,
      updateUser,
      updateCompany,

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