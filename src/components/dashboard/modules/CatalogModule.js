/**
 * CatalogModule - Main catalog management module
 * Manages medications, treatments, and services with tag-based grouping
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Package, Plus, Search, Edit, Trash2, Copy,
  ChevronDown, ChevronRight, Pill, Syringe, Stethoscope, Tag,
  ToggleLeft, ToggleRight, X, Check, RefreshCw
} from 'lucide-react';
import { catalogStorage } from '../../../utils/catalogStorage';
import categoriesApi from '../../../api/categoriesApi';
import tagsApi from '../../../api/tagsApi';
import { CATALOG_TYPES, DOSAGE_UNITS } from '../../../constants/catalogConfig';
import { usePermissions } from '../../auth/PermissionGuard';
import CatalogFormModal from '../modals/CatalogFormModal';

// Icon mapping for item types
const TYPE_ICONS = {
  medication: Pill,
  treatment: Syringe,
  service: Stethoscope,
  product: Package  // Fallback for legacy 'product' type
};

// Color mapping for item types
const TYPE_COLORS = {
  medication: 'bg-green-100 text-green-700',
  treatment: 'bg-blue-100 text-blue-700',
  service: 'bg-purple-100 text-purple-700',
  product: 'bg-gray-100 text-gray-700'  // Fallback for legacy 'product' type
};

const CatalogModule = () => {
  const { t } = useTranslation('catalog');
  const { hasPermission } = usePermissions();

  // Permissions
  const canCreate = hasPermission('catalog.create');
  const canEdit = hasPermission('catalog.edit');
  const canDelete = hasPermission('catalog.delete');

  // State
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState({});
  const [availableTags, setAvailableTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [selectedTagFilter, setSelectedTagFilter] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState('create'); // 'create', 'edit'
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [toast, setToast] = useState(null);
  // Legacy family/variant UI state (kept for UI compatibility)
  const [expandedFamilies, setExpandedFamilies] = useState(new Set());
  // State for creating variant with pre-selected parent
  const [createVariantParentId, setCreateVariantParentId] = useState(null);

  // Category manager state (lifted from renderCategoryManager to avoid hooks in render function)
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#6366F1');
  const [categoryManagerType, setCategoryManagerType] = useState('medication');
  // Category editing state
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategoryColor, setEditingCategoryColor] = useState('');

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load items, categories and tags in parallel
      const [loadedItems, tagsResponse, categoriesResponse] = await Promise.all([
        catalogStorage.getAllAsync(),
        tagsApi.getTags(),
        categoriesApi.getCategoriesGrouped()
      ]);

      // Transform items: API uses different field names than frontend
      const transformedItems = loadedItems.map(item => ({
        ...item,
        name: item.title || item.name,
        type: item.itemType || item.type,
        price: item.unitPrice ?? item.price ?? 0,
        vatRate: item.taxRate ?? item.vatRate ?? 20,
        isActive: item.isActive !== false,  // Default to true if not explicitly false
        // Get first category ID if categories array exists
        category: item.categories && item.categories.length > 0 ? item.categories[0].id : null
      }));
      setItems(transformedItems);

      // Set categories grouped by type
      if (categoriesResponse.success) {
        setCategories(categoriesResponse.data || {});
      }

      // Set tags
      if (tagsResponse.success) {
        setAvailableTags(tagsResponse.data || []);
      }
    } catch (error) {
      console.error('Error loading catalog:', error);
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

  // Filter items based on current tab and filters
  const filteredItems = useMemo(() => {
    const filtered = items.filter(item => {
      // Tab filter
      if (activeTab !== 'all' && activeTab !== 'categories') {
        const typeMap = {
          medications: 'medication',
          treatments: 'treatment',
          services: 'service'
        };
        if (item.type !== typeMap[activeTab]) return false;
      }

      // Active/inactive filter
      if (!showInactive && !item.isActive) return false;

      // Category filter
      if (selectedCategory && item.category !== selectedCategory) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchText = [
          item.name,
          item.description
        ].filter(Boolean).join(' ').toLowerCase();
        if (!searchText.includes(query)) return false;
      }

      // Don't show variants at top level (they're shown under their parent)
      if (item.isVariant) return false;

      return true;
    });

    // Sort: families first, then by name
    return filtered.sort((a, b) => {
      // Families come first
      if (a.isFamily && !b.isFamily) return -1;
      if (!a.isFamily && b.isFamily) return 1;
      // Then sort by name
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [items, activeTab, showInactive, selectedCategory, searchQuery]);

  // Get variants for a family (sorted by name)
  const getItemVariants = useCallback((familyId) => {
    return items
      .filter(item => item.parentId === familyId && item.isVariant)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [items]);

  // Toggle family expansion
  const toggleFamily = (familyId) => {
    setExpandedFamilies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(familyId)) {
        newSet.delete(familyId);
      } else {
        newSet.add(familyId);
      }
      return newSet;
    });
  };

  // Handle create new item
  const handleCreate = () => {
    setSelectedItem(null);
    setCreateVariantParentId(null); // Reset parent when creating normal item
    setFormMode('create');
    setShowFormModal(true);
  };

  // Handle edit item
  const handleEdit = (item) => {
    setSelectedItem(item);
    setFormMode('edit');
    setShowFormModal(true);
  };

  // Handle add variant - pre-selects the parent family
  const handleAddVariant = (familyItem) => {
    setSelectedItem(null);
    setCreateVariantParentId(familyItem.id);
    setFormMode('create');
    setShowFormModal(true);
  };

  // Handle duplicate item
  const handleDuplicate = async (item) => {
    try {
      const result = await catalogStorage.duplicate(item.id);
      if (result.success) {
        await loadData();
        showToast(t('messages.duplicateSuccess'));
      } else {
        showToast(t('messages.error'), 'error');
      }
    } catch (error) {
      console.error('Error duplicating item:', error);
      showToast(t('messages.error'), 'error');
    }
  };

  // Handle toggle active
  const handleToggleActive = async (item) => {
    try {
      const result = await catalogStorage.toggleActive(item.id);
      if (result.success) {
        await loadData();
        showToast(result.item.isActive ? t('messages.activateSuccess') : t('messages.deactivateSuccess'));
      } else {
        showToast(t('messages.error'), 'error');
      }
    } catch (error) {
      console.error('Error toggling active status:', error);
      showToast(t('messages.error'), 'error');
    }
  };

  // Handle delete item
  const handleDelete = async (item) => {
    if (window.confirm(t('modal.deleteConfirm', { name: item.name }))) {
      try {
        const result = await catalogStorage.remove(item.id);
        if (result.success) {
          await loadData();
          showToast(t('messages.deleteSuccess'));
        } else {
          showToast(t('messages.error'), 'error');
        }
      } catch (error) {
        console.error('Error deleting item:', error);
        showToast(t('messages.error'), 'error');
      }
    }
  };

  // Handle convert to family
  const handleConvertToFamily = async (item) => {
    try {
      const result = await catalogStorage.convertToFamily(item.id);
      if (result.success) {
        await loadData();
        showToast(t('messages.updateSuccess'));
      } else {
        showToast(t('messages.error'), 'error');
      }
    } catch (error) {
      console.error('Error converting to family:', error);
      showToast(t('messages.error'), 'error');
    }
  };

  // Handle form save
  const handleFormSave = async () => {
    await loadData();
    setShowFormModal(false);
    showToast(formMode === 'create' || formMode === 'variant' ? t('messages.createSuccess') : t('messages.updateSuccess'));
  };

  // Format price
  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  // Format dosage
  const formatDosage = (item) => {
    if (!item.dosage) return null;
    const unit = DOSAGE_UNITS.find(u => u.id === item.dosageUnit);
    return `${item.dosage} ${unit ? unit.label : item.dosageUnit || ''}`;
  };

  // Get category name
  const getCategoryName = (categoryId, itemType) => {
    if (!categoryId) return t('categories.uncategorized');
    const typeCategories = categories[itemType] || [];
    const category = typeCategories.find(c => c.id === categoryId);
    if (!category) return t('categories.uncategorized');
    return category.name;
  };

  // Get category color
  const getCategoryColor = (categoryId, itemType) => {
    if (!categoryId) return '#6B7280';
    const typeCategories = categories[itemType] || [];
    const category = typeCategories.find(c => c.id === categoryId);
    return category ? category.color : '#6B7280';
  };

  // Stats - computed from local items state
  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter(i => i.isActive).length,
    inactive: items.filter(i => !i.isActive).length,
    families: items.filter(i => i.isFamily).length,
    variants: items.filter(i => i.isVariant).length,
    byType: {
      medication: items.filter(i => i.type === 'medication').length,
      treatment: items.filter(i => i.type === 'treatment').length,
      service: items.filter(i => i.type === 'service').length
    }
  }), [items]);

  // Render item row
  const renderItem = (item, isVariant = false) => {
    const TypeIcon = TYPE_ICONS[item.type] || Package;  // Fallback to Package icon
    const variants = item.isFamily ? getItemVariants(item.id) : [];
    const isExpanded = expandedFamilies.has(item.id);
    const dosageStr = formatDosage(item);

    return (
      <React.Fragment key={item.id}>
        <tr className={`hover:bg-gray-50 ${!item.isActive ? 'opacity-50' : ''} ${isVariant ? 'bg-gray-50' : ''}`}>
          {/* Expand/Name column */}
          <td className="px-6 py-4 whitespace-nowrap">
            <div className={`flex items-center ${isVariant ? 'pl-8' : ''}`}>
              {item.isFamily && variants.length > 0 && (
                <button
                  onClick={() => toggleFamily(item.id)}
                  className="mr-2 text-gray-400 hover:text-gray-600"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              )}
              {!item.isFamily && !isVariant && <div className="w-6" />}
              {isVariant && <div className="w-6 border-l-2 border-gray-200 h-full -ml-4 mr-2" />}

              <div className={`p-2 rounded-lg ${TYPE_COLORS[item.type] || 'bg-gray-100 text-gray-700'} mr-3`}>
                <TypeIcon className="h-4 w-4" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{item.name}</span>
                  {item.isFamily && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                      {t('family.title')}
                    </span>
                  )}
                  {isVariant && (
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                      {t('variant.title')}
                    </span>
                  )}
                </div>
                {dosageStr && (
                  <span className="text-xs text-gray-500">{dosageStr}</span>
                )}
                {item.volume && (
                  <span className="text-xs text-gray-500 ml-2">{item.volume}ml</span>
                )}
              </div>
            </div>
          </td>

          {/* Type column */}
          <td className="px-6 py-4 whitespace-nowrap">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[item.type] || 'bg-gray-100 text-gray-700'}`}>
              {t(`types.${item.type}`)}
            </span>
          </td>

          {/* Category column */}
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getCategoryColor(item.category, item.type) }}
              />
              <span className="text-sm text-gray-600">
                {getCategoryName(item.category, item.type)}
              </span>
            </div>
          </td>

          {/* Price column */}
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            {formatPrice(item.price)}
          </td>

          {/* VAT column */}
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {item.vatRate}%
          </td>

          {/* Status column */}
          <td className="px-6 py-4 whitespace-nowrap">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              item.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {item.isActive ? t('status.active') : t('status.inactive')}
            </span>
          </td>

          {/* Actions column */}
          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
            <div className="flex items-center justify-end gap-1">
              {canEdit && (
                <button
                  onClick={() => handleEdit(item)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title={t('actions.edit')}
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}

              {canCreate && (
                <button
                  onClick={() => handleDuplicate(item)}
                  className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                  title={t('actions.duplicate')}
                >
                  <Copy className="h-4 w-4" />
                </button>
              )}

              {canEdit && item.isFamily && (
                <button
                  onClick={() => handleAddVariant(item)}
                  className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  title={t('actions.addVariant')}
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}

              {canEdit && !item.isFamily && !item.isVariant && CATALOG_TYPES[item.type]?.canHaveVariants && (
                <button
                  onClick={() => handleConvertToFamily(item)}
                  className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                  title={t('actions.convertToFamily')}
                >
                  <Tag className="h-4 w-4" />
                </button>
              )}

              {canEdit && (
                <button
                  onClick={() => handleToggleActive(item)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    item.isActive
                      ? 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'
                      : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                  }`}
                  title={item.isActive ? t('actions.deactivate') : t('actions.activate')}
                >
                  {item.isActive ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
                </button>
              )}

              {canDelete && (
                <button
                  onClick={() => handleDelete(item)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title={t('actions.delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </td>
        </tr>

        {/* Render variants if expanded */}
        {item.isFamily && isExpanded && variants.map(variant => renderItem(variant, true))}
      </React.Fragment>
    );
  };

  // Handle adding a category
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const response = await categoriesApi.createCategory({
        name: newCategoryName.trim(),
        color: newCategoryColor,
        type: categoryManagerType
      });

      if (response.success) {
        // Reload categories from API
        const categoriesResponse = await categoriesApi.getCategoriesGrouped();
        if (categoriesResponse.success) {
          setCategories(categoriesResponse.data || {});
        }
        setNewCategoryName('');
        showToast(t('messages.categoryCreateSuccess'));
      } else {
        showToast(response.error?.message || t('messages.error'), 'error');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      showToast(t('messages.error'), 'error');
    }
  };

  // Handle deleting a category
  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm(t('categories.confirmDelete'))) return;

    try {
      const response = await categoriesApi.deleteCategory(categoryId);

      if (response.success) {
        // Reload categories from API
        const categoriesResponse = await categoriesApi.getCategoriesGrouped();
        if (categoriesResponse.success) {
          setCategories(categoriesResponse.data || {});
        }
        showToast(t('messages.categoryDeleteSuccess'));
      } else {
        showToast(response.error?.message || t('messages.error'), 'error');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      showToast(t('messages.error'), 'error');
    }
  };

  // Start editing a category
  const startEditingCategory = (category) => {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
    setEditingCategoryColor(category.color);
  };

  // Save category edit
  const saveEditingCategory = async () => {
    if (!editingCategoryName.trim() || !editingCategoryId) return;

    try {
      const response = await categoriesApi.updateCategory(editingCategoryId, {
        name: editingCategoryName.trim(),
        color: editingCategoryColor
      });

      if (response.success) {
        // Reload categories from API
        const categoriesResponse = await categoriesApi.getCategoriesGrouped();
        if (categoriesResponse.success) {
          setCategories(categoriesResponse.data || {});
        }
        showToast(t('messages.categoryUpdateSuccess'));
      } else {
        showToast(response.error?.message || t('messages.error'), 'error');
      }
    } catch (error) {
      console.error('Error updating category:', error);
      showToast(t('messages.error'), 'error');
    }

    cancelEditingCategory();
  };

  // Cancel category edit
  const cancelEditingCategory = () => {
    setEditingCategoryId(null);
    setEditingCategoryName('');
    setEditingCategoryColor('');
  };

  // Handle key press in edit input
  const handleEditKeyPress = (e) => {
    if (e.key === 'Enter') {
      saveEditingCategory();
    } else if (e.key === 'Escape') {
      cancelEditingCategory();
    }
  };

  // Get display name for category
  const getCategoryDisplayName = (category) => {
    return category.name;
  };

  // Render category manager
  const renderCategoryManager = () => {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">{t('categories.manage')}</h3>
          <button
            onClick={() => setShowCategoryManager(false)}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-6">{t('categories.description')}</p>

        {/* Type selector */}
        <div className="mb-4">
          <select
            value={categoryManagerType}
            onChange={(e) => setCategoryManagerType(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            {Object.keys(CATALOG_TYPES).map(type => (
              <option key={type} value={type}>{t(`types.${type}`)}</option>
            ))}
          </select>
        </div>

        {/* Add new category */}
        {canEdit && (
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder={t('placeholders.categoryName')}
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            <input
              type="color"
              value={newCategoryColor}
              onChange={(e) => setNewCategoryColor(e.target.value)}
              className="h-9 w-9 rounded-md border border-gray-300 cursor-pointer"
            />
            <button
              onClick={handleAddCategory}
              disabled={!newCategoryName.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Category list */}
        <div className="space-y-2">
          {(categories[categoryManagerType] || []).map(category => (
            <div
              key={category.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group"
            >
              {editingCategoryId === category.id ? (
                /* Edit mode */
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="color"
                    value={editingCategoryColor}
                    onChange={(e) => setEditingCategoryColor(e.target.value)}
                    className="h-8 w-8 rounded-md border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={editingCategoryName}
                    onChange={(e) => setEditingCategoryName(e.target.value)}
                    onKeyDown={handleEditKeyPress}
                    autoFocus
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={saveEditingCategory}
                    className="p-1 text-green-600 hover:text-green-700"
                    title={t('actions.save', 'Enregistrer')}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={cancelEditingCategory}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title={t('actions.cancel', 'Annuler')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                /* View mode */
                <>
                  <div
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                    onDoubleClick={() => canEdit && startEditingCategory(category)}
                    title={canEdit ? t('categories.doubleClickToEdit', 'Double-cliquez pour modifier') : ''}
                  >
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm font-medium text-gray-900">
                      {getCategoryDisplayName(category)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {canEdit && (
                      <button
                        onClick={() => startEditingCategory(category)}
                        className="p-1 text-gray-400 hover:text-green-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title={t('actions.edit')}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title={t('actions.delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}

          {(!categories[categoryManagerType] || categories[categoryManagerType].length === 0) && (
            <p className="text-sm text-gray-500 text-center py-4">
              {t('empty.title')}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {t('title')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
        </div>

        <div className="flex items-center gap-3">
          {canCreate && (
            <button
              onClick={() => handleCreate()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('actions.addItem')}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {['all', 'medications', 'treatments', 'services', 'categories'].map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  if (tab === 'categories') {
                    setShowCategoryManager(true);
                  } else {
                    setShowCategoryManager(false);
                  }
                }}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t(`tabs.${tab}`)}
              </button>
            ))}
          </nav>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 p-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-semibold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">{t('stats.total')}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-semibold text-green-600">{stats.active}</div>
            <div className="text-sm text-gray-500">{t('stats.active')}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-semibold text-gray-400">{stats.inactive}</div>
            <div className="text-sm text-gray-500">{t('stats.inactive')}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-semibold text-amber-600">{stats.families}</div>
            <div className="text-sm text-gray-500">{t('stats.families')}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-semibold text-blue-600">{stats.variants}</div>
            <div className="text-sm text-gray-500">{t('stats.variants')}</div>
          </div>
        </div>

        {showCategoryManager ? (
          renderCategoryManager()
        ) : (
          <>
            {/* Filters */}
            <div className="p-4 border-b border-gray-200 flex items-center gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('placeholders.search')}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Category filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{t('filters.category')}</option>
                {Object.values(categories).flat().map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>

              {/* Show inactive toggle */}
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                {t('filters.showInactive')}
              </label>

              {/* Refresh */}
              <button
                onClick={loadData}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              {/* Clear filters */}
              {(searchQuery || selectedCategory || showInactive) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('');
                    setShowInactive(false);
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  {t('filters.clearFilters')}
                </button>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    {searchQuery || selectedCategory ? t('empty.filteredTitle') : t('empty.title')}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchQuery || selectedCategory ? t('empty.filteredDescription') : t('empty.description')}
                  </p>
                  {canCreate && !searchQuery && !selectedCategory && (
                    <div className="mt-6">
                      <button
                        onClick={() => handleCreate()}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <Plus className="w-4 h-4" />
                        {t('actions.addItem')}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('fields.name')}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('fields.type')}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('fields.category')}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('fields.price')}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('fields.vatRate')}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('status.active')}
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredItems.map(item => renderItem(item))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      {/* Form Modal */}
      {showFormModal && (
        <CatalogFormModal
          isOpen={showFormModal}
          onClose={() => {
            setShowFormModal(false);
            setCreateVariantParentId(null);
          }}
          onSave={handleFormSave}
          item={selectedItem}
          availableTags={availableTags}
          mode={formMode}
          categories={categories}
          allItems={items}
          defaultParentId={createVariantParentId}
        />
      )}

      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
        }`}>
          {toast.type === 'error' ? (
            <X className="h-5 w-5" />
          ) : (
            <Check className="h-5 w-5" />
          )}
          {toast.message}
        </div>
      )}

    </div>
  );
};

export default CatalogModule;
