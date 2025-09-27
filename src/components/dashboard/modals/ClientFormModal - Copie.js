// components/dashboard/modals/ClientFormModal.js
import React, { useState, useEffect } from 'react';
import { X, Building, User, Save } from 'lucide-react';
import { validateEmail, validateSiret, validateRequired, validatePhoneNumber } from '../../../utils/validation';

const ClientFormModal = ({ isOpen, onClose, onSave, client = null }) => {
  const [formData, setFormData] = useState({
    type: 'business', // 'business' ou 'individual'
    companyName: '',
    name: '',
    firstName: '',
    email: '',
    phone: '',
    address: '',
    postalCode: '',
    city: '',
    country: 'France',
    siret: '',
    invoicePattern: '',
    notes: ''
  });
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Remplir le formulaire si on modifie un client existant
  useEffect(() => {
    if (client) {
      setFormData({
        type: client.type || 'business',
        companyName: client.companyName || '',
        name: client.name || '',
        firstName: client.firstName || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        postalCode: client.postalCode || '',
        city: client.city || '',
        country: client.country || 'France',
        siret: client.siret || '',
        invoicePattern: client.invoicePattern || '',
        notes: client.notes || ''
      });
    } else {
      // Reset pour nouveau client
      setFormData({
        type: 'business',
        companyName: '',
        name: '',
        firstName: '',
        email: '',
        phone: '',
        address: '',
        postalCode: '',
        city: '',
        country: 'France',
        siret: '',
        invoicePattern: '',
        notes: ''
      });
    }
    setErrors({});
  }, [client, isOpen]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Effacer l'erreur quand l'utilisateur corrige
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validation selon le type
    if (formData.type === 'business') {
      if (!formData.companyName.trim()) {
        newErrors.companyName = 'Nom de l\'entreprise requis';
      }
      
      if (formData.siret && !validateSiret(formData.siret)) {
        newErrors.siret = 'SIRET invalide (14 chiffres)';
      }
    } else {
      if (!formData.firstName.trim()) {
        newErrors.firstName = 'Prénom requis';
      }
      
      if (!formData.name.trim()) {
        newErrors.name = 'Nom requis';
      }
    }

    // Validations communes
    if (!formData.email.trim()) {
      newErrors.email = 'Email requis';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Email invalide';
    }

    if (formData.phone && !validatePhoneNumber(formData.phone)) {
      newErrors.phone = 'Numéro de téléphone invalide';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Adresse requise';
    }

    if (!formData.postalCode.trim()) {
      newErrors.postalCode = 'Code postal requis';
    } else if (!/^\d{5}$/.test(formData.postalCode)) {
      newErrors.postalCode = 'Code postal invalide (5 chiffres)';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'Ville requise';
    }

    return newErrors;
  };

  const handleSubmit = async () => {
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    
    try {
      // Préparer les données client
      const clientData = {
        ...formData,
        // Nom d'affichage selon le type
        displayName: formData.type === 'business' 
          ? formData.companyName 
          : `${formData.firstName} ${formData.name}`.trim()
      };

      await onSave(clientData);
      onClose();
    } catch (error) {
      console.error('Erreur sauvegarde client:', error);
      setErrors({ general: 'Erreur lors de la sauvegarde' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            {client ? 'Modifier le client' : 'Nouveau client'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-6 overflow-y-auto max-h-[calc(75vh-160px)]">
          {/* Sélection du type */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Type de client *
            </label>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => handleInputChange('type', 'business')}
                className={`flex items-center space-x-2 px-4 py-3 border-2 rounded-lg transition-colors ${
                  formData.type === 'business'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Building className="h-5 w-5" />
                <span>Entreprise</span>
              </button>
              
              <button
                type="button"
                onClick={() => handleInputChange('type', 'individual')}
                className={`flex items-center space-x-2 px-4 py-3 border-2 rounded-lg transition-colors ${
                  formData.type === 'individual'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <User className="h-5 w-5" />
                <span>Particulier</span>
              </button>
            </div>
          </div>

          {/* Informations selon le type */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {formData.type === 'business' ? (
              <>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom de l'entreprise *
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.companyName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Ma Super Entreprise SARL"
                  />
                  {errors.companyName && <p className="text-red-500 text-sm mt-1">{errors.companyName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SIRET (optionnel)
                  </label>
                  <input
                    type="text"
                    value={formData.siret}
                    onChange={(e) => handleInputChange('siret', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.siret ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="12345678901234"
                    maxLength="14"
                  />
                  {errors.siret && <p className="text-red-500 text-sm mt-1">{errors.siret}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact principal
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Nom du contact"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.firstName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Jean"
                  />
                  {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Dupont"
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>
              </>
            )}
          </div>

          {/* Contact */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="contact@exemple.fr"
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Téléphone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="+33 1 23 45 67 89"
              />
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
            </div>
          </div>

          {/* Adresse */}
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse *
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.address ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="123 Rue de la République"
              />
              {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Code postal *
              </label>
              <input
                type="text"
                value={formData.postalCode}
                onChange={(e) => handleInputChange('postalCode', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.postalCode ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="75001"
                maxLength="5"
              />
              {errors.postalCode && <p className="text-red-500 text-sm mt-1">{errors.postalCode}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ville *
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.city ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Paris"
              />
              {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pays
              </label>
              <select
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="France">France</option>
                <option value="Belgique">Belgique</option>
                <option value="Suisse">Suisse</option>
                <option value="Luxembourg">Luxembourg</option>
              </select>
            </div>
          </div>

          {/* Configuration facturation */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration facturation</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pattern de numérotation personnalisé (optionnel)
              </label>
              <input
                type="text"
                value={formData.invoicePattern}
                onChange={(e) => handleInputChange('invoicePattern', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ex: CLI-{YYYY}-{NNNN} → CLI-2024-0001"
              />
              <p className="text-sm text-gray-500 mt-1">
                Variables disponibles : {'{YYYY}'} (année), {'{MM}'} (mois), {'{NNNN}'} (numéro)
              </p>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes internes (optionnel)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Notes sur ce client..."
            />
          </div>

          {/* Affichage des erreurs générales */}
          {errors.general && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{errors.general}</p>
            </div>
          )}
        </div>

        {/* Footer fixe */}
        <div className="flex justify-end space-x-4 p-6 border-t bg-gray-50 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{isLoading ? 'Sauvegarde...' : (client ? 'Modifier' : 'Créer')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientFormModal;