import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, X } from 'lucide-react';
import { uploadDocuments } from '../../../api/patientDocumentsApi';

const MAX_FILES = 10;
const MAX_SIZE = 10 * 1024 * 1024;

export default function StaffDocumentUploadModal({ patientId, medicalRecordId, onUploaded, onClose }) {
  const { t } = useTranslation('planning');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const addFiles = (fileList) => {
    const arr = Array.from(fileList || []);
    setFiles(prev => {
      const combined = [...prev, ...arr].slice(0, MAX_FILES);
      const hasOversized = arr.some(f => f.size > MAX_SIZE);
      if (hasOversized) setError(t('documents.errors.tooLarge'));
      else setError(null);
      return combined.filter(f => f.size <= MAX_SIZE);
    });
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setError(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  };

  const handleSubmit = async () => {
    if (!files.length || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const saved = await uploadDocuments(patientId, files, medicalRecordId);
      onUploaded(saved);
    } catch (e) {
      setError(t('documents.errors.uploadFailed'));
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-xl w-full">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-medium">{t('documents.uploadModal.title')}</h2>
          {!uploading && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="p-6 space-y-4">
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
            <input
              ref={inputRef}
              data-testid="file-input"
              type="file"
              multiple
              className="hidden"
              onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
            />
            <p className="text-sm text-gray-600">{t('documents.uploadModal.dropHint')}</p>
            <p className="text-xs text-gray-400 mt-1">{t('documents.uploadModal.maxInfo')}</p>
          </div>

          {files.length > 0 && (
            <ul className="divide-y border rounded-md max-h-48 overflow-y-auto">
              {files.map((f, i) => (
                <li key={i} data-testid="selected-file" className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="flex-1 truncate">{f.name}</span>
                  <span className="text-xs text-gray-500">{Math.round(f.size / 1024)} KB</span>
                  <button className="text-red-500 hover:text-red-700" onClick={() => removeFile(i)}>
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button
            onClick={handleSubmit}
            disabled={!files.length || uploading}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                {t('documents.uploadModal.uploading')}
              </>
            ) : (
              t('documents.uploadModal.submit', { count: files.length })
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
