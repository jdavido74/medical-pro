// components/dashboard/modals/InvoiceFormModal.js
import React, { useState, useEffect } from 'react';
import {
  X, Save, Plus, Trash2, User, Building, Calendar, Calculator,
  ChevronDown, ChevronUp, CheckCircle, Send, DollarSign,
  Percent, Minus, Clock
} from 'lucide-react';
import CatalogProductSelector from '../../common/CatalogProductSelector';

const InvoiceFormModal = ({ isOpen, onClose, onSave, invoice = null, preSelectedClient = null, patients = [], billingSettings = null, initialItems = null }) => {
  const [formData, setFormData] = useState({
    clientId: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    status: 'draft',
    items: [
      {
        id: Date.now(),
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: null // null = utilise la TVA par défaut
      }
    ],
    notes: '',
    paymentTerms: 30,
    // NOUVEAU : Remise globale
    discountType: 'none', // 'none', 'percentage', 'amount'
    discountValue: 0
  });

  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({});
  const [totals, setTotals] = useState({
    subtotal: 0,
    taxDetails: {},
    taxAmount: 0,
    discountAmount: 0,
    total: 0
  });

  // NOUVEAU : État accordéon
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);

  // Load clients from props (patients from API) and billing settings
  useEffect(() => {
    // Map patients to client format for the dropdown
    const clientsData = (patients || []).map(p => ({
      id: p.id,
      displayName: p.displayName || p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim(),
      email: p.email || '',
      phone: p.phone || '',
      address: p.address || '',
      postalCode: p.postalCode || p.zipCode || '',
      city: p.city || '',
      country: p.country || '',
      type: p.type || 'individual',
      siren: p.siren || ''
    }));
    setClients(clientsData);
    setSettings(billingSettings || { defaultTaxRate: 20, defaultPaymentTerms: 30 });
  }, [patients, billingSettings]);

  // Initialiser le formulaire
  useEffect(() => {
    if (invoice) {
      // Mode édition
      setFormData({
        clientId: invoice.clientId || '',
        invoiceDate: invoice.invoiceDate || new Date().toISOString().split('T')[0],
        dueDate: invoice.dueDate || '',
        status: invoice.status || 'draft',
        items: invoice.items || [{ id: Date.now(), description: '', quantity: 1, unitPrice: 0, taxRate: null }],
        notes: invoice.notes || '',
        paymentTerms: invoice.paymentTerms || 30,
        discountType: invoice.discountType || 'none',
        discountValue: invoice.discountValue || 0
      });
    } else {
      // Mode création
      const today = new Date();
      const dueDate = new Date(today);
      dueDate.setDate(today.getDate() + 30);

      setFormData({
        clientId: preSelectedClient?.id || '',
        invoiceDate: today.toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0],
        status: 'draft',
        items: initialItems?.length ? initialItems : [{ id: Date.now(), description: '', quantity: 1, unitPrice: 0, taxRate: null }],
        notes: '',
        paymentTerms: 30,
        discountType: 'none',
        discountValue: 0
      });
    }
    setErrors({});
  }, [invoice, preSelectedClient, initialItems, isOpen]);

  // Mettre à jour le client sélectionné
  useEffect(() => {
    if (formData.clientId) {
      const client = clients.find(c => c.id === formData.clientId);
      setSelectedClient(client);
    } else {
      setSelectedClient(null);
    }
  }, [formData.clientId, clients]);

  // Mettre à jour la date d'échéance selon les conditions de paiement
  useEffect(() => {
    if (formData.invoiceDate && formData.paymentTerms) {
      const invoiceDate = new Date(formData.invoiceDate);
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(invoiceDate.getDate() + parseInt(formData.paymentTerms));
      
      setFormData(prev => ({
        ...prev,
        dueDate: dueDate.toISOString().split('T')[0]
      }));
    }
  }, [formData.invoiceDate, formData.paymentTerms]);

  // FONCTION AMÉLIORÉE : Calculs automatiques avec remise
  useEffect(() => {
    calculateTotals();
  }, [formData.items, formData.discountType, formData.discountValue, settings]);

  const calculateTotals = () => {
    const defaultTaxRate = settings.defaultTaxRate || 20;
    let subtotal = 0;
    const taxDetails = {};

    // Calculer ligne par ligne
    formData.items.forEach(item => {
      if (item.quantity > 0 && item.unitPrice > 0) {
        const lineTotal = item.quantity * item.unitPrice;
        subtotal += lineTotal;
      }
    });

    // Calculer la remise
    let discountAmount = 0;
    if (formData.discountType === 'percentage' && formData.discountValue > 0) {
      discountAmount = (subtotal * formData.discountValue) / 100;
    } else if (formData.discountType === 'amount' && formData.discountValue > 0) {
      discountAmount = Math.min(formData.discountValue, subtotal); // Ne peut pas être supérieure au sous-total
    }

    // Sous-total après remise pour calcul TVA
    const subtotalAfterDiscount = subtotal - discountAmount;

    // Calculer la TVA sur le montant après remise, ligne par ligne proportionnellement
    formData.items.forEach(item => {
      if (item.quantity > 0 && item.unitPrice > 0) {
        const lineTotal = item.quantity * item.unitPrice;
        const lineTotalAfterDiscount = subtotalAfterDiscount > 0 ? 
          (lineTotal / subtotal) * subtotalAfterDiscount : 0;

        // Déterminer le taux de TVA à appliquer
        const effectiveTaxRate = item.taxRate !== null ? item.taxRate : defaultTaxRate;
        
        // Regrouper par taux de TVA
        if (!taxDetails[effectiveTaxRate]) {
          taxDetails[effectiveTaxRate] = {
            base: 0,
            amount: 0
          };
        }
        
        taxDetails[effectiveTaxRate].base += lineTotalAfterDiscount;
        taxDetails[effectiveTaxRate].amount += (lineTotalAfterDiscount * effectiveTaxRate) / 100;
      }
    });

    // Calculer le total de TVA
    const taxAmount = Object.values(taxDetails).reduce((sum, tax) => sum + tax.amount, 0);
    const total = subtotalAfterDiscount + taxAmount;

    setTotals({
      subtotal: Math.round(subtotal * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100,
      taxDetails,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleItemChange = (itemId, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    }));
  };

  const addItem = () => {
    const newItem = {
      id: Date.now(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: null // null = utilise la TVA par défaut
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  // Add item from catalog selection
  const addItemFromCatalog = (catalogItem) => {
    const newItem = {
      id: Date.now(),
      description: catalogItem.description,
      quantity: 1,
      unitPrice: catalogItem.unitPrice,
      taxRate: catalogItem.taxRate,
      catalogItemId: catalogItem.catalogItemId
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeItem = (itemId) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== itemId)
      }));
    }
  };

  // Calculer le total HT d'une ligne
  const getLineTotal = (item) => {
    return (item.quantity * item.unitPrice).toFixed(2);
  };

  // Obtenir le taux de TVA effectif d'une ligne
  const getEffectiveTaxRate = (item) => {
    return item.taxRate !== null ? item.taxRate : (settings.defaultTaxRate || 20);
  };

  // NOUVEAU : Composant statut visuel
  const StatusIndicator = ({ status, onChange }) => {
    const statuses = [
      { value: 'draft', label: 'Brouillon', icon: Calendar, color: 'gray' },
      { value: 'sent', label: 'Envoyée', icon: Send, color: 'blue' },
      { value: 'paid', label: 'Payée', icon: CheckCircle, color: 'green' },
      { value: 'overdue', label: 'Échue', icon: Clock, color: 'red' }
    ];

    return (
      <div className="flex items-center space-x-1 overflow-x-auto">
        {statuses.map((statusItem, index) => {
          const Icon = statusItem.icon;
          const isActive = statusItem.value === status;
          const isPassed = statuses.findIndex(s => s.value === status) > index;
          
          return (
            <div key={statusItem.value} className="flex items-center">
              <button
                type="button"
                onClick={() => onChange(statusItem.value)}
                className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? `bg-${statusItem.color}-100 text-${statusItem.color}-800 border-2 border-${statusItem.color}-300`
                    : isPassed
                    ? `bg-${statusItem.color}-50 text-${statusItem.color}-600 border border-${statusItem.color}-200`
                    : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'
                }`}
              >
                <Icon className="h-3 w-3" />
                <span className="hidden sm:inline">{statusItem.label}</span>
              </button>
              {index < statuses.length - 1 && (
                <div className={`w-4 h-0.5 mx-1 ${
                  isPassed ? `bg-${statusItem.color}-300` : 'bg-gray-200'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.clientId) {
      newErrors.clientId = 'Client requis';
    }

    if (!formData.invoiceDate) {
      newErrors.invoiceDate = 'Date de facture requise';
    }

    if (!formData.dueDate) {
      newErrors.dueDate = 'Date d\'échéance requise';
    }

    // Vérifier qu'au moins une ligne a une description et un prix
    const validItems = formData.items.filter(item => 
      item.description.trim() && item.unitPrice > 0
    );
    
    if (validItems.length === 0) {
      newErrors.items = 'Au moins une ligne valide requise';
    }

    // Validation remise
    if (formData.discountType === 'percentage' && formData.discountValue > 100) {
      newErrors.discount = 'La remise ne peut pas dépasser 100%';
    }
    if (formData.discountType === 'amount' && formData.discountValue > totals.subtotal) {
      newErrors.discount = 'La remise ne peut pas être supérieure au sous-total';
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
      // Filtrer les lignes vides
      const validItems = formData.items.filter(item => 
        item.description.trim() && item.unitPrice > 0
      );

      const invoiceData = {
        ...formData,
        items: validItems,
        clientName: selectedClient?.displayName || '',
        clientEmail: selectedClient?.email || '',
        // Ajouter les totaux calculés
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        total: totals.total,
        taxDetails: totals.taxDetails,
        // Ajouter bon de commande
        purchaseOrderNumber: formData.purchaseOrderNumber,
        purchaseOrderDate: formData.purchaseOrderDate
      };

      await onSave(invoiceData);
      onClose();
    } catch (error) {
      console.error('Erreur sauvegarde facture:', error);
      setErrors({ general: 'Erreur lors de la sauvegarde' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <h2 className="text-2xl font-bold text-gray-900">
            {invoice ? 'Modifier la facture' : 'Nouvelle facture'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* NOUVEAU : Section informations de base en accordéon */}
          <div className="bg-gray-50 rounded-lg border mb-6">
            <button
              type="button"
              onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-semibold text-gray-900">Informations de base</h3>
                {selectedClient && (
                  <span className="text-sm text-gray-600 bg-white px-2 py-1 rounded">
                    {selectedClient.displayName}
                  </span>
                )}
                <StatusIndicator 
                  status={formData.status} 
                  onChange={(status) => handleInputChange('status', status)} 
                />
              </div>
              {isHeaderCollapsed ? 
                <ChevronDown className="h-5 w-5 text-gray-500" /> : 
                <ChevronUp className="h-5 w-5 text-gray-500" />
              }
            </button>
            
            {!isHeaderCollapsed && (
              <div className="p-4 pt-0 border-t">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Sélection client */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client *
                    </label>
                    <select
                      value={formData.clientId}
                      onChange={(e) => handleInputChange('clientId', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.clientId ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Sélectionner un client</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>
                          {client.displayName}
                        </option>
                      ))}
                    </select>
                    {errors.clientId && <p className="text-red-500 text-sm mt-1">{errors.clientId}</p>}
                    
                    {/* Aperçu client sélectionné */}
                    {selectedClient && (
                      <div className="mt-3 p-3 bg-white rounded-lg border">
                        <div className="flex items-center space-x-2 mb-2">
                          {selectedClient.type === 'business' ? 
                            <Building className="h-4 w-4 text-indigo-600" /> : 
                            <User className="h-4 w-4 text-green-600" />
                          }
                          <span className="font-medium text-gray-900">{selectedClient.displayName}</span>
                        </div>
                        <p className="text-sm text-gray-600">{selectedClient.email}</p>
                        <p className="text-sm text-gray-600">
                          {selectedClient.address}, {selectedClient.postalCode} {selectedClient.city}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Dates et statut */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date de facture *
                      </label>
                      <input
                        type="date"
                        value={formData.invoiceDate}
                        onChange={(e) => handleInputChange('invoiceDate', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          errors.invoiceDate ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.invoiceDate && <p className="text-red-500 text-sm mt-1">{errors.invoiceDate}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Conditions de paiement
                      </label>
                      <select
                        value={formData.paymentTerms}
                        onChange={(e) => handleInputChange('paymentTerms', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value={0}>Paiement à réception</option>
                        <option value={15}>15 jours</option>
                        <option value={30}>30 jours</option>
                        <option value={45}>45 jours</option>
                        <option value={60}>60 jours</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date d'échéance *
                      </label>
                      <input
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => handleInputChange('dueDate', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          errors.dueDate ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.dueDate && <p className="text-red-500 text-sm mt-1">{errors.dueDate}</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Informations TVA par défaut */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2 mb-2">
              <Calculator className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                TVA par défaut : {settings.defaultTaxRate || 20}%
              </span>
            </div>
            <p className="text-xs text-blue-600">
              Cette TVA s'applique automatiquement sauf si vous spécifiez un taux différent par ligne
            </p>
          </div>

          {/* Lignes de facturation */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Lignes de facturation</h3>
              <div className="flex items-center gap-2">
                <CatalogProductSelector
                  onSelect={addItemFromCatalog}
                  includeServices={true}
                  placeholder="Ajouter depuis le catalogue"
                  className="w-64"
                />
                <button
                  type="button"
                  onClick={addItem}
                  className="bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>Ligne manuelle</span>
                </button>
              </div>
            </div>

            {errors.items && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{errors.items}</p>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 font-medium text-gray-900">Description</th>
                    <th className="text-left p-3 font-medium text-gray-900 w-24">Qté</th>
                    <th className="text-left p-3 font-medium text-gray-900 w-32">Prix unitaire</th>
                    <th className="text-left p-3 font-medium text-gray-900 w-28">TVA %</th>
                    <th className="text-left p-3 font-medium text-gray-900 w-32">Total HT</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="p-3">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Description du produit/service"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="p-3">
                        <select
                          value={item.taxRate || ''}
                          onChange={(e) => handleItemChange(item.id, 'taxRate', e.target.value === '' ? null : parseFloat(e.target.value))}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Défaut ({settings.defaultTaxRate || 20}%)</option>
                          <option value={0}>0% (Exonéré)</option>
                          <option value={5.5}>5.5%</option>
                          <option value={10}>10%</option>
                          <option value={20}>20%</option>
                        </select>
                      </td>
                      <td className="p-3 text-right font-medium">
                        <div>
                          <div>{getLineTotal(item)}€</div>
                          <div className="text-xs text-gray-500">
                            TVA {getEffectiveTaxRate(item)}%
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* NOUVEAU : Section remise globale */}
          <div className="bg-orange-50 rounded-lg p-4 mb-6 border border-orange-200">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Minus className="h-4 w-4 mr-2 text-orange-600" />
              Remise globale
            </h4>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de remise
                </label>
                <select
                  value={formData.discountType}
                  onChange={(e) => handleInputChange('discountType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="none">Aucune remise</option>
                  <option value="percentage">Pourcentage (%)</option>
                  <option value="amount">Montant fixe (€)</option>
                </select>
              </div>
              
              {formData.discountType !== 'none' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valeur de la remise
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      max={formData.discountType === 'percentage' ? 100 : totals.subtotal}
                      value={formData.discountValue}
                      onChange={(e) => handleInputChange('discountValue', parseFloat(e.target.value) || 0)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-8 ${
                        errors.discount ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="0"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      {formData.discountType === 'percentage' ? 
                        <Percent className="h-4 w-4" /> : 
                        <DollarSign className="h-4 w-4" />
                      }
                    </div>
                  </div>
                  {errors.discount && <p className="text-red-500 text-sm mt-1">{errors.discount}</p>}
                </div>
              )}
              
              {formData.discountType !== 'none' && totals.discountAmount > 0 && (
                <div className="flex items-end">
                  <div className="bg-white p-3 rounded-lg border">
                    <div className="text-sm text-gray-600">Remise appliquée</div>
                    <div className="text-lg font-bold text-orange-600">
                      -{totals.discountAmount.toFixed(2)}€
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Récapitulatif des totaux en temps réel */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
              <Calculator className="h-5 w-5 mr-2 text-indigo-600" />
              Récapitulatif des totaux
            </h4>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Détail des calculs */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sous-total HT :</span>
                  <span className="font-medium">{totals.subtotal.toFixed(2)}€</span>
                </div>
                
                {/* Affichage remise si applicable */}
                {totals.discountAmount > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>
                      Remise {formData.discountType === 'percentage' ? `${formData.discountValue}%` : 'fixe'} :
                    </span>
                    <span className="font-medium">-{totals.discountAmount.toFixed(2)}€</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Sous-total après remise :</span>
                  <span className="font-medium">{(totals.subtotal - totals.discountAmount).toFixed(2)}€</span>
                </div>
                
                {/* Détail TVA par taux */}
                {Object.entries(totals.taxDetails).map(([rate, details]) => (
                  <div key={rate} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      TVA {rate}% sur {details.base.toFixed(2)}€ :
                    </span>
                    <span className="font-medium">{details.amount.toFixed(2)}€</span>
                  </div>
                ))}
                
                <div className="border-t pt-2 flex justify-between">
                  <span className="text-gray-600">Total TVA :</span>
                  <span className="font-medium">{totals.taxAmount.toFixed(2)}€</span>
                </div>
                
                <div className="border-t pt-2 flex justify-between text-lg font-bold">
                  <span className="text-gray-900">Total TTC :</span>
                  <span className="text-indigo-600">{totals.total.toFixed(2)}€</span>
                </div>
              </div>
              
              {/* Aperçu visuel */}
              <div className="space-y-2">
                <div className="text-sm text-gray-600 mb-2">Répartition :</div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden flex">
                  <div 
                    className="bg-indigo-500" 
                    style={{ width: `${totals.total > 0 ? ((totals.subtotal - totals.discountAmount) / totals.total) * 100 : 0}%` }}
                  ></div>
                  <div 
                    className="bg-orange-400" 
                    style={{ width: `${totals.total > 0 ? (totals.taxAmount / totals.total) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="flex text-xs text-gray-600">
                  <div className="flex items-center mr-4">
                    <div className="w-3 h-3 bg-indigo-500 rounded mr-1"></div>
                    HT ({(((totals.subtotal - totals.discountAmount) / totals.total) * 100 || 0).toFixed(1)}%)
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-orange-400 rounded mr-1"></div>
                    TVA ({((totals.taxAmount / totals.total) * 100 || 0).toFixed(1)}%)
                  </div>
                </div>
                
                {/* Économies réalisées */}
                {totals.discountAmount > 0 && (
                  <div className="mt-3 p-2 bg-orange-100 rounded text-center">
                    <div className="text-xs text-orange-600">Économie réalisée</div>
                    <div className="text-sm font-bold text-orange-700">{totals.discountAmount.toFixed(2)}€</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes et conditions (optionnel)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Conditions de paiement, notes particulières..."
            />
          </div>

          {/* Affichage des erreurs générales */}
          {errors.general && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{errors.general}</p>
            </div>
          )}
        </div>

        {/* Footer fixe avec totaux */}
        <div className="border-t bg-gray-50 flex-shrink-0">
          {/* Barre de totaux */}
          <div className="px-6 py-3 bg-white border-b">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {formData.items.filter(item => item.description.trim() && item.unitPrice > 0).length} ligne(s) valide(s)
                {totals.discountAmount > 0 && (
                  <span className="ml-2 text-orange-600">
                    • Remise: -{totals.discountAmount.toFixed(2)}€
                  </span>
                )}
              </div>
              <div className="flex space-x-6 text-sm">
                <span>HT: <strong>{totals.subtotal.toFixed(2)}€</strong></span>
                <span>TVA: <strong>{totals.taxAmount.toFixed(2)}€</strong></span>
                <span className="text-lg">TTC: <strong className="text-indigo-600">{totals.total.toFixed(2)}€</strong></span>
              </div>
            </div>
          </div>
          
          {/* Boutons d'actions */}
          <div className="flex justify-end space-x-4 p-6">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || totals.total === 0}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>{isLoading ? 'Sauvegarde...' : (invoice ? 'Modifier' : 'Créer')} - {totals.total.toFixed(2)}€</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceFormModal;