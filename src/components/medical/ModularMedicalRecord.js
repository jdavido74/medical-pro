// components/medical/ModularMedicalRecord.js
import React, { useState, useEffect } from 'react';
import {
  FileText, Settings, Eye, EyeOff, User, Calendar,
  Heart, Baby, Stethoscope, Activity, Shield, Plus
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useMedicalModules } from '../../contexts/MedicalModulesContext';
import { useAuth } from '../../contexts/AuthContext';

// Importar los módulos
import BaseModule from './modules/BaseModule';
import CardiologyModule from './modules/CardiologyModule';
import PediatricsModule from './modules/PediatricsModule';

const ModularMedicalRecord = ({ patientData, recordId, onUpdate, onClose }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const {
    userSpecialties,
    availableModules,
    activeModules,
    toggleModule,
    canEditModule,
    getSpecialtyInfo,
    getModuleInfo
  } = useMedicalModules();

  const [recordData, setRecordData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState(new Set(['base']));
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadRecordData();
  }, [recordId]);

  const loadRecordData = async () => {
    setIsLoading(true);
    try {
      // Aquí cargarías los datos del dossier depuis el backend
      // Por ahora, datos de ejemplo
      const mockData = {
        base: {
          vitalSigns: {
            temperature: '36.8',
            bloodPressure: '125/80',
            heartRate: '72',
            weight: '70',
            height: '175'
          },
          symptoms: ['Dolor torácico', 'Fatiga'],
          diagnosis: 'Hipertensión arterial leve',
          treatment: 'Medicación antihipertensiva',
          notes: 'Paciente colaborador'
        },
        cardiology: userSpecialties.includes('cardiology') ? {
          ecg: {
            rhythm: 'sinusal',
            rate: '72',
            interpretation: 'ECG normal'
          },
          riskFactors: {
            hypertension: true,
            diabetes: false,
            smoking: false
          }
        } : null,
        pediatrics: userSpecialties.includes('pediatrics') ? {
          growth: {
            weight: '15.2',
            height: '92',
            percentiles: { weight: '50', height: '75' }
          },
          vaccines: {
            upToDate: true
          }
        } : null
      };

      setRecordData(mockData);
    } catch (error) {
      console.error('Error cargando dossier:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModuleUpdate = (moduleId, data) => {
    setRecordData(prev => ({
      ...prev,
      ...data
    }));
    setHasChanges(true);

    // Llamar la función de actualización del padre
    onUpdate && onUpdate(moduleId, data);
  };

  const toggleModuleExpansion = (moduleId) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  const getModuleIcon = (moduleId) => {
    switch (moduleId) {
      case 'base': return User;
      case 'cardiac': return Heart;
      case 'pediatric': return Baby;
      case 'preventive': return Shield;
      default: return FileText;
    }
  };

  const getModuleColor = (moduleId) => {
    switch (moduleId) {
      case 'base': return 'green';
      case 'cardiac': return 'red';
      case 'pediatric': return 'blue';
      case 'preventive': return 'purple';
      default: return 'gray';
    }
  };

  const renderModule = (moduleId) => {
    const moduleData = recordData[moduleId] || {};
    const canEdit = canEditModule(moduleId);

    switch (moduleId) {
      case 'base':
        return (
          <BaseModule
            key={moduleId}
            patientData={patientData}
            recordData={moduleData}
            onUpdate={(data) => handleModuleUpdate('base', data)}
            canEdit={canEdit}
          />
        );

      case 'cardiac':
        return (
          <CardiologyModule
            key={moduleId}
            patientData={patientData}
            recordData={{ cardiology: moduleData }}
            onUpdate={(data) => handleModuleUpdate('cardiac', data)}
            canEdit={canEdit}
          />
        );

      case 'pediatric':
        return (
          <PediatricsModule
            key={moduleId}
            patientData={patientData}
            recordData={{ pediatrics: moduleData }}
            onUpdate={(data) => handleModuleUpdate('pediatric', data)}
            canEdit={canEdit}
          />
        );

      default:
        return (
          <div key={moduleId} className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-gray-600">Módulo {moduleId} en desarrollo</p>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dossier médical...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header del dossier */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Dossier Médical - {patientData?.name || 'Paciente'}
            </h2>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {new Date().toLocaleDateString('es-ES')}
              </span>
              <span className="flex items-center">
                <User className="h-4 w-4 mr-1" />
                Dr. {user?.name}
              </span>
              {hasChanges && (
                <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs">
                  Cambios sin guardar
                </span>
              )}
            </div>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => console.log('Guardar dossier')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
              disabled={!hasChanges}
            >
              Guardar Cambios
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm"
              >
                Cerrar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Panel de control de módulos */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-900">Módulos Disponibles</h3>
          <div className="flex items-center space-x-2">
            <Settings className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              {userSpecialties.length > 0 ? `Especialidades: ${userSpecialties.join(', ')}` : 'Medicina General'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {availableModules.map((module) => {
            const Icon = getModuleIcon(module.id);
            const color = getModuleColor(module.id);
            const isActive = activeModules.includes(module.id);
            const isExpanded = expandedModules.has(module.id);

            return (
              <div key={module.id} className="flex items-center space-x-1">
                {/* Toggle módulo */}
                <button
                  onClick={() => toggleModule(module.id)}
                  disabled={module.id === 'base'} // Base module always active
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? `bg-${color}-100 text-${color}-700 border border-${color}-200`
                      : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                  } ${module.id === 'base' ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{module.name}</span>
                </button>

                {/* Toggle expansión */}
                {isActive && (
                  <button
                    onClick={() => toggleModuleExpansion(module.id)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Información de permisos */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-start space-x-2">
            <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="text-blue-800 font-medium">Permisos de usuario:</p>
              <p className="text-blue-600">
                Rol: <span className="font-medium">{user?.role || 'doctor'}</span> |
                Puede editar: <span className="font-medium">
                  {availableModules.filter(m => canEditModule(m.id)).map(m => m.name).join(', ')}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Módulos activos */}
      <div className="space-y-6">
        {activeModules
          .filter(moduleId => expandedModules.has(moduleId))
          .map((moduleId) => (
            <div key={moduleId} className="bg-white rounded-lg shadow-sm border">
              <div className="p-6">
                {renderModule(moduleId)}
              </div>
            </div>
          ))}
      </div>

      {/* Módulos colapsados */}
      {activeModules.some(moduleId => !expandedModules.has(moduleId)) && (
        <div className="mt-6 bg-white rounded-lg shadow-sm border p-4">
          <h3 className="font-medium text-gray-900 mb-3">Módulos Colapsados</h3>
          <div className="flex flex-wrap gap-2">
            {activeModules
              .filter(moduleId => !expandedModules.has(moduleId))
              .map((moduleId) => {
                const module = availableModules.find(m => m.id === moduleId);
                if (!module) return null;

                const Icon = getModuleIcon(moduleId);
                const color = getModuleColor(moduleId);

                return (
                  <button
                    key={moduleId}
                    onClick={() => toggleModuleExpansion(moduleId)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm bg-${color}-50 text-${color}-700 border border-${color}-200 hover:bg-${color}-100`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{module.name}</span>
                    <Eye className="h-3 w-3" />
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Footer con información adicional */}
      <div className="mt-8 bg-gray-50 rounded-lg p-4">
        <div className="flex justify-between items-center text-sm text-gray-600">
          <div>
            <p>Última modificación: {new Date().toLocaleString('es-ES')}</p>
            <p>Módulos activos: {activeModules.length} de {availableModules.length} disponibles</p>
          </div>
          <div className="text-right">
            <p>Sistema modular MedicalPro</p>
            <p>Versión 1.0 - Conformidad RGPD</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModularMedicalRecord;