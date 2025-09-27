// components/admin/UserManagementModule.js
import React, { useState, useEffect } from 'react';
import {
  Users, UserPlus, Search, Filter, MoreVertical, Trash2, Edit,
  Eye, UserCheck, UserX, Download, RefreshCw, Calendar,
  Shield, Phone, Mail, Building, Award, Clock, Activity,
  AlertCircle, CheckCircle, XCircle, Pause
} from 'lucide-react';
import { usersStorage } from '../../utils/usersStorage';
import { permissionsStorage } from '../../utils/permissionsStorage';
import { useAuth } from '../../contexts/AuthContext';
import UserFormModal from '../modals/UserFormModal';
import { usePermissions } from '../auth/PermissionGuard';

const UserManagementModule = () => {
  const { user: currentUser } = useAuth();
  const { hasPermission } = usePermissions();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    role: '',
    department: '',
    isActive: '',
    lastLoginDays: ''
  });
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [users, searchQuery, filters, sortField, sortDirection]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Initialiser les utilisateurs par défaut
      usersStorage.initializeDefaultUsers();

      // Charger les données
      const usersData = usersStorage.getAll();
      const stats = usersStorage.getStatistics();

      setUsers(usersData);
      setStatistics(stats);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = usersStorage.search(searchQuery, filters);

    // Tri
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Gestion des dates
      if (['createdAt', 'lastLogin', 'updatedAt'].includes(sortField)) {
        aValue = aValue ? new Date(aValue) : new Date(0);
        bValue = bValue ? new Date(bValue) : new Date(0);
      }

      // Gestion des chaînes
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredUsers(filtered);
    setCurrentPage(1);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setShowUserModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowUserModal(true);
  };

  const handleSaveUser = async (userData) => {
    try {
      if (editingUser) {
        // Modification
        await usersStorage.update(editingUser.id, userData, currentUser.id);
      } else {
        // Création
        await usersStorage.create(userData, currentUser.id);
      }

      await loadData();
      setShowUserModal(false);
    } catch (error) {
      throw error;
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      return;
    }

    try {
      await usersStorage.delete(userId, currentUser.id);
      await loadData();
    } catch (error) {
      alert('Erreur lors de la suppression: ' + error.message);
    }
  };

  const handleToggleUserStatus = async (userId) => {
    try {
      const user = users.find(u => u.id === userId);
      if (user) {
        await usersStorage.update(userId, { isActive: !user.isActive }, currentUser.id);
        await loadData();
      }
    } catch (error) {
      alert('Erreur lors de la modification: ' + error.message);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedUsers.length === 0) return;

    if (!window.confirm(`Êtes-vous sûr d'appliquer cette action à ${selectedUsers.length} utilisateur(s) ?`)) {
      return;
    }

    try {
      for (const userId of selectedUsers) {
        if (action === 'activate') {
          await usersStorage.update(userId, { isActive: true }, currentUser.id);
        } else if (action === 'deactivate') {
          await usersStorage.update(userId, { isActive: false }, currentUser.id);
        } else if (action === 'delete') {
          await usersStorage.delete(userId, currentUser.id);
        }
      }

      setSelectedUsers([]);
      await loadData();
    } catch (error) {
      alert('Erreur lors de l\'action groupée: ' + error.message);
    }
  };

  const handleExport = () => {
    try {
      const csvData = usersStorage.export('csv');
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `utilisateurs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Erreur lors de l\'export: ' + error.message);
    }
  };

  const getRoleColor = (roleId) => {
    const role = permissionsStorage.getRoleById(roleId);
    if (role?.level >= 90) return 'bg-red-100 text-red-800';
    if (role?.level >= 70) return 'bg-orange-100 text-orange-800';
    if (role?.level >= 50) return 'bg-blue-100 text-blue-800';
    if (role?.level >= 30) return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (isActive, isOnline) => {
    if (!isActive) return 'bg-red-100 text-red-800';
    if (isOnline) return 'bg-green-100 text-green-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const getStatusIcon = (isActive, isOnline) => {
    if (!isActive) return <XCircle className="h-4 w-4" />;
    if (isOnline) return <CheckCircle className="h-4 w-4" />;
    return <Pause className="h-4 w-4" />;
  };

  const formatLastLogin = (lastLogin) => {
    if (!lastLogin) return 'Jamais connecté';

    const date = new Date(lastLogin);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
    if (diffInMinutes < 1440) return `Il y a ${Math.floor(diffInMinutes / 60)} h`;
    return `Il y a ${Math.floor(diffInMinutes / 1440)} j`;
  };

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  if (!hasPermission('users.read')) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Accès non autorisé</h3>
          <p className="text-gray-600">Vous n'avez pas les permissions pour accéder à la gestion des utilisateurs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec statistiques */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
              Gestion des utilisateurs
            </h1>
            <p className="text-gray-600 mt-1">Administrez les comptes utilisateurs et leurs permissions</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadData()}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Actualiser"
            >
              <RefreshCw className="h-5 w-5" />
            </button>

            {hasPermission('users.export') && (
              <button
                onClick={handleExport}
                className="px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Exporter
              </button>
            )}

            {hasPermission('users.create') && (
              <button
                onClick={handleCreateUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Nouvel utilisateur
              </button>
            )}
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-blue-600">Total</p>
                <p className="text-2xl font-bold text-blue-900">{statistics.total || 0}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-3">
              <UserCheck className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-green-600">Actifs</p>
                <p className="text-2xl font-bold text-green-900">{statistics.active || 0}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-orange-600">En ligne</p>
                <p className="text-2xl font-bold text-orange-900">{statistics.onlineNow || 0}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-purple-600">Connexions 7j</p>
                <p className="text-2xl font-bold text-purple-900">{statistics.recentLogins || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtres et recherche */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Rechercher par nom, email, département..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={filters.role}
              onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Tous les rôles</option>
              {permissionsStorage.getAllRoles().map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>

            <select
              value={filters.isActive}
              onChange={(e) => setFilters(prev => ({ ...prev, isActive: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Tous les statuts</option>
              <option value="true">Actifs seulement</option>
              <option value="false">Inactifs seulement</option>
            </select>

            <select
              value={filters.lastLoginDays}
              onChange={(e) => setFilters(prev => ({ ...prev, lastLoginDays: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Toutes les connexions</option>
              <option value="1">Connectés aujourd'hui</option>
              <option value="7">Connectés cette semaine</option>
              <option value="30">Connectés ce mois</option>
            </select>
          </div>
        </div>

        {/* Actions groupées */}
        {selectedUsers.length > 0 && hasPermission('users.update') && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {selectedUsers.length} utilisateur(s) sélectionné(s)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction('activate')}
                className="px-3 py-1 text-sm text-green-600 bg-green-50 hover:bg-green-100 rounded"
              >
                Activer
              </button>
              <button
                onClick={() => handleBulkAction('deactivate')}
                className="px-3 py-1 text-sm text-orange-600 bg-orange-50 hover:bg-orange-100 rounded"
              >
                Désactiver
              </button>
              {hasPermission('users.delete') && (
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="px-3 py-1 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded"
                >
                  Supprimer
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Table des utilisateurs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-8 w-8 text-blue-600 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Chargement des utilisateurs...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedUsers.length === paginatedUsers.length && paginatedUsers.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers(paginatedUsers.map(u => u.id));
                          } else {
                            setSelectedUsers([]);
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('firstName')}
                    >
                      Utilisateur
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('role')}
                    >
                      Rôle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Département
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('lastLogin')}
                    >
                      Dernière connexion
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedUsers.map((user) => {
                    const isOnline = user.sessionInfo?.currentSessions > 0;
                    return (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers(prev => [...prev, user.id]);
                              } else {
                                setSelectedUsers(prev => prev.filter(id => id !== user.id));
                              }
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-blue-600 font-medium text-sm">
                                  {user.firstName?.[0]}{user.lastName?.[0]}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {user.email}
                              </div>
                              {user.phone && (
                                <div className="text-sm text-gray-500 flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {user.phone}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                            <Shield className="h-3 w-3 mr-1" />
                            {permissionsStorage.getRoleById(user.role)?.name || user.role}
                          </span>
                          {user.licenseNumber && (
                            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                              <Award className="h-3 w-3" />
                              {user.licenseNumber}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            {user.department || '-'}
                          </div>
                          {user.speciality && (
                            <div className="text-xs text-gray-500">{user.speciality}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.isActive, isOnline)}`}>
                            {getStatusIcon(user.isActive, isOnline)}
                            <span className="ml-1">
                              {!user.isActive ? 'Inactif' : isOnline ? 'En ligne' : 'Hors ligne'}
                            </span>
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatLastLogin(user.lastLogin)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {hasPermission('users.update') && (
                              <button
                                onClick={() => handleEditUser(user)}
                                className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                                title="Modifier"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            )}

                            {hasPermission('users.update') && (
                              <button
                                onClick={() => handleToggleUserStatus(user.id)}
                                className={`p-1 rounded ${
                                  user.isActive
                                    ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50'
                                    : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                                }`}
                                title={user.isActive ? 'Désactiver' : 'Activer'}
                              >
                                {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                              </button>
                            )}

                            {hasPermission('users.delete') && (
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                                title="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">
                    Affichage de {(currentPage - 1) * itemsPerPage + 1} à{' '}
                    {Math.min(currentPage * itemsPerPage, filteredUsers.length)} sur{' '}
                    {filteredUsers.length} résultats
                  </span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
                    className="ml-2 px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                  >
                    Précédent
                  </button>

                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2)
                      .map((page, index, array) => (
                        <React.Fragment key={page}>
                          {index > 0 && array[index - 1] !== page - 1 && (
                            <span className="px-2 text-gray-500">...</span>
                          )}
                          <button
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1 text-sm border rounded ${
                              currentPage === page
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de création/édition */}
      <UserFormModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        onSave={handleSaveUser}
        user={editingUser}
        currentUser={currentUser}
      />
    </div>
  );
};

export default UserManagementModule;