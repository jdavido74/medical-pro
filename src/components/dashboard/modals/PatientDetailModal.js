import React, { useState, useEffect } from 'react';
import { X, User, Calendar, Pill, ClipboardCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../../auth/PermissionGuard';
import { PERMISSIONS } from '../../../utils/permissionsStorage';
import planningApi from '../../../api/planningApi';
import PatientDetailFicha from './PatientDetailFicha';
import PatientDetailCitas from './PatientDetailCitas';
import PatientDetailTratamientos from './PatientDetailTratamientos';
import PatientDetailConsentimientos from './PatientDetailConsentimientos';

const PatientDetailModal = ({ patient, isOpen, onClose, initialTab = 'ficha' }) => {
  const { t } = useTranslation(['patients', 'common']);
  const { hasPermission } = usePermissions();
  const canViewAppointments = hasPermission(PERMISSIONS.APPOINTMENTS_VIEW);

  const [activeTab, setActiveTab] = useState(initialTab);
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  // Reset tab on open
  useEffect(() => {
    if (isOpen) setActiveTab(initialTab);
  }, [isOpen, initialTab]);

  // Load appointments once on open
  useEffect(() => {
    if (isOpen && patient?.id && canViewAppointments) {
      const loadAppointments = async () => {
        setLoadingAppointments(true);
        try {
          const futureDate = new Date();
          futureDate.setMonth(futureDate.getMonth() + 6);
          const endDate = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}-${String(futureDate.getDate()).padStart(2, '0')}`;
          const response = await planningApi.getCalendar({
            patientId: patient.id,
            startDate: '2020-01-01',
            endDate,
          });
          if (response.success) {
            setAppointments(response.data || []);
          }
        } catch (err) {
          console.error('Error loading patient appointments:', err);
        } finally {
          setLoadingAppointments(false);
        }
      };
      loadAppointments();
    }
  }, [isOpen, patient?.id, canViewAppointments]);

  if (!isOpen || !patient) return null;

  const tabs = [
    { id: 'ficha', label: t('patients:detail.tabs.ficha', 'Ficha'), icon: User, visible: true },
    { id: 'citas', label: t('patients:detail.tabs.citas', 'Citas'), icon: Calendar, visible: canViewAppointments },
    { id: 'tratamientos', label: t('patients:detail.tabs.tratamientos', 'Tratamientos'), icon: Pill, visible: canViewAppointments },
    { id: 'consentimientos', label: t('patients:detail.tabs.consentimientos', 'Consentimientos'), icon: ClipboardCheck, visible: true },
  ].filter(tab => tab.visible);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 border-b">
          <div className="flex items-center justify-between px-6 pt-4 pb-2">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {patient.firstName} {patient.lastName}
              </h2>
              <p className="text-sm text-gray-500">N° {patient.patientNumber}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
          {/* Tab bar */}
          <div className="flex px-6 gap-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'ficha' && <PatientDetailFicha patient={patient} t={t} />}
          {activeTab === 'citas' && <PatientDetailCitas appointments={appointments} loading={loadingAppointments} t={t} />}
          {activeTab === 'tratamientos' && <PatientDetailTratamientos appointments={appointments} loading={loadingAppointments} t={t} />}
          {activeTab === 'consentimientos' && <PatientDetailConsentimientos patient={patient} t={t} />}
        </div>
      </div>
    </div>
  );
};

export default PatientDetailModal;
