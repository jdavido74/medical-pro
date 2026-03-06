/**
 * MrzScanner — MVP MRZ parser
 *
 * For MVP: text area where patient types/pastes the 2-3 MRZ lines from their ID.
 * The `mrz` package parses the text and extracts identity data.
 * Image stays in browser memory, never sent to server (RGPD data minimization).
 *
 * Supports: Passport, DNI, NIE, EU ID cards (TD1, TD2, TD3 formats).
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { parse as parseMrz } from 'mrz';
import { Camera, CheckCircle, AlertTriangle, X } from 'lucide-react';

// Map MRZ gender to our format
function mapGender(mrzSex) {
  if (mrzSex === 'male') return 'male';
  if (mrzSex === 'female') return 'female';
  return '';
}

// Format MRZ date (YYMMDD) to ISO (YYYY-MM-DD)
function formatMrzDate(dateStr) {
  if (!dateStr || dateStr.length !== 6) return '';
  const yy = parseInt(dateStr.substring(0, 2), 10);
  const mm = dateStr.substring(2, 4);
  const dd = dateStr.substring(4, 6);
  // Assume 2000s for yy < 50, 1900s otherwise
  const year = yy < 50 ? 2000 + yy : 1900 + yy;
  return `${year}-${mm}-${dd}`;
}

export default function MrzScanner({ onResult, onClose }) {
  const { t } = useTranslation('preconsultation');
  const [mrzText, setMrzText] = useState('');
  const [parseResult, setParseResult] = useState(null);
  const [parseError, setParseError] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const handleImageCapture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleParse = () => {
    const lines = mrzText.trim().split('\n').map(l => l.trim()).filter(Boolean);

    if (lines.length < 2) {
      setParseError(t('mrz.noMrzFound'));
      return;
    }

    try {
      const result = parseMrz(lines);

      if (!result || !result.fields) {
        setParseError(t('mrz.noMrzFound'));
        return;
      }

      const fields = result.fields;
      const parsed = {
        firstName: fields.firstName || '',
        lastName: fields.lastName || '',
        dateOfBirth: formatMrzDate(fields.birthDate),
        gender: mapGender(fields.sex),
        nationality: fields.nationality || '',
        documentNumber: fields.documentNumber || ''
      };

      setParseResult(parsed);
      setParseError(null);
    } catch {
      setParseError(t('mrz.scanError'));
    }
  };

  const handleApply = () => {
    if (parseResult) {
      onResult(parseResult);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">{t('mrz.scanId')}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Photo capture */}
      <div className="mb-4">
        <label className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors">
          <Camera className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-600">
            {imagePreview ? t('mrz.retake') : t('mrz.takePhoto')}
          </span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageCapture}
            className="hidden"
          />
        </label>
      </div>

      {/* Image preview */}
      {imagePreview && (
        <div className="mb-4">
          <img
            src={imagePreview}
            alt="ID document"
            className="max-w-full max-h-48 rounded-lg border border-gray-200 object-contain"
          />
        </div>
      )}

      {/* MRZ text input */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          MRZ (2 or 3 lines from the bottom of the document)
        </label>
        <textarea
          value={mrzText}
          onChange={(e) => {
            setMrzText(e.target.value.toUpperCase());
            setParseError(null);
            setParseResult(null);
          }}
          placeholder={"P<ESPGARCIA<<JUAN<<<<<<<<<<<<<<<<<<<<<\nABC1234560ESP8501011M3012315<<<<<<<<<<<8"}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>

      {/* Parse button */}
      <button
        type="button"
        onClick={handleParse}
        disabled={!mrzText.trim()}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-3"
      >
        {t('mrz.scanning')}
      </button>

      {/* Error */}
      {parseError && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm mb-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {parseError}
        </div>
      )}

      {/* Success result */}
      {parseResult && (
        <div className="p-4 bg-green-50 rounded-lg mb-3">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">{t('mrz.scanSuccess')}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
            {parseResult.firstName && <div><strong>{t('patientForm.firstName')}:</strong> {parseResult.firstName}</div>}
            {parseResult.lastName && <div><strong>{t('patientForm.lastName')}:</strong> {parseResult.lastName}</div>}
            {parseResult.dateOfBirth && <div><strong>{t('patientForm.dateOfBirth')}:</strong> {parseResult.dateOfBirth}</div>}
            {parseResult.nationality && <div><strong>{t('patientForm.nationality')}:</strong> {parseResult.nationality}</div>}
            {parseResult.documentNumber && <div><strong>{t('patientForm.idNumber')}:</strong> {parseResult.documentNumber}</div>}
          </div>
          <button
            type="button"
            onClick={handleApply}
            className="mt-3 w-full px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            {t('patientForm.save')}
          </button>
        </div>
      )}
    </div>
  );
}
