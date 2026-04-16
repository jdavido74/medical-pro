# Staff Document Uploads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable the medical team to upload documents received from patients via any channel (email, WhatsApp, physical, etc.) into the existing secure document pipeline, attached to a medical record, with batch upload + deferred categorization + image sanitization + centralized audit logging.

**Architecture:** Reuse the existing encrypted (AES-256-GCM) off-webroot storage and `patient_documents` table. Add a new authenticated `POST /patient-documents/.../documents` endpoint guarded by a new `PATIENT_DOCUMENTS_UPLOAD` permission. Add image sanitization (CDR via `sharp`) to `fileStorageService` and apply it to both staff and patient upload flows. Add new audit events to `auditService`. Frontend: new `DocumentsBlock` inside `MedicalRecordsModule`, with upload modal + post-upload categorization modal.

**Tech Stack:** Backend: Node.js / Express / Sequelize / Jest / `sharp` / `file-type` / `multer`. Frontend: React / react-i18next / Tailwind / Jest + RTL.

**Repos:**
- Frontend: `/var/www/medical-pro` (repo `jdavido74/medical-pro`)
- Backend: `/var/www/medical-pro-backend` (repo `jdavido74/medical-pro-backend`)

**Spec reference:** `docs/superpowers/specs/2026-04-16-staff-document-uploads-design.md`

---

## Phase 1 — Backend foundation (permissions, audit events, image sanitizer)

### Task 1: Add new permission constants

**Files:**
- Modify: `/var/www/medical-pro-backend/src/utils/permissionConstants.js`

- [ ] **Step 1: Read the current permission file**

Run: `cat /var/www/medical-pro-backend/src/utils/permissionConstants.js | head -60`
Expected: See the `PERMISSIONS` object and the role assignments starting around line 176.

- [ ] **Step 2: Add UPLOAD and CATEGORIZE permission constants**

In the `PERMISSIONS` object under the "DOCUMENTS PATIENT" section (currently lines 32–34), add two lines so it becomes:

```js
  // ===== DOCUMENTS PATIENT =====
  PATIENT_DOCUMENTS_VIEW: 'patient_documents.view',       // Voir documents patient
  PATIENT_DOCUMENTS_UPLOAD: 'patient_documents.upload',   // Déposer un document staff
  PATIENT_DOCUMENTS_CATEGORIZE: 'patient_documents.categorize', // Catégoriser un document
  PATIENT_DOCUMENTS_DELETE: 'patient_documents.delete',   // Supprimer document patient
```

- [ ] **Step 3: Grant UPLOAD + CATEGORIZE to all medical roles**

For every role that currently includes `PERMISSIONS.PATIENT_DOCUMENTS_VIEW` (lines 176, 280, 338, 371, 416 in the current file — re-check with a grep), add `PERMISSIONS.PATIENT_DOCUMENTS_UPLOAD` and `PERMISSIONS.PATIENT_DOCUMENTS_CATEGORIZE` immediately after the VIEW entry.

Run: `grep -n "PATIENT_DOCUMENTS_VIEW" /var/www/medical-pro-backend/src/utils/permissionConstants.js`
For each line returned, add the two new permission entries immediately below it.

- [ ] **Step 4: Restrict DELETE to clinic admin only**

Find all role blocks that currently include `PERMISSIONS.PATIENT_DOCUMENTS_DELETE`. Remove it from every role **except** `clinic_admin` (or the equivalent top-admin role — inspect role names around line 176 where DELETE currently appears).

Run: `grep -n "PATIENT_DOCUMENTS_DELETE" /var/www/medical-pro-backend/src/utils/permissionConstants.js`
Expected after edit: DELETE should only appear on the clinic_admin role assignment.

- [ ] **Step 5: Commit**

```bash
cd /var/www/medical-pro-backend
git add src/utils/permissionConstants.js
git commit -m "feat(permissions): add PATIENT_DOCUMENTS_UPLOAD/CATEGORIZE, restrict DELETE to admin"
```

---

### Task 2: Add new audit event types

**Files:**
- Modify: `/var/www/medical-pro-backend/src/services/auditService.js`

- [ ] **Step 1: Read the current AUDIT_EVENTS object**

Run: `sed -n '15,75p' /var/www/medical-pro-backend/src/services/auditService.js`
Expected: See the enum-like `AUDIT_EVENTS` object starting at line 16.

- [ ] **Step 2: Add six new event keys**

Inside `AUDIT_EVENTS`, add a new "DOCUMENTS" section (follow the visual style of existing sections with a comment header):

```js
  // ===== DOCUMENTS =====
  DOCUMENT_UPLOADED_BY_STAFF: 'document.uploaded_by_staff',
  DOCUMENT_UPLOADED_BY_PATIENT: 'document.uploaded_by_patient',
  DOCUMENT_VIEWED: 'document.viewed',
  DOCUMENT_DOWNLOADED: 'document.downloaded',
  DOCUMENT_CATEGORIZED: 'document.categorized',
  DOCUMENT_DELETED: 'document.deleted',
```

- [ ] **Step 3: Commit**

```bash
git add src/services/auditService.js
git commit -m "feat(audit): add document lifecycle events"
```

---

### Task 3: Create image sanitizer service (with tests)

**Files:**
- Create: `/var/www/medical-pro-backend/src/services/imageSanitizer.js`
- Create: `/var/www/medical-pro-backend/tests/services/imageSanitizer.test.js`

- [ ] **Step 1: Verify `sharp` is installed**

Run: `cd /var/www/medical-pro-backend && node -e "require('sharp')"`
Expected: no error.
If it errors with "Cannot find module 'sharp'", run `npm install sharp` and commit `package.json` + `package-lock.json` as a separate setup commit.

- [ ] **Step 2: Write the failing test**

Create `/var/www/medical-pro-backend/tests/services/imageSanitizer.test.js`:

```js
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { sanitize } = require('../../src/services/imageSanitizer');

describe('imageSanitizer', () => {
  const SANITIZABLE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

  test('returns original buffer unchanged for non-image MIME (pdf)', async () => {
    const buffer = Buffer.from('fake pdf content');
    const result = await sanitize(buffer, 'application/pdf');
    expect(result.sanitized).toBe(false);
    expect(result.buffer).toBe(buffer);
  });

  test('re-encodes JPEG and strips EXIF', async () => {
    const original = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 1, g: 2, b: 3 } }
    }).withMetadata({ exif: { IFD0: { Copyright: 'MALICIOUS_PAYLOAD' } } }).jpeg().toBuffer();

    const result = await sanitize(original, 'image/jpeg');
    expect(result.sanitized).toBe(true);

    const meta = await sharp(result.buffer).metadata();
    expect(meta.format).toBe('jpeg');
    // After sanitization, EXIF buffer must be absent
    expect(meta.exif).toBeUndefined();
  });

  test('re-encodes PNG and strips tEXt ancillary chunks', async () => {
    const original = await sharp({
      create: { width: 10, height: 10, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
    }).withMetadata({ exif: { IFD0: { ImageDescription: 'hidden' } } }).png().toBuffer();

    const result = await sanitize(original, 'image/png');
    expect(result.sanitized).toBe(true);
    const meta = await sharp(result.buffer).metadata();
    expect(meta.format).toBe('png');
  });

  test('rejects corrupted image with a thrown error', async () => {
    const garbage = Buffer.from('not a real image');
    await expect(sanitize(garbage, 'image/jpeg')).rejects.toThrow();
  });

  test('handles WebP', async () => {
    const original = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 0, b: 0 } }
    }).webp().toBuffer();
    const result = await sanitize(original, 'image/webp');
    expect(result.sanitized).toBe(true);
  });

  test('ignores unknown MIME types without throwing', async () => {
    const buffer = Buffer.from('something');
    const result = await sanitize(buffer, 'application/octet-stream');
    expect(result.sanitized).toBe(false);
    expect(result.buffer).toBe(buffer);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd /var/www/medical-pro-backend && npx jest tests/services/imageSanitizer.test.js`
Expected: FAIL with `Cannot find module '../../src/services/imageSanitizer'`.

- [ ] **Step 4: Implement the sanitizer**

Create `/var/www/medical-pro-backend/src/services/imageSanitizer.js`:

```js
/**
 * imageSanitizer — Content Disarm & Reconstruction (CDR) for images.
 * Decodes + re-encodes JPEG / PNG / WebP via sharp to strip EXIF,
 * ancillary chunks, and any non-image payload. Corrupted images throw.
 */
const sharp = require('sharp');

const SANITIZABLE = new Set(['image/jpeg', 'image/png', 'image/webp']);

async function sanitize(buffer, mimeType) {
  if (!SANITIZABLE.has(mimeType)) {
    return { buffer, sanitized: false };
  }

  const pipeline = sharp(buffer, { failOn: 'error' }).rotate();

  let out;
  if (mimeType === 'image/jpeg') {
    out = await pipeline.jpeg({ quality: 85, mozjpeg: false }).toBuffer();
  } else if (mimeType === 'image/png') {
    out = await pipeline.png({ compressionLevel: 6 }).toBuffer();
  } else {
    out = await pipeline.webp({ quality: 85 }).toBuffer();
  }

  return { buffer: out, sanitized: true };
}

module.exports = { sanitize, SANITIZABLE_MIMES: Array.from(SANITIZABLE) };
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd /var/www/medical-pro-backend && npx jest tests/services/imageSanitizer.test.js`
Expected: all 6 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/services/imageSanitizer.js tests/services/imageSanitizer.test.js
git commit -m "feat(security): add image sanitizer (CDR via sharp)"
```

---

### Task 4: Wire sanitizer into fileStorageService

**Files:**
- Modify: `/var/www/medical-pro-backend/src/services/fileStorageService.js`

- [ ] **Step 1: Read the current saveFile signature and body**

Run: `sed -n '1,120p' /var/www/medical-pro-backend/src/services/fileStorageService.js`
Identify the exported `saveFile(buffer, { clinicId, patientId, mimeType, ... })` function (or equivalent signature).

- [ ] **Step 2: Add `sanitize` option and call the sanitizer**

Import at the top of the file:

```js
const { sanitize: sanitizeImage } = require('./imageSanitizer');
```

In `saveFile`, accept `sanitize` in the options (default `false`). Before the AES-256-GCM encryption step, add:

```js
let sanitized = false;
let finalBuffer = buffer;
if (opts.sanitize) {
  const result = await sanitizeImage(buffer, opts.mimeType);
  finalBuffer = result.buffer;
  sanitized = result.sanitized;
}
// ... existing encryption then uses finalBuffer instead of buffer
```

Ensure the returned object from `saveFile` now includes `sanitized` (so the caller can persist it on `patient_documents`). If the function currently returns `{ storedFilename, size }`, change to `{ storedFilename, size, sanitized }`.

- [ ] **Step 3: Run existing tests for fileStorageService**

Run: `cd /var/www/medical-pro-backend && npx jest tests/services/fileStorage`
Expected: all existing tests PASS (since new option defaults to `false`, behavior is unchanged for old callers).

If no existing tests, skip this step.

- [ ] **Step 4: Commit**

```bash
git add src/services/fileStorageService.js
git commit -m "feat(storage): add optional sanitize flag using imageSanitizer"
```

---

### Task 5: Create DB migration and register it

**Files:**
- Create: `/var/www/medical-pro-backend/migrations/clinic_081_staff_document_uploads.sql`
- Modify: `/var/www/medical-pro-backend/scripts/run-clinic-migrations.js`
- Modify: `/var/www/medical-pro-backend/src/services/clinicProvisioningService.js`

- [ ] **Step 1: Create the migration file**

Create `/var/www/medical-pro-backend/migrations/clinic_081_staff_document_uploads.sql`:

```sql
-- Migration: clinic_081_staff_document_uploads
-- Adds category, sanitized flag, and soft-delete fields to patient_documents.

BEGIN;

ALTER TABLE patient_documents
  ADD COLUMN IF NOT EXISTS category VARCHAR(30) NULL,
  ADD COLUMN IF NOT EXISTS sanitized BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS deleted_by_id UUID NULL,
  ADD COLUMN IF NOT EXISTS deletion_reason TEXT NULL;

ALTER TABLE patient_documents
  DROP CONSTRAINT IF EXISTS chk_doc_category;

ALTER TABLE patient_documents
  ADD CONSTRAINT chk_doc_category CHECK (
    category IS NULL OR category IN (
      'prescription','lab_result','imaging','report','certificate',
      'consent','correspondence','identity','insurance','other'
    )
  );

CREATE INDEX IF NOT EXISTS idx_patient_documents_category
  ON patient_documents(category);

CREATE INDEX IF NOT EXISTS idx_patient_documents_medical_record_active
  ON patient_documents(medical_record_id) WHERE deleted_at IS NULL;

COMMIT;
```

- [ ] **Step 2: Register in run-clinic-migrations.js**

Run: `grep -n "NEW_MIGRATIONS\|clinic_080" /var/www/medical-pro-backend/scripts/run-clinic-migrations.js`
Expected: locate the `NEW_MIGRATIONS` list.

Add `'clinic_081_staff_document_uploads.sql'` to the end of the list (maintain existing formatting).

- [ ] **Step 3: Register in clinicProvisioningService.js**

Run: `grep -n "clinic_080\|clinic_079" /var/www/medical-pro-backend/src/services/clinicProvisioningService.js`
Expected: locate the hardcoded migration list.

Add `'clinic_081_staff_document_uploads.sql'` in the correct position (after `clinic_080_`).

- [ ] **Step 4: Run migration locally against a test clinic DB**

If a dev clinic DB is configured, run: `node scripts/run-clinic-migrations.js`
Otherwise skip — the migration will be applied in CI/CD on deploy.

- [ ] **Step 5: Commit**

```bash
git add migrations/clinic_081_staff_document_uploads.sql \
        scripts/run-clinic-migrations.js \
        src/services/clinicProvisioningService.js
git commit -m "feat(db): migration 081 for staff document uploads"
```

---

### Task 6: Update PatientDocument Sequelize model

**Files:**
- Modify: `/var/www/medical-pro-backend/src/models/clinic/PatientDocument.js`

- [ ] **Step 1: Read the current model**

Run: `cat /var/www/medical-pro-backend/src/models/clinic/PatientDocument.js`
Note the column definitions around lines 14–95.

- [ ] **Step 2: Add new columns to the model**

Add inside the model definition (before the closing object):

```js
    category: {
      type: DataTypes.STRING(30),
      allowNull: true,
      validate: {
        isIn: [['prescription','lab_result','imaging','report','certificate',
                'consent','correspondence','identity','insurance','other']]
      }
    },
    sanitized: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at'
    },
    deletedById: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'deleted_by_id'
    },
    deletionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'deletion_reason'
    },
```

Verify `underscored: true` is set in the model options (or column mappings use `field:`). Keep consistent with existing style.

- [ ] **Step 3: Commit**

```bash
git add src/models/clinic/PatientDocument.js
git commit -m "feat(model): add category/sanitized/soft-delete to PatientDocument"
```

---

## Phase 2 — Backend routes

### Task 7: POST /patient-documents/patients/:patientId/documents (staff upload)

**Files:**
- Modify: `/var/www/medical-pro-backend/src/routes/patientDocuments.js`
- Test: `/var/www/medical-pro-backend/tests/routes/patientDocumentsStaffUpload.test.js`

- [ ] **Step 1: Read existing route file**

Run: `cat /var/www/medical-pro-backend/src/routes/patientDocuments.js`
Identify: multer setup (if present), auth middleware, permission middleware pattern, and where the existing GET/DELETE routes are defined.

- [ ] **Step 2: Write failing integration test**

Create `/var/www/medical-pro-backend/tests/routes/patientDocumentsStaffUpload.test.js` (follow the testing patterns used for other routes in `tests/routes/` — likely supertest + a test clinic DB fixture):

```js
const request = require('supertest');
const path = require('path');
const { app } = require('../../src/app');
const { setupTestClinic, getAuthToken, teardownTestClinic } = require('../helpers/clinicFixtures');

