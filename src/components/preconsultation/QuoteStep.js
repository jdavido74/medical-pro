/**
 * QuoteStep — View and accept/reject quote
 *
 * Shows quote details and accept/reject buttons.
 * Desktop: quote info card + buttons
 * Mobile: compact view with action buttons
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Receipt, CheckCircle, XCircle, Loader, AlertTriangle
} from 'lucide-react';
import { getQuote, acceptQuote, rejectQuote } from '../../api/preconsultationApi';

export default function QuoteStep({ token, status, onStatusChange }) {
  const { t } = useTranslation('preconsultation');

  const [quote, setQuote] = useState(null);
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(
    status === 'quote_accepted' ? 'accepted' :
    status === 'quote_rejected' ? 'rejected' : null
  );

  useEffect(() => {
    async function load() {
      try {
        const data = await getQuote(token);
        setQuote(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingQuote(false);
      }
    }
    load();
  }, [token]);

  const handleAccept = async () => {
    try {
      setLoading('accept');
      setError(null);
      await acceptQuote(token);
      setResult('accepted');
      onStatusChange('quote_accepted');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    if (!window.confirm(t('quote.rejectConfirm'))) return;

    try {
      setLoading('reject');
      setError(null);
      await rejectQuote(token);
      setResult('rejected');
      onStatusChange('quote_rejected');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  // ─── Loading ──────────────────────────────────────────────
  if (loadingQuote) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  // ─── Result screen ────────────────────────────────────────
  if (result) {
    const config = result === 'accepted'
      ? { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', title: t('quote.accepted') }
      : { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', title: t('quote.rejected') };

    const ResultIcon = config.icon;

    return (
      <div className={`${config.bg} rounded-2xl p-8 text-center`}>
        <ResultIcon className={`w-16 h-16 ${config.color} mx-auto mb-4`} />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{config.title}</h2>
      </div>
    );
  }

  // ─── No quote ─────────────────────────────────────────────
  if (!quote) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">{t('quote.noQuote')}</p>
      </div>
    );
  }

  // ─── Quote view ───────────────────────────────────────────
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">{t('quote.title')}</h2>
        <p className="text-sm text-gray-500 mt-1">{t('quote.subtitle')}</p>
      </div>

      {/* Quote card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Receipt className="w-8 h-8 text-purple-500" />
          <div>
            <p className="text-xs text-gray-500">{t('quote.documentNumber')}</p>
            <p className="text-sm font-medium text-gray-900">{quote.documentNumber}</p>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-500 mb-1">{t('quote.totalAmount')}</p>
          <p className="text-3xl font-bold text-gray-900">
            {new Intl.NumberFormat(undefined, {
              style: 'currency',
              currency: quote.currency || 'EUR'
            }).format(quote.totalAmount)}
          </p>
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
        <button
          onClick={handleAccept}
          disabled={loading !== null}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {loading === 'accept' ? (
            <><Loader className="w-4 h-4 animate-spin" /> {t('quote.accepting')}</>
          ) : (
            <><CheckCircle className="w-5 h-5" /> {t('quote.accept')}</>
          )}
        </button>

        <button
          onClick={handleReject}
          disabled={loading !== null}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 text-red-600 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          {loading === 'reject' ? (
            <><Loader className="w-4 h-4 animate-spin" /> {t('quote.rejecting')}</>
          ) : (
            <><XCircle className="w-5 h-5" /> {t('quote.reject')}</>
          )}
        </button>
      </div>
    </div>
  );
}
