/**
 * CatalogProductSelector - Component for selecting products from the catalog
 * Used in QuoteFormModal and InvoiceFormModal to quickly add catalog items
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Package, Pill, Syringe, Stethoscope, Plus, ChevronDown } from 'lucide-react';
import { getProductsForBilling, searchCatalog, formatProductName } from '../../services/catalogIntegration';

// Icon mapping for item types
const TYPE_ICONS = {
  medication: Pill,
  treatment: Syringe,
  service: Stethoscope
};

// Color mapping for item types
const TYPE_COLORS = {
  medication: 'text-green-600 bg-green-100',
  treatment: 'text-blue-600 bg-blue-100',
  service: 'text-purple-600 bg-purple-100'
};

const CatalogProductSelector = ({
  onSelect,
  includeServices = false,
  filterType = null,
  placeholder = null,
  className = ''
}) => {
  const { t } = useTranslation('catalog');
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Load all products on mount
  useEffect(() => {
    const products = getProductsForBilling({ includeServices, type: filterType });
    setAllProducts(products);
    setResults(products.slice(0, 10));
  }, [includeServices, filterType]);

  // Handle search
  useEffect(() => {
    if (searchQuery.trim()) {
      const searchResults = searchCatalog(searchQuery, {
        type: filterType,
        limit: 15
      });
      setResults(searchResults);
    } else {
      setResults(allProducts.slice(0, 10));
    }
  }, [searchQuery, allProducts, filterType]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle product selection
  const handleSelect = (product) => {
    onSelect({
      catalogItemId: product.id,
      description: formatProductName(product),
      unitPrice: product.price,
      taxRate: product.vatRate,
      duration: product.duration,
      type: product.type,
      // Pass raw product data for reference
      _catalogProduct: product
    });

    setSearchQuery('');
    setIsOpen(false);
  };

  // Format price display
  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger button / Search input */}
      <div className="relative">
        <div
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 100);
          }}
          className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
            isOpen
              ? 'border-green-500 ring-1 ring-green-500'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <Package className="h-4 w-4 text-gray-400" />
          {isOpen ? (
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={placeholder || t('placeholders.search', 'Rechercher dans le catalogue...')}
              className="flex-1 bg-transparent border-none outline-none text-sm"
              autoFocus
            />
          ) : (
            <span className="flex-1 text-sm text-gray-500">
              {placeholder || t('actions.addItem', 'Ajouter depuis le catalogue')}
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="mx-auto h-8 w-8 text-gray-300 mb-2" />
              <p className="text-sm">{t('empty.filteredTitle', 'Aucun résultat')}</p>
              <p className="text-xs text-gray-400 mt-1">
                {t('empty.filteredDescription', 'Aucun élément ne correspond à votre recherche')}
              </p>
            </div>
          ) : (
            <ul className="py-1">
              {results.map((product) => {
                const TypeIcon = TYPE_ICONS[product.type] || Package;
                return (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(product)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className={`p-1.5 rounded-lg ${TYPE_COLORS[product.type]}`}>
                        <TypeIcon className="h-4 w-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {product.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{t(`types.${product.type}`)}</span>
                          {product.duration && (
                            <>
                              <span>•</span>
                              <span>{product.duration} min</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatPrice(product.price)}
                        </p>
                        <p className="text-xs text-gray-500">
                          TVA {product.vatRate}%
                        </p>
                      </div>

                      <Plus className="h-4 w-4 text-green-600 flex-shrink-0" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* View all link */}
          {results.length > 0 && allProducts.length > results.length && (
            <div className="border-t border-gray-100 px-4 py-2 text-center">
              <span className="text-xs text-gray-500">
                {results.length} / {allProducts.length} {t('stats.total', 'éléments')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * CatalogServiceSelector - Specialized selector for services (appointments)
 * Returns duration along with service details
 */
export const CatalogServiceSelector = ({
  onSelect,
  selectedServiceId = null,
  placeholder = null,
  className = ''
}) => {
  const { t } = useTranslation('catalog');
  const [services, setServices] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const allServices = getProductsForBilling({ type: 'service' });
    setServices(allServices);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredServices = searchQuery
    ? services.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : services;

  const selectedService = services.find(s => s.id === selectedServiceId);

  const handleSelect = (service) => {
    onSelect({
      id: service.id,
      name: service.name,
      duration: service.duration || 30,
      price: service.price
    });
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 border rounded-lg transition-colors ${
          isOpen
            ? 'border-green-500 ring-1 ring-green-500'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <div className="flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-gray-400" />
          <span className={selectedService ? 'text-gray-900' : 'text-gray-500'}>
            {selectedService
              ? `${selectedService.name} (${selectedService.duration || 30} min)`
              : placeholder || t('placeholders.selectCategory', 'Sélectionner un service')}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-64 overflow-y-auto">
          {/* Search */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('placeholders.search')}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:border-green-500 focus:ring-1 focus:ring-green-500"
                autoFocus
              />
            </div>
          </div>

          {/* Services list */}
          {filteredServices.length === 0 ? (
            <div className="text-center py-4 text-sm text-gray-500">
              {t('empty.filteredTitle')}
            </div>
          ) : (
            <ul className="py-1">
              {filteredServices.map((service) => (
                <li key={service.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(service)}
                    className={`w-full flex items-center justify-between px-4 py-2 text-left hover:bg-gray-50 ${
                      service.id === selectedServiceId ? 'bg-green-50' : ''
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{service.name}</p>
                      <p className="text-xs text-gray-500">{service.duration || 30} min</p>
                    </div>
                    {service.id === selectedServiceId && (
                      <div className="text-green-600">✓</div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default CatalogProductSelector;
