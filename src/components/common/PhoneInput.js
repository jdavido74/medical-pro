// components/common/PhoneInput.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Phone, AlertCircle, CheckCircle } from 'lucide-react';
import {
  countries,
  getPhoneRules,
  validatePhoneForCountry,
  buildFullPhoneNumber,
  parseFullPhoneNumber,
  formatPhoneDisplay,
  getPhonePlaceholder,
  cleanPhoneNumber,
  removeLeadingZero
} from '../../utils/phoneUtils';

/**
 * PhoneInput - Reusable phone input component with country prefix selector
 *
 * Features:
 * - Country prefix dropdown with flags
 * - Automatic validation based on selected country
 * - Real-time formatting
 * - Support for both controlled and uncontrolled modes
 *
 * @param {Object} props
 * @param {string} props.value - Full phone number (with prefix) or local number
 * @param {Function} props.onChange - Callback with full phone number
 * @param {string} props.defaultCountry - Default country code (e.g., 'FR', 'ES')
 * @param {string} props.name - Input name attribute
 * @param {string} props.label - Label text
 * @param {boolean} props.required - Whether the field is required
 * @param {boolean} props.disabled - Whether the input is disabled
 * @param {string} props.error - External error message
 * @param {boolean} props.showValidation - Show validation status icon
 * @param {string} props.className - Additional CSS classes
 * @param {Function} props.onValidationChange - Callback when validation status changes
 * @param {Array} props.allowedCountries - Array of allowed country codes (filters the dropdown)
 * @param {boolean} props.compact - Compact mode (smaller size)
 */
