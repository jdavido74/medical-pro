/**
 * Catalog Storage
 * Manages catalog items with support for families and variants
 */

import { STORAGE_KEYS, getDefaultCatalogItem, validateCatalogItem } from '../constants/catalogConfig';

const STORAGE_KEY = STORAGE_KEYS.CATALOG_ITEMS;

// Generate unique ID
const generateId = () => `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Get all items from storage
const getAll = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading catalog items:', error);
    return [];
  }
};

// Save all items to storage
const saveAll = (items) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    return true;
  } catch (error) {
    console.error('Error saving catalog items:', error);
    return false;
  }
};

// Get a single item by ID
const getById = (id) => {
  const items = getAll();
  return items.find(item => item.id === id) || null;
};

// Get item with resolved inheritance (for variants)
const getResolved = (id) => {
  const items = getAll();
  const item = items.find(i => i.id === id);

  if (!item) return null;

  // If not a variant, return as-is
  if (!item.isVariant || !item.parentId) {
    return item;
  }

  // Get parent and merge
  const parent = items.find(i => i.id === item.parentId);
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
  const items = getAll();
  return items.filter(item => item.isFamily);
};

// Get variants for a family
const getVariants = (familyId) => {
  const items = getAll();
  return items.filter(item => item.parentId === familyId && item.isVariant);
};

// Get all items by type
const getByType = (type) => {
  const items = getAll();
  return items.filter(item => item.type === type);
};

// Get all items by category
const getByCategory = (categoryId) => {
  const items = getAll();
  return items.filter(item => item.category === categoryId);
};

// Get active items only
const getActive = () => {
  const items = getAll();
  return items.filter(item => item.isActive);
};

// Get items for selection (active, non-family items with resolved data)
const getForSelection = (type = null) => {
  const items = getAll();
  return items
    .filter(item => item.isActive && !item.isFamily)
    .filter(item => !type || item.type === type)
    .map(item => getResolved(item.id));
};

// Search items
const search = (query, options = {}) => {
  const items = getAll();
  const lowerQuery = query.toLowerCase();
  const { type, category, activeOnly = true, includeVariants = true } = options;

  return items.filter(item => {
    // Active filter
    if (activeOnly && !item.isActive) return false;

    // Type filter
    if (type && item.type !== type) return false;

    // Category filter
    if (category && item.category !== category) return false;

    // Variant filter
    if (!includeVariants && item.isVariant) return false;

    // Text search
    const searchableText = [
      item.name,
      item.description,
      item.provenance
    ].filter(Boolean).join(' ').toLowerCase();

    return searchableText.includes(lowerQuery);
  });
};

// Create a new item
const create = (itemData, userId = null) => {
  const validation = validateCatalogItem(itemData);
  if (!validation.isValid) {
    return { success: false, errors: validation.errors };
  }

  const items = getAll();
  const now = new Date().toISOString();

  const newItem = {
    ...getDefaultCatalogItem(itemData.type),
    ...itemData,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
    createdBy: userId
  };

  // If creating a variant, link to parent
  if (newItem.isVariant && newItem.parentId) {
    const parentIndex = items.findIndex(i => i.id === newItem.parentId);
    if (parentIndex !== -1) {
      // Add variant ID to parent's variants array
      if (!items[parentIndex].variants) {
        items[parentIndex].variants = [];
      }
      items[parentIndex].variants.push(newItem.id);
    }
  }

  items.push(newItem);

  if (saveAll(items)) {
    return { success: true, item: newItem };
  }

  return { success: false, errors: { general: 'storage.error' } };
};

// Create a family with variants
const createFamily = (familyData, variantsData, userId = null) => {
  const items = getAll();
  const now = new Date().toISOString();

  // Create the family item
  const family = {
    ...getDefaultCatalogItem(familyData.type),
    ...familyData,
    id: generateId(),
    isFamily: true,
    isVariant: false,
    variants: [],
    createdAt: now,
    updatedAt: now,
    createdBy: userId
  };

  // Create variants
  const variants = variantsData.map(variantData => {
    const variantId = generateId();
    family.variants.push(variantId);

    return {
      ...getDefaultCatalogItem(familyData.type),
      ...variantData,
      id: variantId,
      parentId: family.id,
      isFamily: false,
      isVariant: true,
      type: family.type, // Inherit type from family
      createdAt: now,
      updatedAt: now,
      createdBy: userId
    };
  });

  items.push(family, ...variants);

  if (saveAll(items)) {
    return { success: true, family, variants };
  }

  return { success: false, errors: { general: 'storage.error' } };
};

// Update an item
const update = (id, updates) => {
  const items = getAll();
  const index = items.findIndex(i => i.id === id);

  if (index === -1) {
    return { success: false, errors: { general: 'item.notFound' } };
  }

  const currentItem = items[index];

  // Merge updates
  const updatedItem = {
    ...currentItem,
    ...updates,
    id, // Prevent ID change
    updatedAt: new Date().toISOString()
  };

  // Validate
  const validation = validateCatalogItem(updatedItem);
  if (!validation.isValid) {
    return { success: false, errors: validation.errors };
  }

  items[index] = updatedItem;

  // If this is a family, propagate inheritable changes to variants
  if (currentItem.isFamily && currentItem.variants && currentItem.variants.length > 0) {
    const inheritableFields = ['type', 'category', 'provenance', 'vatRate'];
    const changedInheritableFields = inheritableFields.filter(
      field => updates[field] !== undefined && updates[field] !== currentItem[field]
    );

    if (changedInheritableFields.length > 0) {
      currentItem.variants.forEach(variantId => {
        const variantIndex = items.findIndex(i => i.id === variantId);
        if (variantIndex !== -1) {
          // Only update fields that the variant hasn't explicitly overridden
          changedInheritableFields.forEach(field => {
            if (items[variantIndex][field] === currentItem[field] ||
                items[variantIndex][field] === null ||
                items[variantIndex][field] === undefined) {
              items[variantIndex][field] = updates[field];
            }
          });
          items[variantIndex].updatedAt = new Date().toISOString();
        }
      });
    }
  }

  if (saveAll(items)) {
    return { success: true, item: updatedItem };
  }

  return { success: false, errors: { general: 'storage.error' } };
};

// Delete an item
const remove = (id) => {
  const items = getAll();
  const index = items.findIndex(i => i.id === id);

  if (index === -1) {
    return { success: false, errors: { general: 'item.notFound' } };
  }

  const item = items[index];

  // If deleting a family, also delete all variants
  if (item.isFamily && item.variants && item.variants.length > 0) {
    const variantIds = [...item.variants];
    variantIds.forEach(variantId => {
      const variantIndex = items.findIndex(i => i.id === variantId);
      if (variantIndex !== -1) {
        items.splice(variantIndex, 1);
      }
    });
    // Re-find the family index after removing variants
    const newIndex = items.findIndex(i => i.id === id);
    if (newIndex !== -1) {
      items.splice(newIndex, 1);
    }
  } else {
    // If deleting a variant, remove from parent's variants array
    if (item.isVariant && item.parentId) {
      const parentIndex = items.findIndex(i => i.id === item.parentId);
      if (parentIndex !== -1 && items[parentIndex].variants) {
        items[parentIndex].variants = items[parentIndex].variants.filter(v => v !== id);
      }
    }
    items.splice(index, 1);
  }

  if (saveAll(items)) {
    return { success: true };
  }

  return { success: false, errors: { general: 'storage.error' } };
};

// Add a variant to an existing family
const addVariant = (familyId, variantData, userId = null) => {
  const items = getAll();
  const familyIndex = items.findIndex(i => i.id === familyId && i.isFamily);

  if (familyIndex === -1) {
    return { success: false, errors: { general: 'family.notFound' } };
  }

  const family = items[familyIndex];
  const now = new Date().toISOString();

  const variant = {
    ...getDefaultCatalogItem(family.type),
    ...variantData,
    id: generateId(),
    parentId: familyId,
    isFamily: false,
    isVariant: true,
    type: family.type,
    createdAt: now,
    updatedAt: now,
    createdBy: userId
  };

  // Add variant ID to family
  if (!items[familyIndex].variants) {
    items[familyIndex].variants = [];
  }
  items[familyIndex].variants.push(variant.id);

  items.push(variant);

  if (saveAll(items)) {
    return { success: true, variant };
  }

  return { success: false, errors: { general: 'storage.error' } };
};

// Convert a regular item to a family
const convertToFamily = (id) => {
  const items = getAll();
  const index = items.findIndex(i => i.id === id);

  if (index === -1) {
    return { success: false, errors: { general: 'item.notFound' } };
  }

  if (items[index].isVariant) {
    return { success: false, errors: { general: 'variant.cannotConvert' } };
  }

  items[index] = {
    ...items[index],
    isFamily: true,
    variants: [],
    updatedAt: new Date().toISOString()
  };

  if (saveAll(items)) {
    return { success: true, item: items[index] };
  }

  return { success: false, errors: { general: 'storage.error' } };
};

// Toggle active status
const toggleActive = (id) => {
  const items = getAll();
  const index = items.findIndex(i => i.id === id);

  if (index === -1) {
    return { success: false, errors: { general: 'item.notFound' } };
  }

  items[index] = {
    ...items[index],
    isActive: !items[index].isActive,
    updatedAt: new Date().toISOString()
  };

  if (saveAll(items)) {
    return { success: true, item: items[index] };
  }

  return { success: false, errors: { general: 'storage.error' } };
};

// Duplicate an item
const duplicate = (id, userId = null) => {
  const item = getById(id);

  if (!item) {
    return { success: false, errors: { general: 'item.notFound' } };
  }

  const duplicatedItem = {
    ...item,
    id: undefined, // Will be generated
    name: `${item.name} (copy)`,
    isFamily: false,
    isVariant: false,
    parentId: null,
    variants: []
  };

  return create(duplicatedItem, userId);
};

// Import items from array
const importItems = (itemsData, userId = null, options = { overwrite: false }) => {
  const existingItems = options.overwrite ? [] : getAll();
  const results = { success: [], errors: [] };
  const now = new Date().toISOString();

  itemsData.forEach((itemData, index) => {
    const validation = validateCatalogItem(itemData);
    if (!validation.isValid) {
      results.errors.push({ index, errors: validation.errors });
      return;
    }

    const newItem = {
      ...getDefaultCatalogItem(itemData.type),
      ...itemData,
      id: itemData.id || generateId(),
      createdAt: itemData.createdAt || now,
      updatedAt: now,
      createdBy: userId
    };

    existingItems.push(newItem);
    results.success.push(newItem);
  });

  if (saveAll(existingItems)) {
    return { success: true, ...results };
  }

  return { success: false, errors: [{ general: 'storage.error' }] };
};

// Export items
const exportItems = (options = {}) => {
  let items = getAll();

  if (options.type) {
    items = items.filter(i => i.type === options.type);
  }

  if (options.activeOnly) {
    items = items.filter(i => i.isActive);
  }

  return items;
};

// Get statistics
const getStats = () => {
  const items = getAll();

  return {
    total: items.length,
    active: items.filter(i => i.isActive).length,
    inactive: items.filter(i => !i.isActive).length,
    byType: {
      medication: items.filter(i => i.type === 'medication').length,
      treatment: items.filter(i => i.type === 'treatment').length,
      service: items.filter(i => i.type === 'service').length
    },
    families: items.filter(i => i.isFamily).length,
    variants: items.filter(i => i.isVariant).length
  };
};

// Clear all items
const clearAll = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing catalog:', error);
    return false;
  }
};

// Export storage module
export const catalogStorage = {
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
  create,
  createFamily,
  update,
  remove,
  addVariant,
  convertToFamily,
  toggleActive,
  duplicate,
  importItems,
  exportItems,
  getStats,
  clearAll
};

export default catalogStorage;
