import React, { useState, useMemo } from 'react';
import { CheckCircle, Clock, Pause, XCircle, Pill, Loader } from 'lucide-react';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
};

const statusIcon = (status) => {
  switch (status) {
    case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'scheduled':
    case 'confirmed': return <Clock className="h-4 w-4 text-blue-500" />;
    case 'interrupted': return <Pause className="h-4 w-4 text-purple-500" />;
    case 'cancelled': return <XCircle className="h-4 w-4 text-red-400" />;
    default: return <Clock className="h-4 w-4 text-gray-400" />;
  }
};

const statusLabel = (status) => {
  switch (status) {
    case 'completed': return 'Realizado';
    case 'scheduled':
    case 'confirmed': return 'Previsto';
    case 'interrupted': return 'Suspendido';
    case 'cancelled': return 'Cancelado';
    default: return status;
  }
};

const PatientDetailTratamientos = ({ appointments, loading, t }) => {
  const [viewMode, setViewMode] = useState('chronological');

  const allTreatments = useMemo(() => {
    return appointments
      .filter(apt => apt.title || apt.service?.title)
      .map(apt => ({
        appointmentId: apt.id,
        date: apt.date,
        startTime: apt.startTime,
        treatmentName: apt.title || apt.service?.title || '',
        providerName: apt.provider?.fullName || '',
        status: apt.status,
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [appointments]);

  const counts = useMemo(() => ({
    realized: allTreatments.filter(t => t.status === 'completed').length,
    planned: allTreatments.filter(t => ['scheduled', 'confirmed'].includes(t.status)).length,
    suspended: allTreatments.filter(t => t.status === 'interrupted').length,
    cancelled: allTreatments.filter(t => t.status === 'cancelled').length,
  }), [allTreatments]);

  // Group by date for chronological view
  const byDate = useMemo(() => {
    const groups = {};
    for (const tr of allTreatments) {
      if (!groups[tr.date]) groups[tr.date] = { date: tr.date, providerName: tr.providerName, items: [] };
      groups[tr.date].items.push(tr);
      if (tr.providerName) groups[tr.date].providerName = tr.providerName;
    }
    return Object.values(groups).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [allTreatments]);

  // Group by treatment name
  const byName = useMemo(() => {
    const groups = {};
    for (const tr of allTreatments) {
      if (!groups[tr.treatmentName]) groups[tr.treatmentName] = [];
      groups[tr.treatmentName].push(tr);
    }
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [allTreatments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-6 w-6 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (allTreatments.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Pill className="h-10 w-10 mx-auto mb-2" />
        <p>{t('patients:detail.treatments.noTreatments')}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Counters */}
      <div className="flex gap-3 mb-4">
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          {counts.realized} {t('patients:detail.treatments.realized')}
        </span>
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          {counts.planned} {t('patients:detail.treatments.planned')}
        </span>
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
          {counts.suspended} {t('patients:detail.treatments.suspended')}
        </span>
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          {counts.cancelled} {t('patients:detail.treatments.cancelled')}
        </span>
      </div>

      {/* Toggle */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setViewMode('chronological')}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            viewMode === 'chronological' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {t('patients:detail.treatments.chronological')}
        </button>
        <button
          onClick={() => setViewMode('byTreatment')}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            viewMode === 'byTreatment' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {t('patients:detail.treatments.byTreatment')}
        </button>
      </div>

      {/* Chronological view */}
      {viewMode === 'chronological' && (
        <div className="space-y-4">
          {byDate.map(group => (
            <div key={group.date}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-gray-900">{formatDate(group.date)}</span>
                {group.providerName && <span className="text-xs text-gray-500">· {group.providerName}</span>}
              </div>
              <div className="space-y-1 ml-2">
                {group.items.map(tr => (
                  <div key={tr.appointmentId + tr.treatmentName} className="flex items-center gap-2">
                    {statusIcon(tr.status)}
                    <span className="text-sm text-gray-700">{tr.treatmentName}</span>
                    <span className="text-xs text-gray-400">[{statusLabel(tr.status)}]</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* By treatment view */}
      {viewMode === 'byTreatment' && (
        <div className="space-y-4">
          {byName.map(([name, items]) => (
            <div key={name}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-gray-900">{name}</span>
                <span className="text-xs text-gray-400">({items.length} {t('patients:detail.treatments.sessions')})</span>
              </div>
              <div className="space-y-1 ml-2">
                {[...items].sort((a, b) => new Date(a.date) - new Date(b.date)).map(tr => (
                  <div key={tr.appointmentId} className="flex items-center gap-2">
                    {statusIcon(tr.status)}
                    <span className="text-sm text-gray-700">{formatDate(tr.date)}</span>
                    {tr.providerName && <span className="text-xs text-gray-500">· {tr.providerName}</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PatientDetailTratamientos;
