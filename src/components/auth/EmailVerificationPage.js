// components/auth/EmailVerificationPage.js
import React, { useState } from 'react';
import { Mail, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import baseClient from '../../utils/baseClient';

const EmailVerificationPage = ({ email, setCurrentPage }) => {
  const { t } = useTranslation('auth');
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendError, setResendError] = useState('');

  const handleResendEmail = async () => {
    setIsResending(true);
    setResendMessage('');
    setResendError('');

    try {
      const response = await baseClient.post('/auth/resend-verification-email', {
        email: email
      });

      if (response.success) {
        setResendMessage(t('emailVerification.emailSent'));
      } else {
        setResendError(response.error?.message || t('emailVerification.errorSending'));
      }
    } catch (error) {
      setResendError(error.message || t('emailVerification.errorSending'));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Header with icon */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-green-100 rounded-full p-4">
              <Mail className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t('emailVerification.title')}
          </h1>
          <p className="text-gray-600 mt-2">
            {t('emailVerification.checkEmail')}
          </p>
        </div>

        {/* Email display */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600 mb-1">
            {t('emailVerification.subtitle')}
          </p>
          <p className="text-lg font-bold text-blue-900 break-all">
            {email}
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-800 font-medium mb-1">
                {t('emailVerification.checkEmail')}
              </p>
              <p className="text-sm text-yellow-700">
                {t('emailVerification.instructions')}
              </p>
              <p className="text-xs text-yellow-600 mt-2">
                {t('emailVerification.noSpam')}
              </p>
            </div>
          </div>
        </div>

        {/* Resend email section */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600 mb-3">
            {t('emailVerification.resend')}
          </p>
          <button
            onClick={handleResendEmail}
            disabled={isResending}
            className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isResending ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                {t('emailVerification.resending')}
              </>
            ) : (
              t('emailVerification.resendLink')
            )}
          </button>
        </div>

        {/* Success message */}
        {resendMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">{resendMessage}</p>
            </div>
          </div>
        )}

        {/* Error message */}
        {resendError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{resendError}</p>
            </div>
          </div>
        )}

        {/* Additional help */}
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-xs text-blue-800 mb-3">
            <span className="font-medium">💡 {t('emailVerification.checkEmail')}:</span>
          </p>
          <ul className="text-xs text-blue-700 space-y-1 ml-4 list-disc">
            <li>{t('emailVerification.instructions')}</li>
            <li>{t('emailVerification.noSpam')}</li>
            <li>
              {t('emailVerification.resend')}{' '}
              <button
                onClick={handleResendEmail}
                disabled={isResending}
                className="text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
              >
                {t('emailVerification.resendLink')}
              </button>
            </li>
          </ul>
        </div>

        {/* Back to login */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 mb-3">
            {t('emailVerification.goToLogin')}
          </p>
          <button
            onClick={() => setCurrentPage('login')}
            className="text-green-600 hover:text-green-700 font-medium text-sm"
          >
            ← {t('login')}
          </button>
        </div>

        {/* Info box - Development testing */}
        <div className="mt-8 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-xs text-purple-800 font-medium mb-2">
            🧪 Development Mode:
          </p>
          <p className="text-xs text-purple-700 mb-2">
            In development, check the server logs or use a testing email service like Mailhog to view verification emails.
          </p>
          <p className="text-xs text-purple-600">
            Backend logs: <code className="bg-white px-1 py-0.5 rounded text-purple-900">tail -f /tmp/backend.log</code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationPage;
