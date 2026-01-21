// components/medical/AlcoholAssessment.js
import React, { useMemo } from 'react';
import { AlertTriangle, Info, Activity, Heart, Wine, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * AUDIT-C Score calculation
 * Each question scored 0-4, total 0-12
 */
const calculateAuditCScore = (auditC) => {
  if (!auditC) return 0;
  const frequency = auditC.frequency || 0;
  const quantity = auditC.quantity || 0;
  const binge = auditC.binge || 0;
  return frequency + quantity + binge;
};

/**
 * Estimate drinks per week from AUDIT-C responses
 */
const estimateDrinksPerWeek = (auditC) => {
  if (!auditC) return 0;

  // Frequency multiplier (occasions per week)
  const frequencyMultiplier = {
    0: 0,      // Never
    1: 0.25,   // Monthly or less (~1/month = 0.25/week)
    2: 0.75,   // 2-4 times/month (~3/month = 0.75/week)
    3: 2.5,    // 2-3 times/week
    4: 5       // 4+ times/week
  };

  // Quantity per occasion (average drinks)
  const quantityAverage = {
    0: 1.5,    // 1-2 drinks
    1: 3.5,    // 3-4 drinks
    2: 5.5,    // 5-6 drinks
    3: 8,      // 7-9 drinks
    4: 12      // 10+ drinks
  };

  const freq = frequencyMultiplier[auditC.frequency] || 0;
  const qty = quantityAverage[auditC.quantity] || 0;

  return Math.round(freq * qty * 10) / 10;
};

/**
 * Determines risk level based on AUDIT-C score and gender
 * Men: 0-3 low, 4-5 moderate, 6-7 high, 8+ very high
 * Women: 0-2 low, 3-4 moderate, 5-6 high, 7+ very high
 */
const getRiskLevel = (auditCScore, isFemale = false) => {
  if (isFemale) {
    if (auditCScore <= 2) return 'low';
    if (auditCScore <= 4) return 'moderate';
    if (auditCScore <= 6) return 'high';
    return 'very_high';
  } else {
    if (auditCScore <= 3) return 'low';
    if (auditCScore <= 5) return 'moderate';
    if (auditCScore <= 7) return 'high';
    return 'very_high';
  }
};

/**
 * Generates health alerts based on alcohol data
 * These are decision-support indicators, NOT diagnoses
 */
const generateHealthAlerts = (alcoholData, isFemale = false) => {
  const alerts = [];
  const { status, auditCScore, drinksPerWeek, auditC } = alcoholData;

  if (status === 'never') return alerts;

  // Hepatic risk alerts based on drinks per week
  if (drinksPerWeek >= 21) {
    alerts.push({
      type: 'hepatic',
      severity: 'high',
      key: 'hepaticMonitoring'
    });
  } else if (drinksPerWeek >= 14) {
    alerts.push({
      type: 'hepatic',
      severity: 'moderate',
      key: 'hepaticRisk'
    });
  }

  // Cardiovascular risk
  if (drinksPerWeek >= 14) {
    alerts.push({
      type: 'cardiovascular',
      severity: 'moderate',
      key: 'cardiovascularRisk'
    });
  }

  // Dependence risk based on AUDIT-C score
  const dependenceThreshold = isFemale ? 7 : 8;
  const moderateDependenceThreshold = isFemale ? 5 : 6;

  if (auditCScore >= dependenceThreshold) {
    alerts.push({
      type: 'dependence',
      severity: 'high',
      key: 'dependenceHigh'
    });
  } else if (auditCScore >= moderateDependenceThreshold) {
    alerts.push({
      type: 'dependence',
      severity: 'moderate',
      key: 'dependenceRisk'
    });
  }

  // Binge drinking warning
  if (auditC && auditC.binge >= 2) { // Monthly or more frequent
    alerts.push({
      type: 'binge',
      severity: auditC.binge >= 3 ? 'high' : 'moderate',
      key: 'bingeWarning'
    });
  }

  // Interaction warning for regular drinkers
  if (status === 'regular' || drinksPerWeek >= 10) {
    alerts.push({
      type: 'interaction',
      severity: 'info',
      key: 'interactionWarning'
    });
  }

  return alerts;
};

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
 * Get alert icon based on type
 */
const AlertIcon = ({ type }) => {
  switch (type) {
    case 'hepatic': return <Activity className="h-4 w-4" />;
    case 'cardiovascular': return <Heart className="h-4 w-4" />;
    case 'dependence': return <AlertTriangle className="h-4 w-4" />;
    case 'binge': return <AlertTriangle className="h-4 w-4" />;
    case 'interaction': return <Info className="h-4 w-4" />;
    default: return <AlertTriangle className="h-4 w-4" />;
  }
};

const AlcoholAssessment = ({
  value,
  onChange,
  patientGender = null, // 'male', 'female', or null
  compact = false
}) => {
  const { t } = useTranslation(['medical', 'common']);
  const isFemale = patientGender === 'female';

  // Ensure we have a properly structured value
  const alcoholData = useMemo(() => ({
    status: value?.status || 'never',
    drinksPerWeek: value?.drinksPerWeek || 0,
    auditC: value?.auditC || { frequency: 0, quantity: 0, binge: 0 },
    auditCScore: 0,
    riskLevel: 'low',
    healthAlerts: []
  }), [value]);

  // Calculate derived values
  const calculatedData = useMemo(() => {
    const auditCScore = calculateAuditCScore(alcoholData.auditC);
    const estimatedDrinks = estimateDrinksPerWeek(alcoholData.auditC);
    const drinksPerWeek = alcoholData.drinksPerWeek || estimatedDrinks;
    const riskLevel = getRiskLevel(auditCScore, isFemale);
    const healthAlerts = generateHealthAlerts(
      { ...alcoholData, auditCScore, drinksPerWeek },
      isFemale
    );

    return {
      ...alcoholData,
      auditCScore,
      drinksPerWeek,
      estimatedDrinks,
      riskLevel,
      healthAlerts
    };
  }, [alcoholData, isFemale]);

  // Handle field changes
  const handleChange = (field, val) => {
    const updatedData = {
      ...alcoholData,
      [field]: val
    };

    // Recalculate
    const auditCScore = calculateAuditCScore(updatedData.auditC);
    const estimatedDrinks = estimateDrinksPerWeek(updatedData.auditC);
    const drinksPerWeek = updatedData.drinksPerWeek || estimatedDrinks;
    const riskLevel = getRiskLevel(auditCScore, isFemale);
    const healthAlerts = generateHealthAlerts(
      { ...updatedData, auditCScore, drinksPerWeek },
      isFemale
    );

    onChange({
      ...updatedData,
      auditCScore,
      drinksPerWeek: updatedData.drinksPerWeek || 0,
      riskLevel,
      healthAlerts
    });
  };

  // Handle AUDIT-C field changes
  const handleAuditCChange = (field, val) => {
    const updatedAuditC = {
      ...alcoholData.auditC,
      [field]: parseInt(val) || 0
    };
    handleChange('auditC', updatedAuditC);
  };

  const showAssessment = alcoholData.status !== 'never';
  const showFullQuestionnaire = alcoholData.auditC.frequency > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Wine className="h-5 w-5 text-gray-500" />
        <h4 className="font-medium text-gray-900">
          {t('medical:form.habits.alcoholAssessment.title')}
        </h4>
      </div>

      {/* Status Selection */}
      <div className={compact ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-1 md:grid-cols-3 gap-4'}>
        <div className={compact ? 'col-span-2' : ''}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('medical:form.habits.alcoholAssessment.status')}
          </label>
          <select
            value={alcoholData.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="never">{t('medical:form.habits.never')}</option>
            <option value="occasional">{t('medical:form.habits.occasional')}</option>
            <option value="regular">{t('medical:form.habits.regular')}</option>
            <option value="former">{t('medical:form.habits.alcoholAssessment.formerDrinker')}</option>
          </select>
        </div>
      </div>

      {/* AUDIT-C Questionnaire - only show if not "never" */}
      {showAssessment && (
        <div className="bg-blue-50 rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-blue-600" />
            <h5 className="font-medium text-blue-900">
              {t('medical:form.habits.alcoholAssessment.auditC.title')}
            </h5>
            <span className="text-xs text-blue-600">
              ({t('medical:form.habits.alcoholAssessment.auditC.description')})
            </span>
          </div>

          {/* Question 1: Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('medical:form.habits.alcoholAssessment.auditC.frequency')}
            </label>
            <select
              value={alcoholData.auditC.frequency}
              onChange={(e) => handleAuditCChange('frequency', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={0}>{t('medical:form.habits.alcoholAssessment.auditC.frequencyOptions.never')}</option>
              <option value={1}>{t('medical:form.habits.alcoholAssessment.auditC.frequencyOptions.monthly')}</option>
              <option value={2}>{t('medical:form.habits.alcoholAssessment.auditC.frequencyOptions.monthly2_4')}</option>
              <option value={3}>{t('medical:form.habits.alcoholAssessment.auditC.frequencyOptions.weekly2_3')}</option>
              <option value={4}>{t('medical:form.habits.alcoholAssessment.auditC.frequencyOptions.weekly4plus')}</option>
            </select>
          </div>

          {/* Question 2: Quantity - only show if frequency > 0 */}
          {showFullQuestionnaire && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('medical:form.habits.alcoholAssessment.auditC.quantity')}
              </label>
              <select
                value={alcoholData.auditC.quantity}
                onChange={(e) => handleAuditCChange('quantity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={0}>{t('medical:form.habits.alcoholAssessment.auditC.quantityOptions.drinks1_2')}</option>
                <option value={1}>{t('medical:form.habits.alcoholAssessment.auditC.quantityOptions.drinks3_4')}</option>
                <option value={2}>{t('medical:form.habits.alcoholAssessment.auditC.quantityOptions.drinks5_6')}</option>
                <option value={3}>{t('medical:form.habits.alcoholAssessment.auditC.quantityOptions.drinks7_9')}</option>
                <option value={4}>{t('medical:form.habits.alcoholAssessment.auditC.quantityOptions.drinks10plus')}</option>
              </select>
            </div>
          )}

          {/* Question 3: Binge drinking - only show if frequency > 0 */}
          {showFullQuestionnaire && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('medical:form.habits.alcoholAssessment.auditC.binge')}
              </label>
              <select
                value={alcoholData.auditC.binge}
                onChange={(e) => handleAuditCChange('binge', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={0}>{t('medical:form.habits.alcoholAssessment.auditC.bingeOptions.never')}</option>
                <option value={1}>{t('medical:form.habits.alcoholAssessment.auditC.bingeOptions.lessMonthly')}</option>
                <option value={2}>{t('medical:form.habits.alcoholAssessment.auditC.bingeOptions.monthly')}</option>
                <option value={3}>{t('medical:form.habits.alcoholAssessment.auditC.bingeOptions.weekly')}</option>
                <option value={4}>{t('medical:form.habits.alcoholAssessment.auditC.bingeOptions.daily')}</option>
              </select>
            </div>
          )}

          {/* Standard drink info - only show if frequency > 0 */}
          {showFullQuestionnaire && (
            <p className="text-xs text-blue-600 italic">
              {t('medical:form.habits.alcoholAssessment.standardDrink')}
            </p>
          )}
        </div>
      )}

      {/* Optional: Manual drinks per week override - only show if frequency > 0 */}
      {showAssessment && showFullQuestionnaire && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('medical:form.habits.alcoholAssessment.drinksPerWeek')}
              <span className="text-xs text-gray-500 ml-1">
                ({t('common:optional')})
              </span>
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={alcoholData.drinksPerWeek || ''}
              onChange={(e) => handleChange('drinksPerWeek', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder={t('medical:form.habits.alcoholAssessment.placeholders.drinksPerWeek')}
            />
          </div>
        </div>
      )}

      {/* Calculated Results - only show if frequency > 0 */}
      {showAssessment && showFullQuestionnaire && calculatedData.auditCScore > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          {/* Score and risk level */}
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <span className="text-sm text-gray-600">
                {t('medical:form.habits.alcoholAssessment.auditC.score')}:
              </span>
              <span className="ml-2 font-semibold text-gray-900">
                {calculatedData.auditCScore}/12
              </span>
            </div>

            {calculatedData.estimatedDrinks > 0 && (
              <div>
                <span className="text-sm text-gray-600">
                  {t('medical:form.habits.alcoholAssessment.drinksPerWeek')}:
                </span>
                <span className="ml-2 font-semibold text-gray-900">
                  ~{calculatedData.drinksPerWeek}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {t('medical:form.habits.alcoholAssessment.riskLevel')}:
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRiskLevelColor(calculatedData.riskLevel)}`}>
                {t(`medical:form.habits.alcoholAssessment.riskLevels.${calculatedData.riskLevel}`)}
              </span>
            </div>
          </div>

          {/* Thresholds reminder */}
          <p className="text-xs text-gray-500">
            {t('medical:form.habits.alcoholAssessment.thresholds.recommended')}
          </p>

          {/* Health Alerts */}
          {calculatedData.healthAlerts.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">
                {t('medical:form.habits.alcoholAssessment.healthAlerts')}:
              </span>
              <div className="space-y-2">
                {calculatedData.healthAlerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getAlertSeverityColor(alert.severity)}`}
                  >
                    <AlertIcon type={alert.type} />
                    <span className="text-sm">
                      {t(`medical:form.habits.alcoholAssessment.alerts.${alert.key}`)}
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
              {t('medical:form.habits.alcoholAssessment.disclaimer')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Export utility functions for use elsewhere and testing
export {
  calculateAuditCScore,
  estimateDrinksPerWeek,
  getRiskLevel,
  generateHealthAlerts
};

export default AlcoholAssessment;
