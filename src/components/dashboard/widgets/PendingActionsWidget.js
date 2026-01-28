/**
 * PendingActionsWidget - Dashboard widget showing pending appointment actions
 * Displays actions requiring validation and alerts for missing consent associations
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bell, Mail, MessageCircle, FileText, ClipboardCheck, Receipt,
  Clock, AlertTriangle, ChevronRight, Loader2, ThumbsUp, Play,
  RefreshCw, User, Calendar
} from 'lucide-react';
import appointmentActionsApi from '../../../api/appointmentActionsApi';
import treatmentConsentsApi from '../../../api/treatmentConsentsApi';

// Action type icons
const ACTION_ICONS = {
  confirmation_email: Mail,
  whatsapp_reminder: MessageCircle,
  send_quote: FileText,
  send_consent: ClipboardCheck,
  prepare_invoice: Receipt
};

/**
 * Action item in the pending list
 */
const PendingActionItem = ({ action, onValidate, onNavigate, loading, t }) => {
  const ActionIcon = ACTION_ICONS[action.actionType] || Bell;
  const appointment = action.appointment;

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Icon */}
        <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
          <ActionIcon className="w-4 h-4 text-amber-600" />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="font-medium text-gray-900 text-sm truncate">
            {t(`actionTypes.${action.actionType}`)}
          </div>
          {appointment && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <User className="w-3 h-3" />
              <span className="truncate">
                {appointment.patient?.firstName} {appointment.patient?.lastName}
              </span>
              <span>-</span>
              <Calendar className="w-3 h-3" />
              <span>{appointment.date} {appointment.startTime}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onValidate(action); }}
          disabled={loading}
          className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded transition-colors"
          title={t('actions.validate')}
        >
          <ThumbsUp className="w-4 h-4" />
        </button>
        <button
          onClick={() => onNavigate(action)}
          className="p-1.5 text-gray-500 hover:bg-gray-200 rounded transition-colors"
          title={t('actions.viewDetails')}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

/**
 * Alert item for missing consent associations
 */
const MissingConsentAlert = ({ treatment, onNavigate, t }) => {
  return (
    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
          <AlertTriangle className="w-4 h-4 text-red-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-red-800 text-sm truncate">
            {t('alerts.missingConsent')}
          </div>
          <div className="text-xs text-red-600 truncate">
            {treatment.name}
          </div>
        </div>
      </div>
      <button
        onClick={() => onNavigate(treatment)}
        className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
        title={t('alerts.configure')}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

/**
 * Main PendingActionsWidget component
 */
const PendingActionsWidget = ({ onNavigateToAppointment, onNavigateToCatalog, maxItems = 5 }) => {
  const { t } = useTranslation('planning');
  const [pendingActions, setPendingActions] = useState([]);
  const [missingConsents, setMissingConsents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [actionsRes, summaryRes, consentsRes] = await Promise.all([
        appointmentActionsApi.getPendingActions(),
        appointmentActionsApi.getActionsSummary(),
        treatmentConsentsApi.getTreatmentsWithoutConsents()
      ]);

      if (actionsRes.success) {
        setPendingActions(actionsRes.data || []);
      }

      if (summaryRes.success) {
        setSummary(summaryRes.data);
      }

      if (consentsRes.success) {
        setMissingConsents(consentsRes.data?.treatments || []);
      }
    } catch (err) {
      console.error('Error loading pending actions:', err);
      setError(t('messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
    // Refresh every 2 minutes
    const interval = setInterval(loadData, 120000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Handle validate action
  const handleValidate = async (action) => {
    setActionLoading(true);
    try {
      const response = await appointmentActionsApi.validateAction(
        action.appointmentId,
        action.id
      );
      if (response.success) {
        loadData();
      }
    } catch (err) {
      console.error('Error validating action:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle navigate to appointment
  const handleNavigateToAppointment = (action) => {
    if (onNavigateToAppointment) {
      onNavigateToAppointment(action.appointmentId);
    }
  };

  // Handle navigate to catalog for consent config
  const handleNavigateToCatalog = (treatment) => {
    if (onNavigateToCatalog) {
      onNavigateToCatalog(treatment.id);
    }
  };

  // Calculate total alerts
  const totalAlerts = pendingActions.length + missingConsents.length;
  const visibleActions = pendingActions.slice(0, maxItems);
  const visibleMissingConsents = missingConsents.slice(0, Math.max(0, maxItems - visibleActions.length));

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          <span className="ml-2 text-gray-500">{t('messages.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Bell className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{t('widget.pendingActions')}</h3>
            <p className="text-xs text-gray-500">
              {t('widget.actionsNeedingAttention')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Alert badge */}
          {totalAlerts > 0 && (
            <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded-full">
              {totalAlerts}
            </span>
          )}

          {/* Refresh button */}
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            title={t('widget.refresh')}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {error ? (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        ) : totalAlerts === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-gray-500 text-sm">{t('widget.noActionsRequired')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Pending actions */}
            {visibleActions.map(action => (
              <PendingActionItem
                key={action.id}
                action={action}
                onValidate={handleValidate}
                onNavigate={handleNavigateToAppointment}
                loading={actionLoading}
                t={t}
              />
            ))}

            {/* Missing consent alerts */}
            {visibleMissingConsents.map(treatment => (
              <MissingConsentAlert
                key={treatment.id}
                treatment={treatment}
                onNavigate={handleNavigateToCatalog}
                t={t}
              />
            ))}

            {/* Show more indicator */}
            {(pendingActions.length > maxItems || missingConsents.length > (maxItems - visibleActions.length)) && (
              <div className="text-center pt-2">
                <span className="text-xs text-gray-500">
                  {t('widget.andMore', { count: totalAlerts - maxItems })}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary footer */}
      {summary && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <span className="text-gray-500">
                <Clock className="w-3.5 h-3.5 inline mr-1" />
                {t('widget.scheduled')}: {summary.scheduled || 0}
              </span>
              <span className="text-green-600">
                <Play className="w-3.5 h-3.5 inline mr-1" />
                {t('widget.completed')}: {summary.completed || 0}
              </span>
              {summary.failed > 0 && (
                <span className="text-red-600">
                  <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                  {t('widget.failed')}: {summary.failed}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingActionsWidget;
