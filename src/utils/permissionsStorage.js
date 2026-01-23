// utils/permissionsStorage.js
// Service de gestion des permissions et rôles
// Conforme RGPD et Secret Médical (Article L1110-4 du Code de la santé publique)

// ============================================================================
// DÉFINITION DES PERMISSIONS
// ============================================================================
// Organisation:
// - DONNÉES ADMINISTRATIVES: Accessibles au personnel administratif
// - DONNÉES MÉDICALES: Réservées aux professionnels de santé (secret médical)
// ============================================================================

export const PERMISSIONS = {
  // =========================================================================
  // DONNÉES ADMINISTRATIVES (personnel administratif autorisé)
  // =========================================================================

  // Gestion des patients - Données administratives uniquement
  // (identité, coordonnées, assurance - PAS les données médicales)
  PATIENTS_VIEW: 'patients.view',                   // Voir les infos admin des patients
  PATIENTS_CREATE: 'patients.create',               // Créer un dossier patient (admin)
  PATIENTS_EDIT: 'patients.edit',                   // Modifier les infos admin
  PATIENTS_DELETE: 'patients.delete',               // Supprimer/archiver un patient
  PATIENTS_EXPORT: 'patients.export',               // Exporter les données admin
  PATIENTS_VIEW_ALL: 'patients.view_all',           // Voir tous les patients (vs ses propres patients)

  // Gestion des rendez-vous
  APPOINTMENTS_VIEW: 'appointments.view',
  APPOINTMENTS_CREATE: 'appointments.create',
  APPOINTMENTS_EDIT: 'appointments.edit',
  APPOINTMENTS_DELETE: 'appointments.delete',
  APPOINTMENTS_VIEW_ALL: 'appointments.view_all',
  APPOINTMENTS_VIEW_PRACTITIONER: 'appointments.view_practitioner', // Voir le nom du praticien

  // Facturation et devis (données financières, pas médicales)
  INVOICES_VIEW: 'invoices.view',
  INVOICES_CREATE: 'invoices.create',
  INVOICES_EDIT: 'invoices.edit',
  INVOICES_DELETE: 'invoices.delete',
  INVOICES_SEND: 'invoices.send',

  QUOTES_VIEW: 'quotes.view',
  QUOTES_CREATE: 'quotes.create',
  QUOTES_EDIT: 'quotes.edit',
  QUOTES_DELETE: 'quotes.delete',

  // =========================================================================
  // DONNÉES MÉDICALES (professionnels de santé uniquement - Secret médical)
  // Article L1110-4 CSP: Réservé aux professionnels de santé participant aux soins
  // =========================================================================

  // Dossiers médicaux - ACCÈS RESTREINT
  MEDICAL_RECORDS_VIEW: 'medical_records.view',           // Consulter les dossiers médicaux
  MEDICAL_RECORDS_CREATE: 'medical_records.create',       // Créer des entrées médicales
  MEDICAL_RECORDS_EDIT: 'medical_records.edit',           // Modifier les dossiers médicaux
  MEDICAL_RECORDS_DELETE: 'medical_records.delete',       // Supprimer (avec traçabilité)
  MEDICAL_RECORDS_VIEW_ALL: 'medical_records.view_all',   // Voir tous les dossiers (responsable médical)
  MEDICAL_NOTES_CREATE: 'medical_notes.create',           // Créer des notes médicales

  // Données médicales spécifiques
  MEDICAL_ANTECEDENTS_VIEW: 'medical.antecedents.view',   // Voir les antécédents
  MEDICAL_ANTECEDENTS_EDIT: 'medical.antecedents.edit',   // Modifier les antécédents
  MEDICAL_PRESCRIPTIONS_VIEW: 'medical.prescriptions.view',   // Voir les prescriptions
  MEDICAL_PRESCRIPTIONS_CREATE: 'medical.prescriptions.create', // Créer des prescriptions
  MEDICAL_ALLERGIES_VIEW: 'medical.allergies.view',       // Voir les allergies (critique pour soins)
  MEDICAL_ALLERGIES_EDIT: 'medical.allergies.edit',       // Modifier les allergies
  MEDICAL_VITALS_VIEW: 'medical.vitals.view',             // Voir les constantes vitales
  MEDICAL_VITALS_EDIT: 'medical.vitals.edit',             // Saisir les constantes vitales

  // Consentements (données sensibles)
  CONSENTS_VIEW: 'consents.view',
  CONSENTS_CREATE: 'consents.create',
  CONSENTS_EDIT: 'consents.edit',
  CONSENTS_DELETE: 'consents.delete',
  CONSENTS_SIGN: 'consents.sign',                   // Signer un consentement
  CONSENTS_REVOKE: 'consents.revoke',
  CONSENTS_ASSIGN: 'consents.assign',               // Attribuer un consentement à un patient

  // Templates de consentements (Admin clinique)
  CONSENT_TEMPLATES_VIEW: 'consent_templates.view',
  CONSENT_TEMPLATES_CREATE: 'consent_templates.create',
  CONSENT_TEMPLATES_EDIT: 'consent_templates.edit',
  CONSENT_TEMPLATES_DELETE: 'consent_templates.delete',

  // =========================================================================
  // ADMINISTRATION ET SYSTÈME
  // =========================================================================

  // Statistiques et rapports
  ANALYTICS_VIEW: 'analytics.view',
  ANALYTICS_EXPORT: 'analytics.export',
  ANALYTICS_ADMIN: 'analytics.admin',
  ANALYTICS_MEDICAL: 'analytics.medical',   // Stats médicales (réservé soignants)

  // Gestion des utilisateurs
  USERS_VIEW: 'users.view',
  USERS_READ: 'users.read',
  USERS_CREATE: 'users.create',
  USERS_EDIT: 'users.edit',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  USERS_PERMISSIONS: 'users.permissions',
  USERS_EXPORT: 'users.export',

  // Gestion des rôles
  ROLES_VIEW: 'roles.view',
  ROLES_CREATE: 'roles.create',
  ROLES_EDIT: 'roles.edit',
  ROLES_DELETE: 'roles.delete',

  // Équipes et délégations
  TEAMS_VIEW: 'teams.view',
  TEAMS_READ: 'teams.read',
  TEAMS_CREATE: 'teams.create',
  TEAMS_EDIT: 'teams.edit',
  TEAMS_UPDATE: 'teams.update',
  TEAMS_DELETE: 'teams.delete',
  TEAMS_EXPORT: 'teams.export',

  DELEGATIONS_VIEW: 'delegations.view',
  DELEGATIONS_CREATE: 'delegations.create',
  DELEGATIONS_EDIT: 'delegations.edit',
  DELEGATIONS_APPROVE: 'delegations.approve',
  DELEGATIONS_REVOKE: 'delegations.revoke',

  // Audit et journalisation (RGPD - traçabilité obligatoire)
  AUDIT_VIEW: 'audit.view',
  AUDIT_READ: 'audit.read',           // Alias pour audit.view
  AUDIT_EXPORT: 'audit.export',
  AUDIT_MANAGE: 'audit.manage',
  AUDIT_DELETE: 'audit.delete',

  // Système
  SYSTEM_SETTINGS: 'system.settings',
  SYSTEM_BACKUP: 'system.backup',
  SYSTEM_AUDIT: 'system.audit',

  // Paramètres
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',
  SETTINGS_CLINIC: 'settings.clinic',
  SETTINGS_SECURITY: 'settings.security'
};

