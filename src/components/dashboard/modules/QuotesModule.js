// components/dashboard/modules/QuotesModule.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, FileText, Download, Edit2, Trash2,
  Clock, Send, CheckCircle, XCircle, ArrowRight, Copy, Eye, ChevronUp, ChevronDown,
  RefreshCw, AlertCircle
} from 'lucide-react';
import {
  getDocuments, deleteDocument, sendDocument, duplicateDocument, convertToInvoice,
  acceptDocument, rejectDocument, getDocumentStats, getBillingSettings,
  buildDocumentPayload, createDocument, updateDocument, transformDocumentForDisplay
} from '../../../api/documentsApi';
import { patientsApi } from '../../../api/patientsApi';
import QuoteFormModal from '../modals/QuoteFormModal';
import PDFPreviewModal from '../modals/PDFPreviewModal';
import { useLocale } from '../../../contexts/LocaleContext';

const QuotesModule = ({ navigateToClient }) => {
  const { locale } = useLocale();
  const [quotes, setQuotes] = useState([]);
  const [filteredQuotes, setFilteredQuotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [billingSettings, setBillingSettings] = useState(null);
  const [patients, setPatients] = useState([]);
  const [error, setError] = useState(null);

  // PDF states
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);
  const [selectedQuoteForPDF, setSelectedQuoteForPDF] = useState(null);

  // Sort states
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');

  // Load quotes from backend
  const loadQuotes = useCallback(async () => {
    try {
      setError(null);
      const response = await getDocuments({ documentType: 'quote', limit: 200 });
      const data = response.data || response || [];
      const docs = Array.isArray(data) ? data : [];
      setQuotes(docs.map(transformDocumentForDisplay));
    } catch (err) {
      console.error('Erreur chargement devis:', err);
      setError('Impossible de charger les devis');
      setQuotes([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load stats from backend
  const loadStats = useCallback(async () => {
    try {
      const response = await getDocumentStats({ documentType: 'quote' });
      const s = response.data || response || {};
      setStats({
        totalQuotes: s.totalCount || 0,
        totalValue: s.totalAmount || 0,
        acceptedValue: s.acceptedTotal || 0,
        pendingValue: s.pendingTotal || s.sentTotal || 0,
        acceptedCount: s.acceptedCount || 0,
        rejectedCount: s.rejectedCount || 0,
        convertedCount: s.convertedCount || 0,
        thisMonthQuotes: s.thisMonthCount || 0
      });
    } catch (err) {
      console.error('Erreur chargement stats:', err);
    }
  }, []);

  // Load billing settings and patients
  const loadSettings = useCallback(async () => {
    try {
      const [settingsResp, patientsResp] = await Promise.all([
        getBillingSettings().catch(() => ({ data: null })),
        patientsApi.getPatients({ limit: 500 }).catch(() => ({ patients: [] }))
      ]);
      setBillingSettings(settingsResp.data || settingsResp || null);
      setPatients(patientsResp.patients || []);
    } catch (err) {
      console.error('Erreur chargement paramètres:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadQuotes();
    loadStats();
    loadSettings();
  }, [loadQuotes, loadStats, loadSettings]);

  // Filter and sort
  useEffect(() => {
    let filtered = quotes;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(quote => quote.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(quote =>
        quote.number?.toLowerCase().includes(query) ||
        quote.clientName?.toLowerCase().includes(query)
      );
    }

    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];

        if (sortField === 'quoteDate' || sortField === 'validUntil') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }

        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = (bValue || '').toLowerCase();
        }

        let comparison = 0;
        if (aValue > bValue) comparison = 1;
        if (aValue < bValue) comparison = -1;

        return sortDirection === 'desc' ? comparison * -1 : comparison;
      });
    }

    setFilteredQuotes(filtered);
  }, [quotes, searchQuery, filterStatus, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleClientClick = (clientId, clientName) => {
    if (navigateToClient && clientId) {
      navigateToClient(clientId);
    }
  };

  const handleAddQuote = () => {
    setEditingQuote(null);
    setIsModalOpen(true);
  };

  const handleEditQuote = (quote) => {
    setEditingQuote(quote);
    setIsModalOpen(true);
  };

  const handleDeleteQuote = async (quoteId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce devis ?')) {
      return;
    }

    try {
      await deleteDocument(quoteId);
      loadQuotes();
      loadStats();
    } catch (err) {
      console.error('Erreur suppression devis:', err);
      alert(err.message || 'Erreur lors de la suppression. Seuls les brouillons peuvent être supprimés.');
    }
  };

  const handleSaveQuote = async (formData) => {
    try {
      const selectedClient = patients.find(p => p.id === formData.clientId) || null;
      const payload = buildDocumentPayload('quote', formData, billingSettings, selectedClient);

      if (editingQuote?.id) {
        await updateDocument(editingQuote.id, payload);
      } else {
        await createDocument(payload);
      }

      loadQuotes();
      loadStats();
      setIsModalOpen(false);
    } catch (err) {
      console.error('Erreur sauvegarde devis:', err);
      throw err;
    }
  };

  const handleConvertToInvoice = async (quote) => {
    if (!window.confirm(`Convertir le devis ${quote.number} en facture ?`)) {
      return;
    }

    try {
      const result = await convertToInvoice(quote.id);
      loadQuotes();
      loadStats();
      const newNumber = result?.data?.documentNumber || result?.data?.document_number || '';
      alert(`Devis ${quote.number} converti en facture ${newNumber}`);
    } catch (err) {
      console.error('Erreur conversion devis:', err);
      alert(err.message || 'Erreur lors de la conversion');
    }
  };

  const handleDuplicateQuote = async (quote) => {
    try {
      await duplicateDocument(quote.id);
      loadQuotes();
      loadStats();
    } catch (err) {
      console.error('Erreur duplication devis:', err);
      alert('Erreur lors de la duplication');
    }
  };

  const handleShowPDF = (quote) => {
    setSelectedQuoteForPDF(quote);
    setIsPDFModalOpen(true);
  };

  const handleSendQuote = async (quote) => {
    try {
      if (quote.status === 'draft') {
        await sendDocument(quote.id);
        loadQuotes();
        loadStats();
      }
      handleShowPDF(quote);
    } catch (err) {
      console.error('Erreur envoi devis:', err);
      alert('Erreur lors de l\'envoi');
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    loadQuotes();
    loadStats();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'converted': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'draft': return 'Brouillon';
      case 'sent': return 'Envoyé';
      case 'accepted': return 'Accepté';
      case 'rejected': return 'Refusé';
      case 'converted': return 'Converti';
      default: return status;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'draft': return Clock;
      case 'sent': return Send;
      case 'accepted': return CheckCircle;
      case 'rejected': return XCircle;
      case 'converted': return ArrowRight;
      default: return FileText;
    }
  };

  const QuoteActions = ({ quote }) => {
    return (
      <div className="flex items-center space-x-1">
        {quote.status === 'draft' && (
          <button
            onClick={() => handleEditQuote(quote)}
            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
            title="Modifier"
          >
            <Edit2 className="h-4 w-4" />
          </button>
        )}

        <button
          onClick={() => handleDuplicateQuote(quote)}
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
          title="Dupliquer"
        >
          <Copy className="h-4 w-4" />
        </button>

        <button
          onClick={() => handleShowPDF(quote)}
          className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
          title="Aperçu PDF"
        >
          <Eye className="h-4 w-4" />
        </button>

        {quote.status !== 'converted' && (
          <button
            onClick={() => handleSendQuote(quote)}
            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
            title="Envoyer par email"
          >
            <Send className="h-4 w-4" />
          </button>
        )}

        {quote.status === 'accepted' && (
          <button
            onClick={() => handleConvertToInvoice(quote)}
            className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
            title="Convertir en facture"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        )}

        <button
          onClick={() => {
            handleShowPDF(quote);
            setTimeout(() => {
              const downloadBtn = document.querySelector('[title="Télécharger"]');
              if (downloadBtn) downloadBtn.click();
            }, 2000);
          }}
          className="p-1.5 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded transition-colors"
          title="Télécharger PDF"
        >
          <Download className="h-4 w-4" />
        </button>

        {quote.status === 'draft' && (
          <button
            onClick={() => handleDeleteQuote(quote.id)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
          <button onClick={handleRefresh} className="ml-auto text-red-600 hover:text-red-800 text-sm font-medium">
            Réessayer
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Devis</h2>
          <p className="text-sm text-gray-500 mt-1">Gérez vos devis et propositions commerciales</p>
        </div>
        <button
          onClick={handleAddQuote}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau devis</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un devis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">Tous les statuts</option>
            <option value="draft">Brouillons</option>
            <option value="sent">Envoyés</option>
            <option value="accepted">Acceptés</option>
            <option value="rejected">Refusés</option>
            <option value="converted">Convertis</option>
          </select>
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h4 className="font-semibold text-gray-900 mb-2">Total devis</h4>
          <p className="text-3xl font-bold text-gray-900">{stats.totalQuotes || 0}</p>
          <p className="text-sm text-gray-500">Tous statuts</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h4 className="font-semibold text-gray-900 mb-2">Valeur totale</h4>
          <p className="text-3xl font-bold text-indigo-600">{(stats.totalValue || 0).toFixed(2)}€</p>
          <p className="text-sm text-gray-500">Tous devis</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h4 className="font-semibold text-gray-900 mb-2">Acceptés</h4>
          <p className="text-3xl font-bold text-green-600">{(stats.acceptedValue || 0).toFixed(2)}€</p>
          <p className="text-sm text-gray-500">{stats.acceptedCount || 0} devis</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h4 className="font-semibold text-gray-900 mb-2">Ce mois</h4>
          <p className="text-3xl font-bold text-blue-600">{stats.thisMonthQuotes || 0}</p>
          <p className="text-sm text-gray-500">Nouveaux devis</p>
        </div>
      </div>

      {/* Quotes list */}
      <div className="bg-white rounded-xl shadow-sm border overflow-visible">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold text-gray-900">Devis récents</h4>
            <span className="text-sm text-gray-500">
              {filteredQuotes.length} devis
              {searchQuery && ` (filtré sur "${searchQuery}")`}
            </span>
          </div>
        </div>

        {filteredQuotes.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h5 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'Aucun devis trouvé' : 'Aucun devis créé'}
            </h5>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {searchQuery
                ? 'Essayez de modifier vos critères de recherche.'
                : 'Créez votre premier devis pour proposer vos services à vos clients.'
              }
            </p>
            {!searchQuery && (
              <button
                onClick={handleAddQuote}
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Créer un devis</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-visible">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-900">Numéro</th>
                    <th
                      className="text-left p-4 font-medium text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('clientName')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Client</span>
                        {sortField === 'clientName' && (
                          sortDirection === 'asc' ?
                            <ChevronUp className="h-4 w-4" /> :
                            <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th className="text-left p-4 font-medium text-gray-900">Date</th>
                    <th className="text-left p-4 font-medium text-gray-900 hidden sm:table-cell">Validité</th>
                    <th className="text-left p-4 font-medium text-gray-900">Montant</th>
                    <th
                      className="text-left p-4 font-medium text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Statut</span>
                        {sortField === 'status' && (
                          sortDirection === 'asc' ?
                            <ChevronUp className="h-4 w-4" /> :
                            <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th className="text-left p-4 font-medium text-gray-900 w-48">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuotes.map((quote) => {
                    const StatusIcon = getStatusIcon(quote.status);
                    const isExpired = quote.validUntil && new Date(quote.validUntil) < new Date() && quote.status === 'sent';

                    return (
                      <tr key={quote.id} className="border-t hover:bg-gray-50">
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">{quote.number || 'N/A'}</span>
                            {quote.discountAmount > 0 && (
                              <span className="text-xs bg-orange-100 text-orange-600 px-1 py-0.5 rounded">
                                Remise
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => handleClientClick(quote.clientId, quote.clientName)}
                            className="text-indigo-600 hover:text-indigo-800 hover:underline text-left font-medium transition-colors"
                          >
                            {quote.clientName || 'Client inconnu'}
                          </button>
                        </td>
                        <td className="p-4">
                          <span className="text-gray-900">
                            {quote.quoteDate ? new Date(quote.quoteDate).toLocaleDateString(locale) : 'N/A'}
                          </span>
                        </td>
                        <td className="p-4 hidden sm:table-cell">
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
                              {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString(locale) : 'N/A'}
                            </span>
                            {isExpired && (
                              <span className="text-xs bg-red-100 text-red-600 px-1 py-0.5 rounded">
                                Expiré
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div>
                            <span className="font-medium text-gray-900">
                              {quote.total ? `${quote.total.toFixed(2)}€` : '0.00€'}
                            </span>
                            {quote.discountAmount > 0 && (
                              <div className="text-xs text-orange-600">
                                -{quote.discountAmount.toFixed(2)}€ remise
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <StatusIcon className="h-4 w-4" />
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}>
                              {getStatusLabel(quote.status)}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <QuoteActions quote={quote} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Quick actions */}
      {quotes.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Actions rapides</h4>
          <div className="grid md:grid-cols-3 gap-4">
            <button
              onClick={handleAddQuote}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Plus className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Nouveau devis</p>
                  <p className="text-sm text-gray-500">Créer une proposition commerciale</p>
                </div>
              </div>
            </button>

            <button
              onClick={async () => {
                const acceptedQuotes = quotes.filter(q => q.status === 'accepted');
                if (acceptedQuotes.length === 0) {
                  alert('Aucun devis accepté à convertir');
                  return;
                }
                for (const quote of acceptedQuotes) {
                  await handleConvertToInvoice(quote);
                }
              }}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <ArrowRight className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Convertir en factures</p>
                  <p className="text-sm text-gray-500">Devis acceptés → factures</p>
                </div>
              </div>
            </button>

            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Download className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Export commercial</p>
                  <p className="text-sm text-gray-500">Rapport activité devis</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Conversion rate */}
      {stats.totalQuotes > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <div className="text-2xl">📊</div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-800 mb-2">
                Performance commerciale
              </h4>
              <div className="grid md:grid-cols-3 gap-4 mb-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {((stats.acceptedCount / stats.totalQuotes) * 100 || 0).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Taux d'acceptation</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {((stats.convertedCount / stats.totalQuotes) * 100 || 0).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Taux de conversion</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.totalQuotes > 0 ? (stats.totalValue / stats.totalQuotes).toFixed(0) : 0}€
                  </div>
                  <div className="text-sm text-gray-600">Valeur moyenne</div>
                </div>
              </div>
              <p className="text-gray-700 text-sm">
                {stats.acceptedCount} devis acceptés, {stats.convertedCount} convertis en factures sur {stats.totalQuotes} total.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Compliance info */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <div className="text-2xl">📋</div>
          <div className="flex-1">
            <h4 className="font-semibold text-green-800 mb-2">
              Devis professionnels - Conformité commerciale
            </h4>
            <p className="text-green-700 text-sm mb-3">
              Vos devis respectent les standards commerciaux et sont automatiquement convertibles en factures conformes EN 16931.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                ✓ Aperçu PDF temps réel
              </span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                ✓ Conversion facture automatique
              </span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                ✓ Gestion dates validité
              </span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                ✓ Statuts visuels
              </span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                ✓ Métriques performance
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quote form modal */}
      <QuoteFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveQuote}
        quote={editingQuote}
        patients={patients}
        billingSettings={billingSettings}
      />

      {/* PDF preview modal */}
      <PDFPreviewModal
        isOpen={isPDFModalOpen}
        onClose={() => setIsPDFModalOpen(false)}
        data={selectedQuoteForPDF}
        type="quote"
      />
    </div>
  );
};

export default QuotesModule;
