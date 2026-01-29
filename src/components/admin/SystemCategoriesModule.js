/**
 * SystemCategoriesModule
 * Admin interface for managing system categories (consent types, appointment types, specialties, departments)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Edit2, Trash2, Save, X, GripVertical, RefreshCw,
  Shield, Eye, EyeOff, Globe, Settings, ChevronRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import systemCategoriesApi, { CATEGORY_TYPES } from '../../api/systemCategoriesApi';
import { clearSystemCategoriesCache, notifyCategoryUpdate } from '../../hooks/useSystemCategories';

// Color options for categories
const AVAILABLE_COLORS = [
  'blue', 'red', 'green', 'purple', 'orange', 'pink', 'yellow', 'indigo',
  'gray', 'teal', 'cyan', 'lime', 'amber', 'violet', 'fuchsia', 'sky', 'slate'
];

// Icon options (from Lucide icons commonly used)
const AVAILABLE_ICONS = [
  'Heart', 'Scissors', 'Moon', 'Search', 'Video', 'FlaskConical', 'Baby',
  'Database', 'Camera', 'Mail', 'Smile', 'Brain', 'Shield', 'Stethoscope',
  'Activity', 'Eye', 'Bone', 'Droplet', 'Target', 'Crown', 'FileText',
  'UserCheck', 'Pill', 'ClipboardCheck', 'Users', 'Scan', 'Wind', 'ArrowUp',
  'ArrowDown', 'Minus', 'AlertTriangle'
];

// Languages supported
const LANGUAGES = [
  { code: 'es', name: 'Espa\u00f1ol', flag: '\ud83c\uddea\ud83c\uddf8' },
  { code: 'en', name: 'English', flag: '\ud83c\uddec\ud83c\udde7' },
  { code: 'fr', name: 'Fran\u00e7ais', flag: '\ud83c\uddeb\ud83c\uddf7' }
];

// Tab configuration
const TABS = [
  { id: 'consent_type', labelKey: 'systemCategories.tabs.consentTypes', icon: 'FileText' },
  { id: 'appointment_type', labelKey: 'systemCategories.tabs.appointmentTypes', icon: 'Calendar' },
  { id: 'specialty', labelKey: 'systemCategories.tabs.specialties', icon: 'Stethoscope' },
  { id: 'department', labelKey: 'systemCategories.tabs.departments', icon: 'Building' },
  { id: 'priority', labelKey: 'systemCategories.tabs.priorities', icon: 'Flag' }
];

const SystemCategoriesModule = () => {
  const { t, i18n } = useTranslation('admin');
  const currentLanguage = i18n.language?.substring(0, 2) || 'es';

  // State
  const [activeTab, setActiveTab] = useState('consent_type');
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);

  // Load categories for active tab
  const loadCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await systemCategoriesApi.getSystemCategoriesByType(activeTab, true);
      setCategories(response.data || []);
    } catch (err) {
      console.error('[SystemCategoriesModule] Load error:', err);
      setError(err.message || 'Error loading categories');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Get translated name for display
  const getTranslatedName = (category) => {
    const translations = category.translations || {};
    return translations[currentLanguage]?.name
      || translations.es?.name
      || translations.en?.name
      || category.code;
  };

  // Get translated description for display
  const getTranslatedDescription = (category) => {
    const translations = category.translations || {};
    return translations[currentLanguage]?.description
      || translations.es?.description
      || translations.en?.description
      || '';
  };

  // Initialize form data for creating/editing
  const initFormData = (category = null) => {
    if (category) {
      return {
        id: category.id,
        code: category.code,
        categoryType: category.categoryType,
        translations: {
          es: { name: category.translations?.es?.name || '', description: category.translations?.es?.description || '' },
          en: { name: category.translations?.en?.name || '', description: category.translations?.en?.description || '' },
          fr: { name: category.translations?.fr?.name || '', description: category.translations?.fr?.description || '' }
        },
        metadata: category.metadata || {},
        sortOrder: category.sortOrder || 0,
        isActive: category.isActive !== false,
        isSystem: category.isSystem || false
      };
    }
    return {
      code: '',
      categoryType: activeTab,
      translations: {
        es: { name: '', description: '' },
        en: { name: '', description: '' },
        fr: { name: '', description: '' }
      },
      metadata: getDefaultMetadata(activeTab),
      sortOrder: categories.length,
      isActive: true,
      isSystem: false
    };
  };

  // Get default metadata based on category type
  const getDefaultMetadata = (type) => {
    switch (type) {
      case 'consent_type':
        return { required: true, renewable: false, defaultDuration: null, icon: 'FileText', color: 'blue' };
      case 'appointment_type':
        return { duration: 30, color: 'blue', priority: 'normal' };
      case 'specialty':
        return { icon: 'Stethoscope', color: 'blue', modules: ['base'] };
      case 'department':
        return { icon: 'Building', color: 'gray' };
      case 'priority':
        return { icon: 'Flag', color: 'blue' };
      default:
        return {};
    }
  };

  // Handle create new
  const handleCreate = () => {
    setEditingCategory(null);
    setFormData(initFormData());
    setShowModal(true);
  };

  // Handle edit
  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData(initFormData(category));
    setShowModal(true);
  };

  // Handle delete
  const handleDelete = async (category) => {
    if (category.isSystem) {
      alert(t('systemCategories.deleteSystemError', 'System categories cannot be deleted'));
      return;
    }

    if (!window.confirm(t('systemCategories.deleteConfirm', 'Are you sure you want to delete this category?'))) {
      return;
    }

    try {
      await systemCategoriesApi.deleteSystemCategory(category.id);
      clearSystemCategoriesCache(activeTab);
      notifyCategoryUpdate(activeTab);
      await loadCategories();
    } catch (err) {
      console.error('[SystemCategoriesModule] Delete error:', err);
      alert(err.message || 'Error deleting category');
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!formData.code?.trim()) {
      alert(t('systemCategories.validation.codeRequired', 'Code is required'));
      return;
    }

    if (!formData.translations?.es?.name?.trim()) {
      alert(t('systemCategories.validation.nameRequired', 'Spanish name is required'));
      return;
    }

    try {
      setSaving(true);

      const payload = {
        code: formData.code.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        categoryType: formData.categoryType,
        translations: formData.translations,
        metadata: formData.metadata,
        sortOrder: formData.sortOrder,
        isActive: formData.isActive
      };

      if (editingCategory) {
        await systemCategoriesApi.updateSystemCategory(editingCategory.id, payload);
      } else {
        await systemCategoriesApi.createSystemCategory(payload);
      }

      clearSystemCategoriesCache(activeTab);
      notifyCategoryUpdate(activeTab);
      setShowModal(false);
      setFormData(null);
      setEditingCategory(null);
      await loadCategories();
    } catch (err) {
      console.error('[SystemCategoriesModule] Save error:', err);
      alert(err.message || 'Error saving category');
    } finally {
      setSaving(false);
    }
  };

  // Handle toggle active
  const handleToggleActive = async (category) => {
    try {
      await systemCategoriesApi.updateSystemCategory(category.id, {
        isActive: !category.isActive
      });
      clearSystemCategoriesCache(activeTab);
      notifyCategoryUpdate(activeTab);
      await loadCategories();
    } catch (err) {
      console.error('[SystemCategoriesModule] Toggle error:', err);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, category) => {
    setDraggedItem(category);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetCategory) => {
    e.preventDefault();

    if (!draggedItem || draggedItem.id === targetCategory.id) {
      setDraggedItem(null);
      return;
    }

    // Calculate new order
    const newCategories = [...categories];
    const draggedIndex = newCategories.findIndex(c => c.id === draggedItem.id);
    const targetIndex = newCategories.findIndex(c => c.id === targetCategory.id);

    newCategories.splice(draggedIndex, 1);
    newCategories.splice(targetIndex, 0, draggedItem);

    // Optimistic update
    setCategories(newCategories);
    setDraggedItem(null);

    // Send reorder request
    try {
      const orderedIds = newCategories.map(c => c.id);
      await systemCategoriesApi.reorderSystemCategories(activeTab, orderedIds);
      clearSystemCategoriesCache(activeTab);
      notifyCategoryUpdate(activeTab);
    } catch (err) {
      console.error('[SystemCategoriesModule] Reorder error:', err);
      await loadCategories(); // Revert on error
    }
  };

  // Update form field
  const updateFormField = (path, value) => {
    setFormData(prev => {
      const newData = { ...prev };
      const keys = path.split('.');
      let current = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  // Render color badge
  const renderColorBadge = (color) => {
    const colorClasses = {
      blue: 'bg-blue-100 text-blue-800',
      red: 'bg-red-100 text-red-800',
      green: 'bg-green-100 text-green-800',
      purple: 'bg-purple-100 text-purple-800',
      orange: 'bg-orange-100 text-orange-800',
      pink: 'bg-pink-100 text-pink-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      indigo: 'bg-indigo-100 text-indigo-800',
      gray: 'bg-gray-100 text-gray-800',
      teal: 'bg-teal-100 text-teal-800',
      cyan: 'bg-cyan-100 text-cyan-800',
      lime: 'bg-lime-100 text-lime-800',
      amber: 'bg-amber-100 text-amber-800',
      violet: 'bg-violet-100 text-violet-800',
      fuchsia: 'bg-fuchsia-100 text-fuchsia-800',
      sky: 'bg-sky-100 text-sky-800',
      slate: 'bg-slate-100 text-slate-800'
    };
    return colorClasses[color] || colorClasses.blue;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('systemCategories.title', 'System Categories')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('systemCategories.subtitle', 'Manage consent types, appointment types, specialties, and departments')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadCategories}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg dark:text-gray-400 dark:hover:bg-gray-700"
            title={t('common.refresh', 'Refresh')}
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('systemCategories.createCategory', 'New Category')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4 overflow-x-auto pb-px">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {t(tab.labelKey, tab.id.replace('_', ' '))}
            </button>
          ))}
        </nav>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        /* Categories list */
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {categories.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {t('systemCategories.noCategories', 'No categories found')}
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {categories.map((category, index) => (
                <li
                  key={category.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, category)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, category)}
                  className={`flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    draggedItem?.id === category.id ? 'opacity-50' : ''
                  } ${!category.isActive ? 'opacity-60' : ''}`}
                >
                  {/* Drag handle */}
                  <div className="cursor-grab text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <GripVertical className="w-5 h-5" />
                  </div>

                  {/* Color indicator */}
                  <div
                    className={`w-3 h-3 rounded-full ${renderColorBadge(category.metadata?.color || 'blue').split(' ')[0]}`}
                  />

                  {/* Category info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {getTranslatedName(category)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {category.code}
                      </span>
                      {category.isSystem && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                          <Shield className="w-3 h-3 mr-1" />
                          {t('systemCategories.system', 'System')}
                        </span>
                      )}
                      {!category.isActive && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                          <EyeOff className="w-3 h-3 mr-1" />
                          {t('systemCategories.inactive', 'Inactive')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {getTranslatedDescription(category)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(category)}
                      className={`p-2 rounded-lg transition-colors ${
                        category.isActive
                          ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                          : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title={category.isActive ? t('common.deactivate', 'Deactivate') : t('common.activate', 'Activate')}
                    >
                      {category.isActive ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => handleEdit(category)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg dark:hover:bg-blue-900/20"
                      title={t('common.edit', 'Edit')}
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    {!category.isSystem && (
                      <button
                        onClick={() => handleDelete(category)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg dark:hover:bg-red-900/20"
                        title={t('common.delete', 'Delete')}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Edit/Create Modal */}
      {showModal && formData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingCategory
                  ? t('systemCategories.editCategory', 'Edit Category')
                  : t('systemCategories.createCategory', 'New Category')}
              </h3>
              <button
                onClick={() => { setShowModal(false); setFormData(null); setEditingCategory(null); }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-6">
              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('systemCategories.code', 'Code')} *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => updateFormField('code', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                  disabled={editingCategory?.isSystem}
                  placeholder="e.g., medical_treatment"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('systemCategories.codeHelp', 'Alphanumeric with underscores, lowercase')}
                </p>
              </div>

              {/* Translations */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  <Globe className="w-4 h-4" />
                  {t('systemCategories.translations', 'Translations')}
                </label>
                <div className="space-y-4">
                  {LANGUAGES.map(lang => (
                    <div key={lang.code} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">{lang.flag}</span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {lang.name}
                        </span>
                      </div>
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={formData.translations[lang.code]?.name || ''}
                          onChange={(e) => updateFormField(`translations.${lang.code}.name`, e.target.value)}
                          placeholder={t('systemCategories.namePlaceholder', 'Name')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        <textarea
                          value={formData.translations[lang.code]?.description || ''}
                          onChange={(e) => updateFormField(`translations.${lang.code}.description`, e.target.value)}
                          placeholder={t('systemCategories.descriptionPlaceholder', 'Description (optional)')}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Metadata section based on type */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  <Settings className="w-4 h-4" />
                  {t('systemCategories.metadata', 'Configuration')}
                </label>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-4">
                  {/* Color selector */}
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {t('systemCategories.color', 'Color')}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_COLORS.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => updateFormField('metadata.color', color)}
                          className={`w-8 h-8 rounded-lg transition-all ${
                            formData.metadata?.color === color
                              ? 'ring-2 ring-offset-2 ring-blue-500'
                              : ''
                          } ${renderColorBadge(color)}`}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Icon selector */}
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {t('systemCategories.icon', 'Icon')}
                    </label>
                    <select
                      value={formData.metadata?.icon || ''}
                      onChange={(e) => updateFormField('metadata.icon', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      {AVAILABLE_ICONS.map(icon => (
                        <option key={icon} value={icon}>{icon}</option>
                      ))}
                    </select>
                  </div>

                  {/* Type-specific fields */}
                  {activeTab === 'consent_type' && (
                    <>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.metadata?.required || false}
                            onChange={(e) => updateFormField('metadata.required', e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {t('systemCategories.required', 'Required')}
                          </span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.metadata?.renewable || false}
                            onChange={(e) => updateFormField('metadata.renewable', e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {t('systemCategories.renewable', 'Renewable')}
                          </span>
                        </label>
                      </div>
                      {formData.metadata?.renewable && (
                        <div>
                          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                            {t('systemCategories.defaultDuration', 'Default duration (days)')}
                          </label>
                          <input
                            type="number"
                            value={formData.metadata?.defaultDuration || ''}
                            onChange={(e) => updateFormField('metadata.defaultDuration', e.target.value ? parseInt(e.target.value) : null)}
                            placeholder="365"
                            className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                        </div>
                      )}
                    </>
                  )}

                  {activeTab === 'appointment_type' && (
                    <>
                      <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                          {t('systemCategories.duration', 'Duration (minutes)')}
                        </label>
                        <input
                          type="number"
                          value={formData.metadata?.duration || 30}
                          onChange={(e) => updateFormField('metadata.duration', parseInt(e.target.value) || 30)}
                          className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                          {t('systemCategories.priority', 'Priority')}
                        </label>
                        <select
                          value={formData.metadata?.priority || 'normal'}
                          onChange={(e) => updateFormField('metadata.priority', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                          <option value="low">{t('priorities.low', 'Low')}</option>
                          <option value="normal">{t('priorities.normal', 'Normal')}</option>
                          <option value="high">{t('priorities.high', 'High')}</option>
                          <option value="urgent">{t('priorities.urgent', 'Urgent')}</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Active checkbox */}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => updateFormField('isActive', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('systemCategories.isActive', 'Active')}
                </span>
              </label>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => { setShowModal(false); setFormData(null); setEditingCategory(null); }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemCategoriesModule;
