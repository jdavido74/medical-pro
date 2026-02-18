import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Loader2, Info } from 'lucide-react';
import DOMPurify from 'dompurify';
import { medicationsApi } from '../../api/medicationsApi';
import { useTranslation } from 'react-i18next';

/**
 * DrugInteractionPanel - Shows CIMA interaction data for prescribed medications
 *
 * Props:
 *  - medications: Array of medication objects (from prescription form)
 *  - hardcodedWarnings: Array of warnings from the existing client-side checker (fallback)
 */
const DrugInteractionPanel = ({ medications = [], hardcodedWarnings = [] }) => {
  const { t } = useTranslation(['medical']);
  const [interactionsData, setInteractionsData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedMed, setExpandedMed] = useState(null);
  const debounceRef = useRef(null);

  // Only consider medications with nregistro (CIMA)
  const cimamedications = medications.filter(m => m.nregistro);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (cimamedications.length < 2) {
      setInteractionsData(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const result = await medicationsApi.checkInteractions(
          cimamedications.map(m => ({ nregistro: m.nregistro, name: m.medication || m.name }))
        );
        setInteractionsData(result);
      } catch (err) {
        console.error('Interaction check error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 1000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medications.map(m => m.nregistro).filter(Boolean).join(',')]);

  const hasHardcoded = hardcodedWarnings && hardcodedWarnings.length > 0;
  const hasCimaData = interactionsData?.interactions?.length > 0;

  if (!hasHardcoded && !hasCimaData && !isLoading) return null;

  return (
    <div className="mt-4 border border-yellow-200 rounded-lg bg-yellow-50 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <span className="text-sm font-medium text-yellow-800">
            {t('medical:medications.interactions.title')}
          </span>
          {isLoading && <Loader2 className="h-3.5 w-3.5 text-yellow-600 animate-spin" />}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-yellow-600" />
        ) : (
          <ChevronDown className="h-4 w-4 text-yellow-600" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Hardcoded warnings (fallback) */}
          {hasHardcoded && (
            <div className="space-y-2">
              {hardcodedWarnings.map((w, i) => (
                <div key={i} className="bg-white rounded p-2 border border-yellow-200 text-sm">
                  <p className="font-medium text-yellow-800">{w.warning}</p>
                  <p className="text-yellow-700 text-xs mt-0.5">{w.recommendation}</p>
                </div>
              ))}
            </div>
          )}

          {/* CIMA interaction data */}
          {hasCimaData && (
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Info className="h-3 w-3" />
                <span>{t('medical:medications.interactions.source')}</span>
              </div>
              {interactionsData.interactions.map((item, i) => (
                <div key={i} className="bg-white rounded border border-yellow-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedMed(expandedMed === i ? null : i)}
                    className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-yellow-50"
                  >
                    <span className="text-sm font-medium text-gray-800">{item.name}</span>
                    {expandedMed === i ? (
                      <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                    )}
                  </button>
                  {expandedMed === i && item.interactionsHtml && (
                    <div
                      className="px-3 pb-3 text-xs text-gray-700 cima-content prose prose-xs max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(item.interactionsHtml)
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {!hasHardcoded && !hasCimaData && !isLoading && (
            <p className="text-sm text-gray-500">{t('medical:medications.interactions.noData')}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default DrugInteractionPanel;
