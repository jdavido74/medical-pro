// components/admin/AuditManagementModule.js
import React, { useState, useEffect } from 'react';
import {
  Shield, Search, Filter, Download, RefreshCw, Calendar, Clock,
  AlertTriangle, User, FileText, Activity, Eye, ChevronDown,
  ChevronRight, BarChart3, TrendingUp, AlertCircle, CheckCircle,
  ExternalLink, Settings, Bell, Database
} from 'lucide-react';
import auditStorage from '../../utils/auditStorage';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../auth/PermissionGuard';
import { useLocale } from '../../contexts/LocaleContext';

const AuditManagementModule = () => {
  const { user: currentUser } = useAuth();
  const { hasPermission } = usePermissions();
  const { locale } = useLocale();

  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [suspiciousActivities, setSuspiciousActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('logs');

  // Filtres et recherche
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    severity: '',
    eventType: '',
    userId: '',
    startDate: '',
    endDate: ''
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Détails des logs
  const [selectedLog, setSelectedLog] = useState(null);
  const [showLogDetails, setShowLogDetails] = useState(false);

  useEffect(() => {
    loadAuditData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, searchQuery, filters]);

  const loadAuditData = () => {
    setIsLoading(true);
    try {
      const allLogs = auditStorage.getAllLogs();
      const stats = auditStorage.getStatistics('month');
      const suspicious = auditStorage.detectSuspiciousActivity();

      setLogs(allLogs);
      setStatistics(stats);
      setSuspiciousActivities(suspicious);
    } catch (error) {
      console.error('Erreur lors du chargement des données d\'audit:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = logs;

    // Recherche textuelle
    if (searchQuery) {
      const searchTerm = searchQuery.toLowerCase();
      filtered = filtered.filter(log =>
        log.eventType.toLowerCase().includes(searchTerm) ||
        log.userName.toLowerCase().includes(searchTerm) ||
        log.category.toLowerCase().includes(searchTerm) ||
        JSON.stringify(log.details).toLowerCase().includes(searchTerm)
      );
    }

    // Filtres spécifiques
    if (filters.category) {
      filtered = filtered.filter(log => log.category === filters.category);
    }

    if (filters.severity) {
      filtered = filtered.filter(log => log.severity === filters.severity);
    }

    if (filters.eventType) {
      filtered = filtered.filter(log => log.eventType === filters.eventType);
    }

    if (filters.userId) {
      filtered = filtered.filter(log => log.userId === filters.userId);
    }

    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      filtered = filtered.filter(log => new Date(log.timestamp) >= startDate);
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      filtered = filtered.filter(log => new Date(log.timestamp) <= endDate);
    }

    setFilteredLogs(filtered);
    setCurrentPage(1);
  };

  const handleExport = (format = 'csv') => {
    try {
      const exportData = auditStorage.exportLogs(format, filters);
      const blob = new Blob([exportData], {
        type: format === 'csv' ? 'text/csv' : 'application/json'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Erreur lors de l\'export: ' + error.message);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString(locale);
  };

  const getSeverityColor = (severity) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryIcon = (category) => {
    const icons = {
      authentication: User,
      patient_data: FileText,
      medical_data: Activity,
      administration: Settings,
      security: Shield,
      system: Database,
      compliance: CheckCircle
    };
    return icons[category] || Activity;
  };

  const handleLogClick = (log) => {
    setSelectedLog(log);
    setShowLogDetails(true);
  };

  // Pagination
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  // Vérification des permissions
  if (!hasPermission('audit.read')) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Accès non autorisé</h3>
          <p className="text-gray-600">Vous n'avez pas les permissions pour accéder aux logs d'audit.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Shield className="h-8 w-8 text-blue-600" />
              Audit et Journalisation
            </h1>
            <p className="text-gray-600 mt-1">Surveillance et traçabilité des actions système</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadAuditData()}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Actualiser"
            >
              <RefreshCw className="h-5 w-5" />
            </button>

            {hasPermission('audit.export') && (
              <>
                <button
                  onClick={() => handleExport('csv')}
                  className="px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="px-4 py-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export JSON
                </button>
              </>
            )}
          </div>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-blue-600">Événements (30j)</p>
                <p className="text-2xl font-bold text-blue-900">{statistics.totalEvents || 0}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-3">
              <User className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-green-600">Utilisateurs actifs</p>
                <p className="text-2xl font-bold text-green-900">{statistics.uniqueUsers || 0}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-orange-600">Événements sécurité</p>
                <p className="text-2xl font-bold text-orange-900">{statistics.securityEvents || 0}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-red-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Bell className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm text-red-600">Événements critiques</p>
                <p className="text-2xl font-bold text-red-900">{statistics.criticalEvents || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Alertes d'activités suspectes */}
        {suspiciousActivities.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <h3 className="font-medium text-yellow-800">Activités suspectes détectées</h3>
            </div>
            <div className="space-y-2">
              {suspiciousActivities.map((alert, index) => (
                <div key={index} className="text-sm text-yellow-700">
                  <span className="font-medium">{alert.type}:</span> {alert.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Onglets */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('logs')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'logs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="inline h-4 w-4 mr-2" />
              Journaux d'audit ({filteredLogs.length})
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analytics'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="inline h-4 w-4 mr-2" />
              Analyses et tendances
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'security'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Shield className="inline h-4 w-4 mr-2" />
              Sécurité et alertes
            </button>
          </nav>
        </div>
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Filtres et recherche */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Rechercher dans les logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Toutes les catégories</option>
                  <option value="authentication">Authentification</option>
                  <option value="patient_data">Données patients</option>
                  <option value="medical_data">Données médicales</option>
                  <option value="administration">Administration</option>
                  <option value="security">Sécurité</option>
                  <option value="system">Système</option>
                </select>

                <select
                  value={filters.severity}
                  onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Toutes les sévérités</option>
                  <option value="low">Faible</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Élevée</option>
                  <option value="critical">Critique</option>
                </select>

                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />

                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Table des logs */}
          {isLoading ? (
            <div className="p-8 text-center">
              <RefreshCw className="h-8 w-8 text-blue-600 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">Chargement des logs...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Horodatage
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Événement
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Utilisateur
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sévérité
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Détails
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedLogs.map((log) => {
                      const IconComponent = getCategoryIcon(log.category);
                      return (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatTimestamp(log.timestamp)}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <IconComponent className="h-4 w-4 text-gray-400" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">{log.eventType}</div>
                                <div className="text-sm text-gray-500">{log.category}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{log.userName}</div>
                            <div className="text-sm text-gray-500">{log.userRole}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(log.severity)}`}>
                              {log.severity}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 max-w-xs truncate">
                              {JSON.stringify(log.details)}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleLogClick(log)}
                              className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                              title="Voir les détails"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">
                      Affichage de {(currentPage - 1) * itemsPerPage + 1} à{' '}
                      {Math.min(currentPage * itemsPerPage, filteredLogs.length)} sur{' '}
                      {filteredLogs.length} résultats
                    </span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
                      className="ml-2 px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="25">25</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                      Précédent
                    </button>

                    <div className="flex gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2)
                        .map((page, index, array) => (
                          <React.Fragment key={page}>
                            {index > 0 && array[index - 1] !== page - 1 && (
                              <span className="px-2 text-gray-500">...</span>
                            )}
                            <button
                              onClick={() => setCurrentPage(page)}
                              className={`px-3 py-1 text-sm border rounded ${
                                currentPage === page
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        ))}
                    </div>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                      Suivant
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Modal de détails du log */}
      {showLogDetails && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full m-4 max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Détails de l'événement d'audit</h3>
                <button
                  onClick={() => setShowLogDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Informations générales</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">ID de l'événement</label>
                      <div className="text-sm text-gray-900 font-mono">{selectedLog.id}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Horodatage</label>
                      <div className="text-sm text-gray-900">{formatTimestamp(selectedLog.timestamp)}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Type d'événement</label>
                      <div className="text-sm text-gray-900">{selectedLog.eventType}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Catégorie</label>
                      <div className="text-sm text-gray-900">{selectedLog.category}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Sévérité</label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(selectedLog.severity)}`}>
                        {selectedLog.severity}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Informations utilisateur</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Utilisateur</label>
                      <div className="text-sm text-gray-900">{selectedLog.userName}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Rôle</label>
                      <div className="text-sm text-gray-900">{selectedLog.userRole}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">ID utilisateur</label>
                      <div className="text-sm text-gray-900 font-mono">{selectedLog.userId}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Adresse IP</label>
                      <div className="text-sm text-gray-900">{selectedLog.ipAddress}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Session ID</label>
                      <div className="text-sm text-gray-900 font-mono">{selectedLog.sessionId}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-4">Détails de l'événement</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-4">Métadonnées techniques</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowLogDetails(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditManagementModule;