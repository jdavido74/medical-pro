# Portail Pre-consultation Patient — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow patients to fill their info, upload medical documents, and manage appointments via a secure token link; then accept/reject quotes post-consultation.

**Architecture:** Token-based public pages (no patient auth), encrypted file storage off-webroot, staff email notifications, responsive mobile/desktop UX. Backend: Express routes + Sequelize models in clinic DB. Frontend: React pages with i18n (FR/ES/EN).

**Tech Stack:** Express, Sequelize, multer, crypto (AES-256-GCM), file-type (magic bytes), mrz + mrz-detection (client-side), react-dropzone, Tailwind CSS.

**Design doc:** `docs/plans/2026-03-06-portail-preconsultation-design.md`

---

## Phase 1 — Backend: Database & Models

### Task 1: Migration — preconsultation_tokens table

**Files:**
- Create: `/var/www/medical-pro-backend/migrations/clinic_065_preconsultation_tokens.sql`

**Step 1: Write the migration**

```sql
-- Migration: clinic_065_preconsultation_tokens
-- Pre-consultation token system for patient portal access

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'preconsultation_status') THEN
    CREATE TYPE preconsultation_status AS ENUM (
      'sent',
      'patient_info_completed',
      'documents_uploaded',
      'confirmed',
      'modification_requested',
      'cancelled',
      'quote_sent',
      'quote_accepted',
      'quote_rejected'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS preconsultation_tokens (
  id SERIAL PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  language VARCHAR(5) NOT NULL DEFAULT 'es',
  status preconsultation_status NOT NULL DEFAULT 'sent',
  proposed_dates JSONB DEFAULT NULL,
  selected_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_by INTEGER DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_preconsultation_tokens_token ON preconsultation_tokens(token);
CREATE INDEX IF NOT EXISTS idx_preconsultation_tokens_appointment ON preconsultation_tokens(appointment_id);
CREATE INDEX IF NOT EXISTS idx_preconsultation_tokens_patient ON preconsultation_tokens(patient_id);
CREATE INDEX IF NOT EXISTS idx_preconsultation_tokens_status ON preconsultation_tokens(status);

COMMENT ON TABLE preconsultation_tokens IS 'Secure tokens for patient pre-consultation portal access';
```

**Step 2: Add to migration lists**

- Add `'clinic_065_preconsultation_tokens.sql'` to:
  - `/var/www/medical-pro-backend/src/services/clinicProvisioningService.js` migrationFiles array (before `'025_insert_default_clinic_roles.sql'`)
  - `/var/www/medical-pro-backend/scripts/run-clinic-migrations.js` NEW_MIGRATIONS array

**Step 3: Run migration on dev DB**

```bash
cd /var/www/medical-pro-backend
node scripts/run-clinic-migrations.js --migration=clinic_065_preconsultation_tokens.sql
```

Expected: Migration applied successfully.

**Step 4: Commit**

```bash
git add migrations/clinic_065_preconsultation_tokens.sql src/services/clinicProvisioningService.js scripts/run-clinic-migrations.js
git commit -m "feat(db): add preconsultation_tokens table (clinic_065)"
```

---

### Task 2: Migration — patient_documents table

**Files:**
- Create: `/var/www/medical-pro-backend/migrations/clinic_066_patient_documents.sql`

**Step 1: Write the migration**

```sql
-- Migration: clinic_066_patient_documents
-- Patient document storage metadata for uploaded medical files

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_uploader_type') THEN
    CREATE TYPE document_uploader_type AS ENUM ('patient', 'staff');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS patient_documents (
  id SERIAL PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  medical_record_id UUID REFERENCES medical_records(id) ON DELETE SET NULL,
  original_filename VARCHAR(255) NOT NULL,
  stored_filename UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  mime_type VARCHAR(100) NOT NULL,
  size INTEGER NOT NULL,
  uploaded_by_type document_uploader_type NOT NULL DEFAULT 'patient',
  uploaded_by_id VARCHAR(255) DEFAULT NULL,
  retention_expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '15 years'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_documents_patient ON patient_documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_documents_appointment ON patient_documents(appointment_id);
CREATE INDEX IF NOT EXISTS idx_patient_documents_medical_record ON patient_documents(medical_record_id);
CREATE INDEX IF NOT EXISTS idx_patient_documents_retention ON patient_documents(retention_expires_at);

COMMENT ON TABLE patient_documents IS 'Metadata for patient-uploaded medical documents (files stored off-webroot, encrypted)';
```

**Step 2: Add to migration lists** (same two files as Task 1)

**Step 3: Run migration**

```bash
node scripts/run-clinic-migrations.js --migration=clinic_066_patient_documents.sql
```

**Step 4: Commit**

```bash
git add migrations/clinic_066_patient_documents.sql src/services/clinicProvisioningService.js scripts/run-clinic-migrations.js
git commit -m "feat(db): add patient_documents table (clinic_066)"
```

