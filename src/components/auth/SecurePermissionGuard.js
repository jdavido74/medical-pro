/**
 * SecurePermissionGuard
 * 🔐 Composant de sécurité pour contrôler l'accès basé sur les permissions
 *
 * RÈGLES:
 * 1. Utilise les permissions du backend (pas localStorage)
 * 2. Affiche ou masque le contenu basé sur les permissions
 * 3. Dénit l'accès si pas de permission (fallback)
 */

import React, { useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';

const SecurePermissionGuard = ({
  children,
  permission = null,
  permissions = [],
  requireAll = false,
  fallback = null,
  showMessage = true
}) => {
  const { hasPermission, hasAllPermissions, hasAnyPermission, isAuthenticated } = useAuth();

  // Déterminer si l'utilisateur a accès
  const hasAccess = useMemo(() => {
    if (!isAuthenticated) {
      return false;
    }

    // Normaliser les permissions en array
    let requiredPermissions = [];

    if (permission) {
      requiredPermissions = [permission];
    } else if (Array.isArray(permissions) && permissions.length > 0) {
      requiredPermissions = permissions;
    } else {
      // Pas de permissions requises = accès gratuit
      return true;
    }

    // Vérifier les permissions
    if (requireAll) {
      return hasAllPermissions(requiredPermissions);
    } else {
      return hasAnyPermission(requiredPermissions);
    }
  }, [
    isAuthenticated,
    permission,
    permissions,
    requireAll,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission
  ]);

  // Si pas d'accès
  if (!hasAccess) {
    if (fallback !== null) {
      return fallback;
    }

    if (showMessage) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 font-medium">Accès non autorisé</p>
          <p className="text-red-600 text-sm mt-1">
            Vous n'avez pas la permission d'accéder à cette ressource.
          </p>
        </div>
      );
    }

    return null;
  }

  // Accès autorisé: afficher le contenu
  return children;
};

export default SecurePermissionGuard;
