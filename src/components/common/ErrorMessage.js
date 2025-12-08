/**
 * ErrorMessage Component
 * Composant réutilisable pour afficher les erreurs
 */

import React from 'react';
import { AlertCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

const ErrorMessage = ({
  message,
  details,
  type = 'error',
  onDismiss,
  className = ''
}) => {
  if (!message && !details) return null;

  const styles = {
    error: {
      container: 'bg-red-50 border-red-200 text-red-800',
      icon: <XCircle className="h-5 w-5 text-red-400" />,
      title: 'text-red-800',
      details: 'text-red-600'
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      icon: <AlertTriangle className="h-5 w-5 text-yellow-400" />,
      title: 'text-yellow-800',
      details: 'text-yellow-600'
    },
    info: {
      container: 'bg-blue-50 border-blue-200 text-blue-800',
      icon: <Info className="h-5 w-5 text-blue-400" />,
      title: 'text-blue-800',
      details: 'text-blue-600'
    },
    validation: {
      container: 'bg-orange-50 border-orange-200 text-orange-800',
      icon: <AlertCircle className="h-5 w-5 text-orange-400" />,
      title: 'text-orange-800',
      details: 'text-orange-600'
    }
  };

  const style = styles[type] || styles.error;

  return (
    <div className={`flex gap-3 p-4 border rounded-lg ${style.container} ${className}`}>
      <div className="flex-shrink-0">
        {style.icon}
      </div>
      <div className="flex-1">
        {message && (
          <h3 className={`text-sm font-medium ${style.title}`}>
            {message}
          </h3>
        )}
        {details && (
          <p className={`text-sm mt-1 ${style.details}`}>
            {details}
          </p>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
          <XCircle className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

/**
 * FieldError - Affiche une erreur de champ de formulaire
 */
export const FieldError = ({ error, className = '' }) => {
  if (!error) return null;

  return (
    <p className={`mt-1 text-sm text-red-600 flex items-center gap-1 ${className}`}>
      <AlertCircle className="h-3 w-3" />
      {error}
    </p>
  );
};

/**
 * ErrorList - Affiche une liste d'erreurs
 */
export const ErrorList = ({ errors, className = '' }) => {
  if (!errors || errors.length === 0) return null;

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex gap-2">
        <XCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800">
            {errors.length === 1 ? 'Une erreur est survenue' : `${errors.length} erreurs détectées`}
          </h3>
          <ul className="mt-2 text-sm text-red-600 list-disc list-inside space-y-1">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage;