---

### Task 3: Migration — preconsultation_status on appointments

**Files:**
- Create: `/var/www/medical-pro-backend/migrations/clinic_067_appointment_preconsultation_status.sql`

**Step 1: Write the migration**

```sql
-- Migration: clinic_067_appointment_preconsultation_status
-- Add preconsultation_status column to appointments for dashboard display

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS preconsultation_status VARCHAR(30) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_preconsultation_status ON appointments(preconsultation_status);

COMMENT ON COLUMN appointments.preconsultation_status IS 'Current preconsultation workflow status (mirrors preconsultation_tokens.status)';
```

**Step 2: Add to migration lists**

**Step 3: Run migration**

```bash
node scripts/run-clinic-migrations.js --migration=clinic_067_appointment_preconsultation_status.sql
```

**Step 4: Commit**

```bash
git add migrations/clinic_067_appointment_preconsultation_status.sql src/services/clinicProvisioningService.js scripts/run-clinic-migrations.js
git commit -m "feat(db): add preconsultation_status to appointments (clinic_067)"
```

---

### Task 4: Sequelize model — PreconsultationToken

**Files:**
- Create: `/var/www/medical-pro-backend/src/models/clinic/PreconsultationToken.js`

**Step 1: Write the model**

Follow the `ClinicBaseModel.create()` pattern from existing models. Fields: appointment_id (UUID FK), patient_id (UUID FK), token (UUID unique), language (STRING default 'es'), status (ENUM), proposed_dates (JSONB), selected_date (DATE), expires_at (DATE), created_by (INTEGER).

Associations: `belongsTo(Appointment)`, `belongsTo(Patient)`.

**Step 2: Register model in clinic model index**

Add `PreconsultationToken` to `/var/www/medical-pro-backend/src/models/clinic/index.js` — import and register the model, add associations.

**Step 3: Verify model loads**

```bash
node -e "const { getClinicDb } = require('./src/models'); console.log('OK');"
```

**Step 4: Commit**

```bash
git add src/models/clinic/PreconsultationToken.js src/models/clinic/index.js
git commit -m "feat(model): add PreconsultationToken clinic model"
```

---

### Task 5: Sequelize model — PatientDocument

**Files:**
- Create: `/var/www/medical-pro-backend/src/models/clinic/PatientDocument.js`

**Step 1: Write the model**

Fields: patient_id (UUID FK), appointment_id (UUID FK nullable), medical_record_id (UUID FK nullable), original_filename (STRING), stored_filename (UUID unique), mime_type (STRING), size (INTEGER), uploaded_by_type (ENUM patient/staff), uploaded_by_id (STRING), retention_expires_at (DATE).

Associations: `belongsTo(Patient)`, `belongsTo(Appointment)`, `belongsTo(MedicalRecord)`.

**Step 2: Register model in clinic model index**

**Step 3: Verify model loads**

**Step 4: Commit**

```bash
git add src/models/clinic/PatientDocument.js src/models/clinic/index.js
git commit -m "feat(model): add PatientDocument clinic model"
```

---

## Phase 2 — Backend: File Storage Service

### Task 6: Encrypted file storage service

**Files:**
- Create: `/var/www/medical-pro-backend/src/services/fileStorageService.js`

**Step 1: Write failing test**

Create `/var/www/medical-pro-backend/tests/services/fileStorageService.test.js`:
- Test `saveFile()`: writes encrypted file to disk, returns stored_filename UUID
- Test `readFile()`: reads and decrypts file, returns buffer
- Test `deleteFile()`: removes file from disk
- Test MIME type validation: rejects `.exe` disguised as `.pdf`
- Test file size limit: rejects files > 10 Mo

**Step 2: Run tests — verify they fail**

```bash
npx jest tests/services/fileStorageService.test.js --verbose
```

**Step 3: Implement the service**

```javascript
// fileStorageService.js
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { fileTypeFromBuffer } = require('file-type');

const DOCUMENTS_ROOT = process.env.DOCUMENTS_ROOT || '/var/lib/medimaestro/documents';
const ENCRYPTION_KEY = process.env.DOCUMENTS_ENCRYPTION_KEY; // 32 bytes hex
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo
const MAX_FILES_PER_PRECONSULTATION = 10;
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

class FileStorageService {
  getFilePath(clinicId, patientId, storedFilename) {
    return path.join(DOCUMENTS_ROOT, String(clinicId), String(patientId), storedFilename);
  }

  async ensureDirectory(clinicId, patientId) {
    const dir = path.join(DOCUMENTS_ROOT, String(clinicId), String(patientId));
    await fs.mkdir(dir, { recursive: true, mode: 0o700 });
    return dir;
  }

  async validateMimeType(buffer) {
    const detected = await fileTypeFromBuffer(buffer);
    if (!detected || !ALLOWED_MIME_TYPES.includes(detected.mime)) {
      throw new Error(`File type not allowed: ${detected?.mime || 'unknown'}`);
    }
    return detected.mime;
  }

  encrypt(buffer) {
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();
    // Format: [16 bytes IV][16 bytes authTag][encrypted data]
    return Buffer.concat([iv, authTag, encrypted]);
  }

  decrypt(encryptedBuffer) {
    const iv = encryptedBuffer.subarray(0, 16);
    const authTag = encryptedBuffer.subarray(16, 32);
    const data = encryptedBuffer.subarray(32);
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(data), decipher.final()]);
  }

  async saveFile(clinicId, patientId, buffer, originalFilename) {
    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error('File exceeds maximum size of 10 MB');
    }
    const mime = await this.validateMimeType(buffer);
    await this.ensureDirectory(clinicId, patientId);
    const storedFilename = crypto.randomUUID();
    const filePath = this.getFilePath(clinicId, patientId, storedFilename);
    const encrypted = this.encrypt(buffer);
    await fs.writeFile(filePath, encrypted, { mode: 0o600 });
    return { storedFilename, mime, size: buffer.length };
  }

  async readFile(clinicId, patientId, storedFilename) {
    const filePath = this.getFilePath(clinicId, patientId, storedFilename);
    const encrypted = await fs.readFile(filePath);
    return this.decrypt(encrypted);
  }

  async deleteFile(clinicId, patientId, storedFilename) {
    const filePath = this.getFilePath(clinicId, patientId, storedFilename);
    await fs.unlink(filePath);
  }
}

module.exports = new FileStorageService();
```

**Step 4: Run tests — verify they pass**

**Step 5: Install file-type dependency**

```bash
cd /var/www/medical-pro-backend && npm install file-type
```

**Step 6: Add DOCUMENTS_ROOT and DOCUMENTS_ENCRYPTION_KEY to .env.example**

```
DOCUMENTS_ROOT=/var/lib/medimaestro/documents
DOCUMENTS_ENCRYPTION_KEY=  # Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Step 7: Commit**

```bash
git add src/services/fileStorageService.js tests/services/fileStorageService.test.js .env.example package.json package-lock.json
git commit -m "feat(storage): add encrypted file storage service with MIME validation"
```

---

## Phase 3 — Backend: Permissions

### Task 7: Add preconsultation & patient_documents permissions

**Files:**
- Modify: `/var/www/medical-pro-backend/src/utils/permissionConstants.js`
- Modify: `/var/www/medical-pro/src/utils/permissionsStorage.js`

**Step 1: Add to backend PERMISSIONS object**

```javascript
// After APPOINTMENTS section
// PRE-CONSULTATION
PRECONSULTATION_SEND: 'preconsultation.send',
PRECONSULTATION_MANAGE: 'preconsultation.manage',

// PATIENT DOCUMENTS
PATIENT_DOCUMENTS_VIEW: 'patient_documents.view',
PATIENT_DOCUMENTS_DELETE: 'patient_documents.delete',
```

**Step 2: Add to ROLE_PERMISSIONS**

- `super_admin`: all 4
- `admin`: all 4
- `secretary`: `PRECONSULTATION_SEND`, `PRECONSULTATION_MANAGE`, `PATIENT_DOCUMENTS_VIEW`
- `physician`: `PATIENT_DOCUMENTS_VIEW`
- `practitioner`: `PATIENT_DOCUMENTS_VIEW`
- `nurse`: `PATIENT_DOCUMENTS_VIEW`
- `readonly`: (none)

**Step 3: Mirror in frontend permissionsStorage.js**

Same constants added to the frontend PERMISSIONS object.

**Step 4: Commit**

```bash
git add /var/www/medical-pro-backend/src/utils/permissionConstants.js /var/www/medical-pro/src/utils/permissionsStorage.js
git commit -m "feat(rbac): add preconsultation and patient_documents permissions"
```

---

## Phase 4 — Backend: Email Templates

### Task 8: Preconsultation email templates

**Files:**
- Modify: `/var/www/medical-pro-backend/src/services/emailService.js`

**Step 1: Add template methods**

Add methods for each of the 12 templates defined in the design doc. Each has FR/ES/EN variants. Priority order:

1. `sendPreconsultationLink(params)` — link to patient with token URL
2. `sendAppointmentReminder(params)` — reminder with confirm/modify/cancel links (update existing)
3. `sendProposedDates(params)` — date selection for patient
4. `sendQuoteToPatient(params)` — quote link to patient
5. `sendStaffNotification(params)` — generic staff notification (type: patient_info_completed, documents_uploaded, appointment_confirmed, appointment_cancelled, modification_requested, date_selected, quote_accepted, quote_rejected)

Pattern: follow `sendVerificationEmail()` — subjects object per language, dedicated HTML template method per language, `getRecipientEmail()` for test mode.

The patient-facing emails must include: clinic logo, appointment details, action buttons (styled links), footer with clinic contact info.

**Step 2: Add TEMPLATE_TYPES to messagingService.js**

```javascript
PRECONSULTATION_LINK: 'preconsultation_link',
PRECONSULTATION_REMINDER: 'preconsultation_reminder',
PROPOSED_DATES: 'proposed_dates',
QUOTE_TO_PATIENT: 'quote_to_patient',
STAFF_PRECONSULTATION_NOTIFICATION: 'staff_preconsultation_notification',
```

**Step 3: Test with TEST_MODE_EMAIL=true**

```bash
node -e "
  const emailService = require('./src/services/emailService');
  emailService.sendPreconsultationLink({
    email: 'test@test.com',
    language: 'es',
    patientName: 'Juan Garcia',
    appointmentDate: '2026-03-15',
    appointmentTime: '10:00',
    practitionerName: 'Dr. Martinez',
    preconsultationUrl: 'https://app.medimaestro.com/preconsultation/test-token',
    clinicName: 'Clinica Test'
  }).then(r => console.log('Sent:', r.messageId));
