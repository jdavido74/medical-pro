// src/config/countries/spain.js
export const SPAIN_CONFIG = {
  country: {
    code: 'ES',
    name: 'España',
    currency: 'EUR',
    locale: 'es-ES',
    defaultLanguage: 'es',
    availableLanguages: ['es', 'en']
  },
  
  taxation: {
    defaultRate: 21,
    rates: [
      { rate: 0, label: 'Exento', description: 'IVA 0%' },
      { rate: 4, label: 'Superreducido', description: 'Productos básicos' },
      { rate: 10, label: 'Reducido', description: 'Cultura, deporte' },
      { rate: 21, label: 'General', description: 'Tipo general' }
    ],
    vatLabel: 'IVA',
    vatNumber: {
      required: true,
      format: /^ES[A-Z0-9][0-9]{7}[A-Z0-9]$/,
      placeholder: 'ESA12345674'
    }
  },
  
  business: {
    registrationNumber: {
      field: 'cif',
      label: 'CIF/NIF',
      format: /^[A-Z0-9][0-9]{7}[A-Z0-9]$/,
      placeholder: 'A12345674',
      required: true,
      length: 9
    },
    addressFormat: {
      fields: ['address', 'postalCode', 'city', 'province', 'country'],
      postalCodeFormat: /^\d{5}$/,
      postalCodePlaceholder: '28001'
    }
  },
  
  invoice: {
    numberPattern: 'FACT-{YYYY}-{NNNN}',
    legalMentions: [
      'Factura sujeta a IVA',
      'Régimen General del IVA',
      'Conservar durante 4 años'
    ],
    requiredFields: ['number', 'date', 'dueDate', 'clientName', 'amount', 'cifNif'],
    paymentTermsOptions: [
      { value: 0, label: 'Pago al contado' },
      { value: 15, label: '15 días' },
      { value: 30, label: '30 días' },
      { value: 60, label: '60 días' },
      { value: 90, label: '90 días' }
    ]
  },
  
  compliance: {
    standard: 'EN 16931',
    digitalSignatureRequired: true,
    archivingPeriod: 4,
    formats: ['PDF/A-3', 'XML'],
    regulations: [
      'Ley 37/1992 del IVA',
      'Real Decreto 1619/2012',
      'Ley 11/2020 (SII - Suministro Inmediato de Información)'
    ]
  },
  
  validation: {
    phone: /^(?:\+34|34|0)?[6-9][0-9]{8}$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    postalCode: /^\d{5}$/
  }
};