// components/modals/TeamFormModal.js
import React, { useState, useEffect } from 'react';
import { X, Users, User, Building, Clock, Shield, Trash2 } from 'lucide-react';
import { usersStorage } from '../../utils/usersStorage';
import { permissionsStorage } from '../../utils/permissionsStorage';
import { useTranslation } from 'react-i18next';
import {
  DEPARTMENT_KEYS,
  getSpecialtiesForDepartment
} from '../../utils/medicalConstants';

const TeamFormModal = ({ isOpen, onClose, onSave, team = null, currentUser }) => {
  const { t } = useTranslation(['admin', 'common']);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    department: '',
    leaderId: '',
    members: [],
    specialties: [],
    isActive: true,
    schedule: {
      monday: { start: '08:00', end: '17:00' },
      tuesday: { start: '08:00', end: '17:00' },
      wednesday: { start: '08:00', end: '17:00' },
      thursday: { start: '08:00', end: '17:00' },
      friday: { start: '08:00', end: '17:00' },
      saturday: { start: '', end: '' },
      sunday: { start: '', end: '' }
    },
    permissions: []
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);

  // Départements et spécialités - utilisation des constantes partagées
  // DEPARTMENT_KEYS et getSpecialtiesForDepartment importés depuis medicalConstants.js

  const daysOfWeek = [
    { key: 'monday', label: 'Lundi' },
    { key: 'tuesday', label: 'Mardi' },
    { key: 'wednesday', label: 'Mercredi' },
    { key: 'thursday', label: 'Jeudi' },
    { key: 'friday', label: 'Vendredi' },
    { key: 'saturday', label: 'Samedi' },
    { key: 'sunday', label: 'Dimanche' }
  ];

  useEffect(() => {
    if (isOpen) {
      // Charger les utilisateurs disponibles
      const users = usersStorage.getAll().filter(user => user.isActive && !user.isDeleted);
      setAvailableUsers(users);

      // Charger les permissions disponibles
      const permissions = permissionsStorage.getAllPermissions();
      setAvailablePermissions(permissions);

      // Pré-remplir si modification
      if (team) {
        setFormData({
          name: team.name || '',
          description: team.description || '',
          department: team.department || '',
          leaderId: team.leaderId || '',
          members: team.members || [],
          specialties: team.specialties || [],
          isActive: team.isActive !== undefined ? team.isActive : true,
          schedule: team.schedule || {
            monday: { start: '08:00', end: '17:00' },
            tuesday: { start: '08:00', end: '17:00' },
            wednesday: { start: '08:00', end: '17:00' },
            thursday: { start: '08:00', end: '17:00' },
            friday: { start: '08:00', end: '17:00' },
            saturday: { start: '', end: '' },
            sunday: { start: '', end: '' }
          },
          permissions: team.permissions || []
        });
      } else {
        // Réinitialiser pour création
        setFormData({
          name: '',
          description: '',
          department: '',
          leaderId: '',
          members: [],
          specialties: [],
          isActive: true,
          schedule: {
            monday: { start: '08:00', end: '17:00' },
            tuesday: { start: '08:00', end: '17:00' },
            wednesday: { start: '08:00', end: '17:00' },
            thursday: { start: '08:00', end: '17:00' },
            friday: { start: '08:00', end: '17:00' },
            saturday: { start: '', end: '' },
            sunday: { start: '', end: '' }
          },
          permissions: []
        });
      }

      setErrors({});
    }
  }, [isOpen, team]);

  // S'assurer que le leader est dans les membres
  useEffect(() => {
    const currentMembers = formData.members || [];
    if (formData.leaderId && !currentMembers.includes(formData.leaderId)) {
      setFormData(prev => ({
        ...prev,
        members: [...(prev.members || []), prev.leaderId]
      }));
    }
  }, [formData.leaderId]);

  const validateForm = () => {
    const newErrors = {};

    // Nom requis
    if (!formData.name.trim()) {
      newErrors.name = 'Nom requis';
    }

    // Chef d'équipe et membres optionnels (le backend ne supporte pas encore ces champs)
    // Ces validations peuvent être réactivées quand le backend sera mis à jour
    // if (!formData.leaderId) {
    //   newErrors.leaderId = 'Chef d\'équipe requis';
    // }
    // if (formData.members.length === 0) {
    //   newErrors.members = 'Au moins un membre requis';
    // }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await onSave(formData);
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

  const handleScheduleChange = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...(prev.schedule || {}),
        [day]: {
          ...(prev.schedule?.[day] || { start: '', end: '' }),
          [field]: value
        }
      }
    }));
  };

  const addMember = (userId) => {
    const currentMembers = formData.members || [];
    if (!currentMembers.includes(userId)) {
      handleInputChange('members', [...currentMembers, userId]);
    }
  };

  const removeMember = (userId) => {
    const currentMembers = formData.members || [];
    if (userId !== formData.leaderId) { // Ne pas pouvoir supprimer le leader
      handleInputChange('members', currentMembers.filter(id => id !== userId));
    }
  };

  const addSpecialty = (specialty) => {
    const currentSpecialties = formData.specialties || [];
    if (!currentSpecialties.includes(specialty)) {
      handleInputChange('specialties', [...currentSpecialties, specialty]);
    }
  };

  const removeSpecialty = (specialty) => {
    const currentSpecialties = formData.specialties || [];
    handleInputChange('specialties', currentSpecialties.filter(s => s !== specialty));
  };

  const togglePermission = (permission) => {
    const currentPermissions = formData.permissions || [];
    const isSelected = currentPermissions.includes(permission);
    if (isSelected) {
      handleInputChange('permissions', currentPermissions.filter(p => p !== permission));
    } else {
      handleInputChange('permissions', [...currentPermissions, permission]);
    }
  };

  const getAvailableSpecialties = () => {
    return getSpecialtiesForDepartment(formData.department);
  };

  const getUserDisplayName = (userId) => {
    const user = availableUsers.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : userId;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {team ? 'Modifier l\'équipe' : 'Nouvelle équipe'}
              </h2>
              <p className="text-sm text-gray-600">
                {team ? 'Modifier les paramètres de l\'équipe' : 'Créer une nouvelle équipe de travail'}
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

            {/* Informations de base */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de l'équipe *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Ex: Équipe Médecine Générale"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building className="inline h-4 w-4 mr-1" />
                  Département
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => {
                    handleInputChange('department', e.target.value);
                    handleInputChange('specialties', []); // Reset specialties
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t('common:select', 'Sélectionner un département')}</option>
                  {DEPARTMENT_KEYS.map(dept => (
                    <option key={dept} value={dept}>{t(`admin:departments.${dept}`, dept)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="inline h-4 w-4 mr-1" />
                  Chef d'équipe
                </label>
                <select
                  value={formData.leaderId}
                  onChange={(e) => handleInputChange('leaderId', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.leaderId ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Sélectionner un chef d'équipe</option>
                  {availableUsers.filter(user => ['super_admin', 'admin', 'doctor', 'specialist'].includes(user.role)).map(user => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.role})
                    </option>
                  ))}
                </select>
                {errors.leaderId && (
                  <p className="mt-1 text-sm text-red-600">{errors.leaderId}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="3"
                  placeholder="Description de l'équipe et de ses missions"
                />
              </div>
            </div>

            {/* Membres de l'équipe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Membres de l'équipe
              </label>

              {/* Sélection de nouveaux membres */}
              <div className="mb-3">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      addMember(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Ajouter un membre</option>
                  {availableUsers
                    .filter(user => !(formData.members || []).includes(user.id))
                    .map(user => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} - {user.role} ({user.department})
                      </option>
                    ))}
                </select>
              </div>

              {/* Liste des membres actuels */}
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {(formData.members || []).map(userId => {
                  const user = availableUsers.find(u => u.id === userId);
                  const isLeader = userId === formData.leaderId;

                  return user ? (
                    <div key={userId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">
                          {user.firstName} {user.lastName}
                        </span>
                        <span className="text-xs text-gray-500">({user.role})</span>
                        {isLeader && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Chef
                          </span>
                        )}
                      </div>
                      {!isLeader && (
                        <button
                          type="button"
                          onClick={() => removeMember(userId)}
                          className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ) : null;
                })}
              </div>

              {errors.members && (
                <p className="mt-1 text-sm text-red-600">{errors.members}</p>
              )}
            </div>

            {/* Spécialités */}
            {formData.department && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Spécialités
                </label>

                {/* Sélection de nouvelles spécialités */}
                <div className="mb-3">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        addSpecialty(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Ajouter une spécialité</option>
                    {getAvailableSpecialties()
                      .filter(spec => !(formData.specialties || []).includes(spec))
                      .map(spec => (
                        <option key={spec} value={spec}>{spec}</option>
                      ))}
                  </select>
                </div>

                {/* Liste des spécialités */}
                <div className="flex flex-wrap gap-2">
                  {(formData.specialties || []).map(specialty => (
                    <span
                      key={specialty}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
                    >
                      {specialty}
                      <button
                        type="button"
                        onClick={() => removeSpecialty(specialty)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Horaires de travail */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Clock className="inline h-4 w-4 mr-1" />
                Horaires de travail
              </label>

              <div className="space-y-3">
                {daysOfWeek.map(day => (
                  <div key={day.key} className="flex items-center gap-4">
                    <div className="w-20 text-sm font-medium text-gray-700">
                      {day.label}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={formData.schedule?.[day.key]?.start || ''}
                        onChange={(e) => handleScheduleChange(day.key, 'start', e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="text-gray-500">à</span>
                      <input
                        type="time"
                        value={formData.schedule?.[day.key]?.end || ''}
                        onChange={(e) => handleScheduleChange(day.key, 'end', e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Permissions d'équipe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Shield className="inline h-4 w-4 mr-1" />
                Permissions de l'équipe
              </label>

              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {availablePermissions.map(permission => (
                    <label key={permission.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={(formData.permissions || []).includes(permission.id)}
                        onChange={() => togglePermission(permission.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-gray-700">{permission.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Statut actif */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Équipe active
              </label>
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Enregistrement...' : (team ? 'Modifier' : 'Créer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeamFormModal;