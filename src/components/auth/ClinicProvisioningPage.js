// components/auth/ClinicProvisioningPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { Heart, CheckCircle, AlertCircle, Loader2, Database, Shield, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLocaleNavigation } from '../../hooks/useLocaleNavigation';
import { provisionClinic } from '../../api/clinicProvisioningApi';

const ProvisioningStep = ({ icon: Icon, title, description, status }) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Loader2 className="h-5 w-5 text-green-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <div className={`flex items-start space-x-4 p-4 rounded-lg transition-all duration-300 ${
      status === 'in_progress' ? 'bg-green-50 border border-green-200' :
      status === 'completed' ? 'bg-gray-50' :
      status === 'error' ? 'bg-red-50 border border-red-200' :
      'bg-gray-50 opacity-50'
    }`}>
      <div className={`p-2 rounded-lg ${
        status === 'in_progress' ? 'bg-green-100' :
        status === 'completed' ? 'bg-green-100' :
        status === 'error' ? 'bg-red-100' :
        'bg-gray-200'
      }`}>
        <Icon className={`h-5 w-5 ${
          status === 'in_progress' || status === 'completed' ? 'text-green-600' :
          status === 'error' ? 'text-red-600' :
          'text-gray-400'
        }`} />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h3 className={`font-medium ${
            status === 'in_progress' || status === 'completed' ? 'text-gray-900' :
            status === 'error' ? 'text-red-900' :
            'text-gray-500'
          }`}>
            {title}
          </h3>
          {getStatusIcon()}
        </div>
        <p className={`text-sm mt-1 ${
          status === 'in_progress' || status === 'completed' ? 'text-gray-600' :
          status === 'error' ? 'text-red-600' :
          'text-gray-400'
        }`}>
          {description}
        </p>
      </div>
    </div>
  );
};

const ClinicProvisioningPage = () => {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const location = useLocation();
  const { buildPath } = useLocaleNavigation();

  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [authData, setAuthData] = useState(null);

  // Get provisioning data from location state
  const provisioningData = location.state?.provisioningData;

  const steps = [
    {
      icon: Database,
      title: t('provisioning.steps.database', 'Creating your clinic database'),
      description: t('provisioning.steps.databaseDesc', 'Setting up a secure, isolated database for your clinic')
    },
    {
      icon: Shield,
      title: t('provisioning.steps.security', 'Configuring security'),
      description: t('provisioning.steps.securityDesc', 'Enabling encryption and access controls')
    },
    {
      icon: Users,
      title: t('provisioning.steps.profile', 'Setting up your profile'),
      description: t('provisioning.steps.profileDesc', 'Creating your administrator account')
    }
  ];

  const getStepStatus = (stepIndex) => {
    if (error && stepIndex === currentStep) return 'error';
    if (stepIndex < currentStep) return 'completed';
    if (stepIndex === currentStep && !isComplete) return 'in_progress';
    if (isComplete) return 'completed';
    return 'pending';
  };

  const runProvisioning = useCallback(async () => {
    if (!provisioningData?.provisioningToken) {
      setError(t('provisioning.error.noToken', 'Session expired. Please login again.'));
      return;
    }

    try {
      // Simulate step progression for better UX
      // Step 1: Database creation
      setCurrentStep(0);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 2: Security configuration (visual only)
      setCurrentStep(1);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 3: Profile setup - actual API call
      setCurrentStep(2);

      const response = await provisionClinic(provisioningData.provisioningToken);

      if (response.success) {
        setAuthData(response.data);
        setIsComplete(true);

        // Store tokens
        if (response.data.tokens) {
          localStorage.setItem('clinicmanager_token', response.data.tokens.accessToken);
          localStorage.setItem('clinicmanager_refresh_token', response.data.tokens.refreshToken);
        }

        // Wait a moment to show completion, then redirect
        setTimeout(() => {
          navigate(buildPath('/dashboard'), { replace: true });
        }, 1500);
      } else {
        throw new Error(response.error?.message || 'Provisioning failed');
      }
    } catch (err) {
      console.error('[ClinicProvisioning] Error:', err);
      setError(err.message || t('provisioning.error.generic', 'An error occurred during setup'));
    }
  }, [provisioningData, t, navigate, buildPath]);

  useEffect(() => {
    // If no provisioning data, redirect to login
    if (!provisioningData) {
      navigate(buildPath('/login'), { replace: true });
      return;
    }

    // Start provisioning
    runProvisioning();
  }, [provisioningData, navigate, buildPath, runProvisioning]);

  const handleRetry = () => {
    setError(null);
    setCurrentStep(0);
    runProvisioning();
  };

  const handleBackToLogin = () => {
    navigate(buildPath('/login'), { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <Heart className="h-16 w-16 text-green-600 mx-auto mb-4" />
            {!isComplete && !error && (
              <div className="absolute -bottom-1 -right-1">
                <Loader2 className="h-6 w-6 text-green-500 animate-spin" />
              </div>
            )}
            {isComplete && (
              <div className="absolute -bottom-1 -right-1">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isComplete
              ? t('provisioning.titleComplete', 'Your clinic is ready!')
              : t('provisioning.title', 'Setting up your clinic')}
          </h1>
          <p className="text-gray-600 mt-2">
            {isComplete
              ? t('provisioning.subtitleComplete', 'Redirecting to your dashboard...')
              : t('provisioning.subtitle', 'This only takes a moment. Please wait...')}
          </p>

          {/* Clinic name */}
          {provisioningData?.company?.name && (
            <div className="mt-4 inline-flex items-center px-4 py-2 bg-green-50 rounded-full">
              <Heart className="h-4 w-4 text-green-600 mr-2" />
              <span className="text-green-800 font-medium">{provisioningData.company.name}</span>
            </div>
          )}
        </div>

        {/* Progress Steps */}
        <div className="space-y-3 mb-8">
          {steps.map((step, index) => (
            <ProvisioningStep
              key={index}
              icon={step.icon}
              title={step.title}
              description={step.description}
              status={getStepStatus(index)}
            />
          ))}
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-900">
                    {t('provisioning.error.title', 'Setup failed')}
                  </h4>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-4">
              <button
                onClick={handleRetry}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                {t('provisioning.retry', 'Try Again')}
              </button>
              <button
                onClick={handleBackToLogin}
                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                {t('provisioning.backToLogin', 'Back to Login')}
              </button>
            </div>
          </div>
        )}

        {/* Success State */}
        {isComplete && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <h4 className="font-medium text-green-900">
                  {t('provisioning.success.title', 'Setup complete!')}
                </h4>
                <p className="text-sm text-green-700 mt-1">
                  {t('provisioning.success.message', 'Your clinic is ready. Redirecting you now...')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {!error && !isComplete && (
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">
                {t('provisioning.pleaseWait', 'Please wait, do not close this page...')}
              </span>
            </div>
          </div>
        )}

        {/* Security info */}
        <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-800">
              {t('provisioning.security.title', 'Enterprise-grade security')}
            </span>
          </div>
          <p className="text-xs text-gray-600">
            {t('provisioning.security.description', 'Your clinic data is stored in an isolated, encrypted database. Only authorized users can access your information.')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClinicProvisioningPage;