// ============================================================================
// PERMISSIONS SENSIBLES - Alertes de conformité
// ============================================================================
export const SENSITIVE_PERMISSIONS = {
  // Permissions nécessitant une alerte lors de l'attribution
  MEDICAL_ACCESS: [
    PERMISSIONS.MEDICAL_RECORDS_VIEW,
    PERMISSIONS.MEDICAL_RECORDS_CREATE,
    PERMISSIONS.MEDICAL_RECORDS_EDIT,
    PERMISSIONS.MEDICAL_RECORDS_DELETE,
    PERMISSIONS.MEDICAL_RECORDS_VIEW_ALL,
    PERMISSIONS.MEDICAL_NOTES_CREATE,
    PERMISSIONS.MEDICAL_ANTECEDENTS_VIEW,
    PERMISSIONS.MEDICAL_ANTECEDENTS_EDIT,
    PERMISSIONS.MEDICAL_PRESCRIPTIONS_VIEW,
    PERMISSIONS.MEDICAL_PRESCRIPTIONS_CREATE,
    PERMISSIONS.MEDICAL_ALLERGIES_VIEW,
    PERMISSIONS.MEDICAL_ALLERGIES_EDIT,
    PERMISSIONS.MEDICAL_VITALS_VIEW,
    PERMISSIONS.MEDICAL_VITALS_EDIT,
  ],
  // Message d'alerte
  MEDICAL_WARNING: 'Secret médical (Art. L1110-4 CSP): Cette permission donne accès aux données médicales. Réservé aux professionnels de santé participant aux soins du patient.'
};

// ============================================================================
// DÉFINITION DES RÔLES SYSTÈME
// ============================================================================
// Conformité RGPD et Secret Médical:
// - Super Admin / Admin: PAS d'accès aux données médicales (sauf si soignant)
// - Secrétaire: Données administratives uniquement
// - Médecin/Spécialiste/Infirmier: Accès données médicales (équipe de soins)
// ============================================================================

