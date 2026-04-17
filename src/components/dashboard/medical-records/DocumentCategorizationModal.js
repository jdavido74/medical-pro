import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const CATEGORIES = [
  'prescription','lab_result','imaging','report','certificate',
  'consent','correspondence','identity','insurance','other'
];

export default function DocumentCategorizationModal({ documents, onSave, onClose }) {
  const { t } = useTranslation('planning');
  const [selection, setSelection] = useState(() =>
    Object.fromEntries(documents.map(d => [d.id, d.category || '']))
  );

  const handleChange = (id, value) => setSelection(prev => ({ ...prev, [id]: value }));

  const handleSave = () => {
    const toSave = Object.fromEntries(
      Object.entries(selection).filter(([, v]) => v && v !== '')
    );
    onSave(toSave);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-medium">{t('documents.categorizeModal.title')}</h2>
        </div>
        <div className="p-6 overflow-y-auto space-y-3">
          {documents.map(d => (
            <div key={d.id} className="flex items-center gap-3">
              <span className="flex-1 truncate text-sm">{d.originalFilename}</span>
              <select
                className="border rounded-md px-3 py-1 text-sm"
                value={selection[d.id] || ''}
                onChange={(e) => handleChange(d.id, e.target.value)}
              >
                <option value="">{t('documents.categorizeModal.placeholder')}</option>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{t(`documents.category.${c}`)}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
          >
            {t('documents.actions.laterCategorize')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {t('documents.actions.saveCategories')}
          </button>
        </div>
      </div>
    </div>
  );
}
