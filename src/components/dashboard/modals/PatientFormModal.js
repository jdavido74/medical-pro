// components/dashboard/modals/PatientFormModal.js
import React, { useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X, Save, User, Calendar, MapPin, Phone, Mail, Shield,
  Heart, AlertCircle, Check, Users, Building
} from 'lucide-react';
import { PatientContext } from '../../../contexts/PatientContext';
import { countries, nationalities } from '../../../data/countries';
import PhoneInput from '../../common/PhoneInput';
import { validatePhoneForCountry, parseFullPhoneNumber } from '../../../utils/phoneUtils';
import { useLocale } from '../../../contexts/LocaleContext';

const PatientFormModal = ({ patient, isOpen, onClose, onSave }) => {
  const { t } = useTranslation('patients');
  const patientContext = useContext(PatientContext);
  const { country: localeCountry, name: localeName } = useLocale();

  // Get default nationality and country name based on locale
  const getDefaultNationality = () => {
    const nationalityMap = {
      'FR': 'Française',
      'ES': 'Española',
      'GB': 'British',
      'US': 'American',
      'PT': 'Portuguesa',
      'DE': 'Deutsche',
      'IT': 'Italiana',
      'BE': 'Belge',
      'CH': 'Suisse'
    };
    return nationalityMap[localeCountry] || 'Française';
  };

  const [formData, setFormData] = useState({
    // US 1.1 - Identité du patient
    firstName: '',
    lastName: '',
    birthDate: '',
    gender: '',
    idNumber: '',
    nationality: getDefaultNationality(),

    // US 1.2 - Coordonnées
    address: {
      street: '',
      city: '',
      postalCode: '',
      country: localeName
    },
    contact: {
      phone: '',
      email: '',
      emergencyContact: {
        name: '',
        relationship: '',
        phone: ''
      }
    },

    // US 1.3 - Données administratives
    insurance: {
      provider: '',
      number: '',
      type: ''
    },

    status: 'active'
  });

  const [errors, setErrors] = useState({});
  const [isDuplicateChecking, setIsDuplicateChecking] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneValid, setPhoneValid] = useState(false);
  const [emergencyPhoneValid, setEmergencyPhoneValid] = useState(true); // Optional field

  useEffect(() => {
    if (patient) {
      setFormData({
        firstName: patient.firstName || '',
        lastName: patient.lastName || '',
        birthDate: patient.birthDate || '',
        gender: patient.gender || '',
        idNumber: patient.idNumber || '',
        nationality: patient.nationality || 'Española',
        address: {
          street: patient.address?.street || '',
          city: patient.address?.city || '',
          postalCode: patient.address?.postalCode || '',
          country: patient.address?.country || 'España'
        },
        contact: {
          phone: patient.contact?.phone || '',
          email: patient.contact?.email || '',
          emergencyContact: {
            name: patient.contact?.emergencyContact?.name || '',
            relationship: patient.contact?.emergencyContact?.relationship || '',
            phone: patient.contact?.emergencyContact?.phone || ''
          }
        },
        insurance: {
          provider: patient.insurance?.provider || '',
          number: patient.insurance?.number || '',
          type: patient.insurance?.type || ''
        },
        status: patient.status || 'active'
      });
    }
  }, [patient]);

  // Contrôle des doublons en temps réel - US 1.1
  // Ne vérifier que si on a assez d'information significative
  useEffect(() => {
    if (!patientContext) {
      setDuplicateWarning(null);
      return;
    }

    const firstName = formData.firstName?.trim();
    const lastName = formData.lastName?.trim();
    const email = formData.contact?.email?.trim();

    // Ne vérifier que si on a assez d'information (nom complet ou email valide)
    const hasFullName = firstName && firstName.length >= 2 && lastName && lastName.length >= 2;
    const hasValidEmail = email && email.includes('@') && email.includes('.');

    if (!hasFullName && !hasValidEmail) {
      setDuplicateWarning(null);
      return;
    }

    setIsDuplicateChecking(true);
    try {
      // Use PatientContext's checkDuplicate method (local search in loaded patients)
      const duplicate = patientContext.checkDuplicate(firstName, lastName, email);

      // Ignorer si c'est le patient en cours d'édition
      if (duplicate && duplicate.id !== patient?.id) {
        // Déterminer le type de correspondance
        const emailMatch = hasValidEmail && duplicate.contact?.email?.toLowerCase() === email?.toLowerCase();
        const nameMatch = hasFullName &&
          duplicate.firstName?.toLowerCase() === firstName?.toLowerCase() &&
          duplicate.lastName?.toLowerCase() === lastName?.toLowerCase();

        if (emailMatch || nameMatch) {
          setDuplicateWarning({
            message: emailMatch && nameMatch
              ? 'Un patient avec ce nom et cet email existe déjà'
              : emailMatch
                ? 'Un patient avec cet email existe déjà'
                : 'Un patient avec ce nom existe déjà',
            patientNumber: duplicate.patientNumber,
            patientName: `${duplicate.firstName} ${duplicate.lastName}`,
            type: emailMatch ? 'email' : 'name'
          });
        } else {
          setDuplicateWarning(null);
        }
      } else {
        setDuplicateWarning(null);
      }
    } catch (error) {
      console.error('Error checking duplicates:', error);
      setDuplicateWarning(null);
    } finally {
      setIsDuplicateChecking(false);
    }
  }, [formData.firstName, formData.lastName, formData.contact?.email, patient?.id, patientContext]);

  const validateForm = () => {
    const newErrors = {};

    // ============================================
    // CHAMPS OBLIGATOIRES (4 uniquement)
    // ============================================

    // 1. Prénom (first_name)
    if (!formData.firstName || !formData.firstName.trim()) {
      newErrors.firstName = t('validation.firstNameRequired', 'Le prénom est obligatoire');
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = t('validation.firstNameMinLength', 'Le prénom doit contenir au moins 2 caractères');
    }

    // 2. Nom (last_name)
    if (!formData.lastName || !formData.lastName.trim()) {
      newErrors.lastName = t('validation.lastNameRequired', 'Le nom est obligatoire');
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = t('validation.lastNameMinLength', 'Le nom doit contenir au moins 2 caractères');
    }

    // 3. Email
    if (!formData.contact.email || !formData.contact.email.trim()) {
      newErrors.email = t('validation.emailRequired', 'L\'email est obligatoire');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact.email.trim())) {
      newErrors.email = t('validation.emailInvalid', 'Format d\'email invalide');
    }

    // 4. Téléphone (avec indicatif pays) - validation via PhoneInput
    if (!formData.contact.phone || !formData.contact.phone.trim()) {
      newErrors.phone = t('validation.phoneRequired', 'Le téléphone est obligatoire');
    } else if (!phoneValid) {
      // Parse and validate the phone number
      const parsed = parseFullPhoneNumber(formData.contact.phone);
      if (parsed.countryCode) {
        const validation = validatePhoneForCountry(parsed.localNumber, parsed.countryCode);
        if (!validation.isValid) {
          newErrors.phone = validation.message || t('validation.phoneInvalid', 'Format de téléphone invalide');
        }
      } else {
        newErrors.phone = t('validation.phoneCountryCode', 'Le téléphone doit commencer par l\'indicatif pays (ex: +33)');
      }
    }

    // ============================================
    // TOUS LES AUTRES CHAMPS SONT OPTIONNELS
    // ============================================

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (duplicateWarning && !patient) {
      // Si c'est une création et qu'il y a un doublon, on bloque
      return;
    }

    if (!patientContext) {
      setErrors({ submit: 'Patient context not available' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (patient?.id) {
        // ✅ MISE À JOUR : Utiliser updatePatient du contexte (avec optimistic update)
        await patientContext.updatePatient(patient.id, formData);
      } else {
        // ✅ CRÉATION : Utiliser createPatient du contexte (avec optimistic update)
        await patientContext.createPatient(formData);
      }

      // Appeler le callback onSave pour le parent component
      onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving patient:', error);

      // Parse and translate error messages
      let errorMessage = t('errors.saveFailed', 'Erreur lors de la sauvegarde du patient');
      const errorText = error.response?.data?.error?.message || error.response?.data?.error?.details || error.message || '';

      // Translate common error patterns
      if (errorText.includes('already exists') || errorText.includes('duplicate')) {
        errorMessage = t('errors.duplicatePatient', 'Un patient avec cet email ou ce nom existe déjà dans cette clinique');
      } else if (errorText.includes('facility') || errorText.includes('établissement')) {
        errorMessage = t('errors.facilityRequired', 'Configuration de l\'établissement requise. Contactez votre administrateur.');
      } else if (errorText.includes('foreign key') || errorText.includes('constraint')) {
        errorMessage = t('errors.dataIntegrity', 'Erreur d\'intégrité des données. Veuillez contacter le support.');
      } else if (errorText.includes('email') && errorText.includes('required')) {
        errorMessage = t('errors.emailRequired', 'L\'email est obligatoire');
      } else if (errorText.includes('phone') && errorText.includes('required')) {
        errorMessage = t('errors.phoneRequired', 'Le téléphone est obligatoire');
      } else if (errorText.includes('first_name') || errorText.includes('firstName')) {
        errorMessage = t('errors.firstNameRequired', 'Le prénom est obligatoire');
      } else if (errorText.includes('last_name') || errorText.includes('lastName')) {
        errorMessage = t('errors.lastNameRequired', 'Le nom est obligatoire');
      } else if (errorText.includes('validation') || errorText.includes('invalid')) {
        errorMessage = t('errors.validationFailed', 'Erreur de validation des données');
      } else if (errorText.includes('unauthorized') || errorText.includes('401')) {
        errorMessage = t('errors.unauthorized', 'Session expirée. Veuillez vous reconnecter.');
      } else if (errorText.includes('forbidden') || errorText.includes('403')) {
        errorMessage = t('errors.forbidden', 'Vous n\'avez pas les permissions nécessaires pour cette action.');
      } else if (errorText.includes('network') || errorText.includes('timeout')) {
        errorMessage = t('errors.networkError', 'Erreur de connexion. Vérifiez votre connexion internet.');
      } else if (errorText) {
        // If we have an error message but no specific translation, show it
        errorMessage = errorText;
      }

      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleNestedInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleEmergencyContactChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      contact: {
        ...prev.contact,
        emergencyContact: {
          ...prev.contact.emergencyContact,
          [field]: value
        }
      }
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {patient ? t('editPatient') : t('newPatient')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form - Takes remaining space */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Section 1: Identité - US 1.1 */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2 mb-4">
              <User className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Identidad del Paciente</h3>
            </div>

            {/* Warning doublons */}
            {duplicateWarning && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-orange-600 mr-2 mt-0.5" />
                  <div>
                    <p className="text-orange-800 font-medium">Paciente similar encontrado</p>
                    <p className="text-orange-700 text-sm">
                      {duplicateWarning.message}: {duplicateWarning.patientName} ({duplicateWarning.patientNumber})
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${errors.firstName ? 'border-red-300' : 'border-gray-300'
                    }`}
                  placeholder={t('placeholders.firstName')}
                />
                {errors.firstName && (
                  <p className="text-red-600 text-sm mt-1">{errors.firstName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Apellidos *
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${errors.lastName ? 'border-red-300' : 'border-gray-300'
                    }`}
                  placeholder="Apellidos del paciente"
                />
                {errors.lastName && (
                  <p className="text-red-600 text-sm mt-1">{errors.lastName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Nacimiento
                </label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => handleInputChange('birthDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sexo
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${errors.gender ? 'border-red-300' : 'border-gray-300'
                    }`}
                >
                  <option value="">Seleccionar sexo</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                  <option value="O">Otro</option>
                  <option value="N/A">Prefiere no decir</option>
                </select>
                {errors.gender && (
                  <p className="text-red-600 text-sm mt-1">{errors.gender}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Documento
                </label>
                <input
                  type="text"
                  value={formData.idNumber}
                  onChange={(e) => handleInputChange('idNumber', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${errors.idNumber ? 'border-red-300' : 'border-gray-300'
                    }`}
                  placeholder="DNI, NIE, Pasaporte..."
                />
                {errors.idNumber && (
                  <p className="text-red-600 text-sm mt-1">{errors.idNumber}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nacionalidad
                </label>
                <select
                  value={formData.nationality}
                  onChange={(e) => handleInputChange('nationality', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Seleccionar nacionalidad</option>
                  {nationalities.map(nat => (
                    <option key={nat.code} value={nat.name}>{nat.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Coordonnées - US 1.2 */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2 mb-4">
              <MapPin className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Datos de Contacto</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  value={formData.address.street}
                  onChange={(e) => handleNestedInputChange('address', 'street', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Calle, número, piso..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ciudad
                </label>
                <input
                  type="text"
                  value={formData.address.city}
                  onChange={(e) => handleNestedInputChange('address', 'city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ciudad"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código Postal
                </label>
                <input
                  type="text"
                  value={formData.address.postalCode}
                  onChange={(e) => handleNestedInputChange('address', 'postalCode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Código postal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  País
                </label>
                <select
                  value={formData.address.country}
                  onChange={(e) => handleNestedInputChange('address', 'country', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Seleccionar país</option>
                  {countries.map(country => (
                    <option key={country.code} value={country.code}>
                      {country.flag} {country.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <PhoneInput
                  value={formData.contact.phone}
                  onChange={(e) => {
                    handleNestedInputChange('contact', 'phone', e.target.value);
                    // Clear error when user starts typing
                    if (errors.phone) {
                      setErrors(prev => ({ ...prev, phone: null }));
                    }
                  }}
                  onValidationChange={(isValid) => setPhoneValid(isValid)}
                  defaultCountry={localeCountry}
                  name="phone"
                  label={t('fields.phone', 'Teléfono') + ' *'}
                  required
                  error={errors.phone}
                  showValidation
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.contact.email}
                  onChange={(e) => handleNestedInputChange('contact', 'email', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${errors.email ? 'border-red-300' : 'border-gray-300'
                    }`}
                  placeholder="email@ejemplo.com"
                />
                {errors.email && (
                  <p className="text-red-600 text-sm mt-1">{errors.email}</p>
                )}
              </div>
            </div>

            {/* Contact d'urgence */}
            <div className="border-t pt-4">
              <div className="flex items-center space-x-2 mb-4">
                <Phone className="h-4 w-4 text-red-600" />
                <h4 className="font-medium text-gray-900">Contacto de Emergencia</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={formData.contact.emergencyContact.name}
                    onChange={(e) => handleEmergencyContactChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder={t('placeholders.contactName')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relación
                  </label>
                  <select
                    value={formData.contact.emergencyContact.relationship}
                    onChange={(e) => handleEmergencyContactChange('relationship', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${errors.emergencyRelationship ? 'border-red-300' : 'border-gray-300'
                      }`}
                  >
                    <option value="">Seleccionar relación</option>
                    <option value="Cónyuge">Cónyuge</option>
                    <option value="Hijo/a">Hijo/a</option>
                    <option value="Padre">Padre</option>
                    <option value="Madre">Madre</option>
                    <option value="Hermano/a">Hermano/a</option>
                    <option value="Familiar">Familiar</option>
                    <option value="Amigo/a">Amigo/a</option>
                    <option value="Otro">Otro</option>
                  </select>
                  {errors.emergencyRelationship && (
                    <p className="text-red-600 text-sm mt-1">{errors.emergencyRelationship}</p>
                  )}
                </div>

                <div>
                  <PhoneInput
                    value={formData.contact.emergencyContact.phone}
                    onChange={(e) => handleEmergencyContactChange('phone', e.target.value)}
                    onValidationChange={(isValid) => setEmergencyPhoneValid(isValid)}
                    defaultCountry={localeCountry}
                    name="emergencyPhone"
                    label={t('fields.emergencyPhone', 'Teléfono')}
                    required={false}
                    error={errors.emergencyPhone}
                    showValidation
                    compact
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Données administratives - US 1.3 */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2 mb-4">
              <Building className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Información Administrativa</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seguro Médico
                </label>
                <input
                  type="text"
                  value={formData.insurance.provider}
                  onChange={(e) => handleNestedInputChange('insurance', 'provider', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder={t('placeholders.insuranceName')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Póliza
                </label>
                <input
                  type="text"
                  value={formData.insurance.number}
                  onChange={(e) => handleNestedInputChange('insurance', 'number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Número de póliza"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Seguro
                </label>
                <select
                  value={formData.insurance.type}
                  onChange={(e) => handleNestedInputChange('insurance', 'type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Seleccionar tipo</option>
                  <option value="Pública">Pública (Seguridad Social)</option>
                  <option value="Privada">Privada</option>
                  <option value="Mixta">Mixta</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado del Paciente
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
          </div>

          {/* Error de soumission */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-red-800">{errors.submit}</span>
              </div>
            </div>
          )}

          </div>

          {/* Footer - Fixed at bottom */}
          <div className="flex-shrink-0 flex items-center justify-end space-x-4 p-6 border-t bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (duplicateWarning && !patient)}
              className={`px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 ${(isSubmitting || (duplicateWarning && !patient)) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            >
              <Save className="h-4 w-4" />
              <span>{isSubmitting ? t('saving') + '...' : t('savePatient')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PatientFormModal;