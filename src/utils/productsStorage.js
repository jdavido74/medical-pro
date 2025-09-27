// utils/productsStorage.js - Epic 7: Gestion des produits/services médicaux

const PRODUCTS_STORAGE_KEY = 'clinicmanager_products';
const SERVICES_STORAGE_KEY = 'clinicmanager_services';
const BUNDLES_STORAGE_KEY = 'clinicmanager_bundles';

// Utilitaires de base pour localStorage
const storage = {
  get: (key) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : [];
    } catch (error) {
      console.error('Erreur lecture localStorage:', error);
      return [];
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
  }
};

// === GESTION DES PRODUITS ===

export const productsStorage = {
  // Epic 7 - US7.1: Créer et gérer des produits
  getAll: () => {
    return storage.get(PRODUCTS_STORAGE_KEY) || [];
  },

  getById: (id) => {
    const products = productsStorage.getAll();
    return products.find(product => product.id === id) || null;
  },

  add: (productData) => {
    const products = productsStorage.getAll();
    const newProduct = {
      id: Date.now().toString(),
      type: 'product',
      ...productData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    products.push(newProduct);
    storage.set(PRODUCTS_STORAGE_KEY, products);
    return newProduct;
  },

  update: (id, productData) => {
    const products = productsStorage.getAll();
    const index = products.findIndex(product => product.id === id);

    if (index === -1) {
      throw new Error('Produit non trouvé');
    }

    products[index] = {
      ...products[index],
      ...productData,
      updatedAt: new Date().toISOString()
    };

    storage.set(PRODUCTS_STORAGE_KEY, products);
    return products[index];
  },

  delete: (id) => {
    const products = productsStorage.getAll();
    const filteredProducts = products.filter(product => product.id !== id);

    if (products.length === filteredProducts.length) {
      throw new Error('Produit non trouvé');
    }

    storage.set(PRODUCTS_STORAGE_KEY, filteredProducts);
    return true;
  }
};

// === GESTION DES SERVICES ===

export const servicesStorage = {
  // Epic 7 - US7.1: Créer et gérer des services médicaux
  getAll: () => {
    return storage.get(SERVICES_STORAGE_KEY) || [];
  },

  getById: (id) => {
    const services = servicesStorage.getAll();
    return services.find(service => service.id === id) || null;
  },

  add: (serviceData) => {
    const services = servicesStorage.getAll();
    const newService = {
      id: Date.now().toString(),
      type: 'service',
      ...serviceData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    services.push(newService);
    storage.set(SERVICES_STORAGE_KEY, services);
    return newService;
  },

  update: (id, serviceData) => {
    const services = servicesStorage.getAll();
    const index = services.findIndex(service => service.id === id);

    if (index === -1) {
      throw new Error('Service non trouvé');
    }

    services[index] = {
      ...services[index],
      ...serviceData,
      updatedAt: new Date().toISOString()
    };

    storage.set(SERVICES_STORAGE_KEY, services);
    return services[index];
  },

  delete: (id) => {
    const services = servicesStorage.getAll();
    const filteredServices = services.filter(service => service.id !== id);

    if (services.length === filteredServices.length) {
      throw new Error('Service non trouvé');
    }

    storage.set(SERVICES_STORAGE_KEY, filteredServices);
    return true;
  }
};

// === GESTION DES BUNDLES ===

export const bundlesStorage = {
  // Epic 7 - US7.2: Créer des bundles de produits/services
  getAll: () => {
    return storage.get(BUNDLES_STORAGE_KEY) || [];
  },

  getById: (id) => {
    const bundles = bundlesStorage.getAll();
    return bundles.find(bundle => bundle.id === id) || null;
  },

  add: (bundleData) => {
    const bundles = bundlesStorage.getAll();

    // Calculer le tarif initial (somme des éléments)
    const calculatedPrice = bundleData.items?.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0) || 0;

    const newBundle = {
      id: Date.now().toString(),
      type: 'bundle',
      ...bundleData,
      calculatedPrice, // Prix calculé automatiquement
      customPrice: bundleData.customPrice || calculatedPrice, // Prix ajustable
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    bundles.push(newBundle);
    storage.set(BUNDLES_STORAGE_KEY, bundles);
    return newBundle;
  },

  update: (id, bundleData) => {
    const bundles = bundlesStorage.getAll();
    const index = bundles.findIndex(bundle => bundle.id === id);

    if (index === -1) {
      throw new Error('Bundle non trouvé');
    }

    // Recalculer le prix si les items changent
    let updatedBundle = { ...bundles[index], ...bundleData };

    if (bundleData.items) {
      const calculatedPrice = bundleData.items.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
      }, 0);
      updatedBundle.calculatedPrice = calculatedPrice;

      // Si pas de prix personnalisé défini, utiliser le calculé
      if (!bundleData.customPrice) {
        updatedBundle.customPrice = calculatedPrice;
      }
    }

    updatedBundle.updatedAt = new Date().toISOString();
    bundles[index] = updatedBundle;

    storage.set(BUNDLES_STORAGE_KEY, bundles);
    return bundles[index];
  },

  delete: (id) => {
    const bundles = bundlesStorage.getAll();
    const filteredBundles = bundles.filter(bundle => bundle.id !== id);

    if (bundles.length === filteredBundles.length) {
      throw new Error('Bundle non trouvé');
    }

    storage.set(BUNDLES_STORAGE_KEY, filteredBundles);
    return true;
  }
};

