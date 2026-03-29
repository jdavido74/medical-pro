# Epicrisis — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add epicrisis (clinical episode summary) generation with section selection, PDF output, and digital signature; simplify the receta tab by removing configuration panel.

**Architecture:** New `epicrises` table in clinic DB, new backend CRUD + sign/verify routes, new frontend modal (composer + preview + signature dialog). Reuses snapshot pattern from prescriptions. Closes episodes by setting `is_closed=true` on parent + evolutions.

**Tech Stack:** PostgreSQL migrations, Sequelize model, Express routes, React components, SHA-256 hashing, bcrypt password verification, iframe print-to-PDF

**Spec:** `docs/superpowers/specs/2026-03-29-epicrisis-design.md`
**Fallback:** `v1.9.0-pre-epicrisis` tag on both repos

---

## File Map

### Backend (`/var/www/medical-pro-backend`)

| File | Action | Purpose |
|---|---|---|
| `migrations/clinic_075_create_epicrises.sql` | Create | Epicrises table |
| `migrations/clinic_076_medical_record_is_closed.sql` | Create | Add is_closed to medical_records |
| `scripts/run-clinic-migrations.js` | Modify | Add clinic_075-076 |
| `src/services/clinicProvisioningService.js` | Modify | Add clinic_075-076 |
| `src/models/clinic/Epicrisis.js` | Create | Epicrisis model |
| `src/models/clinic/MedicalRecord.js` | Modify | Add is_closed field |
| `src/base/ModelFactory.js` | Modify | Register Epicrisis model |
| `src/routes/epicrises.js` | Create | CRUD + finalize + sign + verify |
| `server.js` | Modify | Mount epicrises routes |

### Frontend (`/var/www/medical-pro`)

| File | Action | Purpose |
|---|---|---|
| `src/api/epicrisisApi.js` | Create | API client |
| `src/components/medical/EpicrisisComposerModal.js` | Create | Main modal with config + preview |
| `src/components/medical/EpicrisisSignatureDialog.js` | Create | Password confirmation dialog |
| `src/components/dashboard/modules/MedicalRecordsModule.js` | Modify | Wire "Terminar el historial" button |
| `src/components/medical/MedicalRecordForm.js` | Modify | Remove prescription config panel |
| `src/locales/es/medical.json` | Modify | Add epicrisis keys |
| `src/locales/fr/medical.json` | Modify | Add epicrisis keys |
| `src/locales/en/medical.json` | Modify | Add epicrisis keys |

---

## Task 1: Database Migrations

**Files:**
- Create: `migrations/clinic_075_create_epicrises.sql`
- Create: `migrations/clinic_076_medical_record_is_closed.sql`
- Modify: `scripts/run-clinic-migrations.js:74`
- Modify: `src/services/clinicProvisioningService.js:221`

- [ ] **Step 1: Create clinic_075_create_epicrises.sql**

```sql
-- Create epicrises table for clinical episode summaries
CREATE TABLE IF NOT EXISTS epicrises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_record_id UUID NOT NULL REFERENCES medical_records(id),
  provider_id UUID NOT NULL,
  patient_id UUID NOT NULL,

  -- Content
  selected_sections JSONB NOT NULL DEFAULT '{}',
  conclusion TEXT,
  recommendations TEXT,
  prognosis TEXT,

  -- Snapshots (frozen at generation)
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

CREATE INDEX IF NOT EXISTS idx_epicrises_medical_record ON epicrises(medical_record_id);
CREATE INDEX IF NOT EXISTS idx_epicrises_patient ON epicrises(patient_id);
```

- [ ] **Step 2: Create clinic_076_medical_record_is_closed.sql**

```sql
-- Add is_closed flag for epicrisis-closed episodes
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS is_closed BOOLEAN DEFAULT false;
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP;
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS closed_by UUID;
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS epicrisis_id UUID REFERENCES epicrises(id) ON DELETE SET NULL;
```

- [ ] **Step 3: Add to migration lists**

In `scripts/run-clinic-migrations.js`, after `'clinic_074_appointment_room.sql'`:
```javascript
  'clinic_075_create_epicrises.sql',
  'clinic_076_medical_record_is_closed.sql',
```

In `src/services/clinicProvisioningService.js`, after `'clinic_074_appointment_room.sql'`:
```javascript
        'clinic_075_create_epicrises.sql',
        'clinic_076_medical_record_is_closed.sql',
```

- [ ] **Step 4: Commit**

```bash
cd /var/www/medical-pro-backend
git add migrations/clinic_075_create_epicrises.sql migrations/clinic_076_medical_record_is_closed.sql scripts/run-clinic-migrations.js src/services/clinicProvisioningService.js
git commit -m "feat(epicrisis): add migrations for epicrises table and medical_record is_closed"
```

