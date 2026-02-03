// components/admin/UserManagementModule.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users, UserPlus, Search, Trash2, Edit,
  UserCheck, UserX, Download, RefreshCw,
  Shield, Phone, Mail, Building, Award, Clock,
  AlertCircle, CheckCircle, XCircle, Pause, X, Stethoscope, Briefcase,
  Send
} from 'lucide-react';
import { useUsers } from '../../contexts/UserContext';
import { permissionsStorage } from '../../utils/permissionsStorage';
import { useAuth } from '../../hooks/useAuth';
import {
  getUserStats,
  getAdministrativeRoleLabel,
  hasAdministrativeRole
} from '../../utils/userRoles';
import UserFormModal from '../modals/UserFormModal';
import DeleteUserReassignModal from '../modals/DeleteUserReassignModal';
import { usePermissions } from '../auth/PermissionGuard';
import { useTranslation } from 'react-i18next';
import { healthcareProvidersApi } from '../../api/healthcareProvidersApi';

const UserManagementModule = () => {
  const { t } = useTranslation('admin');
  const { user: currentUser, company } = useAuth();
  const { hasPermission } = usePermissions();

  // Utiliser le contexte utilisateurs au lieu de l'état local
  const {
    users,
    isLoading,
    error: contextError,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    refreshUsers,
    getUserStatistics
  } = useUsers();

  // État local UI uniquement
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    role: '',
    department: '',
    isActive: '',
    lastLoginDays: '',
    accountStatus: '' // Nouveau filtre pour le statut du compte
  });
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [notification, setNotification] = useState(null);

  // État pour les praticiens (tous + pending)
  const [allProviders, setAllProviders] = useState([]);
  const [pendingProviders, setPendingProviders] = useState([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);

  // Charger tous les praticiens (on garde la ref complète pour enrichir les users actifs)
  const loadPendingProviders = useCallback(async () => {
    try {
      setIsLoadingPending(true);
      const result = await healthcareProvidersApi.getHealthcareProviders();
      const providers = result.providers || [];
      setAllProviders(providers);
      setPendingProviders(providers.filter(p => p.accountStatus === 'pending'));
    } catch (error) {
      console.error('[UserManagementModule] Error loading providers:', error);
    } finally {
      setIsLoadingPending(false);
    }
  }, []);

  // Charger les praticiens en attente au démarrage
  useEffect(() => {
    loadPendingProviders();
  }, [loadPendingProviders]);

  // Renvoyer une invitation
  const handleResendInvitation = async (provider) => {
    if (!window.confirm(t('userManagement.messages.resendConfirm', { email: provider.email }))) {
      return;
    }
    try {
      await healthcareProvidersApi.resendInvitation(provider.id, company?.id);
      showNotification(t('userManagement.messages.resendSuccess', 'Invitation renvoyée avec succès'), 'success');
    } catch (error) {
      console.error('[UserManagementModule] Error resending invitation:', error);
      showNotification(t('userManagement.messages.resendError', 'Erreur lors de l\'envoi'), 'error');
    }
  };

  // Convertir les praticiens pending au format utilisateur pour l'affichage unifié
  const pendingAsUsers = useMemo(() => {
    return pendingProviders.map(provider => ({
      id: provider.id,
      email: provider.email,
      firstName: provider.firstName,
      lastName: provider.lastName,
      role: provider.role || 'practitioner',
      phone: provider.phone,
      isActive: false, // Pending = pas encore actif
      accountStatus: 'pending',
      isPendingProvider: true, // Flag pour identifier les praticiens pending
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
      speciality: provider.speciality
    }));
  }, [pendingProviders]);

  // Calculer les statistiques à partir du contexte + pending
  const statistics = useMemo(() => {
    const userStats = getUserStats(users);
    return {
      total: userStats.total + pendingProviders.length,
      active: userStats.active,
      inactive: userStats.inactive,
      pending: pendingProviders.length,
      admins: userStats.administrative?.total || 0,
      practitioners: userStats.practitioners?.total || 0
    };
  }, [users, pendingProviders]);

  // Fusionner utilisateurs actifs (enrichis avec données provider) et praticiens pending
  const allUsers = useMemo(() => {
    const activeUsers = users.map(u => {
      // Enrichir avec les données du healthcare_provider lié (department, speciality, etc.)
      const provider = allProviders.find(
        p => p.centralUserId === u.id || p.email === u.email
      );
      return {
        ...u,
        // Provider fields (profession → department pour le formulaire)
        department: provider?.profession || u.department || '',
        speciality: provider?.speciality || u.speciality || '',
        administrativeRole: provider?.administrativeRole || u.administrativeRole || '',
        phone: provider?.phone || u.phone || '',
        licenseNumber: provider?.licenseNumber || u.licenseNumber || '',
        accountStatus: u.accountStatus || 'active',
        isPendingProvider: false
      };
    });
    return [...activeUsers, ...pendingAsUsers];
  }, [users, pendingAsUsers, allProviders]);

  // Filtrage et tri appliqués avec useMemo pour performance
  const filteredUsers = useMemo(() => {
    let filtered = [...allUsers];

    // Filtrage par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => {
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
        const email = (user.email || '').toLowerCase();
        const role = (user.role || '').toLowerCase();

        return fullName.includes(query) ||
               email.includes(query) ||
               role.includes(query);
      });
    }

    // Filtrage par rôle
    if (filters.role) {
      filtered = filtered.filter(user => user.role === filters.role);
    }

    // Filtrage par statut actif
    if (filters.isActive !== '') {
      const isActiveFilter = filters.isActive === 'true';
      filtered = filtered.filter(user => user.isActive === isActiveFilter);
    }

    // Filtrage par statut du compte (active/pending)
    if (filters.accountStatus) {
      filtered = filtered.filter(user => user.accountStatus === filters.accountStatus);
    }

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
        bValue = (bValue || '').toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [allUsers, searchQuery, filters, sortField, sortDirection]);

  // Reset page quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters, sortField, sortDirection]);

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

  // Afficher l'erreur du contexte si présente
  useEffect(() => {
    if (contextError) {
      showNotification(contextError, 'error');
    }
  }, [contextError]);

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

  const isPractitionerRole = (role) =>
    ['physician', 'practitioner', 'doctor'].includes(role);

  const handleSaveUser = async (userData) => {
    try {
      if (editingUser) {
        if (editingUser.isPendingProvider) {
          // Pending provider: update via healthcare_providers API
          await healthcareProvidersApi.updateHealthcareProvider(editingUser.id, userData);
          await loadPendingProviders();
        } else if (isPractitionerRole(editingUser.role)) {
          // Active practitioner: update user fields via users API
          await updateUser(editingUser.id, userData);
          // Also update provider fields via healthcare_providers API
          const provider = allProviders.find(
            p => p.centralUserId === editingUser.id || p.email === editingUser.email
          );
          if (provider) {
            await healthcareProvidersApi.updateHealthcareProvider(provider.id, userData);
          }
          await loadPendingProviders();
        } else {
          // Non-practitioner: update via users context only
          await updateUser(editingUser.id, userData);
        }
        showNotification(t('users.messages.updateSuccess') || 'Utilisateur mis à jour avec succès', 'success');
      } else {
        if (isPractitionerRole(userData.role)) {
          // Create practitioner via healthcare_providers API (creates provider + linked central user)
          await healthcareProvidersApi.createHealthcareProvider(userData);
          await loadPendingProviders();
          await refreshUsers();
        } else {
          // Create non-practitioner via users context
          await createUser(userData);
        }
        showNotification(t('users.messages.createSuccess') || 'Utilisateur créé avec succès', 'success');
      }

      setShowUserModal(false);
    } catch (error) {
      showNotification(error.message || t('users.messages.saveError') || 'Erreur lors de la sauvegarde', 'error');
      throw error;
    }
  };

  const handleDeleteUser = (user) => {
    // Open the delete modal with reassignment options
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async (userId, reassignToId) => {
    try {
      // If it's a pending provider (from healthcare_providers table), use that API
      const user = allUsers.find(u => u.id === userId);
      if (user?.isPendingProvider) {
        await healthcareProvidersApi.deleteHealthcareProvider(userId, reassignToId);
        await loadPendingProviders(); // Refresh pending providers
      } else {
        // For regular users from central DB
        await deleteUser(userId);
      }
      showNotification(t('users.messages.deleteSuccess') || 'Utilisateur supprimé avec succès', 'success');
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('[UserManagementModule] Delete error:', error);
      throw error; // Let the modal handle the error display
    }
  };

  const handleToggleUserStatus = async (userId) => {
    try {
      await toggleUserStatus(userId);
      showNotification(t('users.messages.statusUpdated') || 'Statut mis à jour', 'success');
    } catch (error) {
      showNotification(error.message || t('users.messages.updateError') || 'Erreur lors de la modification', 'error');
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedUsers.length === 0) return;

    if (!window.confirm(t('users.messages.bulkConfirm', { count: selectedUsers.length }) || `Êtes-vous sûr d'appliquer cette action à ${selectedUsers.length} utilisateur(s) ?`)) {
      return;
    }

    try {
      for (const userId of selectedUsers) {
        if (action === 'activate') {
          await updateUser(userId, { isActive: true });
        } else if (action === 'deactivate') {
          await updateUser(userId, { isActive: false });
        } else if (action === 'delete') {
          await deleteUser(userId);
        }
      }

      setSelectedUsers([]);
      showNotification(t('users.messages.bulkSuccess') || 'Action groupée effectuée avec succès', 'success');
    } catch (error) {
      showNotification(error.message || t('users.messages.bulkError') || 'Erreur lors de l\'action groupée', 'error');
    }
  };

  const handleExport = () => {
    try {
      // Créer le CSV à partir des utilisateurs filtrés
      const headers = ['ID', 'Prénom', 'Nom', 'Email', 'Téléphone', 'Rôle métier', 'Fonction administrative', 'Profession', 'Statut', 'Créé le'];
      const rows = filteredUsers.map(user => [
        user.id,
        user.firstName || '',
        user.lastName || '',
        user.email || '',
        user.phone || '',
        user.role || '',
        getAdministrativeRoleLabel(user.administrativeRole) || '',
        user.profession || '',
        user.isActive ? 'Actif' : 'Inactif',
        user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `utilisateurs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showNotification(t('users.messages.exportSuccess') || 'Export réalisé avec succès', 'success');
    } catch (error) {
      showNotification(error.message || t('users.messages.exportError') || 'Erreur lors de l\'export', 'error');
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
    if (!lastLogin) return t('usersManagement.lastLogin.never');

    const date = new Date(lastLogin);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 60) return t('usersManagement.lastLogin.minutes', { count: diffInMinutes });
    if (diffInMinutes < 1440) return t('usersManagement.lastLogin.hours', { count: Math.floor(diffInMinutes / 60) });
    return t('usersManagement.lastLogin.days', { count: Math.floor(diffInMinutes / 1440) });
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('usersManagement.accessDenied')}</h3>
          <p className="text-gray-600">{t('usersManagement.noPermission')}</p>
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
              {t('usersManagement.title')}
            </h1>
            <p className="text-gray-600 mt-1">{t('usersManagement.subtitle')}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => refreshUsers()}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title={t('usersManagement.refresh')}
            >
              <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {hasPermission('users.export') && (
              <button
                onClick={handleExport}
                className="px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {t('usersManagement.export')}
              </button>
            )}

            {hasPermission('users.create') && (
              <button
                onClick={handleCreateUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                {t('usersManagement.newUserBtn')}
              </button>
            )}
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-blue-600">{t('usersManagement.stats.total')}</p>
                <p className="text-2xl font-bold text-blue-900">{statistics.total || 0}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-3">
              <UserCheck className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-green-600">{t('usersManagement.stats.active')}</p>
                <p className="text-2xl font-bold text-green-900">{statistics.active || 0}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-yellow-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-sm text-yellow-600">{t('usersManagement.stats.pending', 'En attente')}</p>
                <p className="text-2xl font-bold text-yellow-900">{statistics.pending || 0}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Briefcase className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-purple-600">{t('usersManagement.stats.adminFunctions')}</p>
                <p className="text-2xl font-bold text-purple-900">{statistics.admins || 0}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Stethoscope className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-orange-600">{t('usersManagement.stats.practitioners')}</p>
                <p className="text-2xl font-bold text-orange-900">{statistics.practitioners || 0}</p>
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
              placeholder={t('usersManagement.filters.searchPlaceholder')}
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
              <option value="">{t('usersManagement.filters.allRoles')}</option>
              {permissionsStorage.getAllRoles().map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>

            <select
              value={filters.isActive}
              onChange={(e) => setFilters(prev => ({ ...prev, isActive: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{t('usersManagement.filters.allStatuses')}</option>
              <option value="true">{t('usersManagement.filters.activeOnly')}</option>
              <option value="false">{t('usersManagement.filters.inactiveOnly')}</option>
            </select>

            <select
              value={filters.accountStatus}
              onChange={(e) => setFilters(prev => ({ ...prev, accountStatus: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{t('usersManagement.filters.allAccountStatuses', 'Tous les comptes')}</option>
              <option value="active">{t('usersManagement.filters.activatedAccounts', 'Comptes activés')}</option>
              <option value="pending">{t('usersManagement.filters.pendingAccounts', 'En attente d\'activation')}</option>
            </select>

            <select
              value={filters.lastLoginDays}
              onChange={(e) => setFilters(prev => ({ ...prev, lastLoginDays: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{t('usersManagement.filters.allConnections')}</option>
              <option value="1">{t('usersManagement.filters.connectedToday')}</option>
              <option value="7">{t('usersManagement.filters.connectedThisWeek')}</option>
              <option value="30">{t('usersManagement.filters.connectedThisMonth')}</option>
            </select>
          </div>
        </div>

        {/* Actions groupées */}
        {selectedUsers.length > 0 && hasPermission('users.update') && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {t('usersManagement.bulk.selected', { count: selectedUsers.length })}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction('activate')}
                className="px-3 py-1 text-sm text-green-600 bg-green-50 hover:bg-green-100 rounded"
              >
                {t('usersManagement.bulk.activate')}
              </button>
              <button
                onClick={() => handleBulkAction('deactivate')}
                className="px-3 py-1 text-sm text-orange-600 bg-orange-50 hover:bg-orange-100 rounded"
              >
                {t('usersManagement.bulk.deactivate')}
              </button>
              {hasPermission('users.delete') && (
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="px-3 py-1 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded"
                >
                  {t('usersManagement.bulk.delete')}
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
            <p className="text-gray-600">{t('usersManagement.loading')}</p>
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
                      {t('usersManagement.table.user')}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('role')}
                    >
                      {t('usersManagement.table.role')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('usersManagement.table.department')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('usersManagement.table.status')}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('lastLogin')}
                    >
                      {t('usersManagement.table.lastConnection')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('usersManagement.table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedUsers.map((user) => {
                    // Marquer l'utilisateur connecté comme "en ligne"
                    // Note: sessionInfo n'est pas fourni par l'API pour l'instant
                    const isOnline = user.id === currentUser?.id || user.sessionInfo?.currentSessions > 0;
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
                          {hasAdministrativeRole(user) && (
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                <Briefcase className="h-3 w-3 mr-1" />
                                {getAdministrativeRoleLabel(user.administrativeRole)}
                              </span>
                            </div>
                          )}
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
                          {user.accountStatus === 'pending' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <Clock className="h-3 w-3 mr-1" />
                              {t('usersManagement.status.pending', 'En attente')}
                            </span>
                          ) : (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.isActive, isOnline)}`}>
                              {getStatusIcon(user.isActive, isOnline)}
                              <span className="ml-1">
                                {!user.isActive ? t('usersManagement.status.inactive') : isOnline ? t('usersManagement.status.online') : t('usersManagement.status.offline')}
                              </span>
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {user.id === currentUser?.id ? t('usersManagement.status.nowConnected') : formatLastLogin(user.lastLogin)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Bouton de renvoi d'invitation pour les utilisateurs pending */}
                            {user.isPendingProvider && (
                              <button
                                onClick={() => handleResendInvitation(user)}
                                className="p-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded"
                                title={t('usersManagement.actions.resendInvitation', 'Renvoyer l\'invitation')}
                              >
                                <Send className="h-4 w-4" />
                              </button>
                            )}

                            {/* Bouton d'édition - désactivé pour les pending */}
                            {hasPermission('users.update') && !user.isPendingProvider && (
                              <button
                                onClick={() => handleEditUser(user)}
                                className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                                title={t('usersManagement.actions.edit')}
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            )}

                            {/* Bouton activer/désactiver - pas pour les pending */}
                            {hasPermission('users.update') && !user.isPendingProvider && (
                              <button
                                onClick={() => handleToggleUserStatus(user.id)}
                                className={`p-1 rounded ${
                                  user.isActive
                                    ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50'
                                    : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                                }`}
                                title={user.isActive ? t('usersManagement.actions.deactivate') : t('usersManagement.actions.activate')}
                              >
                                {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                              </button>
                            )}

                            {hasPermission('users.delete') && (
                              <button
                                onClick={() => handleDeleteUser(user)}
                                className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                                title={t('usersManagement.actions.delete')}
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
                    {t('usersManagement.pagination.showing', {
                      from: (currentPage - 1) * itemsPerPage + 1,
                      to: Math.min(currentPage * itemsPerPage, filteredUsers.length),
                      total: filteredUsers.length
                    })}
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
                    {t('usersManagement.pagination.previous')}
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
                    {t('usersManagement.pagination.next')}
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

      {/* Modal de suppression avec réattribution */}
      <DeleteUserReassignModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setUserToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        user={userToDelete}
        providers={allUsers.filter(u =>
          u.role && ['physician', 'practitioner'].includes(u.role) && u.isActive
        )}
      />

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
          <div className={`rounded-lg shadow-lg p-4 flex items-start gap-3 ${
            notification.type === 'success'
              ? 'bg-green-50 border-l-4 border-green-500'
              : 'bg-red-50 border-l-4 border-red-500'
          }`}>
            <div className="flex-shrink-0">
              {notification.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                notification.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {notification.message}
              </p>
            </div>
            <button
              onClick={() => setNotification(null)}
              className={`flex-shrink-0 ${
                notification.type === 'success' ? 'text-green-600 hover:text-green-800' : 'text-red-600 hover:text-red-800'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementModule;