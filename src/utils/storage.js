// utils/storage.js

const STORAGE_KEYS = {
  CLIENTS: 'clinicmanager_patients',
  INVOICES: 'clinicmanager_medical_records',
  SETTINGS: 'clinicmanager_settings',
  COUNTERS: 'clinicmanager_counters'
};

// Utilitaires de base pour localStorage
const storage = {
  get: (key) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Erreur lecture localStorage:', error);
      return null;
    }
  },

  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Erreur écriture localStorage:', error);
      return false;
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Erreur suppression localStorage:', error);
      return false;
    }
  },

  clear: () => {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      return true;
    } catch (error) {
      console.error('Erreur nettoyage localStorage:', error);
      return false;
    }
  }
};

// === GESTION DES CLIENTS ===

export const clientStorage = {
  // Récupérer tous les clients
  getAll: () => {
    return storage.get(STORAGE_KEYS.CLIENTS) || [];
  },

  // Récupérer un client par ID
  getById: (id) => {
    const clients = clientStorage.getAll();
    return clients.find(client => client.id === id) || null;
  },

  // Ajouter un nouveau client
  add: (clientData) => {
    const clients = clientStorage.getAll();
    const newClient = {
      id: Date.now().toString(),
      ...clientData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    clients.push(newClient);
    storage.set(STORAGE_KEYS.CLIENTS, clients);
    return newClient;
  },

  // Mettre à jour un client
  update: (id, clientData) => {
    const clients = clientStorage.getAll();
    const index = clients.findIndex(client => client.id === id);
    
    if (index === -1) {
      throw new Error('Client non trouvé');
    }
    
    clients[index] = {
      ...clients[index],
      ...clientData,
      updatedAt: new Date().toISOString()
    };
    
    storage.set(STORAGE_KEYS.CLIENTS, clients);
    return clients[index];
  },

  // Supprimer un client
  delete: (id) => {
    const clients = clientStorage.getAll();
    const filteredClients = clients.filter(client => client.id !== id);
    
    if (clients.length === filteredClients.length) {
      throw new Error('Client non trouvé');
    }
    
    storage.set(STORAGE_KEYS.CLIENTS, filteredClients);
    return true;
  },

  // Rechercher des clients
  search: (query) => {
    const clients = clientStorage.getAll();
    const searchTerm = query.toLowerCase();
    
    return clients.filter(client => 
      client.name?.toLowerCase().includes(searchTerm) ||
      client.companyName?.toLowerCase().includes(searchTerm) ||
      client.email?.toLowerCase().includes(searchTerm) ||
      client.siret?.includes(searchTerm)
    );
  },

  // Filtrer par type
  filterByType: (type) => {
    const clients = clientStorage.getAll();
    return clients.filter(client => client.type === type);
  }
};

// === GESTION DES FACTURES ===

export const invoiceStorage = {
  // Récupérer toutes les factures
  getAll: () => {
    return storage.get(STORAGE_KEYS.INVOICES) || [];
  },

  // Récupérer une facture par ID
  getById: (id) => {
    const invoices = invoiceStorage.getAll();
    return invoices.find(invoice => invoice.id === id) || null;
  },

  // Ajouter une nouvelle facture
  add: (invoiceData) => {
    const invoices = invoiceStorage.getAll();
    const newInvoice = {
      id: Date.now().toString(),
      number: generateInvoiceNumber(invoiceData.clientId),
      ...invoiceData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    invoices.push(newInvoice);
    storage.set(STORAGE_KEYS.INVOICES, invoices);
    return newInvoice;
  },

  // Mettre à jour une facture
  update: (id, invoiceData) => {
    const invoices = invoiceStorage.getAll();
    const index = invoices.findIndex(invoice => invoice.id === id);
    
    if (index === -1) {
      throw new Error('Facture non trouvée');
    }
    
    invoices[index] = {
      ...invoices[index],
      ...invoiceData,
      updatedAt: new Date().toISOString()
    };
    
    storage.set(STORAGE_KEYS.INVOICES, invoices);
    return invoices[index];
  },

  // Supprimer une facture
  delete: (id) => {
    const invoices = invoiceStorage.getAll();
    const filteredInvoices = invoices.filter(invoice => invoice.id !== id);
    
    if (invoices.length === filteredInvoices.length) {
      throw new Error('Facture non trouvée');
    }
    
    storage.set(STORAGE_KEYS.INVOICES, filteredInvoices);
    return true;
  },

  // Récupérer les factures d'un client
  getByClientId: (clientId) => {
    const invoices = invoiceStorage.getAll();
    return invoices.filter(invoice => invoice.clientId === clientId);
  },

  // Filtrer par statut
  filterByStatus: (status) => {
    const invoices = invoiceStorage.getAll();
    return invoices.filter(invoice => invoice.status === status);
  },

  // Rechercher des factures
  search: (query) => {
    const invoices = invoiceStorage.getAll();
    const searchTerm = query.toLowerCase();
    
    return invoices.filter(invoice => 
      invoice.number?.toLowerCase().includes(searchTerm) ||
      invoice.clientName?.toLowerCase().includes(searchTerm)
    );
  }
};

// === GESTION DES COMPTEURS ===

export const counterStorage = {
  // Récupérer les compteurs
  get: () => {
    return storage.get(STORAGE_KEYS.COUNTERS) || {
      invoiceCounter: 1,
      clientCounter: 1
    };
  },

  // Incrémenter un compteur
  increment: (counterName) => {
    const counters = counterStorage.get();
    counters[counterName] = (counters[counterName] || 0) + 1;
    storage.set(STORAGE_KEYS.COUNTERS, counters);
    return counters[counterName];
  },

  // Réinitialiser un compteur
  reset: (counterName) => {
    const counters = counterStorage.get();
    counters[counterName] = 1;
    storage.set(STORAGE_KEYS.COUNTERS, counters);
    return counters[counterName];
  }
};

// === GESTION DES PARAMÈTRES ===

export const settingsStorage = {
  // Récupérer les paramètres
  get: () => {
    return storage.get(STORAGE_KEYS.SETTINGS) || {
      invoiceNumberPattern: 'FAC-{YYYY}-{NNNN}',
      defaultTaxRate: 20,
      defaultPaymentTerms: 30,
      companyInfo: {}
    };
  },

  // Sauvegarder les paramètres
  set: (settings) => {
    const currentSettings = settingsStorage.get();
    const newSettings = { ...currentSettings, ...settings };
    return storage.set(STORAGE_KEYS.SETTINGS, newSettings);
  },

  // Mettre à jour un paramètre spécifique
  update: (key, value) => {
    const settings = settingsStorage.get();
    settings[key] = value;
    return storage.set(STORAGE_KEYS.SETTINGS, settings);
  }
};

// === UTILITAIRES ===

// Générer un numéro de facture
function generateInvoiceNumber(clientId = null) {
  const settings = settingsStorage.get();
  const pattern = settings.invoiceNumberPattern;
  const counter = counterStorage.increment('invoiceCounter');
  
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  let number = pattern
    .replace('{YYYY}', year)
    .replace('{MM}', month)
    .replace('{NNNN}', String(counter).padStart(4, '0'))
    .replace('{NNN}', String(counter).padStart(3, '0'))
    .replace('{NN}', String(counter).padStart(2, '0'));

  // Si pattern spécifique client (sera implémenté plus tard)
  if (clientId) {
    const client = clientStorage.getById(clientId);
    if (client && client.invoicePattern) {
      // Logique pattern client personnalisé
    }
  }

  return number;
}

// Calculer les totaux d'une facture
export const calculateInvoiceTotals = (items, taxRate = 20) => {
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.quantity * item.unitPrice);
  }, 0);
  
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount;
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
    taxRate
  };
};

