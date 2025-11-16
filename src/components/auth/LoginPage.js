// components/auth/LoginPage.js
import React, { useState } from 'react';
import { Heart, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import SocialAuth from './SocialAuth';
import { validateEmail } from '../../utils/validation';
import { baseClient } from '../../api/baseClient';

const LoginPage = ({ setCurrentPage }) => {
  const { login } = useAuth();
  const { t } = useTranslation('auth');
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setLoginData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleClassicLogin = async () => {
    // Validation
    const newErrors = {};
    if (!loginData.email) {
      newErrors.email = t('validation.required', { field: t('email') });
    } else if (!validateEmail(loginData.email)) {
      newErrors.email = t('validation.invalidEmail');
    }

    if (!loginData.password) {
      newErrors.password = t('validation.required', { field: t('password') });
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Call backend /auth/login endpoint with email and password
      // This supports all special characters without any encoding issues
      const response = await baseClient.post('/auth/login', {
        email: loginData.email,
        password: loginData.password
      });

      // Check if login was successful
      if (response.success && response.data?.user) {
        const userData = {
          id: response.data.user.id,
          email: response.data.user.email,
          firstName: response.data.user.firstName,
          lastName: response.data.user.lastName,
          name: `${response.data.user.firstName} ${response.data.user.lastName}`,
          companyId: response.data.user.companyId,
          companyName: response.data.user.companyName,
          role: response.data.user.role,
          provider: 'classic',
          isEmailVerified: response.data.user.isEmailVerified || false
        };

        // Extract company data from response
        const companyData = response.data.company || null;

        // Store token separately in localStorage for API requests
        const token = response.data.tokens?.accessToken;
        if (token) {
          localStorage.setItem('clinicmanager_token', token);
        }

        // Update auth context with both user and company data
        login(userData, companyData);

        // Redirect to dashboard
        window.location.href = '/dashboard';
      } else if (response.data?.requiresEmailVerification) {
        // User exists but email not verified
        setErrors({
          email: t('emailNotVerified'),
          password: t('checkEmailVerification')
        });
      } else {
        // Invalid credentials
        setErrors({
          email: t('incorrectCredentials'),
          password: t('verifyData')
        });
      }
    } catch (error) {
      console.error('Login error:', error);

      // Handle different error types
      if (error.status === 401) {
        setErrors({
          email: t('incorrectCredentials'),
          password: t('verifyData')
        });
      } else if (error.status === 403) {
        setErrors({
          submit: t('accountDisabled') || 'Account is disabled'
        });
      } else if (error.isTimeout) {
        setErrors({
          submit: t('requestTimeout') || 'Request timeout - please try again'
        });
      } else {
        setErrors({
          submit: error.message || t('accountError') || 'Login failed - please try again'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <Heart className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900">{t('loginTitle')}</h1>
            <p className="text-gray-600 mt-2">{t('loginSubtitle')}</p>
          </div>

          {/* Authentification sociale */}
          <SocialAuth 
            isLoading={isLoading} 
            setIsLoading={setIsLoading} 
            mode="login" 
          />

          {/* Séparateur */}
          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-4 text-sm text-gray-500">{t('orEmail')}</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          {/* Connexion classique */}
          <div className="space-y-4">
            {/* General error message */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">{errors.submit}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('email')}
              </label>
              <input
                type="email"
                name="email"
                value={loginData.email}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={t('emailPlaceholder')}
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('password')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={loginData.password}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 pr-10 ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={t('passwordPlaceholder')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
              )}
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="rememberMe"
                checked={loginData.rememberMe}
                onChange={handleInputChange}
                className="h-4 w-4 text-green-600 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                {t('rememberMe')}
              </label>
            </div>

            <button
              onClick={handleClassicLogin}
              disabled={isLoading}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? t('signingIn') : t('signIn')}
            </button>
          </div>

          {/* Liens navigation */}
          <div className="text-center mt-6 space-y-3">
            <button className="text-green-600 hover:text-green-700 text-sm">
              {t('forgotPassword')}
            </button>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-600">
                {t('noAccount')}{' '}
                <button
                  onClick={() => setCurrentPage('signup')}
                  className="text-green-600 hover:text-green-700 font-medium"
                >
                  {t('signup')}
                </button>
              </p>
            </div>

            <button
              onClick={() => setCurrentPage('home')}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              {t('backToHome')}
            </button>
          </div>

          {/* Info démo */}
          <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-800 text-center">
              <strong>🧪 {t('demoMode')}</strong> {t('demoCredentials')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;