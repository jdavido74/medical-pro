# Chain Pipeline Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 7 critical bugs in the linked appointment chain pipeline: add DB transactions, fix stale data in chain adjustment, implement backend chain recalculation on delete, fix substitution targeting, add chain-aware delete UI, and improve substitution UX.

**Architecture:** Extract chain operations from `planning.js` into a new `appointmentChainService.js` that wraps all mutations in Sequelize transactions with `SELECT ... FOR UPDATE` row locking. Frontend delegates chain recalculation to backend instead of N sequential PUTs. New `ChainDeleteChoiceModal` component for chain-aware deletion with clear user messaging.

**Tech Stack:** Backend: Node.js / Express / Sequelize (transactions) / Jest. Frontend: React / react-i18next / Tailwind / Lucide icons.

**Repos:**
- Backend: `/var/www/medical-pro-backend`
- Frontend: `/var/www/medical-pro`

**Spec reference:** `docs/superpowers/specs/2026-04-18-chain-pipeline-refactor-design.md`

---

## File Structure

### Backend (new)
- `src/services/appointmentChainService.js` — transactional chain operations (updateInChain, deleteFromChain, substituteInChain)

### Backend (modified)
- `src/routes/planning.js` — PUT/:id delegates to chain service, DELETE/:id accepts `recalculateChain` body param
- `src/services/chainSubstitutionService.js` — no changes needed (pure computation, bugs in callers not here)

### Frontend (new)
- `src/components/dashboard/modals/ChainDeleteChoiceModal.js` — reusable chain delete confirmation modal

### Frontend (modified)
- `src/components/dashboard/modals/PlanningBookingModal.js` — fix substitution targeting, transmit `recalculateChain`, remove `handleDeleteRecalculate`, improve substitution button UX, sync header title
- `src/components/dashboard/modules/PlanningModule.js` — chain-aware quick cancel button
- `src/api/planningApi.js` — `cancelAppointment` accepts body options
- `src/locales/{fr,es,en}/planning.json` — i18n keys for chain delete/substitute modals

---

## Phase 1 — Backend: Chain Service + Route Fixes

### Task 1: Create `appointmentChainService.js` with `deleteFromChain`

**Files:**
- Create: `/var/www/medical-pro-backend/src/services/appointmentChainService.js`

We start with `deleteFromChain` because it's the simplest operation and lets us validate the transaction + locking pattern.

- [ ] **Step 1: Read `Appointment.findLinkedGroup` to understand chain fetching**

Run: `sed -n '590,620p' /var/www/medical-pro-backend/src/models/clinic/Appointment.js`

Note the pattern: determine parentId, then fetch all where `id = parentId OR linked_appointment_id = parentId`, ordered by `link_sequence`.

- [ ] **Step 2: Read `computeChainAdjustment` signature**

Run: `grep -n 'async function computeChainAdjustment\|module.exports' /var/www/medical-pro-backend/src/services/chainSubstitutionService.js`

Note the function signature and export name.

- [ ] **Step 3: Create the service file**

Create `/var/www/medical-pro-backend/src/services/appointmentChainService.js`:

