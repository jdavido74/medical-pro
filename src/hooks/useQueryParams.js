/**
 * Hook personnalisé pour gérer les paramètres d'URL (query params)
 * Utilisé pour la persistance d'état dans l'URL
 */

import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

/**
 * Hook pour gérer les paramètres de requête URL
 * @returns {Object} Méthodes pour lire et modifier les paramètres
 */
export const useQueryParams = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  /**
   * Récupérer un paramètre spécifique
   * @param {string} key - Clé du paramètre
   * @param {*} defaultValue - Valeur par défaut si le paramètre n'existe pas
   * @returns {string|*} Valeur du paramètre ou valeur par défaut
   */
  const getParam = useCallback((key, defaultValue = null) => {
    return searchParams.get(key) || defaultValue;
  }, [searchParams]);

  /**
   * Récupérer tous les paramètres sous forme d'objet
   * @returns {Object} Objet contenant tous les paramètres
   */
  const getAllParams = useCallback(() => {
    const params = {};
    for (const [key, value] of searchParams.entries()) {
      params[key] = value;
    }
    return params;
  }, [searchParams]);

  /**
   * Définir un ou plusieurs paramètres
   * @param {Object|string} keyOrParams - Clé du paramètre ou objet de paramètres
   * @param {string} value - Valeur du paramètre (si keyOrParams est une string)
   * @param {boolean} replace - Si true, remplace l'historique au lieu d'ajouter une entrée
   */
  const setParam = useCallback((keyOrParams, value, replace = false) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);

      if (typeof keyOrParams === 'object') {
        // Mode objet : définir plusieurs paramètres
        Object.entries(keyOrParams).forEach(([key, val]) => {
          if (val === null || val === undefined || val === '') {
            newParams.delete(key);
          } else {
            newParams.set(key, String(val));
          }
        });
      } else {
        // Mode clé-valeur : définir un seul paramètre
        if (value === null || value === undefined || value === '') {
          newParams.delete(keyOrParams);
        } else {
          newParams.set(keyOrParams, String(value));
        }
      }

      return newParams;
    }, { replace });
  }, [setSearchParams]);

  /**
   * Supprimer un ou plusieurs paramètres
   * @param {string|string[]} keys - Clé(s) du/des paramètre(s) à supprimer
   * @param {boolean} replace - Si true, remplace l'historique au lieu d'ajouter une entrée
   */
  const removeParam = useCallback((keys, replace = false) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      const keysArray = Array.isArray(keys) ? keys : [keys];
      keysArray.forEach(key => newParams.delete(key));
      return newParams;
    }, { replace });
  }, [setSearchParams]);

  /**
   * Effacer tous les paramètres
   * @param {boolean} replace - Si true, remplace l'historique au lieu d'ajouter une entrée
   */
  const clearParams = useCallback((replace = false) => {
    setSearchParams({}, { replace });
  }, [setSearchParams]);

  return {
    getParam,
    getAllParams,
    setParam,
    removeParam,
    clearParams,
    searchParams
  };
};

export default useQueryParams;
