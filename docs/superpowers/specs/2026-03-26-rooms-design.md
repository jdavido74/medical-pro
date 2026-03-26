# Rooms (Salles) — Design Spec

**Date:** 2026-03-26
**Status:** Approved
**Scope:** Planning module — add room concept for resource management
**Fallback tag:** `v1.8.0-pre-rooms` on both frontend and backend repos

---

## 1. Context

MediMaestro's planning system manages machine availability to prevent scheduling conflicts. Administrators have been using machines as proxies for rooms, leading to false conflicts. Example: an "Insuflación rectal" treatment is assigned to M.Ozone 1 (to block the room) even though it doesn't use that machine physically. This prevents a real multipass from being scheduled when the machine is actually free.

### Problem

The system has no concept of room/space. Three resource dimensions need to be managed independently:
- **Machine** — physical equipment (M.Ozone 1, PEMF, Stendo...)
- **Room** — physical space where treatments happen
- **Practitioner** — healthcare provider

Some treatments require privacy and must **condamn the entire room** (e.g., rectal insufflation), blocking all other machines in that room for the duration.

### Solution

Add a `rooms` entity. Machines are assigned to a room. The room is deduced from the machine. A per-treatment `exclusive_room` flag allows treatments to block the entire room.

## 2. Requirements

| Requirement | Target |
|---|---|
| Room entity | Simple table: name, short code, active flag |
| Machine → Room | Each machine optionally assigned to 1 room |
| Room deduced from machine | Booking a machine implicitly books a spot in its room |
| Exclusive room flag | Per-treatment boolean: condamns entire room during treatment |
| Slot calculation | Check room availability in addition to machine + provider |
| Display | Short code (e.g., "S1") shown next to duration on appointments |
| Filtering | Select filters by room and by treatment in planning view |
| Admin UI | CRUD for rooms, room selector on machine form, exclusive toggle on treatment form |
| Backward compatible | Machines without room_id behave as today (no room constraint) |
| Configurable | Works for solo practitioners (0 rooms) to large clinics (N rooms) |

## 3. Architecture

### 3.1 Data Model

**New table: `rooms`** (per clinic database, uses `company_id` as tenant key — same as `machines`)

```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  short_code VARCHAR(10) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

Note: `short_code` has a simple UNIQUE constraint (not compound). Each clinic has its own database, so uniqueness within the DB is sufficient — no need for a `(company_id, short_code)` compound key.

**Modify table: `machines`** — add room assignment

```sql
ALTER TABLE machines ADD COLUMN room_id UUID REFERENCES rooms(id) ON DELETE SET NULL;
```

**Modify table: `products_services`** — add exclusive room flag

```sql
ALTER TABLE products_services ADD COLUMN exclusive_room BOOLEAN DEFAULT false;
```

**Modify table: `appointments`** — store room for display/filtering

```sql
ALTER TABLE appointments ADD COLUMN room_id UUID REFERENCES rooms(id) ON DELETE SET NULL;
```

### 3.2 Relationships

```
rooms (1) ←── (N) machines (N) ──→ (M) products_services
                      |
                appointments.machine_id → machines.room_id → rooms
                appointments.room_id (denormalized, auto-filled from machine.room_id)
```

- A room has 0..N machines
- A machine belongs to 0..1 room
- A treatment has `exclusive_room` flag (independent of which machine/room)
- An appointment stores `room_id` (denormalized from its machine's room for fast filtering)

**Denormalization staleness rules:**
- When a machine's `room_id` changes (admin reassigns machine to another room): cascade update `room_id` on all future non-cancelled, non-completed appointments for that machine.
- When `machine_id` changes on an existing appointment (`PUT /planning/appointments/:id`): recalculate `room_id` from the new machine's `room_id`.

### 3.3 Slot Calculation Changes

**Current logic** in `planningService.js`:
1. Find eligible machines for treatment
2. For each machine, check machine availability (no overlapping non-cancelled appointments)
3. Return available slots

**New logic** — add room constraint check after machine check:

```
For each candidate slot:
  1. Machine free? (existing check, unchanged)
  2. Room constraint check (NEW):
     a. Get room_id from machine
     b. If room_id is NULL → skip room check (no room assigned, backward compatible)
     c. If treatment.exclusive_room = true:
        → Query: any non-cancelled appointment in this room at this time?
        → If yes → slot blocked (room occupied)
     d. If treatment.exclusive_room = false:
        → Query: any non-cancelled appointment with exclusive_room = true in this room at this time?
        → If yes → slot blocked (room condamned by exclusive treatment)
        → If no → slot available (other non-exclusive treatments can coexist)
```

**Room availability query:**

```sql
-- Check if room is available at a given time
-- Used when treatment.exclusive_room = true (room must be completely free)
SELECT COUNT(*) FROM appointments a
WHERE a.room_id = :roomId
  AND a.appointment_date = :date
  AND a.status NOT IN ('cancelled')
  AND a.id != :excludeId
  AND (a.start_time < :endTime AND a.end_time > :startTime);

-- Check if room has an exclusive treatment at a given time
-- Used when treatment.exclusive_room = false (only exclusive treatments block)
SELECT COUNT(*) FROM appointments a
JOIN products_services ps ON a.service_id = ps.id
WHERE a.room_id = :roomId
  AND a.appointment_date = :date
  AND a.status NOT IN ('cancelled')
  AND ps.exclusive_room = true
  AND a.id != :excludeId
  AND (a.start_time < :endTime AND a.end_time > :startTime);
```

**Multi-treatment chain: in-memory room state propagation**

In `getMultiTreatmentSlots`, after allocating a segment to a machine, the segment's room state must be tracked in-memory for subsequent segments — analogous to how `alreadyUsedInSlot` tracks machines claimed by prior segments.

```
alreadyClaimedRooms = Map<roomId, [{ startTime, endTime, exclusive }]>

For each segment in the chain:
  1. Assign machine (existing logic)
  2. Get roomId from machine
  3. Check against alreadyClaimedRooms:
     - If current treatment.exclusive_room = true:
       → reject if any prior segment uses this room at overlapping times
     - If current treatment.exclusive_room = false:
       → reject if any prior exclusive segment uses this room at overlapping times
  4. Add this segment to alreadyClaimedRooms[roomId]
```

This prevents a chain from booking two treatments in the same room when one is exclusive, even though neither is yet in the database.

### 3.4 Appointment Creation

When creating an appointment with a `machine_id`:
1. Look up `machine.room_id`
2. Auto-fill `appointment.room_id` from the machine's room
3. Run room conflict check before saving

When creating an overlappable appointment (no machine):
- `room_id` stays NULL (no room constraint for now — future option C)

When updating an appointment (`PUT /planning/appointments/:id`):
- If `machine_id` changes, recalculate `room_id` from the new machine's `room_id`
- Run room conflict check with the new room before saving

### 3.5 Frontend — Planning Display

**On each appointment in the calendar/agenda:**

Current: `09:30 - 10:30 | Ozon multipass 10 | Jacques M.`

New: `09:30 - 10:30 | S1 | Ozon multipass 10 | Jacques M.`

The short code badge appears only if the appointment has a `room_id`. Appointments without a room show no badge (backward compatible).

**Badge style:** Small, muted, consistent with existing badges. Example: `<span className="text-xs text-gray-500 font-mono">S1</span>`

### 3.6 Frontend — Planning Filters

Add two select filters in the planning header (alongside existing date/view controls):

**Room filter:**
- Options: "Todas las salas" / S1 / S2 / S3...
- Filters appointments by `room_id`
- Only visible if at least 1 room exists in the clinic

**Treatment filter:**
- Options: "Todos los tratamientos" / Ozon multipass / PEMF / ...
- Filters appointments by `service_id`
- Populated from `products_services` where `item_type = 'treatment'`

Both filters are cumulative (AND logic).

### 3.7 Frontend — Admin UI

**New section: Rooms management**

Accessible from the admin sidebar (same level as Machines). Simple CRUD:
- List: name, short code, active status, number of machines assigned
- Create/Edit form: name (required), short code (required, max 10 chars), active toggle
- Delete: soft deactivate (set `is_active = false`)

**Machine form modification:**

Add a "Salle" select dropdown (optional) in the machine create/edit form. Lists active rooms. Default: none.

**Treatment form modification:**

Add a "Salle exclusive" toggle in the treatment create/edit form. Default: off. Tooltip: "Si activé, ce traitement condamne la salle entière pendant sa durée."

### 3.8 API Endpoints

**New: Rooms CRUD**

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/rooms` | clinic_admin | List rooms (with machine count) |
| GET | `/rooms/:id` | clinic_admin | Single room with machines |
| POST | `/rooms` | clinic_admin | Create room |
| PUT | `/rooms/:id` | clinic_admin | Update room |
| DELETE | `/rooms/:id` | clinic_admin | Deactivate room |

**Modified: Machines**

- POST/PUT `/machines` accepts optional `roomId`
- GET `/machines` includes `room` object in response

**Modified: Planning slots**

- `getTreatmentSlots` and `getMultiTreatmentSlots` include room conflict check
- Response slots include `roomId`, `roomName`, `roomShortCode`