// Statistiques globales
export const getStatistics = () => {
  const clients = clientStorage.getAll();
  const invoices = invoiceStorage.getAll();
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const thisMonthInvoices = invoices.filter(invoice => {
    const invoiceDate = new Date(invoice.createdAt);
    return invoiceDate.getMonth() === currentMonth && 
           invoiceDate.getFullYear() === currentYear;
  });
  
  const totalRevenue = invoices
    .filter(invoice => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + (invoice.total || 0), 0);
    
  const pendingAmount = invoices
    .filter(invoice => ['sent', 'overdue'].includes(invoice.status))
    .reduce((sum, invoice) => sum + (invoice.total || 0), 0);
    
  return {
    totalClients: clients.length,
    totalInvoices: invoices.length,
    thisMonthInvoices: thisMonthInvoices.length,
    totalRevenue,
    pendingAmount,
    businessClients: clients.filter(c => c.type === 'business').length,
    individualClients: clients.filter(c => c.type === 'individual').length
  };
};

// Export/Import des données
export const dataManagement = {
  // Exporter toutes les données
  exportAll: () => {
    return {
      clients: clientStorage.getAll(),
      invoices: invoiceStorage.getAll(),
      settings: settingsStorage.get(),
      counters: counterStorage.get(),
      exportDate: new Date().toISOString()
    };
  },

  // Importer des données
  importAll: (data) => {
    try {
      if (data.clients) storage.set(STORAGE_KEYS.CLIENTS, data.clients);
      if (data.invoices) storage.set(STORAGE_KEYS.INVOICES, data.invoices);
      if (data.settings) storage.set(STORAGE_KEYS.SETTINGS, data.settings);
      if (data.counters) storage.set(STORAGE_KEYS.COUNTERS, data.counters);
      return true;
    } catch (error) {
      console.error('Erreur import données:', error);
      return false;
    }
  },

  // Réinitialiser toutes les données
  resetAll: () => {
    return storage.clear();
  }
};

// Export de l'objet storage de base pour les autres modules
export { storage };

export default {
  storage,
  clientStorage,
  invoiceStorage,
  settingsStorage,
  counterStorage,
  calculateInvoiceTotals,
  getStatistics,
  dataManagement
};