"
```

**Step 4: Commit**

```bash
git add src/services/emailService.js src/services/messagingService.js
git commit -m "feat(email): add preconsultation email templates (FR/ES/EN)"
```

---

## Phase 5 — Backend: Public Routes (Patient Portal)

### Task 9: Public preconsultation routes

**Files:**
- Create: `/var/www/medical-pro-backend/src/routes/public-preconsultation.js`
- Modify: `/var/www/medical-pro-backend/src/app.js` (register route)

**Step 1: Write failing tests**

Create `/var/www/medical-pro-backend/tests/routes/public-preconsultation.test.js`:
- `GET /:token` — valid token returns appointment info + patient data + status
- `GET /:token` — expired token returns 410 Gone
- `GET /:token` — invalid token returns 404
- `PUT /:token/patient-info` — updates patient profile, sets status to `patient_info_completed`
- `POST /:token/documents` — uploads file, returns document metadata
- `GET /:token/documents/:docId/file` — streams decrypted file with correct headers
- `POST /:token/confirm` — sets status `confirmed`, sends staff email
- `POST /:token/cancel` — within 24h limit: 400; beyond: sets `cancelled`, sends staff email
- `POST /:token/request-modification` — sets `modification_requested`, sends staff email
- `POST /:token/select-date` — selects from proposed_dates, sets `confirmed`
- `GET /:token/quote` — streams quote PDF
- `POST /:token/quote/accept` — sets `quote_accepted`, sends staff email
- `POST /:token/quote/reject` — sets `quote_rejected`, sends staff email

**Step 2: Run tests — verify they fail**

**Step 3: Implement route file**

Key pattern from `public-consent-signing.js`:
- NO authMiddleware
- `findTokenAcrossClinicDbs(token)` — searches all clinic DBs for the token
- Each handler: validate token → check expiry → perform action → update status on both `preconsultation_tokens` AND `appointments.preconsultation_status` → send email notification → audit log → respond

Rate limiting:
```javascript
const rateLimit = require('express-rate-limit');
const publicLimiter = rateLimit({ windowMs: 60000, max: 10 });
const uploadLimiter = rateLimit({ windowMs: 60000, max: 5 });
```

Multer config for document upload:
```javascript
const upload = multer({
  storage: multer.memoryStorage(), // buffer in memory, then encrypt to disk
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    cb(null, allowed.includes(file.mimetype));
  }
});
```

File streaming endpoint:
```javascript
router.get('/:token/documents/:docId/file', publicLimiter, async (req, res) => {
  // 1. Validate token
  // 2. Find document by docId, verify it belongs to same patient
  // 3. Read + decrypt file via fileStorageService
  // 4. Set headers: Content-Type, Content-Disposition: inline, Cache-Control: no-store
  // 5. Audit log
  // 6. res.send(decryptedBuffer)
});
```

**Step 4: Register route in app.js**

```javascript
const publicPreconsultation = require('./routes/public-preconsultation');
app.use('/api/v1/public-preconsultation', publicPreconsultation);
```

**Step 5: Run tests — verify they pass**

**Step 6: Commit**

```bash
git add src/routes/public-preconsultation.js tests/routes/public-preconsultation.test.js src/app.js
git commit -m "feat(api): add public preconsultation routes (patient portal)"
```

---

## Phase 6 — Backend: Staff Routes

### Task 10: Staff preconsultation & document routes

**Files:**
- Create: `/var/www/medical-pro-backend/src/routes/preconsultation.js`
- Create: `/var/www/medical-pro-backend/src/routes/patientDocuments.js`
- Modify: `/var/www/medical-pro-backend/src/app.js`

**Step 1: Write failing tests**

Tests for staff routes (with auth + RBAC):
- `POST /appointments/:id/send-preconsultation` — creates token, sends email, returns token info
- `POST /appointments/:id/send-reminder` — sends reminder email
- `POST /appointments/:id/propose-dates` — stores proposed_dates JSONB, sends email to patient
- `POST /appointments/:id/send-quote` — links existing quote to preconsultation, sends email
- `GET /patients/:id/documents` — returns document list (metadata only)
- `GET /patients/:id/documents/:docId/file` — streams decrypted file
- `DELETE /patients/:id/documents/:docId` — soft-delete (admin only)
- Permission tests: secretary can send, physician can view docs, readonly cannot

**Step 2: Run tests — verify they fail**

**Step 3: Implement routes**

`preconsultation.js`:
```javascript
const router = express.Router();
router.use(authMiddleware);
router.use(clinicRoutingMiddleware);

