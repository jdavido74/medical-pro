# Consent Templates Structured Editor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **⚠️ NO PRODUCTION DEPLOYMENT** without explicit user approval. All work is local/dev only.

**Goal:** Add structured editor mode for consent templates (12 predefined sections), professional PDF generation (2 styles), AI translation via Gemini, and verify/fix existing signature workflows.

**Architecture:** New `editor_mode` + `structured_sections` fields on ConsentTemplate model. New frontend structured editor component alongside existing free-form editor. PDF generation via iframe print. Gemini API for translation suggestions. Fix verified issues in signing workflows.

**Tech Stack:** PostgreSQL migration, Sequelize model, Express routes, React components, @google/generative-ai (already installed), iframe print-to-PDF

**Spec:** `docs/superpowers/specs/2026-04-03-consent-templates-structured-design.md`

---

## File Map

### Backend (`/var/www/medical-pro-backend`)

| File | Action | Purpose |
|---|---|---|
| `migrations/clinic_080_consent_structured_fields.sql` | Create | Add editor_mode + structured_sections to consent_templates |
| `scripts/run-clinic-migrations.js` | Modify | Add clinic_080 |
| `src/services/clinicProvisioningService.js` | Modify | Add clinic_080 |
| `src/models/clinic/ConsentTemplate.js` | Modify | Add editor_mode + structured_sections fields |
| `src/routes/consent-templates.js` | Modify | Accept new fields in validation + add translate endpoint |
| `src/routes/consent-signing.js` | Modify | Fix identified bugs |

### Frontend (`/var/www/medical-pro`)

| File | Action | Purpose |
|---|---|---|
| `src/components/modals/ConsentTemplateEditorModal.js` | Modify | Add mode selector, render structured editor |
| `src/components/consent/ConsentStructuredEditor.js` | Create | 12-section form with toggles |
| `src/components/consent/ConsentStructuredPdfPreview.js` | Create | Professional PDF preview (standard + branded) |
| `src/locales/es/consents.json` | Modify | Add structured editor + AI translation labels |
| `src/locales/fr/consents.json` | Modify | French labels |
| `src/locales/en/consents.json` | Modify | English labels |

---

## Task 1: Database Migration

**Files:**
- Create: `migrations/clinic_080_consent_structured_fields.sql`
- Modify: `scripts/run-clinic-migrations.js`
- Modify: `src/services/clinicProvisioningService.js`

- [ ] **Step 1: Create migration**

```sql
-- Add structured editor fields to consent_templates
ALTER TABLE consent_templates ADD COLUMN IF NOT EXISTS editor_mode VARCHAR(20) DEFAULT 'free';
ALTER TABLE consent_templates ADD COLUMN IF NOT EXISTS structured_sections JSONB;
```

- [ ] **Step 2: Add to migration lists**

After `'clinic_079_treatment_products.sql'` in both files:
```javascript
  'clinic_080_consent_structured_fields.sql',
```

- [ ] **Step 3: Commit**

```bash
cd /var/www/medical-pro-backend
git add migrations/clinic_080_consent_structured_fields.sql scripts/run-clinic-migrations.js src/services/clinicProvisioningService.js
git commit -m "feat(consent): add migration for editor_mode and structured_sections fields"
```

---

## Task 2: Backend Model + Route Updates

**Files:**
- Modify: `src/models/clinic/ConsentTemplate.js`
- Modify: `src/routes/consent-templates.js`

- [ ] **Step 1: Add fields to ConsentTemplate model**

In `src/models/clinic/ConsentTemplate.js`, after the `metadata` field, add:

```javascript
    editor_mode: {
      type: DataTypes.STRING(20),
      defaultValue: 'free',
      validate: { isIn: [['free', 'structured']] },
    },
    structured_sections: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
```

- [ ] **Step 2: Update validation schema in consent-templates route**

In `src/routes/consent-templates.js`, add to `createSchema`:
```javascript
  editorMode: Joi.string().valid('free', 'structured').default('free'),
  structuredSections: Joi.object().allow(null).optional(),
```

Add the same to `updateSchema`.

Update the fieldMapping (or transformToDb) to map:
- `editorMode` → `editor_mode`
- `structuredSections` → `structured_sections`

Update transformFromDb to include:
```javascript
  editorMode: data.editor_mode || 'free',
  structuredSections: data.structured_sections || null,
```

- [ ] **Step 3: Add AI translation endpoint**

Add a new route in `consent-templates.js`:

