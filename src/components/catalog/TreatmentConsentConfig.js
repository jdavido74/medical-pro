/**
 * TreatmentConsentConfig - Component for configuring consent templates for a treatment
 * Allows associating/disassociating consent templates with a treatment (service)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ClipboardCheck, Plus, Trash2, AlertTriangle, Check, X,
  Loader2, Search, ChevronDown, ChevronRight, Info
} from 'lucide-react';
import treatmentConsentsApi from '../../api/treatmentConsentsApi';

/**
 * Single consent template item in the list
 */
const ConsentTemplateItem = ({ template, isAssociated, isRequired, onToggle, onRemove, loading }) => {
  const { t } = useTranslation('catalog');

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
      isAssociated
        ? 'bg-purple-50 border-purple-200'
        : 'bg-gray-50 border-gray-200 hover:border-purple-200'
    }`}>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Checkbox/toggle */}
        <button
          onClick={() => onToggle(template)}
          disabled={loading}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            isAssociated
              ? 'bg-purple-600 border-purple-600 text-white'
              : 'border-gray-300 hover:border-purple-400'
          }`}
        >
          {isAssociated && <Check className="w-3 h-3" />}
        </button>

        {/* Template info */}
        <div className="min-w-0 flex-1">
          <div className="font-medium text-gray-900 text-sm truncate">
            {template.title}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="px-1.5 py-0.5 bg-gray-200 rounded">
              {template.code}
            </span>
            <span className="capitalize">{template.consentType}</span>
            {template.version && (
              <span>v{template.version}</span>
            )}
          </div>
        </div>
      </div>

      {/* Required badge and remove button */}
      {isAssociated && (
        <div className="flex items-center gap-2">
          {isRequired && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
              {t('consents.required')}
            </span>
          )}
          <button
            onClick={() => onRemove(template)}
            disabled={loading}
            className="p-1 text-red-500 hover:bg-red-100 rounded transition-colors"
            title={t('consents.remove')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Main TreatmentConsentConfig component
 */
const TreatmentConsentConfig = ({ treatmentId, treatmentName, onUpdate, readOnly = false }) => {
  const { t } = useTranslation('catalog');
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [associatedTemplates, setAssociatedTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAvailable, setShowAvailable] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    if (!treatmentId) return;

    setLoading(true);
    setError(null);

    try {
      const [templatesRes, associationsRes] = await Promise.all([
        treatmentConsentsApi.getAvailableTemplates({ treatmentId }),
        treatmentConsentsApi.getConsentsByTreatment(treatmentId)
      ]);

      if (templatesRes.success) {
        setAvailableTemplates(templatesRes.data || []);
      }

      if (associationsRes.success) {
        setAssociatedTemplates(associationsRes.data?.consentTemplates || []);
      }
    } catch (err) {
      console.error('Error loading consent templates:', err);
      setError(t('messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [treatmentId, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle toggle association
  const handleToggle = async (template) => {
    if (readOnly || actionLoading) return;

    setActionLoading(true);
    try {
      const isCurrentlyAssociated = template.isAssociated ||
        associatedTemplates.some(at => at.consentTemplate?.id === template.id || at.id === template.id);

      if (isCurrentlyAssociated) {
        // Remove association
        await treatmentConsentsApi.deleteByTreatmentAndTemplate(treatmentId, template.id);
      } else {
        // Create association
        await treatmentConsentsApi.createAssociation({
          treatmentId,
          consentTemplateId: template.id,
          isRequired: true
        });
      }

      await loadData();
      onUpdate?.();
    } catch (err) {
      console.error('Error toggling association:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle remove association
  const handleRemove = async (template) => {
    if (readOnly || actionLoading) return;

    setActionLoading(true);
    try {
      const templateId = template.consentTemplate?.id || template.id;
      await treatmentConsentsApi.deleteByTreatmentAndTemplate(treatmentId, templateId);
      await loadData();
      onUpdate?.();
    } catch (err) {
      console.error('Error removing association:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter templates by search
  const filteredTemplates = availableTemplates.filter(t => {
    const query = searchQuery.toLowerCase();
    return t.title?.toLowerCase().includes(query) ||
           t.code?.toLowerCase().includes(query) ||
           t.consentType?.toLowerCase().includes(query);
  });

  // Get associated template IDs for quick lookup
  const associatedIds = new Set(
    associatedTemplates.map(at => at.consentTemplate?.id || at.consentTemplateId)
  );

  // Separate templates into associated and non-associated
  const associatedList = filteredTemplates.filter(t => t.isAssociated || associatedIds.has(t.id));
  const nonAssociatedList = filteredTemplates.filter(t => !t.isAssociated && !associatedIds.has(t.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        <span className="ml-2 text-sm text-gray-500">{t('messages.loading')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-purple-600" />
          <h4 className="font-medium text-gray-900">{t('consents.title')}</h4>
          {associatedList.length > 0 && (
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
              {associatedList.length}
            </span>
          )}
        </div>
      </div>

      {/* Info text */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p>{t('consents.infoText')}</p>
      </div>

      {/* Associated templates */}
      {associatedList.length > 0 ? (
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-gray-700">{t('consents.associated')}</h5>
          {associatedList.map(template => (
            <ConsentTemplateItem
              key={template.id}
              template={template}
              isAssociated={true}
              isRequired={template.isRequired !== false}
              onToggle={handleToggle}
              onRemove={handleRemove}
              loading={actionLoading}
            />
          ))}
        </div>
      ) : (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium text-sm">{t('consents.noAssociations')}</span>
          </div>
          <p className="mt-1 text-xs text-amber-600">
            {t('consents.noAssociationsHint')}
          </p>
        </div>
      )}

      {/* Add more templates section */}
      {!readOnly && nonAssociatedList.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Toggle header */}
          <button
            onClick={() => setShowAvailable(!showAvailable)}
            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                {t('consents.addMore')}
              </span>
              <span className="text-xs text-gray-500">
                ({nonAssociatedList.length} {t('consents.available')})
              </span>
            </div>
            {showAvailable ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {/* Available templates list */}
          {showAvailable && (
            <div className="p-3 border-t border-gray-200 space-y-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('consents.searchPlaceholder')}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Templates list */}
              <div className="max-h-48 overflow-y-auto space-y-2">
                {nonAssociatedList.map(template => (
                  <ConsentTemplateItem
                    key={template.id}
                    template={template}
                    isAssociated={false}
                    isRequired={false}
                    onToggle={handleToggle}
                    onRemove={() => {}}
                    loading={actionLoading}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state for available templates */}
      {!readOnly && availableTemplates.length === 0 && (
        <div className="text-center py-4 text-sm text-gray-500">
          <ClipboardCheck className="w-6 h-6 mx-auto mb-2 text-gray-400" />
          <p>{t('consents.noTemplatesAvailable')}</p>
        </div>
      )}
    </div>
  );
};

export default TreatmentConsentConfig;
