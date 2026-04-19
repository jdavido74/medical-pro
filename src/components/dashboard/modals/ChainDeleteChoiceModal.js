import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X } from 'lucide-react';

export default function ChainDeleteChoiceModal({ appointment, patientName, chainCount, onConfirm, onClose }) {
  const { t } = useTranslation('planning');

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-medium text-amber-700 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {t('chainDelete.title')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-700">
            {t('chainDelete.description', { count: chainCount || '?', patientName })}
          </p>
          <div className="space-y-2">
            <button
              onClick={() => onConfirm(true)}
              className="w-full px-4 py-3 text-sm font-medium text-left rounded-lg border-2 border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 hover:border-blue-300 transition-colors"
            >
              {t('chainDelete.recalculate', { patientName })}
            </button>
            <button
              onClick={() => onConfirm(false)}
              className="w-full px-4 py-3 text-sm font-medium text-left rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-colors"
            >
              {t('chainDelete.keepGap')}
            </button>
          </div>
        </div>
        <div className="px-6 py-4 border-t">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
          >
            {t('chainDelete.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