```js
'use strict';

const { Op, QueryTypes } = require('sequelize');
const { getModel } = require('../base/ModelFactory');
const { logger } = require('../utils/logger');

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

async function fetchChainWithLock(clinicDb, appointmentId, transaction) {
  const Appointment = await getModel(clinicDb, 'Appointment');
  const appointment = await Appointment.findByPk(appointmentId, { transaction, lock: true });
  if (!appointment) throw new Error('Appointment not found');

  const parentId = appointment.linked_appointment_id || appointment.id;

  const chain = await Appointment.findAll({
    where: {
      [Op.or]: [
        { id: parentId },
        { linked_appointment_id: parentId }
      ]
    },
    order: [['link_sequence', 'ASC']],
    transaction,
    lock: true
  });

  return chain;
}

async function deleteFromChain(clinicDb, appointmentId, opts = {}) {
  const { recalculateChain = false } = opts;

  return await clinicDb.transaction(async (transaction) => {
    const chain = await fetchChainWithLock(clinicDb, appointmentId, transaction);
    const target = chain.find(a => a.id === appointmentId);
    if (!target) throw new Error('Appointment not found in chain');

    await target.update({ status: 'cancelled' }, { transaction });

    const recalculated = [];

    if (recalculateChain) {
      const activeDownstream = chain.filter(
        a => a.link_sequence > target.link_sequence && a.status !== 'cancelled' && a.status !== 'completed'
      );

      if (activeDownstream.length > 0) {
        const activeBefore = chain.filter(
          a => a.link_sequence < target.link_sequence && a.status !== 'cancelled' && a.status !== 'completed'
        );

        let cursor;
        if (activeBefore.length > 0) {
          const prev = activeBefore[activeBefore.length - 1];
          cursor = timeToMinutes(prev.end_time);
        } else {
          cursor = timeToMinutes(target.start_time);
        }

        for (const apt of activeDownstream) {
          const newStart = minutesToTime(cursor);
          const newEnd = minutesToTime(cursor + (apt.duration_minutes || 30));
          await apt.update(
            { start_time: newStart, end_time: newEnd },
            { transaction }
          );
          recalculated.push({ id: apt.id, start_time: newStart, end_time: newEnd });
          cursor += (apt.duration_minutes || 30);
        }
      }
    }

    if (target.link_sequence === 1 && !target.linked_appointment_id) {
      const nextActive = chain.find(
        a => a.id !== appointmentId && a.status !== 'cancelled'
      );
      if (nextActive) {
        await nextActive.update(
          { linked_appointment_id: null, link_sequence: 1 },
          { transaction }
        );
      }
    }

    return { cancelled: target.id, recalculated };
  });
}

module.exports = { fetchChainWithLock, deleteFromChain };
```

- [ ] **Step 4: Commit**

```bash
cd /var/www/medical-pro-backend
git add src/services/appointmentChainService.js
git commit -m "feat(chain): add appointmentChainService with deleteFromChain"
```

---

### Task 2: Add `updateInChain` and `substituteInChain` to the service

**Files:**
- Modify: `/var/www/medical-pro-backend/src/services/appointmentChainService.js`

- [ ] **Step 1: Read `computeChainAdjustment` full signature and return shape**

Run: `sed -n '190,260p' /var/www/medical-pro-backend/src/services/chainSubstitutionService.js`

Note: it returns `{ type: 'ok'|'conflict', updates: [...], conflict: {...} }`. Each update has `{ id, start_time, end_time }`.

- [ ] **Step 2: Add `updateInChain` function**

Append before `module.exports` in `appointmentChainService.js`:

```js
async function updateInChain(clinicDb, appointmentId, updateData, opts = {}) {
  const { recalculateChain = true } = opts;

  return await clinicDb.transaction(async (transaction) => {
    const chain = await fetchChainWithLock(clinicDb, appointmentId, transaction);
    const target = chain.find(a => a.id === appointmentId);
    if (!target) throw new Error('Appointment not found in chain');

    const pendingTarget = buildPendingTarget(target, updateData);

    if (recalculateChain && chain.length > 1) {
      const { computeChainAdjustment } = require('./chainSubstitutionService');

      let newTreatment = null;
      if (updateData.service_id && updateData.service_id !== target.service_id) {
        const ProductService = await getModel(clinicDb, 'ProductService');
        newTreatment = await ProductService.findByPk(updateData.service_id, { transaction });
      }

      const result = await computeChainAdjustment({
        clinicDb,
        targetAppointment: pendingTarget,
        newTreatment: newTreatment || target.service || { duration: pendingTarget.duration_minutes },
        chainAppointments: chain
      });

      if (result.conflict) {
        const err = new Error(result.conflict.message || 'Chain conflict');
        err.code = 'CHAIN_CONFLICT';
        err.conflict = result.conflict;
        err.pendingUpdates = result.updates;
        throw err;
      }

      for (const upd of result.updates) {
        if (upd.id !== appointmentId) {
          const apt = chain.find(a => a.id === upd.id);
          if (apt) {
            await apt.update(
              { start_time: upd.start_time, end_time: upd.end_time },
              { transaction }
            );
          }
        }
      }
    }

    await target.update(updateData, { transaction });

    return { updated: target.id, updateData };
  });
}

function buildPendingTarget(appointment, updateData) {
  const merged = { ...appointment.toJSON(), ...updateData };

  const startTime = updateData.start_time || appointment.start_time;
  const duration = updateData.duration_minutes || appointment.duration_minutes || 30;
  const startMin = timeToMinutes(typeof startTime === 'string' ? startTime.substring(0, 5) : startTime);

  merged.start_time = typeof startTime === 'string' ? startTime.substring(0, 5) : startTime;
  merged.end_time = minutesToTime(startMin + duration);
  merged.duration_minutes = duration;

  return merged;
}

async function substituteInChain(clinicDb, appointmentId, newServiceId, opts = {}) {
  const ProductService = await getModel(clinicDb, 'ProductService');
  const newTreatment = await ProductService.findByPk(newServiceId);
  if (!newTreatment || newTreatment.is_active === false) {
    throw new Error('Treatment not found or inactive');
  }

  const updateData = {
    service_id: newServiceId,
    duration_minutes: newTreatment.duration || 30,
    title: newTreatment.title
  };

  return await updateInChain(clinicDb, appointmentId, updateData, opts);
}
```

- [ ] **Step 3: Update exports**

Change `module.exports` to:

```js
module.exports = { fetchChainWithLock, deleteFromChain, updateInChain, substituteInChain, buildPendingTarget };
```

- [ ] **Step 4: Commit**

```bash
git add src/services/appointmentChainService.js
git commit -m "feat(chain): add updateInChain + substituteInChain with transactions"
```

---

### Task 3: Wire `deleteFromChain` into `planning.js` DELETE route

**Files:**
- Modify: `/var/www/medical-pro-backend/src/routes/planning.js`

- [ ] **Step 1: Read the current DELETE route**

Run: `sed -n '753,781p' /var/www/medical-pro-backend/src/routes/planning.js`

- [ ] **Step 2: Add import at top of file**

Find the existing requires at the top of `planning.js` and add:

```js
const { deleteFromChain, updateInChain } = require('../services/appointmentChainService');
```

- [ ] **Step 3: Replace DELETE handler body**

Replace the entire `router.delete('/appointments/:id', ...)` handler (lines 753–781) with:

```js
router.delete('/appointments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { recalculateChain } = req.body || {};

    const Appointment = await getModel(req.clinicDb, 'Appointment');
    const appointment = await Appointment.findByPk(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Appointment not found' }
      });
    }

    const isLinked = !!(appointment.linked_appointment_id || (appointment.link_sequence && appointment.link_sequence >= 1));

    if (isLinked) {
      const result = await deleteFromChain(req.clinicDb, id, { recalculateChain: !!recalculateChain });
      return res.json({
        success: true,
        message: recalculateChain
          ? 'Appointment cancelled and chain recalculated'
          : 'Appointment cancelled',
        data: result
      });
    }

    await appointment.update({ status: 'cancelled' });

    res.json({
      success: true,
      message: 'Appointment cancelled successfully'
    });
  } catch (error) {
    console.error('[planning] Error cancelling appointment:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to cancel appointment' }
    });
  }
});
```

- [ ] **Step 4: Commit**

```bash
cd /var/www/medical-pro-backend
git add src/routes/planning.js
git commit -m "fix(planning): DELETE delegates to chain service with recalculateChain"
```

---

### Task 4: Wire `updateInChain` into `planning.js` PUT route

**Files:**
- Modify: `/var/www/medical-pro-backend/src/routes/planning.js`

This is the most complex task. The current PUT (lines 516–748) handles substitution + chain adjustment inline without transaction. We refactor the chain path to delegate to the service.

- [ ] **Step 1: Read PUT route lines 639–677 (chain adjustment block)**

Run: `sed -n '639,677p' /var/www/medical-pro-backend/src/routes/planning.js`

- [ ] **Step 2: Replace the chain adjustment block**

Find the block starting with `// --- Chain adjustment for linked appointments ---` (line 639) through the closing `}` of the `if (isLinked)` block (line 677). Replace it with:

