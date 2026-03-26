# Clinical Episodes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Link follow-up records to an initial parent record, forming clinical episodes. The parent holds the full baseline; evolutions contain only vitals, evolution, treatments, plan, and prescriptions.

**Architecture:** Single `parent_record_id` FK on `medical_records`. Backend validates parent on create, cascades archive. Frontend groups records in the list, filters form tabs for evolutions.

**Tech Stack:** PostgreSQL migration, Sequelize model, Express routes, React form/module, i18n

**Spec:** `docs/superpowers/specs/2026-03-26-clinical-episodes-design.md`

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `migrations/clinic_070_medical_record_parent_link.sql` | Create | Add `parent_record_id` column + index |
| `scripts/run-clinic-migrations.js:69` | Modify | Add clinic_070 to migrations list |
| `src/services/clinicProvisioningService.js:213` | Modify | Add clinic_070 to provisioning list |
| `src/models/clinic/MedicalRecord.js` | Modify | Add `parent_record_id` field to model |
| `src/base/validationSchemas.js:335` | Modify | Add `parent_record_id` to Joi schema |
| `src/routes/medical-records.js` | Modify | Parent validation, cascade archive, evolutions in GET |
| `src/api/dataTransform.js` | Modify (frontend) | Map `parentRecordId` ↔ `parent_record_id` both directions |
| `src/api/medicalRecordsApi.js` | Modify (frontend) | Pass `parentRecordId` in create |
| `src/components/medical/MedicalRecordForm.js:927` | Modify (frontend) | Filter tabs for evolution mode |
| `src/components/dashboard/modules/MedicalRecordsModule.js:700` | Modify (frontend) | Group records, add "+ Évolution" buttons |
| `src/contexts/MedicalRecordContext.js` | Modify (frontend) | Pass through `parentRecordId` in create/update |
| `src/locales/{es,fr,en}/medical.json` | Modify (frontend) | Add labels |

---

## Task 1: Database Migration

**Files:**
- Create: `migrations/clinic_070_medical_record_parent_link.sql`
- Modify: `scripts/run-clinic-migrations.js:69`
- Modify: `src/services/clinicProvisioningService.js:213`

- [ ] **Step 1: Create migration file**

```sql
-- clinic_070_medical_record_parent_link.sql
-- Add parent_record_id for clinical episodes (evolution linked to initial record)
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS parent_record_id UUID REFERENCES medical_records(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_medical_records_parent ON medical_records(parent_record_id) WHERE parent_record_id IS NOT NULL;
```

Write to `/var/www/medical-pro-backend/migrations/clinic_070_medical_record_parent_link.sql`.

- [ ] **Step 2: Add to run-clinic-migrations.js**

After line 69 (`'clinic_069_appointment_interrupted_status.sql'`), add:

```javascript
  'clinic_070_medical_record_parent_link.sql'
```

- [ ] **Step 3: Add to clinicProvisioningService.js**

After the `clinic_069` entry, add:

```javascript
        'clinic_070_medical_record_parent_link.sql',
```

- [ ] **Step 4: Run migration on prod**

```bash
ssh -p 2222 root@72.62.51.173 "PGPASSWORD=\$(cat /root/.secrets/db_password) psql -h localhost -U medicalpro -d 'medicalpro_clinic_d943676a_81f5_4d46_a779_ee3f79357f01' -f /var/www/medical-pro-backend/migrations/clinic_070_medical_record_parent_link.sql"
```

- [ ] **Step 5: Verify**

```bash
ssh -p 2222 root@72.62.51.173 "PGPASSWORD=\$(cat /root/.secrets/db_password) psql -h localhost -U medicalpro -d 'medicalpro_clinic_d943676a_81f5_4d46_a779_ee3f79357f01' -c \"\\d medical_records\" | grep parent_record_id"
```

Expected: `parent_record_id | uuid | | |`

- [ ] **Step 6: Commit**

```bash
cd /var/www/medical-pro-backend
git add migrations/clinic_070_medical_record_parent_link.sql scripts/run-clinic-migrations.js src/services/clinicProvisioningService.js
git commit -m "feat(medical-records): add parent_record_id migration for clinical episodes"
```

