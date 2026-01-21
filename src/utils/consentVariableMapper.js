// utils/consentVariableMapper.js
// Note: patientsStorage n'est plus utilisé - les patients viennent de l'API
import i18n from '../i18n';

// Helper to get current locale from i18n
const getCurrentLocale = () => {
  const lang = i18n.language || 'fr';
  // Map language code to locale code (fr -> fr-FR, es -> es-ES)
  const localeMap = {
    'fr': 'fr-FR',
    'es': 'es-ES',
    'en': 'en-GB'
  };
  return localeMap[lang] || 'fr-FR';
};

// Normaliser les données patient (API vs localStorage)
const normalizePatient = (patient) => {
  if (!patient) return null;

  return {
    firstName: patient.firstName || patient.first_name || '',
    lastName: patient.lastName || patient.last_name || '',
    birthDate: patient.birthDate || patient.birth_date || patient.dateOfBirth,
    gender: patient.gender || patient.sex,
    patientNumber: patient.patientNumber || patient.patient_number || patient.id?.substring(0, 8),
    // Email et téléphone peuvent être à la racine ou dans contact
    email: patient.email || patient.contact?.email || '',
    phone: patient.phone || patient.contact?.phone || patient.phoneNumber || '',
    // Adresse
    address: patient.address || {
      street: patient.street || patient.addressLine1,
      city: patient.city,
      postalCode: patient.postalCode || patient.zipCode,
      country: patient.country
    },
    nationality: patient.nationality,
    idNumber: patient.idNumber || patient.nationalId || patient.socialSecurityNumber,
    // Assurance
    insurance: patient.insurance || {
      provider: patient.insuranceProvider,
      number: patient.insuranceNumber,
      type: patient.insuranceType
    },
    // Contact d'urgence
    emergencyContact: patient.emergencyContact || patient.contact?.emergencyContact || {
      name: patient.emergencyContactName,
      phone: patient.emergencyContactPhone,
      relationship: patient.emergencyContactRelationship
    }
  };
};

