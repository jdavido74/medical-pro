/**
 * ForgotPasswordPage - Request a password reset email
 *
 * Flow:
 * 1. User enters their email
 * 2. Always shows success message (security: no email enumeration)
 * 3. User checks email for reset link
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { baseClient } from '../../api/baseClient';
import { useLocaleNavigation } from '../../hooks/useLocaleNavigation';
import { validateEmail } from '../../utils/validation';
import {
  Mail, CheckCircle, ArrowLeft, Loader2, ArrowRight
} from 'lucide-react';

const ForgotPasswordPage = () => {
  const { t } = useTranslation('auth');
  const { buildPath } = useLocaleNavigation();

  const [email, setEmail] = useState('');
  const [step, setStep] = useState('form'); // form | success
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEmailError('');

    if (!email || !validateEmail(email)) {
      setEmailError(t('validation.invalidEmail', 'Please enter a valid email address'));
      return;
    }

    try {
      setIsSubmitting(true);
      await baseClient.post('/auth/forgot-password', { email });
    } catch (err) {
      // Ignore errors — always show success for security
    } finally {
      setIsSubmitting(false);
      setStep('success');
    }
  };

  // Success state
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {t('forgotPasswordPage.successTitle', 'Email sent!')}
          </h2>
          <p className="text-gray-600 mb-6">
            {t('forgotPasswordPage.successMessage', 'If an account exists with this email, you will receive a link to reset your password. Please check your inbox and spam folder.')}
          </p>
          <a
            href={buildPath('/login')}
            className="w-full inline-flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            {t('forgotPasswordPage.backToLogin', 'Back to login')}
          </a>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            {t('forgotPasswordPage.title', 'Forgot your password?')}
          </h1>
          <p className="text-gray-500 mt-2">
            {t('forgotPasswordPage.subtitle', 'Enter your email and we will send you a link to reset your password.')}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('email', 'Email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                emailError ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder={t('emailPlaceholder', 'your@email.com')}
              required
              disabled={isSubmitting}
              autoFocus
            />
            {emailError && (
              <p className="text-sm text-red-600 mt-1">{emailError}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {t('forgotPasswordPage.sending', 'Sending...')}
              </>
            ) : (
              <>
                {t('forgotPasswordPage.sendLink', 'Send reset link')}
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </form>

        {/* Back to login */}
        <div className="text-center mt-6">
          <a
            href={buildPath('/login')}
            className="text-green-600 hover:text-green-700 text-sm inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('forgotPasswordPage.backToLogin', 'Back to login')}
          </a>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
