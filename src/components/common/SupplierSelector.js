/**
 * SupplierSelector - Reusable component for selecting suppliers
 * Can be used in forms across the application
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus, X, Building2, Star, MapPin, Phone, Mail, User } from 'lucide-react';
import suppliersApi from '../../api/suppliersApi';

/**
 * SupplierSelector Component
 * @param {Object} props
 * @param {Array} props.selectedSuppliers - Currently selected suppliers with metadata
 * @param {Function} props.onChange - Callback when suppliers change
 * @param {boolean} props.multiple - Allow multiple suppliers (default: true)
 * @param {boolean} props.showDetails - Show supplier details in list
 * @param {boolean} props.allowCreate - Allow creating new suppliers inline
 * @param {Function} props.onCreateNew - Callback to open supplier creation modal
 * @param {string} props.className - Additional CSS classes
 */
const SupplierSelector = ({
  selectedSuppliers = [],
  onChange,
  multiple = true,
  showDetails = true,
  allowCreate = true,
  onCreateNew,
  className = ''
}) => {
  const { t } = useTranslation('catalog');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Search suppliers with debounce
  const searchSuppliers = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await suppliersApi.searchSuppliers(query, 10);
      if (response.success) {
        // Filter out already selected suppliers
        const selectedIds = selectedSuppliers.map(s => s.supplierId || s.id);
        const filtered = (response.data || []).filter(s => !selectedIds.includes(s.id));
        setSearchResults(filtered);
      }
    } catch (err) {
      console.error('Error searching suppliers:', err);
    } finally {
      setIsSearching(false);
    }
  }, [selectedSuppliers]);

  // Debounced search
  useEffect(() => {
    const debounce = setTimeout(() => {
      searchSuppliers(searchQuery);
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, searchSuppliers]);

  // Handle selecting a supplier
  const handleSelect = (supplier) => {
    const newSupplier = {
      supplierId: supplier.id,
      supplier: supplier,
      isPrimary: selectedSuppliers.length === 0, // First one is primary by default
      supplierSku: '',
      unitCost: null,
      currency: 'EUR',
      notes: ''
    };

    if (multiple) {
      onChange([...selectedSuppliers, newSupplier]);
    } else {
      onChange([newSupplier]);
    }

    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  // Handle removing a supplier
  const handleRemove = (supplierId) => {
    const updated = selectedSuppliers.filter(s => (s.supplierId || s.id) !== supplierId);
    // If we removed the primary, make the first one primary
    if (updated.length > 0 && !updated.some(s => s.isPrimary)) {
      updated[0].isPrimary = true;
    }
    onChange(updated);
  };

  // Handle setting primary
  const handleSetPrimary = (supplierId) => {
    const updated = selectedSuppliers.map(s => ({
      ...s,
      isPrimary: (s.supplierId || s.id) === supplierId
    }));
    onChange(updated);
  };

  // Handle updating supplier metadata
  const handleUpdateMetadata = (supplierId, field, value) => {
    const updated = selectedSuppliers.map(s => {
      if ((s.supplierId || s.id) === supplierId) {
        return { ...s, [field]: value };
      }
      return s;
    });
    onChange(updated);
  };

  return (
    <div className={`supplier-selector ${className}`}>
      {/* Selected suppliers list */}
      {selectedSuppliers.length > 0 && (
        <div className="space-y-2 mb-3">
          {selectedSuppliers.map((item, index) => {
            const supplier = item.supplier || item;
            const supplierId = item.supplierId || item.id;

            return (
              <div
                key={supplierId}
                className={`p-3 rounded-lg border ${
                  item.isPrimary
                    ? 'border-amber-300 bg-amber-50'
                    : 'border-gray-200 bg-gray-50'
                } ${item.isInherited ? 'opacity-70' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${item.isPrimary ? 'bg-amber-100' : 'bg-gray-200'}`}>
                      <Building2 className={`w-4 h-4 ${item.isPrimary ? 'text-amber-600' : 'text-gray-500'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{supplier.name}</span>
                        {item.isPrimary && (
                          <span className="flex items-center gap-1 text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                            <Star className="w-3 h-3" />
                            {t('supplier.primary')}
                          </span>
                        )}
                        {item.isInherited && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            {t('supplier.inherited')}
                          </span>
                        )}
                      </div>
                      {showDetails && (
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                          {(supplier.city || supplier.country) && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {[supplier.city, supplier.country].filter(Boolean).join(', ')}
                            </span>
                          )}
                          {supplier.contactName && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {supplier.contactName}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {!item.isInherited && (
                    <div className="flex items-center gap-1">
                      {!item.isPrimary && selectedSuppliers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(supplierId)}
                          className="p-1 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded transition-colors"
                          title={t('supplier.setPrimary')}
                        >
                          <Star className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemove(supplierId)}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Optional metadata fields */}
                {!item.isInherited && showDetails && (
                  <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        {t('supplier.supplierSku')}
                      </label>
                      <input
                        type="text"
                        value={item.supplierSku || ''}
                        onChange={(e) => handleUpdateMetadata(supplierId, 'supplierSku', e.target.value)}
                        placeholder={t('supplier.supplierSkuPlaceholder')}
                        className="w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        {t('supplier.unitCost')}
                      </label>
                      <div className="flex">
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitCost || ''}
                          onChange={(e) => handleUpdateMetadata(supplierId, 'unitCost', e.target.value ? parseFloat(e.target.value) : null)}
                          placeholder="0.00"
                          className="w-full px-2 py-1 text-sm border rounded-l focus:ring-1 focus:ring-blue-500"
                        />
                        <span className="px-2 py-1 text-sm bg-gray-100 border border-l-0 rounded-r text-gray-500">
                          {item.currency || 'EUR'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder={t('supplier.searchPlaceholder')}
            className="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Dropdown results */}
        {showDropdown && (searchResults.length > 0 || allowCreate) && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {searchResults.map((supplier) => (
              <button
                key={supplier.id}
                type="button"
                onClick={() => handleSelect(supplier)}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-3 border-b last:border-b-0"
              >
                <Building2 className="w-4 h-4 text-gray-400" />
                <div>
                  <div className="font-medium text-sm">{supplier.name}</div>
                  {(supplier.city || supplier.country) && (
                    <div className="text-xs text-gray-500">
                      {[supplier.city, supplier.country].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
              </button>
            ))}

            {allowCreate && searchQuery.length >= 2 && (
              <button
                type="button"
                onClick={() => {
                  if (onCreateNew) {
                    onCreateNew(searchQuery);
                  }
                  setShowDropdown(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center gap-3 text-blue-600 border-t"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">
                  {t('supplier.createNew')} "{searchQuery}"
                </span>
              </button>
            )}

            {searchResults.length === 0 && searchQuery.length >= 2 && !allowCreate && (
              <div className="px-3 py-4 text-center text-gray-500 text-sm">
                {t('supplier.noResults')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Click outside to close */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default SupplierSelector;
