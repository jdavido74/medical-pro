// components/modals/ConsentTemplateEditorModal.js
import React, { useState, useEffect, useRef } from 'react';
import {
  X, Save, FileText, Upload, Download, Eye, Copy, AlertCircle,
  Plus, Minus, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Quote, Code, Link, Image, Undo, Redo, Type
} from 'lucide-react';
import {
  consentTemplatesStorage,
  TEMPLATE_CATEGORIES,
  MEDICAL_SPECIALITIES
} from '../../utils/consentTemplatesStorage';
import { useAuth } from '../../contexts/AuthContext';

const ConsentTemplateEditorModal = ({
  isOpen,
  onClose,
  onSave,
  editingTemplate = null,
  mode = 'create' // 'create', 'edit', 'duplicate'
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'custom',
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

  // Variables dynamiques détectées automatiquement
  const [detectedVariables, setDetectedVariables] = useState([]);

  // Charger les données initiales
  useEffect(() => {
    if (isOpen && editingTemplate) {
      setFormData({
        ...editingTemplate,
        variables: editingTemplate.variables || [],
        requiredFields: editingTemplate.requiredFields || [],
        tags: editingTemplate.tags || []
      });
    } else if (isOpen && mode === 'create') {
      setFormData({
        title: '',
        description: '',
        category: 'custom',
        speciality: 'general',
        content: '',
        status: 'draft',
        variables: [],
        requiredFields: [],
        tags: []
      });
    }
  }, [isOpen, editingTemplate, mode]);

  // Détecter automatiquement les variables dans le contenu
  useEffect(() => {
    const variableRegex = /\[([^\]]+)\]/g;
    const matches = [...formData.content.matchAll(variableRegex)];
    const variables = [...new Set(matches.map(match => match[1]))];
    setDetectedVariables(variables);
  }, [formData.content]);

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

      let result;
      if (editingTemplate && mode === 'edit') {
        result = consentTemplatesStorage.update(editingTemplate.id, templateData, user?.id);
      } else if (mode === 'duplicate') {
        result = consentTemplatesStorage.duplicate(
          editingTemplate.id,
          formData.title,
          user?.id
        );
        // Mettre à jour avec les nouvelles données
        result = consentTemplatesStorage.update(result.id, templateData, user?.id);
      } else {
        result = consentTemplatesStorage.create(templateData, user?.id);
      }

      onSave(result);
      handleClose();
    } catch (error) {
      console.error('Erreur sauvegarde modèle:', error);
      setValidationErrors({ general: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.title?.trim()) errors.title = 'Titre requis';
    if (!formData.description?.trim()) errors.description = 'Description requise';
    if (!formData.content?.trim()) errors.content = 'Contenu requis';
    if (!formData.category) errors.category = 'Catégorie requise';
    if (!formData.speciality) errors.speciality = 'Spécialité requise';

    return errors;
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      category: 'custom',
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
      alert('Erreur lors de l\'import du fichier');
    }
  };

  // Export du modèle
  const handleExport = (format = 'txt') => {
    try {
      if (!formData.content.trim()) {
        alert('Aucun contenu à exporter');
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
        <p><strong>Catégorie:</strong> ${TEMPLATE_CATEGORIES[formData.category.toUpperCase()]?.name || formData.category}</p>
        <p><strong>Spécialité:</strong> ${MEDICAL_SPECIALITIES[formData.speciality.toUpperCase()]?.name || formData.speciality}</p>
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
      alert('Erreur lors de l\'export');
    }
  };

  // Insertion de variables prédéfinies
  const insertVariable = (variable) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.content;
    const before = text.substring(0, start);
    const after = text.substring(end);
    const newContent = before + `[${variable}]` + after;

    setFormData(prev => ({ ...prev, content: newContent }));

    // Repositionner le curseur
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length + 2, start + variable.length + 2);
    }, 0);
  };

  // Variables prédéfinies communes
  const commonVariables = [
    'NOM_PATIENT', 'PRÉNOM_PATIENT', 'DATE_NAISSANCE', 'DATE',
    'NOM_PRATICIEN', 'SPÉCIALITÉ_PRATICIEN', 'ÉTABLISSEMENT',
    'DESCRIPTION_INTERVENTION', 'RISQUES_SPÉCIFIQUES', 'BÉNÉFICES_ATTENDUS',
    'ALTERNATIVES_DISPONIBLES', 'SIGNATURE_PATIENT', 'SIGNATURE_PRATICIEN',
    'DATE_HEURE', 'DURÉE', 'LIEU'
  ];

  const getModalTitle = () => {
    switch (mode) {
      case 'create': return 'Créer un modèle de consentement';
      case 'edit': return 'Modifier le modèle de consentement';
      case 'duplicate': return 'Dupliquer le modèle de consentement';
      default: return 'Éditeur de modèle';
    }
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
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-3 py-1 bg-blue-500 rounded hover:bg-blue-400 flex items-center"
            >
              <Eye className="h-4 w-4 mr-1" />
              {showPreview ? 'Éditer' : 'Aperçu'}
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
          {/* Panneau de configuration */}
          <div className="w-80 bg-gray-50 border-r overflow-y-auto p-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Informations générales */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="font-medium text-gray-900 mb-3">Informations générales</h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Titre *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        validationErrors.title ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Nom du modèle"
                    />
                    {validationErrors.title && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.title}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        validationErrors.description ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Description du modèle"
                    />
                    {validationErrors.description && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.description}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Catégorie *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {Object.values(TEMPLATE_CATEGORIES).map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Spécialité *
                    </label>
                    <select
                      value={formData.speciality}
                      onChange={(e) => setFormData(prev => ({ ...prev, speciality: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {Object.values(MEDICAL_SPECIALITIES).map(speciality => (
                        <option key={speciality.id} value={speciality.id}>
                          {speciality.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Statut
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="draft">Brouillon</option>
                      <option value="active">Actif</option>
                      <option value="inactive">Inactif</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Import/Export */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="font-medium text-gray-900 mb-3">Import/Export</h3>

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
                    Importer fichier
                  </button>

                  {importedFileName && (
                    <p className="text-sm text-green-600">
                      ✓ Importé: {importedFileName}
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
                  <h3 className="font-medium text-gray-900 mb-3">Variables détectées</h3>
                  <div className="space-y-1">
                    {detectedVariables.map((variable, index) => (
                      <div key={index} className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        [{variable}]
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Variables prédéfinies */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="font-medium text-gray-900 mb-3">Variables prédéfinies</h3>
                <div className="grid grid-cols-1 gap-1">
                  {commonVariables.map((variable) => (
                    <button
                      key={variable}
                      type="button"
                      onClick={() => insertVariable(variable)}
                      className="text-left text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200"
                    >
                      [{variable}]
                    </button>
                  ))}
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
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Enregistrer
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
                      <span>Catégorie: {TEMPLATE_CATEGORIES[formData.category.toUpperCase()]?.name}</span>
                      <span>Spécialité: {MEDICAL_SPECIALITIES[formData.speciality.toUpperCase()]?.name}</span>
                    </div>
                  </div>
                  <div className="bg-white border rounded-lg p-6 prose max-w-none">
                    <div
                      className="whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{
                        __html: formData.content.replace(
                          /\[([^\]]+)\]/g,
                          '<span class="bg-yellow-200 px-1 rounded">[$1]</span>'
                        )
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
                    Contenu du modèle *
                  </label>
                  <p className="text-xs text-gray-500">
                    Utilisez [VARIABLE] pour insérer des variables dynamiques
                  </p>
                </div>
                <div className="flex-1">
                  <textarea
                    ref={textareaRef}
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    className={`w-full h-full p-4 border-0 resize-none focus:ring-0 focus:outline-none font-mono text-sm ${
                      validationErrors.content ? 'bg-red-50' : 'bg-white'
                    }`}
                    placeholder="Saisissez le contenu de votre modèle de consentement ici...

Exemple:
CONSENTEMENT ÉCLAIRÉ

Je soussigné(e), [NOM_PATIENT] [PRÉNOM_PATIENT], né(e) le [DATE_NAISSANCE], déclare avoir été informé(e) par le Dr [NOM_PRATICIEN] de la nature de l'intervention proposée.

[DESCRIPTION_INTERVENTION]

Date: [DATE]
Signature du patient: [SIGNATURE_PATIENT]"
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
        </div>
      </div>
    </div>
  );
};

export default ConsentTemplateEditorModal;