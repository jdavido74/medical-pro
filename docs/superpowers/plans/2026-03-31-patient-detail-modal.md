# Patient Detail Modal Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 1160-line PatientDetailModal with 5 focused components (shell + 4 tab components), update patient list icons to navigate to medical records and consents pages.

**Architecture:** New PatientDetailModal shell loads appointments once and distributes data to tab components via props. Each tab is a standalone component. PatientsModule icons for stethoscope and clipboard change from opening modals to router navigation.

**Tech Stack:** React, Tailwind CSS, lucide-react icons, planningApi, useLocaleNavigation hook, i18n

**Spec:** `docs/superpowers/specs/2026-03-31-patient-detail-modal-design.md`

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/components/dashboard/modals/PatientDetailModal.js` | Rewrite | Modal shell: header, tabs, data loading, permission gating |
| `src/components/dashboard/modals/PatientDetailFicha.js` | Create | Tab 1: identity, contact, emergency, insurance |
| `src/components/dashboard/modals/PatientDetailCitas.js` | Create | Tab 2: appointment history with counters + pagination |
| `src/components/dashboard/modals/PatientDetailTratamientos.js` | Create | Tab 3: treatments with chrono/by-treatment toggle |
| `src/components/dashboard/modals/PatientDetailConsentimientos.js` | Create | Tab 4: consent list + alerts (stubbed) |
| `src/components/dashboard/modules/PatientsModule.js` | Modify | Update icons: stethoscope→navigate, clipboard→navigate, remove archive |
| `src/locales/es/patients.json` | Modify | New tab labels + treatment/consent i18n keys |
| `src/locales/fr/patients.json` | Modify | French equivalents |
| `src/locales/en/patients.json` | Modify | English equivalents |

---

## Task 1: i18n Keys

**Files:**
- Modify: `src/locales/es/patients.json`
- Modify: `src/locales/fr/patients.json`
- Modify: `src/locales/en/patients.json`

- [ ] **Step 1: Add Spanish keys**

In `src/locales/es/patients.json`, replace the existing `detail.tabs` object and add new keys under `detail`:

```json
"tabs": {
  "ficha": "Ficha",
  "citas": "Citas",
  "tratamientos": "Tratamientos",
  "consentimientos": "Consentimientos"
},
```

Add these new keys under `detail`:

```json
"identity": "Identidad",
"contact": "Contacto",
"emergencyContact": "Contacto de Emergencia",
"insurance": "Seguro Médico",
"age": "{{years}} años",
"noPhone": "Sin teléfono",
"noEmail": "Sin email",
"noEmergencyContact": "Sin contacto de emergencia registrado",
"noInsurance": "Sin seguro registrado",
"relationship": "Relación",

"appointments": {
  "completed": "Realizadas",
  "upcoming": "Próximas",
  "cancelled": "Canceladas",
  "noAppointments": "No hay citas registradas",
  "loadMore": "Ver más"
},

"treatments": {
  "chronological": "Cronológico",
  "byTreatment": "Por tratamiento",
  "realized": "Realizados",
  "planned": "Previstos",
  "suspended": "Suspendidos",
  "cancelled": "Cancelados",
  "sessions": "sesiones",
  "noTreatments": "No hay tratamientos registrados"
},

"consents": {
  "alertTitle": "Alertas de consentimiento",
  "alertProximamente": "Las alertas de consentimiento estarán disponibles próximamente.",
  "signed": "Firmado",
  "expired": "Expirado",
  "pending": "Pendiente",
  "notSent": "No enviado",
  "noConsents": "No hay consentimientos registrados",
  "missingConsent": "Consentimiento no firmado",
  "expiredConsent": "Consentimiento expirado"
}
```

- [ ] **Step 2: Add French keys**

Same structure with French translations: Fiche, Rendez-vous, Traitements, Consentements, etc.

- [ ] **Step 3: Add English keys**

Same structure with English translations: Info, Appointments, Treatments, Consents, etc.

- [ ] **Step 4: Commit**

```bash
cd /var/www/medical-pro
git add src/locales/es/patients.json src/locales/fr/patients.json src/locales/en/patients.json
git commit -m "feat(patient-detail): add i18n keys for new patient detail modal tabs"
```

---

## Task 2: PatientDetailFicha Component

**Files:**
- Create: `src/components/dashboard/modals/PatientDetailFicha.js`

- [ ] **Step 1: Create the component**

Create `/var/www/medical-pro/src/components/dashboard/modals/PatientDetailFicha.js`:

**Props:** `{ patient, t }` (patient object + translation function)

**Structure:**
- 4 blocks with consistent styling (gray labels, dark values)
- Block 1 — Identity: firstName, lastName, birthDate (+ calculated age), nationality, patientNumber
- Block 2 — Contact: phone, email (with icons)
- Block 3 — Emergency contact: name, relationship, phone (orange left border if populated, gray "not registered" message if empty)
- Block 4 — Insurance: provider, number, type (if populated, hidden if empty)

**Age calculation:**
```javascript
const calculateAge = (birthDate) => {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};
```

**Date formatting:**
```javascript
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
};
```

Read-only, no action buttons.

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/modals/PatientDetailFicha.js
git commit -m "feat(patient-detail): add PatientDetailFicha tab component"
```

