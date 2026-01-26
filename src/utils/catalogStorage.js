/**
 * Catalog Storage
 * Manages catalog items via backend API with local caching
 * Supports families and variants with inheritance
 */

import catalogApi from '../api/catalogApi';
// Config imports removed - validation is handled by the form component

// Local cache for performance
let cache = {
  items: [],
  lastFetch: null,
  isFetching: false,
  initialized: false
};

const CACHE_TTL = 60000; // 1 minute cache TTL

// Check if cache is valid
const isCacheValid = () => {
  return cache.initialized && cache.lastFetch && (Date.now() - cache.lastFetch) < CACHE_TTL;
};

// Invalidate cache
const invalidateCache = () => {
  cache.lastFetch = null;
};

// Fetch all items from API and update cache
const fetchAll = async (force = false) => {
  if (!force && isCacheValid()) {
    return cache.items;
  }

  if (cache.isFetching) {
    // Wait for ongoing fetch
    return new Promise(resolve => {
      const check = setInterval(() => {
        if (!cache.isFetching) {
          clearInterval(check);
          resolve(cache.items);
        }
      }, 50);
    });
  }

  try {
    cache.isFetching = true;
    const response = await catalogApi.getCatalogItems({ limit: 1000, includeVariants: true });

    if (response.success) {
      cache.items = response.data || [];
      cache.lastFetch = Date.now();
      cache.initialized = true;
    }

    return cache.items;
  } catch (error) {
    console.error('[catalogStorage] Error fetching items:', error);
    return cache.items; // Return cached data on error
  } finally {
    cache.isFetching = false;
  }
};

// Get all items (sync from cache, async refresh in background)
const getAll = () => {
  // Trigger async refresh if needed
  if (!isCacheValid()) {
    fetchAll();
  }
  return cache.items;
};

// Get all items async (ensures fresh data)
const getAllAsync = async () => {
  await fetchAll(true);
  return cache.items;
};

// Get a single item by ID
const getById = (id) => {
  return cache.items.find(item => item.id === id) || null;
};

// Get a single item by ID async
const getByIdAsync = async (id) => {
  try {
    const response = await catalogApi.getCatalogItem(id);
    if (response.success) {
      // Update cache
      const index = cache.items.findIndex(i => i.id === id);
      if (index !== -1) {
        cache.items[index] = response.data;
      } else {
        cache.items.push(response.data);
      }
      return response.data;
    }
    return null;
  } catch (error) {
    console.error('[catalogStorage] Error fetching item:', error);
    return getById(id); // Fallback to cache
  }
};

// Get item with resolved inheritance (for variants)
const getResolved = (id) => {
  const item = cache.items.find(i => i.id === id);

  if (!item) return null;

  // If not a variant, return as-is
  if (!item.isVariant || !item.parentId) {
    return item;
  }

  // Get parent and merge
  const parent = cache.items.find(i => i.id === item.parentId);
  if (!parent) {
    return item;
  }

  // Variant inherits from parent, but its own values override
  return {
    ...parent,
    ...Object.fromEntries(
      Object.entries(item).filter(([_, v]) => v !== null && v !== undefined && v !== '')
    ),
    id: item.id,
    parentId: item.parentId,
    isVariant: true,
    isFamily: false
  };
};

// Get all families (items that can have variants)
const getFamilies = () => {
  return cache.items.filter(item => item.isFamily);
};

// Get families async from API
const getFamiliesAsync = async () => {
  try {
    const response = await catalogApi.getCatalogFamilies();
    if (response.success) {
      return response.data || [];
    }
    return getFamilies(); // Fallback to cache
  } catch (error) {
    console.error('[catalogStorage] Error fetching families:', error);
    return getFamilies();
  }
};

// Get variants for a family
const getVariants = (familyId) => {
  return cache.items.filter(item => item.parentId === familyId && item.isVariant);
};

// Get all items by type
const getByType = (type) => {
  return cache.items.filter(item => item.itemType === type);
};

// Get all items by category
const getByCategory = (categoryId) => {
  return cache.items.filter(item => item.category === categoryId);
};

// Get active items only
const getActive = () => {
  return cache.items.filter(item => item.isActive);
};

// Get items for selection (active, non-family items with resolved data)
const getForSelection = (type = null) => {
  return cache.items
    .filter(item => item.isActive && !item.isFamily)
    .filter(item => !type || item.itemType === type)
    .map(item => getResolved(item.id));
};

