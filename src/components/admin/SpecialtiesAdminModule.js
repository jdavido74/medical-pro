// components/admin/SpecialtiesAdminModule.js
import React, { useState, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, Save, X, Globe, Settings,
  Shield, Eye, EyeOff, Copy, AlertTriangle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SpecialtiesAdminModule = () => {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const [specialties, setSpecialties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingSpecialty, setEditingSpecialty] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState(null);
  const [currentTab, setCurrentTab] = useState('list'); // 'list', 'translations', 'modules'

  // Données d'exemple - En production, ces données viendraient du backend
  const [mockSpecialties, setMockSpecialties] = useState([
    {
      id: 'general',
      code: 'MG',
      isActive: true,
      isCore: true, // Spécialités de base non supprimables
      icon: 'stethoscope',
      color: 'green',
      translations: {
        es: { name: 'Medicina General', description: 'Atención médica integral y preventiva' },
        fr: { name: 'Médecine Générale', description: 'Soins médicaux complets et préventifs' },
        en: { name: 'General Medicine', description: 'Comprehensive and preventive medical care' }
      },
      modules: ['base', 'preventive', 'chronic'],
      requiredModules: ['base'],
      optionalModules: ['preventive', 'chronic'],
      permissions: {
        canPrescribe: true,
        canDiagnose: true,
        canOperate: false,
        accessLevel: 'full'
      },
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01'
    },
    {
      id: 'cardiology',
      code: 'CAR',
      isActive: true,
      isCore: true,
      icon: 'heart',
      color: 'red',
      translations: {
        es: { name: 'Cardiología', description: 'Diagnóstico y tratamiento de enfermedades cardiovasculares' },
        fr: { name: 'Cardiologie', description: 'Diagnostic et traitement des maladies cardiovasculaires' },
        en: { name: 'Cardiology', description: 'Diagnosis and treatment of cardiovascular diseases' }
      },
      modules: ['base', 'cardiac', 'preventive'],
      requiredModules: ['base', 'cardiac'],
      optionalModules: ['preventive'],
      permissions: {
        canPrescribe: true,
        canDiagnose: true,
        canOperate: true,
        accessLevel: 'full'
      },
      createdAt: '2024-01-01',
      updatedAt: '2024-01-15'
    },
    {
      id: 'pediatrics',
      code: 'PED',
      isActive: true,
      isCore: true,
      icon: 'baby',
      color: 'blue',
      translations: {
        es: { name: 'Pediatría', description: 'Atención médica especializada para niños y adolescentes' },
        fr: { name: 'Pédiatrie', description: 'Soins médicaux spécialisés pour enfants et adolescents' },
        en: { name: 'Pediatrics', description: 'Specialized medical care for children and adolescents' }
      },
      modules: ['base', 'pediatric', 'preventive'],
      requiredModules: ['base', 'pediatric'],
      optionalModules: ['preventive'],
      permissions: {
        canPrescribe: true,
        canDiagnose: true,
        canOperate: false,
        accessLevel: 'pediatric'
      },
      createdAt: '2024-01-01',
      updatedAt: '2024-01-10'
    }
  ]);

  const [newSpecialty, setNewSpecialty] = useState({
    code: '',
    icon: 'stethoscope',
    color: 'blue',
    isActive: true,
    translations: {
      es: { name: '', description: '' },
      fr: { name: '', description: '' },
      en: { name: '', description: '' }
    },
    modules: ['base'],
    requiredModules: ['base'],
    optionalModules: [],
    permissions: {
      canPrescribe: true,
      canDiagnose: true,
      canOperate: false,
      accessLevel: 'full'
    }
  });

  const availableIcons = [
    'stethoscope', 'heart', 'baby', 'eye', 'brain', 'bone',
    'lungs', 'kidney', 'teeth', 'skin', 'pills', 'activity'
  ];

  const availableColors = [
    'red', 'blue', 'green', 'purple', 'orange', 'pink',
    'yellow', 'indigo', 'gray', 'teal', 'cyan', 'lime'
  ];

  const availableModules = [
    { id: 'base', name: 'Módulo Base', required: true },
    { id: 'cardiac', name: 'Módulo Cardiológico', required: false },
    { id: 'pediatric', name: 'Módulo Pediátrico', required: false },
    { id: 'preventive', name: 'Medicina Preventiva', required: false },
    { id: 'chronic', name: 'Enfermedades Crónicas', required: false },
    { id: 'surgery', name: 'Cirugía', required: false },
    { id: 'radiology', name: 'Radiología', required: false },
    { id: 'laboratory', name: 'Laboratorio', required: false }
  ];

  useEffect(() => {
    loadSpecialties();
  }, []);

  const loadSpecialties = async () => {
    setIsLoading(true);
    try {
      // Simular carga desde API
      setTimeout(() => {
        setSpecialties(mockSpecialties);
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error loading specialties:', error);
      setIsLoading(false);
    }
  };

  const handleCreateSpecialty = () => {
    setIsCreating(true);
    setEditingSpecialty({ ...newSpecialty, id: `new_${Date.now()}` });
  };

  const handleEditSpecialty = (specialty) => {
    setEditingSpecialty({ ...specialty });
    setIsCreating(false);
  };

  const handleSaveSpecialty = async () => {
    try {
      if (isCreating) {
        // Crear nueva especialidad
        const id = editingSpecialty.code.toLowerCase().replace(/\s+/g, '_');
        const newSpec = {
          ...editingSpecialty,
          id,
          isCore: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setMockSpecialties(prev => [...prev, newSpec]);
        setSpecialties(prev => [...prev, newSpec]);
      } else {
        // Actualizar especialidad existente
        const updatedSpec = {
          ...editingSpecialty,
          updatedAt: new Date().toISOString()
        };
        setMockSpecialties(prev => prev.map(s => s.id === updatedSpec.id ? updatedSpec : s));
        setSpecialties(prev => prev.map(s => s.id === updatedSpec.id ? updatedSpec : s));
      }

      setEditingSpecialty(null);
      setIsCreating(false);
    } catch (error) {
      console.error('Error saving specialty:', error);
    }
  };

  const handleDeleteSpecialty = async (specialtyId) => {
    if (window.confirm('¿Está seguro de que desea eliminar esta especialidad?')) {
      try {
        setMockSpecialties(prev => prev.filter(s => s.id !== specialtyId));
        setSpecialties(prev => prev.filter(s => s.id !== specialtyId));
      } catch (error) {
        console.error('Error deleting specialty:', error);
      }
    }
  };

  const handleToggleSpecialtyStatus = async (specialtyId) => {
    const specialty = specialties.find(s => s.id === specialtyId);
    if (specialty) {
      const updated = { ...specialty, isActive: !specialty.isActive };
      setSpecialties(prev => prev.map(s => s.id === specialtyId ? updated : s));
    }
  };

  const updateEditingSpecialty = (field, value) => {
    setEditingSpecialty(prev => ({ ...prev, [field]: value }));
  };

  const updateTranslation = (lang, field, value) => {
    setEditingSpecialty(prev => ({
      ...prev,
      translations: {
        ...prev.translations,
        [lang]: { ...prev.translations[lang], [field]: value }
      }
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando especialidades...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Administración de Especialidades Médicas
            </h2>
            <p className="text-gray-600">
              Configure las especialidades disponibles para las clínicas en el SaaS
            </p>
          </div>
          <button
            onClick={handleCreateSpecialty}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Nueva Especialidad</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mt-4">
          <button
            onClick={() => setCurrentTab('list')}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${
              currentTab === 'list'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Lista de Especialidades
          </button>
          <button
            onClick={() => setCurrentTab('translations')}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${
              currentTab === 'translations'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Globe className="h-4 w-4 inline mr-1" />
            Traducciones
          </button>
          <button
            onClick={() => setCurrentTab('modules')}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${
              currentTab === 'modules'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Settings className="h-4 w-4 inline mr-1" />
            Configuración Módulos
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {currentTab === 'list' && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-900">Especialidades Configuradas</h3>
            <p className="text-sm text-gray-600">
              {specialties.length} especialidades • {specialties.filter(s => s.isActive).length} activas
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {specialties.map(specialty => (
              <div key={specialty.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg bg-${specialty.color}-100`}>
                      <div className={`h-5 w-5 text-${specialty.color}-600`}>
                        {/* Aquí iría el icono basado en specialty.icon */}
                        ⚕️
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900">
                          {specialty.translations[currentLanguage]?.name || specialty.translations.es.name}
                        </h4>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                          {specialty.code}
                        </span>
                        {specialty.isCore && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                            Sistema
                          </span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          specialty.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {specialty.isActive ? 'Activa' : 'Inactiva'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {specialty.translations[currentLanguage]?.description || specialty.translations.es.description}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>Módulos: {specialty.modules.length}</span>
                        <span>Creado: {new Date(specialty.createdAt).toLocaleDateString()}</span>
                        <span>Actualizado: {new Date(specialty.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleSpecialtyStatus(specialty.id)}
                      className={`p-2 rounded-lg ${
                        specialty.isActive
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-gray-400 hover:bg-gray-50'
                      }`}
                      title={specialty.isActive ? 'Desactivar' : 'Activar'}
                    >
                      {specialty.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>

                    <button
                      onClick={() => handleEditSpecialty(specialty)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Editar"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>

                    {!specialty.isCore && (
                      <button
                        onClick={() => handleDeleteSpecialty(specialty.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de edición/creación */}
      {editingSpecialty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full m-4 max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {isCreating ? 'Nueva Especialidad' : 'Editar Especialidad'}
                </h3>
                <button
                  onClick={() => setEditingSpecialty(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Información básica */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Información Básica</h4>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Código de Especialidad
                    </label>
                    <input
                      type="text"
                      value={editingSpecialty.code}
                      onChange={(e) => updateEditingSpecialty('code', e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="CAR"
                      maxLength={5}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Color
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {availableColors.map(color => (
                        <button
                          key={color}
                          onClick={() => updateEditingSpecialty('color', color)}
                          className={`w-8 h-8 rounded-full bg-${color}-500 border-2 ${
                            editingSpecialty.color === color ? 'border-gray-900' : 'border-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estado
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editingSpecialty.isActive}
                        onChange={(e) => updateEditingSpecialty('isActive', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Especialidad activa</span>
                    </label>
                  </div>
                </div>

                {/* Traducciones */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Traducciones</h4>

                  {['es', 'fr', 'en'].map(lang => (
                    <div key={lang} className="border rounded-lg p-3">
                      <h5 className="font-medium text-sm text-gray-700 mb-2 flex items-center">
                        <Globe className="h-4 w-4 mr-1" />
                        {lang === 'es' ? 'Español' : lang === 'fr' ? 'Français' : 'English'}
                      </h5>

                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editingSpecialty.translations[lang]?.name || ''}
                          onChange={(e) => updateTranslation(lang, 'name', e.target.value)}
                          placeholder="Nombre de la especialidad"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                        <textarea
                          value={editingSpecialty.translations[lang]?.description || ''}
                          onChange={(e) => updateTranslation(lang, 'description', e.target.value)}
                          placeholder="Descripción de la especialidad"
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Módulos */}
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-3">Módulos Asociados</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {availableModules.map(module => (
                    <label key={module.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={editingSpecialty.modules.includes(module.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateEditingSpecialty('modules', [...editingSpecialty.modules, module.id]);
                          } else if (!module.required) {
                            updateEditingSpecialty('modules', editingSpecialty.modules.filter(m => m !== module.id));
                          }
                        }}
                        disabled={module.required}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className={`text-sm ${module.required ? 'text-gray-500' : 'text-gray-700'}`}>
                        {module.name}
                        {module.required && <span className="text-xs ml-1">(Obligatorio)</span>}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                <button
                  onClick={() => setEditingSpecialty(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveSpecialty}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{isCreating ? 'Crear Especialidad' : 'Guardar Cambios'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpecialtiesAdminModule;