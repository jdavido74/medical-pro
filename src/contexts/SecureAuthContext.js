/**
 * SecureAuthContext v2
 * 🔐 UNIQUE CONTEXTE D'AUTHENTIFICATION
 *
 * RÈGLES DE SÉCURITÉ:
 * 1. localStorage → SEULEMENT le JWT token
 * 2. user/company/subscription/permissions → State React (volatile)
 * 3. Source de vérité → Backend /auth/me OU /auth/login
 * 4. Aucune donnée sensible modifiable côté client
 * 5. Subscription validée par le backend
 *
 * OPTIMISATIONS INTÉGRÉES:
 * - Login retourne tout (pas de double appel /auth/me)
 * - Cache /auth/me 5 minutes (évite appels répétés)
 * - Auto-refresh token 1h avant expiration
 * - Permissions statiques (pas de calcul)
 * - Redirections locale-aware
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { baseClient } from '../api/baseClient';
import { jwtDecode, getTokenExpiration, getTimeUntilExpiration, isTokenExpired } from '../utils/jwtUtils';
import { redirectToLogin } from '../utils/localeRedirect';

const SecureAuthContext = createContext();

const STORAGE_KEY = 'clinicmanager_token';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const REFRESH_BEFORE_EXPIRY = 60 * 60 * 1000; // 1 heure avant expiration

export const SecureAuthProvider = ({ children }) => {
  // ============ STATE (Volatile - jamais en localStorage) ============
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Setup status for onboarding (new admin accounts)
  const [setupStatus, setSetupStatus] = useState('completed'); // Default: completed for existing accounts

  // Cache pour /auth/me
  const [lastFetchTime, setLastFetchTime] = useState(null);

  // Timer pour auto-refresh du token
  const [refreshTimer, setRefreshTimer] = useState(null);

  // ============ HELPER: Mettre à jour le state depuis les data backend ============
  const updateAuthState = useCallback((data) => {
    setUser(data.user || null);
    setCompany(data.company || null);
    setSubscription(data.subscription || null);
    setPermissions(data.permissions || []);
    setIsAuthenticated(!!data.user);
    setError(null);

    // Update setup status from company data
    // Default to 'completed' for backwards compatibility with existing accounts
    const companySetupStatus = data.company?.setupStatus || 'completed';
    setSetupStatus(companySetupStatus);
  }, []);

  // ============ HELPER: Nettoyer le state ============
  const clearAuthState = useCallback(() => {
    setUser(null);
    setCompany(null);
    setSubscription(null);
    setPermissions([]);
    setIsAuthenticated(false);
    setError(null);
    setLastFetchTime(null);
    setSetupStatus('completed'); // Reset to default

    // Nettoyer le timer de refresh
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      setRefreshTimer(null);
    }
  }, [refreshTimer]);

  // ============ AUTO-REFRESH TOKEN ============
  const scheduleTokenRefresh = useCallback((token) => {
    try {
      // Nettoyer l'ancien timer
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }

      const expiresAt = getTokenExpiration(token);
      if (!expiresAt) {
        console.warn('[Auth] Cannot schedule refresh: invalid token');
        return;
      }

      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;

      // Refresh 1h avant expiration (ou 80% de la durée si < 1h)
      const refreshDelay = Math.max(
        timeUntilExpiry - REFRESH_BEFORE_EXPIRY,
        timeUntilExpiry * 0.8
      );

      if (refreshDelay > 0) {
        console.log(`⏰ [Auth] Token refresh scheduled in ${Math.floor(refreshDelay / 1000 / 60)} minutes`);

        const timer = setTimeout(async () => {
          console.log('🔄 [Auth] Auto-refreshing token...');
          await refreshToken();
        }, refreshDelay);

        setRefreshTimer(timer);
      } else {
        // Token expire bientôt ou déjà expiré
        console.warn('⚠️ [Auth] Token expires soon or expired, refreshing now');
        refreshToken();
      }
    } catch (error) {
      console.error('[Auth] Failed to schedule token refresh:', error);
    }
  }, [refreshTimer]);

  // ============ REFRESH TOKEN ============
  const refreshToken = useCallback(async () => {
    try {
      const currentToken = localStorage.getItem(STORAGE_KEY);

      if (!currentToken) {
        console.warn('[Auth] No token to refresh');
        return false;
      }

      console.log('🔄 [Auth] Refreshing token...');

      const response = await baseClient.post('/auth/refresh', {
        token: currentToken
      });

      if (!response.success || !response.data?.tokens?.accessToken) {
        throw new Error('Token refresh failed');
      }

      const newToken = response.data.tokens.accessToken;
      localStorage.setItem(STORAGE_KEY, newToken);

      // Replanifier le prochain refresh
      scheduleTokenRefresh(newToken);

      console.log('✅ [Auth] Token refreshed successfully');
      return true;
    } catch (error) {
      console.error('❌ [Auth] Token refresh failed:', error);

      // Si refresh échoue, déconnecter
      logout();
      return false;
    }
  }, [scheduleTokenRefresh]);

  // ============ LOAD USER FROM BACKEND (/auth/me) ============
  const loadUserFromBackend = useCallback(async (force = false) => {
    try {
      // Vérifier le cache (sauf si forcé)
      if (!force && lastFetchTime) {
        const elapsed = Date.now() - lastFetchTime;
        if (elapsed < CACHE_DURATION) {
          console.log('📦 [Auth] Using cached user data');
          return true;
        }
      }

      console.log('🔄 [Auth] Fetching user data from /auth/me...');

      const response = await baseClient.get('/auth/me');

      if (!response.success || !response.data?.user) {
        throw new Error('Failed to load user data');
      }

      // Enrichir user avec providerId pour les opérations cliniques (cohérent avec login)
      const { user, providerId, ...rest } = response.data;
      const enrichedUser = user ? { ...user, providerId } : null;

      // Mettre à jour le state avec l'utilisateur enrichi
      updateAuthState({ ...rest, user: enrichedUser });
      setLastFetchTime(Date.now());

      console.log('✅ [Auth] User data loaded from backend', { providerId: enrichedUser?.providerId });
      return true;
    } catch (error) {
      console.error('[Auth] Failed to load user from backend:', error);

      // Si 401, token invalide → nettoyer
      if (error.status === 401) {
        localStorage.removeItem(STORAGE_KEY);
        clearAuthState();
      }

      setError(error.message);
      return false;
    }
  }, [lastFetchTime, updateAuthState, clearAuthState]);

  // ============ REGISTER ============
  const register = useCallback(async (registrationData) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('📝 [Auth] Starting registration...');

      // Appel backend /auth/register
      const response = await baseClient.post('/auth/register', {
        // Company data
        companyName: registrationData.clinicName,
        country: registrationData.country,
        locale: registrationData.locale,
        companyEmail: registrationData.email,
        companyPhone: registrationData.phone,

        // User data
        email: registrationData.email,
        password: registrationData.password,
        firstName: registrationData.firstName,
        lastName: registrationData.lastName,

        // Terms
        acceptTerms: registrationData.acceptTerms
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Registration failed');
      }

      console.log('✅ [Auth] Registration successful');

      // NE PAS auto-login → Email verification requise
      return response;
    } catch (error) {
      console.error('[Auth] Registration failed:', error);
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ============ LOGIN ============
  const login = useCallback(async (email, password, companyId = null) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔑 [Auth] Starting login...');

      // Appel backend /auth/login
      // Ne pas envoyer companyId s'il est null/undefined (évite erreur validation)
      const loginPayload = { email, password };
      if (companyId) {
        loginPayload.companyId = companyId;
      }

      const response = await baseClient.post('/auth/login', loginPayload);

      if (!response.success) {
        throw new Error(response.error?.message || 'Login failed');
      }

      // Multi-clinic selection required?
      if (response.data?.requiresClinicSelection) {
        console.log('🏥 [Auth] Multi-clinic selection required');
        return {
          requiresClinicSelection: true,
          clinics: response.data.clinics
        };
      }

      // ============ DEFERRED PROVISIONING CHECK ============
      // If clinic database is not provisioned, return special response
      // LoginPage will redirect to ClinicProvisioningPage
      if (response.data?.requiresProvisioning) {
        console.log('🔧 [Auth] Clinic provisioning required');
        return {
          requiresProvisioning: true,
          provisioningToken: response.data.provisioningToken,
          user: response.data.user,
          company: response.data.company
        };
      }

      // OPTIMISATION: Backend retourne TOUT (user + company + subscription + permissions + providerId)
      // Pas besoin d'appeler /auth/me après le login !
      const { user, company, subscription, permissions, providerId, tokens } = response.data;

      if (!tokens?.accessToken) {
        throw new Error('No token received from backend');
      }

      // Stocker SEULEMENT le token
      localStorage.setItem(STORAGE_KEY, tokens.accessToken);

      // Enrichir user avec providerId pour les opérations cliniques
      const enrichedUser = user ? { ...user, providerId } : null;

      // Mettre à jour le state avec les données reçues
      updateAuthState({ user: enrichedUser, company, subscription, permissions });
      setLastFetchTime(Date.now()); // Marquer comme "fresh"

      // Planifier auto-refresh du token
      scheduleTokenRefresh(tokens.accessToken);

      console.log('✅ [Auth] Login successful');
      return { success: true };
    } catch (error) {
      console.error('[Auth] Login failed:', error);
      setError(error.message);

      // Nettoyer en cas d'erreur
      localStorage.removeItem(STORAGE_KEY);
      clearAuthState();

      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [updateAuthState, clearAuthState, scheduleTokenRefresh]);

  // ============ LOGOUT ============
  const logout = useCallback(async () => {
    console.log('🚪 [Auth] Logging out...');

    // Appel backend (optionnel, pour audit)
    try {
      await baseClient.post('/auth/logout');
    } catch (error) {
      console.warn('[Auth] Logout endpoint failed (continuing anyway):', error);
    }

    // Nettoyer TOUT
    localStorage.removeItem(STORAGE_KEY);
    clearAuthState();

    // Rediriger vers login avec locale
    redirectToLogin();
  }, [clearAuthState]);

  // ============ PERMISSIONS HELPERS ============
  const hasPermission = useCallback((permission) => {
    if (!isAuthenticated || !permissions) {
      return false;
    }

    // Wildcard check (super_admin)
    if (permissions.includes('*')) {
      return true;
    }

    // Exact match
    if (permissions.includes(permission)) {
      return true;
    }

    // Wildcard match (e.g., "patients.*" matches "patients.read")
    const wildcardPerm = permission.split('.')[0] + '.*';
    if (permissions.includes(wildcardPerm)) {
      return true;
    }

    return false;
  }, [permissions, isAuthenticated]);

  const hasAnyPermission = useCallback((requiredPermissions) => {
    if (!isAuthenticated || !permissions) {
      return false;
    }

    return requiredPermissions.some(perm => hasPermission(perm));
  }, [permissions, isAuthenticated, hasPermission]);

  const hasAllPermissions = useCallback((requiredPermissions) => {
    if (!isAuthenticated || !permissions) {
      return false;
    }

    return requiredPermissions.every(perm => hasPermission(perm));
  }, [permissions, isAuthenticated, hasPermission]);

  // ============ SUBSCRIPTION HELPERS ============
  const isSubscriptionActive = useCallback(() => {
    if (!subscription) {
      return false;
    }

    return subscription.status === 'active' || subscription.status === 'trial';
  }, [subscription]);

  const hasFeature = useCallback((feature) => {
    if (!subscription || !subscription.features) {
      return false;
    }

    return subscription.features.includes(feature);
  }, [subscription]);

  // ============ SETUP/ONBOARDING HELPERS ============
  /**
   * Check if onboarding setup is required for this admin user
   * Only new admin accounts (created after onboarding feature) need to complete setup
   */
  const isSetupRequired = user?.role === 'admin' && setupStatus !== 'completed';

  /**
   * Complete the onboarding setup
   * Calls the backend to mark setup as completed
   */
  const completeSetup = useCallback(async () => {
    try {
      console.log('✅ [Auth] Completing clinic setup...');

      const response = await baseClient.post('/clinic/complete-setup');

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to complete setup');
      }

      // Update local state
      setSetupStatus('completed');

      // Refresh user data to get updated company info
      await loadUserFromBackend(true);

      console.log('✅ [Auth] Setup completed successfully');
      return true;
    } catch (error) {
      console.error('[Auth] Failed to complete setup:', error);
      throw error;
    }
  }, [loadUserFromBackend]);

  // ============ REFRESH USER DATA (force reload from backend) ============
  const refreshUser = useCallback(async () => {
    return loadUserFromBackend(true);
  }, [loadUserFromBackend]);

  // ============ REFRESH PERMISSIONS (from clinic_roles table) ============
  /**
   * Refresh permissions from the backend's clinic_roles table
   * Call this after an admin modifies role permissions to get the updated permissions
   */
  const refreshPermissions = useCallback(async () => {
    try {
      console.log('🔄 [Auth] Refreshing permissions from backend...');

      const response = await baseClient.get('/auth/refresh-permissions');

      if (response.success && response.data?.permissions) {
        setPermissions(response.data.permissions);
        console.log('✅ [Auth] Permissions refreshed:', response.data.permissions.length, 'permissions');
        return { success: true, permissions: response.data.permissions };
      }

      // Si pas de permissions personnalisées, garder les permissions actuelles
      console.log('ℹ️ [Auth] No custom permissions found, keeping current');
      return { success: true, permissions: permissions };
    } catch (error) {
      console.error('[Auth] Failed to refresh permissions:', error);
      return { success: false, error: error.message };
    }
  }, [permissions]);

  // ============ INIT ON MOUNT ============
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem(STORAGE_KEY);

      if (!token) {
        console.log('📭 [Auth] No token found');
        setIsLoading(false);
        return;
      }

      // Vérifier si token expiré
      if (isTokenExpired(token)) {
        console.warn('⏰ [Auth] Token expired, clearing session');
        localStorage.removeItem(STORAGE_KEY);
        clearAuthState();
        setIsLoading(false);
        return;
      }

      console.log('🔑 [Auth] Token found, loading user data...');

      // Charger user depuis backend
      const success = await loadUserFromBackend();

      if (success) {
        // Planifier auto-refresh
        scheduleTokenRefresh(token);
      } else {
        // Failed to load → token invalide
        localStorage.removeItem(STORAGE_KEY);
        clearAuthState();
      }

      setIsLoading(false);
    };

    initAuth();

    // Cleanup timer au unmount
    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    };
  }, []); // Empty deps - run once on mount

  // ============ CONTEXT VALUE ============
  const value = {
    // State
    user,
    company,
    subscription,
    permissions,
    isAuthenticated,
    isLoading,
    error,

    // Setup/Onboarding state
    setupStatus,
    isSetupRequired,

    // Auth methods
    register,
    login,
    logout,

    // Permission methods
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    // Subscription methods
    isSubscriptionActive,
    hasFeature,

    // Setup/Onboarding methods
    completeSetup,

    // Utility methods
    refreshUser,         // Force reload from backend
    refreshToken,        // Force token refresh
    refreshPermissions   // Refresh permissions from clinic_roles
  };

  return (
    <SecureAuthContext.Provider value={value}>
      {children}
    </SecureAuthContext.Provider>
  );
};

// ============ HOOK ============
export const useAuth = () => {
  const context = useContext(SecureAuthContext);
  if (!context) {
    throw new Error('useAuth must be used within SecureAuthProvider');
  }
  return context;
};

export default SecureAuthContext;
