// components/admin/RoleManagementModule.js
// Gestion des rôles système avec permissions personnalisables
// Conforme RGPD et Secret Médical (Article L1110-4 CSP)
import React, { useState, useEffect } from 'react';
import {
  Shield, Search, Filter, Eye, Edit2, Trash2, Users,
  CheckCircle, XCircle, AlertTriangle, Settings, BarChart3,
  Crown, AlertCircle, X,
  RefreshCw, Heart, FileText, UserCog, Calendar, DollarSign
} from 'lucide-react';
import {
  permissionsStorage,
  PERMISSIONS,
  PERMISSION_CATEGORIES,
  DEFAULT_ROLES,
  SENSITIVE_PERMISSIONS
} from '../../utils/permissionsStorage';
import { clinicRolesApi } from '../../api/clinicRolesApi';
import { useAuth } from '../../hooks/useAuth';
import PermissionGuard from '../auth/PermissionGuard';
import { useTranslation } from 'react-i18next';

const RoleManagementModule = () => {
  const { t } = useTranslation(['admin', 'common']);
  const { refreshPermissions } = useAuth(); // Validation de l'authentification + refresh
  const [roles, setRoles] = useState([]);
  const [filteredRoles, setFilteredRoles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [selectedRole, setSelectedRole] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [stats, setStats] = useState({});
  const [activeTab, setActiveTab] = useState('roles');
  // eslint-disable-next-line no-unused-vars
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Auto-hide notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Fonction pour afficher une notification
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  // Rôles techniques à masquer (non éditables par les utilisateurs)
  const HIDDEN_ROLES = ['super_admin'];

  // Charger les rôles (fusion API + rôles système par défaut)
  const loadRoles = async () => {
    setIsLoading(true);
    try {
      // Récupérer les rôles système par défaut (sauf rôles techniques)
      const systemRoles = Object.values(DEFAULT_ROLES).filter(
        role => !HIDDEN_ROLES.includes(role.id)
      );

      // Essayer de charger depuis l'API
      let apiRoles = [];
      try {
        const data = await clinicRolesApi.getClinicRoles({ limit: 100 });
        apiRoles = data.roles || [];
      } catch (apiError) {
        console.warn('[RoleManagementModule] API non disponible, utilisation des rôles locaux:', apiError.message);
      }

      // Fusionner : les rôles API ont priorité, sinon on utilise les rôles système par défaut
      const mergedRoles = systemRoles.map(systemRole => {
        // Chercher si ce rôle existe dans l'API par NOM (pas par ID car l'API retourne des UUIDs)
        const apiRole = apiRoles.find(r => r.name === systemRole.id);
        if (apiRole) {
          // Fusionner en gardant les infos système mais les permissions de l'API
          return {
            ...systemRole,
            // IMPORTANT: Utiliser l'ID de la BDD pour les mises à jour
            dbId: apiRole.id,
            permissions: apiRole.permissions || systemRole.permissions,
            updatedAt: apiRole.updatedAt || systemRole.updatedAt,
            createdAt: apiRole.createdAt || new Date().toISOString()
          };
        }
        // Rôle système non trouvé dans l'API, utiliser le défaut
        return {
          ...systemRole,
          createdAt: new Date().toISOString()
        };
      });

      // Ajouter les rôles personnalisés de l'API (non système, non masqués)
      const customRoles = apiRoles.filter(r =>
        !r.isSystemRole &&
        !systemRoles.find(s => s.id === r.id) &&
        !HIDDEN_ROLES.includes(r.id)
      );
      const allRoles = [...mergedRoles, ...customRoles];

      setRoles(allRoles);
      setFilteredRoles(allRoles);

      // Calculer les statistiques
      const roleStats = {
        totalRoles: allRoles.length,
        systemRoles: allRoles.filter(r => r.isSystemRole).length,
        customRoles: allRoles.filter(r => !r.isSystemRole).length
      };
      setStats(roleStats);

      // Initialiser aussi le localStorage pour la cohérence
      permissionsStorage.initializeDefaultRoles();

    } catch (error) {
      console.error('[RoleManagementModule] Error loading roles:', error);

      // Fallback complet sur les rôles système par défaut (sauf techniques)
      const fallbackRoles = Object.values(DEFAULT_ROLES)
        .filter(role => !HIDDEN_ROLES.includes(role.id))
        .map(role => ({
          ...role,
          createdAt: new Date().toISOString()
        }));
      setRoles(fallbackRoles);
      setFilteredRoles(fallbackRoles);
      setStats({
        totalRoles: fallbackRoles.length,
        systemRoles: fallbackRoles.length,
        customRoles: 0
      });

      showNotification(t('admin:rolesManagement.messages.loadFallback'), 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  // Filtrer les rôles
  useEffect(() => {
    let filtered = roles;

    if (searchTerm) {
      filtered = filtered.filter(role =>
        role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        role.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterLevel) {
      filtered = filtered.filter(role => {
        if (filterLevel === 'high') return role.level >= 80;
        if (filterLevel === 'medium') return role.level >= 50 && role.level < 80;
        if (filterLevel === 'low') return role.level < 50;
        return true;
      });
    }

    setFilteredRoles(filtered);
  }, [roles, searchTerm, filterLevel]);

  // Formulaire de rôle - Adapté pour les rôles système
  const RoleFormModal = () => {
    const [formData, setFormData] = useState({
      name: '',
      description: '',
      level: 1,
      color: 'blue',
      permissions: [],
      isSystemRole: false,
      isHealthcareProfessional: false
    });
    const [selectedPermissions, setSelectedPermissions] = useState({});
    const [showMedicalWarning, setShowMedicalWarning] = useState(false);

    useEffect(() => {
      if (selectedRole && isEditMode) {
        setFormData({
          name: selectedRole.name,
          description: selectedRole.description,
          level: selectedRole.level,
          color: selectedRole.color || 'blue',
          permissions: selectedRole.permissions || [],
          isSystemRole: selectedRole.isSystemRole || false,
          isHealthcareProfessional: selectedRole.isHealthcareProfessional || false
        });

        // Initialiser les permissions sélectionnées
        const permissionsMap = {};
        (selectedRole.permissions || []).forEach(perm => {
          permissionsMap[perm] = true;
        });
        setSelectedPermissions(permissionsMap);
      } else {
        setFormData({
          name: '',
          description: '',
          level: 1,
          color: 'blue',
          permissions: [],
          isSystemRole: false,
          isHealthcareProfessional: false
        });
        setSelectedPermissions({});
      }
    }, [selectedRole, isEditMode]);

    // Vérifier si des permissions médicales sont sélectionnées pour un rôle non-soignant
    useEffect(() => {
      if (!formData.isHealthcareProfessional) {
        const hasMedicalPermission = SENSITIVE_PERMISSIONS.MEDICAL_ACCESS.some(
          perm => selectedPermissions[perm]
        );
        setShowMedicalWarning(hasMedicalPermission);
      } else {
        setShowMedicalWarning(false);
      }
    }, [selectedPermissions, formData.isHealthcareProfessional]);

    const handlePermissionToggle = (permission) => {
      const newValue = !selectedPermissions[permission];

      // Alerte pour les permissions médicales sur rôle non-soignant
      if (newValue && !formData.isHealthcareProfessional && permissionsStorage.isMedicalPermission(permission)) {
        if (!window.confirm(t('admin:rolesManagement.modal.medicalWarning'))) {
          return;
        }
      }

      setSelectedPermissions(prev => ({
        ...prev,
        [permission]: newValue
      }));
    };

    const handleSubmit = async (e) => {
      e.preventDefault();

      try {
        const permissions = Object.entries(selectedPermissions)
          .filter(([_, selected]) => selected)
          .map(([permission, _]) => permission);

        // Pour les rôles système, on ne met à jour que les permissions
        const roleData = formData.isSystemRole
          ? { permissions }
          : { ...formData, permissions };

        if (isEditMode && selectedRole) {
          // Utiliser dbId (UUID de la BDD) si disponible, sinon fallback sur id
          const roleIdForApi = selectedRole.dbId || selectedRole.id;
          await clinicRolesApi.updateClinicRole(roleIdForApi, roleData);

          // Mettre aussi à jour localement pour les rôles système
          if (formData.isSystemRole) {
            permissionsStorage.updateSystemRolePermissions(selectedRole.id, permissions);
          }

          // Rafraîchir les permissions de l'utilisateur connecté
          // (au cas où il a le même rôle que celui modifié)
          if (refreshPermissions) {
            await refreshPermissions();
          }

          showNotification(
            formData.isSystemRole
              ? t('admin:rolesManagement.messages.permissionsUpdateSuccess')
              : t('admin:rolesManagement.messages.updateSuccess'),
            'success'
          );
        } else {
          await clinicRolesApi.createClinicRole(roleData);
          showNotification(t('admin:rolesManagement.messages.createSuccess'), 'success');
        }

        await loadRoles();
        handleCloseModal();
      } catch (error) {
        showNotification(error.message || t('admin:rolesManagement.messages.saveError'), 'error');
      }
    };

    const handleCloseModal = () => {
      setIsModalOpen(false);
      setSelectedRole(null);
      setIsEditMode(false);
    };

    // Obtenir l'icône pour une catégorie
    const getCategoryIcon = (categoryKey, category) => {
      if (category.isMedicalData) return <Heart className="h-4 w-4 text-red-500" />;
      if (categoryKey === 'patients_admin') return <Users className="h-4 w-4" />;
      if (categoryKey === 'appointments') return <Calendar className="h-4 w-4" />;
      if (categoryKey === 'finance') return <DollarSign className="h-4 w-4" />;
      if (categoryKey === 'users') return <UserCog className="h-4 w-4" />;
      return <Settings className="h-4 w-4" />;
    };

    if (!isModalOpen) return null;

    // Séparer les catégories admin et médicales
    const adminCategories = Object.entries(PERMISSION_CATEGORIES).filter(
      ([_, cat]) => !cat.isMedicalData
    );
    const medicalCategories = Object.entries(PERMISSION_CATEGORIES).filter(
      ([_, cat]) => cat.isMedicalData
    );

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className={`${formData.isSystemRole ? 'bg-purple-600' : 'bg-blue-600'} text-white px-6 py-4 flex justify-between items-center`}>
            <div className="flex items-center space-x-3">
              {formData.isSystemRole ? <Crown className="h-6 w-6" /> : <Shield className="h-6 w-6" />}
              <div>
                <h2 className="text-xl font-semibold">
                  {formData.isSystemRole
                    ? `${t('admin:rolesManagement.modal.editSystemRole')} : ${formData.name}`
                    : (isEditMode ? t('admin:rolesManagement.modal.editRole') : t('admin:rolesManagement.modal.newRole'))
                  }
                </h2>
                {formData.isSystemRole && (
                  <p className="text-sm text-white/80">{t('admin:rolesManagement.modal.systemRoleNote')}</p>
                )}
              </div>
            </div>
            <button onClick={handleCloseModal} className="text-white hover:text-gray-200">
              <XCircle className="h-6 w-6" />
            </button>
          </div>

          {/* Alerte si permissions médicales sur rôle non-soignant */}
          {showMedicalWarning && (
            <div className="px-6 py-3 bg-red-50 border-b border-red-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">
                  <strong>{t('admin:rolesManagement.modal.medicalAccessWarning.title')}</strong>
                  <p>{t('admin:rolesManagement.modal.medicalAccessWarning.message')}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[75vh]">
            {/* Informations du rôle (lecture seule pour rôles système) */}
            {formData.isSystemRole ? (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">{t('admin:rolesManagement.modal.name')}:</span>
                    <span className="ml-2 font-medium">{formData.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('admin:rolesManagement.roleList.level')}:</span>
                    <span className="ml-2 font-medium">{formData.level}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">{t('admin:rolesManagement.modal.type')}:</span>
                    <span className={`ml-2 font-medium ${formData.isHealthcareProfessional ? 'text-green-600' : 'text-gray-600'}`}>
                      {formData.isHealthcareProfessional ? t('admin:rolesManagement.modal.healthcareProfessional') : t('admin:rolesManagement.modal.administrativeStaff')}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-600">{formData.description}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin:rolesManagement.modal.roleName')} *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin:rolesManagement.modal.level')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.level}
                      onChange={(e) => setFormData(prev => ({ ...prev, level: parseInt(e.target.value) }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin:rolesManagement.modal.description')}
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder={t('admin:rolesManagement.modal.descriptionPlaceholder')}
                  />
                </div>
              </>
            )}

            {/* PERMISSIONS ADMINISTRATIVES */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                {t('admin:rolesManagement.modal.adminData')}
              </h3>

              <div className="space-y-4">
                {adminCategories.map(([categoryKey, category]) => (
                  <div key={categoryKey} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                      {getCategoryIcon(categoryKey, category)}
                      <span className="ml-2">{category.name}</span>
                      {category.description && (
                        <span className="ml-2 text-xs text-gray-500">({category.description})</span>
                      )}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {category.permissions.map(permission => (
                        <label key={permission} className="flex items-center space-x-3 cursor-pointer p-1 hover:bg-gray-50 rounded">
                          <input
                            type="checkbox"
                            checked={selectedPermissions[permission] || false}
                            onChange={() => handlePermissionToggle(permission)}
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                          />
                          <span className="text-sm text-gray-700">
                            {permissionsStorage.getPermissionLabel(permission)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PERMISSIONS MÉDICALES */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2 flex items-center">
                <Heart className="h-5 w-5 mr-2 text-red-500" />
                {t('admin:rolesManagement.modal.medicalData')}
                <span className="ml-2 text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">{t('admin:rolesManagement.modal.medicalSecret')}</span>
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {t('admin:rolesManagement.modal.medicalWarning')}
              </p>

              <div className="space-y-4">
                {medicalCategories.map(([categoryKey, category]) => (
                  <div key={categoryKey} className={`border rounded-lg p-4 ${
                    !formData.isHealthcareProfessional ? 'border-red-200 bg-red-50/30' : 'border-red-200'
                  }`}>
                    <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                      {getCategoryIcon(categoryKey, category)}
                      <span className="ml-2">{category.name}</span>
                      {!formData.isHealthcareProfessional && (
                        <span className="ml-2 text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
                          {t('admin:rolesManagement.modal.notRecommended')}
                        </span>
                      )}
                    </h4>
                    {category.description && (
                      <p className="text-xs text-gray-500 mb-2">{category.description}</p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {category.permissions.map(permission => (
                        <label key={permission} className="flex items-center space-x-3 cursor-pointer p-1 hover:bg-white/50 rounded">
                          <input
                            type="checkbox"
                            checked={selectedPermissions[permission] || false}
                            onChange={() => handlePermissionToggle(permission)}
                            className="rounded border-red-300 text-red-600 shadow-sm focus:border-red-300 focus:ring focus:ring-red-200"
                          />
                          <span className="text-sm text-gray-700">
                            {permissionsStorage.getPermissionLabel(permission)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4 border-t">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                {t('common:cancel')}
              </button>
              <button
                type="submit"
                className={`px-6 py-2 text-white rounded-lg ${
                  formData.isSystemRole
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {formData.isSystemRole ? t('admin:rolesManagement.buttons.savePermissions') : (isEditMode ? t('admin:rolesManagement.buttons.update') : t('admin:rolesManagement.buttons.create'))}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const handleDeleteRole = async (role) => {
    if (!window.confirm(t('admin:rolesManagement.messages.deleteConfirm', { name: role.name }))) {
      return;
    }

    try {
      await clinicRolesApi.deleteClinicRole(role.id);
      showNotification(t('admin:rolesManagement.messages.deleteSuccess'), 'success');
      await loadRoles();
    } catch (error) {
      showNotification(error.message || t('admin:rolesManagement.messages.deleteError'), 'error');
    }
  };

  // Réinitialiser un rôle système à ses permissions par défaut
  const handleResetRole = async (role) => {
    if (!role.isSystemRole) return;

    const defaultRole = DEFAULT_ROLES[role.id];
    if (!defaultRole) {
      showNotification(t('admin:rolesManagement.messages.defaultNotFound'), 'error');
      return;
    }

    if (!window.confirm(t('admin:rolesManagement.messages.resetConfirm', { name: role.name }))) {
      return;
    }

    try {
      // Mettre à jour via l'API (utiliser dbId si disponible)
      const roleIdForApi = role.dbId || role.id;
      await clinicRolesApi.updateClinicRole(roleIdForApi, {
        permissions: defaultRole.permissions
      });

      // Mettre à jour aussi localement
      permissionsStorage.resetSystemRoleToDefault(role.id);

      showNotification(t('admin:rolesManagement.messages.resetSuccess', { name: role.name }), 'success');
      await loadRoles();
    } catch (error) {
      showNotification(error.message || t('admin:rolesManagement.messages.resetError'), 'error');
    }
  };

  const getRoleColor = (color) => {
    const colors = {
      blue: 'text-blue-600 bg-blue-100',
      green: 'text-green-600 bg-green-100',
      purple: 'text-purple-600 bg-purple-100',
      red: 'text-red-600 bg-red-100',
      yellow: 'text-yellow-600 bg-yellow-100',
      pink: 'text-pink-600 bg-pink-100',
      teal: 'text-teal-600 bg-teal-100',
      orange: 'text-orange-600 bg-orange-100',
      gray: 'text-gray-600 bg-gray-100'
    };
    return colors[color] || colors.blue;
  };

  const getLevelBadge = (level) => {
    if (level >= 80) return 'text-red-600 bg-red-100';
    if (level >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getLevelText = (level) => {
    if (level >= 80) return t('admin:rolesManagement.roleList.levelHigh');
    if (level >= 50) return t('admin:rolesManagement.roleList.levelMedium');
    return t('admin:rolesManagement.roleList.levelLow');
  };

  return (
    <PermissionGuard permission={PERMISSIONS.ROLES_VIEW}>
      <div className="space-y-6">
        {/* En-tête avec onglets */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{t('admin:rolesManagement.title')}</h2>
                <p className="text-gray-600 mt-1">
                  {t('admin:rolesManagement.subtitle')}
                </p>
              </div>
            </div>
          </div>

          {/* Alerte conformité RGPD / Secret médical */}
          <div className="px-6 py-3 bg-amber-50 border-b border-amber-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <strong>{t('admin:rolesManagement.compliance.title')}</strong>
                <p className="mt-1">
                  {t('admin:rolesManagement.compliance.description')}
                </p>
              </div>
            </div>
          </div>

          {/* Onglets */}
          <div className="px-6 py-2">
            <div className="flex space-x-6">
              <button
                onClick={() => setActiveTab('roles')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'roles'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('admin:rolesManagement.tabs.roles')} ({roles.length})
              </button>
              <button
                onClick={() => setActiveTab('permissions')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'permissions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('admin:rolesManagement.tabs.permissions')}
              </button>
              <button
                onClick={() => setActiveTab('statistics')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'statistics'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('admin:rolesManagement.tabs.statistics')}
              </button>
            </div>
          </div>
        </div>

        {/* Contenu des onglets */}
        {activeTab === 'roles' && (
          <>
            {/* Filtres */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin:rolesManagement.filters.search')}
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder={t('admin:rolesManagement.filters.searchPlaceholder')}
                      className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin:rolesManagement.filters.accessLevel')}
                  </label>
                  <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('admin:rolesManagement.filters.allLevels')}</option>
                    <option value="high">{t('admin:rolesManagement.filters.high')}</option>
                    <option value="medium">{t('admin:rolesManagement.filters.medium')}</option>
                    <option value="low">{t('admin:rolesManagement.filters.low')}</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setFilterLevel('');
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center space-x-2"
                  >
                    <Filter className="h-4 w-4" />
                    <span>{t('admin:rolesManagement.filters.reset')}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Liste des rôles */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-medium text-gray-900">
                  {t('admin:rolesManagement.roleList.title')} ({filteredRoles.length})
                </h3>
              </div>

              <div className="divide-y divide-gray-200">
                {filteredRoles.map((role) => (
                  <div key={role.id} className="p-6 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className={`p-2 rounded-full ${getRoleColor(role.color)}`}>
                            {role.isSystemRole ? (
                              <Crown className="h-4 w-4" />
                            ) : (
                              <Shield className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{role.name}</h4>
                            {role.isSystemRole && (
                              <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                                {t('admin:rolesManagement.roleList.systemRole')}
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-gray-600 mb-3">{role.description}</p>

                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className={`px-2 py-1 rounded-full ${getLevelBadge(role.level)}`}>
                            {t('admin:rolesManagement.roleList.level')} {role.level} - {getLevelText(role.level)}
                          </span>
                          <span className="text-gray-500">
                            {role.permissions?.length || 0} {t('admin:rolesManagement.roleList.permissions')}
                          </span>
                          {/* Indicateur soignant / admin */}
                          {role.isHealthcareProfessional ? (
                            <span className="px-2 py-1 rounded-full text-green-700 bg-green-100 flex items-center gap-1">
                              <Heart className="h-3 w-3" />
                              {t('admin:rolesManagement.roleList.healthcare')}
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-gray-600 bg-gray-100">
                              {t('admin:rolesManagement.roleList.administrative')}
                            </span>
                          )}
                          {role.createdAt && (
                            <span className="text-gray-500">
                              {t('admin:rolesManagement.roleList.createdAt')} {new Date(role.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => {
                            setSelectedRole(role);
                            setIsEditMode(false);
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title={t('admin:rolesManagement.actions.viewDetails')}
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        <PermissionGuard permission={PERMISSIONS.ROLES_EDIT}>
                          <button
                            onClick={() => {
                              setSelectedRole(role);
                              setIsEditMode(true);
                              setIsModalOpen(true);
                            }}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                            title={role.isSystemRole ? t('admin:rolesManagement.actions.editPermissions') : t('admin:rolesManagement.actions.edit')}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </PermissionGuard>

                        {/* Bouton réinitialiser pour les rôles système */}
                        {role.isSystemRole && (
                          <PermissionGuard permission={PERMISSIONS.ROLES_EDIT}>
                            <button
                              onClick={() => handleResetRole(role)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title={t('admin:rolesManagement.actions.resetToDefault')}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                          </PermissionGuard>
                        )}

                        {/* Suppression uniquement pour les rôles personnalisés */}
                        {!role.isSystemRole && (
                          <PermissionGuard permission={PERMISSIONS.ROLES_DELETE}>
                            <button
                              onClick={() => handleDeleteRole(role)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title={t('admin:rolesManagement.actions.delete')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </PermissionGuard>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredRoles.length === 0 && (
                <div className="p-12 text-center">
                  <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t('admin:rolesManagement.empty.title')}</h3>
                  <p className="text-gray-600">
                    {searchTerm || filterLevel
                      ? t('admin:rolesManagement.empty.searchMessage')
                      : t('admin:rolesManagement.empty.createMessage')}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'permissions' && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">
              {t('admin:rolesManagement.permissionsList.title')}
            </h3>

            <div className="space-y-6">
              {Object.entries(PERMISSION_CATEGORIES).map(([categoryKey, category]) => (
                <div key={categoryKey} className="border border-gray-200 rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    {category.name}
                    <span className="ml-2 text-sm text-gray-500">
                      ({category.permissions.length} {t('admin:rolesManagement.roleList.permissions')})
                    </span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {category.permissions.map(permission => (
                      <div
                        key={permission}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="text-sm text-gray-700">
                          {permissionsStorage.getPermissionLabel(permission)}
                        </span>
                        <code className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                          {permission}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'statistics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <Shield className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalRoles}</p>
                  <p className="text-gray-600">{t('admin:rolesManagement.statistics.totalRoles')}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-amber-100 text-amber-600">
                  <Crown className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-semibold text-gray-900">{stats.systemRoles}</p>
                  <p className="text-gray-600">{t('admin:rolesManagement.statistics.systemRoles')}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <Users className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-semibold text-gray-900">{stats.customRoles}</p>
                  <p className="text-gray-600">{t('admin:rolesManagement.statistics.customRoles')}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-semibold text-gray-900">
                    {Object.values(PERMISSIONS).length}
                  </p>
                  <p className="text-gray-600">{t('admin:rolesManagement.statistics.permissions')}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de formulaire */}
        <RoleFormModal />

        {/* Notification Toast */}
        {notification && (
          <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
            <div className={`rounded-lg shadow-lg p-4 flex items-start gap-3 ${
              notification.type === 'success'
                ? 'bg-green-50 border-l-4 border-green-500'
                : notification.type === 'warning'
                ? 'bg-amber-50 border-l-4 border-amber-500'
                : 'bg-red-50 border-l-4 border-red-500'
            }`}>
              <div className="flex-shrink-0">
                {notification.type === 'success' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : notification.type === 'warning' ? (
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  notification.type === 'success'
                    ? 'text-green-800'
                    : notification.type === 'warning'
                    ? 'text-amber-800'
                    : 'text-red-800'
                }`}>
                  {notification.message}
                </p>
              </div>
              <button
                onClick={() => setNotification(null)}
                className={`flex-shrink-0 ${
                  notification.type === 'success'
                    ? 'text-green-600 hover:text-green-800'
                    : notification.type === 'warning'
                    ? 'text-amber-600 hover:text-amber-800'
                    : 'text-red-600 hover:text-red-800'
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
};

export default RoleManagementModule;
