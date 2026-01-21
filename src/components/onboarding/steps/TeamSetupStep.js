/**
 * TeamSetupStep - Step 2 of onboarding
 *
 * Allows admin to create their first team:
 * - Team name
 * - Description
 * - Department/Service
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { baseClient } from '../../../api/baseClient';
import { Users, FileText, Building2, ArrowRight, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { DEPARTMENT_KEYS } from '../../../utils/medicalConstants';

const TeamSetupStep = ({ onComplete, onBack, canGoBack, isLastStep, isCompleting }) => {
  const { t } = useTranslation(['onboarding', 'admin']);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    department: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError(t('onboarding.steps.team.errors.nameRequired'));
      return;
    }

    if (!formData.department) {
      setError(t('onboarding.steps.team.errors.departmentRequired'));
      return;
    }

    try {
      setIsLoading(true);

      // Create team via API
      await baseClient.post('/teams', {
        name: formData.name,
        description: formData.description,
        department: formData.department,
        is_active: true
      });

      setSuccess(true);

      // Short delay to show success before moving on
      setTimeout(() => {
        onComplete(formData);
      }, 500);
    } catch (error) {
      console.error('[TeamSetupStep] Failed to save:', error);
      setError(error.message || t('onboarding.steps.team.errors.saveFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Intro text */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <p className="text-blue-800 text-sm">
          {t('onboarding.steps.team.intro')}
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          {t('onboarding.steps.team.success')}
        </div>
      )}

      {/* Team Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Users className="h-4 w-4 inline mr-2" />
          {t('onboarding.steps.team.fields.name')} *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={t('onboarding.steps.team.placeholders.name')}
          required
          disabled={isLoading || success}
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <FileText className="h-4 w-4 inline mr-2" />
          {t('onboarding.steps.team.fields.description')}
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={t('onboarding.steps.team.placeholders.description')}
          rows={3}
          disabled={isLoading || success}
        />
      </div>

      {/* Department */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Building2 className="h-4 w-4 inline mr-2" />
          {t('onboarding.steps.team.fields.department')} *
        </label>
        <select
          value={formData.department}
          onChange={(e) => handleChange('department', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
          disabled={isLoading || success}
        >
          <option value="">{t('onboarding.steps.team.placeholders.department')}</option>
          {DEPARTMENT_KEYS.map(dept => (
            <option key={dept} value={dept}>
              {t(`admin:departments.${dept}`, dept)}
            </option>
          ))}
        </select>
      </div>

      {/* Buttons */}
      <div className="flex justify-between pt-6 border-t">
        {canGoBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center space-x-2 px-6 py-2 text-gray-600 hover:text-gray-900"
            disabled={isLoading}
          >
            <ArrowLeft className="h-5 w-5" />
            <span>{t('onboarding.buttons.back')}</span>
          </button>
        ) : (
          <div />
        )}

        <button
          type="submit"
          disabled={isLoading || isCompleting || success}
          className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <span>{isLastStep ? t('onboarding.buttons.finish') : t('onboarding.buttons.next')}</span>
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default TeamSetupStep;