```javascript
// POST /:id/translate — AI translation via Gemini
router.post('/:id/translate', async (req, res) => {
  try {
    const schema = Joi.object({
      targetLanguage: Joi.string().required(),
      sourceLanguage: Joi.string().required(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: { message: error.details[0].message } });
    }

    const ConsentTemplate = await getModel(req.clinicDb, 'ConsentTemplate');
    const template = await ConsentTemplate.findByPk(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, error: { message: 'Template not found' } });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.status(500).json({ success: false, error: { message: 'GEMINI_API_KEY not configured' } });
    }

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const langNames = { es: 'Spanish', fr: 'French', en: 'English', de: 'German', it: 'Italian', pt: 'Portuguese' };
    const sourceName = langNames[value.sourceLanguage] || value.sourceLanguage;
    const targetName = langNames[value.targetLanguage] || value.targetLanguage;

    const prompt = `Translate the following medical consent document from ${sourceName} to ${targetName}.
Keep medical terminology precise and appropriate for the target language.
Preserve all variables in brackets [LIKE_THIS] unchanged.
Maintain the same tone: formal, clear, respectful.
Return ONLY valid JSON with this structure: { "title": "...", "description": "...", "terms": "..." }
No markdown, no explanation.`;

    let contentToTranslate;
    if (template.editor_mode === 'structured' && template.structured_sections) {
      // For structured mode, translate each text field
      const sections = template.structured_sections;
      const textsToTranslate = [];
      if (sections.title?.text) textsToTranslate.push({ key: 'title.text', value: sections.title.text });
      if (sections.description?.text) textsToTranslate.push({ key: 'description.text', value: sections.description.text });
      if (sections.risks?.items) textsToTranslate.push({ key: 'risks.items', value: JSON.stringify(sections.risks.items) });
      if (sections.alternatives?.text) textsToTranslate.push({ key: 'alternatives.text', value: sections.alternatives.text });
      if (sections.benefits?.text) textsToTranslate.push({ key: 'benefits.text', value: sections.benefits.text });
      if (sections.declarations?.items) textsToTranslate.push({ key: 'declarations.items', value: JSON.stringify(sections.declarations.items) });
      if (sections.revocation?.text) textsToTranslate.push({ key: 'revocation.text', value: sections.revocation.text });

      const structuredPrompt = `Translate the following medical consent sections from ${sourceName} to ${targetName}.
Keep medical terminology precise. Preserve variables in brackets [LIKE_THIS] unchanged.
Return ONLY valid JSON with translated values for each key.
Input: ${JSON.stringify(Object.fromEntries(textsToTranslate.map(t => [t.key, t.value])))}`;

      const result = await model.generateContent(structuredPrompt);
      const responseText = result.response.text().trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');
      const translated = JSON.parse(responseText);

      return res.json({
        success: true,
        data: {
          mode: 'structured',
          title: template.title, // Title translated separately below
          description: template.description,
          translatedSections: translated,
        },
      });
    }

    // Free mode — translate title + description + terms
    contentToTranslate = `Title: ${template.title}\nDescription: ${template.description || ''}\nTerms: ${template.terms}`;

    const result = await model.generateContent([{ text: prompt + '\n\nContent:\n' + contentToTranslate }]);
    const responseText = result.response.text().trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    const translated = JSON.parse(responseText);

    res.json({
      success: true,
      data: {
        mode: 'free',
        title: translated.title || template.title,
        description: translated.description || template.description,
        terms: translated.terms || template.terms,
      },
    });
  } catch (err) {
    console.error('[consent-templates] Translate error:', err);
    res.status(500).json({ success: false, error: { message: 'Translation failed: ' + err.message } });
  }
});
```

- [ ] **Step 4: Verify syntax and commit**

```bash
node -c src/models/clinic/ConsentTemplate.js && node -c src/routes/consent-templates.js && echo "OK"
git add src/models/clinic/ConsentTemplate.js src/routes/consent-templates.js
git commit -m "feat(consent): add structured fields to model/route, AI translation endpoint"
```

---

## Task 3: Fix Signing Workflow Issues

**Files:**
- Modify: `src/routes/consent-signing.js`

- [ ] **Step 1: Read and identify issues**

Read the full consent-signing.js file. Known issues:
1. Line ~177: Inconsistent field naming (snake_case vs camelCase for patient name in email)
2. Line ~218: Same inconsistency in response object
3. Line ~456: Incomplete reminder functionality

- [ ] **Step 2: Fix field naming inconsistencies**

Ensure patient names use consistent format. The email service likely expects different format than the response. Fix both to be consistent with how data comes from Sequelize (snake_case from DB, transform for response).

- [ ] **Step 3: Fix or remove incomplete reminder code**

If the reminder TODO is non-blocking, add a proper "not implemented" response. If it's blocking, implement the basic reminder (re-send signing link email).

- [ ] **Step 4: Test signing endpoints manually**

