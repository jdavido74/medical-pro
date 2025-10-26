// utils/permissionsStorage.js
// Service de gestion des permissions et rôles

// Définition des permissions disponibles dans l'application
export const PERMISSIONS = {
  // Gestion des patients
  PATIENTS_VIEW: 'patients.view',
  PATIENTS_CREATE: 'patients.create',
  PATIENTS_EDIT: 'patients.edit',
  PATIENTS_DELETE: 'patients.delete',
  PATIENTS_EXPORT: 'patients.export',
  PATIENTS_VIEW_ALL: 'patients.view_all', // Voir tous les patients vs seulement ses patients

  // Gestion des rendez-vous
  APPOINTMENTS_VIEW: 'appointments.view',
  APPOINTMENTS_CREATE: 'appointments.create',
  APPOINTMENTS_EDIT: 'appointments.edit',
  APPOINTMENTS_DELETE: 'appointments.delete',
  APPOINTMENTS_VIEW_ALL: 'appointments.view_all',
  APPOINTMENTS_VIEW_PRACTITIONER: 'appointments.view_practitioner', // Voir le nom du praticien

  // Dossiers médicaux
  MEDICAL_RECORDS_VIEW: 'medical_records.view',
  MEDICAL_RECORDS_CREATE: 'medical_records.create',
  MEDICAL_RECORDS_EDIT: 'medical_records.edit',
  MEDICAL_RECORDS_DELETE: 'medical_records.delete',
  MEDICAL_RECORDS_VIEW_ALL: 'medical_records.view_all',

  // Consentements
  CONSENTS_VIEW: 'consents.view',
  CONSENTS_CREATE: 'consents.create',
  CONSENTS_EDIT: 'consents.edit',
  CONSENTS_DELETE: 'consents.delete',
  CONSENTS_REVOKE: 'consents.revoke',
  CONSENTS_TEMPLATES_MANAGE: 'consents.templates_manage',

  // Factures et devis
  INVOICES_VIEW: 'invoices.view',
  INVOICES_CREATE: 'invoices.create',
  INVOICES_EDIT: 'invoices.edit',
  INVOICES_DELETE: 'invoices.delete',
  INVOICES_SEND: 'invoices.send',

  QUOTES_VIEW: 'quotes.view',
  QUOTES_CREATE: 'quotes.create',
  QUOTES_EDIT: 'quotes.edit',
  QUOTES_DELETE: 'quotes.delete',

  // Statistiques et rapports
  ANALYTICS_VIEW: 'analytics.view',
  ANALYTICS_EXPORT: 'analytics.export',
  ANALYTICS_ADMIN: 'analytics.admin',

  // Administration
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_EDIT: 'users.edit',
  USERS_DELETE: 'users.delete',
  USERS_PERMISSIONS: 'users.permissions',
  USERS_EXPORT: 'users.export',

  ROLES_VIEW: 'roles.view',
  ROLES_CREATE: 'roles.create',
  ROLES_EDIT: 'roles.edit',
  ROLES_DELETE: 'roles.delete',

  // Équipes et délégations
  TEAMS_VIEW: 'teams.view',
  TEAMS_CREATE: 'teams.create',
  TEAMS_EDIT: 'teams.edit',
  TEAMS_DELETE: 'teams.delete',
  TEAMS_EXPORT: 'teams.export',

  DELEGATIONS_VIEW: 'delegations.view',
  DELEGATIONS_CREATE: 'delegations.create',
  DELEGATIONS_EDIT: 'delegations.edit',
  DELEGATIONS_APPROVE: 'delegations.approve',
  DELEGATIONS_REVOKE: 'delegations.revoke',

  // Audit et journalisation
  AUDIT_VIEW: 'audit.read',
  AUDIT_EXPORT: 'audit.export',
  AUDIT_MANAGE: 'audit.manage',
  AUDIT_DELETE: 'audit.delete',

  SYSTEM_SETTINGS: 'system.settings',
  SYSTEM_BACKUP: 'system.backup',
  SYSTEM_AUDIT: 'system.audit',

  // Paramètres
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',
  SETTINGS_CLINIC: 'settings.clinic',
  SETTINGS_SECURITY: 'settings.security'
};

