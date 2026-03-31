# Patient Detail Modal — Redesign Spec

## Overview

Complete rewrite of PatientDetailModal (currently 1160 lines, 8 tabs) into a focused 4-tab modal matching the size of PatientFormModal. Provides a quick overview of the patient's experience at the clinic: basic info, appointments history, treatments, and consent status.

## Modal Structure

**Size:** `max-w-4xl max-h-[90vh]` (same as PatientFormModal)

**Header:**
- Patient name (firstName + lastName) + patient number
- Tab navigation bar below
- Close button (X)

**4 Tabs:**

| # | Tab | Content | Permission |
|---|---|---|---|
| 1 | Ficha | Identity, contact, emergency, insurance | None (always visible) |
| 2 | Citas | Appointment history (chronological) | `APPOINTMENTS_VIEW` |
| 3 | Tratamientos | Treatments with toggle chrono/by-treatment | `APPOINTMENTS_VIEW` |
| 4 | Consentimientos | Consent list + alerts (stubbed for now) | Always visible |

Tabs without required permission are hidden (not grayed).

## Tab 1: Ficha

Read-only display. No action buttons.

**Block 1 — Identity:**
- First name, Last name
- Date of birth + calculated age
- Nationality
- Patient number

**Block 2 — Contact:**
- Phone
- Email

**Block 3 — Emergency contact** (orange/red accent if populated):
- Contact name
- Relationship
- Phone

**Block 4 — Insurance** (if populated):
- Provider
- Policy number
- Type

## Tab 2: Citas (Appointments)

**Counters at top:** X completed · Y upcoming · Z cancelled

**Reverse chronological list** (newest first). Each appointment shows:

Line 1: Date · Start-End time · Doctor name (if known) · Status badge
Line 2: Treatment names (comma separated)

**Status badges:**
- Programada (yellow) = scheduled
- Confirmada (green) = confirmed
- En curso (blue) = in_progress
- Completada (gray) = completed
- Cancelada (red) = cancelled
- No show (dark red) = no_show
- Interrumpido (purple) = interrupted

**Pagination:** Show 20 most recent, "Ver más" button to load next 20.

**Data source:** `planningApi.getCalendar({ patientId, startDate: '2020-01-01', endDate: futureDate })` — reuse existing API.

## Tab 3: Tratamientos (Treatments)

**Toggle at top:** Cronológico | Por tratamiento

**Counters:** X realized · Y planned · Z suspended · W cancelled

### Chronological view (default)

Grouped by appointment date:

```
27 mar 2026 · Dr. Díaz
  ✅ Ozon multipass 10         [Realizado]
  ✅ Glutation 2g              [Realizado]
  ❌ Pulso 30 min              [Cancelado]
```

### By-treatment view

Grouped by treatment name with session count:

```
Ozon multipass 10                    (5 sesiones)
  ✅ 12 mar 2026 · Dr. Díaz
  ✅ 25 mar 2026 · Dr. Díaz
  🔵 3 abr 2026  · Dr. Díaz
```

**Treatment statuses** (derived from appointment status):
- ✅ Realizado = appointment completed
- 🔵 Previsto = appointment scheduled or confirmed
- ⏸ Suspendido = appointment interrupted
- ❌ Cancelado = appointment cancelled

**Data source:** Same appointments API as Citas tab, extract `service` (treatment) from each appointment.

## Tab 4: Consentimientos

**Structure ready, data stubbed.** API calls commented/stubbed, ready to activate when backend is available.

### Alert zone (top)

When treatments are planned and require consent, show alerts:
- 🔴 Missing consent: treatment planned, no consent signed
- 🟡 Expired consent: consent signed but expired
- 🟢 Valid consent: all good

**For now:** Shows informational message "Las alertas de consentimiento estarán disponibles próximamente."

### Consent list

Each consent shows: title, status badge, date.

**Badges:**
- 🟢 Firmado (green) — signed and valid
- 🟡 Expirado (yellow) — signed but expired
- 🔴 Pendiente (red) — pending signature
- ⬜ No enviado (gray) — not sent

**For now:** Shows "No hay consentimientos registrados" empty state. Component structure is in place.

**Future activation:** When consent backend is ready:
1. Uncomment API calls in the component
2. Add treatment → consent template association in catalog (ProductService)

## List Icons (PatientsModule)

| Icon | Component | Action | Change |
|---|---|---|---|
| Eye | New PatientDetailModal | Opens the 4-tab modal | Modified — new component |
| Stethoscope | Navigate | `navigateTo('/medical-records', { state: { patientId } })` | Modified — navigation instead of modal |
| ClipboardCheck | Navigate | `navigateTo('/consents', { state: { patientId } })` | Modified — navigation instead of modal |
| Edit2 | PatientFormModal | Opens edit modal | Unchanged |

Remove the Archive button from the action icons (destructive action, accessible from edit if needed).

## Component Architecture

**Replace:** `src/components/dashboard/modals/PatientDetailModal.js` (1160 lines)

**With new focused components:**

| File | Purpose | Lines (est.) |
|---|---|---|
| `PatientDetailModal.js` | Shell: header, tabs, permission gating | ~100 |
| `PatientDetailFicha.js` | Tab 1: identity, contact, emergency, insurance | ~120 |
| `PatientDetailCitas.js` | Tab 2: appointments list with counters + pagination | ~150 |
| `PatientDetailTratamientos.js` | Tab 3: treatments with toggle + two views | ~200 |
| `PatientDetailConsentimientos.js` | Tab 4: consent list + alerts (stubbed) | ~100 |

Each tab component receives `patient` and `appointments` (or relevant data) as props. The shell loads data and distributes to tabs.

## Data Loading

The modal shell loads data on open:

```javascript
// On mount
const [appointments, setAppointments] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  if (isOpen && patient?.id) {
    loadAppointments();
  }
}, [isOpen, patient?.id]);

const loadAppointments = async () => {
  const response = await planningApi.getCalendar({
    patientId: patient.id,
    startDate: '2020-01-01',
    endDate: formatDateLocal(addMonths(new Date(), 6))
  });
  setAppointments(response.data || []);
};
```

Appointments are shared between Citas and Tratamientos tabs (loaded once, passed as props).

## i18n

New keys under `patients:detail.*` in es/fr/en:
- Tab labels: ficha, citas, tratamientos, consentimientos
- Counters: completed, upcoming, cancelled, realized, planned, suspended
- Treatment views: cronologico, porTratamiento, sesiones
- Consent: firmado, expirado, pendiente, noEnviado, alertTitle, alertProximamente
- Empty states and labels

## Permissions

Reuse existing permission constants:
- `APPOINTMENTS_VIEW` — gates Citas and Tratamientos tabs
- `CONSENTS_VIEW` — if exists, gates Consentimientos tab (otherwise always visible)

## Out of Scope

- Consent backend/API (future)
- Treatment → consent template association (future)
- Document management (removed from modal)
- Access log tab (removed — available via admin)
- Billing/administrative details beyond insurance (removed)
