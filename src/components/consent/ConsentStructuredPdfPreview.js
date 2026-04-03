import React from 'react';
import { X, Printer } from 'lucide-react';

const formatDate = (d) => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

const ConsentStructuredPdfPreview = ({ isOpen, onClose, sections, template, patient, provider, clinicInfo, pdfStyle = 'standard', t }) => {
  if (!isOpen || !sections) return null;

  const isStandard = pdfStyle === 'standard';
  const accentColor = clinicInfo?.accentColor || '#16a34a';

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=1000');
    if (!printWindow) return;

    const styles = isStandard ? `
      body { font-family: 'Times New Roman', serif; font-size: 11pt; color: #111; max-width: 700px; margin: 0 auto; padding: 40px; }
      h1 { font-size: 16pt; text-align: center; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 20px; }
      h2 { font-size: 12pt; font-weight: bold; margin-top: 16px; margin-bottom: 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
      .header-info { text-align: center; font-size: 9pt; color: #666; margin-bottom: 20px; }
      .section { margin-bottom: 16px; }
      .id-box { border: 1px solid #ccc; padding: 10px; margin-bottom: 12px; }
      .id-label { font-size: 9pt; color: #666; }
      .id-value { font-size: 10pt; }
      .risk-list { padding-left: 20px; }
      .risk-list li { margin-bottom: 4px; }
      .declaration { margin-bottom: 6px; }
      .declaration input { margin-right: 6px; }
      .sig-zone { margin-top: 30px; border-top: 1px solid #ccc; padding-top: 10px; }
      .sig-line { border-bottom: 1px dotted #999; height: 40px; margin-top: 20px; }
      .sig-label { font-size: 9pt; color: #666; margin-top: 4px; }
      .footer { margin-top: 30px; font-size: 8pt; color: #999; text-align: center; border-top: 1px solid #ddd; padding-top: 8px; }
      @page { size: A4; margin: 1.5cm; }
    ` : `
      body { font-family: Arial, sans-serif; font-size: 11pt; color: #111; max-width: 700px; margin: 0 auto; padding: 40px; }
      h1 { font-size: 16pt; text-align: center; color: ${accentColor}; margin-bottom: 20px; }
      h2 { font-size: 11pt; font-weight: bold; color: ${accentColor}; margin-top: 16px; margin-bottom: 8px; border-bottom: 2px solid ${accentColor}; padding-bottom: 4px; }
      .header-info { text-align: left; font-size: 9pt; color: #666; margin-bottom: 12px; border-bottom: 3px solid ${accentColor}; padding-bottom: 12px; }
      .header-logo { font-size: 14pt; font-weight: bold; color: ${accentColor}; }
      .section { margin-bottom: 16px; }
      .id-box { background: #f8f8f8; padding: 10px; border-radius: 4px; margin-bottom: 12px; }
      .id-label { font-size: 9pt; color: #666; }
      .id-value { font-size: 10pt; }
      .risk-list { padding-left: 20px; }
      .risk-list li { margin-bottom: 4px; }
      .declaration { margin-bottom: 6px; }
      .sig-zone { margin-top: 30px; border-top: 2px solid ${accentColor}; padding-top: 10px; }
      .sig-line { border-bottom: 1px dotted #999; height: 40px; margin-top: 20px; }
      .sig-label { font-size: 9pt; color: #666; margin-top: 4px; }
      .footer { margin-top: 30px; font-size: 8pt; color: #999; text-align: center; border-top: 1px solid #ddd; padding-top: 8px; }
      @page { size: A4; margin: 1.5cm; }
    `;

    let html = '';

    // Header
    if (sections.header?.enabled) {
      html += `<div class="header-info">`;
      if (!isStandard) html += `<div class="header-logo">${clinicInfo?.name || 'Clínica'}</div>`;
      else html += `<strong>${clinicInfo?.name || 'Clínica'}</strong><br>`;
      if (clinicInfo?.address) html += `${clinicInfo.address}<br>`;
      if (clinicInfo?.phone) html += `Tel: ${clinicInfo.phone}`;
      if (clinicInfo?.cif) html += ` · CIF: ${clinicInfo.cif}`;
      html += `</div>`;
    }

    // Title
    if (sections.title?.enabled) {
      html += `<h1>${sections.title?.text || template?.title || 'CONSENTIMIENTO INFORMADO'}</h1>`;
    }

    // Patient ID
    if (sections.patientId?.enabled) {
      html += `<div class="id-box">
        <div class="id-label">Datos del paciente</div>
        <div class="id-value">
          <strong>${patient?.firstName || '[PRÉNOM_PATIENT]'} ${patient?.lastName || '[NOM_PATIENT]'}</strong><br>
          DNI/NIE: ${patient?.idNumber || '[NUMERO_ID_PATIENT]'} ·
          Fecha nacimiento: ${patient?.birthDate ? formatDate(patient.birthDate) : '[DATE_NAISSANCE]'}
        </div>
      </div>`;
    }

    // Physician ID
    if (sections.physicianId?.enabled) {
      html += `<div class="id-box">
        <div class="id-label">Médico responsable</div>
        <div class="id-value">
          <strong>Dr/a. ${provider?.firstName || '[PRÉNOM_PRATICIEN]'} ${provider?.lastName || '[NOM_PRATICIEN]'}</strong><br>
          Especialidad: ${provider?.specialty || '[SPÉCIALITÉ_PRATICIEN]'} ·
          Nº Colegiado: ${provider?.collegeNumber || '[NUMERO_RPPS]'}
        </div>
      </div>`;
    }

    // Description
    if (sections.description?.enabled && sections.description?.text) {
      html += `<div class="section"><h2>Descripción del procedimiento</h2><p>${sections.description.text}</p></div>`;
    }

    // Risks
    if (sections.risks?.enabled && sections.risks?.items?.length) {
      html += `<div class="section"><h2>Riesgos y complicaciones</h2><ul class="risk-list">`;
      sections.risks.items.forEach(r => { if (r) html += `<li>${r}</li>`; });
      html += `</ul></div>`;
    }

    // Alternatives
    if (sections.alternatives?.enabled && sections.alternatives?.text) {
      html += `<div class="section"><h2>Alternativas</h2><p>${sections.alternatives.text}</p></div>`;
    }

    // Benefits
    if (sections.benefits?.enabled && sections.benefits?.text) {
      html += `<div class="section"><h2>Beneficios esperados</h2><p>${sections.benefits.text}</p></div>`;
    }

    // Declarations
    if (sections.declarations?.enabled && sections.declarations?.items?.length) {
      html += `<div class="section"><h2>Declaraciones del paciente</h2>`;
      sections.declarations.items.forEach(d => {
        if (d) html += `<div class="declaration">☐ ${d}</div>`;
      });
      html += `</div>`;
    }

    // Patient signature
    if (sections.patientSignature?.enabled) {
      html += `<div class="sig-zone">
        <h2>Firma del paciente</h2>
        <p>En _________________, a ${formatDate(new Date())}</p>
        <div class="sig-line"></div>
        <div class="sig-label">Firma del paciente</div>
      </div>`;
    }

    // Physician signature
    if (sections.physicianSignature?.enabled) {
      html += `<div class="sig-zone">
        <h2>Firma del médico</h2>
        <div class="sig-line"></div>
        <div class="sig-label">Firma del médico responsable</div>
      </div>`;
    }

    // Revocation
    if (sections.revocation?.enabled) {
      html += `<div class="section" style="margin-top: 30px; border-top: 2px solid #999; padding-top: 12px;">
        <h2>Revocación del consentimiento</h2>
        <p>${sections.revocation?.text || 'Revoco el consentimiento prestado...'}</p>
        <div class="sig-line"></div>
        <div class="sig-label">Firma del paciente (revocación)</div>
      </div>`;
    }

    // Footer
    html += `<div class="footer">Documento generado el ${formatDate(new Date())} — MediMaestro</div>`;

    const doc = printWindow.document;
    doc.write(`<!DOCTYPE html><html><head><title>${template?.title || 'Consentimiento'}</title><style>${styles}</style></head><body>${html}</body></html>`);
    doc.close();
    printWindow.onload = () => printWindow.print();
  };

  // Render inline preview (simplified version of what will be printed)
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">{t('consents:structuredEditor.preview')}</h2>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              <Printer className="h-4 w-4" />
              Imprimir PDF
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-8 bg-gray-100">
          <div className={`mx-auto bg-white shadow-lg p-10 max-w-[700px] ${isStandard ? 'font-serif' : 'font-sans'}`} style={{ minHeight: '900px' }}>
            {/* Inline preview matches print output */}
            {sections.header?.enabled && (
              <div className={`text-center text-xs text-gray-500 mb-4 pb-3 ${isStandard ? 'border-b' : 'border-b-2'}`} style={!isStandard ? { borderColor: accentColor } : {}}>
                <p className={`font-bold ${isStandard ? 'text-gray-800' : ''}`} style={!isStandard ? { color: accentColor, fontSize: '14pt' } : {}}>{clinicInfo?.name || 'Nombre de la clínica'}</p>
                {clinicInfo?.address && <p>{clinicInfo.address}</p>}
                {clinicInfo?.phone && <p>Tel: {clinicInfo.phone}{clinicInfo?.cif ? ` · CIF: ${clinicInfo.cif}` : ''}</p>}
              </div>
            )}
            {sections.title?.enabled && (
              <h1 className={`text-xl font-bold text-center mb-6 ${isStandard ? 'border-b-2 border-black pb-2' : ''}`} style={!isStandard ? { color: accentColor } : {}}>
                {sections.title?.text || template?.title || 'CONSENTIMIENTO INFORMADO'}
              </h1>
            )}
            {sections.patientId?.enabled && (
              <div className={`p-3 mb-3 text-sm ${isStandard ? 'border border-gray-300' : 'bg-gray-50 rounded'}`}>
                <p className="text-xs text-gray-500">Datos del paciente</p>
                <p className="font-medium">{patient?.firstName || '[Nombre]'} {patient?.lastName || '[Apellidos]'}</p>
              </div>
            )}
            {sections.physicianId?.enabled && (
              <div className={`p-3 mb-3 text-sm ${isStandard ? 'border border-gray-300' : 'bg-gray-50 rounded'}`}>
                <p className="text-xs text-gray-500">Médico responsable</p>
                <p className="font-medium">Dr/a. {provider?.firstName || '[Nombre]'} {provider?.lastName || '[Apellidos]'}</p>
              </div>
            )}
            {sections.description?.enabled && sections.description?.text && (
              <div className="mb-4">
                <h2 className={`text-sm font-bold mb-1 pb-1 border-b`} style={!isStandard ? { color: accentColor, borderColor: accentColor } : {}}>Descripción del procedimiento</h2>
                <p className="text-sm">{sections.description.text}</p>
              </div>
            )}
            {sections.risks?.enabled && sections.risks?.items?.length > 0 && (
              <div className="mb-4">
                <h2 className="text-sm font-bold mb-1 pb-1 border-b" style={!isStandard ? { color: accentColor, borderColor: accentColor } : {}}>Riesgos y complicaciones</h2>
                <ul className="list-disc pl-5 text-sm">
                  {sections.risks.items.filter(Boolean).map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
            {sections.alternatives?.enabled && sections.alternatives?.text && (
              <div className="mb-4">
                <h2 className="text-sm font-bold mb-1 pb-1 border-b" style={!isStandard ? { color: accentColor, borderColor: accentColor } : {}}>Alternativas</h2>
                <p className="text-sm">{sections.alternatives.text}</p>
              </div>
            )}
            {sections.benefits?.enabled && sections.benefits?.text && (
              <div className="mb-4">
                <h2 className="text-sm font-bold mb-1 pb-1 border-b" style={!isStandard ? { color: accentColor, borderColor: accentColor } : {}}>Beneficios esperados</h2>
                <p className="text-sm">{sections.benefits.text}</p>
              </div>
            )}
            {sections.declarations?.enabled && sections.declarations?.items?.length > 0 && (
              <div className="mb-4">
                <h2 className="text-sm font-bold mb-1 pb-1 border-b" style={!isStandard ? { color: accentColor, borderColor: accentColor } : {}}>Declaraciones del paciente</h2>
                {sections.declarations.items.filter(Boolean).map((d, i) => (
                  <p key={i} className="text-sm mb-1">☐ {d}</p>
                ))}
              </div>
            )}
            {sections.patientSignature?.enabled && (
              <div className="mt-8 pt-3 border-t">
                <h2 className="text-sm font-bold mb-1" style={!isStandard ? { color: accentColor } : {}}>Firma del paciente</h2>
                <p className="text-xs text-gray-500 mb-4">En _________________, a {formatDate(new Date())}</p>
                <div className="border-b border-dotted border-gray-400 h-10"></div>
                <p className="text-xs text-gray-400 mt-1">Firma del paciente</p>
              </div>
            )}
            {sections.physicianSignature?.enabled && (
              <div className="mt-6 pt-3 border-t">
                <h2 className="text-sm font-bold mb-1" style={!isStandard ? { color: accentColor } : {}}>Firma del médico</h2>
                <div className="border-b border-dotted border-gray-400 h-10"></div>
                <p className="text-xs text-gray-400 mt-1">Firma del médico responsable</p>
              </div>
            )}
            {sections.revocation?.enabled && (
              <div className="mt-8 pt-3 border-t-2 border-gray-400">
                <h2 className="text-sm font-bold mb-1" style={!isStandard ? { color: accentColor } : {}}>Revocación del consentimiento</h2>
                <p className="text-sm mb-4">{sections.revocation?.text || ''}</p>
                <div className="border-b border-dotted border-gray-400 h-10"></div>
                <p className="text-xs text-gray-400 mt-1">Firma del paciente (revocación)</p>
              </div>
            )}
            <div className="mt-8 pt-2 border-t text-center text-xs text-gray-400">
              Documento generado el {formatDate(new Date())} — MediMaestro
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsentStructuredPdfPreview;
