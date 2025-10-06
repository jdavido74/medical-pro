// utils/teamsStorage.js
import { storage } from './storage';
import { usersStorage } from './usersStorage';

const TEAMS_STORAGE_KEY = 'clinicmanager_teams';
const DELEGATIONS_STORAGE_KEY = 'clinicmanager_delegations';

// Équipes de démonstration
const defaultTeams = [
  {
    id: 'team_1',
    name: 'Équipe Médecine Générale',
    description: 'Équipe principale de médecine générale avec médecins et infirmiers',
    department: 'Médecine Générale',
    leaderId: 'user_3', // Dr. Pierre Martin
    members: ['user_3', 'user_4'], // Docteur + Infirmière
    specialties: ['Médecine Générale', 'Soins Généraux'],
    isActive: true,
    schedule: {
      monday: { start: '08:00', end: '18:00' },
      tuesday: { start: '08:00', end: '18:00' },
      wednesday: { start: '08:00', end: '18:00' },
      thursday: { start: '08:00', end: '18:00' },
      friday: { start: '08:00', end: '17:00' },
      saturday: { start: '09:00', end: '12:00' },
      sunday: { start: null, end: null }
    },
    permissions: ['patients.read', 'patients.create', 'appointments.read', 'appointments.create'],
    createdAt: new Date(2025, 0, 15).toISOString(),
    createdBy: 'user_2',
    updatedAt: new Date(2025, 8, 20).toISOString()
  },
  {
    id: 'team_2',
    name: 'Équipe Administration',
    description: 'Équipe administrative et secrétariat',
    department: 'Administration',
    leaderId: 'user_2', // Marie Dubois (Admin)
    members: ['user_2', 'user_5'], // Admin + Secrétaire
    specialties: ['Administration', 'Gestion'],
    isActive: true,
    schedule: {
      monday: { start: '08:30', end: '17:30' },
      tuesday: { start: '08:30', end: '17:30' },
      wednesday: { start: '08:30', end: '17:30' },
      thursday: { start: '08:30', end: '17:30' },
      friday: { start: '08:30', end: '16:30' },
      saturday: { start: null, end: null },
      sunday: { start: null, end: null }
    },
    permissions: ['invoices.read', 'invoices.create', 'quotes.read', 'quotes.create'],
    createdAt: new Date(2025, 0, 10).toISOString(),
    createdBy: 'user_1',
    updatedAt: new Date(2025, 8, 15).toISOString()
  },
  {
    id: 'team_3',
    name: 'Équipe de Garde',
    description: 'Équipe mixte pour les gardes et urgences',
    department: 'Urgences',
    leaderId: 'user_3', // Dr. Pierre Martin
    members: ['user_3', 'user_4'], // Docteur + Infirmière
    specialties: ['Médecine d\'Urgence', 'Soins Intensifs'],
    isActive: true,
    schedule: {
      monday: { start: '20:00', end: '08:00' },
      tuesday: { start: '20:00', end: '08:00' },
      wednesday: { start: '20:00', end: '08:00' },
      thursday: { start: '20:00', end: '08:00' },
      friday: { start: '20:00', end: '08:00' },
      saturday: { start: '08:00', end: '20:00' },
      sunday: { start: '08:00', end: '20:00' }
    },
    permissions: ['patients.read', 'patients.create', 'medical_records.read', 'medical_records.create'],
    createdAt: new Date(2025, 1, 1).toISOString(),
    createdBy: 'user_2',
    updatedAt: new Date(2025, 8, 25).toISOString()
  }
];

// Délégations de démonstration
const defaultDelegations = [
  {
    id: 'delegation_1',
    fromUserId: 'user_3', // Dr. Pierre Martin
    toUserId: 'user_4', // Sophie Leroy (Infirmière)
    permissions: ['appointments.read', 'appointments.update', 'patients.read'],
    reason: 'Délégation pour gestion des rendez-vous pendant congés',
    startDate: new Date(2025, 9, 1).toISOString(),
    endDate: new Date(2025, 9, 15).toISOString(),
    isActive: true,
    teamId: 'team_1',
    createdAt: new Date(2025, 8, 25).toISOString(),
    createdBy: 'user_3',
    approvedBy: 'user_2',
    approvedAt: new Date(2025, 8, 26).toISOString(),
    notifications: {
      startNotification: true,
      endNotification: true,
      dailyReminder: false
    }
  },
  {
    id: 'delegation_2',
    fromUserId: 'user_2', // Marie Dubois (Admin)
    toUserId: 'user_5', // Julie Bernard (Secrétaire)
    permissions: ['invoices.read', 'quotes.read', 'quotes.create'],
    reason: 'Délégation temporaire pour gestion facturation',
    startDate: new Date(2025, 8, 20).toISOString(),
    endDate: new Date(2025, 8, 30).toISOString(),
    isActive: true,
    teamId: 'team_2',
    createdAt: new Date(2025, 8, 18).toISOString(),
    createdBy: 'user_2',
    approvedBy: 'user_1',
    approvedAt: new Date(2025, 8, 19).toISOString(),
    notifications: {
      startNotification: true,
      endNotification: true,
      dailyReminder: true
    }
  },
  {
    id: 'delegation_3',
    fromUserId: 'user_4', // Sophie Leroy
    toUserId: 'user_3', // Dr. Pierre Martin
    permissions: ['patients.update', 'medical_records.read'],
    reason: 'Délégation croisée pour urgences nocturnes',
    startDate: new Date(2025, 8, 28).toISOString(),
    endDate: new Date(2025, 9, 5).toISOString(),
    isActive: false, // Expirée
    teamId: 'team_3',
    createdAt: new Date(2025, 8, 20).toISOString(),
    createdBy: 'user_4',
    approvedBy: 'user_2',
    approvedAt: new Date(2025, 8, 21).toISOString(),
    notifications: {
      startNotification: true,
      endNotification: true,
      dailyReminder: false
    }
  }
];

