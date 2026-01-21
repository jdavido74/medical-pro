/**
 * Composant de protection des routes publiques
 * Redirige vers /dashboard si l'utilisateur est déjà connecté
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLocaleNavigation } from '../../hooks/useLocaleNavigation';
import { Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const PublicRoute = ({ children }) => {
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

  // Rediriger vers dashboard si déjà authentifié (avec locale)
  if (isAuthenticated) {
    return <Navigate to={buildPath('/dashboard')} replace />;
  }

  // Rendre les routes enfants si non authentifié
  return children;
};

export default PublicRoute;