---

## Task 3: PatientDetailCitas Component

**Files:**
- Create: `src/components/dashboard/modals/PatientDetailCitas.js`

- [ ] **Step 1: Create the component**

Create `/var/www/medical-pro/src/components/dashboard/modals/PatientDetailCitas.js`:

**Props:** `{ appointments, loading, t }`

`appointments` is the full array of appointments for this patient (already loaded by the shell).

**Structure:**

1. **Counters bar** at top: 3 colored badges
   - Completed count (gray): filter `status === 'completed'`
   - Upcoming count (blue): filter `status` in `['scheduled', 'confirmed']`
   - Cancelled count (red): filter `status === 'cancelled'`

2. **Appointment list** (reverse chronological):
   ```javascript
   const sorted = [...appointments].sort((a, b) => {
     const dateA = new Date(`${a.date}T${a.startTime || '00:00'}`);
     const dateB = new Date(`${b.date}T${b.startTime || '00:00'}`);
     return dateB - dateA;
   });
   ```

3. **Each appointment** renders 2 lines:
   - Line 1: date (formatted) · startTime - endTime · provider name (if available) · status badge
   - Line 2: service/treatment title (from `apt.title || apt.service?.title || ''`), gray text

4. **Status badge colors** (reuse STATUS_CONFIG pattern from PlanningModule or define inline):
   - scheduled → yellow
   - confirmed → green
   - in_progress → blue
   - completed → gray
   - cancelled → red
   - no_show → dark red
   - interrupted → purple

5. **Pagination:** Show first 20 (`visibleCount` state), "Ver más" button increments by 20.

6. **Empty state:** If no appointments, show Calendar icon + "No hay citas registradas"

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/modals/PatientDetailCitas.js
git commit -m "feat(patient-detail): add PatientDetailCitas tab component"
```

---

## Task 4: PatientDetailTratamientos Component

**Files:**
- Create: `src/components/dashboard/modals/PatientDetailTratamientos.js`

- [ ] **Step 1: Create the component**

Create `/var/www/medical-pro/src/components/dashboard/modals/PatientDetailTratamientos.js`:

**Props:** `{ appointments, loading, t }`

**State:** `const [viewMode, setViewMode] = useState('chronological');`

**Data extraction:** From the appointments array, extract all treatments:
```javascript
const allTreatments = useMemo(() => {
  return appointments
    .filter(apt => apt.title || apt.service?.title)
    .map(apt => ({
      appointmentId: apt.id,
      date: apt.date,
      startTime: apt.startTime,
      treatmentName: apt.title || apt.service?.title || '',
      providerName: apt.provider?.fullName || apt.practitioner?.fullName || '',
      status: apt.status,
    }));
}, [appointments]);
```

**Counters bar:** 4 badges:
- Realized: status 'completed'
- Planned: status 'scheduled' or 'confirmed'
- Suspended: status 'interrupted'
- Cancelled: status 'cancelled'

**Toggle:** Two buttons (Cronológico | Por tratamiento)

**Chronological view:**
Group by date using:
```javascript
const byDate = {};
for (const tr of allTreatments) {
  const key = tr.date;
  if (!byDate[key]) byDate[key] = { date: tr.date, providerName: tr.providerName, items: [] };
  byDate[key].items.push(tr);
}
```
Render each date group: date header + provider, then list of treatments with status icon + badge.

**By-treatment view:**
Group by treatmentName:
```javascript
const byName = {};
for (const tr of allTreatments) {
  if (!byName[tr.treatmentName]) byName[tr.treatmentName] = [];
  byName[tr.treatmentName].push(tr);
}
```
Render each treatment group: treatment name + session count, then chronological list of dates with status.

**Status icons:**
- ✅ completed (green CheckCircle)
- 🔵 scheduled/confirmed (blue Clock)
- ⏸ interrupted (purple Pause)
- ❌ cancelled (red X)

**Empty state:** If no treatments, show Pill icon + "No hay tratamientos registrados"

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/modals/PatientDetailTratamientos.js
git commit -m "feat(patient-detail): add PatientDetailTratamientos tab component"
```

---

## Task 5: PatientDetailConsentimientos Component

**Files:**
- Create: `src/components/dashboard/modals/PatientDetailConsentimientos.js`

- [ ] **Step 1: Create the component**

Create `/var/www/medical-pro/src/components/dashboard/modals/PatientDetailConsentimientos.js`:

**Props:** `{ patient, t }`

**Structure ready, data stubbed:**

1. **Alert zone** (top, yellow background):
   - Info icon + message: `t('patients:detail.consents.alertProximamente')`

2. **Consent list** (currently empty):
   - Empty state: ClipboardCheck icon + `t('patients:detail.consents.noConsents')`

3. **Badge components ready** (used in future when data is available):
   ```javascript
   const statusBadge = (status) => {
     const config = {
       signed: { bg: 'bg-green-100', text: 'text-green-700', label: t('patients:detail.consents.signed') },
       expired: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: t('patients:detail.consents.expired') },
       pending: { bg: 'bg-red-100', text: 'text-red-700', label: t('patients:detail.consents.pending') },
       not_sent: { bg: 'bg-gray-100', text: 'text-gray-600', label: t('patients:detail.consents.notSent') },
     };
     const c = config[status] || config.not_sent;
     return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>{c.label}</span>;
   };
   ```

4. **Future activation comments:**
   ```javascript
   // TODO: When consent backend is ready:
   // 1. Import consentApi
   // 2. Load patient consents: const consents = await consentApi.getPatientConsents(patient.id)
   // 3. Load treatment-consent associations for alert zone
   // 4. Replace empty state with consent list
   ```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/modals/PatientDetailConsentimientos.js
git commit -m "feat(patient-detail): add PatientDetailConsentimientos tab component (stubbed)"
```

---

## Task 6: PatientDetailModal Shell (Rewrite)

**Files:**
- Rewrite: `src/components/dashboard/modals/PatientDetailModal.js`

- [ ] **Step 1: Rewrite the modal**

Replace the entire content of `/var/www/medical-pro/src/components/dashboard/modals/PatientDetailModal.js` with the new shell.

**Imports:**
```javascript
import React, { useState, useEffect, useCallback } from 'react';
import { X, User, Calendar, Pill, ClipboardCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../../auth/PermissionGuard';
import { PERMISSIONS } from '../../../utils/permissionsStorage';
import planningApi from '../../../api/planningApi';
import PatientDetailFicha from './PatientDetailFicha';
import PatientDetailCitas from './PatientDetailCitas';
import PatientDetailTratamientos from './PatientDetailTratamientos';
import PatientDetailConsentimientos from './PatientDetailConsentimientos';
```

**Props:** `{ patient, isOpen, onClose, initialTab = 'ficha' }`

Note: remove `onEdit`, `canViewMedicalData`, `canViewAllData` from props — permissions are now handled internally.

**State:**
```javascript
const [activeTab, setActiveTab] = useState(initialTab);
const [appointments, setAppointments] = useState([]);
const [loadingAppointments, setLoadingAppointments] = useState(false);
```

**Permissions:**
```javascript
const { hasPermission } = usePermissions();
const canViewAppointments = hasPermission(PERMISSIONS.APPOINTMENTS_VIEW);
```

**Tab definition:**
```javascript
const tabs = [
  { id: 'ficha', label: t('patients:detail.tabs.ficha'), icon: User, visible: true },
  { id: 'citas', label: t('patients:detail.tabs.citas'), icon: Calendar, visible: canViewAppointments },
  { id: 'tratamientos', label: t('patients:detail.tabs.tratamientos'), icon: Pill, visible: canViewAppointments },
  { id: 'consentimientos', label: t('patients:detail.tabs.consentimientos'), icon: ClipboardCheck, visible: true },
].filter(tab => tab.visible);
```

**Data loading (useEffect):**
```javascript
useEffect(() => {
  if (isOpen && patient?.id && canViewAppointments) {
    loadAppointments();
  }
}, [isOpen, patient?.id]);

const loadAppointments = async () => {
  setLoadingAppointments(true);
  try {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 6);
    const endDate = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}-${String(futureDate.getDate()).padStart(2, '0')}`;
    const response = await planningApi.getCalendar({
      patientId: patient.id,
      startDate: '2020-01-01',
      endDate,
    });
    if (response.success) {
      setAppointments(response.data || []);
    }
  } catch (err) {
    console.error('Error loading patient appointments:', err);
  } finally {
    setLoadingAppointments(false);
  }
};
```

**Reset activeTab on open:**
```javascript
useEffect(() => {
  if (isOpen) setActiveTab(initialTab);
}, [isOpen, initialTab]);
```

**Render:**
```jsx
if (!isOpen || !patient) return null;

return (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b">
        <div className="flex items-center justify-between px-6 pt-4 pb-2">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {patient.firstName} {patient.lastName}
            </h2>
            <p className="text-sm text-gray-500">N° {patient.patientNumber}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        {/* Tab bar */}
        <div className="flex px-6 gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'ficha' && <PatientDetailFicha patient={patient} t={t} />}
        {activeTab === 'citas' && <PatientDetailCitas appointments={appointments} loading={loadingAppointments} t={t} />}
        {activeTab === 'tratamientos' && <PatientDetailTratamientos appointments={appointments} loading={loadingAppointments} t={t} />}
        {activeTab === 'consentimientos' && <PatientDetailConsentimientos patient={patient} t={t} />}
      </div>
    </div>
  </div>
);
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/modals/PatientDetailModal.js
git commit -m "feat(patient-detail): rewrite modal shell with 4 tabs and data loading"
```

---

## Task 7: Update PatientsModule Icons + Navigation

**Files:**
- Modify: `src/components/dashboard/modules/PatientsModule.js`

- [ ] **Step 1: Add navigation hook**

Add import at top:
```javascript
import { useLocaleNavigation } from '../../../hooks/useLocaleNavigation';
```

Inside the component, add:
```javascript
const { navigateTo } = useLocaleNavigation();
```

- [ ] **Step 2: Update handleViewMedicalHistory**

Replace the current `handleViewMedicalHistory` function (lines 132-141) with navigation:
```javascript
const handleViewMedicalHistory = (patient) => {
  patientsStorage.logAccess(patient.id, 'medical_history_access', user?.id || 'unknown', {
    userRole: user?.role,
    timestamp: new Date().toISOString()
  });
  navigateTo('/medical-records', { state: { patientId: patient.id } });
};
```

- [ ] **Step 3: Update handleViewConsents**

Replace the current `handleViewConsents` function (lines 122-130) with navigation:
```javascript
const handleViewConsents = (patient) => {
  patientsStorage.logAccess(patient.id, 'consents_access', user?.id || 'unknown', {
    userRole: user?.role,
    timestamp: new Date().toISOString()
  });
  navigateTo('/consents', { state: { patientId: patient.id } });
};
```

- [ ] **Step 4: Update PatientDetailModal props**

Find where `<PatientDetailModal` is rendered. Update props to match new interface:
```jsx
<PatientDetailModal
  patient={viewingPatient}
  isOpen={isDetailModalOpen}
  onClose={() => {
    setIsDetailModalOpen(false);
    setViewingPatient(null);
    setInitialTab('ficha');
  }}
  initialTab={initialTab}
/>
```

Remove `onEdit`, `canViewMedicalData`, `canViewAllData` props.

- [ ] **Step 5: Remove archive button from action icons**

Find the archive button block (around line 473-480) with `handleDeletePatient` and remove it.

- [ ] **Step 6: Remove unused state and imports**

Remove state: `isMedicalHistoryModalOpen`, `viewingMedicalHistory`
Remove the `MedicalHistoryModal` rendering block if present.
Remove unused imports: `MedicalHistoryModal`, `Archive`.

- [ ] **Step 7: Commit**

```bash
git add src/components/dashboard/modules/PatientsModule.js
git commit -m "feat(patient-detail): update list icons to navigate, remove archive button"
```

---

## Task 8: Build Verification + Deploy

- [ ] **Step 1: Build frontend**

```bash
cd /var/www/medical-pro
REACT_APP_API_BASE_URL=/api/v1 REACT_APP_COUNTRY=ES REACT_APP_ENV=production npm run build
```

- [ ] **Step 2: Fix any build errors**

- [ ] **Step 3: Deploy to prod**

```bash
scp -P 2222 -r /var/www/medical-pro/build/* root@72.62.51.173:/var/www/medical-pro/build/
ssh -p 2222 root@72.62.51.173 "pm2 restart medical-pro-frontend"
```

- [ ] **Step 4: Test**

1. Open patient list → click eye icon → verify new 4-tab modal opens
2. Verify Ficha tab shows identity, contact, emergency, insurance
3. Verify Citas tab shows appointments with counters and pagination
4. Verify Tratamientos tab with both toggle views
5. Verify Consentimientos tab shows stubbed content
6. Click stethoscope icon → verify navigation to /medical-records
7. Click clipboard icon → verify navigation to /consents
8. Verify archive button is removed
9. Test with restricted permissions — verify tabs are hidden
