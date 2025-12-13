/**
 * LocaleGuard Component
 *
 * Validates the locale parameter in the URL and redirects
 * to default locale if invalid.
 *
 * Also wraps children with LocaleProvider.
 */

import React from 'react';
import { Navigate, useParams, useLocation, Outlet } from 'react-router-dom';
import { LocaleProvider } from '../../contexts/LocaleContext';
import { isValidLocale, DEFAULT_LOCALE, detectPreferredLocale } from '../../config/locales';

/**
 * LocaleGuard Component
 *
 * Validates locale in URL and provides locale context to children.
 * If locale is invalid, redirects to detected/default locale.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components (optional, uses Outlet if not provided)
 * @param {boolean} props.strict - If true, only allows active locales (default: true)
 */
function LocaleGuard({ children, strict = true }) {
  const { locale } = useParams();
  const location = useLocation();

  // Validate locale
  const isValid = strict ? isValidLocale(locale) : !!locale;

  if (!isValid) {
    // Invalid locale - redirect to preferred/default locale
    const preferredLocale = detectPreferredLocale() || DEFAULT_LOCALE;

    // Build redirect path with new locale
    const pathAfterLocale = location.pathname.replace(`/${locale}`, '') || '/dashboard';
    const newPath = `/${preferredLocale}${pathAfterLocale}`;

    // Preserve search params and hash
    const search = location.search || '';
    const hash = location.hash || '';

    return <Navigate to={`${newPath}${search}${hash}`} replace />;
  }

  // Valid locale - render with LocaleProvider
  return (
    <LocaleProvider>
      {children || <Outlet />}
    </LocaleProvider>
  );
}

/**
 * LocaleOutlet Component
 *
 * Simplified version of LocaleGuard that just wraps Outlet with LocaleProvider.
 * Use when you need locale context but validation is done elsewhere.
 */
export function LocaleOutlet() {
  return (
    <LocaleProvider>
      <Outlet />
    </LocaleProvider>
  );
}

/**
 * RequireLocale HOC
 *
 * Higher-order component that ensures a component has locale context.
 * Redirects to locale-prefixed URL if not in locale context.
 *
 * @param {React.Component} Component - Component to wrap
 * @returns {React.Component} Wrapped component
 */
export function withRequireLocale(Component) {
  return function WithRequireLocaleComponent(props) {
    const { locale } = useParams();
    const location = useLocation();

    if (!locale || !isValidLocale(locale)) {
      const preferredLocale = detectPreferredLocale() || DEFAULT_LOCALE;
      const newPath = `/${preferredLocale}${location.pathname}`;
      return <Navigate to={newPath} replace />;
    }

    return (
      <LocaleProvider>
        <Component {...props} />
      </LocaleProvider>
    );
  };
}

/**
 * LocaleSwitcher Component
 *
 * Component to switch between available locales.
 * Can be used in header/navigation.
 */
export function LocaleSwitcher({ className = '' }) {
  const { locale } = useParams();
  const location = useLocation();

  const { ACTIVE_LOCALES, LOCALE_CONFIG } = require('../../config/locales');

  const handleLocaleChange = (newLocale) => {
    if (newLocale === locale) return;

    // Replace locale in path
    const newPath = location.pathname.replace(`/${locale}`, `/${newLocale}`);
    window.location.href = `${newPath}${location.search}${location.hash}`;
  };

  return (
    <div className={`locale-switcher ${className}`}>
      {ACTIVE_LOCALES.map((localeCode) => {
        const config = LOCALE_CONFIG[localeCode];
        const isActive = locale === localeCode;

        return (
          <button
            key={localeCode}
            onClick={() => handleLocaleChange(localeCode)}
            className={`locale-option ${isActive ? 'active' : ''}`}
            title={config.name}
            disabled={isActive}
          >
            <span className="locale-flag">{config.flag}</span>
            <span className="locale-code">{config.language.toUpperCase()}</span>
          </button>
        );
      })}
    </div>
  );
}

export default LocaleGuard;
