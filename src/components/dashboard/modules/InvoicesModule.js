// components/dashboard/modules/InvoicesModule.js
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, FileText, Download, Edit2, Trash2, Send, Copy, Eye, ChevronUp, ChevronDown, RefreshCw, AlertCircle } from 'lucide-react';
import {
  getDocuments, deleteDocument, sendDocument, duplicateDocument,
  getDocumentStats, getBillingSettings, payDocument,
  buildDocumentPayload, createDocument, updateDocument, transformDocumentForDisplay
} from '../../../api/documentsApi';
import { patientsApi } from '../../../api/patientsApi';
import InvoiceFormModal from '../modals/InvoiceFormModal';
import PDFPreviewModal from '../modals/PDFPreviewModal';
import { useLocale } from '../../../contexts/LocaleContext';

const InvoicesModule = ({ navigateToClient }) => {
  const { locale } = useLocale();
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [billingSettings, setBillingSettings] = useState(null);
  const [patients, setPatients] = useState([]);
  const [error, setError] = useState(null);

  // PDF states
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);
  const [selectedInvoiceForPDF, setSelectedInvoiceForPDF] = useState(null);

  // Sort states
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');

  // Load invoices from backend
  const loadInvoices = useCallback(async () => {
    try {
      setError(null);
      const response = await getDocuments({ documentType: 'invoice', limit: 200 });
      const data = response.data || response || [];
      const docs = Array.isArray(data) ? data : [];
      setInvoices(docs.map(transformDocumentForDisplay));
    } catch (err) {
      console.error('Erreur chargement factures:', err);
      setError('Impossible de charger les factures');
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load stats from backend
  const loadStats = useCallback(async () => {
    try {
      const response = await getDocumentStats({ documentType: 'invoice' });
      const s = response.data || response || {};
      setStats({
        totalInvoices: s.totalCount || 0,
        totalRevenue: s.paidTotal || 0,
        pendingAmount: s.pendingTotal || s.sentTotal || 0,
        thisMonthInvoices: s.thisMonthCount || 0
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
    loadInvoices();
    loadStats();
    loadSettings();
  }, [loadInvoices, loadStats, loadSettings]);

  // Filter and sort
  useEffect(() => {
    let filtered = invoices;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(invoice =>
        invoice.number?.toLowerCase().includes(query) ||
        invoice.clientName?.toLowerCase().includes(query)
      );
    }

    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];

        if (sortField === 'invoiceDate' || sortField === 'dueDate') {
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

    setFilteredInvoices(filtered);
  }, [invoices, searchQuery, filterStatus, sortField, sortDirection]);

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

  const handleAddInvoice = () => {
    setEditingInvoice(null);
    setIsModalOpen(true);
  };

  const handleEditInvoice = (invoice) => {
    setEditingInvoice(invoice);
    setIsModalOpen(true);
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette facture ?')) {
      return;
    }

    try {
      await deleteDocument(invoiceId);
      loadInvoices();
      loadStats();
    } catch (err) {
      console.error('Erreur suppression facture:', err);
      alert(err.message || 'Erreur lors de la suppression. Seuls les brouillons peuvent être supprimés.');
    }
  };

  const handleSaveInvoice = async (formData) => {
    try {
      // Find the selected patient
      const selectedClient = patients.find(p => p.id === formData.clientId) || null;

      // Build backend payload
      const payload = buildDocumentPayload('invoice', formData, billingSettings, selectedClient);

      if (editingInvoice?.id) {
        await updateDocument(editingInvoice.id, payload);
      } else {
        await createDocument(payload);
      }

      loadInvoices();
      loadStats();
      setIsModalOpen(false);
    } catch (err) {
      console.error('Erreur sauvegarde facture:', err);
      throw err;
    }
  };

  const handleDuplicateInvoice = async (invoice) => {
    try {
      await duplicateDocument(invoice.id);
      loadInvoices();
      loadStats();
    } catch (err) {
      console.error('Erreur duplication facture:', err);
      alert('Erreur lors de la duplication');
    }
  };

  const handleShowPDF = (invoice) => {
    setSelectedInvoiceForPDF(invoice);
    setIsPDFModalOpen(true);
  };

  const handleSendInvoice = async (invoice) => {
    try {
      if (invoice.status === 'draft') {
        await sendDocument(invoice.id);
        loadInvoices();
        loadStats();
      }
      handleShowPDF(invoice);
    } catch (err) {
      console.error('Erreur envoi facture:', err);
      alert('Erreur lors de l\'envoi');
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    loadInvoices();
    loadStats();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'draft': return 'Brouillon';
      case 'sent': return 'Envoyée';
      case 'paid': return 'Payée';
      case 'overdue': return 'Échue';
      case 'cancelled': return 'Annulée';
      default: return status;
    }
  };

  const InvoiceActions = ({ invoice }) => {
    return (
      <div className="flex items-center space-x-1">
        {invoice.status === 'draft' && (
          <button
            onClick={() => handleEditInvoice(invoice)}
            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
            title="Modifier"
          >
            <Edit2 className="h-4 w-4" />
          </button>
        )}

        <button
          onClick={() => handleDuplicateInvoice(invoice)}
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
          title="Dupliquer"
        >
          <Copy className="h-4 w-4" />
        </button>

        <button
          onClick={() => handleShowPDF(invoice)}
          className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
          title="Aperçu PDF"
        >
          <Eye className="h-4 w-4" />
        </button>

        {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
          <button
            onClick={() => handleSendInvoice(invoice)}
            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
            title="Envoyer par email"
          >
            <Send className="h-4 w-4" />
          </button>
        )}

        <button
          onClick={() => {
            handleShowPDF(invoice);
            setTimeout(() => {
              const downloadBtn = document.querySelector('[title="Télécharger"]');
              if (downloadBtn) downloadBtn.click();
            }, 2000);
          }}
          className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
          title="Télécharger PDF"
        >
          <Download className="h-4 w-4" />
        </button>

        {invoice.status === 'draft' && (
          <button
            onClick={() => handleDeleteInvoice(invoice.id)}
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
          <h2 className="text-xl font-semibold text-gray-900">Factures</h2>
          <p className="text-sm text-gray-500 mt-1">Gérez vos factures et suivi de paiements</p>
        </div>
        <button
          onClick={handleAddInvoice}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle facture</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une facture..."
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
            <option value="sent">Envoyées</option>
            <option value="paid">Payées</option>
            <option value="overdue">Échues</option>
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
          <h4 className="font-semibold text-gray-900 mb-2">Total factures</h4>
          <p className="text-3xl font-bold text-gray-900">{stats.totalInvoices || 0}</p>
          <p className="text-sm text-gray-500">Toutes factures</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h4 className="font-semibold text-gray-900 mb-2">Chiffre d'affaires</h4>
          <p className="text-3xl font-bold text-indigo-600">{(stats.totalRevenue || 0).toFixed(2)}€</p>
          <p className="text-sm text-gray-500">Factures payées</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h4 className="font-semibold text-gray-900 mb-2">En attente</h4>
          <p className="text-3xl font-bold text-orange-600">{(stats.pendingAmount || 0).toFixed(2)}€</p>
          <p className="text-sm text-gray-500">À encaisser</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h4 className="font-semibold text-gray-900 mb-2">Ce mois</h4>
          <p className="text-3xl font-bold text-green-600">{stats.thisMonthInvoices || 0}</p>
          <p className="text-sm text-gray-500">Nouvelles factures</p>
        </div>
      </div>

      {/* Invoice list */}
      <div className="bg-white rounded-xl shadow-sm border overflow-visible">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold text-gray-900">Factures récentes</h4>
            <span className="text-sm text-gray-500">
              {filteredInvoices.length} facture(s)
              {searchQuery && ` (filtré sur "${searchQuery}")`}
            </span>
          </div>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h5 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'Aucune facture trouvée' : 'Aucune facture créée'}
            </h5>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {searchQuery
                ? 'Essayez de modifier vos critères de recherche.'
                : 'Créez votre première facture conforme à la réglementation 2026. L\'interface vous guidera pour respecter toutes les obligations légales.'
              }
            </p>
            {!searchQuery && (
              <button
                onClick={handleAddInvoice}
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Créer une facture</span>
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
                    <th className="text-left p-4 font-medium text-gray-900 hidden sm:table-cell">Échéance</th>
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
                    <th className="text-left p-4 font-medium text-gray-900 w-40">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => {
                    const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.status === 'sent';

                    return (
                      <tr key={invoice.id} className="border-t hover:bg-gray-50">
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">{invoice.number || 'N/A'}</span>
                            {invoice.discountAmount > 0 && (
                              <span className="text-xs bg-orange-100 text-orange-600 px-1 py-0.5 rounded">
                                Remise
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => handleClientClick(invoice.clientId, invoice.clientName)}
                            className="text-indigo-600 hover:text-indigo-800 hover:underline text-left font-medium transition-colors"
                          >
                            {invoice.clientName || 'Client inconnu'}
                          </button>
                        </td>
                        <td className="p-4">
                          <span className="text-gray-900">
                            {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString(locale) : 'N/A'}
                          </span>
                        </td>
                        <td className="p-4 hidden sm:table-cell">
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                              {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString(locale) : 'N/A'}
                            </span>
                            {isOverdue && (
                              <span className="text-xs bg-red-100 text-red-600 px-1 py-0.5 rounded">
                                Échue
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div>
                            <span className="font-medium text-gray-900">
                              {invoice.total ? `${invoice.total.toFixed(2)}€` : '0.00€'}
                            </span>
                            {invoice.discountAmount > 0 && (
                              <div className="text-xs text-orange-600">
                                -{invoice.discountAmount.toFixed(2)}€ remise
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                            {getStatusLabel(invoice.status)}
                          </span>
                        </td>
                        <td className="p-4">
                          <InvoiceActions invoice={invoice} />
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
      {invoices.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Actions rapides</h4>
          <div className="grid md:grid-cols-3 gap-4">
            <button
              onClick={handleAddInvoice}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Plus className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Nouvelle facture</p>
                  <p className="text-sm text-gray-500">Créer une facture conforme</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                const lastInvoice = invoices[invoices.length - 1];
                if (lastInvoice) handleDuplicateInvoice(lastInvoice);
              }}
              disabled={invoices.length === 0}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Copy className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Dupliquer facture</p>
                  <p className="text-sm text-gray-500">À partir de la dernière</p>
                </div>
              </div>
            </button>

            <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Download className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Export comptable</p>
                  <p className="text-sm text-gray-500">Données pour expert-comptable</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Compliance info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <div className="text-2xl">ℹ️</div>
          <div className="flex-1">
            <h4 className="font-semibold text-blue-800 mb-2">
              Conformité 2026 - Facturation électronique
            </h4>
            <p className="text-blue-700 text-sm mb-3">
              Toutes vos factures sont automatiquement générées selon la norme européenne EN 16931.
              Elles incluent la signature électronique et l'archivage légal requis.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                ✓ XML structuré
              </span>
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                ✓ PDF/A-3
              </span>
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                ✓ Signature électronique
              </span>
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                ✓ Archivage 10 ans
              </span>
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                ✓ Aperçu PDF temps réel
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice form modal */}
      <InvoiceFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveInvoice}
        invoice={editingInvoice}
        patients={patients}
        billingSettings={billingSettings}
      />

      {/* PDF preview modal */}
      <PDFPreviewModal
        isOpen={isPDFModalOpen}
        onClose={() => setIsPDFModalOpen(false)}
        data={selectedInvoiceForPDF}
        type="invoice"
      />
    </div>
  );
};

export default InvoicesModule;
