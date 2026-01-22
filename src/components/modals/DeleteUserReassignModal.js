/**
 * Delete User with Reassignment Modal
 *
 * Shows statistics about what will be affected by deleting a user
 * and allows selecting another practitioner for reassignment of:
 * - Future appointments
 * - Patients (as primary physician)
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  Calendar,
  Users,
  FileText,
  History,
  ArrowRight,
  Loader2,
  UserCheck,
  Trash2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { healthcareProvidersApi } from '../../api/healthcareProvidersApi';

const DeleteUserReassignModal = ({
  isOpen,
  onClose,
  onConfirm,
  user,
  providers = []
}) => {
  const { t } = useTranslation(['admin', 'common']);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [stats, setStats] = useState(null);
  const [reassignTo, setReassignTo] = useState('');
  const [error, setError] = useState(null);

  // Filter out the user being deleted from available providers
  const availableProviders = providers.filter(
    p => p.id !== user?.id && p.isActive && p.accountStatus !== 'deleted'
  );

  // Load deletion statistics
  useEffect(() => {
    const loadStats = async () => {
      if (!isOpen || !user?.id) return;

      setIsLoading(true);
      setError(null);

      try {
        const result = await healthcareProvidersApi.getDeletionStats(user.id);
        setStats(result.stats);
      } catch (err) {
        console.error('[DeleteUserReassignModal] Error loading stats:', err);
        setError(t('admin:usersManagement.deleteModal.loadError', 'Erreur lors du chargement des statistiques'));
        setStats({
          futureAppointments: 0,
          patientsAsPrimary: 0,
          pastAppointments: 0,
          medicalRecords: 0
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, [isOpen, user?.id, t]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setReassignTo('');
      setStats(null);
      setError(null);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      await onConfirm(user.id, reassignTo || null);
      onClose();
    } catch (err) {
      console.error('[DeleteUserReassignModal] Error during deletion:', err);
      setError(err.message || t('admin:usersManagement.deleteModal.deleteError', 'Erreur lors de la suppression'));
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  const needsReassignment = stats && (stats.futureAppointments > 0 || stats.patientsAsPrimary > 0);
  const canDelete = !needsReassignment || reassignTo;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {t('admin:usersManagement.deleteModal.title', 'Supprimer l\'utilisateur')}
                </h2>
                <p className="text-sm text-gray-500">
                  {user?.firstName} {user?.lastName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Loading state */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-2 text-gray-600">
                  {t('common:loading', 'Chargement...')}
                </span>
              </div>
            ) : (
              <>
                {/* Statistics */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    {t('admin:usersManagement.deleteModal.impactTitle', 'Impact de la suppression')}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`p-3 rounded-lg ${stats?.futureAppointments > 0 ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-2">
                        <Calendar className={`h-5 w-5 ${stats?.futureAppointments > 0 ? 'text-orange-500' : 'text-gray-400'}`} />
                        <span className="text-2xl font-bold text-gray-900">{stats?.futureAppointments || 0}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {t('admin:usersManagement.deleteModal.futureAppointments', 'RDV à venir')}
                      </p>
                    </div>

                    <div className={`p-3 rounded-lg ${stats?.patientsAsPrimary > 0 ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-2">
                        <Users className={`h-5 w-5 ${stats?.patientsAsPrimary > 0 ? 'text-orange-500' : 'text-gray-400'}`} />
                        <span className="text-2xl font-bold text-gray-900">{stats?.patientsAsPrimary || 0}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {t('admin:usersManagement.deleteModal.patientsAsPrimary', 'Patients (médecin traitant)')}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-2">
                        <History className="h-5 w-5 text-gray-400" />
                        <span className="text-2xl font-bold text-gray-900">{stats?.pastAppointments || 0}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {t('admin:usersManagement.deleteModal.pastAppointments', 'RDV passés (conservés)')}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <span className="text-2xl font-bold text-gray-900">{stats?.medicalRecords || 0}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {t('admin:usersManagement.deleteModal.medicalRecords', 'Dossiers médicaux (conservés)')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Reassignment section */}
                {needsReassignment && (
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <ArrowRight className="h-4 w-4" />
                      {t('admin:usersManagement.deleteModal.reassignTitle', 'Réattribuer les dossiers actifs à')}
                    </h3>

                    {availableProviders.length === 0 ? (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
                        {t('admin:usersManagement.deleteModal.noProvidersAvailable', 'Aucun autre praticien disponible pour la réattribution')}
                      </div>
                    ) : (
                      <select
                        value={reassignTo}
                        onChange={(e) => setReassignTo(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">
                          {t('admin:usersManagement.deleteModal.selectProvider', '-- Sélectionner un praticien --')}
                        </option>
                        {availableProviders.map(provider => (
                          <option key={provider.id} value={provider.id}>
                            {provider.title ? `${provider.title} ` : ''}
                            {provider.firstName} {provider.lastName}
                            {provider.profession ? ` - ${provider.profession}` : ''}
                          </option>
                        ))}
                      </select>
                    )}

                    {!reassignTo && (
                      <p className="mt-2 text-xs text-orange-600">
                        {t('admin:usersManagement.deleteModal.reassignRequired', 'La réattribution est obligatoire car cet utilisateur a des RDV à venir ou des patients assignés')}
                      </p>
                    )}
                  </div>
                )}

                {/* Info about what will be preserved */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700">
                    <strong>{t('admin:usersManagement.deleteModal.preservedTitle', 'Données conservées :')}</strong>{' '}
                    {t('admin:usersManagement.deleteModal.preservedInfo', 'Les dossiers médicaux et l\'historique des rendez-vous passés resteront liés à cet utilisateur pour la traçabilité.')}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {t('common:cancel', 'Annuler')}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading || isDeleting || !canDelete}
              className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('admin:usersManagement.deleteModal.deleting', 'Suppression...')}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  {t('admin:usersManagement.deleteModal.confirmDelete', 'Supprimer')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteUserReassignModal;
