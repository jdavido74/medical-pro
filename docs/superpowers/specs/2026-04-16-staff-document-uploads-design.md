# Staff Document Uploads — Design Spec

**Date** : 2026-04-16
**Author** : Brainstorming session
**Status** : Ready for implementation plan

## 1. Context & goal

Today, a patient can upload documents (prescriptions, lab results, imaging, etc.) through the pre-consultation workflow: they receive a tokenized link, open the public page `/preconsultation/:token`, and upload files via `DocumentUploadStep`. Files are stored encrypted (AES-256-GCM) at `/var/lib/medimaestro/documents/{clinicId}/{patientId}/{uuid}` off-webroot, then listed and consulted by the medical team through authenticated endpoints.

**Goal** : enable the medical team to upload documents **received from the patient through any other channel** (email, WhatsApp/SMS, physical hand-off, or documents produced internally such as scanned reports) into the same secure pipeline, attached to a medical record.

## 2. In scope

- New staff-facing document upload UI inside `MedicalRecordsModule` (block "Documents" inside the medical record card)
- Batch upload (up to 10 files), with deferred categorization
- Server-side image sanitization via `sharp` (Content Disarm & Reconstruction for JPEG/PNG/WebP)
- New RBAC permission `PATIENT_DOCUMENTS_UPLOAD` (granted to all medical roles)
- Hardened `PATIENT_DOCUMENTS_DELETE` (clinic admin only), converted to soft-delete
- Centralized audit logging (`audit_logs` table) for all document lifecycle events (patient + staff)
- Extension of image sanitization to the existing patient preconsultation upload flow (transverse security win)

## 3. Out of scope (MVP)

- Required metadata at upload time (channel of origin, declared sender, staff attestation checkbox, etc.) — may be added later
- Antivirus integration (e.g. ClamAV) — may be added later for non-image formats
- PDF sanitization (conversion to PDF/A, flattening, etc.)
- Second-staff validation workflow before the document becomes visible
- Automatic patient notification on upload
- Global view of all patient documents (cross medical-record) — list is scoped to the current medical record

## 4. Architecture

### 4.1 Data model

New migration `clinic_XXX_staff_document_uploads.sql` (XXX = next available number in `run-clinic-migrations.js`):

```sql
ALTER TABLE patient_documents
  ADD COLUMN category VARCHAR(30) NULL,
  ADD COLUMN sanitized BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN deleted_at TIMESTAMP NULL,
  ADD COLUMN deleted_by_id UUID NULL,
  ADD COLUMN deletion_reason TEXT NULL;

ALTER TABLE patient_documents
  ADD CONSTRAINT chk_doc_category CHECK (
    category IS NULL OR category IN (
      'prescription','lab_result','imaging','report','certificate',
      'consent','correspondence','identity','insurance','other'
    )
  );

CREATE INDEX idx_patient_documents_category ON patient_documents(category);
-- Partial index complements the existing full index on medical_record_id
-- (accelerates the common "list non-deleted docs" query)
CREATE INDEX idx_patient_documents_medical_record_active
  ON patient_documents(medical_record_id) WHERE deleted_at IS NULL;
```

Migration added to **both** lists:
- `run-clinic-migrations.js` `NEW_MIGRATIONS` (for existing clinics)
- `clinicProvisioningService.js` hardcoded list (for new clinics)

Columns are nullable / default-safe, so the migration is backward compatible with the current patient preconsultation flow.

### 4.2 Permissions

- `PATIENT_DOCUMENTS_UPLOAD` (**new**) — granted to `clinic_admin`, `physician`, `nurse`, `assistant`, `receptionist`.
- `PATIENT_DOCUMENTS_DELETE` (**hardened**) — restricted to `clinic_admin` only (was presumably broader).
- `PATIENT_DOCUMENTS_CATEGORIZE` (**new**) — same scope as UPLOAD.
- `PATIENT_DOCUMENTS_VIEW` — unchanged for now; to be narrowed later under DPIA A13 (care team).

### 4.3 API endpoints

Authenticated routes under `src/routes/patientDocuments.js`:

- `POST /patient-documents/patients/:patientId/documents`
  Multipart body with 1..N files + body field `medicalRecordId`. Requires `PATIENT_DOCUMENTS_UPLOAD`. Returns `{ documents: [{ id, originalFilename, size, mimeType, sanitized, category: null }, ...] }`.

- `PATCH /patient-documents/patients/:patientId/documents/:docId`
  Body `{ category: '<enum>' }`. Requires `PATIENT_DOCUMENTS_CATEGORIZE`.

