/**
 * MachineFormModal - Modal for creating/editing machines
 * Includes treatment assignment functionality
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Cpu, Syringe, Check } from 'lucide-react';

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

const MachineFormModal = ({
  isOpen,
  onClose,
  onSave,
  machine,
  mode = 'create',
  availableTreatments = []
}) => {
  const { t } = useTranslation('machines');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    location: '',
    isActive: true,
    treatments: []
  });
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState('basic');
  const [saving, setSaving] = useState(false);

  // Initialize form with machine data
  useEffect(() => {
    if (machine && mode === 'edit') {
      setFormData({
        name: machine.name || '',
        description: machine.description || '',
        color: machine.color || '#3B82F6',
        location: machine.location || '',
        isActive: machine.isActive !== false,
        treatments: (machine.treatments || []).map(t => t.id)
      });
    } else {
      setFormData({
        name: '',
        description: '',
        color: '#3B82F6',
        location: '',
        isActive: true,
        treatments: []
      });
    }
    setErrors({});
    setActiveTab('basic');
  }, [machine, mode, isOpen]);

  // Handle input change
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Handle treatment toggle
  const handleTreatmentToggle = (treatmentId) => {
    setFormData(prev => {
      const treatments = prev.treatments.includes(treatmentId)
        ? prev.treatments.filter(id => id !== treatmentId)
        : [...prev.treatments, treatmentId];
      return { ...prev, treatments };
    });
  };

  // Validate form
  const validate = () => {
    const newErrors = {};

    if (!formData.name || formData.name.trim().length === 0) {
      newErrors.name = t('validation.name.required');
    } else if (formData.name.length > 100) {
      newErrors.name = t('validation.name.maxLength');
    }

    if (formData.color && !/^#[0-9A-Fa-f]{6}$/.test(formData.color)) {
      newErrors.color = t('validation.color.invalid');
    }

    if (formData.location && formData.location.length > 200) {
      newErrors.location = t('validation.location.maxLength');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${formData.color}20` }}
            >
              <Cpu className="w-5 h-5" style={{ color: formData.color }} />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {mode === 'create' ? t('modal.createTitle') : t('modal.editTitle')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-6">
          <button
            onClick={() => setActiveTab('basic')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'basic'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('modal.basicInfo')}
          </button>
          <button
            onClick={() => setActiveTab('treatments')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'treatments'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('modal.treatmentsTab')}
            {formData.treatments.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-600 rounded">
                {formData.treatments.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'basic' && (
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('fields.name')} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder={t('placeholders.name')}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.name ? 'border-red-500' : ''
                  }`}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('fields.description')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder={t('placeholders.description')}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('fields.color')}
                </label>
                <div className="flex items-center gap-2">
                  {COLOR_PALETTE.map(color => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => handleChange('color', color.value)}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${
                        formData.color === color.value
                          ? 'border-gray-400 scale-110'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={t(`colors.${color.name}`)}
                    />
                  ))}
                </div>
                {errors.color && (
                  <p className="mt-1 text-sm text-red-600">{errors.color}</p>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('fields.location')}
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder={t('placeholders.location')}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.location ? 'border-red-500' : ''
                  }`}
                />
                {errors.location && (
                  <p className="mt-1 text-sm text-red-600">{errors.location}</p>
                )}
              </div>

              {/* Active status */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => handleChange('isActive', e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  {t('fields.isActive')}
                </label>
              </div>
            </div>
          )}

          {activeTab === 'treatments' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {t('treatments.description')}
              </p>

              {availableTreatments.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Syringe className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">
                    {t('treatments.noTreatments')}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableTreatments.map(treatment => {
                    const isSelected = formData.treatments.includes(treatment.id);
                    return (
                      <button
                        key={treatment.id}
                        type="button"
                        onClick={() => handleTreatmentToggle(treatment.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors text-left ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Syringe className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                          <div>
                            <div className="font-medium text-gray-900">{treatment.title}</div>
                            {treatment.duration && (
                              <div className="text-sm text-gray-500">
                                {treatment.duration} min
                              </div>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="w-5 h-5 text-blue-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Enregistrement...
              </span>
            ) : (
              mode === 'create' ? 'Créer' : 'Enregistrer'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MachineFormModal;
