/**
 * SubscriptionGuard
 * Composant qui vérifie si la subscription est active
 * Bloque l'accès et affiche un message si subscription expirée/suspendue
 */

import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLocaleNavigation } from '../hooks/useLocaleNavigation';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SubscriptionGuard = ({ children }) => {
  const { subscription, isSubscriptionActive } = useAuth();
  const { buildPath, navigateTo } = useLocaleNavigation();
  const { t } = useTranslation('common');

  // Si subscription active, rendre les enfants normalement
  if (isSubscriptionActive()) {
    return children;
  }

  // Sinon, afficher message d'expiration
  const getStatusMessage = () => {
    if (!subscription) {
      return 'Aucun abonnement actif';
    }

    switch (subscription.status) {
      case 'suspended':
        return 'Abonnement suspendu';
      case 'cancelled':
        return 'Abonnement annulé';
      case 'trial':
        return 'Période d\'essai expirée';
      default:
        return 'Abonnement expiré';
    }
  };

  const getStatusDescription = () => {
    if (!subscription) {
      return 'Vous n\'avez pas d\'abonnement actif. Veuillez souscrire à un plan.';
    }

    switch (subscription.status) {
      case 'suspended':
        return 'Votre abonnement a été suspendu. Veuillez mettre à jour votre moyen de paiement.';
      case 'cancelled':
        return 'Votre abonnement a été annulé. Vous pouvez le réactiver à tout moment.';
      case 'trial':
        return `Votre période d'essai a expiré le ${new Date(subscription.expiresAt).toLocaleDateString('fr-FR')}. Souscrivez maintenant pour continuer.`;
      default:
        return `Votre abonnement a expiré le ${new Date(subscription.expiresAt).toLocaleDateString('fr-FR')}.`;
    }
  };

  const getActionButton = () => {
    switch (subscription?.status) {
      case 'suspended':
        return {
          text: 'Mettre à jour le paiement',
          action: () => navigateTo('/billing/payment-method')
        };
      case 'cancelled':
        return {
          text: 'Réactiver l\'abonnement',
          action: () => navigateTo('/billing/reactivate')
        };
      default:
        return {
          text: 'Renouveler maintenant',
          action: () => navigateTo('/billing/subscribe')
        };
    }
  };

  const actionButton = getActionButton();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {/* Icon */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <AlertCircle className="h-8 w-8 text-orange-600" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {getStatusMessage()}
          </h2>

          {/* Description */}
          <p className="text-gray-600 mb-6">
            {getStatusDescription()}
          </p>
        </div>

        {/* Plan Info */}
        {subscription && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Plan actuel:</span>
              <span className="font-semibold text-gray-900 capitalize">
                {subscription.plan || 'Aucun'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Statut:</span>
              <span className={`font-semibold capitalize ${
                subscription.status === 'active' ? 'text-green-600' :
                subscription.status === 'trial' ? 'text-blue-600' :
                subscription.status === 'suspended' ? 'text-orange-600' :
                'text-red-600'
              }`}>
                {subscription.status}
              </span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={actionButton.action}
          className="w-full bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
        >
          <RefreshCw className="h-5 w-5" />
          {actionButton.text}
        </button>

        {/* Help Link */}
        <div className="mt-6 text-center">
          <a
            href={buildPath('/support')}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Besoin d'aide ? Contactez le support
          </a>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionGuard;
