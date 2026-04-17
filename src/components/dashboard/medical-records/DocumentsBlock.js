import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Download, Eye, Trash2, Upload } from 'lucide-react';
import { usePermissions } from '../../auth/PermissionGuard';
import { listDocuments, viewDocumentBlob, updateDocumentCategory } from '../../../api/patientDocumentsApi';
import StaffDocumentUploadModal from './StaffDocumentUploadModal';
import DocumentCategorizationModal from './DocumentCategorizationModal';
import DocumentDeleteModal from './DocumentDeleteModal';

const CATEGORY_ICONS = {
  prescription: '💊',
  lab_result: '🧪',
  imaging: '📷',
  report: '📋',
  certificate: '📜',
  consent: '✍️',
  correspondence: '✉️',
  identity: '🪪',
  insurance: '🏥',
  other: '📄'
};

export default function DocumentsBlock({ patientId, medicalRecordId }) {
  const { t } = useTranslation('planning');
  const { hasPermission } = usePermissions();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [categorize, setCategorize] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const canUpload = hasPermission('patient_documents.upload');
  const canDelete = hasPermission('patient_documents.delete');
  const canCategorize = hasPermission('patient_documents.categorize');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listDocuments(patientId, { medicalRecordId });
      setDocs(data || []);
    } catch (e) {
      console.error('Failed to load documents:', e);
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [patientId, medicalRecordId]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleUploaded = (savedDocs) => {
    setShowUpload(false);
    setCategorize(savedDocs);
    refresh();
  };

  const handleCategorize = async (categoryMap) => {
    for (const [docId, category] of Object.entries(categoryMap)) {
      await updateDocumentCategory(patientId, docId, category);
    }
    setCategorize(null);
    refresh();
  };

  const openInTab = async (doc) => {
    try {
      const blob = await viewDocumentBlob(patientId, doc.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      console.error('Failed to view document:', e);
    }
  };

  const download = async (doc) => {
    try {
      const blob = await viewDocumentBlob(patientId, doc.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalFilename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      console.error('Failed to download document:', e);
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h3 className="font-medium text-gray-900 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          {t('documents.title')}
          {docs.length > 0 && <span className="text-sm text-gray-500">({docs.length})</span>}
        </h3>
        {canUpload && (
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            {t('documents.upload')}
          </button>
        )}
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">{t('documents.empty')}</p>
          </div>
        ) : (
          <ul className="divide-y">
            {docs.map(d => (
              <li key={d.id} className="py-3 flex items-center gap-3 text-sm group">
                <span className="text-lg flex-shrink-0">
                  {d.category ? CATEGORY_ICONS[d.category] || '📄' : '📄'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium text-gray-900">{d.originalFilename}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500">{formatSize(d.size)}</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-500">
                      {t(`documents.source.${d.uploadedByType}`)}
                    </span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-500">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {d.category ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 whitespace-nowrap">
                    {t(`documents.category.${d.category}`)}
                  </span>
                ) : canCategorize ? (
                  <button
                    onClick={() => setCategorize([d])}
                    className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 hover:bg-yellow-200 whitespace-nowrap"
                  >
                    {t('documents.badges.toCategorize')}
                  </button>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 whitespace-nowrap">
                    {t('documents.badges.toCategorize')}
                  </span>
                )}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openInTab(d)}
                    className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                    title={t('documents.actions.view')}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => download(d)}
                    className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                    title={t('documents.actions.download')}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => setDeleting(d)}
                      className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-600"
                      title={t('documents.actions.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showUpload && (
        <StaffDocumentUploadModal
          patientId={patientId}
          medicalRecordId={medicalRecordId}
          onUploaded={handleUploaded}
          onClose={() => setShowUpload(false)}
        />
      )}
      {categorize && (
        <DocumentCategorizationModal
          documents={categorize}
          onSave={handleCategorize}
          onClose={() => setCategorize(null)}
        />
      )}
      {deleting && (
        <DocumentDeleteModal
          patientId={patientId}
          docId={deleting.id}
          filename={deleting.originalFilename}
          onDeleted={() => { setDeleting(null); refresh(); }}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
