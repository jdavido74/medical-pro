# Clinical Episodes — Design Spec

**Date:** 2026-03-26
**Status:** Approved
**Scope:** Medical records module — parent/evolution linking for multi-session care

---

## 1. Context

MediMaestro's medical records are currently independent documents. Each patient visit creates a new record with all sections (basic info, antecedents, current illness, physical exam, vitals, evolution, treatments, plan, prescription). When a patient returns multiple times for the same issue, the practitioner must recreate a full record each time or overwrite the previous one, losing the evolution history.

### Problem

A patient undergoing multi-session treatment (e.g., ozone therapy twice a week) has the same baseline data (antecedents, current illness, physical exam) across all sessions. Only the vitals, evolution notes, and treatment adjustments change between sessions.

### Solution

Link follow-up records to an initial record, forming a clinical episode. The initial record holds the full baseline. Follow-up records (evolutions) contain only the variable data: vitals, evolution, treatments, plan, and prescriptions.

## 2. Requirements

| Requirement | Target |
|---|---|
| Data model | Single field `parent_record_id` on existing `medical_records` table |
| Backward compatibility | All existing records unchanged (`parent_record_id = NULL`) |
| Episode structure | 1 parent (initial record) + N evolutions (follow_up records) |
| Evolution form | 5 tabs only: Vitals, Evolution, Treatments, Plan, Prescription |
| Entry points | List of records (button under parent) + header of opened parent record |
| Save behavior | Synchronous (immediate feedback, no background save) |
| Episode closure | Not implemented — any parent can receive evolutions at any time |
| Multiple episodes | A patient can have multiple open episodes in parallel |

## 3. Architecture

### 3.1 Data Model

**Migration:** Add one column to `medical_records`:

```sql
ALTER TABLE medical_records ADD COLUMN parent_record_id UUID REFERENCES medical_records(id) ON DELETE SET NULL;
CREATE INDEX idx_medical_records_parent ON medical_records(parent_record_id) WHERE parent_record_id IS NOT NULL;
```

**Semantics:**
- `parent_record_id = NULL` → independent record or episode parent
- `parent_record_id = <uuid>` → evolution linked to parent
- Depth is always 1 (no grandchildren — an evolution cannot be parent of another evolution)
- The backend enforces: if `parent_record_id` is set, `record_type` must be `follow_up`

**Zero impact on existing data:** All current records have `parent_record_id = NULL` and continue to function identically.

### 3.2 Identifying Episode Parents

A record is an episode parent if:
- It has `parent_record_id = NULL` (could be parent or standalone)
- AND at least one other record references it via `parent_record_id`

OR: any record with `parent_record_id = NULL` can become a parent by creating an evolution linked to it. There is no explicit "create episode" action — the first evolution implicitly makes the record a parent.

### 3.3 API Changes

**No new endpoints.** Enrich existing ones:

#### `POST /medical-records` (create)

Accept optional `parent_record_id` in the body.

Validation:
- If `parent_record_id` is provided:
  - Parent record must exist
  - Parent record must belong to the same patient (`patient_id` match)
  - Parent record must not itself be an evolution (`parent_record_id` of parent must be `NULL`)
  - `record_type` is forced to `follow_up`
- If `parent_record_id` is not provided: existing behavior unchanged

#### `GET /medical-records/patient/:patientId` (patient history)

Add `parentRecordId` to the response for each record. The frontend uses this to group records into episodes.

#### `GET /medical-records/:id` (single record)

Add `parentRecordId` and a new field `evolutions: []` — array of summary objects for child records:

```json
{
  "id": "...",
  "parentRecordId": null,
  "evolutions": [
    { "id": "...", "recordDate": "2026-03-25T10:00", "chiefComplaint": "Évolution", "providerName": "Dr. Moya" },
    { "id": "...", "recordDate": "2026-03-26T10:00", "chiefComplaint": "Évolution", "providerName": "Dr. Moya" }
  ]
}
```

If the record is an evolution (has `parentRecordId`), `evolutions` is an empty array.

### 3.4 Frontend — Record List (MedicalRecordsModule)

Records are grouped visually by episode:

```
📋 24/03 — Consultation — Dolor lumbar
   ├── 📝 25/03 — Évolution
   ├── 📝 26/03 — Évolution
   └── [+ Ajouter une évolution]

📋 10/03 — Consultation — Control general
   └── [+ Ajouter une évolution]

📋 01/03 — Traitement — Ozon multipass (standalone)
   └── [+ Ajouter une évolution]
```

**Grouping logic (frontend only):**
1. Sort all records by `recordDate` descending
2. Group: records with `parentRecordId` are nested under their parent
3. Standalone records (no parent, no children) display with the "+ Ajouter une évolution" button like any potential parent

