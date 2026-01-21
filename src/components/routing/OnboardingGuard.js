/**
 * OnboardingGuard - Route protection for admin onboarding
 *
 * Ensures that new admin accounts complete the onboarding wizard
 * before accessing the main application.
 *
 * Features:
 * - Blocks access to dashboard/app until setup is complete
 * - Allows access to onboarding route
 * - Only affects admin users with setupStatus !== 'completed'
 * - Shows loading state while checking auth
 *
 * @example
 * // In App.js, wrap the main app with OnboardingGuard
 * <SecureAuthProvider>
 *   <OnboardingGuard>
 *     <ClinicStatusGuard>
 *       <App />
 *     </ClinicStatusGuard>
 *   </OnboardingGuard>
 * </SecureAuthProvider>
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLocaleNavigation } from '../../hooks/useLocaleNavigation';
import { Settings } from 'lucide-react';

const OnboardingGuard = ({ children }) => {
  const { isAuthenticated, isLoading, isSetupRequired, user } = useAuth();
  const { buildPath } = useLocaleNavigation();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Settings className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, don't block (let other guards handle this)
  if (!isAuthenticated) {
    return children;
  }

  // Check if current path is the onboarding route
  const isOnboardingRoute = location.pathname.includes('/onboarding');

  // Allow access to logout route
  const isLogoutRoute = location.pathname.includes('/logout');

  // If user is on onboarding route, allow access
  if (isOnboardingRoute || isLogoutRoute) {
    return children;
  }

  // If setup is required (admin with incomplete setup), redirect to onboarding
  if (isSetupRequired) {
    console.log('[OnboardingGuard] Setup required, redirecting to onboarding...');
    return <Navigate to={buildPath('/onboarding')} replace />;
  }

  // Setup complete or not required, render children
  return children;
};

export default OnboardingGuard;
