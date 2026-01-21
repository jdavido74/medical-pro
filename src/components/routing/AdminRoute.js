/**
 * Composant de protection des routes d'administration
 * Redirige vers /dashboard si l'utilisateur n'est pas admin
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLocaleNavigation } from '../../hooks/useLocaleNavigation';
import { canAccessAdministration } from '../../utils/userRoles';
import { Shield } from 'lucide-react';

const AdminRoute = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { buildPath } = useLocaleNavigation();

  // Afficher un loader pendant la vérification de la session
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Vérification...</p>
        </div>
      </div>
    );
  }

  // Rediriger vers login si non authentifié
  if (!isAuthenticated) {
    return <Navigate to={buildPath('/login')} replace />;
  }

  // Vérifier l'accès administration (soit rôle admin/super_admin, soit rôle administratif délégué)
  const hasAccess = canAccessAdministration(user);

  // Redirection silencieuse vers dashboard si pas les permissions
  if (!hasAccess) {
    return <Navigate to={buildPath('/dashboard')} replace />;
  }

  // Rendre les routes enfants si admin
  return children;
};

export default AdminRoute;
