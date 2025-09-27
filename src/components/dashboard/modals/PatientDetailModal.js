// components/dashboard/modals/PatientDetailModal.js
import React, { useState } from 'react';
import {
  X, Edit2, User, MapPin, Phone, Mail, Building, Calendar,
  Shield, Heart, Activity, FileText, Clock, Eye, Stethoscope
} from 'lucide-react';
import MedicalHistoryViewer from '../../medical/MedicalHistoryViewer';
import MedicalHistoryModal from './MedicalHistoryModal';
import { medicalRecordsStorage } from '../../../utils/medicalRecordsStorage';
import { usePermissions } from '../../auth/PermissionGuard';
import { PERMISSIONS } from '../../../utils/permissionsStorage';

const PatientDetailModal = ({
  patient,
  isOpen,
  onClose,
  onEdit,
  canViewMedicalData,
  canViewAllData
}) => {
  const [activeTab, setActiveTab] = useState('general');
  const [isMedicalHistoryModalOpen, setIsMedicalHistoryModalOpen] = useState(false);
  const { hasPermission } = usePermissions();

  // Permissions pour les dossiers médicaux
  const canEditMedicalRecords = hasPermission(PERMISSIONS.MEDICAL_RECORDS_EDIT);
  const canViewMedicalRecords = hasPermission(PERMISSIONS.MEDICAL_RECORDS_VIEW);

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
      label: 'Información General',
      icon: User,
      visible: true
    },
    {
      id: 'contact',
      label: 'Contacto',
      icon: Phone,
      visible: true
    },
    {
      id: 'medical',
      label: 'Historial Médico',
      icon: Stethoscope,
      visible: canViewMedicalData
    },
    {
      id: 'administrative',
      label: 'Datos Administrativos',
      icon: Building,
      visible: canViewAllData
    },
    {
      id: 'access',
      label: 'Historial de Acceso',
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
              Paciente #{patient.patientNumber}
            </p>
          </div>
          <div className="ml-auto">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(patient.status)}`}>
              {patient.status === 'active' ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>
      </div>

      {/* Datos personales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Nacimiento
            </label>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-gray-900">
                {new Date(patient.birthDate).toLocaleDateString('es-ES')}
                <span className="text-gray-600 ml-2">({calculateAge(patient.birthDate)} años)</span>
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sexo
            </label>
            <span className="text-gray-900">
              {patient.gender === 'male' ? 'Masculino' :
               patient.gender === 'female' ? 'Femenino' : 'Otro'}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de Documento
            </label>
            <span className="text-gray-900">{patient.idNumber}</span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nacionalidad
            </label>
            <span className="text-gray-900">{patient.nationality}</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Registro
            </label>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-gray-900">
                {new Date(patient.createdAt).toLocaleDateString('es-ES')}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Última Actualización
            </label>
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-gray-400" />
              <span className="text-gray-900">
                {new Date(patient.updatedAt).toLocaleDateString('es-ES')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContactTab = () => (
    <div className="space-y-6">
      {/* Dirección */}
      <div className="bg-white p-6 rounded-lg border">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
          <MapPin className="h-5 w-5 mr-2 text-green-600" />
          Dirección
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
          <p className="text-gray-500 italic">No hay dirección registrada</p>
        )}
      </div>

      {/* Información de contacto */}
      <div className="bg-white p-6 rounded-lg border">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
          <Phone className="h-5 w-5 mr-2 text-blue-600" />
          Información de Contacto
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono
            </label>
            {patient.contact?.phone ? (
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900">{patient.contact.phone}</span>
              </div>
            ) : (
              <span className="text-gray-500 italic">No registrado</span>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            {patient.contact?.email ? (
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900">{patient.contact.email}</span>
              </div>
            ) : (
              <span className="text-gray-500 italic">No registrado</span>
            )}
          </div>
        </div>
      </div>

      {/* Contacto de emergencia */}
      <div className="bg-red-50 p-6 rounded-lg border border-red-200">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
          <Shield className="h-5 w-5 mr-2 text-red-600" />
          Contacto de Emergencia
        </h4>

        {patient.contact?.emergencyContact?.name ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre
              </label>
              <span className="text-gray-900">{patient.contact.emergencyContact.name}</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Relación
              </label>
              <span className="text-gray-900">{patient.contact.emergencyContact.relationship}</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900">{patient.contact.emergencyContact.phone}</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 italic">No hay contacto de emergencia registrado</p>
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
          Seguro Médico
        </h4>

        {patient.insurance?.provider ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proveedor
              </label>
              <span className="text-gray-900">{patient.insurance.provider}</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de Póliza
              </label>
              <span className="text-gray-900">{patient.insurance.number}</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Seguro
              </label>
              <span className="text-gray-900">{patient.insurance.type}</span>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 italic">No hay información de seguro registrada</p>
        )}
      </div>

      {/* Estadísticas del paciente */}
      <div className="bg-white p-6 rounded-lg border">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
          <FileText className="h-5 w-5 mr-2 text-blue-600" />
          Resumen de Actividad
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">0</div>
            <div className="text-sm text-blue-600">Citas Totales</div>
          </div>

          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {medicalRecordsStorage.getByPatientId(patient.id).length}
            </div>
            <div className="text-sm text-green-600">Historiales Médicos</div>
          </div>

          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {medicalRecordsStorage.getStatistics(patient.id).activeTreatments}
            </div>
            <div className="text-sm text-purple-600">Tratamientos Activos</div>
          </div>
        </div>
      </div>

      {/* Información de facturación */}
      <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
          <Building className="h-5 w-5 mr-2 text-yellow-600" />
          Información de Facturación
        </h4>

        <p className="text-gray-600 mb-4">
          Información fiscal y de facturación para este paciente.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado de Facturación
            </label>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Al día
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Método de Pago Preferido
            </label>
            <span className="text-gray-900">Seguro médico</span>
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

  const renderAccessTab = () => (
    <div className="space-y-6">
      {/* Historial de acceso */}
      <div className="bg-white p-6 rounded-lg border">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
          <Shield className="h-5 w-5 mr-2 text-gray-600" />
          Historial de Acceso al Dossier
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
                      {log.action === 'create' ? 'Creación del paciente' :
                       log.action === 'view_access' ? 'Consulta del dossier' :
                       log.action === 'edit_access' ? 'Acceso para edición' :
                       log.action === 'update' ? 'Actualización de datos' :
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
                  {new Date(log.timestamp).toLocaleString('es-ES')}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">No hay historial de acceso disponible</p>
        )}
      </div>

      {/* Información de seguridad */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
          <Eye className="h-5 w-5 mr-2 text-blue-600" />
          Información de Seguridad
        </h4>

        <div className="space-y-2 text-sm text-gray-600">
          <p>• Todos los accesos al dossier médico son registrados</p>
          <p>• Los datos están protegidos según la normativa RGPD</p>
          <p>• El paciente tiene derecho a solicitar el historial completo</p>
          <p>• Conformidad con la Ley de Protección de Datos de Salud</p>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return renderGeneralTab();
      case 'contact':
        return renderContactTab();
      case 'medical':
        return renderMedicalTab();
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
              Dossier del Paciente
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
                title="Ver historial médico completo"
              >
                <Stethoscope className="h-4 w-4" />
                <span>Historial Médico</span>
              </button>
            )}

            {onEdit && (
              <button
                onClick={onEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Edit2 className="h-4 w-4" />
                <span>Editar</span>
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
    </div>
  );
};

export default PatientDetailModal;