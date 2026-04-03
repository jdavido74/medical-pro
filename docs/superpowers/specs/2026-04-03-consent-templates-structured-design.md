# Consent Templates — Structured Editor + PDF + AI Translation

## Overview

Add a "structured mode" alternative to the existing free-form consent template editor. The structured mode provides 12 predefined sections (compliant with Ley 41/2002) that generate a professional PDF. Add AI-powered translation via Gemini. Verify and fix existing signature workflows and translation system.

**Important:** No production deployment without explicit user approval.

## Scope

1. **Structured editor mode** — 12 predefined sections as alternative to existing free-form
2. **Professional PDF generation** — two styles: standard (B&W) and branded (clinic colors)
3. **AI translation** — Gemini-powered translation suggestion, editable by admin
4. **Verify + fix** — existing signature workflows (email/tablet/link) and translation system

## Editor Modes

At template creation, the admin chooses:
- **Modo libre** — existing textarea + variable toolbar (unchanged)
- **Modo estructurado** — form with 12 predefined sections

The choice is stored on the template. Both modes coexist, existing templates are unaffected.

### New fields on ConsentTemplate model

| Field | Type | Description |
|---|---|---|
| `editor_mode` | VARCHAR(20) DEFAULT 'free' | 'free' or 'structured' |
| `structured_sections` | JSONB DEFAULT NULL | Section data for structured mode |

## 12 Structured Sections

| # | Section ID | Content | Required (Ley 41/2002) | Auto-variables |
|---|---|---|---|---|
| 1 | `header` | Clinic logo, name, address, phone, CIF | No | Yes (from settings) |
| 2 | `title` | Consent document title | No | No |
| 3 | `patientId` | Patient name, surname, DNI, birth date | Yes | Yes |
| 4 | `physicianId` | Physician name, specialty, college number | Yes | Yes |
| 5 | `description` | Treatment description (free text) | Yes | No |
| 6 | `risks` | Risks and complications (structured list — add/remove items) | Yes | No |
| 7 | `alternatives` | Treatment alternatives (free text) | Yes | No |
| 8 | `benefits` | Expected benefits (free text) | No | No |
| 9 | `declarations` | Patient declarations (configurable checkboxes) | No | No |
| 10 | `patientSignature` | Place, date, patient signature | Yes | Yes ([DATE], [LIEU]) |
| 11 | `physicianSignature` | Place, date, physician signature | No | Yes |
| 12 | `revocation` | Standard revocation clause + signature | Yes | Yes |

Each section has an `enabled` toggle. Required sections are enabled by default and visually marked.

### JSONB structure (structured_sections)

```json
{
  "header": { "enabled": true },
  "title": { "enabled": true, "text": "Consentimiento Informado para Ozonoterapia" },
  "patientId": { "enabled": true },
  "physicianId": { "enabled": true },
  "description": { "enabled": true, "text": "Se le propone el siguiente tratamiento..." },
  "risks": { "enabled": true, "items": ["Dolor local", "Hematoma", "Reacción alérgica"] },
  "alternatives": { "enabled": true, "text": "Como alternativas al tratamiento propuesto..." },
  "benefits": { "enabled": false, "text": "" },
  "declarations": { "enabled": true, "items": ["He sido informado/a de forma clara y comprensible", "He podido hacer preguntas y han sido respondidas"] },
  "patientSignature": { "enabled": true },
  "physicianSignature": { "enabled": true },
  "revocation": { "enabled": true, "text": "Revoco el consentimiento prestado en fecha arriba indicada..." }
}
```

## PDF Generation

### Two configurable styles

Setting `consentPdfStyle` in clinic settings: `'standard'` or `'branded'`.

#### Standard (B&W, official)
- Font: Times New Roman / serif
- Black and white only
- Header: clinic name + address, centered, small
- Title: bold, centered
- Sections separated by horizontal rules
- Signature zones: dotted lines with labels
- Footer: consent number + date + page X/Y

#### Branded (clinic identity)
- Font: Arial / sans-serif
- Accent color from clinic settings (or MediMaestro green default)
- Clinic logo top-left
- Colored bar under header
- Section titles in accent color
- Body text remains dark/neutral
- Same signature zones

### Technical approach

