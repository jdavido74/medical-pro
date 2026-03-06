/**
 * DocumentUploadStep — Document upload with drag-drop and camera support
 *
 * Desktop: drag & drop zone + file grid
 * Mobile: camera button + file list with large touch targets
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import {
  Upload, FileText, Image, File, Trash2, Loader,
  CheckCircle, AlertTriangle, Camera, X
} from 'lucide-react';
import {
  uploadDocument, getDocuments, deleteDocument
} from '../../api/preconsultationApi';

const MAX_FILES = 10;
const MAX_SIZE = 10 * 1024 * 1024;

const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
};

function getFileIcon(mimeType) {
  if (mimeType?.startsWith('image/')) return Image;
  if (mimeType?.includes('pdf')) return FileText;
  return File;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentUploadStep({ token, documentCount: initialCount, onComplete }) {
  const { t } = useTranslation('preconsultation');

  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingDocs, setLoadingDocs] = useState(true);

  // Load existing documents
  useEffect(() => {
    async function load() {
      try {
        const docs = await getDocuments(token);
        setDocuments(docs);
      } catch {
        // Ignore — might be no documents yet
      } finally {
        setLoadingDocs(false);
      }
    }
    load();
  }, [token]);

  const handleUpload = useCallback(async (files) => {
    if (documents.length >= MAX_FILES) {
      setError(t('documents.limitReached'));
      return;
    }

    setError(null);
    setUploading(true);

    for (const file of files) {
      if (documents.length + 1 > MAX_FILES) break;

      try {
        const doc = await uploadDocument(token, file);
        setDocuments(prev => [...prev, doc]);
      } catch (err) {
        setError(err.message || t('documents.errorUpload'));
      }
    }

    setUploading(false);
  }, [token, documents.length, t]);

  const handleDelete = async (docId) => {
    if (!window.confirm(t('documents.deleteConfirm'))) return;

    try {
      await deleteDocument(token, docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch {
      setError(t('notifications.errorGeneric'));
    }
  };

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors?.[0]?.code === 'file-too-large') {
        setError(t('documents.errorSize'));
      } else {
        setError(t('documents.errorType'));
      }
      return;
    }
    handleUpload(acceptedFiles);
  }, [handleUpload, t]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    disabled: uploading || documents.length >= MAX_FILES
  });

  const atLimit = documents.length >= MAX_FILES;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">{t('documents.title')}</h2>
        <p className="text-sm text-gray-500 mt-1">{t('documents.subtitle')}</p>
      </div>

      {/* Drop zone — desktop */}
      {!atLimit && (
        <div
          {...getRootProps()}
          className={`hidden sm:flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors mb-6 ${
            isDragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          } ${uploading || atLimit ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <Upload className="w-10 h-10 text-gray-400 mb-3" />
          <p className="text-sm text-gray-600 font-medium">{t('documents.dragDrop')}</p>
          <p className="text-xs text-gray-400 mt-1">{t('documents.allowedTypes')}</p>
          <p className="text-xs text-gray-400">{t('documents.maxSize')}</p>
        </div>
      )}

      {/* Mobile upload buttons */}
      {!atLimit && (
        <div className="sm:hidden flex gap-3 mb-6">
          <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg cursor-pointer">
            <Upload className="w-5 h-5" />
            <span className="text-sm font-medium">{t('documents.upload')}</span>
            <input
              type="file"
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
              onChange={(e) => e.target.files && handleUpload(Array.from(e.target.files))}
              className="hidden"
              multiple
            />
          </label>
          <label className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg cursor-pointer">
            <Camera className="w-5 h-5" />
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => e.target.files && handleUpload(Array.from(e.target.files))}
              className="hidden"
            />
          </label>
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="flex items-center gap-2 text-blue-600 mb-4">
          <Loader className="w-4 h-4 animate-spin" />
          <span className="text-sm">{t('documents.uploading')}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
          <button onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Counter */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">
          {documents.length} / {MAX_FILES} {t('documents.maxFiles').toLowerCase()}
        </span>
        {atLimit && (
          <span className="text-xs text-orange-600 font-medium">{t('documents.limitReached')}</span>
        )}
      </div>

      {/* Document list */}
      {loadingDocs ? (
        <div className="flex items-center justify-center py-8">
          <Loader className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{t('documents.noDocuments')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map(doc => {
            const IconComponent = getFileIcon(doc.mimeType);
            return (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <IconComponent className="w-8 h-8 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {doc.originalFilename}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatFileSize(doc.size)}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title={t('documents.delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Continue indication */}
      {documents.length > 0 && (
        <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 text-sm">
          <CheckCircle className="w-4 h-4" />
          {t('confirmation.documentsUploaded', { count: documents.length })}
        </div>
      )}
    </div>
  );
}
