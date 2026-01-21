/**
 * Utilitaire centralisé pour la gestion des utilisateurs et de leurs rôles
 *
 * ARCHITECTURE DES RÔLES STANDARDISÉS :
 *
 * 1. RÔLE MÉTIER (role) - Obligatoire
 *    Définit ce que la personne fait au quotidien :
 *    - Praticiens : physician (médecins), practitioner (autres soignants)
 *    - Support : secretary, readonly
 *
 * 2. RÔLE ADMINISTRATIF (administrativeRole) - Optionnel
 *    Fonction de gestion qui se cumule avec le rôle métier :
 *    - direction : Direction / Gérant de la clinique
 *    - clinic_admin : Administrateur technique
 *    - hr : Ressources humaines
 *    - billing : Responsable facturation
 *
 * Exemple : Un médecin qui est aussi directeur de la clinique
 * → role: 'physician', administrativeRole: 'direction'
 * → Apparaît dans le planning + a accès à l'administration
 *
 * RÔLES SYSTÈME :
 * - super_admin : Administrateur plateforme SaaS
 * - admin : Administrateur de la clinique
 */

// =============================================================================
// DÉFINITION DES RÔLES MÉTIER
// =============================================================================

/**
 * Rôles de praticiens/soignants (peuvent avoir des RDV, apparaître dans le planning)
 * - physician : Médecins (généralistes et spécialistes)
 * - practitioner : Autres professionnels de santé (infirmiers, kinés, etc.)
 */
export const PRACTITIONER_ROLES = ['physician', 'practitioner'];

/**
 * Rôles de support (pas de soins directs)
 */
export const SUPPORT_ROLES = ['secretary', 'readonly'];

/**
 * Tous les rôles métier disponibles
 */
export const ALL_PROFESSIONAL_ROLES = [...PRACTITIONER_ROLES, ...SUPPORT_ROLES];

/**
 * Labels des rôles métier pour l'affichage (FR)
 */
export const ROLE_LABELS = {
  physician: 'Médecin',
  practitioner: 'Praticien de santé',
  secretary: 'Secrétaire',
  readonly: 'Lecture seule'
};

/**
 * Descriptions des rôles métier
 */
export const ROLE_DESCRIPTIONS = {
  physician: 'Médecin généraliste ou spécialiste, peut consulter et prescrire',
  practitioner: 'Professionnel de santé (infirmier, kiné, ostéo, etc.)',
  secretary: 'Gestion des rendez-vous, accueil et administratif',
  readonly: 'Consultation uniquement, aucune modification possible'
};

// =============================================================================
// DÉFINITION DES RÔLES ADMINISTRATIFS (CUMULABLES)
// =============================================================================

/**
 * Rôles administratifs qui peuvent se cumuler avec un rôle métier
 */
export const ADMINISTRATIVE_ROLES = ['direction', 'clinic_admin', 'hr', 'billing'];

/**
 * Labels des rôles administratifs pour l'affichage (FR)
 */
export const ADMINISTRATIVE_ROLE_LABELS = {
  direction: 'Direction / Gérant',
  clinic_admin: 'Administrateur clinique',
  hr: 'Ressources humaines',
  billing: 'Responsable facturation'
};

/**
 * Description des rôles administratifs
 */
export const ADMINISTRATIVE_ROLE_DESCRIPTIONS = {
  direction: 'Accès complet à la gestion de la clinique, utilisateurs, configuration et rapports',
  clinic_admin: 'Gestion de la configuration technique, des paramètres et des intégrations',
  hr: 'Gestion des utilisateurs, des plannings et des absences',
  billing: 'Gestion de la facturation, des tarifs et des rapports financiers'
};

/**
 * Permissions accordées par chaque rôle administratif
 */
export const ADMINISTRATIVE_ROLE_PERMISSIONS = {
  direction: [
    'users.read', 'users.write', 'users.delete',
    'roles.read', 'roles.write',
    'clinic.config.read', 'clinic.config.write',
    'reports.read', 'reports.export',
    'audit.read',
    'billing.read', 'billing.write'
  ],
  clinic_admin: [
    'users.read', 'users.write',
    'clinic.config.read', 'clinic.config.write',
    'audit.read'
  ],
  hr: [
    'users.read', 'users.write',
    'planning.read', 'planning.write',
    'absences.read', 'absences.write'
  ],
  billing: [
    'billing.read', 'billing.write',
    'reports.read', 'reports.export',
    'patients.read'
  ]
};

// =============================================================================
// RÔLES SYSTÈME (SUPER ADMIN - réservé à la plateforme SaaS)
// =============================================================================

/**
 * Rôle super admin (niveau plateforme, pas clinique)
 */
export const SYSTEM_ROLES = ['super_admin'];

/**
 * Tous les rôles possibles dans le système
 */
export const ALL_ROLES = [...ALL_PROFESSIONAL_ROLES, ...SYSTEM_ROLES];

/**
 * Catégories de rôles pour l'affichage groupé
 */
export const ROLE_CATEGORIES = {
  practitioners: {
    label: 'Personnel soignant',
    description: 'Peuvent avoir des rendez-vous et apparaître dans le planning',
    roles: PRACTITIONER_ROLES
  },
  support: {
    label: 'Personnel de support',
    description: 'Fonctions administratives sans accès médical direct',
    roles: SUPPORT_ROLES
  },
  administrative: {
    label: 'Fonctions de gestion (cumulables)',
    description: 'Rôles additionnels qui se cumulent avec le rôle métier',
    roles: ADMINISTRATIVE_ROLES
  }
};

// =============================================================================
// FONCTIONS DE VÉRIFICATION DE RÔLE MÉTIER
// =============================================================================

/**
 * Vérifie si un rôle est un rôle de praticien/soignant
 * @param {string} role - Le rôle à vérifier
 * @returns {boolean}
 */
export const isPractitionerRole = (role) => {
  if (!role) return false;
  return PRACTITIONER_ROLES.includes(role.toLowerCase());
};

/**
 * Vérifie si un rôle est un rôle de support
 * @param {string} role - Le rôle à vérifier
 * @returns {boolean}
 */
export const isSupportRole = (role) => {
  if (!role) return false;
  return SUPPORT_ROLES.includes(role.toLowerCase());
};

/**
 * Vérifie si un utilisateur est actif
 * @param {Object} user - L'utilisateur à vérifier
 * @returns {boolean}
 */
export const isUserActive = (user) => {
  if (!user) return false;
  return user.isActive !== false && user.is_active !== false;
};

/**
 * Obtient le label d'un rôle métier
 * @param {string} role - Le rôle
 * @returns {string}
 */
export const getRoleLabel = (role) => {
  if (!role) return 'Inconnu';
  return ROLE_LABELS[role.toLowerCase()] || role;
};

/**
 * Obtient la catégorie d'un rôle métier
 * @param {string} role - Le rôle
 * @returns {string} - 'practitioner' | 'support' | 'system' | 'unknown'
 */
export const getRoleCategory = (role) => {
  if (!role) return 'unknown';
  if (isPractitionerRole(role)) return 'practitioner';
  if (isSupportRole(role)) return 'support';
  if (SYSTEM_ROLES.includes(role.toLowerCase())) return 'system';
  return 'unknown';
};

// =============================================================================
// FONCTIONS DE VÉRIFICATION DE RÔLE ADMINISTRATIF
// =============================================================================

/**
 * Vérifie si un rôle administratif est valide
 * @param {string} adminRole - Le rôle administratif à vérifier
 * @returns {boolean}
 */
export const isValidAdministrativeRole = (adminRole) => {
  if (!adminRole) return false;
  return ADMINISTRATIVE_ROLES.includes(adminRole.toLowerCase());
};

/**
 * Vérifie si un utilisateur a un rôle administratif
 * @param {Object} user - L'utilisateur à vérifier
 * @returns {boolean}
 */
export const hasAdministrativeRole = (user) => {
  if (!user) return false;
  return isValidAdministrativeRole(user.administrativeRole);
};

/**
 * Obtient le label d'un rôle administratif
 * @param {string} adminRole - Le rôle administratif
 * @returns {string}
 */
export const getAdministrativeRoleLabel = (adminRole) => {
  if (!adminRole) return '';
  return ADMINISTRATIVE_ROLE_LABELS[adminRole.toLowerCase()] || adminRole;
};

/**
 * Obtient le label complet d'un utilisateur (rôle métier + administratif)
 * @param {Object} user - L'utilisateur
 * @returns {string}
 */
export const getFullRoleLabel = (user) => {
  if (!user) return 'Inconnu';

  const professionalLabel = getRoleLabel(user.role);
  const adminLabel = getAdministrativeRoleLabel(user.administrativeRole);

  if (adminLabel) {
    return `${professionalLabel} - ${adminLabel}`;
  }
  return professionalLabel;
};

/**
 * Obtient les permissions d'un rôle administratif
 * @param {string} adminRole - Le rôle administratif
 * @returns {Array}
 */
export const getAdministrativeRolePermissions = (adminRole) => {
  if (!adminRole) return [];
  return ADMINISTRATIVE_ROLE_PERMISSIONS[adminRole.toLowerCase()] || [];
};

// =============================================================================
// FONCTIONS DE FILTRAGE DES UTILISATEURS
// =============================================================================

/**
 * Filtre une liste d'utilisateurs pour ne garder que les actifs
 * @param {Array} users - Liste des utilisateurs
 * @returns {Array}
 */
export const filterActiveUsers = (users = []) => {
  return users.filter(isUserActive);
};

/**
 * Filtre une liste d'utilisateurs pour ne garder que les praticiens actifs
 * @param {Array} users - Liste des utilisateurs/providers
 * @returns {Array}
 */
export const filterPractitioners = (users = []) => {
  return users.filter(user => isUserActive(user) && isPractitionerRole(user.role));
};

/**
 * Filtre une liste d'utilisateurs pour ne garder que ceux avec un rôle administratif
 * @param {Array} users - Liste des utilisateurs/providers
 * @returns {Array}
 */
export const filterWithAdministrativeRole = (users = []) => {
  return users.filter(user => isUserActive(user) && hasAdministrativeRole(user));
};

/**
 * Filtre les utilisateurs par rôle métier spécifique
 * @param {Array} users - Liste des utilisateurs
 * @param {string|Array} roles - Rôle(s) à filtrer
 * @param {boolean} activeOnly - Ne garder que les actifs (default: true)
 * @returns {Array}
 */
export const filterByRole = (users = [], roles, activeOnly = true) => {
  const roleList = Array.isArray(roles) ? roles : [roles];
  return users.filter(user => {
    const matchesRole = roleList.some(r => user.role?.toLowerCase() === r.toLowerCase());
    return matchesRole && (!activeOnly || isUserActive(user));
  });
};

/**
 * Filtre les utilisateurs par rôle administratif spécifique
 * @param {Array} users - Liste des utilisateurs
 * @param {string|Array} adminRoles - Rôle(s) administratif(s) à filtrer
 * @param {boolean} activeOnly - Ne garder que les actifs (default: true)
 * @returns {Array}
 */
export const filterByAdministrativeRole = (users = [], adminRoles, activeOnly = true) => {
  const roleList = Array.isArray(adminRoles) ? adminRoles : [adminRoles];
  return users.filter(user => {
    const matchesRole = roleList.some(r => user.administrativeRole?.toLowerCase() === r.toLowerCase());
    return matchesRole && (!activeOnly || isUserActive(user));
  });
};

// =============================================================================
// FONCTIONS DE COMPTAGE ET STATISTIQUES
// =============================================================================

/**
 * Compte les utilisateurs par rôle métier
 * @param {Array} users - Liste des utilisateurs
 * @param {string} role - Le rôle à compter
 * @param {boolean} activeOnly - Ne compter que les actifs (default: true)
 * @returns {number}
 */
export const countByRole = (users = [], role, activeOnly = true) => {
  return filterByRole(users, role, activeOnly).length;
};

/**
 * Compte les praticiens par type/rôle
 * @param {Array} users - Liste des utilisateurs
 * @param {string} type - Le type à compter (doctor, nurse, specialist, etc.)
 * @returns {number}
 */
export const countPractitionersByType = (users = [], type) => {
  const practitioners = filterPractitioners(users);
  return practitioners.filter(p =>
    p.type === type || p.role?.toLowerCase() === type
  ).length;
};

/**
 * Compte les utilisateurs par rôle administratif
 * @param {Array} users - Liste des utilisateurs
 * @param {string} adminRole - Le rôle administratif à compter
 * @returns {number}
 */
export const countByAdministrativeRole = (users = [], adminRole) => {
  return filterByAdministrativeRole(users, adminRole).length;
};

/**
 * Obtient les statistiques complètes des utilisateurs
 * @param {Array} users - Liste des utilisateurs
 * @returns {Object}
 */
