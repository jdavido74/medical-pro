// components/dashboard/modules/ConsentTemplatesModule.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Plus, Search, Filter, Eye, Edit2, Copy, Trash2, Download,
  Upload, Settings, BarChart3, Tag, Clock, CheckCircle, XCircle,
  AlertTriangle, Users, Calendar, Star, TrendingUp, RefreshCw,
  BookOpen, Database, Code, Globe, Zap, X, Loader, Languages
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { consentTemplatesApi } from '../../../api/consentTemplatesApi';
import ConsentTemplateEditorModal from '../../modals/ConsentTemplateEditorModal';
import { useAuth } from '../../../hooks/useAuth';
import { useConsentTypes, useSpecialties } from '../../../hooks/useSystemCategories';

// Available languages for translations
const AVAILABLE_LANGUAGES = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' }
];

const ConsentTemplatesModule = () => {
  const { t } = useTranslation('consents');
  const { user } = useAuth();
  const { categories: consentTypes, getTranslatedName: getConsentTypeName, getByCode: getConsentTypeByCode } = useConsentTypes();
  const { categories: specialties, getTranslatedName: getSpecialtyName, getByCode: getSpecialtyByCode } = useSpecialties();
  const [templates, setTemplates] = useState([]);
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSpeciality, setSelectedSpeciality] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [activeTab, setActiveTab] = useState('templates');

  // Modal states
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [editorMode, setEditorMode] = useState('create');
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplateDetails, setShowTemplateDetails] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Statistics
  const [statistics, setStatistics] = useState({});

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Charger les données
  useEffect(() => {
    loadData();
  }, []);

  // Filtrer et trier les modèles
  useEffect(() => {
    filterAndSortTemplates();
  }, [templates, searchTerm, selectedCategory, selectedSpeciality, selectedStatus, sortBy, sortOrder]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await consentTemplatesApi.getConsentTemplates();
      const allTemplates = response.templates || [];

      // Calculate statistics from fetched data
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const stats = {
        total: allTemplates.length,
        active: allTemplates.filter(t => t.status === 'active' || !t.status).length,
        draft: allTemplates.filter(t => t.status === 'draft').length,
        inactive: allTemplates.filter(t => t.status === 'inactive').length,
        createdThisMonth: allTemplates.filter(t => new Date(t.createdAt) >= thisMonth).length,
        totalUsage: allTemplates.reduce((sum, t) => sum + (t.usage?.timesUsed || 0), 0),
        byCategory: {},
        bySpeciality: {},
        mostUsed: [...allTemplates].sort((a, b) => (b.usage?.timesUsed || 0) - (a.usage?.timesUsed || 0))
      };

      // Group by category
      allTemplates.forEach(template => {
        const category = template.category || template.consentType || 'unknown';
        if (!stats.byCategory[category]) {
          stats.byCategory[category] = { count: 0, active: 0 };
        }
        stats.byCategory[category].count++;
        if (template.status === 'active' || !template.status) {
          stats.byCategory[category].active++;
        }

        const speciality = template.speciality || 'general';
        if (!stats.bySpeciality[speciality]) {
          stats.bySpeciality[speciality] = { count: 0 };
        }
        stats.bySpeciality[speciality].count++;
      });

      setTemplates(allTemplates);
      setStatistics(stats);
    } catch (err) {
      console.error('[ConsentTemplatesModule] Error loading data:', err);
      setError(t('errors.loadingTemplates'));
    } finally {
      setLoading(false);
    }
  }, []);

  const filterAndSortTemplates = () => {
    let filtered = [...templates];

    // Filtre de recherche
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(template =>
        template.title?.toLowerCase().includes(searchLower) ||
        template.description?.toLowerCase().includes(searchLower) ||
        template.category?.toLowerCase().includes(searchLower) ||
        template.speciality?.toLowerCase().includes(searchLower) ||
        template.content?.toLowerCase().includes(searchLower)
      );
    }

    // Filtres
    if (selectedCategory) {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    if (selectedSpeciality) {
      filtered = filtered.filter(template => template.speciality === selectedSpeciality);
    }

    if (selectedStatus) {
      filtered = filtered.filter(template => template.status === selectedStatus);
    }

    // Tri
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'title':
          aValue = a.title || '';
          bValue = b.title || '';
          break;
        case 'category':
          aValue = a.category || '';
          bValue = b.category || '';
          break;
        case 'usage':
          aValue = a.usage?.timesUsed || 0;
          bValue = b.usage?.timesUsed || 0;
          break;
        case 'version':
          aValue = parseFloat(a.version || '0');
          bValue = parseFloat(b.version || '0');
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        default:
          aValue = new Date(a.updatedAt);
          bValue = new Date(b.updatedAt);
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredTemplates(filtered);
  };

  const handleCreateTemplate = () => {
    setEditorMode('create');
    setEditingTemplate(null);
    setIsEditorModalOpen(true);
  };

  const handleEditTemplate = (template) => {
    setEditorMode('edit');
    setEditingTemplate(template);
    setIsEditorModalOpen(true);
  };

  const handleDuplicateTemplate = (template) => {
    setEditorMode('duplicate');
    setEditingTemplate(template);
    setIsEditorModalOpen(true);
  };

  const handleViewTemplate = (template) => {
    setSelectedTemplate(template);
    setShowTemplateDetails(true);
  };

  const handleToggleStatus = async (templateId) => {
    try {
      const template = templates.find(t => t.id === templateId);
      const newStatus = template?.status === 'active' ? 'inactive' : 'active';
      await consentTemplatesApi.updateConsentTemplate(templateId, { status: newStatus });
      loadData();
    } catch (err) {
      console.error('[ConsentTemplatesModule] Error toggling status:', err);
      alert(t('errors.toggleStatus'));
    }
  };

  const handleDeleteTemplate = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setTemplateToDelete(template);
      setIsDeleteModalOpen(true);
    }
  };

  const performDeleteTemplate = async () => {
    if (!templateToDelete) return;

    setIsDeleting(true);
    try {
      await consentTemplatesApi.deleteConsentTemplate(templateToDelete.id);
      setIsDeleteModalOpen(false);
      setTemplateToDelete(null);
      loadData();
    } catch (err) {
      console.error('[ConsentTemplatesModule] Error deleting template:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
    setTemplateToDelete(null);
  };

  const handleExportTemplate = (template) => {
    try {
      // Export as JSON
      const exportData = {
        title: template.title,
        description: template.description,
        terms: template.terms || template.content,
        consentType: template.consentType || template.type,
        category: template.category,
        version: template.version,
        exportedAt: new Date().toISOString()
      };
      const jsonData = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `template_${template.code || template.id}_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[ConsentTemplatesModule] Error exporting template:', err);
      alert(t('errors.export'));
    }
  };

  const handleSaveTemplate = (template) => {
    loadData();
    setIsEditorModalOpen(false);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          {t('status.active')}
        </span>;
      case 'inactive':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
          <XCircle className="h-3 w-3 mr-1" />
          {t('status.inactive')}
        </span>;
      case 'draft':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
          <Edit2 className="h-3 w-3 mr-1" />
          {t('status.draft')}
        </span>;
      default:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {t('status.unknown')}
        </span>;
    }
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue', trend }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="flex items-center">
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            {trend && (
              <span className={`ml-2 text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp className="h-4 w-4 inline" />
                {trend > 0 ? '+' : ''}{trend}%
              </span>
            )}
          </div>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  );

  // Loading state
  if (loading && templates.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">{t('loadingTemplates')}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && templates.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t('retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tete : Titre + Bouton */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{t('templates.title')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('templates.subtitle')}</p>
        </div>
        <button
          onClick={handleCreateTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('actions.newTemplate')}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
          <button onClick={loadData} className="text-red-700 hover:text-red-900">
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Barre de filtres */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('search.templatesPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">{t('filters.allCategories')}</option>
            {consentTypes.map(type => (
              <option key={type.code} value={type.code}>
                {getConsentTypeName(type)}
              </option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">{t('filters.allStatus')}</option>
            <option value="active">{t('status.active')}</option>
            <option value="draft">{t('status.draft')}</option>
            <option value="inactive">{t('status.inactive')}</option>
          </select>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Header avec statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title={t('stats.totalTemplates')}
          value={statistics.total || 0}
          subtitle={`${statistics.active || 0} ${t('stats.active')}`}
          icon={FileText}
          color="blue"
        />
        <StatCard
          title={t('stats.usage')}
          value={statistics.totalUsage || 0}
          subtitle={t('stats.thisMonth')}
          icon={BarChart3}
          color="green"
        />
        <StatCard
          title={t('stats.drafts')}
          value={statistics.draft || 0}
          icon={Edit2}
          color="yellow"
        />
        <StatCard
          title={t('stats.createdThisMonth')}
          value={statistics.createdThisMonth || 0}
          icon={Calendar}
          color="purple"
        />
      </div>

      {/* Navigation par onglets */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('templates')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'templates'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="h-4 w-4 inline mr-2" />
              {t('tabs.templates')}
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'categories'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Tag className="h-4 w-4 inline mr-2" />
              {t('tabs.categories')}
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analytics'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="h-4 w-4 inline mr-2" />
              {t('tabs.analytics')}
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'templates' && (
            <>
              {/* Tri */}
              <div className="flex items-center gap-4 mb-4">
                <span className="text-sm text-gray-600">{t('sort.label')}</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="updatedAt">{t('sort.updatedAt')}</option>
                  <option value="createdAt">{t('sort.createdAt')}</option>
                  <option value="title">{t('sort.title')}</option>
                  <option value="category">{t('sort.category')}</option>
                  <option value="usage">{t('sort.usage')}</option>
                  <option value="version">{t('sort.version')}</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-2 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
                <span className="text-sm text-gray-500 ml-auto">
                  {filteredTemplates.length} {t('count.templates')}
                </span>
              </div>

              {/* Liste des modèles */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.template')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.category')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.status')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.usage')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.version')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTemplates.map((template) => (
                      <tr key={template.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-start">
                            <FileText className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {template.title}
                              </div>
                              <div className="text-sm text-gray-500">
                                {template.description}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                {t('table.modified')} {new Date(template.updatedAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm text-gray-900">
                              {(getConsentTypeByCode(template.category) && getConsentTypeName(getConsentTypeByCode(template.category))) || template.category}
                            </div>
                            <div className="text-sm text-gray-500">
                              {(getSpecialtyByCode(template.speciality) && getSpecialtyName(getSpecialtyByCode(template.speciality))) || template.speciality}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(template.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>
                            <div>{template.usage?.timesUsed || 0} {t('table.times')}</div>
                            {template.usage?.lastUsed && (
                              <div className="text-xs text-gray-400">
                                {t('table.lastUsed')} {new Date(template.usage.lastUsed).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          v{template.version}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleViewTemplate(template)}
                            className="text-blue-600 hover:text-blue-900"
                            title={t('actions.viewDetails')}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditTemplate(template)}
                            className="text-green-600 hover:text-green-900"
                            title={t('actions.edit')}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDuplicateTemplate(template)}
                            className="text-purple-600 hover:text-purple-900"
                            title={t('actions.duplicate')}
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(template.id)}
                            className={`${template.status === 'active' ? 'text-orange-600 hover:text-orange-900' : 'text-green-600 hover:text-green-900'}`}
                            title={template.status === 'active' ? t('actions.deactivate') : t('actions.activate')}
                          >
                            {template.status === 'active' ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => handleExportTemplate(template)}
                            className="text-blue-600 hover:text-blue-900"
                            title={t('actions.export')}
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="text-red-600 hover:text-red-900"
                            title={t('actions.delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredTemplates.length === 0 && (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">{t('empty.noTemplates')}</p>
                  <button
                    onClick={handleCreateTemplate}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {t('actions.createFirstTemplate')}
                  </button>
                </div>
              )}
            </>
          )}

          {activeTab === 'categories' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-6">
                {t('categories.title')}
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Catégories */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">{t('categories.available')}</h4>
                  <div className="space-y-2">
                    {consentTypes.map(type => (
                      <div key={type.code} className="flex justify-between items-center bg-white p-3 rounded">
                        <div>
                          <div className="font-medium text-gray-900">{getConsentTypeName(type)}</div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {statistics.byCategory?.[type.code]?.count || 0} {t('count.models')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Spécialités */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">{t('categories.medicalSpecialties')}</h4>
                  <div className="space-y-2">
                    {specialties.map(specialty => (
                      <div key={specialty.code} className="flex justify-between items-center bg-white p-3 rounded">
                        <div className="font-medium text-gray-900">{getSpecialtyName(specialty)}</div>
                        <div className="text-sm text-gray-500">
                          {statistics.bySpeciality?.[specialty.code]?.count || 0} {t('count.models')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-6">
                {t('analytics.title')}
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Modèles les plus utilisés */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">{t('analytics.mostUsed')}</h4>
                  <div className="space-y-3">
                    {statistics.mostUsed?.slice(0, 5).map((template, index) => (
                      <div key={template.id} className="flex items-center justify-between bg-white p-3 rounded">
                        <div className="flex items-center">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3 ${
                            index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-400' : 'bg-gray-300'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{template.title}</div>
                            <div className="text-sm text-gray-500">
                              {(getConsentTypeByCode(template.category) && getConsentTypeName(getConsentTypeByCode(template.category))) || template.category}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {template.usage?.timesUsed || 0} {t('count.usages')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Répartition par statut */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">{t('analytics.statusDistribution')}</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        <span className="text-gray-700">{t('analytics.active')}</span>
                      </div>
                      <span className="font-medium">{statistics.active || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <Edit2 className="h-4 w-4 text-yellow-500 mr-2" />
                        <span className="text-gray-700">{t('analytics.drafts')}</span>
                      </div>
                      <span className="font-medium">{statistics.draft || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <XCircle className="h-4 w-4 text-gray-500 mr-2" />
                        <span className="text-gray-700">{t('analytics.inactive')}</span>
                      </div>
                      <span className="font-medium">{statistics.inactive || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ConsentTemplateEditorModal
        isOpen={isEditorModalOpen}
        onClose={() => setIsEditorModalOpen(false)}
        onSave={handleSaveTemplate}
        editingTemplate={editingTemplate}
        mode={editorMode}
      />

      {/* Modal détails modèle */}
      {showTemplateDetails && selectedTemplate && (
        <TemplateDetailsModal
          template={selectedTemplate}
          onClose={() => setShowTemplateDetails(false)}
          onEdit={() => {
            setShowTemplateDetails(false);
            handleEditTemplate(selectedTemplate);
          }}
        />
      )}

      {/* Modal de confirmation de suppression */}
      {isDeleteModalOpen && templateToDelete && (
        <ConfirmDeleteTemplateModal
          template={templateToDelete}
          onConfirm={performDeleteTemplate}
          onCancel={handleCancelDelete}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
};

// Modal pour afficher les détails d'un modèle
const TemplateDetailsModal = ({ template, onClose, onEdit }) => {
  const { t } = useTranslation('consents');
  const { getTranslatedName: getConsentTypeName, getByCode: getConsentTypeByCode } = useConsentTypes();
  const { getTranslatedName: getSpecialtyName, getByCode: getSpecialtyByCode } = useSpecialties();
  const [translations, setTranslations] = useState([]);
  const [translationsLoading, setTranslationsLoading] = useState(false);

  // Load translations when modal opens
  useEffect(() => {
    const loadTranslations = async () => {
      if (template?.id) {
        setTranslationsLoading(true);
        try {
          const translationsList = await consentTemplatesApi.getTemplateTranslations(template.id);
          setTranslations(translationsList || []);
        } catch (error) {
          console.error('[TemplateDetailsModal] Error loading translations:', error);
          setTranslations([]);
        } finally {
          setTranslationsLoading(false);
        }
      }
    };
    loadTranslations();
  }, [template?.id]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">{t('details.templateTitle')}</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[75vh]">
          <div className="space-y-6">
            {/* Informations générales */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">{t('details.generalInfo')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('details.title')}</label>
                  <p className="text-sm text-gray-900">{template.title}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('details.status')}</label>
                  <div className="mt-1">
                    {template.status === 'active' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {t('status.active')}
                      </span>
                    )}
                    {template.status === 'draft' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                        <Edit2 className="h-3 w-3 mr-1" />
                        {t('status.draft')}
                      </span>
                    )}
                    {template.status === 'inactive' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                        <XCircle className="h-3 w-3 mr-1" />
                        {t('status.inactive')}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('details.category')}</label>
                  <p className="text-sm text-gray-900">
                    {(getConsentTypeByCode(template.category) && getConsentTypeName(getConsentTypeByCode(template.category))) || template.category}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('details.specialty')}</label>
                  <p className="text-sm text-gray-900">
                    {(getSpecialtyByCode(template.speciality) && getSpecialtyName(getSpecialtyByCode(template.speciality))) || template.speciality}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('details.version')}</label>
                  <p className="text-sm text-gray-900">v{template.version}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('details.usageCount')}</label>
                  <p className="text-sm text-gray-900">{template.usage?.timesUsed || 0} {t('table.times')}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">{t('details.description')}</h4>
              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{template.description}</p>
            </div>

            {/* Variables détectées */}
            {template.variables && template.variables.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">{t('details.variablesAvailable')}</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {template.variables.map((variable, index) => (
                    <div key={index} className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      [{variable}]
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Traductions disponibles */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <Languages className="h-4 w-4 mr-2" />
                {t('details.translationsAvailable')}
              </h4>
              {translationsLoading ? (
                <div className="flex items-center text-gray-500">
                  <Loader className="h-4 w-4 animate-spin mr-2" />
                  {t('details.loadingTranslations')}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {AVAILABLE_LANGUAGES.map((lang) => {
                    const hasTranslation = translations.some(t => t.language_code === lang.code);
                    return (
                      <div
                        key={lang.code}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          hasTranslation
                            ? 'bg-green-50 border-green-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center">
                          <span className="text-xl mr-2">{lang.flag}</span>
                          <span className="text-sm font-medium">{lang.name}</span>
                        </div>
                        {hasTranslation ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {translations.length === 0 && !translationsLoading && (
                <p className="text-sm text-gray-500 mt-2">
                  {t('details.noTranslations')}
                </p>
              )}
            </div>

            {/* Aperçu du contenu */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">{t('details.contentPreview')}</h4>
              <div className="bg-gray-50 border rounded-lg p-4 max-h-64 overflow-y-auto">
                <div
                  className="text-sm whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: template.content.replace(
                      /\[([^\]]+)\]/g,
                      '<span class="bg-yellow-200 px-1 rounded">[$1]</span>'
                    )
                  }}
                />
              </div>
            </div>

            {/* Audit trail */}
            {template.auditTrail && template.auditTrail.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">{t('details.modificationHistory')}</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {template.auditTrail.slice(-5).reverse().map((entry, index) => (
                    <div key={index} className="border border-gray-200 rounded p-3 text-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">
                            {entry.action} - v{entry.version}
                          </p>
                          <p className="text-gray-600">
                            {t('details.by')} {entry.userId} • {new Date(entry.timestamp).toLocaleString()}
                          </p>
                          {entry.changes && (
                            <p className="text-gray-500 text-xs mt-1">
                              {entry.changes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            {t('actions.close')}
          </button>
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t('actions.edit')}
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal de confirmation de suppression de modèle
const ConfirmDeleteTemplateModal = ({ template, onConfirm, onCancel, isDeleting }) => {
  const { t } = useTranslation('consents');
  const { getTranslatedName: getConsentTypeName, getByCode: getConsentTypeByCode } = useConsentTypes();

  const isActive = template.status === 'active' || !template.status;
  const hasUsage = (template.usage?.timesUsed || 0) > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-red-600 text-white px-6 py-4 flex items-center">
          <AlertTriangle className="h-6 w-6 mr-3" />
          <h2 className="text-xl font-semibold">{t('deleteTemplateModal.title')}</h2>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Warning icon */}
          <div className="flex justify-center mb-4">
            <div className="bg-red-100 rounded-full p-4">
              <Trash2 className="h-10 w-10 text-red-600" />
            </div>
          </div>

          {/* Message */}
          <div className="text-center mb-6">
            <p className="text-gray-900 font-medium mb-2">
              {isActive ? t('deleteTemplateModal.activeTitle') : t('deleteTemplateModal.inactiveTitle')}
            </p>
            <p className="text-gray-600 text-sm">
              {isActive ? t('deleteTemplateModal.activeMessage') : t('deleteTemplateModal.inactiveMessage')}
            </p>
          </div>

          {/* Template info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('deleteTemplateModal.template')}</span>
                <span className="font-medium text-gray-900">{template.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('deleteTemplateModal.category')}</span>
                <span className="font-medium text-gray-900">
                  {(getConsentTypeByCode(template.category) && getConsentTypeName(getConsentTypeByCode(template.category))) || template.category || '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('deleteTemplateModal.status')}</span>
                <span className={`font-medium ${isActive ? 'text-green-600' : 'text-gray-600'}`}>
                  {isActive ? t('status.active') : t('status.inactive')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('deleteTemplateModal.usage')}</span>
                <span className="font-medium text-gray-900">
                  {template.usage?.timesUsed || 0} {t('table.times')}
                </span>
              </div>
            </div>
          </div>

          {/* Warning for active templates with usage */}
          {isActive && hasUsage && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  {t('deleteTemplateModal.usageWarning', { count: template.usage?.timesUsed || 0 })}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {t('deleteTemplateModal.cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
          >
            {isDeleting ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                {t('deleteTemplateModal.deleting')}
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                {t('deleteTemplateModal.confirm')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsentTemplatesModule;