/**
 * PrescriptionPreview - Composant de prévisualisation d'ordonnance
 *
 * Affiche une ordonnance dans un format imprimable avec :
 * - En-tête avec informations du médecin et de la clinique
 * - Informations du patient
 * - Signes vitaux du jour de la visite
 * - Diagnostic
 * - Liste des médicaments prescrits
 * - Notes additionnelles
 * - Pied de page avec date et signature
 */

import React, { forwardRef, useRef } from 'react';
import { X, Printer, Download, CheckCircle, AlertTriangle } from 'lucide-react';
import { useLocale } from '../../contexts/LocaleContext';

const PrescriptionPreview = forwardRef(({
  prescription,
  patient,
  provider,
  clinicInfo,
  onClose,
  onPrint,
  onFinalize,
  isFinalized = false
}, ref) => {
  const printRef = useRef(null);
  const { locale } = useLocale();

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale, {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  // Format birth date to calculate age
  const calculateAge = (birthDate) => {
    if (!birthDate) return '';
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return `${age} ans`;
  };

  // Get patient info from snapshot or props
  const patientInfo = prescription?.patientSnapshot || patient || {};
  const providerInfo = prescription?.providerSnapshot || provider || {};
  const vitalSigns = prescription?.vitalSigns || {};
  const diagnosis = prescription?.diagnosis || {};

  // Handle print
  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ordonnance - ${prescription?.prescriptionNumber || ''}</title>
          <style>
            @page {
              size: A4;
              margin: 1cm;
            }
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              font-size: 11pt;
              line-height: 1.4;
              color: #333;
              margin: 0;
              padding: 20px;
            }
            .header {
              display: flex;
              justify-content: space-between;
              border-bottom: 2px solid #2563eb;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .provider-info {
              text-align: left;
            }
            .provider-name {
              font-size: 16pt;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 5px;
            }
            .provider-specialty {
              font-size: 12pt;
              color: #666;
              margin-bottom: 10px;
            }
            .provider-contact {
              font-size: 9pt;
              color: #666;
            }
            .clinic-info {
              text-align: right;
              font-size: 9pt;
              color: #666;
            }
            .prescription-number {
              font-size: 10pt;
              font-weight: bold;
              color: #2563eb;
              margin-top: 10px;
            }
            .patient-section {
              background: #f0f9ff;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .patient-section h3 {
              margin: 0 0 10px 0;
              color: #1e40af;
              font-size: 12pt;
            }
            .patient-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
            }
            .patient-info-item {
              font-size: 10pt;
            }
            .vital-signs {
              background: #f0fdf4;
              padding: 10px 15px;
              border-radius: 8px;
              margin-bottom: 15px;
              font-size: 9pt;
            }
            .vital-signs-title {
              font-weight: bold;
              color: #166534;
              margin-bottom: 5px;
            }
            .vital-signs-grid {
              display: flex;
              gap: 20px;
              flex-wrap: wrap;
            }
            .diagnosis-section {
              background: #fef3c7;
              padding: 10px 15px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .diagnosis-title {
              font-weight: bold;
              color: #92400e;
              margin-bottom: 5px;
              font-size: 10pt;
            }
            .medications-title {
              font-size: 14pt;
              font-weight: bold;
              color: #2563eb;
              margin: 20px 0 15px 0;
              border-bottom: 1px solid #ddd;
              padding-bottom: 5px;
            }
            .medication-item {
              background: #fff;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 12px 15px;
              margin-bottom: 10px;
            }
            .medication-name {
              font-weight: bold;
              font-size: 12pt;
              color: #1f2937;
              margin-bottom: 5px;
            }
            .medication-details {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 10px;
              font-size: 10pt;
              color: #4b5563;
            }
            .medication-instructions {
              margin-top: 8px;
              font-style: italic;
              color: #6b7280;
              font-size: 9pt;
            }
            .additional-notes {
              margin-top: 20px;
              padding: 15px;
              background: #f9fafb;
              border-radius: 8px;
              font-size: 10pt;
            }
            .additional-notes-title {
              font-weight: bold;
              margin-bottom: 5px;
            }
            .footer {
              margin-top: 40px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .date-location {
              font-size: 10pt;
            }
            .signature {
              text-align: right;
            }
            .signature-line {
              border-top: 1px solid #333;
              width: 200px;
              margin-top: 50px;
              padding-top: 5px;
              font-size: 9pt;
            }
            .watermark {
              position: fixed;
              bottom: 20px;
              right: 20px;
              font-size: 8pt;
              color: #9ca3af;
            }
            @media print {
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
      onPrint && onPrint();
    }, 250);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Prévisualisation de l'ordonnance</h2>
            <p className="text-blue-200 text-sm">
              {prescription?.prescriptionNumber || 'Nouvelle ordonnance'}
              {isFinalized && ' - Finalisée'}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {!isFinalized && onFinalize && (
              <button
                onClick={onFinalize}
                className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Finaliser</span>
              </button>
            )}
            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimer</span>
            </button>
            <button
              onClick={onClose}
              className="text-white hover:bg-blue-700 p-2 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Preview Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
          <div
            ref={printRef}
            className="bg-white rounded-lg shadow-lg p-8 max-w-[210mm] mx-auto"
            style={{ minHeight: '297mm' }}
          >
            {/* Header - Provider & Clinic Info */}
            <div className="header flex justify-between border-b-2 border-blue-600 pb-4 mb-6">
              <div className="provider-info">
                <div className="provider-name text-xl font-bold text-blue-600">
                  Dr. {providerInfo.firstName} {providerInfo.lastName}
                </div>
                <div className="provider-specialty text-gray-600">
                  {providerInfo.specialty || 'Médecin'}
                </div>
                <div className="provider-contact text-sm text-gray-500 space-y-1">
                  {providerInfo.rpps && <div>RPPS: {providerInfo.rpps}</div>}
                  {providerInfo.adeli && <div>ADELI: {providerInfo.adeli}</div>}
                </div>
              </div>
              <div className="clinic-info text-right text-sm text-gray-500">
                <div className="font-semibold">{clinicInfo?.name || 'Clinique'}</div>
                <div>{clinicInfo?.address || ''}</div>
                <div>{clinicInfo?.phone || ''}</div>
                <div className="prescription-number text-blue-600 font-bold mt-2">
                  N° {prescription?.prescriptionNumber || 'ORD-XXXX-XX-XXXX'}
                </div>
              </div>
            </div>

            {/* Patient Section */}
            <div className="patient-section bg-blue-50 p-4 rounded-lg mb-6">
              <h3 className="text-blue-800 font-semibold mb-3">Patient</h3>
              <div className="patient-info grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Nom: </span>
                  <span className="font-medium">
                    {patientInfo.firstName} {patientInfo.lastName}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Date de naissance: </span>
                  <span className="font-medium">
                    {formatDate(patientInfo.birthDate)} ({calculateAge(patientInfo.birthDate)})
                  </span>
                </div>
                {patientInfo.gender && (
                  <div>
                    <span className="text-gray-500">Sexe: </span>
                    <span className="font-medium">
                      {patientInfo.gender === 'M' ? 'Masculin' : 'Féminin'}
                    </span>
                  </div>
                )}
                {patientInfo.patientNumber && (
                  <div>
                    <span className="text-gray-500">N° Patient: </span>
                    <span className="font-medium">{patientInfo.patientNumber}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Vital Signs */}
            {Object.keys(vitalSigns).length > 0 && (
              <div className="vital-signs bg-green-50 p-3 rounded-lg mb-4">
                <div className="vital-signs-title text-green-800 font-semibold text-sm mb-2">
                  Signes vitaux du jour
                </div>
                <div className="vital-signs-grid flex flex-wrap gap-4 text-sm">
                  {vitalSigns.weight && <span>Poids: {vitalSigns.weight} kg</span>}
                  {vitalSigns.height && <span>Taille: {vitalSigns.height} cm</span>}
                  {vitalSigns.bmi && <span>IMC: {vitalSigns.bmi}</span>}
                  {vitalSigns.bloodPressure && (
                    <span>TA: {vitalSigns.bloodPressure.systolic}/{vitalSigns.bloodPressure.diastolic} mmHg</span>
                  )}
                  {vitalSigns.heartRate && <span>FC: {vitalSigns.heartRate} bpm</span>}
                  {vitalSigns.temperature && <span>T°: {vitalSigns.temperature}°C</span>}
                </div>
              </div>
            )}

            {/* Diagnosis */}
            {(diagnosis.primary || (diagnosis.secondary && diagnosis.secondary.length > 0)) && (
              <div className="diagnosis-section bg-amber-50 p-3 rounded-lg mb-6">
                <div className="diagnosis-title text-amber-800 font-semibold text-sm">
                  Diagnostic
                </div>
                {diagnosis.primary && (
                  <div className="text-sm mt-1">
                    <span className="font-medium">Principal: </span>
                    {diagnosis.primary}
                  </div>
                )}
                {diagnosis.secondary && diagnosis.secondary.length > 0 && (
                  <div className="text-sm mt-1">
                    <span className="font-medium">Secondaire: </span>
                    {diagnosis.secondary.join(', ')}
                  </div>
                )}
              </div>
            )}

            {/* Medications */}
            <div className="medications-title text-lg font-bold text-blue-600 border-b pb-2 mb-4">
              Prescription
            </div>

            <div className="medications-list space-y-3">
              {(prescription?.medications || []).map((med, index) => (
                <div key={index} className="medication-item bg-white border border-gray-200 rounded-lg p-4">
                  <div className="medication-name text-base font-bold text-gray-800">
                    {index + 1}. {med.medication}
                  </div>
                  <div className="medication-details grid grid-cols-3 gap-3 text-sm text-gray-600 mt-2">
                    <div><span className="font-medium">Dosage:</span> {med.dosage}</div>
                    <div><span className="font-medium">Fréquence:</span> {med.frequency}</div>
                    <div><span className="font-medium">Voie:</span> {
                      { oral: 'Orale', iv: 'IV', im: 'IM', topical: 'Topique', inhaled: 'Inhalée', sublingual: 'Sublinguale', rectal: 'Rectale' }[med.route] || med.route
                    }</div>
                    {med.duration && <div><span className="font-medium">Durée:</span> {med.duration}</div>}
                    {med.quantity && <div><span className="font-medium">Quantité:</span> {med.quantity}</div>}
                  </div>
                  {med.instructions && (
                    <div className="medication-instructions text-sm italic text-gray-500 mt-2">
                      {med.instructions}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Instructions */}
            {prescription?.instructions && (
              <div className="instructions mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="font-semibold text-gray-700 mb-2">Instructions générales</div>
                <div className="text-sm text-gray-600 whitespace-pre-line">{prescription.instructions}</div>
              </div>
            )}

            {/* Additional Notes */}
            {prescription?.additionalNotes && (
              <div className="additional-notes mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="font-semibold text-yellow-800 mb-2">Notes additionnelles</div>
                <div className="text-sm text-yellow-700 whitespace-pre-line">{prescription.additionalNotes}</div>
              </div>
            )}

            {/* Footer */}
            <div className="footer mt-12 flex justify-between items-end">
              <div className="date-location text-sm">
                <div>Fait à {clinicInfo?.city || '_____________'}</div>
                <div>Le {formatDate(prescription?.prescribedDate || new Date())}</div>
              </div>
              <div className="signature text-right">
                <div className="text-sm text-gray-500 mb-1">Signature du médecin</div>
                <div className="border-t border-gray-400 w-48 pt-2 text-sm">
                  Dr. {providerInfo.firstName} {providerInfo.lastName}
                </div>
              </div>
            </div>

            {/* Watermark */}
            <div className="watermark text-xs text-gray-400 text-center mt-8">
              {prescription?.prescriptionNumber} - Imprimé le {formatDate(new Date())}
              {prescription?.printCount > 0 && ` - Réimpression n°${prescription.printCount}`}
            </div>
          </div>
        </div>

        {/* Bottom Info Bar */}
        {!isFinalized && (
          <div className="bg-yellow-50 border-t border-yellow-200 px-6 py-3 flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3" />
            <span className="text-sm text-yellow-800">
              Cette ordonnance est en mode brouillon. Finalisez-la avant de l'imprimer pour la valider officiellement.
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

PrescriptionPreview.displayName = 'PrescriptionPreview';

export default PrescriptionPreview;
