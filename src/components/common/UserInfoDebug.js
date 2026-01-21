// components/common/UserInfoDebug.js
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Info, X, ChevronDown, ChevronRight } from 'lucide-react';

/**
 * Composant de débogage pour afficher les informations du compte connecté
 * Utile pour l'analyse et le développement
 */
const UserInfoDebug = () => {
  const { user, company, subscription, permissions } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    user: true,
    company: false,
    subscription: false,
    permissions: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
        title="Afficher les informations du compte"
      >
        <Info className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-2xl border border-gray-200 w-96 max-h-[80vh] overflow-hidden z-50">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Info className="h-5 w-5" />
          <h3 className="font-semibold">Informations du Compte</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="hover:bg-blue-700 p-1 rounded"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="overflow-y-auto max-h-[calc(80vh-4rem)]">
        {/* User Section */}
        <div className="border-b">
          <button
            onClick={() => toggleSection('user')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
          >
            <div className="flex items-center space-x-2">
              {expandedSections.user ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span className="font-medium text-gray-900">👤 Utilisateur</span>
            </div>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              {user?.role || 'N/A'}
            </span>
          </button>
          {expandedSections.user && (
            <div className="px-4 pb-4 space-y-2 text-sm bg-gray-50">
              <div className="flex justify-between">
                <span className="text-gray-600">ID:</span>
                <span className="font-mono text-xs">{user?.id || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Nom:</span>
                <span className="font-medium">{user?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span className="text-xs">{user?.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Prénom:</span>
                <span>{user?.firstName || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Nom:</span>
                <span>{user?.lastName || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Rôle:</span>
                <span className="font-medium text-blue-600">{user?.role || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Statut:</span>
                <span className={user?.isActive ? 'text-green-600' : 'text-red-600'}>
                  {user?.isActive ? '✓ Actif' : '✗ Inactif'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Company Section */}
        <div className="border-b">
          <button
            onClick={() => toggleSection('company')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
          >
            <div className="flex items-center space-x-2">
              {expandedSections.company ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span className="font-medium text-gray-900">🏥 Clinique</span>
            </div>
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              {company?.country || 'N/A'}
            </span>
          </button>
          {expandedSections.company && (
            <div className="px-4 pb-4 space-y-2 text-sm bg-gray-50">
              <div className="flex justify-between">
                <span className="text-gray-600">ID:</span>
                <span className="font-mono text-xs">{company?.id || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Nom:</span>
                <span className="font-medium">{company?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pays:</span>
                <span>{company?.country || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Locale:</span>
                <span>{company?.locale || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span className="text-xs">{company?.email || 'N/A'}</span>
              </div>
              {company?.settings && (
                <div className="mt-2 pt-2 border-t">
                  <div className="text-gray-600 mb-1">Paramètres:</div>
                  <div className="text-xs space-y-1">
                    <div>Currency: {company.settings.currency || 'N/A'}</div>
                    <div>Date Format: {company.settings.dateFormat || 'N/A'}</div>
                    <div>VAT Label: {company.settings.vatLabel || 'N/A'}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Subscription Section */}
        <div className="border-b">
          <button
            onClick={() => toggleSection('subscription')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
          >
            <div className="flex items-center space-x-2">
              {expandedSections.subscription ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span className="font-medium text-gray-900">💳 Abonnement</span>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${
              subscription?.status === 'active'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {subscription?.status || 'N/A'}
            </span>
          </button>
          {expandedSections.subscription && (
            <div className="px-4 pb-4 space-y-2 text-sm bg-gray-50">
              <div className="flex justify-between">
                <span className="text-gray-600">Statut:</span>
                <span className={`font-medium ${
                  subscription?.status === 'active' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {subscription?.status || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Plan:</span>
                <span className="font-medium capitalize">{subscription?.plan || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Actif:</span>
                <span className={subscription?.isActive ? 'text-green-600' : 'text-red-600'}>
                  {subscription?.isActive ? '✓ Oui' : '✗ Non'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Essai:</span>
                <span>{subscription?.isTrial ? 'Oui' : 'Non'}</span>
              </div>

              {subscription?.features && (
                <div className="mt-2 pt-2 border-t">
                  <div className="text-gray-600 mb-1">Features ({subscription.features.length}):</div>
                  <div className="flex flex-wrap gap-1">
                    {subscription.features.map((feature, idx) => (
                      <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {subscription?.planLimits && (
                <div className="mt-2 pt-2 border-t">
                  <div className="text-gray-600 mb-1">Limites:</div>
                  <div className="text-xs space-y-1">
                    <div>Max Users: {subscription.planLimits.maxUsers}</div>
                    <div>Max Patients: {subscription.planLimits.maxPatients}</div>
                    <div>Max Appointments/mois: {subscription.planLimits.maxAppointmentsPerMonth}</div>
                    <div>Storage: {subscription.planLimits.maxStorageGB} GB</div>
                  </div>
                </div>
              )}

              {subscription?.usage && (
                <div className="mt-2 pt-2 border-t">
                  <div className="text-gray-600 mb-1">Usage actuel:</div>
                  <div className="text-xs space-y-1">
                    <div>Users: {subscription.usage.users}</div>
                    <div>Patients: {subscription.usage.patients}</div>
                    <div>Appointments ce mois: {subscription.usage.appointmentsThisMonth}</div>
                    <div>Storage: {subscription.usage.storageUsedGB} GB</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Permissions Section */}
        <div>
          <button
            onClick={() => toggleSection('permissions')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
          >
            <div className="flex items-center space-x-2">
              {expandedSections.permissions ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span className="font-medium text-gray-900">🔐 Permissions</span>
            </div>
            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
              {permissions?.length || 0}
            </span>
          </button>
          {expandedSections.permissions && (
            <div className="px-4 pb-4 bg-gray-50">
              <div className="text-sm text-gray-600 mb-2">
                Total: {permissions?.length || 0} permissions
              </div>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {permissions?.map((perm, idx) => (
                  <div key={idx} className="flex items-center space-x-2 text-xs">
                    <span className="text-green-600">✓</span>
                    <span className="font-mono">{perm}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t bg-gray-50 p-3 text-center">
        <p className="text-xs text-gray-500">
          Composant de débogage - Version 1.0
        </p>
      </div>
    </div>
  );
};

export default UserInfoDebug;
