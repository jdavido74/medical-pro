// components/modals/ConsentTemplateEditorModal.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Save, FileText, Upload, Download, Eye, Copy, AlertCircle,
  Plus, Minus, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Quote, Code, Link, Image, Undo, Redo, Type,
  CheckSquare, Mail, User, Calendar, Phone, MapPin, Stethoscope,
  Globe, Trash2, Languages, Check, Loader
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { consentTemplatesApi } from '../../api/consentTemplatesApi';
import { useConsentTypes, useSpecialties } from '../../hooks/useSystemCategories';
import { useAuth } from '../../hooks/useAuth';
import { sanitizeHTML } from '../../utils/sanitize';

// Available languages for translations
const AVAILABLE_LANGUAGES = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' }
];

const ConsentTemplateEditorModal = ({
  isOpen,
  onClose,
  onSave,
  editingTemplate = null,
  mode = 'create' // 'create', 'edit', 'duplicate'
}) => {
  const { t } = useTranslation('consents');
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Dynamic categories from API
  const { categories: consentTypes, loading: consentTypesLoading, getTranslatedName: getConsentTypeName } = useConsentTypes();
  const { categories: specialties, loading: specialtiesLoading, getTranslatedName: getSpecialtyName } = useSpecialties();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    consentType: 'medical_treatment',
    speciality: 'general',
    content: '',
    status: 'draft',
    variables: [], // Variables dynamiques dans le template
    requiredFields: [],
    tags: []
  });

  const [editorMode, setEditorMode] = useState('visual'); // 'visual' ou 'source'
  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [importedFileName, setImportedFileName] = useState('');
  const [isInitialized, setIsInitialized] = useState(false); // Track if form was initialized

  // Variables dynamiques détectées automatiquement
  const [detectedVariables, setDetectedVariables] = useState([]);

  // Translation states
  const [activeEditorTab, setActiveEditorTab] = useState('content'); // 'content' or 'translations'
  const [translations, setTranslations] = useState([]);
  const [translationsLoading, setTranslationsLoading] = useState(false);
  const [selectedTranslationLang, setSelectedTranslationLang] = useState(null);
  const [editingTranslation, setEditingTranslation] = useState({
    languageCode: '',
    title: '',
    description: '',
    terms: ''
  });
  const [translationSaving, setTranslationSaving] = useState(false);

  // Charger les données initiales - seulement quand le modal s'ouvre
  useEffect(() => {
    if (isOpen && !isInitialized) {
      if (editingTemplate) {
        setFormData({
          ...editingTemplate,
          // Map backend consent_type to frontend consentType
          consentType: editingTemplate.consentType || editingTemplate.consent_type || 'medical_treatment',
          variables: editingTemplate.variables || [],
          requiredFields: editingTemplate.requiredFields || [],
          tags: editingTemplate.tags || []
        });
      } else if (mode === 'create') {
        setFormData({
          title: '',
          description: '',
          consentType: 'medical_treatment',
          speciality: 'general',
          content: '',
          status: 'draft',
          variables: [],
          requiredFields: [],
          tags: []
        });
      }
      setIsInitialized(true);
    }
    // Reset initialization flag when modal closes
    if (!isOpen) {
      setIsInitialized(false);
    }
  }, [isOpen, editingTemplate, mode, isInitialized]);

  // Détecter automatiquement les variables dans le contenu
  useEffect(() => {
    const variableRegex = /\[([^\]]+)\]/g;
    const matches = [...formData.content.matchAll(variableRegex)];
    const variables = [...new Set(matches.map(match => match[1]))];
    setDetectedVariables(variables);
  }, [formData.content]);

  // Load translations when editing an existing template
  useEffect(() => {
    const loadTranslations = async () => {
      if (isOpen && editingTemplate?.id && mode === 'edit') {
        setTranslationsLoading(true);
        try {
          const translationsList = await consentTemplatesApi.getTemplateTranslations(editingTemplate.id);
          setTranslations(translationsList || []);
        } catch (error) {
          console.error('[ConsentTemplateEditorModal] Error loading translations:', error);
          setTranslations([]);
        } finally {
          setTranslationsLoading(false);
        }
      } else {
        setTranslations([]);
      }
    };
    loadTranslations();
  }, [isOpen, editingTemplate?.id, mode]);

  // Translation management functions
  const handleSelectTranslation = (langCode) => {
    const existingTranslation = translations.find(t => t.language_code === langCode);
    if (existingTranslation) {
      setEditingTranslation({
        languageCode: existingTranslation.language_code,
        title: existingTranslation.title || '',
        description: existingTranslation.description || '',
        terms: existingTranslation.terms || ''
      });
    } else {
      // Pre-fill with original content for new translation
      setEditingTranslation({
        languageCode: langCode,
        title: formData.title || '',
        description: formData.description || '',
        terms: formData.content || ''
      });
    }
    setSelectedTranslationLang(langCode);
  };

  const handleSaveTranslation = async () => {
    if (!editingTemplate?.id || !selectedTranslationLang) return;

    setTranslationSaving(true);
    try {
      // Backend uses upsert logic, so we always use createTemplateTranslation
      await consentTemplatesApi.createTemplateTranslation(
        editingTemplate.id,
        editingTranslation
      );

      // Reload translations
      const updatedTranslations = await consentTemplatesApi.getTemplateTranslations(editingTemplate.id);
      setTranslations(updatedTranslations || []);
      setSelectedTranslationLang(null);
      setEditingTranslation({ languageCode: '', title: '', description: '', terms: '' });
    } catch (error) {
      console.error('[ConsentTemplateEditorModal] Error saving translation:', error);
      alert(t('templateEditor.translations.saveError'));
    } finally {
      setTranslationSaving(false);
    }
  };

  const handleDeleteTranslation = async (langCode) => {
    if (!editingTemplate?.id) return;
    if (!window.confirm(t('templateEditor.translations.deleteConfirm', { language: AVAILABLE_LANGUAGES.find(l => l.code === langCode)?.name }))) {
      return;
    }

    try {
      await consentTemplatesApi.deleteTemplateTranslation(editingTemplate.id, langCode);
      const updatedTranslations = await consentTemplatesApi.getTemplateTranslations(editingTemplate.id);
      setTranslations(updatedTranslations || []);
      if (selectedTranslationLang === langCode) {
        setSelectedTranslationLang(null);
        setEditingTranslation({ languageCode: '', title: '', description: '', terms: '' });
      }
    } catch (error) {
      console.error('[ConsentTemplateEditorModal] Error deleting translation:', error);
      alert(t('templateEditor.translations.deleteError'));
    }
  };

  const cancelTranslationEdit = () => {
    setSelectedTranslationLang(null);
    setEditingTranslation({ languageCode: '', title: '', description: '', terms: '' });
  };

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

      // Préparer les données avec les variables détectées
      const templateData = {
        ...formData,
        variables: detectedVariables,
        updatedVariables: detectedVariables
      };

      // Transform template data for backend API - utilise consentType directement
      const apiData = {
        code: formData.code || formData.title.toLowerCase().replace(/\s+/g, '_').substring(0, 50),
        title: formData.title,
        description: formData.description,
        terms: formData.content,
        version: formData.version || '1.0',
        consentType: formData.consentType,
        status: formData.status,
        isMandatory: formData.isMandatory || false,
        autoSend: formData.autoSend || false,
        validFrom: formData.validFrom || new Date().toISOString()
      };

      let result;
      if (editingTemplate && mode === 'edit') {
        result = await consentTemplatesApi.updateConsentTemplate(editingTemplate.id, apiData);
      } else if (mode === 'duplicate') {
        // For duplicate, create a new template with modified title
        apiData.title = `${formData.title} (copie)`;
        apiData.code = `${apiData.code}_copy_${Date.now()}`;
        result = await consentTemplatesApi.createConsentTemplate(apiData);
      } else {
        result = await consentTemplatesApi.createConsentTemplate(apiData);
      }

      onSave(result);
      handleClose();
    } catch (error) {
      console.error('[ConsentTemplateEditorModal] Error saving template:', error);
      setValidationErrors({ general: error.message || t('templateEditor.errors.saveFailed') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.title?.trim()) errors.title = t('templateEditor.validation.titleRequired');
    // Description is optional
    if (!formData.content?.trim()) errors.content = t('templateEditor.validation.contentRequired');
    if (!formData.consentType) errors.consentType = t('templateEditor.validation.consentTypeRequired');
    if (!formData.speciality) errors.speciality = t('templateEditor.validation.specialtyRequired');

    return errors;
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      consentType: 'medical_treatment',
      speciality: 'general',
      content: '',
      status: 'draft',
      variables: [],
      requiredFields: [],
      tags: []
    });
    setValidationErrors({});
    setIsSubmitting(false);
    setShowPreview(false);
    setImportedFileName('');
    setDetectedVariables([]);
    setIsInitialized(false); // Reset so next open re-initializes
    // Reset translation states
    setActiveEditorTab('content');
    setTranslations([]);
    setSelectedTranslationLang(null);
    setEditingTranslation({ languageCode: '', title: '', description: '', terms: '' });
    onClose();
  };

  // Import de fichier
  const handleFileImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        setFormData(prev => ({
          ...prev,
          content: content,
          title: prev.title || file.name.replace(/\.[^/.]+$/, '')
        }));
        setImportedFileName(file.name);
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('Erreur import fichier:', error);
      alert(t('templateEditor.importExport.importError'));
    }
  };

  // Export du modèle
  const handleExport = (format = 'txt') => {
    try {
      if (!formData.content.trim()) {
        alert(t('templateEditor.importExport.noContent'));
        return;
      }

      let content = '';
      let filename = '';
      let mimeType = '';

      switch (format) {
        case 'txt':
          content = formData.content;
          filename = `${formData.title || 'modele_consentement'}.txt`;
          mimeType = 'text/plain';
          break;
        case 'html':
          content = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${formData.title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .template-header { border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 30px; }
        .template-meta { background: #f8f9fa; padding: 20px; margin-bottom: 30px; border-radius: 5px; }
        .template-content { white-space: pre-wrap; }
        .variable { background: #fff3cd; padding: 2px 4px; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="template-header">
        <h1>${formData.title}</h1>
        <p>${formData.description}</p>
    </div>
    <div class="template-meta">
        <p><strong>Type:</strong> ${getConsentTypeName(consentTypes.find(t => t.code === formData.consentType)) || formData.consentType}</p>
        <p><strong>Spécialité:</strong> ${getSpecialtyName(specialties.find(s => s.code === formData.speciality)) || formData.speciality}</p>
        <p><strong>Variables détectées:</strong> ${detectedVariables.join(', ')}</p>
    </div>
    <div class="template-content">
        ${formData.content.replace(/\[([^\]]+)\]/g, '<span class="variable">[$1]</span>')}
    </div>
</body>
</html>`;
          filename = `${formData.title || 'modele_consentement'}.html`;
          mimeType = 'text/html';
          break;
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur export:', error);
      alert(t('templateEditor.importExport.exportError'));
    }
  };

  // Insertion de variables prédéfinies - préserve la position de scroll
  const insertVariable = useCallback((variable) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Sauvegarder la position de scroll actuelle
    const scrollTop = textarea.scrollTop;
    const scrollLeft = textarea.scrollLeft;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.content;
    const before = text.substring(0, start);
    const after = text.substring(end);
    const newContent = before + `[${variable}]` + after;
    const newCursorPos = start + variable.length + 2;

    setFormData(prev => ({ ...prev, content: newContent }));

    // Restaurer le curseur et le scroll après mise à jour
    requestAnimationFrame(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        // Restaurer la position de scroll
        textarea.scrollTop = scrollTop;
        textarea.scrollLeft = scrollLeft;
      }
    });
  }, [formData.content]);

  // Appliquer un formatage au texte sélectionné (gras, italique, souligné)
  const applyFormatting = useCallback((prefix, suffix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const scrollTop = textarea.scrollTop;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.content;
    const selectedText = text.substring(start, end);

    let newContent;
    let newCursorStart;
    let newCursorEnd;

    if (selectedText) {
      // Du texte est sélectionné - l'envelopper avec le formatage
      const before = text.substring(0, start);
      const after = text.substring(end);
      newContent = before + prefix + selectedText + suffix + after;
      newCursorStart = start + prefix.length;
      newCursorEnd = newCursorStart + selectedText.length;
    } else {
      // Pas de sélection - insérer le marqueur avec placeholder
      const before = text.substring(0, start);
      const after = text.substring(start);
      const placeholder = 'texte';
      newContent = before + prefix + placeholder + suffix + after;
      newCursorStart = start + prefix.length;
      newCursorEnd = newCursorStart + placeholder.length;
    }

    setFormData(prev => ({ ...prev, content: newContent }));

    requestAnimationFrame(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(newCursorStart, newCursorEnd);
        textarea.scrollTop = scrollTop;
      }
    });
  }, [formData.content]);

  // Insérer un élément à la position du curseur (liste, checkbox, etc.)
  const insertAtCursor = useCallback((textToInsert) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const scrollTop = textarea.scrollTop;
    const start = textarea.selectionStart;
    const text = formData.content;
    const before = text.substring(0, start);
    const after = text.substring(start);
    const newContent = before + textToInsert + after;
    const newCursorPos = start + textToInsert.length;

    setFormData(prev => ({ ...prev, content: newContent }));

    requestAnimationFrame(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.scrollTop = scrollTop;
      }
    });
  }, [formData.content]);

  // Variables prédéfinies organisées par catégorie
  const variableCategories = {
    patient: {
      label: t('templateEditor.variables.patient'),
      icon: User,
      variables: [
        { name: 'NOM_PATIENT', label: t('templateEditor.variables.lastName') },
        { name: 'PRÉNOM_PATIENT', label: t('templateEditor.variables.firstName') },
        { name: 'NOM_COMPLET_PATIENT', label: t('templateEditor.variables.fullName') },
        { name: 'EMAIL_PATIENT', label: t('templateEditor.variables.email') },
        { name: 'TÉLÉPHONE_PATIENT', label: t('templateEditor.variables.phone') },
        { name: 'DATE_NAISSANCE', label: t('templateEditor.variables.birthDate') },
        { name: 'ADRESSE_PATIENT', label: t('templateEditor.variables.address') },
        { name: 'NUMÉRO_DOCUMENT', label: t('templateEditor.variables.documentNumber') },
        { name: 'NUMÉRO_SÉCU', label: t('templateEditor.variables.socialSecurity') }
      ]
    },
    clinique: {
      label: t('templateEditor.variables.clinic'),
      icon: MapPin,
      variables: [
        { name: 'NOM_CLINIQUE', label: t('templateEditor.variables.clinicName') },
        { name: 'ADRESSE_CLINIQUE', label: t('templateEditor.variables.clinicAddress') },
        { name: 'TÉLÉPHONE_CLINIQUE', label: t('templateEditor.variables.clinicPhone') },
        { name: 'EMAIL_CLINIQUE', label: t('templateEditor.variables.clinicEmail') },
        { name: 'LOGO_CLINIQUE', label: t('templateEditor.variables.clinicLogo') },
        { name: 'NIF_CLINIQUE', label: t('templateEditor.variables.clinicTaxId') }
      ]
    },
    praticien: {
      label: t('templateEditor.variables.practitioner'),
      icon: Stethoscope,
      variables: [
        { name: 'NOM_PRATICIEN', label: t('templateEditor.variables.practitionerName') },
        { name: 'TITRE_PRATICIEN', label: t('templateEditor.variables.practitionerTitle') },
        { name: 'SPÉCIALITÉ_PRATICIEN', label: t('templateEditor.variables.practitionerSpecialty') },
        { name: 'NUMÉRO_ORDRE', label: t('templateEditor.variables.orderNumber') },
        { name: 'SIGNATURE_PRATICIEN', label: t('templateEditor.variables.practitionerSignature') }
      ]
    },
    intervention: {
      label: t('templateEditor.variables.intervention'),
      icon: FileText,
      variables: [
        { name: 'DESCRIPTION_INTERVENTION', label: t('templateEditor.variables.interventionDescription') },
        { name: 'RISQUES_SPÉCIFIQUES', label: t('templateEditor.variables.specificRisks') },
        { name: 'BÉNÉFICES_ATTENDUS', label: t('templateEditor.variables.expectedBenefits') },
        { name: 'ALTERNATIVES_DISPONIBLES', label: t('templateEditor.variables.availableAlternatives') },
        { name: 'TRAITEMENT', label: t('templateEditor.variables.treatment') },
        { name: 'PRODUIT_SERVICE', label: t('templateEditor.variables.productService') }
      ]
    },
    dates: {
      label: t('templateEditor.variables.dates'),
      icon: Calendar,
      variables: [
        { name: 'DATE', label: t('templateEditor.variables.currentDate') },
        { name: 'DATE_HEURE', label: t('templateEditor.variables.dateTime') },
        { name: 'DURÉE', label: t('templateEditor.variables.duration') },
        { name: 'SIGNATURE_PATIENT', label: t('templateEditor.variables.patientSignature') }
      ]
    },
    checkbox: {
      label: t('templateEditor.variables.checkboxes'),
      icon: CheckSquare,
      variables: [
        { name: 'CASE_À_COCHER', label: t('templateEditor.variables.checkbox') },
        { name: 'CASE_OUI_NON', label: t('templateEditor.variables.yesNo') },
        { name: 'INITIALES', label: t('templateEditor.variables.initials') }
      ]
    }
  };

  // Liste simple pour rétrocompatibilité
  const commonVariables = Object.values(variableCategories)
    .flatMap(cat => cat.variables.map(v => v.name));

  const getModalTitle = () => {
    switch (mode) {
      case 'create': return t('templateEditor.createTitle');
      case 'edit': return t('templateEditor.editTitle');
      case 'duplicate': return t('templateEditor.duplicateTitle');
      default: return t('templateEditor.defaultTitle');
    }
  };

  // Fonction pour convertir le contenu en HTML pour l'aperçu
  const renderPreviewContent = (content) => {
    if (!content) return '';

    let html = content
      // Échapper les caractères HTML dangereux
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Titres (doivent être traités avant les autres)
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-gray-800 mt-6 mb-3 border-b pb-2">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-gray-900 mt-6 mb-4 border-b-2 pb-2">$1</h1>')
      // Gras **texte**
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold">$1</strong>')
      // Italique _texte_
      .replace(/(?<![_\w])_([^_]+)_(?![_\w])/g, '<em class="italic">$1</em>')
      // Souligné __texte__
      .replace(/__(.+?)__/g, '<span class="underline">$1</span>')
      // Lignes de séparation
      .replace(/^[═]{10,}$/gm, '<hr class="my-4 border-t-2 border-gray-300">')
      .replace(/^[-]{10,}$/gm, '<hr class="my-4 border-t border-gray-200">')
      // Variables [VARIABLE]
      .replace(/\[([^\]]+)\]/g, '<span class="bg-yellow-200 text-yellow-800 px-1 py-0.5 rounded text-sm font-mono">[$1]</span>')
      // Cases à cocher
      .replace(/☐/g, '<span class="inline-block w-4 h-4 border-2 border-gray-400 rounded mr-1 align-middle"></span>')
      // Listes à puces
      .replace(/^• (.+)$/gm, '<span class="block ml-4">• $1</span>')
      // Listes numérotées
      .replace(/^(\d+)\. (.+)$/gm, '<span class="block ml-4">$1. $2</span>')
      // Sauts de ligne
      .replace(/\n/g, '<br>');

    // Nettoyer les <br> après les titres et hr
    html = html
      .replace(/<\/h1><br>/g, '</h1>')
      .replace(/<\/h2><br>/g, '</h2>')
      .replace(/<hr([^>]*)><br>/g, '<hr$1>');

    return html;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6" />
            <h2 className="text-xl font-semibold">{getModalTitle()}</h2>
          </div>
          <div className="flex items-center space-x-2">
            {/* Tabs for Content/Translations - only show when editing */}
            {mode === 'edit' && editingTemplate?.id && (
              <div className="flex bg-blue-700 rounded-lg p-1 mr-4">
                <button
                  onClick={() => setActiveEditorTab('content')}
                  className={`px-3 py-1 rounded text-sm flex items-center ${
                    activeEditorTab === 'content' ? 'bg-white text-blue-600' : 'text-blue-100 hover:text-white'
                  }`}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  {t('templateEditor.contentTab')}
                </button>
                <button
                  onClick={() => setActiveEditorTab('translations')}
                  className={`px-3 py-1 rounded text-sm flex items-center ${
                    activeEditorTab === 'translations' ? 'bg-white text-blue-600' : 'text-blue-100 hover:text-white'
                  }`}
                >
                  <Globe className="h-4 w-4 mr-1" />
                  {t('templateEditor.translationsTab')}
                  {translations.length > 0 && (
                    <span className="ml-1 bg-green-500 text-white text-xs px-1.5 rounded-full">
                      {translations.length}
                    </span>
                  )}
                </button>
              </div>
            )}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-3 py-1 bg-blue-500 rounded hover:bg-blue-400 flex items-center"
            >
              <Eye className="h-4 w-4 mr-1" />
              {showPreview ? t('templateEditor.editMode') : t('templateEditor.preview')}
            </button>
            <button
              onClick={handleClose}
              className="text-white hover:text-gray-200"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="flex h-[85vh]">
          {/* Translations Panel - shown when translations tab is active */}
          {activeEditorTab === 'translations' && mode === 'edit' && editingTemplate?.id ? (
            <div className="flex-1 flex">
              {/* Languages list */}
              <div className="w-64 bg-gray-50 border-r p-4 overflow-y-auto">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                  <Languages className="h-5 w-5 mr-2" />
                  {t('templateEditor.translations.availableLanguages')}
                </h3>

                {translationsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader className="h-6 w-6 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {AVAILABLE_LANGUAGES.map((lang) => {
                      const hasTranslation = translations.some(t => t.language_code === lang.code);
                      const isSelected = selectedTranslationLang === lang.code;

                      return (
                        <div
                          key={lang.code}
                          className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-100 border-2 border-blue-500' : 'bg-white border border-gray-200 hover:bg-gray-50'
                          }`}
                          onClick={() => handleSelectTranslation(lang.code)}
                        >
                          <div className="flex items-center">
                            <span className="text-xl mr-2">{lang.flag}</span>
                            <div>
                              <div className="font-medium text-gray-900">{lang.name}</div>
                              <div className="text-xs text-gray-500">{lang.code.toUpperCase()}</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {hasTranslation ? (
                              <>
                                <span className="text-green-600" title="Traduction existante">
                                  <Check className="h-4 w-4" />
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTranslation(lang.code);
                                  }}
                                  className="text-red-500 hover:text-red-700 p-1"
                                  title="Supprimer la traduction"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                {t('templateEditor.translations.notTranslated')}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-6 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                  <p className="font-medium mb-1">{t('templateEditor.translations.info')}</p>
                  <p>{t('templateEditor.translations.selectLanguageHint')}</p>
                </div>
              </div>

              {/* Translation editor */}
              <div className="flex-1 flex flex-col">
                {selectedTranslationLang ? (
                  <>
                    <div className="bg-gray-50 border-b p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">
                            {AVAILABLE_LANGUAGES.find(l => l.code === selectedTranslationLang)?.flag}
                          </span>
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {t('templateEditor.translations.translationIn', { language: AVAILABLE_LANGUAGES.find(l => l.code === selectedTranslationLang)?.name })}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {translations.some(tr => tr.language_code === selectedTranslationLang)
                                ? t('templateEditor.translations.editExisting')
                                : t('templateEditor.translations.createNew')}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={cancelTranslationEdit}
                            className="px-3 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                          >
                            {t('templateEditor.buttons.cancel')}
                          </button>
                          <button
                            onClick={handleSaveTranslation}
                            disabled={translationSaving}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
                          >
                            {translationSaving ? (
                              <>
                                <Loader className="h-4 w-4 animate-spin mr-2" />
                                {t('templateEditor.buttons.saving')}
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-2" />
                                {t('templateEditor.buttons.save')}
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                      <div className="max-w-4xl mx-auto space-y-6">
                        {/* Title */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('templateEditor.translations.translatedTitle')}
                          </label>
                          <input
                            type="text"
                            value={editingTranslation.title}
                            onChange={(e) => setEditingTranslation(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder={t('templateEditor.translations.titlePlaceholder')}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {t('templateEditor.translations.original')} {formData.title}
                          </p>
                        </div>

                        {/* Description */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('templateEditor.translations.translatedDescription')}
                          </label>
                          <textarea
                            value={editingTranslation.description}
                            onChange={(e) => setEditingTranslation(prev => ({ ...prev, description: e.target.value }))}
                            rows={3}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder={t('templateEditor.translations.descriptionPlaceholder')}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {t('templateEditor.translations.original')} {formData.description}
                          </p>
                        </div>

                        {/* Terms/Content */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('templateEditor.translations.translatedContent')}
                          </label>
                          <div className="border border-gray-300 rounded-lg overflow-hidden">
                            <textarea
                              value={editingTranslation.terms}
                              onChange={(e) => setEditingTranslation(prev => ({ ...prev, terms: e.target.value }))}
                              rows={15}
                              className="w-full p-4 resize-none focus:ring-0 focus:outline-none font-mono text-sm"
                              placeholder={t('templateEditor.translations.contentPlaceholder')}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {t('templateEditor.translations.keepVariables')}
                          </p>
                        </div>

                        {/* Original content reference */}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                            <FileText className="h-4 w-4 mr-2" />
                            {t('templateEditor.translations.originalContent')}
                          </h4>
                          <div className="bg-white border rounded p-3 max-h-48 overflow-y-auto text-sm text-gray-600 whitespace-pre-wrap">
                            {formData.content || t('templateEditor.translations.noOriginalContent')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                      <Globe className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">{t('templateEditor.translations.management')}</h3>
                      <p className="text-gray-500 max-w-md">
                        {t('templateEditor.translations.selectLanguage')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
          /* Original content editor - wrapped in else condition */
          <>
          {/* Panneau de configuration */}
          <div className="w-80 bg-gray-50 border-r overflow-y-auto p-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Informations générales */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="font-medium text-gray-900 mb-3">{t('templateEditor.form.generalInfo')}</h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('templateEditor.form.title')}
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        validationErrors.title ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder={t('templateEditor.form.titlePlaceholder')}
                    />
                    {validationErrors.title && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.title}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('templateEditor.form.description')}
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={t('templateEditor.form.descriptionPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('templateEditor.form.consentType')}
                    </label>
                    <select
                      value={formData.consentType}
                      onChange={(e) => setFormData(prev => ({ ...prev, consentType: e.target.value }))}
                      className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        validationErrors.consentType ? 'border-red-500' : 'border-gray-300'
                      }`}
                      disabled={consentTypesLoading}
                    >
                      {consentTypesLoading ? (
                        <option>{t('templateEditor.form.loading')}</option>
                      ) : (
                        consentTypes.map(type => (
                          <option key={type.code} value={type.code}>
                            {getConsentTypeName(type)}
                          </option>
                        ))
                      )}
                    </select>
                    {validationErrors.consentType && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.consentType}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('templateEditor.form.specialty')}
                    </label>
                    <select
                      value={formData.speciality}
                      onChange={(e) => setFormData(prev => ({ ...prev, speciality: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={specialtiesLoading}
                    >
                      {specialtiesLoading ? (
                        <option>{t('templateEditor.form.loading')}</option>
                      ) : (
                        specialties.map(specialty => (
                          <option key={specialty.code} value={specialty.code}>
                            {getSpecialtyName(specialty)}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('templateEditor.form.status')}
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="draft">{t('templateEditor.form.statusDraft')}</option>
                      <option value="active">{t('templateEditor.form.statusActive')}</option>
                      <option value="inactive">{t('templateEditor.form.statusInactive')}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Import/Export */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="font-medium text-gray-900 mb-3">{t('templateEditor.importExport.title')}</h3>

                <div className="space-y-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileImport}
                    accept=".txt,.doc,.docx,.rtf"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {t('templateEditor.importExport.importFile')}
                  </button>

                  {importedFileName && (
                    <p className="text-sm text-green-600">
                      ✓ {t('templateEditor.importExport.imported')} {importedFileName}
                    </p>
                  )}

                  <div className="flex space-x-1">
                    <button
                      type="button"
                      onClick={() => handleExport('txt')}
                      className="flex-1 px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                    >
                      <Download className="h-3 w-3 inline mr-1" />
                      TXT
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport('html')}
                      className="flex-1 px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                    >
                      <Download className="h-3 w-3 inline mr-1" />
                      HTML
                    </button>
                  </div>
                </div>
              </div>

              {/* Variables détectées */}
              {detectedVariables.length > 0 && (
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h3 className="font-medium text-gray-900 mb-3">{t('templateEditor.variables.detected')}</h3>
                  <div className="space-y-1">
                    {detectedVariables.map((variable, index) => (
                      <div key={index} className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        [{variable}]
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Variables prédéfinies organisées par catégorie */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="font-medium text-gray-900 mb-3">{t('templateEditor.variables.predefined')}</h3>
                <div className="space-y-3">
                  {Object.entries(variableCategories).map(([key, category]) => {
                    const IconComponent = category.icon;
                    return (
                      <div key={key} className="border-b border-gray-100 pb-2 last:border-b-0">
                        <div className="flex items-center text-xs font-medium text-gray-600 mb-1">
                          <IconComponent className="h-3 w-3 mr-1" />
                          {category.label}
                        </div>
                        <div className="grid grid-cols-1 gap-1">
                          {category.variables.map((variable) => (
                            <button
                              key={variable.name}
                              type="button"
                              onClick={() => insertVariable(variable.name)}
                              className="text-left text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                              title={`${t('templateEditor.variables.insert')} [${variable.name}]`}
                            >
                              <span className="font-mono">[{variable.name}]</span>
                              <span className="text-gray-500 ml-1">- {variable.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Erreur générale */}
              {validationErrors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm">{validationErrors.general}</p>
                </div>
              )}

              {/* Boutons */}
              <div className="flex space-x-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-3 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                >
                  {t('templateEditor.buttons.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {t('templateEditor.buttons.saving')}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {t('templateEditor.buttons.save')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Éditeur principal */}
          <div className="flex-1 flex flex-col">
            {showPreview ? (
              // Mode aperçu
              <div className="flex-1 p-6 overflow-y-auto bg-white">
                <div className="max-w-4xl mx-auto">
                  <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{formData.title}</h2>
                    <p className="text-gray-600 mb-2">{formData.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>{t('templateEditor.previewLabels.type')} {getConsentTypeName(consentTypes.find(ct => ct.code === formData.consentType)) || formData.consentType}</span>
                      <span>{t('templateEditor.previewLabels.specialty')} {getSpecialtyName(specialties.find(s => s.code === formData.speciality)) || formData.speciality}</span>
                    </div>
                  </div>
                  <div className="bg-white border rounded-lg p-6 prose max-w-none">
                    <div
                      className="leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHTML(renderPreviewContent(formData.content))
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              // Mode édition
              <div className="flex-1 flex flex-col">
                <div className="p-4 border-b bg-gray-50">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('templateEditor.editor.contentLabel')}
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    {t('templateEditor.editor.variablesHint')}
                  </p>

                  {/* Barre d'outils de formatage */}
                  <div className="flex flex-wrap items-center gap-1 p-2 bg-white border rounded-lg">
                    <span className="text-xs text-gray-500 mr-2">{t('templateEditor.editor.formatting')}</span>
                    <button
                      type="button"
                      onClick={() => applyFormatting('\n# ', '\n')}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-600 text-xs font-bold"
                      title="Titre 1 - Sélectionnez du texte puis cliquez"
                    >
                      H1
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatting('\n## ', '\n')}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-600 text-xs font-bold"
                      title="Titre 2 - Sélectionnez du texte puis cliquez"
                    >
                      H2
                    </button>
                    <div className="w-px h-5 bg-gray-300 mx-1" />
                    <button
                      type="button"
                      onClick={() => applyFormatting('**', '**')}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
                      title="Gras - Sélectionnez du texte puis cliquez"
                    >
                      <Bold className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatting('_', '_')}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
                      title="Italique - Sélectionnez du texte puis cliquez"
                    >
                      <Italic className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatting('__', '__')}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
                      title="Souligné - Sélectionnez du texte puis cliquez"
                    >
                      <Underline className="h-4 w-4" />
                    </button>
                    <div className="w-px h-5 bg-gray-300 mx-1" />
                    <button
                      type="button"
                      onClick={() => insertAtCursor('\n• ')}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
                      title="Liste à puces"
                    >
                      <List className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertAtCursor('\n1. ')}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
                      title="Liste numérotée"
                    >
                      <ListOrdered className="h-4 w-4" />
                    </button>
                    <div className="w-px h-5 bg-gray-300 mx-1" />
                    <button
                      type="button"
                      onClick={() => insertAtCursor('\n☐ ')}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
                      title="Case à cocher"
                    >
                      <CheckSquare className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertAtCursor('\n☐ Oui    ☐ Non')}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-600 text-xs"
                      title="Oui/Non"
                    >
                      ☐/☐
                    </button>
                    <div className="w-px h-5 bg-gray-300 mx-1" />
                    <button
                      type="button"
                      onClick={() => insertAtCursor('\n' + '═'.repeat(40) + '\n')}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-600 text-xs"
                      title="Ligne de séparation"
                    >
                      ―――
                    </button>
                    <div className="w-px h-5 bg-gray-300 mx-1" />
                    <button
                      type="button"
                      onClick={() => insertAtCursor('\n\n[LOGO_CLINIQUE]\n[NOM_CLINIQUE]\n[ADRESSE_CLINIQUE]\nTél: [TÉLÉPHONE_CLINIQUE] | Email: [EMAIL_CLINIQUE]\n' + '═'.repeat(50) + '\n\n')}
                      className="p-1.5 rounded hover:bg-gray-100 text-blue-600 text-xs font-medium"
                      title="Insérer en-tête clinique"
                    >
                      {t('templateEditor.editor.header')}
                    </button>
                  </div>
                </div>
                <div className="flex-1">
                  <textarea
                    ref={textareaRef}
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    className={`w-full h-full p-4 border-0 resize-none focus:ring-0 focus:outline-none font-mono text-sm ${
                      validationErrors.content ? 'bg-red-50' : 'bg-white'
                    }`}
                    placeholder={t('templateEditor.editor.placeholder')}
                  />
                  {validationErrors.content && (
                    <div className="bg-red-50 border-t border-red-200 p-2">
                      <p className="text-red-700 text-sm">{validationErrors.content}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConsentTemplateEditorModal;