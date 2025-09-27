// components/dashboard/modules/ConsentManagementModule.js
import React, { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Search,
  Filter,
  FileText,
  Clock,
  CheckCircle,
  X,
  AlertTriangle,
  Calendar,
  User,
  Eye,
  Edit2,
  Trash2,
  Download,
  RefreshCw,
  Signature,
  Users
} from 'lucide-react';
import { consentsStorage, CONSENT_TYPES, COLLECTION_METHODS } from '../../../utils/consentsStorage';
import { patientsStorage } from '../../../utils/patientsStorage';
import ConsentFormModal from '../../modals/ConsentFormModal';
import { useAuth } from '../../../contexts/AuthContext';

const ConsentManagementModule = () => {
  const { user } = useAuth();
  const [consents, setConsents] = useState([]);
  const [patients, setPatients] = useState([]);
  const [filteredConsents, setFilteredConsents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [activeTab, setActiveTab] = useState('consents');

  // Modal states
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [editingConsent, setEditingConsent] = useState(null);
  const [selectedConsentDetails, setSelectedConsentDetails] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Statistics
  const [statistics, setStatistics] = useState({});
  const [expiringConsents, setExpiringConsents] = useState([]);

  // Charger les données
  useEffect(() => {
    loadData();
  }, []);

  // Filtrer et trier les consentements
  useEffect(() => {
    filterAndSortConsents();
  }, [consents, searchTerm, selectedFilter, selectedPatient, selectedType, sortBy, sortOrder]);

  const loadData = () => {
    const allConsents = consentsStorage.getAll().filter(c => !c.deleted);
    const allPatients = patientsStorage.getAll().filter(p => !p.deleted);
    const stats = consentsStorage.getStatistics();
    const expiring = consentsStorage.getExpiringConsents(30);

    setConsents(allConsents);
    setPatients(allPatients);
    setStatistics(stats);
    setExpiringConsents(expiring);
  };

  const filterAndSortConsents = () => {
    let filtered = [...consents];

    // Filtre de recherche
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(consent => {
        const patient = patients.find(p => p.id === consent.patientId);
        const patientName = patient ? `${patient.firstName} ${patient.lastName}`.toLowerCase() : '';
        const patientNumber = patient ? patient.patientNumber.toLowerCase() : '';

        return (
          consent.title?.toLowerCase().includes(searchLower) ||
          consent.purpose?.toLowerCase().includes(searchLower) ||
          consent.type?.toLowerCase().includes(searchLower) ||
          patientName.includes(searchLower) ||
          patientNumber.includes(searchLower)
        );
      });
    }

    // Filtre par statut
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(consent => {
        switch (selectedFilter) {
          case 'active':
            return consent.status === 'granted' &&
                   (!consent.expiresAt || new Date(consent.expiresAt) > new Date());
          case 'revoked':
            return consent.status === 'revoked';
          case 'expired':
            return consent.expiresAt && new Date(consent.expiresAt) <= new Date();
          case 'expiring':
            return consent.status === 'granted' &&
                   consent.expiresAt &&
                   new Date(consent.expiresAt) > new Date() &&
                   new Date(consent.expiresAt) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          case 'required':
            return consent.isRequired;
          default:
            return true;
        }
      });
    }

    // Filtre par patient
    if (selectedPatient) {
      filtered = filtered.filter(consent => consent.patientId === selectedPatient);
    }

    // Filtre par type
    if (selectedType) {
      filtered = filtered.filter(consent => consent.type === selectedType);
    }

    // Tri
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'patientName':
          const patientA = patients.find(p => p.id === a.patientId);
          const patientB = patients.find(p => p.id === b.patientId);
          aValue = patientA ? `${patientA.firstName} ${patientA.lastName}` : '';
          bValue = patientB ? `${patientB.firstName} ${patientB.lastName}` : '';
          break;
        case 'type':
          aValue = a.type || '';
          bValue = b.type || '';
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'expiresAt':
          aValue = a.expiresAt ? new Date(a.expiresAt) : new Date('2099-12-31');
          bValue = b.expiresAt ? new Date(b.expiresAt) : new Date('2099-12-31');
          break;
        default:
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredConsents(filtered);
  };

  const handleCreateConsent = () => {
    setEditingConsent(null);
    setIsConsentModalOpen(true);
  };

  const handleEditConsent = (consent) => {
    setEditingConsent(consent);
    setIsConsentModalOpen(true);
  };

  const handleViewDetails = (consent) => {
    setSelectedConsentDetails(consent);
    setIsDetailsModalOpen(true);
  };

  const handleRevokeConsent = async (consentId, reason = 'patient_request') => {
    try {
      await consentsStorage.revoke(consentId, user?.id, reason);
      loadData();
    } catch (error) {
      console.error('Erreur révocation consentement:', error);
      alert('Erreur lors de la révocation du consentement');
    }
  };

  const handleDeleteConsent = async (consentId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce consentement ?')) {
      try {
        await consentsStorage.delete(consentId, user?.id);
        loadData();
      } catch (error) {
        console.error('Erreur suppression consentement:', error);
        alert('Erreur lors de la suppression du consentement');
      }
    }
  };

  const handleSaveConsent = (consent) => {
    loadData();
    setIsConsentModalOpen(false);
  };

  const generatePatientReport = (patientId) => {
    const report = consentsStorage.generatePatientReport(patientId);
    // En production, on pourrait générer un PDF ou exporter en JSON
    const jsonData = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport_consentements_${report.patientId}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (consent) => {
    const isExpired = consent.expiresAt && new Date(consent.expiresAt) <= new Date();
    const isExpiring = consent.expiresAt &&
                      new Date(consent.expiresAt) > new Date() &&
                      new Date(consent.expiresAt) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (consent.status === 'revoked') {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
        <X className="h-3 w-3 mr-1" />
        Révoqué
      </span>;
    }

    if (isExpired) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
        <Clock className="h-3 w-3 mr-1" />
        Expiré
      </span>;
    }

    if (isExpiring) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Expire bientôt
      </span>;
    }

    return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
      <CheckCircle className="h-3 w-3 mr-1" />
      Actif
    </span>;
  };

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : 'Patient inconnu';
  };

  const getPatientNumber = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    return patient ? patient.patientNumber : '';
  };

  const getTypeDisplayName = (type) => {
    const typeInfo = Object.values(CONSENT_TYPES).find(t => t.id === type);
    return typeInfo ? typeInfo.name : type;
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue' }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
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
          title="Total des consentements"
          value={statistics.total || 0}
          subtitle={`${statistics.active || 0} actifs`}
          icon={Shield}
          color="blue"
        />
        <StatCard
          title="Révoqués"
          value={statistics.revoked || 0}
          icon={X}
          color="red"
        />
        <StatCard
          title="Expirent bientôt"
          value={expiringConsents.length}
          subtitle="Dans les 30 jours"
          icon={AlertTriangle}
          color="orange"
        />
        <StatCard
          title="Ce mois"
          value={statistics.createdThisMonth || 0}
          subtitle="Nouveaux consentements"
          icon={Calendar}
          color="green"
        />
      </div>

      {/* Navigation par onglets */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('consents')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'consents'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Shield className="h-4 w-4 inline mr-2" />
              Gestion des consentements
            </button>
            <button
              onClick={() => setActiveTab('expiring')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'expiring'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Clock className="h-4 w-4 inline mr-2" />
              Expirations ({expiringConsents.length})
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analytics'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="h-4 w-4 inline mr-2" />
              Rapports
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'consents' && (
            <>
              {/* Barre d'outils */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 mb-6">
                <div className="flex-1 flex flex-col sm:flex-row gap-4">
                  {/* Recherche */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Rechercher par patient, type, finalité..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Filtres */}
                  <div className="flex gap-2">
                    <select
                      value={selectedFilter}
                      onChange={(e) => setSelectedFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">Tous les statuts</option>
                      <option value="active">Actifs</option>
                      <option value="revoked">Révoqués</option>
                      <option value="expired">Expirés</option>
                      <option value="expiring">Expirant bientôt</option>
                      <option value="required">Obligatoires</option>
                    </select>

                    <select
                      value={selectedPatient}
                      onChange={(e) => setSelectedPatient(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Tous les patients</option>
                      {patients.map(patient => (
                        <option key={patient.id} value={patient.id}>
                          {patient.firstName} {patient.lastName} - {patient.patientNumber}
                        </option>
                      ))}
                    </select>

                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Tous les types</option>
                      {Object.values(CONSENT_TYPES).map(type => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
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
                    onClick={handleCreateConsent}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nouveau consentement
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
                  <option value="createdAt">Date de création</option>
                  <option value="patientName">Patient</option>
                  <option value="type">Type</option>
                  <option value="status">Statut</option>
                  <option value="expiresAt">Date d'expiration</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-2 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
                <span className="text-sm text-gray-500 ml-auto">
                  {filteredConsents.length} consentement(s)
                </span>
              </div>

              {/* Liste des consentements */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Patient
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type / Finalité
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Collecte
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dates
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredConsents.map((consent) => (
                      <tr key={consent.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <User className="h-4 w-4 text-gray-400 mr-2" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {getPatientName(consent.patientId)}
                              </div>
                              <div className="text-sm text-gray-500">
                                {getPatientNumber(consent.patientId)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {getTypeDisplayName(consent.type)}
                              {consent.isRequired && (
                                <span className="ml-1 text-xs text-red-600">*</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {consent.purpose}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(consent)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-500">
                            <Signature className="h-3 w-3 mr-1" />
                            {COLLECTION_METHODS[consent.collectionMethod]?.name || consent.collectionMethod}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>
                            <div>Créé: {new Date(consent.createdAt).toLocaleDateString()}</div>
                            {consent.expiresAt && (
                              <div>Expire: {new Date(consent.expiresAt).toLocaleDateString()}</div>
                            )}
                            {consent.revokedAt && (
                              <div className="text-red-600">Révoqué: {new Date(consent.revokedAt).toLocaleDateString()}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleViewDetails(consent)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Voir les détails"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditConsent(consent)}
                            className="text-green-600 hover:text-green-900"
                            title="Modifier"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          {consent.status === 'granted' && (
                            <button
                              onClick={() => handleRevokeConsent(consent.id)}
                              className="text-orange-600 hover:text-orange-900"
                              title="Révoquer"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => generatePatientReport(consent.patientId)}
                            className="text-purple-600 hover:text-purple-900"
                            title="Rapport patient"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteConsent(consent.id)}
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

              {filteredConsents.length === 0 && (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Aucun consentement trouvé</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'expiring' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Consentements expirant dans les 30 jours
              </h3>
              {expiringConsents.length > 0 ? (
                <div className="space-y-4">
                  {expiringConsents.map(consent => (
                    <div key={consent.id} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {getPatientName(consent.patientId)} - {getTypeDisplayName(consent.type)}
                          </h4>
                          <p className="text-sm text-gray-600">{consent.purpose}</p>
                          <p className="text-sm text-orange-600 mt-1">
                            Expire le {new Date(consent.expiresAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditConsent(consent)}
                            className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
                          >
                            Renouveler
                          </button>
                          <button
                            onClick={() => handleViewDetails(consent)}
                            className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                          >
                            Détails
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Aucun consentement n'expire prochainement</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-6">
                Rapports et statistiques
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Statistiques par type */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Par type de consentement</h4>
                  <div className="space-y-2">
                    {Object.entries(statistics.byType || {}).map(([type, stats]) => (
                      <div key={type} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{getTypeDisplayName(type)}</span>
                        <div className="text-sm">
                          <span className="text-green-600 font-medium">{stats.active}</span>
                          {' / '}
                          <span className="text-gray-500">{stats.total}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Statistiques par méthode de collecte */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Par méthode de collecte</h4>
                  <div className="space-y-2">
                    {Object.entries(statistics.byCollectionMethod || {}).map(([method, count]) => (
                      <div key={method} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                          {COLLECTION_METHODS[method]?.name || method}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ConsentFormModal
        isOpen={isConsentModalOpen}
        onClose={() => setIsConsentModalOpen(false)}
        onSave={handleSaveConsent}
        editingConsent={editingConsent}
      />

      {/* Modal détails consentement */}
      {isDetailsModalOpen && selectedConsentDetails && (
        <ConsentDetailsModal
          consent={selectedConsentDetails}
          onClose={() => setIsDetailsModalOpen(false)}
          patientName={getPatientName(selectedConsentDetails.patientId)}
        />
      )}
    </div>
  );
};

// Modal pour afficher les détails d'un consentement avec audit trail
const ConsentDetailsModal = ({ consent, onClose, patientName }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Détails du consentement</h2>
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
                  <label className="block text-sm font-medium text-gray-700">Patient</label>
                  <p className="text-sm text-gray-900">{patientName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <p className="text-sm text-gray-900">{consent.title}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Finalité</label>
                  <p className="text-sm text-gray-900">{consent.purpose}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Statut</label>
                  <p className="text-sm text-gray-900">{consent.status}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Méthode de collecte</label>
                  <p className="text-sm text-gray-900">
                    {COLLECTION_METHODS[consent.collectionMethod]?.name || consent.collectionMethod}
                  </p>
                </div>
                {consent.expiresAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date d'expiration</label>
                    <p className="text-sm text-gray-900">{new Date(consent.expiresAt).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {consent.description && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{consent.description}</p>
              </div>
            )}

            {/* Détails spécifiques */}
            {consent.specificDetails && Object.values(consent.specificDetails).some(v => v) && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Détails spécifiques</h4>
                <div className="space-y-3">
                  {consent.specificDetails.procedure && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Procédure</label>
                      <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{consent.specificDetails.procedure}</p>
                    </div>
                  )}
                  {consent.specificDetails.risks && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Risques</label>
                      <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{consent.specificDetails.risks}</p>
                    </div>
                  )}
                  {consent.specificDetails.alternatives && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Alternatives</label>
                      <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{consent.specificDetails.alternatives}</p>
                    </div>
                  )}
                  {consent.specificDetails.expectedResults && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Résultats attendus</label>
                      <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{consent.specificDetails.expectedResults}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Témoin */}
            {consent.witness && consent.witness.name && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Témoin</h4>
                <div className="bg-yellow-50 p-3 rounded">
                  <p className="text-sm"><strong>Nom:</strong> {consent.witness.name}</p>
                  <p className="text-sm"><strong>Rôle:</strong> {consent.witness.role}</p>
                </div>
              </div>
            )}

            {/* Audit trail */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Historique des actions</h4>
              <div className="space-y-2">
                {consent.auditTrail?.map((entry, index) => (
                  <div key={index} className="border border-gray-200 rounded p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Action: {entry.action}
                        </p>
                        <p className="text-sm text-gray-600">
                          Par: {entry.userId} • {new Date(entry.timestamp).toLocaleString()}
                        </p>
                        {entry.details && (
                          <p className="text-xs text-gray-500 mt-1">
                            Détails: {JSON.stringify(entry.details)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsentManagementModule;