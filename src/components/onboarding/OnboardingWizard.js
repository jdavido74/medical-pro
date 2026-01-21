/**
 * OnboardingWizard - Main onboarding component for new admin accounts
 *
 * This wizard guides new clinic administrators through the initial setup:
 * 1. Clinic Configuration - Basic clinic settings
 * 2. Team Setup - Create at least one team
 * 3. Practitioner Setup - Add at least one healthcare provider
 *
 * The wizard is strictly blocking - admins cannot access the dashboard
 * until all steps are completed.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useLocaleNavigation } from '../../hooks/useLocaleNavigation';
import { baseClient } from '../../api/baseClient';
import OnboardingProgress from './OnboardingProgress';
import ClinicSetupStep from './steps/ClinicSetupStep';
import ClinicScheduleStep from './steps/ClinicScheduleStep';
import TeamSetupStep from './steps/TeamSetupStep';
import PractitionerSetupStep from './steps/PractitionerSetupStep';
import { Building2, Clock, Users, UserPlus, CheckCircle2, AlertCircle } from 'lucide-react';

const STEPS = [
  {
    id: 'clinic',
    titleKey: 'onboarding.steps.clinic.title',
    descriptionKey: 'onboarding.steps.clinic.description',
    icon: Building2,
    component: ClinicSetupStep
  },
  {
    id: 'schedule',
    titleKey: 'onboarding.steps.schedule.title',
    descriptionKey: 'onboarding.steps.schedule.description',
    icon: Clock,
    component: ClinicScheduleStep
  },
  {
    id: 'team',
    titleKey: 'onboarding.steps.team.title',
    descriptionKey: 'onboarding.steps.team.description',
    icon: Users,
    component: TeamSetupStep
  },
  {
    id: 'practitioner',
    titleKey: 'onboarding.steps.practitioner.title',
    descriptionKey: 'onboarding.steps.practitioner.description',
    icon: UserPlus,
    component: PractitionerSetupStep
  }
];

const OnboardingWizard = () => {
  const { t } = useTranslation('onboarding');
  const { user, company, completeSetup, refreshUser } = useAuth();
  const { buildPath } = useLocaleNavigation();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(0);
  const [stepData, setStepData] = useState({});
  const [stepsStatus, setStepsStatus] = useState({
    clinic: false,
    schedule: false,
    team: false,
    practitioner: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState(null);

  // Load initial setup status from backend
  useEffect(() => {
    const loadSetupStatus = async () => {
      try {
        setIsLoading(true);
        const response = await baseClient.get('/clinic/setup-status');

        if (response.success && response.data) {
          setStepsStatus(response.data.steps || {});

          // If already completed, redirect to dashboard
          if (response.data.setupStatus === 'completed') {
            navigate(buildPath('/dashboard'), { replace: true });
          }
        }
      } catch (error) {
        console.error('[Onboarding] Failed to load setup status:', error);
        setError(t('onboarding.errors.loadFailed'));
      } finally {
        setIsLoading(false);
      }
    };

    loadSetupStatus();
  }, [navigate, buildPath, t]);

  // Handle step completion
  const handleStepComplete = async (stepId, data) => {
    setStepData(prev => ({ ...prev, [stepId]: data }));
    setStepsStatus(prev => ({ ...prev, [stepId]: true }));

    // If this is the last step, complete the setup
    if (currentStep === STEPS.length - 1) {
      await handleCompleteSetup();
    } else {
      // Move to next step
      setCurrentStep(prev => prev + 1);
    }
  };

  // Handle going back to previous step
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Complete the entire setup process
  const handleCompleteSetup = async () => {
    try {
      setIsCompleting(true);
      setError(null);

      await completeSetup();

      // Refresh user data to get updated status
      await refreshUser();

      // Redirect to dashboard
      navigate(buildPath('/dashboard'), { replace: true });
    } catch (error) {
      console.error('[Onboarding] Failed to complete setup:', error);
      setError(error.message || t('onboarding.errors.completeFailed'));
      setIsCompleting(false);
    }
  };

  // Get current step info
  const currentStepInfo = STEPS[currentStep];
  const StepComponent = currentStepInfo?.component;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t('onboarding.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t('onboarding.title')}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {t('onboarding.subtitle', { clinicName: company?.name || '' })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">{t('onboarding.loggedInAs')}</p>
              <p className="font-medium text-gray-900">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <OnboardingProgress
            steps={STEPS}
            currentStep={currentStep}
            stepsStatus={stepsStatus}
            t={t}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800">{t('onboarding.errors.title')}</h4>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Step Header */}
          <div className="px-8 py-6 bg-gray-50 border-b">
            <div className="flex items-center space-x-4">
              {currentStepInfo && (
                <>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <currentStepInfo.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {t(currentStepInfo.titleKey)}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {t(currentStepInfo.descriptionKey)}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Step Component */}
          <div className="p-8">
            {StepComponent && (
              <StepComponent
                onComplete={(data) => handleStepComplete(currentStepInfo.id, data)}
                onBack={handleBack}
                canGoBack={currentStep > 0}
                isLastStep={currentStep === STEPS.length - 1}
                isCompleting={isCompleting}
                initialData={stepData[currentStepInfo.id]}
              />
            )}
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>{t('onboarding.helpText')}</p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
