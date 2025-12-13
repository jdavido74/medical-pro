// components/medical/AlcoholAssessmentDisplay.js
import React from 'react';
import { AlertTriangle, Info, Activity, Heart, Wine, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Get the color class based on risk level
 */
const getRiskLevelColor = (level) => {
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
    case 'occasional':
      return <Info className="h-4 w-4 text-blue-500" />;
    case 'regular':
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    case 'former':
      return <Info className="h-4 w-4 text-yellow-500" />;
    default:
      return null;
  }
};

/**
 * Get alert icon based on type
 */
const AlertIcon = ({ type }) => {
  switch (type) {
    case 'hepatic': return <Activity className="h-3 w-3" />;
    case 'cardiovascular': return <Heart className="h-3 w-3" />;
    case 'dependence': return <AlertTriangle className="h-3 w-3" />;
    case 'binge': return <AlertTriangle className="h-3 w-3" />;
    case 'interaction': return <Info className="h-3 w-3" />;
    default: return <AlertTriangle className="h-3 w-3" />;
  }
};

/**
 * Get status label key
 */
const getStatusLabel = (status, t) => {
  switch (status) {
    case 'never': return t('medical:form.habits.never');
    case 'occasional': return t('medical:form.habits.occasional');
    case 'regular': return t('medical:form.habits.regular');
    case 'former': return t('medical:form.habits.alcoholAssessment.formerDrinker');
    default: return status;
  }
};

/**
 * Compact read-only display of alcohol assessment data
 */
const AlcoholAssessmentDisplay = ({
  data,
  compact = false,
  showAlerts = true
}) => {
  const { t } = useTranslation(['medical', 'common']);

  // Handle null/undefined data
  if (!data) return null;

  // Support legacy format (only status field)
  const isLegacyFormat = typeof data === 'object' && data.status && !('auditCScore' in data);

  const alcoholData = {
    status: data?.status || 'never',
    drinksPerWeek: data?.drinksPerWeek || 0,
    auditCScore: data?.auditCScore || 0,
    riskLevel: data?.riskLevel || 'low',
    healthAlerts: data?.healthAlerts || []
  };

  const { status, drinksPerWeek, auditCScore, riskLevel, healthAlerts } = alcoholData;

  // Non-drinker - minimal display
  if (status === 'never') {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Wine className="h-4 w-4 text-gray-400" />
        <span>{t('medical:form.habits.alcohol')}: </span>
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
          <Wine className="h-4 w-4 text-gray-500" />
          <span className="text-gray-600">{t('medical:form.habits.alcohol')}: </span>
          <StatusIcon status={status} />
          <span className={
            status === 'regular' ? 'text-orange-600 font-medium' :
            status === 'occasional' ? 'text-blue-600' :
            'text-yellow-600'
          }>
            {getStatusLabel(status, t)}
          </span>
        </div>

        {!isLegacyFormat && auditCScore > 0 && (
          <>
            <span className="text-gray-300">|</span>
            <span className="text-gray-600">
              AUDIT-C: <strong>{auditCScore}/12</strong>
            </span>
            {drinksPerWeek > 0 && (
              <span className="text-gray-600">
                (~{drinksPerWeek} {t('medical:form.habits.alcoholAssessment.drinksPerWeek').toLowerCase()})
              </span>
            )}
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getRiskLevelColor(riskLevel)}`}>
              {t(`medical:form.habits.alcoholAssessment.riskLevels.${riskLevel}`)}
            </span>
          </>
        )}

        {healthAlerts.length > 0 && (
          <>
            <span className="text-gray-300">|</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">
              <AlertTriangle className="h-3 w-3" />
              {healthAlerts.length} {t('medical:form.habits.alcoholAssessment.healthAlerts').toLowerCase()}
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
          <Wine className="h-5 w-5 text-gray-500" />
          <h4 className="font-medium text-gray-900">
            {t('medical:form.habits.alcoholAssessment.title')}
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <StatusIcon status={status} />
          <span className={`font-medium ${
            status === 'regular' ? 'text-orange-600' :
            status === 'occasional' ? 'text-blue-600' :
            'text-yellow-600'
          }`}>
            {getStatusLabel(status, t)}
          </span>
        </div>
      </div>

      {/* Details Grid */}
      {!isLegacyFormat && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">{t('medical:form.habits.alcoholAssessment.auditC.score')}</span>
            <p className="font-semibold text-gray-900">{auditCScore}/12</p>
          </div>
          {drinksPerWeek > 0 && (
            <div>
              <span className="text-gray-500">{t('medical:form.habits.alcoholAssessment.drinksPerWeek')}</span>
              <p className="font-medium text-gray-900">~{drinksPerWeek}</p>
            </div>
          )}
          <div>
            <span className="text-gray-500">{t('medical:form.habits.alcoholAssessment.riskLevel')}</span>
            <p className={`font-medium ${
              riskLevel === 'low' ? 'text-green-600' :
              riskLevel === 'moderate' ? 'text-yellow-600' :
              riskLevel === 'high' ? 'text-orange-600' :
              'text-red-600'
            }`}>
              {t(`medical:form.habits.alcoholAssessment.riskLevels.${riskLevel}`)}
            </p>
          </div>
        </div>
      )}

      {/* Risk Level Badge */}
      {!isLegacyFormat && auditCScore > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            {t('medical:form.habits.alcoholAssessment.riskLevel')}:
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRiskLevelColor(riskLevel)}`}>
            {t(`medical:form.habits.alcoholAssessment.riskLevels.${riskLevel}`)}
          </span>
        </div>
      )}

      {/* Health Alerts */}
      {showAlerts && healthAlerts.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-gray-200">
          <span className="text-sm font-medium text-gray-700">
            {t('medical:form.habits.alcoholAssessment.healthAlerts')}:
          </span>
          <div className="space-y-1">
            {healthAlerts.map((alert, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm ${getAlertSeverityColor(alert.severity)}`}
              >
                <AlertIcon type={alert.type} />
                <span>{t(`medical:form.habits.alcoholAssessment.alerts.${alert.key}`)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="flex items-start gap-2 pt-2 border-t border-gray-200">
        <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-500 italic">
          {t('medical:form.habits.alcoholAssessment.disclaimer')}
        </p>
      </div>
    </div>
  );
};

export default AlcoholAssessmentDisplay;