// Définition des rôles par défaut
export const DEFAULT_ROLES = {
  super_admin: {
    id: 'super_admin',
    name: 'Super Administrateur',
    description: 'Accès complet à toutes les fonctionnalités de la plateforme',
    level: 100,
    isSystemRole: true,
    permissions: Object.values(PERMISSIONS),
    color: 'purple'
  },
  admin: {
    id: 'admin',
    name: 'Administrateur',
    description: 'Gestion complète de la clinique et des utilisateurs',
    level: 90,
    isSystemRole: true,
    permissions: [
      // Patients
      PERMISSIONS.PATIENTS_VIEW, PERMISSIONS.PATIENTS_CREATE, PERMISSIONS.PATIENTS_EDIT,
      PERMISSIONS.PATIENTS_DELETE, PERMISSIONS.PATIENTS_EXPORT, PERMISSIONS.PATIENTS_VIEW_ALL,
      // Rendez-vous
      PERMISSIONS.APPOINTMENTS_VIEW, PERMISSIONS.APPOINTMENTS_CREATE, PERMISSIONS.APPOINTMENTS_EDIT,
      PERMISSIONS.APPOINTMENTS_DELETE, PERMISSIONS.APPOINTMENTS_VIEW_ALL,
      PERMISSIONS.APPOINTMENTS_VIEW_PRACTITIONER,
      // Dossiers médicaux
      PERMISSIONS.MEDICAL_RECORDS_VIEW, PERMISSIONS.MEDICAL_RECORDS_CREATE, PERMISSIONS.MEDICAL_RECORDS_EDIT,
      PERMISSIONS.MEDICAL_RECORDS_DELETE, PERMISSIONS.MEDICAL_RECORDS_VIEW_ALL,
      // Consentements
      PERMISSIONS.CONSENTS_VIEW, PERMISSIONS.CONSENTS_CREATE, PERMISSIONS.CONSENTS_EDIT,
      PERMISSIONS.CONSENTS_DELETE, PERMISSIONS.CONSENTS_REVOKE, PERMISSIONS.CONSENTS_TEMPLATES_MANAGE,
      // Finances
      PERMISSIONS.INVOICES_VIEW, PERMISSIONS.INVOICES_CREATE, PERMISSIONS.INVOICES_EDIT,
      PERMISSIONS.INVOICES_DELETE, PERMISSIONS.INVOICES_SEND,
      PERMISSIONS.QUOTES_VIEW, PERMISSIONS.QUOTES_CREATE, PERMISSIONS.QUOTES_EDIT, PERMISSIONS.QUOTES_DELETE,
      // Analytics
      PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.ANALYTICS_EXPORT,
      // Administration
      PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_CREATE, PERMISSIONS.USERS_EDIT, PERMISSIONS.USERS_DELETE, PERMISSIONS.USERS_EXPORT,
      PERMISSIONS.ROLES_VIEW,
      // Équipes et délégations
      PERMISSIONS.TEAMS_VIEW, PERMISSIONS.TEAMS_CREATE, PERMISSIONS.TEAMS_EDIT, PERMISSIONS.TEAMS_DELETE, PERMISSIONS.TEAMS_EXPORT,
      PERMISSIONS.DELEGATIONS_VIEW, PERMISSIONS.DELEGATIONS_CREATE, PERMISSIONS.DELEGATIONS_EDIT,
      PERMISSIONS.DELEGATIONS_APPROVE, PERMISSIONS.DELEGATIONS_REVOKE,
      // Paramètres
      PERMISSIONS.SETTINGS_VIEW, PERMISSIONS.SETTINGS_EDIT, PERMISSIONS.SETTINGS_CLINIC
    ],
    color: 'blue'
  },
  doctor: {
    id: 'doctor',
    name: 'Médecin',
    description: 'Accès aux consultations, diagnostics et prescriptions',
    level: 70,
    isSystemRole: true,
    permissions: [
      // Patients
      PERMISSIONS.PATIENTS_VIEW, PERMISSIONS.PATIENTS_CREATE, PERMISSIONS.PATIENTS_EDIT,
      // Rendez-vous
      PERMISSIONS.APPOINTMENTS_VIEW, PERMISSIONS.APPOINTMENTS_CREATE, PERMISSIONS.APPOINTMENTS_EDIT,
      PERMISSIONS.APPOINTMENTS_DELETE,
      // Dossiers médicaux
      PERMISSIONS.MEDICAL_RECORDS_VIEW, PERMISSIONS.MEDICAL_RECORDS_CREATE, PERMISSIONS.MEDICAL_RECORDS_EDIT,
      // Consentements
      PERMISSIONS.CONSENTS_VIEW, PERMISSIONS.CONSENTS_CREATE, PERMISSIONS.CONSENTS_EDIT,
      PERMISSIONS.CONSENTS_REVOKE,
      // Finances
      PERMISSIONS.QUOTES_VIEW, PERMISSIONS.QUOTES_CREATE, PERMISSIONS.QUOTES_EDIT,
      // Analytics
      PERMISSIONS.ANALYTICS_VIEW,
      // Équipes (lecture et délégations)
      PERMISSIONS.TEAMS_VIEW, PERMISSIONS.DELEGATIONS_VIEW, PERMISSIONS.DELEGATIONS_CREATE,
      // Paramètres
      PERMISSIONS.SETTINGS_VIEW
    ],
    color: 'green'
  },
  specialist: {
    id: 'specialist',
    name: 'Spécialiste',
    description: 'Médecin spécialisé avec accès spécifique à sa spécialité',
    level: 70,
    isSystemRole: true,
    permissions: [
      // Patients
      PERMISSIONS.PATIENTS_VIEW, PERMISSIONS.PATIENTS_CREATE, PERMISSIONS.PATIENTS_EDIT,
      // Rendez-vous
      PERMISSIONS.APPOINTMENTS_VIEW, PERMISSIONS.APPOINTMENTS_CREATE, PERMISSIONS.APPOINTMENTS_EDIT,
      PERMISSIONS.APPOINTMENTS_DELETE,
      // Dossiers médicaux
      PERMISSIONS.MEDICAL_RECORDS_VIEW, PERMISSIONS.MEDICAL_RECORDS_CREATE, PERMISSIONS.MEDICAL_RECORDS_EDIT,
      // Consentements
      PERMISSIONS.CONSENTS_VIEW, PERMISSIONS.CONSENTS_CREATE, PERMISSIONS.CONSENTS_EDIT,
      PERMISSIONS.CONSENTS_REVOKE,
      // Finances
      PERMISSIONS.QUOTES_VIEW, PERMISSIONS.QUOTES_CREATE,
      // Analytics
      PERMISSIONS.ANALYTICS_VIEW,
      // Équipes (lecture et délégations)
      PERMISSIONS.TEAMS_VIEW, PERMISSIONS.DELEGATIONS_VIEW, PERMISSIONS.DELEGATIONS_CREATE,
      // Paramètres
      PERMISSIONS.SETTINGS_VIEW
    ],
    color: 'teal'
  },
  nurse: {
    id: 'nurse',
    name: 'Infirmier(ère)',
    description: 'Soins infirmiers et suivi des patients',
    level: 50,
    isSystemRole: true,
    permissions: [
      // Patients
      PERMISSIONS.PATIENTS_VIEW, PERMISSIONS.PATIENTS_EDIT,
      // Rendez-vous
      PERMISSIONS.APPOINTMENTS_VIEW, PERMISSIONS.APPOINTMENTS_CREATE, PERMISSIONS.APPOINTMENTS_EDIT,
      PERMISSIONS.APPOINTMENTS_DELETE,
      // Dossiers médicaux
      PERMISSIONS.MEDICAL_RECORDS_VIEW,
      // Consentements
      PERMISSIONS.CONSENTS_VIEW,
      // Paramètres
      PERMISSIONS.SETTINGS_VIEW
    ],
    color: 'pink'
  },
  secretary: {
    id: 'secretary',
    name: 'Secrétaire médical(e)',
    description: 'Gestion administrative et accueil',
    level: 30,
    isSystemRole: true,
    permissions: [
      // Patients
      PERMISSIONS.PATIENTS_VIEW, PERMISSIONS.PATIENTS_CREATE, PERMISSIONS.PATIENTS_EDIT,
      PERMISSIONS.PATIENTS_VIEW_ALL, // Voir tous les patients pour gérer les RDV
      // Rendez-vous
      PERMISSIONS.APPOINTMENTS_VIEW, PERMISSIONS.APPOINTMENTS_CREATE, PERMISSIONS.APPOINTMENTS_EDIT,
      PERMISSIONS.APPOINTMENTS_DELETE, PERMISSIONS.APPOINTMENTS_VIEW_ALL, // Voir tous les RDV
      PERMISSIONS.APPOINTMENTS_VIEW_PRACTITIONER, // Voir le nom du praticien
      // Finances
      PERMISSIONS.INVOICES_VIEW, PERMISSIONS.INVOICES_CREATE, PERMISSIONS.INVOICES_EDIT,
      PERMISSIONS.INVOICES_SEND,
      PERMISSIONS.QUOTES_VIEW, PERMISSIONS.QUOTES_CREATE, PERMISSIONS.QUOTES_EDIT,
      // Paramètres
      PERMISSIONS.SETTINGS_VIEW
    ],
    color: 'orange'
  },
  readonly: {
    id: 'readonly',
    name: 'Lecture seule',
    description: 'Accès en consultation uniquement',
    level: 10,
    isSystemRole: true,
    permissions: [
      // Patients
      PERMISSIONS.PATIENTS_VIEW,
      // Rendez-vous
      PERMISSIONS.APPOINTMENTS_VIEW,
      // Dossiers médicaux
      PERMISSIONS.MEDICAL_RECORDS_VIEW,
      // Consentements
      PERMISSIONS.CONSENTS_VIEW,
      // Finances
      PERMISSIONS.INVOICES_VIEW, PERMISSIONS.QUOTES_VIEW,
      // Analytics
      PERMISSIONS.ANALYTICS_VIEW,
      // Paramètres
      PERMISSIONS.SETTINGS_VIEW
    ],
    color: 'gray'
  }
};