router.post('/appointments/:id/send-preconsultation',
  requirePermission(PERMISSIONS.PRECONSULTATION_SEND),
  async (req, res) => {
    // 1. Get appointment with patient
    // 2. Validate patient has email
    // 3. Create PreconsultationToken (language from req.body or patient default)
    // 4. Update appointment.preconsultation_status = 'sent'
    // 5. Send preconsultation_link email
    // 6. Audit log
    // 7. Return token info
  }
);
```

`patientDocuments.js`:
```javascript
router.get('/patients/:id/documents',
  requirePermission(PERMISSIONS.PATIENT_DOCUMENTS_VIEW),
  async (req, res) => {
    // Query PatientDocument where patient_id = req.params.id
    // Return metadata list (no file content)
  }
);

router.get('/patients/:id/documents/:docId/file',
  requirePermission(PERMISSIONS.PATIENT_DOCUMENTS_VIEW),
  async (req, res) => {
    // 1. Find document, verify patient_id matches
    // 2. Read + decrypt via fileStorageService
    // 3. Set headers, stream file
    // 4. Audit log: document viewed by staff
  }
);
```

**Step 4: Register in app.js**

**Step 5: Run tests — verify they pass**

**Step 6: Commit**

```bash
git add src/routes/preconsultation.js src/routes/patientDocuments.js tests/routes/ src/app.js
git commit -m "feat(api): add staff preconsultation and patient document routes"
```

---

### Task 11: Appointment reminder cron (implemented but disabled)

**Files:**
- Create: `/var/www/medical-pro-backend/src/scripts/appointmentReminder.js`

**Step 1: Write the script**

```javascript
// Finds appointments with preconsultation_status IN ('sent', 'confirmed')
// where appointment_date is tomorrow
// Sends reminder email to each patient via their preconsultation token
// Controlled by ENABLE_APPOINTMENT_REMINDERS env var

if (process.env.ENABLE_APPOINTMENT_REMINDERS !== 'true') {
  console.log('[AppointmentReminder] Disabled. Set ENABLE_APPOINTMENT_REMINDERS=true to enable.');
  process.exit(0);
}
```

**Step 2: Add to .env.example**

```
ENABLE_APPOINTMENT_REMINDERS=false
```

**Step 3: Add cron entry (commented out) in docs**

Document in README or deployment docs:
```
# Appointment reminders — uncomment to enable
# 0 * * * * cd /var/www/medical-pro-backend && node src/scripts/appointmentReminder.js >> /var/log/medimaestro/reminders.log 2>&1
```

**Step 4: Commit**

```bash
git add src/scripts/appointmentReminder.js .env.example
git commit -m "feat(cron): add appointment reminder script (disabled by default)"
```

---

## Phase 7 — Frontend: i18n

### Task 12: Add preconsultation translations (ES/FR/EN)

**Files:**
- Create: `/var/www/medical-pro/src/locales/es/preconsultation.json`
- Create: `/var/www/medical-pro/src/locales/fr/preconsultation.json`
- Create: `/var/www/medical-pro/src/locales/en/preconsultation.json`
- Modify: `/var/www/medical-pro/src/i18n.js` (register namespace)

**Step 1: Create translation files**

Keys to include:
- `status.*` — 9 status labels
- `actions.*` — sendLink, sendReminder, proposeDates, sendQuote
- `patientForm.*` — field labels, placeholders, validation messages
- `documents.*` — upload labels, file type messages, limits
- `confirmation.*` — confirm, cancel, requestModification labels
- `quote.*` — accept, reject, viewQuote labels
- `mrz.*` — scanId, scanning, scanSuccess, scanError, noMrzFound
- `stepper.*` — step labels (patientInfo, documents, confirmation)
- `notifications.*` — success/error messages

**Step 2: Register namespace in i18n.js**

Add `'preconsultation'` to the ns array and resources.

**Step 3: Verify translations load**

```bash
cd /var/www/medical-pro && npx react-scripts test --watchAll=false --testPathPattern='locales.test' --verbose
```

**Step 4: Commit**

```bash
git add src/locales/es/preconsultation.json src/locales/fr/preconsultation.json src/locales/en/preconsultation.json src/i18n.js
git commit -m "feat(i18n): add preconsultation translations (ES/FR/EN)"
```

---

## Phase 8 — Frontend: API Client

### Task 13: Preconsultation API client

**Files:**
- Create: `/var/www/medical-pro/src/api/preconsultationApi.js`

**Step 1: Write the API client**

Follow pattern from `appointmentsApi.js`:

```javascript
// Public routes (no auth, token in URL)
async function getPreconsultationByToken(token) { ... }
async function submitPatientInfo(token, patientData) { ... }
async function uploadDocument(token, file) { ... }       // multipart/form-data
async function getDocumentFile(token, docId) { ... }      // returns blob URL
async function deleteDocument(token, docId) { ... }
async function confirmAppointment(token) { ... }
async function cancelAppointment(token) { ... }
async function requestModification(token, message) { ... }
async function selectDate(token, dateIndex) { ... }
async function getQuote(token) { ... }                    // returns blob URL
async function acceptQuote(token) { ... }
async function rejectQuote(token) { ... }

