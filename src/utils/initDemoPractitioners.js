// utils/initDemoPractitioners.js
import { practitionersStorage } from './clinicConfigStorage';

export const initializeDemoPractitioners = () => {
  // Vérifier si des praticiens existent déjà
  const existing = practitionersStorage.getAll();

  if (existing.length > 0) {
    console.log('Praticiens déjà initialisés:', existing.length);
    return existing;
  }

  console.log('Initialisation des praticiens de démonstration...');

  const demoPractitioners = [
    {
      id: 'demo_pract_001',
      name: 'Dr. Elena Rodriguez',
      firstName: 'Elena',
      lastName: 'Rodriguez',
      role: 'physician',
      specialty: 'Médecine générale',
      email: 'elena.rodriguez@clinic.com',
      phone: '+33 6 12 34 56 78',
      isActive: true
    },
    {
      id: 'demo_pract_002',
      name: 'Dr. Carlos Garcia',
      firstName: 'Carlos',
      lastName: 'Garcia',
      role: 'physician',
      specialty: 'Cardiologie',
      email: 'carlos.garcia@clinic.com',
      phone: '+33 6 23 45 67 89',
      isActive: true
    },
    {
      id: 'demo_pract_003',
      name: 'Inf. Marie Dubois',
      firstName: 'Marie',
      lastName: 'Dubois',
      role: 'practitioner',
      specialty: 'Soins infirmiers',
      email: 'marie.dubois@clinic.com',
      phone: '+33 6 34 56 78 90',
      isActive: true
    }
  ];

  // Ajouter chaque praticien
  const added = demoPractitioners.map(p => practitionersStorage.add(p));

  console.log('Praticiens créés:', added);
  return added;
};

// Fonction pour forcer la réinitialisation
export const resetDemoPractitioners = () => {
  console.log('Réinitialisation des praticiens...');

  // Vider le storage
  localStorage.removeItem('medicalPro_practitioners');

  // Recréer
  return initializeDemoPractitioners();
};
