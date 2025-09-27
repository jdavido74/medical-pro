// components/dashboard/modules/MedicalRecordsModule.js
import React, { useState, useEffect } from 'react';
import {
  Plus, Search, FileText, Filter, Edit2, Trash2, Eye, User,
  Calendar, Stethoscope, Tablet, AlertTriangle, ChevronRight, Heart, Settings
} from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { medicalRecordsStorage, initializeSampleMedicalRecords } from '../../../utils/medicalRecordsStorage';
import { patientsStorage } from '../../../utils/patientsStorage';
import MedicalRecordForm from '../../medical/MedicalRecordForm';
import MedicalHistoryViewer from '../../medical/MedicalHistoryViewer';

const MedicalRecordsModule = ({ navigateToPatient }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [patientFilter, setPatientFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isViewerModalOpen, setIsViewerModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [statistics, setStatistics] = useState({});
  const [error, setError] = useState(null);

  // Permissions selon le rôle
  const canCreateRecords = ['super_admin', 'admin', 'doctor', 'specialist'].includes(user?.role);
  const canEditRecords = ['super_admin', 'admin', 'doctor', 'specialist'].includes(user?.role);
  const canDeleteRecords = ['super_admin', 'admin'].includes(user?.role);
  const canViewAllRecords = ['super_admin', 'admin', 'doctor', 'specialist', 'nurse'].includes(user?.role);

  useEffect(() => {
    initializeSampleMedicalRecords();
    loadRecords();
    loadPatients();
    loadStatistics();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [records, searchQuery, filterType, patientFilter, sortField, sortDirection]);

  const loadRecords = async () => {
    try {
      setIsLoading(true);
      const allRecords = medicalRecordsStorage.getAll();
      setRecords(allRecords);
      setError(null);
    } catch (err) {
      setError('Error al cargar los historiales médicos');
      console.error('Error loading medical records:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPatients = async () => {
    try {
      const allPatients = patientsStorage.getAll();
      setPatients(allPatients);
    } catch (err) {
      console.error('Error loading patients:', err);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = medicalRecordsStorage.getStatistics();
      setStatistics(stats);
    } catch (err) {
      console.error('Error loading statistics:', err);
    }
  };

  const filterRecords = () => {
    let filtered = [...records];

    // Filtrar por búsqueda
    if (searchQuery) {
      const filters = {
        query: searchQuery.toLowerCase()
      };
      filtered = medicalRecordsStorage.search(searchQuery, filters);
    }

    // Filtrar por tipo
    if (filterType !== 'all') {
      filtered = filtered.filter(record => record.type === filterType);
    }

    // Filtrar por paciente
    if (patientFilter) {
      filtered = filtered.filter(record => record.patientId === patientFilter);
    }

    // Ordenar
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === 'createdAt' || sortField === 'updatedAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (sortDirection === 'desc') {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });

    setFilteredRecords(filtered);
  };

  const handleCreateRecord = () => {
    setEditingRecord(null);
    setIsFormModalOpen(true);
  };

  const handleEditRecord = (record) => {
    // Journaliser l'accès pour édition
    medicalRecordsStorage.logAccess(record.id, 'edit_access', user?.id, {
      userRole: user?.role,
      userEmail: user?.email
    });

    setEditingRecord(record);
    setIsFormModalOpen(true);
  };

  const handleViewRecord = (record) => {
    // Journaliser l'accès pour visualisation
    medicalRecordsStorage.logAccess(record.id, 'view_access', user?.id, {
      userRole: user?.role,
      userEmail: user?.email
    });

    setSelectedRecord(record);
    setIsViewerModalOpen(true);
  };

  const handleDeleteRecord = async (recordId) => {
    if (window.confirm('¿Está seguro de eliminar este historial médico?')) {
      try {
        await medicalRecordsStorage.delete(recordId, user?.id);
        await loadRecords();
        await loadStatistics();
      } catch (err) {
        setError('Error al eliminar el historial médico');
      }
    }
  };

  const handleFormSubmit = async (formData) => {
    try {
      if (editingRecord) {
        await medicalRecordsStorage.update(editingRecord.id, formData, user?.id);
      } else {
        await medicalRecordsStorage.create(formData, user?.id);
      }

      setIsFormModalOpen(false);
      setEditingRecord(null);
      await loadRecords();
      await loadStatistics();
      setError(null);
    } catch (err) {
      setError(editingRecord ? 'Error al actualizar el historial' : 'Error al crear el historial');
    }
  };

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : 'Paciente no encontrado';
  };

  const getTypeLabel = (type) => {
    const types = {
      consultation: 'Consulta',
      examination: 'Examen',
      treatment: 'Tratamiento',
      follow_up: 'Seguimiento',
      emergency: 'Urgencia'
    };
    return types[type] || type;
  };

  const getTypeBadgeColor = (type) => {
    const colors = {
      consultation: 'bg-blue-100 text-blue-800',
      examination: 'bg-green-100 text-green-800',
      treatment: 'bg-purple-100 text-purple-800',
      follow_up: 'bg-orange-100 text-orange-800',
      emergency: 'bg-red-100 text-red-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Stethoscope className="h-8 w-8 mr-3 text-green-600" />
            Historiales Médicos ({statistics.total || 0})
          </h1>
          <p className="text-gray-600 mt-1">
            Gestión completa de historiales y datos médicos de pacientes
          </p>
        </div>

        {canCreateRecords && (
          <div className="mt-4 lg:mt-0">
            <button
              onClick={handleCreateRecord}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Nuevo Historial</span>
            </button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Historiales</p>
              <p className="text-xl font-bold text-gray-900">{statistics.total || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Este Mes</p>
              <p className="text-xl font-bold text-gray-900">{statistics.thisMonth || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <Tablet className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Tratamientos Activos</p>
              <p className="text-xl font-bold text-gray-900">{statistics.activeTreatments || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-orange-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Alertas Médicas</p>
              <p className="text-xl font-bold text-gray-900">{statistics.medicationWarnings || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar en historiales..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="all">Todos los tipos</option>
            <option value="consultation">Consultas</option>
            <option value="examination">Exámenes</option>
            <option value="treatment">Tratamientos</option>
            <option value="follow_up">Seguimientos</option>
            <option value="emergency">Urgencias</option>
          </select>

          {/* Patient Filter */}
          <select
            value={patientFilter}
            onChange={(e) => setPatientFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">Todos los pacientes</option>
            {patients.map(patient => (
              <option key={patient.id} value={patient.id}>
                {patient.firstName} {patient.lastName}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={`${sortField}_${sortDirection}`}
            onChange={(e) => {
              const [field, direction] = e.target.value.split('_');
              setSortField(field);
              setSortDirection(direction);
            }}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="createdAt_desc">Más recientes</option>
            <option value="createdAt_asc">Más antiguos</option>
            <option value="updatedAt_desc">Última actualización</option>
          </select>
        </div>
      </div>

      {/* Records List */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {filteredRecords.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay historiales médicos
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || filterType !== 'all' || patientFilter
                ? 'No se encontraron historiales con los filtros aplicados.'
                : 'Comience creando el primer historial médico.'}
            </p>
            {canCreateRecords && !searchQuery && filterType === 'all' && !patientFilter && (
              <button
                onClick={handleCreateRecord}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Crear Primer Historial
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredRecords.filter(record => record).map((record) => (
              <div key={record.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Consulta
                      </span>

                      {record?.medicationWarnings?.length > 0 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Alerta médica
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      {getPatientName(record?.patientId)}
                    </h3>

                    <p className="text-gray-600 mb-2">
                      {record?.basicInfo?.chiefComplaint || record?.diagnosis?.primary || 'Sin descripción'}
                    </p>

                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {record?.createdAt ? new Date(record.createdAt).toLocaleDateString('es-ES') : 'Fecha no disponible'}
                      </div>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {record?.createdBy || 'Usuario desconocido'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => record && handleViewRecord(record)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Ver historial"
                    >
                      <Eye className="h-4 w-4" />
                    </button>

                    {canEditRecords && (
                      <button
                        onClick={() => record && handleEditRecord(record)}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Editar historial"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}

                    {canDeleteRecords && (
                      <button
                        onClick={() => record?.id && handleDeleteRecord(record.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar historial"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}

                    {navigateToPatient && (
                      <button
                        onClick={() => record?.patientId && navigateToPatient(record.patientId)}
                        className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Ver paciente"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Medical Record Form Modal */}
      {isFormModalOpen && (
        <MedicalRecordForm
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setEditingRecord(null);
          }}
          onSubmit={handleFormSubmit}
          initialData={editingRecord}
          patients={patients}
          currentUser={user}
        />
      )}

      {/* Medical History Viewer Modal */}
      {isViewerModalOpen && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                Historial Médico - {getPatientName(selectedRecord.patientId)}
              </h2>
              <button
                onClick={() => {
                  setIsViewerModalOpen(false);
                  setSelectedRecord(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <MedicalHistoryViewer
                patientId={selectedRecord.patientId}
                canEditRecords={canEditRecords}
                showStatistics={false}
                selectedRecordId={selectedRecord.id}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalRecordsModule;