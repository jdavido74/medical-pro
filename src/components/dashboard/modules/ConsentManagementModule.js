// components/dashboard/modules/ConsentManagementModule.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Shield,
  Plus,
  Search,
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
  Loader
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useConsents } from '../../../contexts/ConsentContext';
import { usePatients } from '../../../contexts/PatientContext';
import { consentSigningApi } from '../../../api/consentSigningApi';
import { CONSENT_TYPES, COLLECTION_METHODS } from '../../../utils/consentsStorage';
import ConsentFormModal from '../../modals/ConsentFormModal';
import { useAuth } from '../../../hooks/useAuth';

const ConsentManagementModule = () => {
  const { t } = useTranslation('consents');
  const { user } = useAuth();

  // Utiliser les contextes au lieu des appels API directs
  const {
    consents: contextConsents,
    isLoading: consentsLoading,
    error: consentsError,
    revokeConsent,
    deleteConsent,
    refreshConsents
  } = useConsents();

  const { patients } = usePatients();

  // État local pour les données combinées (consents + signing requests)
  const [combinedConsents, setCombinedConsents] = useState([]);
  const [signingRequests, setSigningRequests] = useState([]);
  const [signingLoading, setSigningLoading] = useState(false);

  // État local UI uniquement
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

  // État de chargement combiné
  const loading = consentsLoading || signingLoading;
  const error = consentsError;

  // Charger les demandes de signature (séparé du contexte)
  const loadSigningRequests = useCallback(async () => {
    try {
      setSigningLoading(true);
      const signingRequestsResponse = await consentSigningApi.getRequests().catch(() => ({ data: [] }));
      const requests = signingRequestsResponse.data || signingRequestsResponse.requests || [];
      setSigningRequests(requests);
    } catch (err) {
      console.error('[ConsentManagementModule] Error loading signing requests:', err);
    } finally {
      setSigningLoading(false);
    }
  }, []);

  // Charger les demandes de signature au démarrage
  useEffect(() => {
    loadSigningRequests();
  }, [loadSigningRequests]);

  // Combiner les consentements du contexte avec les demandes de signature
  useEffect(() => {
    const pendingSignatures = signingRequests
      .filter(req => req.status === 'pending')
      .map(req => ({
        id: `signing-${req.id}`,
        signingRequestId: req.id,
        patientId: req.patient_id || req.patientId,
        consentType: req.template?.consentType || req.consent_type || 'general',
        title: req.template?.title || 'Consentement en attente',
        status: 'pending_signature',
        createdAt: req.created_at || req.createdAt,
        expiresAt: req.expires_at || req.expiresAt,
        sentVia: req.sent_via || req.sentVia,
        isPendingSignature: true
      }));

    setCombinedConsents([...contextConsents, ...pendingSignatures]);
  }, [contextConsents, signingRequests]);

  // Calculer les statistiques à partir des données du contexte
  const statistics = useMemo(() => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      total: contextConsents.length,
      active: contextConsents.filter(c => c.status === 'granted' || c.status === 'accepted').length,
      revoked: contextConsents.filter(c => c.status === 'revoked' || c.status === 'rejected').length,
      expired: contextConsents.filter(c => c.expiresAt && new Date(c.expiresAt) <= now).length,
      createdThisMonth: contextConsents.filter(c => new Date(c.createdAt) >= thisMonth).length,
      pendingSignatures: signingRequests.filter(r => r.status === 'pending').length,
      byType: {},
      byCollectionMethod: {}
    };

    contextConsents.forEach(consent => {
      const type = consent.type || 'unknown';
      if (!stats.byType[type]) {
        stats.byType[type] = { total: 0, active: 0, revoked: 0 };
      }
      stats.byType[type].total++;
      if (consent.status === 'granted' || consent.status === 'accepted') stats.byType[type].active++;
      if (consent.status === 'revoked' || consent.status === 'rejected') stats.byType[type].revoked++;

      const method = consent.collectionMethod || 'unknown';
      if (!stats.byCollectionMethod[method]) {
        stats.byCollectionMethod[method] = 0;
      }
      stats.byCollectionMethod[method]++;
    });

    return stats;
  }, [contextConsents, signingRequests]);

  // Calculer les consentements qui expirent bientôt
  const expiringConsents = useMemo(() => {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return contextConsents
      .filter(consent =>
        (consent.status === 'granted' || consent.status === 'accepted') &&
        consent.expiresAt &&
        new Date(consent.expiresAt) <= in30Days &&
        new Date(consent.expiresAt) > now
      )
      .sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt));
  }, [contextConsents]);

  // Rafraîchir toutes les données
  const loadData = useCallback(async () => {
    await Promise.all([
      refreshConsents(),
      loadSigningRequests()
    ]);
  }, [refreshConsents, loadSigningRequests]);

  // Filtrer et trier les consentements avec useMemo
  const filteredConsents = useMemo(() => {
    let filtered = [...combinedConsents];

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
          case 'pending_signature':
            return consent.status === 'pending_signature' || consent.isPendingSignature;
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

    return filtered;
  }, [combinedConsents, patients, searchTerm, selectedFilter, selectedPatient, selectedType, sortBy, sortOrder]);

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
      // Utiliser la méthode du contexte (optimistic update inclus)
      await revokeConsent(consentId, reason);
      // Recharger aussi les demandes de signature
      await loadSigningRequests();
    } catch (err) {
      console.error('[ConsentManagementModule] Error revoking consent:', err);
      alert(t('errors.revoke'));
    }
  };

  const handleDeleteConsent = async (consentId) => {
    if (window.confirm(t('confirm.delete'))) {
      try {
        // Check if this is a signing request (prefixed with "signing-")
        if (consentId.startsWith('signing-')) {
          // Extract the real signing request ID
          const signingRequestId = consentId.replace('signing-', '');
          await consentSigningApi.deleteRequest(signingRequestId);
          // Refresh signing requests after deletion
          await loadSigningRequests();
        } else {
          // Regular consent - use context method (optimistic update included)
          await deleteConsent(consentId);
        }
      } catch (err) {
        console.error('[ConsentManagementModule] Error deleting consent:', err);
        alert(t('errors.delete'));
      }
    }
  };

  const handleSaveConsent = () => {
    // Le contexte se met à jour automatiquement via refreshConsents
    refreshConsents();
    loadSigningRequests();
    setIsConsentModalOpen(false);
  };

  const generatePatientReport = async (patientId) => {
    try {
      // Utiliser les consentements du contexte filtrés par patient
      const patientConsents = contextConsents.filter(c => c.patientId === patientId);
      const patient = patients.find(p => p.id === patientId);

      const report = {
        patientId,
        patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown',
        generatedAt: new Date().toISOString(),
        totalConsents: patientConsents.length,
        activeConsents: patientConsents.filter(c => c.status === 'granted').length,
        revokedConsents: patientConsents.filter(c => c.status === 'revoked').length,
        consentsByType: {},
        detailedConsents: patientConsents.map(consent => ({
          id: consent.id,
          type: consent.type,
          purpose: consent.purpose,
          status: consent.status,
          createdAt: consent.createdAt,
          revokedAt: consent.revokedAt,
          expiresAt: consent.expiresAt,
          collectionMethod: consent.collectionMethod
        }))
      };

      // Group by type
      patientConsents.forEach(consent => {
        if (!report.consentsByType[consent.type]) {
          report.consentsByType[consent.type] = { active: 0, revoked: 0, total: 0 };
        }
        report.consentsByType[consent.type].total++;
        if (consent.status === 'granted') report.consentsByType[consent.type].active++;
        if (consent.status === 'revoked') report.consentsByType[consent.type].revoked++;
      });

      // Download as JSON
      const jsonData = JSON.stringify(report, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport_consentements_${patientId}_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[ConsentManagementModule] Error generating report:', err);
      alert(t('errors.generateReport'));
    }
  };

  const getStatusBadge = (consent) => {
    const isExpired = consent.expiresAt && new Date(consent.expiresAt) <= new Date();
    const isExpiring = consent.expiresAt &&
                      new Date(consent.expiresAt) > new Date() &&
                      new Date(consent.expiresAt) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Status for pending signature requests
    if (consent.status === 'pending_signature' || consent.isPendingSignature) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
        <Clock className="h-3 w-3 mr-1 animate-pulse" />
        {t('status.pendingSignature')}
      </span>;
    }

    if (consent.status === 'revoked') {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
        <X className="h-3 w-3 mr-1" />
        {t('status.revoked')}
      </span>;
    }

    if (isExpired) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
        <Clock className="h-3 w-3 mr-1" />
        {t('status.expired')}
      </span>;
    }

    if (isExpiring) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
        <AlertTriangle className="h-3 w-3 mr-1" />
        {t('status.expiringSoon')}
      </span>;
    }

    return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
      <CheckCircle className="h-3 w-3 mr-1" />
      {t('status.active')}
    </span>;
  };

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : t('patientUnknown');
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

  // Loading state
  if (loading && combinedConsents.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && combinedConsents.length === 0) {
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

      {/* Header avec statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title={t('stats.totalConsents')}
          value={statistics.total || 0}
          subtitle={`${statistics.active || 0} ${t('stats.active')}`}
          icon={Shield}
          color="blue"
        />
        <StatCard
          title={t('stats.revoked')}
          value={statistics.revoked || 0}
          icon={X}
          color="red"
        />
        <StatCard
          title={t('stats.expiringSoon')}
          value={expiringConsents.length}
          subtitle={t('stats.in30Days')}
          icon={AlertTriangle}
          color="orange"
        />
        <StatCard
          title={t('stats.thisMonth')}
          value={statistics.createdThisMonth || 0}
          subtitle={t('stats.newConsents')}
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
              {t('tabs.management')}
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
              {t('tabs.expirations')} ({expiringConsents.length})
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
              {t('tabs.reports')}
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
                      placeholder={t('search.placeholder')}
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
                      <option value="all">{t('filters.allStatuses')}</option>
                      <option value="active">{t('filters.active')}</option>
                      <option value="pending_signature">{t('filters.pendingSignature')}</option>
                      <option value="revoked">{t('filters.revoked')}</option>
                      <option value="expired">{t('filters.expired')}</option>
                      <option value="expiring">{t('filters.expiringSoon')}</option>
                      <option value="required">{t('filters.required')}</option>
                    </select>

                    <select
                      value={selectedPatient}
                      onChange={(e) => setSelectedPatient(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">{t('filters.allPatients')}</option>
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
                      <option value="">{t('filters.allTypes')}</option>
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
                    disabled={loading}
                    className="px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={handleCreateConsent}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('actions.newConsent')}
                  </button>
                </div>
              </div>

              {/* Tri */}
              <div className="flex items-center gap-4 mb-4">
                <span className="text-sm text-gray-600">{t('sort.label')}</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="createdAt">{t('sort.createdAt')}</option>
                  <option value="patientName">{t('sort.patient')}</option>
                  <option value="type">{t('sort.type')}</option>
                  <option value="status">{t('sort.status')}</option>
                  <option value="expiresAt">{t('sort.expiresAt')}</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-2 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
                <span className="text-sm text-gray-500 ml-auto">
                  {filteredConsents.length} {t('count.consents')}
                </span>
              </div>

              {/* Liste des consentements */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.patient')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.typePurpose')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.status')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.collection')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.dates')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('table.actions')}
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
                            <div>{t('table.created')} {new Date(consent.createdAt).toLocaleDateString()}</div>
                            {consent.expiresAt && (
                              <div>{t('table.expires')} {new Date(consent.expiresAt).toLocaleDateString()}</div>
                            )}
                            {consent.revokedAt && (
                              <div className="text-red-600">{t('table.revoked')} {new Date(consent.revokedAt).toLocaleDateString()}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleViewDetails(consent)}
                            className="text-blue-600 hover:text-blue-900"
                            title={t('actions.viewDetails')}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditConsent(consent)}
                            className="text-green-600 hover:text-green-900"
                            title={t('actions.edit')}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          {consent.status === 'granted' && (
                            <button
                              onClick={() => handleRevokeConsent(consent.id)}
                              className="text-orange-600 hover:text-orange-900"
                              title={t('actions.revoke')}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => generatePatientReport(consent.patientId)}
                            className="text-purple-600 hover:text-purple-900"
                            title={t('actions.patientReport')}
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteConsent(consent.id)}
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

              {filteredConsents.length === 0 && (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">{t('empty.noConsents')}</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'expiring' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {t('expiring.title')}
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
                            {t('expiring.expiresOn')} {new Date(consent.expiresAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditConsent(consent)}
                            className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
                          >
                            {t('actions.renew')}
                          </button>
                          <button
                            onClick={() => handleViewDetails(consent)}
                            className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                          >
                            {t('actions.details')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">{t('empty.noExpiring')}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-6">
                {t('reports.title')}
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Statistiques par type */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">{t('reports.byType')}</h4>
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
                  <h4 className="font-medium text-gray-900 mb-3">{t('reports.byCollectionMethod')}</h4>
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
  const { t } = useTranslation('consents');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">{t('details.title')}</h2>
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
                  <label className="block text-sm font-medium text-gray-700">{t('details.patient')}</label>
                  <p className="text-sm text-gray-900">{patientName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('details.type')}</label>
                  <p className="text-sm text-gray-900">{consent.title}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('details.purpose')}</label>
                  <p className="text-sm text-gray-900">{consent.purpose}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('details.status')}</label>
                  <p className="text-sm text-gray-900">{consent.status}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('details.collectionMethod')}</label>
                  <p className="text-sm text-gray-900">
                    {COLLECTION_METHODS[consent.collectionMethod]?.name || consent.collectionMethod}
                  </p>
                </div>
                {consent.expiresAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('details.expirationDate')}</label>
                    <p className="text-sm text-gray-900">{new Date(consent.expiresAt).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {consent.description && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">{t('details.description')}</h4>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{consent.description}</p>
              </div>
            )}

            {/* Détails spécifiques */}
            {consent.specificDetails && Object.values(consent.specificDetails).some(v => v) && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">{t('details.specificDetails')}</h4>
                <div className="space-y-3">
                  {consent.specificDetails.procedure && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('details.procedure')}</label>
                      <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{consent.specificDetails.procedure}</p>
                    </div>
                  )}
                  {consent.specificDetails.risks && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('details.risks')}</label>
                      <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{consent.specificDetails.risks}</p>
                    </div>
                  )}
                  {consent.specificDetails.alternatives && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('details.alternatives')}</label>
                      <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{consent.specificDetails.alternatives}</p>
                    </div>
                  )}
                  {consent.specificDetails.expectedResults && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('details.expectedResults')}</label>
                      <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{consent.specificDetails.expectedResults}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Témoin */}
            {consent.witness && consent.witness.name && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">{t('details.witness')}</h4>
                <div className="bg-yellow-50 p-3 rounded">
                  <p className="text-sm"><strong>{t('details.witnessName')}</strong> {consent.witness.name}</p>
                  <p className="text-sm"><strong>{t('details.witnessRole')}</strong> {consent.witness.role}</p>
                </div>
              </div>
            )}

            {/* Audit trail */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">{t('details.auditTrail')}</h4>
              <div className="space-y-2">
                {consent.auditTrail?.map((entry, index) => (
                  <div key={index} className="border border-gray-200 rounded p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {t('details.action')} {entry.action}
                        </p>
                        <p className="text-sm text-gray-600">
                          {t('details.by')} {entry.userId} • {new Date(entry.timestamp).toLocaleString()}
                        </p>
                        {entry.details && (
                          <p className="text-xs text-gray-500 mt-1">
                            {t('details.detailsLabel')} {JSON.stringify(entry.details)}
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
            {t('actions.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsentManagementModule;