// components/medical/SmokingAssessment.js
import React, { useMemo } from 'react';
import { AlertTriangle, Info, Activity, Heart, Cigarette } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Calculates pack-years from cigarettes per day and years smoking
 * Pack-years = (cigarettes per day / 20) * years smoking
 */
const calculatePackYears = (cigarettesPerDay, yearsSmoking) => {
  if (!cigarettesPerDay || !yearsSmoking) return 0;
  return Math.round(((cigarettesPerDay / 20) * yearsSmoking) * 10) / 10;
};

/**
 * Determines exposure level based on pack-years
 */
const getExposureLevel = (packYears) => {
  if (packYears < 5) return 'low';
  if (packYears < 10) return 'moderate';
  if (packYears < 20) return 'high';
  return 'very_high';
};

/**
 * Generates health alerts based on smoking data and patient age
 * These are decision-support indicators, NOT diagnoses
 */
const generateHealthAlerts = (smokingData, patientAge) => {
  const alerts = [];
  const { status, cigarettesPerDay, packYears } = smokingData;

  if (status === 'never') return alerts;

  // Respiratory alerts
  if (packYears >= 20) {
    alerts.push({
      type: 'respiratory',
      severity: 'high',
      key: 'respiratoryMonitoring'
    });
  } else if (packYears >= 10) {
    alerts.push({
      type: 'respiratory',
      severity: 'moderate',
      key: 'respiratoryRisk'
    });
  }

  // Cardiovascular alerts (for current smokers)
  if (status === 'current') {
    if (cigarettesPerDay >= 20) {
      alerts.push({
        type: 'cardiovascular',
        severity: 'high',
        key: 'cardiovascularMajor'
      });
    } else if (cigarettesPerDay >= 10) {
      alerts.push({
        type: 'cardiovascular',
        severity: 'moderate',
        key: 'cardiovascularSignificant'
      });
    }
  }

  // Nicotine dependence alerts (for current smokers)
  if (status === 'current') {
    if (cigarettesPerDay > 20) {
      alerts.push({
        type: 'dependence',
        severity: 'high',
        key: 'nicotineDependenceStrong'
      });
    } else if (cigarettesPerDay > 10) {
      alerts.push({
        type: 'dependence',
        severity: 'moderate',
        key: 'nicotineDependenceProbable'
      });
    }
  }

  // Screening discussion alert
  if (packYears >= 20 && patientAge >= 50) {
    alerts.push({
      type: 'screening',
      severity: 'info',
      key: 'screeningDiscussion'
    });
  }

  return alerts;
};

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
 * Get alert icon based on type
 */
const AlertIcon = ({ type }) => {
  switch (type) {
    case 'respiratory': return <Activity className="h-4 w-4" />;
    case 'cardiovascular': return <Heart className="h-4 w-4" />;
    case 'dependence': return <AlertTriangle className="h-4 w-4" />;
    case 'screening': return <Info className="h-4 w-4" />;
    default: return <AlertTriangle className="h-4 w-4" />;
  }
};

