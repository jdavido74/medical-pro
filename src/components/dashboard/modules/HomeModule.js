// components/dashboard/modules/HomeModule.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  Heart, UserPlus, CalendarPlus, ArrowRight, Stethoscope,
  Clock, AlertCircle, Edit2, AlertTriangle, PlayCircle, RefreshCw,
  CheckCircle2, Plus, Users
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../../auth/PermissionGuard';
import { usePatients } from '../../../contexts/PatientContext';
import planningApi from '../../../api/planningApi';
import PatientFormModal from '../modals/PatientFormModal';
import PlanningBookingModal from '../modals/PlanningBookingModal';

const HomeModule = ({ setActiveModule }) => {
  const { user } = useAuth();
  const { t } = useTranslation('dashboard');
  const { hasPermission } = usePermissions();
  const { patients, createPatient, getIncompletePatients } = usePatients();

  // Appointments state
  const [appointments, setAppointments] = useState([]);
  const [resources, setResources] = useState({ machines: [], providers: [] });
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  // Modal state
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Live clock for late detection (updates every minute)
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Incomplete patients from context
  const incompletePatients = getIncompletePatients ? getIncompletePatients() : patients.filter(p => p.isIncomplete && !p.deleted);

  // Today's date in YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];

  // Fetch today's appointments
  const loadAppointments = useCallback(async () => {
    if (!hasPermission('appointments.view')) return;
    setLoadingAppointments(true);
    try {
      const [calendarResponse, resourcesResponse] = await Promise.all([
        planningApi.getCalendar({ startDate: today, endDate: today }),
        planningApi.getResources()
      ]);
      if (calendarResponse.success) {
        setAppointments(calendarResponse.data || []);
      }
      if (resourcesResponse.success) {
        setResources(resourcesResponse.data || { machines: [], providers: [] });
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoadingAppointments(false);
    }
  }, [today, hasPermission]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // Filter & sort appointments: exclude cancelled, sort by startTime
  const todayAppointments = appointments
    .filter(apt => apt.status !== 'cancelled')
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  // Late appointments: startTime passed but still scheduled or confirmed
  const isAptLate = useCallback((apt) => {
    if (!apt.startTime || !apt.date) return false;
    if (apt.status !== 'scheduled' && apt.status !== 'confirmed') return false;
    const [h, m] = apt.startTime.split(':').map(Number);
    const aptStart = new Date(apt.date);
    aptStart.setHours(h, m, 0, 0);
    return now > aptStart;
  }, [now]);

  const lateAppointments = todayAppointments.filter(isAptLate);

  // Calculate late minutes
  const getLateMinutes = useCallback((apt) => {
    if (!apt.startTime || !apt.date) return 0;
    const [h, m] = apt.startTime.split(':').map(Number);
    const aptStart = new Date(apt.date);
    aptStart.setHours(h, m, 0, 0);
    return Math.floor((now - aptStart) / 60000);
  }, [now]);

  // Quick status change
  const handleQuickStatusChange = async (appointmentId, newStatus) => {
    try {
      await planningApi.updateAppointment(appointmentId, { status: newStatus });
      setAppointments(prev => prev.map(apt =>
        apt.id === appointmentId ? { ...apt, status: newStatus } : apt
      ));
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // Patient name display: "Maria O."
  const formatPatientName = (apt) => {
    const firstName = apt.patient?.firstName || '';
    const lastName = apt.patient?.lastName || '';
    if (lastName) return `${firstName} ${lastName.charAt(0)}.`;
    return firstName;
  };

  // Status badge config
  const statusConfig = {
    scheduled: { label: t('todayAppointments.scheduled', 'Programada'), bg: 'bg-yellow-100', text: 'text-yellow-800' },
    confirmed: { label: t('todayAppointments.confirmed', 'Confirmada'), bg: 'bg-green-100', text: 'text-green-800' },
    in_progress: { label: t('todayAppointments.inProgress', 'En curso'), bg: 'bg-blue-100', text: 'text-blue-800' },
    completed: { label: t('todayAppointments.completed', 'Terminada'), bg: 'bg-gray-100', text: 'text-gray-600' },
    no_show: { label: t('todayAppointments.noShow', 'No show'), bg: 'bg-red-100', text: 'text-red-800' }
  };

  // Row background by status
  const rowBgByStatus = {
    confirmed: 'bg-green-50',
    in_progress: 'bg-blue-50',
    completed: 'bg-gray-50'
  };

  // Onboarding
  const onboardingSteps = [
    {
      step: 1,
      title: t('configureClinic'),
      description: t('onboarding.clinicInfo'),
      completed: Boolean(user?.companyName),
      action: () => setActiveModule('settings')
    },
    {
      step: 2,
      title: t('addPatients'),
      description: t('onboarding.addPatients'),
      completed: patients.length > 0,
      action: () => setActiveModule('patients')
    },
    {
      step: 3,
      title: t('planConsultations'),
      description: t('onboarding.planConsultations'),
      completed: appointments.length > 0,
      action: () => setActiveModule('appointments')
    },
    {
      step: 4,
      title: t('createFirstRecord'),
      description: t('onboarding.createRecord'),
      completed: false,
      action: () => setActiveModule('medical-records')
    }
  ];

  const completedSteps = onboardingSteps.filter(step => step.completed).length;
  const progress = (completedSteps / onboardingSteps.length) * 100;

  // Quick actions with modals
  const quickActions = [];
  if (hasPermission('patients.create') || hasPermission('patients.view')) {
    quickActions.push({
      id: 'new-patient',
      title: t('newPatient'),
      description: t('quickActions.addPatient'),
      icon: UserPlus,
      color: 'green',
      action: () => setShowPatientModal(true)
    });
  }
  if (hasPermission('appointments.create')) {
    quickActions.push({
      id: 'new-appointment',
      title: t('newAppointment'),
      description: t('quickActions.planConsultation'),
      icon: CalendarPlus,
      color: 'blue',
      action: () => setShowBookingModal(true)
    });
  }
  if (hasPermission('medical_records.view')) {
    quickActions.push({
      id: 'new-consultation',
      title: t('newConsultation'),
      description: t('quickActions.createRecord'),
      icon: Plus,
      color: 'purple',
      action: () => setActiveModule('medical-records')
    });
  }

  // Handle new patient save
  const handlePatientSave = async (formData) => {
    try {
      await createPatient(formData);
      setShowPatientModal(false);
    } catch (error) {
      console.error('Error creating patient:', error);
    }
  };

  // Handle new booking save
  const handleBookingSave = async () => {
    setShowBookingModal(false);
    loadAppointments();
  };

  const canViewAppointments = hasPermission('appointments.view');

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {t('welcome', { name: user?.name?.split(' ')[0] || '' })}
            </h1>
          </div>
          <div className="text-right">
            <Stethoscope className="h-16 w-16 text-green-200 mb-2" />
            <div className="text-sm text-green-100">
              {new Date().toLocaleDateString(undefined, {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Today's appointments */}
      {canViewAppointments && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CalendarPlus className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('todayAppointments.title', 'Citas de hoy')} — {new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}
                </h3>
                <p className="text-sm text-gray-500">
                  {todayAppointments.length} {t('todayAppointments.total', 'cita(s)')}
                </p>
              </div>
            </div>
            <button
              onClick={loadAppointments}
              disabled={loadingAppointments}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title={t('todayAppointments.refresh', 'Actualizar')}
            >
              <RefreshCw className={`h-5 w-5 ${loadingAppointments ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loadingAppointments && todayAppointments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin text-blue-400" />
              <p>{t('todayAppointments.loading', 'Cargando citas...')}</p>
            </div>
          ) : todayAppointments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CalendarPlus className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">{t('todayAppointments.empty', 'No hay citas para hoy')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayAppointments.map((apt) => {
                const status = statusConfig[apt.status] || statusConfig.scheduled;
                const late = isAptLate(apt);
                const lateMin = late ? getLateMinutes(apt) : 0;
                const rowBg = rowBgByStatus[apt.status] || '';
                return (
                  <div
                    key={apt.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${rowBg} ${late ? 'border-red-300' : 'border-gray-100'} transition-colors`}
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {/* Time */}
                      <div className="text-sm font-mono text-gray-700 whitespace-nowrap">
                        {apt.startTime?.slice(0, 5)} - {apt.endTime?.slice(0, 5)}
                      </div>
                      {/* Late indicator */}
                      {late && (
                        <div className="flex items-center space-x-1 text-red-600" title={t('todayAppointments.lateMinutes', { count: lateMin })}>
                          <Clock className="h-4 w-4" />
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                      )}
                      {/* Patient name */}
                      <span className="font-medium text-gray-900 truncate">
                        {formatPatientName(apt)}
                      </span>
                      {/* Treatment / Consultation label */}
                      <span className="text-xs text-gray-500 truncate">
                        {apt.title || apt.service?.title || (apt.category === 'consultation' ? t('todayAppointments.consultation', 'Consulta') : '')}
                      </span>
                      {/* Status badge */}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text} whitespace-nowrap`}>
                        {status.label}
                      </span>
                    </div>
                    {/* Action buttons */}
                    <div className="flex items-center space-x-2 ml-2">
                      {apt.status === 'scheduled' && (
                        <button
                          onClick={() => handleQuickStatusChange(apt.id, 'confirmed')}
                          className="px-3 py-1 text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors"
                        >
                          {t('todayAppointments.confirm', 'Confirmar')}
                        </button>
                      )}
                      {apt.status === 'confirmed' && (
                        <button
                          onClick={() => handleQuickStatusChange(apt.id, 'in_progress')}
                          className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors flex items-center space-x-1"
                        >
                          <PlayCircle className="h-3.5 w-3.5" />
                          <span>{t('todayAppointments.start', 'Iniciar')}</span>
                        </button>
                      )}
                      {apt.status === 'in_progress' && (
                        <button
                          onClick={() => handleQuickStatusChange(apt.id, 'completed')}
                          className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors flex items-center space-x-1"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>{t('todayAppointments.finish', 'Terminar')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Late appointments alert */}
      {canViewAppointments && lateAppointments.length > 0 && (
        <div className="bg-orange-50 rounded-xl shadow-sm border border-orange-300 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-orange-900">
                {t('lateAppointments.title', 'Pacientes en espera')}
              </h3>
              <p className="text-sm text-orange-700">
                {lateAppointments.length} {t('lateAppointments.subtitle', 'cita(s) con retraso')}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {lateAppointments.map((apt) => {
              const lateMin = getLateMinutes(apt);
              return (
                <div
                  key={apt.id}
                  className="flex items-center justify-between p-3 bg-white border border-orange-200 rounded-lg"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="text-sm font-mono text-gray-700 whitespace-nowrap">
                      {apt.startTime?.slice(0, 5)}
                    </div>
                    <span className="font-medium text-gray-900 truncate">
                      {formatPatientName(apt)}
                    </span>
                    <span className="text-sm text-red-600 font-medium whitespace-nowrap flex items-center space-x-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{t('lateAppointments.lateMinutes', { count: lateMin, defaultValue: `Retrasada ${lateMin} min` })}</span>
                    </span>
                  </div>
                  <div className="ml-2">
                    {(apt.status === 'scheduled' || apt.status === 'confirmed') && (
                      <button
                        onClick={() => handleQuickStatusChange(apt.id, apt.status === 'scheduled' ? 'confirmed' : 'in_progress')}
                        className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors flex items-center space-x-1"
                      >
                        <PlayCircle className="h-3.5 w-3.5" />
                        <span>{apt.status === 'scheduled' ? t('todayAppointments.confirm', 'Confirmar') : t('todayAppointments.start', 'Iniciar')}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick actions */}
      {quickActions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('quickActionsTitle')}</h3>
          <div className={`grid grid-cols-1 md:grid-cols-${quickActions.length} gap-4`}>
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={action.action}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 bg-${action.color}-100 rounded-lg`}>
                      <Icon className={`h-6 w-6 text-${action.color}-600`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 group-hover:text-gray-700">
                        {action.title}
                      </h4>
                      <p className="text-sm text-gray-500">{action.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Incomplete patients */}
      {incompletePatients.length > 0 && (
        <div className="bg-orange-50 rounded-xl shadow-sm border border-orange-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-orange-900">
                  {t('incompletePatients.title')}
                </h3>
                <p className="text-sm text-orange-700">
                  {t('incompletePatients.description', { count: incompletePatients.length })}
                </p>
              </div>
            </div>
            <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium">
              {incompletePatients.length}
            </span>
          </div>

          <div className="space-y-2">
            {incompletePatients.slice(0, 5).map((patient) => (
              <div
                key={patient.id}
                className="flex items-center justify-between p-3 bg-white border border-orange-100 rounded-lg hover:bg-orange-50 transition-colors"
              >
                <div className="flex items-center space-x-3 flex-1">
                  <Users className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {patient.firstName} {patient.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {patient.email || patient.contact?.email || patient.phone || patient.contact?.phone || t('noContact')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveModule('patients')}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg transition-colors text-sm font-medium"
                  title={t('completeProfile')}
                >
                  <Edit2 className="h-4 w-4" />
                  <span>{t('complete')}</span>
                </button>
              </div>
            ))}
          </div>

          {incompletePatients.length > 5 && (
            <button
              onClick={() => setActiveModule('patients')}
              className="w-full mt-3 px-4 py-2 text-orange-700 hover:bg-orange-100 rounded-lg transition-colors font-medium text-sm"
            >
              {t('incompletePatients.seeMore', { count: incompletePatients.length - 5 })}
            </button>
          )}
        </div>
      )}

      {/* Onboarding */}
      {completedSteps < onboardingSteps.length && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {t('clinicConfiguration')}
            </h3>
            <div className="text-sm text-gray-500">
              {completedSteps}/{onboardingSteps.length} {t('steps')}
            </div>
          </div>

          <div className="mb-6">
            <div className="bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          <div className="space-y-3">
            {onboardingSteps.map((step) => (
              <div
                key={step.step}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  step.completed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    step.completed ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
                  }`}>
                    {step.completed ? '✓' : step.step}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{step.title}</h4>
                    <p className="text-sm text-gray-500">{step.description}</p>
                  </div>
                </div>
                {!step.completed && (
                  <button
                    onClick={step.action}
                    className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center"
                  >
                    {t('start')} <ArrowRight className="h-4 w-4 ml-1" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compliance */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <Heart className="h-6 w-6 text-green-600 mt-1" />
          <div>
            <h4 className="font-semibold text-green-800 mb-2">
              {t('medicalCompliance')}
            </h4>
            <p className="text-green-700 text-sm mb-3">
              {t('complianceDescription')}
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                ✓ {t('compliance.medicalSecret')}
              </span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                ✓ {t('compliance.gdpr')}
              </span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                ✓ {t('compliance.auditTrail')}
              </span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                ✓ {t('compliance.secureBackup')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showPatientModal && (
        <PatientFormModal
          isOpen={showPatientModal}
          onClose={() => setShowPatientModal(false)}
          onSave={handlePatientSave}
          patient={null}
        />
      )}

      {showBookingModal && (
        <PlanningBookingModal
          isOpen={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          onSave={handleBookingSave}
          appointment={null}
          resources={resources}
          initialDate={today}
        />
      )}
    </div>
  );
};

export default HomeModule;