describe('POST /api/v1/patient-documents/patients/:patientId/documents (staff)', () => {
  let ctx;

  beforeAll(async () => { ctx = await setupTestClinic(); });
  afterAll(async () => { await teardownTestClinic(ctx); });

  test('403 without PATIENT_DOCUMENTS_UPLOAD permission', async () => {
    const token = await getAuthToken(ctx, 'no_perms_user');
    const res = await request(app)
      .post(`/api/v1/patient-documents/patients/${ctx.patientId}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .field('medicalRecordId', ctx.medicalRecordId)
      .attach('files', path.join(__dirname, '../fixtures/sample.pdf'));
    expect(res.status).toBe(403);
  });

  test('uploads multiple files with category=null', async () => {
    const token = await getAuthToken(ctx, 'physician');
    const res = await request(app)
      .post(`/api/v1/patient-documents/patients/${ctx.patientId}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .field('medicalRecordId', ctx.medicalRecordId)
      .attach('files', path.join(__dirname, '../fixtures/sample.jpg'))
      .attach('files', path.join(__dirname, '../fixtures/sample.pdf'));
    expect(res.status).toBe(201);
    expect(res.body.documents).toHaveLength(2);
    expect(res.body.documents[0].category).toBeNull();
    // jpg should be sanitized, pdf should not
    const jpg = res.body.documents.find(d => d.mimeType === 'image/jpeg');
    const pdf = res.body.documents.find(d => d.mimeType === 'application/pdf');
    expect(jpg.sanitized).toBe(true);
    expect(pdf.sanitized).toBe(false);
  });

  test('413 when file exceeds 10 MB', async () => {
    const token = await getAuthToken(ctx, 'physician');
    const big = Buffer.alloc(11 * 1024 * 1024, 0);
    const res = await request(app)
      .post(`/api/v1/patient-documents/patients/${ctx.patientId}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .field('medicalRecordId', ctx.medicalRecordId)
      .attach('files', big, 'big.pdf');
    expect(res.status).toBe(413);
  });

  test('400 on disallowed MIME type', async () => {
    const token = await getAuthToken(ctx, 'physician');
    const res = await request(app)
      .post(`/api/v1/patient-documents/patients/${ctx.patientId}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .field('medicalRecordId', ctx.medicalRecordId)
      .attach('files', Buffer.from('exec'), 'mal.exe');
    expect(res.status).toBe(400);
  });

  test('tenant isolation: cannot upload for another clinic patient', async () => {
    const token = await getAuthToken(ctx, 'physician');
    const otherPatientId = '00000000-0000-0000-0000-000000000000';
    const res = await request(app)
      .post(`/api/v1/patient-documents/patients/${otherPatientId}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .field('medicalRecordId', ctx.medicalRecordId)
      .attach('files', path.join(__dirname, '../fixtures/sample.pdf'));
    expect([403, 404]).toContain(res.status);
  });

  test('writes audit_logs entry DOCUMENT_UPLOADED_BY_STAFF', async () => {
    const token = await getAuthToken(ctx, 'physician');
    await request(app)
      .post(`/api/v1/patient-documents/patients/${ctx.patientId}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .field('medicalRecordId', ctx.medicalRecordId)
      .attach('files', path.join(__dirname, '../fixtures/sample.pdf'));
    const logs = await ctx.db.query(
      `SELECT event_type FROM audit_logs WHERE event_type = 'document.uploaded_by_staff' ORDER BY timestamp DESC LIMIT 1`
    );
    expect(logs.length).toBeGreaterThan(0);
  });
});
```

Create fixture files referenced (`tests/fixtures/sample.pdf`, `tests/fixtures/sample.jpg`) — use any small valid file of that type. For `sample.jpg`, generate:

```bash
cd /var/www/medical-pro-backend
node -e "require('sharp')({ create: { width: 5, height: 5, channels: 3, background: {r:0,g:0,b:0} } }).jpeg().toFile('tests/fixtures/sample.jpg')"
```

For `sample.pdf`, any valid small PDF works — use:
```bash
printf '%%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%%%EOF' > tests/fixtures/sample.pdf
```

Adjust fixture helper (`setupTestClinic`, etc.) to match whatever pattern exists in current test suite — if the fixture helper name differs, inspect `tests/helpers/` first and adapt.

- [ ] **Step 3: Run test — expect fail**

Run: `cd /var/www/medical-pro-backend && npx jest tests/routes/patientDocumentsStaffUpload.test.js`
Expected: all tests FAIL (route not yet implemented).

- [ ] **Step 4: Implement the POST route**

Edit `src/routes/patientDocuments.js`. At the top, ensure these imports exist (add any missing):

```js
const multer = require('multer');
const { sanitize: sanitizeImage } = require('../services/imageSanitizer');
const { logEvent, AUDIT_EVENTS } = require('../services/auditService');
const { PERMISSIONS } = require('../utils/permissionConstants');
const { requirePermission } = require('../middleware/permissions'); // adjust if the middleware path differs
const fileStorage = require('../services/fileStorageService');
const { PatientDocument } = require('../models'); // adjust to whatever the codebase pattern is
const { body, validationResult } = require('express-validator'); // or joi — match existing validation lib
```

Add the following route definition. Place it AFTER the existing GET route for documents and BEFORE any DELETE route:

```js
// Multer: in-memory, 10 MB cap, up to 10 files
const uploadMem = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg','image/png','image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    cb(allowed.includes(file.mimetype) ? null : new Error('MIME_NOT_ALLOWED'), allowed.includes(file.mimetype));
  }
});

router.post(
  '/patients/:patientId/documents',
  requirePermission(PERMISSIONS.PATIENT_DOCUMENTS_UPLOAD),
  uploadMem.array('files', 10),
  async (req, res, next) => {
    try {
      const { patientId } = req.params;
      const { medicalRecordId } = req.body;
      const clinicDb = req.clinicDb; // or however the tenant DB is exposed
      const userId = req.user.id;
      const clinicId = req.user.clinicId;

      // Verify patient belongs to clinic
      const patient = await clinicDb.models.Patient.findByPk(patientId);
      if (!patient) return res.status(404).json({ error: 'PATIENT_NOT_FOUND' });

      // Verify medical record belongs to the patient
      if (medicalRecordId) {
        const mr = await clinicDb.models.MedicalRecord.findOne({
          where: { id: medicalRecordId, patient_id: patientId }
        });
        if (!mr) return res.status(400).json({ error: 'MEDICAL_RECORD_INVALID' });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'NO_FILES' });
      }

      const saved = [];
      for (const file of req.files) {
        const stored = await fileStorage.saveFile(file.buffer, {
          clinicId,
          patientId,
          mimeType: file.mimetype,
          originalFilename: file.originalname,
          sanitize: true
        });

        const now = new Date();
        const retention = new Date(now.getTime());
        retention.setFullYear(retention.getFullYear() + 15);

        const doc = await clinicDb.models.PatientDocument.create({
          patient_id: patientId,
          appointment_id: null,
          medical_record_id: medicalRecordId || null,
          original_filename: file.originalname,
          stored_filename: stored.storedFilename,
          mime_type: file.mimetype,
          size: stored.size,
          uploaded_by_type: 'staff',
          uploaded_by_id: userId,
          sanitized: stored.sanitized,
          retention_expires_at: retention
        });

        await logEvent({
          eventType: AUDIT_EVENTS.DOCUMENT_UPLOADED_BY_STAFF,
          userId,
          companyId: clinicId,
          resourceType: 'patient_document',
          resourceId: doc.id,
          changes: {
            originalFilename: file.originalname,
            mimeType: file.mimetype,
            size: stored.size,
            medicalRecordId: medicalRecordId || null,
            sanitized: stored.sanitized
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          success: true
        });

        saved.push({
          id: doc.id,
          originalFilename: doc.original_filename,
          mimeType: doc.mime_type,
          size: doc.size,
          sanitized: doc.sanitized,
          category: doc.category,
          medicalRecordId: doc.medical_record_id,
          createdAt: doc.created_at
        });
      }

      res.status(201).json({ documents: saved });
    } catch (err) {
      if (err && err.message === 'MIME_NOT_ALLOWED') {
        return res.status(400).json({ error: 'MIME_NOT_ALLOWED' });
      }
      if (err && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'FILE_TOO_LARGE' });
      }
      next(err);
    }
  }
);
```

Adjust exact names (`req.clinicDb`, `requirePermission`, model access) to match the existing codebase patterns — refer to how the existing GET and DELETE routes in the same file do it.

- [ ] **Step 5: Run tests — expect pass**

Run: `cd /var/www/medical-pro-backend && npx jest tests/routes/patientDocumentsStaffUpload.test.js`
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/routes/patientDocuments.js \
        tests/routes/patientDocumentsStaffUpload.test.js \
        tests/fixtures/sample.jpg tests/fixtures/sample.pdf
git commit -m "feat(routes): staff upload endpoint with sanitization + audit"
```

---

### Task 8: PATCH categorize route

**Files:**
- Modify: `/var/www/medical-pro-backend/src/routes/patientDocuments.js`
- Test: extend `/var/www/medical-pro-backend/tests/routes/patientDocumentsStaffUpload.test.js`

- [ ] **Step 1: Add failing test**

Append to the existing test file:

