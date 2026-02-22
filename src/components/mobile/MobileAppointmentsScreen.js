/**
 * MobileAppointmentsScreen - Gestion des RDV du jour sur mobile
 * Sélecteur de jour, filtres par statut, liste RDV avec actions inline
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, RefreshCw, Activity, Calendar
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
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

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const filtered = appointments.filter(apt => {
    if (filter === 'pending') return ['scheduled', 'confirmed'].includes(apt.status);
    if (filter === 'inProgress') return apt.status === 'in_progress';
    return true;
  });

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

  return (
    <div className="flex flex-col h-full">
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
              {isToday ? t('appointments.today') : formatDate(selectedDate)}
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

      {/* Filter chips */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 flex gap-2">
        {FILTERS.map(f => {
          const labelKey = f === 'all' ? 'filterAll' : f === 'pending' ? 'filterPending' : 'filterInProgress';
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-500 active:bg-gray-200'
              }`}
            >
              {t(`appointments.${labelKey}`)}
            </button>
          );
        })}
      </div>

      {/* Appointment list */}
      <div className="flex-1 overflow-y-auto bg-white">
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

            return (
              <div
                key={apt.id}
                className={`border-b border-gray-100 border-l-4 ${STATUS_BORDER[apt.status] || 'border-l-gray-200'}`}
              >
                <div className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-12 text-right">
                      <p className="text-sm font-semibold text-gray-900">{formatTime(apt.startTime)}</p>
                      <p className="text-[10px] text-gray-400">{formatTime(apt.endTime)}</p>
                    </div>

                    <div className="w-px h-8 bg-gray-200 flex-shrink-0" />

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

                    <span className={`flex-shrink-0 text-[10px] font-medium px-2 py-0.5 ${
                      apt.status === 'in_progress' ? 'bg-gray-900 text-white' :
                      apt.status === 'completed' ? 'bg-gray-100 text-gray-500' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {STATUS_LABEL[apt.status] || apt.status}
                    </span>
                  </div>

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

export default MobileAppointmentsScreen;
