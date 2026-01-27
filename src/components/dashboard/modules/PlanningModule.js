/**
 * PlanningModule - Unified appointment planning
 * Handles both machine-based treatments and practitioner consultations
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar, Plus, ChevronLeft, ChevronRight, Filter,
  Cpu, User, Clock, MapPin, X, Check, AlertCircle,
  CircleDot, CheckCircle2, PlayCircle, XCircle, AlertTriangle, Link
} from 'lucide-react';
import planningApi from '../../../api/planningApi';
import { usePermissions } from '../../auth/PermissionGuard';
import PlanningBookingModal from '../modals/PlanningBookingModal';


// Status icons and colors
const STATUS_CONFIG = {
  scheduled: { icon: CircleDot, color: 'text-yellow-600', bg: 'bg-yellow-100', title: 'scheduled' },
  confirmed: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100', title: 'confirmed' },
  in_progress: { icon: PlayCircle, color: 'text-blue-600', bg: 'bg-blue-100', title: 'in_progress' },
  completed: { icon: Check, color: 'text-gray-600', bg: 'bg-gray-100', title: 'completed' },
  cancelled: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', title: 'cancelled' },
  no_show: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-100', title: 'no_show' }
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

  // Group appointments by date and sort by time
  const appointmentsByDate = useMemo(() => {
    const grouped = {};
    for (const apt of appointments) {
      const date = apt.date;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(apt);
    }
    // Sort by start time within each day (convert to minutes for accurate sorting)
    for (const date of Object.keys(grouped)) {
      grouped[date].sort((a, b) => {
        const timeA = a.startTime ? a.startTime.split(':').map(Number) : [0, 0];
        const timeB = b.startTime ? b.startTime.split(':').map(Number) : [0, 0];
        const minutesA = timeA[0] * 60 + timeA[1];
        const minutesB = timeB[0] * 60 + timeB[1];
        return minutesA - minutesB;
      });
    }
    return grouped;
  }, [appointments]);

  // Patient colors for visual distinction (alternating by day)
  const PATIENT_COLORS = [
    { bg: 'bg-blue-50', border: 'border-blue-300', accent: 'border-l-blue-500' },
    { bg: 'bg-amber-50', border: 'border-amber-300', accent: 'border-l-amber-500' },
    { bg: 'bg-emerald-50', border: 'border-emerald-300', accent: 'border-l-emerald-500' },
    { bg: 'bg-violet-50', border: 'border-violet-300', accent: 'border-l-violet-500' },
    { bg: 'bg-rose-50', border: 'border-rose-300', accent: 'border-l-rose-500' },
    { bg: 'bg-cyan-50', border: 'border-cyan-300', accent: 'border-l-cyan-500' },
    { bg: 'bg-orange-50', border: 'border-orange-300', accent: 'border-l-orange-500' },
    { bg: 'bg-teal-50', border: 'border-teal-300', accent: 'border-l-teal-500' }
  ];

  // Map patients to colors per day (same patient = same color within a day)
  const patientColorMap = useMemo(() => {
    const colorMap = {};

    for (const date of Object.keys(appointmentsByDate)) {
      const dayAppointments = appointmentsByDate[date];
      const patientsInDay = [];

      // Get unique patients in order of first appearance
      for (const apt of dayAppointments) {
        const patientId = apt.patientId || apt.patient?.id;
        if (patientId && !patientsInDay.includes(patientId)) {
          patientsInDay.push(patientId);
        }
      }

      // Assign color index to each patient for this day
      patientsInDay.forEach((patientId, index) => {
        colorMap[`${date}-${patientId}`] = index % PATIENT_COLORS.length;
      });
    }

    return colorMap;
  }, [appointmentsByDate]);

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
  const renderAppointment = (apt, dateStr) => {
    const statusConfig = STATUS_CONFIG[apt.status] || STATUS_CONFIG.scheduled;
    const StatusIcon = statusConfig.icon;

    // Get patient color for this day
    const patientId = apt.patientId || apt.patient?.id;
    const colorKey = `${dateStr || apt.date}-${patientId}`;
    const colorIndex = patientColorMap[colorKey] ?? 0;
    const patientColors = PATIENT_COLORS[colorIndex];

    // Calculate height based on duration
    // Scale: 1.8px per minute, minimum 75px for readability
    // 30min = 75px, 45min = 81px, 60min = 108px, 90min = 162px
    const duration = apt.duration || 30;
    const calculatedHeight = Math.max(75, Math.round(duration * 1.8));

    // Check if part of a linked group
    const isLinked = apt.isLinked || apt.linkedAppointmentId || apt.linkSequence > 1;

    // Category indicator
    const categoryIndicator = apt.category === 'treatment'
      ? { icon: Cpu, color: 'text-blue-600' }
      : { icon: User, color: 'text-purple-600' };

    const CategoryIcon = categoryIndicator.icon;

    return (
      <div
        key={apt.id}
        onClick={() => handleAppointmentClick(apt)}
        className={`p-2 rounded-lg border-l-4 border cursor-pointer hover:shadow-md transition-shadow ${patientColors.bg} ${patientColors.border} ${patientColors.accent}`}
        style={{
          height: `${calculatedHeight}px`
        }}
      >
        <div className="flex items-start justify-between h-full">
          <div className="flex-1 min-w-0">
            {/* Header: time + category icon + status icon + link icon */}
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3 h-3 flex-shrink-0" />
              <span>{apt.startTime} - {apt.endTime}</span>
              <span className="text-gray-400">({duration} min)</span>
              <div className="flex items-center gap-0.5 ml-auto">
                <CategoryIcon className={`w-3 h-3 ${categoryIndicator.color}`} title={t(`categories.${apt.category}`)} />
                {isLinked && (
                  <Link className="w-3 h-3 text-purple-500" title={t('appointment.linkedGroup')} />
                )}
                <StatusIcon
                  className={`w-4 h-4 ${statusConfig.color}`}
                  title={t(`statuses.${apt.status}`)}
                />
              </div>
            </div>

            {/* Patient name */}
            <div className="font-medium text-sm text-gray-900 mt-1">
              {apt.patient?.fullName || 'Patient'}
            </div>

            {/* Treatment title */}
            {apt.title && (
              <div className="text-xs text-gray-700 mt-0.5">
                {apt.title}
              </div>
            )}

            {/* Machine (for treatments) */}
            {apt.category === 'treatment' && apt.machine && (
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                <Cpu className="w-3 h-3 flex-shrink-0" />
                <span>{apt.machine.name}</span>
              </div>
            )}

            {/* Provider (for consultations) */}
            {apt.category === 'consultation' && apt.provider && (
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                <User className="w-3 h-3 flex-shrink-0" />
                <span>{apt.provider.fullName}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render day header for week view
  const renderDayHeader = (day) => {
    const dateStr = day.toISOString().split('T')[0];
    const isToday = dateStr === new Date().toISOString().split('T')[0];

    return (
      <div
        key={`header-${dateStr}`}
        className={`flex-1 min-w-[140px] p-2 text-center border-r last:border-r-0 ${isToday ? 'bg-blue-50' : 'bg-gray-50'}`}
      >
        <div className="text-xs text-gray-500">
          {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
        </div>
        <div className={`text-lg font-semibold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
          {day.getDate()}
        </div>
      </div>
    );
  };

  // Render day content for week view
  const renderDayContent = (day) => {
    const dateStr = day.toISOString().split('T')[0];
    const dayAppointments = appointmentsByDate[dateStr] || [];

    return (
      <div key={`content-${dateStr}`} className="flex-1 min-w-[140px] border-r last:border-r-0 p-2 space-y-2">
        {dayAppointments.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-4">
            {t('calendar.noAppointments')}
          </div>
        ) : (
          dayAppointments.map(apt => renderAppointment(apt, dateStr))
        )}
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
                {Object.keys(STATUS_CONFIG).map(status => (
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
          <div className="flex flex-col max-h-[calc(100vh-300px)]">
            {/* Sticky header row */}
            <div className="flex border-b sticky top-0 z-10 bg-white">
              {weekDays.map(renderDayHeader)}
            </div>
            {/* Scrollable content row */}
            <div className="flex overflow-y-auto overflow-x-auto flex-1 min-h-[400px]">
              {weekDays.map(renderDayContent)}
            </div>
          </div>
        )}

        {viewMode === 'day' && (
          <div className="p-4">
            {(() => {
              const dayDateStr = currentDate.toISOString().split('T')[0];
              const dayAppts = appointmentsByDate[dayDateStr] || [];
              return dayAppts.length > 0 ? (
                <div className="space-y-2">
                  {dayAppts.map(apt => renderAppointment(apt, dayDateStr))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  {t('calendar.noAppointments')}
                </div>
              );
            })()}
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