```js
      // --- Chain adjustment for linked appointments ---
      const isLinked = appointment.linked_appointment_id || (appointment.link_sequence && appointment.link_sequence >= 1);
      if (isLinked && (updateData.service_id || updateData.duration_minutes || req.body.startTime)) {
        const recalculateChain = req.body.recalculateChain !== false;
        try {
          await updateInChain(req.clinicDb, id, updateData, { recalculateChain });

          // Reload and return
          const Patient = await getModel(req.clinicDb, 'Patient');
          const Machine = await getModel(req.clinicDb, 'Machine');
          const HealthcareProvider = await getModel(req.clinicDb, 'HealthcareProvider');
          const ProductService = await getModel(req.clinicDb, 'ProductService');

          await appointment.reload({
            include: [
              { model: Patient, as: 'patient', attributes: ['id', 'first_name', 'last_name'] },
              { model: Machine, as: 'machine', attributes: ['id', 'name', 'color', 'location'], required: false },
              { model: HealthcareProvider, as: 'provider', attributes: ['id', 'first_name', 'last_name', 'specialties'], required: false },
              { model: HealthcareProvider, as: 'assistant', attributes: ['id', 'first_name', 'last_name'], required: false },
              { model: ProductService, as: 'service', attributes: ['id', 'title', 'duration', 'unit_price', 'tax_rate', 'is_overlappable'], required: false }
            ]
          });

          return res.json({
            success: true,
            data: transformAppointment(appointment),
            message: 'Appointment updated successfully'
          });
        } catch (err) {
          if (err.code === 'CHAIN_CONFLICT' && !req.body.force) {
            return res.status(409).json({
              success: false,
              error: {
                code: 'CHAIN_CONFLICT',
                message: err.message,
                conflict: err.conflict,
                pendingUpdates: err.pendingUpdates
              }
            });
          }
          throw err;
        }
      }
```

This replaces the old inline chain adjustment. Non-chain updates still flow through the existing code below (lines 680+).

- [ ] **Step 3: Verify the old chain block is fully removed**

Run: `grep -n 'computeChainAdjustment\|chainSubstitutionService' /var/www/medical-pro-backend/src/routes/planning.js`

Expected: the `require('../services/chainSubstitutionService')` in the PUT single route should be gone. It may still be used in the PUT group route — that's fine, we're not touching the group route.

- [ ] **Step 4: Commit**

```bash
git add src/routes/planning.js
git commit -m "fix(planning): PUT delegates chain updates to updateInChain with transaction"
```

---

### Task 5: Deploy backend

- [ ] **Step 1: Push**

```bash
cd /var/www/medical-pro-backend
git push origin master
```

- [ ] **Step 2: Deploy on prod**

```bash
ssh -p 2222 root@72.62.51.173 "cd /var/www/medical-pro-backend && git fetch origin && git reset --hard origin/master && npm install --legacy-peer-deps 2>&1 | tail -3 && pm2 restart medical-pro-backend 2>&1 | grep medical-pro-backend | head -2"
```

---

## Phase 2 — Frontend: API, i18n, Chain Delete Modal

### Task 6: Update `planningApi.cancelAppointment` to accept body

**Files:**
- Modify: `/var/www/medical-pro/src/api/planningApi.js`

- [ ] **Step 1: Read current cancelAppointment**

Run: `sed -n '70,72p' /var/www/medical-pro/src/api/planningApi.js`

- [ ] **Step 2: Update to accept options**

Replace:
```js
export const cancelAppointment = async (id) => {
  return baseClient.delete(`${ENDPOINT}/appointments/${id}`);
};
```

With:
```js
export const cancelAppointment = async (id, opts = {}) => {
  return baseClient.delete(`${ENDPOINT}/appointments/${id}`, {
    body: opts.recalculateChain != null ? { recalculateChain: opts.recalculateChain } : undefined
  });
};
```

- [ ] **Step 3: Commit**

```bash
cd /var/www/medical-pro
git add src/api/planningApi.js
git commit -m "feat(api): cancelAppointment accepts recalculateChain option"
```

---

### Task 7: Add i18n keys for chain delete/substitute modals

**Files:**
- Modify: `/var/www/medical-pro/src/locales/fr/planning.json`
- Modify: `/var/www/medical-pro/src/locales/es/planning.json`
- Modify: `/var/www/medical-pro/src/locales/en/planning.json`

- [ ] **Step 1: Add FR keys**

In `src/locales/fr/planning.json`, add a new top-level block (before the last `}`):

```json
"chainDelete": {
  "title": "Annulation dans un enchaînement",
  "description": "Ce traitement fait partie d'un enchaînement de {{count}} soins pour {{patientName}}.",
  "recalculate": "Annuler le créneau et rapprocher les autres rendez-vous de {{patientName}}",
  "keepGap": "Annuler sans modifier les horaires",
  "cancel": "Retour",
  "successRecalculated": "Traitement annulé. Les rendez-vous de {{patientName}} ont été rapprochés.",
  "successKept": "Traitement annulé. Les horaires des autres soins n'ont pas changé."
},
"chainSubstitute": {
  "title": "Remplacement dans un enchaînement",
  "description": "Remplacer {{oldTreatment}} par {{newTreatment}} dans l'enchaînement de {{patientName}}.",
  "recalculate": "Remplacer et rapprocher les autres rendez-vous de {{patientName}}",
  "keepGap": "Remplacer sans modifier les horaires",
  "cancel": "Retour",
  "successRecalculated": "Traitement remplacé. Les rendez-vous de {{patientName}} ont été rapprochés.",
  "successKept": "Traitement remplacé. Les horaires des autres soins n'ont pas changé."
},
"substitution": {
  "changeButton": "Changer le traitement",
  "changed": "Traitement changé : {{newTreatment}}"
}
```

- [ ] **Step 2: Add ES keys**

Same structure in `src/locales/es/planning.json`:

```json
"chainDelete": {
  "title": "Cancelación en una cadena",
  "description": "Este tratamiento forma parte de una cadena de {{count}} sesiones para {{patientName}}.",
  "recalculate": "Cancelar y acercar las demás citas de {{patientName}}",
  "keepGap": "Cancelar sin modificar los horarios",
  "cancel": "Volver",
  "successRecalculated": "Tratamiento cancelado. Las citas de {{patientName}} se han reagrupado.",
  "successKept": "Tratamiento cancelado. Los horarios de las demás sesiones no han cambiado."
},
"chainSubstitute": {
  "title": "Reemplazo en una cadena",
  "description": "Reemplazar {{oldTreatment}} por {{newTreatment}} en la cadena de {{patientName}}.",
  "recalculate": "Reemplazar y acercar las demás citas de {{patientName}}",
  "keepGap": "Reemplazar sin modificar los horarios",
  "cancel": "Volver",
  "successRecalculated": "Tratamiento reemplazado. Las citas de {{patientName}} se han reagrupado.",
  "successKept": "Tratamiento reemplazado. Los horarios de las demás sesiones no han cambiado."
},
"substitution": {
  "changeButton": "Cambiar el tratamiento",
  "changed": "Tratamiento cambiado: {{newTreatment}}"
}
```

- [ ] **Step 3: Add EN keys**

Same structure in `src/locales/en/planning.json`:

```json
"chainDelete": {
  "title": "Cancel in a chain",
  "description": "This treatment is part of a chain of {{count}} sessions for {{patientName}}.",
  "recalculate": "Cancel and bring {{patientName}}'s other appointments closer",
  "keepGap": "Cancel without changing other schedules",
  "cancel": "Back",
  "successRecalculated": "Treatment cancelled. {{patientName}}'s appointments have been regrouped.",
  "successKept": "Treatment cancelled. Other session schedules were not changed."
},
"chainSubstitute": {
  "title": "Replace in a chain",
  "description": "Replace {{oldTreatment}} with {{newTreatment}} in {{patientName}}'s chain.",
  "recalculate": "Replace and bring {{patientName}}'s other appointments closer",
  "keepGap": "Replace without changing other schedules",
  "cancel": "Back",
  "successRecalculated": "Treatment replaced. {{patientName}}'s appointments have been regrouped.",
  "successKept": "Treatment replaced. Other session schedules were not changed."
},
"substitution": {
  "changeButton": "Change treatment",
  "changed": "Treatment changed: {{newTreatment}}"
}
```

- [ ] **Step 4: Validate JSON**

Run: `node -e "require('./src/locales/fr/planning.json')" && node -e "require('./src/locales/es/planning.json')" && node -e "require('./src/locales/en/planning.json')" && echo "All valid"`

Expected: "All valid"

- [ ] **Step 5: Commit**

```bash
git add src/locales/fr/planning.json src/locales/es/planning.json src/locales/en/planning.json
git commit -m "feat(i18n): chain delete/substitute/substitution keys (fr/es/en)"
```

