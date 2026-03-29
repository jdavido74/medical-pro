import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, FileText, CheckCircle, Printer, Shield, Activity } from 'lucide-react';
import { createEpicrisis, getEpicrisisForRecord, updateEpicrisis, signEpicrisis } from '../../api/epicrisisApi';
import EpicrisisSignatureDialog from './EpicrisisSignatureDialog';

const EpicrisisComposerModal = ({ isOpen, onClose, parentRecord, evolutions, patient, provider, onEpisodeClosed }) => {
  const { t } = useTranslation(['medical', 'common']);

  const [selectedSections, setSelectedSections] = useState({
    includeChiefComplaint: true,
    includeCurrentIllness: true,
    includeAntecedents: false,
    includeVitalSigns: true,
    includePhysicalExam: false,
    includeDiagnosis: true,
    includeTreatments: true,
    includeCurrentMedications: false,
    includeChronicConditions: false,
    includeTreatmentPlan: false,
    includeEvolutionTimeline: true,
  });
  const [conclusion, setConclusion] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [prognosis, setPrognosis] = useState('');
  const [epicrisisId, setEpicrisisId] = useState(null);
  const [epicrisisNumber, setEpicrisisNumber] = useState('');
  const [status, setStatus] = useState('draft');
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [signError, setSignError] = useState(null);
  const [signing, setSigning] = useState(false);
  const [saving, setSaving] = useState(false);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  // Load existing draft on open
  useEffect(() => {
    if (!isOpen || !parentRecord?.id) return;

    const loadExisting = async () => {
      try {
        const response = await getEpicrisisForRecord(parentRecord.id);
        const data = response.data || response;
        if (data && data.id) {
          setEpicrisisId(data.id);
          setEpicrisisNumber(data.epicrisisNumber || '');
          setStatus(data.status || 'draft');
          if (data.selectedSections) setSelectedSections(data.selectedSections);
          if (data.conclusion) setConclusion(data.conclusion);
          if (data.recommendations) setRecommendations(data.recommendations);
          if (data.prognosis) setPrognosis(data.prognosis);
        }
      } catch (err) {
        // No existing epicrisis — that's fine
      }
    };

    loadExisting();
  }, [isOpen, parentRecord?.id]);

  const handleSectionToggle = useCallback((key) => {
    setSelectedSections(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Build vital signs table data from parent + evolutions
  const buildVitalSignsTable = useCallback(() => {
    const rows = [];
    if (parentRecord?.vitalSigns) {
      rows.push({ date: parentRecord.recordDate, ...parentRecord.vitalSigns });
    }
    (evolutions || []).forEach(evo => {
      if (evo.vitalSigns) {
        rows.push({ date: evo.recordDate, ...evo.vitalSigns });
      }
    });
    return rows.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [parentRecord, evolutions]);

  // Build treatments table with deduplication
  const buildTreatmentsTable = useCallback(() => {
    const treatmentMap = new Map();
    const addTreatments = (treatments) => {
      (treatments || []).forEach(tr => {
        const key = tr.medication || tr.name || JSON.stringify(tr);
        if (!treatmentMap.has(key)) {
          treatmentMap.set(key, tr);
        }
      });
    };
    addTreatments(parentRecord?.treatments);
    (evolutions || []).forEach(evo => addTreatments(evo.treatments));
    return Array.from(treatmentMap.values());
  }, [parentRecord, evolutions]);

  // Build the full HTML string for the print window
  const buildPrintHTML = useCallback(() => {
    const vitalRows = buildVitalSignsTable();
    const treatments = buildTreatmentsTable();
    const diagnosis = parentRecord?.diagnosis;
    const antecedents = parentRecord?.antecedents;
    const physicalExam = parentRecord?.physicalExam;
    const treatmentPlan = parentRecord?.treatmentPlan;

    let sectionsHTML = '';

    // Chief complaint
    if (selectedSections.includeChiefComplaint && parentRecord?.basicInfo?.chiefComplaint) {
      sectionsHTML += '<div class="section"><h3>' + t('medical:epicrisis.sections.chiefComplaint') + '</h3><p>' + parentRecord.basicInfo.chiefComplaint + '</p></div>';
    }

    // Current illness
    if (selectedSections.includeCurrentIllness && parentRecord?.currentIllness) {
      sectionsHTML += '<div class="section"><h3>' + t('medical:epicrisis.sections.currentIllness') + '</h3><p>' + parentRecord.currentIllness + '</p></div>';
    }

    // Antecedents
    if (selectedSections.includeAntecedents && antecedents) {
      let antHTML = '';
      if (antecedents.personalMedical) antHTML += '<p><strong>Antecedentes personales:</strong> ' + antecedents.personalMedical + '</p>';
      if (antecedents.surgical) antHTML += '<p><strong>Antecedentes quirurgicos:</strong> ' + antecedents.surgical + '</p>';
      if (antecedents.allergies) antHTML += '<p><strong>Alergias:</strong> ' + antecedents.allergies + '</p>';
      if (antHTML) {
        sectionsHTML += '<div class="section"><h3>' + t('medical:epicrisis.sections.antecedents') + '</h3>' + antHTML + '</div>';
      }
    }

    // Vital signs table
    if (selectedSections.includeVitalSigns && vitalRows.length > 0) {
      let tableRows = vitalRows.map(r => {
        const bp = r.bloodPressure ? (r.bloodPressure.systolic + '/' + r.bloodPressure.diastolic) : '-';
        return '<tr><td>' + formatDate(r.date) + '</td><td>' + (r.weight || '-') + '</td><td>' + bp + '</td><td>' + (r.heartRate || '-') + '</td><td>' + (r.temperature || '-') + '</td><td>' + (r.oxygenSaturation || r.spO2 || '-') + '</td></tr>';
      }).join('');
      sectionsHTML += '<div class="section"><h3>' + t('medical:epicrisis.sections.vitalSigns') + '</h3><table><thead><tr><th>Fecha</th><th>Peso (kg)</th><th>TA (mmHg)</th><th>FC (bpm)</th><th>T (C)</th><th>SpO2 (%)</th></tr></thead><tbody>' + tableRows + '</tbody></table></div>';
    }

    // Physical exam
    if (selectedSections.includePhysicalExam && physicalExam) {
      let peHTML = '';
      const fields = ['general', 'cardiovascular', 'respiratory', 'abdominal', 'neurological', 'musculoskeletal', 'skin'];
      fields.forEach(f => {
        if (physicalExam[f]) peHTML += '<p><strong>' + f.charAt(0).toUpperCase() + f.slice(1) + ':</strong> ' + physicalExam[f] + '</p>';
      });
      if (peHTML) {
        sectionsHTML += '<div class="section"><h3>' + t('medical:epicrisis.sections.physicalExam') + '</h3>' + peHTML + '</div>';
      }
    }

    // Diagnosis
    if (selectedSections.includeDiagnosis && diagnosis) {
      let diagHTML = '';
      if (diagnosis.primary) diagHTML += '<p><strong>Principal:</strong> ' + diagnosis.primary + '</p>';
      if (diagnosis.secondary && diagnosis.secondary.length > 0) {
        diagHTML += '<p><strong>Secundarios:</strong> ' + diagnosis.secondary.join(', ') + '</p>';
      }
      if (diagHTML) {
        sectionsHTML += '<div class="section"><h3>' + t('medical:epicrisis.sections.diagnosis') + '</h3>' + diagHTML + '</div>';
      }
    }

    // Treatments table
    if (selectedSections.includeTreatments && treatments.length > 0) {
      let tRows = treatments.map(tr =>
        '<tr><td>' + (tr.medication || tr.name || '-') + '</td><td>' + (tr.dosage || '-') + '</td><td>' + (tr.frequency || '-') + '</td><td>' + (tr.status || '-') + '</td></tr>'
      ).join('');
      sectionsHTML += '<div class="section"><h3>' + t('medical:epicrisis.sections.treatments') + '</h3><table><thead><tr><th>Medicamento</th><th>Dosis</th><th>Frecuencia</th><th>Estado</th></tr></thead><tbody>' + tRows + '</tbody></table></div>';
    }

    // Current medications
    if (selectedSections.includeCurrentMedications && parentRecord?.currentMedications) {
      const meds = Array.isArray(parentRecord.currentMedications) ? parentRecord.currentMedications : [parentRecord.currentMedications];
      const items = meds.map(m => '<li>' + (typeof m === 'string' ? m : (m.medication || m.name || JSON.stringify(m))) + '</li>').join('');
      sectionsHTML += '<div class="section"><h3>' + t('medical:epicrisis.sections.currentMedications') + '</h3><ul>' + items + '</ul></div>';
    }

    // Chronic conditions
    if (selectedSections.includeChronicConditions && parentRecord?.chronicConditions) {
      const conds = Array.isArray(parentRecord.chronicConditions) ? parentRecord.chronicConditions : [parentRecord.chronicConditions];
      const items = conds.map(c => '<li>' + (typeof c === 'string' ? c : (c.name || JSON.stringify(c))) + '</li>').join('');
      sectionsHTML += '<div class="section"><h3>' + t('medical:epicrisis.sections.chronicConditions') + '</h3><ul>' + items + '</ul></div>';
    }

    // Treatment plan
    if (selectedSections.includeTreatmentPlan && treatmentPlan) {
      let tpHTML = '';
      if (treatmentPlan.recommendations) tpHTML += '<p><strong>Recomendaciones:</strong> ' + treatmentPlan.recommendations + '</p>';
      if (treatmentPlan.followUp) tpHTML += '<p><strong>Seguimiento:</strong> ' + treatmentPlan.followUp + '</p>';
      if (treatmentPlan.tests) tpHTML += '<p><strong>Pruebas:</strong> ' + treatmentPlan.tests + '</p>';
      if (tpHTML) {
        sectionsHTML += '<div class="section"><h3>' + t('medical:epicrisis.sections.treatmentPlan') + '</h3>' + tpHTML + '</div>';
      }
    }

    // Evolution timeline
    if (selectedSections.includeEvolutionTimeline && evolutions && evolutions.length > 0) {
      let evoHTML = evolutions.map(evo => {
        let content = '';
        if (evo.chiefComplaint) content += '<p><strong>Motivo:</strong> ' + evo.chiefComplaint + '</p>';
        if (evo.evolution) content += '<p>' + evo.evolution + '</p>';
        if (evo.notes) content += '<p><em>' + evo.notes + '</em></p>';
        return '<div class="evolution-entry"><div class="evo-date">' + formatDate(evo.recordDate) + '</div>' + content + '</div>';
      }).join('');
      sectionsHTML += '<div class="section"><h3>' + t('medical:epicrisis.sections.evolutionTimeline') + '</h3>' + evoHTML + '</div>';
    }

    // Conclusion / Recommendations / Prognosis
    if (conclusion) {
      sectionsHTML += '<div class="section"><h3>' + t('medical:epicrisis.conclusion') + '</h3><p>' + conclusion + '</p></div>';
    }
    if (recommendations) {
      sectionsHTML += '<div class="section"><h3>' + t('medical:epicrisis.recommendations') + '</h3><p>' + recommendations + '</p></div>';
    }
    if (prognosis) {
      sectionsHTML += '<div class="section"><h3>' + t('medical:epicrisis.prognosis') + '</h3><p>' + prognosis + '</p></div>';
    }

    const todayStr = formatDate(new Date());
    const patientName = (patient?.firstName || '') + ' ' + (patient?.lastName || '');
    const providerName = (provider?.firstName || '') + ' ' + (provider?.lastName || '');

    const styles = [
      '@page { size: A4; margin: 1cm; }',
      'body { font-family: "Segoe UI", Arial, sans-serif; font-size: 11pt; line-height: 1.4; color: #333; margin: 0; padding: 20px; }',
      '.header { text-align: center; border-bottom: 2px solid #0891b2; padding-bottom: 15px; margin-bottom: 20px; }',
      '.header h1 { font-size: 18pt; color: #0891b2; margin: 5px 0; }',
      '.header .number { font-size: 10pt; color: #666; }',
      '.patient-info { background: #f0f9ff; padding: 12px 15px; border-radius: 8px; margin-bottom: 20px; font-size: 10pt; }',
      '.patient-info strong { color: #1e40af; }',
      '.section { margin-bottom: 18px; }',
      '.section h3 { font-size: 12pt; color: #0891b2; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 8px; }',
      '.section p { margin: 4px 0; font-size: 10pt; }',
      '.section ul { margin: 4px 0; padding-left: 20px; font-size: 10pt; }',
      'table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 5px; }',
      'th, td { border: 1px solid #d1d5db; padding: 5px 8px; text-align: left; }',
      'th { background: #f3f4f6; font-weight: bold; }',
      '.evolution-entry { border-left: 3px solid #0891b2; padding-left: 12px; margin-bottom: 10px; }',
      '.evo-date { font-weight: bold; font-size: 10pt; color: #0891b2; }',
      '.footer { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; }',
      '.signature-line { border-top: 1px solid #333; width: 200px; margin-top: 50px; padding-top: 5px; font-size: 9pt; text-align: center; }',
      '.watermark { text-align: center; font-size: 8pt; color: #9ca3af; margin-top: 20px; }',
      '@media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }',
    ].join('\n');

    const numberLine = epicrisisNumber ? '<div class="number">' + epicrisisNumber + '</div>' : '';
    const statusLabel = status === 'signed' ? 'FIRMADO' : 'BORRADOR';

    return '<!DOCTYPE html><html><head>'
      + '<title>Epicrisis - ' + (epicrisisNumber || '') + '</title>'
      + '<style>' + styles + '</style>'
      + '</head><body>'
      + '<div class="header"><h1>EPICRISIS</h1>' + numberLine + '<div class="number">' + todayStr + '</div></div>'
      + '<div class="patient-info"><strong>Paciente:</strong> ' + patientName + ' &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Fecha nac.:</strong> ' + formatDate(patient?.birthDate) + ' &nbsp;&nbsp;|&nbsp;&nbsp; <strong>N:</strong> ' + (patient?.patientNumber || '') + '<br/><strong>Medico:</strong> Dr. ' + providerName + '</div>'
      + sectionsHTML
      + '<div class="footer"><div style="font-size:10pt;"><div>Fecha: ' + todayStr + '</div></div><div><div class="signature-line">Dr. ' + providerName + '</div></div></div>'
      + '<div class="watermark">' + (epicrisisNumber || '') + ' - ' + statusLabel + '</div>'
      + '</body></html>';
  }, [selectedSections, conclusion, recommendations, prognosis, parentRecord, evolutions, patient, provider, epicrisisNumber, status, t, buildVitalSignsTable, buildTreatmentsTable]);

  // Generate PDF via window.open + print (same pattern as PrescriptionPreview)
  const generatePDF = useCallback(() => {
    const htmlContent = buildPrintHTML();
    const printWindow = window.open('', '_blank');
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }, [buildPrintHTML]);

  // Save draft and generate PDF
  const handleSaveDraft = useCallback(async () => {
    setSaving(true);
    try {
      const payload = {
        medicalRecordId: parentRecord.id,
        patientId: patient.id,
        selectedSections,
        conclusion,
        recommendations,
        prognosis,
        patientSnapshot: {
          firstName: patient.firstName,
          lastName: patient.lastName,
          patientNumber: patient.patientNumber,
          birthDate: patient.birthDate,
          phone: patient.phone,
          email: patient.email,
        },
        providerSnapshot: {
          firstName: provider.firstName,
          lastName: provider.lastName,
        },
      };

      let response;
      if (epicrisisId) {
        response = await updateEpicrisis(epicrisisId, {
          selectedSections,
          conclusion,
          recommendations,
          prognosis,
        });
      } else {
        response = await createEpicrisis(payload);
      }

      const data = response.data || response;
      if (data && data.id) {
        setEpicrisisId(data.id);
        if (data.epicrisisNumber) setEpicrisisNumber(data.epicrisisNumber);
        if (data.status) setStatus(data.status);
      }

      generatePDF();
    } catch (err) {
      console.error('Error saving epicrisis:', err);
    } finally {
      setSaving(false);
    }
  }, [parentRecord, patient, provider, selectedSections, conclusion, recommendations, prognosis, epicrisisId, generatePDF]);

  // Sign epicrisis
  const handleSign = useCallback(async (password) => {
    setSigning(true);
    setSignError(null);
    try {
      await signEpicrisis(epicrisisId, password);
      setStatus('signed');
      setShowSignDialog(false);
      if (onEpisodeClosed) onEpisodeClosed();
    } catch (err) {
      setSignError(err?.response?.data?.message || err.message || t('medical:epicrisis.signError'));
    } finally {
      setSigning(false);
    }
  }, [epicrisisId, onEpisodeClosed, t]);

  if (!isOpen) return null;

  // Section definitions for checkboxes
  const sectionDefs = [
    { key: 'includeChiefComplaint', i18n: 'chiefComplaint' },
    { key: 'includeCurrentIllness', i18n: 'currentIllness' },
    { key: 'includeAntecedents', i18n: 'antecedents' },
    { key: 'includeVitalSigns', i18n: 'vitalSigns' },
    { key: 'includePhysicalExam', i18n: 'physicalExam' },
    { key: 'includeDiagnosis', i18n: 'diagnosis' },
    { key: 'includeTreatments', i18n: 'treatments' },
    { key: 'includeCurrentMedications', i18n: 'currentMedications' },
    { key: 'includeChronicConditions', i18n: 'chronicConditions' },
    { key: 'includeTreatmentPlan', i18n: 'treatmentPlan' },
    { key: 'includeEvolutionTimeline', i18n: 'evolutionTimeline' },
  ];

  const vitalRows = buildVitalSignsTable();
  const treatments = buildTreatmentsTable();

  const statusBadge = status === 'signed'
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><Shield className="w-3 h-3" /> {t('medical:epicrisis.signed')}</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">{t('medical:epicrisis.draft')}</span>;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* HEADER */}
      <div className="flex items-center justify-between px-6 py-3 bg-cyan-700 text-white shrink-0">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5" />
          <div>
            <h2 className="text-lg font-bold">
              EPICRISIS - {patient?.firstName} {patient?.lastName}
            </h2>
            <div className="flex items-center gap-3 text-cyan-200 text-sm">
              {epicrisisNumber && <span>{epicrisisNumber}</span>}
              {statusBadge}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-cyan-600 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL - Checkboxes + text fields */}
        <div className="w-1/3 border-r overflow-y-auto p-4">
          {/* Section checkboxes */}
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            {t('medical:epicrisis.selectSections')}
          </h3>
          <div className="space-y-2 mb-6">
            {sectionDefs.map(({ key, i18n }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded">
                <input
                  type="checkbox"
                  checked={selectedSections[key]}
                  onChange={() => handleSectionToggle(key)}
                  className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                  disabled={status === 'signed'}
                />
                <span className="text-sm text-gray-700">{t('medical:epicrisis.sections.' + i18n)}</span>
              </label>
            ))}
          </div>

          {/* Divider */}
          <hr className="my-4" />

          {/* Conclusion */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-600 mb-1">
              {t('medical:epicrisis.conclusion')}
            </label>
            <textarea
              value={conclusion}
              onChange={e => setConclusion(e.target.value)}
              placeholder={t('medical:epicrisis.conclusionPlaceholder')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-y"
              rows={3}
              disabled={status === 'signed'}
            />
          </div>

          {/* Recommendations */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-600 mb-1">
              {t('medical:epicrisis.recommendations')}
            </label>
            <textarea
              value={recommendations}
              onChange={e => setRecommendations(e.target.value)}
              placeholder={t('medical:epicrisis.recommendationsPlaceholder')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-y"
              rows={3}
              disabled={status === 'signed'}
            />
          </div>

          {/* Prognosis */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-600 mb-1">
              {t('medical:epicrisis.prognosis')}
            </label>
            <textarea
              value={prognosis}
              onChange={e => setPrognosis(e.target.value)}
              placeholder={t('medical:epicrisis.prognosisPlaceholder')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-y"
              rows={3}
              disabled={status === 'signed'}
            />
          </div>
        </div>

        {/* RIGHT PANEL - Live preview */}
        <div className="w-2/3 overflow-y-auto p-6 bg-gray-50">
          <div className="bg-white rounded-lg shadow p-6 max-w-3xl mx-auto">
            {/* Preview header */}
            <div className="text-center border-b-2 border-cyan-600 pb-4 mb-6">
              <h1 className="text-xl font-bold text-cyan-700">EPICRISIS</h1>
              {epicrisisNumber && <p className="text-sm text-gray-500">{epicrisisNumber}</p>}
              <p className="text-sm text-gray-500">{formatDate(new Date())}</p>
            </div>

            {/* Patient info */}
            <div className="bg-blue-50 p-3 rounded-lg mb-5 text-sm">
              <p><strong className="text-blue-800">Paciente:</strong> {patient?.firstName} {patient?.lastName}</p>
              <p><strong className="text-blue-800">Fecha nac.:</strong> {formatDate(patient?.birthDate)} &nbsp;|&nbsp; <strong className="text-blue-800">N:</strong> {patient?.patientNumber}</p>
              <p><strong className="text-blue-800">Medico:</strong> Dr. {provider?.firstName} {provider?.lastName}</p>
            </div>

            {/* Chief complaint */}
            {selectedSections.includeChiefComplaint && parentRecord?.basicInfo?.chiefComplaint && (
              <div className="mb-4">
                <h3 className="text-sm font-bold text-cyan-700 border-b pb-1 mb-2">{t('medical:epicrisis.sections.chiefComplaint')}</h3>
                <p className="text-sm text-gray-700">{parentRecord.basicInfo.chiefComplaint}</p>
              </div>
            )}

            {/* Current illness */}
            {selectedSections.includeCurrentIllness && parentRecord?.currentIllness && (
              <div className="mb-4">
                <h3 className="text-sm font-bold text-cyan-700 border-b pb-1 mb-2">{t('medical:epicrisis.sections.currentIllness')}</h3>
                <p className="text-sm text-gray-700">{parentRecord.currentIllness}</p>
              </div>
            )}

            {/* Antecedents */}
            {selectedSections.includeAntecedents && parentRecord?.antecedents && (
              <div className="mb-4">
                <h3 className="text-sm font-bold text-cyan-700 border-b pb-1 mb-2">{t('medical:epicrisis.sections.antecedents')}</h3>
                {parentRecord.antecedents.personalMedical && <p className="text-sm text-gray-700"><strong>Personales:</strong> {parentRecord.antecedents.personalMedical}</p>}
                {parentRecord.antecedents.surgical && <p className="text-sm text-gray-700"><strong>Quirurgicos:</strong> {parentRecord.antecedents.surgical}</p>}
                {parentRecord.antecedents.allergies && <p className="text-sm text-gray-700"><strong>Alergias:</strong> {parentRecord.antecedents.allergies}</p>}
              </div>
            )}

            {/* Vital signs table */}
            {selectedSections.includeVitalSigns && vitalRows.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-bold text-cyan-700 border-b pb-1 mb-2">{t('medical:epicrisis.sections.vitalSigns')}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border px-2 py-1 text-left">Fecha</th>
                        <th className="border px-2 py-1 text-left">Peso (kg)</th>
                        <th className="border px-2 py-1 text-left">TA (mmHg)</th>
                        <th className="border px-2 py-1 text-left">FC (bpm)</th>
                        <th className="border px-2 py-1 text-left">T (C)</th>
                        <th className="border px-2 py-1 text-left">SpO2 (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vitalRows.map((r, i) => (
                        <tr key={i}>
                          <td className="border px-2 py-1">{formatDate(r.date)}</td>
                          <td className="border px-2 py-1">{r.weight || '-'}</td>
                          <td className="border px-2 py-1">{r.bloodPressure ? r.bloodPressure.systolic + '/' + r.bloodPressure.diastolic : '-'}</td>
                          <td className="border px-2 py-1">{r.heartRate || '-'}</td>
                          <td className="border px-2 py-1">{r.temperature || '-'}</td>
                          <td className="border px-2 py-1">{r.oxygenSaturation || r.spO2 || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Physical exam */}
            {selectedSections.includePhysicalExam && parentRecord?.physicalExam && (
              <div className="mb-4">
                <h3 className="text-sm font-bold text-cyan-700 border-b pb-1 mb-2">{t('medical:epicrisis.sections.physicalExam')}</h3>
                {['general', 'cardiovascular', 'respiratory', 'abdominal', 'neurological', 'musculoskeletal', 'skin'].map(f => (
                  parentRecord.physicalExam[f] ? <p key={f} className="text-sm text-gray-700"><strong>{f.charAt(0).toUpperCase() + f.slice(1)}:</strong> {parentRecord.physicalExam[f]}</p> : null
                ))}
              </div>
            )}

            {/* Diagnosis */}
            {selectedSections.includeDiagnosis && parentRecord?.diagnosis && (
              <div className="mb-4">
                <h3 className="text-sm font-bold text-cyan-700 border-b pb-1 mb-2">{t('medical:epicrisis.sections.diagnosis')}</h3>
                {parentRecord.diagnosis.primary && <p className="text-sm text-gray-700"><strong>Principal:</strong> {parentRecord.diagnosis.primary}</p>}
                {parentRecord.diagnosis.secondary && parentRecord.diagnosis.secondary.length > 0 && (
                  <p className="text-sm text-gray-700"><strong>Secundarios:</strong> {parentRecord.diagnosis.secondary.join(', ')}</p>
                )}
              </div>
            )}

            {/* Treatments table */}
            {selectedSections.includeTreatments && treatments.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-bold text-cyan-700 border-b pb-1 mb-2">{t('medical:epicrisis.sections.treatments')}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border px-2 py-1 text-left">Medicamento</th>
                        <th className="border px-2 py-1 text-left">Dosis</th>
                        <th className="border px-2 py-1 text-left">Frecuencia</th>
                        <th className="border px-2 py-1 text-left">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {treatments.map((tr, i) => (
                        <tr key={i}>
                          <td className="border px-2 py-1">{tr.medication || tr.name || '-'}</td>
                          <td className="border px-2 py-1">{tr.dosage || '-'}</td>
                          <td className="border px-2 py-1">{tr.frequency || '-'}</td>
                          <td className="border px-2 py-1">{tr.status || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Current medications */}
            {selectedSections.includeCurrentMedications && parentRecord?.currentMedications && (
              <div className="mb-4">
                <h3 className="text-sm font-bold text-cyan-700 border-b pb-1 mb-2">{t('medical:epicrisis.sections.currentMedications')}</h3>
                <ul className="list-disc list-inside text-sm text-gray-700">
                  {(Array.isArray(parentRecord.currentMedications) ? parentRecord.currentMedications : [parentRecord.currentMedications]).map((m, i) => (
                    <li key={i}>{typeof m === 'string' ? m : (m.medication || m.name || JSON.stringify(m))}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Chronic conditions */}
            {selectedSections.includeChronicConditions && parentRecord?.chronicConditions && (
              <div className="mb-4">
                <h3 className="text-sm font-bold text-cyan-700 border-b pb-1 mb-2">{t('medical:epicrisis.sections.chronicConditions')}</h3>
                <ul className="list-disc list-inside text-sm text-gray-700">
                  {(Array.isArray(parentRecord.chronicConditions) ? parentRecord.chronicConditions : [parentRecord.chronicConditions]).map((c, i) => (
                    <li key={i}>{typeof c === 'string' ? c : (c.name || JSON.stringify(c))}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Treatment plan */}
            {selectedSections.includeTreatmentPlan && parentRecord?.treatmentPlan && (
              <div className="mb-4">
                <h3 className="text-sm font-bold text-cyan-700 border-b pb-1 mb-2">{t('medical:epicrisis.sections.treatmentPlan')}</h3>
                {parentRecord.treatmentPlan.recommendations && <p className="text-sm text-gray-700"><strong>Recomendaciones:</strong> {parentRecord.treatmentPlan.recommendations}</p>}
                {parentRecord.treatmentPlan.followUp && <p className="text-sm text-gray-700"><strong>Seguimiento:</strong> {parentRecord.treatmentPlan.followUp}</p>}
                {parentRecord.treatmentPlan.tests && <p className="text-sm text-gray-700"><strong>Pruebas:</strong> {parentRecord.treatmentPlan.tests}</p>}
              </div>
            )}

            {/* Evolution timeline */}
            {selectedSections.includeEvolutionTimeline && evolutions && evolutions.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-bold text-cyan-700 border-b pb-1 mb-2">
                  <Activity className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                  {t('medical:epicrisis.sections.evolutionTimeline')}
                </h3>
                <div className="space-y-3">
                  {evolutions.map((evo, i) => (
                    <div key={evo.id || i} className="border-l-2 border-cyan-400 pl-3">
                      <div className="text-xs font-bold text-cyan-700">{formatDate(evo.recordDate)}</div>
                      {evo.chiefComplaint && <p className="text-sm text-gray-700"><strong>Motivo:</strong> {evo.chiefComplaint}</p>}
                      {evo.evolution && <p className="text-sm text-gray-700">{evo.evolution}</p>}
                      {evo.notes && <p className="text-sm text-gray-500 italic">{evo.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conclusion preview */}
            {conclusion && (
              <div className="mb-4">
                <h3 className="text-sm font-bold text-cyan-700 border-b pb-1 mb-2">{t('medical:epicrisis.conclusion')}</h3>
                <p className="text-sm text-gray-700 whitespace-pre-line">{conclusion}</p>
              </div>
            )}

            {/* Recommendations preview */}
            {recommendations && (
              <div className="mb-4">
                <h3 className="text-sm font-bold text-cyan-700 border-b pb-1 mb-2">{t('medical:epicrisis.recommendations')}</h3>
                <p className="text-sm text-gray-700 whitespace-pre-line">{recommendations}</p>
              </div>
            )}

            {/* Prognosis preview */}
            {prognosis && (
              <div className="mb-4">
                <h3 className="text-sm font-bold text-cyan-700 border-b pb-1 mb-2">{t('medical:epicrisis.prognosis')}</h3>
                <p className="text-sm text-gray-700 whitespace-pre-line">{prognosis}</p>
              </div>
            )}

            {/* Preview footer */}
            <div className="mt-8 flex justify-between items-end pt-4 border-t">
              <div className="text-xs text-gray-500">{formatDate(new Date())}</div>
              <div className="text-center">
                <div className="border-t border-gray-400 w-48 pt-1 text-xs text-gray-600">
                  Dr. {provider?.firstName} {provider?.lastName}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-end gap-3 px-6 py-3 border-t bg-gray-50 shrink-0">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {t('common:cancel')}
        </button>
        <button
          onClick={handleSaveDraft}
          disabled={saving || status === 'signed'}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <Printer className="w-4 h-4" />
          )}
          {t('medical:epicrisis.generateDraftPDF')}
        </button>
        <button
          onClick={() => setShowSignDialog(true)}
          disabled={!epicrisisId || status === 'signed' || signing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCircle className="w-4 h-4" />
          {t('medical:epicrisis.signAndClose')}
        </button>
      </div>

      {/* Signature dialog */}
      <EpicrisisSignatureDialog
        isOpen={showSignDialog}
        onClose={() => { setShowSignDialog(false); setSignError(null); }}
        onConfirm={handleSign}
        loading={signing}
        error={signError}
      />
    </div>
  );
};

export default EpicrisisComposerModal;