---

## Task 2: Backend Model + Joi Schema

**Files:**
- Modify: `src/models/clinic/MedicalRecord.js`
- Modify: `src/base/validationSchemas.js:335`

- [ ] **Step 1: Add parent_record_id to MedicalRecord model**

In `/var/www/medical-pro-backend/src/models/clinic/MedicalRecord.js`, add after the `appointment_id` field definition:

```javascript
    // Clinical episode — links evolution to parent record
    parent_record_id: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
      references: { model: 'medical_records', key: 'id' },
      onDelete: 'SET NULL'
    },
```

- [ ] **Step 2: Add to Joi createMedicalRecordSchema**

In `/var/www/medical-pro-backend/src/base/validationSchemas.js`, after line 347 (`assistant_provider_id`), add:

```javascript
  // Clinical episode — link to parent record
  parent_record_id: Joi.string().uuid().allow(null).optional(),
```

- [ ] **Step 3: Commit**

```bash
cd /var/www/medical-pro-backend
git add src/models/clinic/MedicalRecord.js src/base/validationSchemas.js
git commit -m "feat(medical-records): add parent_record_id to model and Joi schema"
```

---

## Task 3: Backend Route — Parent Validation on Create

**Depends on:** Task 1 (migration) and Task 2 (model field) must be deployed before this route change. The no-nesting check reads `parentRecord.parent_record_id`, which is undefined if the model is not updated.

**Files:**
- Modify: `src/routes/medical-records.js` (POST / handler)