---

### Task 8: Create `ChainDeleteChoiceModal`

**Files:**
- Create: `/var/www/medical-pro/src/components/dashboard/modals/ChainDeleteChoiceModal.js`

- [ ] **Step 1: Create the component**

```jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X } from 'lucide-react';

export default function ChainDeleteChoiceModal({ appointment, patientName, chainCount, onConfirm, onClose }) {
  const { t } = useTranslation('planning');

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-medium text-amber-700 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {t('chainDelete.title')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-700">
            {t('chainDelete.description', { count: chainCount || '?', patientName })}
          </p>
          <div className="space-y-2">
            <button
              onClick={() => onConfirm(true)}
              className="w-full px-4 py-3 text-sm font-medium text-left rounded-lg border-2 border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 hover:border-blue-300 transition-colors"
            >
              {t('chainDelete.recalculate', { patientName })}
            </button>
            <button
              onClick={() => onConfirm(false)}
              className="w-full px-4 py-3 text-sm font-medium text-left rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-colors"
            >
              {t('chainDelete.keepGap')}
            </button>
          </div>
        </div>
        <div className="px-6 py-4 border-t">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
          >
            {t('chainDelete.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/modals/ChainDeleteChoiceModal.js
git commit -m "feat(frontend): ChainDeleteChoiceModal component"
```

---

## Phase 3 — Frontend: Fix PlanningModule + PlanningBookingModal

### Task 9: Chain-aware quick cancel in `PlanningModule.js`

**Files:**
- Modify: `/var/www/medical-pro/src/components/dashboard/modules/PlanningModule.js`

- [ ] **Step 1: Add state + import**

At the top imports of `PlanningModule.js`, add:

```js
import ChainDeleteChoiceModal from '../modals/ChainDeleteChoiceModal';
```

In the component state declarations (near other useState calls), add:

```js
const [chainDeleteModal, setChainDeleteModal] = useState(null);
```

- [ ] **Step 2: Find all `handleQuickStatusChange(apt.id, 'cancelled')` calls in the list view**

Run: `grep -n "handleQuickStatusChange(apt.id, 'cancelled')" /var/www/medical-pro/src/components/dashboard/modules/PlanningModule.js`

For each occurrence, replace with a chain-aware handler. The cancel buttons (lines ~1832, 1854, 1877) should be changed to call a new function instead of `handleQuickStatusChange` directly.

- [ ] **Step 3: Add chain-aware cancel handler**

Add this function near the other handlers in `PlanningModule.js` (after `handleQuickStatusChange`):

```js
  const handleCancelAppointment = (apt) => {
    const isChained = apt.isLinked || apt.linkedAppointmentId || (apt.linkSequence && apt.linkSequence > 1);
    if (isChained) {
      const patientName = apt.patient
        ? `${apt.patient.firstName || ''} ${apt.patient.lastName || ''}`.trim()
        : '';
      setChainDeleteModal({
        appointment: apt,
        patientName,
        chainCount: null
      });
    } else {
      if (window.confirm(t('appointment.deleteConfirmMessage'))) {
        handleQuickStatusChange(apt.id, 'cancelled');
      }
    }
  };

  const handleChainDeleteConfirm = async (recalculateChain) => {
    if (!chainDeleteModal) return;
    try {
      await planningApi.cancelAppointment(chainDeleteModal.appointment.id, { recalculateChain });
      const msg = recalculateChain
        ? t('chainDelete.successRecalculated', { patientName: chainDeleteModal.patientName })
        : t('chainDelete.successKept');
      showToast(msg, 'success');
      loadData();
    } catch (e) {
      showToast(t('messages.error'), 'error');
    } finally {
      setChainDeleteModal(null);
    }
  };
```

- [ ] **Step 4: Replace all `handleQuickStatusChange(apt.id, 'cancelled')` in list view**

For each cancel button in the list view (lines ~1832, 1854, 1877), replace:

```jsx
onClick={() => handleQuickStatusChange(apt.id, 'cancelled')}
```

With:

```jsx
onClick={() => handleCancelAppointment(apt)}
```

- [ ] **Step 5: Add modal render at the end of the component JSX**

Before the closing tags of the component's return, add:

```jsx
{chainDeleteModal && (
  <ChainDeleteChoiceModal
    appointment={chainDeleteModal.appointment}
    patientName={chainDeleteModal.patientName}
    chainCount={chainDeleteModal.chainCount}
    onConfirm={handleChainDeleteConfirm}
    onClose={() => setChainDeleteModal(null)}
  />
)}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/modules/PlanningModule.js
git commit -m "fix(planning): chain-aware cancel button in list view"
```

---

### Task 10: Fix `PlanningBookingModal.js` — substitution targeting + recalculateChain + header sync + UX button

**Files:**
- Modify: `/var/www/medical-pro/src/components/dashboard/modals/PlanningBookingModal.js`

This task covers bugs 21, 22, 26, header sync, and substitution button UX.

- [ ] **Step 1: Read key lines**

Run: `sed -n '738,760p' /var/www/medical-pro/src/components/dashboard/modals/PlanningBookingModal.js` (handleSubstituteSelect)
Run: `sed -n '1280,1300p' /var/www/medical-pro/src/components/dashboard/modals/PlanningBookingModal.js` (executeSave)
Run: `sed -n '1440,1460p' /var/www/medical-pro/src/components/dashboard/modals/PlanningBookingModal.js` (group branch)
Run: `sed -n '642,682p' /var/www/medical-pro/src/components/dashboard/modals/PlanningBookingModal.js` (handleDeleteRecalculate)

- [ ] **Step 2: Fix bug 22 — Add `targetAppointmentId` to `substitutionPending`**

In `handleSubstituteSelect` (line ~738), find where `setSubstitutionPending` is called. Add `targetAppointmentId`:

Find:
```js
setSubstitutionPending({
```

Add `targetAppointmentId` to the object. The target is the appointment being substituted. In single mode, it's `appointment.id`. In group mode, it should be the specific appointment in the linked group. Look for how the treatment list is rendered and which appointment each row corresponds to.

After `setSubstitutionPending({`, ensure it includes:

```js
  targetAppointmentId: /* the appointment ID being substituted */,
```

The exact variable depends on context — read the surrounding code to determine. If `handleSubstituteSelect` is called from a treatment list in group mode, the `appointmentId` of that row should be passed. If not available, add it as a parameter: `handleSubstituteSelect(treatment, targetAptId)`.

- [ ] **Step 3: Fix bug 22 — Use `targetAppointmentId` in executeSave**

In `executeSave` (line ~1282), find where the PUT is called. Currently it uses `appointment.id`. Change to:

```js
const targetId = substitutionPending?.targetAppointmentId || appointment.id;
await planningApi.updateAppointment(targetId, editPayload);
```

- [ ] **Step 4: Fix bug 21 — Transmit `recalculateChain` in payload**

In `executeSave`, add `recalculateChain` to the payload sent to the backend:

Find where `editPayload` is constructed and add:

```js
const editPayload = substitutionPending
  ? { ...payload, serviceId: substitutionPending.treatmentId, recalculateChain }
  : { ...payload, recalculateChain };
```

- [ ] **Step 5: Fix bug 26 — Replace `handleDeleteRecalculate` with backend call**

Find `handleDeleteRecalculate` (line ~642). Replace its entire body with:

```js
const handleDeleteRecalculate = async () => {
  try {
    await planningApi.cancelAppointment(appointment.id, { recalculateChain: true });
    const patientName = `${appointment.patient?.firstName || ''} ${appointment.patient?.lastName || ''}`.trim();
    showToast(t('chainDelete.successRecalculated', { patientName }), 'success');
    if (onSave) onSave();
    if (onClose) onClose();
  } catch (e) {
    showToast(t('messages.error'), 'error');
  }
};
```

- [ ] **Step 6: Fix header sync — modal title reflects selected treatment**

Find where the modal header/title displays the treatment name. It likely uses `appointment.service?.title` or `appointment.title`. Change it to use the currently selected treatment:

```jsx
{substitutionPending
  ? substitutionPending.title
  : (selectedTreatments[0]?.title || appointment?.service?.title || appointment?.title || '')}
```

The exact location depends on the header JSX — search for `appointment.service?.title` or `appointment.title` in the header section.

- [ ] **Step 7: Add prominent "Changer le traitement" button**