// Search items
const search = (query, options = {}) => {
  const lowerQuery = query.toLowerCase();
  const { type, category, activeOnly = true, includeVariants = true } = options;

  return cache.items.filter(item => {
    // Active filter
    if (activeOnly && !item.isActive) return false;

    // Type filter
    if (type && item.itemType !== type) return false;

    // Category filter
    if (category && item.category !== category) return false;

    // Variant filter
    if (!includeVariants && item.isVariant) return false;

    // Text search
    const searchableText = [
      item.title,
      item.description,
      item.provenance,
      item.sku
    ].filter(Boolean).join(' ').toLowerCase();

    return searchableText.includes(lowerQuery);
  });
};

// Search async via API
const searchAsync = async (query, options = {}) => {
  try {
    const response = await catalogApi.searchCatalog(query, options);
    if (response.success) {
      return response.data || [];
    }
    return search(query, options); // Fallback to local search
  } catch (error) {
    console.error('[catalogStorage] Error searching:', error);
    return search(query, options);
  }
};

// Create a new item
const create = async (itemData, userId = null) => {
  // Note: Validation is done in the form before calling this function
  // itemData already has 'title' (not 'name') when coming from CatalogFormModal

  try {
    // Ensure we have title (could come as 'name' from legacy code or 'title' from form)
    const apiData = {
      ...itemData,
      title: itemData.title || itemData.name
    };
    delete apiData.name;

    const response = await catalogApi.createCatalogItem(apiData);

    if (response.success) {
      // Transform response back (title to name for compatibility)
      const item = {
        ...response.data,
        name: response.data.title
      };

      // Update cache
      cache.items.push(item);

      return { success: true, item };
    }

    return { success: false, errors: { general: response.error?.message || 'api.error' } };
  } catch (error) {
    console.error('[catalogStorage] Error creating item:', error);
    return { success: false, errors: { general: error.message || 'api.error' } };
  }
};

// Create a family with variants
const createFamily = async (familyData, variantsData, userId = null) => {
  try {
    // Create family first
    const familyApiData = {
      ...familyData,
      title: familyData.name || familyData.title,
      isFamily: true,
      isVariant: false
    };
    delete familyApiData.name;

    const familyResponse = await catalogApi.createCatalogItem(familyApiData);

    if (!familyResponse.success) {
      return { success: false, errors: { general: familyResponse.error?.message || 'api.error' } };
    }

    const family = {
      ...familyResponse.data,
      name: familyResponse.data.title
    };

    // Create variants
    const variants = [];
    for (const variantData of variantsData) {
      const variantApiData = {
        ...variantData,
        title: variantData.name || variantData.title
      };
      delete variantApiData.name;

      const variantResponse = await catalogApi.createVariant(family.id, variantApiData);
      if (variantResponse.success) {
        variants.push({
          ...variantResponse.data,
          name: variantResponse.data.title
        });
      }
    }

    // Update cache
    cache.items.push(family, ...variants);
    invalidateCache();

    return { success: true, family, variants };
  } catch (error) {
    console.error('[catalogStorage] Error creating family:', error);
    return { success: false, errors: { general: error.message || 'api.error' } };
  }
};

// Update an item
const update = async (id, updates) => {
  try {
    // Transform name to title if present
    const apiUpdates = { ...updates };
    if (apiUpdates.name) {
      apiUpdates.title = apiUpdates.name;
      delete apiUpdates.name;
    }

    const response = await catalogApi.updateCatalogItem(id, apiUpdates);

    if (response.success) {
      const item = {
        ...response.data,
        name: response.data.title
      };

      // Update cache
      const index = cache.items.findIndex(i => i.id === id);
      if (index !== -1) {
        cache.items[index] = item;
      }

      return { success: true, item };
    }

    return { success: false, errors: { general: response.error?.message || 'api.error' } };
  } catch (error) {
    console.error('[catalogStorage] Error updating item:', error);
    return { success: false, errors: { general: error.message || 'api.error' } };
  }
};

// Delete an item
const remove = async (id) => {
  try {
    const response = await catalogApi.deleteCatalogItem(id);

    if (response.success) {
      // Remove from cache
      const index = cache.items.findIndex(i => i.id === id);
      if (index !== -1) {
        const item = cache.items[index];

        // If deleting a family, also remove variants from cache
        if (item.isFamily) {
          cache.items = cache.items.filter(i => i.parentId !== id && i.id !== id);
        } else {
          cache.items.splice(index, 1);
        }
      }

      return { success: true };
    }

    return { success: false, errors: { general: response.error?.message || 'api.error' } };
  } catch (error) {
    console.error('[catalogStorage] Error deleting item:', error);
    return { success: false, errors: { general: error.message || 'api.error' } };
  }
};

// Add a variant to an existing family
const addVariant = async (familyId, variantData, userId = null) => {
  try {
    const variantApiData = {
      ...variantData,
      title: variantData.name || variantData.title
    };
    delete variantApiData.name;

    const response = await catalogApi.createVariant(familyId, variantApiData);

    if (response.success) {
      const variant = {
        ...response.data,
        name: response.data.title
      };

      // Update cache
      cache.items.push(variant);

      return { success: true, variant };
    }

    return { success: false, errors: { general: response.error?.message || 'api.error' } };
  } catch (error) {
    console.error('[catalogStorage] Error adding variant:', error);
    return { success: false, errors: { general: error.message || 'api.error' } };
  }
};

// Convert a regular item to a family
const convertToFamily = async (id) => {
  return update(id, { isFamily: true });
};

// Toggle active status
const toggleActive = async (id) => {
  const item = getById(id);
  if (!item) {
    return { success: false, errors: { general: 'item.notFound' } };
  }

  return update(id, { isActive: !item.isActive });
};

// Duplicate an item
const duplicate = async (id, userId = null) => {
  try {
    const response = await catalogApi.duplicateCatalogItem(id);

    if (response.success) {
      const item = {
        ...response.data,
        name: response.data.title
      };

      // Update cache
      cache.items.push(item);

      return { success: true, item };
    }

    return { success: false, errors: { general: response.error?.message || 'api.error' } };
  } catch (error) {
    console.error('[catalogStorage] Error duplicating item:', error);
    return { success: false, errors: { general: error.message || 'api.error' } };
  }
};

// Get statistics
const getStats = () => {
  const items = cache.items;

  return {
    total: items.length,
    active: items.filter(i => i.isActive).length,
    inactive: items.filter(i => !i.isActive).length,
    byType: {
      medication: items.filter(i => i.itemType === 'medication').length,
      treatment: items.filter(i => i.itemType === 'treatment').length,
      service: items.filter(i => i.itemType === 'service').length,
      products: items.filter(i => i.itemType === 'product').length
    },
    families: items.filter(i => i.isFamily).length,
    variants: items.filter(i => i.isVariant).length
  };
};

// Get statistics async from API
const getStatsAsync = async () => {
  try {
    const response = await catalogApi.getCatalogStats();
    if (response.success) {
      return response.data;
    }
    return getStats(); // Fallback to local stats
  } catch (error) {
    console.error('[catalogStorage] Error fetching stats:', error);
    return getStats();
  }
};

// Get items for appointments async
const getForAppointmentsAsync = async () => {
  try {
    const response = await catalogApi.getItemsForAppointments();
    if (response.success) {
      return response.data || [];
    }
    return [];
  } catch (error) {
    console.error('[catalogStorage] Error fetching items for appointments:', error);
    return [];
  }
};

// Initialize - fetch data on module load
const initialize = async () => {
  if (!cache.initialized) {
    await fetchAll(true);
  }
  return cache.items;
};

// Clear cache
const clearCache = () => {
  cache = {
    items: [],
    lastFetch: null,
    isFetching: false,
    initialized: false
  };
};

// Export storage module
export const catalogStorage = {
  // Sync methods (from cache)
  getAll,
  getById,
  getResolved,
  getFamilies,
  getVariants,
  getByType,
  getByCategory,
  getActive,
  getForSelection,
  search,
  getStats,

  // Async methods (from API)
  getAllAsync,
  getByIdAsync,
  getFamiliesAsync,
  searchAsync,
  getStatsAsync,
  getForAppointmentsAsync,

  // CRUD operations (all async)
  create,
  createFamily,
  update,
  remove,
  addVariant,
  convertToFamily,
  toggleActive,
  duplicate,

  // Cache management
  initialize,
  invalidateCache,
  clearCache,
  fetchAll
};

export default catalogStorage;
