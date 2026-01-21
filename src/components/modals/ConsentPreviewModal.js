/**
 * ConsentPreviewModal - Modal de prévisualisation d'un consentement
 *
 * Affiche le consentement avec les variables remplies et permet de
 * lancer un des parcours de signature électronique:
 * - Email: Envoyer un lien de signature par email
 * - Tablette: Ouvrir sur une tablette pour signature immédiate
 * - Lien: Générer un lien à partager
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Eye,
  Mail,
  Tablet,
  Link,
  Printer,
  Download,
  Send,
  FileText,
  CheckCircle,
  AlertTriangle,
  Loader,
  Copy,
  Check,
  ExternalLink,
  User,
  Calendar,
  Shield,
  Globe,
  Clock,
  Edit3
} from 'lucide-react';
import { consentVariableMapper } from '../../utils/consentVariableMapper';
import { getConsentTypeName } from '../../utils/consentTypes';
import { consentSigningApi } from '../../api/consentSigningApi';
import { useAuth } from '../../hooks/useAuth';
import { useLocale } from '../../contexts/LocaleContext';

// Parcours de signature disponibles
const SIGNATURE_WORKFLOWS = {
  EMAIL: {
    id: 'email',
    name: 'Par email',
    description: 'Envoyer un lien de signature au patient par email',
    icon: Mail,
    color: 'blue'
  },
  TABLET: {
    id: 'tablet',
    name: 'Sur tablette',
    description: 'Signature immédiate sur tablette en cabinet',
    icon: Tablet,
    color: 'purple'
  },
  LINK: {
    id: 'link',
    name: 'Générer un lien',
    description: 'Créer un lien à partager avec le patient',
    icon: Link,
    color: 'green'
  }
};

const ConsentPreviewModal = ({
  isOpen,
  onClose,
  template,           // Le template de consentement sélectionné
  patient,            // Les données du patient
  appointmentId = null,
  additionalData = {},  // Données additionnelles (intervention, risques, etc.)
  onSignatureStarted,   // Callback quand un parcours est lancé
  readOnly = false      // Mode lecture seule (pas de lancement de signature)
}) => {
  const { t, i18n } = useTranslation(['common', 'admin']);
  const { user } = useAuth();
  const { locale } = useLocale();
  const printRef = useRef(null);

  // États
  const [previewContent, setPreviewContent] = useState('');
  const [unfilledVariables, setUnfilledVariables] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [copied, setCopied] = useState(false);

  // États pour le formulaire d'envoi
  const [recipientEmail, setRecipientEmail] = useState('');
  const [languageCode, setLanguageCode] = useState(i18n.language || 'fr');
  const [customMessage, setCustomMessage] = useState('');
  const [expiresInHours, setExpiresInHours] = useState(48);

  // Générer le contenu avec variables remplies
  useEffect(() => {
    if (!isOpen || !template) return;

    const templateContent = template.content || template.terms || template.description || '';

    // Préparer les données du praticien depuis le user connecté
    const practitionerData = user ? {
      firstName: user.firstName || user.first_name || '',
      lastName: user.lastName || user.last_name || '',
      role: user.role || 'doctor',
      specialty: user.specialty || 'Médecine générale',
      facility: user.companyName || user.clinicName || 'Cabinet Médical',
      facilityAddress: user.companyAddress || '',
      facilityPhone: user.companyPhone || '',
      rppsNumber: user.rppsNumber || '',
      adeliNumber: user.adeliNumber || ''
    } : null;

    // Remplir les variables avec les données disponibles
    // Passer l'objet patient directement (pas l'ID)
    const filledContent = consentVariableMapper.fillTemplateVariables(
      templateContent,
      patient, // Objet patient complet
      practitionerData, // Objet praticien
      additionalData
    );

    setPreviewContent(filledContent);

    // Identifier les variables non remplies
    const unfilled = consentVariableMapper.getUnfilledVariables(filledContent);
    setUnfilledVariables(unfilled);

    // Pré-remplir l'email du patient
    const patientEmail = patient?.email || patient?.contact?.email;
    if (patientEmail) {
      setRecipientEmail(patientEmail);
    }
  }, [isOpen, template, patient, user, additionalData]);

  // Reset à la fermeture
  useEffect(() => {
    if (!isOpen) {
      setSelectedWorkflow(null);
      setError('');
      setSuccess(null);
      setCustomMessage('');
      setExpiresInHours(48);
    }
  }, [isOpen]);

  // Lancer un parcours de signature
  const startSignatureWorkflow = async () => {
    if (!selectedWorkflow || !template || !patient) return;

    setIsLoading(true);
    setError('');

    try {
      // Construire le payload en n'incluant que les champs avec valeurs
      const requestPayload = {
        patientId: patient.id,
        consentTemplateId: template.id,
        sentVia: selectedWorkflow,
        languageCode,
        expiresInHours
      };

      // Ajouter les champs optionnels seulement s'ils ont une valeur
      if (appointmentId) {
        requestPayload.appointmentId = appointmentId;
      }
      if (selectedWorkflow === 'email' && recipientEmail) {
        requestPayload.recipientEmail = recipientEmail;
      }
      if (customMessage) {
        requestPayload.customMessage = customMessage;
      }

      const result = await consentSigningApi.createRequest(requestPayload);

      console.log('[ConsentPreviewModal] API Response:', result);

      // L'API retourne { success: true, data: {...} } ou directement les données
      // On prend result.data si présent, sinon result directement
      const responseData = result.data || result;
      console.log('[ConsentPreviewModal] responseData:', responseData);
      console.log('[ConsentPreviewModal] signingUrl:', responseData?.signingUrl);

      // Stocker le résultat pour afficher la vue de succès avec le lien
      // NE PAS appeler onSignatureStarted ici - on attend que l'utilisateur ferme
      setSuccess(responseData);
    } catch (err) {
      console.error('[ConsentPreviewModal] Error starting signature:', err);
      setError(err.response?.data?.error?.message || t('common:errors.createError'));
    } finally {
      setIsLoading(false);
    }
  };

  // Copier le lien de signature
  const copySigningUrl = useCallback(() => {
    if (success?.signingUrl) {
      navigator.clipboard.writeText(success.signingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [success]);

  // Ouvrir le lien de signature (pour tablette)
  const openSigningUrl = useCallback(() => {
    if (success?.signingUrl) {
      window.open(success.signingUrl, '_blank');
    }
  }, [success]);

  // Imprimer la prévisualisation
  const handlePrint = useCallback(() => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Consentement - ${template?.title || 'Preview'}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
              line-height: 1.6;
            }
            h1 { font-size: 1.5em; margin-bottom: 20px; }
            .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .content { white-space: pre-wrap; }
            .signature-area { margin-top: 60px; }
            .signature-line {
              border-top: 1px solid #333;
              width: 200px;
              margin-top: 40px;
              padding-top: 5px;
            }
            .patient-info { background: #f5f5f5; padding: 15px; margin-bottom: 20px; }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${template?.title || 'Consentement'}</h1>
            <p><strong>Type:</strong> ${getConsentTypeName(template?.consentType)}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString(locale)}</p>
          </div>
          <div class="patient-info">
            <p><strong>Patient:</strong> ${patient?.firstName || ''} ${patient?.lastName || ''}</p>
            ${patient?.birthDate ? `<p><strong>Date de naissance:</strong> ${new Date(patient.birthDate).toLocaleDateString(locale)}</p>` : ''}
            ${patient?.patientNumber ? `<p><strong>N° Patient:</strong> ${patient.patientNumber}</p>` : ''}
          </div>
          <div class="content">${previewContent}</div>
          <div class="signature-area">
            <div class="signature-line">Signature du patient</div>
            <div class="signature-line">Signature du praticien</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }, [template, patient, previewContent]);

  // Télécharger en PDF (simulation - génère un HTML)
  const handleDownload = useCallback(() => {
    const blob = new Blob([`
      <!DOCTYPE html>
      <html>
        <head><title>Consentement - ${template?.title}</title></head>
        <body style="font-family: Arial; padding: 40px; max-width: 800px; margin: 0 auto;">
          <h1>${template?.title}</h1>
          <p>Patient: ${patient?.firstName} ${patient?.lastName}</p>
          <p>Date: ${new Date().toLocaleDateString(locale)}</p>
          <hr/>
          <div style="white-space: pre-wrap;">${previewContent}</div>
        </body>
      </html>
    `], { type: 'text/html' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consentement_${patient?.lastName || 'patient'}_${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [template, patient, previewContent]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="flex min-h-full">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/60 transition-opacity"
          onClick={onClose}
        />

        {/* Modal - Full width pour preview */}
        <div className="relative bg-white w-full max-w-6xl mx-auto my-4 rounded-lg shadow-2xl flex flex-col max-h-[95vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
            <div className="flex items-center gap-3">
              <Eye className="w-6 h-6" />
              <div>
                <h2 className="text-xl font-semibold">
                  {t('admin:consents.preview')}
                </h2>
                <p className="text-sm text-blue-100">
                  {template?.title || 'Consentement'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Actions rapides */}
              <button
                onClick={handlePrint}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title={t('common:actions.print')}
              >
                <Printer className="w-5 h-5" />
              </button>
              <button
                onClick={handleDownload}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title={t('common:actions.download')}
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors ml-2"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Contenu principal */}
          <div className="flex-1 flex overflow-hidden">
            {/* Colonne gauche - Prévisualisation */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {/* Infos patient */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-800">
                    {patient?.firstName} {patient?.lastName}
                  </span>
                  {patient?.patientNumber && (
                    <span className="text-sm text-blue-600">
                      ({patient.patientNumber})
                    </span>
                  )}
                </div>
                {patient?.birthDate && (
                  <div className="text-sm text-blue-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Né(e) le {new Date(patient.birthDate).toLocaleDateString(locale)}
                  </div>
                )}
              </div>

              {/* Avertissement variables non remplies */}
              {unfilledVariables.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800">
                        Variables non remplies ({unfilledVariables.length})
                      </p>
                      <p className="text-sm text-amber-700 mt-1">
                        Les variables suivantes n'ont pas pu être remplies automatiquement :
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {unfilledVariables.slice(0, 10).map((variable, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-mono"
                          >
                            [{variable}]
                          </span>
                        ))}
                        {unfilledVariables.length > 10 && (
                          <span className="px-2 py-1 text-amber-700 text-xs">
                            +{unfilledVariables.length - 10} autres...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Contenu du consentement */}
              <div
                ref={printRef}
                className="bg-white border rounded-lg p-6 shadow-sm"
              >
                <div className="flex items-center justify-between mb-4 pb-4 border-b">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {template?.title}
                    </h3>
                    <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                      <Shield className="w-4 h-4" />
                      {getConsentTypeName(template?.consentType)}
                      {template?.version && (
                        <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded text-xs">
                          v{template.version}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date().toLocaleDateString(locale)}
                    </div>
                  </div>
                </div>

                {/* Contenu avec variables remplacées */}
                <div className="prose prose-sm max-w-none">
                  <div
                    className="whitespace-pre-wrap text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: previewContent
                        // Mettre en évidence les variables non remplies
                        .replace(/\[([^\]]+)\]/g, '<span class="bg-amber-100 text-amber-800 px-1 rounded font-mono text-sm">[$1]</span>')
                    }}
                  />
                </div>

                {/* Zone de signature (aperçu) */}
                <div className="mt-8 pt-6 border-t border-dashed">
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-4">Signature du patient</p>
                      <div className="h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
                        <Edit3 className="w-6 h-6 mr-2" />
                        Zone de signature
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Date: _______________
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-4">Signature du praticien</p>
                      <div className="h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
                        <Edit3 className="w-6 h-6 mr-2" />
                        Zone de signature
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Date: _______________
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Colonne droite - Parcours de signature */}
            {!readOnly && (
              <div className="w-96 border-l bg-white overflow-y-auto">
                {success ? (
                  /* Vue succès */
                  <div className="p-6">
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {t('admin:consents.requestCreated')}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {selectedWorkflow === 'email'
                          ? t('admin:consents.emailSentTo', { email: recipientEmail })
                          : t('admin:consents.linkGenerated')}
                      </p>
                    </div>

                    {/* Lien de signature */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('admin:consents.signingLink')}
                      </label>
                      {success.signingUrl ? (
                        <>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={success.signingUrl}
                              readOnly
                              className="flex-1 px-3 py-2 bg-white border rounded-lg text-sm truncate"
                            />
                            <button
                              onClick={copySigningUrl}
                              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                              title="Copier le lien"
                            >
                              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>

                          {/* Bouton ouvrir pour tous les workflows (utile pour tablette et lien) */}
                          <button
                            onClick={openSigningUrl}
                            className="mt-3 w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Ouvrir le lien de signature
                          </button>
                        </>
                      ) : (
                        <p className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
                          Le lien n'a pas été retourné par l'API. Vérifiez la console pour plus de détails.
                          <br />
                          <span className="text-xs text-gray-500">
                            Debug: {JSON.stringify(success, null, 2).substring(0, 200)}...
                          </span>
                        </p>
                      )}
                    </div>

                    {/* Expiration */}
                    <div className="text-sm text-gray-500 flex items-center gap-2 justify-center">
                      <Clock className="w-4 h-4" />
                      Expire dans {expiresInHours} heures
                    </div>

                    <div className="mt-6 flex gap-2">
                      <button
                        onClick={() => {
                          setSuccess(null);
                          setSelectedWorkflow(null);
                        }}
                        className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                      >
                        Nouvelle demande
                      </button>
                      <button
                        onClick={() => {
                          // Notifier le parent que la signature a été démarrée avant de fermer
                          onSignatureStarted?.(success, selectedWorkflow);
                          onClose();
                        }}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        {t('common:actions.close')}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Sélection du parcours */
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Send className="w-5 h-5 text-blue-600" />
                      Parcours de signature
                    </h3>

                    {/* Choix du parcours */}
                    <div className="space-y-3 mb-6">
                      {Object.values(SIGNATURE_WORKFLOWS).map((workflow) => {
                        const Icon = workflow.icon;
                        const isSelected = selectedWorkflow === workflow.id;
                        return (
                          <button
                            key={workflow.id}
                            onClick={() => setSelectedWorkflow(workflow.id)}
                            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                              isSelected
                                ? `border-${workflow.color}-500 bg-${workflow.color}-50`
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${
                                isSelected ? `bg-${workflow.color}-100` : 'bg-gray-100'
                              }`}>
                                <Icon className={`w-5 h-5 ${
                                  isSelected ? `text-${workflow.color}-600` : 'text-gray-500'
                                }`} />
                              </div>
                              <div>
                                <p className={`font-medium ${
                                  isSelected ? `text-${workflow.color}-900` : 'text-gray-900'
                                }`}>
                                  {workflow.name}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {workflow.description}
                                </p>
                              </div>
                              {isSelected && (
                                <CheckCircle className={`w-5 h-5 text-${workflow.color}-600 ml-auto`} />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Options selon le parcours sélectionné */}
                    {selectedWorkflow && (
                      <div className="space-y-4 border-t pt-4">
                        {/* Email pour envoi par email */}
                        {selectedWorkflow === 'email' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              <Mail className="w-4 h-4 inline mr-1" />
                              Email du destinataire *
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

                        {/* Langue */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Globe className="w-4 h-4 inline mr-1" />
                            Langue du formulaire
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
                            Validité du lien
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

                        {/* Message personnalisé (pour email) */}
                        {selectedWorkflow === 'email' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Message personnalisé (optionnel)
                            </label>
                            <textarea
                              value={customMessage}
                              onChange={(e) => setCustomMessage(e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                              rows={3}
                              placeholder="Ajoutez un message pour le patient..."
                              maxLength={500}
                            />
                          </div>
                        )}

                        {/* Erreur */}
                        {error && (
                          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                            {error}
                          </div>
                        )}

                        {/* Bouton d'action */}
                        <button
                          onClick={startSignatureWorkflow}
                          disabled={isLoading || (selectedWorkflow === 'email' && !recipientEmail)}
                          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                        >
                          {isLoading ? (
                            <>
                              <Loader className="w-5 h-5 animate-spin" />
                              Création en cours...
                            </>
                          ) : (
                            <>
                              <Send className="w-5 h-5" />
                              {selectedWorkflow === 'email' && 'Envoyer par email'}
                              {selectedWorkflow === 'tablet' && 'Préparer pour tablette'}
                              {selectedWorkflow === 'link' && 'Générer le lien'}
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Instructions si aucun parcours sélectionné */}
                    {!selectedWorkflow && (
                      <div className="text-center text-gray-500 py-8">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">
                          Sélectionnez un parcours de signature pour continuer
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center px-6 py-4 border-t bg-gray-50 rounded-b-lg">
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Données sécurisées et conformes RGPD
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                {t('common:actions.close')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsentPreviewModal;
