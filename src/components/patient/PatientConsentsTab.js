/**
 * PatientConsentsTab - Display patient consents and signing requests
 *
 * Features:
 * - List of signed consents
 * - Pending signing requests with status
 * - Send new consent request button
 * - Cancel/remind pending requests
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Send,
  RefreshCw,
  Trash2,
  Mail,
  Tablet,
  Link,
  Eye,
  Loader,
  AlertCircle,
  Plus,
  Bell
} from 'lucide-react';
import { baseClient } from '../../api/baseClient';
import { consentSigningApi } from '../../api/consentSigningApi';
import SendConsentRequestModal from '../modals/SendConsentRequestModal';
import { useLocale } from '../../contexts/LocaleContext';

const PatientConsentsTab = ({ patient }) => {
  const { t } = useTranslation(['common', 'admin', 'patients']);
  const { locale } = useLocale();

  // Data state
  const [consents, setConsents] = useState([]);
  const [signingRequests, setSigningRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [showSendModal, setShowSendModal] = useState(false);

  // Action state
  const [actionLoading, setActionLoading] = useState(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!patient?.id) return;

    try {
      setLoading(true);
      setError('');

      // Fetch consents and signing requests in parallel
      const [consentsRes, requestsRes] = await Promise.all([
        baseClient.get(`/consents/patient/${patient.id}`),
        consentSigningApi.getPatientRequests(patient.id)
      ]);

      setConsents(consentsRes.data?.data || []);
      setSigningRequests(requestsRes.data || []);
    } catch (err) {
      console.error('Error fetching patient consents:', err);
      setError(t('common:errors.loadError'));
    } finally {
      setLoading(false);
    }
  }, [patient?.id, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Cancel signing request
  const handleCancelRequest = async (requestId) => {
    if (!window.confirm(t('admin:consents.confirmCancel'))) return;

    try {
      setActionLoading(requestId);
      await consentSigningApi.cancelRequest(requestId);
      await fetchData();
    } catch (err) {
      console.error('Error cancelling request:', err);
      alert(t('common:errors.updateError'));
    } finally {
      setActionLoading(null);
    }
  };

  // Send reminder
  const handleSendReminder = async (requestId) => {
    try {
      setActionLoading(requestId);
      await consentSigningApi.sendReminder(requestId);
      alert(t('admin:consents.reminderSent'));
      await fetchData();
    } catch (err) {
      console.error('Error sending reminder:', err);
      alert(err.response?.data?.error?.message || t('common:errors.updateError'));
    } finally {
      setActionLoading(null);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const configs = {
      accepted: { icon: CheckCircle, color: 'bg-green-100 text-green-700', label: t('admin:consents.status.accepted') },
      pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-700', label: t('admin:consents.status.pending') },
      rejected: { icon: XCircle, color: 'bg-red-100 text-red-700', label: t('admin:consents.status.rejected') },
      signed: { icon: CheckCircle, color: 'bg-green-100 text-green-700', label: t('admin:consents.status.signed') },
      expired: { icon: Clock, color: 'bg-gray-100 text-gray-700', label: t('admin:consents.status.expired') },
      cancelled: { icon: XCircle, color: 'bg-gray-100 text-gray-500', label: t('admin:consents.status.cancelled') }
    };

    const config = configs[status] || configs.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  // Get delivery method icon
  const getDeliveryIcon = (method) => {
    const icons = {
      email: Mail,
      tablet: Tablet,
      link: Link,
      sms: Mail
    };
    const Icon = icons[method] || Mail;
    return <Icon className="w-4 h-4 text-gray-400" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          {t('admin:consents.patientConsents')}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            title={t('common:actions.refresh')}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSendModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            {t('admin:consents.sendRequest')}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Pending signing requests */}
      {signingRequests.filter(r => r.status === 'pending').length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-800 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {t('admin:consents.pendingRequests')} ({signingRequests.filter(r => r.status === 'pending').length})
          </h4>
          <div className="space-y-2">
            {signingRequests.filter(r => r.status === 'pending').map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-lg p-3 border border-yellow-200 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {getDeliveryIcon(request.sent_via)}
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {request.template?.title || t('admin:consents.consentDocument')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t('admin:consents.sentOn')} {formatDate(request.sent_at || request.created_at)}
                      {request.recipient_email && ` - ${request.recipient_email}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(request.status)}
                  <button
                    onClick={() => handleSendReminder(request.id)}
                    disabled={actionLoading === request.id}
                    className="p-1.5 text-yellow-600 hover:bg-yellow-100 rounded"
                    title={t('admin:consents.sendReminder')}
                  >
                    {actionLoading === request.id ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Bell className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleCancelRequest(request.id)}
                    disabled={actionLoading === request.id}
                    className="p-1.5 text-red-600 hover:bg-red-100 rounded"
                    title={t('admin:consents.cancel')}
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Signed consents */}
      <div>
        <h4 className="font-medium text-gray-700 mb-3">
          {t('admin:consents.signedConsents')} ({consents.filter(c => c.status === 'accepted').length})
        </h4>

        {consents.filter(c => c.status === 'accepted').length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{t('admin:consents.noSignedConsents')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {consents.filter(c => c.status === 'accepted').map((consent) => (
              <div
                key={consent.id}
                className="bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900">{consent.title}</h5>
                      <p className="text-sm text-gray-500 mt-1">
                        {consent.consent_type && (
                          <span className="bg-gray-100 px-2 py-0.5 rounded text-xs mr-2">
                            {t(`admin:consents.types.${consent.consent_type}`)}
                          </span>
                        )}
                        {t('admin:consents.signedOn')} {formatDate(consent.signed_at)}
                      </p>
                      {consent.template_version && (
                        <p className="text-xs text-gray-400 mt-1">
                          Version: {consent.template_version} | {consent.language_code?.toUpperCase()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {consent.signature_image && (
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                        {t('admin:consents.digitalSignature')}
                      </span>
                    )}
                    <button
                      className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
                      title={t('common:actions.view')}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Request history */}
      {signingRequests.filter(r => r.status !== 'pending').length > 0 && (
        <div>
          <h4 className="font-medium text-gray-700 mb-3">
            {t('admin:consents.requestHistory')} ({signingRequests.filter(r => r.status !== 'pending').length})
          </h4>
          <div className="space-y-2">
            {signingRequests.filter(r => r.status !== 'pending').map((request) => (
              <div
                key={request.id}
                className="bg-gray-50 rounded-lg p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {getDeliveryIcon(request.sent_via)}
                  <div>
                    <p className="text-sm text-gray-700">
                      {request.template?.title || t('admin:consents.consentDocument')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(request.created_at)}
                    </p>
                  </div>
                </div>
                {getStatusBadge(request.status)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Send consent modal */}
      <SendConsentRequestModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        patient={patient}
        onSuccess={() => {
          setShowSendModal(false);
          fetchData();
        }}
      />
    </div>
  );
};

export default PatientConsentsTab;
