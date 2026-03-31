# Chain Treatment Substitution — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix treatment substitution in linked appointment chains so it replaces in-place instead of appending, with smart chain adjustment and overlap detection.

**Architecture:** The backend PUT `/appointments/:id` already handles single-appointment substitution. We extend it to detect linked chains and adjust downstream appointments (shift or compact). When the adjusted chain would overlap an external non-overlappable appointment or exceed clinic hours, return a `conflict` response instead of blocking — the frontend shows a confirmation dialog and can retry with `force: true`.

**Tech Stack:** Node.js/Express (backend), React (frontend), Sequelize (ORM), PostgreSQL

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `medical-pro-backend/src/services/chainSubstitutionService.js` | **Create** | Pure logic: compute chain adjustments, detect overlaps, return plan |
| `medical-pro-backend/src/routes/planning.js` | **Modify** (~line 552-638) | Call chainSubstitutionService when service_id changes on a linked appointment |
| `medical-pro/src/components/dashboard/modals/PlanningBookingModal.js` | **Modify** (~line 1228-1307) | Remove client-side chain recalculation, handle `conflict` response with confirmation dialog |

---

### Task 1: Create chainSubstitutionService — compute chain adjustment plan

**Files:**
- Create: `medical-pro-backend/src/services/chainSubstitutionService.js`

This service takes the chain, the substituted appointment, and the new treatment, and returns a plan describing what to do with each downstream appointment.

- [ ] **Step 1: Create the service file with `computeChainAdjustment()`**

```javascript
// src/services/chainSubstitutionService.js
const { Op, QueryTypes } = require('sequelize');

/**
 * Compute how a chain should adjust after a treatment substitution.
 *
 * @param {object} opts
 * @param {object} opts.clinicDb - Sequelize clinic connection
 * @param {object} opts.targetAppointment - The appointment being substituted
 * @param {object} opts.newTreatment - The new ProductService record
 * @param {Array}  opts.chainAppointments - All appointments in the linked group, ordered by link_sequence
 * @returns {object} { updates: [...], conflict: null | { type, message, details } }
 */
async function computeChainAdjustment({ clinicDb, targetAppointment, newTreatment, chainAppointments }) {
  const timeToMinutes = (t) => {
    if (!t) return 0;
    const [h, m] = t.substring(0, 5).split(':').map(Number);
    return h * 60 + m;
  };
  const minutesToTime = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const targetSeq = targetAppointment.link_sequence || 1;
  const newDuration = newTreatment.duration || 30;
  const oldDuration = targetAppointment.duration_minutes || 30;
  const durationDelta = newDuration - oldDuration;

  // If same duration, no chain adjustment needed
  if (durationDelta === 0) {
    return { updates: [], conflict: null };
  }

  // Split chain into: before target, target itself, after target
  const downstream = chainAppointments.filter(a =>
    (a.link_sequence || 1) > targetSeq &&
    a.status !== 'completed' && a.status !== 'cancelled'
  );

  // If no downstream appointments, check external overlap only
  if (downstream.length === 0) {
    const targetStart = timeToMinutes(targetAppointment.start_time);
    const newEnd = minutesToTime(targetStart + newDuration);

    if (durationDelta > 0) {
      // Check external overlap after the chain
      const conflict = await checkExternalOverlap(clinicDb, targetAppointment, newEnd, chainAppointments);
      if (conflict) {
        return { updates: [], conflict };
      }
    }
    return { updates: [], conflict: null };
  }

  // Compute new start/end times for downstream appointments
  const updates = [];
  const targetStart = timeToMinutes(targetAppointment.start_time);
  let cursor = targetStart + newDuration; // Where the next appointment should start

  if (durationDelta > 0) {
    // LONGER: shift all downstream forward
    for (const apt of downstream) {
      const aptDuration = apt.duration_minutes || 30;
      updates.push({
        id: apt.id,
        start_time: minutesToTime(cursor),
        end_time: minutesToTime(cursor + aptDuration)
      });
      cursor += aptDuration;
    }

    // Check if the last downstream appointment now overlaps an external
    const lastUpdate = updates[updates.length - 1];
    const lastDownstream = downstream[downstream.length - 1];
    const conflict = await checkExternalOverlap(clinicDb, lastDownstream, lastUpdate.end_time, chainAppointments);
    if (conflict) {
      return { updates, conflict };
    }

    // Check clinic hours
    const clinicClose = await getClinicCloseTime(clinicDb, targetAppointment.appointment_date);
    if (clinicClose && timeToMinutes(lastUpdate.end_time) > timeToMinutes(clinicClose)) {
      return {
        updates,
        conflict: {
          type: 'EXCEEDS_CLINIC_HOURS',
          message: `La chaîne dépasse les horaires de la clinique (fermeture à ${clinicClose})`,
          lastEndTime: lastUpdate.end_time,
          clinicCloseTime: clinicClose
        }
      };
    }
  } else {
    // SHORTER: compact downstream where possible
    for (const apt of downstream) {
      const aptDuration = apt.duration_minutes || 30;
      const currentStart = timeToMinutes(apt.start_time);

      // Load the service to check is_overlappable
      const [svcRows] = await clinicDb.query(
        'SELECT is_overlappable FROM products_services WHERE id = :id',
        { replacements: { id: apt.service_id }, type: QueryTypes.SELECT }
      ).then(r => [r]);
      const svcOverlappable = svcRows[0]?.is_overlappable === true;

      const hasMachine = !!apt.machine_id;

      if (hasMachine) {
        // Has machine → keep current time, stop compacting
        // (machine slot is reserved)
        cursor = currentStart + aptDuration;
        // No update needed for this one, but we stop compacting
        break;
      } else if (svcOverlappable && cursor < currentStart) {
        // No machine + overlappable → compact toward cursor
        // But don't move earlier than an external non-overlappable appointment
        const earliestAllowed = await getEarliestAllowedStart(
          clinicDb, apt, cursor, chainAppointments
        );
        const newStart = Math.max(cursor, earliestAllowed);
        if (newStart < currentStart) {
          updates.push({
            id: apt.id,
            start_time: minutesToTime(newStart),
            end_time: minutesToTime(newStart + aptDuration)
          });
          cursor = newStart + aptDuration;
        } else {
          cursor = currentStart + aptDuration;
        }
      } else {
        // Not overlappable or cursor is already past → keep current time
        cursor = currentStart + aptDuration;
      }
    }
  }

  return { updates, conflict: null };
}

/**
 * Check if end_time overlaps a non-chain appointment on the same date/machine/provider.
 */
async function checkExternalOverlap(clinicDb, refAppointment, newEndTime, chainAppointments) {
  const chainIds = chainAppointments.map(a => a.id);
  const date = refAppointment.appointment_date;

  // Find any external appointment that starts before newEndTime and ends after the chain's last start
  const [externals] = await clinicDb.query(`
    SELECT a.id, a.start_time, a.end_time, a.machine_id, a.title,
           ps.is_overlappable
    FROM appointments a
    LEFT JOIN products_services ps ON a.service_id = ps.id
    WHERE a.appointment_date = :date
      AND a.id NOT IN (:chainIds)
      AND a.status NOT IN ('cancelled')
      AND a.start_time < :newEndTime
      AND a.end_time > :chainLastStart
    ORDER BY a.start_time
  `, {
    replacements: {
      date,
      chainIds: chainIds.length > 0 ? chainIds : ['00000000-0000-0000-0000-000000000000'],
      newEndTime,
      chainLastStart: refAppointment.start_time
    }
  });

  // Filter: only flag non-overlappable externals
  const blocking = externals.filter(ext => ext.is_overlappable !== true);

  if (blocking.length > 0) {
    const ext = blocking[0];
    return {
      type: 'EXTERNAL_OVERLAP',
      message: `Le traitement empiète sur un rendez-vous existant (${ext.title || 'RDV'} à ${ext.start_time?.substring(0,5)})`,
      externalAppointment: {
        id: ext.id,
        title: ext.title,
        startTime: ext.start_time?.substring(0, 5),
        endTime: ext.end_time?.substring(0, 5)
      }
    };
  }

  return null;
}

/**
 * Get the earliest start time allowed (no external non-overlappable appointment blocks).
 */
async function getEarliestAllowedStart(clinicDb, appointment, desiredStart, chainAppointments) {
  const chainIds = chainAppointments.map(a => a.id);
  const date = appointment.appointment_date;
  const desiredTime = `${String(Math.floor(desiredStart / 60)).padStart(2, '0')}:${String(desiredStart % 60).padStart(2, '0')}`;

  const [blockers] = await clinicDb.query(`
    SELECT a.end_time
    FROM appointments a
    LEFT JOIN products_services ps ON a.service_id = ps.id
    WHERE a.appointment_date = :date
      AND a.id NOT IN (:chainIds)
      AND a.status NOT IN ('cancelled')
      AND ps.is_overlappable IS NOT TRUE
      AND a.start_time < :endTime
      AND a.end_time > :desiredTime
    ORDER BY a.end_time DESC
    LIMIT 1
  `, {
    replacements: {
      date,
      chainIds: chainIds.length > 0 ? chainIds : ['00000000-0000-0000-0000-000000000000'],
      endTime: `${String(Math.floor((desiredStart + (appointment.duration_minutes || 30)) / 60)).padStart(2, '0')}:${String((desiredStart + (appointment.duration_minutes || 30)) % 60).padStart(2, '0')}`,
      desiredTime
    }
  });

  if (blockers.length > 0) {
    const [h, m] = blockers[0].end_time.substring(0, 5).split(':').map(Number);
    return h * 60 + m;
  }

  return desiredStart;
}

/**
 * Get clinic closing time for a given date.
 */
async function getClinicCloseTime(clinicDb, date) {
  try {
    const [rows] = await clinicDb.query(
      'SELECT settings FROM medical_facilities LIMIT 1'
    );
    if (rows[0]?.settings?.hours) {
      const dayOfWeek = new Date(date).getDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayHours = rows[0].settings.hours[dayNames[dayOfWeek]];
      if (dayHours?.afternoon?.end) return dayHours.afternoon.end;
      if (dayHours?.morning?.end) return dayHours.morning.end;
    }
  } catch (e) {
    // Silently ignore — no clinic hours means no constraint
  }
  return null;
}

module.exports = { computeChainAdjustment };
```

- [ ] **Step 2: Commit**

```bash
cd /var/www/medical-pro-backend
git add src/services/chainSubstitutionService.js
git commit -m "feat(planning): add chainSubstitutionService for chain adjustment computation"
```

---

### Task 2: Integrate chain substitution into PUT /appointments/:id

**Files:**
- Modify: `medical-pro-backend/src/routes/planning.js` (~line 552-700)

When `service_id` changes on an appointment that belongs to a linked chain, call `computeChainAdjustment()`. If there's a conflict and `force` is not set, return 409 with conflict details. If `force: true` or no conflict, apply all updates.

- [ ] **Step 1: Add chain detection and adjustment after treatment substitution block**

In `planning.js`, after the existing substitution block (line ~637, after the `}` closing the `if (updateData.service_id && ...)` block), and before "Handle date/time changes" (line ~640), insert chain adjustment logic:

```javascript
    // === Chain substitution: adjust downstream appointments ===
    if (updateData.service_id && updateData.service_id !== appointment.service_id) {
      const isLinked = appointment.linked_appointment_id || appointment.link_sequence >= 1;

      if (isLinked) {
        const Appointment = await getModel(req.clinicDb, 'Appointment');
        const ProductService = await getModel(req.clinicDb, 'ProductService');
        const chainAppointments = await Appointment.findLinkedGroup(id, {
          include: [{ model: ProductService, as: 'service', attributes: ['id', 'is_overlappable'], required: false }]
        });

        if (chainAppointments.length > 1) {
          const newTreatment = await ProductService.findByPk(updateData.service_id);
          const { computeChainAdjustment } = require('../services/chainSubstitutionService');

          const result = await computeChainAdjustment({
            clinicDb: req.clinicDb,
            targetAppointment: appointment,
            newTreatment,
            chainAppointments
          });

          if (result.conflict && !req.body.force) {
            return res.status(409).json({
              success: false,
              error: {
                code: 'CHAIN_CONFLICT',
                message: result.conflict.message,
                conflict: result.conflict,
                pendingUpdates: result.updates
              }
            });
          }

          // Apply downstream updates
          for (const upd of result.updates) {
            await Appointment.update(
              { start_time: upd.start_time, end_time: upd.end_time },
              { where: { id: upd.id } }
            );
          }
        }
      }
    }
```

This block goes **inside** the existing `if (updateData.service_id && ...)` block, right after the machine assignment logic and before the closing `}` of that block.

- [ ] **Step 2: Commit**

