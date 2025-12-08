/**
 * useFormErrors Hook
 * Hook réutilisable pour gérer les erreurs de formulaire
 */

import { useState, useCallback } from 'react';
import { parseError, extractFieldErrors, mergeErrors } from '../utils/errorHandler';

export function useFormErrors() {
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);

  /**
   * Définir une erreur pour un champ spécifique
   */
  const setFieldError = useCallback((fieldName, errorMessage) => {
    setErrors((prev) => ({
      ...prev,
      [fieldName]: errorMessage
    }));
  }, []);

  /**
   * Effacer l'erreur d'un champ spécifique
   */
  const clearFieldError = useCallback((fieldName) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  /**
   * Définir plusieurs erreurs de champs
   */
  const setFieldErrors = useCallback((fieldErrors) => {
    setErrors((prev) => ({
      ...prev,
      ...fieldErrors
    }));
  }, []);

  /**
   * Gérer une erreur provenant du backend
   */
  const handleBackendError = useCallback((error) => {
    const parsed = parseError(error);
    const fieldErrors = extractFieldErrors(parsed);

    // S'il y a des erreurs de champs, les affecter
    if (Object.keys(fieldErrors).length > 0) {
      setFieldErrors(fieldErrors);
    }

    // Toujours définir l'erreur générale
    setGeneralError({
      message: parsed.message,
      details: parsed.details,
      type: parsed.type
    });

    return parsed;
  }, [setFieldErrors]);

  /**
   * Effacer toutes les erreurs
   */
  const clearErrors = useCallback(() => {
    setErrors({});
    setGeneralError(null);
  }, []);

  /**
   * Effacer uniquement l'erreur générale
   */
  const clearGeneralError = useCallback(() => {
    setGeneralError(null);
  }, []);

  /**
   * Vérifier si un champ a une erreur
   */
  const hasFieldError = useCallback((fieldName) => {
    return !!errors[fieldName];
  }, [errors]);

  /**
   * Obtenir l'erreur d'un champ
   */
  const getFieldError = useCallback((fieldName) => {
    return errors[fieldName] || null;
  }, [errors]);

  /**
   * Vérifier s'il y a des erreurs
   */
  const hasErrors = useCallback(() => {
    return Object.keys(errors).length > 0 || !!generalError;
  }, [errors, generalError]);

  return {
    // State
    errors,
    generalError,

    // Setters
    setFieldError,
    setFieldErrors,
    handleBackendError,

    // Clearers
    clearFieldError,
    clearErrors,
    clearGeneralError,

    // Getters
    hasFieldError,
    getFieldError,
    hasErrors
  };
}
