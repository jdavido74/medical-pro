/**
 * Error Handler Utility
 * Centralise la gestion et le formatage des erreurs
 */

/**
 * Parse une erreur provenant du backend
 * @param {Error|Object} error - L'erreur à parser
 * @returns {Object} - Objet avec message et détails
 */
export function parseError(error) {
  // Erreur avec structure success/error du backend
  if (error?.error) {
    return {
      message: error.error.message || 'Une erreur est survenue',
      details: error.error.details || '',
      type: 'backend'
    };
  }

  // Erreur HTTP standard
  if (error?.response) {
    const status = error.response.status;
    const data = error.response.data;

    if (data?.error) {
      return {
        message: data.error.message || getDefaultErrorMessage(status),
        details: data.error.details || '',
        type: 'http',
        status
      };
    }

    return {
      message: getDefaultErrorMessage(status),
      details: '',
      type: 'http',
      status
    };
  }

  // Erreur réseau
  if (error?.message === 'Network Error' || !error?.response) {
    return {
      message: 'Erreur de connexion au serveur',
      details: 'Vérifiez votre connexion internet',
      type: 'network'
    };
  }

  // Erreur de validation Joi (format backend)
  if (error?.message?.includes('Validation Error')) {
    return {
      message: 'Erreur de validation',
      details: error.details || error.message,
      type: 'validation'
    };
  }

  // Erreur JavaScript standard
  if (error instanceof Error) {
    return {
      message: error.message || 'Une erreur est survenue',
      details: '',
      type: 'javascript'
    };
  }

  // Erreur sous forme de string
  if (typeof error === 'string') {
    return {
      message: error,
      details: '',
      type: 'string'
    };
  }

  // Erreur inconnue
  return {
    message: 'Une erreur inattendue est survenue',
    details: JSON.stringify(error),
    type: 'unknown'
  };
}

/**
 * Obtient un message d'erreur par défaut selon le code HTTP
 */
function getDefaultErrorMessage(status) {
  const messages = {
    400: 'Requête invalide',
    401: 'Non authentifié',
    403: 'Accès refusé',
    404: 'Ressource non trouvée',
    409: 'Conflit - La ressource existe déjà',
    422: 'Données invalides',
    429: 'Trop de requêtes - Veuillez patienter',
    500: 'Erreur serveur interne',
    502: 'Service temporairement indisponible',
    503: 'Service non disponible'
  };

  return messages[status] || `Erreur ${status}`;
}

/**
 * Extrait les erreurs de champs depuis une erreur backend
 * @param {Object} error - L'erreur parsée
 * @returns {Object} - Map field -> error message
 */
export function extractFieldErrors(error) {
  const fieldErrors = {};

  // Format: "field" must be...
  if (error.details && typeof error.details === 'string') {
    const match = error.details.match(/"([^"]+)"\s+(.*)/);
    if (match) {
      const [, fieldName, errorMessage] = match;
      // Convertir snake_case en camelCase
      const camelField = fieldName.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      fieldErrors[camelField] = errorMessage;
    }
  }

  return fieldErrors;
}

/**
 * Combine les erreurs de validation frontend et backend
 */
export function mergeErrors(frontendErrors = {}, backendError = null) {
  if (!backendError) return frontendErrors;

  const parsed = parseError(backendError);
  const fieldErrors = extractFieldErrors(parsed);

  return {
    ...frontendErrors,
    ...fieldErrors,
    _general: parsed.message
  };
}

/**
 * Vérifie si une erreur est critique (nécessite affichage urgent)
 */
export function isCriticalError(error) {
  const parsed = parseError(error);
  return ['network', 'http'].includes(parsed.type) || parsed.status >= 500;
}

/**
 * Formate un message d'erreur pour l'utilisateur
 */
export function formatUserMessage(error) {
  const parsed = parseError(error);

  if (parsed.details) {
    return `${parsed.message}: ${parsed.details}`;
  }

  return parsed.message;
}

/**
 * Valide un numéro de téléphone international
 * @param {string} phone - Numéro de téléphone à valider
 * @returns {boolean} - true si valide
 */
export function validateInternationalPhone(phone) {
  if (!phone || !phone.trim()) return true; // Optionnel

  // Nettoyer le numéro (enlever espaces, tirets, parenthèses, points)
  const cleaned = phone.replace(/[\s\-\(\)\.\+]/g, '');

  // Doit contenir uniquement des chiffres après nettoyage
  if (!/^\d+$/.test(cleaned)) {
    return false;
  }

  // Minimum 8 chiffres, maximum 15 (norme E.164)
  if (cleaned.length < 8 || cleaned.length > 15) {
    return false;
  }

  // Si commence par 00, convertir en +
  if (phone.trim().startsWith('00')) {
    return cleaned.length >= 10; // 00 + code pays + numéro
  }

  // Si commence par +, valider format international
  if (phone.trim().startsWith('+')) {
    return cleaned.length >= 10; // + code pays + numéro
  }

  // Numéro local (sans indicatif international)
  // France: 10 chiffres commençant par 0
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return true;
  }

  // Espagne: 9 chiffres
  if (cleaned.length === 9) {
    return true;
  }

  // Autres cas: au moins 8 chiffres
  return cleaned.length >= 8;
}

/**
 * Formate un numéro de téléphone pour l'affichage
 * @param {string} phone - Numéro de téléphone
 * @returns {string} - Numéro formaté
 */
export function formatPhoneNumber(phone) {
  if (!phone) return '';

  // Nettoyer
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

  // Si commence par +33 (France)
  if (cleaned.startsWith('+33') || cleaned.startsWith('0033')) {
    const local = cleaned.replace(/^(\+33|0033)/, '0');
    return local.replace(/(\d{2})(?=\d)/g, '$1 '); // Format: 06 12 34 56 78
  }

  // Si commence par +34 (Espagne)
  if (cleaned.startsWith('+34') || cleaned.startsWith('0034')) {
    const local = cleaned.replace(/^(\+34|0034)/, '');
    return `+34 ${local.replace(/(\d{3})(?=\d)/g, '$1 ')}`; // Format: +34 612 345 678
  }

  // Autres numéros internationaux
  if (cleaned.startsWith('+')) {
    return cleaned.replace(/(\d{1,3})(\d{1,4})(\d+)/, '$1 $2 $3');
  }

  // Format par défaut: groupes de 2
  return cleaned.replace(/(\d{2})(?=\d)/g, '$1 ');
}
