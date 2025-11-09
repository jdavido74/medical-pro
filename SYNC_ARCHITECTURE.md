# 🔄 Architecture Synchrone - Synchronicity First

## Principe Fondamental

**L'utilisateur ne doit JAMAIS attendre pour voir ses changements.**

Quand un user:
- Crée un patient → le voit IMMÉDIATEMENT ✅
- Modifie un nom → le voit IMMÉDIATEMENT ✅
- Supprime un rdv → disparaît IMMÉDIATEMENT ✅

**Zéro latence perçue**, même avec une API lente ou offline.

---

## 🏗️ Architecture en 3 Couches

```
┌─────────────────────────────────────────────────────────────┐
│ UI (PatientsModule, AppointmentForm, etc)                   │
│ Appelle: useSyncMutation(patientContext, '/api/v1/patients')│
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: SYNC LOCAL (useSyncMutation Hook)                  │
│ - Update React Context IMMÉDIATEMENT                        │
│ - User voit le changement MAINTENANT                        │
│ - Pas de latence réseau visible                             │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: ASYNC BACKGROUND (MutationQueue)                   │
│ - Sync avec API en arrière plan                             │
│ - Queue si offline                                          │
│ - Retry automatique (3x avec backoff)                       │
│ - Rollback si erreur persistante                            │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: API BACKEND (Express)                              │
│ - Persiste les données en DB                                │
│ - Retourne l'état confirmé                                  │
│ - Peut rejeter (erreur, conflit)                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Flux Complet: Créer un Patient

### Étape 1: User clique "Create Patient"
```javascript
// Dans PatientsModule.js ou QuickPatientModal.js
const { create, isPending, error } = useSyncMutation(
  patientContext,
  '/api/v1/patients'
);

// User remplit et clique submit
await create({
  first_name: 'Jean',
  last_name: 'Dupont',
  email: 'jean@example.com'
});
```

### Étape 2: L1 - CREATE LOCAL IMMÉDIATEMENT
```javascript
// useSyncMutation déclenche:

// 1. Appel patientContext.createPatient()
const newPatient = await context.createPatient({
  first_name: 'Jean',
  last_name: 'Dupont',
  email: 'jean@example.com'
});

// 2. PatientContext.createPatient() exécute:
// - Génère un UUID local
// - Ajoute à l'array patients[]
// - setPatients([...prev, newPatient]) ✅ IMMÉDIAT
// - React re-render IMMÉDIATEMENT

// ✅ L'utilisateur voit "Jean Dupont" dans la liste MAINTENANT
// (même si l'API est lente ou down)
```

### Étape 3: L2 - QUEUE LA SYNC EN ARRIÈRE PLAN
```javascript
// En parallèle (non-blocking):
await queue.enqueue({
  id: `create-${newPatient.id}-${Date.now()}`,
  type: 'POST',
  endpoint: '/api/v1/patients',
  data: { first_name: 'Jean', last_name: 'Dupont', ... }
});

// Queue vérifie: isOnline?
// ✅ OUI → POST /api/v1/patients immédiatement
// ❌ NON → Sauvegarder en localStorage, retry quand online
```

### Étape 4: L3 - API PERSISTE EN DB
```javascript
// Backend Express:
POST /api/v1/patients
{
  company_id: "clinic-123",
  first_name: "Jean",
  last_name: "Dupont",
  email: "jean@example.com"
}

// Response:
{
  success: true,
  data: {
    id: "patient-uuid-from-db", // ID généré par DB
    first_name: "Jean",
    last_name: "Dupont",
    email: "jean@example.com",
    created_at: "2024-11-09T12:30:00Z",
    ...
  }
}
```

### Étape 5: SYNC CONFIRMATION (Optional)
```javascript
// Quand la réponse revient:

// Option A: Utiliser l'ID du backend (RECOMMANDÉ)
patientContext.updatePatient(localUUID, {
  id: newIdFromBackend, // Remplacer UUID local par ID DB
  // ... autres champs
});

// Option B: Full resync (moins efficace)
const freshPatients = await patientContext.getAll();
setPatients(freshPatients);
```

---

## 🎯 Résumé: Les 3 Points Clés

### 1. **UPDATE LOCAL D'ABORD** (0ms latence)
```javascript
// L1: Update React Context → User sees it NOW
setPatients([...prev, newPatient]); // ✅ Instant
```

### 2. **SYNC AVEC API EN BACKGROUND** (async)
```javascript
// L2: Ajouter à queue
// L3: POST /api/v1/patients (quand online)
// User peut continuer à travailler
```

### 3. **ROLLBACK SI ERREUR** (safety net)
```javascript
// Si l'API rejette après 3 retries:
// - Afficher une notification d'erreur
// - Proposer: Retry, Discard, Offline Mode
// - Garder le changement en localStorage
```

---

## 💻 Implémentation: Hook useSyncMutation

### Créer un Patient
```javascript
const PatientsModule = () => {
  const patientContext = useContext(PatientContext);
  const { create, isPending, error } = useSyncMutation(
    patientContext,
    '/api/v1/patients'
  );

  const handleCreate = async (formData) => {
    try {
      // ✅ User sees the new patient IMMEDIATELY
      // ❌ API call happens in background
      await create({
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email
      });

      showNotification('Patient créé'); // Optional
    } catch (err) {
      showError(`Impossible de créer: ${err.message}`);
    }
  };

  return (
    <div>
      {isPending && <LoadingSpinner />} {/* Optional */}
      {error && <ErrorAlert error={error} />}
      <PatientsList patients={patientContext.patients} /> {/* Updates LIVE */}
      <CreateForm onSubmit={handleCreate} />
    </div>
  );
};
```

### Modifier un Patient
```javascript
const { mutate, isPending } = useSyncMutation(
  patientContext,
  '/api/v1/patients'
);

const handleUpdate = async (patientId, updates) => {
  const previousState = patientContext.patients.find(p => p.id === patientId);

  try {
    // ✅ User sees the updated name IMMEDIATELY
    await mutate(patientId, updates, { previousState });

    // Optional: Show subtle notification
    showNotification('Changement enregistré');
  } catch (err) {
    // If error: patientContext automatically rolled back
    showError(`Impossible de mettre à jour: ${err.message}`);
  }
};
```

### Supprimer un Patient
```javascript
const { delete: deletePatient, isPending } = useSyncMutation(
  patientContext,
  '/api/v1/patients'
);

const handleDelete = async (patientId) => {
  const previousPatient = patientContext.patients.find(p => p.id === patientId);

  if (!confirm('Êtes-vous sûr?')) return;

  try {
    // ✅ Patient disappears IMMEDIATELY
    await deletePatient(patientId, {
      previousState: previousPatient
    });

    showNotification('Patient supprimé');
  } catch (err) {
    // If error: patient reappears in list
    showError(`Impossible de supprimer: ${err.message}`);
  }
};
```

---

## 🔌 Intégration avec API Backend

### Frontend Pattern
```javascript
// AVANT (localStorage):
const patient = patientsStorage.create(data); // Sync + persist

// APRÈS (API):
const { create } = useSyncMutation(patientContext, '/api/v1/patients');
await create(data); // ✅ Sync local + queue API
```

### Backend APIs Requises
```
POST   /api/v1/patients         Create patient
GET    /api/v1/patients         List patients (pagination)
GET    /api/v1/patients/:id     Get one patient
PUT    /api/v1/patients/:id     Update patient
DELETE /api/v1/patients/:id     Soft delete patient

+ Same for appointments, medical-records, consents, practitioners
```

---

## ⚡ Performance: Zéro Latence Perçue

### Métriques
```
Local Update:        0-5ms ✅ (instant, en JS)
React Re-render:     16-32ms ✅ (1 frame @ 60fps)
User sees change:    < 50ms TOTAL ✅

API latency:         200-1000ms (invisible, background)
```

### Résultat
**L'utilisateur ne voit JAMAIS une latence > 50ms**

---

## 🛡️ Sécurité & Intégrité

### Offline Support
```javascript
// User offline?
const queue = getMutationQueue();

// Mutations s'ajoutent au localStorage
await create({ first_name: 'Jean' }); // Added to queue

// ✅ User voit "Jean" immédiatement
// ⏳ Queue: "Waiting for connection..."
// 🔗 Connection restored → Auto-sync
```

### Conflict Resolution
```javascript
// Deux users modifient le même patient?
// Backend: "Conflict - concurrent update"
// Frontend:
//   1. Show error notification
//   2. Rollback local change
//   3. Offer: "Retry with your changes" ou "Use server version"
```

### Audit & Compliance
```javascript
// Chaque mutation a:
- timestamp (quand créée localement)
- userId
- reason (optionnel)
- status (pending, synced, error, rolled-back)

// MutationQueue logs tout:
localStorage['medicalPro_mutation_queue'] = [
  {
    id: 'mutation-123',
    timestamp: 1699508400000,
    type: 'PATCH',
    endpoint: '/api/v1/patients/p1',
    data: { ... },
    retries: 0,
    status: 'synced'
  }
]
```

---

## 📊 État de Synchronisation

### Pendant une mutation
```javascript
const { mutate, isPending, error } = useSyncMutation(...);

// Avant: isPending = false, error = null
mutate(patientId, updates);

// Pendant L1 (sync local): isPending = false ✅ (instant)
// Pendant L2 (queue): isPending = true
// Après L3 (confirmed): isPending = false, error = null

// Si erreur: isPending = false, error = "Message d'erreur"
```

### Pendant offline
```javascript
const pending = queue.getPending();
// [
//   { id: 'mutation-1', status: 'pending', retries: 0 },
//   { id: 'mutation-2', status: 'pending', retries: 0 }
// ]

// UI peut afficher: "⏳ 2 changements en attente de sync"
```

---

## 🎓 Bonnes Pratiques

### ✅ DO
```javascript
// ✅ Appeler useSyncMutation une fois par context
const { create, mutate, delete: del } = useSyncMutation(patientContext, '/api/v1/patients');

// ✅ Update local d'abord
await mutate(id, updates); // User sees change IMMEDIATELY

// ✅ Gérer les erreurs avec rollback
try {
  await mutate(id, updates, { previousState: oldData });
} catch (err) {
  // previousState sauvegardé → rollback auto
  showError(err);
}
```

### ❌ DON'T
```javascript
// ❌ Attendre la réponse API avant update local
const result = await api.patch(`/patients/${id}`, data);
setPatients([...prev, result]); // Slow! 200ms+ latency

// ❌ Faire 2 appels API (GET then PUT)
await patientContext.getPatientById(id); // Useless
await mutate(id, updates);

// ❌ Oublier le previousState pour rollback
await mutate(id, updates); // No safety net
```

---

## 🚀 Checklist: Implémenter Synchronité

- [ ] Créer hooks/useOptimisticMutation.js
- [ ] Créer utils/mutationQueue.js
- [ ] Créer hooks/useSyncMutation.js
- [ ] Ajouter MutationQueue au App.js (singleton)
- [ ] Migrer PatientContext vers useSyncMutation
- [ ] Migrer AppointmentContext vers useSyncMutation
- [ ] Migrer PatientFormModal vers useSyncMutation
- [ ] Ajouter UI pour "mutations pending" (optionnel)
- [ ] Tester offline: "Devtools > Network > Offline"
- [ ] Tester concurrent mutations (2 onglets)

---

## 📈 Résultat Final

**Quand vous terminez:**

| Action | Latence | Expérience |
|--------|---------|-----------|
| Créer patient | 0ms visible | ✅ Immédiat |
| Modifier nom | 0ms visible | ✅ Immédiat |
| Supprimer rdv | 0ms visible | ✅ Immédiat |
| API down | 0ms visible | ✅ Queue en offline |
| Network slow | 0ms visible | ✅ Sync en background |

**L'app se comporte comme 100% local, avec persistance cloud en background.**