const SmokingAssessment = ({
  value,
  onChange,
  patientAge = null,
  compact = false
}) => {
  const { t } = useTranslation(['medical', 'common']);

  // Ensure we have a properly structured value
  const smokingData = useMemo(() => ({
    status: value?.status || 'never',
    cigarettesPerDay: value?.cigarettesPerDay || 0,
    yearsSmoking: value?.yearsSmoking || 0,
    quitYear: value?.quitYear || null,
    packYears: 0,
    exposureLevel: 'low',
    healthAlerts: []
  }), [value]);

  // Calculate derived values
  const calculatedData = useMemo(() => {
    const packYears = calculatePackYears(
      smokingData.cigarettesPerDay,
      smokingData.yearsSmoking
    );
    const exposureLevel = getExposureLevel(packYears);
    const healthAlerts = generateHealthAlerts(
      { ...smokingData, packYears },
      patientAge
    );

    return {
      ...smokingData,
      packYears,
      exposureLevel,
      healthAlerts
    };
  }, [smokingData, patientAge]);

  // Handle field changes
  const handleChange = (field, val) => {
    const updatedData = {
      ...smokingData,
      [field]: val
    };

    // Recalculate pack-years and exposure level
    const packYears = calculatePackYears(
      field === 'cigarettesPerDay' ? val : updatedData.cigarettesPerDay,
      field === 'yearsSmoking' ? val : updatedData.yearsSmoking
    );
    const exposureLevel = getExposureLevel(packYears);
    const healthAlerts = generateHealthAlerts(
      { ...updatedData, packYears },
      patientAge
    );

    onChange({
      ...updatedData,
      packYears,
      exposureLevel,
      healthAlerts
    });
  };

  const showQuantification = smokingData.status !== 'never';
  const showQuitYear = smokingData.status === 'former';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Cigarette className="h-5 w-5 text-gray-500" />
        <h4 className="font-medium text-gray-900">
          {t('medical:form.habits.smokingAssessment.title')}
        </h4>
      </div>

      {/* Status Selection */}
      <div className={compact ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-1 md:grid-cols-3 gap-4'}>
        <div className={compact ? 'col-span-2' : ''}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('medical:form.habits.smokingAssessment.status')}
          </label>
          <select
            value={smokingData.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="never">{t('medical:form.habits.never')}</option>
            <option value="former">{t('medical:form.habits.formerSmoker')}</option>
            <option value="current">{t('medical:form.habits.currentSmoker')}</option>
          </select>
        </div>
      </div>

      {/* Quantification fields - only show if not "never" */}
      {showQuantification && (
        <div className={compact ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-1 md:grid-cols-3 gap-4'}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('medical:form.habits.smokingAssessment.cigarettesPerDay')}
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={smokingData.cigarettesPerDay || ''}
              onChange={(e) => handleChange('cigarettesPerDay', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder={t('medical:form.habits.smokingAssessment.placeholders.cigarettesPerDay')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('medical:form.habits.smokingAssessment.yearsSmoking')}
            </label>
            <input
              type="number"
              min="0"
              max="80"
              value={smokingData.yearsSmoking || ''}
              onChange={(e) => handleChange('yearsSmoking', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder={t('medical:form.habits.smokingAssessment.placeholders.yearsSmoking')}
            />
          </div>

          {showQuitYear && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('medical:form.habits.smokingAssessment.quitYear')}
              </label>
              <input
                type="number"
                min="1950"
                max={new Date().getFullYear()}
                value={smokingData.quitYear || ''}
                onChange={(e) => handleChange('quitYear', parseInt(e.target.value) || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder={t('medical:form.habits.smokingAssessment.placeholders.quitYear')}
              />
            </div>
          )}
        </div>
      )}

      {/* Calculated Results - only show if there's smoking history */}
      {showQuantification && (smokingData.cigarettesPerDay > 0 || smokingData.yearsSmoking > 0) && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          {/* Pack-years and exposure level */}
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <span className="text-sm text-gray-600">
                {t('medical:form.habits.smokingAssessment.packYears')}:
              </span>
              <span className="ml-2 font-semibold text-gray-900">
                {calculatedData.packYears}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {t('medical:form.habits.smokingAssessment.exposureLevel')}:
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getExposureLevelColor(calculatedData.exposureLevel)}`}>
                {t(`medical:form.habits.smokingAssessment.exposureLevels.${calculatedData.exposureLevel}`)}
              </span>
            </div>
          </div>

          {/* Health Alerts */}
          {calculatedData.healthAlerts.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">
                {t('medical:form.habits.smokingAssessment.healthAlerts')}:
              </span>
              <div className="space-y-2">
                {calculatedData.healthAlerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getAlertSeverityColor(alert.severity)}`}
                  >
                    <AlertIcon type={alert.type} />
                    <span className="text-sm">
                      {t(`medical:form.habits.smokingAssessment.alerts.${alert.key}`)}
                    </span>
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
      )}
    </div>
  );
};

// Export utility functions for use elsewhere
export { calculatePackYears, getExposureLevel, generateHealthAlerts };

export default SmokingAssessment;
