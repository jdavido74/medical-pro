// contexts/MedicalModulesContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useDynamicTranslations } from './DynamicTranslationsContext';

const MedicalModulesContext = createContext();

// Configuration des modules médicaux par spécialité
const MEDICAL_SPECIALTIES = {
  general: {
    id: 'general',
    name: 'Medicina General',
    code: 'MG',
    color: 'green',
    icon: 'stethoscope',
    modules: ['base', 'preventive', 'chronic']
  },
  cardiology: {
    id: 'cardiology',
    name: 'Cardiología',
    code: 'CAR',
    color: 'red',
    icon: 'heart',
    modules: ['base', 'cardiac', 'ecg', 'stress_test']
  },
  dermatology: {
    id: 'dermatology',
    name: 'Dermatología',
    code: 'DER',
    color: 'orange',
    icon: 'eye',
    modules: ['base', 'skin', 'biopsy', 'dermatoscopy']
  },
  pediatrics: {
    id: 'pediatrics',
    name: 'Pediatría',
    code: 'PED',
    color: 'blue',
    icon: 'baby',
    modules: ['base', 'pediatric', 'vaccines', 'growth']
  },
  gynecology: {
    id: 'gynecology',
    name: 'Ginecología',
    code: 'GIN',
    color: 'pink',
    icon: 'user',
    modules: ['base', 'gyneco', 'pregnancy', 'contraception']
  },
  orthopedics: {
    id: 'orthopedics',
    name: 'Traumatología',
    code: 'TRA',
    color: 'gray',
    icon: 'zap',
    modules: ['base', 'orthopedic', 'fractures', 'rehabilitation']
  }
};

// Modules médicaux disponibles
const MEDICAL_MODULES = {
  // Module de base - Obligatoire pour tous
  base: {
    id: 'base',
    name: 'Dossier Médical de Base',
    category: 'core',
    required: true,
    components: ['basicInfo', 'vitalSigns', 'symptoms', 'diagnosis', 'treatment'],
    permissions: ['read', 'write']
  },

  // Modules spécialisés
  cardiac: {
    id: 'cardiac',
    name: 'Module Cardiologique',
    category: 'specialty',
    specialty: 'cardiology',
    components: ['ecg', 'heartRate', 'bloodPressure', 'cardiacExam'],
    permissions: ['read', 'write'],
    requiredRole: 'cardiologist'
  },

  pediatric: {
    id: 'pediatric',
    name: 'Module Pédiatrique',
    category: 'specialty',
    specialty: 'pediatrics',
    components: ['growth', 'development', 'vaccines', 'pediatricExam'],
    permissions: ['read', 'write'],
    requiredRole: 'pediatrician'
  },

  gyneco: {
    id: 'gyneco',
    name: 'Module Gynécologique',
    category: 'specialty',
    specialty: 'gynecology',
    components: ['menstrualCycle', 'pregnancy', 'gynecologicExam'],
    permissions: ['read', 'write'],
    requiredRole: 'gynecologist'
  },

  skin: {
    id: 'skin',
    name: 'Module Dermatologique',
    category: 'specialty',
    specialty: 'dermatology',
    components: ['skinExam', 'lesions', 'dermatoscopy', 'biopsy'],
    permissions: ['read', 'write'],
    requiredRole: 'dermatologist'
  },

  orthopedic: {
    id: 'orthopedic',
    name: 'Module Orthopédique',
    category: 'specialty',
    specialty: 'orthopedics',
    components: ['jointsExam', 'fractures', 'mobility', 'rehabilitation'],
    permissions: ['read', 'write'],
    requiredRole: 'orthopedist'
  },

  // Modules complémentaires
  preventive: {
    id: 'preventive',
    name: 'Médecine Préventive',
    category: 'complementary',
    components: ['screening', 'vaccines', 'riskFactors'],
    permissions: ['read', 'write']
  },

  chronic: {
    id: 'chronic',
    name: 'Suivi des Maladies Chroniques',
    category: 'complementary',
    components: ['chronicDisease', 'medication', 'followUp'],
    permissions: ['read', 'write']
  }
};

