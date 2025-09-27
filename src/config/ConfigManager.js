// src/config/ConfigManager.js
import React, { useState, useEffect } from 'react';

class ConfigManager {
  constructor() {
    this.currentConfig = null;
    this.initialized = false;
    this.countryCode = null;
  }
  
  async initialize(countryCode = 'FR') {
    try {
      this.countryCode = countryCode.toUpperCase();
      
      switch (this.countryCode) {
        case 'FR':
          const { FRANCE_CONFIG } = await import('./countries/france.js');
          this.currentConfig = FRANCE_CONFIG;
          break;
        case 'ES':
          const { SPAIN_CONFIG } = await import('./countries/spain.js');
          this.currentConfig = SPAIN_CONFIG;
          break;
        default:
          console.warn(`Configuration not found for country: ${countryCode}, falling back to France`);
          const { FRANCE_CONFIG: fallbackConfig } = await import('./countries/france.js');
          this.currentConfig = fallbackConfig;
          this.countryCode = 'FR';
      }
      
      this.initialized = true;
      this._freezeConfig();
      return this.currentConfig;
    } catch (error) {
      console.error('Failed to initialize country config:', error);
      throw error;
    }
  }
  
  // Protection contre modification
  _freezeConfig() {
    if (this.currentConfig) {
      this._deepFreeze(this.currentConfig);
    }
  }
  
  _deepFreeze(obj) {
    if (obj && typeof obj === 'object') {
      Object.getOwnPropertyNames(obj).forEach(name => {
        const value = obj[name];
        if (value && typeof value === 'object') {
          this._deepFreeze(value);
        }
      });
      return Object.freeze(obj);
    }
    return obj;
  }
  
  // Getters sécurisés
  getCountryInfo() {
    this._ensureInitialized();
    return { ...this.currentConfig.country };
  }
  
  getTaxation() {
    this._ensureInitialized();
    return { ...this.currentConfig.taxation };
  }
  
  getBusinessConfig() {
    this._ensureInitialized();
    return { ...this.currentConfig.business };
  }
  
  getInvoiceConfig() {
    this._ensureInitialized();
    return { ...this.currentConfig.invoice };
  }
  
  getValidationRules() {
    this._ensureInitialized();
    return { ...this.currentConfig.validation };
  }
  
  getComplianceInfo() {
    this._ensureInitialized();
    return { ...this.currentConfig.compliance };
  }
  
  // Validation selon pays
  validateBusinessNumber(number) {
    if (!number || !number.trim()) return true; // Optionnel
    this._ensureInitialized();
    const config = this.currentConfig.business.registrationNumber;
    return config.format.test(number.trim());
  }
  
  validateVATNumber(number) {
    if (!number || !number.trim()) {
      this._ensureInitialized();
      return !this.currentConfig.taxation.vatNumber.required;
    }
    this._ensureInitialized();
    const config = this.currentConfig.taxation.vatNumber;
    return config.format.test(number.trim());
  }
  
  validatePhone(phone) {
    if (!phone || !phone.trim()) return true; // Optionnel
    this._ensureInitialized();
    const cleanPhone = phone.replace(/[\s\-\.]/g, '');
    return this.currentConfig.validation.phone.test(cleanPhone);
  }
  
  validatePostalCode(postalCode) {
    if (!postalCode || !postalCode.trim()) return false;
    this._ensureInitialized();
    return this.currentConfig.validation.postalCode.test(postalCode.trim());
  }
  
  formatCurrency(amount) {
    this._ensureInitialized();
    return new Intl.NumberFormat(this.currentConfig.country.locale, {
      style: 'currency',
      currency: this.currentConfig.country.currency
    }).format(amount);
  }
  
  _ensureInitialized() {
    if (!this.initialized) {
      throw new Error('ConfigManager not initialized. Call initialize() first.');
    }
  }
  
  // Méthodes utilitaires pour les composants
  getBusinessNumberLabel() {
    this._ensureInitialized();
    return this.currentConfig.business.registrationNumber.label;
  }
  
  getBusinessNumberPlaceholder() {
    this._ensureInitialized();
    return this.currentConfig.business.registrationNumber.placeholder;
  }
  
  getTaxRates() {
    this._ensureInitialized();
    return [...this.currentConfig.taxation.rates];
  }
  
  getDefaultTaxRate() {
    this._ensureInitialized();
    return this.currentConfig.taxation.defaultRate;
  }
  
  getTaxLabel() {
    this._ensureInitialized();
    return this.currentConfig.taxation.vatLabel;
  }
  
  getPaymentTermsOptions() {
    this._ensureInitialized();
    return [...this.currentConfig.invoice.paymentTermsOptions];
  }
}

// Instance singleton
export const configManager = new ConfigManager();

// Hook React pour utilisation dans composants
export const useCountryConfig = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const initConfig = async () => {
      try {
        // Déterminer le pays depuis l'URL ou variable d'environnement
        const countryCode = process.env.REACT_APP_COUNTRY || 'FR';
        const configData = await configManager.initialize(countryCode);
        setConfig(configData);
      } catch (err) {
        setError(err.message);
        console.error('Erreur initialisation configuration pays:', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (!configManager.initialized) {
      initConfig();
    } else {
      setConfig(configManager.currentConfig);
      setLoading(false);
    }
  }, []);
  
  return { config, loading, error, configManager };
};

// Utilitaires de validation adaptés au pays
export const countryValidation = {
  validateBusinessNumber: (number) => configManager.validateBusinessNumber(number),
  validateVATNumber: (number) => configManager.validateVATNumber(number),
  validatePhone: (phone) => configManager.validatePhone(phone),
  validatePostalCode: (postalCode) => configManager.validatePostalCode(postalCode),
  formatCurrency: (amount) => configManager.formatCurrency(amount),
  
  getBusinessNumberLabel: () => configManager.getBusinessNumberLabel(),
  getBusinessNumberPlaceholder: () => configManager.getBusinessNumberPlaceholder(),
  getTaxRates: () => configManager.getTaxRates(),
  getDefaultTaxRate: () => configManager.getDefaultTaxRate(),
  getTaxLabel: () => configManager.getTaxLabel(),
  getPaymentTermsOptions: () => configManager.getPaymentTermsOptions()
};

export default configManager;