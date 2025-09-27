// components/dashboard/modals/ClientFormModal.js
import React, { useState, useEffect } from 'react';
import { X, Building, User, Save, FileText, CreditCard, Info } from 'lucide-react';
import { validateEmail, validateRequired } from '../../../utils/validation';
import { useCountryConfig, countryValidation } from '../../../config/ConfigManager';

const ClientFormModal = ({ isOpen, onClose, onSave, client = null }) => {
  const { config, loading: configLoading, error: configError } = useCountryConfig();
  
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
    country: '',
    // Champ dynamique selon pays (SIRET/CIF)
    businessNumber: '',
    vatNumber: '',
    // NOUVEAU : Référence fournisseur (point 8)
    supplierReference: '',
    // NOUVEAU : Champs pour factures (point 6)
    invoiceSettings: {
      specificTerms: '', // Conditions générales spécifiques
      paymentInstructions: '', // Instructions de paiement
      legalMentions: '', // Mentions légales additionnelles
      displaySupplierRef: true // Afficher la référence fournisseur sur facture
    },
    notes: ''
  });
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Initialiser avec configuration pays
  useEffect(() => {
    if (config && !client) {
      setFormData(prev => ({
        ...prev,
        country: config.country.name
      }));
    }
  }, [config, client]);

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
        country: client.country || config?.country.name || 'France',
        businessNumber: client.businessNumber || client.siret || client.cif || '',
        vatNumber: client.vatNumber || '',
        supplierReference: client.supplierReference || '',
        invoiceSettings: {
          specificTerms: client.invoiceSettings?.specificTerms || '',
          paymentInstructions: client.invoiceSettings?.paymentInstructions || '',
          legalMentions: client.invoiceSettings?.legalMentions || '',
          displaySupplierRef: client.invoiceSettings?.displaySupplierRef !== false
        },
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
        country: config?.country.name || 'France',
        businessNumber: '',
        vatNumber: '',
        supplierReference: '',
        invoiceSettings: {
          specificTerms: '',
          paymentInstructions: '',
          legalMentions: '',
          displaySupplierRef: true
        },
        notes: ''
      });
    }
    setErrors({});
  }, [client, isOpen, config]);

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      // Gérer les champs imbriqués (invoiceSettings)
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    
    // Effacer l'erreur quand l'utilisateur corrige
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    if (!config) return { general: 'Configuration en cours de chargement...' };
    
    const newErrors = {};
    const businessConfig = config.business;
    const vatConfig = config.taxation.vatNumber;

    // Validation selon le type
    if (formData.type === 'business') {
      if (!formData.companyName.trim()) {
        newErrors.companyName = 'Nom de l\'entreprise requis';
      }
      
      // Validation numéro d'entreprise selon pays
      if (formData.businessNumber && !countryValidation.validateBusinessNumber(formData.businessNumber)) {
        newErrors.businessNumber = `${businessConfig.registrationNumber.label} invalide`;
      }
      
      // Validation numéro TVA selon pays
      if (vatConfig.required && !formData.vatNumber) {
        newErrors.vatNumber = `Numéro ${config.taxation.vatLabel} requis`;
      } else if (formData.vatNumber && !countryValidation.validateVATNumber(formData.vatNumber)) {
        newErrors.vatNumber = `Numéro ${config.taxation.vatLabel} invalide`;
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

    if (formData.phone && !countryValidation.validatePhone(formData.phone)) {
      newErrors.phone = 'Numéro de téléphone invalide';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Adresse requise';
    }

    if (!formData.postalCode.trim()) {
      newErrors.postalCode = 'Code postal requis';
    } else if (!countryValidation.validatePostalCode(formData.postalCode)) {
      newErrors.postalCode = 'Code postal invalide';
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
      // Préparer les données client avec champs dynamiques selon pays
      const clientData = {
        ...formData,
        // Nom d'affichage selon le type
        displayName: formData.type === 'business' 
          ? formData.companyName 
          : `${formData.firstName} ${formData.name}`.trim(),
        // Champ dynamique selon pays
        [config.business.registrationNumber.field]: formData.businessNumber
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
  
  if (configLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement de la configuration...</p>
          </div>
        </div>
      </div>
    );
  }

  if (configError) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl p-8">
          <div className="text-center">
            <X className="h-8 w-8 text-red-600 mx-auto mb-4" />
            <p className="text-red-600 mb-4">Erreur de configuration : {configError}</p>
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-bold text-gray-900">
              {client ? 'Modifier le client' : 'Nouveau client'}
            </h2>
            <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {config.country.name}
            </span>
          </div>
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
                    {countryValidation.getBusinessNumberLabel()} {config.business.registrationNumber.required ? '*' : '(optionnel)'}
                  </label>
                  <input
                    type="text"
                    value={formData.businessNumber}
                    onChange={(e) => handleInputChange('businessNumber', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.businessNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder={countryValidation.getBusinessNumberPlaceholder()}
                    maxLength={config.business.registrationNumber.length}
                  />
                  {errors.businessNumber && <p className="text-red-500 text-sm mt-1">{errors.businessNumber}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numéro {config.taxation.vatLabel} {config.taxation.vatNumber.required ? '*' : '(optionnel)'}
                  </label>
                  <input
                    type="text"
                    value={formData.vatNumber}
                    onChange={(e) => handleInputChange('vatNumber', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.vatNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder={config.taxation.vatNumber.placeholder}
                  />
                  {errors.vatNumber && <p className="text-red-500 text-sm mt-1">{errors.vatNumber}</p>}
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

                {/* NOUVEAU : Référence fournisseur */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Référence fournisseur
                  </label>
                  <input
                    type="text"
                    value={formData.supplierReference}
                    onChange={(e) => handleInputChange('supplierReference', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="REF-FOUR-001"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Référence que ce client vous attribue comme fournisseur
                  </p>
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
                placeholder={config.business.addressFormat.postalCodePlaceholder}
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
              <input
                type="text"
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={config.country.name}
              />
            </div>
          </div>

          {/* NOUVEAU : Configuration facturation (point 6) */}
          <div className="mb-6 bg-green-50 rounded-lg p-4 border border-green-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-green-600" />
              Paramètres de facturation
            </h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conditions générales spécifiques
                </label>
                <textarea
                  value={formData.invoiceSettings.specificTerms}
                  onChange={(e) => handleInputChange('invoiceSettings.specificTerms', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Conditions particulières pour ce client..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Apparaîtra sur toutes les factures de ce client
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instructions de paiement
                </label>
                <textarea
                  value={formData.invoiceSettings.paymentInstructions}
                  onChange={(e) => handleInputChange('invoiceSettings.paymentInstructions', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Modalités de paiement spécifiques..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Instructions de paiement personnalisées
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mentions légales additionnelles
                </label>
                <textarea
                  value={formData.invoiceSettings.legalMentions}
                  onChange={(e) => handleInputChange('invoiceSettings.legalMentions', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Mentions légales supplémentaires..."
                />
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.invoiceSettings.displaySupplierRef}
                  onChange={(e) => handleInputChange('invoiceSettings.displaySupplierRef', e.target.checked)}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                />
                <label className="text-sm text-gray-700">
                  Afficher la référence fournisseur sur les factures
                </label>
              </div>
            </div>
          </div>

          {/* Notes internes */}
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