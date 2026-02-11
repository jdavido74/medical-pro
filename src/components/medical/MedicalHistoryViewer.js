// components/medical/MedicalHistoryViewer.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Search, Eye, Edit2, FileText, Activity,
  Pill, AlertTriangle, User, Cigarette
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../auth/PermissionGuard';
import { PERMISSIONS } from '../../utils/permissionsStorage';
import { medicalRecordsApi } from '../../api/medicalRecordsApi';
import SmokingAssessmentDisplay from './SmokingAssessmentDisplay';
import AlcoholAssessmentDisplay from './AlcoholAssessmentDisplay';
import { useLocale } from '../../contexts/LocaleContext';

const MedicalHistoryViewer = ({
  patient,
  patientId,
  canEditRecords = false,
  showStatistics = false,
  onEditRecord,
  onViewRecord
}) => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { locale } = useLocale();
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    practitioner: '',
    dateFrom: '',
    dateTo: ''
  });
  const [groupBy, setGroupBy] = useState('date'); // date, type, practitioner
  const [isLoading, setIsLoading] = useState(true);
  const [statistics, setStatistics] = useState({});

  // Permissions système pour l'historique médical
  const canViewMedicalRecords = hasPermission(PERMISSIONS.MEDICAL_RECORDS_VIEW);
  const canCreateMedicalRecords = hasPermission(PERMISSIONS.MEDICAL_RECORDS_CREATE);
  const canEditMedicalRecords = hasPermission(PERMISSIONS.MEDICAL_RECORDS_EDIT);
  const canDeleteMedicalRecords = hasPermission(PERMISSIONS.MEDICAL_RECORDS_DELETE);

  // Support pour les deux props : patient (objet) ou patientId (string)
  const currentPatientId = patientId || patient?.id;

  const loadMedicalHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      if (currentPatientId) {
        const response = await medicalRecordsApi.getPatientMedicalRecords(currentPatientId);
        setRecords(response.records || []);
        // Also set statistics if available from this endpoint
        if (response.statistics) {
          setStatistics(response.statistics);
        }
      }
    } catch (error) {
      console.error('Error loading medical history:', error);
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPatientId]);

  const loadStatistics = useCallback(async () => {
    try {
      if (currentPatientId) {
        const stats = await medicalRecordsApi.getStatistics();
        setStatistics(stats);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
      setStatistics({});
    }
  }, [currentPatientId]);

  useEffect(() => {
    if (currentPatientId) {
      loadMedicalHistory();
      if (showStatistics) {
        loadStatistics();
      }
    }
  }, [currentPatientId, showStatistics, loadMedicalHistory, loadStatistics]);

  useEffect(() => {
    filterRecords();
  }, [records, searchQuery, filters]);

  const filterRecords = () => {
    let filtered = [...records];

    // Búsqueda textual
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(record => {
        const searchText = [
          record.basicInfo?.chiefComplaint,
          record.diagnosis?.primary,
          record.diagnosis?.secondary?.join(' '),
          record.treatments?.map(t => t.medication).join(' ')
        ].join(' ').toLowerCase();

        return searchText.includes(query);
      });
    }

    // Filtros
    if (filters.type) {
      filtered = filtered.filter(record => record.type === filters.type);
    }

    if (filters.practitioner) {
      filtered = filtered.filter(record => record.practitionerId === filters.practitioner);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(record =>
        new Date(record.recordDate || record.createdAt) >= new Date(filters.dateFrom)
      );
    }

    if (filters.dateTo) {
      filtered = filtered.filter(record =>
        new Date(record.recordDate || record.createdAt) <= new Date(filters.dateTo)
      );
    }

    // Ordenar par date (plus récent en premier) - utiliser recordDate si disponible
    filtered.sort((a, b) => new Date(b.recordDate || b.createdAt) - new Date(a.recordDate || a.createdAt));

    setFilteredRecords(filtered);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      type: '',
      practitioner: '',
      dateFrom: '',
      dateTo: ''
    });
    setSearchQuery('');
  };

  const getRecordTypeLabel = (type) => {
    const types = {
      consultation: 'Consulta',
      examination: 'Examen',
      treatment: 'Tratamiento',
      follow_up: 'Seguimiento',
      emergency: 'Urgencia'
    };
    return types[type] || type;
  };

  const getRecordTypeColor = (type) => {
    const colors = {
      consultation: 'bg-blue-100 text-blue-800',
      examination: 'bg-green-100 text-green-800',
      treatment: 'bg-purple-100 text-purple-800',
      follow_up: 'bg-orange-100 text-orange-800',
      emergency: 'bg-red-100 text-red-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getPractitionerName = (practitionerId) => {
    // En production, ceci serait récupéré depuis une base de données d'utilisateurs
    return practitionerId === 'demo' ? 'Dr. García' : practitionerId;
  };

  const groupRecords = (records) => {
    if (groupBy === 'type') {
      const grouped = {};
      records.forEach(record => {
        const type = record.type || 'general';
        if (!grouped[type]) {
          grouped[type] = [];
        }
        grouped[type].push(record);
      });
      return grouped;
    }

    if (groupBy === 'practitioner') {
      const grouped = {};
      records.forEach(record => {
        const practitioner = record.practitionerId || 'unknown';
        if (!grouped[practitioner]) {
          grouped[practitioner] = [];
        }
        grouped[practitioner].push(record);
      });
      return grouped;
    }

    // Par défaut, grouper par mois (utiliser recordDate si disponible)
    const grouped = {};
    records.forEach(record => {
      const date = new Date(record.recordDate || record.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(record);
    });
    return grouped;
  };

  const formatGroupTitle = (key) => {
    if (groupBy === 'type') {
      return getRecordTypeLabel(key);
    }

    if (groupBy === 'practitioner') {
      return getPractitionerName(key);
    }

    // Format de date
    const [year, month] = key.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString(locale, { year: 'numeric', month: 'long' });
  };

  const handleViewRecord = async (record) => {
    // Access logging is handled by the backend
    try {
      const fullRecord = await medicalRecordsApi.getMedicalRecordById(record.id);
      onViewRecord && onViewRecord(fullRecord);
    } catch (error) {
      console.error('Error fetching record:', error);
      onViewRecord && onViewRecord(record);
    }
  };

  const handleEditRecord = async (record) => {
    // Access logging is handled by the backend
    try {
      const fullRecord = await medicalRecordsApi.getMedicalRecordById(record.id);
      console.log('[MedicalHistoryViewer] handleEditRecord - fullRecord from API:', fullRecord);
      console.log('[MedicalHistoryViewer] fullRecord.basicInfo:', fullRecord?.basicInfo);
      console.log('[MedicalHistoryViewer] fullRecord.chiefComplaint:', fullRecord?.chiefComplaint);
      onEditRecord && onEditRecord(fullRecord);
    } catch (error) {
      console.error('Error fetching record:', error);
      onEditRecord && onEditRecord(record);
    }
  };

  const handleCreateMedicalRecord = () => {
    // Créer un nouveau dossier médical pour ce patient
    if (onEditRecord && currentPatientId) {
      const newRecord = {
        patientId: currentPatientId,
        type: 'consultation',
        date: new Date().toISOString().split('T')[0],
        providerId: user?.id || 'unknown',
        isNew: true
      };
      onEditRecord(newRecord);
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (window.confirm('¿Está seguro de que desea eliminar este registro médico?')) {
      try {
        await medicalRecordsApi.archiveMedicalRecord(recordId);
        loadMedicalHistory();
        if (showStatistics) {
          loadStatistics();
        }
      } catch (error) {
        console.error('Error deleting medical record:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Activity className="h-8 w-8 text-green-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Cargando historial médico...</p>
        </div>
      </div>
    );
  }

  const groupedRecords = groupRecords(filteredRecords);

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Registros</p>
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
            <Pill className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Tratamientos Activos</p>
              <p className="text-xl font-bold text-gray-900">{statistics.activeTreatments || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Alertas Medicación</p>
              <p className="text-xl font-bold text-gray-900">{statistics.medicationWarnings || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Header con botón de crear nuevo registro */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Historial Médico</h3>
          <p className="text-gray-600">Gestión completa del historial médico del paciente</p>
        </div>

        {canCreateMedicalRecords && onEditRecord && (
          <button
            onClick={handleCreateMedicalRecord}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <FileText className="h-4 w-4" />
            <span>Nuevo Registro Médico</span>
          </button>
        )}
      </div>

      {/* Controles de búsqueda y filtros */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar en historial médico..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">Todos los tipos</option>
              <option value="consultation">Consulta</option>
              <option value="examination">Examen</option>
              <option value="treatment">Tratamiento</option>
              <option value="follow_up">Seguimiento</option>
              <option value="emergency">Urgencia</option>
            </select>

            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Desde"
            />

            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Hasta"
            />

            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="date">Agrupar por fecha</option>
              <option value="type">Agrupar por tipo</option>
              <option value="practitioner">Agrupar por médico</option>
            </select>

            <button
              onClick={clearFilters}
              className="px-3 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Historial médico */}
      <div className="space-y-6">
        {Object.keys(groupedRecords).length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery || Object.values(filters).some(f => f) ? 'No se encontraron registros' : 'No hay historial médico'}
            </h3>
            <p className="text-gray-600">
              {searchQuery || Object.values(filters).some(f => f)
                ? 'Intente con otros criterios de búsqueda'
                : 'El historial médico aparecerá aquí cuando se creen registros'}
            </p>
          </div>
        ) : (
          Object.entries(groupedRecords).map(([groupKey, groupRecords]) => (
            <div key={groupKey} className="bg-white rounded-lg border">
              <div className="px-6 py-4 border-b bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900">
                  {formatGroupTitle(groupKey)} ({groupRecords.length})
                </h3>
              </div>

              <div className="divide-y divide-gray-200">
                {groupRecords.map((record) => (
                  <div key={record.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRecordTypeColor(record.type)}`}>
                            {getRecordTypeLabel(record.type)}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(record.recordDate || record.createdAt).toLocaleString(locale, {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          <span className="text-sm text-gray-500">
                            Dr. {getPractitionerName(record.practitionerId)}
                          </span>
                          {record.assistantProviderId && (
                            <span className="text-sm text-gray-400">
                              + {getPractitionerName(record.assistantProviderId)}
                            </span>
                          )}
                        </div>

                        <h4 className="text-lg font-medium text-gray-900 mb-2">
                          {record.basicInfo?.chiefComplaint || 'Sin motivo especificado'}
                        </h4>

                        {/* Symptoms + duration */}
                        {(record.basicInfo?.symptoms?.filter(s => s && s.trim()).length > 0 || record.basicInfo?.duration) && (
                          <div className="mb-2 flex flex-wrap items-center gap-1.5">
                            {record.basicInfo?.symptoms?.filter(s => s && s.trim()).map((s, i) => (
                              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{s}</span>
                            ))}
                            {record.basicInfo?.duration && (
                              <span className="text-xs text-gray-500 ml-1">({record.basicInfo.duration})</span>
                            )}
                          </div>
                        )}

                        {/* Current illness */}
                        {record.currentIllness && (
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {record.currentIllness.length > 150 ? record.currentIllness.substring(0, 150) + '...' : record.currentIllness}
                          </p>
                        )}

                        {/* Compact vital signs */}
                        {record.vitalSigns && (record.vitalSigns.bloodPressureSystolic || record.vitalSigns.heartRate || record.vitalSigns.temperature || record.vitalSigns.weight) && (
                          <div className="mb-2 flex flex-wrap gap-3 text-xs text-gray-600">
                            {record.vitalSigns.bloodPressureSystolic && record.vitalSigns.bloodPressureDiastolic && (
                              <span>TA: <strong>{record.vitalSigns.bloodPressureSystolic}/{record.vitalSigns.bloodPressureDiastolic}</strong> mmHg</span>
                            )}
                            {record.vitalSigns.heartRate && (
                              <span>FC: <strong>{record.vitalSigns.heartRate}</strong> bpm</span>
                            )}
                            {record.vitalSigns.temperature && (
                              <span>T°: <strong>{record.vitalSigns.temperature}</strong>°C</span>
                            )}
                            {record.vitalSigns.weight && (
                              <span>Poids: <strong>{record.vitalSigns.weight}</strong> kg</span>
                            )}
                          </div>
                        )}

                        {/* Physical exam - compact non-empty sections */}
                        {record.physicalExam && Object.entries(record.physicalExam).filter(([, v]) => v && typeof v === 'string' && v.trim()).length > 0 && (
                          <div className="mb-2 text-xs text-gray-600">
                            {Object.entries(record.physicalExam).filter(([, v]) => v && typeof v === 'string' && v.trim()).map(([key, value]) => (
                              <span key={key} className="inline-block mr-3">
                                <strong>{key}:</strong> {value.length > 40 ? value.substring(0, 40) + '...' : value}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Current medications */}
                        {record.currentMedications && record.currentMedications.length > 0 && (
                          <div className="mb-2 flex flex-wrap gap-1.5">
                            {record.currentMedications.map((med, i) => (
                              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {med.name || med.medication || med}{med.dosage ? ` ${med.dosage}` : ''}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Diagnóstico:</span>
                            <p>{record.diagnosis?.primary || 'No especificado'}</p>
                          </div>

                          {record.treatments && record.treatments.length > 0 && (
                            <div>
                              <span className="font-medium">Tratamientos:</span>
                              <p>{record.treatments.map(t => t.medication).join(', ')}</p>
                            </div>
                          )}

                          {record.treatmentPlan?.followUp && (
                            <div>
                              <span className="font-medium">Próximo control:</span>
                              <p>{new Date(record.treatmentPlan.followUp).toLocaleDateString(locale)}</p>
                            </div>
                          )}
                        </div>

                        {/* Tabagisme - si données disponibles avec niveau d'exposition significatif */}
                        {record.antecedents?.personal?.habits?.smoking &&
                         record.antecedents.personal.habits.smoking.status !== 'never' && (
                          <div className="mt-3">
                            <SmokingAssessmentDisplay
                              data={record.antecedents.personal.habits.smoking}
                              compact={true}
                            />
                          </div>
                        )}

                        {/* Alcool - si données disponibles */}
                        {record.antecedents?.personal?.habits?.alcohol &&
                         record.antecedents.personal.habits.alcohol.status !== 'never' && (
                          <div className="mt-3">
                            <AlcoholAssessmentDisplay
                              data={record.antecedents.personal.habits.alcohol}
                              compact={true}
                            />
                          </div>
                        )}

                        {/* Alertas de medicación */}
                        {record.medicationWarnings && record.medicationWarnings.length > 0 && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-start">
                              <AlertTriangle className="h-4 w-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-red-800">Alertas de medicación activas</p>
                                <div className="text-sm text-red-700">
                                  {record.medicationWarnings.map((warning, index) => (
                                    <p key={index}>{warning.warning}</p>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        {canViewMedicalRecords && (
                          <button
                            onClick={() => handleViewRecord(record)}
                            className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                            title="Ver detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}

                        {canEditMedicalRecords && (
                          <button
                            onClick={() => handleEditRecord(record)}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Editar registro médico"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}

                        {canDeleteMedicalRecords && (
                          <button
                            onClick={() => handleDeleteRecord(record.id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title="Eliminar registro médico"
                          >
                            <AlertTriangle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Información de conformidad */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-start">
          <User className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Información de Privacidad</p>
            <p>Todos los accesos al historial médico son registrados para garantizar la seguridad y conformidad con las normativas de protección de datos de salud.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicalHistoryViewer;