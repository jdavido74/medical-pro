/**
 * PlanningBookingModal - Modal for creating/editing appointments
 * Supports both treatment (machine-based) and consultation (practitioner-based) appointments
 * Supports multi-treatment bookings with chained appointments
 */

import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Cpu, User, Calendar, Clock, Search, Check, AlertCircle, Plus, Trash2, ChevronRight, Link, Edit3, Users, AlertTriangle, UserCheck, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import planningApi from '../../../api/planningApi';
import { PatientContext } from '../../../contexts/PatientContext';
import { useAuth } from '../../../hooks/useAuth';
import PatientSearchSelect from '../../common/PatientSearchSelect';
import QuickPatientModal from '../../modals/QuickPatientModal';

/**
 * LinkedGroupChoiceModal - Sub-modal to choose between editing/deleting single, group, or all patient appointments
 */
const LinkedGroupChoiceModal = ({
  isOpen,
  onClose,
  onChooseSingle,
  onChooseGroup,
  onChooseAllPatient,
  mode,
  groupCount,
  completedCount,
  patientName,
  patientAppointmentsCount
}) => {
  const { t } = useTranslation('planning');

  if (!isOpen) return null;

  const isDelete = mode === 'delete';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-full ${isDelete ? 'bg-red-100' : 'bg-blue-100'}`}>
            <Link className={`w-5 h-5 ${isDelete ? 'text-red-600' : 'text-blue-600'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{t('linkedGroup.title')}</h3>
            <p className="text-sm text-gray-500">
              {t('linkedGroup.description', { count: groupCount })}
            </p>
          </div>
        </div>

        {completedCount > 0 && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2 text-sm text-yellow-800">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {t('linkedGroup.completedHidden', { count: completedCount })}
          </div>
        )}

        <p className="text-sm text-gray-600 mb-4">
          {isDelete ? t('linkedGroup.deleteChoice') : t('linkedGroup.editChoice')}
        </p>

        <div className="space-y-2">
          <button
            onClick={onChooseSingle}
            className="w-full p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left flex items-center gap-3"
          >
            <Edit3 className="w-5 h-5 text-gray-500" />
            <div>
              <div className="font-medium text-gray-900">
                {isDelete ? t('linkedGroup.deleteSingle') : t('linkedGroup.editSingle')}
              </div>
              <div className="text-sm text-gray-500">
                {isDelete ? t('linkedGroup.deleteSingleDesc') : t('linkedGroup.editSingleDesc')}
              </div>
            </div>
          </button>

          <button
            onClick={onChooseGroup}
            className="w-full p-4 rounded-lg border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all text-left flex items-center gap-3"
          >
            <Users className="w-5 h-5 text-purple-500" />
            <div>
              <div className="font-medium text-gray-900">
                {isDelete ? t('linkedGroup.deleteGroup') : t('linkedGroup.editGroup')}
              </div>
              <div className="text-sm text-gray-500">
                {isDelete ? t('linkedGroup.deleteGroupDesc') : t('linkedGroup.editGroupDesc')}
              </div>
            </div>
          </button>

          {/* Delete all patient appointments option (only in delete mode) */}
          {isDelete && onChooseAllPatient && patientAppointmentsCount > groupCount && (
            <button
              onClick={onChooseAllPatient}
              className="w-full p-4 rounded-lg border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all text-left flex items-center gap-3"
            >
              <Trash2 className="w-5 h-5 text-red-500" />
              <div>
                <div className="font-medium text-gray-900">
                  {t('linkedGroup.deleteAllPatient')}
                </div>
                <div className="text-sm text-gray-500">
                  {t('linkedGroup.deleteAllPatientDesc', {
                    count: patientAppointmentsCount,
                    patient: patientName
                  })}
                </div>
              </div>
            </button>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {t('actions.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * DeleteConfirmModal - Confirmation modal for deletion with options for linked appointments
 */
const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, isLinked, onKeepGap, onRecalculate }) => {
  const { t } = useTranslation('planning');
  const [deleteOption, setDeleteOption] = useState('keepGap');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-full bg-red-100">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{t('appointment.deleteConfirm')}</h3>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          {t('appointment.deleteConfirmMessage')}
        </p>

        {isLinked && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">
              {t('linkedGroup.deleteSingleOptions')}
            </p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-3 rounded-lg border cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="deleteOption"
                  value="keepGap"
                  checked={deleteOption === 'keepGap'}
                  onChange={(e) => setDeleteOption(e.target.value)}
                  className="text-blue-600"
                />
                <span className="text-sm">{t('linkedGroup.keepGap')}</span>
              </label>
              <label className="flex items-center gap-2 p-3 rounded-lg border cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="deleteOption"
                  value="recalculate"
                  checked={deleteOption === 'recalculate'}
                  onChange={(e) => setDeleteOption(e.target.value)}
                  className="text-blue-600"
                />
                <span className="text-sm">{t('linkedGroup.recalculateChain')}</span>
              </label>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {t('actions.cancel')}
          </button>
          <button
            onClick={() => {
              if (isLinked) {
                if (deleteOption === 'keepGap') {
                  onKeepGap();
                } else {
                  onRecalculate();
                }
              } else {
                onConfirm();
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            {t('actions.delete')}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * ConflictModal - Modal to handle slot conflicts when editing
 */
const ConflictModal = ({ isOpen, onClose, onOverlap, onCancel, conflictInfo }) => {
  const { t } = useTranslation('planning');

  if (!isOpen || !conflictInfo) return null;

  const isPatientConflict = conflictInfo.conflictType === 'patient';
  const isSamePatient = conflictInfo.isSamePatient;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-full ${isPatientConflict ? 'bg-amber-100' : 'bg-orange-100'}`}>
            <AlertTriangle className={`w-5 h-5 ${isPatientConflict ? 'text-amber-600' : 'text-orange-600'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {isPatientConflict ? t('conflict.patientOverlapWarning') : t('linkedGroup.conflictWarning')}
            </h3>
          </div>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700 mb-2">
            {isPatientConflict ? t('conflict.patientAlreadyBooked') : t('conflict.slotOccupied')}
          </p>
          <div className="text-sm">
            <div className="flex justify-between py-1 border-b">
              <span className="text-gray-500">{t('conflict.existingAppointment')}</span>
              <span className="font-medium">{conflictInfo.existingTitle || 'RDV existant'}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="text-gray-500">{t('appointment.time')}</span>
              <span className="font-medium">{conflictInfo.existingTime}</span>
            </div>
            {isPatientConflict && conflictInfo.existingMachine && (
              <div className="flex justify-between py-1 border-b">
                <span className="text-gray-500">{t('appointment.machine')}</span>
                <span className="font-medium">{conflictInfo.existingMachine}</span>
              </div>
            )}
            {isPatientConflict && conflictInfo.existingProvider && (
              <div className="flex justify-between py-1 border-b">
                <span className="text-gray-500">{t('appointment.provider')}</span>
                <span className="font-medium">{conflictInfo.existingProvider}</span>
              </div>
            )}
            {!isPatientConflict && (
              <div className="flex justify-between py-1">
                <span className="text-gray-500">{t('appointment.patient')}</span>
                <span className={`font-medium ${isSamePatient ? 'text-blue-600' : 'text-orange-600'}`}>
                  {conflictInfo.existingPatient}
                  {isSamePatient && (
                    <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                      {t('conflict.samePatient')}
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
          {isPatientConflict && conflictInfo.totalConflicts > 1 && (
            <p className="text-xs text-amber-700 mt-2 font-medium">
              {t('conflict.multipleOverlaps', { count: conflictInfo.totalConflicts })}
            </p>
          )}
        </div>

        <p className="text-sm text-gray-600 mb-4">
          {t('conflict.overlapQuestion')}
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {t('conflict.chooseAnother')}
          </button>
          <button
            onClick={onOverlap}
            className={`px-4 py-2 text-white rounded-lg transition-colors ${isPatientConflict ? 'bg-amber-600 hover:bg-amber-700' : 'bg-orange-600 hover:bg-orange-700'}`}
          >
            {t('conflict.allowOverlap')}
          </button>
        </div>
      </div>
    </div>
  );
};

const PlanningBookingModal = ({
  isOpen,
  onClose,
  onSave,
  appointment,
  resources,
  initialDate,
  clinicSettings
}) => {
  const { t } = useTranslation('planning');
  const patientContext = useContext(PatientContext);
  const { company } = useAuth();
  const isEditMode = !!appointment;

  // Linked group detection
  const isLinkedAppointment = appointment && (
    appointment.isLinked ||
    appointment.linkedAppointmentId ||
    (appointment.linkSequence && appointment.linkSequence >= 1)
  );

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

  // Staff assignment state
  const [providers, setProviders] = useState([]);
  const [providerConflict, setProviderConflict] = useState(null);
  const [checkingProvider, setCheckingProvider] = useState(false);
  const [applyStaffToAll, setApplyStaffToAll] = useState(true);
  const [treatmentStaffOverrides, setTreatmentStaffOverrides] = useState({});
  // { [treatmentIndex]: { providerId, assistantId } }

  // Multi-treatment state
  const [selectedTreatments, setSelectedTreatments] = useState([]);
  // Structure: [{ id, title, duration, categories, machines }]

  // Linked group state
  const [showLinkedChoiceModal, setShowLinkedChoiceModal] = useState(false);
  const [linkedChoiceMode, setLinkedChoiceMode] = useState(null); // 'edit' or 'delete'
  const [editMode, setEditMode] = useState('single'); // 'single' or 'group'
  const [linkedGroup, setLinkedGroup] = useState(null);
  const [loadingGroup, setLoadingGroup] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCompletedAppointments, setShowCompletedAppointments] = useState(false);
  const [patientAppointmentsCount, setPatientAppointmentsCount] = useState(0);

  // Conflict state
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictInfo, setConflictInfo] = useState(null);
  const [pendingSaveData, setPendingSaveData] = useState(null);

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

  // Clinic closed day detection
  const clinicName = company?.name || '';
  const closedDayInfo = useMemo(() => {
    if (!date || !clinicSettings) return null;

    const dateObj = new Date(date + 'T00:00:00');
    const dayOfWeek = dateObj.getDay(); // 0=Sunday, 1=Monday, ...

    // Check if it's not an operating day
    const operatingDays = clinicSettings.operatingDays || [1, 2, 3, 4, 5];
    if (!operatingDays.includes(dayOfWeek)) {
      return { isClosed: true, reason: 'nonOperatingDay' };
    }

    // Check if it's in the closed dates list
    const closedDates = clinicSettings.closedDates || [];
    const closedEntry = closedDates.find(cd => (cd.date || cd) === date);
    if (closedEntry) {
      return {
        isClosed: true,
        reason: 'closedDay',
        closedReason: closedEntry.reason || null
      };
    }

    // Check if the day is disabled in operating hours
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    const dayHours = clinicSettings.operatingHours?.[dayName];
    if (dayHours && dayHours.enabled === false) {
      return { isClosed: true, reason: 'nonOperatingDay' };
    }

    return null;
  }, [date, clinicSettings]);

  // Get group ID for linked appointments
  const groupId = appointment?.linkedAppointmentId || (appointment?.linkSequence === 1 ? appointment.id : null);

  // Count completed appointments in group
  const completedCount = linkedGroup?.appointments?.filter(a => a.status === 'completed').length || 0;
  const activeAppointments = linkedGroup?.appointments?.filter(a => a.status !== 'completed') || [];

  // Load linked group data
  const loadLinkedGroup = useCallback(async () => {
    if (!groupId) return;

    setLoadingGroup(true);
    try {
      const response = await planningApi.getAppointmentGroup(groupId);
      if (response.success) {
        setLinkedGroup(response.data);
      }
    } catch (err) {
      console.error('Error loading linked group:', err);
    } finally {
      setLoadingGroup(false);
    }
  }, [groupId]);

  // Load patient appointments count
  const loadPatientAppointmentsCount = useCallback(async () => {
    if (!appointment?.patientId) return;

    try {
      // Get all appointments for this patient (future ones)
      const today = new Date().toISOString().split('T')[0];
      const response = await planningApi.getCalendar({
        startDate: today,
        endDate: '2099-12-31',
        patientId: appointment.patientId
      });
      if (response.success) {
        const activeAppts = (response.data || []).filter(a => a.status !== 'cancelled');
        setPatientAppointmentsCount(activeAppts.length);
      }
    } catch (err) {
      console.error('Error loading patient appointments:', err);
    }
  }, [appointment?.patientId]);

  // Show choice modal for linked appointments in edit mode
  useEffect(() => {
    if (isEditMode && isLinkedAppointment && isOpen) {
      setShowLinkedChoiceModal(true);
      setLinkedChoiceMode('edit');
      loadLinkedGroup();
      loadPatientAppointmentsCount();
    }
  }, [isEditMode, isLinkedAppointment, isOpen, loadLinkedGroup, loadPatientAppointmentsCount]);

  // Handle linked choice: edit single
  const handleChooseSingleEdit = () => {
    setEditMode('single');
    setShowLinkedChoiceModal(false);
    // Jump to confirmation step, pre-fill slot
    if (appointment?.startTime && appointment?.endTime) {
      setSelectedSlot({
        start: appointment.startTime,
        end: appointment.endTime,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        machineId: appointment.machineId,
        duration: appointment.duration || 30
      });
    }
    setStep(4);
  };

  // Handle linked choice: edit group
  const handleChooseGroupEdit = () => {
    setEditMode('group');
    setShowLinkedChoiceModal(false);
    // Initialize form with group data
    if (linkedGroup?.appointments) {
      const activeAppts = linkedGroup.appointments.filter(a => a.status !== 'completed');
      const groupTreatments = activeAppts.map(a => ({
        id: a.serviceId,
        title: a.title || a.service?.title,
        duration: a.duration || 30,
        categories: [],
        appointmentId: a.id,
        machineId: a.machineId,
        machineName: a.machine?.name
      }));
      setSelectedTreatments(groupTreatments);

      // Pre-fill provider/assistant from the first appointment that has them
      const firstWithProvider = activeAppts.find(a => a.providerId);
      const firstWithAssistant = activeAppts.find(a => a.assistantId);
      if (firstWithProvider) setProviderId(firstWithProvider.providerId);
      if (firstWithAssistant) setAssistantId(firstWithAssistant.assistantId);

      // Pre-fill slot from first appointment
      const first = activeAppts[0];
      if (first) {
        setSelectedSlot({
          start: first.startTime || appointment?.startTime,
          end: activeAppts[activeAppts.length - 1]?.endTime || first.endTime || appointment?.endTime,
          startTime: first.startTime || appointment?.startTime,
          endTime: activeAppts[activeAppts.length - 1]?.endTime || first.endTime || appointment?.endTime,
          machineId: first.machineId,
          duration: activeAppts.reduce((sum, a) => sum + (a.duration || 30), 0)
        });
      }
    }
    setStep(4);
  };

  // Handle delete button click
  const handleDeleteClick = () => {
    if (isLinkedAppointment) {
      setShowLinkedChoiceModal(true);
      setLinkedChoiceMode('delete');
    } else {
      setShowDeleteConfirm(true);
    }
  };

  // Handle linked choice: delete single
  const handleChooseSingleDelete = () => {
    setShowLinkedChoiceModal(false);
    setShowDeleteConfirm(true);
  };

  // Handle linked choice: delete group
  const handleChooseGroupDelete = async () => {
    setShowLinkedChoiceModal(false);
    setSaving(true);
    try {
      const response = await planningApi.cancelAppointmentGroup(groupId);
      if (response.success) {
        onSave({ deleted: true, groupDeleted: true });
      } else {
        setError(response.error?.message || t('messages.error'));
      }
    } catch (err) {
      console.error('Error deleting group:', err);
      setError(t('messages.error'));
    } finally {
      setSaving(false);
    }
  };

  // Handle single delete confirm
  const handleDeleteConfirm = async () => {
    setShowDeleteConfirm(false);
    setSaving(true);
    try {
      const response = await planningApi.cancelAppointment(appointment.id);
      if (response.success) {
        onSave({ deleted: true });
      } else {
        setError(response.error?.message || t('messages.error'));
      }
    } catch (err) {
      console.error('Error deleting appointment:', err);
      setError(t('messages.error'));
    } finally {
      setSaving(false);
    }
  };

  // Handle delete with gap (for linked appointments)
  const handleDeleteKeepGap = async () => {
    setShowDeleteConfirm(false);
    setSaving(true);
    try {
      const response = await planningApi.cancelAppointment(appointment.id);
      if (response.success) {
        onSave({ deleted: true, keptGap: true });
      } else {
        setError(response.error?.message || t('messages.error'));
      }
    } catch (err) {
      console.error('Error deleting appointment:', err);
      setError(t('messages.error'));
    } finally {
      setSaving(false);
    }
  };

  // Handle delete with recalculation (for linked appointments)
  const handleDeleteRecalculate = async () => {
    setShowDeleteConfirm(false);
    setSaving(true);
    try {
      // First cancel this appointment
      await planningApi.cancelAppointment(appointment.id);

      // Then recalculate the chain times
      // Find appointments after this one and shift them
      if (linkedGroup?.appointments) {
        const currentSequence = appointment.linkSequence || 1;
        const followingAppts = linkedGroup.appointments
          .filter(a => (a.linkSequence || 1) > currentSequence && a.status !== 'completed');

        if (followingAppts.length > 0) {
          // Calculate new start time (this appointment's start time)
          let newStartTime = appointment.startTime;

          for (const apt of followingAppts) {
            // Update each following appointment with new time
            await planningApi.updateAppointment(apt.id, {
              startTime: newStartTime,
              date: apt.date
            });

            // Calculate next start time
            const [hours, mins] = newStartTime.split(':').map(Number);
            const newMins = hours * 60 + mins + (apt.duration || 30);
            newStartTime = `${String(Math.floor(newMins / 60)).padStart(2, '0')}:${String(newMins % 60).padStart(2, '0')}`;
          }
        }
      }

      onSave({ deleted: true, recalculated: true });
    } catch (err) {
      console.error('Error recalculating chain:', err);
      setError(t('messages.error'));
    } finally {
      setSaving(false);
    }
  };

  // Handle delete all patient appointments
  const handleDeleteAllPatient = async () => {
    setShowLinkedChoiceModal(false);
    setSaving(true);
    try {
      // Get all future appointments for this patient
      const today = new Date().toISOString().split('T')[0];
      const response = await planningApi.getCalendar({
        startDate: today,
        endDate: '2099-12-31',
        patientId: appointment.patientId
      });

      if (response.success) {
        const appointmentsToCancel = (response.data || [])
          .filter(a => a.status !== 'cancelled' && a.status !== 'completed');

        // Cancel all appointments
        for (const apt of appointmentsToCancel) {
          await planningApi.cancelAppointment(apt.id);
        }

        onSave({ deleted: true, allPatientDeleted: true, count: appointmentsToCancel.length });
      } else {
        setError(response.error?.message || t('messages.error'));
      }
    } catch (err) {
      console.error('Error deleting all patient appointments:', err);
      setError(t('messages.error'));
    } finally {
      setSaving(false);
    }
  };

  // Handle conflict: allow overlap
  const handleConflictOverlap = async () => {
    setShowConflictModal(false);
    if (pendingSaveData) {
      // Proceed with save, forcing overlap
      await executeSave(pendingSaveData, true);
    }
    setPendingSaveData(null);
  };

  // Handle conflict: cancel and choose another slot
  const handleConflictCancel = () => {
    setShowConflictModal(false);
    setPendingSaveData(null);
    // Go back to step 3 to choose another slot
    setStep(3);
    setSelectedSlot(null);
  };

  // Load providers from resources
  useEffect(() => {
    if (isOpen && resources?.providers) {
      setProviders(resources.providers);
    } else if (isOpen) {
      // Fallback: load resources if not provided
      const loadResources = async () => {
        try {
          const response = await planningApi.getResources();
          if (response.success) {
            setProviders(response.data?.providers || []);
          }
        } catch (err) {
          console.error('Error loading providers:', err);
        }
      };
      loadResources();
    }
  }, [isOpen, resources]);

  // Initialize from existing appointment (edit mode)
  useEffect(() => {
    if (isEditMode && appointment?.service && !isLinkedAppointment) {
      setSelectedTreatments([{
        id: appointment.serviceId,
        title: appointment.service.title,
        duration: appointment.service.duration || appointment.duration || 30,
        categories: []
      }]);
    }
  }, [isEditMode, appointment, isLinkedAppointment]);

  // In edit mode (non-linked), jump directly to step 4 (confirmation) and pre-fill slot
  useEffect(() => {
    if (isEditMode && isOpen && !isLinkedAppointment && appointment) {
      // Pre-fill slot from appointment data so step 4 can render
      if (appointment.startTime && appointment.endTime) {
        setSelectedSlot({
          start: appointment.startTime,
          end: appointment.endTime,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          machineId: appointment.machineId,
          duration: appointment.duration || 30
        });
      }
      setStep(4);
    }
  }, [isEditMode, isOpen, isLinkedAppointment, appointment]);

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

    // Don't load slots if clinic is closed on this date
    if (closedDayInfo?.isClosed) {
      setAvailableSlots([]);
      return;
    }

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
  }, [date, category, selectedTreatments, providerId, closedDayInfo]);

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

  // Check for conflicts with existing appointments (resource + patient overlap)
  const checkForConflicts = async (saveData) => {
    try {
      const startTime = saveData.startTime;
      const duration = saveData.duration || 30;
      const startMins = timeToMinutes(startTime);
      const endTime = `${String(Math.floor((startMins + duration) / 60)).padStart(2, '0')}:${String((startMins + duration) % 60).padStart(2, '0')}`;

      // --- Resource conflict check (edit mode only, existing behaviour) ---
      if (isEditMode) {
        const response = await planningApi.getCalendar({
          startDate: date,
          endDate: date,
          ...(category === 'treatment' && saveData.machineId ? { machineId: saveData.machineId } : {}),
          ...(category === 'consultation' && saveData.providerId ? { providerId: saveData.providerId } : {})
        });

        if (response.success && response.data) {
          const endMinutes = startMins + duration;
          const conflicts = response.data.filter(apt => {
            if (apt.id === appointment.id) return false;
            if (apt.status === 'cancelled') return false;
            const aptStartMins = timeToMinutes(apt.startTime);
            const aptEndMins = aptStartMins + (apt.duration || 30);
            return (startMins < aptEndMins && endMinutes > aptStartMins);
          });

          if (conflicts.length > 0) {
            const conflict = conflicts[0];
            return {
              conflictType: 'resource',
              existingTitle: conflict.title || conflict.service?.title || 'Rendez-vous',
              existingTime: `${conflict.startTime} - ${conflict.endTime}`,
              existingPatient: conflict.patient?.fullName || 'Patient',
              existingPatientId: conflict.patientId,
              isSamePatient: conflict.patientId === patientId
            };
          }
        }
      }

      // --- Patient overlap check (both create and edit) ---
      if (patientId) {
        // Build segments for multi-treatment or single slot
        let segments;
        if (selectedTreatments.length > 1 && selectedSlot?.segments) {
          segments = selectedSlot.segments.map(seg => ({
            startTime: seg.startTime,
            endTime: seg.endTime
          }));
        } else {
          segments = [{ startTime, endTime }];
        }

        const excludeIds = isEditMode && appointment?.id ? [appointment.id] : [];
        // For linked groups in edit mode, exclude all group appointment ids
        if (isEditMode && appointment?.linkedAppointmentId) {
          excludeIds.push(appointment.linkedAppointmentId);
        }

        const params = {
          date,
          segments: JSON.stringify(segments),
          ...(excludeIds.length > 0 ? { excludeAppointmentIds: excludeIds.join(',') } : {})
        };

        const patientResponse = await planningApi.checkPatientOverlap(patientId, params);
        if (patientResponse.success && patientResponse.data?.hasConflict) {
          const pConflicts = patientResponse.data.conflicts;
          const first = pConflicts[0];
          return {
            conflictType: 'patient',
            totalConflicts: pConflicts.length,
            existingTitle: first.title || 'Rendez-vous',
            existingTime: `${first.startTime} - ${first.endTime}`,
            existingMachine: first.machineName || null,
            existingProvider: first.providerName || null,
            conflicts: pConflicts
          };
        }
      }
    } catch (err) {
      console.error('Error checking conflicts:', err);
    }

    return null;
  };

  // Check provider availability when provider is selected
  const checkProviderConflicts = useCallback(async (selectedProviderId) => {
    if (!selectedProviderId || !date || !selectedSlot) {
      setProviderConflict(null);
      return;
    }

    // Normalize slot time properties (single slots use start/end, multi-treatment uses startTime/endTime)
    const startTime = selectedSlot.start || selectedSlot.startTime;
    let endTime = selectedSlot.end || selectedSlot.endTime;

    // Fallback: compute endTime from startTime + totalDuration if missing
    if (startTime && !endTime && totalDuration > 0) {
      const [h, m] = startTime.split(':').map(Number);
      const endMins = h * 60 + m + totalDuration;
      endTime = `${String(Math.floor(endMins / 60)).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`;
    }

    if (!startTime || !endTime) {
      setProviderConflict(null);
      return;
    }

    setCheckingProvider(true);
    try {
      const params = { date, startTime, endTime };
      if (isEditMode && appointment?.id) {
        params.excludeAppointmentId = appointment.id;
      }
      const response = await planningApi.checkProviderAvailability(selectedProviderId, params);
      if (response.success) {
        setProviderConflict(response.data);
      } else {
        setProviderConflict(null);
      }
    } catch (err) {
      console.error('Error checking provider availability:', err);
      setProviderConflict(null);
    } finally {
      setCheckingProvider(false);
    }
  }, [date, selectedSlot, totalDuration, isEditMode, appointment?.id]);

  // Handle provider selection change
  const handleProviderChange = useCallback((newProviderId) => {
    setProviderId(newProviderId);
    if (newProviderId) {
      checkProviderConflicts(newProviderId);
    } else {
      setProviderConflict(null);
    }
  }, [checkProviderConflicts]);

  // Handle assistant selection change
  const handleAssistantChange = useCallback((newAssistantId) => {
    setAssistantId(newAssistantId);
  }, []);

  // Handle per-slot staff override change
  const handleSlotStaffChange = useCallback((index, field, value) => {
    setTreatmentStaffOverrides(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: value || null
      }
    }));
  }, []);

  // Re-check conflicts when slot changes and provider is already selected
  useEffect(() => {
    if (providerId && selectedSlot && step === 4) {
      checkProviderConflicts(providerId);
    }
  }, [selectedSlot, step]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter providers by role for practitioner dropdown
  // Handle both camelCase (isActive) and snake_case (is_active) since
  // /planning/resources returns raw backend data without transformation
  const isProviderActive = (p) => {
    const active = p.isActive !== undefined ? p.isActive : p.is_active;
    return active !== false;
  };

  const practitionerProviders = providers.filter(p =>
    isProviderActive(p) &&
    (!p.role || p.role === 'physician' || p.role === 'practitioner' || p.role === 'doctor')
  );

  // All providers for assistant dropdown
  const assistantProviders = providers.filter(p => isProviderActive(p));

  // Helper to convert time string to minutes
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hours, mins] = timeStr.split(':').map(Number);
    return hours * 60 + mins;
  };

  // Execute the actual save
  const executeSave = async (saveData, forceOverlap = false) => {
    setSaving(true);
    setError(null);

    // When user forces through a patient overlap warning, flag the payload
    const payload = forceOverlap ? { ...saveData, skipPatientOverlapCheck: true } : saveData;

    try {
      let response;

      if (category === 'treatment') {
        if (selectedTreatments.length === 1) {
          if (isEditMode) {
            response = await planningApi.updateAppointment(appointment.id, payload);
          } else {
            response = await planningApi.createAppointment(payload);
          }
        } else {
          // Multiple treatments
          const treatments = selectedSlot.segments
            ? selectedSlot.segments.map(seg => ({
                treatmentId: seg.treatmentId,
                machineId: seg.machineId,
                duration: seg.duration
              }))
            : selectedTreatments.map((t) => ({
                treatmentId: t.id,
                machineId: selectedSlot.machineId,
                duration: t.duration
              }));

          // Add per-slot staff overrides if not applying to all
          const treatmentsWithStaff = treatments.map((t, idx) => {
            if (!applyStaffToAll && treatmentStaffOverrides[idx]) {
              return {
                ...t,
                ...(treatmentStaffOverrides[idx].providerId && { providerId: treatmentStaffOverrides[idx].providerId }),
                ...(treatmentStaffOverrides[idx].assistantId && { assistantId: treatmentStaffOverrides[idx].assistantId })
              };
            }
            return t;
          });

          response = await planningApi.createMultiTreatmentAppointment({
            patientId,
            date,
            startTime: selectedSlot.startTime || selectedSlot.start,
            providerId: applyStaffToAll ? (providerId || null) : null,
            assistantId: applyStaffToAll ? (assistantId || null) : null,
            treatments: treatmentsWithStaff,
            notes,
            priority,
            ...(forceOverlap ? { skipPatientOverlapCheck: true } : {})
          });
        }
      } else {
        // Consultation
        if (isEditMode) {
          response = await planningApi.updateAppointment(appointment.id, payload);
        } else {
          response = await planningApi.createAppointment(payload);
        }
      }

      if (response.success) {
        onSave(response.data);
      } else {
        // Check if it's a conflict error from backend
        if (response.error?.message?.includes('conflict') || response.error?.message?.includes('disponible')) {
          setError(t('validation.slotConflict'));
        } else {
          setError(response.error?.message || t('messages.error'));
        }
      }
    } catch (err) {
      console.error('Error saving appointment:', err);
      setError(t('messages.error'));
    } finally {
      setSaving(false);
    }
  };

  // Handle save with conflict detection
  const handleSave = async () => {
    if (!selectedSlot || !patientId) {
      setError(t('validation.patientRequired'));
      return;
    }

    // Build save data
    const startTime = selectedSlot.start || selectedSlot.startTime;
    let saveData;

    if (category === 'treatment') {
      saveData = {
        category,
        patientId,
        date,
        startTime,
        duration: selectedTreatments[0]?.duration || 30,
        machineId: selectedSlot.machineId,
        treatmentId: selectedTreatments[0]?.id,
        serviceId: selectedTreatments[0]?.id,
        priority,
        reason,
        notes
      };
      if (assistantId) saveData.assistantId = assistantId;
      if (providerId) saveData.providerId = providerId;
    } else {
      saveData = {
        category,
        patientId,
        date,
        startTime,
        duration: selectedSlot.duration || 30,
        providerId,
        priority,
        reason,
        notes
      };
    }

    // Handle group edit: update the entire group with provider/assistant
    if (isEditMode && editMode === 'group' && groupId) {
      setSaving(true);
      setError(null);
      try {
        const groupUpdateData = {
          notes,
          priority,
          providerId: providerId || null,
          assistantId: assistantId || null
        };
        const response = await planningApi.updateAppointmentGroup(groupId, groupUpdateData);
        if (response.success) {
          onSave(response.data);
        } else {
          setError(response.error?.message || t('messages.error'));
        }
      } catch (err) {
        console.error('Error updating group:', err);
        setError(t('messages.error'));
      } finally {
        setSaving(false);
      }
      return;
    }

    // Check for conflicts (patient overlap in create & edit, resource in edit)
    if (!isEditMode || (isEditMode && editMode === 'single')) {
      setSaving(true);
      const conflict = await checkForConflicts(saveData);
      setSaving(false);

      if (conflict) {
        setConflictInfo(conflict);
        setPendingSaveData(saveData);
        setShowConflictModal(true);
        return;
      }
    }

    // No conflict, proceed with save
    await executeSave(saveData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              {isEditMode ? t('appointment.edit') : t('appointment.new')}
              {isEditMode && editMode === 'group' && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Link className="w-3 h-3" />
                  {t('multiTreatment.groupEdit')}
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-500">
              {t(`booking.step${step}`)}
              {isEditMode && isLinkedAppointment && editMode === 'single' && (
                <span className="ml-2 text-purple-600">
                  ({t('linkedGroup.position', { current: appointment.linkSequence || 1, total: linkedGroup?.count || '?' })})
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Steps indicator — clickable in edit mode for direct navigation */}
        <div className="flex items-center justify-center gap-2 py-3 bg-gray-50 border-b">
          {[1, 2, 3, 4].map(s => {
            const isCompleted = s < step;
            const isCurrent = s === step;
            // In edit mode, allow clicking any step. In create mode, only allow clicking completed steps.
            const isClickable = isEditMode || isCompleted;

            return (
              <div key={s} className="flex items-center">
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && setStep(s)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isCurrent
                      ? 'bg-blue-600 text-white'
                      : isEditMode
                      ? 'bg-gray-300 text-gray-600 hover:bg-blue-200'
                      : 'bg-gray-200 text-gray-500'
                  } ${isClickable ? 'cursor-pointer hover:ring-2 hover:ring-blue-300' : 'cursor-default'}`}
                  title={isClickable ? t(`booking.step${s}`) : undefined}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : s}
                </button>
                {s < 4 && (
                  <div className={`w-12 h-1 mx-1 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Group overview when editing linked group */}
        {isEditMode && editMode === 'group' && linkedGroup && (
          <div className="px-6 py-3 bg-purple-50 border-b">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-purple-800 flex items-center gap-2">
                <Link className="w-4 h-4" />
                {t('linkedGroup.groupOverview')}
              </h3>
              {completedCount > 0 && (
                <button
                  onClick={() => setShowCompletedAppointments(!showCompletedAppointments)}
                  className="text-xs text-purple-600 hover:text-purple-800"
                >
                  {showCompletedAppointments ? t('linkedGroup.hideCompleted') : t('linkedGroup.showCompleted')}
                  ({completedCount})
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {linkedGroup.appointments
                ?.filter(a => showCompletedAppointments || a.status !== 'completed')
                .map((apt, idx) => (
                  <div
                    key={apt.id}
                    className={`text-xs px-2 py-1 rounded border flex items-center gap-1 ${
                      apt.status === 'completed'
                        ? 'bg-gray-100 border-gray-300 text-gray-500'
                        : apt.id === appointment?.id
                        ? 'bg-purple-200 border-purple-400 text-purple-800'
                        : 'bg-white border-purple-200 text-purple-700'
                    }`}
                  >
                    <span className="font-medium">{apt.linkSequence || idx + 1}.</span>
                    <span className="truncate max-w-[100px]">{apt.title || apt.service?.title || 'Traitement'}</span>
                    <span className="text-purple-500">({apt.duration || 30}min)</span>
                    {apt.status === 'completed' && (
                      <Check className="w-3 h-3 text-green-500" />
                    )}
                  </div>
                ))}
            </div>
            <div className="text-xs text-purple-600 mt-2">
              {t('multiTreatment.totalDuration')}: {linkedGroup.totalDuration || totalDuration} min
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          {loadingGroup && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            </div>
          )}

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

              {/* Clinic closed day message */}
              {closedDayInfo?.isClosed && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="font-semibold text-red-700">
                      {clinicName
                        ? t('clinicClosed.title', { name: clinicName })
                        : t('clinicClosed.titleDefault')
                      }
                    </span>
                  </div>
                  <p className="text-sm text-red-600">
                    {closedDayInfo.reason === 'closedDay'
                      ? t('clinicClosed.closedDay')
                      : t('clinicClosed.nonOperatingDay')
                    }
                  </p>
                  {closedDayInfo.closedReason && (
                    <p className="text-sm text-red-500 mt-1">
                      {t('clinicClosed.closedReason', { reason: closedDayInfo.closedReason })}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mt-2">
                    {t('clinicClosed.selectAnotherDate')}
                  </p>
                </div>
              )}

              {/* Multi-treatment info */}
              {!closedDayInfo?.isClosed && category === 'treatment' && selectedTreatments.length > 1 && (
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

              {!closedDayInfo?.isClosed && (
              <div>
                {/* Current slot display in edit mode */}
                {isEditMode && appointment && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('slots.currentSlot')}
                    </label>
                    {(() => {
                      const currentStart = appointment.startTime;
                      const currentEnd = appointment.endTime;
                      const currentSlotKey = `${currentStart}-${currentEnd}`;
                      const selectedKey = selectedSlot ? `${selectedSlot.startTime || selectedSlot.start}-${selectedSlot.endTime || selectedSlot.end}` : null;
                      const isCurrentSelected = currentSlotKey === selectedKey;

                      return (
                        <button
                          type="button"
                          onClick={() => handleSlotSelect({
                            start: currentStart,
                            end: currentEnd,
                            startTime: currentStart,
                            endTime: currentEnd,
                            machineId: appointment.machineId,
                            duration: appointment.duration || totalDuration
                          })}
                          className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                            isCurrentSelected
                              ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                              : 'border-gray-300 bg-gray-50 hover:border-green-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {isCurrentSelected ? (
                                <Check className="w-5 h-5 text-green-600" />
                              ) : (
                                <Clock className="w-5 h-5 text-gray-400" />
                              )}
                              <div>
                                <span className={`font-medium ${isCurrentSelected ? 'text-green-700' : 'text-gray-700'}`}>
                                  {currentStart} - {currentEnd}
                                </span>
                                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                                  isCurrentSelected ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'
                                }`}>
                                  {t('slots.current')}
                                </span>
                              </div>
                            </div>
                            <div className="text-right text-sm text-gray-500">
                              {appointment.machine?.name && (
                                <span>{appointment.machine.name}</span>
                              )}
                              {appointment.duration && (
                                <span className="ml-2 text-xs text-gray-400">({appointment.duration} min)</span>
                              )}
                            </div>
                          </div>
                          {/* Show linked group segments if editing group */}
                          {editMode === 'group' && linkedGroup?.appointments && (
                            <div className="mt-2 space-y-1">
                              {linkedGroup.appointments
                                .filter(a => a.status !== 'completed')
                                .map((apt, idx) => (
                                  <div key={apt.id} className={`flex items-center text-xs ${isCurrentSelected ? 'text-green-800' : 'text-gray-600'}`}>
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center mr-2 text-[10px] ${isCurrentSelected ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                                      {idx + 1}
                                    </span>
                                    <span className="flex-1 truncate font-medium">{apt.title || apt.service?.title}</span>
                                    <span className="mx-2 text-gray-400">•</span>
                                    <span>{apt.machine?.name}</span>
                                    <span className="mx-2 text-gray-400">•</span>
                                    <span className="font-mono">{apt.startTime}-{apt.endTime}</span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </button>
                      );
                    })()}
                  </div>
                )}

                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isEditMode ? t('slots.alternatives') : t('slots.available')}
                </label>
                {loadingSlots ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2" />
                    {t('calendar.loading')}
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    {isEditMode ? t('slots.noAlternatives') : t('slots.noSlots')}
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
              )}
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

              {/* Staff Assignment Section */}
              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <UserCheck className="w-4 h-4 text-gray-500" />
                  <h4 className="text-sm font-medium text-gray-700">{t('staffAssignment.title')}</h4>
                  <span className="text-xs text-gray-400">({t('staffAssignment.subtitle')})</span>
                </div>

                {/* Practitioner dropdown */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t('staffAssignment.practitioner')}
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={providerId || ''}
                      onChange={(e) => handleProviderChange(e.target.value || null)}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{t('staffAssignment.none')}</option>
                      {practitionerProviders.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}{p.specialty ? ` — ${p.specialty}` : ''}
                        </option>
                      ))}
                    </select>

                    {/* Conflict indicator */}
                    {checkingProvider && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </span>
                    )}
                    {!checkingProvider && providerId && providerConflict && (
                      <>
                        {providerConflict.hasConsultationConflict && (
                          <span className="flex items-center gap-1 text-xs text-red-600" title={t('staffAssignment.consultationConflict')}>
                            <ShieldAlert className="w-4 h-4" />
                          </span>
                        )}
                        {!providerConflict.hasConsultationConflict && providerConflict.hasTreatmentConflict && (
                          <span className="flex items-center gap-1 text-xs text-orange-500" title={t('staffAssignment.treatmentConflictWarning')}>
                            <AlertTriangle className="w-4 h-4" />
                          </span>
                        )}
                        {!providerConflict.hasConsultationConflict && !providerConflict.hasTreatmentConflict && (
                          <span className="flex items-center gap-1 text-xs text-green-600" title={t('staffAssignment.available')}>
                            <ShieldCheck className="w-4 h-4" />
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Conflict details */}
                  {!checkingProvider && providerId && providerConflict?.hasConsultationConflict && (
                    <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 flex-shrink-0" />
                      {t('staffAssignment.consultationConflict')}
                    </div>
                  )}
                  {!checkingProvider && providerId && providerConflict?.hasTreatmentConflict && !providerConflict?.hasConsultationConflict && (
                    <div className="mt-1 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                      {t('staffAssignment.treatmentConflict', { count: providerConflict.conflicts?.length || 1 })}
                    </div>
                  )}
                </div>

                {/* Assistant dropdown */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t('staffAssignment.assistant')}
                  </label>
                  <select
                    value={assistantId || ''}
                    onChange={(e) => handleAssistantChange(e.target.value || null)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('staffAssignment.none')}</option>
                    {assistantProviders.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.profession ? ` — ${p.profession}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Apply to all toggle (only for multi-treatment) */}
                {category === 'treatment' && selectedTreatments.length > 1 && (
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={applyStaffToAll}
                        onChange={(e) => {
                          setApplyStaffToAll(e.target.checked);
                          if (e.target.checked) {
                            setTreatmentStaffOverrides({});
                          }
                        }}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{t('staffAssignment.applyToAll')}</span>
                    </label>

                    {/* Per-slot overrides */}
                    {!applyStaffToAll && (
                      <div className="mt-3 space-y-2 pl-2 border-l-2 border-gray-200">
                        <p className="text-xs font-medium text-gray-500 uppercase">{t('staffAssignment.perSlot')}</p>
                        {selectedTreatments.map((treatment, idx) => (
                          <div key={treatment.id} className="p-2 bg-gray-50 rounded-lg space-y-1">
                            <div className="text-xs font-medium text-gray-700">
                              {t('staffAssignment.slot', { number: idx + 1 })} — {treatment.title}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <select
                                value={treatmentStaffOverrides[idx]?.providerId || ''}
                                onChange={(e) => handleSlotStaffChange(idx, 'providerId', e.target.value)}
                                className="px-2 py-1 border rounded text-xs focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">{t('staffAssignment.selectPractitioner')}</option>
                                {practitionerProviders.map(p => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>
                              <select
                                value={treatmentStaffOverrides[idx]?.assistantId || ''}
                                onChange={(e) => handleSlotStaffChange(idx, 'assistantId', e.target.value)}
                                className="px-2 py-1 border rounded text-xs focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">{t('staffAssignment.selectAssistant')}</option>
                                {assistantProviders.map(p => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

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
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => step > 1 ? setStep(step - 1) : onClose()}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {step > 1 ? t('actions.previous') : t('actions.cancel')}
            </button>

            {/* Delete button (only in edit mode) */}
            {isEditMode && (
              <button
                onClick={handleDeleteClick}
                disabled={saving}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {t('actions.delete')}
              </button>
            )}
          </div>

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
              {saving ? t('actions.saving') : (isEditMode ? t('actions.save') : t('actions.create'))}
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

      {/* Linked Group Choice Modal */}
      <LinkedGroupChoiceModal
        isOpen={showLinkedChoiceModal}
        onClose={() => {
          setShowLinkedChoiceModal(false);
          if (linkedChoiceMode === 'edit') {
            // If cancelled during edit choice, close the main modal
            onClose();
          }
        }}
        onChooseSingle={linkedChoiceMode === 'edit' ? handleChooseSingleEdit : handleChooseSingleDelete}
        onChooseGroup={linkedChoiceMode === 'edit' ? handleChooseGroupEdit : handleChooseGroupDelete}
        onChooseAllPatient={linkedChoiceMode === 'delete' ? handleDeleteAllPatient : undefined}
        mode={linkedChoiceMode}
        groupCount={linkedGroup?.count || linkedGroup?.appointments?.length || 0}
        completedCount={completedCount}
        patientName={appointment?.patient?.fullName}
        patientAppointmentsCount={patientAppointmentsCount}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        isLinked={isLinkedAppointment && editMode === 'single'}
        onKeepGap={handleDeleteKeepGap}
        onRecalculate={handleDeleteRecalculate}
      />

      {/* Conflict Modal */}
      <ConflictModal
        isOpen={showConflictModal}
        onClose={() => setShowConflictModal(false)}
        onOverlap={handleConflictOverlap}
        onCancel={handleConflictCancel}
        conflictInfo={conflictInfo}
      />
    </div>
  );
};

export default PlanningBookingModal;