**Modified: Appointment creation**

- POST `/planning/appointments` auto-fills `room_id` from machine
- GET `/planning/calendar` includes `room` object per appointment

## 4. Validation Rules

| Rule | Enforcement |
|---|---|
| Short code unique per clinic | Backend: unique constraint on (facility_id, short_code) |
| Machine can only be in 1 room | Data model: single room_id FK on machines |
| Exclusive room blocks all | Slot calculator: no other appointments in room during exclusive treatment |
| Non-exclusive respects exclusive | Slot calculator: non-exclusive treatment blocked only by exclusive treatments in same room |
| No room = no constraint | Slot calculator: room_id NULL → skip room check entirely |
| Inactive room = no constraint | Slot calculator: if room.is_active = false → skip room check (treat as no room) |
| Deactivate room guard | Admin UI: warn if machines are still assigned; optionally unassign them |
| Room auto-filled | Appointment creation: room_id copied from machine.room_id |

## 5. Backward Compatibility

- **No rooms configured:** System behaves exactly as today. Machines have `room_id = NULL`, no room check runs.
- **Partial rooms:** Only machines with `room_id` set participate in room checks. Others are unconstrained.
- **No exclusive treatments:** All treatments have `exclusive_room = false` by default. Room checks pass trivially (no exclusive treatment blocks anything).
- **Existing appointments:** `room_id = NULL`. No room badge displayed. Filtering by room shows only new appointments.

**Transition period risk:** Immediately after migration, existing future appointments have `room_id = NULL` and will bypass room conflict checks. A new exclusive-room treatment could overlap with existing bookings in the same room.

**Backfill step (recommended):** After the admin configures rooms and assigns machines, run a one-time backfill:

```sql
UPDATE appointments a
SET room_id = m.room_id
FROM machines m
WHERE a.machine_id = m.id
  AND m.room_id IS NOT NULL
  AND a.room_id IS NULL
  AND a.status NOT IN ('cancelled', 'completed')
  AND a.appointment_date >= CURRENT_DATE;
```

This is included as an optional admin action in the rooms admin UI ("Actualizar citas existentes") after room configuration.

Migration path: admin configures rooms → assigns machines to rooms → marks exclusive treatments → runs backfill → new bookings get room constraints automatically.

## 6. Migrations

| Migration | Description |
|---|---|
| `clinic_071_create_rooms.sql` | Create rooms table |
| `clinic_072_machine_room_link.sql` | Add room_id to machines |
| `clinic_073_treatment_exclusive_room.sql` | Add exclusive_room to products_services |
| `clinic_074_appointment_room.sql` | Add room_id to appointments |

All use `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` for safety.

## 7. Files to Modify

### Backend

| File | Change |
|---|---|
| `migrations/clinic_071-074_*.sql` | Create — 4 migration files |
| `scripts/run-clinic-migrations.js` | Add clinic_071-074 |
| `src/services/clinicProvisioningService.js` | Add clinic_071-074 |
| `src/models/clinic/Room.js` | Create — Room model, register in ModelFactory via `getModel(clinicDb, 'Room')` |
| `src/models/clinic/Machine.js` (or base Machine.js) | Add room_id field + room association |
| `src/models/clinic/Appointment.js` | Add room_id field |
| `src/models/ProductService.js` | Add exclusive_room field |
| `src/routes/rooms.js` | Create — CRUD endpoints |
| `src/routes/planning.js` | Auto-fill room_id on create, include room in calendar response |
| `src/routes/machines.js` | Accept/return roomId |
| `src/services/planningService.js` | Add room conflict checks in getTreatmentSlots + getMultiTreatmentSlots (uses DB-layer reads via `getModel`, not API-level permissions) |
| `src/base/validationSchemas.js` | Add room schemas, update machine/appointment schemas |
| `server.js` | Mount rooms routes |

### Frontend

| File | Change |
|---|---|
| `src/api/roomsApi.js` | Create — rooms API client |
| `src/api/planningApi.js` | No change (slots response includes room info automatically) |
| `src/api/dataTransform.js` | Add roomId mapping for appointments |
| `src/components/dashboard/modules/PlanningModule.js` | Room badge on appointments, room + treatment filter selects |
| `src/components/dashboard/modules/MachinesModule.js` | Room column in list |
| `src/components/dashboard/modals/MachineFormModal.js` | Room selector dropdown |
| `src/components/dashboard/modals/PlanningBookingModal.js` | Show room info on selected slot |
| `src/locales/{es,fr,en}/planning.json` | Room-related labels |
| `src/locales/{es,fr,en}/machines.json` | Room field label |