const PhoneInput = ({
  value = '',
  onChange,
  defaultCountry = 'FR',
  name = 'phone',
  label,
  required = false,
  disabled = false,
  error: externalError,
  showValidation = true,
  className = '',
  onValidationChange,
  allowedCountries,
  compact = false
}) => {
  const { t } = useTranslation(['common', 'patients']);

  // Filter countries if allowedCountries is provided
  const availableCountries = useMemo(() => {
    if (allowedCountries && allowedCountries.length > 0) {
      return countries.filter(c => allowedCountries.includes(c.code));
    }
    return countries;
  }, [allowedCountries]);

  // State
  const [selectedCountry, setSelectedCountry] = useState(defaultCountry);
  const [localNumber, setLocalNumber] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [touched, setTouched] = useState(false);
  const [internalError, setInternalError] = useState(null);

  // Parse initial value
  useEffect(() => {
    if (value) {
      const parsed = parseFullPhoneNumber(value);
      if (parsed.countryCode) {
        setSelectedCountry(parsed.countryCode);
        setLocalNumber(parsed.localNumber);
      } else {
        // If no country detected, keep the value as local number
        setLocalNumber(cleanPhoneNumber(value));
      }
    } else {
      setLocalNumber('');
    }
  }, [value]);

  // Validate current input
  const validate = useCallback((phone, country) => {
    if (!phone && !required) {
      return { isValid: true };
    }
    if (!phone && required) {
      return { isValid: false, error: 'phone_required', message: t('patients:validation.phoneRequired', 'Phone number is required') };
    }
    return validatePhoneForCountry(phone, country);
  }, [required, t]);

  // Run validation when localNumber or country changes
  useEffect(() => {
    const result = validate(localNumber, selectedCountry);
    setInternalError(result.isValid ? null : result.message);

    if (onValidationChange) {
      onValidationChange(result.isValid, result);
    }
  }, [localNumber, selectedCountry, validate, onValidationChange]);

  // Handle country change
  const handleCountryChange = useCallback((e) => {
    const newCountry = e.target.value;
    setSelectedCountry(newCountry);

    // Rebuild full phone number with new prefix
    if (localNumber && onChange) {
      const fullNumber = buildFullPhoneNumber(localNumber, newCountry);
      onChange({
        target: {
          name,
          value: fullNumber,
          countryCode: newCountry,
          localNumber: localNumber
        }
      });
    }
  }, [localNumber, name, onChange]);

  // Handle phone number input change
  const handlePhoneChange = useCallback((e) => {
    let input = e.target.value;

    // Remove any non-numeric characters except spaces (for user-friendly input)
    input = input.replace(/[^0-9\s]/g, '');

    // Clean for storage (digits only)
    const cleaned = cleanPhoneNumber(input);

    // Remove leading zero for international format
    const normalized = removeLeadingZero(input);

    setLocalNumber(cleaned);
    setTouched(true);

    if (onChange) {
      const fullNumber = buildFullPhoneNumber(normalized, selectedCountry);
      onChange({
        target: {
          name,
          value: fullNumber,
          countryCode: selectedCountry,
          localNumber: cleaned
        }
      });
    }
  }, [selectedCountry, name, onChange]);

  // Handle blur
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    setTouched(true);
  }, []);

  // Get current country data
  const currentCountry = useMemo(() => {
    return availableCountries.find(c => c.code === selectedCountry) || availableCountries[0];
  }, [selectedCountry, availableCountries]);

  // Get placeholder
  const placeholder = useMemo(() => {
    return getPhonePlaceholder(selectedCountry);
  }, [selectedCountry]);

  // Get expected digits info
  const rules = useMemo(() => {
    return getPhoneRules(selectedCountry);
  }, [selectedCountry]);

  // Determine display error
  const displayError = externalError || (touched && internalError);

  // Validation status
  const isValid = !internalError && localNumber && touched;
  const showSuccess = showValidation && isValid && !displayError;
  const showError = showValidation && displayError;

  // Size classes
  const sizeClasses = compact
    ? 'py-1.5 text-sm'
    : 'py-2';

  return (
    <div className={`phone-input-wrapper ${className}`}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Input container */}
      <div className={`
        flex rounded-lg border transition-all duration-200
        ${isFocused ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-300'}
        ${displayError ? 'border-red-500 ring-red-500' : ''}
        ${showSuccess ? 'border-green-500' : ''}
        ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
      `}>
        {/* Country selector */}
        <div className="relative flex-shrink-0">
          <select
            value={selectedCountry}
            onChange={handleCountryChange}
            disabled={disabled}
            className={`
              appearance-none bg-transparent border-r border-gray-300
              ${sizeClasses} px-3 pr-8
              text-gray-700 font-medium
              focus:outline-none
              ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-50'}
              rounded-l-lg
            `}
            aria-label={t('common:phone.selectCountry', 'Select country')}
          >
            {availableCountries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.flag} {country.phone}
              </option>
            ))}
          </select>
          {/* Dropdown arrow */}
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Phone number input */}
        <div className="relative flex-1 flex items-center">
          <input
            type="tel"
            name={name}
            value={localNumber}
            onChange={handlePhoneChange}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
            disabled={disabled}
            placeholder={placeholder}
            className={`
              w-full ${sizeClasses} px-3
              border-0 focus:ring-0 focus:outline-none
              ${disabled ? 'cursor-not-allowed bg-transparent' : ''}
              rounded-r-lg
            `}
            aria-invalid={!!displayError}
            aria-describedby={displayError ? `${name}-error` : undefined}
          />

          {/* Validation icon */}
          {showValidation && (
            <div className="absolute right-3 flex items-center">
              {showSuccess && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              {showError && (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Helper text / Error message */}
      <div className="mt-1 flex justify-between items-start">
        <div>
          {displayError ? (
            <p id={`${name}-error`} className="text-sm text-red-600">
              {displayError}
            </p>
          ) : (
            !compact && (
              <p className="text-xs text-gray-500">
                {t('common:phone.digitsExpected', 'Expected: {{digits}} digits', { digits: rules.minDigits || rules.digits })}
                {rules.maxDigits && rules.maxDigits !== rules.digits && ` - ${rules.maxDigits}`}
              </p>
            )
          )}
        </div>
        {/* Character count */}
        {!compact && localNumber && (
          <span className={`text-xs ${
            internalError ? 'text-red-500' : 'text-gray-400'
          }`}>
            {removeLeadingZero(localNumber).length}/{rules.minDigits || rules.digits}
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * PhoneDisplay - Read-only display of a phone number with flag
 */
export const PhoneDisplay = ({ value, showFlag = true, className = '' }) => {
  if (!value) return <span className="text-gray-400">-</span>;

  const parsed = parseFullPhoneNumber(value);
  const country = countries.find(c => c.code === parsed.countryCode);

  const formattedNumber = parsed.localNumber
    ? formatPhoneDisplay(parsed.localNumber, parsed.countryCode)
    : value;

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {showFlag && country && (
        <span className="text-base">{country.flag}</span>
      )}
      <span>{parsed.prefix || ''}{parsed.localNumber ? ' ' + formattedNumber : value}</span>
    </span>
  );
};

/**
 * PhoneLink - Clickable phone link
 */
export const PhoneLink = ({ value, showFlag = true, className = '' }) => {
  if (!value) return <span className="text-gray-400">-</span>;

  const parsed = parseFullPhoneNumber(value);
  const cleanNumber = `${parsed.prefix || ''}${parsed.localNumber || value}`.replace(/[^0-9+]/g, '');

  return (
    <a
      href={`tel:${cleanNumber}`}
      className={`inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline ${className}`}
    >
      <Phone className="h-4 w-4" />
      <PhoneDisplay value={value} showFlag={showFlag} />
    </a>
  );
};

export default PhoneInput;
