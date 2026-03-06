/**
 * PreconsultationPage — Public patient pre-consultation wizard
 *
 * Accessed via /preconsultation/:token (no auth required).
 * Responsive: vertical stepper on mobile, horizontal on desktop.
 * Language is set from the token's language field.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  User, FileText, CheckCircle, Calendar, Receipt,
  Loader, AlertTriangle, Clock, ChevronLeft, ChevronRight
} from 'lucide-react';
import { getPreconsultationByToken } from '../../api/preconsultationApi';
import PatientInfoStep from '../../components/preconsultation/PatientInfoStep';
import DocumentUploadStep from '../../components/preconsultation/DocumentUploadStep';
import ConfirmationStep from '../../components/preconsultation/ConfirmationStep';
import DateSelectionStep from '../../components/preconsultation/DateSelectionStep';
import QuoteStep from '../../components/preconsultation/QuoteStep';

const STEP_ICONS = {
  patientInfo: User,
  documents: FileText,
  confirmation: CheckCircle,
  dateSelection: Calendar,
  quoteValidation: Receipt
};

export default function PreconsultationPage() {
  const { token } = useParams();
  const { t, i18n } = useTranslation('preconsultation');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getPreconsultationByToken(token);
      setData(result);

      // Set i18n language from token
      if (result.language && result.language !== i18n.language) {
        i18n.changeLanguage(result.language);
      }

      // Auto-navigate to appropriate step based on status
      if (result.proposedDates?.length > 0 && result.status === 'modification_requested') {
        // Show date selection
      } else if (['quote_sent', 'quote_accepted', 'quote_rejected'].includes(result.status)) {
        // Show quote step
      } else if (['documents_uploaded', 'confirmed'].includes(result.status)) {
        setCurrentStep(2); // confirmation
      } else if (result.status === 'patient_info_completed') {
        setCurrentStep(1); // documents
      }
      // else stay at step 0 (patient info)
    } catch (err) {
      if (err.status === 410) {
        setError('expired');
      } else if (err.status === 404) {
        setError('invalid');
      } else {
        setError('error');
      }
    } finally {
      setLoading(false);
    }
  }, [token, i18n]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Determine which steps to show based on status
  const getSteps = () => {
    if (!data) return [];

    const baseSteps = [
      { key: 'patientInfo', label: t('stepper.patientInfo') },
      { key: 'documents', label: t('stepper.documents') },
      { key: 'confirmation', label: t('stepper.confirmation') }
    ];

    // Add date selection if dates are proposed
    if (data.proposedDates?.length > 0 && data.status === 'modification_requested') {
      return [{ key: 'dateSelection', label: t('stepper.dateSelection') }];
    }

    // Show quote step if in quote phase
    if (['quote_sent', 'quote_accepted', 'quote_rejected'].includes(data.status)) {
      return [{ key: 'quoteValidation', label: t('stepper.quoteValidation') }];
    }

    return baseSteps;
  };

  const steps = getSteps();

  const handleStatusChange = (newStatus) => {
    setData(prev => ({ ...prev, status: newStatus }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ─── Loading state ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t('page.loading')}</p>
        </div>
      </div>
    );
  }

  // ─── Error states ──────────────────────────────────────────
  if (error) {
    const errorConfig = {
      expired: { icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50' },
      invalid: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
      error: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' }
    };
    const config = errorConfig[error];
    const ErrorIcon = config.icon;

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className={`max-w-md w-full ${config.bg} rounded-2xl p-8 text-center shadow-sm`}>
          <ErrorIcon className={`w-16 h-16 ${config.color} mx-auto mb-4`} />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">{t(`page.${error}`)}</h1>
          <p className="text-gray-600">{t(`page.${error}Message`)}</p>
        </div>
      </div>
    );
  }

  // ─── Completed state ──────────────────────────────────────
  if (['confirmed', 'quote_accepted'].includes(data.status) && steps.length <= 3 && currentStep === steps.length - 1) {
    // Already confirmed — show completion only if they came back
  }

  if (data.status === 'cancelled') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-red-50 rounded-2xl p-8 text-center shadow-sm">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">{t('confirmation.cancelled')}</h1>
          <p className="text-gray-600">{t('page.expiredMessage')}</p>
        </div>
      </div>
    );
  }

  // ─── Step content renderer ─────────────────────────────────
  const renderStepContent = () => {
    const step = steps[currentStep];
    if (!step) return null;

    switch (step.key) {
      case 'patientInfo':
        return (
          <PatientInfoStep
            token={token}
            patient={data.patient}
            onComplete={() => {
              handleStatusChange('patient_info_completed');
              handleNext();
            }}
          />
        );
      case 'documents':
        return (
          <DocumentUploadStep
            token={token}
            documentCount={data.documentCount}
            onComplete={() => {
              handleNext();
            }}
          />
        );
      case 'confirmation':
        return (
          <ConfirmationStep
            token={token}
            appointment={data.appointment}
            documentCount={data.documentCount}
            status={data.status}
            onStatusChange={handleStatusChange}
          />
        );
      case 'dateSelection':
        return (
          <DateSelectionStep
            token={token}
            proposedDates={data.proposedDates}
            onStatusChange={(status) => {
              handleStatusChange(status);
              loadData(); // Reload to get updated state
            }}
          />
        );
      case 'quoteValidation':
        return (
          <QuoteStep
            token={token}
            status={data.status}
            onStatusChange={handleStatusChange}
          />
        );
      default:
        return null;
    }
  };

  // ─── Main render ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 sm:py-6">
          <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
            {t('page.title')}
          </h1>
          {data.patient?.firstName && (
            <p className="text-sm text-gray-500 mt-1">
              {t('page.welcome', { name: `${data.patient.firstName} ${data.patient.lastName}` })}
            </p>
          )}
          {data.expiresAt && (
            <p className="text-xs text-gray-400 mt-1">
              {t('page.expiresAt', { date: new Date(data.expiresAt).toLocaleDateString(data.language) })}
            </p>
          )}
        </div>
      </div>

      {/* Stepper — horizontal on desktop, simplified on mobile */}
      {steps.length > 1 && (
        <div className="bg-white border-b">
          <div className="max-w-3xl mx-auto px-4 py-3">
            {/* Desktop horizontal stepper */}
            <div className="hidden sm:flex items-center justify-between">
              {steps.map((step, index) => {
                const StepIcon = STEP_ICONS[step.key] || CheckCircle;
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                return (
                  <React.Fragment key={step.key}>
                    <button
                      onClick={() => index <= currentStep && setCurrentStep(index)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : isCompleted
                            ? 'text-green-600 cursor-pointer hover:bg-green-50'
                            : 'text-gray-400 cursor-default'
                      }`}
                      disabled={index > currentStep}
                    >
                      <StepIcon className="w-5 h-5" />
                      <span className="text-sm font-medium">{step.label}</span>
                    </button>
                    {index < steps.length - 1 && (
                      <div className={`flex-1 h-px mx-2 ${
                        index < currentStep ? 'bg-green-300' : 'bg-gray-200'
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Mobile: step indicator */}
            <div className="sm:hidden flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {currentStep + 1} / {steps.length}
              </span>
              <span className="text-sm font-medium text-gray-900">
                {steps[currentStep]?.label}
              </span>
              <div className="flex gap-1">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      i === currentStep ? 'bg-blue-600' : i < currentStep ? 'bg-green-400' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {renderStepContent()}

        {/* Navigation buttons (only for multi-step wizard) */}
        {steps.length > 1 && !['dateSelection', 'quoteValidation'].includes(steps[currentStep]?.key) && (
          <div className="flex justify-between mt-8">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentStep === 0
                  ? 'text-gray-300 cursor-default'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              {t('page.previous')}
            </button>

            {currentStep < steps.length - 1 && (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                {t('page.next')}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