export const getUserStats = (users = []) => {
  const activeUsers = filterActiveUsers(users);
  const practitioners = filterPractitioners(users);
  const withAdminRole = filterWithAdministrativeRole(users);

  return {
    // Totaux
    total: users.length,
    active: activeUsers.length,
    inactive: users.length - activeUsers.length,

    // Par catégorie métier
    practitioners: {
      total: practitioners.length,
      physicians: countPractitionersByType(users, 'physician'),
      practitioners: countPractitionersByType(users, 'practitioner')
    },

    // Support
    support: {
      total: countByRole(users, SUPPORT_ROLES),
      secretaries: countByRole(users, 'secretary'),
      readonly: countByRole(users, 'readonly')
    },

    // Rôles administratifs (cumulés)
    administrative: {
      total: withAdminRole.length,
      direction: countByAdministrativeRole(users, 'direction'),
      clinicAdmin: countByAdministrativeRole(users, 'clinic_admin'),
      hr: countByAdministrativeRole(users, 'hr'),
      billing: countByAdministrativeRole(users, 'billing')
    }
  };
};

/**
 * Obtient les statistiques simplifiées des praticiens uniquement
 * @param {Array} users - Liste des utilisateurs
 * @returns {Object}
 */
export const getPractitionerStats = (users = []) => {
  return getUserStats(users).practitioners;
};

// =============================================================================
// FONCTIONS DE CALCUL DES PERMISSIONS
// =============================================================================

/**
 * Calcule toutes les permissions d'un utilisateur (rôle métier + administratif)
 * @param {Object} user - L'utilisateur
 * @param {Function} getRolePermissions - Fonction pour obtenir les permissions du rôle métier
 * @returns {Array} Liste des permissions uniques
 */
export const calculateUserPermissions = (user, getRolePermissions) => {
  if (!user) return [];

  // Permissions de base du rôle métier
  const basePermissions = getRolePermissions ? getRolePermissions(user.role) : [];

  // Permissions du rôle administratif
  const adminPermissions = getAdministrativeRolePermissions(user.administrativeRole);

  // Permissions personnalisées
  const customPermissions = user.customPermissions || [];

  // Fusionner et dédupliquer
  return [...new Set([...basePermissions, ...adminPermissions, ...customPermissions])];
};

/**
 * Vérifie si un utilisateur a accès à l'administration
 * @param {Object} user - L'utilisateur
 * @returns {boolean}
 *
 * Accès accordé si:
 * - role métier = 'admin' ou 'super_admin' (rôles système)
 * - OU a un rôle administratif (direction, clinic_admin, hr, billing)
 */
export const canAccessAdministration = (user) => {
  if (!user) return false;

  // Rôles système avec accès admin complet
  const adminSystemRoles = ['admin', 'super_admin'];
  if (adminSystemRoles.includes(user.role?.toLowerCase())) {
    return true;
  }

  // Rôles administratifs cumulables (direction, clinic_admin, hr, billing)
  return hasAdministrativeRole(user);
};

// =============================================================================
// EXPORT PAR DÉFAUT
// =============================================================================

export default {
  // Constantes - Rôles métier
  PRACTITIONER_ROLES,
  SUPPORT_ROLES,
  ALL_PROFESSIONAL_ROLES,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,

  // Constantes - Rôles administratifs
  ADMINISTRATIVE_ROLES,
  ADMINISTRATIVE_ROLE_LABELS,
  ADMINISTRATIVE_ROLE_DESCRIPTIONS,
  ADMINISTRATIVE_ROLE_PERMISSIONS,

  // Constantes - Système
  SYSTEM_ROLES,
  ALL_ROLES,
  ROLE_CATEGORIES,

  // Vérification - Rôle métier
  isPractitionerRole,
  isSupportRole,
  isUserActive,
  getRoleLabel,
  getRoleCategory,

  // Vérification - Rôle administratif
  isValidAdministrativeRole,
  hasAdministrativeRole,
  getAdministrativeRoleLabel,
  getFullRoleLabel,
  getAdministrativeRolePermissions,

  // Filtrage
  filterActiveUsers,
  filterPractitioners,
  filterWithAdministrativeRole,
  filterByRole,
  filterByAdministrativeRole,

  // Statistiques
  countByRole,
  countPractitionersByType,
  countByAdministrativeRole,
  getUserStats,
  getPractitionerStats,

  // Permissions
  calculateUserPermissions,
  canAccessAdministration
};
