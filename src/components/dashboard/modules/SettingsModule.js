// components/dashboard/modules/SettingsModule.js
import React, { useState, useEffect } from 'react';
import {
  User, Building, Shield, CreditCard, Bell, Save,
  Upload, Eye, EyeOff, CheckCircle, Package, Plus, Edit2, Trash2
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { catalogStorage, productsStorage, servicesStorage } from '../../../utils/productsStorage';

const SettingsModule = () => {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // États pour les formulaires
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    companyName: user?.companyName || '',
    phone: '',
    address: '',
    postalCode: '',
    city: '',
    country: 'France'
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

  // Charger le catalogue au montage
  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = () => {
    const items = catalogStorage.getAll();
    setCatalogItems(items);
  };

  const tabs = [
    { id: 'profile', label: t('settings.tabs.profile'), icon: User },
    { id: 'company', label: t('settings.tabs.company'), icon: Building },
    { id: 'catalog', label: t('settings.tabs.catalog'), icon: Package },
    { id: 'security', label: t('settings.tabs.security'), icon: Shield },
    { id: 'billing', label: t('settings.tabs.billing'), icon: CreditCard },
    { id: 'notifications', label: t('settings.tabs.notifications'), icon: Bell }
  ];

  const handleInputChange = (section, field, value) => {
    if (section === 'profile') {
      setProfileData(prev => ({ ...prev, [field]: value }));
    } else if (section === 'security') {
      setSecurityData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSave = async (section) => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (section === 'profile') {
        updateUser({
          name: profileData.name,
          email: profileData.email,
          companyName: profileData.companyName
        });
      }
      
      alert('✅ Paramètres sauvegardés avec succès !');
    } catch (error) {
      alert('❌ Erreur lors de la sauvegarde');
    } finally {
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
              <option value="France">France</option>
              <option value="Belgique">Belgique</option>
              <option value="Suisse">Suisse</option>
            </select>
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
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom de l'entreprise
            </label>
            <input
              type="text"
              value={profileData.companyName}
              onChange={(e) => handleInputChange('profile', 'companyName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Logo de l'entreprise</h3>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">Glissez votre logo ici ou cliquez pour choisir</p>
          <p className="text-sm text-gray-500">PNG, JPG jusqu'à 2MB</p>
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab();
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
    <div className="flex gap-8">
      {/* Navigation des onglets */}
      <div className="w-64 flex-shrink-0">
        <nav className="space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-indigo-100 text-indigo-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Contenu de l'onglet */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border p-8">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default SettingsModule;