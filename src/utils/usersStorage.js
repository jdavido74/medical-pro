// utils/usersStorage.js
import { storage } from './storage';
import { permissionsStorage } from './permissionsStorage';

const USERS_STORAGE_KEY = 'clinicmanager_users';

// Utilisateurs de démonstration avec les nouveaux champs
const defaultUsers = [
  {
    id: 'user_1',
    email: 'superadmin@medicalpro.com',
    firstName: 'Super',
    lastName: 'Admin',
    phone: '+33 1 23 45 67 89',
    role: 'super_admin',
    department: 'Administration',
    speciality: 'Système',
    licenseNumber: 'SA001',
    isActive: true,
    lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
    createdAt: new Date(2025, 0, 1).toISOString(),
    createdBy: 'system',
    avatar: null,
    preferences: {
      language: 'fr',
      timezone: 'Europe/Paris',
      notifications: {
        email: true,
        sms: false,
        push: true
      }
    },
    sessionInfo: {
      currentSessions: 1,
      maxConcurrentSessions: 5,
      sessionTimeout: 480, // minutes
      lastActivity: new Date().toISOString()
    }
  },
  {
    id: 'user_2',
    email: 'admin@medicalpro.com',
    firstName: 'Marie',
    lastName: 'Dubois',
    phone: '+33 1 23 45 67 90',
    role: 'admin',
    department: 'Direction',
    speciality: 'Gestion',
    licenseNumber: 'A001',
    isActive: true,
    lastLogin: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4h ago
    createdAt: new Date(2025, 0, 5).toISOString(),
    createdBy: 'user_1',
    avatar: null,
    preferences: {
      language: 'fr',
      timezone: 'Europe/Paris',
      notifications: {
        email: true,
        sms: true,
        push: true
      }
    },
    sessionInfo: {
      currentSessions: 0,
      maxConcurrentSessions: 3,
      sessionTimeout: 480,
      lastActivity: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
    }
  },
  {
    id: 'user_3',
    email: 'docteur.martin@medicalpro.com',
    firstName: 'Pierre',
    lastName: 'Martin',
    phone: '+33 1 23 45 67 91',
    role: 'doctor',
    department: 'Médecine Générale',
    speciality: 'Médecine Générale',
    licenseNumber: 'RPL001234',
    isActive: true,
    lastLogin: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1h ago
    createdAt: new Date(2025, 0, 10).toISOString(),
    createdBy: 'user_2',
    avatar: null,
    preferences: {
      language: 'fr',
      timezone: 'Europe/Paris',
      notifications: {
        email: true,
        sms: false,
        push: true
      }
    },
    sessionInfo: {
      currentSessions: 1,
      maxConcurrentSessions: 2,
      sessionTimeout: 240,
      lastActivity: new Date().toISOString()
    }
  },
  {
    id: 'user_4',
    email: 'infirmiere.leroy@medicalpro.com',
    firstName: 'Sophie',
    lastName: 'Leroy',
    phone: '+33 1 23 45 67 92',
    role: 'nurse',
    department: 'Soins Infirmiers',
    speciality: 'Soins Généraux',
    licenseNumber: 'IDE5678',
    isActive: true,
    lastLogin: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30min ago
    createdAt: new Date(2025, 0, 15).toISOString(),
    createdBy: 'user_2',
    avatar: null,
    preferences: {
      language: 'fr',
      timezone: 'Europe/Paris',
      notifications: {
        email: true,
        sms: true,
        push: true
      }
    },
    sessionInfo: {
      currentSessions: 1,
      maxConcurrentSessions: 2,
      sessionTimeout: 240,
      lastActivity: new Date().toISOString()
    }
  },
  {
    id: 'user_5',
    email: 'secretaire.bernard@medicalpro.com',
    firstName: 'Julie',
    lastName: 'Bernard',
    phone: '+33 1 23 45 67 93',
    role: 'secretary',
    department: 'Accueil',
    speciality: 'Administration',
    licenseNumber: null,
    isActive: true,
    lastLogin: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6h ago
    createdAt: new Date(2025, 0, 20).toISOString(),
    createdBy: 'user_2',
    avatar: null,
    preferences: {
      language: 'fr',
      timezone: 'Europe/Paris',
      notifications: {
        email: true,
        sms: false,
        push: false
      }
    },
    sessionInfo: {
      currentSessions: 0,
      maxConcurrentSessions: 1,
      sessionTimeout: 480,
      lastActivity: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
    }
  },
  {
    id: 'user_6',
    email: 'readonly@medicalpro.com',
    firstName: 'Auditeur',
    lastName: 'Externe',
    phone: '+33 1 23 45 67 94',
    role: 'readonly',
    department: 'Audit',
    speciality: 'Consultation',
    licenseNumber: null,
    isActive: false,
    lastLogin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    createdAt: new Date(2024, 11, 1).toISOString(),
    createdBy: 'user_1',
    avatar: null,
    preferences: {
      language: 'fr',
      timezone: 'Europe/Paris',
      notifications: {
        email: false,
        sms: false,
        push: false
      }
    },
    sessionInfo: {
      currentSessions: 0,
      maxConcurrentSessions: 1,
      sessionTimeout: 120,
      lastActivity: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    }
  }
];