---

## Task 2: Backend Model — Epicrisis

**Files:**
- Create: `src/models/clinic/Epicrisis.js`
- Modify: `src/models/clinic/MedicalRecord.js`
- Modify: `src/base/ModelFactory.js`

- [ ] **Step 1: Create Epicrisis model**

Create `/var/www/medical-pro-backend/src/models/clinic/Epicrisis.js`:

```javascript
const { DataTypes } = require('sequelize');
const crypto = require('crypto');

module.exports = (sequelize) => {
  const Epicrisis = sequelize.define('Epicrisis', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    medical_record_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'medical_records', key: 'id' },
    },
    provider_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    patient_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    selected_sections: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    conclusion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    recommendations: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    prognosis: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    patient_snapshot: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    provider_snapshot: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    aggregated_data: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'draft',
      validate: { isIn: [['draft', 'finalized', 'signed']] },
    },
    signed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    signed_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    content_hash: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    signature_method: {
      type: DataTypes.STRING(20),
      defaultValue: 'password',
    },
    epicrisis_number: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'epicrises',
    timestamps: true,
    underscored: true,
  });

  // Instance methods
  Epicrisis.prototype.canBeModified = function () {
    return this.status === 'draft';
  };

  Epicrisis.prototype.finalize = async function (userId) {
    if (this.status !== 'draft') {
      throw new Error('Solo se puede finalizar un borrador');
    }
    this.status = 'finalized';
    await this.save();
    return this;
  };

  Epicrisis.prototype.computeHash = function () {
    const payload = JSON.stringify({
      selectedSections: this.selected_sections,
      conclusion: this.conclusion,
      recommendations: this.recommendations,
      prognosis: this.prognosis,
      aggregatedData: this.aggregated_data,
      patientSnapshot: this.patient_snapshot,
      providerSnapshot: this.provider_snapshot,
      medicalRecordId: this.medical_record_id,
    });
    return crypto.createHash('sha256').update(payload).digest('hex');
  };

  // Class methods
  Epicrisis.generateEpicrisisNumber = async function () {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `EPI-${year}-${month}`;

    const [results] = await sequelize.query(
      `SELECT COUNT(*) as cnt FROM epicrises WHERE epicrisis_number LIKE :prefix`,
      { replacements: { prefix: `${prefix}%` } }
    );
    const count = parseInt(results[0].cnt) + 1;
    return `${prefix}-${String(count).padStart(4, '0')}`;
  };

  return Epicrisis;
};
```

- [ ] **Step 2: Add is_closed to MedicalRecord model**

In `/var/www/medical-pro-backend/src/models/clinic/MedicalRecord.js`, after the `archived_by` field (around line 270), add:

```javascript
    // Episode closure (via epicrisis)
    is_closed: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    closed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    closed_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    epicrisis_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'epicrises', key: 'id' },
      onDelete: 'SET NULL',
    },
```

- [ ] **Step 3: Register Epicrisis in ModelFactory**

In `src/base/ModelFactory.js`, add import after Room import:
```javascript
const createEpicrisis = require('../models/clinic/Epicrisis');
```

Add to `CLINIC_MODEL_FACTORIES` object:
```javascript
  Epicrisis: createEpicrisis,
```

Add association case in `setupAssociations`:
```javascript
case 'Epicrisis':
  if (dbModels.MedicalRecord) {
    dbModels.Epicrisis.belongsTo(dbModels.MedicalRecord, { foreignKey: 'medical_record_id', as: 'medicalRecord' });
  }
  break;
```

In the MedicalRecord case, add:
```javascript
if (dbModels.Epicrisis) {
  dbModels.MedicalRecord.hasOne(dbModels.Epicrisis, { foreignKey: 'medical_record_id', as: 'epicrisis' });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/models/clinic/Epicrisis.js src/models/clinic/MedicalRecord.js src/base/ModelFactory.js
git commit -m "feat(epicrisis): add Epicrisis model, is_closed on MedicalRecord, register in ModelFactory"
```

---

## Task 3: Backend Routes — Epicrisis CRUD + Sign

**Files:**
- Create: `src/routes/epicrises.js`
- Modify: `server.js`

- [ ] **Step 1: Create epicrises route**

Create `/var/www/medical-pro-backend/src/routes/epicrises.js`:

```javascript
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const bcrypt = require('bcryptjs');
const { getModel } = require('../base/ModelFactory');
const { requirePermission } = require('../middleware/permissions');

// Validation schemas
const createEpicrisisSchema = Joi.object({
  medicalRecordId: Joi.string().uuid().required(),
  patientId: Joi.string().uuid().required(),
  selectedSections: Joi.object({
    includeChiefComplaint: Joi.boolean().default(true),
    includeCurrentIllness: Joi.boolean().default(true),
    includeAntecedents: Joi.boolean().default(false),
    includeVitalSigns: Joi.boolean().default(true),
    includePhysicalExam: Joi.boolean().default(false),
    includeDiagnosis: Joi.boolean().default(true),
    includeTreatments: Joi.boolean().default(true),
    includeCurrentMedications: Joi.boolean().default(false),
    includeChronicConditions: Joi.boolean().default(false),
    includeTreatmentPlan: Joi.boolean().default(false),
    includeEvolutionTimeline: Joi.boolean().default(true),
  }).required(),
  conclusion: Joi.string().allow('', null).optional(),
  recommendations: Joi.string().allow('', null).optional(),
  prognosis: Joi.string().allow('', null).optional(),
  patientSnapshot: Joi.object().optional(),
  providerSnapshot: Joi.object().optional(),
  aggregatedData: Joi.object().optional(),
});

const updateEpicrisisSchema = Joi.object({
  selectedSections: Joi.object().optional(),
  conclusion: Joi.string().allow('', null).optional(),
  recommendations: Joi.string().allow('', null).optional(),
  prognosis: Joi.string().allow('', null).optional(),
  patientSnapshot: Joi.object().optional(),
  providerSnapshot: Joi.object().optional(),
  aggregatedData: Joi.object().optional(),
});

const signEpicrisisSchema = Joi.object({
  password: Joi.string().required(),
});

// Helper: get provider ID from central user
async function getProviderIdFromUser(clinicDb, userId) {
  const HealthcareProvider = await getModel(clinicDb, 'HealthcareProvider');
  const provider = await HealthcareProvider.findOne({ where: { user_id: userId } });
  return provider?.id || null;
}

// Helper: aggregate data from parent record + evolutions
async function aggregateEpisodeData(clinicDb, parentRecordId, selectedSections) {
  const MedicalRecord = await getModel(clinicDb, 'MedicalRecord');

  const parent = await MedicalRecord.findByPk(parentRecordId);
  if (!parent) throw new Error('Parent record not found');

  const parentData = parent.toJSON ? parent.toJSON() : parent;

  // Load all evolutions
  const evolutions = await MedicalRecord.findAll({
    where: { parent_record_id: parentRecordId, archived: false },
    order: [['record_date', 'ASC'], ['created_at', 'ASC']],
  });

  const evoData = evolutions.map(e => {
    const d = e.toJSON ? e.toJSON() : e;
    return {
      id: d.id,
      recordDate: d.record_date || d.created_at,
      chiefComplaint: d.chief_complaint,
      currentIllness: d.current_illness,
      evolution: d.evolution,
      notes: d.notes,
      vitalSigns: d.vital_signs,
      diagnosis: d.diagnosis,
      treatments: d.treatments,
      physicalExam: d.physical_exam,
      treatmentPlan: d.treatment_plan,
      currentMedications: d.current_medications,
      chronicConditions: d.chronic_conditions,
      providerId: d.provider_id,
    };
  });

  const aggregated = {};

  if (selectedSections.includeChiefComplaint) {
    aggregated.chiefComplaint = parentData.chief_complaint;
  }
  if (selectedSections.includeCurrentIllness) {
    aggregated.currentIllness = parentData.current_illness;
  }
  if (selectedSections.includeAntecedents) {
    aggregated.antecedents = parentData.antecedents;
    aggregated.allergies = parentData.allergies;
  }
  if (selectedSections.includeVitalSigns) {
    // Chronological: parent + all evolutions
    const allVitals = [];
    if (parentData.vital_signs && Object.values(parentData.vital_signs).some(v => v)) {
      allVitals.push({ date: parentData.record_date || parentData.created_at, ...parentData.vital_signs });
    }
    for (const evo of evoData) {
      if (evo.vitalSigns && Object.values(evo.vitalSigns).some(v => v)) {
        allVitals.push({ date: evo.recordDate, ...evo.vitalSigns });
      }
    }
    aggregated.vitalSignsTimeline = allVitals;
  }
  if (selectedSections.includePhysicalExam) {
    aggregated.physicalExam = parentData.physical_exam;
  }
  if (selectedSections.includeDiagnosis) {
    aggregated.diagnosis = parentData.diagnosis;
  }
  if (selectedSections.includeTreatments) {
    // Aggregate and deduplicate treatments from parent + evolutions
    const allTreatments = [];
    const seen = new Set();
    const addTreatments = (treatments) => {
      if (!Array.isArray(treatments)) return;
      for (const t of treatments) {
        const key = `${t.medication}-${t.dosage}`;
        if (!seen.has(key)) {
          seen.add(key);
          allTreatments.push(t);
        }
      }
    };
    addTreatments(parentData.treatments);
    for (const evo of evoData) {
      addTreatments(evo.treatments);
    }
    aggregated.treatments = allTreatments;
  }
  if (selectedSections.includeCurrentMedications) {
    aggregated.currentMedications = parentData.current_medications;
  }
  if (selectedSections.includeChronicConditions) {
    aggregated.chronicConditions = parentData.chronic_conditions;
  }
  if (selectedSections.includeTreatmentPlan) {
    aggregated.treatmentPlan = parentData.treatment_plan;
  }
  if (selectedSections.includeEvolutionTimeline) {
    aggregated.evolutions = evoData;
  }

  aggregated.parentRecordDate = parentData.record_date || parentData.created_at;
  aggregated.parentRecordType = parentData.record_type;

  return aggregated;
}

// POST / — Create draft epicrisis
router.post('/', async (req, res) => {
  try {
    const { error, value } = createEpicrisisSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: { message: 'Datos inválidos', details: error.details.map(d => d.message).join(', ') } });
    }

    const Epicrisis = await getModel(req.clinicDb, 'Epicrisis');
    const providerId = await getProviderIdFromUser(req.clinicDb, req.user.id);

    // Aggregate data
    const aggregatedData = await aggregateEpisodeData(req.clinicDb, value.medicalRecordId, value.selectedSections);

    const epicrisisNumber = await Epicrisis.generateEpicrisisNumber();

    const epicrisis = await Epicrisis.create({
      medical_record_id: value.medicalRecordId,
      provider_id: providerId || req.user.id,
      patient_id: value.patientId,
      selected_sections: value.selectedSections,
      conclusion: value.conclusion || null,
      recommendations: value.recommendations || null,
      prognosis: value.prognosis || null,
      patient_snapshot: value.patientSnapshot || null,
      provider_snapshot: value.providerSnapshot || null,
      aggregated_data: aggregatedData,
      epicrisis_number: epicrisisNumber,
      status: 'draft',
    });

    res.status(201).json({ success: true, data: epicrisis });
  } catch (err) {
    console.error('[epicrises] POST error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// GET /record/:recordId — Get epicrisis for a parent record
router.get('/record/:recordId', async (req, res) => {
  try {
    const Epicrisis = await getModel(req.clinicDb, 'Epicrisis');
    const epicrisis = await Epicrisis.findOne({
      where: { medical_record_id: req.params.recordId },
      order: [['created_at', 'DESC']],
    });
    res.json({ success: true, data: epicrisis });
  } catch (err) {
    console.error('[epicrises] GET /record/:id error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// GET /:id — Get epicrisis by ID
router.get('/:id', async (req, res) => {
  try {
    const Epicrisis = await getModel(req.clinicDb, 'Epicrisis');
    const epicrisis = await Epicrisis.findByPk(req.params.id);
    if (!epicrisis) {
      return res.status(404).json({ success: false, error: { message: 'Epicrisis no encontrada' } });
    }
    res.json({ success: true, data: epicrisis });
  } catch (err) {
    console.error('[epicrises] GET /:id error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// PUT /:id — Update draft epicrisis
router.put('/:id', async (req, res) => {
  try {
    const Epicrisis = await getModel(req.clinicDb, 'Epicrisis');
    const epicrisis = await Epicrisis.findByPk(req.params.id);
    if (!epicrisis) {
      return res.status(404).json({ success: false, error: { message: 'Epicrisis no encontrada' } });
    }
    if (!epicrisis.canBeModified()) {
      return res.status(400).json({ success: false, error: { message: 'Solo se pueden modificar borradores' } });
    }

    const { error, value } = updateEpicrisisSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: { message: 'Datos inválidos', details: error.details.map(d => d.message).join(', ') } });
    }

    // Re-aggregate if sections changed
    if (value.selectedSections) {
      value.aggregatedData = await aggregateEpisodeData(req.clinicDb, epicrisis.medical_record_id, value.selectedSections);
    }

    // Map camelCase to snake_case
    const updateData = {};
    if (value.selectedSections !== undefined) updateData.selected_sections = value.selectedSections;
    if (value.conclusion !== undefined) updateData.conclusion = value.conclusion;
    if (value.recommendations !== undefined) updateData.recommendations = value.recommendations;
    if (value.prognosis !== undefined) updateData.prognosis = value.prognosis;
    if (value.patientSnapshot !== undefined) updateData.patient_snapshot = value.patientSnapshot;
    if (value.providerSnapshot !== undefined) updateData.provider_snapshot = value.providerSnapshot;
    if (value.aggregatedData !== undefined) updateData.aggregated_data = value.aggregatedData;

    await epicrisis.update(updateData);

    res.json({ success: true, data: epicrisis });
  } catch (err) {
    console.error('[epicrises] PUT /:id error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// POST /:id/finalize — Mark as finalized
router.post('/:id/finalize', async (req, res) => {
  try {
    const Epicrisis = await getModel(req.clinicDb, 'Epicrisis');
    const epicrisis = await Epicrisis.findByPk(req.params.id);
    if (!epicrisis) {
      return res.status(404).json({ success: false, error: { message: 'Epicrisis no encontrada' } });
    }

    await epicrisis.finalize(req.user.id);

    res.json({ success: true, data: epicrisis, message: 'Epicrisis finalizada' });
  } catch (err) {
    console.error('[epicrises] POST /:id/finalize error:', err);
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

// POST /:id/sign — Sign and close episode
router.post('/:id/sign', async (req, res) => {
  try {
    const { error, value } = signEpicrisisSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: { message: 'Contraseña requerida' } });
    }

    // Verify password against central DB user
    const centralDb = req.app.get('centralDb');
    const [users] = await centralDb.query(
      'SELECT password_hash FROM users WHERE id = $1',
      { bind: [req.user.id] }
    );
    if (!users.length) {
      return res.status(401).json({ success: false, error: { message: 'Usuario no encontrado' } });
    }

    const passwordValid = await bcrypt.compare(value.password, users[0].password_hash);
    if (!passwordValid) {
      return res.status(401).json({ success: false, error: { message: 'Contraseña incorrecta' } });
    }

    // Load epicrisis
    const Epicrisis = await getModel(req.clinicDb, 'Epicrisis');
    const epicrisis = await Epicrisis.findByPk(req.params.id);
    if (!epicrisis) {
      return res.status(404).json({ success: false, error: { message: 'Epicrisis no encontrada' } });
    }
    if (epicrisis.status === 'signed') {
      return res.status(400).json({ success: false, error: { message: 'Epicrisis ya firmada' } });
    }

    // Compute hash and sign
    const providerId = await getProviderIdFromUser(req.clinicDb, req.user.id);
    const contentHash = epicrisis.computeHash();

    await epicrisis.update({
      status: 'signed',
      signed_at: new Date(),
      signed_by: providerId || req.user.id,
      content_hash: contentHash,
      signature_method: 'password',
    });

    // Close the episode: parent + all evolutions
    const MedicalRecord = await getModel(req.clinicDb, 'MedicalRecord');
    const now = new Date();

    await MedicalRecord.update(
      { is_closed: true, closed_at: now, closed_by: providerId || req.user.id, epicrisis_id: epicrisis.id },
      { where: { id: epicrisis.medical_record_id } }
    );
    await MedicalRecord.update(
      { is_closed: true, closed_at: now, closed_by: providerId || req.user.id },
      { where: { parent_record_id: epicrisis.medical_record_id, archived: false } }
    );

    res.json({ success: true, data: epicrisis, message: 'Epicrisis firmada y episodio cerrado' });
  } catch (err) {
    console.error('[epicrises] POST /:id/sign error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// GET /:id/verify — Verify integrity
router.get('/:id/verify', async (req, res) => {
  try {
    const Epicrisis = await getModel(req.clinicDb, 'Epicrisis');
    const epicrisis = await Epicrisis.findByPk(req.params.id);
    if (!epicrisis) {
      return res.status(404).json({ success: false, error: { message: 'Epicrisis no encontrada' } });
    }
    if (epicrisis.status !== 'signed') {
      return res.json({ success: true, data: { verified: false, reason: 'not_signed' } });
    }

    const currentHash = epicrisis.computeHash();
    const isValid = currentHash === epicrisis.content_hash;

    res.json({
      success: true,
      data: {
        verified: isValid,
        storedHash: epicrisis.content_hash,
        currentHash,
        signedAt: epicrisis.signed_at,
        signedBy: epicrisis.signed_by,
      },
    });
  } catch (err) {
    console.error('[epicrises] GET /:id/verify error:', err);
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

module.exports = router;
```

- [ ] **Step 2: Mount routes in server.js**

After the prescriptions route mount (around line 276), add:
```javascript
const epicrisesRoutes = require('./src/routes/epicrises');
app.use(`/api/${API_VERSION}/epicrises`, authMiddleware, clinicRoutingMiddleware, epicrisesRoutes);
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/epicrises.js server.js
git commit -m "feat(epicrisis): add CRUD + sign + verify API routes"
```

---

## Task 4: Frontend — API Client + i18n

**Files:**
- Create: `src/api/epicrisisApi.js`
- Modify: `src/locales/es/medical.json`
- Modify: `src/locales/fr/medical.json`
- Modify: `src/locales/en/medical.json`

- [ ] **Step 1: Create epicrisisApi.js**

Create `/var/www/medical-pro/src/api/epicrisisApi.js`:

```javascript
import { baseClient } from './baseClient';

const ENDPOINT = '/epicrises';

export const createEpicrisis = async (data) => baseClient.post(ENDPOINT, data);
export const getEpicrisis = async (id) => baseClient.get(`${ENDPOINT}/${id}`);
export const getEpicrisisForRecord = async (recordId) => baseClient.get(`${ENDPOINT}/record/${recordId}`);
export const updateEpicrisis = async (id, data) => baseClient.put(`${ENDPOINT}/${id}`, data);
export const finalizeEpicrisis = async (id) => baseClient.post(`${ENDPOINT}/${id}/finalize`);
export const signEpicrisis = async (id, password) => baseClient.post(`${ENDPOINT}/${id}/sign`, { password });
export const verifyEpicrisis = async (id) => baseClient.get(`${ENDPOINT}/${id}/verify`);

export default { createEpicrisis, getEpicrisis, getEpicrisisForRecord, updateEpicrisis, finalizeEpicrisis, signEpicrisis, verifyEpicrisis };
```

