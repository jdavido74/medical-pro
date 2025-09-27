// components/dashboard/modules/ConsentTemplatesModule.js
import React, { useState, useEffect } from 'react';
import {
  FileText, Plus, Search, Filter, Eye, Edit2, Copy, Trash2, Download,
  Upload, Settings, BarChart3, Tag, Clock, CheckCircle, XCircle,
  AlertTriangle, Users, Calendar, Star, TrendingUp, RefreshCw,
  BookOpen, Database, Code, Globe, Zap, X
} from 'lucide-react';
import {
  consentTemplatesStorage,
  TEMPLATE_CATEGORIES,
  MEDICAL_SPECIALITIES,
  initializeSampleTemplates
} from '../../../utils/consentTemplatesStorage';
import ConsentTemplateEditorModal from '../../modals/ConsentTemplateEditorModal';
import { useAuth } from '../../../contexts/AuthContext';

const ConsentTemplatesModule = () => {
  const { user } = useAuth();
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

  // Statistics
  const [statistics, setStatistics] = useState({});

  // Charger les données
  useEffect(() => {
    loadData();
  }, []);

  // Filtrer et trier les modèles
  useEffect(() => {
    filterAndSortTemplates();
  }, [templates, searchTerm, selectedCategory, selectedSpeciality, selectedStatus, sortBy, sortOrder]);

  const loadData = () => {
    // Initialiser les modèles de démonstration si nécessaire
    initializeSampleTemplates();

    const allTemplates = consentTemplatesStorage.getAll().filter(t => !t.deleted);
    const stats = consentTemplatesStorage.getStatistics();

    setTemplates(allTemplates);
    setStatistics(stats);
  };

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
      await consentTemplatesStorage.toggleStatus(templateId, user?.id);
      loadData();
    } catch (error) {
      console.error('Erreur changement statut:', error);
      alert('Erreur lors du changement de statut');
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce modèle ?')) {
      try {
        await consentTemplatesStorage.delete(templateId, user?.id);
        loadData();
      } catch (error) {
        console.error('Erreur suppression modèle:', error);
        alert('Erreur lors de la suppression');
      }
    }
  };

  const handleExportTemplate = (template) => {
    try {
      const exported = consentTemplatesStorage.export(template.id, 'html');
      const blob = new Blob([exported.content], { type: exported.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exported.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur export:', error);
      alert('Erreur lors de l\'export');
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
          Actif
        </span>;
      case 'inactive':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
          <XCircle className="h-3 w-3 mr-1" />
          Inactif
        </span>;
      case 'draft':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
          <Edit2 className="h-3 w-3 mr-1" />
          Brouillon
        </span>;
      default:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Inconnu
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

  return (
    <div className="space-y-6">
      {/* Header avec statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total modèles"
          value={statistics.total || 0}
          subtitle={`${statistics.active || 0} actifs`}
          icon={FileText}
          color="blue"
        />
        <StatCard
          title="Utilisations"
          value={statistics.totalUsage || 0}
          subtitle="Ce mois"
          icon={BarChart3}
          color="green"
        />
        <StatCard
          title="Brouillons"
          value={statistics.draft || 0}
          icon={Edit2}
          color="yellow"
        />
        <StatCard
          title="Créés ce mois"
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
              Modèles de consentements
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
              Catégories
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
              Statistiques
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'templates' && (
            <>
              {/* Barre d'outils */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 mb-6">
                <div className="flex-1 flex flex-col sm:flex-row gap-4">
                  {/* Recherche */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Rechercher des modèles..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Filtres */}
                  <div className="flex gap-2">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Toutes catégories</option>
                      {Object.values(TEMPLATE_CATEGORIES).map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={selectedSpeciality}
                      onChange={(e) => setSelectedSpeciality(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Toutes spécialités</option>
                      {Object.values(MEDICAL_SPECIALITIES).map(speciality => (
                        <option key={speciality.id} value={speciality.id}>
                          {speciality.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Tous statuts</option>
                      <option value="active">Actif</option>
                      <option value="draft">Brouillon</option>
                      <option value="inactive">Inactif</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={loadData}
                    className="px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleCreateTemplate}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nouveau modèle
                  </button>
                </div>
              </div>

              {/* Tri */}
              <div className="flex items-center gap-4 mb-4">
                <span className="text-sm text-gray-600">Trier par:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="updatedAt">Date de modification</option>
                  <option value="createdAt">Date de création</option>
                  <option value="title">Titre</option>
                  <option value="category">Catégorie</option>
                  <option value="usage">Utilisation</option>
                  <option value="version">Version</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-2 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
                <span className="text-sm text-gray-500 ml-auto">
                  {filteredTemplates.length} modèle(s)
                </span>
              </div>

              {/* Liste des modèles */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Modèle
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Catégorie
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Utilisation
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Version
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
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
                                Modifié: {new Date(template.updatedAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm text-gray-900">
                              {TEMPLATE_CATEGORIES[template.category?.toUpperCase()]?.name || template.category}
                            </div>
                            <div className="text-sm text-gray-500">
                              {MEDICAL_SPECIALITIES[template.speciality?.toUpperCase()]?.name || template.speciality}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(template.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>
                            <div>{template.usage?.timesUsed || 0} fois</div>
                            {template.usage?.lastUsed && (
                              <div className="text-xs text-gray-400">
                                Dernière: {new Date(template.usage.lastUsed).toLocaleDateString()}
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
                            title="Voir les détails"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditTemplate(template)}
                            className="text-green-600 hover:text-green-900"
                            title="Modifier"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDuplicateTemplate(template)}
                            className="text-purple-600 hover:text-purple-900"
                            title="Dupliquer"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(template.id)}
                            className={`${template.status === 'active' ? 'text-orange-600 hover:text-orange-900' : 'text-green-600 hover:text-green-900'}`}
                            title={template.status === 'active' ? 'Désactiver' : 'Activer'}
                          >
                            {template.status === 'active' ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => handleExportTemplate(template)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Exporter"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Supprimer"
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
                  <p className="text-gray-500">Aucun modèle trouvé</p>
                  <button
                    onClick={handleCreateTemplate}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Créer le premier modèle
                  </button>
                </div>
              )}
            </>
          )}

          {activeTab === 'categories' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-6">
                Catégories et spécialités
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Catégories */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Catégories disponibles</h4>
                  <div className="space-y-2">
                    {Object.values(TEMPLATE_CATEGORIES).map(category => (
                      <div key={category.id} className="flex justify-between items-center bg-white p-3 rounded">
                        <div>
                          <div className="font-medium text-gray-900">{category.name}</div>
                          <div className="text-sm text-gray-500">{category.description}</div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {statistics.byCategory?.[category.id]?.count || 0} modèles
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Spécialités */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Spécialités médicales</h4>
                  <div className="space-y-2">
                    {Object.values(MEDICAL_SPECIALITIES).map(speciality => (
                      <div key={speciality.id} className="flex justify-between items-center bg-white p-3 rounded">
                        <div className="font-medium text-gray-900">{speciality.name}</div>
                        <div className="text-sm text-gray-500">
                          {statistics.bySpeciality?.[speciality.id]?.count || 0} modèles
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
                Statistiques et analyses
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Modèles les plus utilisés */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Modèles les plus utilisés</h4>
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
                            <div className="text-sm text-gray-500">{template.category}</div>
                          </div>
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {template.usage?.timesUsed || 0} utilisations
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Répartition par statut */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Répartition par statut</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        <span className="text-gray-700">Actifs</span>
                      </div>
                      <span className="font-medium">{statistics.active || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <Edit2 className="h-4 w-4 text-yellow-500 mr-2" />
                        <span className="text-gray-700">Brouillons</span>
                      </div>
                      <span className="font-medium">{statistics.draft || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <XCircle className="h-4 w-4 text-gray-500 mr-2" />
                        <span className="text-gray-700">Inactifs</span>
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
    </div>
  );
};

// Modal pour afficher les détails d'un modèle
const TemplateDetailsModal = ({ template, onClose, onEdit }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Détails du modèle</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[75vh]">
          <div className="space-y-6">
            {/* Informations générales */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Informations générales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Titre</label>
                  <p className="text-sm text-gray-900">{template.title}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Statut</label>
                  <div className="mt-1">
                    {template.status === 'active' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Actif
                      </span>
                    )}
                    {template.status === 'draft' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                        <Edit2 className="h-3 w-3 mr-1" />
                        Brouillon
                      </span>
                    )}
                    {template.status === 'inactive' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                        <XCircle className="h-3 w-3 mr-1" />
                        Inactif
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Catégorie</label>
                  <p className="text-sm text-gray-900">
                    {TEMPLATE_CATEGORIES[template.category?.toUpperCase()]?.name || template.category}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Spécialité</label>
                  <p className="text-sm text-gray-900">
                    {MEDICAL_SPECIALITIES[template.speciality?.toUpperCase()]?.name || template.speciality}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Version</label>
                  <p className="text-sm text-gray-900">v{template.version}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Utilisations</label>
                  <p className="text-sm text-gray-900">{template.usage?.timesUsed || 0} fois</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Description</h4>
              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{template.description}</p>
            </div>

            {/* Variables détectées */}
            {template.variables && template.variables.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Variables disponibles</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {template.variables.map((variable, index) => (
                    <div key={index} className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      [{variable}]
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Aperçu du contenu */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Aperçu du contenu</h4>
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
                <h4 className="font-medium text-gray-900 mb-3">Historique des modifications</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {template.auditTrail.slice(-5).reverse().map((entry, index) => (
                    <div key={index} className="border border-gray-200 rounded p-3 text-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">
                            {entry.action} - v{entry.version}
                          </p>
                          <p className="text-gray-600">
                            Par: {entry.userId} • {new Date(entry.timestamp).toLocaleString()}
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
            Fermer
          </button>
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Modifier
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsentTemplatesModule;