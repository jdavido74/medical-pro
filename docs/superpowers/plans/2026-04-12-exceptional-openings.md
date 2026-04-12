# Exceptional Openings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a clinic-level "exceptional openings" feature that lets admins open the clinic on a normally-closed weekday (e.g. Sunday) with custom hours, without flipping the entire day in `operating_days`.

**Architecture:** New `exceptional_openings` JSONB column on `clinic_settings`. Backend `planningService.getClinicHoursRanges` applies a 4-level priority resolver (closed_dates > exceptional_openings > operating_days > default-closed). New POST/DELETE endpoints mirror the existing `closed_dates` pattern. Frontend wires through the existing `ClinicSettingsContext` so updates propagate without a refresh. Mutual exclusion with `closed_dates` enforced at write time.

**Tech Stack:** PostgreSQL (JSONB), Node.js + Express + Sequelize + Joi (backend), React + i18next (frontend), Jest + React Testing Library (tests).

**Related spec:** `docs/superpowers/specs/2026-04-12-exceptional-openings-design.md`

---

## File Structure

### Backend (`/var/www/medical-pro-backend/`)

**New files:**
- `migrations/clinic_081_exceptional_openings.sql` — ALTER TABLE adding JSONB column
- `tests/services/planningService.exceptionalOpenings.test.js` — resolver priority tests
- `tests/routes/clinicSettings.exceptionalOpenings.test.js` — endpoint tests

**Modified files:**
- `scripts/run-clinic-migrations.js` — register new migration for existing clinics
- `src/services/clinicProvisioningService.js` — register new migration for new clinics
- `src/base/clinicConfigSchemas.js` — add `exceptionalOpeningSchema`, extend create/update schemas
- `src/services/planningService.js` — extend `getClinicHoursRanges` with exception check
- `src/routes/clinicSettings.js` — add POST/DELETE `/exceptional-openings` endpoints

### Frontend (`/var/www/medical-pro/`)

**New files:**
- `src/components/admin/ExceptionalOpeningsTab.js` — tab content component (isolated for testability)

**Modified files:**
- `src/api/dataTransform.js` — map `exceptional_openings` ↔ `exceptionalOpenings`
- `src/api/clinicSettingsApi.js` — add `addExceptionalOpening` / `removeExceptionalOpening`
- `src/contexts/ClinicSettingsContext.js` — expose context methods
- `src/components/admin/ClinicConfigModal.js` — add "openings" tab + wire to new component
- `src/locales/es/admin.json`, `src/locales/fr/admin.json`, `src/locales/en/admin.json` — i18n keys
- `src/components/dashboard/modals/PatientFormModal.js` — N/A (not touched)

---

## Task 1: Backend — DB migration

**Files:**
- Create: `/var/www/medical-pro-backend/migrations/clinic_081_exceptional_openings.sql`
- Modify: `/var/www/medical-pro-backend/scripts/run-clinic-migrations.js` (NEW_MIGRATIONS list at line 46)
- Modify: `/var/www/medical-pro-backend/src/services/clinicProvisioningService.js` (migrations list around line 226)

- [ ] **Step 1: Create the migration file**

Path: `/var/www/medical-pro-backend/migrations/clinic_081_exceptional_openings.sql`

```sql
-- Migration: Add exceptional_openings to clinic_settings
-- Purpose: Allow admins to exceptionally open the clinic on normally-closed
--   weekdays with custom hours, without changing operating_days structurally.
-- Symmetric to closed_dates.

ALTER TABLE clinic_settings
ADD COLUMN IF NOT EXISTS exceptional_openings JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN clinic_settings.exceptional_openings IS
  'Array of exceptional opening dates on normally-closed weekdays: [{id, date, reason, hasLunchBreak, morning:{start,end}, afternoon:{start,end}}]. Mutually exclusive with closed_dates (same date cannot appear in both).';
```

- [ ] **Step 2: Register migration in run-clinic-migrations.js**

Modify `/var/www/medical-pro-backend/scripts/run-clinic-migrations.js`. Find the `NEW_MIGRATIONS` array and append the new entry after `clinic_080_consent_structured_fields.sql`:

```javascript
const NEW_MIGRATIONS = [
  // ... existing entries ...
  'clinic_080_consent_structured_fields.sql',
  'clinic_081_exceptional_openings.sql',
];
```

- [ ] **Step 3: Register migration in clinicProvisioningService.js**

Modify `/var/www/medical-pro-backend/src/services/clinicProvisioningService.js`. Find the migrations list (around line 216-228) and append:

```javascript
'clinic_079_treatment_products.sql',
'clinic_080_consent_structured_fields.sql',
'clinic_081_exceptional_openings.sql',
```

- [ ] **Step 4: Apply migration on local dev DB**

Run: `cd /var/www/medical-pro-backend && node scripts/run-clinic-migrations.js`

Expected: "Migration clinic_081_exceptional_openings.sql applied successfully" for each clinic DB.

- [ ] **Step 5: Verify column was added**

Run: `cd /var/www/medical-pro-backend && node -e "const db = require('./src/config/database'); db.getClinicDb('ozondenia').then(c => c.query(\"SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name='clinic_settings' AND column_name='exceptional_openings'\")).then(([r]) => { console.log(r); process.exit(0); })"`

Expected output:
```
[
  {
    column_name: 'exceptional_openings',
    data_type: 'jsonb',
    column_default: "'[]'::jsonb"
  }
]
```

- [ ] **Step 6: Commit**

```bash
cd /var/www/medical-pro-backend
git add migrations/clinic_081_exceptional_openings.sql scripts/run-clinic-migrations.js src/services/clinicProvisioningService.js
git commit -m "feat(clinic): add exceptional_openings column to clinic_settings

Migration clinic_081 adds JSONB column for per-date exceptional openings
(symmetric to closed_dates). Registered in both migration runners."
```

---

## Task 2: Backend — Joi validation schema

**Files:**
- Modify: `/var/www/medical-pro-backend/src/base/clinicConfigSchemas.js`

- [ ] **Step 1: Add exceptional opening schemas**

Open `/var/www/medical-pro-backend/src/base/clinicConfigSchemas.js`. Find the section with `closedDateSchema` (search for `closedDateSchema`). Insert these schemas immediately after `closedDateSchema`:

```javascript
// Schema pour les plages horaires (HH:MM)
const hourRangeSchema = Joi.object({
  start: Joi.string().pattern(/^([01][0-9]|2[0-3]):[0-5][0-9]$/).required()
    .messages({ 'string.pattern.base': 'Format HH:MM requis (ex: 09:00)' }),
  end: Joi.string().pattern(/^([01][0-9]|2[0-3]):[0-5][0-9]$/).required()
    .messages({ 'string.pattern.base': 'Format HH:MM requis (ex: 17:00)' })
});

// Schema pour une ouverture exceptionnelle
const exceptionalOpeningSchema = Joi.object({
  id: Joi.string().uuid().optional(),
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required()
    .messages({ 'string.pattern.base': 'Date au format YYYY-MM-DD requis' }),
  reason: Joi.string().max(500).allow('', null).optional(),
  hasLunchBreak: Joi.boolean().required(),
  morning: hourRangeSchema.required(),
  afternoon: hourRangeSchema.when('hasLunchBreak', {
    is: true, then: Joi.required(), otherwise: Joi.forbidden()
  })
}).custom((value, helpers) => {
  if (value.morning.start >= value.morning.end) {
    return helpers.error('any.invalid',
      { message: 'morning.start doit être avant morning.end' });
  }
  if (value.hasLunchBreak) {
    if (value.morning.end > value.afternoon.start) {
      return helpers.error('any.invalid',
        { message: 'morning.end doit être avant ou égal à afternoon.start' });
    }
    if (value.afternoon.start >= value.afternoon.end) {
      return helpers.error('any.invalid',
        { message: 'afternoon.start doit être avant afternoon.end' });
    }
  }
  return value;
});
```

- [ ] **Step 2: Extend createClinicSettingsSchema**