**"+ Ajouter une évolution" button:**
- Appears under every record that has `parentRecordId = NULL`
- Clicking it opens the evolution form with `parentRecordId` pre-set

### 3.5 Frontend — Parent Record Header

When a record with `parentRecordId = NULL` is opened in the form, the header buttons section includes a new button:

```
[Signer] [Archiver] [+ Évolution]
```

The "+ Évolution" button opens the evolution form with `parentRecordId` pre-set to the current record's ID.

### 3.6 Frontend — Evolution Form

When creating a record with `parentRecordId` set, the form shows only 5 tabs:

| Tab | Backend field | Notes |
|---|---|---|
| Constantes | `vital_signs` | Full vitals form (weight, BP, HR, temp, SpO2, glucose) |
| Évolution | `evolution` | Free text |
| Traitements | `treatments` | Treatment list with catalog selector |
| Plan | `treatment_plan` | Recommendations, follow-up, tests |
| Ordonnance | prescription (separate API) | Via `prescriptionsApi` |

Hidden tabs (data inherited from parent, not duplicated):
- Información Básica
- Antecedentes
- Enfermedad Actual
- Examen Físico
- Diagnostic
- Médicaments actuels

**Save behavior:** Synchronous — the save button calls the API and waits for the response before showing success/error feedback.

### 3.7 Data Flow

```
Practitioner clicks "+ Ajouter une évolution" on a parent record
    |
    v
Evolution form opens (5 tabs only)
    |
    v
Practitioner fills in vitals, evolution text, adjusts treatments if needed
    |
    v
Clicks "Guardar" → synchronous POST /medical-records
    body: { parentRecordId, recordType: 'follow_up', vitalSigns, evolution, treatments, treatmentPlan }
    |
    v
Backend validates parent exists + same patient + parent is not itself an evolution
    |
    v
Record created with parent_record_id set
    |
    v
Response returned → record list refreshed → evolution appears indented under parent
```

## 4. Migration & Compatibility

### 4.1 Database Migration

**File:** `clinic_070_medical_record_parent_link.sql`

```sql
-- Add parent_record_id for clinical episodes (evolution linked to initial record)
ALTER TABLE medical_records ADD COLUMN parent_record_id UUID REFERENCES medical_records(id) ON DELETE SET NULL;
CREATE INDEX idx_medical_records_parent ON medical_records(parent_record_id) WHERE parent_record_id IS NOT NULL;
```

Must be added to:
- `run-clinic-migrations.js` NEW_MIGRATIONS list (existing clinics)
- `clinicProvisioningService.js` migration list (new clinics)

### 4.2 Existing Data

Zero transformation needed. All existing records have `parent_record_id = NULL` by default. They appear as standalone records (or potential episode parents) in the new UI.

### 4.3 Backward Compatibility

- The API accepts `parentRecordId` as optional — omitting it preserves current behavior
- The form without `parentRecordId` shows all 10 tabs as before
- The list groups records with evolutions but displays standalone records identically to today
- `dataTransform.js` passes through `parentRecordId` ↔ `parent_record_id` like other camelCase/snake_case fields

## 5. Validation Rules

| Rule | Enforcement |
|---|---|
| Parent must exist | Backend: 404 if parent_record_id references non-existent record |
| Same patient | Backend: 400 if parent's patient_id ≠ evolution's patient_id |
| No nesting | Backend: 400 if parent itself has a parent_record_id (depth > 1) |
| Type forced | Backend: if parent_record_id is set, record_type is forced to `follow_up` |
| Parent immutability | An evolution cannot change its parent_record_id after creation |

## 6. Files to Modify

| File | Change |
|---|---|
| `migrations/clinic_070_medical_record_parent_link.sql` | Create — migration |
| `scripts/run-clinic-migrations.js` | Add clinic_070 to list |
| `src/services/clinicProvisioningService.js` | Add clinic_070 to provisioning list |
| `src/models/clinic/MedicalRecord.js` | Add `parent_record_id` field + validation |
| `src/routes/medical-records.js` | Validate parent on create, include `parentRecordId` in responses, load evolutions on GET /:id |
| `src/api/dataTransform.js` | Add `parentRecordId` ↔ `parent_record_id` mapping |
| `src/api/medicalRecordsApi.js` | Pass `parentRecordId` in create payload |
| `src/components/medical/MedicalRecordForm.js` | Filter tabs when `parentRecordId` is set (5 tabs only) |
| `src/components/dashboard/modules/MedicalRecordsModule.js` | Group records by episode, add "+ Évolution" button in list, add button in record header |
| `src/contexts/MedicalRecordContext.js` | Pass through `parentRecordId` in create/update |
| `src/locales/es/medical.json` | Add evolution-related labels |
| `src/locales/fr/medical.json` | Add evolution-related labels |
| `src/locales/en/medical.json` | Add evolution-related labels |