// === CATALOGUE COMPLET ===

export const catalogStorage = {
  // Obtenir tous les éléments du catalogue (produits + services + bundles)
  getAll: () => {
    return [
      ...productsStorage.getAll(),
      ...servicesStorage.getAll(),
      ...bundlesStorage.getAll()
    ];
  },

  // Rechercher dans tout le catalogue
  search: (query) => {
    const allItems = catalogStorage.getAll();
    const searchTerm = query.toLowerCase();

    return allItems.filter(item =>
      item.name?.toLowerCase().includes(searchTerm) ||
      item.description?.toLowerCase().includes(searchTerm) ||
      item.category?.toLowerCase().includes(searchTerm)
    );
  },

  // Filtrer par type
  filterByType: (type) => {
    const allItems = catalogStorage.getAll();
    return allItems.filter(item => item.type === type);
  },

  // Filtrer par catégorie
  filterByCategory: (category) => {
    const allItems = catalogStorage.getAll();
    return allItems.filter(item => item.category === category);
  }
};

// === DONNÉES INITIALES MÉDICALES ===

// Initialiser avec quelques données par défaut si vide
export const initializeDefaultCatalog = () => {
  const products = productsStorage.getAll();
  const services = servicesStorage.getAll();

  if (products.length === 0) {
    // Quelques produits médicaux par défaut
    const defaultProducts = [
      {
        name: 'Consulta General',
        description: 'Consulta médica general',
        price: 50.00,
        category: 'Consultas',
        duration: 30 // en minutes
      },
      {
        name: 'Análisis de Sangre Básico',
        description: 'Análisis básico de sangre completo',
        price: 25.00,
        category: 'Análisis'
      },
      {
        name: 'Radiografía',
        description: 'Radiografía simple',
        price: 35.00,
        category: 'Diagnóstico'
      }
    ];

    defaultProducts.forEach(product => productsStorage.add(product));
  }

  if (services.length === 0) {
    // Quelques services médicaux par défaut
    const defaultServices = [
      {
        name: 'Fisioterapia',
        description: 'Sesión de fisioterapia',
        price: 40.00,
        category: 'Terapias',
        duration: 45
      },
      {
        name: 'Vacunación',
        description: 'Administración de vacuna',
        price: 15.00,
        category: 'Prevención'
      }
    ];

    defaultServices.forEach(service => servicesStorage.add(service));
  }
};

export default {
  productsStorage,
  servicesStorage,
  bundlesStorage,
  catalogStorage,
  initializeDefaultCatalog
};