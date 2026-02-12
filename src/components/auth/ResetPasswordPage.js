/**
 * ResetPasswordPage - Set a new password using a reset token
 *
 * Flow:
 * 1. User clicks reset link in email (contains token)
 * 2. Page verifies token and shows user info
 * 3. User enters new password
 * 4. Password is reset and user can login
 *
 * Calqued on SetPasswordPage.js with adaptations for reset flow.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { baseClient } from '../../api/baseClient';
import { useLocaleNavigation } from '../../hooks/useLocaleNavigation';
import {
  KeyRound, User, CheckCircle,
  AlertCircle, Loader2, Eye, EyeOff, ArrowRight, Shield
} from 'lucide-react';

const ResetPasswordPage = () => {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { buildPath } = useLocaleNavigation();

  const token = searchParams.get('token');

  const [step, setStep] = useState('loading'); // loading, form, success, error
  const [userInfo, setUserInfo] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setStep('error');
      setError({
        code: 'NO_TOKEN',
        message: t('resetPassword.errors.noToken', 'No reset token provided')
      });
      return;
    }

    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      setStep('loading');
      const response = await baseClient.post('/auth/verify-reset-token', { token });

      if (response.success) {
        setUserInfo(response.data);
        setStep('form');
      } else {
        throw new Error(response.error?.message || 'Verification failed');
      }
    } catch (err) {
      console.error('[ResetPasswordPage] Token verification failed:', err);
      setStep('error');
      setError({
        code: err.response?.data?.error?.code || 'VERIFICATION_FAILED',
        message: err.response?.data?.error?.message || err.message || t('resetPassword.errors.verificationFailed', 'Failed to verify reset token')
      });
    }
  };

  const validatePassword = () => {
    if (password.length < 8) {
      setError({ message: t('resetPassword.errors.passwordTooShort', 'Password must be at least 8 characters') });
      return false;
    }
    if (password !== confirmPassword) {
      setError({ message: t('resetPassword.errors.passwordMismatch', 'Passwords do not match') });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validatePassword()) return;

    try {
      setIsSubmitting(true);
      const response = await baseClient.post('/auth/reset-password', { token, password });

      if (response.success) {
        setStep('success');
      } else {
        throw new Error(response.error?.message || 'Failed to reset password');
      }
    } catch (err) {
      console.error('[ResetPasswordPage] Reset password failed:', err);
      setError({
        code: err.response?.data?.error?.code || 'RESET_FAILED',
        message: err.response?.data?.error?.message || err.message || t('resetPassword.errors.resetFailed', 'Failed to reset password')
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToLogin = () => {
    navigate(buildPath('/login'));
  };

  const goToForgotPassword = () => {
    navigate(buildPath('/forgot-password'));
  };

  // Loading state
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center">
          <Loader2 className="h-12 w-12 text-green-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800">
            {t('resetPassword.verifying', 'Verifying reset link...')}
          </h2>
          <p className="text-gray-500 mt-2">
            {t('resetPassword.pleaseWait', 'Please wait while we verify your reset link')}
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {error?.code === 'TOKEN_EXPIRED'
              ? t('resetPassword.errors.tokenExpiredTitle', 'Link Expired')
              : t('resetPassword.errors.title', 'Invalid Link')}
          </h2>
          <p className="text-gray-600 mb-6">
            {error?.message}
          </p>
          {error?.code === 'TOKEN_EXPIRED' && (
            <button
              onClick={goToForgotPassword}
              className="w-full bg-amber-500 text-white py-3 rounded-lg hover:bg-amber-600 transition-colors mb-3"
            >
              {t('resetPassword.errors.requestNewLink', 'Request a new reset link')}
            </button>
          )}
          <button
            onClick={goToLogin}
            className="w-full bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            {t('resetPassword.goToLogin', 'Go to Login')}
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {t('resetPassword.success.title', 'Password Reset!')}
          </h2>
          <p className="text-gray-600 mb-6">
            {t('resetPassword.success.message', 'Your password has been reset successfully. You can now log in with your new password.')}
          </p>
          <button
            onClick={goToLogin}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            {t('resetPassword.success.loginButton', 'Go to Login')}
            <ArrowRight className="h-5 w-5" />
          </button>
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
            <KeyRound className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            {t('resetPassword.title', 'Reset Your Password')}
          </h1>
          <p className="text-gray-500 mt-2">
            {t('resetPassword.subtitle', 'Choose a new secure password for your account')}
          </p>
        </div>

        {/* User Info Card */}
        {userInfo && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-white font-semibold">
                {userInfo.firstName?.[0]}{userInfo.lastName?.[0]}
              </div>
              <div>
                <p className="font-medium text-gray-800">
                  {userInfo.firstName} {userInfo.lastName}
                </p>
                <p className="text-sm text-gray-500">{userInfo.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <span>{error.message}</span>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('resetPassword.password', 'New Password')} *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent pr-12"
                placeholder={t('resetPassword.passwordPlaceholder', 'Enter your new password')}
                required
                minLength={8}
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {t('resetPassword.passwordHint', 'Minimum 8 characters')}
            </p>
          </div>

          {/* Confirm Password Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('resetPassword.confirmPassword', 'Confirm Password')} *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent pr-12"
                placeholder={t('resetPassword.confirmPasswordPlaceholder', 'Confirm your new password')}
                required
                minLength={8}
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Security Notice */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
            <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700">
              {t('resetPassword.securityNotice', 'Your password is encrypted and stored securely. We never store passwords in plain text.')}
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {t('resetPassword.resetting', 'Resetting...')}
              </>
            ) : (
              <>
                {t('resetPassword.resetButton', 'Reset My Password')}
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
