// components/admin/RoleManagementModule.js
import React, { useState, useEffect } from 'react';
import {
  Shield, Plus, Search, Filter, Eye, Edit2, Trash2, Users,
  CheckCircle, XCircle, AlertTriangle, Settings, BarChart3,
  Crown, Lock, Unlock, Copy, Download, Upload
} from 'lucide-react';
import {
  permissionsStorage,
  PERMISSIONS,
  PERMISSION_CATEGORIES,
  DEFAULT_ROLES
} from '../../utils/permissionsStorage';
import { useAuth } from '../../contexts/AuthContext';
import PermissionGuard from '../auth/PermissionGuard';

const RoleManagementModule = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState([]);
  const [filteredRoles, setFilteredRoles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [selectedRole, setSelectedRole] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [stats, setStats] = useState({});
  const [activeTab, setActiveTab] = useState('roles');

  // Charger les rôles
  const loadRoles = () => {
    const allRoles = permissionsStorage.getRoles();
    setRoles(allRoles);
    setFilteredRoles(allRoles);
    setStats(permissionsStorage.getStatistics());
  };

  useEffect(() => {
    // Initialiser les rôles par défaut
    permissionsStorage.initializeDefaultRoles();
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

  // Formulaire de rôle
  const RoleFormModal = () => {
    const [formData, setFormData] = useState({
      name: '',
      description: '',
      level: 1,
      color: 'blue',
      permissions: []
    });
    const [selectedPermissions, setSelectedPermissions] = useState({});

    useEffect(() => {
      if (selectedRole && isEditMode) {
        setFormData({
          name: selectedRole.name,
          description: selectedRole.description,
          level: selectedRole.level,
          color: selectedRole.color || 'blue',
          permissions: selectedRole.permissions || []
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
          permissions: []
        });
        setSelectedPermissions({});
      }
    }, [selectedRole, isEditMode]);

    const handlePermissionToggle = (permission) => {
      setSelectedPermissions(prev => ({
        ...prev,
        [permission]: !prev[permission]
      }));
    };

    const handleSubmit = (e) => {
      e.preventDefault();

      try {
        const permissions = Object.entries(selectedPermissions)
          .filter(([_, selected]) => selected)
          .map(([permission, _]) => permission);

        const roleData = {
          ...formData,
          permissions
        };

        if (isEditMode && selectedRole) {
          permissionsStorage.updateRole(selectedRole.id, roleData);
        } else {
          permissionsStorage.createRole(roleData);
        }

        loadRoles();
        handleCloseModal();
      } catch (error) {
        alert('Erreur : ' + error.message);
      }
    };

    const handleCloseModal = () => {
      setIsModalOpen(false);
      setSelectedRole(null);
      setIsEditMode(false);
    };

    if (!isModalOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Shield className="h-6 w-6" />
              <h2 className="text-xl font-semibold">
                {isEditMode ? 'Modifier le rôle' : 'Nouveau rôle'}
              </h2>
            </div>
            <button onClick={handleCloseModal} className="text-white hover:text-gray-200">
              <XCircle className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[75vh]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du rôle *
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
                  Niveau (1-100)
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
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Description du rôle et de ses responsabilités"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Couleur du rôle
              </label>
              <select
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="blue">Bleu</option>
                <option value="green">Vert</option>
                <option value="purple">Violet</option>
                <option value="red">Rouge</option>
                <option value="yellow">Jaune</option>
                <option value="pink">Rose</option>
                <option value="teal">Sarcelle</option>
                <option value="orange">Orange</option>
                <option value="gray">Gris</option>
              </select>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Lock className="h-5 w-5 mr-2" />
                Permissions
              </h3>

              <div className="space-y-6">
                {Object.entries(PERMISSION_CATEGORIES).map(([categoryKey, category]) => (
                  <div key={categoryKey} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <Settings className="h-4 w-4 mr-2" />
                      {category.name}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {category.permissions.map(permission => (
                        <label key={permission} className="flex items-center space-x-3 cursor-pointer">
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

            <div className="flex justify-end space-x-4 pt-4 border-t">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {isEditMode ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const handleDeleteRole = (role) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le rôle "${role.name}" ?`)) {
      try {
        permissionsStorage.deleteRole(role.id);
        loadRoles();
      } catch (error) {
        alert('Erreur : ' + error.message);
      }
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
    if (level >= 80) return 'Élevé';
    if (level >= 50) return 'Moyen';
    return 'Bas';
  };

  return (
    <PermissionGuard permission={PERMISSIONS.ROLES_VIEW}>
      <div className="space-y-6">
        {/* En-tête avec onglets */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Gestion des rôles</h2>
                <p className="text-gray-600 mt-1">
                  Configurez les rôles et permissions de votre équipe
                </p>
              </div>
              <PermissionGuard permission={PERMISSIONS.ROLES_CREATE}>
                <button
                  onClick={() => {
                    setSelectedRole(null);
                    setIsEditMode(false);
                    setIsModalOpen(true);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Nouveau rôle</span>
                </button>
              </PermissionGuard>
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
                Rôles ({roles.length})
              </button>
              <button
                onClick={() => setActiveTab('permissions')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'permissions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Permissions
              </button>
              <button
                onClick={() => setActiveTab('statistics')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'statistics'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Statistiques
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
                    Rechercher
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Nom ou description..."
                      className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Niveau d'accès
                  </label>
                  <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tous les niveaux</option>
                    <option value="high">Élevé (80-100)</option>
                    <option value="medium">Moyen (50-79)</option>
                    <option value="low">Bas (1-49)</option>
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
                    <span>Réinitialiser</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Liste des rôles */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-medium text-gray-900">
                  Rôles configurés ({filteredRoles.length})
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
                                Rôle système
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-gray-600 mb-3">{role.description}</p>

                        <div className="flex items-center space-x-4 text-sm">
                          <span className={`px-2 py-1 rounded-full ${getLevelBadge(role.level)}`}>
                            Niveau {role.level} - {getLevelText(role.level)}
                          </span>
                          <span className="text-gray-500">
                            {role.permissions?.length || 0} permissions
                          </span>
                          <span className="text-gray-500">
                            Créé le {new Date(role.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => {
                            setSelectedRole(role);
                            setIsEditMode(false);
                            // Ouvrir un modal de détails
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Voir les détails"
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
                            title="Modifier"
                            disabled={role.isSystemRole}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </PermissionGuard>

                        <PermissionGuard permission={PERMISSIONS.ROLES_DELETE}>
                          <button
                            onClick={() => handleDeleteRole(role)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Supprimer"
                            disabled={role.isSystemRole}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </PermissionGuard>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredRoles.length === 0 && (
                <div className="p-12 text-center">
                  <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun rôle trouvé</h3>
                  <p className="text-gray-600">
                    {searchTerm || filterLevel
                      ? 'Aucun rôle ne correspond à vos critères de recherche.'
                      : 'Commencez par créer votre premier rôle personnalisé.'}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'permissions' && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">
              Permissions disponibles dans le système
            </h3>

            <div className="space-y-6">
              {Object.entries(PERMISSION_CATEGORIES).map(([categoryKey, category]) => (
                <div key={categoryKey} className="border border-gray-200 rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    {category.name}
                    <span className="ml-2 text-sm text-gray-500">
                      ({category.permissions.length} permissions)
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
                  <p className="text-gray-600">Rôles total</p>
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
                  <p className="text-gray-600">Rôles système</p>
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
                  <p className="text-gray-600">Rôles personnalisés</p>
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
                  <p className="text-gray-600">Permissions</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de formulaire */}
        <RoleFormModal />
      </div>
    </PermissionGuard>
  );
};

export default RoleManagementModule;