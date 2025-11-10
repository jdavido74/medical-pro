// components/common/PatientSearchSelect.js
import React, { useState, useEffect, useRef, useContext } from 'react';
import { Search, Plus, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PatientContext } from '../../contexts/PatientContext';

const PatientSearchSelect = ({
  value,
  onChange,
  onCreateNew,
  error,
  disabled = false,
  placeholder = null
}) => {
  const { t } = useTranslation();
  const patientContext = useContext(PatientContext);
  const displayPlaceholder = placeholder || t('common.patientSearch.placeholder');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Filtrer les patients selon la recherche
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPatients([]);
      setShowDropdown(false);
      return;
    }

    const query = searchQuery.toLowerCase();
    const allPatients = patientContext?.patients || [];

    const filtered = allPatients.filter(patient => {
      const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
      const patientNumber = patient.patientNumber?.toLowerCase() || '';
      const email = patient.contact?.email?.toLowerCase() || '';
      const phone = patient.contact?.phone?.toLowerCase() || '';

      return (
        fullName.includes(query) ||
        patientNumber.includes(query) ||
        email.includes(query) ||
        phone.includes(query)
      );
    });

    setFilteredPatients(filtered);
    setShowDropdown(true);
    setHighlightedIndex(-1);
  }, [searchQuery, patientContext?.patients]);

  // Gérer la sélection au clavier
  const handleKeyDown = (e) => {
    if (!showDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredPatients.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          handleSelectPatient(filteredPatients[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        break;
      default:
        break;
    }
  };

  // Sélectionner un patient
  const handleSelectPatient = (patient) => {
    setSearchQuery('');
    setShowDropdown(false);
    setHighlightedIndex(-1);
    onChange(patient.id);
  };

  // Fermer le dropdown en cliquant ailleurs
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

  // Obtenir le patient sélectionné
  const allPatients = patientContext?.patients || [];
  const selectedPatient = value ? allPatients.find(p => p.id === value) : null;

  // Afficher un message "Créer nouveau" si la recherche ne correspond à aucun patient
  const canCreateNew = searchQuery.trim().length > 0 && filteredPatients.length === 0;

  return (
    <div className="space-y-2">
      <div className="relative">
        {/* Input de recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchQuery.trim()) {
                setShowDropdown(true);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={displayPlaceholder}
            disabled={disabled || !!selectedPatient}
            className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
              error ? 'border-red-500' : 'border-gray-300'
            } ${selectedPatient ? 'bg-blue-50 text-blue-900' : ''} ${
              disabled ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
            }`}
          />

          {/* Bouton pour réinitialiser la sélection */}
          {selectedPatient && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setSearchQuery('');
              }}
              disabled={disabled}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
              title={t('common.patientSearch.resetSelection')}
            >
              ✕
            </button>
          )}
        </div>

        {/* Dropdown de patients */}
        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
          >
            {filteredPatients.length > 0 ? (
              <div>
                {/* Liste des patients */}
                {filteredPatients.map((patient, index) => (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => handleSelectPatient(patient)}
                    className={`w-full text-left px-4 py-3 border-b last:border-b-0 transition-colors ${
                      index === highlightedIndex
                        ? 'bg-blue-50 border-l-4 border-l-blue-500'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {patient.firstName} {patient.lastName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {patient.patientNumber && (
                            <span className="mr-3">#{patient.patientNumber}</span>
                          )}
                          {patient.email && (
                            <span className="mr-3">{patient.email}</span>
                          )}
                          {patient.phone && (
                            <span>{patient.phone}</span>
                          )}
                        </p>
                      </div>
                      {patient.isIncomplete && (
                        <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded">
                          {t('common.patientSearch.incompleteRecord')}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : canCreateNew ? (
              <div className="p-4 text-center">
                <p className="text-sm text-gray-600 mb-3">
                  {t('common.patientSearch.noPatientFound', { query: searchQuery })}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowDropdown(false);
                    onCreateNew(searchQuery);
                  }}
                  className="flex items-center justify-center w-full px-4 py-2 bg-green-50 text-green-700 border border-green-300 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('common.patientSearch.createNewPatient')}
                </button>
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-gray-500">
                {t('common.patientSearch.startTyping')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Affichage du patient sélectionné */}
      {selectedPatient && (
        <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                ✓
              </div>
              <div>
                <p className="text-sm font-bold text-green-900">
                  {t('common.patientSearch.patientSelected')}
                </p>
                <p className="text-lg font-bold text-gray-900">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </p>
              </div>
            </div>
          </div>

          {/* Infos de contact */}
          {(selectedPatient.email || selectedPatient.phone) && (
            <div className="text-xs text-gray-600 ml-10 space-y-0.5">
              {selectedPatient.email && (
                <p>✉️ {selectedPatient.email}</p>
              )}
              {selectedPatient.phone && (
                <p>📱 {selectedPatient.phone}</p>
              )}
            </div>
          )}

          {/* Numéro patient */}
          {selectedPatient.patientNumber && (
            <p className="text-xs text-gray-500 ml-10 mt-1">
              {t('common.patientSearch.patientNumber')} {selectedPatient.patientNumber}
            </p>
          )}

          {/* Avertissement fiche incomplète */}
          {selectedPatient.isIncomplete && (
            <p className="text-xs text-orange-700 mt-2 ml-10 p-2 bg-orange-100 rounded">
              ⚠️ {t('common.patientSearch.incompleteWarning')}
            </p>
          )}
        </div>
      )}

      {/* Message d'erreur */}
      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default PatientSearchSelect;
