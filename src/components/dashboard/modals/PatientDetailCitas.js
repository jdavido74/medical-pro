import React, { useState, useMemo } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, AlertTriangle, Loader } from 'lucide-react';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
};

const statusConfig = {
  scheduled: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Programada' },
  confirmed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Confirmada' },
  in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'En curso' },
  completed: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Completada' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelada' },
  no_show: { bg: 'bg-red-200', text: 'text-red-800', label: 'No show' },
  interrupted: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Interrumpido' },
};

const PatientDetailCitas = ({ appointments, loading, t }) => {
  const [visibleCount, setVisibleCount] = useState(20);

  const sorted = useMemo(() =>
    [...appointments].sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.startTime || '00:00'}`);
      const dateB = new Date(`${b.date}T${b.startTime || '00:00'}`);
      return dateB - dateA;
    }),
  [appointments]);

  const counts = useMemo(() => ({
    completed: appointments.filter(a => a.status === 'completed').length,
    upcoming: appointments.filter(a => ['scheduled', 'confirmed'].includes(a.status)).length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
  }), [appointments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-6 w-6 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Calendar className="h-10 w-10 mx-auto mb-2" />
        <p>{t('patients:detail.appointments.noAppointments')}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Counters */}
      <div className="flex gap-3 mb-4">
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          {counts.completed} {t('patients:detail.appointments.completed')}
        </span>
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          {counts.upcoming} {t('patients:detail.appointments.upcoming')}
        </span>
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          {counts.cancelled} {t('patients:detail.appointments.cancelled')}
        </span>
      </div>

      {/* List */}
      <div className="space-y-2">
        {sorted.slice(0, visibleCount).map(apt => {
          const sc = statusConfig[apt.status] || statusConfig.scheduled;
          return (
            <div key={apt.id} className="py-2 border-b border-gray-100 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-gray-900 whitespace-nowrap">{formatDate(apt.date)}</span>
                  <span className="text-xs text-gray-500 whitespace-nowrap">{apt.startTime}{apt.endTime ? ` - ${apt.endTime}` : ''}</span>
                  {apt.provider?.fullName && (
                    <span className="text-xs text-gray-500 truncate">· {apt.provider.fullName}</span>
                  )}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${sc.bg} ${sc.text}`}>
                  {sc.label}
                </span>
              </div>
              {(apt.title || apt.service?.title) && (
                <p className="text-xs text-gray-500 mt-0.5">{apt.title || apt.service?.title}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Load more */}
      {visibleCount < sorted.length && (
        <button
          onClick={() => setVisibleCount(prev => prev + 20)}
          className="w-full mt-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
        >
          {t('patients:detail.appointments.loadMore')} ({sorted.length - visibleCount} restantes)
        </button>
      )}
    </div>
  );
};

export default PatientDetailCitas;
