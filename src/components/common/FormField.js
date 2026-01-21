/**
 * FormField Component
 * Composant réutilisable pour les champs de formulaire avec gestion d'erreurs
 */

import React from 'react';
import { FieldError } from './ErrorMessage';

/**
 * Input de texte avec gestion d'erreur
 */
export const TextField = ({
  label,
  name,
  value,
  onChange,
  error,
  required = false,
  type = 'text',
  placeholder = '',
  icon: Icon,
  disabled = false,
  className = '',
  autoComplete
}) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {Icon && <Icon className="inline h-4 w-4 mr-1" />}
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
          error ? 'border-red-300' : 'border-gray-300'
        }`}
      />
      <FieldError error={error} />
    </div>
  );
};

/**
 * Select avec gestion d'erreur
 */
export const SelectField = ({
  label,
  name,
  value,
  onChange,
  error,
  required = false,
  options = [],
  placeholder = 'Sélectionner...',
  icon: Icon,
  disabled = false,
  className = ''
}) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {Icon && <Icon className="inline h-4 w-4 mr-1" />}
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
          error ? 'border-red-300' : 'border-gray-300'
        }`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldError error={error} />
    </div>
  );
};

/**
 * Textarea avec gestion d'erreur
 */
export const TextAreaField = ({
  label,
  name,
  value,
  onChange,
  error,
  required = false,
  placeholder = '',
  rows = 3,
  icon: Icon,
  disabled = false,
  className = ''
}) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {Icon && <Icon className="inline h-4 w-4 mr-1" />}
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        rows={rows}
        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
          error ? 'border-red-300' : 'border-gray-300'
        }`}
      />
      <FieldError error={error} />
    </div>
  );
};

/**
 * Checkbox avec gestion d'erreur
 */
export const CheckboxField = ({
  label,
  name,
  checked,
  onChange,
  error,
  disabled = false,
  className = ''
}) => {
  return (
    <div className={className}>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:cursor-not-allowed"
        />
        <span className="text-sm text-gray-700">{label}</span>
      </label>
      <FieldError error={error} />
    </div>
  );
};

/**
 * Radio group avec gestion d'erreur
 */
export const RadioGroupField = ({
  label,
  name,
  value,
  onChange,
  error,
  required = false,
  options = [],
  className = ''
}) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="space-y-2">
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={onChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <span className="text-sm text-gray-700">{option.label}</span>
          </label>
        ))}
      </div>
      <FieldError error={error} />
    </div>
  );
};