- [ ] **Step 2: Add Spanish i18n keys**

In `src/locales/es/medical.json`, add at root level:

```json
"epicrisis": {
  "title": "Epicrisis",
  "subtitle": "Resumen del episodio clínico",
  "draft": "Borrador",
  "finalized": "Finalizada",
  "signed": "Firmada",
  "closed": "Cerrado",
  "selectSections": "Secciones a incluir",
  "conclusion": "Conclusión",
  "conclusionPlaceholder": "Síntesis del episodio clínico...",
  "recommendations": "Recomendaciones de seguimiento",
  "recommendationsPlaceholder": "Indicaciones para el paciente...",
  "prognosis": "Pronóstico",
  "prognosisPlaceholder": "Evaluación pronóstica...",
  "generateDraft": "Generar borrador PDF",
  "signAndClose": "Firmar y cerrar el episodio",
  "confirmCloseTitle": "Cerrar episodio clínico",
  "confirmCloseMessage": "Esta acción cerrará el episodio clínico. No se podrán añadir más evoluciones. ¿Continuar?",
  "enterPassword": "Introduzca su contraseña para firmar",
  "signatureSuccess": "Epicrisis firmada y episodio cerrado",
  "signatureError": "Error al firmar la epicrisis",
  "wrongPassword": "Contraseña incorrecta",
  "verifyIntegrity": "Verificar integridad",
  "integrityOk": "Documento íntegro — no ha sido modificado",
  "integrityFailed": "Alerta: el documento ha sido modificado después de la firma",
  "episodeClosed": "Episodio cerrado",
  "noMoreEvolutions": "No se pueden añadir más evoluciones",
  "sections": {
    "chiefComplaint": "Motivo de consulta",
    "currentIllness": "Enfermedad actual",
    "antecedents": "Antecedentes y alergias",
    "vitalSigns": "Constantes vitales",
    "physicalExam": "Examen físico",
    "diagnosis": "Diagnóstico",
    "treatments": "Tratamientos prescritos",
    "currentMedications": "Medicamentos actuales",
    "chronicConditions": "Condiciones crónicas",
    "treatmentPlan": "Plan de tratamiento",
    "evolutionTimeline": "Cronología de evoluciones"
  },
  "pdf": {
    "title": "EPICRISIS",
    "patientInfo": "Datos del paciente",
    "attendingPhysician": "Médico tratante",
    "aggregatedSections": "Resumen clínico",
    "evolutionTimeline": "Cronología de evoluciones",
    "conclusionSection": "Conclusión y pronóstico",
    "signedBy": "Firmado por",
    "documentHash": "Hash del documento",
    "generatedOn": "Generado el"
  }
}
```

