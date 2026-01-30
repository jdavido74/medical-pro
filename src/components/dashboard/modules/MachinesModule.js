/**
 * MachinesModule - Machine management module
 * Manages physical machines/resources that can be booked for treatments
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Cpu, Plus, Search, Edit, Trash2,
  ToggleLeft, ToggleRight, MapPin, Syringe, RefreshCw
} from 'lucide-react';
import machinesApi from '../../../api/machinesApi';
import { usePermissions } from '../../auth/PermissionGuard';
import MachineFormModal from '../modals/MachineFormModal';

// Predefined color palette
const COLOR_PALETTE = [
  { value: '#3B82F6', name: 'blue' },
  { value: '#10B981', name: 'green' },
  { value: '#EF4444', name: 'red' },
  { value: '#F59E0B', name: 'yellow' },
  { value: '#8B5CF6', name: 'purple' },
  { value: '#EC4899', name: 'pink' },
  { value: '#F97316', name: 'orange' },
  { value: '#06B6D4', name: 'cyan' }
];

const MachinesModule = () => {
  const { t } = useTranslation('machines');
  const { hasPermission } = usePermissions();

  // Permissions
  const canCreate = hasPermission('machines.create');
  const canEdit = hasPermission('machines.edit');
  const canDelete = hasPermission('machines.delete');

  // State
  const [machines, setMachines] = useState([]);
  const [availableTreatments, setAvailableTreatments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState('create'); // 'create', 'edit'
  const [toast, setToast] = useState(null);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [machinesResponse, treatmentsResponse] = await Promise.all([
        machinesApi.getMachines(),
        machinesApi.getAvailableTreatments()
      ]);

      if (machinesResponse.success) {
        setMachines(machinesResponse.data || []);
      }

      if (treatmentsResponse.success) {
        setAvailableTreatments(treatmentsResponse.data || []);
      }
    } catch (error) {
      console.error('Error loading machines:', error);
      showToast(t('messages.loadError'), 'error');
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Filter machines based on search and status
  const filteredMachines = useMemo(() => {
    return machines.filter(machine => {
      // Active/inactive filter
      if (!showInactive && !machine.isActive) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchText = [
          machine.name,
          machine.description,
          machine.location
        ].filter(Boolean).join(' ').toLowerCase();
        if (!searchText.includes(query)) return false;
      }

      return true;
    }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [machines, showInactive, searchQuery]);

  // Handle create new machine
  const handleCreate = () => {
    setSelectedMachine(null);
    setFormMode('create');
    setShowFormModal(true);
  };

  // Handle edit machine
  const handleEdit = (machine) => {
    setSelectedMachine(machine);
    setFormMode('edit');
    setShowFormModal(true);
  };

  // Handle delete machine
  const handleDelete = async (machine) => {
    if (!window.confirm(t('modal.deleteConfirm', { name: machine.name }))) {
      return;
    }

    try {
      const response = await machinesApi.deleteMachine(machine.id);
      if (response.success) {
        showToast(t('messages.deleteSuccess'));
        loadData();
      } else {
        showToast(response.error?.message || t('messages.error'), 'error');
      }
    } catch (error) {
      console.error('Error deleting machine:', error);
      showToast(t('messages.error'), 'error');
    }
  };

  // Handle toggle active status
  const handleToggleActive = async (machine) => {
    try {
      const response = await machinesApi.updateMachine(machine.id, {
        isActive: !machine.isActive
      });
      if (response.success) {
        showToast(machine.isActive ? t('messages.deactivateSuccess') : t('messages.activateSuccess'));
        loadData();
      } else {
        showToast(response.error?.message || t('messages.error'), 'error');
      }
    } catch (error) {
      console.error('Error toggling machine status:', error);
      showToast(t('messages.error'), 'error');
    }
  };

  // Handle form save
  const handleFormSave = async (data) => {
    try {
      let response;
      if (formMode === 'create') {
        response = await machinesApi.createMachine(data);
      } else {
        response = await machinesApi.updateMachine(selectedMachine.id, data);
      }

      if (response.success) {
        showToast(formMode === 'create' ? t('messages.createSuccess') : t('messages.updateSuccess'));
        setShowFormModal(false);
        loadData();
      } else {
        showToast(response.error?.message || t('messages.error'), 'error');
      }
    } catch (error) {
      console.error('Error saving machine:', error);
      showToast(t('messages.error'), 'error');
    }
  };

  // Get color name from value
  const getColorName = (colorValue) => {
    const color = COLOR_PALETTE.find(c => c.value.toLowerCase() === (colorValue || '').toLowerCase());
    return color ? t(`colors.${color.name}`) : colorValue;
  };

  // Render machine card
  const renderMachineCard = (machine) => {
    const treatmentCount = machine.treatments?.length || 0;

    return (
      <div
        key={machine.id}
        className={`bg-white rounded-lg border shadow-sm overflow-hidden hover:shadow-md transition-shadow ${
          !machine.isActive ? 'opacity-60' : ''
        }`}
      >
        {/* Color bar */}
        <div
          className="h-2"
          style={{ backgroundColor: machine.color || '#3B82F6' }}
        />

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${machine.color || '#3B82F6'}20` }}
              >
                <Cpu
                  className="w-5 h-5"
                  style={{ color: machine.color || '#3B82F6' }}
                />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{machine.name}</h3>
                {machine.location && (
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <MapPin className="w-3 h-3" />
                    {machine.location}
                  </div>
                )}
              </div>
            </div>

            {/* Status badge */}
            <span
              className={`px-2 py-1 text-xs rounded-full ${
                machine.isActive
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {machine.isActive ? t('status.active') : t('status.inactive')}
            </span>
          </div>

          {/* Description */}
          {machine.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {machine.description}
            </p>
          )}

          {/* Treatments count */}
          <div className="flex items-center gap-2 mb-4">
            <Syringe className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              {t('treatments.count', { count: treatmentCount })}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-3 border-t">
            {canEdit && (
              <>
                <button
                  onClick={() => handleEdit(machine)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  {t('actions.edit')}
                </button>
                <button
                  onClick={() => handleToggleActive(machine)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {machine.isActive ? (
                    <>
                      <ToggleRight className="w-4 h-4" />
                      {t('actions.deactivate')}
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-4 h-4" />
                      {t('actions.activate')}
                    </>
                  )}
                </button>
              </>
            )}
            {canDelete && (
              <button
                onClick={() => handleDelete(machine)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-auto"
              >
                <Trash2 className="w-4 h-4" />
                {t('actions.delete')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Stats
  const stats = useMemo(() => {
    const total = machines.length;
    const active = machines.filter(m => m.isActive).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [machines]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{t('title')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
        </div>
        {canCreate && (
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('actions.add')}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('placeholders.search')}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Show inactive toggle */}
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            {t('filters.showInactive')}
          </label>

          <button onClick={loadData} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-semibold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">{t('stats.total')}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-semibold text-green-600">{stats.active}</div>
          <div className="text-sm text-gray-600">{t('stats.active')}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-2xl font-semibold text-gray-400">{stats.inactive}</div>
          <div className="text-sm text-gray-600">{t('stats.inactive')}</div>
        </div>
      </div>

      {/* Machine Grid */}
      {filteredMachines.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Cpu className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">
            {machines.length === 0 ? t('empty.title') : t('empty.filteredTitle')}
          </h3>
          <p className="text-gray-600 mt-1">
            {machines.length === 0 ? t('empty.description') : t('empty.filteredDescription')}
          </p>
          {machines.length === 0 && canCreate && (
            <button
              onClick={handleCreate}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('actions.add')}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMachines.map(renderMachineCard)}
        </div>
      )}

      {/* Form Modal */}
      {showFormModal && (
        <MachineFormModal
          isOpen={showFormModal}
          onClose={() => setShowFormModal(false)}
          onSave={handleFormSave}
          machine={selectedMachine}
          mode={formMode}
          availableTreatments={availableTreatments}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 ${
            toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default MachinesModule;
