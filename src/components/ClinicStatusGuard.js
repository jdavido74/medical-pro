/**
 * Clinic Status Guard Component
 *
 * Purpose: Monitor API responses for clinic status errors and handle them appropriately
 * Intercepts API errors and redirects user if clinic is suspended or deleted
 *
 * Error Codes Handled:
 * - CLINIC_SUSPENDED: Clinic account is suspended (is_active = false)
 * - CLINIC_DELETED: Clinic account has been deleted (deleted_at IS NOT NULL)
 * - CLINIC_NOT_FOUND: Clinic doesn't exist
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

// Simple notification component
const ClinicStatusNotification = ({ message, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-lg font-medium text-gray-900">
              {message.title}
            </h3>
            <div className="mt-2 text-sm text-gray-600">
              <p>{message.message}</p>
              {message.details && <p className="mt-1">{message.details}</p>}
            </div>
            {message.redirecting && (
              <p className="mt-3 text-sm text-green-600 font-medium">
                {message.redirecting}
              </p>
            )}
          </div>
        </div>
        {onClose && (
          <div className="mt-4">
            <button
              onClick={onClose}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded"
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const ClinicStatusGuard = ({ children }) => {
  const { t } = useTranslation();
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    // Listen for clinic status errors from API calls
    const handleClinicStatusError = (event) => {
      const { errorCode } = event.detail;

      const handleClinicError = (titleKey, messageKey, detailsKey) => {
        setNotification({
          title: t(titleKey),
          message: t(messageKey),
          details: detailsKey ? t(detailsKey) : null,
          redirecting: t('common.clinicStatus.inactive.redirecting')
        });

        // Redirect to home after 3 seconds
        setTimeout(() => {
          // Force logout
          localStorage.removeItem('clinicmanager_auth');
          localStorage.removeItem('clinicmanager_token');
          // Reload to reset app state
          window.location.href = '/';
        }, 3000);
      };

      switch (errorCode) {
        case 'CLINIC_SUSPENDED':
          handleClinicError(
            'common.clinicStatus.suspended.title',
            'common.clinicStatus.suspended.message',
            'common.clinicStatus.suspended.details'
          );
          break;

        case 'CLINIC_DELETED':
          handleClinicError(
            'common.clinicStatus.deleted.title',
            'common.clinicStatus.deleted.message',
            'common.clinicStatus.deleted.details'
          );
          break;

        case 'CLINIC_NOT_FOUND':
          handleClinicError(
            'common.clinicStatus.inactive.title',
            'common.clinicStatus.inactive.message',
            null
          );
          break;

        default:
          break;
      }
    };

    // Add event listener
    window.addEventListener('clinicStatusError', handleClinicStatusError);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('clinicStatusError', handleClinicStatusError);
    };
  }, [t]);

  return (
    <>
      {children}
      {notification && (
        <ClinicStatusNotification
          message={notification}
          onClose={() => setNotification(null)}
        />
      )}
    </>
  );
};

export default ClinicStatusGuard;
