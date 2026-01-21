// components/admin/BackupManagementModule.js
import React, { useState, useEffect } from 'react';
import {
  Download, Upload, RefreshCw, Calendar, HardDrive, FileText,
  Shield, AlertCircle, CheckCircle, Clock, Database, Settings,
  Trash2, RotateCcw, Archive, Activity, ChevronDown, ChevronRight,
  Info, AlertTriangle, Plus, Eye, ExternalLink
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import backupStorage from '../../utils/backupStorage';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../auth/PermissionGuard';

const BackupManagementModule = () => {
  const { t, i18n } = useTranslation('admin');
  const { user: currentUser } = useAuth();
  const { hasPermission } = usePermissions();

  const [backups, setBackups] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('backups');

  // État pour les opérations
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [showBackupDetails, setShowBackupDetails] = useState(false);

  // État pour les formulaires
  const [newBackupData, setNewBackupData] = useState({
    type: 'full',
    description: '',
    includeAuditLogs: true,
    dataTypes: []
  });

  const [restoreOptions, setRestoreOptions] = useState({
    overwriteExisting: true,
    excludeDataTypes: [],
    createBackupBeforeRestore: true
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    loadBackupData();
  }, []);

  const loadBackupData = () => {
    setIsLoading(true);
    try {
      const allBackups = backupStorage.getAllBackups();
      const stats = backupStorage.getBackupStatistics();

      setBackups(allBackups);
      setStatistics(stats);
    } catch (error) {
      console.error(t('backupManagement.messages.loadError'), error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    if (isCreatingBackup) return;

    setIsCreatingBackup(true);
    try {
      let backup;
      if (newBackupData.type === 'full') {
        backup = await backupStorage.createFullBackup(
          newBackupData.description,
          newBackupData.includeAuditLogs
        );
      } else {
        backup = await backupStorage.createPartialBackup(
          newBackupData.dataTypes,
          newBackupData.description
        );
      }

      setNewBackupData({
        type: 'full',
        description: '',
        includeAuditLogs: true,
        dataTypes: []
      });

      await loadBackupData();
      alert(t('backupManagement.messages.createSuccess'));
    } catch (error) {
      console.error(t('backupManagement.messages.createError', { error: error.message }));
      alert(t('backupManagement.messages.createError', { error: error.message }));
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async (backupId) => {
    if (isRestoring) return;

    const confirmation = window.confirm(
      t('backupManagement.messages.restoreConfirm') +
      (restoreOptions.overwriteExisting ? t('backupManagement.messages.dataOverwrite') : '') +
      (restoreOptions.createBackupBeforeRestore ? t('backupManagement.messages.autoBackup') : '')
    );

    if (!confirmation) return;

    setIsRestoring(true);
    try {
      const report = await backupStorage.restoreFromBackup(backupId, restoreOptions);

      await loadBackupData();

      // Afficher le rapport de restauration
      const message = t('backupManagement.messages.restoreComplete') + '\n\n' +
        t('backupManagement.messages.restoredTypes', { count: report.restoredDataTypes.length }) + '\n' +
        t('backupManagement.messages.skippedTypes', { count: report.skippedDataTypes.length }) + '\n' +
        t('backupManagement.messages.errors', { count: report.errors.length });

      if (report.errors.length > 0) {
        console.error(t('backupManagement.messages.restoreError', { error: '' }), report.errors);
        alert(message + '\n\n' + t('backupManagement.messages.seeConsole'));
      } else {
        alert(message);
      }

      // Demander à l'utilisateur de recharger la page pour appliquer les changements
      if (window.confirm(t('backupManagement.messages.reloadPage'))) {
        window.location.reload();
      }
    } catch (error) {
      console.error(t('backupManagement.messages.restoreError', { error: error.message }));
      alert(t('backupManagement.messages.restoreError', { error: error.message }));
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDeleteBackup = async (backupId) => {
    if (!window.confirm(t('backupManagement.messages.deleteConfirm'))) {
      return;
    }

    try {
      const success = backupStorage.deleteBackup(backupId);
      if (success) {
        await loadBackupData();
        alert(t('backupManagement.messages.deleteSuccess'));
      } else {
        alert(t('backupManagement.messages.deleteError'));
      }
    } catch (error) {
      console.error(t('backupManagement.messages.deleteError'), error);
      alert(t('backupManagement.messages.deleteError') + ': ' + error.message);
    }
  };

  const handleExportBackup = (backupId, format = 'json') => {
    try {
      backupStorage.exportBackup(backupId, format);
    } catch (error) {
      console.error(t('backupManagement.messages.exportError', { error: error.message }));
      alert(t('backupManagement.messages.exportError', { error: error.message }));
    }
  };

  const handleImportBackup = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const backup = await backupStorage.importBackup(file);
      await loadBackupData();
      alert(t('backupManagement.messages.importSuccess', { description: backup.description }));
    } catch (error) {
      console.error(t('backupManagement.messages.importError', { error: error.message }));
      alert(t('backupManagement.messages.importError', { error: error.message }));
    }

    // Reset input
    event.target.value = '';
  };

  const handleCleanupOldBackups = async () => {
    if (!window.confirm(t('backupManagement.messages.cleanupConfirm'))) {
      return;
    }

    try {
      const removedCount = backupStorage.cleanupOldBackups(30);
      await loadBackupData();
      alert(t('backupManagement.messages.cleanupSuccess', { count: removedCount }));
    } catch (error) {
      console.error(t('backupManagement.messages.cleanupError', { error: error.message }));
      alert(t('backupManagement.messages.cleanupError', { error: error.message }));
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      completed: 'bg-green-100 text-green-800',
      in_progress: 'bg-blue-100 text-blue-800',
      failed: 'bg-red-100 text-red-800',
      corrupted: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    const icons = {
      completed: CheckCircle,
      in_progress: Clock,
      failed: AlertCircle,
      corrupted: AlertTriangle,
      pending: Clock
    };
    return icons[status] || Info;
  };

  const formatTimestamp = (timestamp) => {
    const locale = i18n.language === 'fr' ? 'fr-FR' : i18n.language === 'es' ? 'es-ES' : 'en-US';
    return new Date(timestamp).toLocaleString(locale);
  };

  const getAvailableDataTypes = () => [
    { key: 'patients', label: t('backupManagement.dataTypes.patients') },
    { key: 'appointments', label: t('backupManagement.dataTypes.appointments') },
    { key: 'medicalRecords', label: t('backupManagement.dataTypes.medicalRecords') },
    { key: 'consents', label: t('backupManagement.dataTypes.consents') },
    { key: 'consentTemplates', label: t('backupManagement.dataTypes.consentTemplates') },
    { key: 'users', label: t('backupManagement.dataTypes.users') },
    { key: 'teams', label: t('backupManagement.dataTypes.teams') },
    { key: 'roles', label: t('backupManagement.dataTypes.roles') },
    { key: 'invoices', label: t('backupManagement.dataTypes.invoices') },
    { key: 'quotes', label: t('backupManagement.dataTypes.quotes') },
    { key: 'products', label: t('backupManagement.dataTypes.products') },
    { key: 'settings', label: t('backupManagement.dataTypes.settings') }
  ];
  const availableDataTypes = getAvailableDataTypes();

  // Pagination
  const paginatedBackups = backups.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(backups.length / itemsPerPage);

  // Vérification des permissions
  if (!hasPermission('system.backup')) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('backupManagement.accessDenied')}</h3>
          <p className="text-gray-600">{t('backupManagement.noPermission')}</p>
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
              <HardDrive className="h-8 w-8 text-blue-600" />
              {t('backupManagement.title')}
            </h1>
            <p className="text-gray-600 mt-1">{t('backupManagement.subtitle')}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadBackupData()}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title={t('backupManagement.refresh')}
            >
              <RefreshCw className="h-5 w-5" />
            </button>

            <label className="px-4 py-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors flex items-center gap-2 cursor-pointer">
              <Upload className="h-4 w-4" />
              {t('backupManagement.import')}
              <input
                type="file"
                accept=".json,.backup"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>

            <button
              onClick={handleCleanupOldBackups}
              className="px-4 py-2 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {t('backupManagement.cleanup')}
            </button>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Archive className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-blue-600">{t('backupManagement.stats.totalBackups')}</p>
                <p className="text-2xl font-bold text-blue-900">{statistics.totalBackups || 0}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-green-600">{t('backupManagement.stats.successful')}</p>
                <p className="text-2xl font-bold text-green-900">{statistics.successfulBackups || 0}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="flex items-center gap-3">
              <HardDrive className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-orange-600">{t('backupManagement.stats.totalSize')}</p>
                <p className="text-2xl font-bold text-orange-900">
                  {backupStorage.formatSize(statistics.totalSize || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-purple-600">{t('backupManagement.stats.lastBackup')}</p>
                <p className="text-sm font-bold text-purple-900">
                  {statistics.newestBackup
                    ? new Date(statistics.newestBackup.timestamp).toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : i18n.language === 'es' ? 'es-ES' : 'en-US')
                    : t('backupManagement.stats.none')
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('backups')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'backups'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Archive className="inline h-4 w-4 mr-2" />
              {t('backupManagement.tabs.backups')} ({backups.length})
            </button>

            <button
              onClick={() => setActiveTab('create')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'create'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Plus className="inline h-4 w-4 mr-2" />
              {t('backupManagement.tabs.create')}
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-gray-500 text-gray-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Settings className="inline h-4 w-4 mr-2" />
              {t('backupManagement.tabs.settings')}
            </button>
          </nav>
        </div>
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'backups' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Liste des sauvegardes */}
          {isLoading ? (
            <div className="p-8 text-center">
              <RefreshCw className="h-8 w-8 text-blue-600 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">{t('backupManagement.loading')}</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="p-8 text-center">
              <Archive className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('backupManagement.empty.title')}</h3>
              <p className="text-gray-600 mb-4">{t('backupManagement.empty.description')}</p>
              <button
                onClick={() => setActiveTab('create')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('backupManagement.empty.createButton')}
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('backupManagement.table.backup')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('backupManagement.table.type')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('backupManagement.table.size')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('backupManagement.table.status')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('backupManagement.table.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedBackups.map((backup) => {
                      const StatusIcon = getStatusIcon(backup.status);
                      return (
                        <tr key={backup.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {backup.description}
                              </div>
                              <div className="text-sm text-gray-500">
                                {formatTimestamp(backup.timestamp)}
                              </div>
                              {backup.imported && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                                  {t('backupManagement.table.imported')}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              backup.type === 'full' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {backup.type === 'full' ? t('backupManagement.types.full') : t('backupManagement.types.partial')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {backupStorage.formatSize(backup.size || 0)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(backup.status)}`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {backup.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setSelectedBackup(backup);
                                  setShowBackupDetails(true);
                                }}
                                className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                                title={t('backupManagement.actions.viewDetails')}
                              >
                                <Eye className="h-4 w-4" />
                              </button>

                              {backup.status === 'completed' && (
                                <>
                                  <button
                                    onClick={() => handleRestoreBackup(backup.id)}
                                    disabled={isRestoring}
                                    className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded disabled:opacity-50"
                                    title={t('backupManagement.actions.restore')}
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </button>

                                  <button
                                    onClick={() => handleExportBackup(backup.id)}
                                    className="p-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded"
                                    title={t('backupManagement.actions.export')}
                                  >
                                    <Download className="h-4 w-4" />
                                  </button>
                                </>
                              )}

                              <button
                                onClick={() => handleDeleteBackup(backup.id)}
                                className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                                title={t('backupManagement.actions.delete')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
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
                      {t('backupManagement.pagination.showing', {
                        from: (currentPage - 1) * itemsPerPage + 1,
                        to: Math.min(currentPage * itemsPerPage, backups.length),
                        total: backups.length
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                      {t('backupManagement.pagination.previous')}
                    </button>

                    <span className="text-sm text-gray-600">
                      {t('backupManagement.pagination.pageOf', { current: currentPage, total: totalPages })}
                    </span>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                      {t('backupManagement.pagination.next')}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'create' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">{t('backupManagement.create.title')}</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('backupManagement.create.typeLabel')}
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  newBackupData.type === 'full' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="backupType"
                    value="full"
                    checked={newBackupData.type === 'full'}
                    onChange={(e) => setNewBackupData(prev => ({ ...prev, type: e.target.value }))}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-3">
                    <Database className="h-8 w-8 text-purple-600" />
                    <div>
                      <h3 className="font-medium text-gray-900">{t('backupManagement.create.fullBackup')}</h3>
                      <p className="text-sm text-gray-600">{t('backupManagement.create.fullDescription')}</p>
                    </div>
                  </div>
                </label>

                <label className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  newBackupData.type === 'partial' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="backupType"
                    value="partial"
                    checked={newBackupData.type === 'partial'}
                    onChange={(e) => setNewBackupData(prev => ({ ...prev, type: e.target.value }))}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div>
                      <h3 className="font-medium text-gray-900">{t('backupManagement.create.partialBackup')}</h3>
                      <p className="text-sm text-gray-600">{t('backupManagement.create.partialDescription')}</p>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {newBackupData.type === 'partial' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('backupManagement.create.dataTypesLabel')}
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {availableDataTypes.map(dataType => (
                    <label key={dataType.key} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={newBackupData.dataTypes.includes(dataType.key)}
                        onChange={(e) => {
                          const dataTypes = e.target.checked
                            ? [...newBackupData.dataTypes, dataType.key]
                            : newBackupData.dataTypes.filter(type => type !== dataType.key);
                          setNewBackupData(prev => ({ ...prev, dataTypes }));
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{dataType.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('backupManagement.create.descriptionLabel')}
              </label>
              <input
                type="text"
                value={newBackupData.description}
                onChange={(e) => setNewBackupData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t('backupManagement.create.descriptionPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {newBackupData.type === 'full' && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="includeAuditLogs"
                  checked={newBackupData.includeAuditLogs}
                  onChange={(e) => setNewBackupData(prev => ({ ...prev, includeAuditLogs: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="includeAuditLogs" className="text-sm text-gray-700">
                  {t('backupManagement.create.includeAuditLogs')}
                </label>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setActiveTab('backups')}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('backupManagement.create.cancel')}
              </button>
              <button
                onClick={handleCreateBackup}
                disabled={isCreatingBackup || (newBackupData.type === 'partial' && newBackupData.dataTypes.length === 0)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isCreatingBackup ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    {t('backupManagement.create.creating')}
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    {t('backupManagement.create.createButton')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de détails de sauvegarde */}
      {showBackupDetails && selectedBackup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full m-4 max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">{t('backupManagement.details.title')}</h3>
                <button
                  onClick={() => setShowBackupDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">{t('backupManagement.details.generalInfo')}</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">{t('backupManagement.details.id')}</label>
                      <div className="text-sm text-gray-900 font-mono">{selectedBackup.id}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">{t('backupManagement.details.description')}</label>
                      <div className="text-sm text-gray-900">{selectedBackup.description}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">{t('backupManagement.details.type')}</label>
                      <div className="text-sm text-gray-900">{selectedBackup.type === 'full' ? t('backupManagement.types.full') : t('backupManagement.types.partial')}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">{t('backupManagement.details.size')}</label>
                      <div className="text-sm text-gray-900">{backupStorage.formatSize(selectedBackup.size || 0)}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">{t('backupManagement.details.status')}</label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedBackup.status)}`}>
                        {selectedBackup.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-4">{t('backupManagement.details.metadata')}</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">{t('backupManagement.details.createdAt')}</label>
                      <div className="text-sm text-gray-900">{formatTimestamp(selectedBackup.timestamp)}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">{t('backupManagement.details.version')}</label>
                      <div className="text-sm text-gray-900">{selectedBackup.metadata?.version || 'N/A'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">{t('backupManagement.details.createdBy')}</label>
                      <div className="text-sm text-gray-900">{selectedBackup.metadata?.createdBy || 'N/A'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">{t('backupManagement.details.checksum')}</label>
                      <div className="text-sm text-gray-900 font-mono">{selectedBackup.checksum}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-4">{t('backupManagement.details.dataTypesIncluded')}</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {selectedBackup.metadata?.dataTypes?.map(dataType => (
                    <span key={dataType} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {t(`backupManagement.dataTypes.${dataType}`, { defaultValue: dataType })}
                    </span>
                  ))}
                </div>
              </div>

              {selectedBackup.imported && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">{t('backupManagement.details.importedBackup')}</h4>
                  <p className="text-sm text-blue-700">
                    {t('backupManagement.details.importedAt', { date: formatTimestamp(selectedBackup.importedAt) })}
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              {selectedBackup.status === 'completed' && (
                <>
                  <button
                    onClick={() => handleExportBackup(selectedBackup.id)}
                    className="px-4 py-2 text-orange-600 border border-orange-300 rounded-lg hover:bg-orange-50 transition-colors flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    {t('backupManagement.details.export')}
                  </button>
                  <button
                    onClick={() => {
                      setShowBackupDetails(false);
                      handleRestoreBackup(selectedBackup.id);
                    }}
                    disabled={isRestoring}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {t('backupManagement.details.restore')}
                  </button>
                </>
              )}
              <button
                onClick={() => setShowBackupDetails(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                {t('backupManagement.details.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupManagementModule;