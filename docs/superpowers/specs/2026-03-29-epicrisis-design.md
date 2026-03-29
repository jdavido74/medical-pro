# Epicrisis — Clinical Episode Summary Document

## Overview

Add epicrisis (clinical episode summary) generation to MediMaestro. The epicrisis aggregates data from a parent medical record and all its evolutions into a structured PDF document. The doctor selects which sections to include, writes a conclusion/recommendations/prognosis, and can sign the document to close the episode.

Separately, simplify the existing Receta (prescription) tab by removing the "Configuration" section-selection mechanism, which migrates to the epicrisis.

## Entry Point

The **"Terminar el historial"** button in the medical records list (accordion view) opens the epicrisis composer modal. This button is visible on all active parent records (not signed/closed).

## Epicrisis Composer Modal

Full-screen modal with two panels:

### Left Panel — Configuration

**Section selection checkboxes** (aggregated from parent + all evolutions):

| Section | Data Source | Default |
|---|---|---|
| Motivo de consulta | Parent: `chief_complaint` | On |
| Enfermedad actual | Parent: `current_illness` | On |
| Antecedentes | Parent: `antecedents` + `allergies` | Off |
| Constantes vitales | Parent + evolutions: `vital_signs` (chronological) | On |
| Examen físico | Parent + evolutions: `physical_exam` | Off |
| Diagnóstico | Parent: `diagnosis` (primary + secondary) | On |
| Tratamientos prescritos | Parent + evolutions: `treatments` (aggregated, deduplicated) | On |
| Medicamentos actuales | Parent: `current_medications` | Off |
| Condiciones crónicas | Parent: `chronic_conditions` | Off |
| Plan de tratamiento | Parent: `treatment_plan` | Off |
| Cronología de evoluciones | All evolutions: date + full content | On |

**Below the checkboxes, three free-text fields:**

1. **Conclusión** — Doctor's synthesis of the episode
2. **Recomendaciones de seguimiento** — What the patient should do next
3. **Pronóstico** — Prognostic assessment

**Action buttons at bottom of left panel:**

- "Generar borrador PDF" — generates preview PDF, does not close episode
- "Firmar y cerrar el episodio" — triggers signature flow, closes episode

### Right Panel — Live Preview

Real-time preview of the epicrisis document, updating as checkboxes are toggled and text fields are edited. Same pattern as the current prescription configuration preview.

## PDF Document Format

```
┌─────────────────────────────────────┐
│ HEADER                              │
│ Clinic logo + name + contact info   │
│ Title: EPICRISIS                    │
│ Number: EPI-YYYY-MM-NNNN           │
│ Generation date                     │
├─────────────────────────────────────┤
│ PATIENT INFO                        │
│ Name, DOB, patient number           │
│ Attending physician                 │
├─────────────────────────────────────┤
│ PART 1 — AGGREGATED SECTIONS        │
│ (per doctor's selection)            │
│                                     │
│ Chief complaint                     │
│ Current illness                     │
│ Diagnosis                           │
│ Vital signs (chronological table)   │
│ Prescribed treatments (table)       │
│ etc.                                │
├─────────────────────────────────────┤
│ PART 2 — EVOLUTION TIMELINE         │
│ (if "Cronología" checked)           │
│                                     │
│ ● 12 mar 2026 — Consultation       │
│   Content, vitals, notes...         │
│                                     │
│ ● 14 mar 2026 — Evolución          │
│   Content, vitals, notes...         │
│                                     │
│ ● 27 mar 2026 — Evolución          │
│   Content, vitals, notes...         │
├─────────────────────────────────────┤
│ PART 3 — CONCLUSION                 │
│ Conclusion                          │
│ Recommendations                     │
│ Prognosis                           │
├─────────────────────────────────────┤
│ FOOTER                              │
│ Signature: Dr. [Name]              │
│ Signature date                      │
│ Document hash (if signed)           │
│ Status: Draft / Signed              │
│                                     │
│ MediMaestro — medimaestro.com      │
└─────────────────────────────────────┘
```

### Vital Signs Aggregation

Displayed as a chronological table — one column per date, one row per measure (BP, HR, temp, SpO2, weight). Shows evolution at a glance.

### Treatments Aggregation

Table with medication, dosage, start/end dates, status. Deduplicated when the same treatment appears in multiple evolutions.

### PDF Generation

Same approach as prescriptions — hidden iframe + `window.print()` for browser-native PDF save.

## Epicrisis Lifecycle

```
draft → finalized (PDF generated, episode stays open)
              ↓
         signed (password + hash → episode closed, no more evolutions)
```

- **Draft**: editable, can be regenerated any number of times
- **Finalized**: PDF generated, episode remains open, evolutions still possible
- **Signed**: episode closed permanently, no more evolutions on this parent record

## Signature Flow (Level 1 — MVP)