In the same file, find `module.exports.createClinicSettingsSchema` (around line 230). Add `exceptional_openings` after `closed_dates`:

```javascript
  closed_dates: Joi.array().items(closedDateSchema).default([]),
  exceptional_openings: Joi.array().items(exceptionalOpeningSchema).max(365).default([])
    .messages({ 'array.max': 'Maximum 365 ouvertures exceptionnelles par clinique' }),
  appointment_types: Joi.array().items(appointmentTypeSchema).optional(),
```

- [ ] **Step 3: Extend updateClinicSettingsSchema**

Find `module.exports.updateClinicSettingsSchema` in the same file. Add:

```javascript
  closed_dates: Joi.array().items(closedDateSchema).optional(),
  exceptional_openings: Joi.array().items(exceptionalOpeningSchema).max(365).optional()
    .messages({ 'array.max': 'Maximum 365 ouvertures exceptionnelles par clinique' }),
  appointment_types: Joi.array().items(appointmentTypeSchema).optional(),
```

- [ ] **Step 4: Export exceptionalOpeningSchema for use in routes**

At the bottom of the file (or wherever individual schemas are exported), add:

```javascript
module.exports.exceptionalOpeningSchema = exceptionalOpeningSchema;
```

- [ ] **Step 5: Write unit tests**

Create `/var/www/medical-pro-backend/tests/base/exceptionalOpeningSchema.test.js`:

```javascript
const { exceptionalOpeningSchema } = require('../../src/base/clinicConfigSchemas');

describe('exceptionalOpeningSchema', () => {
  const valid = {
    date: '2026-04-12',
    hasLunchBreak: true,
    morning: { start: '09:00', end: '12:00' },
    afternoon: { start: '14:00', end: '17:00' }
  };

  it('accepts a valid entry with lunch break', () => {
    const { error } = exceptionalOpeningSchema.validate(valid);
    expect(error).toBeUndefined();
  });

  it('accepts a valid entry without lunch break', () => {
    const { error } = exceptionalOpeningSchema.validate({
      date: '2026-04-12',
      hasLunchBreak: false,
      morning: { start: '10:00', end: '14:00' }
    });
    expect(error).toBeUndefined();
  });

  it('accepts optional reason', () => {
    const { error } = exceptionalOpeningSchema.validate({
      ...valid,
      reason: 'Campagne vaccination'
    });
    expect(error).toBeUndefined();
  });

  it('rejects invalid date format', () => {
    const { error } = exceptionalOpeningSchema.validate({ ...valid, date: '12/04/2026' });
    expect(error).toBeDefined();
  });

  it('rejects invalid time format', () => {
    const { error } = exceptionalOpeningSchema.validate({
      ...valid,
      morning: { start: '9h', end: '12:00' }
    });
    expect(error).toBeDefined();
  });

  it('rejects morning.start >= morning.end', () => {
    const { error } = exceptionalOpeningSchema.validate({
      ...valid,
      morning: { start: '12:00', end: '12:00' }
    });
    expect(error).toBeDefined();
  });

  it('rejects overlap between morning and afternoon', () => {
    const { error } = exceptionalOpeningSchema.validate({
      ...valid,
      morning: { start: '09:00', end: '15:00' },
      afternoon: { start: '14:00', end: '17:00' }
    });
    expect(error).toBeDefined();
  });

  it('rejects afternoon when hasLunchBreak is false', () => {
    const { error } = exceptionalOpeningSchema.validate({
      date: '2026-04-12',
      hasLunchBreak: false,
      morning: { start: '09:00', end: '12:00' },
      afternoon: { start: '14:00', end: '17:00' }
    });
    expect(error).toBeDefined();
  });

  it('requires afternoon when hasLunchBreak is true', () => {
    const { error } = exceptionalOpeningSchema.validate({
      date: '2026-04-12',
      hasLunchBreak: true,
      morning: { start: '09:00', end: '12:00' }
    });
    expect(error).toBeDefined();
  });

  it('rejects reason longer than 500 chars', () => {
    const { error } = exceptionalOpeningSchema.validate({
      ...valid,
      reason: 'x'.repeat(501)
    });
    expect(error).toBeDefined();
  });
});
```

- [ ] **Step 6: Run tests**

Run: `cd /var/www/medical-pro-backend && npx jest tests/base/exceptionalOpeningSchema.test.js`

Expected: All 10 tests pass.

- [ ] **Step 7: Commit**

```bash
cd /var/www/medical-pro-backend
git add src/base/clinicConfigSchemas.js tests/base/exceptionalOpeningSchema.test.js
git commit -m "feat(validation): add exceptionalOpeningSchema for clinic settings

Joi schema validates date format, time format, lunch-break consistency,
morning/afternoon ordering, and enforces max 365 entries."
```

---

## Task 3: Backend — Planning service resolver

**Files:**
- Modify: `/var/www/medical-pro-backend/src/services/planningService.js` (function `getClinicHoursRanges`, around line 166-220)
- Create: `/var/www/medical-pro-backend/tests/services/planningService.exceptionalOpenings.test.js`

- [ ] **Step 1: Write the failing test**

Create `/var/www/medical-pro-backend/tests/services/planningService.exceptionalOpenings.test.js`:

```javascript
// Mock the DB to isolate resolver logic
const mockQuery = jest.fn();
const mockDb = { query: mockQuery };

// Re-require planningService fresh in each test to avoid state leaks
let getClinicHoursRanges;
beforeEach(() => {
  jest.resetModules();
  getClinicHoursRanges = require('../../src/services/planningService').getClinicHoursRanges;
  mockQuery.mockReset();
});

const settingsRow = (overrides) => ([[{
  operating_days: [1, 2, 3, 4, 5],
  operating_hours: {
    monday:    { enabled: true, hasLunchBreak: false, start: '08:00', end: '18:00' },
    tuesday:   { enabled: true, hasLunchBreak: false, start: '08:00', end: '18:00' },
    wednesday: { enabled: true, hasLunchBreak: false, start: '08:00', end: '18:00' },
    thursday:  { enabled: true, hasLunchBreak: false, start: '08:00', end: '18:00' },
    friday:    { enabled: true, hasLunchBreak: false, start: '08:00', end: '18:00' }
  },
  closed_dates: [],
  exceptional_openings: [],
  ...overrides
}]]);

describe('getClinicHoursRanges — exceptional_openings priority', () => {
  it('returns null when date is in closed_dates (even if also in exceptional_openings)', async () => {
    mockQuery.mockResolvedValueOnce(settingsRow({
      closed_dates: [{ date: '2026-04-12', reason: 'Holiday' }],
      exceptional_openings: [{
        date: '2026-04-12', hasLunchBreak: false,
        morning: { start: '09:00', end: '17:00' }
      }]
    }));
    const result = await getClinicHoursRanges(mockDb, '2026-04-12');
    expect(result).toBeNull();
  });

  it('returns exceptional hours when date matches (overrides non-operating day)', async () => {
    mockQuery.mockResolvedValueOnce(settingsRow({
      exceptional_openings: [{
        date: '2026-04-12', hasLunchBreak: true,
        morning:   { start: '09:00', end: '12:00' },
        afternoon: { start: '14:00', end: '17:00' }
      }]
    }));
    const result = await getClinicHoursRanges(mockDb, '2026-04-12'); // Sunday
    expect(result).toEqual([
      { open: '09:00', close: '12:00' },
      { open: '14:00', close: '17:00' }
    ]);
  });

  it('returns single range for exceptional opening without lunch break', async () => {
    mockQuery.mockResolvedValueOnce(settingsRow({
      exceptional_openings: [{
        date: '2026-04-12', hasLunchBreak: false,
        morning: { start: '10:00', end: '14:00' }
      }]
    }));
    const result = await getClinicHoursRanges(mockDb, '2026-04-12');
    expect(result).toEqual([{ open: '10:00', close: '14:00' }]);
  });

  it('falls through to operating_days when date has no exception', async () => {
    mockQuery.mockResolvedValueOnce(settingsRow({}));
    const result = await getClinicHoursRanges(mockDb, '2026-04-13'); // Monday
    expect(result).toEqual([{ open: '08:00', close: '18:00' }]);
  });

  it('returns null when date not in any list and not in operating_days', async () => {
    mockQuery.mockResolvedValueOnce(settingsRow({}));
    const result = await getClinicHoursRanges(mockDb, '2026-04-12'); // Sunday, no exception
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /var/www/medical-pro-backend && npx jest tests/services/planningService.exceptionalOpenings.test.js`

Expected: At least 3 tests fail because the resolver doesn't check `exceptional_openings` yet.

- [ ] **Step 3: Update getClinicHoursRanges to check exceptional_openings**

Open `/var/www/medical-pro-backend/src/services/planningService.js`. Find `async function getClinicHoursRanges(clinicDb, date)` (around line 166).

Replace the body with:

```javascript
async function getClinicHoursRanges(clinicDb, date) {
  try {
    const [results] = await clinicDb.query(
      'SELECT operating_days, operating_hours, closed_dates, exceptional_openings FROM clinic_settings LIMIT 1'
    );
    const settings = results?.[0];

    if (settings) {
      // 1. closed_dates → null (fermé, prévaut toujours)
      const closedDates = settings.closed_dates;
      if (closedDates && Array.isArray(closedDates)) {
        const isClosed = closedDates.some(cd => cd.date === date);
        if (isClosed) return null;
      }

      // 2. exceptional_openings → horaires de l'entrée (ouvert)
      const exceptionalOpenings = settings.exceptional_openings;
      if (exceptionalOpenings && Array.isArray(exceptionalOpenings)) {
        const match = exceptionalOpenings.find(e => e.date === date);
        if (match) {
          const synthHours = {
            tmp: {
              enabled: true,
              hasLunchBreak: match.hasLunchBreak,
              morning: match.morning,
              afternoon: match.afternoon,
              start: match.morning?.start,
              end: match.morning?.end
            }
          };
          const parsed = parseClinicHoursForDay(synthHours, 'tmp');
          if (parsed) {
            console.log(`[planningService] Exceptional opening for ${date}:`, JSON.stringify(parsed));
            return parsed;
          }
        }
      }

      // 3. operating_days + operating_hours (comportement existant)
      const dayNumber = new Date(date + 'T00:00:00').getDay();
      const operatingDays = Array.isArray(settings.operating_days)
        ? settings.operating_days
        : null;
      if (operatingDays && !operatingDays.includes(dayNumber)) {
        return null;
      }

      const dayOfWeek = getDayOfWeek(date);
      const parsed = parseClinicHoursForDay(settings.operating_hours, dayOfWeek);
      if (parsed) {
        console.log(`[planningService] Clinic hours for ${dayOfWeek} (${date}):`, JSON.stringify(parsed));
        return parsed;
      }

      // Day in operating_days but operating_hours missing → defaults (legacy safety net)
      if (operatingDays && operatingDays.includes(dayNumber)) {
        const defaultRange = [{ open: '08:00', close: '18:00' }];
        console.log(`[planningService] Day ${dayOfWeek} in operating_days but hours missing — using defaults`, JSON.stringify(defaultRange));
        return defaultRange;
      }
    } else {
      console.warn('[planningService] No clinic_settings row found, using defaults');
    }
  } catch (err) {
    console.warn('[planningService] Could not load clinic_settings, using defaults:', err.message);
  }

  // Fallback to hardcoded defaults
  const dayOfWeek = getDayOfWeek(date);
  const fallback = DEFAULT_CLINIC_HOURS[dayOfWeek];
  console.log(`[planningService] Using DEFAULT hours for ${dayOfWeek}:`, JSON.stringify(fallback));
  return fallback ? [fallback] : null;
}
```

- [ ] **Step 4: Update JSDoc for getClinicHoursRanges**

Immediately above the function, replace the existing JSDoc block with:

```javascript
/**
 * Resolve clinic operating hours for a specific date.
 *
 * Priority order (strict, first match wins):
 *   1. Date ∈ closed_dates           → null (closed)
 *   2. Date ∈ exceptional_openings   → hours from that entry (open, overrides operating_days)
 *   3. dayOfWeek(date) ∈ operating_days → operating_hours[dayName]
 *   4. Neither                        → null
 *
 * Steps 1 and 2 are mutually exclusive by write-time validation; the
 * "closed prevails" order is a defensive guarantee.
 *
 * @param {Sequelize} clinicDb - Clinic database connection
 * @param {string} date - Date string (YYYY-MM-DD)
 * @returns {Array<{open: string, close: string}>|null} Array of ranges or null if closed
 */
```

- [ ] **Step 5: Run tests — they should now pass**

Run: `cd /var/www/medical-pro-backend && npx jest tests/services/planningService.exceptionalOpenings.test.js`

Expected: All 5 tests pass.

- [ ] **Step 6: Run the existing planning service test suite to confirm no regression**

Run: `cd /var/www/medical-pro-backend && npx jest tests/services/planningService`

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
cd /var/www/medical-pro-backend
git add src/services/planningService.js tests/services/planningService.exceptionalOpenings.test.js
git commit -m "feat(planning): add exceptional_openings to clinic hours resolver

getClinicHoursRanges now checks exceptional_openings between closed_dates
and operating_days. A date in exceptional_openings opens the clinic with
custom hours even when the weekday is not in operating_days.

Priority: closed_dates > exceptional_openings > operating_days > null."
```

---

## Task 4: Backend — API routes (POST + DELETE)

**Files:**
- Modify: `/var/www/medical-pro-backend/src/routes/clinicSettings.js`
- Create: `/var/www/medical-pro-backend/tests/routes/clinicSettings.exceptionalOpenings.test.js`

- [ ] **Step 1: Write the failing integration tests**

Create `/var/www/medical-pro-backend/tests/routes/clinicSettings.exceptionalOpenings.test.js`:

```javascript
const request = require('supertest');
const app = require('../../src/app');
const { getAdminAuthHeaders, seedClinicSettings, clearClinicSettings } = require('../helpers/testAuth');

describe('POST /api/v1/clinic-settings/exceptional-openings', () => {
  let headers;

  beforeAll(async () => {
    headers = await getAdminAuthHeaders();
  });

  beforeEach(async () => {
    await clearClinicSettings();
    await seedClinicSettings({
      closed_dates: [],
      exceptional_openings: []
    });
  });

  it('creates a new exceptional opening (201)', async () => {
    const res = await request(app)
      .post('/api/v1/clinic-settings/exceptional-openings')
      .set(headers)
      .send({
        date: '2099-04-12',
        reason: 'Test opening',
        hasLunchBreak: true,
        morning:   { start: '09:00', end: '12:00' },
        afternoon: { start: '14:00', end: '17:00' }
      });
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.date).toBe('2099-04-12');
  });

  it('rejects past date (400)', async () => {
    const res = await request(app)
      .post('/api/v1/clinic-settings/exceptional-openings')
      .set(headers)
      .send({
        date: '2020-01-01',
        hasLunchBreak: false,
        morning: { start: '09:00', end: '17:00' }
      });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/past/i);
  });

  it('rejects duplicate date within exceptional_openings (409)', async () => {
    await seedClinicSettings({
      closed_dates: [],
      exceptional_openings: [{
        id: '00000000-0000-0000-0000-000000000001',
        date: '2099-04-12',
        hasLunchBreak: false,
        morning: { start: '10:00', end: '14:00' }
      }]
    });

    const res = await request(app)
      .post('/api/v1/clinic-settings/exceptional-openings')
      .set(headers)
      .send({
        date: '2099-04-12',
        hasLunchBreak: false,
        morning: { start: '09:00', end: '17:00' }
      });
    expect(res.status).toBe(409);
  });

  it('rejects date already in closed_dates (409)', async () => {
    await seedClinicSettings({
      closed_dates: [{ id: 'cd1', date: '2099-04-12', reason: 'Holiday', type: 'holiday' }],
      exceptional_openings: []
    });

    const res = await request(app)
      .post('/api/v1/clinic-settings/exceptional-openings')
      .set(headers)
      .send({
        date: '2099-04-12',
        hasLunchBreak: false,
        morning: { start: '09:00', end: '17:00' }
      });
    expect(res.status).toBe(409);
  });

  it('rejects invalid time format (400)', async () => {
    const res = await request(app)
      .post('/api/v1/clinic-settings/exceptional-openings')
      .set(headers)
      .send({
        date: '2099-04-12',
        hasLunchBreak: false,
        morning: { start: '9h', end: '17:00' }
      });
    expect(res.status).toBe(400);
  });

  it('rejects when exceptional_openings would exceed 365 entries (400)', async () => {
    const many = Array.from({ length: 365 }, (_, i) => ({
      id: `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
      date: `2099-${String(Math.floor(i/31) + 1).padStart(2,'0')}-${String((i%31) + 1).padStart(2,'0')}`,
      hasLunchBreak: false,
      morning: { start: '09:00', end: '17:00' }
    }));
    await seedClinicSettings({ closed_dates: [], exceptional_openings: many });

    const res = await request(app)
      .post('/api/v1/clinic-settings/exceptional-openings')
      .set(headers)
      .send({
        date: '2099-12-31',
        hasLunchBreak: false,
        morning: { start: '09:00', end: '17:00' }
      });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/limit|maximum|365/i);
  });
});

describe('DELETE /api/v1/clinic-settings/exceptional-openings/:id', () => {
  let headers;
  const existingId = '11111111-1111-1111-1111-111111111111';

  beforeAll(async () => {
    headers = await getAdminAuthHeaders();
  });

  beforeEach(async () => {
    await clearClinicSettings();
    await seedClinicSettings({
      closed_dates: [],
      exceptional_openings: [{
        id: existingId,
        date: '2099-04-12',
        hasLunchBreak: false,
        morning: { start: '10:00', end: '14:00' }
      }]
    });
  });

  it('deletes an existing exceptional opening (200)', async () => {
    const res = await request(app)
      .delete(`/api/v1/clinic-settings/exceptional-openings/${existingId}`)
      .set(headers);
    expect(res.status).toBe(200);
    expect(res.body.data.exceptional_openings).toEqual([]);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app)
      .delete('/api/v1/clinic-settings/exceptional-openings/99999999-9999-9999-9999-999999999999')
      .set(headers);
    expect(res.status).toBe(404);
  });
});
```

Note: this test assumes `testAuth.js` helpers exist. If they don't in this repo, adapt to the existing test setup — check `tests/helpers/` or the pattern used in existing route tests like `tests/routes/patients.test.js`.

- [ ] **Step 2: Run tests — expect failures**

Run: `cd /var/www/medical-pro-backend && npx jest tests/routes/clinicSettings.exceptionalOpenings.test.js`

Expected: All tests fail because the endpoints don't exist yet.

- [ ] **Step 3: Add POST endpoint**

Open `/var/www/medical-pro-backend/src/routes/clinicSettings.js`. After the `DELETE /closed-dates/:dateId` route, add:

```javascript
/**
 * POST /api/v1/clinic-settings/exceptional-openings
 * Add an exceptional opening date
 */
router.post('/exceptional-openings', async (req, res) => {
  try {
    const { exceptionalOpeningSchema } = require('../base/clinicConfigSchemas');
    const { error, value } = exceptionalOpeningSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: { message: error.message }
      });
    }

    // Reject past dates
    const today = new Date().toISOString().split('T')[0];
    if (value.date < today) {
      return res.status(400).json({
        success: false,
        error: { message: 'Date must be today or in the future (past date rejected)' }
      });
    }

    // Load current settings
    const [settings] = await req.clinicDb.query(
      'SELECT closed_dates, exceptional_openings FROM clinic_settings WHERE facility_id = :clinicId',
      { replacements: { clinicId: req.clinicId } }
    );

    if (settings.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Clinic settings not found' }
      });
    }

    const closedDates = settings[0].closed_dates || [];
    const exceptionalOpenings = settings[0].exceptional_openings || [];

    // Mutual exclusion with closed_dates
    if (closedDates.some(cd => cd.date === value.date)) {
      return res.status(409).json({
        success: false,
        error: { message: 'Date already configured as closed — remove the closure first' }
      });
    }

    // No duplicate within exceptional_openings
    if (exceptionalOpenings.some(eo => eo.date === value.date)) {
      return res.status(409).json({
        success: false,
        error: { message: 'Exceptional opening already configured for this date' }
      });
    }

    // Anti-DoS limit
    if (exceptionalOpenings.length >= 365) {
      return res.status(400).json({
        success: false,
        error: { message: 'Maximum 365 exceptional openings reached' }
      });
    }

    const newEntry = {
      id: require('crypto').randomUUID(),
      date: value.date,
      reason: value.reason || null,
      hasLunchBreak: value.hasLunchBreak,
      morning: value.morning,
      ...(value.hasLunchBreak ? { afternoon: value.afternoon } : {})
    };

    exceptionalOpenings.push(newEntry);

    await req.clinicDb.query(
      `UPDATE clinic_settings
       SET exceptional_openings = :exceptional_openings, updated_at = CURRENT_TIMESTAMP
       WHERE facility_id = :clinicId`,
      {
        replacements: {
          clinicId: req.clinicId,
          exceptional_openings: JSON.stringify(exceptionalOpenings)
        }
      }
    );

    // Audit log (reason hashed to avoid storing user free text in plain logs)
    try {
      const crypto = require('crypto');
      const reasonHash = newEntry.reason
        ? crypto.createHash('sha256').update(newEntry.reason).digest('hex').slice(0, 16)
        : null;
      const auditService = require('../services/auditService');
      await auditService.logAudit({
        userId: req.user?.id,
        companyId: req.user?.companyId || req.clinicId,
        eventType: 'clinic_config',
        resourceType: 'exceptional_opening',
        resourceId: newEntry.id,
        action: 'exceptional_opening.added',
        changes: JSON.stringify({ date: newEntry.date, hasReason: !!reasonHash, reasonHash }),
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        success: true,
        errorMessage: null
      });
    } catch (auditErr) {
      console.warn('[clinicSettings] audit log failed (non-blocking):', auditErr.message);
    }

    return res.status(201).json({
      success: true,
      data: newEntry,
      message: 'Exceptional opening added successfully'
    });
  } catch (error) {
    console.error('[clinicSettings] Error adding exceptional opening:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to add exceptional opening', details: error.message }
    });
  }
});
```

- [ ] **Step 4: Add DELETE endpoint**

Immediately after the POST handler added in Step 3, add:

```javascript
/**
 * DELETE /api/v1/clinic-settings/exceptional-openings/:id
 * Remove an exceptional opening by id
 */
router.delete('/exceptional-openings/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [settings] = await req.clinicDb.query(
      'SELECT exceptional_openings FROM clinic_settings WHERE facility_id = :clinicId',
      { replacements: { clinicId: req.clinicId } }
    );

    if (settings.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Clinic settings not found' }
      });
    }

    const exceptionalOpenings = settings[0].exceptional_openings || [];
    const entry = exceptionalOpenings.find(e => e.id === id);
    if (!entry) {
      return res.status(404).json({
        success: false,
        error: { message: 'Exceptional opening not found' }
      });
    }

    const updated = exceptionalOpenings.filter(e => e.id !== id);

    await req.clinicDb.query(
      `UPDATE clinic_settings
       SET exceptional_openings = :exceptional_openings, updated_at = CURRENT_TIMESTAMP
       WHERE facility_id = :clinicId`,
      {
        replacements: {
          clinicId: req.clinicId,
          exceptional_openings: JSON.stringify(updated)
        }
      }
    );

    // Audit log
    try {
      const auditService = require('../services/auditService');
      await auditService.logAudit({
        userId: req.user?.id,
        companyId: req.user?.companyId || req.clinicId,
        eventType: 'clinic_config',
        resourceType: 'exceptional_opening',
        resourceId: id,
        action: 'exceptional_opening.removed',
        changes: JSON.stringify({ date: entry.date }),
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        success: true,
        errorMessage: null
      });
    } catch (auditErr) {
      console.warn('[clinicSettings] audit log failed (non-blocking):', auditErr.message);
    }

    return res.json({
      success: true,
      data: { id, exceptional_openings: updated },
      message: 'Exceptional opening removed successfully'
    });
  } catch (error) {
    console.error('[clinicSettings] Error removing exceptional opening:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to remove exceptional opening', details: error.message }
    });
  }
});
```

- [ ] **Step 5: Run tests**

Run: `cd /var/www/medical-pro-backend && npx jest tests/routes/clinicSettings.exceptionalOpenings.test.js`

Expected: All 8 tests pass.

- [ ] **Step 6: Run the full clinicSettings route test suite to ensure no regression**

Run: `cd /var/www/medical-pro-backend && npx jest tests/routes/clinicSettings`

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
cd /var/www/medical-pro-backend
git add src/routes/clinicSettings.js tests/routes/clinicSettings.exceptionalOpenings.test.js
git commit -m "feat(clinic): POST/DELETE endpoints for exceptional_openings

POST /clinic-settings/exceptional-openings validates date, enforces
mutual exclusion with closed_dates, rejects past dates, caps at 365
entries. DELETE :id removes by uuid. Both log to audit_logs with
hashed reason (avoid storing free text)."
```

---

## Task 5: Frontend — Data transform

**Files:**
- Modify: `/var/www/medical-pro/src/api/dataTransform.js`

- [ ] **Step 1: Extend transformClinicSettingsFromBackend**

Open `/var/www/medical-pro/src/api/dataTransform.js`. Find `function transformClinicSettingsFromBackend` (around line 502). Locate the `return {...}` object and add `exceptionalOpenings` after `closedDates`:

```javascript
  return {
    id: settings.id,
    facilityId: settings.facility_id,

    operatingDays,
    operatingHours: normalizedOperatingHours,

    // Slot settings ...
    slotSettings: {
      defaultDuration: settings.slot_settings?.defaultDuration || 30,
      availableDurations: settings.slot_settings?.availableDurations || [15, 20, 30, 45, 60],
      bufferTime: settings.slot_settings?.bufferTime || 5,
      maxAdvanceBooking: settings.slot_settings?.maxAdvanceBooking || 90,
      minAdvanceBooking: settings.slot_settings?.minAdvanceBooking || 1,
      allowWeekendBooking: settings.slot_settings?.allowWeekendBooking || false
    },

    closedDates: settings.closed_dates || [],
    exceptionalOpenings: settings.exceptional_openings || [],

    appointmentTypes: settings.appointment_types || [],
    notifications: settings.notifications || {},

    createdAt: settings.created_at,
    updatedAt: settings.updated_at
  };
```

- [ ] **Step 2: Extend transformClinicSettingsToBackend**

In the same file, find `function transformClinicSettingsToBackend` (around line 543). Add `exceptional_openings`:

```javascript
  const backendData = {
    operating_days: settings.operatingDays,
    operating_hours: settings.operatingHours,
    slot_settings: settings.slotSettings,
    closed_dates: settings.closedDates,
    exceptional_openings: settings.exceptionalOpenings,
    appointment_types: settings.appointmentTypes,
    notifications: settings.notifications
  };
```

- [ ] **Step 3: Sanity-check manually**

Run: `cd /var/www/medical-pro && node -e "const dt = require('./src/api/dataTransform').dataTransform; const r = dt.transformClinicSettingsFromBackend({ operating_days: [1,2,3,4,5], operating_hours: {}, exceptional_openings: [{id:'x',date:'2099-01-01'}] }); console.log(JSON.stringify(r.exceptionalOpenings))"`

Expected output: `[{"id":"x","date":"2099-01-01"}]`

- [ ] **Step 4: Commit**

```bash
cd /var/www/medical-pro
git add src/api/dataTransform.js
git commit -m "feat(clinic): map exceptional_openings in dataTransform

Both directions: backend exceptional_openings ↔ frontend
exceptionalOpenings. Mirrors closed_dates mapping."
```

---

## Task 6: Frontend — API client methods

**Files:**
- Modify: `/var/www/medical-pro/src/api/clinicSettingsApi.js`

- [ ] **Step 1: Add addExceptionalOpening**

Open `/var/www/medical-pro/src/api/clinicSettingsApi.js`. After the `removeClosedDate` function, add:

```javascript
/**
 * Add an exceptional opening
 * @param {Object} payload { date, reason?, hasLunchBreak, morning, afternoon? }
 * @returns {Promise<Object>} the new entry with server-assigned id
 */
async function addExceptionalOpening(payload) {
  try {
    const response = await baseClient.post('/clinic-settings/exceptional-openings', payload);
    return dataTransform.unwrapResponse(response);
  } catch (error) {
    console.error('[clinicSettingsApi] Error adding exceptional opening:', error);
    throw error;
  }
}

/**
 * Remove an exceptional opening by id
 */
async function removeExceptionalOpening(id) {
  try {
    const response = await baseClient.delete(`/clinic-settings/exceptional-openings/${id}`);
    return dataTransform.unwrapResponse(response);
  } catch (error) {
    console.error('[clinicSettingsApi] Error removing exceptional opening:', error);
    throw error;
  }
}
```

- [ ] **Step 2: Export new methods**

At the bottom of the file, extend the `clinicSettingsApi` export:

```javascript
export const clinicSettingsApi = {
  getClinicSettings,
  updateClinicSettings,
  addClosedDate,
  removeClosedDate,
  addExceptionalOpening,
  removeExceptionalOpening
};
```

- [ ] **Step 3: Commit**

```bash
cd /var/www/medical-pro
git add src/api/clinicSettingsApi.js
git commit -m "feat(clinic): add exceptional openings API client methods"
```

---

## Task 7: Frontend — Context integration

**Files:**
- Modify: `/var/www/medical-pro/src/contexts/ClinicSettingsContext.js`

- [ ] **Step 1: Add context methods**

Open `/var/www/medical-pro/src/contexts/ClinicSettingsContext.js`. After `removeClosedDate` useCallback, add:

```javascript
  // Add an exceptional opening and refresh the shared state so all
  // consumers (booking modal, planning, etc.) see the new entry.
  const addExceptionalOpening = useCallback(async (payload) => {
    await clinicSettingsApi.addExceptionalOpening(payload);
    await refresh();
  }, [refresh]);

  // Remove an exceptional opening by id and refresh.
  const removeExceptionalOpening = useCallback(async (id) => {
    await clinicSettingsApi.removeExceptionalOpening(id);
    await refresh();
  }, [refresh]);
```

- [ ] **Step 2: Expose them in the context value**

In the same file, find the `value` object (near the Provider). Add the 2 methods:

```javascript
  const value = {
    clinicSettings,
    loading,
    error,
    refresh,
    updateSettings,
    addClosedDate,
    removeClosedDate,
    addExceptionalOpening,
    removeExceptionalOpening
  };
```

- [ ] **Step 3: Commit**

```bash
cd /var/www/medical-pro
git add src/contexts/ClinicSettingsContext.js
git commit -m "feat(clinic): expose exceptional openings methods via context

addExceptionalOpening and removeExceptionalOpening trigger a context
refresh so all subscribers re-render with fresh data (no manual reload)."
```

---

## Task 8: Frontend — i18n keys

**Files:**
- Modify: `/var/www/medical-pro/src/locales/es/admin.json`
- Modify: `/var/www/medical-pro/src/locales/fr/admin.json`
- Modify: `/var/www/medical-pro/src/locales/en/admin.json`

- [ ] **Step 1: Add Spanish keys**

Open `/var/www/medical-pro/src/locales/es/admin.json`. Find the `clinicConfiguration` section. Inside `tabs`, add `"openings": "Aperturas excepcionales"`. Inside `messages`, add the new messages. Add a new nested object `openings` at the same level as `tabs` and `messages`:

Merge into `clinicConfiguration`:

```json
{
  "clinicConfiguration": {
    "tabs": {
      "schedule": "Horario",
      "slots": "Citas",
      "closed": "Cierres",
      "openings": "Aperturas excepcionales"
    },
    "openings": {
      "title": "Aperturas excepcionales configuradas",
      "addTitle": "Añadir una apertura excepcional",
      "date": "Fecha",
      "reason": "Motivo",
      "reasonPlaceholder": "Motivo (opcional)",
      "lunchBreak": "Pausa del mediodía",
      "morning": "Mañana",
      "afternoon": "Tarde",
      "from": "De",
      "to": "A",
      "addButton": "Añadir",
      "empty": "No hay aperturas excepcionales configuradas",
      "removeConfirm": "¿Eliminar esta apertura?"
    },
    "messages": {
      "openingAdded": "Apertura excepcional añadida",
      "openingRemoved": "Apertura excepcional eliminada",
      "openingConflict": "Ya hay un cierre configurado para esa fecha",
      "openingDuplicate": "Ya hay una apertura configurada para esa fecha",
      "openingLimitReached": "Límite de 365 aperturas alcanzado",
      "openingPastDate": "La fecha debe ser hoy o en el futuro",
      "openingAddError": "Error al añadir la apertura",
      "openingRemoveError": "Error al eliminar la apertura"
    }
  }
}
```

Keep all existing keys in `clinicConfiguration.*` — only add the new ones alongside.

- [ ] **Step 2: Add French keys**

Open `/var/www/medical-pro/src/locales/fr/admin.json`. Apply the same structure:

```json
{
  "clinicConfiguration": {
    "tabs": {
      "openings": "Ouvertures exceptionnelles"
    },
    "openings": {
      "title": "Ouvertures exceptionnelles configurées",
      "addTitle": "Ajouter une ouverture exceptionnelle",
      "date": "Date",
      "reason": "Raison",
      "reasonPlaceholder": "Raison (optionnelle)",
      "lunchBreak": "Pause déjeuner",
      "morning": "Matin",
      "afternoon": "Après-midi",
      "from": "De",
      "to": "À",
      "addButton": "Ajouter",
      "empty": "Aucune ouverture exceptionnelle configurée",
      "removeConfirm": "Supprimer cette ouverture ?"
    },
    "messages": {
      "openingAdded": "Ouverture exceptionnelle ajoutée",
      "openingRemoved": "Ouverture exceptionnelle supprimée",
      "openingConflict": "Une fermeture est déjà configurée à cette date",
      "openingDuplicate": "Une ouverture est déjà configurée à cette date",
      "openingLimitReached": "Limite de 365 ouvertures atteinte",
      "openingPastDate": "La date doit être aujourd'hui ou dans le futur",
      "openingAddError": "Erreur lors de l'ajout",
      "openingRemoveError": "Erreur lors de la suppression"
    }
  }
}
```

- [ ] **Step 3: Add English keys**

Open `/var/www/medical-pro/src/locales/en/admin.json`. Apply:

```json
{
  "clinicConfiguration": {
    "tabs": {
      "openings": "Exceptional openings"
    },
    "openings": {
      "title": "Configured exceptional openings",
      "addTitle": "Add an exceptional opening",
      "date": "Date",
      "reason": "Reason",
      "reasonPlaceholder": "Reason (optional)",
      "lunchBreak": "Lunch break",
      "morning": "Morning",
      "afternoon": "Afternoon",
      "from": "From",
      "to": "To",
      "addButton": "Add",
      "empty": "No exceptional openings configured",
      "removeConfirm": "Delete this opening?"
    },
    "messages": {
      "openingAdded": "Exceptional opening added",
      "openingRemoved": "Exceptional opening removed",
      "openingConflict": "A closure is already set for this date",
      "openingDuplicate": "An opening is already set for this date",
      "openingLimitReached": "Limit of 365 openings reached",
      "openingPastDate": "Date must be today or in the future",
      "openingAddError": "Error adding opening",
      "openingRemoveError": "Error removing opening"
    }
  }
}
```

- [ ] **Step 4: Validate JSON syntax**

Run: `cd /var/www/medical-pro && node -e "require('./src/locales/es/admin.json'); require('./src/locales/fr/admin.json'); require('./src/locales/en/admin.json'); console.log('OK')"`

Expected output: `OK`

- [ ] **Step 5: Commit**

```bash
cd /var/www/medical-pro
git add src/locales/es/admin.json src/locales/fr/admin.json src/locales/en/admin.json
git commit -m "feat(i18n): add exceptional openings translations (es/fr/en)

21 new keys per language: tabs.openings, openings.* (14 keys),
messages.opening* (8 keys)."
```

---

## Task 9: Frontend — New tab component

**Files:**
- Create: `/var/www/medical-pro/src/components/admin/ExceptionalOpeningsTab.js`

- [ ] **Step 1: Create the component**

Create `/var/www/medical-pro/src/components/admin/ExceptionalOpeningsTab.js`:

```javascript
// components/admin/ExceptionalOpeningsTab.js
// UI for managing exceptional openings (symmetric to the "closed dates" tab).

import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Calendar, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useClinicSettings } from '../../contexts/ClinicSettingsContext';

const todayISO = () => new Date().toISOString().split('T')[0];

const ExceptionalOpeningsTab = ({ onNotify }) => {
  const { t, i18n } = useTranslation(['admin', 'common']);
  const { clinicSettings, addExceptionalOpening, removeExceptionalOpening } = useClinicSettings();

  const [form, setForm] = useState({
    date: '',
    reason: '',
    hasLunchBreak: false,
    morning: { start: '09:00', end: '12:00' },
    afternoon: { start: '14:00', end: '17:00' }
  });
  const [submitting, setSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const openings = useMemo(() => {
    const arr = clinicSettings?.exceptionalOpenings || [];
    return [...arr].sort((a, b) => a.date.localeCompare(b.date));
  }, [clinicSettings]);

  const isFormValid = useMemo(() => {
    if (!form.date || form.date < todayISO()) return false;
    if (!/^\d{2}:\d{2}$/.test(form.morning.start)) return false;
    if (!/^\d{2}:\d{2}$/.test(form.morning.end)) return false;
    if (form.morning.start >= form.morning.end) return false;
    if (form.hasLunchBreak) {
      if (!/^\d{2}:\d{2}$/.test(form.afternoon.start)) return false;
      if (!/^\d{2}:\d{2}$/.test(form.afternoon.end)) return false;
      if (form.morning.end > form.afternoon.start) return false;
      if (form.afternoon.start >= form.afternoon.end) return false;
    }
    return true;
  }, [form]);

  const formatDateLabel = (isoDate) => {
    try {
      return new Intl.DateTimeFormat(i18n.language, {
        weekday: 'short', day: '2-digit', month: 'long', year: 'numeric'
      }).format(new Date(isoDate + 'T00:00:00'));
    } catch {
      return isoDate;
    }
  };

  const formatRanges = (o) => {
    if (o.hasLunchBreak && o.afternoon) {
      return `${o.morning.start}–${o.morning.end}, ${o.afternoon.start}–${o.afternoon.end}`;
    }
    return `${o.morning.start}–${o.morning.end}`;
  };

  const handleAdd = async () => {
    if (!isFormValid || submitting) return;
    setSubmitting(true);
    try {
      const payload = {
        date: form.date,
        reason: form.reason?.trim() || null,
        hasLunchBreak: form.hasLunchBreak,
        morning: form.morning,
        ...(form.hasLunchBreak ? { afternoon: form.afternoon } : {})
      };
      await addExceptionalOpening(payload);
      setForm({
        date: '', reason: '', hasLunchBreak: false,
        morning: { start: '09:00', end: '12:00' },
        afternoon: { start: '14:00', end: '17:00' }
      });
      onNotify?.({ type: 'success', message: t('admin:clinicConfiguration.messages.openingAdded') });
    } catch (err) {
      const status = err?.response?.status;
      let messageKey = 'admin:clinicConfiguration.messages.openingAddError';
      if (status === 409) {
        // Could be closed_dates conflict OR duplicate — message from server distinguishes
        const serverMsg = err?.response?.data?.error?.message || '';
        messageKey = /closed/i.test(serverMsg)
          ? 'admin:clinicConfiguration.messages.openingConflict'
          : 'admin:clinicConfiguration.messages.openingDuplicate';
      } else if (status === 400) {
        const serverMsg = err?.response?.data?.error?.message || '';
        if (/past/i.test(serverMsg)) messageKey = 'admin:clinicConfiguration.messages.openingPastDate';
        else if (/limit|maximum|365/i.test(serverMsg)) messageKey = 'admin:clinicConfiguration.messages.openingLimitReached';
      }
      onNotify?.({ type: 'error', message: t(messageKey) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await removeExceptionalOpening(id);
      onNotify?.({ type: 'success', message: t('admin:clinicConfiguration.messages.openingRemoved') });
    } catch {
      onNotify?.({ type: 'error', message: t('admin:clinicConfiguration.messages.openingRemoveError') });
    } finally {
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add form */}
      <div className="border border-gray-200 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-medium text-gray-900">
          {t('admin:clinicConfiguration.openings.addTitle')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin:clinicConfiguration.openings.date')}
            </label>
            <input
              type="date"
              min={todayISO()}
              value={form.date}
              onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin:clinicConfiguration.openings.reason')}
            </label>
            <input
              type="text"
              maxLength={500}
              value={form.reason}
              onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder={t('admin:clinicConfiguration.openings.reasonPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.hasLunchBreak}
            onChange={(e) => setForm(f => ({ ...f, hasLunchBreak: e.target.checked }))}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">{t('admin:clinicConfiguration.openings.lunchBreak')}</span>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-500 w-24">
              {t('admin:clinicConfiguration.openings.morning')}:
            </span>
            <input
              type="time"
              value={form.morning.start}
              onChange={(e) => setForm(f => ({ ...f, morning: { ...f.morning, start: e.target.value } }))}
              className="px-2 py-1 border border-gray-300 rounded"
            />
            <span>→</span>
            <input
              type="time"
              value={form.morning.end}
              onChange={(e) => setForm(f => ({ ...f, morning: { ...f.morning, end: e.target.value } }))}
              className="px-2 py-1 border border-gray-300 rounded"
            />
          </div>

          {form.hasLunchBreak && (
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-500 w-24">
                {t('admin:clinicConfiguration.openings.afternoon')}:
              </span>
              <input
                type="time"
                value={form.afternoon.start}
                onChange={(e) => setForm(f => ({ ...f, afternoon: { ...f.afternoon, start: e.target.value } }))}
                className="px-2 py-1 border border-gray-300 rounded"
              />
              <span>→</span>
              <input
                type="time"
                value={form.afternoon.end}
                onChange={(e) => setForm(f => ({ ...f, afternoon: { ...f.afternoon, end: e.target.value } }))}
                className="px-2 py-1 border border-gray-300 rounded"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleAdd}
            disabled={!isFormValid || submitting}
            className={`inline-flex items-center px-4 py-2 rounded-lg text-white ${
              isFormValid && !submitting ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('admin:clinicConfiguration.openings.addButton')}
          </button>
        </div>
      </div>

      {/* List */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">
          {t('admin:clinicConfiguration.openings.title')}
        </h3>
        {openings.length === 0 ? (
          <div className="text-sm text-gray-500 italic p-4 border border-dashed border-gray-300 rounded-lg text-center">
            <Calendar className="h-5 w-5 inline mr-2" />
            {t('admin:clinicConfiguration.openings.empty')}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
            {openings.map(o => (
              <li key={o.id} className="p-3 flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    <Calendar className="h-4 w-4 inline mr-2 text-blue-600" />
                    {formatDateLabel(o.date)} — {formatRanges(o)}
                  </div>
                  {o.reason && (
                    <div className="text-xs text-gray-500 mt-1 italic">"{o.reason}"</div>
                  )}
                </div>
                {confirmDeleteId === o.id ? (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-600">{t('admin:clinicConfiguration.openings.removeConfirm')}</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(o.id)}
                      className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      {t('common:yes')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      {t('common:no')}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(o.id)}
                    className="text-red-600 hover:text-red-800"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ExceptionalOpeningsTab;
```

- [ ] **Step 2: Verify no import errors**

Run: `cd /var/www/medical-pro && npx eslint src/components/admin/ExceptionalOpeningsTab.js`

Expected: no errors (or just warnings acceptable in the project convention).

- [ ] **Step 3: Commit**

```bash
cd /var/www/medical-pro
git add src/components/admin/ExceptionalOpeningsTab.js
git commit -m "feat(clinic): add ExceptionalOpeningsTab component

Form (date + reason + morning/afternoon with optional lunch break) +
sorted list with inline delete confirmation. Wires to
ClinicSettingsContext methods. Intl.DateTimeFormat for localized
date labels, max-500 on reason, min=today on date picker."
```

---

## Task 10: Frontend — Wire tab into ClinicConfigModal

**Files:**
- Modify: `/var/www/medical-pro/src/components/admin/ClinicConfigModal.js`

- [ ] **Step 1: Import the new tab component**

Open `/var/www/medical-pro/src/components/admin/ClinicConfigModal.js`. Add near the top with the other imports:

```javascript
import ExceptionalOpeningsTab from './ExceptionalOpeningsTab';
```

- [ ] **Step 2: Add the tab button**

Find the tab buttons section (around the existing buttons for `schedule`/`slots`/`closed`). After the `closed` tab button, add:

```jsx
<button
  onClick={() => setActiveTab('openings')}
  className={`px-4 py-2 text-sm font-medium ${
    activeTab === 'openings'
      ? 'text-blue-600 border-b-2 border-blue-600'
      : 'text-gray-500 hover:text-gray-700'
  }`}
>
  <Calendar className="h-4 w-4 inline mr-2" />
  {t('admin:clinicConfiguration.tabs.openings')}
</button>
```

- [ ] **Step 3: Add the tab content panel**

Find where `activeTab === 'closed'` content is rendered. After that block, add:

```jsx
{activeTab === 'openings' && (
  <ExceptionalOpeningsTab onNotify={setNotification} />
)}
```

- [ ] **Step 4: Visual verification**

Run the dev server: `cd /var/www/medical-pro && npm start`

- Log in as admin
- Open the clinic config modal
- Click the "Ouvertures exceptionnelles" tab
- Confirm the form renders, the date picker disallows past dates, the list is empty

- [ ] **Step 5: Commit**

```bash
cd /var/www/medical-pro
git add src/components/admin/ClinicConfigModal.js
git commit -m "feat(clinic): add Exceptional Openings tab to ClinicConfigModal"
```

---

## Task 11: Manual end-to-end validation (staging/dev)

**Files:** None — this is a pure verification task.

- [ ] **Step 1: Start the stack locally**

```bash
# Terminal 1 — backend
cd /var/www/medical-pro-backend && pm2 restart medical-pro-backend 2>/dev/null || npm run dev

# Terminal 2 — frontend
cd /var/www/medical-pro && npm start
```

- [ ] **Step 2: Scenario 1 — add an exceptional opening**

- Log in as admin
- Open clinic config → "Ouvertures exceptionnelles" tab
- Add: date = next Sunday, reason = "Test campagne", lunch break ON, 09:00-12:00 / 14:00-17:00
- Click Add

Expected: green notification "Ouverture exceptionnelle ajoutée", entry appears in the list below.

- [ ] **Step 3: Scenario 2 — booking modal picks up the opening without refresh**

- Without refreshing, open the appointment booking modal
- Select the same Sunday
- Select a practitioner that has availability that day (or set one via AvailabilityManager first)

Expected: time slots visible between 09:00-12:00 and 14:00-17:00. No "clinic closed" message.

- [ ] **Step 4: Scenario 3 — duplicate rejection**

- Go back to the Openings tab, try to add the same date again with any hours

Expected: red notification "Une ouverture est déjà configurée à cette date".

- [ ] **Step 5: Scenario 4 — conflict with closed_dates**

- Switch to the "Cierres/Fermetures" tab, add a closed date on a different future date
- Switch back to Openings tab, try to add an exceptional opening on that same date

Expected: red notification "Une fermeture est déjà configurée à cette date" (status 409).

- [ ] **Step 6: Scenario 5 — past date**

- In the Openings tab, try to pick a past date

Expected: date picker HTML `min` attribute prevents selection; if forced via devtools, 400 error from server.

- [ ] **Step 7: Scenario 6 — delete propagation**

- Delete the previously added opening
- Confirm the booking modal for that Sunday now shows "clinic closed" again (if it was the only opening and the day is not in operating_days)

Expected: slots disappear without a refresh.

- [ ] **Step 8: Scenario 7 — tenant isolation**

- Log in as admin on another clinic
- Verify the Openings tab list does not show the entry from the first clinic

Expected: empty list on the second clinic.

- [ ] **Step 9: Scenario 8 — audit log**

Run: `ssh -p 2222 root@72.62.51.173 'psql -h localhost -U medicalpro -d medicalpro_central -c "SELECT action, resource_type, created_at FROM audit_logs WHERE action LIKE '\''%exceptional_opening%'\'' ORDER BY created_at DESC LIMIT 5"'`

(Or the equivalent dev DB query locally — adjust the DB name per environment.)

Expected: rows with `action='exceptional_opening.added'` and `action='exceptional_opening.removed'`.

- [ ] **Step 10: If all scenarios pass, tag the work**

```bash
cd /var/www/medical-pro
git tag -a feature/exceptional-openings-v1 -m "Exceptional openings feature — staging validated"
```

---

## Task 12: Update project documentation

**Files:**
- Modify: `/var/www/medical-pro/CLAUDE.md` (if it exists in the repo)
- Modify: `/root/.claude/projects/-var-www-medical-pro/memory/MEMORY.md` (auto-memory) — only add if new structural lesson emerges

- [ ] **Step 1: Update CLAUDE.md if it exists**

Run: `ls -la /var/www/medical-pro/CLAUDE.md /var/www/medical-pro-backend/CLAUDE.md 2>/dev/null`

If either exists, add a short entry under "Key Lessons" or equivalent:

```markdown
### Clinic hours resolver (2026-04-12)
- Backend `planningService.getClinicHoursRanges()` applies strict priority:
  closed_dates > exceptional_openings > operating_days > null
- `exceptional_openings` (JSONB on clinic_settings) lets admins open the
  clinic on a normally-closed weekday with custom hours without flipping
  the day in operating_days
- Mutual exclusion with closed_dates enforced at POST time (409)
- Migration: clinic_081_exceptional_openings.sql — registered in both
  scripts/run-clinic-migrations.js AND services/clinicProvisioningService.js
```

- [ ] **Step 2: Commit doc updates (if any)**

```bash
cd /var/www/medical-pro  # or medical-pro-backend
git add CLAUDE.md
git commit -m "docs: document exceptional_openings resolver behavior"
```

---

## Task 13: Production deployment

**Files:** None — deployment via existing CI/CD or manual SSH.

- [ ] **Step 1: Deploy backend FIRST (rétrocompatible)**

The backend migration is additive (`ADD COLUMN IF NOT EXISTS`). Existing frontends ignore unknown fields, so backend deploys first with zero risk.

```bash
# SSH to prod
ssh -p 2222 root@72.62.51.173 <<'EOF'
cd /var/www/medical-pro-backend
git fetch origin
git reset --hard origin/master
npm ci --production --legacy-peer-deps 2>&1 | tail -3
node scripts/run-clinic-migrations.js 2>&1 | tail -20
pm2 restart medical-pro-backend
EOF
```

Expected: migration output shows `clinic_081_exceptional_openings.sql` applied for each clinic, PM2 restart OK.

- [ ] **Step 2: Verify backend health**

```bash
curl -sI https://app.medimaestro.com/api/v1/clinic-settings 2>&1 | head -2
```

Expected: `HTTP/2 401` (auth required is normal — it means the endpoint is alive).

- [ ] **Step 3: Deploy frontend**

```bash
ssh -p 2222 root@72.62.51.173 <<'EOF'
cd /var/www/medical-pro
git fetch origin
git reset --hard origin/master
rm -rf build
REACT_APP_API_BASE_URL=/api/v1 REACT_APP_COUNTRY=ES REACT_APP_ENV=production npm run build 2>&1 | tail -3
ls build/index.html
grep -c "localhost:3001" build/static/js/main.*.js
pm2 restart medical-pro-frontend
EOF
```

Expected: `build/index.html` exists, 0 occurrences of `localhost:3001`, PM2 restart confirmed.

- [ ] **Step 4: Smoke test on production**

- Log in as admin on https://app.medimaestro.com
- Open clinic config → verify new "Ouvertures exceptionnelles" tab present
- Add a test opening on a far future Sunday (e.g. 2099-01-04)
- Verify list, delete it

Expected: full add → list → delete roundtrip works; no console errors.

- [ ] **Step 5: Tag the release**

```bash
cd /var/www/medical-pro
git tag -a release/exceptional-openings-prod -m "Exceptional openings — production release"
git push origin release/exceptional-openings-prod
```

---

## Self-Review

**1. Spec coverage:**
- F-1 add exceptional opening → Task 4 (backend POST) + Task 9 (UI form) + Task 10 (tab wiring) ✓
- F-2 morning+afternoon with lunch break → Task 2 (Joi schema) + Task 9 (UI toggle) ✓
- F-3 delete → Task 4 (backend DELETE) + Task 9 (UI inline confirm) ✓
- F-4 mutual exclusion with closed_dates → Task 4 Step 3 (409 check) ✓
- F-5 reject past dates → Task 4 Step 3 + Task 9 Step 1 (min=today) ✓
- F-6 booking modal shows slots → Task 3 (resolver update) + manual scenario 2 ✓
- F-7 propagation without refresh → Task 7 (context refresh) + manual scenario 6 ✓
- F-8 i18n es/fr/en → Task 8 ✓
- NF-1 tenant isolation → manual scenario 7 + reuse of existing clinicDb pattern ✓
- NF-2 RBAC → inherited from existing `/clinic-settings/*` middleware, no change needed ✓
- NF-3 audit logs → Task 4 Step 3 and Step 4 (non-blocking try/catch around audit call) ✓
- NF-4 max 365 → Task 4 Step 3 + Task 2 (Joi `.max(365)`) ✓
- NF-5 no regression → Task 3 Step 6 + Task 4 Step 6 (run existing suites) ✓

All spec requirements covered.

**2. Placeholder scan:** No TBD/TODO/FIXME/"add error handling"/vague references in the plan. Tests include explicit assertions, route handlers show complete code.

**3. Type consistency:**
- Property names are consistent: backend `exceptional_openings` ↔ frontend `exceptionalOpenings` (mapped in Task 5)
- Method names consistent: `addExceptionalOpening` / `removeExceptionalOpening` (API, context, tests)
- Schema field names (`date`, `reason`, `hasLunchBreak`, `morning`, `afternoon`) match across Joi schema (Task 2), DB JSONB (Task 1 comment), backend routes (Task 4), frontend transform (Task 5), context (Task 7), component (Task 9)
- `id` generation: Task 4 Step 3 uses `crypto.randomUUID()`; Task 9 keys on `o.id` — consistent

Plan is internally consistent.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-12-exceptional-openings.md`.
