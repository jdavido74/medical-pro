// components/auth/SignupPage.js
import React, { useState } from 'react';
import { Heart, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import SocialAuth from './SocialAuth';
import { validateEmail, validateClinicName } from '../../utils/validation';
import { region } from '../../i18n';

const SignupPage = ({ setCurrentPage }) => {
  const { register } = useAuth();
  const { t } = useTranslation('auth');
  const [showPassword, setShowPassword] = useState(false);
  const [signupData, setSignupData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    clinicName: '',
    password: '',
    country: region === 'spain' ? 'ES' : 'FR', // Auto-detect country from region
    acceptTerms: false
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!signupData.firstName.trim()) {
      newErrors.firstName = t('validation.required', { field: t('firstName') });
    }

    if (!signupData.lastName.trim()) {
      newErrors.lastName = t('validation.required', { field: t('lastName') });
    }

    if (!signupData.phone.trim()) {
      newErrors.phone = t('validation.required', { field: t('phone') });
    }

    if (!signupData.email || !validateEmail(signupData.email)) {
      newErrors.email = t('validation.invalidEmail');
    }

    if (!signupData.clinicName || !validateClinicName(signupData.clinicName)) {
      newErrors.clinicName = t('validation.clinicNameRequired');
    }

    if (!signupData.password || signupData.password.length < 8) {
      newErrors.password = t('validation.passwordTooShort');
    }

    if (!signupData.acceptTerms) {
      newErrors.acceptTerms = t('termsError');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      await register({
        firstName: signupData.firstName,
        lastName: signupData.lastName,
        email: signupData.email,
        phone: signupData.phone,
        clinicName: signupData.clinicName,
        password: signupData.password,
        country: signupData.country,
        acceptTerms: signupData.acceptTerms
      });

      // Show success message and redirect to login
      setErrors({});
      // In a real app, you'd show a modal or redirect to email verification page
      setCurrentPage('login');
    } catch (error) {
      setErrors({ submit: error.message || t('accountError') });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSignupData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Effacer l'erreur spécifique quand l'utilisateur tape
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="text-center mb-8">
            <Heart className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900">{t('signupTitle')}</h1>
            <p className="text-gray-600 mt-2">{t('signupSubtitle')}</p>
          </div>

          {/* Authentification sociale */}
          <SocialAuth
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            mode="signup"
            medicalContext={true}
          />

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">{t('orCreateAccount')}</span>
            </div>
          </div>

          {/* Formulaire médical */}
          <div className="space-y-4">
            {/* Prénom */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                {t('firstName')} *
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                value={signupData.firstName}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.firstName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={t('firstNamePlaceholder')}
              />
              {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
            </div>

            {/* Nom de famille */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                {t('lastName')} *
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={signupData.lastName}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.lastName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={t('lastNamePlaceholder')}
              />
              {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
            </div>

            {/* Téléphone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                {t('phone')} *
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={signupData.phone}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={t('phonePlaceholder')}
              />
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                {t('email')} *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={signupData.email}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="dr.dupont@cabinet-medical.es"
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            {/* Nom du cabinet */}
            <div>
              <label htmlFor="clinicName" className="block text-sm font-medium text-gray-700 mb-2">
                {t('clinicName')} *
              </label>
              <input
                id="clinicName"
                name="clinicName"
                type="text"
                value={signupData.clinicName}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.clinicName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={t('clinicNamePlaceholder')}
              />
              {errors.clinicName && <p className="text-red-500 text-sm mt-1">{errors.clinicName}</p>}
            </div>

            {/* Mot de passe */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                {t('password')} *
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={signupData.password}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 pr-10 ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={t('passwordHelper')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ?
                    <EyeOff className="h-4 w-4 text-gray-400" /> :
                    <Eye className="h-4 w-4 text-gray-400" />
                  }
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>

            {/* Conditions */}
            <div className="flex items-start">
              <input
                id="acceptTerms"
                name="acceptTerms"
                type="checkbox"
                checked={signupData.acceptTerms}
                onChange={handleChange}
                className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500 mt-1"
              />
              <label htmlFor="acceptTerms" className="ml-2 text-sm text-gray-700">
                {t('acceptTerms')}{' '}
                <button type="button" className="text-green-600 hover:text-green-700 underline">
                  {t('termsLink')}
                </button>{' '}
                {t('and')}{' '}
                <button type="button" className="text-green-600 hover:text-green-700 underline">
                  {t('privacyLink')}
                </button>
              </label>
            </div>
            {errors.acceptTerms && <p className="text-red-500 text-sm mt-1">{errors.acceptTerms}</p>}
          </div>

          {/* Erreur générale */}
          {errors.submit && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? t('creatingAccount') : t('createAccount')}
          </button>

          {/* Navigation */}
          <div className="mt-6 text-center">
            <span className="text-gray-600">{t('alreadyAccount')} </span>
            <button
              type="button"
              onClick={() => setCurrentPage('login')}
              className="text-green-600 hover:text-green-700 font-medium"
            >
              {t('login')}
            </button>
          </div>
        </form>

        {/* Informations sécurité médicale */}
        <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Heart className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">{t('secureClinic')}</span>
          </div>
          <p className="text-xs text-green-700">
            {t('secureDescription')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;