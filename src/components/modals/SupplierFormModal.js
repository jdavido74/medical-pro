/**
 * SupplierFormModal - Modal for creating/editing suppliers
 * Reusable across the application
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Building2, MapPin, Phone, Mail, User, Globe, FileText } from 'lucide-react';
import suppliersApi from '../../api/suppliersApi';

// Common country list (can be extended or replaced with a full list)
const COUNTRIES = [
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Espagne' },
  { code: 'DE', name: 'Allemagne' },
  { code: 'IT', name: 'Italie' },
  { code: 'BE', name: 'Belgique' },
  { code: 'CH', name: 'Suisse' },
  { code: 'GB', name: 'Royaume-Uni' },
  { code: 'US', name: 'États-Unis' },
  { code: 'PT', name: 'Portugal' },
  { code: 'NL', name: 'Pays-Bas' },
  { code: 'AT', name: 'Autriche' },
  { code: 'PL', name: 'Pologne' },
  { code: 'CN', name: 'Chine' },
  { code: 'JP', name: 'Japon' },
  { code: 'KR', name: 'Corée du Sud' },
  { code: 'IN', name: 'Inde' },
  { code: 'BR', name: 'Brésil' },
  { code: 'MX', name: 'Mexique' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australie' }
].sort((a, b) => a.name.localeCompare(b.name));

const SupplierFormModal = ({
  isOpen,
  onClose,
  onSave,
  supplier = null,
  initialName = ''
}) => {
  const { t } = useTranslation('catalog');
  const isEditMode = !!supplier;

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    postalCode: '',
    state: '',
    country: '',
    countryCode: '',
    phone: '',
    email: '',
    website: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    notes: '',
    taxId: ''
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Initialize form data
  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        addressLine1: supplier.addressLine1 || '',
        addressLine2: supplier.addressLine2 || '',
        city: supplier.city || '',
        postalCode: supplier.postalCode || '',
        state: supplier.state || '',
        country: supplier.country || '',
        countryCode: supplier.countryCode || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        website: supplier.website || '',
        contactName: supplier.contactName || '',
        contactEmail: supplier.contactEmail || '',
        contactPhone: supplier.contactPhone || '',
        notes: supplier.notes || '',
        taxId: supplier.taxId || ''
      });
    } else if (initialName) {
      setFormData(prev => ({ ...prev, name: initialName }));
    }
  }, [supplier, initialName]);

  // Handle field change
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Auto-fill country name when country code changes
    if (field === 'countryCode') {
      const country = COUNTRIES.find(c => c.code === value);
      if (country) {
        setFormData(prev => ({ ...prev, countryCode: value, country: country.name }));
      }
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError(t('supplier.nameRequired'));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let response;
      if (isEditMode) {
        response = await suppliersApi.updateSupplier(supplier.id, formData);
      } else {
        response = await suppliersApi.createSupplier(formData);
      }

      if (response.success) {
        onSave(response.data);
      } else {
        setError(response.error?.message || t('common.error'));
      }
    } catch (err) {
      console.error('Error saving supplier:', err);
      setError(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isEditMode ? t('supplier.edit') : t('supplier.create')}
              </h2>
              <p className="text-sm text-gray-500">
                {isEditMode ? t('supplier.editDescription') : t('supplier.createDescription')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-150px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {t('supplier.basicInfo')}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('supplier.name')} *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder={t('supplier.namePlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('supplier.taxId')}
                  </label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => handleChange('taxId', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder={t('supplier.taxIdPlaceholder')}
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {t('supplier.address')}
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={formData.addressLine1}
                  onChange={(e) => handleChange('addressLine1', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder={t('supplier.addressLine1')}
                />
                <input
                  type="text"
                  value={formData.addressLine2}
                  onChange={(e) => handleChange('addressLine2', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder={t('supplier.addressLine2')}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => handleChange('postalCode', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder={t('supplier.postalCode')}
                  />
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder={t('supplier.city')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder={t('supplier.state')}
                  />
                  <select
                    value={formData.countryCode}
                    onChange={(e) => handleChange('countryCode', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('supplier.selectCountry')}</option>
                    {COUNTRIES.map(country => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                {t('supplier.contactInfo')}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('supplier.phone')}</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="+33 1 23 45 67 89"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('supplier.email')}</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="contact@supplier.com"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">{t('supplier.website')}</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleChange('website', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="https://www.supplier.com"
                  />
                </div>
              </div>
            </div>

            {/* Contact Person */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                {t('supplier.contactPerson')}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">{t('supplier.contactName')}</label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => handleChange('contactName', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder={t('supplier.contactNamePlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('supplier.contactEmail')}</label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => handleChange('contactEmail', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="contact.person@supplier.com"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('supplier.contactPhone')}</label>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => handleChange('contactPhone', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="+33 6 12 34 56 78"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {t('supplier.notes')}
              </h3>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder={t('supplier.notesPlaceholder')}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? t('common.saving') : (isEditMode ? t('common.save') : t('common.create'))}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupplierFormModal;
