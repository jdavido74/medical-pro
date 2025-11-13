// components/auth/EmailVerificationCallback.js
import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import baseClient from '../../utils/baseClient';

const EmailVerificationCallback = ({ token, setCurrentPage }) => {
  const { t } = useTranslation('auth');
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');
  const [errorDetails, setErrorDetails] = useState('');
  const [countdown, setCountdown] = useState(10); // 10 seconds to give time to read the message
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      console.log('[EmailVerificationCallback] Starting verification with token:', token?.substring(0, 20) + '...');

      if (!token) {
        setStatus('error');
        setMessage(t('emailVerification.error') || 'Invalid verification link');
        setErrorDetails(t('emailVerification.noToken') || 'No verification token provided');
        return;
      }

      try {
        console.log('[EmailVerificationCallback] Calling verify-email API...');
        const response = await baseClient.post(`/auth/verify-email/${token}`, {});

        console.log('[EmailVerificationCallback] Response:', response);

        if (response.success && response.data?.user) {
          setUserEmail(response.data.user.email);
          setStatus('success');
          setMessage(t('emailVerification.successMessage') || 'Email verified successfully!');

          console.log('[EmailVerificationCallback] Email verified successfully, redirecting in 10 seconds...');

          // Redirect to login after countdown
          const timer = setInterval(() => {
            setCountdown(prev => {
              if (prev <= 1) {
                clearInterval(timer);
                console.log('[EmailVerificationCallback] Redirecting to login');
                setCurrentPage('login');
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          setStatus('error');
          setMessage(response.error?.message || t('emailVerification.error') || 'Verification failed');
          setErrorDetails(response.error?.details || '');
          console.error('[EmailVerificationCallback] Verification failed:', response);
        }
      } catch (error) {
        setStatus('error');
        setMessage(error.message || t('emailVerification.error') || 'An error occurred');
        setErrorDetails(
          error.data?.error?.details ||
          error.data?.message ||
          'Please try again or request a new verification link'
        );
        console.error('[EmailVerificationCallback] Error:', error);
      }
    };

    verifyEmail();
  }, [token, t, setCurrentPage]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Verifying state */}
        {status === 'verifying' && (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-100 rounded-full p-4">
                <Loader className="h-12 w-12 text-blue-600 animate-spin" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {t('emailVerification.verifying') || 'Verifying...'}
            </h1>
            <p className="text-gray-600">
              {t('emailVerification.pleaseWait') || 'Please wait while we verify your email address'}
            </p>
          </div>
        )}

        {/* Success state */}
        {status === 'success' && (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-green-100 rounded-full p-4">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {t('emailVerification.success') || 'Email Verified!'}
            </h1>
            <p className="text-gray-600 mb-3">
              {message}
            </p>

            {userEmail && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
                <p className="text-xs text-gray-600 mb-1">✅ Email address verified:</p>
                <p className="text-sm font-medium text-green-700 break-all">{userEmail}</p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                ⏱️ {t('emailVerification.redirecting') || `Redirecting to login in ${countdown} seconds...`}
              </p>
              <div className="mt-3 flex justify-center">
                <div className="flex gap-1">
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 w-2 rounded-full transition-all ${
                        i < 10 - countdown ? 'bg-blue-600' : 'bg-blue-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setCurrentPage('login')}
              className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              {t('emailVerification.goToLogin') || 'Go to Login Now'}
            </button>

            <p className="text-xs text-gray-500 mt-4">
              💡 {t('emailVerification.confirmationEmailNote') || 'A confirmation email has been sent to your inbox'}
            </p>
          </div>
        )}

        {/* Error state */}
        {status === 'error' && (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 rounded-full p-4">
                <AlertCircle className="h-12 w-12 text-red-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {t('emailVerification.error') || 'Verification Failed'}
            </h1>
            <p className="text-gray-600 mb-2">
              {message}
            </p>
            {errorDetails && (
              <p className="text-sm text-gray-500 mb-6">
                {errorDetails}
              </p>
            )}

            <div className="space-y-3">
              <button
                onClick={() => setCurrentPage('email-verification')}
                className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                {t('emailVerification.resendLink') || 'Request New Link'}
              </button>
              <button
                onClick={() => setCurrentPage('login')}
                className="w-full bg-gray-200 text-gray-800 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                {t('emailVerification.goToLogin') || 'Go to Login'}
              </button>
            </div>
          </div>
        )}

        {/* Security note */}
        <div className="mt-8 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-600">
            <span className="font-medium">🔒 {t('emailVerification.secure') || 'Secure verification'}</span>
            <br />
            {t('emailVerification.secureNote') || 'This verification link expires in 24 hours for your security'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationCallback;
