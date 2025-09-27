// components/modals/DelegationFormModal.js
import React, { useState, useEffect } from 'react';
import { X, UserCheck, Calendar, Shield, Bell, AlertTriangle } from 'lucide-react';
import { usersStorage } from '../../utils/usersStorage';
import { teamsStorage } from '../../utils/teamsStorage';
import { permissionsStorage } from '../../utils/permissionsStorage';

const DelegationFormModal = ({ isOpen, onClose, onSave, delegation = null, currentUser }) => {
  const [formData, setFormData] = useState({
    fromUserId: '',
    toUserId: '',
    permissions: [],
    reason: '',
    startDate: '',
    endDate: '',
    teamId: '',
    notifications: {
      startNotification: true,
      endNotification: true,
      dailyReminder: false
    }
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [availableTeams, setAvailableTeams] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [conflictWarning, setConflictWarning] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Charger les données
      const users = usersStorage.getAll().filter(user => user.isActive && !user.isDeleted);
      const teams = teamsStorage.getAllTeams().filter(team => team.isActive && !team.isDeleted);
      const permissions = permissionsStorage.getAllPermissions();

      setAvailableUsers(users);
      setAvailableTeams(teams);
      setAvailablePermissions(permissions);

      // Pré-remplir si modification
      if (delegation) {
        setFormData({
          fromUserId: delegation.fromUserId || '',
          toUserId: delegation.toUserId || '',
          permissions: delegation.permissions || [],
          reason: delegation.reason || '',
          startDate: delegation.startDate ? new Date(delegation.startDate).toISOString().split('T')[0] : '',
          endDate: delegation.endDate ? new Date(delegation.endDate).toISOString().split('T')[0] : '',
          teamId: delegation.teamId || '',
          notifications: {
            startNotification: true,
            endNotification: true,
            dailyReminder: false,
            ...delegation.notifications
          }
        });
      } else {
        // Pré-remplir pour création
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);

        setFormData({
          fromUserId: currentUser?.id || '',
          toUserId: '',
          permissions: [],
          reason: '',
          startDate: tomorrow.toISOString().split('T')[0],
          endDate: nextWeek.toISOString().split('T')[0],
          teamId: '',
          notifications: {
            startNotification: true,
            endNotification: true,
            dailyReminder: false
          }
        });
      }

      setErrors({});
      setConflictWarning('');
    }
  }, [isOpen, delegation, currentUser]);

  // Vérifier les conflits de délégation
  useEffect(() => {
    if (formData.toUserId && formData.startDate && formData.endDate) {
      checkDelegationConflicts();
    }
  }, [formData.toUserId, formData.startDate, formData.endDate]);

  const checkDelegationConflicts = () => {
    try {
      const existingDelegations = teamsStorage.getUserDelegations(formData.toUserId, 'to');
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);

      const conflicts = existingDelegations.filter(existing => {
        if (!existing.isActive || existing.id === delegation?.id) return false;

        const existingStart = new Date(existing.startDate);
        const existingEnd = new Date(existing.endDate);

        // Vérifier chevauchement des dates
        return (startDate <= existingEnd && endDate >= existingStart);
      });

      if (conflicts.length > 0) {
        const fromUser = availableUsers.find(u => u.id === conflicts[0].fromUserId);
        setConflictWarning(
          `Attention: ${getUserDisplayName(formData.toUserId)} a déjà une délégation de ${fromUser?.firstName} ${fromUser?.lastName} du ${new Date(conflicts[0].startDate).toLocaleDateString()} au ${new Date(conflicts[0].endDate).toLocaleDateString()}`
        );
      } else {
        setConflictWarning('');
      }
    } catch (error) {
      console.error('Erreur vérification conflits:', error);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Utilisateur source requis
    if (!formData.fromUserId) {
      newErrors.fromUserId = 'Utilisateur source requis';
    }

    // Utilisateur destination requis
    if (!formData.toUserId) {
      newErrors.toUserId = 'Utilisateur destination requis';
    }

    // Vérifier que les utilisateurs sont différents
    if (formData.fromUserId && formData.toUserId && formData.fromUserId === formData.toUserId) {
      newErrors.toUserId = 'L\'utilisateur ne peut pas se déléguer à lui-même';
    }

    // Dates requises
    if (!formData.startDate) {
      newErrors.startDate = 'Date de début requise';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'Date de fin requise';
    }

    // Vérifier que la date de fin est postérieure à la date de début
    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);

      if (startDate >= endDate) {
        newErrors.endDate = 'La date de fin doit être postérieure à la date de début';
      }

      // Vérifier que la date de début n'est pas dans le passé (sauf modification)
      if (!delegation) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (startDate < today) {
          newErrors.startDate = 'La date de début ne peut pas être dans le passé';
        }
      }
    }

    // Au moins une permission requise
    if (formData.permissions.length === 0) {
      newErrors.permissions = 'Au moins une permission requise';
    }

    // Raison requise
    if (!formData.reason.trim()) {
      newErrors.reason = 'Raison de la délégation requise';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Convertir les dates en ISO string
      const delegationData = {
        ...formData,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString()
      };

      await onSave(delegationData);
      onClose();
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Effacer l'erreur du champ modifié
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleNotificationChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [field]: value
      }
    }));
  };

  const togglePermission = (permission) => {
    const isSelected = formData.permissions.includes(permission);
    if (isSelected) {
      handleInputChange('permissions', formData.permissions.filter(p => p !== permission));
    } else {
      handleInputChange('permissions', [...formData.permissions, permission]);
    }
  };

  const getUserDisplayName = (userId) => {
    const user = availableUsers.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : userId;
  };

  const getUserPermissions = (userId) => {
    const user = availableUsers.find(u => u.id === userId);
    if (!user) return [];

    // Obtenir les permissions de l'utilisateur
    return permissionsStorage.getUserPermissions(user);
  };

  const getFilteredPermissions = () => {
    if (!formData.fromUserId) return [];

    const fromUserPermissions = getUserPermissions(formData.fromUserId);

    // L'utilisateur ne peut déléguer que les permissions qu'il possède
    return availablePermissions.filter(permission =>
      fromUserPermissions.includes(permission.id)
    );
  };

  const getTeamDisplayName = (teamId) => {
    const team = availableTeams.find(t => t.id === teamId);
    return team ? team.name : '';
  };

  // Calculer la durée de la délégation
  const getDelegationDuration = () => {
    if (!formData.startDate || !formData.endDate) return '';

    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '1 jour';
    if (diffDays < 7) return `${diffDays} jours`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} semaine(s)`;
    return `${Math.ceil(diffDays / 30)} mois`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <UserCheck className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {delegation ? 'Modifier la délégation' : 'Nouvelle délégation'}
              </h2>
              <p className="text-sm text-gray-600">
                {delegation ? 'Modifier les paramètres de délégation' : 'Déléguer des permissions temporairement'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Erreur générale */}
            {errors.submit && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            {/* Warning de conflit */}
            {conflictWarning && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800">{conflictWarning}</p>
                </div>
              </div>
            )}

            {/* Utilisateurs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Déléguer de *
                </label>
                <select
                  value={formData.fromUserId}
                  onChange={(e) => {
                    handleInputChange('fromUserId', e.target.value);
                    handleInputChange('permissions', []); // Reset permissions
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.fromUserId ? 'border-red-300' : 'border-gray-300'
                  }`}
                  disabled={delegation} // Ne pas changer lors de la modification
                >
                  <option value="">Sélectionner un utilisateur</option>
                  {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.role}) - {user.department}
                    </option>
                  ))}
                </select>
                {errors.fromUserId && (
                  <p className="mt-1 text-sm text-red-600">{errors.fromUserId}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Déléguer à *
                </label>
                <select
                  value={formData.toUserId}
                  onChange={(e) => handleInputChange('toUserId', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.toUserId ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Sélectionner un utilisateur</option>
                  {availableUsers
                    .filter(user => user.id !== formData.fromUserId)
                    .map(user => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} ({user.role}) - {user.department}
                      </option>
                    ))}
                </select>
                {errors.toUserId && (
                  <p className="mt-1 text-sm text-red-600">{errors.toUserId}</p>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Date de début *
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.startDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.startDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Date de fin *
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.endDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.endDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
                )}
              </div>
            </div>

            {/* Durée calculée */}
            {getDelegationDuration() && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Durée de la délégation:</strong> {getDelegationDuration()}
                </p>
              </div>
            )}

            {/* Équipe (optionnel) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Équipe concernée (optionnel)
              </label>
              <select
                value={formData.teamId}
                onChange={(e) => handleInputChange('teamId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Aucune équipe spécifique</option>
                {availableTeams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.department})
                  </option>
                ))}
              </select>
            </div>

            {/* Permissions à déléguer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Shield className="inline h-4 w-4 mr-1" />
                Permissions à déléguer *
              </label>

              {formData.fromUserId ? (
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {getFilteredPermissions().map(permission => (
                      <label key={permission.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes(permission.id)}
                          onChange={() => togglePermission(permission.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-gray-700">{permission.name}</span>
                      </label>
                    ))}
                  </div>

                  {getFilteredPermissions().length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Aucune permission disponible pour cet utilisateur
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 p-4 border border-gray-200 rounded-lg">
                  Sélectionnez d'abord l'utilisateur source pour voir les permissions disponibles
                </p>
              )}

              {errors.permissions && (
                <p className="mt-1 text-sm text-red-600">{errors.permissions}</p>
              )}
            </div>

            {/* Raison */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Raison de la délégation *
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => handleInputChange('reason', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.reason ? 'border-red-300' : 'border-gray-300'
                }`}
                rows="3"
                placeholder="Ex: Délégation pendant congés, remplacement temporaire, etc."
              />
              {errors.reason && (
                <p className="mt-1 text-sm text-red-600">{errors.reason}</p>
              )}
            </div>

            {/* Notifications */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Bell className="inline h-4 w-4 mr-1" />
                Notifications
              </label>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.notifications.startNotification}
                    onChange={(e) => handleNotificationChange('startNotification', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Notifier au début de la délégation</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.notifications.endNotification}
                    onChange={(e) => handleNotificationChange('endNotification', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Notifier à la fin de la délégation</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.notifications.dailyReminder}
                    onChange={(e) => handleNotificationChange('dailyReminder', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Rappel quotidien pendant la délégation</span>
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Enregistrement...' : (delegation ? 'Modifier' : 'Créer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DelegationFormModal;