```bash
# Verify the route loads without errors
node -c src/routes/consent-signing.js
```

- [ ] **Step 5: Commit**

```bash
git add src/routes/consent-signing.js
git commit -m "fix(consent): fix field naming in signing workflow, clean up incomplete code"
```

---

## Task 4: Frontend — i18n Keys

**Files:**
- Modify: `src/locales/es/consents.json`
- Modify: `src/locales/fr/consents.json`
- Modify: `src/locales/en/consents.json`

- [ ] **Step 1: Add Spanish keys**

Add under root level:
```json
"structuredEditor": {
  "modeSelector": "Modo de edición",
  "modeFree": "Modo libre",
  "modeFreeDesc": "Editor de texto con variables",
  "modeStructured": "Modo estructurado",
  "modeStructuredDesc": "Formulario por secciones (PDF profesional)",
  "sections": {
    "header": "Encabezado de la clínica",
    "title": "Título del consentimiento",
    "patientId": "Identificación del paciente",
    "physicianId": "Identificación del médico",
    "description": "Descripción del tratamiento",
    "risks": "Riesgos y complicaciones",
    "alternatives": "Alternativas al tratamiento",
    "benefits": "Beneficios esperados",
    "declarations": "Declaraciones del paciente",
    "patientSignature": "Firma del paciente",
    "physicianSignature": "Firma del médico",
    "revocation": "Cláusula de revocación"
  },
  "required": "Obligatorio (Ley 41/2002)",
  "optional": "Opcional",
  "addRisk": "Añadir riesgo",
  "addDeclaration": "Añadir declaración",
  "autoFilled": "Completado automáticamente",
  "pdfStyle": "Estilo del PDF",
  "pdfStandard": "Estándar (blanco y negro)",
  "pdfBranded": "Personalizado (colores de la clínica)"
},
"aiTranslation": {
  "generate": "Generar traducción con IA",
  "generating": "Generando traducción...",
  "generated": "Traducción generada — revisar y guardar",
  "error": "Error al generar la traducción"
}
```

- [ ] **Step 2: Add French and English equivalents**

- [ ] **Step 3: Commit**

```bash
cd /var/www/medical-pro
git add src/locales/
git commit -m "feat(consent): add i18n keys for structured editor and AI translation"
```

---

## Task 5: Frontend — ConsentStructuredEditor Component

**Files:**
- Create: `src/components/consent/ConsentStructuredEditor.js`

- [ ] **Step 1: Create the component**

Props: `{ sections, onChange, t }`

`sections` is the JSONB object. `onChange` updates it.

12 section blocks, each with:
- Toggle switch (enabled/disabled)
- "Required" badge for Ley 41/2002 sections
- "Auto-filled" badge for variable-populated sections (header, patientId, physicianId, signatures)
- Content fields appropriate to each section:
  - `title`, `description`, `alternatives`, `benefits`, `revocation`: textarea
  - `risks`: list builder (add/remove items, each is an input)
  - `declarations`: list builder (add/remove checkboxes, each is an input)
  - `header`, `patientId`, `physicianId`, `patientSignature`, `physicianSignature`: read-only preview (auto-filled from variables)

Default sections state when creating a new structured template:
```javascript
const DEFAULT_SECTIONS = {
  header: { enabled: true },
  title: { enabled: true, text: '' },
  patientId: { enabled: true },
  physicianId: { enabled: true },
  description: { enabled: true, text: '' },
  risks: { enabled: true, items: [] },
  alternatives: { enabled: true, text: '' },
  benefits: { enabled: false, text: '' },
  declarations: { enabled: true, items: ['He sido informado/a de forma clara y comprensible', 'He podido formular todas las preguntas que he considerado oportunas', 'He recibido información sobre los riesgos y alternativas'] },
  patientSignature: { enabled: true },
  physicianSignature: { enabled: true },
  revocation: { enabled: true, text: 'Revoco el consentimiento prestado en fecha arriba indicada y no deseo proseguir el tratamiento, que doy con esta fecha por finalizado.' },
};
```

Required sections (Ley 41/2002): `patientId`, `physicianId`, `description`, `risks`, `alternatives`, `patientSignature`, `revocation`.

- [ ] **Step 2: Commit**

```bash
git add src/components/consent/ConsentStructuredEditor.js
git commit -m "feat(consent): add ConsentStructuredEditor component with 12 sections"
```

---

## Task 6: Frontend — ConsentStructuredPdfPreview Component

**Files:**
- Create: `src/components/consent/ConsentStructuredPdfPreview.js`

- [ ] **Step 1: Create the component**

Props: `{ sections, template, patient, provider, clinicInfo, pdfStyle, onClose, t }`