// Service de mapping automatique des variables dans les consentements
export const consentVariableMapper = {
  /**
   * Mapper les variables d'un modèle avec les données patient
   * @param {string} templateContent - Le contenu du template avec variables
   * @param {string|object} patientOrId - L'objet patient OU l'ID du patient (deprecated)
   * @param {string|object} practitionerOrId - L'objet praticien OU l'ID du praticien
   * @param {object} additionalData - Données additionnelles (intervention, risques, etc.)
   * @returns {string} Le contenu avec les variables remplacées
   */
  fillTemplateVariables: (templateContent, patientOrId, practitionerOrId, additionalData = {}) => {
    if (!templateContent) return '';

    // Récupérer les données du patient - accepte un objet ou un ID
    let patient = null;
    if (typeof patientOrId === 'object' && patientOrId !== null) {
      // Patient passé directement comme objet
      patient = normalizePatient(patientOrId);
    } else if (typeof patientOrId === 'string') {
      // ID passé - utiliser additionalData.patient si disponible
      patient = additionalData.patient ? normalizePatient(additionalData.patient) : null;
    }

    // Récupérer les données du praticien - accepte un objet ou un ID
    let practitioner = null;
    if (typeof practitionerOrId === 'object' && practitionerOrId !== null) {
      practitioner = practitionerOrId;
    } else if (typeof practitionerOrId === 'string') {
      practitioner = additionalData.practitioner || getUserById(practitionerOrId);
    }

    // Données par défaut et additionnelles
    const currentDate = new Date();

    // Mapping des variables
    const variableMap = {
      // Variables patient
      'NOM_PATIENT': patient?.lastName || '[NOM_PATIENT]',
      'PRÉNOM_PATIENT': patient?.firstName || '[PRÉNOM_PATIENT]',
      'PRENOM_PATIENT': patient?.firstName || '[PRÉNOM_PATIENT]', // Variante sans accent
      'DATE_NAISSANCE': patient?.birthDate ? formatDate(patient.birthDate) : '[DATE_NAISSANCE]',
      'AGE_PATIENT': patient?.birthDate ? calculateAge(patient.birthDate) : '[AGE_PATIENT]',
      'SEXE_PATIENT': getGenderText(patient?.gender) || '[SEXE_PATIENT]',
      'NUMERO_PATIENT': patient?.patientNumber || '[NUMERO_PATIENT]',
      'EMAIL_PATIENT': patient?.email || '[EMAIL_PATIENT]',
      'TELEPHONE_PATIENT': patient?.phone || '[TELEPHONE_PATIENT]',
      'ADRESSE_PATIENT': formatAddress(patient?.address) || '[ADRESSE_PATIENT]',
      'NATIONALITE_PATIENT': patient?.nationality || '[NATIONALITE_PATIENT]',
      'NUMERO_ID_PATIENT': patient?.idNumber || '[NUMERO_ID_PATIENT]',

      // Assurance
      'ASSURANCE_PATIENT': patient?.insurance?.provider || '[ASSURANCE_PATIENT]',
      'NUMERO_ASSURANCE': patient?.insurance?.number || '[NUMERO_ASSURANCE]',
      'TYPE_ASSURANCE': patient?.insurance?.type || '[TYPE_ASSURANCE]',

      // Contact d'urgence
      'CONTACT_URGENCE_NOM': patient?.emergencyContact?.name || '[CONTACT_URGENCE_NOM]',
      'CONTACT_URGENCE_TELEPHONE': patient?.emergencyContact?.phone || '[CONTACT_URGENCE_TELEPHONE]',
      'CONTACT_URGENCE_RELATION': patient?.emergencyContact?.relationship || '[CONTACT_URGENCE_RELATION]',

      // Variables praticien
      'NOM_PRATICIEN': practitioner?.lastName || '[NOM_PRATICIEN]',
      'PRÉNOM_PRATICIEN': practitioner?.firstName || '[PRÉNOM_PRATICIEN]',
      'PRENOM_PRATICIEN': practitioner?.firstName || '[PRÉNOM_PRATICIEN]',
      'TITRE_PRATICIEN': getPractitionerTitle(practitioner?.role) || '[TITRE_PRATICIEN]',
      'SPÉCIALITÉ_PRATICIEN': practitioner?.specialty || '[SPÉCIALITÉ_PRATICIEN]',
      'SPECIALITE_PRATICIEN': practitioner?.specialty || '[SPÉCIALITÉ_PRATICIEN]',
      'NUMERO_RPPS': practitioner?.rppsNumber || '[NUMERO_RPPS]',
      'NUMERO_ADELI': practitioner?.adeliNumber || '[NUMERO_ADELI]',

      // Variables établissement
      'ÉTABLISSEMENT': practitioner?.facility || 'Cabinet Médical',
      'ETABLISSEMENT': practitioner?.facility || 'Cabinet Médical',
      'ADRESSE_ETABLISSEMENT': practitioner?.facilityAddress || '[ADRESSE_ETABLISSEMENT]',
      'TELEPHONE_ETABLISSEMENT': practitioner?.facilityPhone || '[TELEPHONE_ETABLISSEMENT]',

      // Variables de date et heure
      'DATE': formatDate(currentDate),
      'DATE_LONGUE': formatLongDate(currentDate),
      'HEURE': formatTime(currentDate),
      'DATE_HEURE': formatDateTime(currentDate),
      'ANNEE': currentDate.getFullYear().toString(),
      'MOIS': (currentDate.getMonth() + 1).toString().padStart(2, '0'),
      'JOUR': currentDate.getDate().toString().padStart(2, '0'),

      // Variables d'intervention (à remplir selon le contexte)
      'DESCRIPTION_INTERVENTION': additionalData.procedureDescription || '[DESCRIPTION_INTERVENTION]',
      'TYPE_INTERVENTION': additionalData.procedureType || '[TYPE_INTERVENTION]',
      'DUREE_INTERVENTION': additionalData.procedureDuration || '[DUREE_INTERVENTION]',
      'LIEU_INTERVENTION': additionalData.procedureLocation || '[LIEU_INTERVENTION]',
      'DATE_INTERVENTION': additionalData.procedureDate ? formatDate(additionalData.procedureDate) : '[DATE_INTERVENTION]',

      // Risques et bénéfices
      'RISQUES_SPÉCIFIQUES': additionalData.specificRisks || '[RISQUES_SPÉCIFIQUES]',
      'RISQUES_SPECIFIQUES': additionalData.specificRisks || '[RISQUES_SPÉCIFIQUES]',
      'BÉNÉFICES_ATTENDUS': additionalData.expectedBenefits || '[BÉNÉFICES_ATTENDUS]',
      'BENEFICES_ATTENDUS': additionalData.expectedBenefits || '[BÉNÉFICES_ATTENDUS]',
      'ALTERNATIVES_DISPONIBLES': additionalData.alternatives || '[ALTERNATIVES_DISPONIBLES]',
      'SUITES_POST_OPÉRATOIRES': additionalData.postOpCare || '[SUITES_POST_OPÉRATOIRES]',
      'SUITES_POST_OPERATOIRES': additionalData.postOpCare || '[SUITES_POST_OPÉRATOIRES]',

      // Variables de signature (placeholders)
      'SIGNATURE_PATIENT': '................................',
      'SIGNATURE_PRATICIEN': '................................',
      'SIGNATURE_TEMOIN': '................................',

      // Variables spéciales
      'NUMERO_CONSENTEMENT': generateConsentNumber(),
      'LIEU': additionalData.location || 'Cabinet Médical',
      'DUREE': additionalData.duration || '[DUREE]',
      'PLATEFORME': additionalData.platform || '[PLATEFORME]'
    };

    // Remplacer toutes les variables dans le contenu
    let filledContent = templateContent;

    Object.entries(variableMap).forEach(([variable, value]) => {
      const regex = new RegExp(`\\[${variable}\\]`, 'g');
      filledContent = filledContent.replace(regex, value);
    });

    return filledContent;
  },

  // Extraire les variables non remplies d'un contenu
  getUnfilledVariables: (content) => {
    const variableRegex = /\[([^\]]+)\]/g;
    const matches = [...content.matchAll(variableRegex)];
    return [...new Set(matches.map(match => match[1]))];
  },

  /**
   * Mapper les données patient pour un formulaire de consentement
   * @param {string|object} patientOrId - L'objet patient OU l'ID du patient
   * @returns {object} Les données patient normalisées
   */
  getPatientDataForForm: (patientOrId) => {
    let patient = null;
    if (typeof patientOrId === 'object' && patientOrId !== null) {
      patient = normalizePatient(patientOrId);
    }
    if (!patient) return {};

    return {
      patientName: `${patient.firstName} ${patient.lastName}`,
      patientNumber: patient.patientNumber,
      birthDate: patient.birthDate,
      age: patient.birthDate ? calculateAge(patient.birthDate) : null,
      gender: patient.gender,
      email: patient.email,
      phone: patient.phone,
      address: formatAddress(patient.address),
      insurance: patient.insurance,
      emergencyContact: patient.emergencyContact,
      nationality: patient.nationality,
      idNumber: patient.idNumber
    };
  },

  // Valider si toutes les variables obligatoires sont remplies
  validateRequiredVariables: (content, requiredVariables = []) => {
    const unfilledVariables = consentVariableMapper.getUnfilledVariables(content);
    const missingRequired = requiredVariables.filter(variable =>
      unfilledVariables.includes(variable)
    );

    return {
      isValid: missingRequired.length === 0,
      missingVariables: missingRequired,
      allUnfilledVariables: unfilledVariables
    };
  }
};