// Staff routes (authenticated)
async function sendPreconsultationLink(appointmentId, language) { ... }
async function sendReminder(appointmentId) { ... }
async function proposeDates(appointmentId, dates) { ... }
async function sendQuoteToPatient(appointmentId, quoteId) { ... }
async function getPatientDocuments(patientId) { ... }
async function getPatientDocumentFile(patientId, docId) { ... }
async function deletePatientDocument(patientId, docId) { ... }
```

Note: public routes use `fetch()` directly (not baseClient which injects JWT). Staff routes use `baseClient`.

**Step 2: Commit**

```bash
git add src/api/preconsultationApi.js
git commit -m "feat(api): add preconsultation API client"
```

---

## Phase 9 — Frontend: Patient Portal (Public Pages)

### Task 14: Public preconsultation page — routing & layout

**Files:**
- Create: `/var/www/medical-pro/src/pages/public/PreconsultationPage.js`
- Modify: `/var/www/medical-pro/src/routes/index.js`

**Step 1: Create page shell with stepper**

- Route: `/preconsultation/:token` (no locale prefix, like consent signing)
- Loads token data on mount via `getPreconsultationByToken(token)`
- Sets i18n language from token's `language` field
- Responsive stepper: vertical on mobile, horizontal on desktop
- Steps: PatientInfo → Documents → Confirmation
- Handles expired/invalid token with error page

**Step 2: Register route in routes/index.js**

```javascript
<Route path="/preconsultation/:token" element={<PreconsultationPage />} />
```

**Step 3: Commit**

```bash
git add src/pages/public/PreconsultationPage.js src/routes/index.js
git commit -m "feat(ui): add preconsultation page shell with responsive stepper"
```

---

### Task 15: Patient info form step (with MRZ scanner)

**Files:**
- Create: `/var/www/medical-pro/src/components/preconsultation/PatientInfoStep.js`
- Create: `/var/www/medical-pro/src/components/preconsultation/MrzScanner.js`

**Step 1: Install dependencies**

```bash
cd /var/www/medical-pro && npm install mrz --legacy-peer-deps
```

Note: `mrz` package parses MRZ text. For camera capture on mobile, use native `<input type="file" accept="image/*" capture="environment">` + canvas extraction. OCR of MRZ zone from image uses Tesseract.js or a lightweight approach — for MVP, manual photo + crop + OCR. Alternatively, use `<input capture>` and have user type MRZ manually as fallback.

Simplest MVP approach: user takes photo, we display it, they can manually enter fields OR we attempt client-side MRZ reading with `mrz` package on manually typed MRZ lines.

**Step 2: Build PatientInfoStep**

- Fields: firstName, lastName, phone, email, dateOfBirth, gender, nationality, idNumber, address (street, postalCode, city, country)
- Pre-filled from token data if patient exists
- MRZ scanner button: opens camera (mobile) or file picker (desktop)
- On MRZ parse success: auto-fill name, DOB, gender, nationality, idNumber
- Validation: required fields (firstName, lastName, phone or email), email format, phone format
- Mobile: single column, large inputs
- Desktop: two-column grid

**Step 3: Build MrzScanner**

- Mobile: `<input type="file" accept="image/*" capture="environment">`
- Desktop: `<input type="file" accept="image/*">`
- After image selected: display preview, attempt MRZ extraction
- For MVP: if OCR not reliable, provide a text area where patient can type the 2-3 MRZ lines, then parse with `mrz` package
- Parse result: `{ firstName, lastName, dateOfBirth, gender, nationality, documentNumber }`
- Important: image stays in browser memory, never sent to server

**Step 4: Commit**

```bash
git add src/components/preconsultation/PatientInfoStep.js src/components/preconsultation/MrzScanner.js package.json
git commit -m "feat(ui): add patient info form step with MRZ scanner"
```

---

### Task 16: Document upload step

**Files:**
- Create: `/var/www/medical-pro/src/components/preconsultation/DocumentUploadStep.js`

**Step 1: Install react-dropzone**

```bash
npm install react-dropzone --legacy-peer-deps
```

**Step 2: Build DocumentUploadStep**

- Drag & drop zone (desktop) + file button + camera button (mobile)
- Accepted types: JPG, PNG, PDF, DOC, DOCX, XLS, XLSX
- Max 10 MB per file, max 10 files
- Upload progress indicator per file
- Thumbnail preview: images inline, PDF icon for PDFs, doc icon for Office
- Delete button per file (calls `deleteDocument(token, docId)`)
- Counter: "X/10 documents"
- Each file uploaded immediately via `uploadDocument(token, file)` — not batched
- Mobile: vertical list, large touch targets
- Desktop: grid with larger previews

**Step 3: Commit**

```bash
git add src/components/preconsultation/DocumentUploadStep.js package.json
git commit -m "feat(ui): add document upload step with drag-drop and camera"
```

---

### Task 17: Confirmation step

**Files:**
- Create: `/var/www/medical-pro/src/components/preconsultation/ConfirmationStep.js`

**Step 1: Build ConfirmationStep**

- Appointment summary: date, time, practitioner name, reason/type
- Three action buttons:
  - "Confirmer" (green) → calls `confirmAppointment(token)` → success screen
  - "Demander une modification" (orange) → text input for reason → calls `requestModification(token, message)` → confirmation screen
  - "Annuler" (red) → confirmation dialog → calls `cancelAppointment(token)` → confirmation screen
  - Cancel disabled if < 24h before appointment (message: "Il n'est plus possible d'annuler...")
- Success/confirmation screens with appropriate messaging

**Step 2: Commit**

```bash
git add src/components/preconsultation/ConfirmationStep.js
git commit -m "feat(ui): add appointment confirmation step"
```

---

### Task 18: Date selection page

**Files:**
- Create: `/var/www/medical-pro/src/components/preconsultation/DateSelectionStep.js`

**Step 1: Build DateSelectionStep**

- Displayed when token status is `modification_requested` and `proposed_dates` is not null
- Shows list of proposed date/time slots as selectable cards
- On selection: calls `selectDate(token, dateIndex)` → confirmation screen
- Mobile: full-width cards stacked
- Desktop: card grid

**Step 2: Commit**

```bash
git add src/components/preconsultation/DateSelectionStep.js
git commit -m "feat(ui): add date selection step for appointment modification"
```

---

### Task 19: Quote validation page

**Files:**
- Create: `/var/www/medical-pro/src/components/preconsultation/QuoteStep.js`

**Step 1: Build QuoteStep**

- Displayed when token status is `quote_sent`
- Loads quote PDF via `getQuote(token)` → displays in iframe (desktop) or link (mobile)
- Total amount displayed prominently
- Two buttons: "Accepter le devis" (green) / "Refuser le devis" (red)
- On accept/reject: calls API → confirmation screen with timestamp
- Mobile: PDF link (iframe doesn't work well on mobile) + buttons below
- Desktop: PDF iframe + buttons sidebar

**Step 2: Commit**

```bash
git add src/components/preconsultation/QuoteStep.js
git commit -m "feat(ui): add quote validation step"
```

---

## Phase 10 — Frontend: Staff Dashboard Integration

### Task 20: Preconsultation status badge on appointments

**Files:**
- Modify: `/var/www/medical-pro/src/components/dashboard/modules/AppointmentsModule.js`

**Step 1: Add status badge component**

Create a `PreconsultationStatusBadge` component (can be inline in the module or separate file):
- Takes `status` prop
- Returns colored badge with translated label
- Colors per design doc: grey (sent), light-blue (info completed), blue (docs uploaded), green (confirmed), orange (modification requested), red (cancelled), purple (quote sent), dark-green (quote accepted), dark-red (quote rejected)

**Step 2: Insert badge in appointment card**

Around line 636 in AppointmentsModule.js, after the existing status badge, add:
```jsx
{appointment.preconsultationStatus && (
  <PreconsultationStatusBadge status={appointment.preconsultationStatus} />
)}
```

**Step 3: Add filter by preconsultation status**

Add a filter dropdown for preconsultation_status in the filter bar.

**Step 4: Update appointmentsApi transform**

In `transformAppointmentFromBackend`, add `preconsultationStatus: raw.preconsultation_status`.

**Step 5: Commit**

```bash
git add src/components/dashboard/modules/AppointmentsModule.js src/api/appointmentsApi.js
git commit -m "feat(ui): add preconsultation status badge to appointment cards"
```

---

### Task 21: Preconsultation action buttons on appointments

**Files:**
- Modify: `/var/www/medical-pro/src/components/dashboard/modules/AppointmentsModule.js` or appointment detail/modal

**Step 1: Add action buttons**

Conditionally render buttons based on state:
- "Envoyer lien pre-consultation" — visible when no preconsultation_status, requires `PRECONSULTATION_SEND`
- "Envoyer rappel" — visible when status is `sent` or `confirmed`, requires `PRECONSULTATION_MANAGE`
- "Proposer des dates" — visible when status is `modification_requested`, requires `PRECONSULTATION_MANAGE`
- "Envoyer devis" — visible when status is `confirmed` and appointment is completed, requires `QUOTES_SEND` (existing permission)

Each button calls the corresponding staff API endpoint.

**Step 2: Add "Proposer des dates" modal**

Simple modal with date/time picker to add multiple date slots. Calls `proposeDates(appointmentId, dates)`.

**Step 3: Commit**

```bash
git add src/components/dashboard/modules/AppointmentsModule.js
git commit -m "feat(ui): add preconsultation action buttons to appointments"
```

---

### Task 22: Patient documents tab in PatientDetailModal

**Files:**
- Modify: `/var/www/medical-pro/src/components/dashboard/modals/PatientDetailModal.js`

**Step 1: Add documents tab**

In the tabs array (around line 172), add:
```javascript
{ id: 'documents', label: t('patients:detail.tabs.documents'), icon: FileText, visible: canViewDocuments }
```

Where `canViewDocuments = hasPermission(PERMISSIONS.PATIENT_DOCUMENTS_VIEW)`.

**Step 2: Add renderDocumentsTab()**

- Calls `getPatientDocuments(patientId)` on tab activation
- Lists documents: icon by type, original filename, date, size, associated appointment
- Click → opens document inline (PDF in modal iframe, image in modal img)
- Delete button (admin only, with confirmation)
- Uses `getPatientDocumentFile(patientId, docId)` to stream file for viewing

**Step 3: Add translations**

Add `patients:detail.tabs.documents` to ES/FR/EN patient locale files.

**Step 4: Commit**

```bash
git add src/components/dashboard/modals/PatientDetailModal.js src/locales/
git commit -m "feat(ui): add documents tab to patient detail modal"
```

---

## Phase 11 — Production Setup

### Task 23: Production deployment preparation

**Files:**
- Modify: `/var/www/medical-pro-backend/.env` (on prod server)
- Create directory: `/var/lib/medimaestro/documents/` (on prod server)

**Step 1: Create document storage directory on prod**

```bash
ssh -p 2222 root@72.62.51.173
mkdir -p /var/lib/medimaestro/documents
chown -R www-data:www-data /var/lib/medimaestro/documents
chmod 700 /var/lib/medimaestro/documents
```

**Step 2: Generate encryption key**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add to prod `.env`:
```
DOCUMENTS_ROOT=/var/lib/medimaestro/documents
DOCUMENTS_ENCRYPTION_KEY=<generated_key>
ENABLE_APPOINTMENT_REMINDERS=false
```

**Step 3: Run migrations on prod**

```bash
cd /var/www/medical-pro-backend
node scripts/run-clinic-migrations.js
```

**Step 4: Restart backend**

```bash
pm2 restart medical-pro-backend
```

**Step 5: Verify**

```bash
curl -s https://app.medimaestro.com/api/v1/public-preconsultation/invalid-token | jq .
# Expected: 404
```

---

## Phase 12 — Integration Testing

### Task 24: End-to-end manual test

**Steps:**
1. Log in as secretary
2. Create a patient (or use existing)
3. Create an appointment for the patient
4. Click "Envoyer lien pre-consultation" → verify email received (test mode)
5. Open the preconsultation link → verify page loads in patient's language
6. Fill patient info form → verify status updates to `patient_info_completed`
7. Upload 2-3 documents (JPG, PDF) → verify status updates, files appear in patient documents tab
8. Confirm appointment → verify status `confirmed`, secretary email received
9. Log in as secretary, verify dashboard shows updated status badges
10. Complete the appointment, create a quote
11. Click "Envoyer devis" → verify patient email received
12. Open quote link → verify PDF displays, accept → verify `quote_accepted` status
13. Verify all actions appear in audit logs
14. Test on mobile device (real phone or devtools)
15. Test cancel flow (> 24h and < 24h before appointment)
16. Test modification request → propose dates → patient selects date

---

## Summary

| Phase | Tasks | Focus |
|---|---|---|
| 1 | 1-5 | Database migrations & Sequelize models |
| 2 | 6 | Encrypted file storage service |
| 3 | 7 | RBAC permissions |
| 4 | 8 | Email templates (FR/ES/EN) |
| 5 | 9 | Public routes (patient portal API) |
| 6 | 10-11 | Staff routes + reminder cron |
| 7 | 12 | i18n translations |
| 8 | 13 | Frontend API client |
| 9 | 14-19 | Patient portal UI (6 components) |
| 10 | 20-22 | Staff dashboard integration |
| 11 | 23 | Production setup |
| 12 | 24 | Integration testing |

**Total: 24 tasks, 12 phases.**

Backend first (phases 1-6), then frontend (phases 7-10), then deploy (phases 11-12).