`pdfStyle`: 'standard' or 'branded'

Renders a modal with the professional PDF preview. Uses iframe + `window.print()` for printing.

**Standard style:** serif font, B&W, horizontal rules between sections, dotted signature lines.

**Branded style:** sans-serif, accent color from clinicInfo, logo top-left, colored section titles.

Both styles render enabled sections in order:
1. Header (clinic info)
2. Title (centered, bold)
3. Patient identification (auto-filled variables or placeholder)
4. Physician identification (auto-filled)
5. Description text
6. Risks as bullet list
7. Alternatives text
8. Benefits text (if enabled)
9. Declarations as numbered checkboxes
10. Patient signature zone (Lugar/Fecha/Firma with dotted lines)
11. Physician signature zone
12. Revocation clause with signature line

Variable substitution using existing `consentVariableMapper.js` if patient data is available.

**Print function:** Same pattern as PrescriptionPreview — `window.open()`, write HTML+CSS, `window.print()`.

- [ ] **Step 2: Commit**

```bash
git add src/components/consent/ConsentStructuredPdfPreview.js
git commit -m "feat(consent): add ConsentStructuredPdfPreview with standard and branded styles"
```

---

## Task 7: Frontend — Integrate into ConsentTemplateEditorModal

**Files:**
- Modify: `src/components/modals/ConsentTemplateEditorModal.js`

- [ ] **Step 1: Add mode selector**

At the top of the content tab (when `activeEditorTab === 'content'`), before the existing textarea, add a mode selector:

Two cards side by side: "Modo libre" (existing) and "Modo estructurado" (new). Selected mode stored in `formData.editorMode`.

When mode is 'free': show existing textarea editor (unchanged).
When mode is 'structured': show `ConsentStructuredEditor` component instead.

Mode selector only shown in 'create' mode or when editing a 'draft' template. Published templates keep their mode.

- [ ] **Step 2: Add AI translation button**

In the translations tab, add a "Generar traducción con IA" button next to the language selector. On click:
1. Call `POST /consent-templates/:id/translate` with source and target language
2. Show loading state
3. Populate the translation fields with the result
4. Admin can edit before saving

- [ ] **Step 3: Pass structured data to save**

Update the save handler to include `editorMode` and `structuredSections` in the payload when mode is 'structured'.

- [ ] **Step 4: Add PDF preview for structured mode**

When mode is 'structured', the preview button opens `ConsentStructuredPdfPreview` instead of the current `ConsentPreviewModal`.

- [ ] **Step 5: Commit**

```bash
git add src/components/modals/ConsentTemplateEditorModal.js
git commit -m "feat(consent): integrate structured editor + AI translation into template modal"
```

---

## Task 8: Frontend — PDF Style Setting

**Files:**
- Modify: `src/components/dashboard/modules/SettingsModule.js` (or wherever clinic settings are managed)

- [ ] **Step 1: Add consentPdfStyle toggle**

In the settings/administration section, add a toggle or radio for consent PDF style:
- Standard (blanco y negro)
- Personalizado (colores de la clínica)

Store in clinic settings (billing_settings JSONB or equivalent).

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/modules/SettingsModule.js
git commit -m "feat(consent): add PDF style preference in clinic settings"
```

---

## Task 9: Verify + Fix Translation System

**Files:**
- Various consent-related files

- [ ] **Step 1: Verify translation CRUD**

Test creating/editing/deleting translations for a template via the API. Verify the frontend translation tab works correctly.

- [ ] **Step 2: Verify language fallback**

Test that when a translation is missing, the system falls back to the template's default language.

- [ ] **Step 3: Verify variable substitution in translations**

Test that `[VARIABLE]` placeholders are correctly substituted in translated content.

- [ ] **Step 4: Fix any issues found**

- [ ] **Step 5: Commit fixes**

```bash
git add -A
git commit -m "fix(consent): fix translation system issues found during verification"
```

---

## Task 10: Build Verification

**⚠️ LOCAL ONLY — No production deployment**

- [ ] **Step 1: Backend syntax check**

```bash
cd /var/www/medical-pro-backend
node -c src/models/clinic/ConsentTemplate.js
node -c src/routes/consent-templates.js
node -c src/routes/consent-signing.js
```

- [ ] **Step 2: Frontend build**

```bash
cd /var/www/medical-pro
REACT_APP_API_BASE_URL=/api/v1 REACT_APP_COUNTRY=ES REACT_APP_ENV=production npm run build
```

- [ ] **Step 3: Push to repos**

```bash
cd /var/www/medical-pro-backend && git push origin master
cd /var/www/medical-pro && git push origin master
```

- [ ] **Step 4: Report to user**

List all changes made, ask for approval before any production deployment.
