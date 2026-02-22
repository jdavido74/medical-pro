/**
 * MobileVitalsScreen - Saisie des constantes vitales depuis mobile
 * Accessible depuis un RDV (avec appointmentId + patientId en query params)
 * ou depuis l'onglet Vitals (mode "sélectionner un patient")
 *
 * Find-or-create logic:
 * - Pre-checks for existing record today (info banner)
 * - Same appointment → appends to additional_readings
 * - Different appointment → 409 conflict dialog
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Activity, Save, ArrowLeft, Calendar, Info, X, FilePlus, FileText, Clock, ChevronDown } from 'lucide-react';
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
  observations: ''
};

/** Build vitalSigns object from form state + selected treatment */
function buildVitalSigns(form, selectedTreatment) {
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

  if (form.observations?.trim()) {
    vitalSigns.observations = form.observations.trim();
  }

  if (selectedTreatment) {
    vitalSigns.treatmentId = selectedTreatment.catalog_item_id || selectedTreatment.appointment_item_id;
    vitalSigns.treatmentName = selectedTreatment.medication;
  }

  return vitalSigns;
}

/** Format current date/time for display */
function formatDateTime(locale) {
  const now = new Date();
  return now.toLocaleString(locale === 'fr' ? 'fr-FR' : locale === 'es' ? 'es-ES' : 'en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

const MobileVitalsScreen = () => {
  const { t, i18n } = useTranslation('mobile');
  const { buildUrl } = useLocale();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const appointmentId = searchParams.get('appointmentId');
  const patientId = searchParams.get('patientId');
  const patientName = searchParams.get('patientName');

  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [existingRecord, setExistingRecord] = useState(null);
  const [conflictRecord, setConflictRecord] = useState(null);
  const [treatments, setTreatments] = useState([]);
  const [selectedTreatmentIdx, setSelectedTreatmentIdx] = useState(-1); // -1 = none/general

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Pre-check: look for existing medical record for this patient today
  useEffect(() => {
    if (!patientId) return;
    const today = new Date().toISOString().slice(0, 10);
    medicalRecordsApi.getMedicalRecords({
      patientId,
      dateFrom: today,
      dateTo: today
    }).then(result => {
      const records = result.records || [];
      if (records.length > 0) {
        setExistingRecord(records[0]);
      }
    }).catch(() => {});
  }, [patientId]);

  // Load treatments from appointment
  useEffect(() => {
    if (!appointmentId) return;
    medicalRecordsApi.getAppointmentTreatments(appointmentId)
      .then(items => {
        if (items && items.length > 0) {
          setTreatments(items);
          // Auto-select first active treatment
          const activeIdx = items.findIndex(t => t.status === 'active' || t.status === 'proposed');
          setSelectedTreatmentIdx(activeIdx >= 0 ? activeIdx : 0);
        }
      })
      .catch(() => {});
  }, [appointmentId]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const hasData = Object.entries(form).some(([k, v]) => k !== 'observations' && v !== '');

  // Count existing readings for the banner
  const existingReadingsCount = (() => {
    if (!existingRecord) return 0;
    const vs = existingRecord.vitalSigns || existingRecord.vital_signs;
    if (!vs) return 0;
    const additional = vs.additionalReadings || vs.additional_readings || [];
    return 1 + additional.length;
  })();

  const selectedTreatment = selectedTreatmentIdx >= 0 ? treatments[selectedTreatmentIdx] : null;

  /** Main save handler */
  const doSave = useCallback(async (opts = {}) => {
    const vitalSigns = buildVitalSigns(form, selectedTreatment);
    setSaving(true);
    try {
      const result = await medicalRecordsApi.saveVitals({
        patientId,
        appointmentId,
        vitalSigns,
        ...opts
      });

      const toastKey = result.action === 'appended'
        ? 'vitals.saveSuccessAppended'
        : 'vitals.saveSuccess';
      showToast(t(toastKey));

      setTimeout(() => {
        navigate(buildUrl('/mobile/appointments'));
      }, 1200);
    } catch (err) {
      if (err.status === 409 && err.data?.existingRecord) {
        setConflictRecord(err.data.existingRecord);
        return;
      }
      console.error('Error saving vitals:', err);
      showToast(t('vitals.saveError'), 'error');
    } finally {
      setSaving(false);
    }
  }, [form, selectedTreatment, patientId, appointmentId, t, navigate, buildUrl]);

  const handleSave = async () => {
    if (!hasData) {
      showToast(t('vitals.noData'), 'error');
      return;
    }
    await doSave();
  };

  const handleUseExisting = async () => {
    const recordId = conflictRecord?.id;
    setConflictRecord(null);
    await doSave({ useExistingRecordId: recordId });
  };

  const handleCreateNew = async () => {
    setConflictRecord(null);
    await doSave({ forceCreate: true });
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

      {/* Existing record info banner */}
      {existingRecord && (
        <div className="mx-4 mt-3 flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <Info size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 leading-relaxed">
            {t('vitals.existingRecordBanner', { count: existingReadingsCount })}
          </p>
        </div>
      )}

      {/* Scrollable form */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">
        {/* Date/time (read-only) */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            {t('vitals.dateTime')}
          </label>
          <div className="h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 flex items-center gap-2">
            <Clock size={16} className="text-gray-400" />
            <span className="text-sm text-gray-700 font-medium">
              {formatDateTime(i18n.language)}
            </span>
          </div>
        </div>

        {/* Treatment selector */}
        {treatments.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {t('vitals.treatment')}
            </label>
            <div className="relative">
              <select
                value={selectedTreatmentIdx}
                onChange={e => setSelectedTreatmentIdx(parseInt(e.target.value, 10))}
                className="w-full h-12 bg-white border border-gray-200 rounded-xl px-4 pr-10 text-sm text-gray-900 appearance-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value={-1}>{t('vitals.treatmentNone')}</option>
                {treatments.map((tr, idx) => (
                  <option key={idx} value={idx}>
                    {tr.medication}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}

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

        {/* Observations */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            {t('vitals.observations')}
          </label>
          <textarea
            value={form.observations}
            onChange={e => handleChange('observations', e.target.value)}
            placeholder={t('vitals.observationsPlaceholder')}
            rows={3}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
          />
        </div>
      </div>

      {/* Sticky save button */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3 pb-safe">
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

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-20 left-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-center ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Conflict bottom-sheet dialog */}
      {conflictRecord && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setConflictRecord(null)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl animate-slide-up">
            <div className="p-5">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-gray-900">
                  {t('vitals.conflict.title')}
                </h3>
                <button
                  onClick={() => setConflictRecord(null)}
                  className="p-1 text-gray-400"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-5 leading-relaxed">
                {t('vitals.conflict.message')}
              </p>
              <div className="space-y-2.5">
                <button
                  onClick={handleUseExisting}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-white font-medium text-sm active:bg-blue-700"
                >
                  <FileText size={16} />
                  {t('vitals.conflict.useExisting')}
                </button>
                <button
                  onClick={handleCreateNew}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white font-medium text-sm active:bg-green-700"
                >
                  <FilePlus size={16} />
                  {t('vitals.conflict.createNew')}
                </button>
                <button
                  onClick={() => setConflictRecord(null)}
                  className="w-full py-3 rounded-xl text-gray-500 font-medium text-sm border border-gray-200"
                >
                  {t('vitals.conflict.cancel')}
                </button>
              </div>
            </div>
            <div className="h-6" />
          </div>
        </>
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