Find the treatment section in the form (where the current treatment name is displayed). Add below it:

```jsx
{isEditMode && (
  <button
    onClick={() => setShowTreatmentSelector(true)}
    className="w-full mt-2 px-4 py-3 text-sm font-medium rounded-lg border-2 border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:border-amber-300 transition-colors flex items-center justify-center gap-2"
  >
    <RefreshCw className="w-4 h-4" />
    {substitutionPending
      ? t('substitution.changed', { newTreatment: substitutionPending.title })
      : t('substitution.changeButton')}
  </button>
)}
```

Ensure `RefreshCw` is imported from `lucide-react` (add to the existing import if not present).

Note: `setShowTreatmentSelector` (or equivalent) is whatever state controls showing the treatment selection list. Read the existing code to find the correct state variable name — it might be `showSubstitution`, `showTreatments`, or similar. Adapt accordingly.

- [ ] **Step 8: Commit**

```bash
git add src/components/dashboard/modals/PlanningBookingModal.js
git commit -m "fix(booking): substitution targeting, recalculateChain, header sync, UX button"
```

---

## Phase 4 — Deploy + Verify

### Task 11: Deploy frontend

- [ ] **Step 1: Push**

```bash
cd /var/www/medical-pro
git push origin master
```

- [ ] **Step 2: Wait for CI**

Check: `curl -s https://api.github.com/repos/jdavido74/medical-pro/actions/runs?per_page=1 | python3 -c "import sys,json; d=json.load(sys.stdin); r=d['workflow_runs'][0]; print(r['head_sha'][:7], r['status'], r['conclusion'])"`

### Task 12: Manual verification on prod

- [ ] **Step 1: Test chain delete with recalculate**

1. Create chain [A 30min → B 45min → C 20min] for a test patient
2. In list view, click cancel on B
3. Verify: chain modal appears with patient name and count
4. Click "Annuler le créneau et rapprocher..."
5. Verify: C starts immediately after A ends (gap removed)

- [ ] **Step 2: Test chain delete without recalculate**

1. Create chain [A → B → C]
2. Cancel B, choose "Annuler sans modifier les horaires"
3. Verify: C keeps its original time, gap exists

- [ ] **Step 3: Test substitution**

1. Create chain [ALA 30min → Vitamine C 45min]
2. Edit Vitamine C → click "Changer le traitement" → select Curcumine (20min)
3. Choose "Remplacer et rapprocher..."
4. Verify: treatment changed, times adjusted

- [ ] **Step 4: Test header sync**

1. Open edit modal for a chained appointment
2. Click "Changer le traitement"
3. Verify: modal header updates immediately to new treatment name

- [ ] **Step 5: Test standalone delete (no regression)**

1. Create isolated appointment
2. Click cancel in list view
3. Verify: simple confirm dialog (no chain modal), appointment cancelled

---

## Spec Coverage

| Spec Section | Task(s) |
|---|---|
| 2.1 appointmentChainService | 1, 2 |
| 2.2 Routes modifiées (DELETE) | 3 |
| 2.2 Routes modifiées (PUT) | 4 |
| 2.3 Frontend substitution fixes | 10 |
| 2.4 ChainDeleteChoiceModal | 8 |
| 2.5 Modale substitution | 10 |
| 3.1 updateInChain | 2 |
| 3.2 deleteFromChain | 1 |
| 3.3 substituteInChain | 2 |
| 3.4 fetchChainWithLock | 1 |
| 3.5 buildPendingTarget | 2 |
| 4.1 PlanningBookingModal fixes | 10 |
| 4.2 PlanningModule quick cancel | 9 |
| 4.3 ChainDeleteChoiceModal | 8 |
| 4.4 planningApi | 6 |
| 5. i18n | 7 |
| Fix UX header sync | 10 |
| Fix UX substitution button | 10 |
| Bug 7 (no transaction) | 1, 2 |
| Bug 9 (stale data) | 2 (buildPendingTarget) |
| Bug 12 (delete no recalculate) | 1, 3 |
| Bug 21 (recalculateChain not sent) | 10 |
| Bug 22 (wrong target) | 10 |
| Bug 25 (quick delete bypass) | 9 |
| Bug 26 (duration not sent) | 10 |
