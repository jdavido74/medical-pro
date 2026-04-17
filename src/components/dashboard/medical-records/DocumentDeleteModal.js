import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { deleteDocument } from '../../../api/patientDocumentsApi';

export default function DocumentDeleteModal({ patientId, docId, filename, onDeleted, onClose }) {
  const { t } = useTranslation('planning');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const confirm = async () => {
    if (reason.trim().length < 3 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await deleteDocument(patientId, docId, reason.trim());
      onDeleted();
    } catch (e) {
      setError(e.message || 'Error');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-medium text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {t('documents.deleteModal.title')}
          </h2>
          <p className="text-sm text-gray-500 mt-1 truncate">{filename}</p>
        </div>
        <div className="p-6 space-y-3">
          <label className="block text-sm font-medium">{t('documents.deleteModal.reasonLabel')}</label>
          <textarea
            className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('documents.deleteModal.reasonPlaceholder')}
          />
          <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-md">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">{t('documents.deleteModal.warning')}</p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
          >
            {t('actions.cancel')}
          </button>
          <button
            onClick={confirm}
            disabled={reason.trim().length < 3 || busy}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {t('documents.deleteModal.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
