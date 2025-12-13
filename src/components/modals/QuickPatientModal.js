// components/modals/QuickPatientModal.js
import React, { useState, useEffect, useContext } from 'react';
import { X, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { PatientContext } from '../../contexts/PatientContext';
import PhoneInput from '../common/PhoneInput';

const QuickPatientModal = ({ isOpen, onClose, onSave, initialSearchQuery = '' }) => {
  const { user } = useAuth();
  const patientContext = useContext(PatientContext);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [phoneValid, setPhoneValid] = useState(true); // Optional field

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });

  // Pré-remplir le nom et prénom si présent
  useEffect(() => {
    if (initialSearchQuery && isOpen) {
      // Essayer de diviser la recherche en nom et prénom
      const parts = initialSearchQuery.trim().split(' ');
      if (parts.length === 1) {
        setFormData(prev => ({
          ...prev,
          firstName: parts[0],
          lastName: ''
        }));
      } else if (parts.length >= 2) {
        setFormData(prev => ({
          ...prev,
          firstName: parts[0],
          lastName: parts.slice(1).join(' ')
        }));
      }
    }
  }, [initialSearchQuery, isOpen]);

  // Vérifier les doublons en temps réel (email + nom)
  useEffect(() => {
    if (!patientContext) return;

    if (formData.firstName || formData.lastName || formData.email) {
      // Use PatientContext's checkDuplicate method (local search in loaded patients)
      const duplicate = patientContext.checkDuplicate(
        formData.firstName,
        formData.lastName,
        formData.email
      );

      if (duplicate) {
        setDuplicateWarning({
          message: `Un patient avec ce nom ou email existe déjà`,
          patientNumber: duplicate.patientNumber,
          type: 'warning',
          patient: duplicate
        });
      } else {
        setDuplicateWarning(null);
      }
    }
  }, [formData.firstName, formData.lastName, formData.email, patientContext]);

  // Validation du formulaire
  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName?.trim()) {
      newErrors.firstName = 'Le prénom est requis';
    }

    if (!formData.lastName?.trim()) {
      newErrors.lastName = 'Le nom est requis';
    }

    if (formData.email && !formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = 'Email invalide';
    }

    if (formData.phone && !phoneValid) {
      newErrors.phone = 'Format de téléphone invalide';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Sauvegarder le nouveau patient
  const handleSave = async () => {
    if (!validateForm()) return;

    // Vérifier les doublons
    if (duplicateWarning) {
      if (!window.confirm(
        `Un patient "${formData.firstName} ${formData.lastName}" existe déjà (${duplicateWarning.patientNumber}).\n\nÊtes-vous sûr de vouloir créer un doublon ?`
      )) {
        return;
      }
    }

    setIsLoading(true);
    try {
      // ✅ SYNCHRONISATION IMMÉDIATE : Créer le patient via le contexte
      // PatientContext gère l'optimistic update + API sync en background
      const newPatient = await patientContext.createPatient({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        // Structure standardisée de données
        address: {
          street: '',
          city: '',
          postalCode: '',
          country: ''
        },
        contact: {
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          emergencyContact: {
            name: '',
            relationship: '',
            phone: ''
          }
        },
        status: 'active'
      });

      // L'API call s'est bien déroulée
      onSave(newPatient);
      onClose();
    } catch (error) {
      console.error('Erreur lors de la création du patient:', error);
      setErrors({ general: error.message || 'Erreur lors de la création du patient' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-green-50 to-blue-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Nouveau patient rapide
              </h2>
              <p className="text-xs text-gray-500">
                Créez un profil minimal et complétez-le plus tard
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Avertissement doublon */}
          {duplicateWarning && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-800">
                    ⚠️ Patient détecté
                  </p>
                  <p className="text-sm text-orange-700 mt-1 font-semibold">
                    {duplicateWarning.message}
                  </p>
                  <div className="mt-2 text-xs text-orange-700 space-y-1 bg-white bg-opacity-50 p-2 rounded">
                    <p><strong>Type de correspondance :</strong> {duplicateWarning.type === 'email' ? '📧 Email' : '👤 Nom et prénom'}</p>
                    {duplicateWarning.patient && (
                      <>
                        <p><strong>Numéro patient :</strong> {duplicateWarning.patient.patientNumber}</p>
                        <p><strong>Status :</strong> {duplicateWarning.patient.status === 'active' ? '✓ Actif' : '⚠️ Inactif'}</p>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-orange-700 mt-2">
                    Vérifiez que vous ne créez pas un doublon. Vous pouvez procéder si vous êtes certain qu'il s'agit d'une nouvelle personne.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Erreur générale */}
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{errors.general}</p>
            </div>
          )}

          {/* Prénom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prénom *
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
                errors.firstName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Jean"
              disabled={isLoading}
            />
            {errors.firstName && (
              <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>
            )}
          </div>

          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom *
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
                errors.lastName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Dupont"
              disabled={isLoading}
            />
            {errors.lastName && (
              <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="jean.dupont@email.com"
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          {/* Téléphone */}
          <PhoneInput
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            onValidationChange={(isValid) => setPhoneValid(isValid)}
            defaultCountry="FR"
            name="phone"
            label="Téléphone"
            required={false}
            disabled={isLoading}
            error={errors.phone}
            showValidation
            compact
          />

          {/* Info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">
              💡 <span className="font-medium">Astuce :</span> Vous pourrez compléter le profil (date de naissance, adresse, assurance, etc.) ultérieurement depuis la page Patients.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50 gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            <span>{isLoading ? 'Création...' : 'Créer'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickPatientModal;
