// components/admin/PractitionerManagementModal.js - Gestion des praticiens
import React, { useState, useEffect } from 'react';
import { X, UserPlus, Edit2, Trash2, User, Mail, Phone, Stethoscope, Check, CheckCircle, AlertCircle, Clock, Send, RefreshCw, Shield } from 'lucide-react';
import { healthcareProvidersApi } from '../../api/healthcareProvidersApi';
import { useTranslation } from 'react-i18next';
import PhoneInput, { PhoneDisplay } from '../common/PhoneInput';
import { useLocale } from '../../contexts/LocaleContext';
import { useFormErrors } from '../../hooks/useFormErrors';
import { useAuth } from '../../contexts/SecureAuthContext';
import {
  ONBOARDING_PRACTITIONER_ROLES
} from '../../utils/medicalConstants';

const PractitionerManagementModal = ({ isOpen, onClose, onSave }) => {
  const { t } = useTranslation(['admin', 'common']);
  const { country: localeCountry } = useLocale();
  const { user, company } = useAuth();
  const [practitioners, setPractitioners] = useState([]);
  const [activeTab, setActiveTab] = useState('list');
  const [editingPractitioner, setEditingPractitioner] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    speciality: '',
    license: '',
    isActive: true,
    role: 'physician',
    color: 'blue'
  });

  // États pour le chargement et les notifications
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Hook for standardized form error handling
  const {
    generalError,
    setFieldError,
    clearFieldError,
    clearErrors,
    handleBackendError,
    getFieldError
  } = useFormErrors();

  useEffect(() => {
    if (isOpen) {
      loadPractitioners();
    }
  }, [isOpen]);

  // Auto-hide notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Fonction pour afficher une notification
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  const loadPractitioners = async () => {
    try {
      setIsLoading(true);
      const data = await healthcareProvidersApi.getHealthcareProviders();
      setPractitioners(data.providers || []);
    } catch (error) {
      console.error('[PractitionerManagementModal] Error loading practitioners:', error);
      showNotification(t('practitioners.messages.loadError') || 'Erreur lors du chargement', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    loadPractitioners();
    onSave?.();
  };

  const handleAddNew = () => {
    setEditingPractitioner(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      speciality: '',
      license: '',
      isActive: true,
      role: 'physician',
      color: 'blue'
    });
    setActiveTab('form');
  };

  const handleEdit = (practitioner) => {
    setEditingPractitioner(practitioner);
    setFormData({
      firstName: practitioner.firstName || '',
      lastName: practitioner.lastName || '',
      email: practitioner.email || '',
      phone: practitioner.phone || '',
      speciality: practitioner.speciality || '',
      license: practitioner.license || '',
      isActive: practitioner.isActive !== false,
      role: practitioner.role || practitioner.type || 'physician',
      color: practitioner.color || 'blue'
    });
    setActiveTab('form');
  };

  const handleDelete = async (practitionerId) => {
    if (!window.confirm(t('practitioners.messages.deleteConfirm') || 'Êtes-vous sûr de vouloir supprimer ce praticien ?')) {
      return;
    }

    try {
      setIsSaving(true);
      await healthcareProvidersApi.deleteHealthcareProvider(practitionerId);
      showNotification(t('practitioners.messages.deleteSuccess') || 'Praticien supprimé avec succès', 'success');
      await loadPractitioners();
    } catch (error) {
      console.error('[PractitionerManagementModal] Error deleting practitioner:', error);
      showNotification(t('practitioners.messages.deleteError') || 'Erreur lors de la suppression', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Resend invitation email
  const handleResendInvitation = async (practitioner) => {
    if (!window.confirm(t('admin:practitionersManagement.messages.resendConfirm', 'Renvoyer l\'invitation à {{email}} ?', { email: practitioner.email }))) {
      return;
    }

    try {
      setIsSaving(true);
      await healthcareProvidersApi.resendInvitation(practitioner.id, company?.id);
      showNotification(t('admin:practitionersManagement.messages.resendSuccess', 'Invitation renvoyée avec succès'), 'success');
    } catch (error) {
      console.error('[PractitionerManagementModal] Error resending invitation:', error);
      showNotification(t('admin:practitionersManagement.messages.resendError', 'Erreur lors de l\'envoi de l\'invitation'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Activate account manually (only works if password exists)
  const handleActivate = async (practitioner) => {
    if (!window.confirm(t('admin:practitionersManagement.messages.activateConfirm', 'Activer le compte de {{name}} ?', { name: `${practitioner.firstName} ${practitioner.lastName}` }))) {
      return;
    }

    try {
      setIsSaving(true);
      await healthcareProvidersApi.activateProvider(practitioner.id);
      showNotification(t('admin:practitionersManagement.messages.activateSuccess', 'Compte activé avec succès'), 'success');
      await loadPractitioners();
    } catch (error) {
      console.error('[PractitionerManagementModal] Error activating provider:', error);
      showNotification(t('admin:practitionersManagement.messages.activateError', 'Erreur lors de l\'activation du compte'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Get status badge for practitioner
  const getStatusBadge = (practitioner) => {
    if (practitioner.accountStatus === 'pending') {
      return (
        <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {t('common:statuses.pending', 'En attente')}
        </span>
      );
    }
    if (practitioner.isActive && practitioner.accountStatus === 'active') {
      return (
        <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          {t('common:statuses.active', 'Actif')}
        </span>
      );
    }
    return (
      <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
        {t('common:statuses.inactive', 'Inactif')}
      </span>
    );
  };

  // Validation du formulaire
  const validateForm = () => {
    clearErrors();
    let isValid = true;

    if (!formData.firstName?.trim()) {
      setFieldError('firstName', t('common:validation.required', 'Ce champ est requis'));
      isValid = false;
    }

    if (!formData.lastName?.trim()) {
      setFieldError('lastName', t('common:validation.required', 'Ce champ est requis'));
      isValid = false;
    }

    if (!formData.email?.trim()) {
      setFieldError('email', t('common:validation.required', 'Ce champ est requis'));
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setFieldError('email', t('common:validation.emailInvalid', 'Email invalide'));
      isValid = false;
    }

    if (!formData.speciality?.trim()) {
      setFieldError('speciality', t('common:validation.required', 'Ce champ est requis'));
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setIsSaving(true);

      // Add profession based on role (required by backend)
      const dataToSend = {
        ...formData,
        profession: formData.role === 'physician' ? 'Médecin' : 'Praticien de santé'
      };

      if (editingPractitioner) {
        // Mise à jour d'un praticien existant
        await healthcareProvidersApi.updateHealthcareProvider(editingPractitioner.id, dataToSend);
        showNotification(t('practitioners.messages.updateSuccess') || 'Praticien mis à jour avec succès', 'success');
      } else {
        // Création d'un nouveau praticien
        await healthcareProvidersApi.createHealthcareProvider(dataToSend);
        showNotification(t('practitioners.messages.createSuccess') || 'Praticien créé avec succès', 'success');
      }

      await loadPractitioners();
      setActiveTab('list');
      setEditingPractitioner(null);
      clearErrors();
      onSave?.();
    } catch (error) {
      console.error('[PractitionerManagementModal] Error saving practitioner:', error);
      handleBackendError(error);
      const errorMessage = error.message || (editingPractitioner
        ? t('practitioners.messages.updateError')
        : t('practitioners.messages.createError'))
        || 'Erreur lors de la sauvegarde';
      showNotification(errorMessage, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Rôles standardisés depuis les constantes partagées
  const practitionerTypes = ONBOARDING_PRACTITIONER_ROLES.map(role => ({
    value: role,
    label: t(`admin:practitionersManagement.types.${role}`) || (role === 'physician' ? 'Médecin' : 'Praticien de santé'),
    icon: role === 'physician' ? Stethoscope : User
  }));

  const colorOptions = [
    { value: 'blue', label: t('admin:practitionersManagement.colors.blue'), className: 'bg-blue-500' },
    { value: 'green', label: t('admin:practitionersManagement.colors.green'), className: 'bg-green-500' },
    { value: 'red', label: t('admin:practitionersManagement.colors.red'), className: 'bg-red-500' },
    { value: 'purple', label: t('admin:practitionersManagement.colors.purple'), className: 'bg-purple-500' },
    { value: 'orange', label: t('admin:practitionersManagement.colors.orange'), className: 'bg-orange-500' },
    { value: 'teal', label: t('admin:practitionersManagement.colors.teal'), className: 'bg-teal-500' },
    { value: 'pink', label: t('admin:practitionersManagement.colors.pink'), className: 'bg-pink-500' },
    { value: 'indigo', label: t('admin:practitionersManagement.colors.indigo'), className: 'bg-indigo-500' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-[60] animate-slide-in-right">
          <div className={`rounded-lg shadow-lg p-4 flex items-center space-x-3 min-w-[320px] max-w-md ${
            notification.type === 'success'
              ? 'bg-green-50 border-l-4 border-green-500'
              : 'bg-red-50 border-l-4 border-red-500'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            )}
            <p className={`flex-1 text-sm font-medium ${
              notification.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {notification.message}
            </p>
            <button
              onClick={() => setNotification(null)}
              className={`flex-shrink-0 ${
                notification.type === 'success'
                  ? 'text-green-600 hover:text-green-800'
                  : 'text-red-600 hover:text-red-800'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-green-600 to-green-700">
          <div className="flex items-center space-x-3">
            <User className="h-6 w-6 text-white" />
            <h2 className="text-xl font-semibold text-white">{t('admin:practitionersManagement.title')}</h2>
          </div>
          <button onClick={onClose} className="text-white hover:text-gray-200 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs - Fixed */}
        <div className="flex-shrink-0 border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'list'
                  ? 'border-green-500 text-green-600 bg-green-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <User className="h-4 w-4 inline mr-2" />
              {t('admin:practitionersManagement.tabs.list')}
            </button>
            <button
              onClick={() => setActiveTab('form')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'form'
                  ? 'border-green-500 text-green-600 bg-green-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <UserPlus className="h-4 w-4 inline mr-2" />
              {editingPractitioner ? t('admin:practitionersManagement.tabs.edit') : t('admin:practitionersManagement.tabs.new')}
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'list' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  {t('admin:practitionersManagement.list.title', { count: practitioners.length })}
                </h3>
                <button
                  onClick={handleAddNew}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t('admin:practitionersManagement.buttons.addNew')}
                </button>
              </div>

              {practitioners.length > 0 ? (
                <div className="grid gap-4">
                  {practitioners.map((practitioner) => (
                    <div key={practitioner.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${
                            colorOptions.find(c => c.value === practitioner.color)?.className || 'bg-blue-500'
                          }`}>
                            {practitioner.firstName?.[0]}{practitioner.lastName?.[0]}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium text-gray-900">
                                {practitioner.firstName} {practitioner.lastName}
                              </h4>
                              {getStatusBadge(practitioner)}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              <div className="flex items-center space-x-4">
                                <span className="flex items-center">
                                  <Stethoscope className="h-4 w-4 mr-1" />
                                  {practitioner.speciality}
                                </span>
                                <span className="flex items-center">
                                  <Mail className="h-4 w-4 mr-1" />
                                  {practitioner.email}
                                </span>
                                {practitioner.phone && (
                                  <span className="flex items-center">
                                    <Phone className="h-4 w-4 mr-1" />
                                    <PhoneDisplay value={practitioner.phone} showFlag />
                                  </span>
                                )}
                              </div>
                              <div className="mt-1">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  practitioner.role === 'physician' ? 'bg-blue-100 text-blue-800' :
                                  practitioner.role === 'practitioner' ? 'bg-green-100 text-green-800' :
                                  practitioner.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {practitionerTypes.find(t => t.value === practitioner.role)?.label || practitioner.role}
                                </span>
                                {practitioner.license && (
                                  <span className="ml-2 text-xs text-gray-500">
                                    {t('admin:practitionersManagement.fields.license')}: {practitioner.license}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {/* Resend invitation button - only for pending accounts */}
                          {practitioner.accountStatus === 'pending' && (
                            <button
                              onClick={() => handleResendInvitation(practitioner)}
                              disabled={isSaving}
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                              title={t('admin:practitionersManagement.actions.resendInvitation', 'Renvoyer l\'invitation')}
                            >
                              <Send className="h-4 w-4" />
                            </button>
                          )}
                          {/* Activate button - only for pending accounts */}
                          {practitioner.accountStatus === 'pending' && (
                            <button
                              onClick={() => handleActivate(practitioner)}
                              disabled={isSaving}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                              title={t('admin:practitionersManagement.actions.activate', 'Activer le compte')}
                            >
                              <Shield className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(practitioner)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title={t('common:edit')}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(practitioner.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={t('common:delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">{t('admin:practitionersManagement.list.empty')}</p>
                  <button
                    onClick={handleAddNew}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    {t('admin:practitionersManagement.buttons.addFirst')}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'form' && (
            <div className="h-full flex flex-col">
              <h3 className="flex-shrink-0 text-lg font-medium text-gray-900 mb-6">
                {editingPractitioner ? t('admin:practitionersManagement.modal.editTitle') : t('admin:practitionersManagement.modal.createTitle')}
              </h3>

              <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto space-y-6">
                {/* General error display */}
                {(getFieldError('general') || generalError) && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                    <p className="text-sm text-red-700">{getFieldError('general') || generalError?.message}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('common:firstName')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, firstName: e.target.value }));
                        clearFieldError('firstName');
                      }}
                      className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                        getFieldError('firstName') ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder={t('admin:practitionersManagement.placeholders.firstName')}
                    />
                    {getFieldError('firstName') && (
                      <p className="text-red-500 text-xs mt-1">{getFieldError('firstName')}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('common:lastName')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, lastName: e.target.value }));
                        clearFieldError('lastName');
                      }}
                      className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                        getFieldError('lastName') ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder={t('admin:practitionersManagement.placeholders.lastName')}
                    />
                    {getFieldError('lastName') && (
                      <p className="text-red-500 text-xs mt-1">{getFieldError('lastName')}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('common:email')} *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, email: e.target.value }));
                        clearFieldError('email');
                      }}
                      className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                        getFieldError('email') ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="email@example.com"
                    />
                    {getFieldError('email') && (
                      <p className="text-red-500 text-xs mt-1">{getFieldError('email')}</p>
                    )}
                  </div>

                  <div>
                    <PhoneInput
                      value={formData.phone}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, phone: e.target.value }));
                        clearFieldError('phone');
                      }}
                      defaultCountry={localeCountry}
                      name="practitionerPhone"
                      label={t('common:phone')}
                      required={false}
                      error={getFieldError('phone')}
                      showValidation
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('common:specialty')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.speciality}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, speciality: e.target.value }));
                        clearFieldError('speciality');
                      }}
                      className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                        getFieldError('speciality') ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder={t('admin:practitionersManagement.placeholders.specialty')}
                    />
                    {getFieldError('speciality') && (
                      <p className="text-red-500 text-xs mt-1">{getFieldError('speciality')}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin:practitionersManagement.fields.license')}
                    </label>
                    <input
                      type="text"
                      value={formData.license}
                      onChange={(e) => setFormData(prev => ({ ...prev, license: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder={t('admin:practitionersManagement.placeholders.license')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin:practitionersManagement.fields.type')} *
                    </label>
                    <select
                      required
                      value={formData.role}
                      onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      {practitionerTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin:practitionersManagement.fields.displayColor')}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {colorOptions.map(color => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                          className={`w-8 h-8 rounded-full ${color.className} flex items-center justify-center transition-transform hover:scale-110 ${
                            formData.color === color.value ? 'ring-2 ring-gray-400 ring-offset-2' : ''
                          }`}
                          title={color.label}
                        >
                          {formData.color === color.value && (
                            <Check className="h-4 w-4 text-white" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">{t('admin:practitionersManagement.fields.isActive')}</span>
                  </label>
                </div>
                </div>

                {/* Footer - Fixed at bottom */}
                <div className="flex-shrink-0 flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-white">
                  <button
                    type="button"
                    onClick={() => setActiveTab('list')}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    {t('common:cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    {editingPractitioner ? t('common:update') : t('common:create')}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer - For list tab */}
        {activeTab === 'list' && (
          <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 flex items-center justify-end bg-white">
            <button
              onClick={() => {
                handleSave();
                onClose();
              }}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              {t('common:close')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PractitionerManagementModal;