# Spec A — Refonte du pipeline chaîne de traitements

**Date** : 2026-04-18
**Status** : Ready for implementation plan
**Scope** : 7 bugs critiques (Tier 1) du audit du 2026-04-16

## 1. Contexte

Les cliniques créent des enchaînements de traitements (ex: ALA 30min → Vitamine C 45min → Curcumine 20min) planifiés de façon contiguë sur des machines. L'audit du 2026-04-16 a identifié 32 bugs dont 9 critiques. Cette spec couvre les 7 bugs critiques Tier 1 qui bloquent les utilisateurs au quotidien.

### Bugs couverts

| # | Fichier | Problème |
|---|---------|----------|
| 7 | `planning.js:516-748` | PUT single sans transaction DB → chaîne corrompue si un update downstream échoue |
| 9 | `planning.js:648` | `computeChainAdjustment` reçoit `start_time` pré-update → gaps/chevauchements |
| 12 | `planning.js:767` | DELETE single ne recalcule pas la chaîne → trou sans option de resserrement |
| 21 | `PlanningBookingModal.js:403` | Checkbox "Recalculer" affichée mais jamais transmise au backend |
| 22 | `PlanningBookingModal.js:1441` | Substitution mode group cible toujours `appointment.id` initial |
| 25 | `PlanningModule.js:2164` | Bouton delete rapide bypasse la logique de chaîne |
| 26 | `PlanningBookingModal.js:662` | `handleDeleteRecalculate` n'envoie pas `duration` → `end_time` corrompue |

### Hors scope (Spec A-bis future)

- Bug 1 : `onDelete: SET NULL` sur FK parent (risque faible, suppression physique rare)
- Bug 4 : Conflit machine intra-chaîne à la création
- Bug 15 : Recalcul frontend N PUTs sans transaction (remplacé par l'endpoint backend de cette spec)
- Bug 16 : Compaction avec `machine_id` jamais déplacés
- Spec B : Synchronisation temps réel des vues (AppointmentContext unification)

## 2. Architecture

### 2.1 Nouveau service : `appointmentChainService.js`

Centralise toutes les opérations transactionnelles sur les chaînes. Les routes `planning.js` deviennent des orchestrateurs légers qui délèguent au service.

**Responsabilités :**

```
appointmentChainService
├── updateInChain(clinicDb, appointmentId, updateData, opts)
│   └── Transaction : update cible → computeChainAdjustment → update downstream
├── deleteFromChain(clinicDb, appointmentId, { recalculateChain })
│   └── Transaction : cancel cible → (optionnel) compact downstream
├── substituteInChain(clinicDb, appointmentId, newServiceId, { recalculateChain })
│   └── Transaction : change service → recalcule durée → (optionnel) compact downstream
└── helpers internes
    ├── fetchChainWithLock(clinicDb, appointmentId, transaction)
    ├── applyChainUpdates(chain, updates, transaction)
    └── buildPendingTarget(appointment, updateData)
```

**Principes :**
- Chaque méthode publique ouvre une transaction Sequelize serializable
- `fetchChainWithLock` utilise `SELECT ... FOR UPDATE` pour verrouiller la chaîne et éviter les race conditions
- `buildPendingTarget` construit un objet appointment avec les données post-update AVANT de les persister, pour que `computeChainAdjustment` travaille sur les bonnes valeurs (fix bug 9)
- Toutes les écritures (cible + downstream) sont dans la même transaction (fix bug 7)

### 2.2 Routes modifiées

**`PUT /appointments/:id`** (planning.js) — Simplifié :

```
1. Lire l'appointment
2. Si chaîné → déléguer à appointmentChainService.updateInChain()
3. Si isolé → update direct (comportement actuel)
```

**`DELETE /appointments/:id`** (planning.js) — Nouveau param :

```
Body : { recalculateChain: boolean }  (défaut: false)

1. Lire l'appointment
2. Si chaîné → déléguer à appointmentChainService.deleteFromChain()
3. Si isolé → cancel direct (comportement actuel)
```

**`PUT /appointments/:id` avec substitution** — Détection :

```
Si updateData.service_id !== appointment.service_id :
  → déléguer à appointmentChainService.substituteInChain()
  → passe recalculateChain du body
```

### 2.3 Composants frontend modifiés

**`PlanningBookingModal.js`** :

1. **Substitution single** (fix bug 22) : `executeSave` en mode `single` avec `substitutionPending` envoie bien `serviceId` + `recalculateChain` au backend.

2. **Substitution group** (fix bug 22) : `substitutionPending` inclut `targetAppointmentId` (le RDV spécifique à substituer, pas forcément celui ouvert dans la modale). Le PUT est envoyé sur le bon `appointmentId`.

3. **Checkbox "Recalculer"** (fix bug 21) : la valeur de `recalculateChain` est transmise dans le payload à `executeSave` et envoyée au backend.

4. **`handleDeleteRecalculate` supprimé** (fix bug 26) : le recalcul N PUTs frontend est remplacé par un seul `DELETE /appointments/:id { recalculateChain: true }` côté backend. Plus de boucle frontend.

**`PlanningModule.js`** :

5. **Bouton delete rapide** (fix bug 25) : détecte `apt.isLinked || apt.linkedAppointmentId`. Si chaîné → ouvre une modale de choix au lieu de `window.confirm`. Si isolé → comportement actuel inchangé.

### 2.4 Modale de suppression chaînée

Nouveau composant léger `ChainDeleteChoiceModal.js` (ou intégré dans le flux existant `LinkedGroupChoiceModal`).

**Contenu affiché :**

```
"Ce traitement fait partie d'un enchaînement de {count} soins pour {patientName}."

[Annuler le créneau et rapprocher les autres rendez-vous de {patientName}]
[Annuler sans modifier les horaires]
[Retour]
```

- Premier bouton → `DELETE /appointments/:id { recalculateChain: true }`
- Deuxième bouton → `DELETE /appointments/:id { recalculateChain: false }`
- Troisième bouton → ferme la modale

**Message de succès :**
- Si resserrement : "Traitement annulé. Les rendez-vous de {patientName} ont été rapprochés."
- Si sans modification : "Traitement annulé. Les horaires des autres soins n'ont pas changé."

### 2.5 Modale de substitution

Intégrée dans le flux existant de `PlanningBookingModal`, après sélection du nouveau traitement.

**Contenu affiché :**

```
"Remplacer {oldTreatment} par {newTreatment} dans l'enchaînement de {patientName}."

[Remplacer et rapprocher les autres rendez-vous de {patientName}]
[Remplacer sans modifier les horaires]
[Retour]
```

- Premier bouton → PUT avec `serviceId` + `recalculateChain: true`
- Deuxième bouton → PUT avec `serviceId` + `recalculateChain: false`

**Message de succès :**
- Si resserrement : "Traitement remplacé. Les rendez-vous de {patientName} ont été rapprochés."
- Si sans modification : "Traitement remplacé. Les horaires des autres soins n'ont pas changé."

## 3. Détail du service `appointmentChainService.js`

### 3.1 `updateInChain(clinicDb, appointmentId, updateData, opts)`

```
opts: { recalculateChain: boolean }

Transaction:
  1. fetchChainWithLock(appointmentId) → chain[] triée par link_sequence
  2. target = chain.find(a => a.id === appointmentId)
  3. pendingTarget = buildPendingTarget(target, updateData)
     → merge target + updateData (start_time, duration, service_id, machine_id, etc.)
     → calcule end_time = pendingTarget.start_time + pendingTarget.duration
  4. Si service_id change ET opts.recalculateChain:
       result = computeChainAdjustment({ targetAppointment: pendingTarget, newTreatment, chainAppointments })
       Si result.type === 'conflict' → throw ConflictError(result)
       applyChainUpdates(chain, result.updates, transaction)
  5. Si service_id change ET !opts.recalculateChain:
       Update seulement la cible (durée change mais downstream inchangé)
  6. Si service_id ne change pas ET autres champs changent:
       Si opts.recalculateChain:
         Recalcule downstream avec nouvelle durée/start_time
       Update cible + downstream dans la transaction
  7. target.update(updateData, { transaction })
  8. Commit
  9. Return { updated: target, downstream: [...] }
```

### 3.2 `deleteFromChain(clinicDb, appointmentId, opts)`

```
opts: { recalculateChain: boolean }

Transaction:
  1. fetchChainWithLock(appointmentId) → chain[]
  2. target = chain.find(a => a.id === appointmentId)
  3. target.update({ status: 'cancelled' }, { transaction })
  4. Si opts.recalculateChain:
       downstream = chain.filter(a => a.link_sequence > target.link_sequence && a.status !== 'cancelled')
       cursor = target est le premier actif ?
         → start_time du target
         : end_time du membre actif précédent
       Pour chaque downstream:
         apt.start_time = cursor
         apt.end_time = cursor + apt.duration_minutes
         cursor = apt.end_time
         apt.save({ transaction })
  5. Si target est le parent (link_sequence === 1):
       Promouvoir le prochain actif en parent:
         nextActive.linked_appointment_id = null
         nextActive.link_sequence = 1
         (les autres enfants pointent déjà vers le parent, qui est cancelled mais toujours en DB)
  6. Commit
  7. Return { cancelled: target, recalculated: downstream || [] }
```

### 3.3 `substituteInChain(clinicDb, appointmentId, newServiceId, opts)`

```
Wrapper autour de updateInChain:
  1. Charger le nouveau service/traitement (durée, machine requise, etc.)
  2. Construire updateData = { service_id: newServiceId, duration_minutes: newDuration, ... }
  3. Appeler updateInChain(clinicDb, appointmentId, updateData, opts)
```

### 3.4 `fetchChainWithLock(clinicDb, appointmentId, transaction)`

```
1. Lire l'appointment pour obtenir linked_appointment_id ou déterminer si c'est le parent
2. parentId = appointment.linked_appointment_id || appointment.id (si link_sequence === 1)
3. SELECT * FROM appointments
   WHERE (id = parentId OR linked_appointment_id = parentId)
     AND status != 'cancelled'
   ORDER BY link_sequence
   FOR UPDATE  ← verrouille toute la chaîne
4. Return chain[]
```

Note : `FOR UPDATE` empêche deux utilisateurs de modifier la même chaîne simultanément (fix race condition bug 31, inclus gratuitement par la transaction).

### 3.5 `buildPendingTarget(appointment, updateData)`

```
Merge les données existantes avec les modifications en attente.
Objectif : computeChainAdjustment travaille sur les FUTURES valeurs, pas les anciennes.

return {
  ...appointment.toJSON(),
  start_time: updateData.start_time || appointment.start_time,
  end_time: calculateEndTime(updateData.start_time || appointment.start_time, updateData.duration_minutes || appointment.duration_minutes),
  duration_minutes: updateData.duration_minutes || appointment.duration_minutes,
  service_id: updateData.service_id || appointment.service_id,
  machine_id: updateData.machine_id || appointment.machine_id
}
```

Fix direct du bug 9.

## 4. Modifications frontend détaillées

### 4.1 `PlanningBookingModal.js`

**Fix bug 22 — Substitution cible le bon appointment :**

Dans `handleSubstituteSelect`, stocker `targetAppointmentId` dans `substitutionPending` :

```js
setSubstitutionPending({
  treatmentId: newTreatment.id,
  targetAppointmentId: targetApt.id  // ← nouveau champ
});
```

Dans `executeSave`, utiliser `substitutionPending.targetAppointmentId` au lieu de `appointment.id` pour le PUT :

```js
if (substitutionPending) {
  const targetId = substitutionPending.targetAppointmentId || appointment.id;
  await planningApi.updateAppointment(targetId, {
    ...editPayload,
    serviceId: substitutionPending.treatmentId,
    recalculateChain
  });
}
```

**Fix bug 21 — Transmettre `recalculateChain` :**

Inclure `recalculateChain` dans le payload de `executeSave` :

```js
const editPayload = {
  ...payload,
  recalculateChain: recalculateChain  // ← state déjà existant, juste à câbler
};
```

**Fix bug 26 — Supprimer `handleDeleteRecalculate` :**

Remplacer la boucle N PUTs par :

```js
await planningApi.cancelAppointment(appointmentId, { recalculateChain: true });
```

Le backend fait tout en transaction atomique. La fonction `handleDeleteRecalculate` (lignes ~642-682) est supprimée.

**Modale de substitution :**

Après sélection du nouveau traitement, si le RDV est chaîné et que la durée change, afficher :

```
"Remplacer {oldTreatment} par {newTreatment} dans l'enchaînement de {patientName}."

[Remplacer et rapprocher les autres rendez-vous de {patientName}]
[Remplacer sans modifier les horaires]
[Retour]
```

Le bouton choisi détermine `recalculateChain: true/false`.

Si la durée ne change PAS (même durée), pas besoin de modale — substitution directe.

### 4.2 `PlanningModule.js`

**Fix bug 25 — Bouton delete rapide :**

Ligne ~2164, remplacer :

```js
if (window.confirm(t('actions.deleteConfirm'))) {
  planningApi.cancelAppointment(apt.id).then(() => loadData());
}
```

Par :

```js
if (apt.isLinked || apt.linkedAppointmentId) {
  setChainDeleteModal({
    appointment: apt,
    patientName: formatPatientName(apt),
    chainCount: apt.linkSequence ? /* fetch ou cache */ : null
  });
} else {
  if (window.confirm(t('actions.deleteConfirm'))) {
    planningApi.cancelAppointment(apt.id).then(() => loadData());
  }
}
```

### 4.3 `ChainDeleteChoiceModal.js` (nouveau composant)

Composant réutilisable pour la suppression d'un RDV chaîné. Utilisé par `PlanningModule` (delete rapide) et `PlanningBookingModal` (delete dans le détail).

Props : `appointment`, `patientName`, `chainCount`, `onConfirm(recalculateChain)`, `onClose`.

UI :

```
"Ce traitement fait partie d'un enchaînement de {chainCount} soins pour {patientName}."

[Annuler le créneau et rapprocher les autres rendez-vous de {patientName}]  → onConfirm(true)
[Annuler sans modifier les horaires]  → onConfirm(false)
[Retour]  → onClose()
```

Messages de succès post-action (toast) :
- `recalculateChain: true` → "Traitement annulé. Les rendez-vous de {patientName} ont été rapprochés."
- `recalculateChain: false` → "Traitement annulé. Les horaires des autres soins n'ont pas changé."

### 4.4 `planningApi.js`

Adapter `cancelAppointment` pour accepter un body optionnel :

```js
async cancelAppointment(id, opts = {}) {
  return await baseClient.delete(`/planning/appointments/${id}`, {
    body: { recalculateChain: opts.recalculateChain || false }
  });
}
```

## 5. i18n

Nouvelles clés dans `planning.json` (FR/ES/EN) :

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
}
```

## 6. Tests

### Backend

- `appointmentChainService.test.js` :
  - `updateInChain` : modifie durée d'un membre, vérifie downstream recalculé en transaction
  - `updateInChain` : modifie `start_time`, vérifie `computeChainAdjustment` reçoit la nouvelle valeur (fix bug 9)
  - `updateInChain` : transaction rollback si downstream échoue → cible non modifiée (fix bug 7)
  - `deleteFromChain({ recalculateChain: true })` : supprime un membre milieu, downstream compacté
  - `deleteFromChain({ recalculateChain: false })` : supprime un membre milieu, downstream inchangé
  - `deleteFromChain` parent : promouvoit le suivant en parent
  - `substituteInChain` : change service_id + durée, downstream recalculé
  - `fetchChainWithLock` : vérifie le verrouillage (concurrent update → attente)

### Frontend

- `ChainDeleteChoiceModal.test.js` : affiche le nom patient et le count, "recalculate" appelle onConfirm(true), "keep" appelle onConfirm(false)
- `PlanningBookingModal` (tests existants adaptés) : substitution en mode single envoie le bon `serviceId` + `recalculateChain`
- `PlanningModule` : delete rapide ouvre la modale si chaîné, confirm direct si isolé

## 7. Rollout

1. Backend : créer `appointmentChainService.js`, adapter routes `planning.js`, déployer
2. Frontend : adapter `PlanningBookingModal`, `PlanningModule`, créer `ChainDeleteChoiceModal`, i18n, déployer
3. Test manuel : créer chaîne [A → B → C], supprimer B avec resserrement, substituer A, vérifier cohérence
