// components/admin/TeamManagementModule.js
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users, UserPlus, UserCheck, Calendar, Clock, Shield, Search,
  Plus, Edit, Trash2, Eye, Download, RefreshCw, Filter,
  Building, Award, Activity, AlertCircle, CheckCircle, XCircle,
  UserMinus, ArrowRight, Bell, Settings
} from 'lucide-react';
import { teamsApi } from '../../api/teamsApi';
import { teamsStorage } from '../../utils/teamsStorage'; // Fallback for delegations
import { usersStorage } from '../../utils/usersStorage';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../auth/PermissionGuard';
import TeamFormModal from '../modals/TeamFormModal';
import DelegationFormModal from '../modals/DelegationFormModal';

const TeamManagementModule = () => {
  const { t, i18n } = useTranslation('admin');
  const { user: currentUser } = useAuth();
  const { hasPermission } = usePermissions();

  // State pour les équipes
  const [teams, setTeams] = useState([]);
  const [filteredTeams, setFilteredTeams] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilters, setTeamFilters] = useState({
    department: '',
    isActive: '',
    leaderId: ''
  });

  // State pour les délégations
  const [delegations, setDelegations] = useState([]);
  const [filteredDelegations, setFilteredDelegations] = useState([]);
  const [delegationSearchQuery, setDelegationSearchQuery] = useState('');
  const [delegationFilters, setDelegationFilters] = useState({
    status: '',
    fromUserId: '',
    toUserId: ''
  });

  // State général
  const [statistics, setStatistics] = useState({});
  const [activeTab, setActiveTab] = useState('teams');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(true);

  // State pour les modales
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showDelegationModal, setShowDelegationModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [editingDelegation, setEditingDelegation] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'teams') {
      applyTeamFilters();
    } else {
      applyDelegationFilters();
    }
  }, [teams, delegations, searchQuery, delegationSearchQuery, teamFilters, delegationFilters, activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Charger les équipes depuis l'API backend
      let teamsData = [];
      try {
        const result = await teamsApi.getTeams({ limit: 100 });
        teamsData = result.teams || [];
        console.log('[TeamManagement] Loaded teams from API:', teamsData.length);
      } catch (apiError) {
        console.warn('[TeamManagement] API unavailable, falling back to localStorage:', apiError.message);
        // Fallback to localStorage if API fails
        teamsStorage.initializeDefaultTeams();
        teamsData = teamsStorage.getAllTeams();
      }

      // Delegations remain in localStorage for now (no backend API yet)
      const delegationsData = teamsStorage.getAllDelegations();

      // Calculate statistics
      const stats = {
        totalTeams: teamsData.length,
        activeTeams: teamsData.filter(t => t.isActive !== false).length,
        totalDelegations: delegationsData.length,
        activeDelegations: delegationsData.filter(d => d.isActive).length
      };

      setTeams(teamsData);
      setDelegations(delegationsData);
      setStatistics(stats);
    } catch (error) {
      console.error(t('teamManagement.messages.loadError'), error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyTeamFilters = () => {
    // Guard: ensure teams is defined
    if (!teams || !Array.isArray(teams)) {
      setFilteredTeams([]);
      return;
    }

    let filtered = [...teams];

    // Apply search filter
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      filtered = filtered.filter(team =>
        team.name?.toLowerCase().includes(search) ||
        team.description?.toLowerCase().includes(search) ||
        team.department?.toLowerCase().includes(search)
      );
    }

    // Apply department filter
    if (teamFilters.department) {
      filtered = filtered.filter(team => team.department === teamFilters.department);
    }

    // Apply active status filter
    if (teamFilters.isActive !== '' && teamFilters.isActive !== undefined) {
      const isActiveValue = teamFilters.isActive === 'true' || teamFilters.isActive === true;
      filtered = filtered.filter(team => team.isActive === isActiveValue);
    }

    setFilteredTeams(filtered);
    setCurrentPage(1);
  };

  const applyDelegationFilters = () => {
    // Guard: ensure delegations is defined
    if (!delegations || !Array.isArray(delegations)) {
      setFilteredDelegations([]);
      return;
    }

    let filtered = delegations.filter(delegation => !delegation.isDeleted);

    // Recherche textuelle
    if (delegationSearchQuery) {
      const searchTerm = delegationSearchQuery.toLowerCase();
      const users = usersStorage.getAll();

      filtered = filtered.filter(delegation => {
        const fromUser = users.find(u => u.id === delegation.fromUserId);
        const toUser = users.find(u => u.id === delegation.toUserId);

        return (delegation.reason || '').toLowerCase().includes(searchTerm) ||
               fromUser?.firstName?.toLowerCase().includes(searchTerm) ||
               fromUser?.lastName?.toLowerCase().includes(searchTerm) ||
               toUser?.firstName?.toLowerCase().includes(searchTerm) ||
               toUser?.lastName?.toLowerCase().includes(searchTerm) ||
               (delegation.permissions || []).some(p => p.toLowerCase().includes(searchTerm));
      });
    }

    // Filtres
    if (delegationFilters.status) {
      const now = new Date();
      filtered = filtered.filter(delegation => {
        const startDate = new Date(delegation.startDate);
        const endDate = new Date(delegation.endDate);

        switch (delegationFilters.status) {
          case 'active':
            return delegation.isActive && now >= startDate && now <= endDate;
          case 'pending':
            return delegation.isActive && now < startDate;
          case 'expired':
            return delegation.isActive && now > endDate;
          case 'inactive':
            return !delegation.isActive;
          case 'awaiting_approval':
            return delegation.isActive && !delegation.approvedBy;
          default:
            return true;
        }
      });
    }

    if (delegationFilters.fromUserId) {
      filtered = filtered.filter(delegation => delegation.fromUserId === delegationFilters.fromUserId);
    }

    if (delegationFilters.toUserId) {
      filtered = filtered.filter(delegation => delegation.toUserId === delegationFilters.toUserId);
    }

    setFilteredDelegations(filtered);
    setCurrentPage(1);
  };

  const handleCreateTeam = () => {
    setEditingTeam(null);
    setShowTeamModal(true);
  };

  const handleEditTeam = (team) => {
    setEditingTeam(team);
    setShowTeamModal(true);
  };

  const handleSaveTeam = async (teamData) => {
    try {
      if (editingTeam) {
        // Update via API
        await teamsApi.updateTeam(editingTeam.id, teamData);
        console.log('[TeamManagement] Team updated via API:', editingTeam.id);
      } else {
        // Create via API
        await teamsApi.createTeam(teamData);
        console.log('[TeamManagement] Team created via API');
      }

      await loadData();
      setShowTeamModal(false);
    } catch (error) {
      console.error('[TeamManagement] Error saving team:', error);
      throw error;
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (!window.confirm(t('teamManagement.messages.confirmDeleteTeam'))) {
      return;
    }

    try {
      await teamsApi.deleteTeam(teamId);
      console.log('[TeamManagement] Team deleted via API:', teamId);
      await loadData();
    } catch (error) {
      console.error('[TeamManagement] Error deleting team:', error);
      alert(t('teamManagement.messages.deleteError', { error: error.message }));
    }
  };

  const handleCreateDelegation = () => {
    setEditingDelegation(null);
    setShowDelegationModal(true);
  };

  const handleEditDelegation = (delegation) => {
    setEditingDelegation(delegation);
    setShowDelegationModal(true);
  };

  const handleSaveDelegation = async (delegationData) => {
    try {
      if (editingDelegation) {
        // Pour la modification, nous devrons implémenter updateDelegation
        throw new Error(t('teamManagement.messages.modificationNotImplemented'));
      } else {
        await teamsStorage.createDelegation(delegationData, currentUser.id);
      }

      await loadData();
      setShowDelegationModal(false);
    } catch (error) {
      throw error;
    }
  };

  const handleApproveDelegation = async (delegationId) => {
    try {
      await teamsStorage.approveDelegation(delegationId, currentUser.id);
      await loadData();
    } catch (error) {
      alert(t('teamManagement.messages.approvalError', { error: error.message }));
    }
  };

  const handleRevokeDelegation = async (delegationId, reason = '') => {
    if (!window.confirm(t('teamManagement.messages.confirmRevoke'))) {
      return;
    }

    try {
      await teamsStorage.revokeDelegation(delegationId, currentUser.id, reason);
      await loadData();
    } catch (error) {
      alert(t('teamManagement.messages.revokeError', { error: error.message }));
    }
  };

  const handleExport = (type = 'teams') => {
    try {
      const csvData = teamsStorage.export(type, 'csv');
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(t('teamManagement.messages.exportError', { error: error.message }));
    }
  };

  const getUserDisplayName = (userId) => {
    const users = usersStorage.getAll();
    const user = users.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : userId;
  };

  const getDelegationStatus = (delegation) => {
    const now = new Date();
    const startDate = new Date(delegation.startDate);
    const endDate = new Date(delegation.endDate);

    if (!delegation.isActive) return { status: 'inactive', label: t('teamManagement.status.inactive'), color: 'bg-gray-100 text-gray-800' };
    if (!delegation.approvedBy) return { status: 'pending_approval', label: t('teamManagement.status.pendingApproval'), color: 'bg-yellow-100 text-yellow-800' };
    if (now < startDate) return { status: 'pending', label: t('teamManagement.status.pending'), color: 'bg-blue-100 text-blue-800' };
    if (now > endDate) return { status: 'expired', label: t('teamManagement.status.expired'), color: 'bg-red-100 text-red-800' };
    return { status: 'active', label: t('teamManagement.status.active'), color: 'bg-green-100 text-green-800' };
  };

  const formatDate = (dateString) => {
    const locale = i18n.language === 'fr' ? 'fr-FR' : i18n.language === 'es' ? 'es-ES' : 'en-US';
    return new Date(dateString).toLocaleDateString(locale);
  };

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    return timeString;
  };

  // Pagination - with guards for undefined arrays
  const currentData = activeTab === 'teams'
    ? (filteredTeams || [])
    : (filteredDelegations || []);
  const paginatedData = currentData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(currentData.length / itemsPerPage) || 1;

  if (!hasPermission('teams.read')) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('teamManagement.accessDenied')}</h3>
          <p className="text-gray-600">{t('teamManagement.noPermission')}</p>
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
              {t('teamManagement.title')}
            </h1>
            <p className="text-gray-600 mt-1">{t('teamManagement.subtitle')}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadData()}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title={t('teamManagement.refresh')}
            >
              <RefreshCw className="h-5 w-5" />
            </button>

            {hasPermission('teams.export') && (
              <button
                onClick={() => handleExport(activeTab)}
                className="px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {t('teamManagement.export')}
              </button>
            )}

            {activeTab === 'teams' && hasPermission('teams.create') && (
              <button
                onClick={handleCreateTeam}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {t('teamManagement.newTeam')}
              </button>
            )}

            {activeTab === 'delegations' && hasPermission('delegations.create') && (
              <button
                onClick={handleCreateDelegation}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
              >
                <UserCheck className="h-4 w-4" />
                {t('teamManagement.newDelegation')}
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
                <p className="text-sm text-blue-600">{t('teamManagement.stats.totalTeams')}</p>
                <p className="text-2xl font-bold text-blue-900">{statistics.totalTeams || 0}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-3">
              <UserPlus className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-green-600">{t('teamManagement.stats.totalMembers')}</p>
                <p className="text-2xl font-bold text-green-900">{statistics.totalMembers || 0}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="flex items-center gap-3">
              <UserCheck className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-orange-600">{t('teamManagement.stats.activeDelegations')}</p>
                <p className="text-2xl font-bold text-orange-900">{statistics.activeDelegations || 0}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-purple-600">{t('teamManagement.stats.pendingApprovals')}</p>
                <p className="text-2xl font-bold text-purple-900">{statistics.pendingApprovals || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('teams')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'teams'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="inline h-4 w-4 mr-2" />
              {t('teamManagement.tabs.teams')} ({filteredTeams.length})
            </button>

            <button
              onClick={() => setActiveTab('delegations')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'delegations'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UserCheck className="inline h-4 w-4 mr-2" />
              {t('teamManagement.tabs.delegations')} ({filteredDelegations.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Contenu des onglets */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Filtres et recherche */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder={activeTab === 'teams' ? t('teamManagement.filters.searchTeams') : t('teamManagement.filters.searchDelegations')}
                value={activeTab === 'teams' ? searchQuery : delegationSearchQuery}
                onChange={(e) => activeTab === 'teams' ? setSearchQuery(e.target.value) : setDelegationSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {activeTab === 'teams' ? (
              <div className="flex gap-2">
                <select
                  value={teamFilters.department}
                  onChange={(e) => setTeamFilters(prev => ({ ...prev, department: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t('teamManagement.filters.allDepartments')}</option>
                  {[...new Set(teams.map(team => team.department))].filter(Boolean).map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>

                <select
                  value={teamFilters.isActive}
                  onChange={(e) => setTeamFilters(prev => ({ ...prev, isActive: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t('teamManagement.filters.allStatuses')}</option>
                  <option value="true">{t('teamManagement.filters.activeOnly')}</option>
                  <option value="false">{t('teamManagement.filters.inactiveOnly')}</option>
                </select>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  value={delegationFilters.status}
                  onChange={(e) => setDelegationFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t('teamManagement.filters.allStatuses')}</option>
                  <option value="active">{t('teamManagement.filters.active')}</option>
                  <option value="pending">{t('teamManagement.filters.pending')}</option>
                  <option value="expired">{t('teamManagement.filters.expired')}</option>
                  <option value="awaiting_approval">{t('teamManagement.filters.awaitingApproval')}</option>
                  <option value="inactive">{t('teamManagement.filters.inactive')}</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Contenu */}
        {isLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-8 w-8 text-blue-600 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">{t('teamManagement.loading')}</p>
          </div>
        ) : activeTab === 'teams' ? (
          /* Table des équipes */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('teamManagement.teamsTable.team')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('teamManagement.teamsTable.teamLeader')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('teamManagement.teamsTable.members')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('teamManagement.teamsTable.department')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('teamManagement.teamsTable.status')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('teamManagement.teamsTable.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedData.map((team) => (
                  <tr key={team.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{team.name}</div>
                        <div className="text-sm text-gray-500">{team.description}</div>
                        {(team.specialties?.length > 0) && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {team.specialties.slice(0, 2).map((specialty, idx) => {
                              const label = typeof specialty === 'object' ? (specialty.name || specialty.code) : specialty;
                              return (
                                <span key={label || idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  {label}
                                </span>
                              );
                            })}
                            {team.specialties.length > 2 && (
                              <span className="text-xs text-gray-500">+{team.specialties.length - 2}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{getUserDisplayName(team.leaderId)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{t('teamManagement.teamsTable.memberCount', { count: team.members?.length || 0 })}</div>
                      <div className="text-sm text-gray-500">
                        {(team.members || []).slice(0, 3).map(memberId => getUserDisplayName(memberId).split(' ')[0]).join(', ')}
                        {(team.members?.length || 0) > 3 && ` +${team.members.length - 3}`}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Building className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{team.department}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        team.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {team.isActive ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {t('teamManagement.status.active')}
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            {t('teamManagement.status.inactive')}
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {hasPermission('teams.update') && (
                          <button
                            onClick={() => handleEditTeam(team)}
                            className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                            title={t('teamManagement.actions.edit')}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}

                        {hasPermission('teams.delete') && (
                          <button
                            onClick={() => handleDeleteTeam(team.id)}
                            className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                            title={t('teamManagement.actions.delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Table des délégations */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('teamManagement.delegationsTable.delegation')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('teamManagement.delegationsTable.period')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('teamManagement.delegationsTable.permissions')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('teamManagement.delegationsTable.status')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('teamManagement.delegationsTable.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedData.map((delegation) => {
                  const status = getDelegationStatus(delegation);
                  return (
                    <tr key={delegation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium text-gray-900">
                              {getUserDisplayName(delegation.fromUserId)}
                            </span>
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-gray-900">
                              {getUserDisplayName(delegation.toUserId)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 mt-1">{delegation.reason}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {formatDate(delegation.startDate)} - {formatDate(delegation.endDate)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {t('teamManagement.delegationsTable.permissionCount', { count: delegation.permissions?.length || 0 })}
                        </div>
                        <div className="text-sm text-gray-500">
                          {(delegation.permissions || []).slice(0, 2).join(', ')}
                          {(delegation.permissions?.length || 0) > 2 && ` +${delegation.permissions.length - 2}`}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                        {delegation.approvedBy && (
                          <div className="text-xs text-gray-500 mt-1">
                            {t('teamManagement.delegationsTable.approvedBy', { name: getUserDisplayName(delegation.approvedBy) })}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {status.status === 'pending_approval' && hasPermission('delegations.approve') && (
                            <button
                              onClick={() => handleApproveDelegation(delegation.id)}
                              className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded"
                              title={t('teamManagement.actions.approve')}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}

                          {delegation.isActive && hasPermission('delegations.revoke') && (
                            <button
                              onClick={() => handleRevokeDelegation(delegation.id)}
                              className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                              title={t('teamManagement.actions.revoke')}
                            >
                              <UserMinus className="h-4 w-4" />
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
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">
                {t('teamManagement.pagination.showing', {
                  from: (currentPage - 1) * itemsPerPage + 1,
                  to: Math.min(currentPage * itemsPerPage, currentData.length),
                  total: currentData.length
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
                {t('teamManagement.pagination.previous')}
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
                {t('teamManagement.pagination.next')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modales */}
      <TeamFormModal
        isOpen={showTeamModal}
        onClose={() => setShowTeamModal(false)}
        onSave={handleSaveTeam}
        team={editingTeam}
        currentUser={currentUser}
      />

      <DelegationFormModal
        isOpen={showDelegationModal}
        onClose={() => setShowDelegationModal(false)}
        onSave={handleSaveDelegation}
        delegation={editingDelegation}
        currentUser={currentUser}
      />
    </div>
  );
};

export default TeamManagementModule;