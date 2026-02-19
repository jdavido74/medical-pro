/**
 * MobileVitalsScreen - Saisie des constantes vitales depuis mobile
 * Accessible depuis un RDV (avec appointmentId + patientId en query params)
 * ou depuis l'onglet Vitals (mode "sélectionner un patient")
 */

import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Activity, Save, ArrowLeft, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../../contexts/LocaleContext';
import { medicalRecordsApi } from '../../api/medicalRecordsApi';

const INITIAL_FORM = {
  systolic: '',
  diastolic: '',
  heartRate: '',
  temperature: '',
  respiratoryRate: '',
  oxygenSaturation: '',
  bloodGlucose: '',
  weight: '',
  height: ''
};

const MobileVitalsScreen = () => {
  const { t } = useTranslation('mobile');
  const { buildUrl } = useLocale();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const appointmentId = searchParams.get('appointmentId');
  const patientId = searchParams.get('patientId');
  const patientName = searchParams.get('patientName');

  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleChange = (field, value) => {
    // Allow empty, digits, and one decimal point for decimal fields
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Auto-calculate BMI
  const bmi = useMemo(() => {
    const w = parseFloat(form.weight);
    const h = parseFloat(form.height);
    if (w > 0 && h > 0) {
      return (w / ((h / 100) ** 2)).toFixed(1);
    }
    return '';
  }, [form.weight, form.height]);

  const hasData = Object.values(form).some(v => v !== '');

  const handleSave = async () => {
    if (!hasData) {
      showToast(t('vitals.noData'), 'error');
      return;
    }
    setSaving(true);
    try {
      const vitalSigns = {};

      const sys = parseInt(form.systolic, 10);
      const dia = parseInt(form.diastolic, 10);
      if (!isNaN(sys) || !isNaN(dia)) {
        vitalSigns.bloodPressure = {};
        if (!isNaN(sys)) vitalSigns.bloodPressure.systolic = sys;
        if (!isNaN(dia)) vitalSigns.bloodPressure.diastolic = dia;
      }

      const hr = parseInt(form.heartRate, 10);
      if (!isNaN(hr)) vitalSigns.heartRate = hr;

      const temp = parseFloat(form.temperature);
      if (!isNaN(temp)) vitalSigns.temperature = temp;

      const rr = parseInt(form.respiratoryRate, 10);
      if (!isNaN(rr)) vitalSigns.respiratoryRate = rr;

      const spo2 = parseFloat(form.oxygenSaturation);
      if (!isNaN(spo2)) vitalSigns.oxygenSaturation = spo2;

      const glucose = parseFloat(form.bloodGlucose);
      if (!isNaN(glucose)) vitalSigns.bloodGlucose = glucose;

      const weight = parseFloat(form.weight);
      if (!isNaN(weight)) vitalSigns.weight = weight;

      const height = parseFloat(form.height);
      if (!isNaN(height)) vitalSigns.height = height;

      const bmiVal = parseFloat(bmi);
      if (!isNaN(bmiVal)) vitalSigns.bmi = bmiVal;

      await medicalRecordsApi.createMedicalRecord({
        patientId,
        appointmentId,
        recordType: 'consultation',
        vitalSigns
      });

      showToast(t('vitals.saveSuccess'));
      // Return to appointments after short delay
      setTimeout(() => {
        navigate(buildUrl('/mobile/appointments'));
      }, 1200);
    } catch (err) {
      console.error('Error saving vitals:', err);
      showToast(t('vitals.saveError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // No patient context - show placeholder
  if (!patientId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
          <Activity size={32} className="text-purple-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          {t('vitals.title')}
        </h2>
        <p className="text-sm text-gray-500 max-w-xs mb-6">
          {t('vitals.selectFromAppointment')}
        </p>
        <button
          onClick={() => navigate(buildUrl('/mobile/appointments'))}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium"
        >
          <Calendar size={16} />
          {t('vitals.goToAppointments')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <button
          onClick={() => navigate(buildUrl('/mobile/appointments'))}
          className="flex items-center gap-1 text-sm text-green-600 mb-2"
        >
          <ArrowLeft size={16} />
          {t('appointments.title')}
        </button>
        <h1 className="text-lg font-bold text-gray-900">{t('vitals.title')}</h1>
        {patientName && (
          <p className="text-sm text-gray-500 mt-0.5">
            {t('vitals.patient')}: {decodeURIComponent(patientName)}
          </p>
        )}
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Blood pressure */}
        <FieldGroup label={t('vitals.fields.bloodPressure')}>
          <div className="grid grid-cols-2 gap-3">
            <NumericInput
              label={t('vitals.fields.systolic')}
              unit={t('vitals.units.mmHg')}
              value={form.systolic}
              onChange={v => handleChange('systolic', v)}
              inputMode="numeric"
              placeholder="120"
            />
            <NumericInput
              label={t('vitals.fields.diastolic')}
              unit={t('vitals.units.mmHg')}
              value={form.diastolic}
              onChange={v => handleChange('diastolic', v)}
              inputMode="numeric"
              placeholder="80"
            />
          </div>
        </FieldGroup>

        {/* Heart rate */}
        <NumericInput
          label={t('vitals.fields.heartRate')}
          unit={t('vitals.units.bpm')}
          value={form.heartRate}
          onChange={v => handleChange('heartRate', v)}
          inputMode="numeric"
          placeholder="72"
        />

        {/* Temperature */}
        <NumericInput
          label={t('vitals.fields.temperature')}
          unit={t('vitals.units.celsius')}
          value={form.temperature}
          onChange={v => handleChange('temperature', v)}
          inputMode="decimal"
          placeholder="36.5"
          step="0.1"
        />

        {/* Respiratory rate */}
        <NumericInput
          label={t('vitals.fields.respiratoryRate')}
          unit={t('vitals.units.perMin')}
          value={form.respiratoryRate}
          onChange={v => handleChange('respiratoryRate', v)}
          inputMode="numeric"
          placeholder="16"
        />

        {/* O2 Saturation */}
        <NumericInput
          label={t('vitals.fields.oxygenSaturation')}
          unit={t('vitals.units.percent')}
          value={form.oxygenSaturation}
          onChange={v => handleChange('oxygenSaturation', v)}
          inputMode="numeric"
          placeholder="98"
        />

        {/* Blood glucose */}
        <NumericInput
          label={t('vitals.fields.bloodGlucose')}
          unit={t('vitals.units.mgdl')}
          value={form.bloodGlucose}
          onChange={v => handleChange('bloodGlucose', v)}
          inputMode="numeric"
          placeholder="90"
        />

        {/* Weight & Height */}
        <FieldGroup>
          <div className="grid grid-cols-2 gap-3">
            <NumericInput
              label={t('vitals.fields.weight')}
              unit={t('vitals.units.kg')}
              value={form.weight}
              onChange={v => handleChange('weight', v)}
              inputMode="decimal"
              placeholder="70"
              step="0.1"
            />
            <NumericInput
              label={t('vitals.fields.height')}
              unit={t('vitals.units.cm')}
              value={form.height}
              onChange={v => handleChange('height', v)}
              inputMode="numeric"
              placeholder="170"
            />
          </div>
        </FieldGroup>

        {/* BMI (read-only) */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            {t('vitals.fields.bmi')}
          </label>
          <div className="h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 flex items-center">
            <span className="text-base text-gray-700 font-medium">
              {bmi || '—'}
            </span>
          </div>
        </div>

        {/* Save button */}
        <div className="pt-2 pb-4">
          <button
            onClick={handleSave}
            disabled={saving || !hasData}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-medium text-base transition-colors ${
              saving || !hasData
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-green-600 active:bg-green-700'
            }`}
          >
            <Save size={18} />
            {saving ? t('vitals.saving') : t('vitals.save')}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-20 left-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-center ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

/** Reusable field group wrapper */
const FieldGroup = ({ label, children }) => (
  <div>
    {label && (
      <label className="block text-xs font-medium text-gray-500 mb-2">
        {label}
      </label>
    )}
    {children}
  </div>
);

/** Reusable numeric input with label and unit */
const NumericInput = ({ label, unit, value, onChange, inputMode = 'numeric', placeholder, step }) => (
  <div>
    {label && (
      <label className="block text-xs font-medium text-gray-500 mb-1">
        {label}
      </label>
    )}
    <div className="relative">
      <input
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        step={step}
        className="w-full h-12 bg-white border border-gray-200 rounded-xl px-4 pr-16 text-base text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
      />
      {unit && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
          {unit}
        </span>
      )}
    </div>
  </div>
);

export default MobileVitalsScreen;
