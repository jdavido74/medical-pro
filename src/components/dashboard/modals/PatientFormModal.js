// components/dashboard/modals/PatientFormModal.js
import React, { useState, useEffect, useContext } from 'react';
import {
  X, Save, User, Calendar, MapPin, Phone, Mail, Shield,
  Heart, AlertCircle, Check, Users, Building
} from 'lucide-react';
import { PatientContext } from '../../../contexts/PatientContext';

const PatientFormModal = ({ patient, isOpen, onClose, onSave }) => {
  const patientContext = useContext(PatientContext);

  const [formData, setFormData] = useState({
    // US 1.1 - Identité du patient
    firstName: '',
    lastName: '',
    birthDate: '',
    gender: '',
    idNumber: '',
    nationality: 'Española',

    // US 1.2 - Coordonnées
    address: {
      street: '',
      city: '',
      postalCode: '',
      country: 'España'
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
  useEffect(() => {
    if (formData.firstName && formData.lastName && formData.birthDate) {
      checkDuplicates();
    } else {
      setDuplicateWarning(null);
    }
  }, [formData.firstName, formData.lastName, formData.birthDate]);

  const checkDuplicates = () => {
    if (!patientContext) return;

    setIsDuplicateChecking(true);
    try {
      // Use PatientContext's checkDuplicate method (local search in loaded patients)
      // This performs local duplicate detection without API call
      const duplicate = patientContext.checkDuplicate(
        formData.firstName,
        formData.lastName,
        formData.contact?.email
      );

      if (duplicate && duplicate.id !== patient?.id) {
        setDuplicateWarning({
          message: `Ya existe un paciente con el mismo nombre`,
          patientNumber: duplicate.patientNumber,
          patientName: `${duplicate.firstName} ${duplicate.lastName}`
        });
      } else {
        setDuplicateWarning(null);
      }
    } catch (error) {
      console.error('Error checking duplicates:', error);
    } finally {
      setIsDuplicateChecking(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validation US 1.1 - Champs obligatoires identité
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'El nombre es obligatorio';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Los apellidos son obligatorios';
    }
    if (!formData.birthDate) {
      newErrors.birthDate = 'La fecha de nacimiento es obligatoria';
    }
    if (!formData.gender) {
      newErrors.gender = 'El sexo es obligatorio';
    }
    if (!formData.idNumber.trim()) {
      newErrors.idNumber = 'El número de documento es obligatorio';
    }

    // Validation US 1.2 - Email format
    if (formData.contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact.email)) {
      newErrors.email = 'Formato de email inválido';
    }

    // Validation téléphone
    if (formData.contact.phone && !/^[\+]?[\d\s\-\(\)]{9,}$/.test(formData.contact.phone)) {
      newErrors.phone = 'Formato de teléfono inválido';
    }

    // Contact d'urgence - si nom renseigné, relation et téléphone obligatoires
    if (formData.contact.emergencyContact.name) {
      if (!formData.contact.emergencyContact.relationship) {
        newErrors.emergencyRelationship = 'La relación con el contacto de emergencia es obligatoria';
      }
      if (!formData.contact.emergencyContact.phone) {
        newErrors.emergencyPhone = 'El teléfono del contacto de emergencia es obligatorio';
      }
    }

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
      setErrors({ submit: error.message || 'Error saving patient' });
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {patient ? 'Editar Paciente' : 'Nuevo Paciente'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
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
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.firstName ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Nombre del paciente"
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
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.lastName ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Apellidos del paciente"
                />
                {errors.lastName && (
                  <p className="text-red-600 text-sm mt-1">{errors.lastName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Nacimiento *
                </label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => handleInputChange('birthDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.birthDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.birthDate && (
                  <p className="text-red-600 text-sm mt-1">{errors.birthDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sexo *
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.gender ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Seleccionar sexo</option>
                  <option value="male">Masculino</option>
                  <option value="female">Femenino</option>
                  <option value="other">Otro</option>
                </select>
                {errors.gender && (
                  <p className="text-red-600 text-sm mt-1">{errors.gender}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Documento *
                </label>
                <input
                  type="text"
                  value={formData.idNumber}
                  onChange={(e) => handleInputChange('idNumber', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.idNumber ? 'border-red-300' : 'border-gray-300'
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
                <input
                  type="text"
                  value={formData.nationality}
                  onChange={(e) => handleInputChange('nationality', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Nacionalidad"
                />
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
                <input
                  type="text"
                  value={formData.address.country}
                  onChange={(e) => handleNestedInputChange('address', 'country', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="País"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={formData.contact.phone}
                  onChange={(e) => handleNestedInputChange('contact', 'phone', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.phone ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="+34 600 123 456"
                />
                {errors.phone && (
                  <p className="text-red-600 text-sm mt-1">{errors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.contact.email}
                  onChange={(e) => handleNestedInputChange('contact', 'email', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
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
                    placeholder="Nombre del contacto"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relación
                  </label>
                  <select
                    value={formData.contact.emergencyContact.relationship}
                    onChange={(e) => handleEmergencyContactChange('relationship', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      errors.emergencyRelationship ? 'border-red-300' : 'border-gray-300'
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.contact.emergencyContact.phone}
                    onChange={(e) => handleEmergencyContactChange('phone', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      errors.emergencyPhone ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="+34 600 123 456"
                  />
                  {errors.emergencyPhone && (
                    <p className="text-red-600 text-sm mt-1">{errors.emergencyPhone}</p>
                  )}
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
                  placeholder="Nombre del seguro"
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

          {/* Boutons d'action */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t">
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
              className={`px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 ${
                (isSubmitting || (duplicateWarning && !patient)) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Save className="h-4 w-4" />
              <span>{isSubmitting ? 'Guardando...' : 'Guardar Paciente'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PatientFormModal;