1. Doctor clicks "Firmar y cerrar el episodio"
2. Confirmation dialog: "Esta acción cerrará el episodio clínico. No se podrán añadir más evoluciones. ¿Continuar?"
3. If confirmed → password input (same account password, verified via bcrypt)
4. Backend verifies password against user record
5. If valid → generate SHA-256 hash of full epicrisis content (serialized JSON of all included data)
6. Store in DB:
   - `signed_at`: timestamp
   - `signed_by`: provider_id
   - `content_hash`: SHA-256
   - `signature_method`: 'password'
   - `status`: 'signed'
7. Parent record → `status: 'closed'`
8. All child evolutions → `status: 'closed'`
9. Final PDF regenerated with hash and "Signed" status in footer

**Integrity verification**: At any time, recalculate hash from stored data and compare with `content_hash`. Mismatch = document tampered.

**Future Level 2**: Field `signature_method` allows adding 'dnie' or 'clave' later without migration.

## Data Model

### New table: `epicrises` (clinic DB)

```sql
CREATE TABLE epicrises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_record_id UUID NOT NULL REFERENCES medical_records(id),
  provider_id UUID NOT NULL,
  patient_id UUID NOT NULL,

  -- Content
  selected_sections JSONB NOT NULL DEFAULT '{}',
  conclusion TEXT,
  recommendations TEXT,
  prognosis TEXT,

  -- Snapshots (frozen at generation, like prescriptions)
  patient_snapshot JSONB,
  provider_snapshot JSONB,
  aggregated_data JSONB,

  -- Signature
  status VARCHAR(20) DEFAULT 'draft',
  signed_at TIMESTAMP,
  signed_by UUID,
  content_hash VARCHAR(64),
  signature_method VARCHAR(20) DEFAULT 'password',

  -- Numbering
  epicrisis_number VARCHAR(20),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_epicrises_medical_record ON epicrises(medical_record_id);
```

### Changes to `medical_records`

- Add `'closed'` to accepted values for `status` field (distinguishes individually signed records from epicrisis-closed episodes)

## Receta Simplification

### Remove from prescription tab

- The "Configuration de la receta" panel (purple section with checkboxes: `includeBasicInfo`, `includeCurrentIllness`, `includeAntecedents`, `includeVitalSigns`, `includePhysicalExam`, `includeCurrentMedications`, `includeDiagnosis`, `includeFromTreatments`, `includeFromPlan`)
- The live preview right column tied to those checkboxes

### Keep in prescription tab

- Saved prescriptions list
- Medication form (CIMA search, dosage, frequency, route, duration, quantity, instructions)
- Drug interaction panel
- General instructions textarea
- Doctor notes textarea
- Prescription options (valid until, renewable, renewals count)
- Preview + Save buttons

### Prescription PDF changes

The prescription PDF no longer includes diagnosis, vital signs, or chief complaint sections. It contains:
- Clinic header + patient info
- Medications list with full details
- Instructions and notes
- Footer with signature area

## API Endpoints

```
POST   /api/v1/epicrises                    — Create draft epicrisis
GET    /api/v1/epicrises/:id                — Get epicrisis by ID
GET    /api/v1/epicrises/record/:recordId   — Get epicrisis for a parent record
PUT    /api/v1/epicrises/:id                — Update draft epicrisis
POST   /api/v1/epicrises/:id/finalize       — Mark as finalized
POST   /api/v1/epicrises/:id/sign           — Sign and close episode (requires password)
GET    /api/v1/epicrises/:id/verify         — Verify integrity (recalculate hash)
```

## Frontend Components

| Component | Purpose |
|---|---|
| `EpicrisisComposerModal.js` | Main modal: section selection + text fields + action buttons |
| `EpicrisisPreview.js` | Right panel live preview + PDF generation |
| `EpicrisisSignatureDialog.js` | Password confirmation dialog for signing |
| `src/api/epicrisisApi.js` | API client |

## i18n

New keys under `medical:epicrisis.*` in es/fr/en planning.json or medical.json:
- `title`, `draft`, `finalized`, `signed`, `closed`
- `selectSections`, `conclusion`, `recommendations`, `prognosis`
- `generateDraft`, `signAndClose`
- `confirmClose` (dialog text)
- `enterPassword`, `signatureSuccess`, `signatureError`
- `verifyIntegrity`, `integrityOk`, `integrityFailed`
- Section labels matching the selection table above

## Permissions

Reuse existing medical record permissions:
- `MEDICAL_RECORDS_EDIT` — can create/edit draft epicrisis
- `MEDICAL_RECORDS_SIGN` — can sign and close episodes (new permission, optional — could default to any provider with EDIT)

## Out of Scope

- Level 2 signature (DNIe/Cl@ve) — future enhancement
- Epicrisis templates — future enhancement
- Automatic epicrisis generation (AI summary) — future enhancement
- Export to external systems (HL7/FHIR) — future enhancement
