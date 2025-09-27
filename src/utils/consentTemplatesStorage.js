// utils/consentTemplatesStorage.js
import { generateId } from './idGenerator';

const CONSENT_TEMPLATES_STORAGE_KEY = 'medicalPro_consentTemplates';

// Service de gestion des modèles de consentements personnalisés
export const consentTemplatesStorage = {
  // Récupérer tous les modèles
  getAll: () => {
    try {
      const templates = localStorage.getItem(CONSENT_TEMPLATES_STORAGE_KEY);
      return templates ? JSON.parse(templates) : [];
    } catch (error) {
      console.error('Erreur lecture modèles consentements:', error);
      return [];
    }
  },

  // Récupérer un modèle par ID
  getById: (id) => {
    const templates = consentTemplatesStorage.getAll();
    return templates.find(template => template.id === id && !template.deleted);
  },

  // Récupérer les modèles par catégorie
  getByCategory: (category) => {
    const templates = consentTemplatesStorage.getAll();
    return templates.filter(template =>
      template.category === category &&
      !template.deleted &&
      template.status === 'active'
    );
  },

  // Rechercher des modèles
  search: (query) => {
    const templates = consentTemplatesStorage.getAll().filter(t => !t.deleted);
    const searchTerm = query.toLowerCase();

    return templates.filter(template =>
      template.title?.toLowerCase().includes(searchTerm) ||
      template.description?.toLowerCase().includes(searchTerm) ||
      template.category?.toLowerCase().includes(searchTerm) ||
      template.speciality?.toLowerCase().includes(searchTerm) ||
      template.content?.toLowerCase().includes(searchTerm)
    );
  },

  // Créer un nouveau modèle - US 4.4
  create: (templateData, userId = 'system') => {
    try {
      const templates = consentTemplatesStorage.getAll();

      const newTemplate = {
        id: generateId(),
        ...templateData,
        status: templateData.status || 'draft',
        version: '1.0',
        createdAt: new Date().toISOString(),
        createdBy: userId,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
        // Métadonnées d'audit
        auditTrail: [{
          action: 'created',
          userId: userId,
          timestamp: new Date().toISOString(),
          version: '1.0',
          changes: 'Création initiale du modèle'
        }],
        // Statistiques d'utilisation
        usage: {
          timesUsed: 0,
          lastUsed: null,
          patientsCount: 0
        }
      };

      templates.push(newTemplate);
      localStorage.setItem(CONSENT_TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
      return newTemplate;
    } catch (error) {
      console.error('Erreur création modèle consentement:', error);
      throw error;
    }
  },

  // Mettre à jour un modèle
  update: (id, templateData, userId = 'system') => {
    try {
      const templates = consentTemplatesStorage.getAll();
      const index = templates.findIndex(template => template.id === id);

      if (index === -1) {
        throw new Error('Modèle de consentement non trouvé');
      }

      const currentTemplate = templates[index];

      // Incrémenter la version si le contenu change
      const contentChanged = templateData.content && templateData.content !== currentTemplate.content;
      const newVersion = contentChanged ?
        parseFloat(currentTemplate.version) + 0.1 :
        currentTemplate.version;

      templates[index] = {
        ...currentTemplate,
        ...templateData,
        version: newVersion.toString(),
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
        auditTrail: [
          ...currentTemplate.auditTrail,
          {
            action: 'updated',
            userId: userId,
            timestamp: new Date().toISOString(),
            version: newVersion.toString(),
            changes: Object.keys(templateData).join(', '),
            contentChanged: contentChanged
          }
        ]
      };

      localStorage.setItem(CONSENT_TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
      return templates[index];
    } catch (error) {
      console.error('Erreur mise à jour modèle:', error);
      throw error;
    }
  },

  // Dupliquer un modèle
  duplicate: (id, newTitle, userId = 'system') => {
    try {
      const original = consentTemplatesStorage.getById(id);
      if (!original) {
        throw new Error('Modèle original non trouvé');
      }

      const duplicatedTemplate = {
        ...original,
        id: generateId(),
        title: newTitle || `${original.title} (Copie)`,
        status: 'draft',
        version: '1.0',
        createdAt: new Date().toISOString(),
        createdBy: userId,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
        auditTrail: [{
          action: 'duplicated',
          userId: userId,
          timestamp: new Date().toISOString(),
          version: '1.0',
          changes: `Dupliqué depuis le modèle ${original.title} (v${original.version})`,
          originalTemplateId: id
        }],
        usage: {
          timesUsed: 0,
          lastUsed: null,
          patientsCount: 0
        }
      };

      const templates = consentTemplatesStorage.getAll();
      templates.push(duplicatedTemplate);
      localStorage.setItem(CONSENT_TEMPLATES_STORAGE_KEY, JSON.stringify(templates));

      return duplicatedTemplate;
    } catch (error) {
      console.error('Erreur duplication modèle:', error);
      throw error;
    }
  },

  // Activer/Désactiver un modèle
  toggleStatus: (id, userId = 'system') => {
    try {
      const templates = consentTemplatesStorage.getAll();
      const index = templates.findIndex(template => template.id === id);

      if (index === -1) {
        throw new Error('Modèle non trouvé');
      }

      const currentTemplate = templates[index];
      const newStatus = currentTemplate.status === 'active' ? 'inactive' : 'active';

      templates[index] = {
        ...currentTemplate,
        status: newStatus,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
        auditTrail: [
          ...currentTemplate.auditTrail,
          {
            action: newStatus === 'active' ? 'activated' : 'deactivated',
            userId: userId,
            timestamp: new Date().toISOString(),
            version: currentTemplate.version,
            changes: `Statut changé vers ${newStatus}`
          }
        ]
      };

      localStorage.setItem(CONSENT_TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
      return templates[index];
    } catch (error) {
      console.error('Erreur changement statut modèle:', error);
      throw error;
    }
  },

  // Supprimer un modèle (soft delete)
  delete: (id, userId = 'system') => {
    try {
      const templates = consentTemplatesStorage.getAll();
      const index = templates.findIndex(template => template.id === id);

      if (index === -1) {
        throw new Error('Modèle non trouvé');
      }

      const currentTemplate = templates[index];

      templates[index] = {
        ...currentTemplate,
        deleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
        auditTrail: [
          ...currentTemplate.auditTrail,
          {
            action: 'deleted',
            userId: userId,
            timestamp: new Date().toISOString(),
            version: currentTemplate.version,
            changes: 'Modèle supprimé'
          }
        ]
      };

      localStorage.setItem(CONSENT_TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
      return true;
    } catch (error) {
      console.error('Erreur suppression modèle:', error);
      throw error;
    }
  },

  // Importer un modèle depuis un fichier
  importFromFile: (fileContent, fileName, userId = 'system') => {
    try {
      // Nettoyer le contenu du fichier
      const cleanContent = fileContent
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim();

      const templateData = {
        title: fileName.replace(/\.[^/.]+$/, ''), // Supprimer l'extension
        description: `Modèle importé depuis le fichier ${fileName}`,
        content: cleanContent,
        category: 'imported',
        speciality: 'general',
        sourceFile: fileName,
        importedAt: new Date().toISOString()
      };

      return consentTemplatesStorage.create(templateData, userId);
    } catch (error) {
      console.error('Erreur import modèle:', error);
      throw error;
    }
  },

  // Exporter un modèle
  export: (id, format = 'txt') => {
    try {
      const template = consentTemplatesStorage.getById(id);
      if (!template) {
        throw new Error('Modèle non trouvé');
      }

      let content = '';
      const timestamp = new Date().toLocaleDateString();

      switch (format) {
        case 'txt':
          content = `${template.title}\n${'='.repeat(template.title.length)}\n\n`;
          content += `Description: ${template.description}\n`;
          content += `Catégorie: ${template.category}\n`;
          content += `Spécialité: ${template.speciality}\n`;
          content += `Version: ${template.version}\n`;
          content += `Créé le: ${new Date(template.createdAt).toLocaleDateString()}\n\n`;
          content += `${'='.repeat(50)}\n`;
          content += `CONTENU DU CONSENTEMENT\n`;
          content += `${'='.repeat(50)}\n\n`;
          content += template.content;
          break;

        case 'html':
          content = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${template.title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        .meta { background: #f5f5f5; padding: 15px; margin-bottom: 20px; }
        .content { line-height: 1.6; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${template.title}</h1>
    </div>
    <div class="meta">
        <p><strong>Description:</strong> ${template.description}</p>
        <p><strong>Catégorie:</strong> ${template.category}</p>
        <p><strong>Spécialité:</strong> ${template.speciality}</p>
        <p><strong>Version:</strong> ${template.version}</p>
        <p><strong>Exporté le:</strong> ${timestamp}</p>
    </div>
    <div class="content">
        ${template.content.replace(/\n/g, '<br>')}
    </div>
</body>
</html>`;
          break;

        default:
          throw new Error('Format d\'export non supporté');
      }

      return {
        content,
        filename: `${template.title.replace(/[^a-z0-9]/gi, '_')}_v${template.version}.${format}`,
        mimeType: format === 'html' ? 'text/html' : 'text/plain'
      };
    } catch (error) {
      console.error('Erreur export modèle:', error);
      throw error;
    }
  },

  // Enregistrer l'utilisation d'un modèle
  recordUsage: (id, patientId) => {
    try {
      const templates = consentTemplatesStorage.getAll();
      const index = templates.findIndex(template => template.id === id);

      if (index !== -1) {
        templates[index].usage.timesUsed++;
        templates[index].usage.lastUsed = new Date().toISOString();

        // Compter les patients uniques (approximatif avec localStorage)
        if (patientId) {
          templates[index].usage.patientsCount++;
        }

        localStorage.setItem(CONSENT_TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
      }
    } catch (error) {
      console.error('Erreur enregistrement utilisation:', error);
    }
  },

  // Statistiques des modèles
  getStatistics: () => {
    const templates = consentTemplatesStorage.getAll().filter(t => !t.deleted);
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      total: templates.length,
      active: templates.filter(t => t.status === 'active').length,
      draft: templates.filter(t => t.status === 'draft').length,
      inactive: templates.filter(t => t.status === 'inactive').length,
      createdThisMonth: templates.filter(t => new Date(t.createdAt) >= thisMonth).length,
      mostUsed: templates
        .sort((a, b) => (b.usage?.timesUsed || 0) - (a.usage?.timesUsed || 0))
        .slice(0, 5),
      byCategory: {},
      bySpeciality: {},
      totalUsage: templates.reduce((sum, t) => sum + (t.usage?.timesUsed || 0), 0)
    };

    // Statistiques par catégorie
    templates.forEach(template => {
      const category = template.category || 'non_classé';
      if (!stats.byCategory[category]) {
        stats.byCategory[category] = { count: 0, usage: 0 };
      }
      stats.byCategory[category].count++;
      stats.byCategory[category].usage += template.usage?.timesUsed || 0;
    });

    // Statistiques par spécialité
    templates.forEach(template => {
      const speciality = template.speciality || 'general';
      if (!stats.bySpeciality[speciality]) {
        stats.bySpeciality[speciality] = { count: 0, usage: 0 };
      }
      stats.bySpeciality[speciality].count++;
      stats.bySpeciality[speciality].usage += template.usage?.timesUsed || 0;
    });

    return stats;
  }
};

// Catégories prédéfinies pour les modèles
export const TEMPLATE_CATEGORIES = {
  MEDICAL: {
    id: 'medical',
    name: 'Soins médicaux',
    description: 'Consentements pour interventions et soins médicaux'
  },
  SURGICAL: {
    id: 'surgical',
    name: 'Chirurgie',
    description: 'Consentements pour interventions chirurgicales'
  },
  RESEARCH: {
    id: 'research',
    name: 'Recherche',
    description: 'Consentements pour participation à la recherche'
  },
  DIAGNOSTIC: {
    id: 'diagnostic',
    name: 'Diagnostic',
    description: 'Consentements pour examens et diagnostics'
  },
  TELEMEDICINE: {
    id: 'telemedicine',
    name: 'Télémédecine',
    description: 'Consentements pour consultations à distance'
  },
  PREVENTION: {
    id: 'prevention',
    name: 'Prévention',
    description: 'Consentements pour vaccinations et dépistages'
  },
  DENTAL: {
    id: 'dental',
    name: 'Dentaire',
    description: 'Consentements pour soins dentaires'
  },
  MENTAL_HEALTH: {
    id: 'mental_health',
    name: 'Santé mentale',
    description: 'Consentements pour soins psychologiques et psychiatriques'
  },
  IMPORTED: {
    id: 'imported',
    name: 'Importés',
    description: 'Modèles importés depuis des fichiers'
  },
  CUSTOM: {
    id: 'custom',
    name: 'Personnalisés',
    description: 'Modèles créés sur mesure'
  }
};

// Spécialités médicales
export const MEDICAL_SPECIALITIES = {
  GENERAL: { id: 'general', name: 'Médecine générale' },
  CARDIOLOGY: { id: 'cardiology', name: 'Cardiologie' },
  DERMATOLOGY: { id: 'dermatology', name: 'Dermatologie' },
  NEUROLOGY: { id: 'neurology', name: 'Neurologie' },
  ORTHOPEDICS: { id: 'orthopedics', name: 'Orthopédie' },
  PEDIATRICS: { id: 'pediatrics', name: 'Pédiatrie' },
  PSYCHIATRY: { id: 'psychiatry', name: 'Psychiatrie' },
  RADIOLOGY: { id: 'radiology', name: 'Radiologie' },
  SURGERY: { id: 'surgery', name: 'Chirurgie générale' },
  GYNECOLOGY: { id: 'gynecology', name: 'Gynécologie' },
  OPHTHALMOLOGY: { id: 'ophthalmology', name: 'Ophtalmologie' },
  DENTISTRY: { id: 'dentistry', name: 'Dentaire' }
};

// Initialiser des modèles de démonstration
export const initializeSampleTemplates = () => {
  const existingTemplates = consentTemplatesStorage.getAll();
  if (existingTemplates.length === 0) {
    const sampleTemplates = [
      {
        title: 'Consentement chirurgie mineure',
        description: 'Modèle standard pour les interventions chirurgicales mineures',
        category: 'surgical',
        speciality: 'surgery',
        content: `CONSENTEMENT ÉCLAIRÉ POUR CHIRURGIE MINEURE

Je soussigné(e), [NOM_PATIENT] [PRÉNOM_PATIENT], né(e) le [DATE_NAISSANCE], déclare avoir été informé(e) de manière claire et complète par le Dr [NOM_PRATICIEN] de la nature et du déroulement de l'intervention chirurgicale mineure qui m'est proposée.

NATURE DE L'INTERVENTION :
[DESCRIPTION_INTERVENTION]

BÉNÉFICES ATTENDUS :
- [BÉNÉFICE_1]
- [BÉNÉFICE_2]

RISQUES ET COMPLICATIONS POSSIBLES :
- Infection locale
- Saignement
- Cicatrisation anormale
- [RISQUES_SPÉCIFIQUES]

ALTERNATIVES :
[ALTERNATIVES_DISPONIBLES]

SUITES OPÉRATOIRES :
[SUITES_POST_OPÉRATOIRES]

J'ai pu poser toutes les questions que je souhaitais et j'ai reçu des réponses satisfaisantes.

J'accepte cette intervention en toute connaissance de cause.

Date : [DATE]
Signature du patient : [SIGNATURE_PATIENT]
Signature du praticien : [SIGNATURE_PRATICIEN]`,
        status: 'active'
      },
      {
        title: 'Consentement téléconsultation',
        description: 'Modèle pour les consultations à distance',
        category: 'telemedicine',
        speciality: 'general',
        content: `CONSENTEMENT POUR TÉLÉCONSULTATION

Patient : [NOM_PATIENT] [PRÉNOM_PATIENT]
Date de naissance : [DATE_NAISSANCE]
Praticien : Dr [NOM_PRATICIEN]

INFORMATION SUR LA TÉLÉCONSULTATION :

La téléconsultation est une forme de consultation médicale réalisée à distance grâce aux technologies de l'information et de la communication.

MODALITÉS :
- Plateforme utilisée : [PLATEFORME]
- Durée prévue : [DURÉE]
- Date et heure : [DATE_HEURE]

AVANTAGES :
- Consultation sans déplacement
- Continuité des soins
- Accès facilité aux spécialistes

LIMITES :
- Impossibilité d'examen physique complet
- Qualité dépendante de la connexion internet
- Nécessité d'un équipement adapté

CONFIDENTIALITÉ :
Les données échangées sont protégées et stockées de manière sécurisée conformément au RGPD.

CONSENTEMENT :
J'accepte le principe de la téléconsultation et j'ai été informé(e) de ses modalités et limites.

Date : [DATE]
Signature du patient : [SIGNATURE_PATIENT]`,
        status: 'active'
      }
    ];

    sampleTemplates.forEach(templateData => {
      try {
        consentTemplatesStorage.create(templateData, 'demo');
      } catch (error) {
        console.log('Modèle démonstration déjà existant:', error.message);
      }
    });
  }
};

export default consentTemplatesStorage;