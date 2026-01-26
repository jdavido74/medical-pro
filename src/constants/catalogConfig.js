/**
 * Catalog Configuration Constants
 * Defines types, units, conditional fields, and configuration for the medical catalog
 */

// Catalog item types
export const CATALOG_TYPES = {
  medication: {
    id: 'medication',
    fields: ['dosage', 'dosageUnit', 'provenance'],
    canHaveVariants: true,
    icon: 'Pill',
    defaultDuration: null
  },
  treatment: {
    id: 'treatment',
    fields: ['dosage', 'dosageUnit', 'volume', 'provenance', 'duration'],
    canHaveVariants: true,
    impactsAppointments: true,
    icon: 'Syringe',
    defaultDuration: 30
  },
  service: {
    id: 'service',
    fields: ['duration'],
    canHaveVariants: false,
    impactsAppointments: true,
    icon: 'Stethoscope',
    defaultDuration: 30
  }
};

// Dosage units
export const DOSAGE_UNITS = [
  { id: 'mg', label: 'mg', fullName: 'milligrams' },
  { id: 'ml', label: 'ml', fullName: 'milliliters' },
  { id: 'g', label: 'g', fullName: 'grams' },
  { id: 'ui', label: 'UI', fullName: 'international_units' },
  { id: 'mcg', label: 'mcg', fullName: 'micrograms' }
];

// Volume units (for treatments)
export const VOLUME_UNITS = [
  { id: 'ml', label: 'ml' },
  { id: 'l', label: 'L' }
];

// Duration presets in minutes
export const DURATION_PRESETS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1h' },
  { value: 90, label: '1h30' },
  { value: 120, label: '2h' }
];

// Field configuration for conditional rendering
export const FIELD_CONFIG = {
  dosage: {
    type: 'number',
    min: 0,
    step: 0.01,
    required: false,
    applicableTypes: ['medication', 'treatment']
  },
  dosageUnit: {
    type: 'select',
    options: DOSAGE_UNITS,
    required: false,
    applicableTypes: ['medication', 'treatment'],
    dependsOn: 'dosage'
  },
  volume: {
    type: 'number',
    min: 0,
    step: 0.1,
    unit: 'ml',
    required: false,
    applicableTypes: ['treatment']
  },
  provenance: {
    type: 'text',
    maxLength: 100,
    required: false,
    applicableTypes: ['medication', 'treatment']
  },
  duration: {
    type: 'number',
    min: 5,
    max: 480,
    step: 5,
    unit: 'minutes',
    required: false,
    applicableTypes: ['service', 'treatment']
  }
};

// Check if a field should be shown for a given type
export const shouldShowField = (fieldName, itemType) => {
  const typeConfig = CATALOG_TYPES[itemType];
  return typeConfig && typeConfig.fields.includes(fieldName);
};

// Check if a type can have variants
export const canHaveVariants = (itemType) => {
  const typeConfig = CATALOG_TYPES[itemType];
  return typeConfig && typeConfig.canHaveVariants;
};

// Check if a type impacts appointments
export const impactsAppointments = (itemType) => {
  const typeConfig = CATALOG_TYPES[itemType];
  return typeConfig && typeConfig.impactsAppointments;
};

// Get default duration for a type
export const getDefaultDuration = (itemType) => {
  const typeConfig = CATALOG_TYPES[itemType];
  return typeConfig ? typeConfig.defaultDuration : null;
};

// Get all fields for a type
export const getFieldsForType = (itemType) => {
  const typeConfig = CATALOG_TYPES[itemType];
  return typeConfig ? typeConfig.fields : [];
};

// Storage keys
export const STORAGE_KEYS = {
  CATALOG_ITEMS: 'clinicmanager_catalog_items',
  CATALOG_CATEGORIES: 'clinicmanager_catalog_categories',
  CATALOG_SETTINGS: 'clinicmanager_catalog_settings'
};

// Default item template
export const getDefaultCatalogItem = (type = 'medication') => ({
  id: null,
  parentId: null,
  type,
  isFamily: false,
  isVariant: false,
  name: '',
  description: '',
  category: '',
  price: 0,
  vatRate: 20,
  isActive: true,
  dosage: null,
  dosageUnit: null,
  volume: null,
  provenance: null,
  duration: getDefaultDuration(type),
  prepBefore: 0,
  prepAfter: 0,
  variants: [],
  createdAt: null,
  updatedAt: null,
  createdBy: null
});

// Validation rules
export const VALIDATION_RULES = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 100
  },
  price: {
    required: true,
    min: 0,
    max: 999999.99
  },
  vatRate: {
    required: true,
    allowedValues: [0, 4, 5.5, 10, 20, 21] // FR + ES rates
  },
  dosage: {
    min: 0,
    max: 999999
  },
  volume: {
    min: 0,
    max: 10000
  },
  duration: {
    min: 5,
    max: 480
  }
};

// Validate a catalog item
export const validateCatalogItem = (item) => {
  const errors = {};

  // Name validation
  if (!item.name || item.name.trim().length < VALIDATION_RULES.name.minLength) {
    errors.name = 'validation.name.minLength';
  } else if (item.name.length > VALIDATION_RULES.name.maxLength) {
    errors.name = 'validation.name.maxLength';
  }

  // Price validation
  if (item.price === undefined || item.price === null || item.price === '') {
    errors.price = 'validation.price.required';
  } else if (item.price < VALIDATION_RULES.price.min) {
    errors.price = 'validation.price.min';
  } else if (item.price > VALIDATION_RULES.price.max) {
    errors.price = 'validation.price.max';
  }

  // VAT validation
  if (!VALIDATION_RULES.vatRate.allowedValues.includes(Number(item.vatRate))) {
    errors.vatRate = 'validation.vatRate.invalid';
  }

  // Type-specific validations
  if (item.dosage !== null && item.dosage !== undefined && item.dosage !== '') {
    if (item.dosage < VALIDATION_RULES.dosage.min || item.dosage > VALIDATION_RULES.dosage.max) {
      errors.dosage = 'validation.dosage.range';
    }
  }

  if (item.volume !== null && item.volume !== undefined && item.volume !== '') {
    if (item.volume < VALIDATION_RULES.volume.min || item.volume > VALIDATION_RULES.volume.max) {
      errors.volume = 'validation.volume.range';
    }
  }

  if (item.duration !== null && item.duration !== undefined && item.duration !== '') {
    if (item.duration < VALIDATION_RULES.duration.min || item.duration > VALIDATION_RULES.duration.max) {
      errors.duration = 'validation.duration.range';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export default {
  CATALOG_TYPES,
  DOSAGE_UNITS,
  VOLUME_UNITS,
  DURATION_PRESETS,
  FIELD_CONFIG,
  STORAGE_KEYS,
  VALIDATION_RULES,
  shouldShowField,
  canHaveVariants,
  impactsAppointments,
  getDefaultDuration,
  getFieldsForType,
  getDefaultCatalogItem,
  validateCatalogItem
};
