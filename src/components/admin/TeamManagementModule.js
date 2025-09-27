// components/admin/TeamManagementModule.js
import React, { useState, useEffect } from 'react';
import {
  Users, UserPlus, UserCheck, Calendar, Clock, Shield, Search,
  Plus, Edit, Trash2, Eye, Download, RefreshCw, Filter,
  Building, Award, Activity, AlertCircle, CheckCircle, XCircle,
  UserMinus, ArrowRight, Bell, Settings
} from 'lucide-react';
import { teamsStorage } from '../../utils/teamsStorage';
import { usersStorage } from '../../utils/usersStorage';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../auth/PermissionGuard';
import TeamFormModal from '../modals/TeamFormModal';
import DelegationFormModal from '../modals/DelegationFormModal';

const TeamManagementModule = () => {
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
      // Initialiser les données par défaut
      teamsStorage.initializeDefaultTeams();

      // Charger les données
      const teamsData = teamsStorage.getAllTeams();
      const delegationsData = teamsStorage.getAllDelegations();
      const stats = teamsStorage.getStatistics();

      setTeams(teamsData);
      setDelegations(delegationsData);
      setStatistics(stats);
    } catch (error) {
      console.error('Erreur chargement données équipes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyTeamFilters = () => {
    let filtered = teamsStorage.searchTeams(searchQuery, teamFilters);
    setFilteredTeams(filtered);
    setCurrentPage(1);
  };

  const applyDelegationFilters = () => {
    let filtered = delegations.filter(delegation => !delegation.isDeleted);

    // Recherche textuelle
    if (delegationSearchQuery) {
      const searchTerm = delegationSearchQuery.toLowerCase();
      const users = usersStorage.getAll();

      filtered = filtered.filter(delegation => {
        const fromUser = users.find(u => u.id === delegation.fromUserId);
        const toUser = users.find(u => u.id === delegation.toUserId);

        return delegation.reason.toLowerCase().includes(searchTerm) ||
               fromUser?.firstName.toLowerCase().includes(searchTerm) ||
               fromUser?.lastName.toLowerCase().includes(searchTerm) ||
               toUser?.firstName.toLowerCase().includes(searchTerm) ||
               toUser?.lastName.toLowerCase().includes(searchTerm) ||
               delegation.permissions.some(p => p.toLowerCase().includes(searchTerm));
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
        await teamsStorage.updateTeam(editingTeam.id, teamData, currentUser.id);
      } else {
        await teamsStorage.createTeam(teamData, currentUser.id);
      }

      await loadData();
      setShowTeamModal(false);
    } catch (error) {
      throw error;
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette équipe ?')) {
      return;
    }

    try {
      await teamsStorage.deleteTeam(teamId, currentUser.id);
      await loadData();
    } catch (error) {
      alert('Erreur lors de la suppression: ' + error.message);
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
        throw new Error('Modification des délégations non encore implémentée');
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
      alert('Erreur lors de l\'approbation: ' + error.message);
    }
  };

  const handleRevokeDelegation = async (delegationId, reason = '') => {
    if (!window.confirm('Êtes-vous sûr de vouloir révoquer cette délégation ?')) {
      return;
    }

    try {
      await teamsStorage.revokeDelegation(delegationId, currentUser.id, reason);
      await loadData();
    } catch (error) {
      alert('Erreur lors de la révocation: ' + error.message);
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
      alert('Erreur lors de l\'export: ' + error.message);
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

    if (!delegation.isActive) return { status: 'inactive', label: 'Inactive', color: 'bg-gray-100 text-gray-800' };
    if (!delegation.approvedBy) return { status: 'pending_approval', label: 'En attente d\'approbation', color: 'bg-yellow-100 text-yellow-800' };
    if (now < startDate) return { status: 'pending', label: 'En attente', color: 'bg-blue-100 text-blue-800' };
    if (now > endDate) return { status: 'expired', label: 'Expirée', color: 'bg-red-100 text-red-800' };
    return { status: 'active', label: 'Active', color: 'bg-green-100 text-green-800' };
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    return timeString;
  };

  // Pagination
  const currentData = activeTab === 'teams' ? filteredTeams : filteredDelegations;
  const paginatedData = currentData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(currentData.length / itemsPerPage);

  if (!hasPermission('teams.read')) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Accès non autorisé</h3>
          <p className="text-gray-600">Vous n'avez pas les permissions pour accéder à la gestion des équipes.</p>
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
              Gestion des équipes et délégations
            </h1>
            <p className="text-gray-600 mt-1">Gérez les équipes de travail et les délégations de permissions</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadData()}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Actualiser"
            >
              <RefreshCw className="h-5 w-5" />
            </button>

            {hasPermission('teams.export') && (
              <button
                onClick={() => handleExport(activeTab)}
                className="px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Exporter
              </button>
            )}

            {activeTab === 'teams' && hasPermission('teams.create') && (
              <button
                onClick={handleCreateTeam}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Nouvelle équipe
              </button>
            )}

            {activeTab === 'delegations' && hasPermission('delegations.create') && (
              <button
                onClick={handleCreateDelegation}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
              >
                <UserCheck className="h-4 w-4" />
                Nouvelle délégation
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
                <p className="text-sm text-blue-600">Équipes totales</p>
                <p className="text-2xl font-bold text-blue-900">{statistics.totalTeams || 0}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-3">
              <UserPlus className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-green-600">Membres totaux</p>
                <p className="text-2xl font-bold text-green-900">{statistics.totalMembers || 0}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="flex items-center gap-3">
              <UserCheck className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-orange-600">Délégations actives</p>
                <p className="text-2xl font-bold text-orange-900">{statistics.activeDelegations || 0}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-purple-600">En attente d'approbation</p>
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
              Équipes ({filteredTeams.length})
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
              Délégations ({filteredDelegations.length})
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
                placeholder={activeTab === 'teams' ? "Rechercher par nom, département..." : "Rechercher par utilisateur, raison..."}
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
                  <option value="">Tous les départements</option>
                  {[...new Set(teams.map(team => team.department))].filter(Boolean).map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>

                <select
                  value={teamFilters.isActive}
                  onChange={(e) => setTeamFilters(prev => ({ ...prev, isActive: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Tous les statuts</option>
                  <option value="true">Actives seulement</option>
                  <option value="false">Inactives seulement</option>
                </select>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  value={delegationFilters.status}
                  onChange={(e) => setDelegationFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Tous les statuts</option>
                  <option value="active">Actives</option>
                  <option value="pending">En attente</option>
                  <option value="expired">Expirées</option>
                  <option value="awaiting_approval">En attente d'approbation</option>
                  <option value="inactive">Inactives</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Contenu */}
        {isLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-8 w-8 text-blue-600 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Chargement...</p>
          </div>
        ) : activeTab === 'teams' ? (
          /* Table des équipes */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Équipe
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chef d'équipe
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Membres
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Département
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
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
                        {team.specialties.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {team.specialties.slice(0, 2).map(specialty => (
                              <span key={specialty} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                {specialty}
                              </span>
                            ))}
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
                      <div className="text-sm text-gray-900">{team.members.length} membre(s)</div>
                      <div className="text-sm text-gray-500">
                        {team.members.slice(0, 3).map(memberId => getUserDisplayName(memberId).split(' ')[0]).join(', ')}
                        {team.members.length > 3 && ` +${team.members.length - 3}`}
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
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactive
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
                            title="Modifier"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}

                        {hasPermission('teams.delete') && (
                          <button
                            onClick={() => handleDeleteTeam(team.id)}
                            className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                            title="Supprimer"
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
                    Délégation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Période
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Permissions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
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
                          {delegation.permissions.length} permission(s)
                        </div>
                        <div className="text-sm text-gray-500">
                          {delegation.permissions.slice(0, 2).join(', ')}
                          {delegation.permissions.length > 2 && ` +${delegation.permissions.length - 2}`}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                        {delegation.approvedBy && (
                          <div className="text-xs text-gray-500 mt-1">
                            Approuvé par {getUserDisplayName(delegation.approvedBy)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {status.status === 'pending_approval' && hasPermission('delegations.approve') && (
                            <button
                              onClick={() => handleApproveDelegation(delegation.id)}
                              className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded"
                              title="Approuver"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}

                          {delegation.isActive && hasPermission('delegations.revoke') && (
                            <button
                              onClick={() => handleRevokeDelegation(delegation.id)}
                              className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                              title="Révoquer"
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
                Affichage de {(currentPage - 1) * itemsPerPage + 1} à{' '}
                {Math.min(currentPage * itemsPerPage, currentData.length)} sur{' '}
                {currentData.length} résultats
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