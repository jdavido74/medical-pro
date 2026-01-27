/**
 * PlanningBookingModal - Modal for creating/editing appointments
 * Supports both treatment (machine-based) and consultation (practitioner-based) appointments
 * Supports multi-treatment bookings with chained appointments
 */

import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Cpu, User, Calendar, Clock, Search, Check, AlertCircle, Plus, Trash2, ChevronRight } from 'lucide-react';
import planningApi from '../../../api/planningApi';
import { PatientContext } from '../../../contexts/PatientContext';
import PatientSearchSelect from '../../common/PatientSearchSelect';
import QuickPatientModal from '../../modals/QuickPatientModal';

const PlanningBookingModal = ({
  isOpen,
  onClose,
  onSave,
  appointment,
  resources,
  initialDate
}) => {
  const { t } = useTranslation('planning');
  const patientContext = useContext(PatientContext);
  const isEditMode = !!appointment;

  // Form state
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState(appointment?.category || 'treatment');
  const [patientId, setPatientId] = useState(appointment?.patientId || '');
  const [isQuickPatientModalOpen, setIsQuickPatientModalOpen] = useState(false);
  const [quickPatientSearchQuery, setQuickPatientSearchQuery] = useState('');
  const [date, setDate] = useState(appointment?.date || initialDate || new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [providerId, setProviderId] = useState(appointment?.providerId || '');
  const [assistantId, setAssistantId] = useState(appointment?.assistantId || '');
  const [reason, setReason] = useState(appointment?.reason || '');
  const [notes, setNotes] = useState(appointment?.notes || '');
  const [priority, setPriority] = useState(appointment?.priority || 'normal');

  // Multi-treatment state
  const [selectedTreatments, setSelectedTreatments] = useState([]);
  // Structure: [{ id, title, duration, categories, machines }]

  // Data state
  const [treatments, setTreatments] = useState([]);
  const [treatmentsByCategory, setTreatmentsByCategory] = useState([]);
  const [treatmentSearch, setTreatmentSearch] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingTreatments, setLoadingTreatments] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isAddingTreatment, setIsAddingTreatment] = useState(false);

  // Calculate total duration
  const totalDuration = selectedTreatments.reduce((sum, t) => sum + (t.duration || 30), 0);

  // Initialize from existing appointment (edit mode)
  useEffect(() => {
    if (isEditMode && appointment?.service) {
      setSelectedTreatments([{
        id: appointment.serviceId,
        title: appointment.service.title,
        duration: appointment.service.duration || appointment.duration || 30,
        categories: []
      }]);
    }
  }, [isEditMode, appointment]);

  // Search treatments with debounce
  useEffect(() => {
    const searchTreatments = async () => {
      setLoadingTreatments(true);
      try {
        const response = await planningApi.getTreatments({ search: treatmentSearch });
        if (response.success) {
          setTreatments(response.data?.treatments || response.data || []);
          setTreatmentsByCategory(response.data?.byCategory || []);
        }
      } catch (err) {
        console.error('Error loading treatments:', err);
      } finally {
        setLoadingTreatments(false);
      }
    };

    const debounce = setTimeout(searchTreatments, 300);
    return () => clearTimeout(debounce);
  }, [treatmentSearch]);

  // Get selected patient from context
  const selectedPatient = patientId ? patientContext?.patients?.find(p => p.id === patientId) : null;

  // Load available slots when date/treatments change
  const loadSlots = useCallback(async () => {
    if (!date) return;

    if (category === 'treatment' && selectedTreatments.length === 0) return;
    if (category === 'consultation' && !providerId) return;

    setLoadingSlots(true);
    setError(null);
    try {
      if (category === 'treatment') {
        if (selectedTreatments.length === 1) {
          // Single treatment - use standard endpoint
          const params = {
            date,
            category: 'treatment',
            treatmentId: selectedTreatments[0].id,
            duration: selectedTreatments[0].duration
          };
          const response = await planningApi.getSlots(params);
          if (response.success) {
            setAvailableSlots(response.data?.slots || response.data?.allSlots || []);
          }
        } else {
          // Multiple treatments - use multi-treatment endpoint
          const response = await planningApi.getMultiTreatmentSlots(date, selectedTreatments.map(t => ({
            treatmentId: t.id,
            duration: t.duration
          })));
          console.log('[PlanningBookingModal] Multi-treatment slots response:', response);
          if (response.success) {
            setAvailableSlots(response.data?.slots || []);
            // Show message if no slots and there's a reason
            if (response.data?.slots?.length === 0 && response.data?.message) {
              setError(response.data.message);
            }
            // Log debug info
            if (response.data?.debug) {
              console.log('[PlanningBookingModal] Debug info:', response.data.debug);
            }
          } else {
            setError(response.error?.message || t('messages.error'));
          }
        }
      } else {
        // Consultation
        const params = {
          date,
          category: 'consultation',
          providerId,
          duration: 30
        };
        const response = await planningApi.getSlots(params);
        if (response.success) {
          setAvailableSlots(response.data?.slots || []);
        }
      }
    } catch (err) {
      console.error('Error loading slots:', err);
    } finally {
      setLoadingSlots(false);
    }
  }, [date, category, selectedTreatments, providerId]);

  useEffect(() => {
    if (step === 3) {
      loadSlots();
    }
  }, [step, loadSlots]);

  // Handle create new patient
  const handleCreateNewPatient = (searchQuery) => {
    setQuickPatientSearchQuery(searchQuery);
    setIsQuickPatientModalOpen(true);
  };

  // Handle patient created
  const handlePatientCreated = (newPatient) => {
    setPatientId(newPatient.id);
    setIsQuickPatientModalOpen(false);
    setQuickPatientSearchQuery('');
  };

  // Handle treatment selection (add to list)
  const handleTreatmentSelect = (treatment) => {
    // Check if already selected
    if (selectedTreatments.find(t => t.id === treatment.id)) {
      return;
    }

    setSelectedTreatments(prev => [...prev, {
      id: treatment.id,
      title: treatment.title,
      duration: treatment.duration || 30,
      categories: treatment.categories || []
    }]);
    setTreatmentSearch('');
    setIsAddingTreatment(false);
  };

  // Remove treatment from list
  const handleRemoveTreatment = (treatmentId) => {
    setSelectedTreatments(prev => prev.filter(t => t.id !== treatmentId));
  };

  // Handle slot selection
  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
  };

  // Validate step
  const canProceed = () => {
    switch (step) {
      case 1:
        return category && (
          (category === 'treatment' && selectedTreatments.length > 0) ||
          (category === 'consultation' && providerId)
        );
      case 2:
        return !!patientId;
      case 3:
        return !!selectedSlot;
      default:
        return false;
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!selectedSlot || !patientId) {
      setError(t('validation.patientRequired'));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let response;

      if (category === 'treatment') {
        if (selectedTreatments.length === 1) {
          // Single treatment - use standard endpoint
          const data = {
            category,
            patientId,
            date,
            startTime: selectedSlot.start || selectedSlot.startTime,
            duration: selectedTreatments[0].duration,
            machineId: selectedSlot.machineId,
            treatmentId: selectedTreatments[0].id,
            serviceId: selectedTreatments[0].id,
            priority,
            reason,
            notes
          };

          if (assistantId) data.assistantId = assistantId;
          if (providerId) data.providerId = providerId;

          if (isEditMode) {
            response = await planningApi.updateAppointment(appointment.id, data);
          } else {
            response = await planningApi.createAppointment(data);
          }
        } else {
          // Multiple treatments - use multi-treatment endpoint
          const treatments = selectedSlot.segments
            ? selectedSlot.segments.map(seg => ({
                treatmentId: seg.treatmentId,
                machineId: seg.machineId,
                duration: seg.duration
              }))
            : selectedTreatments.map((t, idx) => ({
                treatmentId: t.id,
                machineId: selectedSlot.machineId, // Fallback if no segments
                duration: t.duration
              }));

          response = await planningApi.createMultiTreatmentAppointment({
            patientId,
            date,
            startTime: selectedSlot.startTime || selectedSlot.start,
            treatments,
            notes,
            priority
          });
        }
      } else {
        // Consultation
        const data = {
          category,
          patientId,
          date,
          startTime: selectedSlot.start || selectedSlot.startTime,
          duration: selectedSlot.duration || 30,
          providerId,
          priority,
          reason,
          notes
        };

        if (isEditMode) {
          response = await planningApi.updateAppointment(appointment.id, data);
        } else {
          response = await planningApi.createAppointment(data);
        }
      }

      if (response.success) {
        onSave(response.data);
      } else {
        setError(response.error?.message || t('messages.error'));
      }
    } catch (err) {
      console.error('Error saving appointment:', err);
      setError(t('messages.error'));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditMode ? t('appointment.edit') : t('appointment.new')}
            </h2>
            <p className="text-sm text-gray-500">
              {t(`booking.step${step}`)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 py-3 bg-gray-50 border-b">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  s < step
                    ? 'bg-green-500 text-white'
                    : s === step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {s < step ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 4 && (
                <div className={`w-12 h-1 mx-1 ${s < step ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {/* Step 1: Choose type and treatments */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setCategory('treatment')}
                  className={`p-6 rounded-xl border-2 text-left transition-all ${
                    category === 'treatment'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Cpu className={`w-8 h-8 mb-3 ${category === 'treatment' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <h3 className="font-semibold text-gray-900">{t('appointment.treatment')}</h3>
                  <p className="text-sm text-gray-500 mt-1">{t('booking.treatmentDescription')}</p>
                </button>

                <button
                  onClick={() => setCategory('consultation')}
                  className={`p-6 rounded-xl border-2 text-left transition-all ${
                    category === 'consultation'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <User className={`w-8 h-8 mb-3 ${category === 'consultation' ? 'text-purple-600' : 'text-gray-400'}`} />
                  <h3 className="font-semibold text-gray-900">{t('appointment.consultation')}</h3>
                  <p className="text-sm text-gray-500 mt-1">{t('booking.consultationDescription')}</p>
                </button>
              </div>

              {/* Treatment selection (multi-treatment support) */}
              {category === 'treatment' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('multiTreatment.selectedTreatments')} *
                  </label>

                  {/* Selected treatments list */}
                  {selectedTreatments.length > 0 && (
                    <div className="mb-4 space-y-2">
                      {selectedTreatments.map((treatment, index) => (
                        <div
                          key={treatment.id}
                          className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                              {index + 1}
                            </span>
                            <div>
                              <div className="font-medium text-blue-800">{treatment.title}</div>
                              <div className="text-sm text-blue-600">
                                {treatment.duration} min
                                {treatment.categories?.[0] && (
                                  <span className="ml-2">• {treatment.categories[0].name}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveTreatment(treatment.id)}
                            className="p-1 text-blue-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {/* Total duration */}
                      <div className="flex items-center justify-between px-3 py-2 bg-gray-100 rounded-lg">
                        <span className="text-sm font-medium text-gray-600">
                          {t('multiTreatment.totalDuration')}
                        </span>
                        <span className="font-semibold text-gray-900">
                          {totalDuration} min
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Add treatment button / search */}
                  {!isAddingTreatment && selectedTreatments.length > 0 ? (
                    <button
                      onClick={() => setIsAddingTreatment(true)}
                      className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      {t('multiTreatment.addTreatment')}
                    </button>
                  ) : (
                    <>
                      {/* Search input */}
                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={treatmentSearch}
                          onChange={(e) => setTreatmentSearch(e.target.value)}
                          placeholder={t('booking.searchTreatment')}
                          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          autoFocus={isAddingTreatment}
                        />
                        {isAddingTreatment && selectedTreatments.length > 0 && (
                          <button
                            onClick={() => {
                              setIsAddingTreatment(false);
                              setTreatmentSearch('');
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Loading state */}
                      {loadingTreatments && (
                        <div className="text-center py-4 text-gray-500">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto mb-2" />
                        </div>
                      )}

                      {/* Results grouped by category */}
                      {!loadingTreatments && treatmentsByCategory.length > 0 && (
                        <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
                          {treatmentsByCategory.map(cat => (
                            <div key={cat.id || 'uncategorized'}>
                              <div
                                className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider sticky top-0"
                                style={cat.color ? {
                                  borderLeft: `3px solid ${cat.color}`
                                } : {}}
                              >
                                {cat.isUncategorized ? t('booking.uncategorized') : cat.name}
                              </div>
                              {cat.treatments.map(treatment => {
                                const isAlreadySelected = selectedTreatments.find(t => t.id === treatment.id);
                                return (
                                  <button
                                    key={treatment.id}
                                    onClick={() => !isAlreadySelected && handleTreatmentSelect(treatment)}
                                    disabled={isAlreadySelected}
                                    className={`w-full p-3 text-left transition-colors flex items-center justify-between ${
                                      isAlreadySelected
                                        ? 'bg-gray-100 opacity-50 cursor-not-allowed'
                                        : 'hover:bg-blue-50'
                                    }`}
                                  >
                                    <div>
                                      <div className="font-medium text-sm text-gray-900">
                                        {treatment.title}
                                        {isAlreadySelected && (
                                          <span className="ml-2 text-xs text-green-600">
                                            <Check className="w-3 h-3 inline" />
                                          </span>
                                        )}
                                      </div>
                                      {treatment.description && (
                                        <div className="text-xs text-gray-500 truncate max-w-xs">{treatment.description}</div>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-500 whitespace-nowrap ml-2">
                                      {treatment.duration} min
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* No results */}
                      {!loadingTreatments && treatments.length === 0 && treatmentSearch && (
                        <div className="text-center py-4 text-gray-500">
                          {t('booking.noTreatmentsFound')}
                        </div>
                      )}

                      {/* Fallback: show all treatments when no category grouping available */}
                      {!loadingTreatments && treatments.length > 0 && treatmentsByCategory.length === 0 && (
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                          {treatments.map(treatment => {
                            const isAlreadySelected = selectedTreatments.find(t => t.id === treatment.id);
                            return (
                              <button
                                key={treatment.id}
                                onClick={() => !isAlreadySelected && handleTreatmentSelect(treatment)}
                                disabled={isAlreadySelected}
                                className={`p-3 rounded-lg border text-left transition-all ${
                                  isAlreadySelected
                                    ? 'border-green-500 bg-green-50 opacity-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <div className="font-medium text-sm">{treatment.title}</div>
                                <div className="text-xs text-gray-500">{treatment.duration} min</div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Provider selection for consultation */}
              {category === 'consultation' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('appointment.provider')} *
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {resources.providers.map(provider => (
                      <button
                        key={provider.id}
                        onClick={() => setProviderId(provider.id)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          providerId === provider.id
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-sm">{provider.name}</div>
                        {provider.specialty && (
                          <div className="text-xs text-gray-500">{provider.specialty}</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select patient */}
          {step === 2 && (
            <div className="space-y-4 min-h-[350px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('appointment.selectPatient')} *
              </label>
              <PatientSearchSelect
                value={patientId}
                onChange={(id) => setPatientId(id)}
                onCreateNew={handleCreateNewPatient}
                error={error && !patientId ? t('appointment.patientRequired') : null}
                placeholder={t('appointment.searchPatient')}
              />
            </div>
          )}

          {/* Step 3: Select date and time */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('appointment.date')} *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setSelectedSlot(null);
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Multi-treatment info */}
              {category === 'treatment' && selectedTreatments.length > 1 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm font-medium text-blue-800 mb-2">
                    {t('multiTreatment.treatmentChain')}
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {selectedTreatments.map((treatment, idx) => (
                      <React.Fragment key={treatment.id}>
                        <span className="text-xs bg-white px-2 py-1 rounded border border-blue-200">
                          {treatment.title} ({treatment.duration}min)
                        </span>
                        {idx < selectedTreatments.length - 1 && (
                          <ChevronRight className="w-4 h-4 text-blue-400" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="text-xs text-blue-600 mt-2">
                    {t('multiTreatment.totalDuration')}: {totalDuration} min
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('slots.available')}
                </label>
                {loadingSlots ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2" />
                    {t('calendar.loading')}
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {t('slots.noSlots')}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {availableSlots.map((slot, idx) => {
                      const hasSegments = slot.segments && slot.segments.length > 0;
                      const slotKey = `${slot.startTime || slot.start}-${slot.endTime || slot.end}`;
                      const selectedKey = selectedSlot ? `${selectedSlot.startTime || selectedSlot.start}-${selectedSlot.endTime || selectedSlot.end}` : null;
                      const isSelected = slotKey === selectedKey;

                      return (
                        <button
                          key={idx}
                          onClick={() => handleSlotSelect(slot)}
                          className={`w-full p-3 rounded-lg border text-left transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {isSelected && (
                                <Check className="w-5 h-5 text-blue-600" />
                              )}
                              <span className={`font-medium ${isSelected ? 'text-blue-700' : ''}`}>
                                {slot.startTime || slot.start} - {slot.endTime || slot.end}
                              </span>
                            </div>
                            {!hasSegments && slot.machineName && (
                              <span className="text-sm text-gray-500">{slot.machineName}</span>
                            )}
                            {hasSegments && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                {slot.segments.length} {slot.segments.length > 1 ? 'machines' : 'machine'}
                              </span>
                            )}
                          </div>

                          {/* Show segments for multi-treatment slots */}
                          {hasSegments && (
                            <div className={`mt-2 space-y-1 ${isSelected ? 'bg-blue-100/50 -mx-2 px-2 py-2 rounded' : ''}`}>
                              {slot.segments.map((seg, segIdx) => (
                                <div key={segIdx} className={`flex items-center text-xs ${isSelected ? 'text-blue-800' : 'text-gray-600'}`}>
                                  <span className={`w-5 h-5 rounded-full flex items-center justify-center mr-2 text-[10px] ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                                    {segIdx + 1}
                                  </span>
                                  <span className="flex-1 truncate font-medium">{seg.treatmentTitle}</span>
                                  <span className={`mx-2 ${isSelected ? 'text-blue-400' : 'text-gray-400'}`}>•</span>
                                  <span className={isSelected ? 'text-blue-600' : 'text-gray-500'}>{seg.machineName}</span>
                                  <span className={`mx-2 ${isSelected ? 'text-blue-400' : 'text-gray-400'}`}>•</span>
                                  <span className="font-mono">{seg.startTime}-{seg.endTime}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('appointment.category')}</span>
                  <span className="font-medium">{t(`categories.${category}`)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('appointment.patient')}</span>
                  <span className="font-medium">
                    {selectedPatient?.firstName} {selectedPatient?.lastName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('appointment.date')}</span>
                  <span className="font-medium">{date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('appointment.time')}</span>
                  <span className="font-medium">
                    {selectedSlot?.startTime || selectedSlot?.start} - {selectedSlot?.endTime || selectedSlot?.end}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('appointment.duration')}</span>
                  <span className="font-medium">{totalDuration} {t('appointment.minutes')}</span>
                </div>
              </div>

              {/* Treatment details */}
              {category === 'treatment' && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    {selectedTreatments.length > 1
                      ? t('multiTreatment.treatmentChain')
                      : t('appointment.treatment')}
                  </h4>
                  <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                    {selectedSlot?.segments ? (
                      // Multi-treatment with segments
                      selectedSlot.segments.map((seg, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">
                              {idx + 1}
                            </span>
                            <span className="font-medium">{seg.treatmentTitle}</span>
                          </div>
                          <div className="text-gray-600">
                            {seg.machineName} • {seg.startTime}-{seg.endTime}
                          </div>
                        </div>
                      ))
                    ) : (
                      // Single treatment
                      selectedTreatments.map((treatment, idx) => (
                        <div key={treatment.id} className="flex items-center justify-between text-sm">
                          <span className="font-medium">{treatment.title}</span>
                          <span className="text-gray-600">
                            {selectedSlot?.machineName && `${selectedSlot.machineName} • `}
                            {treatment.duration} min
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('appointment.reason')}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('appointment.notes')}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('appointment.priority')}
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {['low', 'normal', 'high', 'urgent'].map(p => (
                    <option key={p} value={p}>{t(`priorities.${p}`)}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {step > 1 ? t('actions.previous') : t('actions.cancel')}
          </button>

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('actions.next')}
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? t('actions.saving') : t('actions.create')}
            </button>
          )}
        </div>
      </div>

      {/* Quick Patient Creation Modal */}
      <QuickPatientModal
        isOpen={isQuickPatientModalOpen}
        onClose={() => {
          setIsQuickPatientModalOpen(false);
          setQuickPatientSearchQuery('');
        }}
        onSave={handlePatientCreated}
        initialSearchQuery={quickPatientSearchQuery}
      />
    </div>
  );
};

export default PlanningBookingModal;
