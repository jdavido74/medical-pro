/**
 * PreconsultationStatusBadge — Colored badge for preconsultation status
 *
 * Used in appointment cards and detail views.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

const STATUS_COLORS = {
  sent: 'bg-gray-100 text-gray-700',
  patient_info_completed: 'bg-sky-100 text-sky-700',
  documents_uploaded: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  modification_requested: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-red-100 text-red-700',
  quote_sent: 'bg-purple-100 text-purple-700',
  quote_accepted: 'bg-emerald-100 text-emerald-800',
  quote_rejected: 'bg-rose-100 text-rose-700'
};

export default function PreconsultationStatusBadge({ status }) {
  const { t } = useTranslation('preconsultation');

  if (!status) return null;

  const colorClasses = STATUS_COLORS[status] || 'bg-gray-100 text-gray-600';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClasses}`}>
      {t(`status.${status}`, status)}
    </span>
  );
}