// Fonctions utilitaires
const getUserById = (userId) => {
  // En attendant le système d'utilisateurs complet, simulation
  const mockUsers = {
    'demo': {
      firstName: 'Dr. Jean',
      lastName: 'Dupont',
      role: 'physician',
      specialty: 'Médecine générale',
      facility: 'Cabinet Médical Dupont',
      facilityAddress: '123 Avenue de la Santé, 75001 Paris',
      facilityPhone: '+33 1 23 45 67 89',
      rppsNumber: '12345678901',
      adeliNumber: '123456789'
    }
  };

  return mockUsers[userId] || {
    firstName: 'Dr.',
    lastName: '[NOM_PRATICIEN]',
    role: 'physician',
    specialty: '[SPÉCIALITÉ_PRATICIEN]'
  };
};

const formatDate = (date) => {
  if (!date) return '';
  if (typeof date === 'string') date = new Date(date);
  return date.toLocaleDateString(getCurrentLocale());
};

const formatLongDate = (date) => {
  if (!date) return '';
  if (typeof date === 'string') date = new Date(date);
  return date.toLocaleDateString(getCurrentLocale(), {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatTime = (date) => {
  if (!date) return '';
  if (typeof date === 'string') date = new Date(date);
  return date.toLocaleTimeString(getCurrentLocale(), {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDateTime = (date) => {
  if (!date) return '';
  return `${formatDate(date)} à ${formatTime(date)}`;
};

const calculateAge = (birthDate) => {
  if (!birthDate) return '';
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return `${age} ans`;
};

const getGenderText = (gender) => {
  const genderMap = {
    'male': 'Masculin',
    'female': 'Féminin',
    'other': 'Autre'
  };
  return genderMap[gender] || '';
};

const getPractitionerTitle = (role) => {
  const titleMap = {
    'doctor': 'Dr.',
    'specialist': 'Dr.',
    'nurse': 'Infirmier(ère)',
    'secretary': 'Secrétaire médical(e)'
  };
  return titleMap[role] || 'Dr.';
};

const formatAddress = (address) => {
  if (!address) return '';

  const parts = [];
  if (address.street) parts.push(address.street);
  if (address.city && address.postalCode) {
    parts.push(`${address.postalCode} ${address.city}`);
  } else if (address.city) {
    parts.push(address.city);
  }
  if (address.country) parts.push(address.country);

  return parts.join(', ');
};

const generateConsentNumber = () => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const time = now.getTime().toString().slice(-4);

  return `CNS${year}${month}${day}${time}`;
};

// Variables couramment utilisées par catégorie
export const COMMON_VARIABLES_BY_CATEGORY = {
  patient: [
    'NOM_PATIENT', 'PRÉNOM_PATIENT', 'DATE_NAISSANCE', 'AGE_PATIENT',
    'SEXE_PATIENT', 'NUMERO_PATIENT', 'ADRESSE_PATIENT', 'TELEPHONE_PATIENT',
    'EMAIL_PATIENT', 'NATIONALITE_PATIENT'
  ],
  practitioner: [
    'NOM_PRATICIEN', 'PRÉNOM_PRATICIEN', 'TITRE_PRATICIEN', 'SPÉCIALITÉ_PRATICIEN',
    'NUMERO_RPPS', 'NUMERO_ADELI'
  ],
  facility: [
    'ÉTABLISSEMENT', 'ADRESSE_ETABLISSEMENT', 'TELEPHONE_ETABLISSEMENT'
  ],
  datetime: [
    'DATE', 'DATE_LONGUE', 'HEURE', 'DATE_HEURE', 'ANNEE', 'MOIS', 'JOUR'
  ],
  procedure: [
    'DESCRIPTION_INTERVENTION', 'TYPE_INTERVENTION', 'DUREE_INTERVENTION',
    'LIEU_INTERVENTION', 'DATE_INTERVENTION', 'RISQUES_SPÉCIFIQUES',
    'BÉNÉFICES_ATTENDUS', 'ALTERNATIVES_DISPONIBLES'
  ],
  signatures: [
    'SIGNATURE_PATIENT', 'SIGNATURE_PRATICIEN', 'SIGNATURE_TEMOIN'
  ],
  insurance: [
    'ASSURANCE_PATIENT', 'NUMERO_ASSURANCE', 'TYPE_ASSURANCE'
  ],
  emergency: [
    'CONTACT_URGENCE_NOM', 'CONTACT_URGENCE_TELEPHONE', 'CONTACT_URGENCE_RELATION'
  ]
};

// Variables obligatoires par type de consentement
export const REQUIRED_VARIABLES_BY_CONSENT_TYPE = {
  'medical_care': ['NOM_PATIENT', 'PRÉNOM_PATIENT', 'DATE', 'NOM_PRATICIEN', 'SIGNATURE_PATIENT'],
  'medical_specific': ['NOM_PATIENT', 'PRÉNOM_PATIENT', 'DESCRIPTION_INTERVENTION', 'RISQUES_SPÉCIFIQUES', 'DATE', 'SIGNATURE_PATIENT', 'SIGNATURE_PRATICIEN'],
  'rgpd_data_processing': ['NOM_PATIENT', 'PRÉNOM_PATIENT', 'DATE', 'SIGNATURE_PATIENT'],
  'telemedicine': ['NOM_PATIENT', 'PRÉNOM_PATIENT', 'DATE', 'PLATEFORME'],
  'research': ['NOM_PATIENT', 'PRÉNOM_PATIENT', 'DATE', 'SIGNATURE_PATIENT']
};

export default consentVariableMapper;