- [ ] **Step 1: Add parent validation after Joi validation in POST /**

In the POST route (around line 671), after `const data = value;` and before the record creation, add:

```javascript
    // Validate parent_record_id for clinical episodes
    if (data.parent_record_id) {
      const parentRecord = await MedicalRecord.findByPk(data.parent_record_id);
      if (!parentRecord) {
        return res.status(404).json({ success: false, error: { message: 'Parent record not found' } });
      }
      if (parentRecord.patient_id !== data.patient_id) {
        return res.status(400).json({ success: false, error: { message: 'Parent record belongs to a different patient' } });
      }
      if (parentRecord.parent_record_id !== null) {
        return res.status(400).json({ success: false, error: { message: 'Cannot nest evolutions — parent is itself an evolution' } });
      }
      if (parentRecord.archived) {
        return res.status(400).json({ success: false, error: { message: 'Cannot add evolution to an archived record' } });
      }
      // Force record_type to follow_up
      data.record_type = 'follow_up';
    }
```

- [ ] **Step 2: Commit**

```bash
cd /var/www/medical-pro-backend
git add src/routes/medical-records.js
git commit -m "feat(medical-records): validate parent on evolution creation"
```

---

## Task 4: Backend Route — Cascade Archive + Evolutions in GET

**Files:**
- Modify: `src/routes/medical-records.js` (DELETE and GET handlers)

- [ ] **Step 1: Add cascade archive in DELETE handler**

In the DELETE route (around line 887–924), replace the archive call with a transactional cascade:

```javascript
    // Cascade archive in a transaction (atomicity: parent + evolutions all or nothing)
    await req.clinicDb.transaction(async (t) => {
      await record.update({ archived: true, archived_at: new Date(), archived_by: providerId }, { transaction: t });
      await logRecordAccess(record, 'archive', req.user, req);

      // If this is a parent, cascade to all evolutions
      if (!record.parent_record_id) {
        const evolutions = await MedicalRecord.findAll({
          where: { parent_record_id: record.id, archived: false },
          transaction: t
        });
        for (const evo of evolutions) {
          await evo.update({ archived: true, archived_at: new Date(), archived_by: providerId }, { transaction: t });
          await logRecordAccess(evo, 'archive', req.user, req);
        }
        if (evolutions.length > 0) {
          console.log(`[MedicalRecords] 🗑️ Cascade archived ${evolutions.length} evolutions for parent ${record.id}`);
        }
      }
    });
```

Note: Using `record.update()` directly with transaction instead of `record.archive()` to ensure the transaction option is passed. Verify that the existing `archive()` method signature supports transaction option — if so, prefer `record.archive(providerId, { transaction: t })`.

- [ ] **Step 2: Add evolutions array to GET /:id response**

In the GET /:id route (around line 612–648), after fetching the record and before the response, add a query for child records:

```javascript
    // Load evolutions if this is a parent record
    let evolutions = [];
    if (!record.parent_record_id) {
      const childRecords = await MedicalRecord.findAll({
        where: { parent_record_id: record.id, archived: false },
        attributes: ['id', 'record_date', 'chief_complaint', 'provider_id', 'created_at'],
        order: [['record_date', 'ASC'], ['created_at', 'ASC']]
      });
      evolutions = childRecords.map(r => ({
        id: r.id,
        recordDate: r.record_date || r.created_at,
        chiefComplaint: r.chief_complaint,
        providerId: r.provider_id
      }));
    }
```

Then add `evolutions` to the response object:

```javascript
    // In the res.json response, add:
    evolutions,
    parentRecordId: record.parent_record_id || null,
```

- [ ] **Step 3: Add parentRecordId to GET /patient/:patientId response**

In the `getPatientHistory` static method response or in the route handler, ensure `parent_record_id` is included in the returned record objects. Since `findAll` returns all columns by default, the field is already present after migration. **Depends on Task 5 Step 1** — the frontend transform layer must have the `parentRecordId` mapping added before this works end-to-end.

- [ ] **Step 4: Commit**

```bash
cd /var/www/medical-pro-backend
git add src/routes/medical-records.js
git commit -m "feat(medical-records): cascade archive evolutions + return evolutions in GET"
```

- [ ] **Step 5: Push backend and deploy**

```bash
cd /var/www/medical-pro-backend && git push origin master
```

---

## Task 5: Frontend — Data Transform + API

**Files:**
- Modify: `src/api/dataTransform.js`
- Modify: `src/api/medicalRecordsApi.js`

- [ ] **Step 1: Add parentRecordId to transformMedicalRecordFromBackend**

In `/var/www/medical-pro/src/api/dataTransform.js`, in the `transformMedicalRecordFromBackend` function, add to the returned object:

```javascript
    parentRecordId: record.parent_record_id ?? null,
    evolutions: record.evolutions || [],
```

- [ ] **Step 2: Add parent_record_id to transformMedicalRecordToBackend**

In the `transformMedicalRecordToBackend` function, add:

```javascript
    if (record.parentRecordId) {
      backendData.parent_record_id = record.parentRecordId;
    }
```

- [ ] **Step 3: Verify medicalRecordsApi.createMedicalRecord passes the field**

Check that `createMedicalRecord` calls `transformMedicalRecordToBackend` before POST. It should already handle `parentRecordId` via the transform added in step 2.

- [ ] **Step 4: Commit**

```bash
cd /var/www/medical-pro
git add src/api/dataTransform.js src/api/medicalRecordsApi.js
git commit -m "feat(medical-records): add parentRecordId mapping in data transform layer"
```

---

## Task 6: Frontend — MedicalRecordContext

**Files:**
- Modify: `src/contexts/MedicalRecordContext.js`

- [ ] **Step 1: Verify parentRecordId passes through createRecord**

In `MedicalRecordContext.js`, verify that `createRecord` spreads the full `recordData` into the optimistic update. The `parentRecordId` field from the API response must be preserved in the context state. Since the context uses `{ ...recordData }` spread, the field should pass through automatically after the dataTransform mapping (Task 5). Verify this by reading the code — no change expected if the spread is generic.

- [ ] **Step 2: Verify parentRecordId survives updateRecord**

Confirm that `updateRecord` merges `{ ...previousRecord, ...recordData }` — this preserves `parentRecordId` from the existing record if not overwritten. No change expected.

- [ ] **Step 3: Commit (only if changes were needed)**

---

## Task 7: Frontend — Form Tab Filtering for Evolutions (was Task 6)

**Files:**
- Modify: `src/components/medical/MedicalRecordForm.js:927`

- [ ] **Step 1: Filter tabs when parentRecordId is set**

In `/var/www/medical-pro/src/components/medical/MedicalRecordForm.js`, at line 927, replace:

```javascript
  const tabs = canViewPrescriptions ? allTabs : allTabs.filter(t => t.id !== 'prescription');
```

With:

```javascript
  // Evolution mode: show only vitals, evolution, treatments, plan, prescription
  const EVOLUTION_TABS = ['vitals', 'evolution', 'treatments', 'plan', 'prescription'];
  const isEvolution = !!existingRecord?.parentRecordId || !!formData?.parentRecordId;
  let tabs = canViewPrescriptions ? allTabs : allTabs.filter(t => t.id !== 'prescription');
  if (isEvolution) {
    tabs = tabs.filter(t => EVOLUTION_TABS.includes(t.id));
  }
```

- [ ] **Step 2: Add parentRecordId to destructured props and propagate in formData**

First, add `parentRecordId` to the component's destructured props (around line 41):

```javascript
  const MedicalRecordForm = forwardRef(({ patient, patients, existingRecord, lastRecord, initialActiveTab, parentRecordId: parentRecordIdProp, onSave, onCancel, ...
```

Then in the `ensureFormDataStructure` function (around line 89), add `parentRecordId` passthrough using all three sources (formData, existingRecord, prop):

```javascript
    parentRecordId: data.parentRecordId || existingRecord?.parentRecordId || parentRecordIdProp || null,
```

This ensures the tab filtering works for all entry points: editing an existing evolution (`existingRecord.parentRecordId`), creating from the list button (`parentRecordIdProp`), or from already-initialized form data (`data.parentRecordId`).

- [ ] **Step 3: Commit**

```bash
cd /var/www/medical-pro
git add src/components/medical/MedicalRecordForm.js
git commit -m "feat(medical-records): filter form tabs to 5 in evolution mode"
```

---

## Task 8: Frontend — Record List Grouping + Évolution Buttons

**Files:**
- Modify: `src/components/dashboard/modules/MedicalRecordsModule.js:697-786`

This is the largest frontend change. The record list needs to:
1. Group records by episode (parent + children indented)
2. Show "+ Ajouter une évolution" under each parent
3. Show "+ Évolution" button in the form header when editing a parent

- [ ] **Step 1: Add grouping logic before the render**

Before the `patientRecords.map` at line 700, add a grouping function:

```javascript
  // Group records into episodes for display
  const groupedRecords = useMemo(() => {
    if (!patientRecords.length) return [];

    // Sort by recordDate descending (spec requirement: newest first)
    const sorted = [...patientRecords].sort(
      (a, b) => new Date(b.recordDate || b.createdAt) - new Date(a.recordDate || a.createdAt)
    );

    const parentMap = new Map(); // parentId -> [evolutions]
    const parents = [];          // records with no parentRecordId
    const orphans = [];          // evolutions whose parent is not in the list

    for (const record of sorted) {
      if (record.parentRecordId) {
        if (!parentMap.has(record.parentRecordId)) {
          parentMap.set(record.parentRecordId, []);
        }
        parentMap.get(record.parentRecordId).push(record);
      } else {
        parents.push(record);
      }
    }

    // Build grouped list: parent followed by its evolutions
    const result = [];
    for (const parent of parents) {
      result.push({ ...parent, _isParent: true, _evolutions: parentMap.get(parent.id) || [] });
      const evos = parentMap.get(parent.id) || [];
      parentMap.delete(parent.id);
      for (const evo of evos) {
        result.push({ ...evo, _isEvolution: true });
      }
    }

    // Any remaining orphans (parent not in current list)
    for (const evos of parentMap.values()) {
      for (const evo of evos) {
        result.push({ ...evo, _isEvolution: true });
      }
    }

    return result;
  }, [patientRecords]);
```

- [ ] **Step 2: Add handleCreateEvolution handler**

After the existing `handleCreateRecord` function, add:

```javascript
  const handleCreateEvolution = (parentRecord) => {
    setFormState({ mode: 'create', parentRecordId: parentRecord.id });
    setCurrentFormTab('vitals');
  };
```

- [ ] **Step 3: Pass parentRecordId to MedicalRecordForm**

In the `MedicalRecordForm` render (around line 653), update the props:

```jsx
<MedicalRecordForm
  ref={formRef}
  patient={selectedPatient}
  patients={[selectedPatient]}
  existingRecord={formState.mode === 'edit' ? formState.record : null}
  lastRecord={patientRecords.length > 0 ? patientRecords[0] : null}
  initialActiveTab={currentFormTab}
  parentRecordId={formState.parentRecordId || null}
  onSave={handleFormSubmit}
  onCancel={handleBackToList}
```

- [ ] **Step 4: In MedicalRecordForm, accept and use parentRecordId prop**

Add `parentRecordId` to the component props, and include it in the save data:

```javascript
// In the save handler, add parentRecordId to the data sent to onSave:
if (parentRecordId) {
  saveData.parentRecordId = parentRecordId;
}
```

- [ ] **Step 5: Update handleFormSubmit to pass parentRecordId**

In `MedicalRecordsModule`'s `handleFormSubmit`, ensure the parentRecordId from formData is included in the create call.

- [ ] **Step 6: Replace patientRecords.map with groupedRecords rendering**

Replace the `patientRecords.map` block (lines 700-786) with a new render that:
- Uses `groupedRecords` instead of `patientRecords`
- Indents evolution records (`_isEvolution`) with `ml-6` and a lighter style
- Adds "+ Ajouter une évolution" button after each parent's evolutions

```jsx
{groupedRecords.map((record) => {
  const content = hasContent(record);
  const isCurrentlyEditing = formState?.mode === 'edit' && formState.record?.id === record.id;

  return (
    <React.Fragment key={record.id}>
      <div
        className={`p-4 hover:bg-gray-50 transition-colors ${
          record._isEvolution ? 'ml-6 border-l-2 border-blue-200' : ''
        } ${isCurrentlyEditing ? 'bg-green-50 border-l-4 border-green-500' : ''}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-lg font-bold text-gray-900">
                {formatDate(record.createdAt)}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(record.type)}`}>
                {record._isEvolution
                  ? t('medical:episode.evolution', 'Evolución')
                  : getTypeLabel(record.type)}
              </span>
              {record._evolutions?.length > 0 && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                  {t('medical:episode.badge', 'Episodio')} ({record._evolutions.length})
                </span>
              )}
              {record.status === 'signed' && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                  Signé
                </span>
              )}
            </div>
            <p className="text-gray-700 mb-2">
              {record.basicInfo?.chiefComplaint || record.diagnosis?.primary || t('medical:module.masterDetail.noDescription')}
            </p>
            <div className="flex items-center space-x-3 text-sm">
              {content.hasTreatments && (
                <span className="flex items-center text-purple-600" title="Traitements">
                  <Pill className="h-4 w-4 mr-1" />
                  <span>{record.treatments?.length}</span>
                </span>
              )}
              {content.hasMedications && (
                <span className="flex items-center text-blue-600" title="Médicaments actuels">
                  <Stethoscope className="h-4 w-4 mr-1" />
                  <span>{record.currentMedications?.length}</span>
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-1 ml-4">
            <button onClick={() => handleViewRecord(record)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title={t('medical:module.masterDetail.viewRecord', 'Voir le dossier')}>
              <Eye className="h-5 w-5" />
            </button>
            {canEditRecords && (
              <button onClick={() => handleEditRecord(record)} className={`p-2 rounded-lg transition-colors ${isCurrentlyEditing ? 'bg-green-100 text-green-700' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`} title={t('common:edit')}>
                <Edit2 className="h-5 w-5" />
              </button>
            )}
            {canDeleteRecords && (
              <button onClick={() => handleDeleteRecord(record)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title={t('common:delete')}>
                <Trash2 className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* "+ Ajouter une évolution" button after parent's evolutions */}
      {!record._isEvolution && !record.parentRecordId && canEditRecords && (
        <div className={`ml-6 border-l-2 border-blue-200 ${record._evolutions?.length > 0 ? '' : ''}`}>
          <button
            onClick={() => handleCreateEvolution(record)}
            className="w-full p-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {t('medical:episode.addEvolution', '+ Ajouter une évolution')}
          </button>
        </div>
      )}
    </React.Fragment>
  );
})}
```

- [ ] **Step 7: Add "+ Évolution" button in form header**

In the form header area (around line 627-634), when the current record is a parent (editMode, no parentRecordId), add a button:

```jsx
{formState.mode === 'edit' && !formState.record?.parentRecordId && canEditRecords && (
  <button
    onClick={() => handleCreateEvolution(formState.record)}
    className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors flex items-center gap-1"
  >
    <Plus className="h-4 w-4" />
    {t('medical:episode.addEvolution', 'Évolution')}
  </button>
)}
```

- [ ] **Step 8: Import Plus icon if not already imported**

Check lucide imports and add `Plus` if missing.

- [ ] **Step 9: Commit**

```bash
cd /var/www/medical-pro
git add src/components/dashboard/modules/MedicalRecordsModule.js src/components/medical/MedicalRecordForm.js
git commit -m "feat(medical-records): episode grouping, evolution buttons, and tab filtering"
```

---

## Task 9: i18n Translations

**Files:**
- Modify: `src/locales/es/medical.json`
- Modify: `src/locales/fr/medical.json`
- Modify: `src/locales/en/medical.json`

- [ ] **Step 1: Add episode keys to Spanish**

In `es/medical.json`, add an `episode` section:

```json
  "episode": {
    "addEvolution": "+ Añadir una evolución",
    "evolution": "Evolución",
    "badge": "Episodio"
  }
