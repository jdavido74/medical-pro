// components/dashboard/modules/SettingsModule.js
import React, { useState, useEffect } from 'react';
import {
  User, Building, Shield, CreditCard, Bell, Save,
  Upload, Eye, EyeOff, CheckCircle, Package, Plus, Edit2, Trash2,
  X, AlertCircle, Clock
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { catalogStorage, productsStorage, servicesStorage } from '../../../utils/productsStorage';
import { facilitiesApi } from '../../../api/facilitiesApi';
import { profileApi } from '../../../api/profileApi';
import { clinicSettingsApi } from '../../../api/clinicSettingsApi';
import PractitionerAvailabilityWeekly from '../../calendar/PractitionerAvailabilityWeekly';

const SettingsModule = () => {
  const { user, company, refreshUser } = useAuth();
  const { t } = useTranslation('admin');
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [facility, setFacility] = useState(null);
  const [clinicSettings, setClinicSettings] = useState(null);
  const [error, setError] = useState(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const logoInputRef = React.useRef(null);

  // État pour les notifications
  const [notification, setNotification] = useState(null);

  // États pour les formulaires
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    companyName: user?.companyName || '',
    facilityNumber: '',
    phone: company?.phone || '',
    address: company?.address || '',
    postalCode: company?.postalCode || '',
    city: company?.city || '',
    country: company?.country || 'France'
  });

  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: false
  });

  // Epic 7: États pour le catalogue de produits/services
  const [catalogItems, setCatalogItems] = useState([]);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    type: 'product' // product, service, bundle
  });

  // Charger les données de l'établissement depuis l'API
  useEffect(() => {
    loadFacilityData();
  }, []);

  // Charger les paramètres de la clinique pour les disponibilités
  useEffect(() => {
    const loadClinicSettings = async () => {
      try {
        const settings = await clinicSettingsApi.getClinicSettings();
        setClinicSettings(settings);
      } catch (err) {
        console.error('[SettingsModule] Error loading clinic settings:', err);
        // Non-blocking error - availability will work without clinic hours
      }
    };
    loadClinicSettings();
  }, []);

  const loadFacilityData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const facilityData = await facilitiesApi.getCurrentFacility();
      setFacility(facilityData);

      // Mettre à jour profileData avec les données de l'API
      setProfileData(prev => ({
        ...prev,
        name: user?.name || prev.name,
        email: user?.email || prev.email,
        companyName: facilityData?.name || company?.name || prev.companyName,
        facilityNumber: facilityData?.facilityNumber || '',
        phone: facilityData?.phone || company?.phone || prev.phone,
        address: facilityData?.address || company?.address || prev.address,
        postalCode: facilityData?.postalCode || company?.postalCode || prev.postalCode,
        city: facilityData?.city || company?.city || prev.city,
        country: facilityData?.country || company?.country || prev.country || 'FR'
      }));
    } catch (error) {
      console.error('[SettingsModule] Error loading facility data:', error);
      setError(t('settings.messages.loadError'));
      // Fallback sur les données du contexte
      setProfileData(prev => ({
        ...prev,
        name: user?.name || prev.name,
        email: user?.email || prev.email,
        companyName: user?.companyName || company?.name || prev.companyName,
        phone: company?.phone || prev.phone,
        address: company?.address || prev.address,
        postalCode: company?.postalCode || prev.postalCode,
        city: company?.city || prev.city,
        country: company?.country || prev.country || 'France'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Charger le catalogue au montage
  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = () => {
    const items = catalogStorage.getAll();
    setCatalogItems(items);
  };

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

  // Logo upload handlers
  const handleLogoChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showNotification(t('settings.messages.logoInvalidType', 'Type de fichier invalide. PNG, JPG ou WebP uniquement.'), 'error');
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      showNotification(t('settings.messages.logoTooLarge', 'Le fichier est trop volumineux (max 2 Mo).'), 'error');
      return;
    }

    setIsUploadingLogo(true);
    try {
      const result = await facilitiesApi.uploadLogo(file);

      // Update facility with new logo URL
      setFacility(prev => ({ ...prev, logoUrl: result.logo_url }));
      setLogoPreview(null);
      showNotification(t('settings.messages.logoUploaded', 'Logo mis à jour avec succès'), 'success');
    } catch (error) {
      console.error('[SettingsModule] Error uploading logo:', error);
      showNotification(t('settings.messages.logoUploadError', 'Erreur lors de l\'upload du logo'), 'error');
    } finally {
      setIsUploadingLogo(false);
      // Reset file input
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (!window.confirm(t('settings.messages.logoRemoveConfirm', 'Êtes-vous sûr de vouloir supprimer le logo ?'))) {
      return;
    }

    setIsUploadingLogo(true);
    try {
      await facilitiesApi.removeLogo();
      setFacility(prev => ({ ...prev, logoUrl: null }));
      showNotification(t('settings.messages.logoRemoved', 'Logo supprimé avec succès'), 'success');
    } catch (error) {
      console.error('[SettingsModule] Error removing logo:', error);
      showNotification(t('settings.messages.logoRemoveError', 'Erreur lors de la suppression du logo'), 'error');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleLogoDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();

    const file = event.dataTransfer?.files?.[0];
    if (file) {
      // Create a synthetic event to pass to handleLogoChange
      const syntheticEvent = {
        target: { files: [file] }
      };
      handleLogoChange(syntheticEvent);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  // Build logo URL - handle both relative and absolute paths
  const getLogoUrl = () => {
    if (!facility?.logoUrl) return null;
    // If it's already an absolute URL, return as-is
    if (facility.logoUrl.startsWith('http')) return facility.logoUrl;
    // Otherwise prepend the API base URL
    const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    return `${apiBase}${facility.logoUrl}`;
  };

  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.administrativeRole === 'clinic_admin';

  // All tabs definition
  const allTabs = [
    { id: 'profile', label: t('settings.tabs.profile'), icon: User, adminOnly: false },
    { id: 'availability', label: t('availability.myAvailability', 'Mes disponibilités'), icon: Clock, adminOnly: false },
    { id: 'security', label: t('settings.tabs.security'), icon: Shield, adminOnly: false },
    { id: 'company', label: t('settings.tabs.company'), icon: Building, adminOnly: true },
    { id: 'catalog', label: t('settings.tabs.catalog'), icon: Package, adminOnly: true },
    { id: 'billing', label: t('settings.tabs.billing'), icon: CreditCard, adminOnly: true },
    { id: 'notifications', label: t('settings.tabs.notifications'), icon: Bell, adminOnly: true }
  ];

  // Filter tabs based on role
  const tabs = allTabs.filter(tab => !tab.adminOnly || isAdmin);

  const handleInputChange = (section, field, value) => {
    if (section === 'profile') {
      setProfileData(prev => ({ ...prev, [field]: value }));
    } else if (section === 'security') {
      setSecurityData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSave = async (section) => {
    console.log('[SettingsModule] handleSave called for section:', section);
    setIsSaving(true);
    setError(null);

    try {
      if (section === 'profile') {
        // Mise à jour du profil utilisateur dans les DEUX bases de données (central + clinic)
        // Le backend met à jour : users (central) ET healthcare_providers (clinic)

        // Extraire firstName et lastName depuis le nom complet
        const nameParts = profileData.name.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const profileUpdate = {
          firstName,
          lastName,
          email: profileData.email
        };

        console.log('[SettingsModule] Updating profile in both databases:', profileUpdate);
        await profileApi.updateProfile(profileUpdate);

        // Recharger les données utilisateur depuis le backend
        await refreshUser();

        showNotification(t('settings.messages.profileSaved'), 'success');
      } else if (section === 'company') {
        // Mise à jour de l'établissement via l'API
        const facilityUpdate = {
          name: profileData.companyName,
          facilityNumber: profileData.facilityNumber,
          phone: profileData.phone,
          addressLine1: profileData.address,
          postalCode: profileData.postalCode,
          city: profileData.city,
          country: profileData.country
        };

        console.log('[SettingsModule] Updating facility with:', facilityUpdate);
        console.log('[SettingsModule] Current facility ID:', facility?.id);
        const updatedFacility = await facilitiesApi.updateCurrentFacility(facilityUpdate);
        console.log('[SettingsModule] Facility updated successfully:', updatedFacility);
        setFacility(updatedFacility);

        // Recharger les données depuis le backend pour synchroniser le header
        await refreshUser();

        showNotification(t('settings.messages.companySaved'), 'success');
      }
    } catch (error) {
      console.error('[SettingsModule] Error saving:', error);
      console.error('[SettingsModule] Error details:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.error?.message || error.message || t('settings.messages.saveError');
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    } finally {
      console.log('[SettingsModule] Save completed, isSaving set to false');
      setIsSaving(false);
    }
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations personnelles</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom complet
            </label>
            <input
              type="text"
              value={profileData.name}
              onChange={(e) => handleInputChange('profile', 'name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={profileData.email}
              onChange={(e) => handleInputChange('profile', 'email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Photo de profil</h3>
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-2xl">
            {user?.avatar}
          </div>
          <button className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2">
            <Upload className="h-4 w-4" />
            <span>Changer la photo</span>
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => handleSave('profile')}
          disabled={isSaving}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
        >
          <Save className="h-4 w-4" />
          <span>{isSaving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
        </button>
      </div>
    </div>
  );

  const renderCompanyTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations entreprise</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('settings.company.name', 'Nom de l\'entreprise')}
            </label>
            <input
              type="text"
              value={profileData.companyName}
              onChange={(e) => handleInputChange('profile', 'companyName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('settings.company.number', 'Numéro')}
            </label>
            <input
              type="text"
              value={profileData.facilityNumber}
              onChange={(e) => handleInputChange('profile', 'facilityNumber', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={t('settings.company.numberPlaceholder', 'Ex: CONS-2024-001')}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adresse
            </label>
            <input
              type="text"
              value={profileData.address}
              onChange={(e) => handleInputChange('profile', 'address', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="123 Rue de la République"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Code postal
            </label>
            <input
              type="text"
              value={profileData.postalCode}
              onChange={(e) => handleInputChange('profile', 'postalCode', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="75001"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ville
            </label>
            <input
              type="text"
              value={profileData.city}
              onChange={(e) => handleInputChange('profile', 'city', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Paris"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Téléphone
            </label>
            <input
              type="tel"
              value={profileData.phone}
              onChange={(e) => handleInputChange('profile', 'phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="+33 1 23 45 67 89"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pays
            </label>
            <select
              value={profileData.country}
              onChange={(e) => handleInputChange('profile', 'country', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="FR">France</option>
              <option value="BE">Belgique</option>
              <option value="CH">Suisse</option>
              <option value="ES">Espagne</option>
              <option value="CA">Canada</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.company.logo', 'Logo de l\'entreprise')}</h3>

        {/* Current Logo Preview */}
        {getLogoUrl() && (
          <div className="mb-4 flex items-center space-x-4">
            <div className="relative">
              <img
                src={getLogoUrl()}
                alt="Logo"
                className="h-20 w-20 object-contain border border-gray-200 rounded-lg bg-white p-1"
              />
            </div>
            <button
              onClick={handleRemoveLogo}
              disabled={isUploadingLogo}
              className="text-red-600 hover:text-red-800 text-sm flex items-center space-x-1 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              <span>{t('settings.company.removeLogo', 'Supprimer')}</span>
            </button>
          </div>
        )}

        {/* Upload Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isUploadingLogo ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'}`}
          onClick={() => logoInputRef.current?.click()}
          onDrop={handleLogoDrop}
          onDragOver={handleDragOver}
        >
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={handleLogoChange}
            className="hidden"
          />
          {isUploadingLogo ? (
            <>
              <div className="h-12 w-12 mx-auto mb-4 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
              <p className="text-indigo-600 font-medium">{t('settings.company.uploading', 'Envoi en cours...')}</p>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">{t('settings.company.dropLogo', 'Glissez votre logo ici ou cliquez pour choisir')}</p>
              <p className="text-sm text-gray-500">{t('settings.company.logoFormats', 'PNG, JPG, WebP jusqu\'à 2 Mo')}</p>
            </>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => handleSave('company')}
          disabled={isSaving}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
        >
          <Save className="h-4 w-4" />
          <span>{isSaving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
        </button>
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Changer le mot de passe</h3>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe actuel
            </label>
            <input
              type="password"
              value={securityData.currentPassword}
              onChange={(e) => handleInputChange('security', 'currentPassword', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={securityData.newPassword}
                onChange={(e) => handleInputChange('security', 'newPassword', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirmer le nouveau mot de passe
            </label>
            <input
              type="password"
              value={securityData.confirmPassword}
              onChange={(e) => handleInputChange('security', 'confirmPassword', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Authentification à deux facteurs</h3>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-900">Activer la 2FA</p>
            <p className="text-sm text-gray-600">Sécurisez votre compte avec une authentification à deux facteurs</p>
          </div>
          <button
            onClick={() => handleInputChange('security', 'twoFactorEnabled', !securityData.twoFactorEnabled)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              securityData.twoFactorEnabled
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            {securityData.twoFactorEnabled ? 'Activée' : 'Activer'}
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sessions actives</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Session actuelle</p>
              <p className="text-sm text-gray-600">Chrome sur Windows • France</p>
            </div>
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
              Active
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => handleSave('security')}
          disabled={isSaving}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
        >
          <Save className="h-4 w-4" />
          <span>{isSaving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
        </button>
      </div>
    </div>
  );

  const renderBillingTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan d'abonnement</h3>
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-medium text-gray-900">
                Plan {user?.plan === 'premium' ? 'Premium' : 'Gratuit'}
                {user?.plan === 'premium' && <span className="ml-2">👑</span>}
              </h4>
              <p className="text-gray-600">
                {user?.plan === 'premium' 
                  ? 'Factures illimitées, support prioritaire' 
                  : 'Limité à 5 factures par mois'
                }
              </p>
            </div>
            {user?.plan !== 'premium' && (
              <button className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 transition-colors">
                Passer au Premium
              </button>
            )}
          </div>
          
          {user?.plan === 'premium' && (
            <div className="text-sm text-gray-600">
              <p>Prochaine facturation : 15 octobre 2024</p>
              <p>Montant : 29€/mois HT</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Historique de facturation</h3>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-4 font-medium text-gray-900">Date</th>
                <th className="text-left p-4 font-medium text-gray-900">Montant</th>
                <th className="text-left p-4 font-medium text-gray-900">Statut</th>
                <th className="text-left p-4 font-medium text-gray-900">Facture</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="p-4 text-gray-500" colSpan="4">
                  Aucune facture disponible
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderCatalogTab = () => {
    const handleAddItem = () => {
      if (!newItem.name || !newItem.price) {
        alert('Nom et prix requis');
        return;
      }

      try {
        const itemData = {
          ...newItem,
          price: parseFloat(newItem.price),
          id: Date.now().toString()
        };

        if (newItem.type === 'product') {
          productsStorage.add(itemData);
        } else if (newItem.type === 'service') {
          servicesStorage.add(itemData);
        }

        setNewItem({ name: '', description: '', price: '', category: '', type: 'product' });
        setIsAddingItem(false);
        loadCatalog();
      } catch (error) {
        console.error('Erreur ajout item:', error);
        alert('Erreur lors de l\'ajout');
      }
    };

    const handleDeleteItem = (id, type) => {
      if (!window.confirm('Supprimer cet élément ?')) return;

      try {
        if (type === 'product') {
          productsStorage.delete(id);
        } else if (type === 'service') {
          servicesStorage.delete(id);
        }
        loadCatalog();
      } catch (error) {
        console.error('Erreur suppression:', error);
        alert('Erreur lors de la suppression');
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Catálogo de Productos y Servicios</h3>
          <button
            onClick={() => setIsAddingItem(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Añadir Elemento</span>
          </button>
        </div>

        {/* Formulario agregar item */}
        {isAddingItem && (
          <div className="bg-gray-50 p-6 rounded-lg border">
            <h4 className="font-medium text-gray-900 mb-4">Nuevo Elemento</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Precio (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newItem.price}
                  onChange={(e) => setNewItem(prev => ({ ...prev, price: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                <select
                  value={newItem.type}
                  onChange={(e) => setNewItem(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="product">Producto</option>
                  <option value="service">Servicio</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
                <input
                  type="text"
                  value={newItem.category}
                  onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                <textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-4">
              <button
                onClick={handleAddItem}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Guardar
              </button>
              <button
                onClick={() => setIsAddingItem(false)}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Lista de elementos */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-4 font-medium text-gray-900">Nombre</th>
                <th className="text-left p-4 font-medium text-gray-900">Tipo</th>
                <th className="text-left p-4 font-medium text-gray-900">Precio</th>
                <th className="text-left p-4 font-medium text-gray-900">Categoría</th>
                <th className="text-left p-4 font-medium text-gray-900 w-20">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {catalogItems.length === 0 ? (
                <tr>
                  <td className="p-4 text-gray-500 text-center" colSpan="5">
                    No hay elementos en el catálogo
                  </td>
                </tr>
              ) : (
                catalogItems.map((item) => (
                  <tr key={item.id} className="border-t hover:bg-gray-50">
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        {item.description && (
                          <p className="text-sm text-gray-500">{item.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.type === 'product'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {item.type === 'product' ? 'Producto' : 'Servicio'}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-gray-900">
                      €{item.price?.toFixed(2)}
                    </td>
                    <td className="p-4 text-gray-600">{item.category || '-'}</td>
                    <td className="p-4">
                      <div className="flex space-x-2">
                        <button
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id, item.type)}
                          className="p-1 hover:bg-red-100 rounded transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Préférences de notification</h3>
        <div className="space-y-4">
          {[
            { id: 'invoice_created', label: 'Nouvelle facture créée', enabled: true },
            { id: 'invoice_paid', label: 'Facture payée', enabled: true },
            { id: 'invoice_overdue', label: 'Facture échue', enabled: true },
            { id: 'client_added', label: 'Nouveau client ajouté', enabled: false },
            { id: 'system_updates', label: 'Mises à jour système', enabled: false }
          ].map((notification) => (
            <div key={notification.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{notification.label}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Email</span>
                <button
                  className={`w-12 h-6 rounded-full transition-colors ${
                    notification.enabled ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    notification.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAvailabilityTab = () => {
    // Get the current user's healthcare provider ID (not central user ID)
    const providerId = user?.providerId;

    if (!providerId) {
      return (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-center text-gray-500">
            <AlertCircle className="h-5 w-5 mr-2" />
            {t('availability.noProviderSelected', 'Impossible de charger vos disponibilités')}
          </div>
        </div>
      );
    }

    return (
      <PractitionerAvailabilityWeekly
        providerId={providerId}
        providerName={user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.name}
        canEdit={true}
        clinicSettings={clinicSettings}
      />
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab();
      case 'availability':
        return renderAvailabilityTab();
      case 'company':
        return renderCompanyTab();
      case 'catalog':
        return renderCatalogTab();
      case 'security':
        return renderSecurityTab();
      case 'billing':
        return renderBillingTab();
      case 'notifications':
        return renderNotificationsTab();
      default:
        return renderProfileTab();
    }
  };

  return (
    <>
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
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

      <div className="space-y-6">
        {/* Navigation horizontale des onglets */}
        <div className="bg-white rounded-xl shadow-sm border">
          <nav className="flex flex-wrap border-b border-gray-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-5 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Contenu de l'onglet */}
          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsModule;