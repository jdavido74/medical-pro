/**
 * AppointmentActionsPanel - Displays and manages automated actions for an appointment
 * Shows pending, scheduled, completed, and failed actions with validation/execution controls
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Mail, MessageCircle, FileText, ClipboardCheck, Receipt,
  Clock, CheckCircle2, XCircle, AlertTriangle, Play, RotateCcw,
  ChevronDown, ChevronRight, Loader2, Eye, ThumbsUp
} from 'lucide-react';
import appointmentActionsApi from '../../api/appointmentActionsApi';

// Action type configuration
const ACTION_TYPE_CONFIG = {
  confirmation_email: {
    icon: Mail,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    labelKey: 'actionTypes.confirmation_email'
  },
  whatsapp_reminder: {
    icon: MessageCircle,
    color: 'text-green-600',
    bg: 'bg-green-100',
    labelKey: 'actionTypes.whatsapp_reminder'
  },
  send_quote: {
    icon: FileText,
    color: 'text-amber-600',
    bg: 'bg-amber-100',
    labelKey: 'actionTypes.send_quote'
  },
  send_consent: {
    icon: ClipboardCheck,
    color: 'text-purple-600',
    bg: 'bg-purple-100',
    labelKey: 'actionTypes.send_consent'
  },
  prepare_invoice: {
    icon: Receipt,
    color: 'text-teal-600',
    bg: 'bg-teal-100',
    labelKey: 'actionTypes.prepare_invoice'
  }
};

// Action status configuration
const ACTION_STATUS_CONFIG = {
  pending: {
    icon: Clock,
    color: 'text-yellow-600',
    bg: 'bg-yellow-100',
    labelKey: 'actionStatus.pending'
  },
  scheduled: {
    icon: Clock,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    labelKey: 'actionStatus.scheduled'
  },
  validated: {
    icon: ThumbsUp,
    color: 'text-indigo-600',
    bg: 'bg-indigo-100',
    labelKey: 'actionStatus.validated'
  },
  in_progress: {
    icon: Loader2,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    labelKey: 'actionStatus.in_progress'
  },
  completed: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bg: 'bg-green-100',
    labelKey: 'actionStatus.completed'
  },
  failed: {
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-100',
    labelKey: 'actionStatus.failed'
  },
  cancelled: {
    icon: XCircle,
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    labelKey: 'actionStatus.cancelled'
  }
};

/**
 * Single action item component
 */
const ActionItem = ({ action, onValidate, onExecute, onRetry, onCancel, loading, t }) => {
  const [expanded, setExpanded] = useState(false);
  const typeConfig = ACTION_TYPE_CONFIG[action.actionType] || ACTION_TYPE_CONFIG.confirmation_email;
  const statusConfig = ACTION_STATUS_CONFIG[action.status] || ACTION_STATUS_CONFIG.pending;
  const TypeIcon = typeConfig.icon;
  const StatusIcon = statusConfig.icon;

  const showValidateBtn = action.requiresValidation && action.status === 'pending';
  const showExecuteBtn = action.status === 'validated' || (action.status === 'pending' && !action.requiresValidation);
  const showRetryBtn = action.status === 'failed' && action.retryCount < action.maxRetries;
  const showCancelBtn = ['pending', 'scheduled', 'validated'].includes(action.status);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {/* Action type icon */}
          <div className={`p-2 rounded-lg ${typeConfig.bg}`}>
            <TypeIcon className={`w-4 h-4 ${typeConfig.color}`} />
          </div>

          {/* Action info */}
          <div>
            <div className="font-medium text-gray-900 text-sm">
              {t(typeConfig.labelKey)}
            </div>
            <div className="text-xs text-gray-500">
              {action.scheduledAt
                ? t('actions.scheduledFor', { date: formatDate(action.scheduledAt) })
                : t('actions.createdAt', { date: formatDate(action.createdAt) })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status badge */}
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${statusConfig.bg}`}>
            <StatusIcon className={`w-3 h-3 ${statusConfig.color} ${action.status === 'in_progress' ? 'animate-spin' : ''}`} />
            <span className={`text-xs font-medium ${statusConfig.color}`}>
              {t(statusConfig.labelKey)}
            </span>
          </div>

          {/* Validation badge */}
          {action.requiresValidation && action.status === 'pending' && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100">
              <AlertTriangle className="w-3 h-3 text-orange-600" />
              <span className="text-xs font-medium text-orange-600">
                {t('actions.needsValidation')}
              </span>
            </div>
          )}

          {/* Expand/collapse */}
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="p-3 border-t border-gray-200 bg-white">
          {/* Details grid */}
          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
            <div>
              <span className="text-gray-500">{t('actions.triggerType')}:</span>
              <span className="ml-1 text-gray-900">{t(`triggerTypes.${action.triggerType}`)}</span>
            </div>
            {action.executedAt && (
              <div>
                <span className="text-gray-500">{t('actions.executedAt')}:</span>
                <span className="ml-1 text-gray-900">{formatDate(action.executedAt)}</span>
              </div>
            )}
            {action.validatedAt && (
              <div>
                <span className="text-gray-500">{t('actions.validatedAt')}:</span>
                <span className="ml-1 text-gray-900">{formatDate(action.validatedAt)}</span>
              </div>
            )}
            {action.retryCount > 0 && (
              <div>
                <span className="text-gray-500">{t('actions.retries')}:</span>
                <span className="ml-1 text-gray-900">{action.retryCount}/{action.maxRetries}</span>
              </div>
            )}
          </div>

          {/* Error message */}
          {action.lastError && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              <strong>{t('actions.error')}:</strong> {action.lastError}
            </div>
          )}

          {/* Result data */}
          {action.resultData && Object.keys(action.resultData).length > 0 && (
            <div className="mb-3 p-2 bg-gray-50 border border-gray-200 rounded text-sm">
              <strong className="text-gray-700">{t('actions.result')}:</strong>
              <pre className="mt-1 text-xs text-gray-600 overflow-x-auto">
                {JSON.stringify(action.resultData, null, 2)}
              </pre>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {showValidateBtn && (
              <button
                onClick={(e) => { e.stopPropagation(); onValidate(action.id); }}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                {t('actions.validate')}
              </button>
            )}

            {showExecuteBtn && (
              <button
                onClick={(e) => { e.stopPropagation(); onExecute(action.id); }}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                {t('actions.execute')}
              </button>
            )}

            {showRetryBtn && (
              <button
                onClick={(e) => { e.stopPropagation(); onRetry(action.id); }}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t('actions.retry')}
              </button>
            )}

            {showCancelBtn && (
              <button
                onClick={(e) => { e.stopPropagation(); onCancel(action.id); }}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                {t('actions.cancel')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Main AppointmentActionsPanel component
 */
const AppointmentActionsPanel = ({ appointmentId, onActionCompleted, compact = false }) => {
  const { t } = useTranslation('planning');
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);

  // Load actions
  const loadActions = useCallback(async () => {
    if (!appointmentId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await appointmentActionsApi.getActions(appointmentId);
      if (response.success) {
        setActions(response.data || []);
      } else {
        setError(response.error);
      }
    } catch (err) {
      console.error('Error loading actions:', err);
      setError(t('messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [appointmentId, t]);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

  // Handle validate action
  const handleValidate = async (actionId) => {
    setActionLoading(true);
    try {
      const response = await appointmentActionsApi.validateAction(appointmentId, actionId);
      if (response.success) {
        await loadActions();
        onActionCompleted?.('validated');
      }
    } catch (err) {
      console.error('Error validating action:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle execute action
  const handleExecute = async (actionId) => {
    setActionLoading(true);
    try {
      const response = await appointmentActionsApi.executeAction(appointmentId, actionId);
      if (response.success) {
        await loadActions();
        onActionCompleted?.('executed');
      }
    } catch (err) {
      console.error('Error executing action:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle retry action
  const handleRetry = async (actionId) => {
    setActionLoading(true);
    try {
      const response = await appointmentActionsApi.retryAction(appointmentId, actionId);
      if (response.success) {
        await loadActions();
        onActionCompleted?.('retried');
      }
    } catch (err) {
      console.error('Error retrying action:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle cancel action
  const handleCancel = async (actionId) => {
    setActionLoading(true);
    try {
      const response = await appointmentActionsApi.cancelAction(appointmentId, actionId);
      if (response.success) {
        await loadActions();
        onActionCompleted?.('cancelled');
      }
    } catch (err) {
      console.error('Error cancelling action:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Group actions by status
  const groupedActions = {
    pending: actions.filter(a => ['pending', 'scheduled', 'validated'].includes(a.status)),
    completed: actions.filter(a => a.status === 'completed'),
    failed: actions.filter(a => a.status === 'failed'),
    cancelled: actions.filter(a => a.status === 'cancelled')
  };

  // Determine which actions to show
  const visibleActions = showAll ? actions : groupedActions.pending.concat(groupedActions.failed);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
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

  if (actions.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-gray-500">
        <Clock className="w-6 h-6 mx-auto mb-2 text-gray-400" />
        {t('actions.noActions')}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-gray-900">{t('actions.title')}</h4>
          {groupedActions.pending.length > 0 && (
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
              {groupedActions.pending.length} {t('actions.pending')}
            </span>
          )}
          {groupedActions.failed.length > 0 && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
              {groupedActions.failed.length} {t('actions.failed')}
            </span>
          )}
        </div>

        {/* Toggle show all */}
        {(groupedActions.completed.length > 0 || groupedActions.cancelled.length > 0) && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <Eye className="w-3.5 h-3.5" />
            {showAll ? t('actions.showPending') : t('actions.showAll', { count: actions.length })}
          </button>
        )}
      </div>

      {/* Actions list */}
      <div className="space-y-2">
        {visibleActions.map(action => (
          <ActionItem
            key={action.id}
            action={action}
            onValidate={handleValidate}
            onExecute={handleExecute}
            onRetry={handleRetry}
            onCancel={handleCancel}
            loading={actionLoading}
            t={t}
          />
        ))}
      </div>

      {/* Summary when collapsed */}
      {!showAll && groupedActions.completed.length > 0 && (
        <div className="text-center text-xs text-gray-500">
          {t('actions.completedCount', { count: groupedActions.completed.length })}
        </div>
      )}
    </div>
  );
};

export default AppointmentActionsPanel;
