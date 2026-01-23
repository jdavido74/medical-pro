/**
 * Catalog Migration Utility
 * Migrates data from old productsStorage format to new catalogStorage format
 */

import { catalogStorage } from './catalogStorage';
import { STORAGE_KEYS } from '../constants/catalogConfig';

// Old storage keys
const OLD_STORAGE_KEYS = {
  PRODUCTS: 'clinicmanager_products',
  SERVICES: 'clinicmanager_services',
  BUNDLES: 'clinicmanager_bundles'
};

/**
 * Check if migration is needed
 */
export const needsMigration = () => {
  const oldProducts = localStorage.getItem(OLD_STORAGE_KEYS.PRODUCTS);
  const oldServices = localStorage.getItem(OLD_STORAGE_KEYS.SERVICES);
  const newCatalog = localStorage.getItem(STORAGE_KEYS.CATALOG_ITEMS);

  // Migration needed if old data exists and new catalog is empty
  return (oldProducts || oldServices) && !newCatalog;
};

/**
 * Get old products from storage
 */
const getOldProducts = () => {
  try {
    const stored = localStorage.getItem(OLD_STORAGE_KEYS.PRODUCTS);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Error reading old products:', e);
    return [];
  }
};

/**
 * Get old services from storage
 */
const getOldServices = () => {
  try {
    const stored = localStorage.getItem(OLD_STORAGE_KEYS.SERVICES);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Error reading old services:', e);
    return [];
  }
};

/**
 * Convert old product format to new catalog item format
 */
const convertProduct = (oldProduct) => {
  return {
    id: `migrated_${oldProduct.id}`,
    parentId: null,
    type: 'medication', // Default type for products
    isFamily: false,
    isVariant: false,
    name: oldProduct.name || 'Unknown Product',
    description: oldProduct.description || '',
    category: oldProduct.category || '',
    price: parseFloat(oldProduct.price) || 0,
    vatRate: 20, // Default VAT rate
    isActive: true,
    dosage: null,
    dosageUnit: null,
    volume: null,
    provenance: null,
    duration: null,
    variants: [],
    createdAt: oldProduct.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: null,
    _migratedFrom: 'productsStorage'
  };
};

/**
 * Convert old service format to new catalog item format
 */
const convertService = (oldService) => {
  return {
    id: `migrated_${oldService.id}`,
    parentId: null,
    type: 'service',
    isFamily: false,
    isVariant: false,
    name: oldService.name || 'Unknown Service',
    description: oldService.description || '',
    category: oldService.category || '',
    price: parseFloat(oldService.price) || 0,
    vatRate: 20, // Default VAT rate
    isActive: true,
    dosage: null,
    dosageUnit: null,
    volume: null,
    provenance: null,
    duration: oldService.duration || 30, // Default 30 min for services
    variants: [],
    createdAt: oldService.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: null,
    _migratedFrom: 'servicesStorage'
  };
};

/**
 * Run the migration
 * @param {Object} options
 * @param {boolean} options.preserveOld - Keep old storage after migration
 * @param {boolean} options.dryRun - Don't actually save, just return what would be migrated
 */
export const runMigration = (options = {}) => {
  const { preserveOld = true, dryRun = false } = options;

  const oldProducts = getOldProducts();
  const oldServices = getOldServices();

  console.log(`[CatalogMigration] Found ${oldProducts.length} products and ${oldServices.length} services to migrate`);

  // Convert all items
  const convertedProducts = oldProducts.map(convertProduct);
  const convertedServices = oldServices.map(convertService);
  const allConverted = [...convertedProducts, ...convertedServices];

  if (dryRun) {
    return {
      success: true,
      dryRun: true,
      itemsToMigrate: allConverted.length,
      items: allConverted
    };
  }

  // Import to new catalog
  const result = catalogStorage.importItems(allConverted, null, { overwrite: false });

  if (result.success) {
    console.log(`[CatalogMigration] Successfully migrated ${result.success.length} items`);

    // Clean up old storage if not preserving
    if (!preserveOld) {
      localStorage.removeItem(OLD_STORAGE_KEYS.PRODUCTS);
      localStorage.removeItem(OLD_STORAGE_KEYS.SERVICES);
      localStorage.removeItem(OLD_STORAGE_KEYS.BUNDLES);
      console.log('[CatalogMigration] Removed old storage keys');
    }

    return {
      success: true,
      migratedCount: result.success.length,
      errorCount: result.errors.length,
      errors: result.errors
    };
  }

  return {
    success: false,
    error: 'Migration failed',
    errors: result.errors
  };
};

/**
 * Auto-migrate if needed (called on app startup)
 */
export const autoMigrate = () => {
  if (needsMigration()) {
    console.log('[CatalogMigration] Auto-migration triggered');
    return runMigration({ preserveOld: true });
  }
  return { success: true, skipped: true, reason: 'No migration needed' };
};

/**
 * Clear old storage (after confirming migration success)
 */
export const clearOldStorage = () => {
  localStorage.removeItem(OLD_STORAGE_KEYS.PRODUCTS);
  localStorage.removeItem(OLD_STORAGE_KEYS.SERVICES);
  localStorage.removeItem(OLD_STORAGE_KEYS.BUNDLES);
  console.log('[CatalogMigration] Old storage cleared');
};

export default {
  needsMigration,
  runMigration,
  autoMigrate,
  clearOldStorage
};
