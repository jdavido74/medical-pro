/**
 * Catalog Categories Storage
 * Manages user-defined categories for catalog items
 */

import { STORAGE_KEYS } from '../constants/catalogConfig';

const STORAGE_KEY = STORAGE_KEYS.CATALOG_CATEGORIES;

// Default categories per type
const DEFAULT_CATEGORIES = {
  medication: [
    { id: 'vitamins', name: 'Vitamins & Supplements', color: '#10B981' },
    { id: 'antibiotics', name: 'Antibiotics', color: '#EF4444' },
    { id: 'painkillers', name: 'Pain Relief', color: '#F59E0B' },
    { id: 'dermatology', name: 'Dermatology', color: '#8B5CF6' }
  ],
  treatment: [
    { id: 'injections', name: 'Injections', color: '#3B82F6' },
    { id: 'aesthetic', name: 'Aesthetic', color: '#EC4899' },
    { id: 'therapy', name: 'Therapy', color: '#06B6D4' },
    { id: 'preventive', name: 'Preventive Care', color: '#84CC16' }
  ],
  service: [
    { id: 'consultation', name: 'Consultations', color: '#6366F1' },
    { id: 'diagnostic', name: 'Diagnostics', color: '#14B8A6' },
    { id: 'followup', name: 'Follow-up', color: '#F97316' },
    { id: 'emergency', name: 'Emergency', color: '#DC2626' }
  ]
};

// Generate unique ID
const generateId = () => `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Get all categories from storage
const getAll = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    // Initialize with defaults if empty
    const defaults = { ...DEFAULT_CATEGORIES };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    return defaults;
  } catch (error) {
    console.error('Error reading catalog categories:', error);
    return { ...DEFAULT_CATEGORIES };
  }
};

// Get categories for a specific type
const getByType = (type) => {
  const all = getAll();
  return all[type] || [];
};

// Get a single category by ID
const getById = (categoryId) => {
  const all = getAll();
  for (const type of Object.keys(all)) {
    const found = all[type].find(cat => cat.id === categoryId);
    if (found) {
      return { ...found, type };
    }
  }
  return null;
};

// Add a new category
const add = (type, category) => {
  const all = getAll();

  if (!all[type]) {
    all[type] = [];
  }

  const newCategory = {
    id: generateId(),
    name: category.name,
    color: category.color || '#6B7280',
    createdAt: new Date().toISOString()
  };

  all[type].push(newCategory);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return newCategory;
  } catch (error) {
    console.error('Error adding category:', error);
    return null;
  }
};

// Update a category
const update = (categoryId, updates) => {
  const all = getAll();

  for (const type of Object.keys(all)) {
    const index = all[type].findIndex(cat => cat.id === categoryId);
    if (index !== -1) {
      all[type][index] = {
        ...all[type][index],
        ...updates,
        id: categoryId, // Prevent ID change
        updatedAt: new Date().toISOString()
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
        return all[type][index];
      } catch (error) {
        console.error('Error updating category:', error);
        return null;
      }
    }
  }

  return null;
};

// Delete a category
const remove = (categoryId) => {
  const all = getAll();

  for (const type of Object.keys(all)) {
    const index = all[type].findIndex(cat => cat.id === categoryId);
    if (index !== -1) {
      all[type].splice(index, 1);

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
        return true;
      } catch (error) {
        console.error('Error removing category:', error);
        return false;
      }
    }
  }

  return false;
};

// Check if category has items (for deletion warning)
const hasItems = (categoryId, catalogItems) => {
  return catalogItems.some(item => item.category === categoryId);
};

// Reorder categories within a type
const reorder = (type, orderedIds) => {
  const all = getAll();

  if (!all[type]) {
    return false;
  }

  const reordered = orderedIds
    .map(id => all[type].find(cat => cat.id === id))
    .filter(Boolean);

  // Add any categories not in the ordered list at the end
  const remaining = all[type].filter(cat => !orderedIds.includes(cat.id));
  all[type] = [...reordered, ...remaining];

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return true;
  } catch (error) {
    console.error('Error reordering categories:', error);
    return false;
  }
};

// Reset to default categories
const resetToDefaults = (type = null) => {
  const all = getAll();

  if (type) {
    all[type] = [...DEFAULT_CATEGORIES[type]];
  } else {
    Object.keys(DEFAULT_CATEGORIES).forEach(t => {
      all[t] = [...DEFAULT_CATEGORIES[t]];
    });
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return true;
  } catch (error) {
    console.error('Error resetting categories:', error);
    return false;
  }
};

// Search categories by name
const search = (query) => {
  const all = getAll();
  const results = [];
  const lowerQuery = query.toLowerCase();

  Object.keys(all).forEach(type => {
    all[type].forEach(cat => {
      if (cat.name.toLowerCase().includes(lowerQuery)) {
        results.push({ ...cat, type });
      }
    });
  });

  return results;
};

// Get all categories as flat array with type info
const getAllFlat = () => {
  const all = getAll();
  const results = [];

  Object.keys(all).forEach(type => {
    all[type].forEach(cat => {
      results.push({ ...cat, type });
    });
  });

  return results;
};

// Export storage module
export const catalogCategoriesStorage = {
  getAll,
  getByType,
  getById,
  add,
  update,
  remove,
  hasItems,
  reorder,
  resetToDefaults,
  search,
  getAllFlat,
  DEFAULT_CATEGORIES
};

export default catalogCategoriesStorage;
