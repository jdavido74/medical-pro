// contexts/LanguageContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

const LANGUAGE_STORAGE_KEY = 'clinicmanager_language';

const translations = {
  fr: {
    // Navigation
    nav: {
      home: 'Accueil',
      patients: 'Patients',
      appointments: 'Rendez-vous',
      medicalRecords: 'Dossiers médicaux',
      quotes: 'Devis',
      invoices: 'Factures',
      analytics: 'Statistiques médicales',
      settings: 'Paramètres'
    },

    // Sidebar
    sidebar: {
      home: 'Accueil',
      patients: 'Patients',
      appointments: 'Rendez-vous',
      medicalRecords: 'Dossiers médicaux',
      consents: 'Consentements',
      consentTemplates: 'Modèles de consentements',
      quotes: 'Devis',
      invoices: 'Factures',
      analytics: 'Statistiques',
      admin: 'Administration',
      settings: 'Paramètres',
      logout: 'Déconnexion'
    },

    // Modules
    modules: {
      home: {
        title: 'Accueil',
        description: 'Vue d\'ensemble de votre cabinet médical'
      },
      patients: {
        title: 'Gestion des patients',
        description: 'Gérez vos patients et leur suivi'
      },
      appointments: {
        title: 'Rendez-vous',
        description: 'Planifiez et organisez les consultations'
      },
      medicalRecords: {
        title: 'Dossiers médicaux',
        description: 'Consultations, diagnostics et prescriptions'
      },
      consents: {
        title: 'Gestion des consentements',
        description: 'Gérez les consentements RGPD et médicaux'
      },
      consentTemplates: {
        title: 'Modèles de consentements',
        description: 'Créez et gérez vos modèles de consentements personnalisés'
      },
      analytics: {
        title: 'Statistiques médicales',
        description: 'Analysez votre activité médicale'
      },
      settings: {
        title: 'Paramètres',
        description: 'Configurez votre cabinet et vos préférences'
      }
    },

    // Common
    common: {
      save: 'Enregistrer',
      cancel: 'Annuler',
      delete: 'Supprimer',
      edit: 'Modifier',
      add: 'Ajouter',
      search: 'Rechercher',
      loading: 'Chargement...',
      error: 'Erreur',
      success: 'Succès',
      required: 'Requis',
      optional: 'Optionnel',
      dashboard: 'Tableau de bord'
    },

    // Auth
    auth: {
      login: 'Connexion',
      signup: 'Créer un compte',
      logout: 'Déconnexion',
      forgotPassword: 'Mot de passe oublié',
      email: 'Email professionnel',
      password: 'Mot de passe',
      name: 'Nom complet',
      clinicName: 'Nom du cabinet médical',
      medicalNumber: 'Numéro ADELI/RPPS',
      loginSubtitle: 'Accédez à votre cabinet médical',
      signupSubtitle: 'Rejoignez ClinicManager et gérez votre cabinet médical',
      createAccount: 'Créer mon cabinet médical',
      alreadyAccount: 'Vous avez déjà un compte ?',
      noAccount: 'Pas encore de compte ?',
      acceptTerms: "J'accepte les conditions d'utilisation",
      dataCharter: 'charte de protection des données de santé',
      secureClinic: 'Cabinet sécurisé',
      secureDescription: 'Vos données médicales sont chiffrées et respectent le secret médical. Conformité RGPD santé garantie.'
    },

    // Home
    home: {
      welcome: 'Bonjour Dr {name}',
      welcomeSubtitle: 'Bienvenue dans votre cabinet médical numérique',
      clinic: 'Cabinet',
      totalPatients: 'Patients total',
      appointmentsMonth: 'RDV ce mois',
      consultations: 'Consultations',
      pending: 'En attente',
      dailyAppointments: 'Rendez-vous du jour',
      patientsWaiting: 'Patients en attente',
      emergencies: 'Urgences signalées',
      quickActions: 'Actions rapides',
      newPatient: 'Nouveau patient',
      newAppointment: 'Prendre rendez-vous',
      newConsultation: 'Nouvelle consultation',
      clinicConfiguration: 'Configuration de votre cabinet',
      configureClinic: 'Configurez votre cabinet',
      addPatients: 'Ajoutez vos premiers patients',
      planConsultations: 'Planifiez vos consultations',
      createFirstRecord: 'Créez votre premier dossier',
      medicalCompliance: 'Cabinet médical sécurisé et conforme',
      complianceDescription: 'ClinicManager respecte le secret médical, la protection des données de santé (RGPD) et s\'adapte aux exigences professionnelles des praticiens.'
    },

    // Patients
    patients: {
      title: 'Gestion des patients',
      subtitle: 'Gérez vos patients et leur suivi',
      newPatient: 'Nouveau patient',
      searchPatients: 'Rechercher un patient...',
      allPatients: 'Tous les patients',
      activePatients: 'Patients actifs',
      archivedPatients: 'Patients archivés',
      patientsList: 'Liste des patients',
      noPatients: 'Aucun patient pour l\'instant',
      noPatientsDescription: 'Commencez par ajouter votre premier patient pour pouvoir créer des consultations.',
      addPatient: 'Ajouter un patient',
      firstName: 'Prénom',
      lastName: 'Nom',
      birthDate: 'Date de naissance',
      socialSecurity: 'Numéro de sécurité sociale',
      phone: 'Téléphone',
      address: 'Adresse',
      emergencyContact: 'Contact d\'urgence'
    },

    // Appointments
    appointments: {
      title: 'Rendez-vous',
      subtitle: 'Planifiez et organisez les consultations',
      newAppointment: 'Nouveau rendez-vous',
      searchAppointments: 'Rechercher un rendez-vous...',
      today: 'Aujourd\'hui',
      thisWeek: 'Cette semaine',
      thisMonth: 'Ce mois',
      appointmentDate: 'Date du rendez-vous',
      appointmentTime: 'Heure',
      duration: 'Durée',
      reason: 'Motif',
      status: 'Statut',
      scheduled: 'Programmé',
      confirmed: 'Confirmé',
      completed: 'Terminé',
      cancelled: 'Annulé'
    },

    // Medical Records
    medicalRecords: {
      title: 'Dossiers médicaux',
      subtitle: 'Consultations, diagnostics et prescriptions',
      newRecord: 'Nouveau dossier',
      searchRecords: 'Rechercher un dossier...',
      consultationDate: 'Date de consultation',
      diagnosis: 'Diagnostic',
      treatment: 'Traitement',
      prescription: 'Ordonnance',
      symptoms: 'Symptômes',
      examination: 'Examen clinique',
      vitalSigns: 'Signes vitaux',
      followUp: 'Suivi'
    },

    // Settings
    settings: {
      title: 'Paramètres',
      subtitle: 'Configurez votre cabinet et vos préférences',
      clinic: 'Cabinet',
      medical: 'Médical',
      preferences: 'Préférences',
      security: 'Sécurité',
      clinicInfo: 'Informations du cabinet',
      practitionerInfo: 'Informations praticien',
      medicalSettings: 'Paramètres médicaux',
      language: 'Langue',
      theme: 'Thème',
      notifications: 'Notifications'
    },

    // Validation
    validation: {
      required: '{field} est requis',
      invalidEmail: 'Email invalide',
      invalidMedicalNumber: 'Numéro ADELI (9 chiffres) ou RPPS (11 chiffres) invalide',
      passwordTooShort: 'Le mot de passe doit contenir au moins 8 caractères',
      clinicNameRequired: 'Nom du cabinet requis'
    }
  },

  en: {
    // Navigation
    nav: {
      home: 'Home',
      patients: 'Patients',
      appointments: 'Appointments',
      medicalRecords: 'Medical Records',
      quotes: 'Quotes',
      invoices: 'Invoices',
      analytics: 'Medical Analytics',
      settings: 'Settings'
    },

    // Sidebar
    sidebar: {
      home: 'Home',
      patients: 'Patients',
      appointments: 'Appointments',
      medicalRecords: 'Medical Records',
      consents: 'Consents',
      consentTemplates: 'Consent Templates',
      quotes: 'Quotes',
      invoices: 'Invoices',
      analytics: 'Analytics',
      admin: 'Administration',
      settings: 'Settings',
      logout: 'Logout'
    },

    // Modules
    modules: {
      home: {
        title: 'Home',
        description: 'Overview of your medical practice'
      },
      patients: {
        title: 'Patient Management',
        description: 'Manage your patients and their follow-up'
      },
      appointments: {
        title: 'Appointments',
        description: 'Schedule and organize consultations'
      },
      medicalRecords: {
        title: 'Medical Records',
        description: 'Consultations, diagnostics and prescriptions'
      },
      consents: {
        title: 'Consent Management',
        description: 'Manage GDPR and medical consents'
      },
      consentTemplates: {
        title: 'Consent Templates',
        description: 'Create and manage your custom consent templates'
      },
      analytics: {
        title: 'Medical Statistics',
        description: 'Analyze your medical activity'
      },
      settings: {
        title: 'Settings',
        description: 'Configure your practice and preferences'
      }
    },

    // Common
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      search: 'Search',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      required: 'Required',
      optional: 'Optional',
      dashboard: 'Dashboard'
    },

    // Auth
    auth: {
      login: 'Login',
      signup: 'Create Account',
      logout: 'Logout',
      forgotPassword: 'Forgot Password',
      email: 'Professional Email',
      password: 'Password',
      name: 'Full Name',
      clinicName: 'Medical Practice Name',
      medicalNumber: 'ADELI/RPPS Number',
      loginSubtitle: 'Access your medical practice',
      signupSubtitle: 'Join ClinicManager and manage your medical practice',
      createAccount: 'Create my medical practice',
      alreadyAccount: 'Already have an account?',
      noAccount: 'Don\'t have an account yet?',
      acceptTerms: 'I accept the terms of use',
      dataCharter: 'health data protection charter',
      secureClinic: 'Secure Practice',
      secureDescription: 'Your medical data is encrypted and respects medical confidentiality. GDPR health compliance guaranteed.'
    },

    // Home
    home: {
      welcome: 'Hello Dr {name}',
      welcomeSubtitle: 'Welcome to your digital medical practice',
      clinic: 'Practice',
      totalPatients: 'Total Patients',
      appointmentsMonth: 'Appointments This Month',
      consultations: 'Consultations',
      pending: 'Pending',
      dailyAppointments: 'Today\'s Appointments',
      patientsWaiting: 'Patients Waiting',
      emergencies: 'Emergencies Reported',
      quickActions: 'Quick Actions',
      newPatient: 'New Patient',
      newAppointment: 'Schedule Appointment',
      newConsultation: 'New Consultation',
      clinicConfiguration: 'Practice Configuration',
      configureClinic: 'Configure your practice',
      addPatients: 'Add your first patients',
      planConsultations: 'Plan your consultations',
      createFirstRecord: 'Create your first record',
      medicalCompliance: 'Secure and compliant medical practice',
      complianceDescription: 'ClinicManager respects medical confidentiality, health data protection (GDPR) and adapts to practitioners\' professional requirements.'
    },

    // Appointments
    appointments: {
      title: 'Appointments',
      subtitle: 'Schedule and organize consultations',
      newAppointment: 'New Appointment',
      searchAppointments: 'Search appointment...',
      today: 'Today',
      thisWeek: 'This Week',
      thisMonth: 'This Month',
      appointmentDate: 'Appointment Date',
      appointmentTime: 'Time',
      duration: 'Duration',
      reason: 'Reason',
      status: 'Status',
      scheduled: 'Scheduled',
      confirmed: 'Confirmed',
      completed: 'Completed',
      cancelled: 'Cancelled'
    },

    // Medical Records
    medicalRecords: {
      title: 'Medical Records',
      subtitle: 'Consultations, diagnoses and prescriptions',
      newRecord: 'New Record',
      searchRecords: 'Search record...',
      consultationDate: 'Consultation Date',
      diagnosis: 'Diagnosis',
      treatment: 'Treatment',
      prescription: 'Prescription',
      symptoms: 'Symptoms',
      examination: 'Clinical Examination',
      vitalSigns: 'Vital Signs',
      followUp: 'Follow-up'
    },

    // Settings
    settings: {
      title: 'Settings',
      subtitle: 'Configure your practice and preferences',
      clinic: 'Practice',
      medical: 'Medical',
      preferences: 'Preferences',
      security: 'Security',
      clinicInfo: 'Practice Information',
      practitionerInfo: 'Practitioner Information',
      medicalSettings: 'Medical Settings',
      language: 'Language',
      theme: 'Theme',
      notifications: 'Notifications'
    },

    // Validation
    validation: {
      required: '{field} is required',
      invalidEmail: 'Invalid email',
      invalidMedicalNumber: 'Invalid ADELI (9 digits) or RPPS (11 digits) number',
      passwordTooShort: 'Password must be at least 8 characters',
      clinicNameRequired: 'Practice name required'
    }
  },

  es: {
    // Navigation
    nav: {
      home: 'Inicio',
      patients: 'Pacientes',
      appointments: 'Citas',
      medicalRecords: 'Historiales Médicos',
      analytics: 'Estadísticas Médicas',
      settings: 'Configuración'
    },

    // Sidebar
    sidebar: {
      home: 'Inicio',
      patients: 'Pacientes',
      appointments: 'Citas',
      medicalRecords: 'Historiales Médicos',
      consents: 'Consentimientos',
      consentTemplates: 'Plantillas de Consentimiento',
      quotes: 'Presupuestos',
      invoices: 'Facturas',
      analytics: 'Estadísticas',
      admin: 'Administración',
      settings: 'Configuración',
      logout: 'Cerrar Sesión'
    },

    // Modules
    modules: {
      home: {
        title: 'Inicio',
        description: 'Resumen de su consulta médica'
      },
      patients: {
        title: 'Gestión de Pacientes',
        description: 'Gestione sus pacientes y su seguimiento'
      },
      appointments: {
        title: 'Citas',
        description: 'Programe y organice las consultas'
      },
      medicalRecords: {
        title: 'Historiales Médicos',
        description: 'Consultas, diagnósticos y prescripciones'
      },
      consents: {
        title: 'Gestión de Consentimientos',
        description: 'Gestione consentimientos RGPD y médicos'
      },
      consentTemplates: {
        title: 'Plantillas de Consentimiento',
        description: 'Cree y gestione sus plantillas de consentimiento personalizadas'
      },
      analytics: {
        title: 'Estadísticas Médicas',
        description: 'Analice su actividad médica'
      },
      settings: {
        title: 'Configuración',
        description: 'Configure su consulta y preferencias'
      }
    },

    // Analytics
    analytics: {
      title: 'Módulo de Estadísticas Médicas',
      comingSoon: 'Esta funcionalidad estará disponible próximamente.'
    },

    // Common
    common: {
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      edit: 'Editar',
      add: 'Añadir',
      search: 'Buscar',
      loading: 'Cargando...',
      error: 'Error',
      success: 'Éxito',
      required: 'Requerido',
      optional: 'Opcional',
      premium: 'Premium',
      free: 'Gratuito',
      dashboard: 'Panel de Control'
    },

    // Auth
    auth: {
      login: 'Iniciar Sesión',
      signup: 'Crear Cuenta',
      logout: 'Cerrar Sesión',
      forgotPassword: 'Contraseña Olvidada',
      email: 'Email Profesional',
      password: 'Contraseña',
      name: 'Nombre Completo',
      clinicName: 'Nombre de la Consulta Médica',
      medicalNumber: 'Número de Colegiado',
      loginSubtitle: 'Accede a tu consulta médica',
      signupSubtitle: 'Únete a ClinicManager y gestiona tu consulta médica',
      createAccount: 'Crear mi consulta médica',
      alreadyAccount: '¿Ya tienes una cuenta?',
      noAccount: '¿No tienes cuenta aún?',
      acceptTerms: 'Acepto los términos de uso',
      dataCharter: 'carta de protección de datos de salud',
      secureClinic: 'Consulta Segura',
      secureDescription: 'Tus datos médicos están cifrados y respetan la confidencialidad médica. Cumplimiento RGPD sanitario garantizado.'
    },

    // Home
    home: {
      welcome: 'Hola Dr. {name}',
      welcomeSubtitle: 'Bienvenido a tu consulta médica digital',
      clinic: 'Consulta',
      totalPatients: 'Total Pacientes',
      appointmentsMonth: 'Citas Este Mes',
      consultations: 'Consultas',
      pending: 'Pendientes',
      dailyAppointments: 'Citas del Día',
      patientsWaiting: 'Pacientes Esperando',
      emergencies: 'Urgencias Reportadas',
      quickActions: 'Acciones Rápidas',
      newPatient: 'Nuevo Paciente',
      newAppointment: 'Programar Cita',
      newConsultation: 'Nueva Consulta',
      clinicConfiguration: 'Configuración de la Consulta',
      configureClinic: 'Configura tu consulta',
      addPatients: 'Añade tus primeros pacientes',
      planConsultations: 'Planifica tus consultas',
      createFirstRecord: 'Crea tu primer historial',
      medicalCompliance: 'Consulta médica segura y conforme',
      complianceDescription: 'ClinicManager respeta la confidencialidad médica, la protección de datos de salud (RGPD) y se adapta a los requisitos profesionales de los médicos.'
    },

    // Patients
    patients: {
      title: 'Gestión de Pacientes',
      subtitle: 'Gestiona tus pacientes y su seguimiento',
      newPatient: 'Nuevo Paciente',
      searchPatients: 'Buscar paciente...',
      allPatients: 'Todos los Pacientes',
      activePatients: 'Pacientes Activos',
      archivedPatients: 'Pacientes Archivados',
      patientsList: 'Lista de Pacientes',
      noPatients: 'No hay pacientes por ahora',
      noPatientsDescription: 'Comienza añadiendo tu primer paciente para poder crear consultas.',
      addPatient: 'Añadir Paciente',
      firstName: 'Nombre',
      lastName: 'Apellidos',
      birthDate: 'Fecha de Nacimiento',
      socialSecurity: 'Número de Seguridad Social',
      phone: 'Teléfono',
      address: 'Dirección',
      emergencyContact: 'Contacto de Emergencia'
    },

    // Appointments
    appointments: {
      title: 'Citas',
      subtitle: 'Planifica y organiza las consultas',
      newAppointment: 'Nueva Cita',
      searchAppointments: 'Buscar cita...',
      today: 'Hoy',
      thisWeek: 'Esta Semana',
      thisMonth: 'Este Mes',
      appointmentDate: 'Fecha de la Cita',
      appointmentTime: 'Hora',
      duration: 'Duración',
      reason: 'Motivo',
      status: 'Estado',
      scheduled: 'Programada',
      confirmed: 'Confirmada',
      completed: 'Completada',
      cancelled: 'Cancelada'
    },

    // Medical Records
    medicalRecords: {
      title: 'Historiales Médicos',
      subtitle: 'Consultas, diagnósticos y prescripciones',
      newRecord: 'Nuevo Historial',
      searchRecords: 'Buscar historial...',
      consultationDate: 'Fecha de Consulta',
      diagnosis: 'Diagnóstico',
      treatment: 'Tratamiento',
      prescription: 'Receta',
      symptoms: 'Síntomas',
      examination: 'Examen Clínico',
      vitalSigns: 'Signos Vitales',
      followUp: 'Seguimiento'
    },

    // Settings
    settings: {
      title: 'Configuración',
      subtitle: 'Configura tu consulta y preferencias',
      clinic: 'Consulta',
      medical: 'Médico',
      preferences: 'Preferencias',
      security: 'Seguridad',
      clinicInfo: 'Información de la Consulta',
      practitionerInfo: 'Información del Médico',
      medicalSettings: 'Configuración Médica',
      language: 'Idioma',
      theme: 'Tema',
      notifications: 'Notificaciones',
      tabs: {
        profile: 'Perfil',
        company: 'Consulta',
        catalog: 'Catálogo',
        security: 'Seguridad',
        billing: 'Facturación',
        notifications: 'Notificaciones'
      }
    },

    // Validation
    validation: {
      required: '{field} es requerido',
      invalidEmail: 'Email inválido',
      invalidMedicalNumber: 'Número de colegiado inválido',
      passwordTooShort: 'La contraseña debe tener al menos 8 caracteres',
      clinicNameRequired: 'Nombre de la consulta requerido'
    }
  }
};

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('es');

  useEffect(() => {
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage && translations[savedLanguage]) {
      setCurrentLanguage(savedLanguage);
    }
  }, []);

  const changeLanguage = (language) => {
    if (translations[language]) {
      setCurrentLanguage(language);
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    }
  };

  const t = (key, params = {}) => {
    const keys = key.split('.');
    let value = translations[currentLanguage];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key; // Retourner la clé si la traduction n'existe pas
      }
    }

    // Remplacer les paramètres dans la traduction
    if (typeof value === 'string' && Object.keys(params).length > 0) {
      return Object.keys(params).reduce((str, param) => {
        return str.replace(`{${param}}`, params[param]);
      }, value);
    }

    return value;
  };

  const value = {
    currentLanguage,
    changeLanguage,
    t,
    availableLanguages: Object.keys(translations)
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};