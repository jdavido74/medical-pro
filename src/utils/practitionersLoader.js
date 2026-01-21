// utils/practitionersLoader.js
// Fonction centralisée pour charger les praticiens de la clinique

import { isPractitionerRole, filterPractitioners, PRACTITIONER_ROLES } from './userRoles';

/**
 * Normalise un praticien pour avoir les propriétés attendues
 * @param {Object} practitioner - Le praticien à normaliser
 * @returns {Object} Praticien normalisé
 */
export const normalizePractitioner = (practitioner) => {
  if (!practitioner) return null;
  return {
    ...practitioner,
    name: practitioner.name ||
      (practitioner.firstName && practitioner.lastName
        ? `${practitioner.firstName} ${practitioner.lastName}`
        : practitioner.firstName || practitioner.lastName || 'Praticien'),
    specialty: practitioner.specialty || practitioner.speciality || 'Non spécifié'
  };
};

/**
 * Charge et normalise les praticiens de la clinique
 * @param {Object} currentUser - L'utilisateur actuellement connecté (optionnel)
 * @returns {Array} Liste des praticiens normalisés
 */
export const loadPractitioners = (currentUser = null) => {
  // Start with empty list - will be loaded from backend API
  let allPractitioners = [];

  // Normaliser les praticiens
  allPractitioners = allPractitioners.map(normalizePractitioner);

  // Ajouter l'utilisateur courant s'il n'est pas dans la liste et qu'il est praticien
  // IMPORTANT: Utiliser providerId (healthcare_provider.id) pour cohérence avec les rendez-vous
  const practitionerId = currentUser?.providerId || currentUser?.id;
  if (currentUser && !allPractitioners.find(p => p.id === practitionerId)) {
    // Utiliser l'utilitaire centralisé pour vérifier si c'est un praticien
    if (isPractitionerRole(currentUser.role)) {
      allPractitioners.unshift(normalizePractitioner({
        id: practitionerId,  // Utiliser providerId pour correspondre aux rendez-vous
        name: currentUser.name,
        role: currentUser.role,
        specialty: currentUser.specialty || 'Médecine générale'
      }));
    }
  }

  return allPractitioners;
};

/**
 * Filtre une liste d'utilisateurs pour ne garder que les praticiens actifs et les normalise
 * @param {Array} users - Liste des utilisateurs
 * @returns {Array} Liste des praticiens normalisés
 */
export const filterAndNormalizePractitioners = (users = []) => {
  return filterPractitioners(users).map(normalizePractitioner);
};

export default loadPractitioners;