Same as PrescriptionPreview — HTML + CSS construction, hidden iframe, `window.print()`. Style determined by `consentPdfStyle` setting.

Variables substituted at generation time via existing `consentVariableService.js`.

### PDF for free mode

Unchanged — renders `terms` HTML as today. No impact on existing templates.

## AI Translation (Gemini)

### Flow

1. Admin creates template in source language
2. Goes to "Translations" tab
3. Selects target language
4. Clicks **"Generar traducción con IA"** button
5. Backend sends content to Gemini 2.0 Flash
6. Translation returned and displayed in editable fields
7. Admin reviews, adjusts if needed
8. Saves translation

### For structured mode

Each section is translated individually — risks items, description, declarations, revocation text, title. The section structure (enabled/disabled, order) is preserved.

### For free mode

The full `terms` text is sent for translation.

### Backend endpoint

`POST /api/v1/consent-templates/:id/translate`

Body: `{ targetLanguage: 'fr', sourceLanguage: 'es' }`

Response: `{ title, description, terms }` (free mode) or `{ title, description, structuredSections }` (structured mode)

### Prompt

```
Translate the following medical consent document from {sourceLang} to {targetLang}.
Keep medical terminology precise and appropriate for the target language.
Preserve all variables in brackets [LIKE_THIS] unchanged.
Maintain the same tone: formal, clear, respectful.
Return only the translation, no explanation.
```

### Cost

Free (Gemini free tier — 1500 requests/day).

## Verify + Fix Existing Workflows

### Signature workflows to verify

1. **Email workflow**
   - Sending signing link via email
   - Signing page loads correctly with consent content
   - Variable substitution on signing page
   - Signature capture (canvas)
   - GDPR audit fields recorded (IP, device, timestamp)
   - Expiration handling
   - Confirmation after signing

2. **Tablet workflow**
   - Display consent for immediate signing
   - Touch signature capture
   - Save and confirmation

3. **Link workflow**
   - URL generation
   - Sharing mechanism
   - Same signing page as email
   - Expiration

### Translation system to verify

- Create/edit translations for each language
- Correct language sent to patient based on preference
- Fallback to default language when translation missing
- Variable substitution in translated content

### Corrections

Any bug or missing functionality found during verification will be fixed in the same implementation cycle. No refactoring beyond what's needed.

## Data Model Changes

### Migration: consent template structured fields

```sql
ALTER TABLE consent_templates ADD COLUMN IF NOT EXISTS editor_mode VARCHAR(20) DEFAULT 'free';
ALTER TABLE consent_templates ADD COLUMN IF NOT EXISTS structured_sections JSONB;
```

### Clinic settings addition

Add `consentPdfStyle` to `billing_settings` or `clinic_settings` JSONB:
```json
{ "consentPdfStyle": "standard" }
```

## API Changes

### New endpoints

```
POST /api/v1/consent-templates/:id/translate   — AI translation via Gemini
GET  /api/v1/consent-templates/:id/pdf-preview — PDF preview for structured mode
```

### Modified endpoints

```
POST /api/v1/consent-templates          — accept editor_mode + structured_sections
PUT  /api/v1/consent-templates/:id      — accept editor_mode + structured_sections
```

## Frontend Components

| Component | Action | Purpose |
|---|---|---|
| `ConsentTemplateEditorModal.js` | Modify | Add mode selector, render structured editor when mode='structured' |
| `ConsentStructuredEditor.js` | Create | 12-section form with toggles, risk list builder, declaration builder |
| `ConsentPdfPreview.js` | Create | Professional PDF preview for structured mode (standard + branded) |
| `ConsentTemplateEditorModal.js` | Modify | Add "Generar traducción con IA" button in translations tab |

## i18n

New keys under `consents:structuredEditor.*` in es/fr/en:
- Section labels (12 sections)
- Mode selector labels
- PDF style labels
- AI translation button and status messages
- Required section indicator

## Permissions

No new permissions needed — uses existing `CONSENT_TEMPLATES_CREATE`, `CONSENT_TEMPLATES_EDIT`.

## Out of Scope

- WYSIWYG editor upgrade (future)
- Digital certificate signature (future Level 2)
- Custom section creation beyond the 12 predefined
- Template versioning UI improvements
