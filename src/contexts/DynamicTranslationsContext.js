// contexts/DynamicTranslationsContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLanguage } from './LanguageContext';

const DynamicTranslationsContext = createContext();

// Service pour gérer les traductions dynamiques
class DynamicTranslationsService {
  constructor() {
    this.cache = new Map();
    this.loadPromises = new Map();
  }

  // Charger les traductions pour les spécialités depuis l'API
  async loadSpecialtyTranslations() {
    const cacheKey = 'specialties';

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    if (this.loadPromises.has(cacheKey)) {
      return this.loadPromises.get(cacheKey);
    }

    const promise = this.fetchSpecialtyTranslations();
    this.loadPromises.set(cacheKey, promise);

    try {
      const translations = await promise;
      this.cache.set(cacheKey, translations);
      this.loadPromises.delete(cacheKey);
      return translations;
    } catch (error) {
      this.loadPromises.delete(cacheKey);
      throw error;
    }
  }

  // Simulation de l'API pour récupérer les traductions des spécialités
  async fetchSpecialtyTranslations() {
    // En production, ceci serait un appel API réel
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          specialties: {
            general: {
              es: { name: 'Medicina General', description: 'Atención médica integral y preventiva' },
              fr: { name: 'Médecine Générale', description: 'Soins médicaux complets et préventifs' },
              en: { name: 'General Medicine', description: 'Comprehensive and preventive medical care' }
            },
            cardiology: {
              es: { name: 'Cardiología', description: 'Diagnóstico y tratamiento de enfermedades cardiovasculares' },
              fr: { name: 'Cardiologie', description: 'Diagnostic et traitement des maladies cardiovasculaires' },
              en: { name: 'Cardiology', description: 'Diagnosis and treatment of cardiovascular diseases' }
            },
            pediatrics: {
              es: { name: 'Pediatría', description: 'Atención médica especializada para niños y adolescentes' },
              fr: { name: 'Pédiatrie', description: 'Soins médicaux spécialisés pour enfants et adolescents' },
              en: { name: 'Pediatrics', description: 'Specialized medical care for children and adolescents' }
            },
            dermatology: {
              es: { name: 'Dermatología', description: 'Diagnóstico y tratamiento de enfermedades de la piel' },
              fr: { name: 'Dermatologie', description: 'Diagnostic et traitement des maladies de la peau' },
              en: { name: 'Dermatology', description: 'Diagnosis and treatment of skin diseases' }
            },
            gynecology: {
              es: { name: 'Ginecología', description: 'Salud reproductiva y ginecológica de la mujer' },
              fr: { name: 'Gynécologie', description: 'Santé reproductive et gynécologique de la femme' },
              en: { name: 'Gynecology', description: 'Women\'s reproductive and gynecological health' }
            },
            orthopedics: {
              es: { name: 'Traumatología', description: 'Tratamiento de lesiones del sistema musculoesquelético' },
              fr: { name: 'Orthopédie', description: 'Traitement des blessures du système musculo-squelettique' },
              en: { name: 'Orthopedics', description: 'Treatment of musculoskeletal system injuries' }
            },
            // Nouvelles spécialités ajoutées dynamiquement
            psychiatry: {
              es: { name: 'Psiquiatría', description: 'Diagnóstico y tratamiento de trastornos mentales' },
              fr: { name: 'Psychiatrie', description: 'Diagnostic et traitement des troubles mentaux' },
              en: { name: 'Psychiatry', description: 'Diagnosis and treatment of mental disorders' }
            },
            ophthalmology: {
              es: { name: 'Oftalmología', description: 'Cuidado de los ojos y la visión' },
              fr: { name: 'Ophtalmologie', description: 'Soins des yeux et de la vision' },
              en: { name: 'Ophthalmology', description: 'Eye and vision care' }
            }
          },
          modules: {
            base: {
              es: { name: 'Módulo Base', description: 'Información médica básica' },
              fr: { name: 'Module de Base', description: 'Informations médicales de base' },
              en: { name: 'Base Module', description: 'Basic medical information' }
            },
            cardiac: {
              es: { name: 'Módulo Cardiológico', description: 'Evaluación cardiovascular especializada' },
              fr: { name: 'Module Cardiologique', description: 'Évaluation cardiovasculaire spécialisée' },
              en: { name: 'Cardiac Module', description: 'Specialized cardiovascular evaluation' }
            },
            pediatric: {
              es: { name: 'Módulo Pediátrico', description: 'Evaluación especializada para niños' },
              fr: { name: 'Module Pédiatrique', description: 'Évaluation spécialisée pour enfants' },
              en: { name: 'Pediatric Module', description: 'Specialized evaluation for children' }
            },
            preventive: {
              es: { name: 'Medicina Preventiva', description: 'Prevención y promoción de la salud' },
              fr: { name: 'Médecine Préventive', description: 'Prévention et promotion de la santé' },
              en: { name: 'Preventive Medicine', description: 'Prevention and health promotion' }
            }
          }
        });
      }, 300);
    });
  }

  // Charger traductions pour les rôles utilisateur
  async loadRoleTranslations() {
    return {
      roles: {
        super_admin: {
          es: { name: 'Super Administrador', description: 'Acceso completo al sistema' },
          fr: { name: 'Super Administrateur', description: 'Accès complet au système' },
          en: { name: 'Super Administrator', description: 'Complete system access' }
        },
        admin: {
          es: { name: 'Administrador', description: 'Gestión de la clínica' },
          fr: { name: 'Administrateur', description: 'Gestion de la clinique' },
          en: { name: 'Administrator', description: 'Clinic management' }
        },
        doctor: {
          es: { name: 'Médico', description: 'Médico general' },
          fr: { name: 'Médecin', description: 'Médecin généraliste' },
          en: { name: 'Doctor', description: 'General practitioner' }
        },
        specialist: {
          es: { name: 'Especialista', description: 'Médico especialista' },
          fr: { name: 'Spécialiste', description: 'Médecin spécialiste' },
          en: { name: 'Specialist', description: 'Medical specialist' }
        },
        nurse: {
          es: { name: 'Enfermero/a', description: 'Personal de enfermería' },
          fr: { name: 'Infirmier/ère', description: 'Personnel infirmier' },
          en: { name: 'Nurse', description: 'Nursing staff' }
        },
        secretary: {
          es: { name: 'Secretario/a', description: 'Personal administrativo' },
          fr: { name: 'Secrétaire', description: 'Personnel administratif' },
          en: { name: 'Secretary', description: 'Administrative staff' }
        }
      }
    };
  }

  // Sauvegarder nouvelles traductions (Super Admin)
  async saveTranslations(category, id, translations) {
    try {
      // En production, ceci serait un appel API
      console.log('Saving translations:', { category, id, translations });

      // Mettre à jour le cache local
      const cacheKey = category === 'specialty' ? 'specialties' : category;
      const cachedData = this.cache.get(cacheKey) || {};

      if (!cachedData[category === 'specialty' ? 'specialties' : category]) {
        cachedData[category === 'specialty' ? 'specialties' : category] = {};
      }

      cachedData[category === 'specialty' ? 'specialties' : category][id] = translations;
      this.cache.set(cacheKey, cachedData);

      return true;
    } catch (error) {
      console.error('Error saving translations:', error);
      throw error;
    }
  }

  // Vider le cache (utile lors des mises à jour)
  clearCache(category = null) {
    if (category) {
      this.cache.delete(category);
    } else {
      this.cache.clear();
    }
  }
}