export const teamsStorage = {
  // Initialiser les équipes par défaut
  initializeDefaultTeams: () => {
    try {
      const existingTeams = storage.get(TEAMS_STORAGE_KEY);
      if (!existingTeams || existingTeams.length === 0) {
        storage.set(TEAMS_STORAGE_KEY, defaultTeams);
      }

      const existingDelegations = storage.get(DELEGATIONS_STORAGE_KEY);
      if (!existingDelegations || existingDelegations.length === 0) {
        storage.set(DELEGATIONS_STORAGE_KEY, defaultDelegations);
      }

      return {
        teams: storage.get(TEAMS_STORAGE_KEY),
        delegations: storage.get(DELEGATIONS_STORAGE_KEY)
      };
    } catch (error) {
      console.error('Erreur initialisation équipes:', error);
      storage.set(TEAMS_STORAGE_KEY, defaultTeams);
      storage.set(DELEGATIONS_STORAGE_KEY, defaultDelegations);
      return { teams: defaultTeams, delegations: defaultDelegations };
    }
  },

  // GESTION DES ÉQUIPES

  // Obtenir toutes les équipes
  getAllTeams: () => {
    try {
      return storage.get(TEAMS_STORAGE_KEY) || [];
    } catch (error) {
      console.error('Erreur récupération équipes:', error);
      return [];
    }
  },

  // Obtenir une équipe par ID
  getTeamById: (id) => {
    try {
      const teams = storage.get(TEAMS_STORAGE_KEY) || [];
      return teams.find(team => team.id === id) || null;
    } catch (error) {
      console.error('Erreur récupération équipe:', error);
      return null;
    }
  },

  // Obtenir les équipes d'un utilisateur
  getUserTeams: (userId) => {
    try {
      const teams = storage.get(TEAMS_STORAGE_KEY) || [];
      return teams.filter(team =>
        team.isActive && (
          team.leaderId === userId ||
          team.members.includes(userId)
        )
      );
    } catch (error) {
      console.error('Erreur récupération équipes utilisateur:', error);
      return [];
    }
  },

  // Créer une nouvelle équipe
  createTeam: (teamData, createdBy = 'system') => {
    try {
      const teams = storage.get(TEAMS_STORAGE_KEY) || [];

      // Vérifier si le nom existe déjà
      const existingTeam = teams.find(team =>
        team.name.toLowerCase() === teamData.name.toLowerCase() && !team.isDeleted
      );

      if (existingTeam) {
        throw new Error('Une équipe avec ce nom existe déjà');
      }

      // Valider les données requises
      if (!teamData.name || !teamData.leaderId) {
        throw new Error('Nom et chef d\'équipe sont requis');
      }

      // Vérifier que le leader existe
      const leader = usersStorage.getById(teamData.leaderId);
      if (!leader) {
        throw new Error('Chef d\'équipe non trouvé');
      }

      const newTeam = {
        id: `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: teamData.name,
        description: teamData.description || '',
        department: teamData.department || '',
        leaderId: teamData.leaderId,
        members: Array.isArray(teamData.members) ? teamData.members : [teamData.leaderId],
        specialties: Array.isArray(teamData.specialties) ? teamData.specialties : [],
        isActive: teamData.isActive !== undefined ? teamData.isActive : true,
        schedule: teamData.schedule || {
          monday: { start: '08:00', end: '17:00' },
          tuesday: { start: '08:00', end: '17:00' },
          wednesday: { start: '08:00', end: '17:00' },
          thursday: { start: '08:00', end: '17:00' },
          friday: { start: '08:00', end: '17:00' },
          saturday: { start: null, end: null },
          sunday: { start: null, end: null }
        },
        permissions: Array.isArray(teamData.permissions) ? teamData.permissions : [],
        createdAt: new Date().toISOString(),
        createdBy: createdBy,
        updatedAt: new Date().toISOString()
      };

      // S'assurer que le leader est dans les membres
      if (!newTeam.members.includes(newTeam.leaderId)) {
        newTeam.members.push(newTeam.leaderId);
      }

      teams.push(newTeam);
      storage.set(TEAMS_STORAGE_KEY, teams);

      console.log(`Équipe créée: ${newTeam.name} par ${createdBy}`);
      return newTeam;
    } catch (error) {
      console.error('Erreur création équipe:', error);
      throw error;
    }
  },

  // Mettre à jour une équipe
  updateTeam: (id, updateData, updatedBy = 'system') => {
    try {
      const teams = storage.get(TEAMS_STORAGE_KEY) || [];
      const teamIndex = teams.findIndex(team => team.id === id);

      if (teamIndex === -1) {
        throw new Error('Équipe non trouvée');
      }

      const currentTeam = teams[teamIndex];

      // Vérifier le nom en cas de changement
      if (updateData.name && updateData.name !== currentTeam.name) {
        const existingTeam = teams.find(team =>
          team.id !== id &&
          team.name.toLowerCase() === updateData.name.toLowerCase() &&
          !team.isDeleted
        );

        if (existingTeam) {
          throw new Error('Une équipe avec ce nom existe déjà');
        }
      }

      const updatedTeam = {
        ...currentTeam,
        ...updateData,
        id: currentTeam.id, // Protéger l'ID
        createdAt: currentTeam.createdAt, // Protéger la date de création
        createdBy: currentTeam.createdBy, // Protéger le créateur
        updatedAt: new Date().toISOString(),
        updatedBy: updatedBy
      };

      // S'assurer que le leader est dans les membres
      if (updatedTeam.leaderId && !updatedTeam.members.includes(updatedTeam.leaderId)) {
        updatedTeam.members.push(updatedTeam.leaderId);
      }

      teams[teamIndex] = updatedTeam;
      storage.set(TEAMS_STORAGE_KEY, teams);

      console.log(`Équipe mise à jour: ${updatedTeam.name} par ${updatedBy}`);
      return updatedTeam;
    } catch (error) {
      console.error('Erreur mise à jour équipe:', error);
      throw error;
    }
  },

  // Supprimer une équipe (soft delete)
  deleteTeam: (id, deletedBy = 'system') => {
    try {
      const teams = storage.get(TEAMS_STORAGE_KEY) || [];
      const teamIndex = teams.findIndex(team => team.id === id);

      if (teamIndex === -1) {
        throw new Error('Équipe non trouvée');
      }

      teams[teamIndex] = {
        ...teams[teamIndex],
        isDeleted: true,
        isActive: false,
        deletedAt: new Date().toISOString(),
        deletedBy: deletedBy
      };

      // Désactiver les délégations liées
      const delegations = storage.get(DELEGATIONS_STORAGE_KEY) || [];
      const updatedDelegations = delegations.map(delegation => {
        if (delegation.teamId === id && delegation.isActive) {
          return {
            ...delegation,
            isActive: false,
            deactivatedAt: new Date().toISOString(),
            deactivationReason: 'Équipe supprimée'
          };
        }
        return delegation;
      });

      storage.set(TEAMS_STORAGE_KEY, teams);
      storage.set(DELEGATIONS_STORAGE_KEY, updatedDelegations);

      console.log(`Équipe supprimée: ${teams[teamIndex].name} par ${deletedBy}`);
      return teams[teamIndex];
    } catch (error) {
      console.error('Erreur suppression équipe:', error);
      throw error;
    }
  },

  // GESTION DES DÉLÉGATIONS

  // Obtenir toutes les délégations
  getAllDelegations: () => {
    try {
      return storage.get(DELEGATIONS_STORAGE_KEY) || [];
    } catch (error) {
      console.error('Erreur récupération délégations:', error);
      return [];
    }
  },

  // Obtenir les délégations d'un utilisateur
  getUserDelegations: (userId, type = 'all') => {
    try {
      const delegations = storage.get(DELEGATIONS_STORAGE_KEY) || [];

      return delegations.filter(delegation => {
        if (type === 'from') return delegation.fromUserId === userId;
        if (type === 'to') return delegation.toUserId === userId;
        return delegation.fromUserId === userId || delegation.toUserId === userId;
      });
    } catch (error) {
      console.error('Erreur récupération délégations utilisateur:', error);
      return [];
    }
  },

  // Obtenir les délégations actives d'un utilisateur
  getActiveDelegations: (userId) => {
    try {
      const delegations = storage.get(DELEGATIONS_STORAGE_KEY) || [];
      const now = new Date();

      return delegations.filter(delegation => {
        if (!delegation.isActive) return false;

        const startDate = new Date(delegation.startDate);
        const endDate = new Date(delegation.endDate);

        return (delegation.fromUserId === userId || delegation.toUserId === userId) &&
               now >= startDate && now <= endDate;
      });
    } catch (error) {
      console.error('Erreur récupération délégations actives:', error);
      return [];
    }
  },

  // Créer une nouvelle délégation
  createDelegation: (delegationData, createdBy = 'system') => {
    try {
      const delegations = storage.get(DELEGATIONS_STORAGE_KEY) || [];

      // Validation des données
      if (!delegationData.fromUserId || !delegationData.toUserId ||
          !delegationData.startDate || !delegationData.endDate) {
        throw new Error('Utilisateur source, destination et dates sont requis');
      }

      if (delegationData.fromUserId === delegationData.toUserId) {
        throw new Error('L\'utilisateur ne peut pas se déléguer à lui-même');
      }

      // Vérifier que les utilisateurs existent
      const fromUser = usersStorage.getById(delegationData.fromUserId);
      const toUser = usersStorage.getById(delegationData.toUserId);

      if (!fromUser || !toUser) {
        throw new Error('Utilisateur source ou destination non trouvé');
      }

      // Vérifier les dates
      const startDate = new Date(delegationData.startDate);
      const endDate = new Date(delegationData.endDate);

      if (startDate >= endDate) {
        throw new Error('La date de fin doit être postérieure à la date de début');
      }

      const newDelegation = {
        id: `delegation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fromUserId: delegationData.fromUserId,
        toUserId: delegationData.toUserId,
        permissions: Array.isArray(delegationData.permissions) ? delegationData.permissions : [],
        reason: delegationData.reason || '',
        startDate: delegationData.startDate,
        endDate: delegationData.endDate,
        isActive: delegationData.isActive !== undefined ? delegationData.isActive : true,
        teamId: delegationData.teamId || null,
        notifications: {
          startNotification: true,
          endNotification: true,
          dailyReminder: false,
          ...delegationData.notifications
        },
        createdAt: new Date().toISOString(),
        createdBy: createdBy,
        approvedBy: null,
        approvedAt: null
      };

      delegations.push(newDelegation);
      storage.set(DELEGATIONS_STORAGE_KEY, delegations);

      console.log(`Délégation créée: ${fromUser.firstName} → ${toUser.firstName} par ${createdBy}`);
      return newDelegation;
    } catch (error) {
      console.error('Erreur création délégation:', error);
      throw error;
    }
  },

  // Approuver une délégation
  approveDelegation: (id, approvedBy = 'system') => {
    try {
      const delegations = storage.get(DELEGATIONS_STORAGE_KEY) || [];
      const delegationIndex = delegations.findIndex(delegation => delegation.id === id);

      if (delegationIndex === -1) {
        throw new Error('Délégation non trouvée');
      }

      delegations[delegationIndex] = {
        ...delegations[delegationIndex],
        approvedBy: approvedBy,
        approvedAt: new Date().toISOString(),
        isActive: true
      };

      storage.set(DELEGATIONS_STORAGE_KEY, delegations);

      console.log(`Délégation approuvée: ${id} par ${approvedBy}`);
      return delegations[delegationIndex];
    } catch (error) {
      console.error('Erreur approbation délégation:', error);
      throw error;
    }
  },

  // Révoquer une délégation
  revokeDelegation: (id, revokedBy = 'system', reason = '') => {
    try {
      const delegations = storage.get(DELEGATIONS_STORAGE_KEY) || [];
      const delegationIndex = delegations.findIndex(delegation => delegation.id === id);

      if (delegationIndex === -1) {
        throw new Error('Délégation non trouvée');
      }

      delegations[delegationIndex] = {
        ...delegations[delegationIndex],
        isActive: false,
        revokedBy: revokedBy,
        revokedAt: new Date().toISOString(),
        revocationReason: reason
      };

      storage.set(DELEGATIONS_STORAGE_KEY, delegations);

      console.log(`Délégation révoquée: ${id} par ${revokedBy}`);
      return delegations[delegationIndex];
    } catch (error) {
      console.error('Erreur révocation délégation:', error);
      throw error;
    }
  },

  // Obtenir des statistiques
  getStatistics: () => {
    try {
      const teams = storage.get(TEAMS_STORAGE_KEY) || [];
      const delegations = storage.get(DELEGATIONS_STORAGE_KEY) || [];
      const activeTeams = teams.filter(team => team.isActive && !team.isDeleted);
      const activeDelegations = delegations.filter(delegation => delegation.isActive);

      const now = new Date();
      const currentDelegations = activeDelegations.filter(delegation => {
        const startDate = new Date(delegation.startDate);
        const endDate = new Date(delegation.endDate);
        return now >= startDate && now <= endDate;
      });

      return {
        totalTeams: activeTeams.length,
        totalMembers: [...new Set(activeTeams.flatMap(team => team.members))].length,
        totalDelegations: delegations.length,
        activeDelegations: currentDelegations.length,
        pendingApprovals: delegations.filter(d => d.isActive && !d.approvedBy).length,
        teamsByDepartment: activeTeams.reduce((acc, team) => {
          acc[team.department] = (acc[team.department] || 0) + 1;
          return acc;
        }, {}),
        delegationsTrend: {
          thisWeek: delegations.filter(d => {
            const created = new Date(d.createdAt);
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return created >= weekAgo;
          }).length
        }
      };
    } catch (error) {
      console.error('Erreur calcul statistiques équipes:', error);
      return {
        totalTeams: 0,
        totalMembers: 0,
        totalDelegations: 0,
        activeDelegations: 0,
        pendingApprovals: 0,
        teamsByDepartment: {},
        delegationsTrend: { thisWeek: 0 }
      };
    }
  },

  // Rechercher des équipes
  searchTeams: (query, filters = {}) => {
    try {
      const teams = storage.get(TEAMS_STORAGE_KEY) || [];
      let filteredTeams = teams.filter(team => !team.isDeleted);

      // Recherche textuelle
      if (query) {
        const searchTerm = query.toLowerCase();
        filteredTeams = filteredTeams.filter(team =>
          team.name.toLowerCase().includes(searchTerm) ||
          team.description.toLowerCase().includes(searchTerm) ||
          team.department.toLowerCase().includes(searchTerm) ||
          team.specialties.some(spec => spec.toLowerCase().includes(searchTerm))
        );
      }

      // Filtres
      if (filters.department) {
        filteredTeams = filteredTeams.filter(team =>
          team.department.toLowerCase().includes(filters.department.toLowerCase())
        );
      }

      if (filters.isActive !== undefined) {
        filteredTeams = filteredTeams.filter(team => team.isActive === filters.isActive);
      }

      if (filters.leaderId) {
        filteredTeams = filteredTeams.filter(team => team.leaderId === filters.leaderId);
      }

      return filteredTeams;
    } catch (error) {
      console.error('Erreur recherche équipes:', error);
      return [];
    }
  },

  // Exporter les données
  export: (type = 'teams', format = 'json') => {
    try {
      const data = type === 'teams' ?
        storage.get(TEAMS_STORAGE_KEY) || [] :
        storage.get(DELEGATIONS_STORAGE_KEY) || [];

      if (format === 'csv') {
        if (type === 'teams') {
          const headers = ['ID', 'Nom', 'Description', 'Département', 'Chef', 'Membres', 'Actif', 'Créé le'];
          const csvData = data.filter(team => !team.isDeleted).map(team => [
            team.id,
            team.name,
            team.description,
            team.department,
            team.leaderId,
            team.members.length,
            team.isActive ? 'Oui' : 'Non',
            new Date(team.createdAt).toLocaleString('fr-FR')
          ]);
          return [headers, ...csvData].map(row => row.join(',')).join('\n');
        } else {
          const headers = ['ID', 'De', 'Vers', 'Permissions', 'Début', 'Fin', 'Actif', 'Approuvé'];
          const csvData = data.map(delegation => [
            delegation.id,
            delegation.fromUserId,
            delegation.toUserId,
            delegation.permissions.join(';'),
            new Date(delegation.startDate).toLocaleDateString('fr-FR'),
            new Date(delegation.endDate).toLocaleDateString('fr-FR'),
            delegation.isActive ? 'Oui' : 'Non',
            delegation.approvedBy ? 'Oui' : 'Non'
          ]);
          return [headers, ...csvData].map(row => row.join(',')).join('\n');
        }
      }

      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Erreur export:', error);
      return '';
    }
  }
};