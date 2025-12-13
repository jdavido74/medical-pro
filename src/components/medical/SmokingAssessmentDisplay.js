// components/medical/SmokingAssessmentDisplay.js
import React from 'react';
import { AlertTriangle, Info, Activity, Heart, Cigarette, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Get the color class based on exposure level
 */
const getExposureLevelColor = (level) => {
  switch (level) {
    case 'low': return 'bg-green-100 text-green-800 border-green-200';
    case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'very_high': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

/**
 * Get alert severity color
 */
const getAlertSeverityColor = (severity) => {
  switch (severity) {
    case 'high': return 'bg-red-50 border-red-200 text-red-800';
    case 'moderate': return 'bg-orange-50 border-orange-200 text-orange-800';
    case 'info': return 'bg-blue-50 border-blue-200 text-blue-800';
    default: return 'bg-gray-50 border-gray-200 text-gray-800';
  }
};

/**
 * Get status icon
 */
const StatusIcon = ({ status }) => {
  switch (status) {
    case 'never':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'former':
      return <Info className="h-4 w-4 text-yellow-500" />;
    case 'current':
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    default:
      return null;
  }
};

/**
 * Get alert icon based on type
 */
const AlertIcon = ({ type }) => {
  switch (type) {
    case 'respiratory': return <Activity className="h-3 w-3" />;
    case 'cardiovascular': return <Heart className="h-3 w-3" />;
    case 'dependence': return <AlertTriangle className="h-3 w-3" />;
    case 'screening': return <Info className="h-3 w-3" />;
    default: return <AlertTriangle className="h-3 w-3" />;
  }
};

/**
 * Compact read-only display of smoking assessment data
 */
const SmokingAssessmentDisplay = ({
  data,
  compact = false,
  showAlerts = true
}) => {
  const { t } = useTranslation(['medical', 'common']);

  // Handle null/undefined data or old format
  if (!data) return null;

  // Support legacy format (only status field)
  const isLegacyFormat = typeof data === 'object' && data.status && !('packYears' in data);

  const smokingData = {
    status: data?.status || 'never',
    cigarettesPerDay: data?.cigarettesPerDay || 0,
    yearsSmoking: data?.yearsSmoking || 0,
    quitYear: data?.quitYear || null,
    packYears: data?.packYears || 0,
    exposureLevel: data?.exposureLevel || 'low',
    healthAlerts: data?.healthAlerts || []
  };

  const { status, cigarettesPerDay, yearsSmoking, quitYear, packYears, exposureLevel, healthAlerts } = smokingData;

  // Non-smoker - minimal display
  if (status === 'never') {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Cigarette className="h-4 w-4 text-gray-400" />
        <span>{t('medical:form.habits.smoking')}: </span>
        <span className="flex items-center gap-1 text-green-600">
          <CheckCircle className="h-4 w-4" />
          {t('medical:form.habits.never')}
        </span>
      </div>
    );
  }

  // Compact view for lists/summaries
  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <div className="flex items-center gap-1">
          <Cigarette className="h-4 w-4 text-gray-500" />
          <span className="text-gray-600">{t('medical:form.habits.smoking')}: </span>
          <StatusIcon status={status} />
          <span className={status === 'current' ? 'text-red-600 font-medium' : 'text-yellow-600'}>
            {status === 'current'
              ? t('medical:form.habits.currentSmoker')
              : t('medical:form.habits.formerSmoker')
            }
          </span>
        </div>

        {!isLegacyFormat && packYears > 0 && (
          <>
            <span className="text-gray-300">|</span>
            <span className="text-gray-600">
              {t('medical:form.habits.smokingAssessment.packYears')}: <strong>{packYears}</strong>
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getExposureLevelColor(exposureLevel)}`}>
              {t(`medical:form.habits.smokingAssessment.exposureLevels.${exposureLevel}`)}
            </span>
          </>
        )}

        {healthAlerts.length > 0 && (
          <>
            <span className="text-gray-300">|</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
              <AlertTriangle className="h-3 w-3" />
              {healthAlerts.length} {t('medical:form.habits.smokingAssessment.healthAlerts').toLowerCase()}
            </span>
          </>
        )}
      </div>
    );
  }

  // Full view with all details
  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cigarette className="h-5 w-5 text-gray-500" />
          <h4 className="font-medium text-gray-900">
            {t('medical:form.habits.smokingAssessment.title')}
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <StatusIcon status={status} />
          <span className={`font-medium ${status === 'current' ? 'text-red-600' : 'text-yellow-600'}`}>
            {status === 'current'
              ? t('medical:form.habits.currentSmoker')
              : t('medical:form.habits.formerSmoker')
            }
          </span>
        </div>
      </div>

      {/* Details Grid */}
      {!isLegacyFormat && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">{t('medical:form.habits.smokingAssessment.cigarettesPerDay')}</span>
            <p className="font-medium text-gray-900">{cigarettesPerDay || '-'}</p>
          </div>
          <div>
            <span className="text-gray-500">{t('medical:form.habits.smokingAssessment.yearsSmoking')}</span>
            <p className="font-medium text-gray-900">{yearsSmoking || '-'}</p>
          </div>
          {quitYear && (
            <div>
              <span className="text-gray-500">{t('medical:form.habits.smokingAssessment.quitYear')}</span>
              <p className="font-medium text-gray-900">{quitYear}</p>
            </div>
          )}
          <div>
            <span className="text-gray-500">{t('medical:form.habits.smokingAssessment.packYears')}</span>
            <p className="font-semibold text-gray-900">{packYears}</p>
          </div>
        </div>
      )}

      {/* Exposure Level */}
      {!isLegacyFormat && packYears > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            {t('medical:form.habits.smokingAssessment.exposureLevel')}:
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getExposureLevelColor(exposureLevel)}`}>
            {t(`medical:form.habits.smokingAssessment.exposureLevels.${exposureLevel}`)}
          </span>
        </div>
      )}

      {/* Health Alerts */}
      {showAlerts && healthAlerts.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-gray-200">
          <span className="text-sm font-medium text-gray-700">
            {t('medical:form.habits.smokingAssessment.healthAlerts')}:
          </span>
          <div className="space-y-1">
            {healthAlerts.map((alert, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm ${getAlertSeverityColor(alert.severity)}`}
              >
                <AlertIcon type={alert.type} />
                <span>{t(`medical:form.habits.smokingAssessment.alerts.${alert.key}`)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="flex items-start gap-2 pt-2 border-t border-gray-200">
        <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-500 italic">
          {t('medical:form.habits.smokingAssessment.disclaimer')}
        </p>
      </div>
    </div>
  );
};

export default SmokingAssessmentDisplay;
