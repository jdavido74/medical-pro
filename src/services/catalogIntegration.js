/**
 * Catalog Integration Service
 * Provides stable interface for catalog integration with appointments, quotes, and invoices
 */

import { catalogStorage } from '../utils/catalogStorage';
import { CATALOG_TYPES } from '../constants/catalogConfig';

/**
 * Get services for appointment selection (sync - from cache)
 * Returns services with duration for appointment scheduling
 */
export const getServicesForAppointment = () => {
  const services = catalogStorage.getForSelection('service');

  return services.map(service => ({
    id: service.id,
    name: service.title || service.name,
    description: service.description,
    duration: service.duration || 30, // Default 30 minutes if not set
    price: service.unitPrice || service.price,
    category: service.category,
    type: 'service'
  }));
};

/**
 * Get treatments for appointment selection (sync - from cache)
 * Returns treatments with duration for appointment scheduling
 */
export const getTreatmentsForAppointment = () => {
  const treatments = catalogStorage.getForSelection('treatment');

  return treatments
    .filter(treatment => treatment.duration) // Only treatments with duration set
    .map(treatment => ({
      id: treatment.id,
      name: treatment.title || treatment.name,
      description: treatment.description,
      duration: treatment.duration,
      price: treatment.unitPrice || treatment.price,
      category: treatment.category,
      type: 'treatment',
      // Additional treatment info
      dosage: treatment.dosage,
      dosageUnit: treatment.dosageUnit,
      volume: treatment.volume,
      prepBefore: treatment.prepBefore,
      prepAfter: treatment.prepAfter,
      isOverlappable: treatment.isOverlappable,
      machineTypeId: treatment.machineTypeId
    }));
};

/**
 * Get all items (services + treatments) that can be scheduled as appointments (sync)
 * Returns items with duration for appointment scheduling
 */
export const getItemsForAppointment = () => {
  const services = getServicesForAppointment();
  const treatments = getTreatmentsForAppointment();

  return [...services, ...treatments];
};

/**
 * Get items for appointments from API (async - fresh data)
 * Returns items with duration, prep times, and planning info
 */
export const getItemsForAppointmentAsync = async () => {
  return catalogStorage.getForAppointmentsAsync();
};

/**
 * Get a service by ID with appointment-relevant fields
 */
export const getServiceForAppointment = (serviceId) => {
  const service = catalogStorage.getResolved(serviceId);

  if (!service || (service.itemType !== 'service' && service.type !== 'service')) {
    return null;
  }

  return {
    id: service.id,
    name: service.title || service.name,
    description: service.description,
    duration: service.duration || 30,
    price: service.unitPrice || service.price,
    category: service.category
  };
};

/**
 * Get products/treatments for quote/invoice selection
 * Returns items with pricing and VAT information
 */
export const getProductsForBilling = (options = {}) => {
  const { includeServices = false, type = null } = options;

  let items;

  if (type) {
    items = catalogStorage.getForSelection(type);
  } else {
    // Get medications and treatments by default
    const medications = catalogStorage.getForSelection('medication');
    const treatments = catalogStorage.getForSelection('treatment');
    items = [...medications, ...treatments];

    if (includeServices) {
      const services = catalogStorage.getForSelection('service');
      items = [...items, ...services];
    }
  }

  return items.map(item => ({
    id: item.id,
    name: item.title || item.name,
    description: item.description,
    type: item.itemType || item.type,
    price: item.unitPrice || item.price,
    vatRate: item.taxRate || item.vatRate,
    category: item.category,
    // Additional info for display
    dosage: item.dosage,
    dosageUnit: item.dosageUnit,
    volume: item.volume,
    provenance: item.provenance,
    duration: item.duration
  }));
};

/**
 * Get a single product by ID with billing-relevant fields
 */
export const getProductForBilling = (productId) => {
  const item = catalogStorage.getResolved(productId);

  if (!item) {
    return null;
  }

  return {
    id: item.id,
    name: item.title || item.name,
    description: item.description,
    type: item.itemType || item.type,
    price: item.unitPrice || item.price,
    vatRate: item.taxRate || item.vatRate,
    category: item.category,
    dosage: item.dosage,
    dosageUnit: item.dosageUnit,
    volume: item.volume,
    provenance: item.provenance,
    duration: item.duration
  };
};

/**
 * Format product display name with details
 */
export const formatProductName = (product) => {
  let name = product.name;

  if (product.dosage && product.dosageUnit) {
    name += ` ${product.dosage}${product.dosageUnit}`;
  }

  if (product.volume) {
    name += ` (${product.volume}ml)`;
  }

  return name;
};

