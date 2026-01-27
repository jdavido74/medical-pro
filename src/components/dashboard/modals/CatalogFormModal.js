/**
 * CatalogFormModal - Modal for creating/editing catalog items
 * Supports conditional fields based on item type and tags for grouping
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X, Package, Pill, Syringe, Stethoscope, Building2
} from 'lucide-react';
import { catalogStorage } from '../../../utils/catalogStorage';
import tagsApi from '../../../api/tagsApi';
import suppliersApi from '../../../api/suppliersApi';
import TagSelector from '../../common/TagSelector';
import SupplierSelector from '../../common/SupplierSelector';
import SupplierFormModal from '../../modals/SupplierFormModal';
import {
  CATALOG_TYPES,
  DOSAGE_UNITS,
  DURATION_PRESETS,
  getDefaultCatalogItem,
  shouldShowField,
  validateCatalogItem
} from '../../../constants/catalogConfig';
import { useAuth } from '../../../hooks/useAuth';
import { useCountryConfig } from '../../../config/ConfigManager';

// Icon mapping for item types
const TYPE_ICONS = {
  medication: Pill,
  treatment: Syringe,
  service: Stethoscope
};

const CatalogFormModal = ({
  isOpen,
  onClose,
  onSave,
  item = null,
  mode = 'create', // 'create', 'edit'
  categories = {},
  availableTags = [],
  allItems = [], // All catalog items to find families
  defaultParentId = null // Pre-selected parent for creating variants
}) => {
  const { t } = useTranslation('catalog');
  const { user } = useAuth();
  const { config } = useCountryConfig();

  // Get VAT rates from country config
  const vatRates = useMemo(() => {
    if (config?.taxation?.rates) {
      return config.taxation.rates.map(r => ({
        value: r.rate,
        label: `${r.rate}%`,
        description: r.label
      }));
    }
    // Fallback to France rates
    return [
      { value: 0, label: '0%' },
      { value: 5.5, label: '5.5%' },
      { value: 10, label: '10%' },
      { value: 20, label: '20%' }
    ];
  }, [config]);

  // Get currency symbol from country config
  const currencySymbol = useMemo(() => {
    if (config?.country?.currency === 'EUR') return '€';
    if (config?.country?.currency === 'USD') return '$';
    if (config?.country?.currency === 'GBP') return '£';
    return config?.country?.currency || '€';
  }, [config]);

  // Get default VAT rate from country config
  const defaultVatRate = useMemo(() => {
    return config?.taxation?.defaultRate || 20;
  }, [config]);

  // Get VAT label (TVA for France, IVA for Spain)
  const vatLabel = useMemo(() => {
    return config?.taxation?.vatLabel || 'TVA';
  }, [config]);

  // Initialize form data
  const getInitialFormData = () => {
    if (mode === 'edit' && item) {
      return { ...item };
    }

    // Use default VAT rate from country config
    const defaultItem = getDefaultCatalogItem('medication');
    defaultItem.vatRate = defaultVatRate;
    return defaultItem;
  };

  const [formData, setFormData] = useState(getInitialFormData);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState('basic');
  const [selectedTags, setSelectedTags] = useState([]);
  const [localTags, setLocalTags] = useState(availableTags);

  // Supplier state
  const [selectedSuppliers, setSelectedSuppliers] = useState([]);
  const [inheritedSuppliers, setInheritedSuppliers] = useState([]);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');

  // Track if modal was previously open to detect fresh opens
  const wasOpenRef = useRef(false);

  // Sync local tags with prop
  useEffect(() => {
    setLocalTags(availableTags);
  }, [availableTags]);

  // Reset form only when modal is freshly opened (transitioning from closed to open)
  useEffect(() => {
    // Only reset form when transitioning from closed to open
    if (isOpen && !wasOpenRef.current) {
      const initialData = getInitialFormData();

      // If defaultParentId is provided, pre-select the parent (creating a variant)
      if (defaultParentId && mode === 'create') {
        const parentItem = allItems.find(i => i.id === defaultParentId);
        if (parentItem) {
          initialData.parentId = defaultParentId;
          initialData.isVariant = true;
          initialData.isFamily = false;
          // Inherit type from parent
          if (parentItem.type) {
            initialData.type = parentItem.type;
          }
          // Inherit category from parent
          if (parentItem.category) {
            initialData.category = parentItem.category;
          }
          // Inherit description if parent has one
          if (parentItem.description) {
            initialData.description = parentItem.description;
          }
          // Inherit VAT rate from parent
          if (parentItem.vatRate !== undefined) {
            initialData.vatRate = parentItem.vatRate;
          }
        }
      }

      setFormData(initialData);
      setErrors({});
      setIsSubmitting(false);
      setActiveSection('basic');
      // Initialize selected tags from item if editing
      setSelectedTags(item?.tags?.map(t => t.id) || []);
      // Reset suppliers
      setSelectedSuppliers([]);
      setInheritedSuppliers([]);
    }
    // Update the ref to track current state
    wasOpenRef.current = isOpen;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultParentId]);

  // Load suppliers when editing an existing item
  useEffect(() => {
    const loadSuppliers = async () => {
      if (isOpen && mode === 'edit' && item?.id) {
        try {
          const response = await suppliersApi.getProductSuppliers(item.id);
          if (response.success && response.data) {
            setSelectedSuppliers(response.data.map(ps => ({
              supplierId: ps.supplierId,
              supplier: ps.supplier,
              isPrimary: ps.isPrimary,
              supplierSku: ps.supplierSku || '',
              unitCost: ps.unitCost,
              currency: ps.currency || 'EUR',
              notes: ps.notes || '',
              isInherited: false
            })));
          }
        } catch (err) {
          console.error('Error loading suppliers:', err);
        }
      }
    };
    loadSuppliers();
  }, [isOpen, mode, item?.id]);

  // Load inherited suppliers when parent changes
  useEffect(() => {
    const loadInheritedSuppliers = async () => {
      if (formData.parentId) {
        try {
          const response = await suppliersApi.getProductSuppliers(formData.parentId);
          if (response.success && response.data) {
            setInheritedSuppliers(response.data.map(ps => ({
              supplierId: ps.supplierId,
              supplier: ps.supplier,
              isPrimary: ps.isPrimary,
              supplierSku: ps.supplierSku || '',
              unitCost: ps.unitCost,
              currency: ps.currency || 'EUR',
              notes: ps.notes || '',
              isInherited: true
            })));
          }
        } catch (err) {
          console.error('Error loading inherited suppliers:', err);
        }
      } else {
        setInheritedSuppliers([]);
      }
    };
    loadInheritedSuppliers();
  }, [formData.parentId]);

  // Handle new tag created from TagSelector
  const handleTagCreated = (newTag) => {
    setLocalTags(prev => [...prev, newTag]);
  };

  // Get categories for current type
  const typeCategories = useMemo(() => {
    return categories[formData.type] || [];
  }, [categories, formData.type]);

  // Get available families for current type (items that are families or could be families)
  const availableFamilies = useMemo(() => {
    return allItems
      .filter(i =>
        i.type === formData.type && // Same type
        i.isFamily && // Is already a family
        i.id !== item?.id && // Not the current item
        i.isActive // Only active items
      )
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [allItems, formData.type, item?.id]);

  // Handle input change
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle type change
  const handleTypeChange = (newType) => {
    setFormData(prev => ({
      ...prev,
      type: newType,
      category: '', // Reset category when type changes
      parentId: null, // Reset family when type changes
      isVariant: false,
      duration: CATALOG_TYPES[newType]?.defaultDuration || null
    }));
  };

  // Handle family/parent change - inherit properties from parent
  const handleFamilyChange = (parentId) => {
    if (parentId) {
      // Find the parent item to inherit properties
      const parentItem = allItems.find(i => i.id === parentId);

      setFormData(prev => {
        const updates = {
          ...prev,
          parentId,
          isVariant: true,
          isFamily: false // A variant cannot be a family
        };

        // Inherit type from parent
        if (parentItem?.type) {
          updates.type = parentItem.type;
        }

        // Inherit category from parent
        if (parentItem?.category) {
          updates.category = parentItem.category;
        }

        // Inherit description if current is empty
        if (!prev.description && parentItem?.description) {
          updates.description = parentItem.description;
        }

        // Inherit VAT rate from parent
        if (parentItem?.vatRate !== undefined) {
          updates.vatRate = parentItem.vatRate;
        }

        return updates;
      });
    } else {
      setFormData(prev => ({
        ...prev,
        parentId: null,
        isVariant: false
      }));
    }
  };

  // Handle opening supplier creation modal
  const handleCreateSupplier = (name) => {
    setNewSupplierName(name);
    setShowSupplierModal(true);
  };

  // Handle supplier saved from modal
  const handleSupplierSaved = (newSupplier) => {
    // Add the new supplier to selected list
    const newSupplierEntry = {
      supplierId: newSupplier.id,
      supplier: newSupplier,
      isPrimary: selectedSuppliers.length === 0,
      supplierSku: '',
      unitCost: null,
      currency: 'EUR',
      notes: '',
      isInherited: false
    };
    setSelectedSuppliers(prev => [...prev, newSupplierEntry]);
    setShowSupplierModal(false);
    setNewSupplierName('');
  };

  // Get combined suppliers (inherited + own) for display
  const allSuppliers = useMemo(() => {
    // If variant, show inherited suppliers (read-only) + own suppliers
    // If not variant, show only own suppliers
    if (formData.isVariant && inheritedSuppliers.length > 0) {
      // Filter out inherited that are already in selected (override)
      const inheritedIds = inheritedSuppliers.map(s => s.supplierId);
      const selectedIds = selectedSuppliers.map(s => s.supplierId);
      const filteredInherited = inheritedSuppliers.filter(s => !selectedIds.includes(s.supplierId));
      return [...filteredInherited, ...selectedSuppliers];
    }
    return selectedSuppliers;
  }, [formData.isVariant, inheritedSuppliers, selectedSuppliers]);

  // Validate form
  const validate = () => {
    const validation = validateCatalogItem(formData);

    if (!validation.isValid) {
      // Translate error keys
      const translatedErrors = {};
      Object.entries(validation.errors).forEach(([field, errorKey]) => {
        translatedErrors[field] = t(errorKey);
      });
      setErrors(translatedErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      let result;

      // Prepare data for API - only send fields the backend expects
      // - 'type' (legacy) must be 'product' or 'service'
      // - 'itemType' is the medical type: medication, treatment, service, product
      const legacyType = (formData.type === 'service') ? 'service' : 'product';

      const apiData = {
        // Required fields
        title: formData.name,
        type: legacyType,
        itemType: formData.type,
        unitPrice: formData.price || 0,
        taxRate: formData.vatRate || 20,

        // Optional fields
        description: formData.description || null,
        isActive: formData.isActive !== false,

        // Categories as array (category IDs come from API now)
        categories: formData.category ? [formData.category] : [],

        // Medical fields
        duration: formData.duration || null,
        prepBefore: formData.prepBefore || 0,
        prepAfter: formData.prepAfter || 0,
        dosage: formData.dosage || null,
        dosageUnit: formData.dosageUnit || null,
        volume: formData.volume || null,

        // Family/Variant
        parentId: formData.parentId || null,
        isFamily: formData.isFamily || false,
        isVariant: formData.isVariant || false
      };

      if (mode === 'edit') {
        result = await catalogStorage.update(item.id, apiData);
      } else {
        result = await catalogStorage.create(apiData, user?.id);
      }

      if (result.success) {
        const productId = result.item?.id || item?.id;

        // Update tags for the product
        if (productId && selectedTags.length > 0) {
          try {
            await tagsApi.setProductTags(productId, selectedTags);
          } catch (tagError) {
            console.error('Error setting tags:', tagError);
            // Don't fail the whole operation for tag errors
          }
        }

        // Update suppliers for the product (only non-inherited ones)
        if (productId) {
          try {
            // Get current suppliers to determine what to add/remove
            const currentResponse = await suppliersApi.getProductSuppliers(productId);
            const currentSupplierIds = (currentResponse.data || []).map(s => s.supplierId);

            // Add new suppliers
            for (const supplierEntry of selectedSuppliers) {
              if (!currentSupplierIds.includes(supplierEntry.supplierId)) {
                await suppliersApi.addProductSupplier(productId, {
                  supplierId: supplierEntry.supplierId,
                  isPrimary: supplierEntry.isPrimary,
                  supplierSku: supplierEntry.supplierSku,
                  unitCost: supplierEntry.unitCost,
                  currency: supplierEntry.currency,
                  notes: supplierEntry.notes
                });
              } else {
                // Update existing
                await suppliersApi.updateProductSupplier(productId, supplierEntry.supplierId, {
                  isPrimary: supplierEntry.isPrimary,
                  supplierSku: supplierEntry.supplierSku,
                  unitCost: supplierEntry.unitCost,
                  currency: supplierEntry.currency,
                  notes: supplierEntry.notes
                });
              }
            }

            // Remove suppliers that were removed
            const selectedIds = selectedSuppliers.map(s => s.supplierId);
            for (const currentId of currentSupplierIds) {
              if (!selectedIds.includes(currentId)) {
                await suppliersApi.removeProductSupplier(productId, currentId);
              }
            }
          } catch (supplierError) {
            console.error('Error setting suppliers:', supplierError);
            // Don't fail the whole operation for supplier errors
          }
        }

        onSave();
      } else {
        setErrors(result.errors || { general: t('messages.error') });
      }
    } catch (error) {
      console.error('Error saving catalog item:', error);
      setErrors({ general: error.message || t('messages.error') });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const TypeIcon = TYPE_ICONS[formData.type] || Package;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="flex items-center justify-center min-h-screen px-4 py-6">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg text-left shadow-xl transform transition-all w-full max-w-3xl max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  formData.type === 'medication' ? 'bg-green-100 text-green-700' :
                  formData.type === 'treatment' ? 'bg-blue-100 text-blue-700' :
                  'bg-purple-100 text-purple-700'
                }`}>
                  <TypeIcon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">
                  {mode === 'edit' ? t('modal.editTitle') : t('modal.createTitle')}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Section tabs */}
            <div className="mt-4 flex gap-4 border-b border-gray-200 -mb-4">
              {['basic', 'pricing', 'attributes', 'supplier'].map(section => (
                <button
                  key={section}
                  onClick={() => setActiveSection(section)}
                  className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                    activeSection === section
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t(`modal.${section}Info`)}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="px-6 py-5 overflow-y-auto flex-1">
              {/* Basic Info Section */}
              {activeSection === 'basic' && (
                <div className="space-y-4">
                  {/* Type selector - only for create mode, not for variants */}
                  {mode === 'create' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('fields.type')}
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {Object.entries(CATALOG_TYPES).map(([type, config]) => {
                          const Icon = TYPE_ICONS[type];
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => handleTypeChange(type)}
                              className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                                formData.type === type
                                  ? 'border-green-500 bg-green-50 text-green-700'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <Icon className="h-5 w-5" />
                              <span className="text-sm font-medium">{t(`types.${type}`)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('fields.name')} *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder={t('placeholders.name')}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      } focus:ring-2 focus:ring-green-500 focus:border-green-500`}
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('fields.description')}
                    </label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => handleChange('description', e.target.value)}
                      placeholder={t('placeholders.description')}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('fields.category')}
                    </label>
                    <select
                      value={formData.category || ''}
                      onChange={(e) => handleChange('category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="">{t('placeholders.selectCategory')}</option>
                      {typeCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Family/Parent selector - only show if there are families for this type */}
                  {availableFamilies.length > 0 && !formData.isFamily && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('fields.parentFamily', 'Famille parente')}
                      </label>
                      <select
                        value={formData.parentId || ''}
                        onChange={(e) => handleFamilyChange(e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="">{t('placeholders.noFamily', 'Aucune (produit autonome)')}</option>
                        {availableFamilies.map(family => (
                          <option key={family.id} value={family.id}>
                            {family.name}
                            {family.dosage ? ` - Base: ${family.dosage}${family.dosageUnit || ''}` : ''}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        {t('fields.parentFamilyHint', 'Sélectionnez une famille pour créer une variante')}
                      </p>
                    </div>
                  )}

                  {/* Show current family info if this is a variant */}
                  {formData.isVariant && formData.parentId && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-700">
                        <span className="font-medium">{t('labels.variantOf', 'Variante de')}:</span>{' '}
                        {availableFamilies.find(f => f.id === formData.parentId)?.name || t('labels.unknownFamily', 'Famille inconnue')}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        {t('labels.inheritanceHint', 'Le type, la catégorie, la TVA et la provenance sont hérités du parent. La description vide sera aussi héritée.')}
                      </p>
                    </div>
                  )}

                  {/* Tags section */}
                  <div className="border-t border-gray-200 pt-4">
                    <TagSelector
                      availableTags={localTags}
                      selectedTagIds={selectedTags}
                      onTagsChange={setSelectedTags}
                      onTagCreated={handleTagCreated}
                      colorScheme="green"
                    />
                  </div>
                </div>
              )}

              {/* Pricing Section */}
              {activeSection === 'pricing' && (
                <div className="space-y-4">
                  {/* Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('fields.price')} *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price || ''}
                        onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
                        placeholder={t('placeholders.price')}
                        className={`w-full px-3 py-2 pr-10 border rounded-lg ${
                          errors.price ? 'border-red-500' : 'border-gray-300'
                        } focus:ring-2 focus:ring-green-500 focus:border-green-500`}
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                        {currencySymbol}
                      </span>
                    </div>
                    {errors.price && (
                      <p className="mt-1 text-sm text-red-600">{errors.price}</p>
                    )}
                  </div>

                  {/* VAT Rate */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {vatLabel} *
                    </label>
                    <select
                      value={formData.vatRate}
                      onChange={(e) => handleChange('vatRate', parseFloat(e.target.value))}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        errors.vatRate ? 'border-red-500' : 'border-gray-300'
                      } focus:ring-2 focus:ring-green-500 focus:border-green-500`}
                    >
                      {vatRates.map(rate => (
                        <option key={rate.value} value={rate.value}>
                          {rate.label} {rate.description ? `- ${rate.description}` : ''}
                        </option>
                      ))}
                    </select>
                    {errors.vatRate && (
                      <p className="mt-1 text-sm text-red-600">{errors.vatRate}</p>
                    )}
                  </div>

                  {/* Active status */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => handleChange('isActive', e.target.checked)}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {t('fields.isActive')}
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Attributes Section */}
              {activeSection === 'attributes' && (
                <div className="space-y-4">
                  {/* Dosage - for medications and treatments */}
                  {shouldShowField('dosage', formData.type) && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('fields.dosage')}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.dosage || ''}
                          onChange={(e) => handleChange('dosage', parseFloat(e.target.value) || null)}
                          placeholder={t('placeholders.dosage')}
                          className={`w-full px-3 py-2 border rounded-lg ${
                            errors.dosage ? 'border-red-500' : 'border-gray-300'
                          } focus:ring-2 focus:ring-green-500 focus:border-green-500`}
                        />
                        {errors.dosage && (
                          <p className="mt-1 text-sm text-red-600">{errors.dosage}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('fields.dosageUnit')}
                        </label>
                        <select
                          value={formData.dosageUnit || ''}
                          onChange={(e) => handleChange('dosageUnit', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="">-</option>
                          {DOSAGE_UNITS.map(unit => (
                            <option key={unit.id} value={unit.id}>{unit.label} ({t(`units.${unit.fullName}`)})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Volume - for treatments */}
                  {shouldShowField('volume', formData.type) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('fields.volume')} (ml)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={formData.volume || ''}
                        onChange={(e) => handleChange('volume', parseFloat(e.target.value) || null)}
                        placeholder={t('placeholders.volume')}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          errors.volume ? 'border-red-500' : 'border-gray-300'
                        } focus:ring-2 focus:ring-green-500 focus:border-green-500`}
                      />
                      {errors.volume && (
                        <p className="mt-1 text-sm text-red-600">{errors.volume}</p>
                      )}
                    </div>
                  )}

                  {/* Duration - for services and treatments */}
                  {shouldShowField('duration', formData.type) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('fields.duration')}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {DURATION_PRESETS.map(preset => (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() => handleChange('duration', preset.value)}
                            className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                              formData.duration === preset.value
                                ? 'border-green-500 bg-green-50 text-green-700 font-medium'
                                : 'border-gray-300 hover:border-gray-400 bg-white'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                      {errors.duration && (
                        <p className="mt-1 text-sm text-red-600">{errors.duration}</p>
                      )}
                      <p className="mt-2 text-xs text-gray-500">
                        {t('integration.appointmentDuration')}
                      </p>
                    </div>
                  )}

                  {/* Preparation times - only for services and treatments */}
                  {shouldShowField('duration', formData.type) && (
                    <div className="grid grid-cols-2 gap-4">
                      {/* Prep before */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('fields.prepBefore')}
                        </label>
                        <select
                          value={formData.prepBefore || 0}
                          onChange={(e) => handleChange('prepBefore', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                          <option value={0}>{t('fields.noPrepTime', 'Aucun')}</option>
                          <option value={5}>5 min</option>
                          <option value={10}>10 min</option>
                          <option value={15}>15 min</option>
                          <option value={20}>20 min</option>
                          <option value={25}>25 min</option>
                          <option value={30}>30 min</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                          {t('fields.prepBeforeHint')}
                        </p>
                      </div>

                      {/* Prep after */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('fields.prepAfter')}
                        </label>
                        <select
                          value={formData.prepAfter || 0}
                          onChange={(e) => handleChange('prepAfter', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                          <option value={0}>{t('fields.noPrepTime', 'Aucun')}</option>
                          <option value={5}>5 min</option>
                          <option value={10}>10 min</option>
                          <option value={15}>15 min</option>
                          <option value={20}>20 min</option>
                          <option value={25}>25 min</option>
                          <option value={30}>30 min</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                          {t('fields.prepAfterHint')}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* No attributes message */}
                  {!shouldShowField('dosage', formData.type) &&
                   !shouldShowField('volume', formData.type) &&
                   !shouldShowField('duration', formData.type) && (
                    <p className="text-sm text-gray-500 text-center py-8">
                      {t('empty.title')}
                    </p>
                  )}
                </div>
              )}

              {/* Supplier Section */}
              {activeSection === 'supplier' && (
                <div className="space-y-4">
                  {/* Description */}
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <Building2 className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-800">
                        {t('supplier.description')}
                      </p>
                      {formData.isVariant && inheritedSuppliers.length > 0 && (
                        <p className="text-xs text-blue-600 mt-1">
                          {t('supplier.inheritanceNote')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Supplier selector */}
                  <SupplierSelector
                    selectedSuppliers={allSuppliers}
                    onChange={(suppliers) => {
                      // Only update non-inherited suppliers
                      const nonInherited = suppliers.filter(s => !s.isInherited);
                      setSelectedSuppliers(nonInherited);
                    }}
                    multiple={true}
                    showDetails={true}
                    allowCreate={true}
                    onCreateNew={handleCreateSupplier}
                  />

                  {/* Empty state */}
                  {allSuppliers.length === 0 && (
                    <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
                      <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">
                        {t('supplier.noSuppliers')}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {t('supplier.noSuppliersHint')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* General error */}
              {errors.general && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{errors.general}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {t('common:cancel', 'Annuler')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                    {t('common:saving', 'Enregistrement...')}
                  </span>
                ) : (
                  t('common:save', 'Enregistrer')
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Supplier creation modal */}
      <SupplierFormModal
        isOpen={showSupplierModal}
        onClose={() => {
          setShowSupplierModal(false);
          setNewSupplierName('');
        }}
        onSave={handleSupplierSaved}
        initialName={newSupplierName}
      />
    </div>
  );
};

export default CatalogFormModal;
