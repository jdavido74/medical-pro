/**
 * MobileHomeScreen - Dashboard d'accueil mobile
 * Affiche les stats du jour, le prochain RDV, et un accès rapide au planning
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, ChevronRight, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useLocale } from '../../contexts/LocaleContext';
import * as planningApi from '../../api/planningApi';
import { STATUS_CONFIG } from '../../constants/appointmentStatuses';

const MobileHomeScreen = () => {
  const { user } = useAuth();
  const { t } = useTranslation('mobile');
  const { buildUrl } = useLocale();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  const loadTodayData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await planningApi.getCalendar({
        startDate: today,
        endDate: today
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
      console.error('Error loading today data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    loadTodayData();
  }, [loadTodayData]);

  // Compute stats
  const stats = {
    total: appointments.length,
    completed: appointments.filter(a => a.status === 'completed').length,
    inProgress: appointments.filter(a => a.status === 'in_progress').length,
    pending: appointments.filter(a => ['scheduled', 'confirmed'].includes(a.status)).length
  };

  // Find next upcoming appointment
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const nextAppointment = appointments.find(apt => {
    if (!['scheduled', 'confirmed'].includes(apt.status)) return false;
    if (!apt.startTime) return false;
    const [h, m] = apt.startTime.split(':').map(Number);
    return (h * 60 + m) >= currentMinutes;
  });

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString(undefined, {
      weekday: 'long', day: 'numeric', month: 'long'
    });
  };

  const formatTime = (time) => {
    if (!time) return '';
    return time.substring(0, 5);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw size={24} className="animate-spin text-green-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <p className="text-sm text-red-500 mb-4">{t('common.error')}</p>
        <button
          onClick={loadTodayData}
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          {t('home.greeting', { name: user?.firstName || '' })}
        </h1>
        <p className="text-sm text-gray-500 mt-1 capitalize">{formatDate(today)}</p>
      </div>

      {/* Stats grid 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { key: 'total', value: stats.total, color: 'bg-blue-50 text-blue-700' },
          { key: 'completed', value: stats.completed, color: 'bg-gray-50 text-gray-700' },
          { key: 'inProgress', value: stats.inProgress, color: 'bg-green-50 text-green-700' },
          { key: 'pending', value: stats.pending, color: 'bg-yellow-50 text-yellow-700' }
        ].map(({ key, value, color }) => (
          <div key={key} className={`rounded-xl p-4 ${color}`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs font-medium mt-1">{t(`home.stats.${key}`)}</p>
          </div>
        ))}
      </div>

      {/* Next appointment */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          {t('home.nextAppointment')}
        </h2>
        {nextAppointment ? (
          <div
            className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
            onClick={() => navigate(buildUrl('/mobile/appointments'))}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {nextAppointment.patient?.fullName || '—'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock size={14} className="text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-600">
                    {formatTime(nextAppointment.startTime)}
                    {nextAppointment.endTime && ` - ${formatTime(nextAppointment.endTime)}`}
                  </span>
                </div>
                {(nextAppointment.title || nextAppointment.service?.title) && (
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {nextAppointment.title || nextAppointment.service?.title}
                  </p>
                )}
              </div>
              <div className="flex-shrink-0 ml-3">
                {(() => {
                  const config = STATUS_CONFIG[nextAppointment.status];
                  const Icon = config?.icon;
                  return Icon ? (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.bg}`}>
                      <Icon size={16} className={config.color} />
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <Calendar size={24} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">{t('home.noNextAppointment')}</p>
          </div>
        )}
      </div>

      {/* View planning button */}
      <button
        onClick={() => navigate(buildUrl('/mobile/appointments'))}
        className="w-full flex items-center justify-between bg-green-600 text-white rounded-xl px-5 py-4 shadow-sm active:bg-green-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Calendar size={20} />
          <span className="font-medium">{t('home.viewPlanning')}</span>
        </div>
        <ChevronRight size={20} />
      </button>
    </div>
  );
};

export default MobileHomeScreen;
