// components/dashboard/modules/QuotesModule.js
import React, { useState, useEffect } from 'react';
import {
  Plus, Search, FileText, Filter, Download, Edit2, Trash2, MoreVertical,
  Clock, Send, CheckCircle, XCircle, ArrowRight, Copy, Eye, ChevronUp, ChevronDown,
  RefreshCw
} from 'lucide-react';
import { getStatistics } from '../../../utils/storage';
import QuoteFormModal from '../modals/QuoteFormModal';
import PDFPreviewModal from '../modals/PDFPreviewModal';
import { useLocale } from '../../../contexts/LocaleContext';

// Import des fonctions utilitaires
const generateInvoiceNumber = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const timestamp = Date.now().toString().slice(-4);
  return `FACT-${year}${month}${day}-${timestamp}`;
};

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
  
  // États pour PDF
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);
  const [selectedQuoteForPDF, setSelectedQuoteForPDF] = useState(null);

  // États pour le tri
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');

  // Utilitaires localStorage pour les devis
  const quoteStorage = {
    getAll: () => {
      try {
        const quotes = localStorage.getItem('clinicmanager_quotes');
        return quotes ? JSON.parse(quotes) : [];
      } catch (error) {
        console.error('Erreur lecture devis:', error);
        return [];
      }
    },

    save: (quotes) => {
      try {
        localStorage.setItem('clinicmanager_quotes', JSON.stringify(quotes));
        return true;
      } catch (error) {
        console.error('Erreur sauvegarde devis:', error);
        return false;
      }
    },

    add: (quoteData) => {
      const quotes = quoteStorage.getAll();
      const newQuote = {
        id: Date.now().toString(),
        number: generateQuoteNumber(),
        ...quoteData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      quotes.push(newQuote);
      quoteStorage.save(quotes);
      return newQuote;
    },

    update: (id, quoteData) => {
      const quotes = quoteStorage.getAll();
      const index = quotes.findIndex(quote => quote.id === id);
      
      if (index === -1) {
        throw new Error('Devis non trouvé');
      }
      
      quotes[index] = {
        ...quotes[index],
        ...quoteData,
        updatedAt: new Date().toISOString()
      };
      
      quoteStorage.save(quotes);
      return quotes[index];
    },

    delete: (id) => {
      const quotes = quoteStorage.getAll();
      const filteredQuotes = quotes.filter(quote => quote.id !== id);

      if (quotes.length === filteredQuotes.length) {
        throw new Error('Devis non trouvé');
      }

      quoteStorage.save(filteredQuotes);
      return true;
    },

    // US6.3: Transformer un devis validé en facture
    transformToInvoice: (quoteId) => {
      const quotes = quoteStorage.getAll();
      const quote = quotes.find(q => q.id === quoteId);

      if (!quote) {
        throw new Error('Devis non trouvé');
      }

      if (quote.status !== 'validated') {
        throw new Error('Seuls les devis validés peuvent être transformés en facture');
      }

      // Créer la facture à partir du devis
      const invoiceData = {
        quoteId: quote.id,
        quoteNumber: quote.number,
        patientId: quote.clientId,
        patientName: quote.clientName,
        items: quote.items,
        subtotal: quote.subtotal,
        taxAmount: quote.taxAmount,
        total: quote.total,
        status: 'draft',
        type: 'medical_record' // Adaptation médicale
      };

      // Importer le storage des factures
      const invoices = JSON.parse(localStorage.getItem('clinicmanager_medical_records') || '[]');
      const newInvoice = {
        id: Date.now().toString(),
        number: generateInvoiceNumber(),
        ...invoiceData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      invoices.push(newInvoice);
      localStorage.setItem('clinicmanager_medical_records', JSON.stringify(invoices));

      // Marquer le devis comme facturé
      quote.status = 'invoiced';
      quote.invoiceId = newInvoice.id;
      quote.updatedAt = new Date().toISOString();
      quoteStorage.save(quotes);

      return newInvoice;
    },

    // US6.7: Validation/refus patient
    updateValidationStatus: (quoteId, status, comment = '') => {
      const quotes = quoteStorage.getAll();
      const index = quotes.findIndex(q => q.id === quoteId);

      if (index === -1) {
        throw new Error('Devis non trouvé');
      }

      if (!['validated', 'rejected'].includes(status)) {
        throw new Error('Statut invalide');
      }

      quotes[index].validationStatus = status;
      quotes[index].validationComment = comment;
      quotes[index].validationDate = new Date().toISOString();
      quotes[index].updatedAt = new Date().toISOString();

      // Si validé, mettre le statut principal à "validated"
      if (status === 'validated') {
        quotes[index].status = 'validated';
      }

      quoteStorage.save(quotes);

      // US6.8: Ici on pourrait déclencher une notification
      console.log(`Devis ${quotes[index].number} ${status === 'validated' ? 'validé' : 'refusé'} par le patient`);

      return quotes[index];
    }
  };

  // Génération numéro de devis
  const generateQuoteNumber = () => {
    const quotes = quoteStorage.getAll();
    const counter = quotes.length + 1;
    const now = new Date();
    const year = now.getFullYear();
    
    return `DEV-${year}-${String(counter).padStart(4, '0')}`;
  };

  // Charger les devis au montage
  useEffect(() => {
    loadQuotes();
    loadStats();
  }, []);

  // Filtrer les devis quand la recherche, le filtre ou le tri change
  useEffect(() => {
    filterQuotes();
  }, [quotes, searchQuery, filterStatus, sortField, sortDirection]);

  const loadQuotes = () => {
    try {
      const quotesData = quoteStorage.getAll();
      setQuotes(quotesData);
      setIsLoading(false);
    } catch (error) {
      console.error('Erreur chargement devis:', error);
      setIsLoading(false);
    }
  };

  const loadStats = () => {
    const quotes = quoteStorage.getAll();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const thisMonthQuotes = quotes.filter(quote => {
      const quoteDate = new Date(quote.createdAt);
      return quoteDate.getMonth() === currentMonth && 
             quoteDate.getFullYear() === currentYear;
    });
    
    const totalValue = quotes.reduce((sum, quote) => sum + (quote.total || 0), 0);
    const acceptedValue = quotes
      .filter(quote => quote.status === 'accepted')
      .reduce((sum, quote) => sum + (quote.total || 0), 0);
    const pendingValue = quotes
      .filter(quote => ['sent', 'draft'].includes(quote.status))
      .reduce((sum, quote) => sum + (quote.total || 0), 0);
    
    setStats({
      totalQuotes: quotes.length,
      thisMonthQuotes: thisMonthQuotes.length,
      totalValue,
      acceptedValue,
      pendingValue,
      acceptedCount: quotes.filter(q => q.status === 'accepted').length,
      rejectedCount: quotes.filter(q => q.status === 'rejected').length,
      convertedCount: quotes.filter(q => q.status === 'converted').length
    });
  };

  const filterQuotes = () => {
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

    // Appliquer le tri
    if (sortField) {
      filtered = filtered.sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];

        // Gestion spéciale pour les dates
        if (sortField === 'quoteDate' || sortField === 'validUntil') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }

        // Tri par défaut (string)
        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        let comparison = 0;
        if (aValue > bValue) comparison = 1;
        if (aValue < bValue) comparison = -1;

        return sortDirection === 'desc' ? comparison * -1 : comparison;
      });
    }

    setFilteredQuotes(filtered);
  };

  // Fonction pour gérer le tri par colonne
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Fonction pour naviguer vers la fiche client
  const handleClientClick = (clientId, clientName) => {
    if (navigateToClient && clientId) {
      navigateToClient(clientId);
    } else {
      // Fallback si la navigation n'est pas disponible
      alert(`Navigation vers la fiche client: ${clientName}\nID: ${clientId}`);
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
      quoteStorage.delete(quoteId);
      loadQuotes();
      loadStats();
    } catch (error) {
      console.error('Erreur suppression devis:', error);
      alert('Erreur lors de la suppression du devis');
    }
  };

  const handleSaveQuote = async (quoteData) => {
    try {
      if (editingQuote) {
        quoteStorage.update(editingQuote.id, quoteData);
      } else {
        quoteStorage.add(quoteData);
      }
      
      loadQuotes();
      loadStats();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Erreur sauvegarde devis:', error);
      throw error;
    }
  };

  const handleConvertToInvoice = async (quote) => {
    // Epic 6 - US6.3: Transformer un devis validé en facture
    if (!window.confirm(`¿Convertir el presupuesto ${quote.number} en factura?`)) {
      return;
    }

    try {
      // Utiliser notre nouvelle méthode de transformation
      const newInvoice = quoteStorage.transformToInvoice(quote.id);

      // Recharger les devis pour rafraîchir l'interface
      loadQuotes();
      loadStats();

      // Notifier le succès (Epic 6 - US6.8)
      alert(`✅ Presupuesto ${quote.number} convertido a factura ${newInvoice.number} exitosamente`);
    } catch (error) {
      console.error('Erreur conversion devis:', error);
      alert('Erreur lors de la conversion');
    }
  };

  const handleDuplicateQuote = (quote) => {
    const duplicatedQuote = {
      ...quote,
      id: undefined,
      number: undefined,
      status: 'draft',
      quoteDate: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
    
    setEditingQuote(duplicatedQuote);
    setIsModalOpen(true);
  };

  // NOUVEAU : Gestion aperçu PDF pour devis
  const handleShowPDF = (quote) => {
    setSelectedQuoteForPDF(quote);
    setIsPDFModalOpen(true);
  };

  const handleSendQuote = (quote) => {
    // Marquer comme envoyé et ouvrir PDF
    if (quote.status === 'draft') {
      quoteStorage.update(quote.id, { 
        status: 'sent',
        sentAt: new Date().toISOString()
      });
      loadQuotes();
      loadStats();
    }
    handleShowPDF(quote);
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
        {/* Modifier */}
        <button
          onClick={() => handleEditQuote(quote)}
          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
          title="Modifier"
        >
          <Edit2 className="h-4 w-4" />
        </button>

        {/* Dupliquer */}
        <button
          onClick={() => handleDuplicateQuote(quote)}
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
          title="Dupliquer"
        >
          <Copy className="h-4 w-4" />
        </button>

        {/* Aperçu PDF */}
        <button
          onClick={() => handleShowPDF(quote)}
          className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
          title="Aperçu PDF"
        >
          <Eye className="h-4 w-4" />
        </button>

        {/* Envoyer par email - pour tous statuts sauf converti */}
        {quote.status !== 'converted' && (
          <button
            onClick={() => handleSendQuote(quote)}
            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
            title="Envoyer par email"
          >
            <Send className="h-4 w-4" />
          </button>
        )}

        {/* Convertir en facture - seulement pour devis validés (Epic 6 - US6.3) */}
        {quote.status === 'validated' && (
          <button
            onClick={() => handleConvertToInvoice(quote)}
            className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
            title="Convertir en facture"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        )}

        {/* Télécharger PDF */}
        <button
          onClick={() => {
            handleShowPDF(quote);
            // Auto-download après 2 secondes
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

        {/* Supprimer */}
        <button
          onClick={() => handleDeleteQuote(quote.id)}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Supprimer"
        >
          <Trash2 className="h-4 w-4" />
        </button>
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
      {/* En-tête : Titre + Bouton */}
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

      {/* Barre de filtres */}
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
          <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Statistiques rapides remontées */}
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

      {/* Liste des devis */}
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

      {/* Actions rapides */}
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
              onClick={() => {
                const acceptedQuotes = quotes.filter(q => q.status === 'accepted');
                if (acceptedQuotes.length > 0) {
                  acceptedQuotes.forEach(quote => handleConvertToInvoice(quote));
                } else {
                  alert('Aucun devis accepté à convertir');
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

      {/* Taux de conversion */}
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

      {/* Informations conformité devis */}
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

      {/* Modal de formulaire devis */}
      <QuoteFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveQuote}
        quote={editingQuote}
      />

      {/* Modal aperçu PDF */}
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
                  