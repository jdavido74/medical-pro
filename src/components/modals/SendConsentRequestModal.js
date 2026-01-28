/**
 * SendConsentRequestModal - Modal to send consent signing request to patient
 *
 * Features:
 * - Select consent template
 * - Choose delivery method (email, tablet link)
 * - Add custom message
 * - Set expiration time
 * - Preview signing URL
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Send,
  Mail,
  Tablet,
  Link,
  Clock,
  FileText,
  MessageSquare,
  Copy,
  Check,
  Loader,
  AlertCircle,
  Globe,
  Filter,
  Eye
} from 'lucide-react';
import { consentSigningApi } from '../../api/consentSigningApi';
import { baseClient } from '../../api/baseClient';
import { CONSENT_TYPES, getConsentTypeName, filterTemplatesByType } from '../../utils/consentTypes';
import ConsentPreviewModal from './ConsentPreviewModal';

const SendConsentRequestModal = ({
  isOpen,
  onClose,
  patient,
  appointmentId = null,
  onSuccess
}) => {
  const { t, i18n } = useTranslation(['common', 'admin']);

  // Form state
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState(''); // Filtre par type
  const [deliveryMethod, setDeliveryMethod] = useState('email');
  const [languageCode, setLanguageCode] = useState(i18n.language || 'fr');
  const [customMessage, setCustomMessage] = useState('');
  const [expiresInHours, setExpiresInHours] = useState(48);
  const [recipientEmail, setRecipientEmail] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Load templates on mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoadingTemplates(true);
        const response = await baseClient.get('/consent-templates', {
          query: { status: 'active', limit: 100 }
        });
        // response = { success, data: [...], pagination }
        // response.data is the array of templates
        setTemplates(response.data || []);
      } catch (err) {
        console.error('Error loading templates:', err);
        setError(t('common:errors.loadError'));
      } finally {
        setLoadingTemplates(false);
      }
    };

    if (isOpen) {
      fetchTemplates();
      setRecipientEmail(patient?.email || '');
      // Use patient's preferred language if available
      if (patient?.preferredLanguage) {
        setLanguageCode(patient.preferredLanguage);
      }
    }
  }, [isOpen, patient, t]);

  // Reset form on close
  useEffect(() => {
    if (!isOpen) {
      setSelectedTemplate('');
      setSelectedTypeFilter('');
      setDeliveryMethod('email');
      setCustomMessage('');
      setExpiresInHours(48);
      setError('');
      setSuccess(null);
    }
  }, [isOpen]);

  // Filtrer les templates par type
  const filteredTemplates = filterTemplatesByType(templates, selectedTypeFilter);

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedTemplate) {
      setError(t('admin:consents.selectTemplate'));
      return;
    }

    if (deliveryMethod === 'email' && !recipientEmail) {
      setError(t('admin:consents.emailRequired'));
      return;
    }

    try {
      setLoading(true);

      // Construire le payload en n'incluant que les champs avec valeurs
      const requestPayload = {
        patientId: patient.id,
        consentTemplateId: selectedTemplate,
        sentVia: deliveryMethod,
        languageCode,
        expiresInHours
      };

      // Ajouter les champs optionnels seulement s'ils ont une valeur
      if (appointmentId) {
        requestPayload.appointmentId = appointmentId;
      }
      if (deliveryMethod === 'email' && recipientEmail) {
        requestPayload.recipientEmail = recipientEmail;
      }
      if (customMessage) {
        requestPayload.customMessage = customMessage;
      }

      const result = await consentSigningApi.createRequest(requestPayload);

      setSuccess(result.data);
      onSuccess?.(result.data);
    } catch (err) {
      console.error('Error creating signing request:', err);
      setError(err.response?.data?.error?.message || t('common:errors.createError'));
    } finally {
      setLoading(false);
    }
  };

  // Copy signing URL
  const copySigningUrl = () => {
    if (success?.signingUrl) {
      navigator.clipboard.writeText(success.signingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-600" />
              {t('admin:consents.sendConsentRequest')}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Success view */}
          {success ? (
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t('admin:consents.requestSent')}
                </h3>
                <p className="text-gray-600">
                  {deliveryMethod === 'email'
                    ? t('admin:consents.emailSentTo', { email: recipientEmail })
                    : t('admin:consents.linkGenerated')}
                </p>
              </div>

              {/* Signing URL for tablet/link mode */}
              {(deliveryMethod === 'tablet' || deliveryMethod === 'link') && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin:consents.signingLink')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={success.signingUrl}
                      readOnly
                      className="flex-1 px-3 py-2 bg-white border rounded-lg text-sm"
                    />
                    <button
                      onClick={copySigningUrl}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  {t('common:actions.close')}
                </button>
              </div>
            </div>
          ) : (
            /* Form view */
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                {/* Patient info */}
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">{t('admin:consents.recipient')}:</span>{' '}
                    {patient?.firstName} {patient?.lastName}
                    {patient?.email && <span className="text-blue-600 ml-2">({patient.email})</span>}
                  </p>
                </div>

                {/* Type filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Filter className="w-4 h-4 inline mr-1" />
                    {t('admin:consents.filterByType')}
                  </label>
                  <select
                    value={selectedTypeFilter}
                    onChange={(e) => {
                      setSelectedTypeFilter(e.target.value);
                      setSelectedTemplate(''); // Reset template selection when filter changes
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('admin:consents.allTypes')}</option>
                    {Object.values(CONSENT_TYPES).map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Template selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <FileText className="w-4 h-4 inline mr-1" />
                    {t('admin:consents.template')} *
                  </label>
                  {loadingTemplates ? (
                    <div className="flex items-center gap-2 text-gray-500 py-2">
                      <Loader className="w-4 h-4 animate-spin" />
                      {t('common:loading')}
                    </div>
                  ) : filteredTemplates.length === 0 ? (
                    <div className="text-sm text-gray-500 py-2 bg-gray-50 rounded-lg px-3">
                      {selectedTypeFilter
                        ? t('admin:consents.noTemplatesForType', { type: getConsentTypeName(selectedTypeFilter) })
                        : t('admin:consents.noTemplates')
                      }
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <select
                        value={selectedTemplate}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">{t('admin:consents.selectTemplate')}</option>
                        {filteredTemplates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.title} ({getConsentTypeName(template.consent_type || template.consentType)})
                          </option>
                        ))}
                      </select>
                      {/* Bouton prévisualisation */}
                      {selectedTemplate && (
                        <button
                          type="button"
                          onClick={() => setShowPreview(true)}
                          className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1"
                          title={t('admin:consents.preview')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Delivery method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin:consents.deliveryMethod')}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('email')}
                      className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-colors
                        ${deliveryMethod === 'email'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <Mail className="w-5 h-5" />
                      <span className="text-xs font-medium">Email</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('tablet')}
                      className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-colors
                        ${deliveryMethod === 'tablet'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <Tablet className="w-5 h-5" />
                      <span className="text-xs font-medium">Tablette</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('link')}
                      className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-colors
                        ${deliveryMethod === 'link'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <Link className="w-5 h-5" />
                      <span className="text-xs font-medium">Lien</span>
                    </button>
                  </div>
                </div>

                {/* Email field (if email method) */}
                {deliveryMethod === 'email' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Mail className="w-4 h-4 inline mr-1" />
                      {t('admin:consents.recipientEmail')} *
                    </label>
                    <input
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="patient@email.com"
                      required
                    />
                  </div>
                )}

                {/* Language selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Globe className="w-4 h-4 inline mr-1" />
                    {t('admin:consents.language')}
                  </label>
                  <select
                    value={languageCode}
                    onChange={(e) => setLanguageCode(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </select>
                </div>

                {/* Expiration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Clock className="w-4 h-4 inline mr-1" />
                    {t('admin:consents.expiresIn')}
                  </label>
                  <select
                    value={expiresInHours}
                    onChange={(e) => setExpiresInHours(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={24}>24 heures</option>
                    <option value={48}>48 heures</option>
                    <option value={72}>72 heures</option>
                    <option value={168}>7 jours</option>
                  </select>
                </div>

                {/* Custom message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <MessageSquare className="w-4 h-4 inline mr-1" />
                    {t('admin:consents.customMessage')}
                  </label>
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                    placeholder={t('admin:consents.customMessagePlaceholder')}
                    maxLength={1000}
                  />
                </div>

                {/* Error message */}
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 p-4 border-t bg-gray-50 rounded-b-lg">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  disabled={loading}
                >
                  {t('common:actions.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading || loadingTemplates}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      {t('common:loading')}
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {t('admin:consents.sendRequest')}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Modal de prévisualisation */}
      <ConsentPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        template={templates.find(t => t.id === selectedTemplate)}
        patient={patient}
        appointmentId={appointmentId}
        onSignatureStarted={(data, workflow) => {
          setShowPreview(false);
          setSuccess(data);
          onSuccess?.(data);
        }}
      />
    </div>
  );
};

export default SendConsentRequestModal;
