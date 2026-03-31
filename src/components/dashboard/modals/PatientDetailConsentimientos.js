import React from 'react';
import { ClipboardCheck, AlertTriangle, Info } from 'lucide-react';

const statusBadge = (status, t) => {
  const config = {
    signed: { bg: 'bg-green-100', text: 'text-green-700', label: t('patients:detail.consents.signed') },
    expired: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: t('patients:detail.consents.expired') },
    pending: { bg: 'bg-red-100', text: 'text-red-700', label: t('patients:detail.consents.pending') },
    not_sent: { bg: 'bg-gray-100', text: 'text-gray-600', label: t('patients:detail.consents.notSent') },
  };
  const c = config[status] || config.not_sent;
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>{c.label}</span>;
};

const PatientDetailConsentimientos = ({ patient, t }) => {
  // TODO: When consent backend is ready:
  // 1. Import consentApi
  // 2. Load patient consents: const consents = await consentApi.getPatientConsents(patient.id)
  // 3. Load treatment-consent associations for alert zone
  // 4. Replace empty state with consent list
  const consents = [];

  return (
    <div className="space-y-6">
      {/* Alert zone */}
      <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
        <Info className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-yellow-800">{t('patients:detail.consents.alertTitle')}</p>
          <p className="text-xs text-yellow-600 mt-0.5">{t('patients:detail.consents.alertProximamente')}</p>
        </div>
      </div>

      {/* Consent list */}
      {consents.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <ClipboardCheck className="h-10 w-10 mx-auto mb-2" />
          <p>{t('patients:detail.consents.noConsents')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {consents.map((consent, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-700">{consent.title}</span>
              <div className="flex items-center gap-2">
                {statusBadge(consent.status, t)}
                {consent.date && <span className="text-xs text-gray-400">{consent.date}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PatientDetailConsentimientos;
