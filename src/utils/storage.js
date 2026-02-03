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
// DEPRECATED: Invoice storage has been migrated to the backend API.
// Use documentsApi.js instead. This stub is kept for backward compatibility
// during migration but will be removed in a future release.

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
// Note: Invoice number generation, calculateInvoiceTotals, and getStatistics
// have been migrated to the backend (documentService.js / documents routes).
// Use documentsApi.js for all billing operations.

// Export/Import des données
export const dataManagement = {
  // Exporter toutes les données (local only — billing data is now in the backend)
  exportAll: () => {
    return {
      clients: clientStorage.getAll(),
      settings: settingsStorage.get(),
      counters: counterStorage.get(),
      exportDate: new Date().toISOString()
    };
  },

  // Importer des données
  importAll: (data) => {
    try {
      if (data.clients) storage.set(STORAGE_KEYS.CLIENTS, data.clients);
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
  settingsStorage,
  counterStorage,
  dataManagement
};