// Catégories de permissions pour l'interface
export const PERMISSION_CATEGORIES = {
  patients: {
    name: 'Gestion des patients',
    icon: 'Users',
    permissions: [
      PERMISSIONS.PATIENTS_VIEW, PERMISSIONS.PATIENTS_CREATE, PERMISSIONS.PATIENTS_EDIT,
      PERMISSIONS.PATIENTS_DELETE, PERMISSIONS.PATIENTS_EXPORT, PERMISSIONS.PATIENTS_VIEW_ALL
    ]
  },
  appointments: {
    name: 'Rendez-vous',
    icon: 'Calendar',
    permissions: [
      PERMISSIONS.APPOINTMENTS_VIEW, PERMISSIONS.APPOINTMENTS_CREATE, PERMISSIONS.APPOINTMENTS_EDIT,
      PERMISSIONS.APPOINTMENTS_DELETE, PERMISSIONS.APPOINTMENTS_VIEW_ALL
    ]
  },
  medical: {
    name: 'Dossiers médicaux',
    icon: 'FileText',
    permissions: [
      PERMISSIONS.MEDICAL_RECORDS_VIEW, PERMISSIONS.MEDICAL_RECORDS_CREATE, PERMISSIONS.MEDICAL_RECORDS_EDIT,
      PERMISSIONS.MEDICAL_RECORDS_DELETE, PERMISSIONS.MEDICAL_RECORDS_VIEW_ALL
    ]
  },
  consents: {
    name: 'Consentements',
    icon: 'Shield',
    permissions: [
      PERMISSIONS.CONSENTS_VIEW, PERMISSIONS.CONSENTS_CREATE, PERMISSIONS.CONSENTS_EDIT,
      PERMISSIONS.CONSENTS_DELETE, PERMISSIONS.CONSENTS_REVOKE, PERMISSIONS.CONSENTS_TEMPLATES_MANAGE
    ]
  },
  finance: {
    name: 'Facturation',
    icon: 'DollarSign',
    permissions: [
      PERMISSIONS.INVOICES_VIEW, PERMISSIONS.INVOICES_CREATE, PERMISSIONS.INVOICES_EDIT,
      PERMISSIONS.INVOICES_DELETE, PERMISSIONS.INVOICES_SEND,
      PERMISSIONS.QUOTES_VIEW, PERMISSIONS.QUOTES_CREATE, PERMISSIONS.QUOTES_EDIT, PERMISSIONS.QUOTES_DELETE
    ]
  },
  analytics: {
    name: 'Statistiques',
    icon: 'BarChart3',
    permissions: [
      PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.ANALYTICS_EXPORT, PERMISSIONS.ANALYTICS_ADMIN
    ]
  },
  administration: {
    name: 'Administration',
    icon: 'Settings',
    permissions: [
      PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_CREATE, PERMISSIONS.USERS_EDIT,
      PERMISSIONS.USERS_DELETE, PERMISSIONS.USERS_PERMISSIONS,
      PERMISSIONS.ROLES_VIEW, PERMISSIONS.ROLES_CREATE, PERMISSIONS.ROLES_EDIT, PERMISSIONS.ROLES_DELETE,
      PERMISSIONS.SYSTEM_SETTINGS, PERMISSIONS.SYSTEM_BACKUP, PERMISSIONS.SYSTEM_AUDIT
    ]
  },
  settings: {
    name: 'Paramètres',
    icon: 'Cog',
    permissions: [
      PERMISSIONS.SETTINGS_VIEW, PERMISSIONS.SETTINGS_EDIT, PERMISSIONS.SETTINGS_CLINIC,
      PERMISSIONS.SETTINGS_SECURITY
    ]
  }
};

