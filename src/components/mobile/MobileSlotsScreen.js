/**
 * MobileSlotsScreen - Recherche de créneaux + réservation rapide mobile
 * 3 étapes : sélection traitements → résultats créneaux → réservation
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, X, ChevronLeft, ChevronRight, Clock, RefreshCw,
  Calendar, Check, ChevronDown, User, AlertTriangle, Copy
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import * as planningApi from '../../api/planningApi';
import { usePatients } from '../../contexts/PatientContext';
import { parseDuplicateParams } from '../../utils/duplicateAppointment';

// ─── Helpers ────────────────────────────────────────────────────────

const toLocalDateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const todayStr = () => toLocalDateStr(new Date());

const addDays = (dateStr, n) => {
  const d = new Date(dateStr + 'T12:00:00'); // noon avoids DST edge cases
  d.setDate(d.getDate() + n);
  return toLocalDateStr(d);
};

/** Generate the next N weekdays (Mon-Sat) starting from a given date */
const getNextWorkdays = (from, count) => {
  const days = [];
  let cursor = from;
  while (days.length < count) {
    const dow = new Date(cursor + 'T00:00:00').getDay();
    if (dow !== 0) days.push(cursor); // skip Sunday
    cursor = addDays(cursor, 1);
  }
  return days;
};

const formatDayHeader = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
};

const formatShortDate = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
};

// ─── Component ──────────────────────────────────────────────────────

