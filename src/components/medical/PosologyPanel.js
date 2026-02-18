import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Loader2, X } from 'lucide-react';
import DOMPurify from 'dompurify';
import { medicationsApi } from '../../api/medicationsApi';
import { useTranslation } from 'react-i18next';

/**
 * PosologyPanel - Show posology info for a CIMA medication
 *
 * Props:
 *  - nregistro: string (CIMA registration number)
 *  - medicationName: string (for display)
 */
const PosologyPanel = ({ nregistro, medicationName }) => {
  const { t } = useTranslation(['medical']);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [content, setContent] = useState(null);
  const [error, setError] = useState(null);

  if (!nregistro) return null;

  const handleToggle = async () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    // Load if not yet fetched
    if (!content) {
      setIsLoading(true);
      setError(null);
      try {
        const data = await medicationsApi.getMedicationPosology(nregistro);
        if (data?.content) {
          setContent(data.content);
        } else {
          setError(t('medical:medications.posology.noData'));
        }
      } catch (err) {
        setError(t('medical:medications.posology.error'));
      } finally {
        setIsLoading(false);
      }
    }

    setIsOpen(true);
  };

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={handleToggle}
        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
      >
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <BookOpen className="h-3 w-3" />
        )}
        <span>{t('medical:medications.posology.view')}</span>
        {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {isOpen && (
        <div className="mt-2 border border-blue-200 rounded-lg bg-blue-50 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-blue-100">
            <div className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-blue-700" />
              <span className="text-xs font-medium text-blue-800">
                {t('medical:medications.posology.title')} — {medicationName}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-blue-600 hover:text-blue-800"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="p-3">
            {error ? (
              <p className="text-sm text-gray-500">{error}</p>
            ) : content ? (
              <div
                className="text-xs text-gray-700 cima-content prose prose-xs max-w-none"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(content)
                }}
              />
            ) : (
              <div className="text-center py-2">
                <Loader2 className="h-4 w-4 animate-spin inline text-blue-500" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PosologyPanel;
