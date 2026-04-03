import React from 'react';
import { Plus, Trash2, Shield, AlertTriangle } from 'lucide-react';

const REQUIRED_SECTIONS = ['patientId', 'physicianId', 'description', 'risks', 'alternatives', 'patientSignature', 'revocation'];
const AUTO_FILLED_SECTIONS = ['header', 'patientId', 'physicianId', 'patientSignature', 'physicianSignature'];

const DEFAULT_SECTIONS = {
  header: { enabled: true },
  title: { enabled: true, text: '' },
  patientId: { enabled: true },
  physicianId: { enabled: true },
  description: { enabled: true, text: '' },
  risks: { enabled: true, items: [] },
  alternatives: { enabled: true, text: '' },
  benefits: { enabled: false, text: '' },
  declarations: { enabled: true, items: ['He sido informado/a de forma clara y comprensible', 'He podido formular todas las preguntas que he considerado oportunas', 'He recibido información sobre los riesgos y alternativas'] },
  patientSignature: { enabled: true },
  physicianSignature: { enabled: true },
  revocation: { enabled: true, text: 'Revoco el consentimiento prestado en fecha arriba indicada y no deseo proseguir el tratamiento, que doy con esta fecha por finalizado.' },
};

const SECTION_ORDER = ['header', 'title', 'patientId', 'physicianId', 'description', 'risks', 'alternatives', 'benefits', 'declarations', 'patientSignature', 'physicianSignature', 'revocation'];

const ConsentStructuredEditor = ({ sections, onChange, t }) => {
  const data = { ...DEFAULT_SECTIONS, ...sections };

  const updateSection = (sectionId, updates) => {
    onChange({ ...data, [sectionId]: { ...data[sectionId], ...updates } });
  };

  const toggleSection = (sectionId) => {
    updateSection(sectionId, { enabled: !data[sectionId]?.enabled });
  };

  const updateText = (sectionId, text) => {
    updateSection(sectionId, { text });
  };

  const addListItem = (sectionId) => {
    const items = [...(data[sectionId]?.items || []), ''];
    updateSection(sectionId, { items });
  };

  const removeListItem = (sectionId, index) => {
    const items = (data[sectionId]?.items || []).filter((_, i) => i !== index);
    updateSection(sectionId, { items });
  };

  const updateListItem = (sectionId, index, value) => {
    const items = [...(data[sectionId]?.items || [])];
    items[index] = value;
    updateSection(sectionId, { items });
  };

  const isRequired = (id) => REQUIRED_SECTIONS.includes(id);
  const isAutoFilled = (id) => AUTO_FILLED_SECTIONS.includes(id);

  const renderSectionContent = (id) => {
    if (isAutoFilled(id)) {
      return (
        <p className="text-xs text-blue-500 italic flex items-center gap-1">
          <Shield className="h-3 w-3" />
          {t('consents:structuredEditor.autoFilled')}
        </p>
      );
    }

    switch (id) {
      case 'title':
      case 'description':
      case 'alternatives':
      case 'benefits':
        return (
          <textarea
            value={data[id]?.text || ''}
            onChange={e => updateText(id, e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm resize-y min-h-[60px]"
            rows={id === 'description' ? 4 : 2}
            placeholder={t(`consents:structuredEditor.sections.${id}`)}
          />
        );

      case 'revocation':
        return (
          <textarea
            value={data[id]?.text || ''}
            onChange={e => updateText(id, e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm resize-y min-h-[60px]"
            rows={3}
          />
        );

      case 'risks':
      case 'declarations':
        return (
          <div className="space-y-2">
            {(data[id]?.items || []).map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-5">{idx + 1}.</span>
                <input
                  type="text"
                  value={item}
                  onChange={e => updateListItem(id, idx, e.target.value)}
                  className="flex-1 px-2 py-1 border rounded text-sm"
                  placeholder={id === 'risks' ? 'Descripción del riesgo...' : 'Declaración del paciente...'}
                />
                <button onClick={() => removeListItem(id, idx)} className="p-1 text-gray-400 hover:text-red-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={() => addListItem(id)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
            >
              <Plus className="h-3 w-3" />
              {id === 'risks' ? t('consents:structuredEditor.addRisk') : t('consents:structuredEditor.addDeclaration')}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {SECTION_ORDER.map(id => (
        <div key={id} className={`border rounded-lg overflow-hidden ${data[id]?.enabled ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
          {/* Section header */}
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
            <div className="flex items-center gap-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={data[id]?.enabled !== false}
                  onChange={() => toggleSection(id)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
              </label>
              <span className="text-sm font-medium text-gray-800">
                {t(`consents:structuredEditor.sections.${id}`)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {isRequired(id) && (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-600 flex items-center gap-0.5">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  {t('consents:structuredEditor.required')}
                </span>
              )}
              {!isRequired(id) && !isAutoFilled(id) && (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">
                  {t('consents:structuredEditor.optional')}
                </span>
              )}
            </div>
          </div>

          {/* Section content */}
          {data[id]?.enabled !== false && (
            <div className="px-4 py-3">
              {renderSectionContent(id)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

ConsentStructuredEditor.DEFAULT_SECTIONS = DEFAULT_SECTIONS;

export default ConsentStructuredEditor;
