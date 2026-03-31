import React from 'react';
import { Phone, Mail, AlertTriangle, Shield } from 'lucide-react';

const calculateAge = (birthDate) => {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
};

const PatientDetailFicha = ({ patient, t }) => {
  const age = calculateAge(patient.birthDate);

  return (
    <div className="space-y-6">
      {/* Identity */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
          {t('patients:detail.identity')}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">{t('patients:firstName')}</p>
            <p className="text-sm font-medium text-gray-900">{patient.firstName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('patients:lastName')}</p>
            <p className="text-sm font-medium text-gray-900">{patient.lastName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('patients:detail.dateOfBirth')}</p>
            <p className="text-sm font-medium text-gray-900">
              {formatDate(patient.birthDate)}
              {age !== null && <span className="text-gray-500 ml-1">({t('patients:detail.age', { years: age })})</span>}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('patients:nationality', 'Nacionalidad')}</p>
            <p className="text-sm font-medium text-gray-900">{patient.nationality || '—'}</p>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
          {t('patients:detail.contact')}
        </h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-700">{patient.contact?.phone || patient.phone || t('patients:detail.noPhone')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-700">{patient.contact?.email || patient.email || t('patients:detail.noEmail')}</span>
          </div>
        </div>
      </section>

      {/* Emergency Contact */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
          {t('patients:detail.emergencyContact')}
        </h3>
        {(patient.contact?.emergencyContact?.name || patient.emergencyContact?.name) ? (
          <div className="border-l-4 border-orange-400 pl-3 py-2 bg-orange-50 rounded-r">
            <p className="text-sm font-medium text-gray-900">
              {patient.contact?.emergencyContact?.name || patient.emergencyContact?.name}
            </p>
            {(patient.contact?.emergencyContact?.relationship || patient.emergencyContact?.relationship) && (
              <p className="text-xs text-gray-500">
                {t('patients:detail.relationship')}: {patient.contact?.emergencyContact?.relationship || patient.emergencyContact?.relationship}
              </p>
            )}
            <div className="flex items-center gap-1 mt-1">
              <Phone className="h-3 w-3 text-gray-400" />
              <span className="text-sm text-gray-700">
                {patient.contact?.emergencyContact?.phone || patient.emergencyContact?.phone}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">{t('patients:detail.noEmergencyContact')}</p>
        )}
      </section>

      {/* Insurance */}
      {(patient.insurance?.provider || patient.insurance?.number) && (
        <section>
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
            {t('patients:detail.insurance')}
          </h3>
          <div className="flex items-start gap-3 bg-blue-50 p-3 rounded-lg">
            <Shield className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              {patient.insurance?.provider && (
                <p className="text-sm font-medium text-gray-900">{patient.insurance.provider}</p>
              )}
              {patient.insurance?.number && (
                <p className="text-xs text-gray-500">N° {patient.insurance.number}</p>
              )}
              {patient.insurance?.type && (
                <p className="text-xs text-gray-500">{patient.insurance.type}</p>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default PatientDetailFicha;
