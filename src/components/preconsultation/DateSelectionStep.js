/**
 * DateSelectionStep — Select from proposed dates
 *
 * Shown when status is 'modification_requested' and proposed_dates is not null.
 * Cards layout: stacked on mobile, grid on desktop.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, CheckCircle, Loader, AlertTriangle } from 'lucide-react';
import { selectDate } from '../../api/preconsultationApi';

export default function DateSelectionStep({ token, proposedDates, onStatusChange }) {
  const { t, i18n } = useTranslation('preconsultation');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);

  if (!proposedDates || proposedDates.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">{t('dateSelection.noDates')}</p>
      </div>
    );
  }

  const handleSelect = async (date) => {
    try {
      setLoading(true);
      setError(null);
      await selectDate(token, date);
      setSelected(date);
      onStatusChange('confirmed');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (selected) {
    return (
      <div className="bg-green-50 rounded-2xl p-8 text-center">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('dateSelection.selected')}</h2>
        <p className="text-lg text-gray-700">
          {new Date(selected).toLocaleDateString(i18n.language, {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          })}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">{t('dateSelection.title')}</h2>
        <p className="text-sm text-gray-500 mt-1">{t('dateSelection.subtitle')}</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {proposedDates.map((date, index) => {
          const dateObj = new Date(date);
          return (
            <button
              key={index}
              onClick={() => handleSelect(date)}
              disabled={loading}
              className="flex items-center gap-4 p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50 text-left"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-blue-800 uppercase">
                  {dateObj.toLocaleDateString(i18n.language, { month: 'short' })}
                </span>
                <span className="text-lg font-bold text-blue-900 leading-none">
                  {dateObj.getDate()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {dateObj.toLocaleDateString(i18n.language, { weekday: 'long' })}
                </p>
                <p className="text-xs text-gray-500">
                  {dateObj.toLocaleDateString(i18n.language, { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              {loading && (
                <Loader className="w-4 h-4 text-blue-500 animate-spin ml-auto" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