export const DynamicTranslationsProvider = ({ children }) => {
  const { currentLanguage } = useLanguage();
  const [translationsService] = useState(() => new DynamicTranslationsService());
  const [specialtyTranslations, setSpecialtyTranslations] = useState({});
  const [roleTranslations, setRoleTranslations] = useState({});
  const [moduleTranslations, setModuleTranslations] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAllTranslations();
  }, []);

  const loadAllTranslations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Charger toutes les traductions en parallèle
      const [specialtyData, roleData] = await Promise.all([
        translationsService.loadSpecialtyTranslations(),
        translationsService.loadRoleTranslations()
      ]);

      setSpecialtyTranslations(specialtyData.specialties || {});
      setModuleTranslations(specialtyData.modules || {});
      setRoleTranslations(roleData.roles || {});

    } catch (err) {
      setError(err.message);
      console.error('Error loading dynamic translations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Obtenir la traduction d'une spécialité
  const getSpecialtyTranslation = (specialtyId, field = 'name', language = currentLanguage) => {
    const specialty = specialtyTranslations[specialtyId];
    if (!specialty || !specialty[language]) {
      return specialtyId; // Fallback to ID if translation not found
    }
    return specialty[language][field] || specialtyId;
  };

  // Obtenir la traduction d'un module
  const getModuleTranslation = (moduleId, field = 'name', language = currentLanguage) => {
    const module = moduleTranslations[moduleId];
    if (!module || !module[language]) {
      return moduleId;
    }
    return module[language][field] || moduleId;
  };

  // Obtenir la traduction d'un rôle
  const getRoleTranslation = (roleId, field = 'name', language = currentLanguage) => {
    const role = roleTranslations[roleId];
    if (!role || !role[language]) {
      return roleId;
    }
    return role[language][field] || roleId;
  };

  // Obtenir toutes les traductions d'une spécialité
  const getSpecialtyInfo = (specialtyId, language = currentLanguage) => {
    const specialty = specialtyTranslations[specialtyId];
    if (!specialty || !specialty[language]) {
      return { name: specialtyId, description: '' };
    }
    return specialty[language];
  };

  // Ajouter une nouvelle spécialité avec traductions (Super Admin)
  const addSpecialty = async (specialtyId, translations) => {
    try {
      await translationsService.saveTranslations('specialty', specialtyId, translations);

      // Mettre à jour l'état local
      setSpecialtyTranslations(prev => ({
        ...prev,
        [specialtyId]: translations
      }));

      return true;
    } catch (error) {
      throw error;
    }
  };

  // Mettre à jour une spécialité existante
  const updateSpecialty = async (specialtyId, translations) => {
    try {
      await translationsService.saveTranslations('specialty', specialtyId, translations);

      setSpecialtyTranslations(prev => ({
        ...prev,
        [specialtyId]: translations
      }));

      return true;
    } catch (error) {
      throw error;
    }
  };

  // Supprimer une spécialité
  const removeSpecialty = async (specialtyId) => {
    try {
      // En production, ceci serait un appel API pour supprimer
      setSpecialtyTranslations(prev => {
        const updated = { ...prev };
        delete updated[specialtyId];
        return updated;
      });

      return true;
    } catch (error) {
      throw error;
    }
  };

  // Recharger les traductions (utile après des mises à jour)
  const refreshTranslations = async () => {
    translationsService.clearCache();
    await loadAllTranslations();
  };

  // Obtenir la liste des spécialités disponibles
  const getAvailableSpecialties = () => {
    return Object.keys(specialtyTranslations).map(id => ({
      id,
      ...getSpecialtyInfo(id, currentLanguage)
    }));
  };

  // Obtenir la liste des modules disponibles
  const getAvailableModules = () => {
    return Object.keys(moduleTranslations).map(id => ({
      id,
      name: getModuleTranslation(id, 'name', currentLanguage),
      description: getModuleTranslation(id, 'description', currentLanguage)
    }));
  };

  // Obtenir la liste des rôles disponibles
  const getAvailableRoles = () => {
    return Object.keys(roleTranslations).map(id => ({
      id,
      name: getRoleTranslation(id, 'name', currentLanguage),
      description: getRoleTranslation(id, 'description', currentLanguage)
    }));
  };

  // Valider si une traduction est complète (tous les langages requis)
  const validateTranslation = (translations, requiredLanguages = ['es', 'fr', 'en']) => {
    const errors = [];

    requiredLanguages.forEach(lang => {
      if (!translations[lang]) {
        errors.push(`Missing translation for language: ${lang}`);
      } else {
        if (!translations[lang].name || translations[lang].name.trim() === '') {
          errors.push(`Missing name for language: ${lang}`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const value = {
    // État
    isLoading,
    error,

    // Traductions
    specialtyTranslations,
    moduleTranslations,
    roleTranslations,

    // Fonctions de récupération
    getSpecialtyTranslation,
    getModuleTranslation,
    getRoleTranslation,
    getSpecialtyInfo,
    getAvailableSpecialties,
    getAvailableModules,
    getAvailableRoles,

    // Fonctions de gestion (Super Admin)
    addSpecialty,
    updateSpecialty,
    removeSpecialty,
    refreshTranslations,

    // Utilitaires
    validateTranslation,

    // Service direct (pour cas avancés)
    translationsService
  };

  return (
    <DynamicTranslationsContext.Provider value={value}>
      {children}
    </DynamicTranslationsContext.Provider>
  );
};

export const useDynamicTranslations = () => {
  const context = useContext(DynamicTranslationsContext);
  if (!context) {
    throw new Error('useDynamicTranslations must be used within a DynamicTranslationsProvider');
  }
  return context;
};

export default DynamicTranslationsContext;