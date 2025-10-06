// utils/practitionersLoader.js
// Fonction centralisée pour charger les praticiens de la clinique

import { initializeDemoPractitioners } from './initDemoPractitioners';

/**
 * Charge et normalise les praticiens de la clinique
 * @param {Object} currentUser - L'utilisateur actuellement connecté (optionnel)
 * @returns {Array} Liste des praticiens normalisés
 */
export const loadPractitioners = (currentUser = null) => {
  // Initialiser les praticiens de démonstration si nécessaire
  let allPractitioners = initializeDemoPractitioners();

  // Normaliser les praticiens pour avoir une propriété 'name'
  allPractitioners = allPractitioners.map(p => ({
    ...p,
    name: p.name || (p.firstName && p.lastName ? `${p.firstName} ${p.lastName}` : p.firstName || p.lastName || 'Praticien'),
    specialty: p.specialty || p.speciality || 'Non spécifié'
  }));

  // Ajouter l'utilisateur courant s'il n'est pas dans la liste et qu'il est praticien
  if (currentUser && !allPractitioners.find(p => p.id === currentUser.id)) {
    const userRoles = ['doctor', 'nurse', 'practitioner', 'specialist'];
    if (userRoles.includes(currentUser.role)) {
      allPractitioners.unshift({
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
        specialty: currentUser.specialty || 'Médecine générale'
      });
    }
  }

  return allPractitioners;
};

export default loadPractitioners;
