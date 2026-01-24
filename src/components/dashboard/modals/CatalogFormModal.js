/**
 * CatalogFormModal - Modal for creating/editing catalog items
 * Supports conditional fields based on item type and family/variant management
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X, Package, Pill, Syringe, Stethoscope, Info, Plus
} from 'lucide-react';
import { catalogStorage } from '../../../utils/catalogStorage';
import {
  CATALOG_TYPES,
  DOSAGE_UNITS,
  DURATION_PRESETS,
  getDefaultCatalogItem,
  shouldShowField,
  canHaveVariants,
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
  parentItem = null,
  mode = 'create', // 'create', 'edit', 'variant'
  categories = {}
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

    if (mode === 'variant' && parentItem) {
      return {
        ...getDefaultCatalogItem(parentItem.type),
        parentId: parentItem.id,
        isVariant: true,
        type: parentItem.type,
        category: parentItem.category,
        vatRate: parentItem.vatRate,
        provenance: parentItem.provenance
      };
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
  const [createAsFamily, setCreateAsFamily] = useState(false);
  const [variants, setVariants] = useState([]);

  // Reset form when modal opens with new data
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormData());
      setErrors({});
      setIsSubmitting(false);
      setActiveSection('basic');
      setCreateAsFamily(false);
      setVariants([]);
    }
  }, [isOpen, item, parentItem, mode]);

  // Get categories for current type
  const typeCategories = useMemo(() => {
    return categories[formData.type] || [];
  }, [categories, formData.type]);

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
      duration: CATALOG_TYPES[newType]?.defaultDuration || null
    }));
  };

  // Add variant to family creation
  const addVariant = () => {
    setVariants(prev => [
      ...prev,
      {
        id: `temp_${Date.now()}`,
        name: '',
        dosage: null,
        dosageUnit: formData.dosageUnit || 'mg',
        price: formData.price || 0
      }
    ]);
  };

  // Update variant
  const updateVariant = (index, field, value) => {
    setVariants(prev => {
      const newVariants = [...prev];
      newVariants[index] = {
        ...newVariants[index],
        [field]: value
      };
      return newVariants;
    });
  };

  // Remove variant
  const removeVariant = (index) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
  };

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

      // Prepare data for API (use 'title' for API, transform 'type' to 'itemType')
      const apiData = {
        ...formData,
        title: formData.name,
        itemType: formData.type,
        unitPrice: formData.price,
        taxRate: formData.vatRate
      };

      if (mode === 'edit') {
        result = await catalogStorage.update(item.id, apiData);
      } else if (mode === 'variant') {
        result = await catalogStorage.addVariant(parentItem.id, apiData, user?.id);
      } else if (createAsFamily && variants.length > 0) {
        // Create as family with variants
        result = await catalogStorage.createFamily(
          { ...apiData, isFamily: true },
          variants.map(v => ({
            ...v,
            title: v.name || `${formData.name} ${v.dosage}${v.dosageUnit}`,
            itemType: formData.type,
            category: formData.category,
            taxRate: formData.vatRate,
            unitPrice: v.price,
            provenance: formData.provenance
          })),
          user?.id
        );
      } else {
        result = await catalogStorage.create(apiData, user?.id);
      }

      if (result.success) {
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
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
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
                  {mode === 'edit' ? t('modal.editTitle') :
                   mode === 'variant' ? t('variant.createTitle') :
                   t('modal.createTitle')}
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
              {['basic', 'pricing', 'attributes'].map(section => (
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
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-5 max-h-[28rem] overflow-y-auto">
              {/* Variant info banner */}
              {mode === 'variant' && parentItem && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <p className="font-medium">{t('variant.inheritedFields')}</p>
                      <p className="mt-1">
                        {t('family.inheritedFrom')}: <strong>{parentItem.name}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              )}

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

                  {/* Create as family option */}
                  {mode === 'create' && canHaveVariants(formData.type) && (
                    <div className="border-t border-gray-200 pt-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={createAsFamily}
                          onChange={(e) => setCreateAsFamily(e.target.checked)}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          {t('family.createTitle')}
                        </span>
                      </label>
                      <p className="ml-6 text-xs text-gray-500 mt-1">
                        {t('family.description')}
                      </p>

                      {/* Variants list */}
                      {createAsFamily && (
                        <div className="mt-4 space-y-3">
                          {variants.map((variant, index) => (
                            <div key={variant.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                              <input
                                type="text"
                                value={variant.name}
                                onChange={(e) => updateVariant(index, 'name', e.target.value)}
                                placeholder={t('fields.name')}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              />
                              <input
                                type="number"
                                value={variant.dosage || ''}
                                onChange={(e) => updateVariant(index, 'dosage', parseFloat(e.target.value) || null)}
                                placeholder={t('fields.dosage')}
                                className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              />
                              <select
                                value={variant.dosageUnit}
                                onChange={(e) => updateVariant(index, 'dosageUnit', e.target.value)}
                                className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              >
                                {DOSAGE_UNITS.map(unit => (
                                  <option key={unit.id} value={unit.id}>{unit.label}</option>
                                ))}
                              </select>
                              <input
                                type="number"
                                step="0.01"
                                value={variant.price || ''}
                                onChange={(e) => updateVariant(index, 'price', parseFloat(e.target.value) || 0)}
                                placeholder={t('fields.price')}
                                className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              />
                              <button
                                type="button"
                                onClick={() => removeVariant(index)}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={addVariant}
                            className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700"
                          >
                            <Plus className="h-4 w-4" />
                            {t('actions.addVariant')}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
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

                  {/* Provenance - for medications and treatments */}
                  {shouldShowField('provenance', formData.type) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('fields.provenance')}
                      </label>
                      <input
                        type="text"
                        value={formData.provenance || ''}
                        onChange={(e) => handleChange('provenance', e.target.value)}
                        placeholder={t('placeholders.provenance')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  )}

                  {/* Duration - for services and treatments */}
                  {shouldShowField('duration', formData.type) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('fields.duration')} ({t('units.minutes')})
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="5"
                          max="480"
                          step="5"
                          value={formData.duration || ''}
                          onChange={(e) => handleChange('duration', parseInt(e.target.value) || null)}
                          placeholder={t('placeholders.duration')}
                          className={`flex-1 px-3 py-2 border rounded-lg ${
                            errors.duration ? 'border-red-500' : 'border-gray-300'
                          } focus:ring-2 focus:ring-green-500 focus:border-green-500`}
                        />
                        <div className="flex gap-1 flex-wrap">
                          {DURATION_PRESETS.map(preset => (
                            <button
                              key={preset.value}
                              type="button"
                              onClick={() => handleChange('duration', preset.value)}
                              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                                formData.duration === preset.value
                                  ? 'border-green-500 bg-green-50 text-green-700'
                                  : 'border-gray-300 hover:border-gray-400'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {errors.duration && (
                        <p className="mt-1 text-sm text-red-600">{errors.duration}</p>
                      )}
                      {(formData.type === 'service' || formData.type === 'treatment') && (
                        <p className="mt-1 text-xs text-gray-500">
                          {t('integration.appointmentDuration')}
                        </p>
                      )}
                    </div>
                  )}

                  {/* No attributes message */}
                  {!shouldShowField('dosage', formData.type) &&
                   !shouldShowField('volume', formData.type) &&
                   !shouldShowField('provenance', formData.type) &&
                   !shouldShowField('duration', formData.type) && (
                    <p className="text-sm text-gray-500 text-center py-8">
                      {t('empty.title')}
                    </p>
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
    </div>
  );
};

export default CatalogFormModal;
