// components/auth/PermissionGuard.js
import React from 'react';
import { AlertCircle, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { permissionsStorage } from '../../utils/permissionsStorage';

const PermissionGuard = ({
  children,
  permission = null,
  permissions = [],
  requireAll = false,
  fallback = null,
  showMessage = true,
  customMessage = null
}) => {
  const { user } = useAuth();

  // Obtenir les permissions de l'utilisateur
  const userPermissions = permissionsStorage.getUserPermissions(user);

  // Déterminer les permissions requises
  const requiredPermissions = permission ? [permission] : permissions;

  // Vérifier les permissions
  let hasAccess = false;

  if (requiredPermissions.length === 0) {
    // Aucune permission requise
    hasAccess = true;
  } else if (requireAll) {
    // Toutes les permissions sont requises
    hasAccess = permissionsStorage.hasAllPermissions(userPermissions, requiredPermissions);
  } else {
    // Au moins une permission est requise
    hasAccess = permissionsStorage.hasAnyPermission(userPermissions, requiredPermissions);
  }

  // Si l'utilisateur a accès, afficher le contenu
  if (hasAccess) {
    return children;
  }

  // Si un fallback personnalisé est fourni, l'utiliser
  if (fallback !== null) {
    return fallback;
  }

  // Si on ne doit pas afficher de message, ne rien afficher
  if (!showMessage) {
    return null;
  }

  // Afficher le message d'accès refusé par défaut
  return (
    <div className="flex items-center justify-center min-h-[200px] p-6">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
          <Lock className="h-8 w-8 text-red-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Accès non autorisé
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {customMessage ||
            `Vous n'avez pas les permissions nécessaires pour accéder à cette fonctionnalité.`
          }
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-amber-400 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">Permissions requises :</p>
              <ul className="list-disc list-inside space-y-1">
                {requiredPermissions.map(perm => (
                  <li key={perm}>
                    {permissionsStorage.getPermissionLabel(perm)}
                  </li>
                ))}
              </ul>
              {requireAll && requiredPermissions.length > 1 && (
                <p className="mt-2 text-xs font-medium">
                  ⚠️ Toutes les permissions ci-dessus sont requises
                </p>
              )}
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          Contactez votre administrateur pour obtenir les permissions nécessaires.
        </p>
      </div>
    </div>
  );
};

// Hook personnalisé pour vérifier les permissions
export const usePermissions = () => {
  const { user } = useAuth();

  const userPermissions = permissionsStorage.getUserPermissions(user);

  return {
    permissions: userPermissions,
    hasPermission: (permission) =>
      permissionsStorage.hasPermission(userPermissions, permission),
    hasAnyPermission: (permissions) =>
      permissionsStorage.hasAnyPermission(userPermissions, permissions),
    hasAllPermissions: (permissions) =>
      permissionsStorage.hasAllPermissions(userPermissions, permissions),
    user,
    role: user?.role
  };
};

// Composant pour afficher conditionnellement du contenu selon les permissions
export const PermissionAware = ({
  permission,
  permissions = [],
  requireAll = false,
  children,
  fallback = null
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions.length > 0) {
    hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  } else {
    hasAccess = true;
  }

  if (hasAccess) {
    return children;
  }

  return fallback;
};

// Composant bouton avec vérification de permissions
export const PermissionButton = ({
  permission,
  permissions = [],
  requireAll = false,
  children,
  onClick,
  disabled = false,
  className = '',
  disabledTitle = 'Permissions insuffisantes',
  ...props
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

  let hasAccess = true;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions.length > 0) {
    hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  }

  const isDisabled = disabled || !hasAccess;

  return (
    <button
      {...props}
      disabled={isDisabled}
      onClick={hasAccess ? onClick : undefined}
      title={!hasAccess ? disabledTitle : props.title}
      className={`${className} ${!hasAccess ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
};

export default PermissionGuard;