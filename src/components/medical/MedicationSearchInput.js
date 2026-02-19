import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Search, Pill, Plus, Loader2, X } from 'lucide-react';
import { medicationsApi } from '../../api/medicationsApi';
import { useTranslation } from 'react-i18next';

/**
 * MedicationSearchInput - Autocomplete for CIMA + custom medications
 *
 * Props:
 *  - value: string (medication name)
 *  - onChange: (medicationObj) => void
 *  - onClear: () => void
 *  - allowCustom: boolean (default true)
 *  - disabled: boolean
 *  - error: string
 *  - focusColor: string (default 'blue')
 *  - placeholder: string
 */
const MedicationSearchInput = ({
  value = '',
  onChange,
  onClear,
  allowCustom = true,
  disabled = false,
  error,
  focusColor = 'blue',
  placeholder
}) => {
  const { t } = useTranslation(['medical']);
  const [searchQuery, setSearchQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [isSelected, setIsSelected] = useState(!!value);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);
  const blurTimeoutRef = useRef(null);

  // Calculate dropdown position from input's bounding rect
  const updateDropdownPosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width
    });
  }, []);

  // Sync external value changes
  useEffect(() => {
    setSearchQuery(value || '');
    if (value) setIsSelected(true);
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target) &&
        searchInputRef.current && !searchInputRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reposition dropdown on scroll/resize while open
  useEffect(() => {
    if (!showDropdown) return;
    updateDropdownPosition();

    // Listen on all scrollable ancestors + window resize
    const handleReposition = () => updateDropdownPosition();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [showDropdown, updateDropdownPosition]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  const performSearch = async (query) => {
    if (!query || query.length < 3) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await medicationsApi.searchMedications(query);
      setResults(searchResults);
      setShowDropdown(true);
      setHighlightedIndex(-1);
    } catch (err) {
      console.error('Medication search error:', err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setIsSelected(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    // If user clears the field, notify parent
    if (!query) {
      if (onClear) onClear();
      else if (onChange) onChange({ name: '', source: null, nregistro: null });
      setResults([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);
  };

  const handleSelect = (med) => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    setSearchQuery(med.name);
    setShowDropdown(false);
    setIsSelected(true);
    if (onChange) onChange(med);
  };

  const handleCustomAdd = () => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    const customMed = {
      source: null,
      nregistro: null,
      name: searchQuery,
      activeIngredients: [],
      dosage: '',
      pharmaceuticalForm: '',
      administrationRoutes: [],
      atcCode: '',
      requiresPrescription: false
    };
    setShowDropdown(false);
    setIsSelected(true);
    if (onChange) onChange(customMed);
  };

  const handleClear = () => {
    setSearchQuery('');
    setResults([]);
    setShowDropdown(false);
    setIsSelected(false);
    if (onClear) onClear();
    else if (onChange) onChange({ name: '', source: null, nregistro: null });
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  const handleKeyDown = (e) => {
    if (!showDropdown) return;

    const totalItems = results.length + (allowCustom && searchQuery.length >= 3 ? 1 : 0);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => prev < totalItems - 1 ? prev + 1 : prev);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < results.length) {
          handleSelect(results[highlightedIndex]);
        } else if (highlightedIndex === results.length && allowCustom) {
          handleCustomAdd();
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        break;
      default:
        break;
    }
  };

  // Handle blur - if text was typed but no selection, keep as free text
  const handleBlur = () => {
    // Small delay to allow click events on dropdown items
    blurTimeoutRef.current = setTimeout(() => {
      if (!isSelected && searchQuery && searchQuery !== value) {
        // User typed text but didn't select - treat as free text
        if (onChange) {
          onChange({
            source: null,
            nregistro: null,
            name: searchQuery,
            activeIngredients: [],
            dosage: '',
            pharmaceuticalForm: '',
            administrationRoutes: [],
            atcCode: '',
            requiresPrescription: false
          });
        }
      }
    }, 200);
  };

  const focusRing = `focus:ring-${focusColor}-500`;

  // Render dropdown via portal to escape overflow containers
  const dropdownContent = showDropdown ? ReactDOM.createPortal(
    <div
      ref={dropdownRef}
      className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto"
      style={{
        top: dropdownPos.top,
        left: dropdownPos.left,
        width: dropdownPos.width
      }}
    >
      {isSearching ? (
        <div className="p-3 text-center text-gray-500 text-sm">
          <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
          {t('medical:medications.search.searching')}
        </div>
      ) : results.length > 0 ? (
        <>
          {results.map((med, index) => (
            <button
              key={`${med.source}-${med.nregistro || med.customMedicationId || index}`}
              type="button"
              onClick={() => handleSelect(med)}
              className={`w-full text-left px-3 py-2 border-b border-gray-100 last:border-b-0 transition-colors ${
                index === highlightedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              <MedicationResultItem med={med} t={t} />
            </button>
          ))}
          {allowCustom && searchQuery.length >= 3 && (
            <button
              type="button"
              onClick={handleCustomAdd}
              className={`w-full text-left px-3 py-2 border-t border-gray-200 transition-colors ${
                highlightedIndex === results.length ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center text-sm text-blue-600">
                <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>{t('medical:medications.search.addCustom')}: <strong>{searchQuery}</strong></span>
              </div>
            </button>
          )}
        </>
      ) : searchQuery.length >= 3 ? (
        <div className="p-3 text-center text-sm text-gray-500">
          <Pill className="h-5 w-5 mx-auto mb-1 text-gray-300" />
          <p>{t('medical:medications.search.noResults')}</p>
          {allowCustom && (
            <button
              type="button"
              onClick={handleCustomAdd}
              className="mt-2 text-blue-600 hover:text-blue-800 text-sm flex items-center justify-center mx-auto"
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('medical:medications.search.addCustom')}
            </button>
          )}
        </div>
      ) : null}
    </div>,
    document.body
  ) : null;

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={disabled}
          className={`w-full pl-7 pr-7 py-1 text-sm border border-gray-300 rounded focus:ring-1 ${focusRing} ${error ? 'border-red-500' : ''} ${disabled ? 'bg-gray-100' : ''}`}
          placeholder={placeholder || t('medical:medications.search.placeholder')}
          autoComplete="off"
        />
        {isSearching && (
          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 animate-spin" />
        )}
        {!isSearching && searchQuery && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Source badge */}
      {isSelected && value && (
        <SourceBadge source={results.find(r => r.name === value)?.source} />
      )}

      {/* Dropdown rendered via portal */}
      {dropdownContent}
    </div>
  );
};

/**
 * Display a single medication result in the dropdown
 */
const MedicationResultItem = ({ med, t }) => {
  const isCustom = med.source === 'custom';

  return (
    <div>
      <div className="flex items-center gap-2">
        {isCustom ? (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
            {t('medical:medications.search.source.custom')}
          </span>
        ) : med.source === 'cima' ? (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
            CIMA
          </span>
        ) : null}
        {med.requiresPrescription && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700">
            {t('medical:medications.rxBadge')}
          </span>
        )}
        <span className="text-sm font-medium text-gray-900 truncate">{med.name}</span>
      </div>
      {med.activeIngredients && med.activeIngredients.length > 0 && (
        <p className="text-xs text-gray-500 mt-0.5 truncate">
          {med.activeIngredients.map(ai => `${ai.name}${ai.amount ? ` ${ai.amount}${ai.unit || ''}` : ''}`).join(' + ')}
          {med.pharmaceuticalForm ? ` — ${med.pharmaceuticalForm}` : ''}
        </p>
      )}
    </div>
  );
};

/**
 * Small badge showing the source of the selected medication
 */
const SourceBadge = ({ source }) => {
  if (!source) return null;

  if (source === 'cima') {
    return (
      <span className="absolute -top-1.5 right-0 inline-flex items-center px-1 py-0 rounded text-[10px] font-medium bg-green-100 text-green-700">
        CIMA
      </span>
    );
  }
  if (source === 'custom') {
    return (
      <span className="absolute -top-1.5 right-0 inline-flex items-center px-1 py-0 rounded text-[10px] font-medium bg-purple-100 text-purple-700">
        Custom
      </span>
    );
  }
  return null;
};

export default MedicationSearchInput;
