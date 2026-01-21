/**
 * Composant de protection des routes authentifiées
 * Redirige vers /login si l'utilisateur n'est pas connecté
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLocaleNavigation } from '../../hooks/useLocaleNavigation';
import { Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { buildPath } = useLocaleNavigation();
  const { t } = useTranslation('common');

  // Afficher un loader pendant la vérification de la session
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <Heart className="h-12 w-12 text-green-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  // Rediriger vers login si non authentifié (avec locale)
  if (!isAuthenticated) {
    return <Navigate to={buildPath('/login')} replace />;
  }

  // Rendre les routes enfants si authentifié
  return children;
};

export default ProtectedRoute;
