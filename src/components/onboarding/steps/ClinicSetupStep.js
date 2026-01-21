/**
 * ClinicSetupStep - Step 1 of onboarding
 *
 * Allows admin to configure basic clinic information:
 * - Clinic name
 * - Contact email
 * - Phone number
 * - Address
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../hooks/useAuth';
import { baseClient } from '../../../api/baseClient';
import { Building2, Mail, Phone, MapPin, ArrowRight, Loader2 } from 'lucide-react';

const ClinicSetupStep = ({ onComplete, onBack, canGoBack, isLastStep, isCompleting }) => {
  const { t } = useTranslation('onboarding');
  const { company } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      postalCode: '',
      country: ''
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pre-fill with existing company data
  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        email: company.email || '',
        phone: company.phone || '',
        address: {
          // Read address fields from company (backend format: addressLine1, city, postalCode)
          street: company.addressLine1 || company.address?.street || '',
          city: company.city || company.address?.city || '',
          postalCode: company.postalCode || company.address?.postalCode || '',
          country: company.country || company.address?.country || ''
        }
      });
    }
  }, [company]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!formData.name.trim()) {
      setError(t('onboarding.steps.clinic.errors.nameRequired'));
      return;
    }

    if (!formData.email.trim()) {
      setError(t('onboarding.steps.clinic.errors.emailRequired'));
      return;
    }

    try {
      setIsLoading(true);

      // Update clinic info via API
      // Map frontend fields to backend field names
      await baseClient.put('/facilities/current', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || '',
        address_line1: formData.address.street || '',
        city: formData.address.city || '',
        postal_code: formData.address.postalCode || '',
        country: formData.address.country || 'FR'
      });

      onComplete(formData);
    } catch (error) {
      console.error('[ClinicSetupStep] Failed to save:', error);
      setError(error.message || t('onboarding.steps.clinic.errors.saveFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Clinic Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Building2 className="h-4 w-4 inline mr-2" />
          {t('onboarding.steps.clinic.fields.name')} *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={t('onboarding.steps.clinic.placeholders.name')}
          required
        />
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Mail className="h-4 w-4 inline mr-2" />
          {t('onboarding.steps.clinic.fields.email')} *
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={t('onboarding.steps.clinic.placeholders.email')}
          required
        />
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Phone className="h-4 w-4 inline mr-2" />
          {t('onboarding.steps.clinic.fields.phone')}
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={t('onboarding.steps.clinic.placeholders.phone')}
        />
      </div>

      {/* Address Section */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          <MapPin className="h-4 w-4 inline mr-2" />
          {t('onboarding.steps.clinic.fields.address')}
        </label>

        <input
          type="text"
          value={formData.address.street}
          onChange={(e) => handleAddressChange('street', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={t('onboarding.steps.clinic.placeholders.street')}
        />

        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            value={formData.address.city}
            onChange={(e) => handleAddressChange('city', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('onboarding.steps.clinic.placeholders.city')}
          />
          <input
            type="text"
            value={formData.address.postalCode}
            onChange={(e) => handleAddressChange('postalCode', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('onboarding.steps.clinic.placeholders.postalCode')}
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-between pt-6 border-t">
        {canGoBack ? (
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-2 text-gray-600 hover:text-gray-900"
            disabled={isLoading}
          >
            {t('onboarding.buttons.back')}
          </button>
        ) : (
          <div />
        )}

        <button
          type="submit"
          disabled={isLoading || isCompleting}
          className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <span>{t('onboarding.buttons.next')}</span>
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default ClinicSetupStep;