```

- [ ] **Step 2: Add to French**

```json
  "episode": {
    "addEvolution": "+ Ajouter une évolution",
    "evolution": "Évolution",
    "badge": "Épisode"
  }
```

- [ ] **Step 3: Add to English**

```json
  "episode": {
    "addEvolution": "+ Add an evolution",
    "evolution": "Evolution",
    "badge": "Episode"
  }
```

- [ ] **Step 4: Commit**

```bash
cd /var/www/medical-pro
git add src/locales/es/medical.json src/locales/fr/medical.json src/locales/en/medical.json
git commit -m "feat(i18n): add clinical episode labels in es/fr/en"
```

---

## Task 10: Deploy + End-to-End Validation

- [ ] **Step 1: Push backend**

```bash
cd /var/www/medical-pro-backend && git push origin master
```

Wait for CI/CD deployment.

- [ ] **Step 2: Push frontend**

```bash
cd /var/www/medical-pro && git push origin master
```

Wait for CI/CD deployment.

- [ ] **Step 3: Verify migration applied**

```bash
ssh -p 2222 root@72.62.51.173 "PGPASSWORD=\$(cat /root/.secrets/db_password) psql -h localhost -U medicalpro -d 'medicalpro_clinic_d943676a_81f5_4d46_a779_ee3f79357f01' -c \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name='medical_records' AND column_name='parent_record_id';\""
```

- [ ] **Step 4: Test creating an evolution from the record list**

1. Open patient history
2. Click "+ Ajouter une évolution" under any existing record
3. Verify only 5 tabs appear (Constantes, Évolution, Traitements, Plan, Ordonnance)
4. Fill in vitals and evolution text
5. Save → verify the evolution appears indented under the parent

- [ ] **Step 5: Test creating an evolution from the form header**

1. Open an existing record for editing
2. Click the "+ Évolution" button in the header
3. Verify the evolution form opens with 5 tabs
4. Save → verify grouping

- [ ] **Step 6: Test cascade archive**

1. Archive a parent that has evolutions
2. Verify all evolutions are also archived
3. Verify they disappear from the list

- [ ] **Step 7: Test existing records are unchanged**

1. Open any existing standalone record
2. Verify all 10 tabs are present
3. Edit and save → verify no regression
