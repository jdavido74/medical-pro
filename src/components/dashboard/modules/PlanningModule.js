/**
 * PlanningModule - Unified appointment planning
 * Handles both machine-based treatments and practitioner consultations
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar, Plus, ChevronLeft, ChevronRight, Filter,
  Cpu, User, Clock, MapPin, X, Check, AlertCircle
} from 'lucide-react';
import planningApi from '../../../api/planningApi';
import { usePermissions } from '../../auth/PermissionGuard';
import PlanningBookingModal from '../modals/PlanningBookingModal';

// Category colors
const CATEGORY_COLORS = {
  treatment: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  consultation: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' }
};

// Status colors
const STATUS_COLORS = {
  scheduled: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-orange-100 text-orange-800'
};

const PlanningModule = () => {
  const { t } = useTranslation('planning');
  const { hasPermission } = usePermissions();

  // Permissions
  const canCreate = hasPermission('appointments.create');
  const canEdit = hasPermission('appointments.edit');

  // State
  const [appointments, setAppointments] = useState([]);
  const [resources, setResources] = useState({ machines: [], providers: [] });
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week'); // day, week, month
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedResource, setSelectedResource] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [toast, setToast] = useState(null);

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (viewMode === 'day') {
      // Single day
    } else if (viewMode === 'week') {
      // Start from Monday
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      end.setDate(start.getDate() + 6);
    } else if (viewMode === 'month') {
      start.setDate(1);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  }, [currentDate, viewMode]);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [calendarResponse, resourcesResponse] = await Promise.all([
        planningApi.getCalendar({
          startDate: dateRange.start,
          endDate: dateRange.end,
          category: categoryFilter !== 'all' ? categoryFilter : undefined
        }),
        planningApi.getResources()
      ]);

      if (calendarResponse.success) {
        setAppointments(calendarResponse.data || []);
      }

      if (resourcesResponse.success) {
        setResources(resourcesResponse.data || { machines: [], providers: [] });
      }
    } catch (error) {
      console.error('Error loading planning data:', error);
      showToast(t('messages.loadError'), 'error');
    } finally {
      setLoading(false);
    }
  }, [dateRange, categoryFilter, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Navigation
  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Format date for display
  const formatDateRange = () => {
    const options = { month: 'long', year: 'numeric' };
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('fr-FR', { ...options, day: 'numeric', weekday: 'long' });
    } else if (viewMode === 'week') {
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      return `${start.getDate()} - ${end.getDate()} ${start.toLocaleDateString('fr-FR', options)}`;
    }
    return currentDate.toLocaleDateString('fr-FR', options);
  };

  // Get days for week view
  const weekDays = useMemo(() => {
    if (viewMode !== 'week') return [];
    const days = [];
    const start = new Date(dateRange.start);
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  }, [dateRange, viewMode]);

  // Group appointments by date
  const appointmentsByDate = useMemo(() => {
    const grouped = {};
    for (const apt of appointments) {
      const date = apt.date;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(apt);
    }
    // Sort by time within each day
    for (const date of Object.keys(grouped)) {
      grouped[date].sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return grouped;
  }, [appointments]);

  // Handle booking modal
  const handleNewAppointment = () => {
    setSelectedAppointment(null);
    setShowBookingModal(true);
  };

  const handleAppointmentClick = (appointment) => {
    setSelectedAppointment(appointment);
    setShowBookingModal(true);
  };

  const handleBookingSave = async () => {
    setShowBookingModal(false);
    showToast(selectedAppointment ? t('messages.updateSuccess') : t('messages.createSuccess'));
    loadData();
  };

  // Render appointment card with height proportional to duration
  const renderAppointment = (apt) => {
    const colors = CATEGORY_COLORS[apt.category] || CATEGORY_COLORS.consultation;
    const statusColor = STATUS_COLORS[apt.status] || STATUS_COLORS.scheduled;

    // Calculate height based on duration (minimum 60px, 1.5px per minute)
    const duration = apt.duration || 30;
    const minHeight = Math.max(60, duration * 1.5);

    return (
      <div
        key={apt.id}
        onClick={() => handleAppointmentClick(apt)}
        className={`p-2 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${colors.bg} ${colors.border}`}
        style={{
          minHeight: `${minHeight}px`,
          ...(apt.color ? { borderLeftColor: apt.color, borderLeftWidth: '4px' } : {})
        }}
      >
        <div className="flex items-start justify-between h-full">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
              <Clock className="w-3 h-3" />
              <span>{apt.startTime} - {apt.endTime}</span>
              <span className="text-gray-400">({duration} min)</span>
            </div>
            <div className={`font-medium text-sm truncate ${colors.text}`}>
              {apt.patient?.fullName || 'Patient'}
            </div>
            {apt.category === 'treatment' && apt.machine && (
              <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                <Cpu className="w-3 h-3" />
                <span>{apt.machine.name}</span>
              </div>
            )}
            {apt.category === 'consultation' && apt.provider && (
              <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                <User className="w-3 h-3" />
                <span>{apt.provider.fullName}</span>
              </div>
            )}
            {apt.title && (
              <div className="text-xs text-gray-500 mt-1 truncate">
                {apt.title}
              </div>
            )}
          </div>
          <span className={`px-1.5 py-0.5 text-xs rounded ${statusColor}`}>
            {t(`statuses.${apt.status}`)}
          </span>
        </div>
      </div>
    );
  };

  // Render day column for week view
  const renderDayColumn = (day) => {
    const dateStr = day.toISOString().split('T')[0];
    const dayAppointments = appointmentsByDate[dateStr] || [];
    const isToday = dateStr === new Date().toISOString().split('T')[0];

    return (
      <div key={dateStr} className="flex-1 min-w-[140px] border-r last:border-r-0">
        <div className={`p-2 text-center border-b ${isToday ? 'bg-blue-50' : 'bg-gray-50'}`}>
          <div className="text-xs text-gray-500">
            {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
          </div>
          <div className={`text-lg font-semibold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
            {day.getDate()}
          </div>
        </div>
        <div className="p-2 space-y-2 min-h-[400px] overflow-y-auto">
          {dayAppointments.length === 0 ? (
            <div className="text-xs text-gray-400 text-center py-4">
              {t('calendar.noAppointments')}
            </div>
          ) : (
            dayAppointments.map(renderAppointment)
          )}
        </div>
      </div>
    );
  };

  if (loading && appointments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('title')}</h1>
          <p className="text-gray-600">{t('subtitle')}</p>
        </div>
        {canCreate && (
          <button
            onClick={handleNewAppointment}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('appointment.new')}
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between bg-white rounded-lg border p-3">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={navigatePrevious}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {t('calendar.today')}
          </button>
          <button
            onClick={navigateNext}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <span className="ml-2 font-medium text-gray-900">{formatDateRange()}</span>
        </div>

        {/* View mode & filters */}
        <div className="flex items-center gap-3">
          {/* Category filter */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {['all', 'treatment', 'consultation'].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  categoryFilter === cat
                    ? 'bg-white shadow text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t(`categories.${cat}`)}
              </button>
            ))}
          </div>

          {/* View mode */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {['day', 'week', 'month'].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === mode
                    ? 'bg-white shadow text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t(`calendar.${mode}`)}
              </button>
            ))}
          </div>

          {/* More filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${
              showFilters ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
            }`}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Extended filters */}
      {showFilters && (
        <div className="bg-white rounded-lg border p-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('filters.machine')}
              </label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Toutes les machines</option>
                {resources.machines.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('filters.provider')}
              </label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Tous les praticiens</option>
                {resources.providers.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('filters.status')}
              </label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Tous les statuts</option>
                {Object.keys(STATUS_COLORS).map(status => (
                  <option key={status} value={status}>{t(`statuses.${status}`)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Calendar View */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {viewMode === 'week' && (
          <div className="flex overflow-x-auto">
            {weekDays.map(renderDayColumn)}
          </div>
        )}

        {viewMode === 'day' && (
          <div className="p-4">
            {appointmentsByDate[currentDate.toISOString().split('T')[0]]?.length > 0 ? (
              <div className="space-y-2">
                {appointmentsByDate[currentDate.toISOString().split('T')[0]].map(renderAppointment)}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                {t('calendar.noAppointments')}
              </div>
            )}
          </div>
        )}

        {viewMode === 'month' && (
          <div className="p-4 text-center text-gray-500">
            Vue mensuelle - En développement
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <PlanningBookingModal
          isOpen={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          onSave={handleBookingSave}
          appointment={selectedAppointment}
          resources={resources}
          initialDate={currentDate.toISOString().split('T')[0]}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 ${
            toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default PlanningModule;