export const usersStorage = {
  // Initialiser les utilisateurs par défaut
  initializeDefaultUsers: () => {
    try {
      const existingUsers = storage.get(USERS_STORAGE_KEY);
      if (!existingUsers || existingUsers.length === 0) {
        storage.set(USERS_STORAGE_KEY, defaultUsers);
        return defaultUsers;
      }
      return existingUsers;
    } catch (error) {
      console.error('Erreur initialisation utilisateurs:', error);
      storage.set(USERS_STORAGE_KEY, defaultUsers);
      return defaultUsers;
    }
  },

  // Obtenir tous les utilisateurs
  getAll: () => {
    try {
      return storage.get(USERS_STORAGE_KEY) || [];
    } catch (error) {
      console.error('Erreur récupération utilisateurs:', error);
      return [];
    }
  },

  // Obtenir un utilisateur par ID
  getById: (id) => {
    try {
      const users = storage.get(USERS_STORAGE_KEY) || [];
      return users.find(user => user.id === id) || null;
    } catch (error) {
      console.error('Erreur récupération utilisateur:', error);
      return null;
    }
  },

  // Obtenir un utilisateur par email
  getByEmail: (email) => {
    try {
      const users = storage.get(USERS_STORAGE_KEY) || [];
      return users.find(user => user.email.toLowerCase() === email.toLowerCase()) || null;
    } catch (error) {
      console.error('Erreur récupération utilisateur par email:', error);
      return null;
    }
  },

  // Créer un nouvel utilisateur
  create: (userData, createdBy = 'system') => {
    try {
      const users = storage.get(USERS_STORAGE_KEY) || [];

      // Vérifier si l'email existe déjà
      const existingUser = users.find(user =>
        user.email.toLowerCase() === userData.email.toLowerCase()
      );

      if (existingUser) {
        throw new Error('Un utilisateur avec cet email existe déjà');
      }

      // Valider les données requises
      if (!userData.email || !userData.firstName || !userData.lastName || !userData.role) {
        throw new Error('Email, prénom, nom et rôle sont requis');
      }

      // Vérifier que le rôle existe
      const roles = permissionsStorage.getAllRoles();
      if (!roles.find(role => role.id === userData.role)) {
        throw new Error('Rôle invalide');
      }

      const newUser = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: userData.email.toLowerCase(),
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone || '',
        role: userData.role,
        department: userData.department || '',
        speciality: userData.speciality || '',
        licenseNumber: userData.licenseNumber || null,
        isActive: userData.isActive !== undefined ? userData.isActive : true,
        lastLogin: null,
        createdAt: new Date().toISOString(),
        createdBy: createdBy,
        avatar: userData.avatar || null,
        preferences: {
          language: 'fr',
          timezone: 'Europe/Paris',
          notifications: {
            email: true,
            sms: false,
            push: true
          },
          ...userData.preferences
        },
        sessionInfo: {
          currentSessions: 0,
          maxConcurrentSessions: userData.role === 'super_admin' ? 5 :
                                   userData.role === 'admin' ? 3 : 2,
          sessionTimeout: userData.role === 'readonly' ? 120 :
                         userData.role === 'secretary' ? 480 : 240,
          lastActivity: null,
          ...userData.sessionInfo
        }
      };

      users.push(newUser);
      storage.set(USERS_STORAGE_KEY, users);

      // Log de l'action
      console.log(`Utilisateur créé: ${newUser.email} par ${createdBy}`);

      return newUser;
    } catch (error) {
      console.error('Erreur création utilisateur:', error);
      throw error;
    }
  },

  // Mettre à jour un utilisateur
  update: (id, updateData, updatedBy = 'system') => {
    try {
      const users = storage.get(USERS_STORAGE_KEY) || [];
      const userIndex = users.findIndex(user => user.id === id);

      if (userIndex === -1) {
        throw new Error('Utilisateur non trouvé');
      }

      const currentUser = users[userIndex];

      // Vérifier l'email en cas de changement
      if (updateData.email && updateData.email !== currentUser.email) {
        const existingUser = users.find(user =>
          user.id !== id && user.email.toLowerCase() === updateData.email.toLowerCase()
        );

        if (existingUser) {
          throw new Error('Un utilisateur avec cet email existe déjà');
        }
      }

      // Vérifier le rôle s'il est modifié
      if (updateData.role) {
        const roles = permissionsStorage.getAllRoles();
        if (!roles.find(role => role.id === updateData.role)) {
          throw new Error('Rôle invalide');
        }
      }

      const updatedUser = {
        ...currentUser,
        ...updateData,
        id: currentUser.id, // Protéger l'ID
        createdAt: currentUser.createdAt, // Protéger la date de création
        createdBy: currentUser.createdBy, // Protéger le créateur
        updatedAt: new Date().toISOString(),
        updatedBy: updatedBy
      };

      // Mettre à jour les paramètres de session si le rôle change
      if (updateData.role && updateData.role !== currentUser.role) {
        updatedUser.sessionInfo = {
          ...currentUser.sessionInfo,
          maxConcurrentSessions: updateData.role === 'super_admin' ? 5 :
                                 updateData.role === 'admin' ? 3 : 2,
          sessionTimeout: updateData.role === 'readonly' ? 120 :
                         updateData.role === 'secretary' ? 480 : 240
        };
      }

      users[userIndex] = updatedUser;
      storage.set(USERS_STORAGE_KEY, users);

      console.log(`Utilisateur mis à jour: ${updatedUser.email} par ${updatedBy}`);

      return updatedUser;
    } catch (error) {
      console.error('Erreur mise à jour utilisateur:', error);
      throw error;
    }
  },

  // Supprimer un utilisateur (soft delete)
  delete: (id, deletedBy = 'system') => {
    try {
      const users = storage.get(USERS_STORAGE_KEY) || [];
      const userIndex = users.findIndex(user => user.id === id);

      if (userIndex === -1) {
        throw new Error('Utilisateur non trouvé');
      }

      const userToDelete = users[userIndex];

      // Marquer comme supprimé au lieu de supprimer vraiment
      users[userIndex] = {
        ...userToDelete,
        isDeleted: true,
        isActive: false,
        deletedAt: new Date().toISOString(),
        deletedBy: deletedBy
      };

      storage.set(USERS_STORAGE_KEY, users);

      console.log(`Utilisateur supprimé: ${userToDelete.email} par ${deletedBy}`);

      return users[userIndex];
    } catch (error) {
      console.error('Erreur suppression utilisateur:', error);
      throw error;
    }
  },

  // Restaurer un utilisateur supprimé
  restore: (id, restoredBy = 'system') => {
    try {
      const users = storage.get(USERS_STORAGE_KEY) || [];
      const userIndex = users.findIndex(user => user.id === id);

      if (userIndex === -1 || !users[userIndex].isDeleted) {
        throw new Error('Utilisateur non trouvé ou non supprimé');
      }

      users[userIndex] = {
        ...users[userIndex],
        isDeleted: false,
        isActive: true,
        restoredAt: new Date().toISOString(),
        restoredBy: restoredBy
      };

      storage.set(USERS_STORAGE_KEY, users);

      console.log(`Utilisateur restauré: ${users[userIndex].email} par ${restoredBy}`);

      return users[userIndex];
    } catch (error) {
      console.error('Erreur restauration utilisateur:', error);
      throw error;
    }
  },

  // Mettre à jour la dernière connexion
  updateLastLogin: (id) => {
    try {
      const users = storage.get(USERS_STORAGE_KEY) || [];
      const userIndex = users.findIndex(user => user.id === id);

      if (userIndex !== -1) {
        users[userIndex].lastLogin = new Date().toISOString();
        users[userIndex].sessionInfo.lastActivity = new Date().toISOString();
        users[userIndex].sessionInfo.currentSessions =
          (users[userIndex].sessionInfo.currentSessions || 0) + 1;

        storage.set(USERS_STORAGE_KEY, users);
        return users[userIndex];
      }
      return null;
    } catch (error) {
      console.error('Erreur mise à jour connexion:', error);
      return null;
    }
  },

  // Mettre à jour l'activité de session
  updateSessionActivity: (id) => {
    try {
      const users = storage.get(USERS_STORAGE_KEY) || [];
      const userIndex = users.findIndex(user => user.id === id);

      if (userIndex !== -1) {
        users[userIndex].sessionInfo.lastActivity = new Date().toISOString();
        storage.set(USERS_STORAGE_KEY, users);
        return users[userIndex];
      }
      return null;
    } catch (error) {
      console.error('Erreur mise à jour activité:', error);
      return null;
    }
  },

  // Terminer une session
  endSession: (id) => {
    try {
      const users = storage.get(USERS_STORAGE_KEY) || [];
      const userIndex = users.findIndex(user => user.id === id);

      if (userIndex !== -1) {
        users[userIndex].sessionInfo.currentSessions = Math.max(
          (users[userIndex].sessionInfo.currentSessions || 1) - 1,
          0
        );
        storage.set(USERS_STORAGE_KEY, users);
        return users[userIndex];
      }
      return null;
    } catch (error) {
      console.error('Erreur fin de session:', error);
      return null;
    }
  },

  // Rechercher des utilisateurs
  search: (query, filters = {}) => {
    try {
      const users = storage.get(USERS_STORAGE_KEY) || [];
      let filteredUsers = users.filter(user => !user.isDeleted);

      // Recherche textuelle
      if (query) {
        const searchTerm = query.toLowerCase();
        filteredUsers = filteredUsers.filter(user =>
          user.firstName.toLowerCase().includes(searchTerm) ||
          user.lastName.toLowerCase().includes(searchTerm) ||
          user.email.toLowerCase().includes(searchTerm) ||
          user.department.toLowerCase().includes(searchTerm) ||
          user.speciality.toLowerCase().includes(searchTerm) ||
          (user.licenseNumber && user.licenseNumber.toLowerCase().includes(searchTerm))
        );
      }

      // Filtres
      if (filters.role) {
        filteredUsers = filteredUsers.filter(user => user.role === filters.role);
      }

      if (filters.department) {
        filteredUsers = filteredUsers.filter(user =>
          user.department.toLowerCase().includes(filters.department.toLowerCase())
        );
      }

      if (filters.isActive !== undefined) {
        filteredUsers = filteredUsers.filter(user => user.isActive === filters.isActive);
      }

      if (filters.lastLoginDays) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - filters.lastLoginDays);

        filteredUsers = filteredUsers.filter(user => {
          if (!user.lastLogin) return false;
          return new Date(user.lastLogin) >= cutoffDate;
        });
      }

      return filteredUsers;
    } catch (error) {
      console.error('Erreur recherche utilisateurs:', error);
      return [];
    }
  },

  // Obtenir des statistiques
  getStatistics: () => {
    try {
      const users = storage.get(USERS_STORAGE_KEY) || [];
      const activeUsers = users.filter(user => !user.isDeleted);

      const stats = {
        total: activeUsers.length,
        active: activeUsers.filter(user => user.isActive).length,
        inactive: activeUsers.filter(user => !user.isActive).length,
        deleted: users.filter(user => user.isDeleted).length,
        onlineNow: activeUsers.filter(user =>
          user.sessionInfo?.currentSessions > 0
        ).length,
        byRole: {},
        byDepartment: {},
        recentLogins: activeUsers.filter(user => {
          if (!user.lastLogin) return false;
          const daysDiff = (new Date() - new Date(user.lastLogin)) / (1000 * 60 * 60 * 24);
          return daysDiff <= 7;
        }).length
      };

      // Statistiques par rôle
      activeUsers.forEach(user => {
        stats.byRole[user.role] = (stats.byRole[user.role] || 0) + 1;
      });

      // Statistiques par département
      activeUsers.forEach(user => {
        if (user.department) {
          stats.byDepartment[user.department] = (stats.byDepartment[user.department] || 0) + 1;
        }
      });

      return stats;
    } catch (error) {
      console.error('Erreur calcul statistiques:', error);
      return {
        total: 0,
        active: 0,
        inactive: 0,
        deleted: 0,
        onlineNow: 0,
        byRole: {},
        byDepartment: {},
        recentLogins: 0
      };
    }
  },

  // Exporter les données utilisateurs
  export: (format = 'json') => {
    try {
      const users = storage.get(USERS_STORAGE_KEY) || [];
      const activeUsers = users.filter(user => !user.isDeleted);

      if (format === 'csv') {
        const headers = [
          'ID', 'Email', 'Prénom', 'Nom', 'Téléphone', 'Rôle',
          'Département', 'Spécialité', 'N° License', 'Actif',
          'Dernière connexion', 'Date création'
        ];

        const csvData = activeUsers.map(user => [
          user.id,
          user.email,
          user.firstName,
          user.lastName,
          user.phone,
          user.role,
          user.department,
          user.speciality,
          user.licenseNumber || '',
          user.isActive ? 'Oui' : 'Non',
          user.lastLogin ? new Date(user.lastLogin).toLocaleString('fr-FR') : 'Jamais',
          new Date(user.createdAt).toLocaleString('fr-FR')
        ]);

        return [headers, ...csvData].map(row => row.join(',')).join('\n');
      }

      return JSON.stringify(activeUsers, null, 2);
    } catch (error) {
      console.error('Erreur export utilisateurs:', error);
      return '';
    }
  }
};