// components/modals/ConsentFormModal.js
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, FileText, Shield, AlertCircle, Clock, CheckCircle, User, Calendar, Signature, Eye } from 'lucide-react';
import { consentsApi } from '../../api/consentsApi';
import { patientsApi } from '../../api/patientsApi';
import { consentTemplatesApi } from '../../api/consentTemplatesApi';
import { CONSENT_TYPES, COLLECTION_METHODS, getConsentTypeName, filterTemplatesByType } from '../../utils/consentTypes';
import { consentVariableMapper } from '../../utils/consentVariableMapper';
import { useAuth } from '../../hooks/useAuth';
import ConsentPreviewModal from './ConsentPreviewModal';

const ConsentFormModal = ({
  isOpen,
  onClose,
  onSave,
  patientId = null,
  editingConsent = null,
  preselectedType = null
}) => {
  const { t } = useTranslation(['common', 'admin']);
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    patientId: patientId || '',
    type: preselectedType || '',
    purpose: '',
    title: '',
    description: '',
    collectionMethod: 'digital',
    isRequired: false,
    status: 'granted',
    expiresAt: '',
    witness: {
      name: '',
      role: '',
      signature: ''
    },
    specificDetails: {
      procedure: '',
      risks: '',
      alternatives: '',
      expectedResults: ''
    }
  });

  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [existingConsents, setExistingConsents] = useState([]);
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [prefilledContent, setPrefilledContent] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Charger les données initiales
  useEffect(() => {
    const loadInitialData = async () => {
      if (!isOpen) return;

      setLoadingData(true);
      try {
        // Charger la liste des patients et des modèles en parallèle
        const [patientsResponse, templatesResponse] = await Promise.all([
          patientsApi.getPatients(),
          consentTemplatesApi.getActiveTemplates()
        ]);

        const allPatients = patientsResponse.patients || [];
        setPatients(allPatients);
        setAvailableTemplates(templatesResponse || []);

        // Si on édite un consentement existant
        if (editingConsent) {
          setFormData({
            ...editingConsent,
            expiresAt: editingConsent.expiresAt ? editingConsent.expiresAt.split('T')[0] : '',
            witness: editingConsent.witness || { name: '', role: '', signature: '' },
            specificDetails: editingConsent.specificDetails || {
              procedure: '',
              risks: '',
              alternatives: '',
              expectedResults: ''
            }
          });

          if (editingConsent.patientId) {
            const patient = allPatients.find(p => p.id === editingConsent.patientId);
            setSelectedPatient(patient || null);
          }
        }

        // Charger les consentements existants pour le patient
        if (patientId) {
          const { consents } = await consentsApi.getConsentsByPatient(patientId);
          setExistingConsents(consents || []);
          const patient = allPatients.find(p => p.id === patientId);
          setSelectedPatient(patient || null);
        }
      } catch (error) {
        console.error('[ConsentFormModal] Error loading data:', error);
      } finally {
        setLoadingData(false);
      }
    };

    loadInitialData();
  }, [isOpen, editingConsent, patientId]);

  // Mettre à jour les consentements existants quand le patient change
  useEffect(() => {
    const loadPatientConsents = async () => {
      if (formData.patientId && patients.length > 0) {
        try {
          const { consents } = await consentsApi.getConsentsByPatient(formData.patientId);
          setExistingConsents(consents || []);
          const patient = patients.find(p => p.id === formData.patientId);
          setSelectedPatient(patient || null);
        } catch (error) {
          console.error('[ConsentFormModal] Error loading patient consents:', error);
        }
      }
    };

    loadPatientConsents();
  }, [formData.patientId, patients]);

  // Mettre à jour le titre et la description selon le type
  useEffect(() => {
    if (formData.type && CONSENT_TYPES[formData.type.toUpperCase()]) {
      const typeInfo = CONSENT_TYPES[formData.type.toUpperCase()];
      if (!editingConsent) { // Ne pas écraser si on édite
        setFormData(prev => ({
          ...prev,
          title: typeInfo.name,
          description: typeInfo.description,
          isRequired: typeInfo.required,
          expiresAt: typeInfo.defaultDuration ?
            new Date(Date.now() + typeInfo.defaultDuration * 24 * 60 * 60 * 1000).toISOString().split('T')[0] :
            ''
        }));
      }
    }
  }, [formData.type, editingConsent]);

  // Préremplir automatiquement avec un modèle
  const handleTemplateSelection = (templateId) => {
    if (!templateId) {
      setSelectedTemplate('');
      setPrefilledContent('');
      return;
    }

    // Trouver le template dans les templates déjà chargés
    const template = availableTemplates.find(t => t.id === templateId);
    if (!template) return;

    // Préremplir les données du formulaire avec le modèle
    setFormData(prev => ({
      ...prev,
      type: template.consentType || prev.type,
      title: template.title,
      description: template.description || template.terms
    }));

    // Préparer les données additionnelles
    const additionalData = {
      procedureDescription: formData.specificDetails?.procedure || '',
      specificRisks: formData.specificDetails?.risks || '',
      expectedBenefits: formData.specificDetails?.expectedResults || '',
      alternatives: formData.specificDetails?.alternatives || ''
    };

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

    const templateContent = template.content || template.terms || '';
    // Passer l'objet patient directement (selectedPatient), pas l'ID
    const filledContent = consentVariableMapper.fillTemplateVariables(
      templateContent,
      selectedPatient, // Objet patient complet
      practitionerData, // Objet praticien
      additionalData
    );

    setPrefilledContent(filledContent);
    setSelectedTemplate(templateId);
  };

  // Refaire le préremplissage quand le patient change
  useEffect(() => {
    if (selectedTemplate && formData.patientId) {
      handleTemplateSelection(selectedTemplate);
    }
  }, [formData.patientId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validation
      const errors = validateForm();
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        setIsSubmitting(false);
        return;
      }

      // Préparer les données pour la sauvegarde
      const consentData = {
        ...formData,
        // Utiliser le contenu pré-rempli si un modèle est sélectionné
        description: selectedTemplate && prefilledContent ? prefilledContent : formData.description,
        terms: selectedTemplate && prefilledContent ? prefilledContent : formData.description,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt + 'T23:59:59').toISOString() : null,
        witness: formData.collectionMethod === 'verbal' ? formData.witness : null,
        consentTemplateId: selectedTemplate || null
      };

      let result;
      if (editingConsent) {
        result = await consentsApi.updateConsent(editingConsent.id, consentData);
      } else {
        result = await consentsApi.createConsent(consentData);
      }

      onSave(result);
      handleClose();
    } catch (error) {
      console.error('[ConsentFormModal] Error saving consent:', error);
      setValidationErrors({ general: error.message || 'Erreur lors de la sauvegarde' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.patientId) errors.patientId = 'Sélectionner un patient';
    if (!formData.type) errors.type = 'Sélectionner un type de consentement';
    if (!formData.title?.trim()) errors.title = 'Titre requis';
    if (!formData.description?.trim()) errors.description = 'Description requise';
    if (!formData.purpose?.trim()) errors.purpose = 'Finalité requise';

    // Validation pour consentement verbal avec témoin
    if (formData.collectionMethod === 'verbal') {
      if (!formData.witness?.name?.trim()) {
        errors['witness.name'] = 'Nom du témoin requis pour consentement verbal';
      }
      if (!formData.witness?.role?.trim()) {
        errors['witness.role'] = 'Rôle du témoin requis';
      }
    }

    // Validation pour soins spécifiques
    if (formData.type === 'medical_specific') {
      if (!formData.specificDetails?.procedure?.trim()) {
        errors['specificDetails.procedure'] = 'Description de la procédure requise';
      }
      if (!formData.specificDetails?.risks?.trim()) {
        errors['specificDetails.risks'] = 'Description des risques requise';
      }
    }

    return errors;
  };

  const handleClose = () => {
    setFormData({
      patientId: patientId || '',
      type: preselectedType || '',
      purpose: '',
      title: '',
      description: '',
      collectionMethod: 'digital',
      isRequired: false,
      status: 'granted',
      expiresAt: '',
      witness: { name: '', role: '', signature: '' },
      specificDetails: { procedure: '', risks: '', alternatives: '', expectedResults: '' }
    });
    setValidationErrors({});
    setIsSubmitting(false);
    setSelectedTemplate('');
    setPrefilledContent('');
    onClose();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'granted': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'revoked': return <X className="h-4 w-4 text-red-500" />;
      case 'expired': return <Clock className="h-4 w-4 text-orange-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'granted': return 'Accordé';
      case 'revoked': return 'Révoqué';
      case 'expired': return 'Expiré';
      default: return 'Inconnu';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Shield className="h-6 w-6" />
            <h2 className="text-xl font-semibold">
              {editingConsent ? 'Modifier le consentement' : 'Nouveau consentement'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-white hover:text-gray-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex">
          {/* Formulaire principal */}
          <div className="flex-1 p-6 overflow-y-auto max-h-[75vh]">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Sélection patient */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Patient *
                </label>
                <select
                  value={formData.patientId}
                  onChange={(e) => setFormData(prev => ({ ...prev, patientId: e.target.value }))}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    validationErrors.patientId ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={!!patientId}
                >
                  <option value="">Sélectionner un patient</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.id}>
                      {patient.firstName} {patient.lastName} - {patient.patientNumber}
                    </option>
                  ))}
                </select>
                {validationErrors.patientId && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.patientId}</p>
                )}
              </div>

              {/* Type de consentement */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de consentement *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    validationErrors.type ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Sélectionner un type</option>
                  {Object.values(CONSENT_TYPES).map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name} {type.required ? '(Obligatoire)' : ''}
                    </option>
                  ))}
                </select>
                {validationErrors.type && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.type}</p>
                )}
              </div>

              {/* Sélection de modèle pour préremplissage automatique */}
              {formData.type && availableTemplates.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-green-600" />
                    Modèle de consentement (optionnel)
                  </label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => handleTemplateSelection(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Saisie manuelle - Aucun modèle</option>
                    {filterTemplatesByType(availableTemplates, formData.type)
                      .map(template => (
                      <option key={template.id} value={template.id}>
                        📄 {template.title} ({getConsentTypeName(template.consentType)})
                      </option>
                    ))}
                  </select>
                  {selectedTemplate && (
                    <div className="mt-3 p-3 bg-white border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-green-700">
                          ✅ Modèle sélectionné - Les données patient seront automatiquement pré-remplies
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowPreview(true)}
                          className="px-3 py-1 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          {t('admin:consents.preview')}
                        </button>
                      </div>
                      {prefilledContent && (
                        <div className="text-xs text-gray-600">
                          <strong>Aperçu:</strong>
                          <div className="mt-1 max-h-20 overflow-y-auto bg-gray-50 p-2 rounded text-xs">
                            {prefilledContent.substring(0, 200)}...
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-gray-600 mt-2">
                    💡 Sélectionnez un modèle pour pré-remplir automatiquement le consentement avec les données du patient
                  </p>
                </div>
              )}

              {/* Finalité */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Finalité *
                </label>
                <input
                  type="text"
                  value={formData.purpose}
                  onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    validationErrors.purpose ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Ex: soins médicaux, recherche, marketing..."
                />
                {validationErrors.purpose && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.purpose}</p>
                )}
              </div>

              {/* Titre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    validationErrors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Titre du consentement"
                />
                {validationErrors.title && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.title}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
                  Description *
                  {selectedTemplate && prefilledContent && (
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                      📄 Contenu pré-rempli depuis le modèle
                    </span>
                  )}
                </label>
                <textarea
                  value={selectedTemplate && prefilledContent ? prefilledContent : formData.description}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, description: e.target.value }));
                    // Si l'utilisateur modifie manuellement, désélectionner le modèle
                    if (selectedTemplate && e.target.value !== prefilledContent) {
                      setSelectedTemplate('');
                      setPrefilledContent('');
                    }
                  }}
                  rows={selectedTemplate && prefilledContent ? 8 : 4}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    validationErrors.description ? 'border-red-500' : 'border-gray-300'
                  } ${selectedTemplate && prefilledContent ? 'bg-green-50 border-green-300' : ''}`}
                  placeholder={selectedTemplate && prefilledContent ?
                    "Contenu pré-rempli avec les données du patient. Vous pouvez modifier le texte si nécessaire." :
                    "Description détaillée du consentement"
                  }
                />
                {selectedTemplate && prefilledContent && (
                  <div className="mt-2 text-xs text-green-700 bg-green-50 p-2 rounded border border-green-200">
                    💡 <strong>Variables automatiquement remplies:</strong> Nom patient, date, praticien, etc.
                    <br />
                    ✏️ Vous pouvez modifier le texte selon vos besoins. La modification désélectionnera automatiquement le modèle.
                  </div>
                )}
                {validationErrors.description && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.description}</p>
                )}
              </div>

              {/* Méthode de collecte */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Méthode de collecte
                </label>
                <select
                  value={formData.collectionMethod}
                  onChange={(e) => setFormData(prev => ({ ...prev, collectionMethod: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Object.values(COLLECTION_METHODS).map(method => (
                    <option key={method.id} value={method.id}>
                      {method.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Témoin (si consentement verbal) */}
              {formData.collectionMethod === 'verbal' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Informations du témoin
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nom du témoin *
                      </label>
                      <input
                        type="text"
                        value={formData.witness.name}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          witness: { ...prev.witness, name: e.target.value }
                        }))}
                        className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          validationErrors['witness.name'] ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Nom complet"
                      />
                      {validationErrors['witness.name'] && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors['witness.name']}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rôle *
                      </label>
                      <input
                        type="text"
                        value={formData.witness.role}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          witness: { ...prev.witness, role: e.target.value }
                        }))}
                        className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          validationErrors['witness.role'] ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Ex: Infirmière, Accompagnant..."
                      />
                      {validationErrors['witness.role'] && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors['witness.role']}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Détails spécifiques pour soins médicaux */}
              {formData.type === 'medical_specific' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Détails des soins spécifiques
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Procédure/Intervention *
                      </label>
                      <textarea
                        value={formData.specificDetails.procedure}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          specificDetails: { ...prev.specificDetails, procedure: e.target.value }
                        }))}
                        rows={2}
                        className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          validationErrors['specificDetails.procedure'] ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Description de la procédure ou intervention"
                      />
                      {validationErrors['specificDetails.procedure'] && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors['specificDetails.procedure']}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Risques et complications *
                      </label>
                      <textarea
                        value={formData.specificDetails.risks}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          specificDetails: { ...prev.specificDetails, risks: e.target.value }
                        }))}
                        rows={2}
                        className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          validationErrors['specificDetails.risks'] ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Risques associés à la procédure"
                      />
                      {validationErrors['specificDetails.risks'] && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors['specificDetails.risks']}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Alternatives
                      </label>
                      <textarea
                        value={formData.specificDetails.alternatives}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          specificDetails: { ...prev.specificDetails, alternatives: e.target.value }
                        }))}
                        rows={2}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Alternatives possibles"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Résultats attendus
                      </label>
                      <textarea
                        value={formData.specificDetails.expectedResults}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          specificDetails: { ...prev.specificDetails, expectedResults: e.target.value }
                        }))}
                        rows={2}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Résultats et bénéfices attendus"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Date d'expiration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date d'expiration
                  <span className="text-gray-500 text-sm ml-2">(optionnel)</span>
                </label>
                <input
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min={new Date().toISOString().split('T')[0]}
                />
                <p className="text-gray-500 text-sm mt-1">
                  Laisser vide pour un consentement permanent (jusqu'à révocation)
                </p>
              </div>

              {/* Statut */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statut
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="granted">Accordé</option>
                  <option value="revoked">Révoqué</option>
                </select>
              </div>

              {/* Erreur générale */}
              {validationErrors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm">{validationErrors.general}</p>
                </div>
              )}

              {/* Boutons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Enregistrement...
                    </>
                  ) : editingConsent ? (
                    'Modifier'
                  ) : (
                    'Créer'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Panneau latéral - Consentements existants */}
          {selectedPatient && existingConsents.length > 0 && (
            <div className="w-80 bg-gray-50 border-l overflow-y-auto max-h-[75vh]">
              <div className="p-4 border-b bg-white">
                <h3 className="font-medium text-gray-900 flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Consentements existants
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </p>
              </div>
              <div className="p-4 space-y-3">
                {existingConsents.map(consent => (
                  <div key={consent.id} className="bg-white rounded-lg p-3 border">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          {getStatusIcon(consent.status)}
                          <span className="text-sm font-medium text-gray-900">
                            {getStatusText(consent.status)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 font-medium mb-1">
                          {consent.title}
                        </p>
                        <p className="text-xs text-gray-500 mb-1">
                          {consent.purpose}
                        </p>
                        <div className="text-xs text-gray-400 space-y-1">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(consent.createdAt).toLocaleDateString()}
                          </div>
                          {consent.expiresAt && (
                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              Expire: {new Date(consent.expiresAt).toLocaleDateString()}
                            </div>
                          )}
                          <div className="flex items-center">
                            <Signature className="h-3 w-3 mr-1" />
                            {COLLECTION_METHODS[consent.collectionMethod]?.name || consent.collectionMethod}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de prévisualisation */}
      <ConsentPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        template={availableTemplates.find(t => t.id === selectedTemplate)}
        patient={selectedPatient}
        additionalData={{
          procedureDescription: formData.specificDetails?.procedure,
          specificRisks: formData.specificDetails?.risks,
          expectedBenefits: formData.specificDetails?.expectedResults,
          alternatives: formData.specificDetails?.alternatives
        }}
        onSignatureStarted={(data, workflow) => {
          setShowPreview(false);
          // Optionnel: fermer la modale principale ou afficher un message de succès
          onSave?.(data);
          handleClose();
        }}
      />
    </div>
  );
};

export default ConsentFormModal;