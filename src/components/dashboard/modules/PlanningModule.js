/**
 * PlanningModule - Unified appointment planning
 * Handles both machine-based treatments and practitioner consultations
 * Includes calendar views (day, week, month) and list view with search and filters
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar, Plus, ChevronLeft, ChevronRight, Filter,
  Cpu, User, Clock, Check,
  CircleDot, CheckCircle2, PlayCircle, XCircle, AlertTriangle, Link,
  List, Search, Send, Eye, MoreHorizontal, Trash2
} from 'lucide-react';
import planningApi from '../../../api/planningApi';
import { usePermissions } from '../../auth/PermissionGuard';
import PlanningBookingModal from '../modals/PlanningBookingModal';
import SendConsentRequestModal from '../../modals/SendConsentRequestModal';


// Status icons and colors
const STATUS_CONFIG = {
  scheduled: { icon: CircleDot, color: 'text-yellow-600', bg: 'bg-yellow-100', title: 'scheduled' },
  confirmed: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100', title: 'confirmed' },
  in_progress: { icon: PlayCircle, color: 'text-blue-600', bg: 'bg-blue-100', title: 'in_progress' },
  completed: { icon: Check, color: 'text-gray-600', bg: 'bg-gray-100', title: 'completed' },
  cancelled: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', title: 'cancelled' },
  no_show: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-100', title: 'no_show' }
};

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
  const [viewMode, setViewMode] = useState('week'); // day, week, month, list
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [toast, setToast] = useState(null);

  // List view specific state
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [listPeriodFilter, setListPeriodFilter] = useState('thisWeek');
  const [listStatusFilter, setListStatusFilter] = useState('');
  const [listConsentFilter, setListConsentFilter] = useState('');
  const [listAppointments, setListAppointments] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentPatient, setConsentPatient] = useState(null);
  const [consentAppointmentId, setConsentAppointmentId] = useState(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);

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

  // List view: calculate date range based on period filter
  const listDateRange = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let start, end;

    switch (listPeriodFilter) {
      case 'today':
        start = end = today;
        break;
      case 'thisWeek': {
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(today);
        start.setDate(diff);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;
      }
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'nextWeek': {
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1) + 7;
        start = new Date(today);
        start.setDate(diff);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;
      }
      case 'nextMonth':
        start = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        end = new Date(today.getFullYear(), today.getMonth() + 2, 0);
        break;
      case 'past':
        start = new Date('2020-01-01');
        end = new Date(today);
        end.setDate(end.getDate() - 1);
        break;
      case 'all':
      default:
        start = new Date('2020-01-01');
        end = new Date('2099-12-31');
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  }, [listPeriodFilter]);

  // Load list view data
  const loadListData = useCallback(async () => {
    if (viewMode !== 'list') return;

    setListLoading(true);
    try {
      const params = {
        startDate: listDateRange.start,
        endDate: listDateRange.end,
        category: categoryFilter !== 'all' ? categoryFilter : undefined
      };

      const response = await planningApi.getCalendar(params);

      if (response.success) {
        let filtered = response.data || [];

        // Apply patient search filter
        if (listSearchQuery.trim()) {
          const query = listSearchQuery.toLowerCase().trim();
          filtered = filtered.filter(apt =>
            apt.patient?.fullName?.toLowerCase().includes(query) ||
            apt.patient?.firstName?.toLowerCase().includes(query) ||
            apt.patient?.lastName?.toLowerCase().includes(query)
          );
        }

        // Apply status filter
        if (listStatusFilter) {
          filtered = filtered.filter(apt => apt.status === listStatusFilter);
        }

        // Apply consent filter
        if (listConsentFilter) {
          filtered = filtered.filter(apt => {
            const consentStatus = apt.consentStatus || 'notRequired';
            return consentStatus === listConsentFilter;
          });
        }

        // Sort by date and time
        filtered.sort((a, b) => {
          const dateCompare = a.date.localeCompare(b.date);
          if (dateCompare !== 0) return dateCompare;
          const timeA = a.startTime ? a.startTime.split(':').map(Number) : [0, 0];
          const timeB = b.startTime ? b.startTime.split(':').map(Number) : [0, 0];
          return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
        });

        setListAppointments(filtered);
      }
    } catch (error) {
      console.error('Error loading list data:', error);
      showToast(t('messages.loadError'), 'error');
    } finally {
      setListLoading(false);
    }
  }, [viewMode, listDateRange, categoryFilter, listSearchQuery, listStatusFilter, listConsentFilter, t]);

  // Load list data when in list view
  useEffect(() => {
    if (viewMode === 'list') {
      const debounceTimer = setTimeout(() => {
        loadListData();
      }, 300);
      return () => clearTimeout(debounceTimer);
    }
  }, [viewMode, loadListData]);

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
    if (viewMode === 'list') {
      loadListData();
    }
  };

  // List view: handle row selection
  const handleRowSelect = (appointmentId) => {
    setSelectedRows(prev =>
      prev.includes(appointmentId)
        ? prev.filter(id => id !== appointmentId)
        : [...prev, appointmentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedRows.length === listAppointments.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(listAppointments.map(apt => apt.id));
    }
  };

  // List view: handle send consent
  const handleSendConsent = (appointment) => {
    setConsentPatient(appointment.patient);
    setConsentAppointmentId(appointment.id);
    setShowConsentModal(true);
    setActionMenuOpen(null);
  };

  const handleConsentSuccess = () => {
    showToast(t('messages.confirmSuccess'));
    setShowConsentModal(false);
    setConsentPatient(null);
    setConsentAppointmentId(null);
    loadListData();
  };

  // List view: handle delete
  const handleListDelete = async (appointment) => {
    setSelectedAppointment(appointment);
    setShowBookingModal(true);
    setActionMenuOpen(null);
  };

  // List view: format date for display
  const formatListDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  // List view: get consent status badge
  const getConsentBadge = (status) => {
    const configs = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: t('list.consent.pending') },
      sent: { bg: 'bg-blue-100', text: 'text-blue-800', label: t('list.consent.sent') },
      signed: { bg: 'bg-green-100', text: 'text-green-800', label: t('list.consent.signed') },
      notRequired: { bg: 'bg-gray-100', text: 'text-gray-600', label: t('list.consent.notRequired') }
    };
    const config = configs[status] || configs.notRequired;
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
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
        {/* Navigation - only show for calendar views */}
        <div className="flex items-center gap-2">
          {viewMode !== 'list' && (
            <>
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
            </>
          )}
          {viewMode === 'list' && (
            <span className="font-medium text-gray-900">{t('list.title')}</span>
          )}
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
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-sm rounded-md transition-colors flex items-center gap-1 ${
                viewMode === 'list'
                  ? 'bg-white shadow text-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-4 h-4" />
              {t('list.title')}
            </button>
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

      {/* Extended filters - only for calendar views */}
      {showFilters && viewMode !== 'list' && (
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

        {/* List View */}
        {viewMode === 'list' && (
          <div className="p-4">
            {/* List filters */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {/* Search */}
              <div className="relative flex-1 min-w-[250px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={listSearchQuery}
                  onChange={(e) => setListSearchQuery(e.target.value)}
                  placeholder={t('list.searchPatient')}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Period filter */}
              <select
                value={listPeriodFilter}
                onChange={(e) => setListPeriodFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{t('list.period.all')}</option>
                <option value="today">{t('list.period.today')}</option>
                <option value="thisWeek">{t('list.period.thisWeek')}</option>
                <option value="thisMonth">{t('list.period.thisMonth')}</option>
                <option value="nextWeek">{t('list.period.nextWeek')}</option>
                <option value="nextMonth">{t('list.period.nextMonth')}</option>
                <option value="past">{t('list.period.past')}</option>
              </select>

              {/* Status filter */}
              <select
                value={listStatusFilter}
                onChange={(e) => setListStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('filters.status')}</option>
                {Object.keys(STATUS_CONFIG).map(status => (
                  <option key={status} value={status}>{t(`statuses.${status}`)}</option>
                ))}
              </select>

              {/* Consent filter */}
              <select
                value={listConsentFilter}
                onChange={(e) => setListConsentFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('list.columns.consent')}</option>
                <option value="pending">{t('list.consent.pending')}</option>
                <option value="sent">{t('list.consent.sent')}</option>
                <option value="signed">{t('list.consent.signed')}</option>
                <option value="notRequired">{t('list.consent.notRequired')}</option>
              </select>
            </div>

            {/* Selected rows actions */}
            {selectedRows.length > 0 && (
              <div className="flex items-center gap-3 mb-3 p-2 bg-blue-50 rounded-lg">
                <span className="text-sm text-blue-700">
                  {t('list.selected', { count: selectedRows.length })}
                </span>
                <button
                  onClick={() => setSelectedRows([])}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {t('actions.cancel')}
                </button>
              </div>
            )}

            {/* Table */}
            {listLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : listAppointments.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>{t('list.noResults')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-3 py-2 text-left">
                        <input
                          type="checkbox"
                          checked={selectedRows.length === listAppointments.length && listAppointments.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('list.columns.date')}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('list.columns.time')}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('list.columns.patient')}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('list.columns.treatment')}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('list.columns.machine')}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('list.columns.status')}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('list.columns.consent')}
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        {t('list.columns.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {listAppointments.map((apt) => {
                      const statusConfig = STATUS_CONFIG[apt.status] || STATUS_CONFIG.scheduled;
                      const StatusIcon = statusConfig.icon;
                      const isLinked = apt.isLinked || apt.linkedAppointmentId || apt.linkSequence > 1;
                      const consentStatus = apt.consentStatus || 'notRequired';

                      return (
                        <tr
                          key={apt.id}
                          className={`hover:bg-gray-50 ${selectedRows.includes(apt.id) ? 'bg-blue-50' : ''}`}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedRows.includes(apt.id)}
                              onChange={() => handleRowSelect(apt.id)}
                              className="rounded border-gray-300"
                            />
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                            {formatListDate(apt.date)}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-gray-400" />
                              {apt.startTime} - {apt.endTime}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-gray-900">
                                {apt.patient?.fullName || 'Patient'}
                              </span>
                              {isLinked && (
                                <Link className="w-3 h-3 text-purple-500" title={t('appointment.linkedGroup')} />
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-600">
                            {apt.title || apt.service?.title || '-'}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-600">
                            {apt.machine?.name || apt.provider?.fullName || '-'}
                          </td>
                          <td className="px-3 py-2">
                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {t(`statuses.${apt.status}`)}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            {getConsentBadge(consentStatus)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="relative inline-block">
                              <button
                                onClick={() => setActionMenuOpen(actionMenuOpen === apt.id ? null : apt.id)}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                <MoreHorizontal className="w-4 h-4 text-gray-500" />
                              </button>

                              {/* Action dropdown */}
                              {actionMenuOpen === apt.id && (
                                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border z-20">
                                  <button
                                    onClick={() => {
                                      handleAppointmentClick(apt);
                                      setActionMenuOpen(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <Eye className="w-4 h-4 text-gray-500" />
                                    {t('actions.viewDetails')}
                                  </button>
                                  {apt.patient && (
                                    <button
                                      onClick={() => handleSendConsent(apt)}
                                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                    >
                                      <Send className="w-4 h-4 text-blue-500" />
                                      {t('actions.sendConsent')}
                                    </button>
                                  )}
                                  {canEdit && (
                                    <button
                                      onClick={() => handleListDelete(apt)}
                                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      {t('actions.delete')}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
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

      {/* Send Consent Modal */}
      {showConsentModal && consentPatient && (
        <SendConsentRequestModal
          isOpen={showConsentModal}
          onClose={() => {
            setShowConsentModal(false);
            setConsentPatient(null);
            setConsentAppointmentId(null);
          }}
          patient={consentPatient}
          appointmentId={consentAppointmentId}
          onSuccess={handleConsentSuccess}
        />
      )}

      {/* Click outside handler for action menu */}
      {actionMenuOpen && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setActionMenuOpen(null)}
        />
      )}
    </div>
  );
};

export default PlanningModule;
