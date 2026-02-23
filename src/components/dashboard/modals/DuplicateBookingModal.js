/**
 * DuplicateBookingModal - Desktop modal for duplicating an appointment to another day.
 * Shows slot search results and allows booking multiple slots at once.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  X, Copy, Clock, ChevronLeft, ChevronRight, Check, ChevronDown,
  RefreshCw, Calendar, AlertTriangle, CheckCircle, XCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import * as planningApi from '../../../api/planningApi';

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

const getNextWorkdays = (from, count) => {
  const days = [];
  let cursor = from;
  while (days.length < count) {
    const dow = new Date(cursor + 'T00:00:00').getDay();
    if (dow !== 0) days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
};

const formatDayHeader = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
};

const formatShortDate = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
};

// ─── Component ──────────────────────────────────────────────────────

const DuplicateBookingModal = ({ isOpen, onClose, onSuccess, duplicateData }) => {
  const { t } = useTranslation('planning');

  const [providers, setProviders] = useState([]);
  const [slotsByDay, setSlotsByDay] = useState({});
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [afterHours, setAfterHours] = useState(false);

  // Date navigation
  const [dateOffset, setDateOffset] = useState(0);

  // Multi-selection: array of { day, slot, key }
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [bookingProvider, setBookingProvider] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [bookingResults, setBookingResults] = useState(null); // { success: N, failed: N, errors: [] }
  const [toast, setToast] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');

  const treatments = duplicateData?.treatments || [];
  const totalDuration = treatments.reduce((sum, tr) => sum + (tr.duration || 0), 0);

  // ── Load resources ──
  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      try {
        const res = await planningApi.getResources();
        if (res.success && res.data) {
          setProviders((res.data.providers || []).filter(p => {
            const active = p.isActive !== undefined ? p.isActive : p.is_active;
            return active !== false;
          }));
        }
      } catch (e) {
        console.error('Failed to load resources:', e);
      }
    };
    load();
  }, [isOpen]);

  // ── Search slots (parallel) ──
  const searchSlots = useCallback(async (useAfterHours) => {
    if (treatments.length === 0) return;
    const ah = useAfterHours !== undefined ? useAfterHours : afterHours;
    setSearching(true);
    setSearched(false);
    setSlotsByDay({});
    setBookingResults(null);

    const startFrom = addDays(todayStr(), 1 + dateOffset);
    const days = getNextWorkdays(startFrom, 7);
    const isMulti = treatments.length > 1;
    const tr0 = treatments[0];
    setDebugInfo(`${days[0]}→${days[days.length - 1]} | ${tr0.title} (${tr0.id?.substring(0, 8)}) ${tr0.duration}min`);

    const accumulated = {};
    let errors = 0;

    const fetchDay = async (day) => {
      try {
        let slots = [];
        if (isMulti) {
          const res = await planningApi.getMultiTreatmentSlots(
            day,
            treatments.map(tr => ({ treatmentId: tr.id, duration: tr.duration })),
            { allowAfterHours: ah }
          );
          if (res.success && res.data) {
            slots = Array.isArray(res.data) ? res.data : (res.data.slots || res.data.allSlots || []);
          }
        } else {
          const tr = treatments[0];
          const res = await planningApi.getSlots({
            date: day,
            category: 'treatment',
            treatmentId: tr.id,
            duration: tr.duration,
            allowAfterHours: ah
          });
          if (res.success && res.data) {
            slots = Array.isArray(res.data) ? res.data : (res.data.slots || res.data.allSlots || []);
          }
        }
        if (slots.length > 0) {
          accumulated[day] = slots;
          setSlotsByDay(prev => ({ ...prev, [day]: slots }));
        }
      } catch (e) {
        errors++;
        console.error(`[DuplicateModal] Slot error ${day}:`, e);
      }
    };

    await Promise.all(days.map(fetchDay));

    const totalSlots = Object.values(accumulated).reduce((s, arr) => s + arr.length, 0);
    setDebugInfo(`${Object.keys(accumulated).length}/${days.length} jours, ${totalSlots} créneaux${errors > 0 ? `, ${errors} erreurs` : ''}`);
    setSearching(false);
    setSearched(true);
  }, [treatments, afterHours, dateOffset]);

  // ── Auto-search on mount / date change ──
  useEffect(() => {
    if (isOpen && treatments.length > 0) {
      searchSlots();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, dateOffset]);

  // ── Date navigation ──
  const handleDatePrev = () => setDateOffset(prev => Math.max(prev - 7, 0));
  const handleDateNext = () => setDateOffset(prev => prev + 7);
  const handleDateToday = () => setDateOffset(0);

  // ── Toggle slot selection ──
  const makeSlotKey = (day, slot) => {
    const st = slot.startTime || slot.start;
    const et = slot.endTime || slot.end;
    return `${day}|${st}|${et}`;
  };

  const handleSlotToggle = (day, slot) => {
    const key = makeSlotKey(day, slot);
    setSelectedSlots(prev => {
      const exists = prev.find(s => s.key === key);
      if (exists) {
        return prev.filter(s => s.key !== key);
      }
      return [...prev, { day, slot, key }];
    });
    // Set default provider on first selection
    if (selectedSlots.length === 0) {
      setBookingProvider(duplicateData?.providerId || '');
    }
  };

  const isSlotSelected = (day, slot) => {
    const key = makeSlotKey(day, slot);
    return selectedSlots.some(s => s.key === key);
  };

  // Clear selections that are no longer in visible slots when navigating
  useEffect(() => {
    setSelectedSlots(prev => {
      const visibleKeys = new Set();
      Object.entries(slotsByDay).forEach(([day, slots]) => {
        slots.forEach(slot => visibleKeys.add(makeSlotKey(day, slot)));
      });
      // Keep selections from non-visible pages too (they're still valid)
      return prev;
    });
  }, [slotsByDay]);

  // ── Book all selected slots ──
  const handleBookAll = async () => {
    if (selectedSlots.length === 0 || !duplicateData?.patientId) return;
    setBookingInProgress(true);
    setBookingResults(null);

    const isMulti = treatments.length > 1;
    let successCount = 0;
    const failedItems = [];

    // Book sequentially to avoid race conditions on provider conflicts
    for (const { day, slot } of selectedSlots) {
      try {
        const startTime = slot.startTime || slot.start;

        if (isMulti && slot.segments) {
          const treatmentPayload = slot.segments.map(seg => ({
            treatmentId: seg.treatmentId,
            machineId: seg.isOverlappable ? null : (seg.machineId || null),
            duration: seg.duration
          }));
          await planningApi.createMultiTreatmentAppointment({
            patientId: duplicateData.patientId,
            date: day,
            startTime,
            treatments: treatmentPayload,
            providerId: bookingProvider || undefined,
            notes: bookingNotes || undefined
          });
        } else {
          const tr = treatments[0];
          const endTime = slot.endTime || slot.end;
          await planningApi.createAppointment({
            patientId: duplicateData.patientId,
            date: day,
            startTime,
            endTime,
            category: 'treatment',
            treatmentId: tr.id,
            machineId: slot.isOverlappable ? null : (slot.machineId || null),
            providerId: bookingProvider || undefined,
            notes: bookingNotes || undefined
          });
        }
        successCount++;
      } catch (e) {
        const dayLabel = formatShortDate(day);
        const timeLabel = (slot.startTime || slot.start)?.substring(0, 5);
        failedItems.push(`${dayLabel} ${timeLabel}`);
        console.error(`[DuplicateModal] Booking error ${day}:`, e);
      }
    }

    setBookingInProgress(false);

    if (failedItems.length === 0) {
      // All succeeded
      setToast({ message: t('duplicate.successMulti', { count: successCount }), type: 'success' });
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1200);
    } else {
      // Partial or full failure
      setBookingResults({ success: successCount, failed: failedItems.length, errors: failedItems });
      if (successCount > 0) {
        setToast({ message: t('duplicate.partialSuccess', { success: successCount, failed: failedItems.length }), type: 'warning' });
      } else {
        setToast({ message: t('duplicate.error'), type: 'error' });
      }
    }
  };

  const sortedDays = Object.keys(slotsByDay).sort();
  const hasSlots = sortedDays.length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-cyan-600" />
            <h3 className="font-semibold text-gray-900">{t('duplicate.title')}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Patient + treatments summary */}
        <div className="px-5 py-3 border-b bg-white flex-shrink-0">
          <p className="text-sm font-medium text-gray-900 mb-2">
            {duplicateData?.patientName || '—'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {treatments.map(tr => (
              <span
                key={tr.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-cyan-50 text-cyan-700 text-xs font-medium rounded"
              >
                {tr.title}
                <span className="text-cyan-500">{tr.duration}min</span>
              </span>
            ))}
          </div>
          {totalDuration > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1.5">
              <Clock size={12} />
              {t('duplicate.totalDuration', { minutes: totalDuration })}
            </div>
          )}
        </div>

        {/* Date navigation + selection counter */}
        <div className="px-5 py-2 border-b bg-gray-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDatePrev}
              disabled={dateOffset === 0}
              className="p-1.5 hover:bg-gray-200 rounded transition-colors disabled:opacity-30"
            >
              <ChevronLeft size={16} className="text-gray-600" />
            </button>
            <button
              onClick={handleDateToday}
              className="px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 rounded transition-colors min-w-[180px] text-center"
            >
              {formatShortDate(addDays(todayStr(), 1 + dateOffset))} — {formatShortDate(addDays(todayStr(), 7 + dateOffset))}
            </button>
            <button
              onClick={handleDateNext}
              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            >
              <ChevronRight size={16} className="text-gray-600" />
            </button>
          </div>
          {selectedSlots.length > 0 && (
            <span className="text-xs font-semibold text-cyan-700 bg-cyan-50 px-2 py-1 rounded-full">
              {selectedSlots.length} {t('duplicate.selected', { count: selectedSlots.length })}
            </span>
          )}
        </div>

        {/* Debug info (temporary) */}
        {debugInfo && (
          <div className="px-5 py-1 bg-yellow-50 border-b text-[10px] font-mono text-yellow-700 flex-shrink-0">
            {debugInfo}
          </div>
        )}

        {/* Slot results */}
        <div className="flex-1 overflow-y-auto">
          {searching && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={20} className="animate-spin text-gray-400 mr-2" />
              <span className="text-sm text-gray-400">{t('duplicate.searching')}</span>
            </div>
          )}

          {searched && !hasSlots && !searching && (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Calendar size={32} className="text-gray-300 mb-3" />
              <p className="text-sm text-gray-400">{t('duplicate.noSlots')}</p>
              {!afterHours && (
                <button
                  onClick={() => {
                    setAfterHours(true);
                    searchSlots(true);
                  }}
                  className="mt-4 px-4 py-2 text-sm font-medium border-2 border-orange-400 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded transition-colors"
                >
                  <AlertTriangle size={14} className="inline mr-1.5 -mt-0.5" />
                  {t('duplicate.afterHoursButton')}
                </button>
              )}
            </div>
          )}

          {/* Booking results feedback */}
          {bookingResults && (
            <div className="px-4 py-3 border-b bg-gray-50">
              {bookingResults.success > 0 && (
                <div className="flex items-center gap-2 text-sm text-green-700 mb-1">
                  <CheckCircle size={14} />
                  <span>{bookingResults.success} {t('duplicate.booked')}</span>
                </div>
              )}
              {bookingResults.errors.length > 0 && (
                <div className="text-sm text-red-600">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle size={14} />
                    <span>{bookingResults.failed} {t('duplicate.failedSlots')}</span>
                  </div>
                  <ul className="text-xs text-red-500 ml-6 list-disc">
                    {bookingResults.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {sortedDays.map(day => (
            <div key={day}>
              <div className="sticky top-0 z-10 bg-gray-100 px-4 py-2 border-b border-gray-200">
                <p className="text-xs font-semibold text-gray-600 capitalize">{formatDayHeader(day)}</p>
              </div>
              {slotsByDay[day].map((slot, idx) => {
                const startTime = slot.startTime || slot.start;
                const endTime = slot.endTime || slot.end;
                const selected = isSlotSelected(day, slot);
                const isMultiSeg = slot.segments && slot.segments.length > 0;

                return (
                  <button
                    key={`${startTime}-${endTime}-${idx}`}
                    onClick={() => handleSlotToggle(day, slot)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors ${
                      selected ? 'bg-cyan-50' : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Checkbox */}
                      <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        selected
                          ? 'bg-cyan-600 border-cyan-600'
                          : 'border-gray-300 bg-white'
                      }`}>
                        {selected && <Check size={12} className="text-white" />}
                      </div>
                      <div className="flex-shrink-0 text-sm font-semibold text-gray-900">
                        {startTime?.substring(0, 5)} - {endTime?.substring(0, 5)}
                      </div>
                      <div className="flex-1 min-w-0">
                        {isMultiSeg ? (
                          <div className="flex flex-wrap gap-1">
                            {slot.segments.map((seg, si) => (
                              <span key={si} className="text-[11px] text-gray-500">
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
                        <span className="flex-shrink-0 text-[10px] font-medium bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">
                          {t('duplicate.afterHoursBadge')}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}

          {/* After-hours button when slots exist but not yet in after-hours mode */}
          {searched && hasSlots && !afterHours && !searching && (
            <div className="flex justify-center py-4 px-4">
              <button
                onClick={() => {
                  setAfterHours(true);
                  searchSlots(true);
                }}
                className="px-4 py-2 text-sm font-medium border-2 border-orange-400 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded transition-colors"
              >
                <AlertTriangle size={14} className="inline mr-1.5 -mt-0.5" />
                {t('duplicate.afterHoursButton')}
              </button>
            </div>
          )}
        </div>

        {/* Booking section (shown when at least 1 slot selected) */}
        {selectedSlots.length > 0 && (
          <div className="border-t bg-gray-50 px-5 py-4 flex-shrink-0 space-y-3">
            {/* Provider */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                {t('duplicate.provider')}
              </label>
              <div className="relative">
                <select
                  value={bookingProvider}
                  onChange={e => setBookingProvider(e.target.value)}
                  className="appearance-none w-full bg-white border border-gray-200 px-3 py-2 pr-8 text-sm text-gray-700 rounded outline-none focus:border-cyan-500"
                >
                  <option value="">—</option>
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                {t('duplicate.notes')}
              </label>
              <textarea
                value={bookingNotes}
                onChange={e => setBookingNotes(e.target.value)}
                rows={2}
                className="w-full bg-white border border-gray-200 px-3 py-2 text-sm rounded outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            {/* Book button */}
            <button
              onClick={handleBookAll}
              disabled={bookingInProgress}
              className={`w-full py-2.5 text-sm font-medium rounded transition-colors ${
                bookingInProgress
                  ? 'bg-gray-200 text-gray-400'
                  : 'bg-cyan-600 text-white hover:bg-cyan-700'
              }`}
            >
              {bookingInProgress
                ? t('duplicate.booking')
                : selectedSlots.length === 1
                  ? t('duplicate.book')
                  : t('duplicate.bookMulti', { count: selectedSlots.length })
              }
            </button>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className={`absolute bottom-4 left-4 right-4 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-center text-white ${
            toast.type === 'error' ? 'bg-red-600' : toast.type === 'warning' ? 'bg-orange-500' : 'bg-green-600'
          }`}>
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default DuplicateBookingModal;