- [ ] **Step 3: Add French i18n keys**

In `src/locales/fr/medical.json`, add equivalent `"epicrisis"` object with French translations.

- [ ] **Step 4: Add English i18n keys**

In `src/locales/en/medical.json`, add equivalent `"epicrisis"` object with English translations.

- [ ] **Step 5: Commit**

```bash
cd /var/www/medical-pro
git add src/api/epicrisisApi.js src/locales/es/medical.json src/locales/fr/medical.json src/locales/en/medical.json
git commit -m "feat(epicrisis): add API client and i18n labels (es/fr/en)"
```

---

## Task 5: Frontend — EpicrisisSignatureDialog

**Files:**
- Create: `src/components/medical/EpicrisisSignatureDialog.js`

- [ ] **Step 1: Create signature dialog component**

Create `/var/www/medical-pro/src/components/medical/EpicrisisSignatureDialog.js`:

A simple modal dialog with:
- Confirmation message ("Esta acción cerrará el episodio clínico...")
- Password input field
- Cancel + Confirm buttons
- Loading state during API call
- Error message display (wrong password)

Props: `{ isOpen, onClose, onConfirm, loading, error }`

The `onConfirm` callback receives the password string. The parent component calls the sign API.

- [ ] **Step 2: Commit**

```bash
git add src/components/medical/EpicrisisSignatureDialog.js
git commit -m "feat(epicrisis): add signature confirmation dialog"
```

