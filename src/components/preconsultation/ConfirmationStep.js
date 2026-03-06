/**
 * ConfirmationStep — Appointment confirmation, modification, or cancellation
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar, Clock, User, CheckCircle, XCircle,
  Edit3, Loader, AlertTriangle, FileText
} from 'lucide-react';
import {
  confirmAppointment, cancelAppointment, requestModification
} from '../../api/preconsultationApi';

export default function ConfirmationStep({ token, appointment, documentCount, status, onStatusChange }) {
  const { t } = useTranslation('preconsultation');

  const [loading, setLoading] = useState(null); // 'confirm' | 'cancel' | 'modify' | null
  const [result, setResult] = useState(null); // 'confirmed' | 'cancelled' | 'modification_requested'
  const [error, setError] = useState(null);

  const handleConfirm = async () => {
    try {
      setLoading('confirm');
      setError(null);
      await confirmAppointment(token);
      setResult('confirmed');
      onStatusChange('confirmed');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm(t('confirmation.cancelConfirm'))) return;

    try {
      setLoading('cancel');
      setError(null);
      await cancelAppointment(token);
      setResult('cancelled');
      onStatusChange('cancelled');
    } catch (err) {
      if (err.message?.includes('24 hours')) {
        setError(t('confirmation.cancel24h'));
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(null);
    }
  };

  const handleRequestModification = async () => {
    try {
      setLoading('modify');
      setError(null);
      await requestModification(token);
      setResult('modification_requested');
      onStatusChange('modification_requested');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  // ─── Result screen ────────────────────────────────────────
  if (result) {
    const config = {
      confirmed: {
        icon: CheckCircle,
        color: 'text-green-600',
        bg: 'bg-green-50',
        title: t('confirmation.confirmed'),
        message: t('page.completedMessage')
      },
      cancelled: {
        icon: XCircle,
        color: 'text-red-600',
        bg: 'bg-red-50',
        title: t('confirmation.cancelled'),
        message: t('page.expiredMessage')
      },
      modification_requested: {
        icon: Edit3,
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        title: t('confirmation.modificationRequested'),
        message: t('confirmation.modificationInfo')
      }
    }[result];

    const ResultIcon = config.icon;

    return (
      <div className={`${config.bg} rounded-2xl p-8 text-center`}>
        <ResultIcon className={`w-16 h-16 ${config.color} mx-auto mb-4`} />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{config.title}</h2>
        <p className="text-gray-600">{config.message}</p>
      </div>
    );
  }

  // ─── Already confirmed ────────────────────────────────────
  if (status === 'confirmed') {
    return (
      <div className="bg-green-50 rounded-2xl p-8 text-center">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('confirmation.confirmed')}</h2>
        <p className="text-gray-600">{t('page.completedMessage')}</p>
      </div>
    );
  }

  // ─── Main confirmation form ────────────────────────────────
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">{t('confirmation.title')}</h2>
        <p className="text-sm text-gray-500 mt-1">{t('confirmation.subtitle')}</p>
      </div>

      {/* Appointment summary card */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <div className="space-y-3">
          {appointment?.date && (
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <span className="text-xs text-gray-500">{t('confirmation.appointmentDate')}</span>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(appointment.date).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          {appointment?.startTime && (
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-400" />
              <div>
                <span className="text-xs text-gray-500">{t('confirmation.appointmentTime')}</span>
                <p className="text-sm font-medium text-gray-900">{appointment.startTime}</p>
              </div>
            </div>
          )}

          {appointment?.providerName && (
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <span className="text-xs text-gray-500">{t('confirmation.practitioner')}</span>
                <p className="text-sm font-medium text-gray-900">{appointment.providerName}</p>
              </div>
            </div>
          )}

          {documentCount > 0 && (
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-400" />
              <p className="text-sm text-gray-600">
                {t('confirmation.documentsUploaded', { count: documentCount })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-3">
        {/* Confirm */}
        <button
          onClick={handleConfirm}
          disabled={loading !== null}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {loading === 'confirm' ? (
            <><Loader className="w-4 h-4 animate-spin" /> {t('confirmation.confirming')}</>
          ) : (
            <><CheckCircle className="w-5 h-5" /> {t('confirmation.confirm')}</>
          )}
        </button>

        {/* Request modification */}
        <button
          onClick={handleRequestModification}
          disabled={loading !== null}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-orange-50 text-orange-700 border border-orange-200 rounded-xl text-sm font-medium hover:bg-orange-100 disabled:opacity-50 transition-colors"
        >
          {loading === 'modify' ? (
            <><Loader className="w-4 h-4 animate-spin" /> ...</>
          ) : (
            <><Edit3 className="w-5 h-5" /> {t('confirmation.requestModification')}</>
          )}
        </button>

        {/* Cancel */}
        <button
          onClick={handleCancel}
          disabled={loading !== null}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 text-red-600 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          {loading === 'cancel' ? (
            <><Loader className="w-4 h-4 animate-spin" /> {t('confirmation.cancelling')}</>
          ) : (
            <><XCircle className="w-5 h-5" /> {t('confirmation.cancel')}</>
          )}
        </button>
      </div>
    </div>
  );
}
