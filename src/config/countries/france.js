// src/config/countries/france.js
export const FRANCE_CONFIG = {
  country: {
    code: 'FR',
    name: 'France',
    currency: 'EUR',
    locale: 'fr-FR',
    defaultLanguage: 'fr',
    availableLanguages: ['fr', 'en']
  },
  
  taxation: {
    defaultRate: 20,
    rates: [
      { rate: 0, label: 'Exonéré', description: 'TVA 0%' },
      { rate: 5.5, label: 'Réduit', description: 'Livres, produits première nécessité' },
      { rate: 10, label: 'Intermédiaire', description: 'Restauration, transport' },
      { rate: 20, label: 'Normal', description: 'Taux standard' }
    ],
    vatLabel: 'TVA',
    vatNumber: {
      required: false,
      format: /^FR[0-9A-Z]{2}[0-9]{9}$/,
      placeholder: 'FR12345678901'
    }
  },
  
  business: {
    registrationNumber: {
      field: 'siret',
      label: 'SIRET',
      format: /^\d{14}$/,
      placeholder: '12345678901234',
      required: false,
      length: 14
    },
    addressFormat: {
      fields: ['address', 'postalCode', 'city', 'country'],
      postalCodeFormat: /^\d{5}$/,
      postalCodePlaceholder: '75001'
    }
  },
  
  invoice: {
    numberPattern: 'FAC-{YYYY}-{NNNN}',
    legalMentions: [
      'TVA non applicable, art. 293 B du CGI',
      'Dispensé d\'immatriculation au RCS',
      'Ne pas jeter sur la voie publique'
    ],
    requiredFields: ['number', 'date', 'dueDate', 'clientName', 'amount'],
    paymentTermsOptions: [
      { value: 0, label: 'Paiement à réception' },
      { value: 15, label: '15 jours' },
      { value: 30, label: '30 jours' },
      { value: 45, label: '45 jours' },
      { value: 60, label: '60 jours' }
    ]
  },
  
  compliance: {
    standard: 'EN 16931',
    digitalSignatureRequired: true,
    archivingPeriod: 10,
    formats: ['PDF/A-3', 'XML'],
    regulations: [
      'Code Général des Impôts',
      'Ordonnance 2021-1190 (facturation électronique)'
    ]
  },
  
  validation: {
    phone: /^(?:\+33|33|0)[1-9](?:[0-9]{8})$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    postalCode: /^\d{5}$/
  }
};