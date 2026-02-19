/**
 * MobileAppointmentsScreen - Gestion des RDV du jour sur mobile
 * Sélecteur de jour, filtres par statut, cartes RDV avec actions rapides
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, RefreshCw, Activity, Calendar
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../../contexts/LocaleContext';
import * as planningApi from '../../api/planningApi';
import { STATUS_CONFIG, STATUS_TRANSITIONS } from '../../constants/appointmentStatuses';

// Map transition target status to translation key and style
const ACTION_MAP = {
  confirmed: { key: 'confirm', style: 'bg-green-600 text-white' },
  in_progress: { key: 'start', style: 'bg-blue-600 text-white' },
  completed: { key: 'complete', style: 'bg-gray-600 text-white' },
  no_show: { key: 'noShow', style: 'bg-orange-100 text-orange-700' },
  cancelled: { key: 'cancel', style: 'bg-red-100 text-red-700' },
  scheduled: { key: 'confirm', style: 'bg-yellow-100 text-yellow-700' }
};

const FILTERS = ['all', 'pending', 'inProgress'];

const MobileAppointmentsScreen = () => {
  const { t } = useTranslation('mobile');
  const { buildUrl } = useLocale();
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await planningApi.getCalendar({
        startDate: selectedDate,
        endDate: selectedDate
      });
      if (response.success) {
        const data = response.data || [];
        data.sort((a, b) => {
          const timeA = a.startTime ? a.startTime.split(':').map(Number) : [0, 0];
          const timeB = b.startTime ? b.startTime.split(':').map(Number) : [0, 0];
          return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
        });
        setAppointments(data);
      }
    } catch (err) {
      console.error('Error loading appointments:', err);
      showToast(t('appointments.statusError'), 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, t]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // Day navigation
  const changeDay = (offset) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const goToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  // Filter appointments
  const filtered = appointments.filter(apt => {
    if (filter === 'pending') return ['scheduled', 'confirmed'].includes(apt.status);
    if (filter === 'inProgress') return apt.status === 'in_progress';
    return true;
  });

  // Status change
  const handleStatusChange = async (aptId, newStatus) => {
    setUpdatingId(aptId);
    // Optimistic update
    setAppointments(prev =>
      prev.map(a => a.id === aptId ? { ...a, status: newStatus } : a)
    );
    try {
      await planningApi.updateAppointment(aptId, { status: newStatus });
      showToast(t('appointments.statusChanged'));
    } catch (err) {
      console.error('Error updating status:', err);
      // Revert on error
      loadAppointments();
      showToast(t('appointments.statusError'), 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString(undefined, {
      weekday: 'short', day: 'numeric', month: 'short'
    });
  };

  const formatTime = (time) => {
    if (!time) return '';
    return time.substring(0, 5);
  };

  // Left border color for status
  const statusBorderColor = (status) => {
    const map = {
      scheduled: 'border-l-yellow-500',
      confirmed: 'border-l-green-500',
      in_progress: 'border-l-blue-500',
      completed: 'border-l-gray-400',
      cancelled: 'border-l-red-500',
      no_show: 'border-l-orange-500'
    };
    return map[status] || 'border-l-gray-300';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Day selector */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => changeDay(-1)}
            className="p-2 rounded-lg active:bg-gray-100"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <button
            onClick={goToToday}
            className="text-center"
          >
            <p className="font-semibold text-gray-900 capitalize">
              {isToday ? t('appointments.today') : formatDate(selectedDate)}
            </p>
            {!isToday && (
              <p className="text-xs text-green-600 mt-0.5">
                {t('appointments.today')} ↩
              </p>
            )}
          </button>
          <button
            onClick={() => changeDay(1)}
            className="p-2 rounded-lg active:bg-gray-100"
          >
            <ChevronRight size={20} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 flex gap-2 overflow-x-auto">
        {FILTERS.map(f => {
          const labelKey = f === 'all' ? 'filterAll' : f === 'pending' ? 'filterPending' : 'filterInProgress';
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                active
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 active:bg-gray-200'
              }`}
            >
              {t(`appointments.${labelKey}`)}
            </button>
          );
        })}
      </div>

      {/* Appointment list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw size={24} className="animate-spin text-green-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Calendar size={40} className="text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">{t('appointments.noAppointments')}</p>
          </div>
        ) : (
          filtered.map(apt => {
            const config = STATUS_CONFIG[apt.status];
            const StatusIcon = config?.icon;
            const transitions = STATUS_TRANSITIONS[apt.status] || [];
            const isUpdating = updatingId === apt.id;

            return (
              <div
                key={apt.id}
                className={`bg-white rounded-xl border border-gray-200 border-l-4 ${statusBorderColor(apt.status)} shadow-sm overflow-hidden`}
              >
                {/* Card header */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {apt.patient?.fullName || '—'}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {formatTime(apt.startTime)}
                        {apt.endTime && ` - ${formatTime(apt.endTime)}`}
                      </p>
                      {(apt.title || apt.service?.title) && (
                        <p className="text-xs text-gray-400 mt-1 truncate">
                          {apt.title || apt.service?.title}
                        </p>
                      )}
                    </div>
                    {/* Status badge */}
                    {StatusIcon && (
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                        <StatusIcon size={12} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="border-t border-gray-100 px-3 py-2 flex gap-2 overflow-x-auto">
                  {transitions.map(targetStatus => {
                    const action = ACTION_MAP[targetStatus];
                    if (!action) return null;
                    return (
                      <button
                        key={targetStatus}
                        onClick={() => handleStatusChange(apt.id, targetStatus)}
                        disabled={isUpdating}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${action.style} ${
                          isUpdating ? 'opacity-50' : 'active:opacity-80'
                        } transition-opacity`}
                      >
                        {t(`appointments.actions.${action.key}`)}
                      </button>
                    );
                  })}
                  {/* Take vitals button (only for in_progress or completed) */}
                  {['in_progress', 'completed', 'confirmed'].includes(apt.status) && apt.patient?.id && (
                    <button
                      onClick={() =>
                        navigate(
                          buildUrl(`/mobile/vitals?appointmentId=${apt.id}&patientId=${apt.patient.id}&patientName=${encodeURIComponent(apt.patient.fullName || '')}`)
                        )
                      }
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-100 text-purple-700 whitespace-nowrap flex items-center gap-1 active:opacity-80"
                    >
                      <Activity size={12} />
                      {t('appointments.actions.takeVitals')}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-20 left-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-center ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default MobileAppointmentsScreen;
