/**
 * PatientInfoStep — Patient information form with MRZ scanner
 *
 * Pre-filled from existing patient data.
 * Two-column on desktop, single column on mobile.
 * MRZ scanner: text input for MRZ lines (MVP) with mrz package parsing.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Loader, CreditCard, CheckCircle, AlertTriangle } from 'lucide-react';
import { submitPatientInfo } from '../../api/preconsultationApi';
import MrzScanner from './MrzScanner';

export default function PatientInfoStep({ token, patient, onComplete }) {
  const { t } = useTranslation('preconsultation');

  const [form, setForm] = useState({
    first_name: patient?.firstName || '',
    last_name: patient?.lastName || '',
    email: patient?.email || '',
    phone: patient?.phone || '',
    birth_date: patient?.dateOfBirth ? patient.dateOfBirth.split('T')[0] : '',
    gender: patient?.gender || '',
    nationality: patient?.nationality || '',
    id_number: patient?.idNumber || '',
    social_security: patient?.socialSecurity || '',
    address_line1: patient?.addressLine1 || '',
    address_line2: patient?.addressLine2 || '',
    city: patient?.city || '',
    postal_code: patient?.postalCode || '',
    country: patient?.country || ''
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [showMrz, setShowMrz] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setSaved(false);
  };

  const handleMrzResult = (mrzData) => {
    setForm(prev => ({
      ...prev,
      first_name: mrzData.firstName || prev.first_name,
      last_name: mrzData.lastName || prev.last_name,
      birth_date: mrzData.dateOfBirth || prev.birth_date,
      gender: mrzData.gender || prev.gender,
      nationality: mrzData.nationality || prev.nationality,
      id_number: mrzData.documentNumber || prev.id_number
    }));
    setShowMrz(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError(t('patientForm.required'));
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await submitPatientInfo(token, form);
      setSaved(true);
      if (onComplete) onComplete();
    } catch (err) {
      setError(err.message || t('notifications.errorGeneric'));
    } finally {
      setSaving(false);
    }
  };

  const inputClasses = "w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">{t('patientForm.title')}</h2>
        <p className="text-sm text-gray-500 mt-1">{t('patientForm.subtitle')}</p>
      </div>

      {/* MRZ Scanner toggle */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setShowMrz(!showMrz)}
          className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors w-full sm:w-auto justify-center"
        >
          <CreditCard className="w-5 h-5" />
          <span className="text-sm font-medium">{t('mrz.scanId')}</span>
        </button>
        <p className="text-xs text-gray-400 mt-1">{t('mrz.scanIdSubtitle')}</p>
      </div>

      {showMrz && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <MrzScanner onResult={handleMrzResult} onClose={() => setShowMrz(false)} />
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* First name */}
          <div>
            <label className={labelClasses}>{t('patientForm.firstName')} *</label>
            <input
              type="text"
              name="first_name"
              value={form.first_name}
              onChange={handleChange}
              required
              className={inputClasses}
            />
          </div>

          {/* Last name */}
          <div>
            <label className={labelClasses}>{t('patientForm.lastName')} *</label>
            <input
              type="text"
              name="last_name"
              value={form.last_name}
              onChange={handleChange}
              required
              className={inputClasses}
            />
          </div>

          {/* Email */}
          <div>
            <label className={labelClasses}>{t('patientForm.email')}</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className={inputClasses}
            />
          </div>

          {/* Phone */}
          <div>
            <label className={labelClasses}>{t('patientForm.phone')}</label>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className={inputClasses}
            />
          </div>

          {/* Date of birth */}
          <div>
            <label className={labelClasses}>{t('patientForm.dateOfBirth')}</label>
            <input
              type="date"
              name="birth_date"
              value={form.birth_date}
              onChange={handleChange}
              className={inputClasses}
            />
          </div>

          {/* Gender */}
          <div>
            <label className={labelClasses}>{t('patientForm.gender')}</label>
            <select name="gender" value={form.gender} onChange={handleChange} className={inputClasses}>
              <option value="">-</option>
              <option value="M">{t('patientForm.genderMale')}</option>
              <option value="F">{t('patientForm.genderFemale')}</option>
              <option value="O">{t('patientForm.genderOther')}</option>
            </select>
          </div>

          {/* Nationality */}
          <div>
            <label className={labelClasses}>{t('patientForm.nationality')}</label>
            <input
              type="text"
              name="nationality"
              value={form.nationality}
              onChange={handleChange}
              className={inputClasses}
            />
          </div>

          {/* ID Number */}
          <div>
            <label className={labelClasses}>{t('patientForm.idNumber')}</label>
            <input
              type="text"
              name="id_number"
              value={form.id_number}
              onChange={handleChange}
              className={inputClasses}
            />
          </div>

          {/* Social Security */}
          <div className="sm:col-span-2">
            <label className={labelClasses}>{t('patientForm.socialSecurity')}</label>
            <input
              type="text"
              name="social_security"
              value={form.social_security}
              onChange={handleChange}
              className={inputClasses}
            />
          </div>

          {/* Address */}
          <div className="sm:col-span-2">
            <label className={labelClasses}>{t('patientForm.addressLine1')}</label>
            <input
              type="text"
              name="address_line1"
              value={form.address_line1}
              onChange={handleChange}
              className={inputClasses}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClasses}>{t('patientForm.addressLine2')}</label>
            <input
              type="text"
              name="address_line2"
              value={form.address_line2}
              onChange={handleChange}
              className={inputClasses}
            />
          </div>

          <div>
            <label className={labelClasses}>{t('patientForm.postalCode')}</label>
            <input
              type="text"
              name="postal_code"
              value={form.postal_code}
              onChange={handleChange}
              className={inputClasses}
            />
          </div>

          <div>
            <label className={labelClasses}>{t('patientForm.city')}</label>
            <input
              type="text"
              name="city"
              value={form.city}
              onChange={handleChange}
              className={inputClasses}
            />
          </div>

          <div>
            <label className={labelClasses}>{t('patientForm.state')}</label>
            <input
              type="text"
              name="state"
              value={form.state}
              onChange={handleChange}
              className={inputClasses}
            />
          </div>

          <div>
            <label className={labelClasses}>{t('patientForm.country')}</label>
            <input
              type="text"
              name="country"
              value={form.country}
              onChange={handleChange}
              className={inputClasses}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Success */}
        {saved && (
          <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            {t('patientForm.saved')}
          </div>
        )}

        {/* Submit */}
        <div className="mt-6">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                {t('patientForm.saving')}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {t('patientForm.save')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