export const DEFAULT_ROLES = {
  super_admin: {
    id: 'super_admin',
    name: 'Super Administrateur',
    description: 'Gestion technique de la plateforme - SANS accès aux données médicales',
    level: 100,
    isSystemRole: true,
    isHealthcareProfessional: false, // Indicateur: pas un soignant par défaut
    permissions: [
      // Patients - Données administratives UNIQUEMENT
      PERMISSIONS.PATIENTS_VIEW, PERMISSIONS.PATIENTS_CREATE, PERMISSIONS.PATIENTS_EDIT,
      PERMISSIONS.PATIENTS_DELETE, PERMISSIONS.PATIENTS_EXPORT, PERMISSIONS.PATIENTS_VIEW_ALL,
      // Rendez-vous
      PERMISSIONS.APPOINTMENTS_VIEW, PERMISSIONS.APPOINTMENTS_CREATE, PERMISSIONS.APPOINTMENTS_EDIT,
      PERMISSIONS.APPOINTMENTS_DELETE, PERMISSIONS.APPOINTMENTS_VIEW_ALL,
      PERMISSIONS.APPOINTMENTS_VIEW_PRACTITIONER,
      // PAS DE DONNÉES MÉDICALES (Secret médical - Art. L1110-4 CSP)
      // Consentements - Gestion administrative (templates et attribution)
      PERMISSIONS.CONSENTS_VIEW, PERMISSIONS.CONSENTS_ASSIGN,
      // Templates de consentements - Gestion complète (admin)
      PERMISSIONS.CONSENT_TEMPLATES_VIEW, PERMISSIONS.CONSENT_TEMPLATES_CREATE,
      PERMISSIONS.CONSENT_TEMPLATES_EDIT, PERMISSIONS.CONSENT_TEMPLATES_DELETE,
      // Finances
      PERMISSIONS.INVOICES_VIEW, PERMISSIONS.INVOICES_CREATE, PERMISSIONS.INVOICES_EDIT,
      PERMISSIONS.INVOICES_DELETE, PERMISSIONS.INVOICES_SEND,
      PERMISSIONS.QUOTES_VIEW, PERMISSIONS.QUOTES_CREATE, PERMISSIONS.QUOTES_EDIT, PERMISSIONS.QUOTES_DELETE,
      // Analytics - Admin uniquement (pas les stats médicales)
      PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.ANALYTICS_EXPORT, PERMISSIONS.ANALYTICS_ADMIN,
      // Administration complète
      PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_READ, PERMISSIONS.USERS_CREATE,
      PERMISSIONS.USERS_EDIT, PERMISSIONS.USERS_UPDATE, PERMISSIONS.USERS_DELETE,
      PERMISSIONS.USERS_PERMISSIONS, PERMISSIONS.USERS_EXPORT,
      PERMISSIONS.ROLES_VIEW, PERMISSIONS.ROLES_CREATE, PERMISSIONS.ROLES_EDIT, PERMISSIONS.ROLES_DELETE,
      // Équipes et délégations
      PERMISSIONS.TEAMS_VIEW, PERMISSIONS.TEAMS_READ, PERMISSIONS.TEAMS_CREATE,
      PERMISSIONS.TEAMS_EDIT, PERMISSIONS.TEAMS_UPDATE, PERMISSIONS.TEAMS_DELETE, PERMISSIONS.TEAMS_EXPORT,
      PERMISSIONS.DELEGATIONS_VIEW, PERMISSIONS.DELEGATIONS_CREATE, PERMISSIONS.DELEGATIONS_EDIT,
      PERMISSIONS.DELEGATIONS_APPROVE, PERMISSIONS.DELEGATIONS_REVOKE,
      // Audit complet (RGPD)
      PERMISSIONS.AUDIT_VIEW, PERMISSIONS.AUDIT_EXPORT, PERMISSIONS.AUDIT_MANAGE,
      // Système
      PERMISSIONS.SYSTEM_SETTINGS, PERMISSIONS.SYSTEM_BACKUP, PERMISSIONS.SYSTEM_AUDIT,
      // Paramètres
      PERMISSIONS.SETTINGS_VIEW, PERMISSIONS.SETTINGS_EDIT, PERMISSIONS.SETTINGS_CLINIC, PERMISSIONS.SETTINGS_SECURITY
    ],
    color: 'purple'
  },
  admin: {
    id: 'admin',
    name: 'Administrateur',
    description: 'Gestion de la clinique - SANS accès aux données médicales',
    level: 90,
    isSystemRole: true,
    isHealthcareProfessional: false,
    permissions: [
      // Patients - Données administratives UNIQUEMENT
      PERMISSIONS.PATIENTS_VIEW, PERMISSIONS.PATIENTS_CREATE, PERMISSIONS.PATIENTS_EDIT,
      PERMISSIONS.PATIENTS_DELETE, PERMISSIONS.PATIENTS_EXPORT, PERMISSIONS.PATIENTS_VIEW_ALL,
      // Rendez-vous
      PERMISSIONS.APPOINTMENTS_VIEW, PERMISSIONS.APPOINTMENTS_CREATE, PERMISSIONS.APPOINTMENTS_EDIT,
      PERMISSIONS.APPOINTMENTS_DELETE, PERMISSIONS.APPOINTMENTS_VIEW_ALL,
      PERMISSIONS.APPOINTMENTS_VIEW_PRACTITIONER,
      // PAS DE DONNÉES MÉDICALES (Secret médical)
      // Consentements - Gestion administrative (templates et attribution)
      PERMISSIONS.CONSENTS_VIEW, PERMISSIONS.CONSENTS_ASSIGN,
      // Templates de consentements - Gestion complète (admin)
      PERMISSIONS.CONSENT_TEMPLATES_VIEW, PERMISSIONS.CONSENT_TEMPLATES_CREATE,
      PERMISSIONS.CONSENT_TEMPLATES_EDIT, PERMISSIONS.CONSENT_TEMPLATES_DELETE,
      // Finances
      PERMISSIONS.INVOICES_VIEW, PERMISSIONS.INVOICES_CREATE, PERMISSIONS.INVOICES_EDIT,
      PERMISSIONS.INVOICES_DELETE, PERMISSIONS.INVOICES_SEND,
      PERMISSIONS.QUOTES_VIEW, PERMISSIONS.QUOTES_CREATE, PERMISSIONS.QUOTES_EDIT, PERMISSIONS.QUOTES_DELETE,
      // Analytics
      PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.ANALYTICS_EXPORT,
      // Administration des utilisateurs
      PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_READ, PERMISSIONS.USERS_CREATE,
      PERMISSIONS.USERS_EDIT, PERMISSIONS.USERS_UPDATE, PERMISSIONS.USERS_DELETE,
      PERMISSIONS.USERS_PERMISSIONS, PERMISSIONS.USERS_EXPORT,
      // Rôles (gestion complète)
      PERMISSIONS.ROLES_VIEW, PERMISSIONS.ROLES_CREATE, PERMISSIONS.ROLES_EDIT, PERMISSIONS.ROLES_DELETE,
      // Équipes et délégations
      PERMISSIONS.TEAMS_VIEW, PERMISSIONS.TEAMS_READ, PERMISSIONS.TEAMS_CREATE,
      PERMISSIONS.TEAMS_EDIT, PERMISSIONS.TEAMS_UPDATE, PERMISSIONS.TEAMS_DELETE, PERMISSIONS.TEAMS_EXPORT,
      PERMISSIONS.DELEGATIONS_VIEW, PERMISSIONS.DELEGATIONS_CREATE, PERMISSIONS.DELEGATIONS_EDIT,
      PERMISSIONS.DELEGATIONS_APPROVE, PERMISSIONS.DELEGATIONS_REVOKE,
      // Audit
      PERMISSIONS.AUDIT_VIEW, PERMISSIONS.AUDIT_EXPORT,
      // Paramètres
      PERMISSIONS.SETTINGS_VIEW, PERMISSIONS.SETTINGS_EDIT, PERMISSIONS.SETTINGS_CLINIC
    ],
    color: 'blue'
  },
  physician: {
    id: 'physician',
    name: 'Médecin',
    description: 'Médecin (généraliste ou spécialiste) - Accès complet aux données médicales de ses patients',
    level: 70,
    isSystemRole: true,
    isHealthcareProfessional: true, // Soignant - accès données médicales autorisé
    permissions: [
      // Patients - Données admin
      PERMISSIONS.PATIENTS_VIEW, PERMISSIONS.PATIENTS_CREATE, PERMISSIONS.PATIENTS_EDIT,
      // Rendez-vous
      PERMISSIONS.APPOINTMENTS_VIEW, PERMISSIONS.APPOINTMENTS_CREATE, PERMISSIONS.APPOINTMENTS_EDIT,
      PERMISSIONS.APPOINTMENTS_DELETE,
      // DONNÉES MÉDICALES COMPLÈTES (Secret partagé - équipe de soins)
      PERMISSIONS.MEDICAL_RECORDS_VIEW, PERMISSIONS.MEDICAL_RECORDS_CREATE, PERMISSIONS.MEDICAL_RECORDS_EDIT,
      PERMISSIONS.MEDICAL_NOTES_CREATE,
      PERMISSIONS.MEDICAL_ANTECEDENTS_VIEW, PERMISSIONS.MEDICAL_ANTECEDENTS_EDIT,
      PERMISSIONS.MEDICAL_PRESCRIPTIONS_VIEW, PERMISSIONS.MEDICAL_PRESCRIPTIONS_CREATE,
      PERMISSIONS.MEDICAL_ALLERGIES_VIEW, PERMISSIONS.MEDICAL_ALLERGIES_EDIT,
      PERMISSIONS.MEDICAL_VITALS_VIEW, PERMISSIONS.MEDICAL_VITALS_EDIT,
      // Consentements - Consultation état des consentements patient (si équipe de soins)
      PERMISSIONS.CONSENTS_VIEW, PERMISSIONS.CONSENTS_CREATE, PERMISSIONS.CONSENTS_EDIT,
      PERMISSIONS.CONSENTS_SIGN, PERMISSIONS.CONSENTS_REVOKE,
      PERMISSIONS.CONSENT_TEMPLATES_VIEW, // Lecture seule des templates
      // Finances (devis uniquement)
      PERMISSIONS.QUOTES_VIEW, PERMISSIONS.QUOTES_CREATE, PERMISSIONS.QUOTES_EDIT,
      // Analytics incluant stats médicales
      PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.ANALYTICS_MEDICAL,
      // Équipes
      PERMISSIONS.TEAMS_VIEW, PERMISSIONS.DELEGATIONS_VIEW, PERMISSIONS.DELEGATIONS_CREATE,
      // Paramètres
      PERMISSIONS.SETTINGS_VIEW
    ],
    color: 'green'
  },
  practitioner: {
    id: 'practitioner',
    name: 'Praticien de santé',
    description: 'Professionnel de santé (infirmier, kiné, etc.) - Accès aux données patients et médicales',
    level: 50,
    isSystemRole: true,
    isHealthcareProfessional: true,
    permissions: [
      // Patients - Accès complet (Option B: clinic-wide)
      PERMISSIONS.PATIENTS_VIEW, PERMISSIONS.PATIENTS_CREATE, PERMISSIONS.PATIENTS_EDIT,
      PERMISSIONS.PATIENTS_VIEW_ALL,              // Voir tous les patients de la clinique
      // Rendez-vous
      PERMISSIONS.APPOINTMENTS_VIEW, PERMISSIONS.APPOINTMENTS_CREATE, PERMISSIONS.APPOINTMENTS_EDIT,
      // DONNÉES MÉDICALES - Accès complet pour les soins
      PERMISSIONS.MEDICAL_RECORDS_VIEW,           // Consulter les dossiers médicaux
      PERMISSIONS.MEDICAL_RECORDS_CREATE,         // Créer des entrées médicales
      PERMISSIONS.MEDICAL_RECORDS_EDIT,           // Modifier les dossiers médicaux
      PERMISSIONS.MEDICAL_RECORDS_DELETE,         // Supprimer les dossiers médicaux
      PERMISSIONS.MEDICAL_NOTES_CREATE,           // Créer des notes (soins infirmiers)
      PERMISSIONS.MEDICAL_ALLERGIES_VIEW,         // CRITIQUE: allergies pour sécurité des soins
      PERMISSIONS.MEDICAL_VITALS_VIEW,            // Constantes vitales
      PERMISSIONS.MEDICAL_VITALS_EDIT,            // Saisie constantes vitales
      PERMISSIONS.MEDICAL_PRESCRIPTIONS_VIEW,     // Voir les prescriptions à exécuter
      // Consentements - Consultation
      PERMISSIONS.CONSENTS_VIEW,
      PERMISSIONS.CONSENT_TEMPLATES_VIEW,         // Lecture seule des templates
      // Paramètres
      PERMISSIONS.SETTINGS_VIEW
    ],
    color: 'teal'
  },
  secretary: {
    id: 'secretary',
    name: 'Secrétaire médical(e)',
    description: 'Gestion administrative - SANS accès aux données médicales',
    level: 30,
    isSystemRole: true,
    isHealthcareProfessional: false, // Personnel administratif
    permissions: [
      // Patients - Données administratives UNIQUEMENT
      PERMISSIONS.PATIENTS_VIEW, PERMISSIONS.PATIENTS_CREATE, PERMISSIONS.PATIENTS_EDIT,
      PERMISSIONS.PATIENTS_VIEW_ALL,
      // Rendez-vous - Gestion complète
      PERMISSIONS.APPOINTMENTS_VIEW, PERMISSIONS.APPOINTMENTS_CREATE, PERMISSIONS.APPOINTMENTS_EDIT,
      PERMISSIONS.APPOINTMENTS_DELETE, PERMISSIONS.APPOINTMENTS_VIEW_ALL,
      PERMISSIONS.APPOINTMENTS_VIEW_PRACTITIONER,
      // PAS DE DONNÉES MÉDICALES (Secret médical - Art. L1110-4 CSP)
      // Consentements - Attribution et signature (pas de création de templates)
      PERMISSIONS.CONSENTS_VIEW, PERMISSIONS.CONSENTS_ASSIGN,
      PERMISSIONS.CONSENT_TEMPLATES_VIEW, // Consultation des templates uniquement
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
    description: 'Accès consultation - Données administratives uniquement',
    level: 10,
    isSystemRole: true,
    isHealthcareProfessional: false,
    permissions: [
      // Patients - Lecture admin uniquement
      PERMISSIONS.PATIENTS_VIEW,
      // Rendez-vous - Lecture
      PERMISSIONS.APPOINTMENTS_VIEW,
      // PAS DE DONNÉES MÉDICALES
      // Finances - Lecture
      PERMISSIONS.INVOICES_VIEW, PERMISSIONS.QUOTES_VIEW,
      // Analytics - Lecture
      PERMISSIONS.ANALYTICS_VIEW,
      // Paramètres
      PERMISSIONS.SETTINGS_VIEW
    ],
    color: 'gray'
  }
};

// ============================================================================
// CATÉGORIES DE PERMISSIONS POUR L'INTERFACE
// ============================================================================
// Organisées par type d'accès: Admin vs Médical
// ============================================================================

export const PERMISSION_CATEGORIES = {
  // =========================================================================
  // DONNÉES ADMINISTRATIVES (tout le personnel autorisé)
  // =========================================================================
  patients_admin: {
    name: 'Patients - Données administratives',
    icon: 'Users',
    description: 'Identité, coordonnées, assurance (pas de données médicales)',
    isMedicalData: false,
    permissions: [
      PERMISSIONS.PATIENTS_VIEW, PERMISSIONS.PATIENTS_CREATE, PERMISSIONS.PATIENTS_EDIT,
      PERMISSIONS.PATIENTS_DELETE, PERMISSIONS.PATIENTS_EXPORT, PERMISSIONS.PATIENTS_VIEW_ALL
    ]
  },
  appointments: {
    name: 'Rendez-vous',
    icon: 'Calendar',
    description: 'Planification et gestion des rendez-vous',
    isMedicalData: false,
    permissions: [
      PERMISSIONS.APPOINTMENTS_VIEW, PERMISSIONS.APPOINTMENTS_CREATE, PERMISSIONS.APPOINTMENTS_EDIT,
      PERMISSIONS.APPOINTMENTS_DELETE, PERMISSIONS.APPOINTMENTS_VIEW_ALL,
      PERMISSIONS.APPOINTMENTS_VIEW_PRACTITIONER
    ]
  },
  finance: {
    name: 'Facturation',
    icon: 'DollarSign',
    description: 'Factures et devis',
    isMedicalData: false,
    permissions: [
      PERMISSIONS.INVOICES_VIEW, PERMISSIONS.INVOICES_CREATE, PERMISSIONS.INVOICES_EDIT,
      PERMISSIONS.INVOICES_DELETE, PERMISSIONS.INVOICES_SEND,
      PERMISSIONS.QUOTES_VIEW, PERMISSIONS.QUOTES_CREATE, PERMISSIONS.QUOTES_EDIT, PERMISSIONS.QUOTES_DELETE
    ]
  },

  // =========================================================================
  // DONNÉES MÉDICALES (professionnels de santé uniquement)
  // Secret médical - Article L1110-4 du Code de la santé publique
  // =========================================================================
  medical_records: {
    name: 'Dossiers médicaux',
    icon: 'FileText',
    description: 'Accès aux dossiers médicaux - RÉSERVÉ aux soignants',
    isMedicalData: true,
    warning: SENSITIVE_PERMISSIONS.MEDICAL_WARNING,
    permissions: [
      PERMISSIONS.MEDICAL_RECORDS_VIEW, PERMISSIONS.MEDICAL_RECORDS_CREATE,
      PERMISSIONS.MEDICAL_RECORDS_EDIT, PERMISSIONS.MEDICAL_RECORDS_DELETE,
      PERMISSIONS.MEDICAL_RECORDS_VIEW_ALL
    ]
  },
  medical_details: {
    name: 'Données médicales spécifiques',
    icon: 'Heart',
    description: 'Antécédents, prescriptions, allergies, constantes - RÉSERVÉ aux soignants',
    isMedicalData: true,
    warning: SENSITIVE_PERMISSIONS.MEDICAL_WARNING,
    permissions: [
      PERMISSIONS.MEDICAL_ANTECEDENTS_VIEW, PERMISSIONS.MEDICAL_ANTECEDENTS_EDIT,
      PERMISSIONS.MEDICAL_PRESCRIPTIONS_VIEW, PERMISSIONS.MEDICAL_PRESCRIPTIONS_CREATE,
      PERMISSIONS.MEDICAL_ALLERGIES_VIEW, PERMISSIONS.MEDICAL_ALLERGIES_EDIT,
      PERMISSIONS.MEDICAL_VITALS_VIEW, PERMISSIONS.MEDICAL_VITALS_EDIT
    ]
  },
  consents: {
    name: 'Consentements patients',
    icon: 'Shield',
    description: 'Gestion des consentements patients (attribution, signature)',
    isMedicalData: false, // Attribution par secrétaire, consultation par soignants
    permissions: [
      PERMISSIONS.CONSENTS_VIEW, PERMISSIONS.CONSENTS_CREATE, PERMISSIONS.CONSENTS_EDIT,
      PERMISSIONS.CONSENTS_DELETE, PERMISSIONS.CONSENTS_REVOKE, PERMISSIONS.CONSENTS_ASSIGN
    ]
  },
  consent_templates: {
    name: 'Modèles de consentements',
    icon: 'FileCheck',
    description: 'Gestion des modèles de consentements (Admin clinique)',
    isMedicalData: false,
    permissions: [
      PERMISSIONS.CONSENT_TEMPLATES_VIEW, PERMISSIONS.CONSENT_TEMPLATES_CREATE,
      PERMISSIONS.CONSENT_TEMPLATES_EDIT, PERMISSIONS.CONSENT_TEMPLATES_DELETE
    ]
  },

  // =========================================================================
  // ADMINISTRATION ET SYSTÈME
  // =========================================================================
  analytics: {
    name: 'Statistiques',
    icon: 'BarChart3',
    description: 'Rapports et analyses',
    isMedicalData: false,
    permissions: [
      PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.ANALYTICS_EXPORT, PERMISSIONS.ANALYTICS_ADMIN,
      PERMISSIONS.ANALYTICS_MEDICAL
    ]
  },
  users: {
    name: 'Gestion des utilisateurs',
    icon: 'UserCog',
    description: 'Création et gestion des comptes',
    isMedicalData: false,
    permissions: [
      PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_READ, PERMISSIONS.USERS_CREATE,
      PERMISSIONS.USERS_EDIT, PERMISSIONS.USERS_UPDATE, PERMISSIONS.USERS_DELETE,
      PERMISSIONS.USERS_PERMISSIONS, PERMISSIONS.USERS_EXPORT
    ]
  },
  roles: {
    name: 'Gestion des rôles',
    icon: 'ShieldCheck',
    description: 'Configuration des rôles et permissions',
    isMedicalData: false,
    permissions: [
      PERMISSIONS.ROLES_VIEW, PERMISSIONS.ROLES_CREATE, PERMISSIONS.ROLES_EDIT, PERMISSIONS.ROLES_DELETE
    ]
  },
  teams: {
    name: 'Équipes et délégations',
    icon: 'Users2',
    description: 'Organisation des équipes',
    isMedicalData: false,
    permissions: [
      PERMISSIONS.TEAMS_VIEW, PERMISSIONS.TEAMS_READ, PERMISSIONS.TEAMS_CREATE,
      PERMISSIONS.TEAMS_EDIT, PERMISSIONS.TEAMS_UPDATE, PERMISSIONS.TEAMS_DELETE, PERMISSIONS.TEAMS_EXPORT,
      PERMISSIONS.DELEGATIONS_VIEW, PERMISSIONS.DELEGATIONS_CREATE, PERMISSIONS.DELEGATIONS_EDIT,
      PERMISSIONS.DELEGATIONS_APPROVE, PERMISSIONS.DELEGATIONS_REVOKE
    ]
  },
  audit: {
    name: 'Audit et traçabilité',
    icon: 'FileSearch',
    description: 'Journaux d\'accès (RGPD)',
    isMedicalData: false,
    permissions: [
      PERMISSIONS.AUDIT_VIEW, PERMISSIONS.AUDIT_EXPORT, PERMISSIONS.AUDIT_MANAGE, PERMISSIONS.AUDIT_DELETE
    ]
  },
  system: {
    name: 'Système',
    icon: 'Server',
    description: 'Configuration système',
    isMedicalData: false,
    permissions: [
      PERMISSIONS.SYSTEM_SETTINGS, PERMISSIONS.SYSTEM_BACKUP, PERMISSIONS.SYSTEM_AUDIT
    ]
  },
  settings: {
    name: 'Paramètres',
    icon: 'Cog',
    description: 'Paramètres de l\'application',
    isMedicalData: false,
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
    if (roles) {
      const parsed = JSON.parse(roles);
      if (parsed && parsed.length > 0) {
        return parsed;
      }
    }
    // Fallback sur les rôles système par défaut
    return Object.values(DEFAULT_ROLES);
  },

  getRole: (roleId) => {
    const roles = permissionsStorage.getRoles();
    return roles.find(role => role.id === roleId);
  },

  // Alias pour compatibilité
  getAllRoles: () => {
    return permissionsStorage.getRoles();
  },

  getRoleById: (roleId) => {
    return permissionsStorage.getRole(roleId);
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

    const currentRole = roles[roleIndex];

    // Pour les rôles système: seules les permissions peuvent être modifiées
    if (currentRole.isSystemRole) {
      // Vérifier qu'on ne modifie que les permissions
      const allowedUpdates = ['permissions'];
      const attemptedUpdates = Object.keys(updates);
      const forbiddenUpdates = attemptedUpdates.filter(key => !allowedUpdates.includes(key));

      if (forbiddenUpdates.length > 0 && !forbiddenUpdates.every(k => updates[k] === currentRole[k])) {
        // Si on essaie de modifier autre chose que les permissions (et avec une valeur différente)
        console.warn(`[permissionsStorage] Tentative de modification non autorisée sur rôle système: ${forbiddenUpdates.join(', ')}`);
      }

      // Appliquer uniquement les permissions pour les rôles système
      roles[roleIndex] = {
        ...currentRole,
        permissions: updates.permissions || currentRole.permissions,
        updatedAt: new Date().toISOString()
      };
    } else {
      // Pour les rôles personnalisés: toutes les modifications sont autorisées
      roles[roleIndex] = {
        ...currentRole,
        ...updates,
        updatedAt: new Date().toISOString()
      };
    }

    localStorage.setItem('clinic_roles', JSON.stringify(roles));
    return roles[roleIndex];
  },

  // Mettre à jour les permissions d'un rôle système
  updateSystemRolePermissions: (roleId, permissions) => {
    const roles = permissionsStorage.getRoles();
    const roleIndex = roles.findIndex(role => role.id === roleId);

    if (roleIndex === -1) {
      throw new Error(`Rôle ${roleId} introuvable`);
    }

    if (!roles[roleIndex].isSystemRole) {
      throw new Error('Cette fonction est réservée aux rôles système');
    }

    roles[roleIndex] = {
      ...roles[roleIndex],
      permissions: permissions,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem('clinic_roles', JSON.stringify(roles));
    return roles[roleIndex];
  },

  // Réinitialiser un rôle système à ses permissions par défaut
  resetSystemRoleToDefault: (roleId) => {
    const defaultRole = DEFAULT_ROLES[roleId];
    if (!defaultRole) {
      throw new Error(`Rôle système ${roleId} introuvable dans les définitions par défaut`);
    }

    const roles = permissionsStorage.getRoles();
    const roleIndex = roles.findIndex(role => role.id === roleId);

    if (roleIndex === -1) {
      throw new Error(`Rôle ${roleId} introuvable`);
    }

    roles[roleIndex] = {
      ...roles[roleIndex],
      permissions: defaultRole.permissions,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem('clinic_roles', JSON.stringify(roles));
    return roles[roleIndex];
  },

  // Vérifier si une permission est médicale (secret médical)
  isMedicalPermission: (permission) => {
    return SENSITIVE_PERMISSIONS.MEDICAL_ACCESS.includes(permission);
  },

  // Obtenir les rôles système uniquement
  getSystemRoles: () => {
    return Object.values(DEFAULT_ROLES);
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

    // user.permissions peut être soit un objet JSON (depuis la DB) soit un tableau
    let customPermissions = [];
    if (user.permissions) {
      if (Array.isArray(user.permissions)) {
        customPermissions = user.permissions;
      } else if (typeof user.permissions === 'object') {
        // Convertir l'objet de permissions en tableau de permissions
        // Exemple: {"patients": {"read": true}} => ["patients:read"]
        customPermissions = Object.entries(user.permissions).flatMap(([resource, actions]) => {
          if (typeof actions === 'object' && actions !== null) {
            return Object.entries(actions)
              .filter(([action, value]) => value === true)
              .map(([action]) => `${resource}:${action}`);
          }
          return [];
        });
      }
    }

    return [...new Set([...rolePermissions, ...customPermissions])];
  },

  // Utilitaires pour l'interface
  getPermissionsByCategory: () => {
    return PERMISSION_CATEGORIES;
  },

  // Obtenir toutes les permissions disponibles (pour l'interface)
  getAllPermissions: () => {
    // Retourne un tableau d'objets { id, name } pour chaque permission
    return Object.entries(PERMISSIONS).map(([key, value]) => ({
      id: value,
      name: permissionsStorage.getPermissionLabel(value)
    }));
  },

  getPermissionLabel: (permission) => {
    const labels = {
      // =========================================================================
      // DONNÉES ADMINISTRATIVES
      // =========================================================================

      // Patients - Données admin
      [PERMISSIONS.PATIENTS_VIEW]: 'Voir les patients (données admin)',
      [PERMISSIONS.PATIENTS_CREATE]: 'Créer des dossiers patients',
      [PERMISSIONS.PATIENTS_EDIT]: 'Modifier les données admin patients',
      [PERMISSIONS.PATIENTS_DELETE]: 'Supprimer/archiver les patients',
      [PERMISSIONS.PATIENTS_EXPORT]: 'Exporter les données patients',
      [PERMISSIONS.PATIENTS_VIEW_ALL]: 'Voir tous les patients',

      // Rendez-vous
      [PERMISSIONS.APPOINTMENTS_VIEW]: 'Voir les rendez-vous',
      [PERMISSIONS.APPOINTMENTS_CREATE]: 'Créer des rendez-vous',
      [PERMISSIONS.APPOINTMENTS_EDIT]: 'Modifier les rendez-vous',
      [PERMISSIONS.APPOINTMENTS_DELETE]: 'Supprimer les rendez-vous',
      [PERMISSIONS.APPOINTMENTS_VIEW_ALL]: 'Voir tous les rendez-vous',
      [PERMISSIONS.APPOINTMENTS_VIEW_PRACTITIONER]: 'Voir le nom du praticien',

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

      // =========================================================================
      // DONNÉES MÉDICALES (Secret médical - Art. L1110-4 CSP)
      // =========================================================================

      // Dossiers médicaux
      [PERMISSIONS.MEDICAL_RECORDS_VIEW]: '🏥 Consulter les dossiers médicaux',
      [PERMISSIONS.MEDICAL_RECORDS_CREATE]: '🏥 Créer des entrées médicales',
      [PERMISSIONS.MEDICAL_RECORDS_EDIT]: '🏥 Modifier les dossiers médicaux',
      [PERMISSIONS.MEDICAL_RECORDS_DELETE]: '🏥 Supprimer des entrées médicales',
      [PERMISSIONS.MEDICAL_RECORDS_VIEW_ALL]: '🏥 Voir tous les dossiers médicaux',
      [PERMISSIONS.MEDICAL_NOTES_CREATE]: '🏥 Créer des notes médicales',

      // Données médicales spécifiques
      [PERMISSIONS.MEDICAL_ANTECEDENTS_VIEW]: '🏥 Voir les antécédents médicaux',
      [PERMISSIONS.MEDICAL_ANTECEDENTS_EDIT]: '🏥 Modifier les antécédents',
      [PERMISSIONS.MEDICAL_PRESCRIPTIONS_VIEW]: '🏥 Voir les prescriptions',
      [PERMISSIONS.MEDICAL_PRESCRIPTIONS_CREATE]: '🏥 Créer des prescriptions',
      [PERMISSIONS.MEDICAL_ALLERGIES_VIEW]: '🏥 Voir les allergies (critique)',
      [PERMISSIONS.MEDICAL_ALLERGIES_EDIT]: '🏥 Modifier les allergies',
      [PERMISSIONS.MEDICAL_VITALS_VIEW]: '🏥 Voir les constantes vitales',
      [PERMISSIONS.MEDICAL_VITALS_EDIT]: '🏥 Saisir les constantes vitales',

      // Consentements
      [PERMISSIONS.CONSENTS_VIEW]: 'Voir les consentements',
      [PERMISSIONS.CONSENTS_CREATE]: 'Créer des consentements',
      [PERMISSIONS.CONSENTS_EDIT]: 'Modifier les consentements',
      [PERMISSIONS.CONSENTS_DELETE]: 'Supprimer les consentements',
      [PERMISSIONS.CONSENTS_SIGN]: 'Signer les consentements',
      [PERMISSIONS.CONSENTS_REVOKE]: 'Révoquer les consentements',
      [PERMISSIONS.CONSENTS_ASSIGN]: 'Attribuer un consentement à un patient',

      // Templates de consentements
      [PERMISSIONS.CONSENT_TEMPLATES_VIEW]: 'Voir les modèles de consentements',
      [PERMISSIONS.CONSENT_TEMPLATES_CREATE]: 'Créer des modèles de consentements',
      [PERMISSIONS.CONSENT_TEMPLATES_EDIT]: 'Modifier les modèles de consentements',
      [PERMISSIONS.CONSENT_TEMPLATES_DELETE]: 'Supprimer des modèles de consentements',

      // =========================================================================
      // ADMINISTRATION ET SYSTÈME
      // =========================================================================

      // Analytics
      [PERMISSIONS.ANALYTICS_VIEW]: 'Voir les statistiques',
      [PERMISSIONS.ANALYTICS_EXPORT]: 'Exporter les statistiques',
      [PERMISSIONS.ANALYTICS_ADMIN]: 'Administration des statistiques',
      [PERMISSIONS.ANALYTICS_MEDICAL]: '🏥 Statistiques médicales',

      // Utilisateurs
      [PERMISSIONS.USERS_VIEW]: 'Voir les utilisateurs',
      [PERMISSIONS.USERS_READ]: 'Lire les utilisateurs',
      [PERMISSIONS.USERS_CREATE]: 'Créer des utilisateurs',
      [PERMISSIONS.USERS_EDIT]: 'Modifier les utilisateurs',
      [PERMISSIONS.USERS_UPDATE]: 'Mettre à jour les utilisateurs',
      [PERMISSIONS.USERS_DELETE]: 'Supprimer les utilisateurs',
      [PERMISSIONS.USERS_PERMISSIONS]: 'Gérer les permissions utilisateurs',
      [PERMISSIONS.USERS_EXPORT]: 'Exporter les utilisateurs',

      // Rôles
      [PERMISSIONS.ROLES_VIEW]: 'Voir les rôles',
      [PERMISSIONS.ROLES_CREATE]: 'Créer des rôles',
      [PERMISSIONS.ROLES_EDIT]: 'Modifier les permissions des rôles',
      [PERMISSIONS.ROLES_DELETE]: 'Supprimer des rôles',

      // Équipes
      [PERMISSIONS.TEAMS_VIEW]: 'Voir les équipes',
      [PERMISSIONS.TEAMS_READ]: 'Lire les équipes',
      [PERMISSIONS.TEAMS_CREATE]: 'Créer des équipes',
      [PERMISSIONS.TEAMS_EDIT]: 'Modifier les équipes',
      [PERMISSIONS.TEAMS_UPDATE]: 'Mettre à jour les équipes',
      [PERMISSIONS.TEAMS_DELETE]: 'Supprimer des équipes',
      [PERMISSIONS.TEAMS_EXPORT]: 'Exporter les équipes',

      // Délégations
      [PERMISSIONS.DELEGATIONS_VIEW]: 'Voir les délégations',
      [PERMISSIONS.DELEGATIONS_CREATE]: 'Créer des délégations',
      [PERMISSIONS.DELEGATIONS_EDIT]: 'Modifier les délégations',
      [PERMISSIONS.DELEGATIONS_APPROVE]: 'Approuver les délégations',
      [PERMISSIONS.DELEGATIONS_REVOKE]: 'Révoquer les délégations',

      // Audit (RGPD)
      [PERMISSIONS.AUDIT_VIEW]: 'Voir les journaux d\'audit',
      [PERMISSIONS.AUDIT_EXPORT]: 'Exporter les audits',
      [PERMISSIONS.AUDIT_MANAGE]: 'Gérer les audits',
      [PERMISSIONS.AUDIT_DELETE]: 'Supprimer les audits',

      // Système
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