/**
 * Calculate line item total with VAT
 */
export const calculateLineTotal = (item, quantity = 1) => {
  const unitPrice = item.price || 0;
  const vatRate = item.vatRate || 0;

  const subtotal = unitPrice * quantity;
  const vatAmount = subtotal * (vatRate / 100);
  const total = subtotal + vatAmount;

  return {
    unitPrice,
    quantity,
    subtotal,
    vatRate,
    vatAmount,
    total
  };
};

/**
 * Create a quote/invoice line item from a catalog product
 */
export const createLineItemFromProduct = (productId, quantity = 1) => {
  const product = getProductForBilling(productId);

  if (!product) {
    return null;
  }

  const calculation = calculateLineTotal(product, quantity);

  return {
    catalogItemId: product.id,
    name: formatProductName(product),
    description: product.description || '',
    quantity,
    unitPrice: product.price,
    vatRate: product.vatRate,
    subtotal: calculation.subtotal,
    vatAmount: calculation.vatAmount,
    total: calculation.total,
    // Metadata for reference
    metadata: {
      type: product.type,
      category: product.category,
      originalProduct: {
        dosage: product.dosage,
        dosageUnit: product.dosageUnit,
        volume: product.volume,
        provenance: product.provenance
      }
    }
  };
};

/**
 * Get catalog item types configuration
 */
export const getCatalogTypes = () => {
  return Object.entries(CATALOG_TYPES).map(([key, config]) => ({
    id: key,
    ...config
  }));
};

/**
 * Check if a catalog item type impacts appointments
 */
export const typeImpactsAppointments = (type) => {
  return CATALOG_TYPES[type]?.impactsAppointments === true;
};

/**
 * Get default duration for a catalog item type
 */
export const getDefaultDurationForType = (type) => {
  return CATALOG_TYPES[type]?.defaultDuration || null;
};

/**
 * Search catalog items for autocomplete
 */
export const searchCatalog = (query, options = {}) => {
  const { type = null, limit = 10 } = options;

  const items = catalogStorage.search(query, {
    type,
    activeOnly: true,
    includeVariants: true
  });

  return items
    .slice(0, limit)
    .map(item => ({
      id: item.id,
      name: formatProductName({ ...item, name: item.title || item.name }),
      type: item.itemType || item.type,
      price: item.unitPrice || item.price,
      vatRate: item.taxRate || item.vatRate,
      duration: item.duration
    }));
};

/**
 * Get services grouped by category for appointment type selection
 */
export const getServicesGroupedByCategory = () => {
  const services = getServicesForAppointment();

  const grouped = {};

  services.forEach(service => {
    const category = service.category || 'uncategorized';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(service);
  });

  return grouped;
};

/**
 * Get products grouped by type for billing selection
 */
export const getProductsGroupedByType = (options = {}) => {
  const products = getProductsForBilling(options);

  const grouped = {
    medication: [],
    treatment: [],
    service: []
  };

  products.forEach(product => {
    if (grouped[product.type]) {
      grouped[product.type].push(product);
    }
  });

  return grouped;
};

/**
 * Validate that a catalog item exists and is active
 */
export const validateCatalogItem = (itemId) => {
  const item = catalogStorage.getById(itemId);

  if (!item) {
    return { valid: false, error: 'item.notFound' };
  }

  if (!item.isActive) {
    return { valid: false, error: 'item.inactive' };
  }

  return { valid: true, item };
};

/**
 * Get the price for a catalog item (handles variants with inheritance)
 */
export const getItemPrice = (itemId) => {
  const resolved = catalogStorage.getResolved(itemId);
  return resolved ? (resolved.unitPrice || resolved.price) : null;
};

/**
 * Get the VAT rate for a catalog item (handles variants with inheritance)
 */
export const getItemVatRate = (itemId) => {
  const resolved = catalogStorage.getResolved(itemId);
  return resolved ? (resolved.taxRate || resolved.vatRate) : null;
};

// Export all functions as named exports and as default object
export default {
  getServicesForAppointment,
  getTreatmentsForAppointment,
  getItemsForAppointment,
  getItemsForAppointmentAsync,
  getServiceForAppointment,
  getProductsForBilling,
  getProductForBilling,
  formatProductName,
  calculateLineTotal,
  createLineItemFromProduct,
  getCatalogTypes,
  typeImpactsAppointments,
  getDefaultDurationForType,
  searchCatalog,
  getServicesGroupedByCategory,
  getProductsGroupedByType,
  validateCatalogItem,
  getItemPrice,
  getItemVatRate
};