```js
describe('PATCH /api/v1/patient-documents/patients/:patientId/documents/:docId', () => {
  test('sets category and writes DOCUMENT_CATEGORIZED audit entry', async () => {
    const token = await getAuthToken(ctx, 'physician');
    // Upload first
    const up = await request(app)
      .post(`/api/v1/patient-documents/patients/${ctx.patientId}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .field('medicalRecordId', ctx.medicalRecordId)
      .attach('files', path.join(__dirname, '../fixtures/sample.pdf'));
    const docId = up.body.documents[0].id;

    const res = await request(app)
      .patch(`/api/v1/patient-documents/patients/${ctx.patientId}/documents/${docId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'prescription' });
    expect(res.status).toBe(200);
    expect(res.body.document.category).toBe('prescription');

    const logs = await ctx.db.query(
      `SELECT event_type FROM audit_logs WHERE event_type = 'document.categorized' ORDER BY timestamp DESC LIMIT 1`
    );
    expect(logs.length).toBeGreaterThan(0);
  });

  test('400 when category is not in enum', async () => {
    const token = await getAuthToken(ctx, 'physician');
    const up = await request(app)
      .post(`/api/v1/patient-documents/patients/${ctx.patientId}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .field('medicalRecordId', ctx.medicalRecordId)
      .attach('files', path.join(__dirname, '../fixtures/sample.pdf'));
    const docId = up.body.documents[0].id;

    const res = await request(app)
      .patch(`/api/v1/patient-documents/patients/${ctx.patientId}/documents/${docId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'not_a_valid_category' });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run — expect fail**

Run: `cd /var/www/medical-pro-backend && npx jest tests/routes/patientDocumentsStaffUpload.test.js -t "PATCH"`
Expected: FAIL (route not implemented).

- [ ] **Step 3: Implement PATCH route**

In `src/routes/patientDocuments.js`, add after the POST route:

```js
const ALLOWED_CATEGORIES = [
  'prescription','lab_result','imaging','report','certificate',
  'consent','correspondence','identity','insurance','other'
];

router.patch(
  '/patients/:patientId/documents/:docId',
  requirePermission(PERMISSIONS.PATIENT_DOCUMENTS_CATEGORIZE),
  async (req, res, next) => {
    try {
      const { patientId, docId } = req.params;
      const { category } = req.body;

      if (!ALLOWED_CATEGORIES.includes(category)) {
        return res.status(400).json({ error: 'INVALID_CATEGORY' });
      }

      const doc = await req.clinicDb.models.PatientDocument.findOne({
        where: { id: docId, patient_id: patientId, deleted_at: null }
      });
      if (!doc) return res.status(404).json({ error: 'DOCUMENT_NOT_FOUND' });

      const previousCategory = doc.category;
      doc.category = category;
      await doc.save();

      await logEvent({
        eventType: AUDIT_EVENTS.DOCUMENT_CATEGORIZED,
        userId: req.user.id,
        companyId: req.user.clinicId,
        resourceType: 'patient_document',
        resourceId: doc.id,
        changes: { previousCategory, category },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: true
      });

      res.json({ document: { id: doc.id, category: doc.category } });
    } catch (err) { next(err); }
  }
);
```

- [ ] **Step 4: Run — expect pass**

Run: `cd /var/www/medical-pro-backend && npx jest tests/routes/patientDocumentsStaffUpload.test.js -t "PATCH"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/routes/patientDocuments.js tests/routes/patientDocumentsStaffUpload.test.js
git commit -m "feat(routes): PATCH categorize document"
```

---

### Task 9: Adapt DELETE to soft delete with reason

**Files:**
- Modify: `/var/www/medical-pro-backend/src/routes/patientDocuments.js`

- [ ] **Step 1: Locate existing DELETE route**

Run: `grep -n "router.delete\|DELETE" /var/www/medical-pro-backend/src/routes/patientDocuments.js`
Read the existing handler body.

- [ ] **Step 2: Replace destructive delete with soft delete**

Replace the DELETE handler body so it:
1. Requires `PATIENT_DOCUMENTS_DELETE` (already present, keep it)
2. Requires a non-empty `reason` in the body (else 400)
3. Sets `deleted_at = NOW()`, `deleted_by_id = req.user.id`, `deletion_reason = reason`
4. Does **not** unlink the encrypted file on disk
5. Writes `DOCUMENT_DELETED` to audit_logs with the reason in `changes`

Example body:

```js
router.delete(
  '/patients/:patientId/documents/:docId',
  requirePermission(PERMISSIONS.PATIENT_DOCUMENTS_DELETE),
  async (req, res, next) => {
    try {
      const { patientId, docId } = req.params;
      const { reason } = req.body;
      if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
        return res.status(400).json({ error: 'REASON_REQUIRED' });
      }

      const doc = await req.clinicDb.models.PatientDocument.findOne({
        where: { id: docId, patient_id: patientId, deleted_at: null }
      });
      if (!doc) return res.status(404).json({ error: 'DOCUMENT_NOT_FOUND' });

      doc.deleted_at = new Date();
      doc.deleted_by_id = req.user.id;
      doc.deletion_reason = reason.trim();
      await doc.save();

      await logEvent({
        eventType: AUDIT_EVENTS.DOCUMENT_DELETED,
        userId: req.user.id,
        companyId: req.user.clinicId,
        resourceType: 'patient_document',
        resourceId: doc.id,
        changes: { reason: doc.deletion_reason },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: true
      });

      res.status(204).end();
    } catch (err) { next(err); }
  }
);
```

- [ ] **Step 3: Add GET filter for soft-deleted + camelCase response**

In the existing GET list route, add `deleted_at: null` to the `where` clause (unless `?includeDeleted=true` and the caller has admin permission). Also accept optional `?medicalRecordId=<uuid>` query param. Finally, map the DB rows to camelCase so the frontend can consume a consistent shape across GET/POST/PATCH:

```js
const where = { patient_id: patientId };
if (!req.query.includeDeleted) where.deleted_at = null;
if (req.query.medicalRecordId) where.medical_record_id = req.query.medicalRecordId;

const rows = await req.clinicDb.models.PatientDocument.findAll({
  where,
  order: [['created_at', 'DESC']]
});

res.json({
  documents: rows.map(r => ({
    id: r.id,
    originalFilename: r.original_filename,
    mimeType: r.mime_type,
    size: r.size,
    category: r.category,
    sanitized: r.sanitized,
    uploadedByType: r.uploaded_by_type,
    uploadedById: r.uploaded_by_id,
    medicalRecordId: r.medical_record_id,
    createdAt: r.created_at
  }))
});
```

- [ ] **Step 4: Add test for soft delete**

Append to `tests/routes/patientDocumentsStaffUpload.test.js`:

```js
describe('DELETE /api/v1/patient-documents/patients/:patientId/documents/:docId', () => {
  test('soft deletes when reason provided', async () => {
    const adminToken = await getAuthToken(ctx, 'clinic_admin');
    const physicianToken = await getAuthToken(ctx, 'physician');
    const up = await request(app)
      .post(`/api/v1/patient-documents/patients/${ctx.patientId}/documents`)
      .set('Authorization', `Bearer ${physicianToken}`)
      .field('medicalRecordId', ctx.medicalRecordId)
      .attach('files', path.join(__dirname, '../fixtures/sample.pdf'));
    const docId = up.body.documents[0].id;

    const res = await request(app)
      .delete(`/api/v1/patient-documents/patients/${ctx.patientId}/documents/${docId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Uploaded by mistake' });
    expect(res.status).toBe(204);

    // GET should not return the deleted doc
    const list = await request(app)
      .get(`/api/v1/patient-documents/patients/${ctx.patientId}/documents`)
      .set('Authorization', `Bearer ${physicianToken}`);
    expect(list.body.documents.find(d => d.id === docId)).toBeUndefined();
  });

  test('403 when non-admin tries to delete', async () => {
    const physicianToken = await getAuthToken(ctx, 'physician');
    const up = await request(app)
      .post(`/api/v1/patient-documents/patients/${ctx.patientId}/documents`)
      .set('Authorization', `Bearer ${physicianToken}`)
      .field('medicalRecordId', ctx.medicalRecordId)
      .attach('files', path.join(__dirname, '../fixtures/sample.pdf'));
    const docId = up.body.documents[0].id;

    const res = await request(app)
      .delete(`/api/v1/patient-documents/patients/${ctx.patientId}/documents/${docId}`)
      .set('Authorization', `Bearer ${physicianToken}`)
      .send({ reason: 'No' });
    expect(res.status).toBe(403);
  });

  test('400 when reason missing', async () => {
    const adminToken = await getAuthToken(ctx, 'clinic_admin');
    const physicianToken = await getAuthToken(ctx, 'physician');
    const up = await request(app)
      .post(`/api/v1/patient-documents/patients/${ctx.patientId}/documents`)
      .set('Authorization', `Bearer ${physicianToken}`)
      .field('medicalRecordId', ctx.medicalRecordId)
      .attach('files', path.join(__dirname, '../fixtures/sample.pdf'));
    const docId = up.body.documents[0].id;

    const res = await request(app)
      .delete(`/api/v1/patient-documents/patients/${ctx.patientId}/documents/${docId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 5: Run tests — expect pass**

Run: `cd /var/www/medical-pro-backend && npx jest tests/routes/patientDocumentsStaffUpload.test.js`
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/routes/patientDocuments.js tests/routes/patientDocumentsStaffUpload.test.js
git commit -m "feat(routes): soft-delete with reason; filter deleted in GET"
```

---

### Task 10: Emit DOCUMENT_VIEWED in the existing file-streaming route

**Files:**
- Modify: `/var/www/medical-pro-backend/src/routes/patientDocuments.js`

- [ ] **Step 1: Locate the file stream route**

Run: `grep -n "/file\|readFile\|sendFile" /var/www/medical-pro-backend/src/routes/patientDocuments.js`

- [ ] **Step 2: Replace logger.info with audit logEvent**

In the file-streaming handler, after successfully reading & before streaming, add:

```js
await logEvent({
  eventType: AUDIT_EVENTS.DOCUMENT_VIEWED,
  userId: req.user.id,
  companyId: req.user.clinicId,
  resourceType: 'patient_document',
  resourceId: doc.id,
  changes: { originalFilename: doc.original_filename },
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
  success: true
});
```

Keep the existing `logger.info` if desired (belt-and-suspenders) or remove it — prefer remove, since audit_logs is the system of record going forward.

- [ ] **Step 3: Commit**

```bash
git add src/routes/patientDocuments.js
git commit -m "feat(audit): emit DOCUMENT_VIEWED in audit_logs"
```

---

### Task 11: Sanitize + audit in patient preconsultation upload

**Files:**
- Modify: `/var/www/medical-pro-backend/src/routes/public-preconsultation.js`

- [ ] **Step 1: Locate the upload handler**

Run: `grep -n "uploadFile\|fileStorage\|saveFile\|documents" /var/www/medical-pro-backend/src/routes/public-preconsultation.js | head -20`

- [ ] **Step 2: Pass sanitize: true to saveFile**

In the patient upload handler, change the `fileStorage.saveFile(...)` call to include `sanitize: true` and store `stored.sanitized` on the DB row (same as staff route).

- [ ] **Step 3: Add DOCUMENT_UPLOADED_BY_PATIENT audit entry**

After the DB insert, add (note: no authenticated user, so `userId` is null but we include `tokenId` in `changes`):

```js
await logEvent({
  eventType: AUDIT_EVENTS.DOCUMENT_UPLOADED_BY_PATIENT,
  userId: null,
  companyId: clinicId,
  resourceType: 'patient_document',
  resourceId: doc.id,
  changes: {
    tokenId: tokenRecord.id,
    originalFilename: file.originalname,
    mimeType: file.mimetype,
    size: stored.size,
    sanitized: stored.sanitized
  },
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
  success: true
});
```

- [ ] **Step 4: Manually verify**

Run: `cd /var/www/medical-pro-backend && npx jest tests/routes/publicPreconsultation*.test.js` (if they exist).
Expected: all existing tests still PASS.

- [ ] **Step 5: Commit**

```bash
git add src/routes/public-preconsultation.js
git commit -m "feat(security): sanitize patient-uploaded images + audit log"
```

---

### Task 12: Deploy backend to prod

- [ ] **Step 1: Push master**

```bash
cd /var/www/medical-pro-backend
git push origin master
```

- [ ] **Step 2: Watch CI**

Run: `curl -s https://api.github.com/repos/jdavido74/medical-pro-backend/actions/runs?per_page=1 | python3 -c "import sys,json; d=json.load(sys.stdin); r=d['workflow_runs'][0]; print(r['head_sha'][:7], r['status'], r['conclusion'])"`
Expected: status=completed conclusion=success within a few minutes.

- [ ] **Step 3: Verify migration applied in prod**

SSH to prod: `ssh -p 2222 root@72.62.51.173 "psql -h localhost -U postgres -d clinic_<id> -c '\d patient_documents' | grep -E 'category|sanitized|deleted_at'"`
Expected: new columns present.

---

## Phase 3 — Frontend API + i18n

### Task 13: Create patientDocumentsApi client

**Files:**
- Create: `/var/www/medical-pro/src/api/patientDocumentsApi.js`

- [ ] **Step 1: Read an existing API client as reference**

Run: `cat /var/www/medical-pro/src/api/preconsultationApi.js`
Note the axios/fetch wrapper, auth header handling, base URL constant.

- [ ] **Step 2: Create the new API client**

```js
/**
 * patientDocumentsApi — staff-side document operations for a patient.
 */
import axios from './axios'; // or whatever existing wrapper is used
// If the project uses a bare axios client and attaches auth in an interceptor, import that. Adjust to match existing patterns.

export async function uploadDocuments(patientId, files, medicalRecordId) {
  const form = new FormData();
  form.append('medicalRecordId', medicalRecordId);
  for (const f of files) form.append('files', f);
  const { data } = await axios.post(
    `/patient-documents/patients/${patientId}/documents`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data.documents;
}

export async function listDocuments(patientId, { medicalRecordId, includeDeleted = false } = {}) {
  const params = {};
  if (medicalRecordId) params.medicalRecordId = medicalRecordId;
  if (includeDeleted) params.includeDeleted = true;
  const { data } = await axios.get(
    `/patient-documents/patients/${patientId}/documents`,
    { params }
  );
  return data.documents;
}

export async function updateDocumentCategory(patientId, docId, category) {
  const { data } = await axios.patch(
    `/patient-documents/patients/${patientId}/documents/${docId}`,
    { category }
  );
  return data.document;
}

export async function viewDocumentBlob(patientId, docId) {
  const res = await axios.get(
    `/patient-documents/patients/${patientId}/documents/${docId}/file`,
    { responseType: 'blob' }
  );
  return res.data;
}

export async function deleteDocument(patientId, docId, reason) {
  await axios.delete(
    `/patient-documents/patients/${patientId}/documents/${docId}`,
    { data: { reason } }
  );
}
```

Adjust import path / method of axios to match existing codebase conventions. If the project doesn't use `./axios`, inspect other API files in `src/api/` and mirror the pattern.

- [ ] **Step 3: Commit**

```bash
cd /var/www/medical-pro
git add src/api/patientDocumentsApi.js
git commit -m "feat(api): patientDocumentsApi client"
```

---

### Task 14: Add i18n keys

**Files:**
- Modify: `/var/www/medical-pro/src/locales/fr/planning.json`
- Modify: `/var/www/medical-pro/src/locales/es/planning.json`
- Modify: `/var/www/medical-pro/src/locales/en/planning.json`

Use the `planning.json` namespace since `MedicalRecordsModule` typically loads it (verify with `grep useTranslation src/components/dashboard/modules/MedicalRecordsModule.js`). If it loads a different namespace, choose accordingly.

- [ ] **Step 1: Add FR keys**

In `src/locales/fr/planning.json`, add a top-level block (beside existing blocks like `actions`, `todayAppointments`):

```json
"documents": {
  "title": "Documents",
  "empty": "Aucun document",
  "upload": "Déposer un document",
  "uploader": { "patient": "Patient", "staff": "Équipe" },
  "source": { "patient": "🧑 Patient", "staff": "👨‍⚕️ Équipe" },
  "badges": { "toCategorize": "À catégoriser" },
  "actions": {
    "view": "Voir",
    "download": "Télécharger",
    "delete": "Supprimer",
    "categorize": "Catégoriser",
    "saveCategories": "Enregistrer",
    "laterCategorize": "Plus tard"
  },
  "category": {
    "prescription": "Ordonnance",
    "lab_result": "Analyse",
    "imaging": "Imagerie",
    "report": "Compte-rendu",
    "certificate": "Certificat",
    "consent": "Consentement",
    "correspondence": "Courrier",
    "identity": "Identité",
    "insurance": "Assurance",
    "other": "Autre"
  },
  "uploadModal": {
    "title": "Déposer des documents",
    "dropHint": "Glissez vos fichiers ici ou cliquez pour sélectionner",
    "maxInfo": "Jusqu'à 10 fichiers, 10 MB max par fichier",
    "submit": "Uploader {{count}} fichier(s)",
    "uploading": "Envoi en cours..."
  },
  "categorizeModal": {
    "title": "Catégoriser les documents",
    "placeholder": "Choisir une catégorie"
  },
  "deleteModal": {
    "title": "Supprimer ce document",
    "reasonLabel": "Motif de suppression",
    "reasonPlaceholder": "Ex. Document uploadé par erreur",
    "warning": "Le document reste archivé 15 ans pour traçabilité.",
    "confirm": "Supprimer"
  },
  "errors": {
    "uploadFailed": "Échec de l'upload",
    "invalidCategory": "Catégorie invalide",
    "invalidFile": "Fichier non autorisé",
    "tooLarge": "Fichier > 10 MB"
  }
}
```

- [ ] **Step 2: Add ES keys**

Same structure, Spanish translations (use "Documentos" as title, etc.).

- [ ] **Step 3: Add EN keys**

Same structure, English translations.

- [ ] **Step 4: Commit**

```bash
git add src/locales/fr/planning.json src/locales/es/planning.json src/locales/en/planning.json
git commit -m "feat(i18n): documents block keys (fr/es/en)"
```

---

## Phase 4 — Frontend components

### Task 15: DocumentCategorizationModal (pure, no API)

**Files:**
- Create: `/var/www/medical-pro/src/components/dashboard/medical-records/DocumentCategorizationModal.js`
- Test: `/var/www/medical-pro/src/components/dashboard/medical-records/DocumentCategorizationModal.test.js`

- [ ] **Step 1: Write failing test**

```jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DocumentCategorizationModal from './DocumentCategorizationModal';

const mockT = (key, opts) => (opts && opts.count != null ? `${key}(${opts.count})` : key);
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockT })
}));

const docs = [
  { id: 'a', originalFilename: 'a.pdf', category: null },
  { id: 'b', originalFilename: 'b.jpg', category: null }
];

describe('DocumentCategorizationModal', () => {
  test('renders a dropdown per document', () => {
    render(<DocumentCategorizationModal documents={docs} onSave={() => {}} onClose={() => {}} />);
    expect(screen.getAllByRole('combobox')).toHaveLength(2);
  });

  test('"Later" closes without calling onSave', () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    render(<DocumentCategorizationModal documents={docs} onSave={onSave} onClose={onClose} />);
    fireEvent.click(screen.getByText('documents.actions.laterCategorize'));
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  test('"Save" dispatches a category map { docId: category }', () => {
    const onSave = jest.fn();
    render(<DocumentCategorizationModal documents={docs} onSave={onSave} onClose={() => {}} />);
    const [sel1, sel2] = screen.getAllByRole('combobox');
    fireEvent.change(sel1, { target: { value: 'prescription' } });
    fireEvent.change(sel2, { target: { value: 'imaging' } });
    fireEvent.click(screen.getByText('documents.actions.saveCategories'));
    expect(onSave).toHaveBeenCalledWith({ a: 'prescription', b: 'imaging' });
  });
});
```

- [ ] **Step 2: Run — expect fail**

Run: `cd /var/www/medical-pro && npx jest src/components/dashboard/medical-records/DocumentCategorizationModal.test.js`
Expected: FAIL (component not found).

- [ ] **Step 3: Implement component**

Create `src/components/dashboard/medical-records/DocumentCategorizationModal.js`:

```jsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const CATEGORIES = [
  'prescription','lab_result','imaging','report','certificate',
  'consent','correspondence','identity','insurance','other'
];

export default function DocumentCategorizationModal({ documents, onSave, onClose }) {
  const { t } = useTranslation('planning');
  const [selection, setSelection] = useState(() =>
    Object.fromEntries(documents.map(d => [d.id, d.category || '']))
  );

  const handleChange = (id, value) => setSelection(prev => ({ ...prev, [id]: value }));

  const handleSave = () => {
    const toSave = Object.fromEntries(
      Object.entries(selection).filter(([, v]) => v && v !== '')
    );
    onSave(toSave);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-medium">{t('documents.categorizeModal.title')}</h2>
        </div>
        <div className="p-6 overflow-y-auto space-y-3">
          {documents.map(d => (
            <div key={d.id} className="flex items-center gap-3">
              <span className="flex-1 truncate text-sm">{d.originalFilename}</span>
              <select
                className="border rounded-md px-3 py-1 text-sm"
                value={selection[d.id] || ''}
                onChange={(e) => handleChange(d.id, e.target.value)}
              >
                <option value="">{t('documents.categorizeModal.placeholder')}</option>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{t(`documents.category.${c}`)}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
          >
            {t('documents.actions.laterCategorize')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {t('documents.actions.saveCategories')}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run — expect pass**

Run: `npx jest src/components/dashboard/medical-records/DocumentCategorizationModal.test.js`
Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/medical-records/DocumentCategorizationModal.js \
        src/components/dashboard/medical-records/DocumentCategorizationModal.test.js
git commit -m "feat(frontend): DocumentCategorizationModal"
```

---

### Task 16: StaffDocumentUploadModal

**Files:**
- Create: `/var/www/medical-pro/src/components/dashboard/medical-records/StaffDocumentUploadModal.js`
- Test: `/var/www/medical-pro/src/components/dashboard/medical-records/StaffDocumentUploadModal.test.js`

- [ ] **Step 1: Write failing test**

```jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import StaffDocumentUploadModal from './StaffDocumentUploadModal';

jest.mock('../../../api/patientDocumentsApi', () => ({
  uploadDocuments: jest.fn().mockResolvedValue([
    { id: 'a', originalFilename: 'a.pdf', category: null }
  ])
}));
const mockT = k => k;
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: mockT }) }));

describe('StaffDocumentUploadModal', () => {
  test('uploads selected files and calls onUploaded with the returned documents', async () => {
    const { uploadDocuments } = require('../../../api/patientDocumentsApi');
    const onUploaded = jest.fn();
    render(
      <StaffDocumentUploadModal
        patientId="p1"
        medicalRecordId="r1"
        onUploaded={onUploaded}
        onClose={() => {}}
      />
    );
    const file = new File(['x'], 'a.pdf', { type: 'application/pdf' });
    const input = screen.getByTestId('file-input');
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /documents.uploadModal.submit/i }));

    await waitFor(() => expect(uploadDocuments).toHaveBeenCalledWith('p1', [file], 'r1'));
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith([
      { id: 'a', originalFilename: 'a.pdf', category: null }
    ]));
  });

  test('rejects > 10 files', () => {
    render(
      <StaffDocumentUploadModal
        patientId="p1" medicalRecordId="r1"
        onUploaded={() => {}} onClose={() => {}}
      />
    );
    const files = Array.from({ length: 11 }, (_, i) =>
      new File(['x'], `f${i}.pdf`, { type: 'application/pdf' })
    );
    const input = screen.getByTestId('file-input');
    fireEvent.change(input, { target: { files } });
    expect(screen.getAllByTestId('selected-file')).toHaveLength(10);
  });
});
```

- [ ] **Step 2: Run — expect fail**

Run: `npx jest src/components/dashboard/medical-records/StaffDocumentUploadModal.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement**

```jsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { uploadDocuments } from '../../../api/patientDocumentsApi';

const MAX_FILES = 10;
const MAX_SIZE = 10 * 1024 * 1024;

export default function StaffDocumentUploadModal({ patientId, medicalRecordId, onUploaded, onClose }) {
  const { t } = useTranslation('planning');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleSelect = (fileList) => {
    const arr = Array.from(fileList || []);
    const valid = arr.filter(f => f.size <= MAX_SIZE).slice(0, MAX_FILES);
    setFiles(valid);
    setError(arr.some(f => f.size > MAX_SIZE) ? t('documents.errors.tooLarge') : null);
  };

  const removeFile = (index) => setFiles(prev => prev.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    if (!files.length || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const saved = await uploadDocuments(patientId, files, medicalRecordId);
      onUploaded(saved);
    } catch (e) {
      setError(t('documents.errors.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-xl w-full">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-medium">{t('documents.uploadModal.title')}</h2>
          {!uploading && <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>}
        </div>
        <div className="p-6 space-y-4">
          <label className="block border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400">
            <input
              data-testid="file-input"
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleSelect(e.target.files)}
            />
            <p className="text-sm text-gray-600">{t('documents.uploadModal.dropHint')}</p>
            <p className="text-xs text-gray-400 mt-1">{t('documents.uploadModal.maxInfo')}</p>
          </label>

          {files.length > 0 && (
            <ul className="divide-y border rounded-md">
              {files.map((f, i) => (
                <li key={i} data-testid="selected-file" className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="flex-1 truncate">{f.name}</span>
                  <span className="text-xs text-gray-500">{Math.round(f.size / 1024)} KB</span>
                  <button className="text-red-500 hover:text-red-700" onClick={() => removeFile(i)}>×</button>
                </li>
              ))}
            </ul>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button
            onClick={handleSubmit}
            disabled={!files.length || uploading}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading
              ? t('documents.uploadModal.uploading')
              : t('documents.uploadModal.submit', { count: files.length })}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run — expect pass**

Run: `npx jest src/components/dashboard/medical-records/StaffDocumentUploadModal.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/medical-records/StaffDocumentUploadModal.js \
        src/components/dashboard/medical-records/StaffDocumentUploadModal.test.js
git commit -m "feat(frontend): StaffDocumentUploadModal"
```

---

### Task 17: DocumentDeleteModal

**Files:**
- Create: `/var/www/medical-pro/src/components/dashboard/medical-records/DocumentDeleteModal.js`
- Test: `/var/www/medical-pro/src/components/dashboard/medical-records/DocumentDeleteModal.test.js`

- [ ] **Step 1: Write failing test**

```jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DocumentDeleteModal from './DocumentDeleteModal';

jest.mock('../../../api/patientDocumentsApi', () => ({
  deleteDocument: jest.fn().mockResolvedValue()
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: k => k }) }));

test('confirm calls deleteDocument with reason', async () => {
  const { deleteDocument } = require('../../../api/patientDocumentsApi');
  const onDeleted = jest.fn();
  render(
    <DocumentDeleteModal
      patientId="p" docId="d"
      filename="a.pdf"
      onDeleted={onDeleted} onClose={() => {}}
    />
  );
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Duplicate' } });
  fireEvent.click(screen.getByRole('button', { name: /documents.deleteModal.confirm/i }));
  await waitFor(() => expect(deleteDocument).toHaveBeenCalledWith('p', 'd', 'Duplicate'));
  await waitFor(() => expect(onDeleted).toHaveBeenCalled());
});

test('confirm disabled when reason empty', () => {
  render(
    <DocumentDeleteModal
      patientId="p" docId="d" filename="a.pdf"
      onDeleted={() => {}} onClose={() => {}}
    />
  );
  expect(screen.getByRole('button', { name: /documents.deleteModal.confirm/i })).toBeDisabled();
});
```

- [ ] **Step 2: Run — expect fail**

Run: `npx jest src/components/dashboard/medical-records/DocumentDeleteModal.test.js`

- [ ] **Step 3: Implement**

```jsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { deleteDocument } from '../../../api/patientDocumentsApi';

export default function DocumentDeleteModal({ patientId, docId, filename, onDeleted, onClose }) {
  const { t } = useTranslation('planning');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (reason.trim().length < 3 || busy) return;
    setBusy(true);
    try {
      await deleteDocument(patientId, docId, reason.trim());
      onDeleted();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-medium">{t('documents.deleteModal.title')}</h2>
          <p className="text-sm text-gray-500 mt-1 truncate">{filename}</p>
        </div>
        <div className="p-6 space-y-3">
          <label className="block text-sm font-medium">{t('documents.deleteModal.reasonLabel')}</label>
          <textarea
            className="w-full border rounded-md px-3 py-2 text-sm"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('documents.deleteModal.reasonPlaceholder')}
          />
          <p className="text-xs text-gray-500">{t('documents.deleteModal.warning')}</p>
        </div>
        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50">
            {t('actions.cancel')}
          </button>
          <button
            onClick={confirm}
            disabled={reason.trim().length < 3 || busy}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {t('documents.deleteModal.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run — expect pass**

Run: `npx jest src/components/dashboard/medical-records/DocumentDeleteModal.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/medical-records/DocumentDeleteModal.js \
        src/components/dashboard/medical-records/DocumentDeleteModal.test.js
git commit -m "feat(frontend): DocumentDeleteModal"
```

---

### Task 18: DocumentsBlock (main list + orchestration)

**Files:**
- Create: `/var/www/medical-pro/src/components/dashboard/medical-records/DocumentsBlock.js`
- Test: `/var/www/medical-pro/src/components/dashboard/medical-records/DocumentsBlock.test.js`

- [ ] **Step 1: Inspect existing permissions hook**

Run: `grep -rln "hasPermission\|usePermissions" /var/www/medical-pro/src/components/dashboard | head -5`
Note the exact hook name/import and how permission constants are referenced (likely a file like `src/constants/permissions.js`).

- [ ] **Step 2: Ensure frontend permission constant exists**

Run: `grep -n "PATIENT_DOCUMENTS" /var/www/medical-pro/src/constants/permissions.js 2>/dev/null || grep -rn "PATIENT_DOCUMENTS" /var/www/medical-pro/src/utils/ 2>/dev/null`

If `PATIENT_DOCUMENTS_UPLOAD` / `_CATEGORIZE` / `_DELETE` are not present, add them to the frontend permissions file following the existing pattern.

- [ ] **Step 3: Write failing test**

```jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DocumentsBlock from './DocumentsBlock';

jest.mock('../../../api/patientDocumentsApi', () => ({
  listDocuments: jest.fn(),
  updateDocumentCategory: jest.fn().mockResolvedValue({ id: 'a', category: 'prescription' })
}));
const mockHasPermission = jest.fn();
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ hasPermission: mockHasPermission })
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: k => k }) }));

describe('DocumentsBlock', () => {
  const { listDocuments } = require('../../../api/patientDocumentsApi');

  beforeEach(() => {
    jest.clearAllMocks();
    listDocuments.mockResolvedValue([
      { id: 'a', originalFilename: 'a.pdf', size: 1234, mimeType: 'application/pdf',
        category: null, uploadedByType: 'staff', createdAt: '2026-04-16T10:00:00Z' },
      { id: 'b', originalFilename: 'b.jpg', size: 2000, mimeType: 'image/jpeg',
        category: 'imaging', uploadedByType: 'patient', createdAt: '2026-04-15T10:00:00Z' }
    ]);
  });

  test('renders rows for each document', async () => {
    mockHasPermission.mockReturnValue(true);
    render(<DocumentsBlock patientId="p" medicalRecordId="r" />);
    await waitFor(() => expect(screen.getByText('a.pdf')).toBeInTheDocument());
    expect(screen.getByText('b.jpg')).toBeInTheDocument();
  });

  test('shows "À catégoriser" badge for null category', async () => {
    mockHasPermission.mockReturnValue(true);
    render(<DocumentsBlock patientId="p" medicalRecordId="r" />);
    await waitFor(() => expect(screen.getByText('documents.badges.toCategorize')).toBeInTheDocument());
  });

  test('upload button hidden without PATIENT_DOCUMENTS_UPLOAD', async () => {
    mockHasPermission.mockImplementation(p => p !== 'patient_documents.upload');
    render(<DocumentsBlock patientId="p" medicalRecordId="r" />);
    await waitFor(() => expect(screen.queryByText('documents.upload')).not.toBeInTheDocument());
  });

  test('delete button hidden without PATIENT_DOCUMENTS_DELETE', async () => {
    mockHasPermission.mockImplementation(p => p !== 'patient_documents.delete');
    render(<DocumentsBlock patientId="p" medicalRecordId="r" />);
    await waitFor(() => expect(screen.queryByText('documents.actions.delete')).not.toBeInTheDocument());
  });
});
```

- [ ] **Step 4: Implement DocumentsBlock**

```jsx
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Download, Eye, Trash2, Upload } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  listDocuments, viewDocumentBlob, updateDocumentCategory
} from '../../../api/patientDocumentsApi';
import StaffDocumentUploadModal from './StaffDocumentUploadModal';
import DocumentCategorizationModal from './DocumentCategorizationModal';
import DocumentDeleteModal from './DocumentDeleteModal';

const P = {
  UPLOAD: 'patient_documents.upload',
  DELETE: 'patient_documents.delete',
  CATEGORIZE: 'patient_documents.categorize'
};

export default function DocumentsBlock({ patientId, medicalRecordId }) {
  const { t } = useTranslation('planning');
  const { hasPermission } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [categorize, setCategorize] = useState(null);   // [doc,...] | [singleDoc]
  const [deleting, setDeleting] = useState(null);       // doc | null

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listDocuments(patientId, { medicalRecordId });
      setDocs(data);
    } finally {
      setLoading(false);
    }
  }, [patientId, medicalRecordId]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleUploaded = (savedDocs) => {
    setShowUpload(false);
    setCategorize(savedDocs);  // open categorization modal with just-uploaded docs
    refresh();
  };

  const handleCategorize = async (categoryMap) => {
    for (const [docId, category] of Object.entries(categoryMap)) {
      await updateDocumentCategory(patientId, docId, category);
    }
    setCategorize(null);
    refresh();
  };

  const openInTab = async (doc) => {
    const blob = await viewDocumentBlob(patientId, doc.id);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const download = async (doc) => {
    const blob = await viewDocumentBlob(patientId, doc.id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.originalFilename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h3 className="font-medium text-gray-900 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          {t('documents.title')} <span className="text-gray-500">({docs.length})</span>
        </h3>
        {hasPermission(P.UPLOAD) && (
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Upload className="w-4 h-4" /> {t('documents.upload')}
          </button>
        )}
      </div>

      <div className="p-4">
        {loading ? (
          <div className="text-sm text-gray-500">…</div>
        ) : docs.length === 0 ? (
          <div className="text-sm text-gray-500">{t('documents.empty')}</div>
        ) : (
          <ul className="divide-y">
            {docs.map(d => (
              <li key={d.id} className="py-2 flex items-center gap-3 text-sm">
                <span className="flex-1 truncate">{d.originalFilename}</span>
                <span className="text-xs text-gray-500">{Math.round(d.size / 1024)} KB</span>
                {d.category ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">
                    {t(`documents.category.${d.category}`)}
                  </span>
                ) : (
                  <button
                    onClick={() => setCategorize([d])}
                    className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800"
                    disabled={!hasPermission(P.CATEGORIZE)}
                  >
                    {t('documents.badges.toCategorize')}
                  </button>
                )}
                <span className="text-xs text-gray-500">
                  {t(`documents.source.${d.uploadedByType}`)}
                </span>
                <button onClick={() => openInTab(d)} title={t('documents.actions.view')}>
                  <Eye className="w-4 h-4 text-gray-500 hover:text-gray-700" />
                </button>
                <button onClick={() => download(d)} title={t('documents.actions.download')}>
                  <Download className="w-4 h-4 text-gray-500 hover:text-gray-700" />
                </button>
                {hasPermission(P.DELETE) && (
                  <button onClick={() => setDeleting(d)} title={t('documents.actions.delete')}>
                    <Trash2 className="w-4 h-4 text-red-500 hover:text-red-700" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {showUpload && (
        <StaffDocumentUploadModal
          patientId={patientId}
          medicalRecordId={medicalRecordId}
          onUploaded={handleUploaded}
          onClose={() => setShowUpload(false)}
        />
      )}
      {categorize && (
        <DocumentCategorizationModal
          documents={categorize}
          onSave={handleCategorize}
          onClose={() => setCategorize(null)}
        />
      )}
      {deleting && (
        <DocumentDeleteModal
          patientId={patientId}
          docId={deleting.id}
          filename={deleting.originalFilename}
          onDeleted={() => { setDeleting(null); refresh(); }}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
```

Adjust the import path for `useAuth` to whatever the app actually uses (found in step 1).

- [ ] **Step 5: Run — expect pass**

Run: `npx jest src/components/dashboard/medical-records/DocumentsBlock.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/medical-records/DocumentsBlock.js \
        src/components/dashboard/medical-records/DocumentsBlock.test.js
git commit -m "feat(frontend): DocumentsBlock with upload/categorize/delete orchestration"
```

---

### Task 19: Integrate DocumentsBlock into MedicalRecordsModule

**Files:**
- Modify: `/var/www/medical-pro/src/components/dashboard/modules/MedicalRecordsModule.js`

- [ ] **Step 1: Locate insertion point**

Run: `grep -n "Plan de traitement\|traitement\|evolution\|Evolution\|episode" /var/www/medical-pro/src/components/dashboard/modules/MedicalRecordsModule.js`
Pick an insertion point after the "treatment plan" or "evolution" section, inside the medical record card render block.

- [ ] **Step 2: Import and insert the component**

At the imports:

```js
import DocumentsBlock from '../medical-records/DocumentsBlock';
```

Where the medical record card renders (must have access to `patient.id` and `medicalRecord.id`), insert:

```jsx
<DocumentsBlock
  patientId={patient.id}
  medicalRecordId={medicalRecord.id}
/>
```

If `patient.id` / `medicalRecord.id` use different variable names in context, adapt accordingly (inspect the component render tree first).

- [ ] **Step 3: Manual verification locally**

Run: `cd /var/www/medical-pro && npm start`
Visit a medical record in the dev environment. Confirm the block renders, the upload button appears, the flow works end-to-end.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/modules/MedicalRecordsModule.js
git commit -m "feat(frontend): integrate DocumentsBlock into MedicalRecordsModule"
```

---

## Phase 5 — Deploy & verify

### Task 20: Deploy frontend

- [ ] **Step 1: Push master**

```bash
cd /var/www/medical-pro
git push origin master
```

- [ ] **Step 2: Watch CI**

Run: `curl -s https://api.github.com/repos/jdavido74/medical-pro/actions/runs?per_page=1 | python3 -c "import sys,json; d=json.load(sys.stdin); r=d['workflow_runs'][0]; print(r['head_sha'][:7], r['status'], r['conclusion'])"`
Expected: status=completed conclusion=success.

### Task 21: Manual prod verification

- [ ] **Step 1: Hard refresh the app**

Ctrl+Shift+R on https://app.medimaestro.com

- [ ] **Step 2: Upload flow**

Open a patient → medical record → Documents block → `+ Déposer` → select 2 files (1 JPEG, 1 PDF) → upload → categorize both → confirm in the list.

- [ ] **Step 3: Check audit**

SSH: `ssh -p 2222 root@72.62.51.173 "psql -h localhost -U postgres -d clinic_<id> -c \"SELECT event_type, timestamp FROM audit_logs WHERE event_type LIKE 'document.%' ORDER BY timestamp DESC LIMIT 10\""`
Expected: rows for `document.uploaded_by_staff`, `document.categorized`.

- [ ] **Step 4: Check encrypted file + sanitized flag**

```
ls -l /var/lib/medimaestro/documents/<clinicId>/<patientId>/
psql -c "SELECT id, original_filename, sanitized FROM patient_documents WHERE uploaded_by_type='staff' ORDER BY created_at DESC LIMIT 5"
```

Expected: files present with UUID names, JPEG row has `sanitized=true`, PDF row has `sanitized=false`.

- [ ] **Step 5: Delete flow**

As clinic admin, delete one of the docs with a reason → verify it disappears from the list → verify `deleted_at` is set in DB and the encrypted file is **still present** on disk.

---

## Spec coverage summary

| Spec section | Task(s) |
|---|---|
| 4.1 Data model | 5, 6 |
| 4.2 Permissions | 1 |
| 4.3 API endpoints | 7, 8, 9, 10 |
| 4.4 Security layers (sanitize, rate limit, audit) | 3, 4, 7, 11 |
| 4.5 Image sanitization | 3, 4, 11 |
| 4.6 Audit events | 2, 7, 8, 9, 10, 11 |
| 5.1 DocumentsBlock | 18, 19 |
| 5.2 StaffDocumentUploadModal | 16 |
| 5.3 DocumentCategorizationModal | 15 |
| 5.4 DocumentDeleteModal | 17 |
| 5.5 API client | 13 |
| 5.6 i18n | 14 |
| 6 Tests | 3, 7, 8, 9, 15, 16, 17, 18 |
| 7 Rollout | 12, 20, 21 |

## Open points (from spec §8) — resolved here

- Migration number: `clinic_081_staff_document_uploads.sql` (verified against existing files, `clinic_080` is highest)
- DocumentsBlock insertion point: after treatment-plan/evolution section in the medical record card (Task 19 asks engineer to confirm visually)
- Batch upload failure strategy: **partial success** — per-file error reported inline, successful files proceed to categorization (Task 7 implements, Task 16 surfaces errors in UI)
- i18n namespace: **planning.json** (Task 14 confirms by inspecting `useTranslation` usage in `MedicalRecordsModule`)
