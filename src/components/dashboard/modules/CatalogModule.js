/**
 * CatalogModule - Main catalog management module
 * Manages medications, treatments, and services with family/variant support
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Package, Plus, Search, MoreVertical, Edit, Trash2, Copy,
  ChevronDown, ChevronRight, Pill, Syringe, Stethoscope, Tag,
  ToggleLeft, ToggleRight, X, Check
} from 'lucide-react';
import { catalogStorage } from '../../../utils/catalogStorage';
import { catalogCategoriesStorage } from '../../../utils/catalogCategoriesStorage';
import { CATALOG_TYPES, DOSAGE_UNITS } from '../../../constants/catalogConfig';
import { usePermissions } from '../../auth/PermissionGuard';
import CatalogFormModal from '../modals/CatalogFormModal';

// Icon mapping for item types
const TYPE_ICONS = {
  medication: Pill,
  treatment: Syringe,
  service: Stethoscope
};

// Color mapping for item types
const TYPE_COLORS = {
  medication: 'bg-green-100 text-green-700',
  treatment: 'bg-blue-100 text-blue-700',
  service: 'bg-purple-100 text-purple-700'
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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [expandedFamilies, setExpandedFamilies] = useState(new Set());
  const [selectedItem, setSelectedItem] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState('create'); // 'create', 'edit', 'variant'
  const [parentItem, setParentItem] = useState(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [toast, setToast] = useState(null);

  // Category manager state (lifted from renderCategoryManager to avoid hooks in render function)
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#6366F1');
  const [categoryManagerType, setCategoryManagerType] = useState('medication');

  // Load data
  const loadData = useCallback(() => {
    setLoading(true);
    try {
      const loadedItems = catalogStorage.getAll();
      const loadedCategories = catalogCategoriesStorage.getAll();
      setItems(loadedItems);
      setCategories(loadedCategories);
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
    return items.filter(item => {
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
          item.description,
          item.provenance
        ].filter(Boolean).join(' ').toLowerCase();
        if (!searchText.includes(query)) return false;
      }

      // Don't show variants at top level (they're shown under their parent)
      if (item.isVariant) return false;

      return true;
    });
  }, [items, activeTab, showInactive, selectedCategory, searchQuery]);

  // Get variants for a family
  const getItemVariants = useCallback((familyId) => {
    return items.filter(item => item.parentId === familyId && item.isVariant);
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
  const handleCreate = (type = 'medication') => {
    setSelectedItem(null);
    setParentItem(null);
    setFormMode('create');
    setShowFormModal(true);
  };

  // Handle edit item
  const handleEdit = (item) => {
    setSelectedItem(item);
    setParentItem(null);
    setFormMode('edit');
    setShowFormModal(true);
    setActionMenuOpen(null);
  };

  // Handle add variant
  const handleAddVariant = (familyItem) => {
    setSelectedItem(null);
    setParentItem(familyItem);
    setFormMode('variant');
    setShowFormModal(true);
    setActionMenuOpen(null);
  };

  // Handle duplicate item
  const handleDuplicate = (item) => {
    const result = catalogStorage.duplicate(item.id);
    if (result.success) {
      loadData();
      showToast(t('messages.duplicateSuccess'));
    } else {
      showToast(t('messages.error'), 'error');
    }
    setActionMenuOpen(null);
  };

  // Handle toggle active
  const handleToggleActive = (item) => {
    const result = catalogStorage.toggleActive(item.id);
    if (result.success) {
      loadData();
      showToast(result.item.isActive ? t('messages.activateSuccess') : t('messages.deactivateSuccess'));
    } else {
      showToast(t('messages.error'), 'error');
    }
    setActionMenuOpen(null);
  };

  // Handle delete item
  const handleDelete = (item) => {
    if (window.confirm(t('modal.deleteConfirm', { name: item.name }))) {
      const result = catalogStorage.remove(item.id);
      if (result.success) {
        loadData();
        showToast(t('messages.deleteSuccess'));
      } else {
        showToast(t('messages.error'), 'error');
      }
    }
    setActionMenuOpen(null);
  };

  // Handle convert to family
  const handleConvertToFamily = (item) => {
    const result = catalogStorage.convertToFamily(item.id);
    if (result.success) {
      loadData();
      showToast(t('messages.updateSuccess'));
    } else {
      showToast(t('messages.error'), 'error');
    }
    setActionMenuOpen(null);
  };

  // Handle form save
  const handleFormSave = () => {
    loadData();
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
    return category ? category.name : categoryId;
  };

  // Get category color
  const getCategoryColor = (categoryId, itemType) => {
    if (!categoryId) return '#6B7280';
    const typeCategories = categories[itemType] || [];
    const category = typeCategories.find(c => c.id === categoryId);
    return category ? category.color : '#6B7280';
  };

  // Stats
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stats = useMemo(() => catalogStorage.getStats(), [items.length]);

  // Render item row
  const renderItem = (item, isVariant = false) => {
    const TypeIcon = TYPE_ICONS[item.type];
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

              <div className={`p-2 rounded-lg ${TYPE_COLORS[item.type]} mr-3`}>
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
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[item.type]}`}>
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
            <div className="relative inline-block text-left">
              <button
                onClick={() => setActionMenuOpen(actionMenuOpen === item.id ? null : item.id)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                <MoreVertical className="h-5 w-5" />
              </button>

              {actionMenuOpen === item.id && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                  <div className="py-1">
                    {canEdit && (
                      <button
                        onClick={() => handleEdit(item)}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        {t('actions.edit')}
                      </button>
                    )}

                    {canCreate && (
                      <button
                        onClick={() => handleDuplicate(item)}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        {t('actions.duplicate')}
                      </button>
                    )}

                    {canEdit && item.isFamily && (
                      <button
                        onClick={() => handleAddVariant(item)}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {t('actions.addVariant')}
                      </button>
                    )}

                    {canEdit && !item.isFamily && !item.isVariant && CATALOG_TYPES[item.type]?.canHaveVariants && (
                      <button
                        onClick={() => handleConvertToFamily(item)}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Tag className="h-4 w-4 mr-2" />
                        {t('actions.convertToFamily')}
                      </button>
                    )}

                    {canEdit && (
                      <button
                        onClick={() => handleToggleActive(item)}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        {item.isActive ? (
                          <>
                            <ToggleLeft className="h-4 w-4 mr-2" />
                            {t('actions.deactivate')}
                          </>
                        ) : (
                          <>
                            <ToggleRight className="h-4 w-4 mr-2" />
                            {t('actions.activate')}
                          </>
                        )}
                      </button>
                    )}

                    {canDelete && (
                      <>
                        <div className="border-t border-gray-100 my-1" />
                        <button
                          onClick={() => handleDelete(item)}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t('actions.delete')}
                        </button>
                      </>
                    )}
                  </div>
                </div>
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
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;

    const result = catalogCategoriesStorage.add(categoryManagerType, {
      name: newCategoryName.trim(),
      color: newCategoryColor
    });

    if (result) {
      setCategories(catalogCategoriesStorage.getAll());
      setNewCategoryName('');
      showToast(t('messages.categoryCreateSuccess'));
    }
  };

  // Handle deleting a category
  const handleDeleteCategory = (categoryId) => {
    if (window.confirm(t('categories.confirmDelete'))) {
      catalogCategoriesStorage.remove(categoryId);
      setCategories(catalogCategoriesStorage.getAll());
      showToast(t('messages.categoryDeleteSuccess'));
    }
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
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
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
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
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
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
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
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="text-sm font-medium text-gray-900">{category.name}</span>
              </div>

              {canDelete && (
                <button
                  onClick={() => handleDeleteCategory(category.id)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
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
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Package className="h-7 w-7 text-green-600" />
            {t('title')}
          </h1>
          <p className="text-gray-500 mt-1">{t('subtitle')}</p>
        </div>

        <div className="flex items-center gap-3">
          {canCreate && (
            <button
              onClick={() => handleCreate()}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              {t('actions.addItem')}
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-500">{t('stats.total')}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <div className="text-sm text-gray-500">{t('stats.active')}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-400">{stats.inactive}</div>
          <div className="text-sm text-gray-500">{t('stats.inactive')}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-amber-600">{stats.families}</div>
          <div className="text-sm text-gray-500">{t('stats.families')}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">{stats.variants}</div>
          <div className="text-sm text-gray-500">{t('stats.variants')}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 mb-6">
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
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t(`tabs.${tab}`)}
              </button>
            ))}
          </nav>
        </div>

        {showCategoryManager ? (
          renderCategoryManager()
        ) : (
          <>
            {/* Filters */}
            <div className="p-4 border-b border-gray-200 flex items-center gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('placeholders.search')}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                />
              </div>

              {/* Category filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
              >
                <option value="">{t('filters.category')}</option>
                {catalogCategoriesStorage.getAllFlat().map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>

              {/* Show inactive toggle */}
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                {t('filters.showInactive')}
              </label>

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
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
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
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        <Plus className="h-5 w-5 mr-2" />
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
          onClose={() => setShowFormModal(false)}
          onSave={handleFormSave}
          item={selectedItem}
          parentItem={parentItem}
          mode={formMode}
          categories={categories}
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

      {/* Click outside to close action menu */}
      {actionMenuOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setActionMenuOpen(null)}
        />
      )}
    </div>
  );
};

export default CatalogModule;
