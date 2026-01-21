/**
 * useAuth Hook
 * 🔐 Hook pour accéder au contexte d'authentification sécurisé
 *
 * IMPORTANT: Utilise SecureAuthContext v2 (UNIQUE contexte)
 * Les permissions viennent toujours du backend
 */

import { useAuth as useSecureAuth } from '../contexts/SecureAuthContext';

// Re-export depuis SecureAuthContext
export const useAuth = useSecureAuth;
export default useSecureAuth;
