// components/auth/LoginPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { validateEmail } from '../../utils/validation';
import { useLocaleNavigation } from '../../hooks/useLocaleNavigation';

const LoginPage = () => {
  const { login } = useAuth();
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const { navigateToSignup, navigateToHome, buildPath } = useLocaleNavigation();
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Restore remembered email on component mount
  React.useEffect(() => {
    const rememberedEmail = localStorage.getItem('clinicmanager_remember_email');
    if (rememberedEmail) {
      setLoginData(prev => ({
        ...prev,
        email: rememberedEmail,
        rememberMe: true
      }));
    }
  }, []);

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
      console.log('[LoginPage] 🔑 Tentative de connexion avec:', loginData.email);

      // Store remember me preference if checked
      if (loginData.rememberMe) {
        localStorage.setItem('clinicmanager_remember_email', loginData.email);
      } else {
        localStorage.removeItem('clinicmanager_remember_email');
      }

      // Appeler login() du contexte
      // Backend retourne user + company + subscription + permissions + token
      // OU requiresProvisioning si la clinic DB n'est pas encore créée
      const result = await login(loginData.email, loginData.password);

      // ============ DEFERRED PROVISIONING ============
      // If clinic needs provisioning, redirect to provisioning page
      if (result.requiresProvisioning) {
        console.log('[LoginPage] 🔧 Provisioning requis, redirection...');
        navigate(buildPath('/auth/provisioning'), {
          replace: true,
          state: {
            provisioningData: {
              provisioningToken: result.provisioningToken,
              user: result.user,
              company: result.company
            }
          }
        });
        return;
      }

      // Multi-clinic selection required?
      if (result.requiresClinicSelection) {
        console.log('[LoginPage] 🏥 Sélection de clinique requise');
        // TODO: Afficher UI de sélection de clinique
        // Pour l'instant, prendre la première clinique
        const firstClinic = result.clinics[0];
        console.log('[LoginPage] Sélection automatique de:', firstClinic.name);

        // Re-login avec clinicId
        const retryResult = await login(loginData.email, loginData.password, firstClinic.id);

        // Check if selected clinic needs provisioning
        if (retryResult.requiresProvisioning) {
          console.log('[LoginPage] 🔧 Provisioning requis après sélection, redirection...');
          navigate(buildPath('/auth/provisioning'), {
            replace: true,
            state: {
              provisioningData: {
                provisioningToken: retryResult.provisioningToken,
                user: retryResult.user,
                company: retryResult.company
              }
            }
          });
          return;
        }

        if (!retryResult.success) {
          throw new Error('Login failed after clinic selection');
        }
      }

      console.log('[LoginPage] ✅ Connexion réussie, redirection vers dashboard');

      // Redirect to dashboard with locale
      navigate(buildPath('/dashboard'), { replace: true });
    } catch (error) {
      console.error('[LoginPage] ❌ Erreur de connexion:', error);

      // Handle different error types with clear messages
      if (error.status === 401) {
        setErrors({
          submit: '❌ Email ou mot de passe incorrect. Veuillez vérifier vos identifiants.'
        });
      } else if (error.status === 403) {
        setErrors({
          submit: '❌ Votre compte est désactivé ou votre email n\'est pas vérifié. Veuillez vérifier votre boîte de réception ou contacter l\'administrateur.'
        });
      } else if (error.isTimeout) {
        setErrors({
          submit: '❌ Délai d\'attente dépassé. Veuillez réessayer.'
        });
      } else if (error.message && error.message.includes('Network Error')) {
        setErrors({
          submit: '❌ Impossible de se connecter au serveur. Vérifiez votre connexion internet.'
        });
      } else {
        setErrors({
          submit: `❌ Erreur de connexion: ${error.message || 'Erreur inconnue'}. Veuillez réessayer.`
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
            <button
              onClick={() => navigate(buildPath('/forgot-password'))}
              className="text-green-600 hover:text-green-700 text-sm"
            >
              {t('forgotPassword')}
            </button>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-600">
                {t('noAccount')}{' '}
                <button
                  onClick={navigateToSignup}
                  className="text-green-600 hover:text-green-700 font-medium"
                >
                  {t('signup')}
                </button>
              </p>
            </div>

            <button
              onClick={navigateToHome}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              {t('backToHome')}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;