/**
 * Hook personnalisé pour gérer les modals avec persistance dans l'URL
 * Permet d'ouvrir/fermer les modals et de conserver l'état au rechargement
 */

import { useCallback, useEffect } from 'react';
import { useQueryParams } from './useQueryParams';

/**
 * Hook pour gérer les modals via l'URL
 * @param {string} modalKey - Clé unique identifiant le modal (ex: 'createPatient', 'editUser')
 * @returns {Object} Méthodes et état du modal
 */
export const useModal = (modalKey) => {
  const { getParam, setParam, removeParam } = useQueryParams();

  // Lire l'état du modal depuis l'URL
  const activeModal = getParam('modal');
  const modalData = getParam('modalData');
  const isOpen = activeModal === modalKey;

  /**
   * Ouvrir le modal
   * @param {Object} data - Données optionnelles à passer au modal (seront JSON stringifiées)
   */
  const openModal = useCallback((data = null) => {
    const params = { modal: modalKey };
    if (data) {
      params.modalData = JSON.stringify(data);
    }
    setParam(params, null, false);
  }, [modalKey, setParam]);

  /**
   * Fermer le modal
   * @param {boolean} replace - Si true, remplace l'historique (ne crée pas d'entrée "retour")
   */
  const closeModal = useCallback((replace = true) => {
    removeParam(['modal', 'modalData'], replace);
  }, [removeParam]);

  /**
   * Toggle le modal (ouvrir si fermé, fermer si ouvert)
   * @param {Object} data - Données optionnelles (uniquement lors de l'ouverture)
   */
  const toggleModal = useCallback((data = null) => {
    if (isOpen) {
      closeModal();
    } else {
      openModal(data);
    }
  }, [isOpen, openModal, closeModal]);

  /**
   * Récupérer les données du modal depuis l'URL
   * @returns {Object|null} Données parsées ou null
   */
  const getModalData = useCallback(() => {
    if (!modalData) return null;
    try {
      return JSON.parse(modalData);
    } catch (e) {
      console.error('[useModal] Error parsing modal data:', e);
      return null;
    }
  }, [modalData]);

  return {
    isOpen,
    openModal,
    closeModal,
    toggleModal,
    getModalData
  };
};

/**
 * Hook pour gérer plusieurs modals dans un composant
 * @param {string[]} modalKeys - Liste des clés de modals
 * @returns {Object} Map des méthodes par clé de modal
 */
export const useModals = (modalKeys) => {
  const { getParam, setParam, removeParam } = useQueryParams();
  const activeModal = getParam('modal');

  const modals = {};

  modalKeys.forEach(modalKey => {
    modals[modalKey] = {
      isOpen: activeModal === modalKey,
      open: (data = null) => {
        const params = { modal: modalKey };
        if (data) {
          params.modalData = JSON.stringify(data);
        }
        setParam(params, null, false);
      },
      close: (replace = true) => {
        removeParam(['modal', 'modalData'], replace);
      },
      getModalData: () => {
        const modalData = getParam('modalData');
        if (!modalData) return null;
        try {
          return JSON.parse(modalData);
        } catch (e) {
          console.error('[useModals] Error parsing modal data:', e);
          return null;
        }
      }
    };
  });

  return modals;
};

export default useModal;
