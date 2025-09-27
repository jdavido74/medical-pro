// utils/validation.js

// Validation email
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validation SIRET (14 chiffres)
export const validateSiret = (siret) => {
  const siretRegex = /^\d{14}$/;
  return siretRegex.test(siret);
};

// Validation mot de passe
export const validatePassword = (password) => {
  if (!password) return { isValid: false, message: 'Mot de passe requis' };
  if (password.length < 8) return { isValid: false, message: 'Minimum 8 caractères' };
  
  // Vérifications optionnelles pour un mot de passe fort
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return { isValid: true, message: 'Mot de passe valide' };
};

// Validation confirmation mot de passe
export const validatePasswordMatch = (password, confirmPassword) => {
  return password === confirmPassword;
};

// Validation code postal français
export const validatePostalCode = (postalCode) => {
  const postalCodeRegex = /^\d{5}$/;
  return postalCodeRegex.test(postalCode);
};

// Validation nom d'entreprise
export const validateCompanyName = (name) => {
  if (!name || name.trim().length === 0) return false;
  if (name.trim().length < 2) return false;
  return true;
};

// Validation nom de personne
export const validatePersonName = (name) => {
  if (!name || name.trim().length === 0) return false;
  if (name.trim().length < 2) return false;
  // Permet lettres, espaces, tirets, apostrophes
  const nameRegex = /^[a-zA-ZàáâäçéèêëíìîïñóòôöúùûüýÿæœÀÁÂÄÇÉÈÊËÍÌÎÏÑÓÒÔÖÚÙÛÜÝŸÆŒ\s\-']+$/;
  return nameRegex.test(name.trim());
};

// Validation numéro de téléphone espagnol
export const validateSpanishPhoneNumber = (phone) => {
  if (!phone) return false;
  // Retire tous les espaces, tirets et points
  const cleanPhone = phone.replace(/[\s\-\.]/g, '');
  // Formats acceptés: +34123456789, 34123456789, 123456789 (9 chiffres)
  const phoneRegex = /^(?:\+34|34)?[6-9][0-9]{8}$/;
  return phoneRegex.test(cleanPhone);
};

// Validation numéro de téléphone français
export const validateFrenchPhoneNumber = (phone) => {
  if (!phone) return false;
  // Retire tous les espaces, tirets et points
  const cleanPhone = phone.replace(/[\s\-\.]/g, '');
  // Formats acceptés: 0123456789, +33123456789, 33123456789
  const phoneRegex = /^(?:\+33|33|0)[1-9](?:[0-9]{8})$/;
  return phoneRegex.test(cleanPhone);
};

// Validation numéro de téléphone (multi-pays)
export const validatePhoneNumber = (phone, country = 'es') => {
  if (!phone) return false;

  switch (country) {
    case 'fr':
      return validateFrenchPhoneNumber(phone);
    case 'es':
      return validateSpanishPhoneNumber(phone);
    default:
      return validateSpanishPhoneNumber(phone);
  }
};

// Validation adresse
export const validateAddress = (address) => {
  if (!address || address.trim().length === 0) return false;
  if (address.trim().length < 5) return false;
  return true;
};

// Validation générique pour champs requis
export const validateRequired = (value, fieldName = 'Ce champ') => {
  if (!value || (typeof value === 'string' && value.trim().length === 0)) {
    return { isValid: false, message: `${fieldName} est requis` };
  }
  return { isValid: true, message: '' };
};

// Validation longueur minimum
export const validateMinLength = (value, minLength, fieldName = 'Ce champ') => {
  if (!value || value.length < minLength) {
    return { 
      isValid: false, 
      message: `${fieldName} doit contenir au moins ${minLength} caractères` 
    };
  }
  return { isValid: true, message: '' };
};

// Validation longueur maximum
export const validateMaxLength = (value, maxLength, fieldName = 'Ce champ') => {
  if (value && value.length > maxLength) {
    return { 
      isValid: false, 
      message: `${fieldName} ne peut pas dépasser ${maxLength} caractères` 
    };
  }
  return { isValid: true, message: '' };
};

// Utilitaire pour valider un objet complet
export const validateForm = (data, rules) => {
  const errors = {};
  
  Object.keys(rules).forEach(field => {
    const value = data[field];
    const fieldRules = rules[field];
    
    fieldRules.forEach(rule => {
      if (errors[field]) return; // Si déjà une erreur, on s'arrête
      
      const result = rule.validator(value);
      if (!result.isValid) {
        errors[field] = result.message;
      }
    });
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Exemple d'utilisation :
/*
const signupRules = {
  email: [
    { validator: (val) => validateRequired(val, 'Email') },
    { validator: (val) => validateEmail(val) ? { isValid: true } : { isValid: false, message: 'Email invalide' } }
  ],
  password: [
    { validator: (val) => validateRequired(val, 'Mot de passe') },
    { validator: (val) => validatePassword(val) }
  ],
  companyName: [
    { validator: (val) => validateRequired(val, 'Nom de l\'entreprise') },
    { validator: (val) => validateCompanyName(val) ? { isValid: true } : { isValid: false, message: 'Nom d\'entreprise invalide' } }
  ]
};

const result = validateForm(formData, signupRules);
if (!result.isValid) {
  setErrors(result.errors);
}
*/

// ================================
// VALIDATIONS MÉDICALES
// ================================

// Validation numéro ADELI (9 chiffres)
export const validateAdeliNumber = (adeliNumber) => {
  if (!adeliNumber) return false;

  // Format: 9 chiffres exactement
  const cleanAdeli = adeliNumber.replace(/\s/g, '');
  const adeliRegex = /^\d{9}$/;

  return adeliRegex.test(cleanAdeli);
};

// Validation numéro RPPS (11 chiffres)
export const validateRppsNumber = (rppsNumber) => {
  if (!rppsNumber) return false;

  // Format: 11 chiffres exactement
  const cleanRpps = rppsNumber.replace(/\s/g, '');
  const rppsRegex = /^\d{11}$/;

  return rppsRegex.test(cleanRpps);
};

// Validation numéro de colegiado espagnol
export const validateSpanishMedicalNumber = (medicalNumber) => {
  if (!medicalNumber) return false;

  // Format typique: 2-4 chiffres de province + 4-6 chiffres de numéro
  // Exemples: 28/12345 (Madrid), 08/123456 (Barcelone), etc.
  const cleanNumber = medicalNumber.replace(/[\s\-\/]/g, '');

  // Entre 6 et 10 chiffres au total
  const spanishMedicalRegex = /^\d{6,10}$/;

  return spanishMedicalRegex.test(cleanNumber);
};

// Validation numéro professionnel médical (ADELI/RPPS ou Colegiado espagnol)
export const validateMedicalNumber = (medicalNumber, country = 'es') => {
  if (!medicalNumber) return false;

  switch (country) {
    case 'fr':
      return validateAdeliNumber(medicalNumber) || validateRppsNumber(medicalNumber);
    case 'es':
      return validateSpanishMedicalNumber(medicalNumber);
    default:
      return validateSpanishMedicalNumber(medicalNumber);
  }
};

// Validation nom de cabinet médical
export const validateClinicName = (name) => {
  if (!name || name.trim().length < 2) return false;
  if (name.length > 100) return false;

  // Peut contenir lettres, chiffres, espaces, tirets, points
  const nameRegex = /^[a-zA-ZÀ-ÿ0-9\s\-\.'"]+$/;

  return nameRegex.test(name.trim());
};
        