/**
 * PractitionerSetupStep - Step 3 of onboarding
 *
 * Allows admin to add their first healthcare provider:
 * - First name, Last name
 * - Email, Phone (with international format)
 * - Role (doctor, nurse, etc.)
 * - Specialty
 * - License number (RPPS/ADELI)
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { baseClient } from '../../../api/baseClient';
import { healthcareProvidersApi } from '../../../api/healthcareProvidersApi';
import {
  User, Mail, Stethoscope, Award, Users,
  ArrowRight, ArrowLeft, Loader2, CheckCircle
} from 'lucide-react';
import PhoneInput from '../../common/PhoneInput';
import { useLocale } from '../../../contexts/LocaleContext';
import { useSpecialties } from '../../../hooks/useSystemCategories';
import {
  ONBOARDING_PRACTITIONER_ROLES,
  MEDICAL_SPECIALTY_KEYS
} from '../../../utils/medicalConstants';

const PractitionerSetupStep = ({ onComplete, onBack, canGoBack, isLastStep, isCompleting }) => {
  const { t } = useTranslation('onboarding');
  const { country: localeCountry } = useLocale();

  // Dynamic specialties from API
  const { categories: dynamicSpecialties, loading: specialtiesLoading, getTranslatedName: getSpecialtyName } = useSpecialties();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    specialty: '',
    licenseNumber: '',
    teamId: ''
  });

  const [teams, setTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [phoneValid, setPhoneValid] = useState(true); // Phone is optional

  // Load available teams
  useEffect(() => {
    const loadTeams = async () => {
      try {
        setIsLoadingTeams(true);
        const response = await baseClient.get('/teams');
        const teamsData = response.data || response || [];
        setTeams(Array.isArray(teamsData) ? teamsData : []);
      } catch (error) {
        console.error('[PractitionerSetupStep] Failed to load teams:', error);
        setTeams([]);
      } finally {
        setIsLoadingTeams(false);
      }
    };

    loadTeams();
  }, []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.firstName.trim()) {
      setError(t('onboarding.steps.practitioner.errors.firstNameRequired'));
      return;
    }

    if (!formData.lastName.trim()) {
      setError(t('onboarding.steps.practitioner.errors.lastNameRequired'));
      return;
    }

    if (!formData.email.trim()) {
      setError(t('onboarding.steps.practitioner.errors.emailRequired'));
      return;
    }

    if (!validateEmail(formData.email)) {
      setError(t('onboarding.steps.practitioner.errors.emailInvalid'));
      return;
    }

    if (!formData.role) {
      setError(t('onboarding.steps.practitioner.errors.roleRequired'));
      return;
    }

    // Validate phone format if provided
    if (formData.phone && !phoneValid) {
      setError(t('onboarding.steps.practitioner.errors.phoneInvalid', 'Format de téléphone invalide'));
      return;
    }

    try {
      setIsLoading(true);

      // Prepare data for the healthcare provider API
      // Use camelCase - dataTransform will convert to snake_case
      const providerData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || '',
        role: formData.role,
        profession: formData.role === 'physician' ? 'Médecin' : 'Praticien de santé',
        specialties: formData.specialty ? [formData.specialty] : [],
        rpps: formData.licenseNumber || '',
        teamId: formData.teamId || null,
        isActive: true,
        sendInvitation: true // Send email invitation to set password
      };

      // Create healthcare provider via API
      await healthcareProvidersApi.createHealthcareProvider(providerData);

      setSuccess(true);

      // Short delay to show success before completing
      setTimeout(() => {
        onComplete(formData);
      }, 500);
    } catch (error) {
      console.error('[PractitionerSetupStep] Failed to save:', error);
      setError(error.message || t('onboarding.steps.practitioner.errors.saveFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Intro text */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <p className="text-blue-800 text-sm">
          {t('onboarding.steps.practitioner.intro')}
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          {t('onboarding.steps.practitioner.success')}
        </div>
      )}

      {/* Name fields - two columns */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="h-4 w-4 inline mr-2" />
            {t('onboarding.steps.practitioner.fields.firstName')} *
          </label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => handleChange('firstName', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('onboarding.steps.practitioner.placeholders.firstName')}
            required
            disabled={isLoading || success}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('onboarding.steps.practitioner.fields.lastName')} *
          </label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => handleChange('lastName', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('onboarding.steps.practitioner.placeholders.lastName')}
            required
            disabled={isLoading || success}
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Mail className="h-4 w-4 inline mr-2" />
          {t('onboarding.steps.practitioner.fields.email')} *
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={t('onboarding.steps.practitioner.placeholders.email')}
          required
          disabled={isLoading || success}
        />
      </div>

      {/* Phone - International format with country selector */}
      <PhoneInput
        value={formData.phone}
        onChange={(e) => handleChange('phone', e.target.value)}
        onValidationChange={(isValid) => setPhoneValid(isValid)}
        defaultCountry={localeCountry}
        name="practitionerPhone"
        label={t('onboarding.steps.practitioner.fields.phone')}
        required={false}
        disabled={isLoading || success}
        showValidation
      />

      {/* Role and Specialty - two columns */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Stethoscope className="h-4 w-4 inline mr-2" />
            {t('onboarding.steps.practitioner.fields.role')} *
          </label>
          <select
            value={formData.role}
            onChange={(e) => handleChange('role', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            disabled={isLoading || success}
          >
            <option value="">-- Sélectionner --</option>
            {ONBOARDING_PRACTITIONER_ROLES.map(role => (
              <option key={role} value={role}>
                {t(`onboarding.steps.practitioner.roles.${role}`)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('onboarding.steps.practitioner.fields.specialty')}
          </label>
          <select
            value={formData.specialty}
            onChange={(e) => handleChange('specialty', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading || success || specialtiesLoading}
          >
            <option value="">-- Optionnel --</option>
            {specialtiesLoading ? (
              <option disabled>Chargement...</option>
            ) : dynamicSpecialties.length > 0 ? (
              dynamicSpecialties.map(specialty => (
                <option key={specialty.code} value={specialty.code}>
                  {getSpecialtyName(specialty)}
                </option>
              ))
            ) : (
              MEDICAL_SPECIALTY_KEYS.map(specialty => (
                <option key={specialty} value={specialty}>
                  {t(`onboarding.steps.practitioner.specialties.${specialty}`)}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* License Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Award className="h-4 w-4 inline mr-2" />
          {t('onboarding.steps.practitioner.fields.licenseNumber')}
        </label>
        <input
          type="text"
          value={formData.licenseNumber}
          onChange={(e) => handleChange('licenseNumber', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={t('onboarding.steps.practitioner.placeholders.licenseNumber')}
          disabled={isLoading || success}
        />
      </div>

      {/* Team Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Users className="h-4 w-4 inline mr-2" />
          {t('onboarding.steps.practitioner.fields.team')}
        </label>
        {isLoadingTeams ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement des équipes...
          </div>
        ) : (
          <select
            value={formData.teamId}
            onChange={(e) => handleChange('teamId', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading || success}
          >
            <option value="">-- Optionnel --</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Buttons */}
      <div className="flex justify-between pt-6 border-t">
        {canGoBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center space-x-2 px-6 py-2 text-gray-600 hover:text-gray-900"
            disabled={isLoading}
          >
            <ArrowLeft className="h-5 w-5" />
            <span>{t('onboarding.buttons.back')}</span>
          </button>
        ) : (
          <div />
        )}

        <button
          type="submit"
          disabled={isLoading || isCompleting || success}
          className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading || isCompleting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <span>{isLastStep ? t('onboarding.buttons.finish') : t('onboarding.buttons.next')}</span>
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default PractitionerSetupStep;