// Service de gestion des permissions
export const permissionsStorage = {
  // Initialiser ou mettre à jour les rôles par défaut
  initializeDefaultRoles: () => {
    const existingRoles = permissionsStorage.getRoles();

    // Mettre à jour les rôles système avec leurs définitions actuelles
    // Cela permet de récupérer les nouvelles permissions ajoutées
    const updatedRoles = existingRoles.map(role => {
      const defaultRole = DEFAULT_ROLES[role.id];
      if (defaultRole && defaultRole.isSystemRole) {
        // Fusionner les rôles système avec leurs définitions actuelles
        return {
          ...role,
          permissions: defaultRole.permissions,
          name: defaultRole.name,
          description: defaultRole.description,
          level: defaultRole.level
        };
      }
      return role;
    });

    // Ajouter les rôles système manquants
    Object.values(DEFAULT_ROLES).forEach(defaultRole => {
      if (!updatedRoles.find(r => r.id === defaultRole.id)) {
        updatedRoles.push(defaultRole);
      }
    });

    // Sauvegarder les rôles mis à jour
    if (updatedRoles.length > 0) {
      localStorage.setItem('clinic_roles', JSON.stringify(updatedRoles));
    } else {
      // Si aucun rôle n'existe, créer les rôles par défaut
      Object.values(DEFAULT_ROLES).forEach(role => {
        permissionsStorage.createRole(role);
      });
    }
  },

  // Gestion des rôles
  getRoles: () => {
    const roles = localStorage.getItem('clinic_roles');
    return roles ? JSON.parse(roles) : [];
  },

  getRole: (roleId) => {
    const roles = permissionsStorage.getRoles();
    return roles.find(role => role.id === roleId);
  },

  createRole: (roleData) => {
    const roles = permissionsStorage.getRoles();
    const newRole = {
      id: roleData.id || `role_${Date.now()}`,
      name: roleData.name,
      description: roleData.description,
      level: roleData.level || 1,
      permissions: roleData.permissions || [],
      isSystemRole: roleData.isSystemRole || false,
      color: roleData.color || 'blue',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    roles.push(newRole);
    localStorage.setItem('clinic_roles', JSON.stringify(roles));
    return newRole;
  },

  updateRole: (roleId, updates) => {
    const roles = permissionsStorage.getRoles();
    const roleIndex = roles.findIndex(role => role.id === roleId);

    if (roleIndex === -1) {
      throw new Error(`Rôle ${roleId} introuvable`);
    }

    // Ne pas permettre la modification des rôles système
    if (roles[roleIndex].isSystemRole) {
      throw new Error('Les rôles système ne peuvent pas être modifiés');
    }

    roles[roleIndex] = {
      ...roles[roleIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem('clinic_roles', JSON.stringify(roles));
    return roles[roleIndex];
  },

  deleteRole: (roleId) => {
    const roles = permissionsStorage.getRoles();
    const role = roles.find(r => r.id === roleId);

    if (!role) {
      throw new Error(`Rôle ${roleId} introuvable`);
    }

    if (role.isSystemRole) {
      throw new Error('Les rôles système ne peuvent pas être supprimés');
    }

    const filteredRoles = roles.filter(role => role.id !== roleId);
    localStorage.setItem('clinic_roles', JSON.stringify(filteredRoles));
    return true;
  },

  // Vérification des permissions
  hasPermission: (userPermissions, requiredPermission) => {
    if (!userPermissions || !Array.isArray(userPermissions)) {
      return false;
    }
    return userPermissions.includes(requiredPermission);
  },

  hasAnyPermission: (userPermissions, requiredPermissions) => {
    if (!userPermissions || !Array.isArray(userPermissions)) {
      return false;
    }
    return requiredPermissions.some(permission =>
      userPermissions.includes(permission)
    );
  },

  hasAllPermissions: (userPermissions, requiredPermissions) => {
    if (!userPermissions || !Array.isArray(userPermissions)) {
      return false;
    }
    return requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );
  },

  // Obtenir les permissions d'un utilisateur
  getUserPermissions: (user) => {
    if (!user || !user.role) {
      return [];
    }

    const role = permissionsStorage.getRole(user.role);
    if (!role) {
      return [];
    }

    // Combiner les permissions du rôle avec les permissions personnalisées
    const rolePermissions = role.permissions || [];
    const customPermissions = user.permissions || [];

    return [...new Set([...rolePermissions, ...customPermissions])];
  },

  // Utilitaires pour l'interface
  getPermissionsByCategory: () => {
    return PERMISSION_CATEGORIES;
  },

  getPermissionLabel: (permission) => {
    const labels = {
      // Patients
      [PERMISSIONS.PATIENTS_VIEW]: 'Voir les patients',
      [PERMISSIONS.PATIENTS_CREATE]: 'Créer des patients',
      [PERMISSIONS.PATIENTS_EDIT]: 'Modifier les patients',
      [PERMISSIONS.PATIENTS_DELETE]: 'Supprimer les patients',
      [PERMISSIONS.PATIENTS_EXPORT]: 'Exporter les données patients',
      [PERMISSIONS.PATIENTS_VIEW_ALL]: 'Voir tous les patients',

      // Rendez-vous
      [PERMISSIONS.APPOINTMENTS_VIEW]: 'Voir les rendez-vous',
      [PERMISSIONS.APPOINTMENTS_CREATE]: 'Créer des rendez-vous',
      [PERMISSIONS.APPOINTMENTS_EDIT]: 'Modifier les rendez-vous',
      [PERMISSIONS.APPOINTMENTS_DELETE]: 'Supprimer les rendez-vous',
      [PERMISSIONS.APPOINTMENTS_VIEW_ALL]: 'Voir tous les rendez-vous',

      // Dossiers médicaux
      [PERMISSIONS.MEDICAL_RECORDS_VIEW]: 'Voir les dossiers médicaux',
      [PERMISSIONS.MEDICAL_RECORDS_CREATE]: 'Créer des dossiers médicaux',
      [PERMISSIONS.MEDICAL_RECORDS_EDIT]: 'Modifier les dossiers médicaux',
      [PERMISSIONS.MEDICAL_RECORDS_DELETE]: 'Supprimer les dossiers médicaux',
      [PERMISSIONS.MEDICAL_RECORDS_VIEW_ALL]: 'Voir tous les dossiers médicaux',

      // Consentements
      [PERMISSIONS.CONSENTS_VIEW]: 'Voir les consentements',
      [PERMISSIONS.CONSENTS_CREATE]: 'Créer des consentements',
      [PERMISSIONS.CONSENTS_EDIT]: 'Modifier les consentements',
      [PERMISSIONS.CONSENTS_DELETE]: 'Supprimer les consentements',
      [PERMISSIONS.CONSENTS_REVOKE]: 'Révoquer les consentements',
      [PERMISSIONS.CONSENTS_TEMPLATES_MANAGE]: 'Gérer les modèles de consentements',

      // Finances
      [PERMISSIONS.INVOICES_VIEW]: 'Voir les factures',
      [PERMISSIONS.INVOICES_CREATE]: 'Créer des factures',
      [PERMISSIONS.INVOICES_EDIT]: 'Modifier les factures',
      [PERMISSIONS.INVOICES_DELETE]: 'Supprimer les factures',
      [PERMISSIONS.INVOICES_SEND]: 'Envoyer les factures',

      [PERMISSIONS.QUOTES_VIEW]: 'Voir les devis',
      [PERMISSIONS.QUOTES_CREATE]: 'Créer des devis',
      [PERMISSIONS.QUOTES_EDIT]: 'Modifier les devis',
      [PERMISSIONS.QUOTES_DELETE]: 'Supprimer les devis',

      // Analytics
      [PERMISSIONS.ANALYTICS_VIEW]: 'Voir les statistiques',
      [PERMISSIONS.ANALYTICS_EXPORT]: 'Exporter les statistiques',
      [PERMISSIONS.ANALYTICS_ADMIN]: 'Administration des statistiques',

      // Administration
      [PERMISSIONS.USERS_VIEW]: 'Voir les utilisateurs',
      [PERMISSIONS.USERS_CREATE]: 'Créer des utilisateurs',
      [PERMISSIONS.USERS_EDIT]: 'Modifier les utilisateurs',
      [PERMISSIONS.USERS_DELETE]: 'Supprimer les utilisateurs',
      [PERMISSIONS.USERS_PERMISSIONS]: 'Gérer les permissions utilisateurs',

      [PERMISSIONS.ROLES_VIEW]: 'Voir les rôles',
      [PERMISSIONS.ROLES_CREATE]: 'Créer des rôles',
      [PERMISSIONS.ROLES_EDIT]: 'Modifier les rôles',
      [PERMISSIONS.ROLES_DELETE]: 'Supprimer les rôles',

      [PERMISSIONS.SYSTEM_SETTINGS]: 'Paramètres système',
      [PERMISSIONS.SYSTEM_BACKUP]: 'Sauvegardes système',
      [PERMISSIONS.SYSTEM_AUDIT]: 'Audit système',

      // Paramètres
      [PERMISSIONS.SETTINGS_VIEW]: 'Voir les paramètres',
      [PERMISSIONS.SETTINGS_EDIT]: 'Modifier les paramètres',
      [PERMISSIONS.SETTINGS_CLINIC]: 'Paramètres de la clinique',
      [PERMISSIONS.SETTINGS_SECURITY]: 'Paramètres de sécurité'
    };

    return labels[permission] || permission;
  },

  // Statistiques
  getStatistics: () => {
    const roles = permissionsStorage.getRoles();

    return {
      totalRoles: roles.length,
      systemRoles: roles.filter(r => r.isSystemRole).length,
      customRoles: roles.filter(r => !r.isSystemRole).length,
      rolesByLevel: roles.reduce((acc, role) => {
        const level = role.level >= 80 ? 'high' : role.level >= 50 ? 'medium' : 'low';
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      }, {}),
      permissionsDistribution: Object.entries(PERMISSION_CATEGORIES).map(([key, category]) => ({
        category: category.name,
        count: category.permissions.length
      }))
    };
  }
};

export default permissionsStorage;