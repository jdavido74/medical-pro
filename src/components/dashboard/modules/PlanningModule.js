/**
 * PlanningModule - Unified appointment planning
 * Handles both machine-based treatments and practitioner consultations
 * Includes calendar views (day, week, month) and list view with search and filters
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar, Plus, ChevronLeft, ChevronRight, Filter,
  Cpu, User, Clock, Check, X, Edit2, Bell, FileText, Receipt,
  CircleDot, CheckCircle2, PlayCircle, XCircle, AlertTriangle, Link,
  List, Search, Send, Eye, MoreHorizontal, Trash2, ArrowUp, ArrowDown, Layers, Copy, RefreshCw
} from 'lucide-react';
import planningApi, { getAppointmentGroup } from '../../../api/planningApi';
import { clinicSettingsApi } from '../../../api/clinicSettingsApi';
import { usePermissions } from '../../auth/PermissionGuard';
import PlanningBookingModal from '../modals/PlanningBookingModal';
import DuplicateBookingModal from '../modals/DuplicateBookingModal';
import { extractDuplicateData } from '../../../utils/duplicateAppointment';
import SendConsentRequestModal from '../../modals/SendConsentRequestModal';
import InvoiceFormModal from '../modals/InvoiceFormModal';
import QuoteFormModal from '../modals/QuoteFormModal';
import { createDocument, updateDocument, getDocument, buildDocumentPayload, getBillingSettings, transformDocumentForDisplay, fetchClientForBilling } from '../../../api/documentsApi';
import { STATUS_CONFIG } from '../../../constants/appointmentStatuses';

// Time grid constants for day view
const DAY_START_HOUR = 7;  // 7:00
const DAY_END_HOUR = 21;   // 21:00
const PIXELS_PER_MINUTE = 2.0; // Height scale
const MAX_COLUMNS = 6;     // Maximum columns before horizontal scroll

// Format date to YYYY-MM-DD without timezone conversion issues
const formatDateLocal = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Convert time string "HH:MM" to minutes since midnight
const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Convert minutes since midnight to "HH:MM"
const minutesToTime = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// FACTORIZED: Group consecutive same-patient appointments together
// Returns array of groups, each group contains consecutive appointments for one patient
// Used by both week view and day view
const groupConsecutivePatientAppointments = (appointments) => {
  if (!appointments || appointments.length === 0) return [];

  // Add patientId and time in minutes for easier processing
  const items = appointments.map(apt => ({
    ...apt,
    patientId: apt.patientId || apt.patient?.id,
    startMinutes: timeToMinutes(apt.startTime),
    endMinutes: timeToMinutes(apt.endTime) || (timeToMinutes(apt.startTime) + (apt.duration || 30))
  }));

  // Sort by start time
  items.sort((a, b) => a.startMinutes - b.startMinutes);

  const groups = [];
  const processed = new Set();

  for (const apt of items) {
    if (processed.has(apt.id)) continue;

    const group = [{ ...apt, isConsecutive: false }];
    processed.add(apt.id);

    if (apt.patientId) {
      // Find all consecutive appointments for this patient
      let lastEndMinutes = apt.endMinutes;
      let foundMore = true;

      while (foundMore) {
        foundMore = false;
        for (const other of items) {
          if (processed.has(other.id)) continue;
          if (other.patientId === apt.patientId && other.startMinutes === lastEndMinutes) {
            group.push({ ...other, isConsecutive: true });
            processed.add(other.id);
            lastEndMinutes = other.endMinutes;
            foundMore = true;
            break;
          }
        }
      }
    }

    groups.push({
      appointments: group,
      startMinutes: apt.startMinutes,
      patientId: apt.patientId
    });
  }

  // Sort groups by start time
  groups.sort((a, b) => a.startMinutes - b.startMinutes);

  return groups;
};

// Calculate layout for overlapping appointments (day view)
// Uses groupConsecutivePatientAppointments and adds column positioning
const calculateDayViewLayout = (appointments) => {
  if (!appointments || appointments.length === 0) return [];

  const groups = groupConsecutivePatientAppointments(appointments);

  // Flatten groups while preserving isConsecutive flag
  const items = groups.flatMap(g => g.appointments);

  // Find collision groups (appointments that overlap with each other)
  const collisionGroups = [];
  let currentGroup = [];
  let groupEnd = 0;

  for (const item of items) {
    if (currentGroup.length === 0 || item.startMinutes < groupEnd) {
      currentGroup.push(item);
      groupEnd = Math.max(groupEnd, item.endMinutes);
    } else {
      if (currentGroup.length > 0) {
        collisionGroups.push([...currentGroup]);
      }
      currentGroup = [item];
      groupEnd = item.endMinutes;
    }
  }
  if (currentGroup.length > 0) {
    collisionGroups.push(currentGroup);
  }

  // Assign columns within each collision group
  const result = [];

  for (const group of collisionGroups) {
    const columns = [];
    const patientColumns = new Map();

    for (const item of group) {
      let columnIndex = -1;

      // Check if this patient already has a column
      if (item.patientId && patientColumns.has(item.patientId)) {
        const existingCol = patientColumns.get(item.patientId);
        if (columns[existingCol].endMinutes <= item.startMinutes) {
          columnIndex = existingCol;
        }
      }

      // Find first available column
      if (columnIndex === -1) {
        columnIndex = 0;
        while (columnIndex < columns.length && columns[columnIndex].endMinutes > item.startMinutes) {
          columnIndex++;
        }
      }

      // Assign column
      if (columnIndex >= columns.length) {
        columns.push({ endMinutes: item.endMinutes, patientId: item.patientId });
      } else {
        columns[columnIndex].endMinutes = item.endMinutes;
        columns[columnIndex].patientId = item.patientId;
      }

      if (item.patientId) {
        patientColumns.set(item.patientId, columnIndex);
      }

      result.push({
        ...item,
        column: columnIndex,
        totalColumns: 1
      });
    }

    // Update totalColumns
    const maxCols = Math.min(MAX_COLUMNS, columns.length);
    for (let i = result.length - group.length; i < result.length; i++) {
      result[i].totalColumns = maxCols;
    }
  }

  return result;
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
  const [clinicSettings, setClinicSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week'); // day, week, month, list
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [machineFilter, setMachineFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [toast, setToast] = useState(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryAppointment, setSummaryAppointment] = useState(null);

  // Hover popover state
  const [hoveredAppointment, setHoveredAppointment] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const hoverTimeoutRef = useRef(null);
  const popoverRef = useRef(null);

  // List view specific state
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [listPeriodFilter, setListPeriodFilter] = useState('today');
  const listTableRef = useRef(null);
  const [listStatusFilter, setListStatusFilter] = useState('');
  const [listConsentFilter, setListConsentFilter] = useState('');
  const [listAppointments, setListAppointments] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentPatient, setConsentPatient] = useState(null);
  const [consentAppointmentId, setConsentAppointmentId] = useState(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);

  // Billing state
  const [showBillingQuoteModal, setShowBillingQuoteModal] = useState(false);
  const [showBillingInvoiceModal, setShowBillingInvoiceModal] = useState(false);
  const [billingSettings, setBillingSettings] = useState(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [editingBillingQuote, setEditingBillingQuote] = useState(null);
  const [editingBillingInvoice, setEditingBillingInvoice] = useState(null);

  // Duplicate state
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateData, setDuplicateData] = useState(null);
  const [duplicateLoading, setDuplicateLoading] = useState(false);

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
      start: formatDateLocal(start),
      end: formatDateLocal(end)
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
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
          machineId: machineFilter || undefined
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
  }, [dateRange, categoryFilter, machineFilter, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load clinic settings once
  useEffect(() => {
    const loadClinicSettings = async () => {
      try {
        const settings = await clinicSettingsApi.getClinicSettings();
        setClinicSettings(settings);
      } catch (error) {
        console.error('Error loading clinic settings:', error);
      }
    };
    loadClinicSettings();
  }, []);

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
      start: formatDateLocal(start),
      end: formatDateLocal(end)
    };
  }, [listPeriodFilter]);

  // Check if a date is a closed day (not an operating day or in closedDates)
  const isClosedDay = useCallback((date) => {
    if (!clinicSettings) return false;

    const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, ...
    const dateStr = formatDateLocal(date);

    // Check if it's not an operating day
    const operatingDays = clinicSettings.operatingDays || [1, 2, 3, 4, 5]; // Default Mon-Fri
    if (!operatingDays.includes(dayOfWeek)) {
      return true;
    }

    // Check if it's in the closed dates list
    const closedDates = clinicSettings.closedDates || [];
    if (closedDates.some(cd => cd.date === dateStr || cd === dateStr)) {
      return true;
    }

    return false;
  }, [clinicSettings]);

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

  // Auto-scroll to the first appointment near the current time
  useEffect(() => {
    if (viewMode !== 'list' || listLoading || listAppointments.length === 0) return;

    const container = listTableRef.current;
    if (!container) return;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const todayStr = formatDateLocal(now);

    // Find the first appointment at or after the current time today
    let targetIndex = -1;
    for (let i = 0; i < listAppointments.length; i++) {
      const apt = listAppointments[i];
      if (apt.date === todayStr && apt.startTime) {
        const [h, m] = apt.startTime.split(':').map(Number);
        if (h * 60 + m >= currentMinutes) {
          targetIndex = i;
          break;
        }
      }
    }

    // If no future appointment today, scroll to the last one of today
    if (targetIndex === -1) {
      for (let i = listAppointments.length - 1; i >= 0; i--) {
        if (listAppointments[i].date === todayStr) {
          targetIndex = i;
          break;
        }
      }
    }

    if (targetIndex >= 0) {
      const rows = container.querySelectorAll('tbody tr');
      if (rows[targetIndex]) {
        rows[targetIndex].scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  }, [viewMode, listLoading, listAppointments]);

  // Quick status change from list view
  const handleQuickStatusChange = async (appointmentId, newStatus) => {
    try {
      await planningApi.updateAppointment(appointmentId, { status: newStatus });
      // Update local state immediately for responsive UI
      setListAppointments(prev => prev.map(apt =>
        apt.id === appointmentId ? { ...apt, status: newStatus } : apt
      ));
      showToast(t(`statuses.${newStatus}`), 'success');
    } catch (error) {
      console.error('Error updating status:', error);
      const msg = error?.response?.data?.error?.message || error.message || t('messages.saveError');
      showToast(msg, 'error');
    }
  };

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
    for (const apt of appointments.filter(a => a.status !== 'cancelled')) {
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

  // Summary modal handlers
  const handleAppointmentSummaryClick = (appointment) => {
    setSummaryAppointment(appointment);
    setShowSummaryModal(true);
  };

  const handleSummaryEdit = () => {
    setShowSummaryModal(false);
    setSelectedAppointment(summaryAppointment);
    setShowBookingModal(true);
  };

  const handleSummaryDelete = () => {
    setShowSummaryModal(false);
    setSelectedAppointment(summaryAppointment);
    setShowBookingModal(true);
    // The booking modal handles delete
  };

  const handleSummarySendConsent = () => {
    if (summaryAppointment?.patient) {
      setShowSummaryModal(false);
      setConsentPatient(summaryAppointment.patient);
      setConsentAppointmentId(summaryAppointment.id);
      setShowConsentModal(true);
    }
  };

  const handleSummaryAddSuperposed = () => {
    setShowSummaryModal(false);
    // Open booking modal in superposition mode with pre-filled data
    setSelectedAppointment({
      _superpositionMode: true,
      patientId: summaryAppointment.patientId,
      patient: summaryAppointment.patient,
      date: summaryAppointment.date,
      startTime: summaryAppointment.startTime,
      category: 'treatment'
    });
    setShowBookingModal(true);
  };

  const handleSummaryDuplicate = async () => {
    if (!summaryAppointment) return;
    console.log('[Duplicate] Starting extraction for appointment:', {
      id: summaryAppointment.id, isLinked: summaryAppointment.isLinked,
      linkedAppointmentId: summaryAppointment.linkedAppointmentId,
      linkSequence: summaryAppointment.linkSequence,
      serviceId: summaryAppointment.serviceId, category: summaryAppointment.category
    });
    setDuplicateLoading(true);
    try {
      const t0 = performance.now();
      const data = await extractDuplicateData(summaryAppointment);
      console.log('[Duplicate] Extraction done in', Math.round(performance.now() - t0), 'ms, treatments:', data.treatments?.length, data);
      setShowSummaryModal(false);
      setDuplicateData(data);
      setShowDuplicateModal(true);
    } catch (err) {
      console.error('Duplicate extract error:', err);
      showToast(t('duplicate.error'), 'error');
    } finally {
      setDuplicateLoading(false);
    }
  };

  const handleSummarySendReminder = async () => {
    if (!summaryAppointment) return;
    try {
      // TODO: Implement reminder API call
      showToast(t('messages.reminderSent'), 'success');
      setShowSummaryModal(false);
    } catch (error) {
      showToast(t('messages.reminderError'), 'error');
    }
  };

  // === Billing integration ===
  const [billingItems, setBillingItems] = useState([]);

  const loadBillingData = useCallback(async () => {
    if (billingSettings) return;
    setBillingLoading(true);
    try {
      const settingsRes = await getBillingSettings();
      setBillingSettings(settingsRes.data || settingsRes);
    } catch (err) {
      console.error('Error loading billing data:', err);
      showToast(t('billing.loadError', 'Erreur chargement facturation'), 'error');
    } finally {
      setBillingLoading(false);
    }
  }, [billingSettings, t]);

  // Build billing items from appointment(s), including linked group treatments with catalog prices
  const loadBillingItems = useCallback(async () => {
    if (!summaryAppointment) return [];

    let appointmentsToProcess = [summaryAppointment];

    // If linked (multi-treatment), fetch the full group
    if (summaryAppointment.isLinked) {
      const groupId = summaryAppointment.linkedAppointmentId || summaryAppointment.id;
      try {
        const res = await getAppointmentGroup(groupId);
        const groupAppts = res.data?.appointments || res.data || [];
        if (groupAppts.length > 0) {
          appointmentsToProcess = groupAppts;
        }
      } catch (err) {
        console.error('Error fetching appointment group:', err);
      }
    }

    const items = appointmentsToProcess.map((apt, i) => ({
      id: Date.now() + i,
      description: apt.service?.title || apt.title || '',
      quantity: 1,
      unitPrice: apt.service?.unitPrice ?? 0,
      taxRate: apt.service?.taxRate ?? null
    }));

    return items.length > 0 ? items : [{ id: Date.now(), description: summaryAppointment.title || '', quantity: 1, unitPrice: 0, taxRate: null }];
  }, [summaryAppointment]);

  const handleSummaryCreateQuote = useCallback(async () => {
    setBillingLoading(true);
    try {
      await loadBillingData();

      // If appointment already has a quote, open it for editing
      if (summaryAppointment?.quoteId) {
        const docRes = await getDocument(summaryAppointment.quoteId);
        const doc = docRes.data || docRes;
        setEditingBillingQuote(transformDocumentForDisplay(doc));
        setBillingItems([]);
        setShowBillingQuoteModal(true);
        return;
      }

      const items = await loadBillingItems();
      setBillingItems(items);
      setEditingBillingQuote(null);
      setShowBillingQuoteModal(true);
    } catch (err) {
      console.error('Error opening quote modal:', err);
      showToast(t('billing.loadError', 'Erreur chargement'), 'error');
    } finally {
      setBillingLoading(false);
    }
  }, [loadBillingData, loadBillingItems, summaryAppointment, t]);

  const handleSummaryCreateInvoice = useCallback(async () => {
    setBillingLoading(true);
    try {
      await loadBillingData();

      // If appointment already has an invoice, open it for editing
      if (summaryAppointment?.invoiceId) {
        const docRes = await getDocument(summaryAppointment.invoiceId);
        const doc = docRes.data || docRes;
        setEditingBillingInvoice(transformDocumentForDisplay(doc));
        setBillingItems([]);
        setShowBillingInvoiceModal(true);
        return;
      }

      const items = await loadBillingItems();
      setBillingItems(items);
      setEditingBillingInvoice(null);
      setShowBillingInvoiceModal(true);
    } catch (err) {
      console.error('Error opening invoice modal:', err);
      showToast(t('billing.loadError', 'Erreur chargement'), 'error');
    } finally {
      setBillingLoading(false);
    }
  }, [loadBillingData, loadBillingItems, summaryAppointment, t]);

  const handleSaveBillingDoc = useCallback(async (formData, documentType) => {
    try {
      const selectedClient = await fetchClientForBilling(formData.clientId);

      const enrichedFormData = {
        ...formData,
        appointmentId: summaryAppointment?.id || null,
        practitionerId: summaryAppointment?.providerId || null
      };
      const payload = buildDocumentPayload(documentType, enrichedFormData, billingSettings, selectedClient);

      // Edit existing or create new
      const editingDoc = documentType === 'quote' ? editingBillingQuote : editingBillingInvoice;
      if (editingDoc?.id) {
        await updateDocument(editingDoc.id, payload);
        showToast(documentType === 'quote' ? t('billing.quoteUpdated', 'Devis mis à jour') : t('billing.invoiceUpdated', 'Facture mise à jour'), 'success');
      } else {
        await createDocument(payload);
        showToast(documentType === 'quote' ? t('billing.quoteCreated', 'Devis créé') : t('billing.invoiceCreated', 'Facture créée'), 'success');
        // Refresh appointment data so quoteId/invoiceId get updated
        await loadData();
      }
    } catch (err) {
      console.error('Error saving billing document:', err);
      throw err;
    }
  }, [billingSettings, summaryAppointment, editingBillingQuote, editingBillingInvoice, t, loadData]);

  const handleBookingSave = async (result) => {
    const isDeleted = result?.deleted;
    const isUpdate = !!selectedAppointment;
    setShowBookingModal(false);
    setSelectedAppointment(null);
    setSummaryAppointment(null);
    showToast(isDeleted ? t('messages.cancelSuccess') : isUpdate ? t('messages.updateSuccess') : t('messages.createSuccess'));
    await loadData();
    if (viewMode === 'list') {
      await loadListData();
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

  // Get appointment display data (factorized for both views)
  const getAppointmentDisplayData = (apt, dateStr) => {
    const statusConfig = STATUS_CONFIG[apt.status] || STATUS_CONFIG.scheduled;
    const patientId = apt.patientId || apt.patient?.id;
    const colorKey = `${dateStr || apt.date}-${patientId}`;
    const colorIndex = patientColorMap[colorKey] ?? 0;
    const patientColors = PATIENT_COLORS[colorIndex];
    const duration = apt.duration || 30;
    const isLinked = apt.isLinked || apt.linkedAppointmentId || apt.linkSequence > 1;
    const categoryIndicator = apt.category === 'treatment'
      ? { icon: Cpu, color: 'text-blue-600' }
      : { icon: User, color: 'text-purple-600' };

    return { statusConfig, patientColors, duration, isLinked, categoryIndicator };
  };

  // Find consecutive siblings for a given appointment (previous and next for same patient on same day)
  const findConsecutiveSiblings = useCallback((apt) => {
    const dateStr = apt.date;
    const dayAppts = appointmentsByDate[dateStr] || [];
    const patientId = apt.patientId || apt.patient?.id;
    if (!patientId) return { prev: null, next: null };

    const aptStartMin = timeToMinutes(apt.startTime);
    const aptEndMin = timeToMinutes(apt.endTime) || (aptStartMin + (apt.duration || 30));

    let prev = null;
    let next = null;

    for (const other of dayAppts) {
      if (other.id === apt.id) continue;
      const otherId = other.patientId || other.patient?.id;
      if (otherId !== patientId) continue;

      const otherStart = timeToMinutes(other.startTime);
      const otherEnd = timeToMinutes(other.endTime) || (otherStart + (other.duration || 30));

      // Previous: ends exactly when this one starts
      if (otherEnd === aptStartMin) prev = other;
      // Next: starts exactly when this one ends
      if (otherStart === aptEndMin) next = other;
    }

    return { prev, next };
  }, [appointmentsByDate]);

  // Hover handlers
  const handleAppointmentMouseEnter = useCallback((e, apt) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    // Position popover to the right of the card, or left if not enough space
    const spaceRight = window.innerWidth - rect.right;
    const x = spaceRight > 340 ? rect.right + 8 : rect.left - 328;
    // Vertically centered on the card, but clamped to viewport
    const y = Math.max(8, Math.min(rect.top, window.innerHeight - 300));
    setHoverPosition({ x, y });
    setHoveredAppointment(apt);
  }, []);

  const handleAppointmentMouseLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredAppointment(null);
    }, 150);
  }, []);

  const handlePopoverMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  }, []);

  const handlePopoverMouseLeave = useCallback(() => {
    setHoveredAppointment(null);
  }, []);

  // Get initials from a name (e.g., "Machine Laser 1" -> "ML1", "Dr. Jean Dupont" -> "JD")
  const getInitials = (name) => {
    if (!name) return '';
    // Remove common prefixes
    const cleaned = name.replace(/^(Dr\.?|Machine|Mme\.?|M\.?)\s*/i, '');
    // Get first letter of each word + any numbers
    const parts = cleaned.split(/\s+/);
    let initials = parts.map(p => {
      const letters = p.match(/^[A-Za-zÀ-ÿ]/);
      const numbers = p.match(/\d+/);
      return (letters ? letters[0].toUpperCase() : '') + (numbers ? numbers[0] : '');
    }).join('');
    return initials || name.substring(0, 3).toUpperCase();
  };

  // Render appointment content (factorized - used by both week and day views)
  // height parameter controls which elements are shown:
  // - < 35px: time + icons only (ultra compact)
  // Adaptive content display based on available height:
  // - < 35px: time + icons only
  // - 35-50px: + patient name
  // - 50-80px: + treatment title with resource initials
  // - 80-100px: + full resource name (machine or provider)
  // - >= 100px: + notes/reason
  // hidePatientName: for consecutive same-patient appointments
  const renderAppointmentContent = (apt, displayData, height = 100, hidePatientName = false) => {
    const { statusConfig, isLinked, categoryIndicator, duration } = displayData;
    const StatusIcon = statusConfig.icon;
    const CategoryIcon = categoryIndicator.icon;

    const showPatient = height >= 35 && !hidePatientName;
    const showTitle = height >= 45;
    const showDuration = height >= 55;
    const showResource = height >= 75;
    const showNotes = height >= 95;

    // Get resource info
    const resourceName = apt.category === 'treatment' && apt.machine
      ? apt.machine.name
      : apt.category === 'consultation' && apt.provider
        ? apt.provider.fullName
        : '';

    const resourceInitials = resourceName ? getInitials(resourceName) : '';

    // Build title - include initials only if we're not showing full resource name
    const titleDisplay = apt.title || apt.service?.title || '';
    const titleWithInitials = showResource
      ? titleDisplay
      : titleDisplay
        ? resourceInitials ? `${titleDisplay} (${resourceInitials})` : titleDisplay
        : resourceInitials ? `(${resourceInitials})` : '';

    // Notes or reason to display
    const notesText = apt.notes || apt.reason || '';

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header: time + icons */}
        <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
          <Clock className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{apt.startTime}-{apt.endTime}</span>
          {showDuration && <span className="text-gray-400 flex-shrink-0">({duration}min)</span>}
          <div className="flex items-center gap-0.5 ml-auto flex-shrink-0">
            <CategoryIcon className={`w-3 h-3 ${categoryIndicator.color}`} title={t(`categories.${apt.category}`)} />
            {isLinked && (
              <Link className="w-3 h-3 text-purple-500" title={t('appointment.linkedGroup')} />
            )}
            <StatusIcon
              className={`w-3.5 h-3.5 ${statusConfig.color}`}
              title={t(`statuses.${apt.status}`)}
            />
          </div>
        </div>

        {/* Patient name */}
        {showPatient && (
          <div className="font-medium text-sm text-gray-900 truncate leading-tight">
            {apt.patient?.fullName || 'Patient'}
          </div>
        )}

        {/* Treatment/Service title */}
        {showTitle && titleWithInitials && (
          <div className="text-xs text-gray-700 truncate leading-tight">
            {titleWithInitials}
          </div>
        )}

        {/* Full resource name (machine or provider) */}
        {showResource && resourceName && (
          <div className="text-xs text-gray-500 truncate leading-tight flex items-center gap-1">
            {apt.category === 'treatment' ? (
              <Cpu className="w-3 h-3 flex-shrink-0" />
            ) : (
              <User className="w-3 h-3 flex-shrink-0" />
            )}
            {resourceName}
          </div>
        )}

        {/* Overlappable badge */}
        {apt.isOverlappable && showDuration && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded w-fit">
            <Layers className="w-2.5 h-2.5" />
            {t('superposition.badge', 'Superposable')}
          </span>
        )}

        {/* Notes or reason */}
        {showNotes && notesText && (
          <div className="text-xs text-gray-400 truncate leading-tight mt-auto italic">
            {notesText}
          </div>
        )}
      </div>
    );
  };

  // Render appointment card for week view (height proportional to duration)
  // isConsecutive: true if this follows a same-patient appointment with no gap
  const renderAppointment = (apt, dateStr, isConsecutive = false) => {
    const displayData = getAppointmentDisplayData(apt, dateStr);
    const { patientColors, duration } = displayData;

    // Calculate height based on duration
    // Scale: 1.8px per minute, minimum 75px for readability
    const calculatedHeight = Math.max(75, Math.round(duration * 1.8));
    // Content height = card height - padding (2*8px = 16px)
    const contentHeight = calculatedHeight - 16;

    // Adjust border radius for consecutive appointments
    const borderRadius = isConsecutive ? 'rounded-b-lg rounded-t-none' : 'rounded-lg';

    return (
      <div
        key={apt.id}
        onClick={() => handleAppointmentSummaryClick(apt)}
        onMouseEnter={(e) => handleAppointmentMouseEnter(e, apt)}
        onMouseLeave={handleAppointmentMouseLeave}
        className={`p-2 ${borderRadius} border-l-4 border cursor-pointer hover:shadow-md transition-shadow overflow-hidden ${patientColors.bg} ${patientColors.border} ${patientColors.accent}`}
        style={{ height: `${calculatedHeight}px` }}
      >
        {renderAppointmentContent(apt, displayData, contentHeight, isConsecutive)}
      </div>
    );
  };

  // Render appointment card for day view (absolute positioning with collision handling)
  const renderDayViewAppointment = (item, dateStr) => {
    const displayData = getAppointmentDisplayData(item, dateStr);
    const { patientColors } = displayData;

    // Position calculations
    const startFromDayStart = item.startMinutes - (DAY_START_HOUR * 60);
    const durationMinutes = item.endMinutes - item.startMinutes;
    const top = startFromDayStart * PIXELS_PER_MINUTE;
    const height = Math.max(durationMinutes * PIXELS_PER_MINUTE, 30); // Min 30px

    // Width and left position based on columns
    const columnWidth = 100 / item.totalColumns;
    const left = item.column * columnWidth;

    // Content height = card height - padding (2*6px = 12px)
    const contentHeight = height - 12;

    // isConsecutive is set by calculateDayViewLayout
    const isConsecutive = item.isConsecutive || false;

    // Adjust border radius for consecutive appointments
    const borderRadius = isConsecutive ? 'rounded-b border-t-0' : 'rounded';
    const isOverlappable = item.isOverlappable === true;
    const borderStyle = isOverlappable ? 'border-dashed' : '';

    return (
      <div
        key={item.id}
        onClick={() => handleAppointmentSummaryClick(item)}
        onMouseEnter={(e) => handleAppointmentMouseEnter(e, item)}
        onMouseLeave={handleAppointmentMouseLeave}
        className={`absolute p-1.5 ${borderRadius} border-l-4 border ${borderStyle} cursor-pointer hover:shadow-lg hover:z-20 transition-shadow overflow-hidden ${patientColors.bg} ${patientColors.border} ${patientColors.accent}`}
        style={{
          top: `${top}px`,
          height: `${height}px`,
          left: `calc(${left}% + 2px)`,
          width: `calc(${columnWidth}% - 4px)`,
          zIndex: 10
        }}
      >
        {renderAppointmentContent(item, displayData, contentHeight, isConsecutive)}
      </div>
    );
  };

  // Render day header for week view
  const renderDayHeader = (day) => {
    const dateStr = formatDateLocal(day);
    const isToday = dateStr === formatDateLocal(new Date());
    const isClosed = isClosedDay(day);

    let bgClass = 'bg-gray-50';
    if (isClosed) {
      bgClass = 'bg-gray-200';
    } else if (isToday) {
      bgClass = 'bg-blue-50';
    }

    return (
      <div
        key={`header-${dateStr}`}
        className={`flex-1 min-w-[140px] p-2 text-center border-r last:border-r-0 ${bgClass}`}
      >
        <div className={`text-xs ${isClosed ? 'text-gray-400' : 'text-gray-500'}`}>
          {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
        </div>
        <div className={`text-lg font-semibold ${isClosed ? 'text-gray-400' : isToday ? 'text-blue-600' : 'text-gray-900'}`}>
          {day.getDate()}
        </div>
        {isClosed && (
          <div className="text-xs text-gray-400 font-medium">{t('calendar.closed')}</div>
        )}
      </div>
    );
  };

  // Render day content for week view
  // Uses factorized groupConsecutivePatientAppointments function
  const renderDayContent = (day) => {
    const dateStr = formatDateLocal(day);
    const dayAppointments = appointmentsByDate[dateStr] || [];
    const groups = groupConsecutivePatientAppointments(dayAppointments);
    const isClosed = isClosedDay(day);

    return (
      <div
        key={`content-${dateStr}`}
        className={`flex-1 min-w-[140px] border-r last:border-r-0 p-2 ${isClosed ? 'bg-gray-100 bg-stripes' : ''}`}
        style={isClosed ? {
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.03) 20px)'
        } : {}}
      >
        {isClosed ? (
          <div className="text-xs text-gray-400 text-center py-8">
            <X className="w-5 h-5 mx-auto mb-1 opacity-30" />
            {t('calendar.clinicClosed')}
          </div>
        ) : groups.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-4">
            {t('calendar.noAppointments')}
          </div>
        ) : (
          groups.map((group, groupIndex) => (
            <div key={`group-${groupIndex}`} className={groupIndex > 0 ? 'mt-2' : ''}>
              {group.appointments.map((apt) => (
                <div
                  key={apt.id}
                  className={apt.isConsecutive ? '-mt-1' : ''}
                >
                  {renderAppointment(apt, dateStr, apt.isConsecutive)}
                </div>
              ))}
            </div>
          ))
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
    <div className="flex flex-col gap-4 h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{t('title')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
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
      <div className="flex items-center justify-between bg-white rounded-lg border p-3 flex-shrink-0">
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
        <div className="bg-white rounded-lg border p-4 flex-shrink-0">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('filters.machine')}
              </label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={machineFilter}
                onChange={(e) => setMachineFilter(e.target.value)}
              >
                <option value="">{t('filters.allMachines')}</option>
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
      <div className="bg-white rounded-lg border overflow-hidden flex-1 min-h-0">
        {viewMode === 'week' && (
          <div className="flex flex-col h-full">
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
          <div className="flex h-full overflow-auto">
            {/* Time column */}
            <div className="flex-shrink-0 w-16 bg-gray-50 border-r sticky left-0 z-10">
              {Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => {
                const hour = DAY_START_HOUR + i;
                return (
                  <div
                    key={hour}
                    className="relative border-b border-gray-200"
                    style={{ height: `${60 * PIXELS_PER_MINUTE}px` }}
                  >
                    {/* Hour label positioned at top, aligned with grid line */}
                    <span
                      className="absolute right-2 text-xs text-gray-500 font-medium"
                      style={{ top: '-0.5em' }}
                    >
                      {hour.toString().padStart(2, '0')}:00
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Appointments grid */}
            <div className="flex-1">
              {(() => {
                const dayDateStr = formatDateLocal(currentDate);
                const dayAppts = appointmentsByDate[dayDateStr] || [];
                const layoutItems = calculateDayViewLayout(dayAppts);
                const totalHeight = (DAY_END_HOUR - DAY_START_HOUR + 1) * 60 * PIXELS_PER_MINUTE;
                const hasOverflow = layoutItems.some(item => item.column >= MAX_COLUMNS);
                const containerMinWidth = hasOverflow ? `${Math.max(...layoutItems.map(i => i.column + 1)) * 180}px` : '100%';
                const isClosed = isClosedDay(currentDate);

                return (
                  <div
                    className={`relative ${isClosed ? 'bg-gray-100' : ''}`}
                    style={{
                      height: `${totalHeight}px`,
                      minWidth: containerMinWidth,
                      ...(isClosed ? {
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.03) 20px)'
                      } : {})
                    }}
                  >
                    {/* Hour grid lines */}
                    {Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => (
                      <div
                        key={`grid-${i}`}
                        className="absolute left-0 right-0 border-b border-gray-100"
                        style={{ top: `${i * 60 * PIXELS_PER_MINUTE}px` }}
                      />
                    ))}

                    {/* Half-hour lines (lighter) */}
                    {Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => (
                      <div
                        key={`grid-half-${i}`}
                        className="absolute left-0 right-0 border-b border-gray-50"
                        style={{ top: `${(i * 60 + 30) * PIXELS_PER_MINUTE}px` }}
                      />
                    ))}

                    {/* Closed day message */}
                    {isClosed && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-gray-400 text-center">
                          <X className="w-12 h-12 mx-auto mb-2 opacity-30" />
                          <p className="text-lg font-medium">{t('calendar.clinicClosed')}</p>
                        </div>
                      </div>
                    )}

                    {/* No appointments message */}
                    {!isClosed && layoutItems.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                        {t('calendar.noAppointments')}
                      </div>
                    )}

                    {/* Appointment cards */}
                    {!isClosed && layoutItems.map(item => renderDayViewAppointment(item, dayDateStr))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {viewMode === 'month' && (
          <div className="p-4 text-center text-gray-500">
            Vue mensuelle - En développement
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* List filters */}
            <div className="flex flex-wrap items-center gap-3 p-4 pb-0 mb-4 flex-shrink-0">
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
              <div className="flex items-center gap-3 mb-3 mx-4 p-2 bg-blue-50 rounded-lg flex-shrink-0">
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
              <div className="flex items-center justify-center py-12 flex-1">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : listAppointments.length === 0 ? (
              <div className="text-center py-12 text-gray-500 flex-1">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>{t('list.noResults')}</p>
              </div>
            ) : (
              <div ref={listTableRef} className="overflow-auto flex-1 min-h-0 px-4">
                <table className="w-full">
                  <thead className="sticky top-0 z-10">
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
                      <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase">
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
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              {/* Quick status action buttons */}
                              {apt.status === 'scheduled' && (
                                <>
                                  <button
                                    onClick={() => handleQuickStatusChange(apt.id, 'confirmed')}
                                    className="px-2.5 py-1 text-xs font-medium rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors"
                                  >
                                    {t('actions.confirm')}
                                  </button>
                                  <button
                                    onClick={() => handleQuickStatusChange(apt.id, 'no_show')}
                                    className="px-2 py-1 text-xs font-medium rounded-md border border-orange-300 text-orange-600 hover:bg-orange-50 transition-colors"
                                  >
                                    {t('actions.noShow')}
                                  </button>
                                  <button
                                    onClick={() => handleQuickStatusChange(apt.id, 'cancelled')}
                                    className="px-2 py-1 text-xs font-medium rounded-md border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
                                  >
                                    {t('actions.cancel')}
                                  </button>
                                </>
                              )}
                              {apt.status === 'confirmed' && (
                                <>
                                  <button
                                    onClick={() => handleQuickStatusChange(apt.id, 'in_progress')}
                                    className="px-2.5 py-1 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                                  >
                                    {t('actions.start')}
                                  </button>
                                  <button
                                    onClick={() => handleQuickStatusChange(apt.id, 'completed')}
                                    className="px-2 py-1 text-xs font-medium rounded-md border border-green-300 text-green-600 hover:bg-green-50 transition-colors"
                                  >
                                    {t('actions.completed')}
                                  </button>
                                  <button
                                    onClick={() => handleQuickStatusChange(apt.id, 'no_show')}
                                    className="px-2 py-1 text-xs font-medium rounded-md border border-orange-300 text-orange-600 hover:bg-orange-50 transition-colors"
                                  >
                                    {t('actions.noShow')}
                                  </button>
                                  <button
                                    onClick={() => handleQuickStatusChange(apt.id, 'cancelled')}
                                    className="px-2 py-1 text-xs font-medium rounded-md border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
                                  >
                                    {t('actions.cancel')}
                                  </button>
                                </>
                              )}
                              {apt.status === 'in_progress' && (
                                <>
                                  <button
                                    onClick={() => handleQuickStatusChange(apt.id, 'completed')}
                                    className="px-2.5 py-1 text-xs font-medium rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors"
                                  >
                                    {t('actions.completed')}
                                  </button>
                                  <button
                                    onClick={() => handleQuickStatusChange(apt.id, 'cancelled')}
                                    className="px-2 py-1 text-xs font-medium rounded-md border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
                                  >
                                    {t('actions.cancel')}
                                  </button>
                                </>
                              )}

                              {/* More actions menu */}
                              <div className="relative inline-block">
                                <button
                                  onClick={() => setActionMenuOpen(actionMenuOpen === apt.id ? null : apt.id)}
                                  className="p-1 hover:bg-gray-100 rounded"
                                >
                                  <MoreHorizontal className="w-4 h-4 text-gray-400" />
                                </button>
                                {actionMenuOpen === apt.id && (
                                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border z-20">
                                    <button
                                      onClick={() => {
                                        handleAppointmentSummaryClick(apt);
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

      {/* Hover Popover */}
      {hoveredAppointment && (
        <div
          ref={popoverRef}
          onMouseEnter={handlePopoverMouseEnter}
          onMouseLeave={handlePopoverMouseLeave}
          className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 w-80 overflow-hidden pointer-events-auto"
          style={{
            left: `${hoverPosition.x}px`,
            top: `${hoverPosition.y}px`,
          }}
        >
          {(() => {
            const apt = hoveredAppointment;
            const statusConfig = STATUS_CONFIG[apt.status] || STATUS_CONFIG.scheduled;
            const StatusIcon = statusConfig.icon;
            const { prev, next } = findConsecutiveSiblings(apt);
            const resourceName = apt.category === 'treatment' && apt.machine
              ? apt.machine.name
              : apt.category === 'consultation' && apt.provider
                ? apt.provider.fullName
                : '';

            const renderSiblingRow = (sibling, label, Icon) => {
              if (!sibling) return null;
              const sibResource = sibling.category === 'treatment' && sibling.machine
                ? sibling.machine.name
                : sibling.category === 'consultation' && sibling.provider
                  ? sibling.provider.fullName
                  : '';
              const sibStatus = STATUS_CONFIG[sibling.status] || STATUS_CONFIG.scheduled;
              const SibStatusIcon = sibStatus.icon;
              return (
                <div className="flex items-start gap-2 px-4 py-2 bg-gray-50 border-t border-gray-100">
                  <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-gray-500 uppercase">{label}</span>
                      <SibStatusIcon className={`w-3 h-3 ${sibStatus.color}`} />
                    </div>
                    <div className="text-sm text-gray-900 truncate">
                      {sibling.startTime}-{sibling.endTime} &middot; {sibling.title || sibling.service?.title || '-'}
                    </div>
                    {sibResource && (
                      <div className="text-xs text-gray-500 truncate">{sibResource}</div>
                    )}
                  </div>
                </div>
              );
            };

            return (
              <>
                {/* Previous sibling */}
                {renderSiblingRow(prev, t('hover.previous', 'Précédent'), ArrowUp)}

                {/* Main appointment */}
                <div className="px-4 py-3 space-y-2">
                  {/* Time & Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {apt.startTime} - {apt.endTime}
                      <span className="text-gray-400 font-normal">({apt.duration || 30}min)</span>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {t(`statuses.${apt.status}`)}
                    </div>
                  </div>

                  {/* Patient */}
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="font-medium text-sm text-gray-900 truncate">
                      {apt.patient?.fullName || 'Patient'}
                    </span>
                  </div>

                  {/* Treatment/Service */}
                  {(apt.title || apt.service?.title) && (
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">
                        {apt.title || apt.service?.title}
                      </span>
                    </div>
                  )}

                  {/* Resource (machine or provider) */}
                  {resourceName && (
                    <div className="flex items-center gap-2">
                      {apt.category === 'treatment' ? (
                        <Cpu className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      ) : (
                        <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
                      <span className="text-sm text-gray-700 truncate">{resourceName}</span>
                    </div>
                  )}

                  {/* Notes */}
                  {(apt.notes || apt.reason) && (
                    <div className="text-xs text-gray-500 italic truncate mt-1">
                      {apt.notes || apt.reason}
                    </div>
                  )}
                </div>

                {/* Next sibling */}
                {renderSiblingRow(next, t('hover.next', 'Suivant'), ArrowDown)}
              </>
            );
          })()}
        </div>
      )}

      {/* Appointment Summary Modal */}
      {showSummaryModal && summaryAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowSummaryModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">{t('summary.title')}</h3>
              </div>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 py-4 space-y-3">
              {/* Time */}
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-400" />
                <div>
                  <span className="font-medium text-gray-900">
                    {summaryAppointment.startTime} - {summaryAppointment.endTime}
                  </span>
                  <span className="text-gray-500 ml-2">
                    ({summaryAppointment.duration || 30} min)
                  </span>
                </div>
              </div>

              {/* Patient */}
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <span className="text-gray-900">
                  {summaryAppointment.patient?.fullName || 'Patient'}
                </span>
              </div>

              {/* Treatment */}
              {summaryAppointment.title && (
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900">{summaryAppointment.title}</span>
                </div>
              )}

              {/* Machine or Provider */}
              {summaryAppointment.category === 'treatment' && summaryAppointment.machine && (
                <div className="flex items-center gap-3">
                  <Cpu className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900">{summaryAppointment.machine.name}</span>
                </div>
              )}
              {summaryAppointment.category === 'consultation' && summaryAppointment.provider && (
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900">{summaryAppointment.provider.fullName}</span>
                </div>
              )}

              {/* Status */}
              <div className="flex items-center gap-3">
                {(() => {
                  const statusConfig = STATUS_CONFIG[summaryAppointment.status] || STATUS_CONFIG.scheduled;
                  const StatusIcon = statusConfig.icon;
                  return (
                    <>
                      <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
                      <span className={`px-2 py-0.5 rounded-full text-sm ${statusConfig.bg} ${statusConfig.color}`}>
                        {t(`statuses.${summaryAppointment.status}`)}
                      </span>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 py-4 border-t bg-gray-50">
              <div className="grid grid-cols-2 gap-2">
                {canEdit && (
                  <button
                    onClick={handleSummaryEdit}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    {t('actions.edit')}
                  </button>
                )}
                {canEdit && (
                  <button
                    onClick={handleSummaryDelete}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('actions.delete')}
                  </button>
                )}
                {summaryAppointment.patient && (
                  <button
                    onClick={handleSummarySendConsent}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    {t('actions.sendConsent')}
                  </button>
                )}
                <button
                  onClick={handleSummarySendReminder}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors"
                >
                  <Bell className="w-4 h-4" />
                  {t('actions.sendReminder')}
                </button>
                {summaryAppointment.category === 'treatment' && summaryAppointment.status !== 'cancelled' && (
                  <button
                    onClick={handleSummaryAddSuperposed}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    <Layers className="w-4 h-4" />
                    {t('superposition.addTreatment')}
                  </button>
                )}
                {summaryAppointment.category === 'treatment' && summaryAppointment.status !== 'cancelled' && (
                  <button
                    onClick={handleSummaryDuplicate}
                    disabled={duplicateLoading}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-cyan-50 text-cyan-600 rounded-lg hover:bg-cyan-100 transition-colors"
                  >
                    {duplicateLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                    {t('actions.duplicate')}
                  </button>
                )}
                {summaryAppointment.status !== 'cancelled' && (
                  <>
                    <button
                      onClick={handleSummaryCreateQuote}
                      disabled={billingLoading}
                      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        summaryAppointment.quoteId
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      {summaryAppointment.quoteId
                        ? t('billing.editQuote', 'Modifier le devis')
                        : t('billing.createQuote', 'Devis')
                      }
                    </button>
                    <button
                      onClick={handleSummaryCreateInvoice}
                      disabled={billingLoading}
                      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        summaryAppointment.invoiceId
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      }`}
                    >
                      <Receipt className="w-4 h-4" />
                      {summaryAppointment.invoiceId
                        ? t('billing.editInvoice', 'Modifier la facture')
                        : t('billing.createInvoice', 'Facture')
                      }
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {showBookingModal && (
        <PlanningBookingModal
          isOpen={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          onSave={handleBookingSave}
          appointment={selectedAppointment}
          resources={resources}
          initialDate={formatDateLocal(currentDate)}
          clinicSettings={clinicSettings}
        />
      )}

      {/* Duplicate Booking Modal */}
      {showDuplicateModal && duplicateData && (
        <DuplicateBookingModal
          isOpen={showDuplicateModal}
          onClose={() => { setShowDuplicateModal(false); setDuplicateData(null); }}
          onSuccess={() => { loadData(); }}
          duplicateData={duplicateData}
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

      {/* Billing Quote Modal */}
      <QuoteFormModal
        isOpen={showBillingQuoteModal}
        onClose={() => { setShowBillingQuoteModal(false); setEditingBillingQuote(null); }}
        onSave={(formData) => handleSaveBillingDoc(formData, 'quote')}
        quote={editingBillingQuote}
        preSelectedPatient={!editingBillingQuote && summaryAppointment?.patient ? { id: summaryAppointment.patient.id } : null}
        billingSettings={billingSettings}
        initialItems={!editingBillingQuote ? billingItems : null}
      />

      {/* Billing Invoice Modal */}
      <InvoiceFormModal
        isOpen={showBillingInvoiceModal}
        onClose={() => { setShowBillingInvoiceModal(false); setEditingBillingInvoice(null); }}
        onSave={(formData) => handleSaveBillingDoc(formData, 'invoice')}
        invoice={editingBillingInvoice}
        preSelectedClient={!editingBillingInvoice && summaryAppointment?.patient ? { id: summaryAppointment.patient.id } : null}
        billingSettings={billingSettings}
        initialItems={!editingBillingInvoice ? billingItems : null}
      />

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
