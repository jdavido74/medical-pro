/**
 * PermissionRoute - Route protection based on permissions
 *
 * Protects routes by checking user permissions.
 * Silently redirects to dashboard if user lacks required permissions.
 *
 * Features:
 * - Single permission check
 * - Multiple permissions (any/all modes)
 * - Medical-only routes (restricted to healthcare professionals)
 * - Admin-only routes
 *
 * @example
 * // Single permission
 * <PermissionRoute permission="medical_records.view">
 *   <MedicalRecordsModule />
 * </PermissionRoute>
 *
 * @example
 * // Medical professionals only
 * <PermissionRoute permission="medical_records.view" medicalOnly>
 *   <MedicalRecordsModule />
 * </PermissionRoute>
 *
 * @example
 * // Multiple permissions (any)
 * <PermissionRoute permissions={['quotes.view', 'invoices.view']}>
 *   <FinanceModule />
 * </PermissionRoute>
 *
 * @example
 * // Multiple permissions (all required)
 * <PermissionRoute permissions={['users.view', 'users.create']} requireAll>
 *   <UserManagementModule />
 * </PermissionRoute>
 */

import React, { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../auth/PermissionGuard';
import { useLocaleNavigation } from '../../hooks/useLocaleNavigation';
import { isPractitionerRole, canAccessAdministration } from '../../utils/userRoles';
import { Shield } from 'lucide-react';

const PermissionRoute = ({
  children,
  permission = null,      // Single permission string
  permissions = null,     // Array of permission strings
  requireAll = false,     // If true, all permissions required; if false, any permission
  medicalOnly = false,    // Restrict to healthcare professionals only
  adminOnly = false,      // Restrict to admin/super_admin only
  fallbackPath = '/dashboard' // Path to redirect to when access denied
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();
  const { buildPath } = useLocaleNavigation();

  // Compute access permission
  const hasAccess = useMemo(() => {
    // Not authenticated = no access
    if (!isAuthenticated || !user) return false;

    // Check medical-only restriction: rely on the permission check below
    // (allows admin users who were explicitly granted medical permissions)
    if (medicalOnly && permission && !hasPermission(permission)) {
      return false;
    }

    // Check admin-only restriction
    if (adminOnly && !canAccessAdministration(user)) {
      return false;
    }

    // Check single permission
    if (permission) {
      return hasPermission(permission);
    }

    // Check multiple permissions
    if (permissions && permissions.length > 0) {
      return requireAll
        ? hasAllPermissions(permissions)
        : hasAnyPermission(permissions);
    }

    // No permission specified = access granted (if other checks pass)
    return true;
  }, [
    isAuthenticated,
    user,
    permission,
    permissions,
    requireAll,
    medicalOnly,
    adminOnly,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions
  ]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Vérification des permissions...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={buildPath('/login')} replace />;
  }

  // Silent redirect to fallback path if no access
  if (!hasAccess) {
    return <Navigate to={buildPath(fallbackPath)} replace />;
  }

  // Render children if access granted
  return children;
};

export default PermissionRoute;
