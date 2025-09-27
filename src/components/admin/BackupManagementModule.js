// components/admin/BackupManagementModule.js
import React, { useState, useEffect } from 'react';
import {
  Download, Upload, RefreshCw, Calendar, HardDrive, FileText,
  Shield, AlertCircle, CheckCircle, Clock, Database, Settings,
  Trash2, RotateCcw, Archive, Activity, ChevronDown, ChevronRight,
  Info, AlertTriangle, Plus, Eye, ExternalLink
} from 'lucide-react';
import backupStorage from '../../utils/backupStorage';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../auth/PermissionGuard';

const BackupManagementModule = () => {
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
      console.error('Erreur lors du chargement des sauvegardes:', error);
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
      alert('Sauvegarde créée avec succès !');
    } catch (error) {
      console.error('Erreur lors de la création de la sauvegarde:', error);
      alert('Erreur lors de la création de la sauvegarde: ' + error.message);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async (backupId) => {
    if (isRestoring) return;

    const confirmation = window.confirm(
      'Êtes-vous sûr de vouloir restaurer cette sauvegarde ? ' +
      (restoreOptions.overwriteExisting ? 'Les données existantes seront écrasées.' : '') +
      (restoreOptions.createBackupBeforeRestore ? ' Une sauvegarde automatique sera créée avant la restauration.' : '')
    );

    if (!confirmation) return;

    setIsRestoring(true);
    try {
      const report = await backupStorage.restoreFromBackup(backupId, restoreOptions);

      await loadBackupData();

      // Afficher le rapport de restauration
      const message = `Restauration terminée !\n\n` +
        `Types de données restaurés: ${report.restoredDataTypes.length}\n` +
        `Types de données ignorés: ${report.skippedDataTypes.length}\n` +
        `Erreurs: ${report.errors.length}`;

      if (report.errors.length > 0) {
        console.error('Erreurs lors de la restauration:', report.errors);
        alert(message + '\n\nVoir la console pour les détails des erreurs.');
      } else {
        alert(message);
      }

      // Demander à l'utilisateur de recharger la page pour appliquer les changements
      if (window.confirm('Voulez-vous recharger la page pour appliquer les changements ?')) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Erreur lors de la restauration:', error);
      alert('Erreur lors de la restauration: ' + error.message);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDeleteBackup = async (backupId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette sauvegarde ?')) {
      return;
    }

    try {
      const success = backupStorage.deleteBackup(backupId);
      if (success) {
        await loadBackupData();
        alert('Sauvegarde supprimée avec succès !');
      } else {
        alert('Erreur lors de la suppression de la sauvegarde.');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression: ' + error.message);
    }
  };

  const handleExportBackup = (backupId, format = 'json') => {
    try {
      backupStorage.exportBackup(backupId, format);
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      alert('Erreur lors de l\'export: ' + error.message);
    }
  };

  const handleImportBackup = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const backup = await backupStorage.importBackup(file);
      await loadBackupData();
      alert(`Sauvegarde "${backup.description}" importée avec succès !`);
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      alert('Erreur lors de l\'import: ' + error.message);
    }

    // Reset input
    event.target.value = '';
  };

  const handleCleanupOldBackups = async () => {
    if (!window.confirm('Supprimer les sauvegardes de plus de 30 jours (sauf les sauvegardes complètes) ?')) {
      return;
    }

    try {
      const removedCount = backupStorage.cleanupOldBackups(30);
      await loadBackupData();
      alert(`${removedCount} sauvegarde(s) supprimée(s).`);
    } catch (error) {
      console.error('Erreur lors du nettoyage:', error);
      alert('Erreur lors du nettoyage: ' + error.message);
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
    return new Date(timestamp).toLocaleString('fr-FR');
  };

  const availableDataTypes = [
    { key: 'patients', label: 'Patients' },
    { key: 'appointments', label: 'Rendez-vous' },
    { key: 'medicalRecords', label: 'Dossiers médicaux' },
    { key: 'consents', label: 'Consentements' },
    { key: 'consentTemplates', label: 'Modèles de consentements' },
    { key: 'users', label: 'Utilisateurs' },
    { key: 'teams', label: 'Équipes' },
    { key: 'roles', label: 'Rôles et permissions' },
    { key: 'invoices', label: 'Factures' },
    { key: 'quotes', label: 'Devis' },
    { key: 'products', label: 'Produits et services' },
    { key: 'settings', label: 'Paramètres' }
  ];

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
          <h3 className="text-lg font-medium text-gray-900 mb-2">Accès non autorisé</h3>
          <p className="text-gray-600">Vous n'avez pas les permissions pour accéder à la gestion des sauvegardes.</p>
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
              Gestion des sauvegardes
            </h1>
            <p className="text-gray-600 mt-1">Sauvegarde et restauration des données de l'application</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadBackupData()}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Actualiser"
            >
              <RefreshCw className="h-5 w-5" />
            </button>

            <label className="px-4 py-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors flex items-center gap-2 cursor-pointer">
              <Upload className="h-4 w-4" />
              Importer
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
              Nettoyer
            </button>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Archive className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-blue-600">Sauvegardes totales</p>
                <p className="text-2xl font-bold text-blue-900">{statistics.totalBackups || 0}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-green-600">Réussies</p>
                <p className="text-2xl font-bold text-green-900">{statistics.successfulBackups || 0}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="flex items-center gap-3">
              <HardDrive className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-orange-600">Taille totale</p>
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
                <p className="text-sm text-purple-600">Dernière sauvegarde</p>
                <p className="text-sm font-bold text-purple-900">
                  {statistics.newestBackup
                    ? new Date(statistics.newestBackup.timestamp).toLocaleDateString('fr-FR')
                    : 'Aucune'
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
              Sauvegardes ({backups.length})
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
              Créer une sauvegarde
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
              Paramètres
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
              <p className="text-gray-600">Chargement des sauvegardes...</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="p-8 text-center">
              <Archive className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune sauvegarde</h3>
              <p className="text-gray-600 mb-4">Créez votre première sauvegarde pour sécuriser vos données.</p>
              <button
                onClick={() => setActiveTab('create')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Créer une sauvegarde
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sauvegarde
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Taille
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
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
                                  Importée
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              backup.type === 'full' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {backup.type === 'full' ? 'Complète' : 'Partielle'}
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
                                title="Voir les détails"
                              >
                                <Eye className="h-4 w-4" />
                              </button>

                              {backup.status === 'completed' && (
                                <>
                                  <button
                                    onClick={() => handleRestoreBackup(backup.id)}
                                    disabled={isRestoring}
                                    className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded disabled:opacity-50"
                                    title="Restaurer"
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </button>

                                  <button
                                    onClick={() => handleExportBackup(backup.id)}
                                    className="p-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded"
                                    title="Exporter"
                                  >
                                    <Download className="h-4 w-4" />
                                  </button>
                                </>
                              )}

                              <button
                                onClick={() => handleDeleteBackup(backup.id)}
                                className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                                title="Supprimer"
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
                      Affichage de {(currentPage - 1) * itemsPerPage + 1} à{' '}
                      {Math.min(currentPage * itemsPerPage, backups.length)} sur{' '}
                      {backups.length} sauvegardes
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                      Précédent
                    </button>

                    <span className="text-sm text-gray-600">
                      Page {currentPage} sur {totalPages}
                    </span>

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

      {activeTab === 'create' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">Créer une nouvelle sauvegarde</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de sauvegarde
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
                      <h3 className="font-medium text-gray-900">Sauvegarde complète</h3>
                      <p className="text-sm text-gray-600">Toutes les données de l'application</p>
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
                      <h3 className="font-medium text-gray-900">Sauvegarde partielle</h3>
                      <p className="text-sm text-gray-600">Types de données sélectionnés</p>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {newBackupData.type === 'partial' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Types de données à sauvegarder
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
                Description (optionnelle)
              </label>
              <input
                type="text"
                value={newBackupData.description}
                onChange={(e) => setNewBackupData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description de la sauvegarde..."
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
                  Inclure les logs d'audit
                </label>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setActiveTab('backups')}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateBackup}
                disabled={isCreatingBackup || (newBackupData.type === 'partial' && newBackupData.dataTypes.length === 0)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isCreatingBackup ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Créer la sauvegarde
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
                <h3 className="text-lg font-medium text-gray-900">Détails de la sauvegarde</h3>
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
                  <h4 className="font-medium text-gray-900 mb-4">Informations générales</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">ID</label>
                      <div className="text-sm text-gray-900 font-mono">{selectedBackup.id}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Description</label>
                      <div className="text-sm text-gray-900">{selectedBackup.description}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Type</label>
                      <div className="text-sm text-gray-900">{selectedBackup.type}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Taille</label>
                      <div className="text-sm text-gray-900">{backupStorage.formatSize(selectedBackup.size || 0)}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Statut</label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedBackup.status)}`}>
                        {selectedBackup.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Métadonnées</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Créé le</label>
                      <div className="text-sm text-gray-900">{formatTimestamp(selectedBackup.timestamp)}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Version</label>
                      <div className="text-sm text-gray-900">{selectedBackup.metadata?.version || 'N/A'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Créé par</label>
                      <div className="text-sm text-gray-900">{selectedBackup.metadata?.createdBy || 'N/A'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Checksum</label>
                      <div className="text-sm text-gray-900 font-mono">{selectedBackup.checksum}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-4">Types de données inclus</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {selectedBackup.metadata?.dataTypes?.map(dataType => (
                    <span key={dataType} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {dataType}
                    </span>
                  ))}
                </div>
              </div>

              {selectedBackup.imported && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Sauvegarde importée</h4>
                  <p className="text-sm text-blue-700">
                    Cette sauvegarde a été importée le {formatTimestamp(selectedBackup.importedAt)}
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
                    Exporter
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
                    Restaurer
                  </button>
                </>
              )}
              <button
                onClick={() => setShowBackupDetails(false)}
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

export default BackupManagementModule;