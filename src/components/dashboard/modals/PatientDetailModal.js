// components/dashboard/modals/PatientDetailModal.js
import React, { useState, useEffect, useCallback } from 'react';
import { sanitizeHTML } from '../../../utils/sanitize';
import {
  X, Edit2, User, MapPin, Phone, Mail, Building, Calendar,
  Shield, Heart, Activity, FileText, Clock, Eye, Stethoscope, Plus,
  ClipboardCheck, CheckCircle, Loader, ExternalLink, AlertCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import MedicalHistoryViewer from '../../medical/MedicalHistoryViewer';
import MedicalHistoryModal from './MedicalHistoryModal';
import AppointmentFormModal from '../../modals/AppointmentFormModal';
import PatientConsentsTab from '../../patient/PatientConsentsTab';
import { medicalRecordsStorage } from '../../../utils/medicalRecordsStorage';
import { appointmentsStorage } from '../../../utils/appointmentsStorage';
import { usePermissions } from '../../auth/PermissionGuard';
import { PERMISSIONS } from '../../../utils/permissionsStorage';
import { baseClient } from '../../../api/baseClient';

const PatientDetailModal = ({
  patient,
  isOpen,
  onClose,
  onEdit,
  canViewMedicalData,
  canViewAllData,
  initialTab = 'general'
}) => {
  const { t } = useTranslation(['patients', 'common']);
  const [activeTab, setActiveTab] = useState(initialTab);

  // Reset to initialTab when modal opens or initialTab changes
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);
  const [isMedicalHistoryModalOpen, setIsMedicalHistoryModalOpen] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const { hasPermission } = usePermissions();

  // State pour les consentements signés
  const [signedConsents, setSignedConsents] = useState([]);
  const [consentsLoading, setConsentsLoading] = useState(false);
  const [viewingConsent, setViewingConsent] = useState(null);

  // Charger les consentements signés du patient
  const fetchSignedConsents = useCallback(async () => {
    if (!patient?.id) return;

    try {
      setConsentsLoading(true);
      const response = await baseClient.get(`/consents/patient/${patient.id}`);
      const consents = response.data?.data || [];
      // Filtrer uniquement les consentements signés/acceptés
      setSignedConsents(consents.filter(c => c.status === 'accepted'));
    } catch (err) {
      console.error('Error fetching patient consents:', err);
      setSignedConsents([]);
    } finally {
      setConsentsLoading(false);
    }
  }, [patient?.id]);

  // Charger les consentements quand le modal s'ouvre
  useEffect(() => {
    if (isOpen && patient?.id) {
      fetchSignedConsents();
    }
  }, [isOpen, patient?.id, fetchSignedConsents]);

  // Permissions pour les dossiers médicaux
  const canEditMedicalRecords = hasPermission(PERMISSIONS.MEDICAL_RECORDS_EDIT);
  const canViewMedicalRecords = hasPermission(PERMISSIONS.MEDICAL_RECORDS_VIEW);

  // Permissions pour les rendez-vous
  const canViewAppointments = hasPermission(PERMISSIONS.APPOINTMENTS_VIEW);
  const canCreateAppointments = hasPermission(PERMISSIONS.APPOINTMENTS_CREATE);

  // Gestionnaires pour les enregistrements médicaux
  const handleEditMedicalRecord = (record) => {
    // Ici on pourrait ouvrir un modal d'édition d'enregistrement médical
    console.log('Editing medical record:', record);
  };

  const handleViewMedicalRecord = (record) => {
    // Ici on pourrait ouvrir un modal de visualisation d'enregistrement médical
    console.log('Viewing medical record:', record);
  };

  const handleOpenMedicalHistoryModal = () => {
    setIsMedicalHistoryModalOpen(true);
  };

  const handleOpenAppointmentModal = () => {
    setIsAppointmentModalOpen(true);
  };

  const handleSaveAppointment = (appointment) => {
    // Optionally refresh appointments list
    console.log('Appointment saved:', appointment);
  };

  if (!isOpen || !patient) return null;

  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  };

  const getGenderIcon = (gender) => {
    switch (gender) {
      case 'male': return '👨';
      case 'female': return '👩';
      default: return '👤';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const tabs = [
    {
      id: 'general',
      label: t('patients:detail.tabs.general'),
      icon: User,
      visible: true
    },
    {
      id: 'contact',
      label: t('patients:detail.tabs.contact'),
      icon: Phone,
      visible: true
    },
    {
      id: 'medical',
      label: t('patients:detail.tabs.medical'),
      icon: Stethoscope,
      visible: canViewMedicalData
    },
    {
      id: 'administrative',
      label: t('patients:detail.tabs.administrative'),
      icon: Building,
      visible: canViewAllData
    },
    {
      id: 'appointments',
      label: t('patients:detail.tabs.appointments'),
      icon: Calendar,
      visible: canViewAppointments
    },
    {
      id: 'consents',
      label: t('patients:detail.tabs.consents'),
      icon: ClipboardCheck,
      visible: true
    },
    {
      id: 'access',
      label: t('patients:detail.tabs.access'),
      icon: Shield,
      visible: canViewAllData
    }
  ].filter(tab => tab.visible);

  const renderGeneralTab = () => (
    <div className="space-y-6">
      {/* Información básica */}
      <div className="bg-green-50 rounded-lg p-6 border border-green-200">
        <div className="flex items-center space-x-4 mb-4">
          <div className="text-4xl">
            {getGenderIcon(patient.gender)}
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {patient.firstName} {patient.lastName}
            </h3>
            <p className="text-gray-600">
              {t('patients:detail.patientNumber', { number: patient.patientNumber })}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {patient.profileStatus === 'provisional' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-700">
                {t('patients:statuses.provisional', 'Provisoire')}
              </span>
            )}
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(patient.status)}`}>
              {patient.status === 'active' ? t('patients:status.active') : t('patients:status.inactive')}
            </span>
          </div>
        </div>
      </div>

      {/* Bandeau de complétion pour profils provisoires */}
      {patient.profileStatus === 'provisional' && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-orange-800">
                  {t('patients:provisional.incompleteProfile', 'Profil provisoire')}
                </p>
                <p className="text-xs text-orange-600 mt-0.5">
                  {t('patients:provisional.completeInvitation', 'Complétez le nom et l\'email pour finaliser le profil patient.')}
                </p>
              </div>
            </div>
            {onEdit && (
              <button
                onClick={onEdit}
                className="px-3 py-1.5 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 transition-colors whitespace-nowrap"
              >
                {t('patients:provisional.completeNow', 'Compléter le profil')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Datos personales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('patients:detail.dateOfBirth')}
            </label>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-gray-900">
                {new Date(patient.birthDate).toLocaleDateString()}
                <span className="text-gray-600 ml-2">({calculateAge(patient.birthDate)} {t('common:years')})</span>
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('patients:detail.sex')}
            </label>
            <span className="text-gray-900">
              {patient.gender === 'male' ? t('patients:detail.genders.male') :
               patient.gender === 'female' ? t('patients:detail.genders.female') : t('patients:detail.genders.other')}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('patients:detail.idNumber')}
            </label>
            <span className="text-gray-900">{patient.idNumber}</span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('patients:detail.nationality')}
            </label>
            <span className="text-gray-900">{patient.nationality}</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('patients:detail.registrationDate')}
            </label>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-gray-900">
                {new Date(patient.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('patients:detail.lastUpdated')}
            </label>
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-gray-400" />
              <span className="text-gray-900">
                {new Date(patient.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Consentements signés */}
      <div className="bg-white p-6 rounded-lg border">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
          <ClipboardCheck className="h-5 w-5 mr-2 text-green-600" />
          {t('patients:detail.signedConsents')}
          {signedConsents.length > 0 && (
            <span className="ml-2 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
              {signedConsents.length}
            </span>
          )}
        </h4>

        {consentsLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader className="h-5 w-5 text-gray-400 animate-spin" />
          </div>
        ) : signedConsents.length === 0 ? (
          <p className="text-gray-500 italic text-sm">{t('patients:detail.noSignedConsents')}</p>
        ) : (
          <div className="space-y-2">
            {signedConsents.map((consent) => (
              <div
                key={consent.id}
                className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100 hover:bg-green-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{consent.title}</p>
                    <p className="text-xs text-gray-500">
                      {t('patients:detail.signedOn')} {new Date(consent.signed_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingConsent(consent)}
                  className="p-2 text-green-600 hover:bg-green-200 rounded-lg transition-colors"
                  title={t('common:view')}
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderContactTab = () => (
    <div className="space-y-6">
      {/* Dirección */}
      <div className="bg-white p-6 rounded-lg border">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
          <MapPin className="h-5 w-5 mr-2 text-green-600" />
          {t('patients:detail.address')}
        </h4>

        {patient.address?.street ? (
          <div className="space-y-2">
            <p className="text-gray-900">{patient.address.street}</p>
            <p className="text-gray-900">
              {patient.address.postalCode} {patient.address.city}
            </p>
            <p className="text-gray-600">{patient.address.country}</p>
          </div>
        ) : (
          <p className="text-gray-500 italic">{t('patients:detail.noAddressRegistered')}</p>
        )}
      </div>

      {/* Información de contacto */}
      <div className="bg-white p-6 rounded-lg border">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
          <Phone className="h-5 w-5 mr-2 text-blue-600" />
          {t('patients:detail.contactInfo')}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('patients:detail.telephone')}
            </label>
            {patient.contact?.phone ? (
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900">{patient.contact.phone}</span>
              </div>
            ) : (
              <span className="text-gray-500 italic">{t('patients:detail.notRegistered')}</span>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('patients:email')}
            </label>
            {patient.contact?.email ? (
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900">{patient.contact.email}</span>
              </div>
            ) : (
              <span className="text-gray-500 italic">{t('patients:detail.notRegistered')}</span>
            )}
          </div>
        </div>
      </div>

      {/* Contacto de emergencia */}
      <div className="bg-red-50 p-6 rounded-lg border border-red-200">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
          <Shield className="h-5 w-5 mr-2 text-red-600" />
          {t('patients:detail.emergencyContact')}
        </h4>

        {patient.contact?.emergencyContact?.name ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('patients:detail.name')}
              </label>
              <span className="text-gray-900">{patient.contact.emergencyContact.name}</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('patients:detail.relationship')}
              </label>
              <span className="text-gray-900">{patient.contact.emergencyContact.relationship}</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('patients:detail.telephone')}
              </label>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900">{patient.contact.emergencyContact.phone}</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 italic">{t('patients:detail.noEmergencyContact')}</p>
        )}
      </div>
    </div>
  );

  const renderAdministrativeTab = () => (
    <div className="space-y-6">
      {/* Información del seguro */}
      <div className="bg-white p-6 rounded-lg border">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
          <Heart className="h-5 w-5 mr-2 text-purple-600" />
          {t('patients:detail.medicalInsurance')}
        </h4>

        {patient.insurance?.provider ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('patients:detail.provider')}
              </label>
              <span className="text-gray-900">{patient.insurance.provider}</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('patients:detail.policyNumber')}
              </label>
              <span className="text-gray-900">{patient.insurance.number}</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('patients:detail.insuranceType')}
              </label>
              <span className="text-gray-900">{patient.insurance.type}</span>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 italic">{t('patients:detail.noInsuranceInfo')}</p>
        )}
      </div>

      {/* Estadísticas del paciente */}
      <div className="bg-white p-6 rounded-lg border">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
          <FileText className="h-5 w-5 mr-2 text-blue-600" />
          {t('patients:detail.activitySummary')}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {appointmentsStorage.getByPatientId(patient.id).length}
            </div>
            <div className="text-sm text-blue-600">{t('patients:detail.totalAppointments')}</div>
          </div>

          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {medicalRecordsStorage.getByPatientId(patient.id).length}
            </div>
            <div className="text-sm text-green-600">{t('patients:detail.medicalRecordsCount')}</div>
          </div>

          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {medicalRecordsStorage.getStatistics(patient.id).activeTreatments}
            </div>
            <div className="text-sm text-purple-600">{t('patients:detail.activeTreatments')}</div>
          </div>
        </div>
      </div>

      {/* Información de facturación */}
      <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
          <Building className="h-5 w-5 mr-2 text-yellow-600" />
          {t('patients:detail.billingInfo')}
        </h4>

        <p className="text-gray-600 mb-4">
          {t('patients:detail.billingNote')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('patients:detail.billingStatus')}
            </label>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {t('patients:detail.upToDate')}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('patients:detail.preferredPaymentMethod')}
            </label>
            <span className="text-gray-900">{t('patients:detail.medicalInsurancePayment')}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMedicalTab = () => (
    <div className="space-y-6">
      <MedicalHistoryViewer
        patientId={patient.id}
        canEditRecords={canEditMedicalRecords}
        showStatistics={true}
        onEditRecord={handleEditMedicalRecord}
        onViewRecord={handleViewMedicalRecord}
      />
    </div>
  );

  const renderAppointmentsTab = () => {
    const patientAppointments = appointmentsStorage.getByPatientId(patient.id);
    const upcomingAppointments = patientAppointments.filter(apt =>
      new Date(apt.date) >= new Date() && !['cancelled', 'no_show'].includes(apt.status)
    );
    const pastAppointments = patientAppointments.filter(apt =>
      new Date(apt.date) < new Date() || ['completed', 'cancelled', 'no_show'].includes(apt.status)
    );

    const getStatusColor = (status) => {
      switch (status) {
        case 'scheduled': return 'bg-blue-100 text-blue-800';
        case 'confirmed': return 'bg-green-100 text-green-800';
        case 'in_progress': return 'bg-yellow-100 text-yellow-800';
        case 'completed': return 'bg-gray-100 text-gray-800';
        case 'cancelled': return 'bg-red-100 text-red-800';
        case 'no_show': return 'bg-orange-100 text-orange-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    const getStatusLabel = (status) => {
      return t(`patients:detail.appointmentStatuses.${status}`, { defaultValue: status });
    };

    return (
      <div className="space-y-6">
        {/* Quick actions */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{t('patients:detail.appointmentManagement')}</h3>
          {canCreateAppointments && (
            <button
              onClick={handleOpenAppointmentModal}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>{t('patients:detail.newAppointment')}</span>
            </button>
          )}
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">{upcomingAppointments.length}</div>
            <div className="text-sm text-blue-600">{t('patients:detail.upcomingAppointments')}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-600">
              {pastAppointments.filter(apt => apt.status === 'completed').length}
            </div>
            <div className="text-sm text-green-600">{t('patients:detail.completed')}</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="text-2xl font-bold text-red-600">
              {pastAppointments.filter(apt => apt.status === 'cancelled').length}
            </div>
            <div className="text-sm text-red-600">{t('patients:detail.cancelled')}</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="text-2xl font-bold text-orange-600">
              {pastAppointments.filter(apt => apt.status === 'no_show').length}
            </div>
            <div className="text-sm text-orange-600">{t('patients:detail.noShow')}</div>
          </div>
        </div>

        {/* Upcoming appointments */}
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b">
            <h4 className="font-semibold text-gray-900 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-blue-600" />
              {t('patients:detail.upcomingAppointments')} ({upcomingAppointments.length})
            </h4>
          </div>
          <div className="p-4">
            {upcomingAppointments.length > 0 ? (
              <div className="space-y-3">
                {upcomingAppointments
                  .sort((a, b) => new Date(a.date + 'T' + a.startTime) - new Date(b.date + 'T' + b.startTime))
                  .map(appointment => (
                    <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(appointment.date).toLocaleDateString(undefined, {
                              day: '2-digit',
                              month: 'short'
                            })}
                          </div>
                          <div className="text-xs text-gray-500">
                            {appointment.startTime}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{appointment.title}</div>
                          <div className="text-sm text-gray-600">{appointment.description}</div>
                          <div className="text-xs text-gray-500">
                            {t('patients:detail.duration')}: {appointment.duration || 30} {t('common:minutes')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                          {getStatusLabel(appointment.status)}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">{t('patients:detail.noScheduledAppointments')}</p>
                {canCreateAppointments && (
                  <button
                    onClick={handleOpenAppointmentModal}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
                  >
                    {t('patients:detail.scheduleFirstAppointment')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Past appointments (last 10) */}
        {pastAppointments.length > 0 && (
          <div className="bg-white rounded-lg border">
            <div className="p-4 border-b">
              <h4 className="font-semibold text-gray-900 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-gray-600" />
                {t('patients:detail.appointmentHistory')}
              </h4>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {pastAppointments
                  .sort((a, b) => new Date(b.date + 'T' + b.startTime) - new Date(a.date + 'T' + a.startTime))
                  .slice(0, 10)
                  .map(appointment => (
                    <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(appointment.date).toLocaleDateString(undefined, {
                              day: '2-digit',
                              month: 'short',
                              year: '2-digit'
                            })}
                          </div>
                          <div className="text-xs text-gray-500">
                            {appointment.startTime}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{appointment.title}</div>
                          <div className="text-sm text-gray-600">{appointment.description}</div>
                          {appointment.notes && (
                            <div className="text-xs text-gray-500 mt-1">
                              {t('patients:detail.notes')}: {appointment.notes}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                          {getStatusLabel(appointment.status)}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAccessTab = () => (
    <div className="space-y-6">
      {/* Historial de acceso */}
      <div className="bg-white p-6 rounded-lg border">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
          <Shield className="h-5 w-5 mr-2 text-gray-600" />
          {t('patients:detail.accessLog')}
        </h4>

        {patient.accessLog && patient.accessLog.length > 0 ? (
          <div className="space-y-3">
            {patient.accessLog.slice(-10).reverse().map((log, index) => (
              <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    log.action === 'create' ? 'bg-green-400' :
                    log.action === 'view_access' ? 'bg-blue-400' :
                    log.action === 'edit_access' ? 'bg-yellow-400' :
                    log.action === 'update' ? 'bg-orange-400' :
                    'bg-gray-400'
                  }`}></div>

                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      {log.action === 'create' ? t('patients:detail.patientCreation') :
                       log.action === 'view_access' ? t('patients:detail.recordConsultation') :
                       log.action === 'edit_access' ? t('patients:detail.editAccess') :
                       log.action === 'update' ? t('patients:detail.dataUpdate') :
                       log.action}
                    </span>

                    {log.details?.userRole && (
                      <span className="text-xs text-gray-500 ml-2">
                        ({log.details.userRole})
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">{t('patients:detail.noAccessHistory')}</p>
        )}
      </div>

      {/* Información de seguridad */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
          <Eye className="h-5 w-5 mr-2 text-blue-600" />
          {t('patients:detail.securityInfo')}
        </h4>

        <div className="space-y-2 text-sm text-gray-600">
          <p>• {t('patients:detail.securityNotes.allAccessLogged')}</p>
          <p>• {t('patients:detail.securityNotes.gdprProtected')}</p>
          <p>• {t('patients:detail.securityNotes.patientRights')}</p>
          <p>• {t('patients:detail.securityNotes.healthDataCompliance')}</p>
        </div>
      </div>
    </div>
  );

  const renderConsentsTab = () => (
    <PatientConsentsTab patient={patient} />
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return renderGeneralTab();
      case 'contact':
        return renderContactTab();
      case 'medical':
        return renderMedicalTab();
      case 'appointments':
        return renderAppointmentsTab();
      case 'consents':
        return renderConsentsTab();
      case 'administrative':
        return renderAdministrativeTab();
      case 'access':
        return renderAccessTab();
      default:
        return renderGeneralTab();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {t('patients:detail.patientRecord')}
            </h2>
            <p className="text-gray-600">
              {patient.firstName} {patient.lastName} - {patient.patientNumber}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {canViewMedicalRecords && (
              <button
                onClick={handleOpenMedicalHistoryModal}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                title={t('patients:detail.medicalHistory')}
              >
                <Stethoscope className="h-4 w-4" />
                <span>{t('patients:detail.medicalHistory')}</span>
              </button>
            )}

            {onEdit && (
              <button
                onClick={onEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Edit2 className="h-4 w-4" />
                <span>{t('patients:detail.edit')}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="border-b bg-gray-50">
          <nav className="flex space-x-8 px-6">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {renderTabContent()}
        </div>
      </div>

      {/* Medical History Modal */}
      {isMedicalHistoryModalOpen && (
        <MedicalHistoryModal
          patient={patient}
          isOpen={isMedicalHistoryModalOpen}
          onClose={() => setIsMedicalHistoryModalOpen(false)}
        />
      )}

      {/* Appointment Form Modal */}
      {isAppointmentModalOpen && (
        <AppointmentFormModal
          isOpen={isAppointmentModalOpen}
          onClose={() => setIsAppointmentModalOpen(false)}
          onSave={handleSaveAppointment}
          preselectedPatient={patient}
        />
      )}

      {/* Consent Viewing Modal */}
      {viewingConsent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="bg-green-50 px-6 py-4 border-b border-green-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{viewingConsent.title}</h3>
                    <p className="text-sm text-gray-600">
                      {t('patients:detail.signedOn')} {new Date(viewingConsent.signed_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingConsent(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {viewingConsent.consent_type && (
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">{t('patients:detail.consentType')}</label>
                    <p className="font-medium text-gray-900">{viewingConsent.consent_type}</p>
                  </div>
                )}
                {viewingConsent.template_version && (
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Version</label>
                    <p className="font-medium text-gray-900">{viewingConsent.template_version}</p>
                  </div>
                )}
                {viewingConsent.language_code && (
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">{t('patients:detail.language')}</label>
                    <p className="font-medium text-gray-900">{viewingConsent.language_code.toUpperCase()}</p>
                  </div>
                )}
                {viewingConsent.ip_address && (
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">{t('patients:detail.ipAddress')}</label>
                    <p className="font-medium text-gray-900">{viewingConsent.ip_address}</p>
                  </div>
                )}
              </div>

              {/* Document content */}
              {viewingConsent.content && (
                <div className="mb-6">
                  <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">{t('patients:detail.documentContent')}</label>
                  <div
                    className="prose prose-sm max-w-none p-4 bg-gray-50 rounded-lg border"
                    dangerouslySetInnerHTML={{ __html: sanitizeHTML(viewingConsent.content) }}
                  />
                </div>
              )}

              {/* Signature */}
              {viewingConsent.signature_image && (
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">{t('patients:detail.digitalSignature')}</label>
                  <div className="p-4 bg-gray-50 rounded-lg border inline-block">
                    <img
                      src={viewingConsent.signature_image}
                      alt="Signature"
                      className="max-h-24"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
              <button
                onClick={() => setViewingConsent(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                {t('common:close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDetailModal;