/**
 * MobileHomeScreen - Écran principal mobile "Jour le jour"
 * Stats compactes + sélecteur de jour + filtres + liste RDV avec auto-scroll + alerte retard
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, RefreshCw, Activity, Calendar, AlertTriangle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useLocale } from '../../contexts/LocaleContext';
import * as planningApi from '../../api/planningApi';
import { STATUS_TRANSITIONS } from '../../constants/appointmentStatuses';

const ACTION_MAP = {
  confirmed: { key: 'confirm', primary: true },
  in_progress: { key: 'start', primary: true },
  completed: { key: 'complete', primary: true },
  no_show: { key: 'noShow', primary: false },
  cancelled: { key: 'cancel', primary: false },
  scheduled: { key: 'confirm', primary: false }
};

const STATUS_BORDER = {
  scheduled: 'border-l-gray-300',
  confirmed: 'border-l-gray-400',
  in_progress: 'border-l-green-600',
  completed: 'border-l-green-300',
  cancelled: 'border-l-gray-200',
  no_show: 'border-l-gray-200'
};

const STATUS_LABEL = {
  scheduled: 'Planifié',
  confirmed: 'Confirmé',
  in_progress: 'En cours',
  completed: 'Terminé',
  cancelled: 'Annulé',
  no_show: 'Absent'
};

const FILTERS = [
  { key: 'all', label: 'filterAll' },
  { key: 'inProgress', label: 'filterInProgress' },
  { key: 'toStart', label: 'filterToStart' },
  { key: 'toConfirm', label: 'filterToConfirm' }
];

// Check if a time string (HH:MM:SS) is before now
const isTimePast = (timeStr) => {
  if (!timeStr) return false;
  const [h, m] = timeStr.split(':').map(Number);
  const now = new Date();
  return (h * 60 + m) < (now.getHours() * 60 + now.getMinutes());
};

// Is appointment overdue? Time passed + not started/finished/cancelled/absent
const isOverdue = (apt, isToday) => {
  if (!isToday) return false;
  if (['in_progress', 'completed', 'cancelled', 'no_show'].includes(apt.status)) return false;
  return isTimePast(apt.startTime);
};

const MobileHomeScreen = () => {
  const { user } = useAuth();
  const { t } = useTranslation('mobile');
  const { buildUrl } = useLocale();
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const listRef = useRef(null);
  const scrollTargetRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  // Auto-scroll to first in_progress or upcoming appointment after load
  useEffect(() => {
    if (!loading && isToday && appointments.length > 0 && scrollTargetRef.current) {
      // Small delay so the DOM has rendered
      setTimeout(() => {
        scrollTargetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [loading, isToday, appointments]);

  // Find the ID of the first appointment to scroll to
  const scrollTargetId = useMemo(() => {
    if (!isToday) return null;
    // Priority 1: first in_progress
    const inProgress = appointments.find(a => a.status === 'in_progress');
    if (inProgress) return inProgress.id;
    // Priority 2: first scheduled/confirmed not yet past
    const upcoming = appointments.find(a =>
      ['scheduled', 'confirmed'].includes(a.status) && !isTimePast(a.startTime)
    );
    if (upcoming) return upcoming.id;
    // Priority 3: first overdue (scheduled/confirmed but time passed)
    const overdue = appointments.find(a =>
      ['scheduled', 'confirmed'].includes(a.status) && isTimePast(a.startTime)
    );
    if (overdue) return overdue.id;
    return null;
  }, [appointments, isToday]);

  // Stats
  const stats = {
    total: appointments.length,
    completed: appointments.filter(a => a.status === 'completed').length,
    inProgress: appointments.filter(a => a.status === 'in_progress').length,
    pending: appointments.filter(a => ['scheduled', 'confirmed'].includes(a.status)).length
  };

  // Filter
  const filtered = useMemo(() => {
    return appointments.filter(apt => {
      if (filter === 'inProgress') return apt.status === 'in_progress';
      if (filter === 'toStart') return apt.status === 'confirmed';
      if (filter === 'toConfirm') return apt.status === 'scheduled';
      return true;
    });
  }, [appointments, filter]);

  // Day navigation
  const changeDay = (offset) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d + offset);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  const goToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  // Status change
  const handleStatusChange = async (aptId, newStatus) => {
    setUpdatingId(aptId);
    setAppointments(prev =>
      prev.map(a => a.id === aptId ? { ...a, status: newStatus } : a)
    );
    try {
      await planningApi.updateAppointment(aptId, { status: newStatus });
      showToast(t('appointments.statusChanged'));
    } catch (err) {
      console.error('Error updating status:', err);
      loadAppointments();
      showToast(t('appointments.statusError'), 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDateLong = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString(undefined, {
      weekday: 'short', day: 'numeric', month: 'short'
    });
  };

  const formatTime = (time) => {
    if (!time) return '';
    return time.substring(0, 5);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <p className="text-sm text-gray-500 mb-4">{t('common.error')}</p>
        <button
          onClick={loadAppointments}
          className="px-4 py-2 bg-gray-900 text-white text-sm"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Greeting + compact stats */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">
            {t('home.greeting', { name: user?.firstName || '' })}
          </p>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span><span className="font-semibold text-gray-900">{stats.total}</span> total</span>
            <span className="text-gray-300">|</span>
            <span><span className="font-semibold text-gray-700">{stats.completed}</span> finis</span>
            <span><span className="font-semibold text-gray-700">{stats.inProgress}</span> en cours</span>
            <span><span className="font-semibold text-gray-700">{stats.pending}</span> att.</span>
          </div>
        </div>
      </div>

      {/* Day selector */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => changeDay(-1)}
            className="p-2 -ml-2 active:bg-gray-100"
          >
            <ChevronLeft size={20} className="text-gray-500" />
          </button>
          <button onClick={goToToday} className="text-center min-w-0">
            <p className="font-semibold text-gray-900 capitalize text-sm">
              {isToday ? t('appointments.today') : formatDateLong(selectedDate)}
            </p>
            {!isToday && (
              <p className="text-[10px] text-gray-400">{t('appointments.today')} ↩</p>
            )}
          </button>
          <button
            onClick={() => changeDay(1)}
            className="p-2 -mr-2 active:bg-gray-100"
          >
            <ChevronRight size={20} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 flex gap-2 flex-wrap">
        {FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-500 active:bg-gray-200'
              }`}
            >
              {t(`appointments.${f.label}`)}
            </button>
          );
        })}
      </div>

      {/* Appointment list */}
      <div className="flex-1 overflow-y-auto bg-white" ref={listRef}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw size={20} className="animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Calendar size={32} className="text-gray-300 mb-3" />
            <p className="text-sm text-gray-400">{t('appointments.noAppointments')}</p>
          </div>
        ) : (
          filtered.map(apt => {
            const transitions = STATUS_TRANSITIONS[apt.status] || [];
            const isUpdating = updatingId === apt.id;
            const showVitals = ['in_progress', 'completed', 'confirmed'].includes(apt.status) && apt.patient?.id;
            const hasActions = transitions.length > 0 || showVitals;
            const overdue = isOverdue(apt, isToday);
            const isScrollTarget = apt.id === scrollTargetId;

            return (
              <div
                key={apt.id}
                ref={isScrollTarget ? scrollTargetRef : undefined}
                className={`border-b border-gray-100 border-l-4 ${
                  overdue ? 'border-l-red-500 bg-red-50' : STATUS_BORDER[apt.status] || 'border-l-gray-200'
                }`}
              >
                <div className="px-4 py-3">
                  {/* Overdue alert */}
                  {overdue && (
                    <div className="flex items-center gap-1.5 mb-2 text-red-600">
                      <AlertTriangle size={13} />
                      <span className="text-xs font-medium">{t('appointments.overdue')}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    {/* Time column */}
                    <div className="flex-shrink-0 w-12 text-right">
                      <p className={`text-sm font-semibold ${overdue ? 'text-red-600' : 'text-gray-900'}`}>
                        {formatTime(apt.startTime)}
                      </p>
                      <p className="text-[10px] text-gray-400">{formatTime(apt.endTime)}</p>
                    </div>

                    <div className="w-px h-8 bg-gray-200 flex-shrink-0" />

                    {/* Patient + treatment */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {apt.patient?.fullName || '—'}
                      </p>
                      {(apt.title || apt.service?.title) && (
                        <p className="text-xs text-gray-400 truncate">
                          {apt.title || apt.service?.title}
                        </p>
                      )}
                    </div>

                    {/* Status badge */}
                    <span className={`flex-shrink-0 text-[10px] font-medium px-2 py-0.5 ${
                      overdue ? 'bg-red-600 text-white' :
                      apt.status === 'in_progress' ? 'bg-gray-900 text-white' :
                      apt.status === 'completed' ? 'bg-gray-100 text-gray-500' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {overdue ? t('appointments.overdue').split('—')[0].trim() : STATUS_LABEL[apt.status] || apt.status}
                    </span>
                  </div>

                  {/* Action buttons */}
                  {hasActions && (
                    <div className="flex flex-wrap gap-2 mt-2 pl-16">
                      {transitions.map(targetStatus => {
                        const action = ACTION_MAP[targetStatus];
                        if (!action) return null;
                        return (
                          <button
                            key={targetStatus}
                            onClick={() => handleStatusChange(apt.id, targetStatus)}
                            disabled={isUpdating}
                            className={`px-3 py-1 text-xs font-medium ${
                              action.primary
                                ? 'bg-gray-900 text-white'
                                : 'bg-gray-100 text-gray-600'
                            } ${isUpdating ? 'opacity-40' : 'active:opacity-70'} transition-opacity`}
                          >
                            {t(`appointments.actions.${action.key}`)}
                          </button>
                        );
                      })}
                      {showVitals && (
                        <button
                          onClick={() =>
                            navigate(
                              buildUrl(`/mobile/vitals?appointmentId=${apt.id}&patientId=${apt.patient.id}&patientName=${encodeURIComponent(apt.patient.fullName || '')}`)
                            )
                          }
                          className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-600 flex items-center gap-1 active:opacity-70"
                        >
                          <Activity size={11} />
                          {t('appointments.actions.takeVitals')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-20 left-4 right-4 z-50 px-4 py-3 shadow-lg text-sm font-medium text-center ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default MobileHomeScreen;
