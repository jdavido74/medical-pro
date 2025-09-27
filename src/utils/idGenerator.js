// utils/idGenerator.js

// Générateur d'ID unique pour les entités médicales
export const generateId = (prefix = '') => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  const id = `${prefix}${timestamp}${randomPart}`;
  return id;
};

// Générateur d'ID pour patients avec préfixe médical
export const generatePatientId = () => generateId('pat_');

// Générateur d'ID pour dossiers médicaux
export const generateMedicalRecordId = () => generateId('rec_');

// Générateur d'ID pour rendez-vous
export const generateAppointmentId = () => generateId('apt_');

// Générateur d'ID pour traitements
export const generateTreatmentId = () => generateId('trt_');

// Générateur d'ID pour utilisateurs médicaux
export const generateUserId = () => generateId('usr_');

// Générateur d'ID pour consentements
export const generateConsentId = () => generateId('cns_');

export default generateId;