---

## Task 6: Frontend — EpicrisisComposerModal

**Files:**
- Create: `src/components/medical/EpicrisisComposerModal.js`

This is the main component. It should be created as a single focused file containing:

- [ ] **Step 1: Create the composer modal**

Create `/var/www/medical-pro/src/components/medical/EpicrisisComposerModal.js`:

**Props:**
```javascript
{ isOpen, onClose, parentRecord, evolutions, patient, provider, onEpisodeClosed }
```

**State:**
```javascript
const [selectedSections, setSelectedSections] = useState({
  includeChiefComplaint: true,
  includeCurrentIllness: true,
  includeAntecedents: false,
  includeVitalSigns: true,
  includePhysicalExam: false,
  includeDiagnosis: true,
  includeTreatments: true,
  includeCurrentMedications: false,
  includeChronicConditions: false,
  includeTreatmentPlan: false,
  includeEvolutionTimeline: true,
});
const [conclusion, setConclusion] = useState('');
const [recommendations, setRecommendations] = useState('');
const [prognosis, setPrognosis] = useState('');
const [epicrisisId, setEpicrisisId] = useState(null);
const [status, setStatus] = useState('draft');
const [showSignDialog, setShowSignDialog] = useState(false);
const [signError, setSignError] = useState(null);
const [signing, setSigning] = useState(false);
const [saving, setSaving] = useState(false);
```

**Layout:** Full-screen modal (`fixed inset-0 z-50`) with:

1. **Header**: Title "Epicrisis" + patient name + close button
2. **Body** split into two columns (`grid grid-cols-2`):
   - **Left column** (scrollable): Section checkboxes + conclusion/recommendations/prognosis textareas
   - **Right column** (scrollable): Live preview rendering aggregated data based on current selections
3. **Footer**: "Generar borrador PDF" button + "Firmar y cerrar el episodio" button

**Key behaviors:**

- On open: check if an existing draft epicrisis exists for this record via `getEpicrisisForRecord(parentRecord.id)`. If yes, load it.
- Section toggle: updates `selectedSections` state → right panel re-renders preview
- "Generar borrador PDF": save/update epicrisis via API, then trigger print via hidden iframe (same pattern as PrescriptionPreview)
- "Firmar y cerrar": opens EpicrisisSignatureDialog. On password confirm, calls `signEpicrisis(id, password)`. On success, calls `onEpisodeClosed()` and closes modal.

**Live preview** renders based on `parentRecord`, `evolutions`, and `selectedSections`:
- Aggregated vital signs as chronological table
- Deduplicated treatments as table
- Evolution timeline with dates and content
- Conclusion/recommendations/prognosis from text fields

**PDF generation**: Build HTML string from preview data, open in hidden iframe, trigger `window.print()`. Include header (clinic info, "EPICRISIS", number), patient info, all selected sections, conclusion block, footer with signature/hash/status.

- [ ] **Step 2: Commit**

```bash
git add src/components/medical/EpicrisisComposerModal.js
git commit -m "feat(epicrisis): add composer modal with section selection, preview, and PDF generation"
```

---

## Task 7: Frontend — Wire Modal into MedicalRecordsModule

**Files:**
- Modify: `src/components/dashboard/modules/MedicalRecordsModule.js`

- [ ] **Step 1: Import EpicrisisComposerModal**

Add import at top:
```javascript
import EpicrisisComposerModal from '../../medical/EpicrisisComposerModal';
```

- [ ] **Step 2: Add state for epicrisis modal**

In the MedicalRecordsModule component, add:
```javascript
const [epicrisisModal, setEpicrisisModal] = useState({ show: false, parentRecord: null });
```

- [ ] **Step 3: Change "Terminar el historial" button handler**

Find the button with `t('medical:episode.finishHistory', 'Terminar el historial')` in the GroupedRecordsList. Change its `onClick` to call a new handler:

```javascript
onClick={() => handleOpenEpicrisis(parent)}
```

Add the handler in MedicalRecordsModule:
```javascript
const handleOpenEpicrisis = async (parentRecord) => {
  // Load full record with evolutions
  const fullRecord = await getRecordById(parentRecord.id);
  setEpicrisisModal({ show: true, parentRecord: fullRecord });
};
```