// Rôles et permissions - Standardisés
const USER_ROLES = {
  super_admin: {
    name: 'Super Administrateur',
    permissions: ['*'],
    specialties: ['*'],
    modules: ['*']
  },
  admin: {
    name: 'Administrateur',
    permissions: ['read', 'write', 'manage'],
    specialties: ['*'],
    modules: ['*']
  },
  physician: {
    name: 'Médecin',
    permissions: ['read', 'write'],
    specialties: [], // À définir selon le praticien
    modules: [] // À définir selon les spécialités
  },
  practitioner: {
    name: 'Praticien de santé',
    permissions: ['read', 'write_limited'],
    specialties: [],
    modules: ['base', 'preventive']
  },
  secretary: {
    name: 'Secrétaire Médical',
    permissions: ['read'],
    specialties: [],
    modules: ['base']
  }
};

export const MedicalModulesProvider = ({ children }) => {
  const { user } = useAuth();
  const dynamicTranslations = useDynamicTranslations();
  const [availableModules, setAvailableModules] = useState([]);
  const [userSpecialties, setUserSpecialties] = useState([]);
  const [activeModules, setActiveModules] = useState(['base']);
  const [dynamicSpecialties, setDynamicSpecialties] = useState({});
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  useEffect(() => {
    if (user && !dynamicTranslations.isLoading) {
      initializeUserModules();
    }
  }, [user, dynamicTranslations.isLoading]);

  useEffect(() => {
    if (!dynamicTranslations.isLoading) {
      loadDynamicConfiguration();
    }
  }, [dynamicTranslations.isLoading]);

  const loadDynamicConfiguration = async () => {
    setIsLoadingConfig(true);
    try {
      // Charger les spécialités dynamiques depuis le service de traductions
      const specialties = dynamicTranslations.getAvailableSpecialties();
      const dynamicSpecialtiesConfig = {};

      // Convertir les spécialités en configuration utilisable
      specialties.forEach(specialty => {
        dynamicSpecialtiesConfig[specialty.id] = {
          ...MEDICAL_SPECIALTIES[specialty.id], // Récupérer config de base si elle existe
          id: specialty.id,
          name: specialty.name,
          description: specialty.description,
          // Configuration par défaut si pas dans MEDICAL_SPECIALTIES
          code: specialty.id.substring(0, 3).toUpperCase(),
          color: 'blue',
          icon: 'stethoscope',
          modules: ['base', specialty.id] // Module de base + module spécialisé
        };
      });

      setDynamicSpecialties(dynamicSpecialtiesConfig);
    } catch (error) {
      console.error('Error loading dynamic configuration:', error);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const initializeUserModules = () => {
    if (!user || isLoadingConfig) return;

    // Déterminer les spécialités de l'utilisateur
    const specialties = getUserSpecialties(user);
    setUserSpecialties(specialties);

    // Déterminer les modules disponibles
    const modules = getAvailableModules(user, specialties);
    setAvailableModules(modules);

    // Activer les modules de base
    setActiveModules(['base', ...getDefaultActiveModules(specialties)]);
  };

  const getUserSpecialties = (user) => {
    // Logique pour déterminer les spécialités selon l'utilisateur
    // Ceci serait normalement récupéré depuis le profil utilisateur
    const specialties = user.specialties || [];

    // Si pas de spécialité définie, utiliser médecine générale par défaut
    if (specialties.length === 0 && user.role === 'physician') {
      return ['general'];
    }

    return specialties;
  };

  const getAvailableModules = (user, specialties) => {
    const userRole = USER_ROLES[user.role] || USER_ROLES.physician;
    const availableModules = [];

    // Toujours ajouter le module de base
    const baseModule = {
      ...MEDICAL_MODULES.base,
      name: dynamicTranslations.getModuleTranslation('base', 'name') || MEDICAL_MODULES.base.name
    };
    availableModules.push(baseModule);

    // Ajouter les modules selon les spécialités (statiques et dynamiques)
    specialties.forEach(specialty => {
      // Vérifier d'abord dans les spécialités dynamiques
      const dynamicSpecialtyConfig = dynamicSpecialties[specialty];
      const staticSpecialtyConfig = MEDICAL_SPECIALTIES[specialty];

      const specialtyConfig = dynamicSpecialtyConfig || staticSpecialtyConfig;

      if (specialtyConfig && specialtyConfig.modules) {
        specialtyConfig.modules.forEach(moduleId => {
          const staticModule = MEDICAL_MODULES[moduleId];
          if (staticModule && hasPermissionForModule(user, staticModule)) {
            // Enrichir avec les traductions dynamiques
            const enrichedModule = {
              ...staticModule,
              name: dynamicTranslations.getModuleTranslation(moduleId, 'name') || staticModule.name
            };

            // Éviter les doublons
            if (!availableModules.find(m => m.id === moduleId)) {
              availableModules.push(enrichedModule);
            }
          }
        });
      }
    });

    // Ajouter les modules complémentaires selon les permissions
    Object.values(MEDICAL_MODULES).forEach(module => {
      if (module.category === 'complementary' &&
          hasPermissionForModule(user, module) &&
          !availableModules.find(m => m.id === module.id)) {
        const enrichedModule = {
          ...module,
          name: dynamicTranslations.getModuleTranslation(module.id, 'name') || module.name
        };
        availableModules.push(enrichedModule);
      }
    });

    return availableModules;
  };

  const hasPermissionForModule = (user, module) => {
    const userRole = USER_ROLES[user.role];
    if (!userRole) return false;

    // Super admin et admin ont accès à tout
    if (userRole.permissions.includes('*')) return true;

    // Vérifier les permissions spécifiques
    if (module.requiredRole && user.role !== module.requiredRole) {
      return false;
    }

    // Vérifier les permissions de base
    return module.permissions.some(permission =>
      userRole.permissions.includes(permission)
    );
  };

  const getDefaultActiveModules = (specialties) => {
    const defaultModules = [];

    specialties.forEach(specialty => {
      // Vérifier dans les spécialités dynamiques puis statiques
      const dynamicSpecialtyConfig = dynamicSpecialties[specialty];
      const staticSpecialtyConfig = MEDICAL_SPECIALTIES[specialty];
      const specialtyConfig = dynamicSpecialtyConfig || staticSpecialtyConfig;

      if (specialtyConfig && specialtyConfig.modules) {
        // Activer le premier module spécialisé par défaut
        const specializedModule = specialtyConfig.modules.find(m => m !== 'base');
        if (specializedModule) {
          defaultModules.push(specializedModule);
        }
      }
    });

    return defaultModules;
  };

  const toggleModule = (moduleId) => {
    setActiveModules(prev => {
      if (moduleId === 'base') return prev; // Base module always active

      if (prev.includes(moduleId)) {
        return prev.filter(id => id !== moduleId);
      } else {
        return [...prev, moduleId];
      }
    });
  };

  const getModuleComponent = (moduleId, componentId) => {
    // Cette fonction retournera les composants spécifiques selon le module
    // À implémenter avec les composants React correspondants
    return null;
  };

  const canEditModule = (moduleId) => {
    if (!user) return false;

    const module = MEDICAL_MODULES[moduleId];
    const userRole = USER_ROLES[user.role];

    if (!module || !userRole) return false;

    return userRole.permissions.includes('write') || userRole.permissions.includes('*');
  };

  const value = {
    // Configuration
    specialties: MEDICAL_SPECIALTIES,
    modules: MEDICAL_MODULES,

    // État utilisateur
    userSpecialties,
    availableModules,
    activeModules,

    // Actions
    toggleModule,
    getModuleComponent,
    canEditModule,

    // Utilitaires
    hasPermissionForModule: (moduleId) => hasPermissionForModule(user, MEDICAL_MODULES[moduleId]),
    getSpecialtyInfo: (specialtyId) => {
      const dynamicInfo = dynamicSpecialties[specialtyId];
      if (dynamicInfo) {
        return {
          ...dynamicInfo,
          name: dynamicTranslations.getSpecialtyTranslation(specialtyId, 'name'),
          description: dynamicTranslations.getSpecialtyTranslation(specialtyId, 'description')
        };
      }
      return MEDICAL_SPECIALTIES[specialtyId];
    },
    getModuleInfo: (moduleId) => {
      const staticModule = MEDICAL_MODULES[moduleId];
      if (staticModule) {
        return {
          ...staticModule,
          name: dynamicTranslations.getModuleTranslation(moduleId, 'name') || staticModule.name
        };
      }
      return staticModule;
    },

    // Nouvelles fonctions pour la gestion dynamique
    refreshConfiguration: loadDynamicConfiguration,
    isLoadingConfig,
    dynamicSpecialties,

    // Fonctions pour Super Admin
    addSpecialty: dynamicTranslations.addSpecialty,
    updateSpecialty: dynamicTranslations.updateSpecialty,
    removeSpecialty: dynamicTranslations.removeSpecialty
  };

  return (
    <MedicalModulesContext.Provider value={value}>
      {children}
    </MedicalModulesContext.Provider>
  );
};

export const useMedicalModules = () => {
  const context = useContext(MedicalModulesContext);
  if (!context) {
    throw new Error('useMedicalModules must be used within a MedicalModulesProvider');
  }
  return context;
};

export default MedicalModulesContext;