- `DELETE /patient-documents/patients/:patientId/documents/:docId`
  Body `{ reason: '<text>' }` (required). Requires `PATIENT_DOCUMENTS_DELETE`. Soft-deletes (sets `deleted_at`, `deleted_by_id`, `deletion_reason`). Encrypted file stays on disk until `retention_expires_at` (15 years).

- `GET /patient-documents/patients/:patientId/documents`
  Filters `deleted_at IS NULL` by default (unless admin requests `includeDeleted=true`). Existing query can accept `medicalRecordId` filter.

- `GET /patient-documents/patients/:patientId/documents/:docId/file` — unchanged (decrypts + streams).

### 4.4 Security layers

Layered defenses on the upload pipeline (in order):

1. **Authentication + tenant isolation** (existing middleware)
2. **RBAC check** `PATIENT_DOCUMENTS_UPLOAD`
3. **Patient & medical-record ownership** check (belongs to current clinic)
4. **MIME whitelist** (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`) — reused from existing `fileStorageService.js`
5. **Magic-bytes verification** via `file-type` (reused)
6. **Size limit** 10 MB/file (reused)
7. **Image sanitization** (new, see §4.5)
8. **AES-256-GCM encryption at rest** (reused, key from env `DOCUMENTS_ENCRYPTION_KEY`)
9. **Off-webroot storage** `/var/lib/medimaestro/documents/{clinicId}/{patientId}/{uuid}` with perms 0600/0700 (reused)
10. **Rate limiting** — 20 uploads/min per authenticated user (vs 5/min/IP on public patient endpoint)
11. **Centralized audit logging** (see §4.6)

### 4.5 Image sanitization service

New `medical-pro-backend/src/services/imageSanitizer.js`:

```js
sanitize(buffer, mimeType)
  → if mimeType ∈ { image/jpeg, image/png, image/webp }:
      decode + re-encode via sharp (JPEG q85, PNG compression 6, strip EXIF/ancillary chunks)
      return { buffer: sanitized, sanitized: true }
  → if mimeType is another whitelisted format (pdf/doc/xls):
      return { buffer: original, sanitized: false }
  → if sharp throws (corrupted / malformed image):
      reject with HTTP 400 "invalid image"
```

Wired into `fileStorageService.saveFile()` via a new option `{ sanitize: true }` so the same pipeline is reusable. The staff upload route passes `sanitize: true` always; the patient preconsultation route (`public-preconsultation.js`) is also updated to pass `sanitize: true`.

### 4.6 Audit events

New `AUDIT_EVENTS` entries in `auditService.js`:

- `DOCUMENT_UPLOADED_BY_STAFF`
- `DOCUMENT_UPLOADED_BY_PATIENT` (fills the existing gap for the preconsultation flow)
- `DOCUMENT_VIEWED` (replaces `logger.info` calls in `patientDocuments.js`)
- `DOCUMENT_DOWNLOADED` (distinct from view: explicit download action)
- `DOCUMENT_CATEGORIZED`
- `DOCUMENT_DELETED`

Each entry in `audit_logs` carries `resource_type='patient_document'`, `resource_id=<doc id>`, `changes` JSONB with relevant payload (filename, mime type, size, medicalRecordId, category before/after, deletion reason, sanitized flag).

## 5. Frontend

Location: `src/components/dashboard/medical-records/` (create directory if absent, otherwise co-locate with existing medical-records components).

### 5.1 `DocumentsBlock.js`

- Integrated inside the medical record card (after the treatment-plan section, exact position adjusted in code review)
- Props: `patientId`, `medicalRecordId`
- Header: title "Documents" + total count + `[+ Déposer]` button (visible if `PATIENT_DOCUMENTS_UPLOAD`)
- List: filtered on `medical_record_id` = current, sorted by date DESC
- Row columns: category icon · original filename · size · category label (or `⚠️ À catégoriser` badge if NULL) · source badge (`🧑 Patient` / `👨‍⚕️ Staff`) · upload date · uploader name · actions
- Row actions: `[👁 Voir]` (open in new tab via blob URL; triggers `DOCUMENT_VIEWED`), `[⬇ Télécharger]` (triggers `DOCUMENT_DOWNLOADED`), `[🗑 Supprimer]` (admin only)
- Click on `À catégoriser` badge → opens `DocumentCategorizationModal` in single-doc mode

### 5.2 `StaffDocumentUploadModal.js`

- Reuses UX of `DocumentUploadStep.js` (drag-drop + file input + mobile camera capture)
- Pre-upload: list of selected files with name, size, MIME icon, remove button
- Upload button `[Uploader N fichier(s)]` → POST multipart to backend
- During upload: per-file progress bar, modal close disabled
- On success: transitions to `DocumentCategorizationModal` (batch mode) with the returned document IDs
- On per-file failure (e.g., image corrupted rejected by sanitizer): displays inline error next to the failing file, other successful files proceed to categorization

### 5.3 `DocumentCategorizationModal.js`

- Two modes: **batch** (post-upload, N documents) or **single** (from clicking the `À catégoriser` badge)
- List of documents, each with a dropdown of 10 categories (i18n-labeled)
- Buttons: `[Enregistrer]` (PATCH each document with its chosen category) · `[Plus tard]` (closes modal; documents remain `À catégoriser` and editable later)
- Each successful PATCH triggers `DOCUMENT_CATEGORIZED` in `audit_logs`

### 5.4 `DocumentDeleteModal.js`

- Admin-only confirmation
- Required text field "Motif de suppression" (maps to `deletion_reason`)
- Warning message: "Le document reste archivé 15 ans pour traçabilité"
- Submit → DELETE endpoint (soft-delete)

### 5.5 API client

Extend or create `src/api/patientDocumentsApi.js`:

- `uploadDocuments(patientId, files, medicalRecordId)` — FormData, multi-files
- `listDocuments(patientId, { medicalRecordId, includeDeleted=false })`
- `updateDocumentCategory(patientId, docId, category)`
- `viewDocument(patientId, docId)` — returns blob
- `downloadDocument(patientId, docId)` — triggers download with original filename
- `deleteDocument(patientId, docId, reason)`

### 5.6 i18n

Keys under `medicalRecords.documents.*` in existing `fr/es/en` locale files (namespace to be confirmed with conventions — likely `planning.json` or a new `documents.json`). Minimum keys:

- `documents.title`, `documents.empty`, `documents.upload`, `documents.uploader.patient`, `documents.uploader.staff`
- `documents.category.*` for the 10 categories
- `documents.actions.view / download / delete / categorize`
- `documents.badges.toCategorize`
- `documents.deleteModal.reason / warning / confirm`

## 6. Testing

### 6.1 Backend

- `imageSanitizer.test.js` — EXIF strip on JPEG, ancillary-chunk strip on PNG, corrupted image rejected with 400
- `patientDocumentsRoutes.test.js`
  - Upload success (multi-file), verifies `audit_logs` insertion and `sanitized` flag on DB rows
  - 403 without `PATIENT_DOCUMENTS_UPLOAD`
  - 413 on file > 10 MB
  - 400 on non-whitelisted MIME
  - Tenant isolation (clinic A cannot upload to clinic B's patient)
  - Soft delete keeps the encrypted file on disk; DB row has `deleted_at` set
  - PATCH category creates `DOCUMENT_CATEGORIZED` audit entry
  - GET list excludes soft-deleted by default

### 6.2 Frontend

- `DocumentsBlock.test.js` — renders filtered list, `À catégoriser` badge on NULL category, Delete button hidden if not admin
- `StaffDocumentUploadModal.test.js` — drag-drop handles multi-file, 10-file cap, progress, transition to categorization
- `DocumentCategorizationModal.test.js` — "Plus tard" closes without PATCH, "Enregistrer" dispatches one PATCH per doc

### 6.3 Manual verification (prod)

After deploy: upload a document from the medical record → verify `audit_logs` row created → verify encrypted file present on disk with UUID name and perms 0600.

## 7. Rollout

1. Backend migration + routes + audit events → merge & deploy (endpoints live, unused by UI yet)
2. Frontend components → merge & deploy via CI/CD push master
3. Manual prod test
4. Monitor `audit_logs` volume; no regression on patient preconsultation flow

Rollback path: revert frontend commits; backend commits safe to leave (new routes unused if UI reverted). Migration is additive (all columns nullable/default), no downgrade script required.

## 8. Open points (to resolve in implementation plan)

- Exact migration number (`clinic_067_` or next available — check in code)
- Exact insertion point of `<DocumentsBlock>` in `MedicalRecordsModule` (pick after treatment-plan section, adjust visually)
- Batch upload failure strategy (per-file rollback vs partial success) — current proposal: partial success with per-file error reporting in UI
- i18n namespace selection (`planning.json` vs new `documents.json`) — match existing conventions in code