Pass `handleOpenEpicrisis` as prop to GroupedRecordsList alongside the other handlers.

- [ ] **Step 4: Hide "Añadir una evolución" and "Terminar el historial" for closed episodes**

In GroupedRecordsList, update the `isActiveParent` condition:
```javascript
const isActiveParent = !parent.isClosed && !parent.isLocked;
```

- [ ] **Step 5: Show "Episodio cerrado" badge for closed records**

In the parent row badges, add:
```javascript
{parent.isClosed && (
  <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
    {t('medical:epicrisis.episodeClosed', 'Episodio cerrado')}
  </span>
)}
```

- [ ] **Step 6: Render the modal**

At the bottom of MedicalRecordsModule, before the closing `</div>`:
```javascript
{epicrisisModal.show && (
  <EpicrisisComposerModal
    isOpen={epicrisisModal.show}
    onClose={() => setEpicrisisModal({ show: false, parentRecord: null })}
    parentRecord={epicrisisModal.parentRecord}
    evolutions={epicrisisModal.parentRecord?.evolutions || []}
    patient={selectedPatient}
    provider={{ firstName: user?.firstName, lastName: user?.lastName }}
    onEpisodeClosed={() => {
      setEpicrisisModal({ show: false, parentRecord: null });
      loadPatientRecords(selectedPatient?.id);
    }}
  />
)}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/dashboard/modules/MedicalRecordsModule.js
git commit -m "feat(epicrisis): wire composer modal into medical records module"
```

---

## Task 8: Frontend — Simplify Receta Tab

**Files:**
- Modify: `src/components/medical/MedicalRecordForm.js`

- [ ] **Step 1: Remove configuration panel from renderPrescriptionTab**

In `MedicalRecordForm.js`, in the `renderPrescriptionTab()` function (starting at line 2889):

Remove the "Configuration" section (approximately lines 2979-3087) which contains:
- The purple panel with `t('medical:form.prescriptionTab.configuration')`
- All checkboxes for `includeBasicInfo`, `includeCurrentIllness`, `includeAntecedents`, `includeVitalSigns`, `includePhysicalExam`, `includeCurrentMedications`, `includeDiagnosis`, `includeFromTreatments`, `includeFromPlan`
- The live preview right column (approximately lines 3091-3200)

Also remove the `prescriptionOptions` state and related references. The prescription tab should start directly with the medication form after the saved prescriptions list.

- [ ] **Step 2: Clean up unused state**

Remove or simplify the `prescriptionOptions` state (around line 392-417) since the configuration checkboxes are gone. Keep `prescriptionData` as-is.

- [ ] **Step 3: Update PrescriptionPreview to not include clinical context**

In `PrescriptionPreview.js`, remove the sections that display vital signs, diagnosis, and chief complaint from the prescription output. The prescription PDF should only contain: header, patient info, medications, instructions, notes, footer.

- [ ] **Step 4: Commit**

```bash
git add src/components/medical/MedicalRecordForm.js src/components/medical/PrescriptionPreview.js
git commit -m "refactor(receta): simplify prescription tab, remove configuration panel"
```

---

## Task 9: Backend — Add is_closed to data transform

**Files:**
- Modify: `src/routes/medical-records.js` (backend)
- Modify: `src/api/dataTransform.js` (frontend)

- [ ] **Step 1: Include is_closed in backend responses**

In `/var/www/medical-pro-backend/src/routes/medical-records.js`, in the GET list and GET single endpoints, ensure `is_closed`, `closed_at`, `epicrisis_id` are included in responses (they should be by default since Sequelize returns all columns, but verify the transform).

- [ ] **Step 2: Add is_closed to frontend data transform**

In `/var/www/medical-pro/src/api/dataTransform.js`, in `transformMedicalRecordFromBackend`, add:
```javascript
isClosed: record.is_closed ?? false,
closedAt: record.closed_at ?? null,
epicrisisId: record.epicrisis_id ?? null,
```

- [ ] **Step 3: Commit**

```bash
cd /var/www/medical-pro
git add src/api/dataTransform.js
git commit -m "feat(epicrisis): add isClosed to medical record data transform"
```

---

## Task 10: Deploy + Validation

- [ ] **Step 1: Push backend**
- [ ] **Step 2: Run migrations on prod**
- [ ] **Step 3: Push frontend**
- [ ] **Step 4: Test — create a draft epicrisis**
- [ ] **Step 5: Test — generate PDF preview**
- [ ] **Step 6: Test — sign and close episode**
- [ ] **Step 7: Test — verify closed episode cannot receive evolutions**
- [ ] **Step 8: Test — verify integrity endpoint**
- [ ] **Step 9: Test — prescription tab simplified (no configuration panel)**
