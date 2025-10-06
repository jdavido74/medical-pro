// components/common/PractitionerFilter.js
import React from 'react';
import { User, X } from 'lucide-react';

/**
 * Composant de filtre de praticiens réutilisable - Version compacte
 * @param {Object} props
 * @param {Array} props.practitioners - Liste des praticiens
 * @param {string} props.selectedPractitionerId - ID du praticien sélectionné ('all' pour tous)
 * @param {Function} props.onPractitionerChange - Callback quand la sélection change
 * @param {boolean} props.canViewAll - L'utilisateur peut-il voir tous les praticiens?
 * @param {boolean} props.isPractitioner - L'utilisateur est-il un praticien?
 * @param {Object} props.currentUser - Utilisateur connecté
 */
const PractitionerFilter = ({
  practitioners = [],
  selectedPractitionerId = 'all',
  onPractitionerChange,
  canViewAll = false,
  isPractitioner = false,
  currentUser = null
}) => {
  const selectedPractitioner = practitioners.find(p => p.id === selectedPractitionerId);

  // Si praticien : affichage compact en ligne
  if (isPractitioner && currentUser) {
    return (
      <div className="inline-flex items-center bg-green-50 border border-green-200 rounded-lg px-3 py-2">
        <User className="h-4 w-4 text-green-600 mr-2" />
        <span className="text-sm text-green-900 font-medium">
          {currentUser.name}
        </span>
      </div>
    );
  }

  // Si admin/secrétaire : dropdown compact avec badge si filtré
  if (canViewAll) {
    return (
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <select
            value={selectedPractitionerId}
            onChange={(e) => onPractitionerChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white"
          >
            <option value="all">🌍 Tous les praticiens</option>
            {practitioners.map(practitioner => (
              <option key={practitioner.id} value={practitioner.id}>
                {practitioner.name}
              </option>
            ))}
          </select>
          <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Badge compact si un praticien est sélectionné */}
        {selectedPractitionerId !== 'all' && selectedPractitioner && (
          <button
            onClick={() => onPractitionerChange('all')}
            className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            title="Retour à la vue globale"
          >
            <span className="hidden sm:inline">{selectedPractitioner.name}</span>
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return null;
};

export default PractitionerFilter;
