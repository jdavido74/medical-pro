// components/auth/SignupPage.js
import React, { useState } from 'react';
import { Heart, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import SocialAuth from './SocialAuth';
import { validateEmail, validateMedicalNumber, validateClinicName } from '../../utils/validation';

const SignupPage = ({ setCurrentPage }) => {
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    clinicName: '',
    medicalNumber: '',
    password: '',
    acceptTerms: false
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!signupData.name.trim()) {
      newErrors.name = 'Nom requis';
    }

    if (!signupData.email || !validateEmail(signupData.email)) {
      newErrors.email = 'Email invalide';
    }

    if (!signupData.clinicName || !validateClinicName(signupData.clinicName)) {
      newErrors.clinicName = 'Nom du cabinet requis';
    }

    if (!signupData.medicalNumber || !validateMedicalNumber(signupData.medicalNumber)) {
      newErrors.medicalNumber = 'Numéro ADELI (9 chiffres) ou RPPS (11 chiffres) invalide';
    }

    if (!signupData.password || signupData.password.length < 8) {
      newErrors.password = 'Le mot de passe doit contenir au moins 8 caractères';
    }

    if (!signupData.acceptTerms) {
      newErrors.acceptTerms = 'Vous devez accepter les conditions d\'utilisation';
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
        name: signupData.name,
        email: signupData.email,
        clinicName: signupData.clinicName,
        medicalNumber: signupData.medicalNumber,
        password: signupData.password
      });
    } catch (error) {
      setErrors({ submit: error.message || 'Erreur lors de la création du compte' });
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
            <h1 className="text-3xl font-bold text-gray-900">Créer un compte</h1>
            <p className="text-gray-600 mt-2">Rejoignez ClinicManager et gérez votre cabinet médical</p>
          </div>

          {/* Authentification sociale */}
          <SocialAuth
            isLoading={isLoading}
            mode="signup"
            medicalContext={true}
          />

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Ou créez votre compte professionnel</span>
            </div>
          </div>

          {/* Formulaire médical */}
          <div className="space-y-4">
            {/* Nom complet */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Nom complet *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={signupData.name}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Dr Jean Dupont"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email professionnel *
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
                placeholder="dr.dupont@cabinet-medical.fr"
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            {/* Nom du cabinet */}
            <div>
              <label htmlFor="clinicName" className="block text-sm font-medium text-gray-700 mb-2">
                Nom du cabinet médical *
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
                placeholder="Cabinet Dr. Dupont"
              />
              {errors.clinicName && <p className="text-red-500 text-sm mt-1">{errors.clinicName}</p>}
            </div>

            {/* Numéro professionnel */}
            <div>
              <label htmlFor="medicalNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Numéro ADELI/RPPS *
              </label>
              <input
                id="medicalNumber"
                name="medicalNumber"
                type="text"
                value={signupData.medicalNumber}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.medicalNumber ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="123456789 (ADELI) ou 12345678901 (RPPS)"
                maxLength="11"
              />
              {errors.medicalNumber && <p className="text-red-500 text-sm mt-1">{errors.medicalNumber}</p>}
              <p className="text-xs text-gray-500 mt-1">
                Numéro ADELI (9 chiffres) ou RPPS (11 chiffres)
              </p>
            </div>

            {/* Mot de passe */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe *
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
                  placeholder="8 caractères minimum"
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
                J'accepte les{' '}
                <button type="button" className="text-green-600 hover:text-green-700 underline">
                  conditions d'utilisation
                </button>{' '}
                et la{' '}
                <button type="button" className="text-green-600 hover:text-green-700 underline">
                  charte de protection des données de santé
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
            {isLoading ? 'Création en cours...' : 'Créer mon cabinet médical'}
          </button>

          {/* Navigation */}
          <div className="mt-6 text-center">
            <span className="text-gray-600">Vous avez déjà un compte ? </span>
            <button
              type="button"
              onClick={() => setCurrentPage('login')}
              className="text-green-600 hover:text-green-700 font-medium"
            >
              Se connecter
            </button>
          </div>
        </form>

        {/* Informations sécurité médicale */}
        <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Heart className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">Cabinet sécurisé</span>
          </div>
          <p className="text-xs text-green-700">
            Vos données médicales sont chiffrées et respectent le secret médical.
            Conformité RGPD santé garantie.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;