```bash
cd /var/www/medical-pro-backend
git add src/routes/planning.js
git commit -m "feat(planning): integrate chain adjustment into PUT /appointments/:id"
```

---

### Task 3: Update frontend — remove client-side chain recalc, add conflict dialog

**Files:**
- Modify: `medical-pro/src/components/dashboard/modals/PlanningBookingModal.js` (~line 1280-1307, ~line 1228-1232)

The frontend currently does its own chain recalculation after a successful save (lines 1282-1307). This must be removed since the backend now handles it. Instead, handle the `CHAIN_CONFLICT` response with a confirmation dialog.

- [ ] **Step 1: Remove client-side chain recalculation**

Delete lines 1282-1307 (the `if (substitutionPending && isLinkedAppointment && recalculateChain && linkedGroup?.appointments)` block). Replace with just:

```javascript
      if (response.success) {
        onSave(response.data);
```

- [ ] **Step 2: Handle CHAIN_CONFLICT in the error path**

In the error handling section (~line 1309+), add detection for the `CHAIN_CONFLICT` code. When detected, show a confirmation dialog (reuse the existing `ConfirmationOverlay` pattern from the modal):

```javascript
        // Inside the !response.success block:
        if (response.error?.code === 'CHAIN_CONFLICT') {
          // Show conflict confirmation
          const confirmed = window.confirm(
            `${response.error.conflict.message}\n\nVoulez-vous continuer quand même ?`
          );
          if (confirmed) {
            // Retry with force: true
            const forcePayload = { ...payload, force: true };
            const forceResponse = await planningApi.updateAppointment(appointment.id, forcePayload);
            if (forceResponse.success) {
              onSave(forceResponse.data);
              return;
            }
          }
          setSaving(false);
          return;
        }
```

- [ ] **Step 3: Ensure edit mode for linked appointments uses single PUT**

Verify that line ~1227-1229 correctly routes linked appointment edits through the single PUT (not the group endpoint). Current code already does this when `selectedTreatments.length === 1` and `isEditMode` is true. The substitution handler (`handleSubstituteSelect`) sets `selectedTreatments` to exactly 1 item, so this path is already correct.

- [ ] **Step 4: Commit**

```bash
cd /var/www/medical-pro
git add src/components/dashboard/modals/PlanningBookingModal.js
git commit -m "feat(planning): handle chain conflict response and remove client-side recalc"
```

---

### Task 4: Deploy and test

- [ ] **Step 1: Push backend**

```bash
cd /var/www/medical-pro-backend && git push origin master
```

- [ ] **Step 2: Deploy backend manually (CI/CD may timeout)**

```bash
ssh -p 2222 root@72.62.51.173 "cd /var/www/medical-pro-backend && git fetch origin && git reset --hard origin/master && pm2 restart medical-pro-backend"
```

- [ ] **Step 3: Push frontend**

```bash
cd /var/www/medical-pro && git push origin master
```

- [ ] **Step 4: Wait for frontend CI/CD or deploy manually**

- [ ] **Step 5: Test scenarios**

1. **Substitute with same duration** → no chain change, silent save
2. **Substitute with longer treatment, no external conflict** → downstream shifts, silent save
3. **Substitute with longer treatment, external overlap on non-overlappable** → 409 + confirmation dialog
4. **Substitute with longer treatment, external overlap on overlappable** → silent save (no conflict)
5. **Substitute with shorter treatment, downstream has machine** → gap left, no compacting
6. **Substitute with shorter treatment, downstream overlappable no machine** → compacted
7. **Force confirmation on conflict** → save proceeds with adjusted chain

---

## Test Scenarios Summary

| Scenario | Duration Δ | Downstream | External | Expected |
|----------|-----------|------------|----------|----------|
| Same duration | 0 | Any | Any | Silent save |
| Longer, no conflict | +15min | Shifts forward | None in range | Silent save |
| Longer, overlappable external | +15min | Shifts forward | Overlappable at boundary | Silent save |
| Longer, blocking external | +15min | Shifts forward | Non-overlappable overlap | 409 → confirm → force |
| Longer, exceeds clinic hours | +30min | Shifts beyond close | N/A | 409 → confirm → force |
| Shorter, next has machine | -15min | Keep times | N/A | Silent save, gap left |
| Shorter, next overlappable no machine | -15min | Compact | N/A | Silent save, compacted |
