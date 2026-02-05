// components/common/ClientSearchInput.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { patientsApi } from '../../api/patientsApi';

const ClientSearchInput = ({
  value,
  onChange,
  error,
  disabled = false,
  placeholder = null
}) => {
  const { t } = useTranslation();
  const displayPlaceholder = placeholder || t('common.patientSearch.placeholder');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isLoadingSelected, setIsLoadingSelected] = useState(false);

  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  // Fetch patient details when value prop is set (pre-selection)
  useEffect(() => {
    if (value && !selectedPatient) {
      setIsLoadingSelected(true);
      patientsApi.getPatientById(value)
        .then(patient => {
          setSelectedPatient(patient);
          // Notify parent so it gets the full patient data for save
          onChange(patient.id, patient);
        })
        .catch(err => {
          console.error('[ClientSearchInput] Error loading pre-selected patient:', err);
        })
        .finally(() => {
          setIsLoadingSelected(false);
        });
    } else if (!value) {
      setSelectedPatient(null);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced server-side search
  const performSearch = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await patientsApi.searchPatients(query.trim(), { limit: 15 });
      setResults(response.patients || []);
      setShowDropdown(true);
      setHighlightedIndex(-1);
    } catch (err) {
      console.error('[ClientSearchInput] Search error:', err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!showDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && results[highlightedIndex]) {
          handleSelectPatient(results[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        break;
      default:
        break;
    }
  };

  // Select a patient
  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setSearchQuery('');
    setShowDropdown(false);
    setHighlightedIndex(-1);
    setResults([]);
    onChange(patient.id, patient);
  };

  // Clear selection
  const handleClear = () => {
    setSelectedPatient(null);
    setSearchQuery('');
    setResults([]);
    onChange('', null);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPatientDisplayName = (patient) => {
    return patient.displayName || `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
  };

  const getPatientEmail = (patient) => {
    return patient.contact?.email || patient.email || '';
  };

  const getPatientPhone = (patient) => {
    return patient.contact?.phone || patient.contact?.mobile || patient.phone || '';
  };

  // Loading state for pre-selection
  if (isLoadingSelected) {
    return (
      <div className="space-y-2">
        <div className="relative">
          <div className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center">
            <Loader2 className="absolute left-3 top-3 h-4 w-4 text-gray-400 animate-spin" />
            <span className="text-gray-400 text-sm">{t('common.patientSearch.loading', 'Chargement...')}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        {/* Search input or selected patient display */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={selectedPatient ? getPatientDisplayName(selectedPatient) : searchQuery}
            onChange={handleSearchChange}
            onFocus={() => {
              if (!selectedPatient && searchQuery.trim().length >= 2) {
                setShowDropdown(true);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={displayPlaceholder}
            disabled={disabled || !!selectedPatient}
            className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
              error ? 'border-red-500' : 'border-gray-300'
            } ${selectedPatient ? 'bg-blue-50 text-blue-900 font-medium' : ''} ${
              disabled ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
            }`}
          />

          {/* Loading spinner during search */}
          {isSearching && !selectedPatient && (
            <Loader2 className="absolute right-3 top-3 h-4 w-4 text-gray-400 animate-spin" />
          )}

          {/* Clear button when patient is selected */}
          {selectedPatient && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
              title={t('common.patientSearch.resetSelection')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Search results dropdown */}
        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
          >
            {results.length > 0 ? (
              <div>
                {results.map((patient, index) => (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => handleSelectPatient(patient)}
                    className={`w-full text-left px-4 py-3 border-b transition-colors ${
                      index === highlightedIndex
                        ? 'bg-blue-50 border-l-4 border-l-blue-500'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {getPatientDisplayName(patient)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {patient.patientNumber && (
                            <span className="mr-3">#{patient.patientNumber}</span>
                          )}
                          {getPatientEmail(patient) && (
                            <span className="mr-3">{getPatientEmail(patient)}</span>
                          )}
                          {getPatientPhone(patient) && (
                            <span>{getPatientPhone(patient)}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : !isSearching && searchQuery.trim().length >= 2 ? (
              <div className="p-4 text-center">
                <p className="text-sm text-gray-600">
                  {t('common.patientSearch.noPatientFound', { query: searchQuery })}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Selected patient details card */}
      {selectedPatient && (
        <div className="p-3 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-1">
            <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">
              ✓
            </div>
            <span className="text-sm font-bold text-green-900">
              {t('common.patientSearch.patientSelected')}
            </span>
          </div>
          <div className="text-xs text-gray-600 ml-8 space-y-0.5">
            {getPatientEmail(selectedPatient) && (
              <p>{getPatientEmail(selectedPatient)}</p>
            )}
            {getPatientPhone(selectedPatient) && (
              <p>{getPatientPhone(selectedPatient)}</p>
            )}
            {selectedPatient.patientNumber && (
              <p className="text-gray-500">
                {t('common.patientSearch.patientNumber')} {selectedPatient.patientNumber}
              </p>
            )}
            {(selectedPatient.address?.street || selectedPatient.address?.city) && (
              <p className="text-gray-500">
                {[
                  selectedPatient.address?.street,
                  selectedPatient.address?.postalCode,
                  selectedPatient.address?.city
                ].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default ClientSearchInput;