const MobileSlotsScreen = () => {
  const { t } = useTranslation('mobile');
  const { patients, searchPatients } = usePatients();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Treatment search ──
  const [treatmentQuery, setTreatmentQuery] = useState('');
  const [treatmentResults, setTreatmentResults] = useState([]);
  const [treatmentLoading, setTreatmentLoading] = useState(false);
  const [selectedTreatments, setSelectedTreatments] = useState([]);
  const searchTimer = useRef(null);

  // ── Filters ──
  const [filterDate, setFilterDate] = useState(null); // null = next 7 days
  const [machines, setMachines] = useState([]);
  const [providers, setProviders] = useState([]);
  const [filterMachine, setFilterMachine] = useState('');
  const [filterProvider, setFilterProvider] = useState('');

  // ── Slots ──
  const [slotsByDay, setSlotsByDay] = useState({});
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [afterHours, setAfterHours] = useState(false);

  // ── Booking panel ──
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [patientQuery, setPatientQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [bookingProvider, setBookingProvider] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [toast, setToast] = useState(null);

  // ── Duplicate mode ──
  const [duplicateMode, setDuplicateMode] = useState(false);
  const [duplicatePatientId, setDuplicatePatientId] = useState('');
  const [duplicatePatientName, setDuplicatePatientName] = useState('');
  const duplicateInitRef = useRef(false);

  // ── Load resources on mount ──
  useEffect(() => {
    const load = async () => {
      try {
        const res = await planningApi.getResources();
        if (res.success && res.data) {
          setMachines(res.data.machines || []);
          setProviders(res.data.providers || []);
        }
      } catch (e) {
        console.error('Failed to load resources:', e);
      }
    };
    load();
  }, []);

  // ── Duplicate mode initialization ──
  useEffect(() => {
    if (duplicateInitRef.current) return;
    const dupData = parseDuplicateParams(searchParams);
    if (dupData) {
      duplicateInitRef.current = true;
      setSelectedTreatments(dupData.treatments);
      setDuplicatePatientId(dupData.patientId);
      setDuplicatePatientName(dupData.patientName);
      setDuplicateMode(true);
      if (dupData.providerId) setFilterProvider(dupData.providerId);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // ── Auto-search when duplicate treatments are set ──
  useEffect(() => {
    if (duplicateMode && selectedTreatments.length > 0 && !searched && !searching) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duplicateMode, selectedTreatments.length]);

  // ── Treatment search with debounce ──
  const handleTreatmentSearch = useCallback((query) => {
    setTreatmentQuery(query);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!query.trim()) {
      setTreatmentResults([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setTreatmentLoading(true);
      try {
        const res = await planningApi.getTreatments({ search: query });
        if (res.success && res.data) {
          setTreatmentResults(res.data.byCategory || []);
        }
      } catch (e) {
        console.error('Treatment search error:', e);
      } finally {
        setTreatmentLoading(false);
      }
    }, 300);
  }, []);

  const addTreatment = (treatment) => {
    if (selectedTreatments.find(t => t.id === treatment.id)) return;
    setSelectedTreatments(prev => [...prev, treatment]);
    setTreatmentQuery('');
    setTreatmentResults([]);
    setSearched(false);
    setAfterHours(false);
  };

  const removeTreatment = (id) => {
    setSelectedTreatments(prev => prev.filter(t => t.id !== id));
    setSearched(false);
    setAfterHours(false);
  };

  const totalDuration = selectedTreatments.reduce((sum, t) => sum + (t.duration || 0), 0);

  // ── Search slots ──
  const handleSearch = useCallback(async (overrideAfterHours) => {
    if (selectedTreatments.length === 0) return;
    const useAfterHours = overrideAfterHours !== undefined ? overrideAfterHours : afterHours;
    setSearching(true);
    setSearched(false);
    setSlotsByDay({});
    setSelectedSlot(null);

    const days = filterDate
      ? [filterDate]
      : getNextWorkdays(todayStr(), 7);

    const isMulti = selectedTreatments.length > 1;
    const results = {};

    for (const day of days) {
      try {
        let slots = [];
        if (isMulti) {
          const res = await planningApi.getMultiTreatmentSlots(
            day,
            selectedTreatments.map(tr => ({ treatmentId: tr.id, duration: tr.duration })),
            { allowAfterHours: useAfterHours }
          );
          if (res.success && res.data) {
            slots = Array.isArray(res.data) ? res.data : (res.data.slots || []);
          }
        } else {
          const tr = selectedTreatments[0];
          const res = await planningApi.getSlots({
            date: day,
            category: 'treatment',
            treatmentId: tr.id,
            duration: tr.duration,
            allowAfterHours: useAfterHours
          });
          if (res.success && res.data) {
            slots = Array.isArray(res.data) ? res.data : (res.data.slots || []);
          }
        }

        // Apply machine filter
        if (filterMachine) {
          slots = slots.filter(slot => {
            if (slot.segments) {
              return slot.segments.some(seg => seg.machineId === filterMachine);
            }
            return slot.machineId === filterMachine;
          });
        }

        // Apply provider filter (check availability)
        if (filterProvider && slots.length > 0) {
          const available = [];
          for (const slot of slots) {
            const startTime = slot.startTime || slot.start;
            const endTime = slot.endTime || slot.end;
            try {
              const check = await planningApi.checkProviderAvailability(filterProvider, {
                date: day,
                startTime,
                endTime
              });
              if (check.success && check.data?.available) {
                available.push(slot);
              }
            } catch {
              // Skip slot if check fails
            }
          }
          slots = available;
        }

        if (slots.length > 0) {
          results[day] = slots;
        }
      } catch (e) {
        console.error(`Slot search error for ${day}:`, e);
      }

      // Progressive update
      setSlotsByDay({ ...results });
    }

    setSlotsByDay(results);
    setSearching(false);
    setSearched(true);
  }, [selectedTreatments, filterDate, filterMachine, filterProvider, afterHours]);

  // ── Date filter navigation ──
  const handleDatePrev = () => {
    if (!filterDate) {
      setFilterDate(todayStr());
    } else {
      setFilterDate(addDays(filterDate, -1));
    }
  };

  const handleDateNext = () => {
    if (!filterDate) {
      setFilterDate(addDays(todayStr(), 1));
    } else {
      setFilterDate(addDays(filterDate, 1));
    }
  };

  const handleDateReset = () => setFilterDate(null);

  // ── Select a slot ──
  const handleSlotTap = (day, slot) => {
    setSelectedSlot(slot);
    setSelectedDay(day);
    if (duplicateMode && duplicatePatientId) {
      setSelectedPatientId(duplicatePatientId);
      setPatientQuery('');
    } else {
      setSelectedPatientId('');
      setPatientQuery('');
    }
    setBookingProvider(filterProvider || '');
    setBookingNotes('');
  };

  // ── Patient search ──
  const filteredPatients = patientQuery.trim()
    ? searchPatients(patientQuery).slice(0, 8)
    : [];

  const selectedPatient = selectedPatientId
    ? (patients.find(p => p.id === selectedPatientId) ||
       (duplicateMode && duplicatePatientId === selectedPatientId
         ? { id: duplicatePatientId, firstName: duplicatePatientName, lastName: '' }
         : null))
    : null;

  // ── Book appointment ──
  const handleBook = async () => {
    if (!selectedPatientId || !selectedSlot || !selectedDay) return;
    setBookingInProgress(true);

    try {
      const isMulti = selectedTreatments.length > 1 && selectedSlot.segments;
      const startTime = selectedSlot.startTime || selectedSlot.start;

      if (isMulti) {
        const treatments = selectedSlot.segments.map(seg => ({
          treatmentId: seg.treatmentId,
          machineId: seg.isOverlappable ? null : (seg.machineId || null),
          duration: seg.duration
        }));
        await planningApi.createMultiTreatmentAppointment({
          patientId: selectedPatientId,
          date: selectedDay,
          startTime,
          treatments,
          providerId: bookingProvider || undefined,
          notes: bookingNotes || undefined
        });
      } else {
        const tr = selectedTreatments[0];
        const endTime = selectedSlot.endTime || selectedSlot.end;
        await planningApi.createAppointment({
          patientId: selectedPatientId,
          date: selectedDay,
          startTime,
          endTime,
          category: 'treatment',
          treatmentId: tr.id,
          machineId: selectedSlot.isOverlappable ? null : (selectedSlot.machineId || null),
          providerId: bookingProvider || undefined,
          notes: bookingNotes || undefined
        });
      }

      showToast(t('booking.bookSuccess'));
      // Reset
      setSelectedSlot(null);
      setSelectedDay(null);
      setSelectedPatientId('');
      setPatientQuery('');
      setSelectedTreatments([]);
      setSlotsByDay({});
      setSearched(false);
      setDuplicateMode(false);
      setDuplicatePatientId('');
      setDuplicatePatientName('');
    } catch (e) {
      console.error('Booking error:', e);
      showToast(t('booking.bookError'), 'error');
    } finally {
      setBookingInProgress(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const closePanel = () => {
    setSelectedSlot(null);
    setSelectedDay(null);
  };

  // ── Active providers for dropdowns ──
  const activeProviders = providers.filter(p => {
    const active = p.isActive !== undefined ? p.isActive : p.is_active;
    return active !== false;
  });

  const sortedDays = Object.keys(slotsByDay).sort();
  const hasSlots = sortedDays.length > 0;

  // ─── RENDER ────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full relative">
      {/* ── Duplicate mode banner ── */}
      {duplicateMode && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2.5 flex items-center gap-2">
          <Copy size={14} className="text-blue-600 flex-shrink-0" />
          <span className="text-sm font-medium text-blue-700 flex-1 truncate">
            {t('booking.duplicateMode', { patient: duplicatePatientName || '—' })}
          </span>
          <button
            onClick={() => {
              setDuplicateMode(false);
              setDuplicatePatientId('');
              setDuplicatePatientName('');
              setSelectedTreatments([]);
              setSlotsByDay({});
              setSearched(false);
              setSelectedSlot(null);
            }}
            className="p-1 text-blue-500 active:text-blue-700"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Step 1: Treatment selection + filters (sticky top) ── */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 space-y-3">
        {/* Treatment search input */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={treatmentQuery}
            onChange={e => handleTreatmentSearch(e.target.value)}
            placeholder={t('booking.searchTreatment')}
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 border border-gray-200 focus:border-green-500 focus:bg-white outline-none transition-colors"
          />
          {treatmentLoading && (
            <RefreshCw size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />
          )}
        </div>

        {/* Treatment search results dropdown */}
        {treatmentResults.length > 0 && (
          <div className="bg-white border border-gray-200 shadow-lg max-h-52 overflow-y-auto -mt-1">
            {treatmentResults.map(category => (
              <div key={category.id || 'uncategorized'}>
                <div className="px-3 py-1.5 bg-gray-50 text-[10px] font-semibold text-gray-500 uppercase tracking-wider sticky top-0">
                  {category.name || t('booking.addTreatment')}
                </div>
                {(category.treatments || []).map(tr => {
                  const already = selectedTreatments.find(s => s.id === tr.id);
                  return (
                    <button
                      key={tr.id}
                      onClick={() => !already && addTreatment(tr)}
                      disabled={!!already}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between ${
                        already ? 'opacity-40' : 'active:bg-gray-50'
                      }`}
                    >
                      <span className="truncate">{tr.title}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{tr.duration} min</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* Selected treatment chips */}
        {selectedTreatments.length > 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {selectedTreatments.map(tr => (
                <span
                  key={tr.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 text-xs font-medium"
                >
                  {tr.title}
                  <button onClick={() => removeTreatment(tr.id)} className="ml-0.5 hover:text-green-900">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock size={12} />
              {t('booking.totalDuration', { minutes: totalDuration })}
            </div>
          </div>
        )}

        {/* Filters row */}
        {selectedTreatments.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {/* Date filter */}
            <div className="flex items-center bg-gray-50 border border-gray-200 flex-shrink-0">
              <button onClick={handleDatePrev} className="p-1.5 active:bg-gray-100">
                <ChevronLeft size={14} className="text-gray-500" />
              </button>
              <button
                onClick={handleDateReset}
                className="px-2 py-1 text-xs text-gray-700 min-w-[80px] text-center"
              >
                {filterDate ? formatShortDate(filterDate) : t('booking.next7days')}
              </button>
              <button onClick={handleDateNext} className="p-1.5 active:bg-gray-100">
                <ChevronRight size={14} className="text-gray-500" />
              </button>
            </div>

            {/* Machine filter */}
            <div className="relative flex-shrink-0">
              <select
                value={filterMachine}
                onChange={e => setFilterMachine(e.target.value)}
                className="appearance-none bg-gray-50 border border-gray-200 px-2 py-1.5 pr-6 text-xs text-gray-700 outline-none"
              >
                <option value="">{t('booking.allMachines')}</option>
                {machines.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Provider filter */}
            <div className="relative flex-shrink-0">
              <select
                value={filterProvider}
                onChange={e => setFilterProvider(e.target.value)}
                className="appearance-none bg-gray-50 border border-gray-200 px-2 py-1.5 pr-6 text-xs text-gray-700 outline-none"
              >
                <option value="">{t('booking.allProviders')}</option>
                {activeProviders.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Search button */}
        {selectedTreatments.length > 0 && (
          <button
            onClick={handleSearch}
            disabled={searching}
            className={`w-full py-2.5 text-sm font-medium transition-colors ${
              searching
                ? 'bg-gray-200 text-gray-500'
                : 'bg-gray-900 text-white active:bg-gray-700'
            }`}
          >
            {searching ? t('booking.searching') : t('booking.search')}
          </button>
        )}
      </div>

      {/* ── Step 2: Slot results ── */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {searching && Object.keys(slotsByDay).length === 0 && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw size={20} className="animate-spin text-gray-400" />
          </div>
        )}

        {searched && !hasSlots && !searching && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <Calendar size={32} className="text-gray-300 mb-3" />
            <p className="text-sm text-gray-400">{t('booking.noSlots')}</p>
            {!afterHours && (
              <button
                onClick={() => {
                  setAfterHours(true);
                  handleSearch(true);
                }}
                className="mt-4 px-4 py-2.5 text-sm font-medium border-2 border-orange-400 text-orange-600 bg-orange-50 active:bg-orange-100 transition-colors"
              >
                <AlertTriangle size={14} className="inline mr-1.5 -mt-0.5" />
                {t('booking.afterHoursButton')}
              </button>
            )}
          </div>
        )}

        {!searched && !searching && selectedTreatments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <Search size={32} className="text-gray-300 mb-3" />
            <p className="text-sm text-gray-400">{t('booking.noTreatments')}</p>
          </div>
        )}

        {sortedDays.map(day => (
          <div key={day}>
            {/* Day header */}
            <div className="sticky top-0 z-10 bg-gray-100 px-4 py-2 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-600 capitalize">{formatDayHeader(day)}</p>
            </div>
            {/* Slot rows */}
            {slotsByDay[day].map((slot, idx) => {
              const startTime = slot.startTime || slot.start;
              const endTime = slot.endTime || slot.end;
              const isSelected = selectedSlot === slot && selectedDay === day;
              const isMulti = slot.segments && slot.segments.length > 0;

              return (
                <button
                  key={`${startTime}-${endTime}-${idx}`}
                  onClick={() => handleSlotTap(day, slot)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors ${
                    isSelected ? 'bg-green-50' : 'bg-white active:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 text-sm font-semibold text-gray-900">
                      {startTime?.substring(0, 5)} - {endTime?.substring(0, 5)}
                    </div>
                    <div className="flex-1 min-w-0">
                      {isMulti ? (
                        <div className="flex flex-wrap gap-1">
                          {slot.segments.map((seg, si) => (
                            <span key={si} className="text-[10px] text-gray-500">
                              {si > 0 && <span className="mx-0.5 text-gray-300">&rarr;</span>}
                              {seg.machineName || seg.treatmentTitle}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">
                          {slot.machineName || ''}
                        </span>
                      )}
                    </div>
                    {slot.afterHours && (
                      <span className="flex-shrink-0 text-[10px] font-medium bg-orange-100 text-orange-600 px-1.5 py-0.5">
                        {t('booking.afterHoursBadge')}
                      </span>
                    )}
                    {isSelected && (
                      <Check size={16} className="text-green-600 flex-shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ))}

        {/* After-hours button — shown after slot list when not yet active */}
        {searched && hasSlots && !afterHours && !searching && (
          <div className="flex justify-center py-4 px-4">
            <button
              onClick={() => {
                setAfterHours(true);
                handleSearch(true);
              }}
              className="px-4 py-2.5 text-sm font-medium border-2 border-orange-400 text-orange-600 bg-orange-50 active:bg-orange-100 transition-colors"
            >
              <AlertTriangle size={14} className="inline mr-1.5 -mt-0.5" />
              {t('booking.afterHoursButton')}
            </button>
          </div>
        )}

        {/* Extra space when panel is open */}
        {selectedSlot && <div className="h-80" />}
      </div>

      {/* ── Step 3: Booking panel (slides up) ── */}
      {selectedSlot && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] safe-area-bottom animate-slide-up">
          <div className="max-h-[70vh] overflow-y-auto">
            {/* Handle + close */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-gray-100">
              <div className="w-8 h-1 bg-gray-300 rounded-full mx-auto" />
              <button onClick={closePanel} className="absolute right-3 top-3 p-1 text-gray-400">
                <X size={18} />
              </button>
            </div>

            <div className="px-4 py-3 space-y-4">
              {/* Summary */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('booking.summary')}</p>
                <div className="bg-gray-50 px-3 py-2 space-y-1">
                  <p className="text-sm font-medium text-gray-900">
                    {formatDayHeader(selectedDay)} {t('booking.slotAt')} {(selectedSlot.startTime || selectedSlot.start)?.substring(0, 5)}
                  </p>
                  {selectedTreatments.map(tr => (
                    <p key={tr.id} className="text-xs text-gray-500">{tr.title} ({tr.duration} min)</p>
                  ))}
                  {selectedSlot.segments && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedSlot.segments.map((seg, i) => (
                        <span key={i} className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5">
                          {seg.machineName || seg.treatmentTitle} {seg.startTime?.substring(0, 5)}-{seg.endTime?.substring(0, 5)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Patient search */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('booking.selectPatient')}</p>
                {selectedPatient ? (
                  <div className="flex items-center gap-2 bg-green-50 px-3 py-2">
                    <User size={14} className="text-green-600" />
                    <span className="text-sm font-medium text-green-700 flex-1">
                      {selectedPatient.firstName} {selectedPatient.lastName}
                    </span>
                    <button onClick={() => { setSelectedPatientId(''); setPatientQuery(''); }} className="text-green-600">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={patientQuery}
                      onChange={e => setPatientQuery(e.target.value)}
                      placeholder={t('booking.searchPatient')}
                      className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 focus:border-green-500 outline-none"
                    />
                    {filteredPatients.length > 0 && (
                      <div className="absolute left-0 right-0 top-full bg-white border border-gray-200 shadow-lg max-h-40 overflow-y-auto z-50">
                        {filteredPatients.map(p => (
                          <button
                            key={p.id}
                            onClick={() => { setSelectedPatientId(p.id); setPatientQuery(''); }}
                            className="w-full text-left px-3 py-2 text-sm active:bg-gray-50 border-b border-gray-50"
                          >
                            <span className="font-medium">{p.firstName} {p.lastName}</span>
                            {p.patientNumber && (
                              <span className="text-xs text-gray-400 ml-2">#{p.patientNumber}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Provider dropdown */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('booking.provider')}</p>
                <div className="relative">
                  <select
                    value={bookingProvider}
                    onChange={e => setBookingProvider(e.target.value)}
                    className="appearance-none w-full bg-gray-50 border border-gray-200 px-3 py-2 pr-8 text-sm text-gray-700 outline-none"
                  >
                    <option value="">—</option>
                    {activeProviders.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Notes */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('booking.notes')}</p>
                <textarea
                  value={bookingNotes}
                  onChange={e => setBookingNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500 resize-none"
                />
              </div>

              {/* Book button */}
              <button
                onClick={handleBook}
                disabled={!selectedPatientId || bookingInProgress}
                className={`w-full py-3 text-sm font-medium transition-colors mb-4 ${
                  !selectedPatientId || bookingInProgress
                    ? 'bg-gray-200 text-gray-400'
                    : 'bg-green-600 text-white active:bg-green-700'
                }`}
              >
                {bookingInProgress ? t('booking.booking') : t('booking.book')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-20 left-4 right-4 z-[60] px-4 py-3 shadow-lg text-sm font-medium text-center ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default MobileSlotsScreen;
