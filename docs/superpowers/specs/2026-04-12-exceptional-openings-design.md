# Ouvertures exceptionnelles — Design

**Date :** 2026-04-12
**Statut :** Spec validée, en attente de plan d'implémentation
**Auteur :** Brainstorming FacturePro Dev + Claude

## Contexte & Motivation

La configuration clinique actuelle dans `clinic_settings` gère :

- **`operating_days`** (ex: `[1,2,3,4,5]`) — jours normalement ouverts
- **`operating_hours`** — horaires par jour de la semaine
- **`closed_dates`** — fermetures exceptionnelles sur dates normalement ouvertes (congés, jours fériés, maintenance)

Il manque la **symétrique** : ouvrir exceptionnellement la clinique sur une date normalement fermée (par exemple un dimanche), sans avoir à basculer le jour entier dans `operating_days` (ce qui rendrait tous les dimanches ouverts par défaut).

### Cas d'usage déclencheur

L'admin d'une clinique ouverte Lun-Ven veut :
1. Ouvrir exceptionnellement le dim 12 avril 2026 pour une campagne de vaccination, de 09:00 à 17:00 avec pause déjeuner
2. Que les patients puissent prendre RDV ce jour-là
3. Que les autres dimanches restent fermés par défaut

### Problème actuel

Aujourd'hui l'admin doit mettre `operating_days` à `[0,1,2,3,4,5,6]` pour activer l'ouverture d'un seul dimanche, ce qui crée plusieurs problèmes :
- Tous les dimanches deviennent ouverts
- Les créneaux par défaut s'affichent sur toutes les semaines
- Impossible de différencier une ouverture ponctuelle d'un changement structurel d'horaires

## Requirements

### Fonctionnels

| ID | Exigence |
|----|----------|
| F-1 | L'admin peut ajouter une date d'ouverture exceptionnelle avec horaires personnalisés |
| F-2 | Les horaires supportent une plage simple ou matin + après-midi avec pause déjeuner |
| F-3 | L'admin peut supprimer une ouverture exceptionnelle planifiée |
| F-4 | Une date ne peut pas figurer simultanément dans `closed_dates` et `exceptional_openings` |
| F-5 | Les dates passées sont rejetées à l'ajout |
| F-6 | Le modal de réservation affiche les créneaux d'une date en ouverture exceptionnelle |
| F-7 | Les modifications se propagent sans rechargement manuel (via `ClinicSettingsContext`) |
| F-8 | L'UI est traduite en es/fr/en |

### Non-fonctionnels

| ID | Exigence |
|----|----------|
| NF-1 | Isolation multi-tenant préservée (scoping par `clinicDb`) |
| NF-2 | Permissions RBAC : seuls `admin` et `super_admin` peuvent écrire |
| NF-3 | Toutes les actions add/remove tracées dans `audit_logs` (conformité DPIA) |
| NF-4 | Limite de 365 entrées par clinique (anti-DoS DB) |
| NF-5 | Aucune régression sur le comportement existant de `operating_days`/`operating_hours`/`closed_dates` |

## Architecture

### Résolveur d'horaires (priorité stricte)

Le backend `planningService.getClinicHoursRanges(clinicDb, date)` applique l'ordre suivant :

```
1. Date ∈ closed_dates                     → null (fermé)
2. Date ∈ exceptional_openings             → horaires de l'entrée (ouvert)
3. dayOfWeek(date) ∈ operating_days        → operating_hours[dayName] (comportement existant)
4. Sinon                                   → null (fermé)
```

Les étapes 1 et 2 sont mutuellement exclusives par **contrainte d'unicité** à l'écriture (validation serveur). La priorité "fermeture prime" n'est qu'une garantie défensive — elle ne devrait jamais se déclencher si l'écriture est correcte.

### Flux utilisateur (happy path)

```
Admin                  Frontend              Backend                DB
 │ ouvre config          │                    │                      │
 │─────────────────────>│                    │                      │
 │                       │ GET settings       │                      │
 │                       │──────────────────>│ SELECT               │
 │                       │                    │─────────────────────>│
 │                       │<──── settings ─────│<──── row ───────────│
 │ onglet "Openings"     │                    │                      │
 │ + ajout date + heures │                    │                      │
 │─────────────────────>│                    │                      │
 │                       │ POST /exceptional- │                      │
 │                       │   openings         │                      │
 │                       │──────────────────>│ validate + UPDATE    │
 │                       │                    │─────────────────────>│
 │                       │<── 201 + settings  │                      │
 │                       │                    │ audit_log.insert     │
 │                       │ ClinicSettings-    │                      │
 │                       │ Context.refresh    │                      │
 │                       │ → re-render global │                      │
 │ (modal RDV)           │                    │                      │
 │─────────────────────>│ GET /planning/slots│                      │
 │                       │──────────────────>│ getClinicHoursRanges │
 │                       │                    │ → hit exceptional    │
 │                       │<──── slots ────────│                      │
```

## Data Model

### Nouveau champ `clinic_settings.exceptional_openings`

```json
[
  {
    "id": "uuid",
    "date": "2026-04-12",
    "reason": "Campagne vaccination",
    "hasLunchBreak": true,
    "morning":   { "start": "09:00", "end": "12:00" },
    "afternoon": { "start": "14:00", "end": "17:00" }
  },
  {
    "id": "uuid",
    "date": "2026-04-18",
    "reason": null,
    "hasLunchBreak": false,
    "morning": { "start": "10:00", "end": "14:00" }
  }
]
```

**Conventions** :
- `id` — uuid généré côté serveur à l'insert, utilisé pour `DELETE /exceptional-openings/:id`
- `date` — format `YYYY-MM-DD`, **unique** dans ce tableau et disjoint de `closed_dates[].date`
- `reason` — string ≤ 500 caractères, nullable, pas de HTML autorisé
- `hasLunchBreak=false` → seul `morning` est utilisé comme plage complète de la journée (même convention que `operating_hours`, réutilise `parseClinicHoursForDay`)
- `hasLunchBreak=true` → deux plages séparées `morning` puis `afternoon`, avec `morning.end ≤ afternoon.start`

### Migration DB

Fichier : `migrations/clinic_NNN_add_exceptional_openings.sql` (NNN = prochain numéro libre)

```sql
ALTER TABLE clinic_settings
ADD COLUMN IF NOT EXISTS exceptional_openings JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN clinic_settings.exceptional_openings IS
  'Array of exceptional opening dates on normally-closed weekdays:
   [{id, date, reason, hasLunchBreak, morning: {start,end}, afternoon: {start,end}}].
   Mutually exclusive with closed_dates (same date cannot appear in both).';
```

**À ajouter dans les 2 listes de migrations** (cf. CLAUDE.md / mémoire projet) :
- `src/utils/run-clinic-migrations.js` — `NEW_MIGRATIONS` pour les cliniques existantes
- `src/services/clinicProvisioningService.js` — liste des migrations pour les nouvelles cliniques

## Backend

### `src/services/planningService.js`

Modifier `getClinicHoursRanges()` :

1. Étendre le SELECT à `exceptional_openings`
2. Avant le check `operating_days` existant, ajouter :
   ```js
   const exceptional = (settings.exceptional_openings || [])
     .find(e => e.date === date);
   if (exceptional) {
     // Réutiliser parseClinicHoursForDay en lui passant un objet
     // compatible operating_hours[day]
     const synthHours = {
       enabled: true,
       hasLunchBreak: exceptional.hasLunchBreak,
       morning: exceptional.morning,
       afternoon: exceptional.afternoon
     };
     const parsed = parseClinicHoursForDay({ tmp: synthHours }, 'tmp');
     if (parsed) return parsed;
   }
   ```
3. La logique `operating_days` reste inchangée

Effet de bord à auditer : `availabilityService.js` et `chainSubstitutionService.js` lisent `operating_hours`/`closed_dates` indépendamment. À refactorer pour qu'ils appellent `getClinicHoursRanges` (centralisation) — petit refactor de cohérence, inclus dans la spec pour éviter divergence de logique.

### `src/base/clinicConfigSchemas.js`

Nouveau schéma Joi :

```js
const hourRangeSchema = Joi.object({
  start: Joi.string().pattern(/^([01][0-9]|2[0-3]):[0-5][0-9]$/).required(),
  end:   Joi.string().pattern(/^([01][0-9]|2[0-3]):[0-5][0-9]$/).required()
});

const exceptionalOpeningSchema = Joi.object({
  id: Joi.string().uuid().optional(),  // généré serveur si absent
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  reason: Joi.string().max(500).allow('', null).optional(),
  hasLunchBreak: Joi.boolean().required(),
  morning: hourRangeSchema.required(),
  afternoon: hourRangeSchema.when('hasLunchBreak', {
    is: true, then: Joi.required(), otherwise: Joi.forbidden()
  })
}).custom((value, helpers) => {
  // Cohérence: morning.end ≤ afternoon.start si lunch break
  if (value.hasLunchBreak && value.morning.end > value.afternoon.start) {
    return helpers.error('any.invalid',
      { message: 'morning.end must be ≤ afternoon.start' });
  }
  // morning.start < morning.end
  if (value.morning.start >= value.morning.end) {
    return helpers.error('any.invalid',
      { message: 'morning.start must be < morning.end' });
  }
  return value;
});
```

Ajouter `exceptional_openings: Joi.array().items(exceptionalOpeningSchema).max(365).optional()` dans `createClinicSettingsSchema` et `updateClinicSettingsSchema`.

### `src/routes/clinicSettings.js`

Nouveaux endpoints symétriques à `closed_dates` :

```
POST   /clinic-settings/exceptional-openings       — ajouter
DELETE /clinic-settings/exceptional-openings/:id   — supprimer
```

**POST** — body `{ date, reason?, hasLunchBreak, morning, afternoon? }` :
1. Validation Joi
2. Rejet **400** si `date < today`
3. SELECT settings courants
4. Rejet **409** si la date existe déjà dans `closed_dates` ou `exceptional_openings`
5. Rejet **400** si `exceptional_openings.length >= 365`
6. Génération `id = uuid()`, concat au tableau, UPDATE via `bind`
7. Écriture `audit_logs` : `action='clinic_config.exceptional_opening.added'`, hash du reason
8. Retour **201** avec le settings complet transformé

**DELETE** — paramètre `:id` :
1. SELECT settings
2. Filter out de l'entrée matching `id` (404 si non trouvé)
3. UPDATE
4. Audit log `action='clinic_config.exceptional_opening.removed'`
5. Retour **200** avec settings complet

**Permissions** : middleware existant `requirePermission('clinic-settings.write')` sur les deux routes.

**Rate limiting** : hérite du rate-limiter déjà appliqué sur `/clinic-settings/*`.

## Frontend

### `src/api/dataTransform.js`

Étendre :

- `transformClinicSettingsFromBackend` : map `exceptional_openings → exceptionalOpenings` (camelCase)
- `transformClinicSettingsToBackend` : inverse

Aucune normalisation particulière à l'import (le backend garantit la validité via Joi).

### `src/contexts/ClinicSettingsContext.js`

Ajouter 2 méthodes symétriques aux `addClosedDate`/`removeClosedDate` existantes :

```js
const addExceptionalOpening = useCallback(async (payload) => {
  await clinicSettingsApi.addExceptionalOpening(payload);
  await refresh();
}, [refresh]);

const removeExceptionalOpening = useCallback(async (id) => {
  await clinicSettingsApi.removeExceptionalOpening(id);
  await refresh();
}, [refresh]);
```

### `src/api/clinicSettingsApi.js`

Ajouter :

```js
async function addExceptionalOpening(payload) {
  const response = await baseClient.post(
    '/clinic-settings/exceptional-openings', payload);
  return dataTransform.unwrapResponse(response);
}

async function removeExceptionalOpening(id) {
  const response = await baseClient.delete(
    `/clinic-settings/exceptional-openings/${id}`);
  return dataTransform.unwrapResponse(response);
}
```

### `src/components/admin/ClinicConfigModal.js`

Nouvel onglet `openings` après l'onglet `closed` :

```jsx
<button onClick={() => setActiveTab('openings')} ...>
  <Calendar className="h-4 w-4 inline mr-2" />
  {t('admin:clinicConfiguration.tabs.openings')}
</button>
```

Contenu de l'onglet :

```
┌─ Ajouter une ouverture exceptionnelle ─────────────────┐
│  Date :       [  __/__/____  ] (min=today)             │
│  Raison :     [  (optionnel)                        ]  │
│  ☐ Pause déjeuner                                      │
│  Matin :      [ 09:00 ] → [ 12:00 ]                    │
│  Après-midi : [ 14:00 ] → [ 17:00 ]  (si pause cochée) │
│                                          [ + Ajouter ] │
└────────────────────────────────────────────────────────┘

┌─ Ouvertures configurées ───────────────────────────────┐
│ 🗓  dim 12 avril 2026  —  09:00-12:00, 14:00-17:00     │
│    "Campagne vaccination"                         [🗑] │
│ ──────────────────────────────────────────────────────│
│ 🗓  sam 18 avril 2026  —  10:00-14:00                  │
│                                                   [🗑] │
└────────────────────────────────────────────────────────┘
```

- Liste triée par date croissante
- Bouton Ajouter désactivé tant que date + horaires valides non renseignés
- Suppression avec confirmation inline (pas de modal, cohérent UX existante)
- Erreurs 409/400 affichées via le pattern `notification` existant

### i18n

Nouvelles clés dans `src/locales/{es,fr,en}/admin.json` :

| Clé | Valeur FR |
|-----|-----------|
| `clinicConfiguration.tabs.openings` | Ouvertures exceptionnelles |
| `clinicConfiguration.openings.title` | Ouvertures exceptionnelles configurées |
| `clinicConfiguration.openings.addTitle` | Ajouter une ouverture exceptionnelle |
| `clinicConfiguration.openings.date` | Date |
| `clinicConfiguration.openings.reason` | Raison |
| `clinicConfiguration.openings.reasonPlaceholder` | Raison (optionnelle) |
| `clinicConfiguration.openings.lunchBreak` | Pause déjeuner |
| `clinicConfiguration.openings.morning` | Matin |
| `clinicConfiguration.openings.afternoon` | Après-midi |
| `clinicConfiguration.openings.from` | De |
| `clinicConfiguration.openings.to` | À |
| `clinicConfiguration.openings.addButton` | Ajouter |
| `clinicConfiguration.openings.empty` | Aucune ouverture exceptionnelle configurée |
| `clinicConfiguration.openings.removeConfirm` | Supprimer cette ouverture ? |
| `clinicConfiguration.messages.openingAdded` | Ouverture exceptionnelle ajoutée |
| `clinicConfiguration.messages.openingRemoved` | Ouverture exceptionnelle supprimée |
| `clinicConfiguration.messages.openingConflict` | Une fermeture est déjà configurée à cette date |
| `clinicConfiguration.messages.openingDuplicate` | Une ouverture est déjà configurée à cette date |
| `clinicConfiguration.messages.openingLimitReached` | Limite de 365 ouvertures atteinte |
| `clinicConfiguration.messages.openingPastDate` | La date doit être aujourd'hui ou dans le futur |
| `clinicConfiguration.messages.openingAddError` | Erreur lors de l'ajout |
| `clinicConfiguration.messages.openingRemoveError` | Erreur lors de la suppression |

Mêmes clés en es/en avec traductions adaptées.

## Sécurité

| Menace | Mitigation |
|--------|-----------|
| Cross-tenant data leak | Scoping via `clinicDb` (existant) — aucun paramètre client ne cible une autre clinique |
| Escalade privilèges | RBAC `clinic-settings.write` (existant, seulement `admin`/`super_admin`) |
| XSS via `reason` | React échappe automatiquement + Joi `max(500)` + aucune injection HTML brute |
| SQL injection | Sequelize `query({ bind })` paramétré (pattern déjà utilisé pour `closed_dates`) |
| DoS via array gigantesque | Limite 365 entrées validée côté Joi + rejet 400 |
| Manipulation rétroactive | Rejet dates passées côté Joi + vérification serveur |
| Non-traçabilité (RGPD/DPIA) | Audit logs sur add et remove avec `user_id`, `clinic_id`, `date` |
| Log de données sensibles | `reason` hashé dans l'audit log, pas stocké en clair |
| CSRF | JWT auth (existant) |

Aucune nouvelle permission à créer. Aucun nouveau mécanisme d'auth. Pas de nouveau point d'entrée externe.

## Tests

### Backend

`tests/services/planningService.test.js` — priorité du résolveur :
- Date ∈ `closed_dates` → `null` même si aussi dans `exceptional_openings`
- Date ∈ `exceptional_openings` + jour ∉ `operating_days` → retourne horaires de l'exception
- Date absente des deux + jour ∈ `operating_days` → comportement existant (non-régression)
- `hasLunchBreak=true` → 2 ranges
- `hasLunchBreak=false` → 1 range (morning)

`tests/routes/clinicSettings.test.js` — endpoints :
- `POST` : 201 happy, 409 date dupliquée avec `closed_dates`, 409 dupliquée avec `exceptional_openings`, 400 date passée, 400 horaires invalides, 400 limite 365, 403 sans permission
- `DELETE` : 200 happy, 404 id inconnu, 403 sans permission
- Tenant isolation : `DELETE` d'un id d'une autre clinique → 404

`tests/services/availabilityService.test.js` + `chainSubstitutionService.test.js` — non-régression après passage par `getClinicHoursRanges`.

### Frontend

`src/components/admin/ClinicConfigModal.test.js` :
- Onglet `openings` affiche la liste
- Ajout valide → appel `addExceptionalOpening` + reset formulaire
- Suppression → confirmation + appel `removeExceptionalOpening`
- Erreur 409 affichée en notification
- Date passée désactivée dans le date picker
- Toggle lunch break cache/affiche l'après-midi

`src/contexts/ClinicSettingsContext.test.js` :
- `addExceptionalOpening` met à jour l'état après succès API
- `removeExceptionalOpening` retire de la liste
- `updateSettings` inclut `exceptionalOpenings` dans le payload

### Couverture cible

- **80% branches** sur `planningService.getClinicHoursRanges()`
- **80% lines** sur nouvelles routes `/exceptional-openings`
- **Non-régression** : aucun test existant ne doit casser

### Tests manuels pre-deploy (staging)

1. Admin ajoute dim 12/04 10h-14h → sauvegarde OK
2. Modal RDV sur dim 12/04 → créneaux 10h-14h visibles
3. Tente d'ajouter la même date → 409 affiché
4. Tente d'ajouter date passée → bouton désactivé / 400
5. Supprime l'entrée → créneaux disparaissent sans refresh (valide le contexte)
6. Ajoute date présente dans `closed_dates` → 409
7. Sur une autre clinique, l'exception n'apparaît pas (tenant isolation)
8. Vérif `audit_logs` : 2 entrées (add + remove)

## Documentation à mettre à jour

- **`CLAUDE.md` (mémoire projet)** :
  - Ajouter la liste de migrations : `clinic_NNN_add_exceptional_openings` dans `run-clinic-migrations.js` ET `clinicProvisioningService.js`
  - Mention du nouveau comportement du résolveur d'horaires (priorité à 4 niveaux)
- **Documentation utilisateur (si existante)** : expliquer la différence entre `closed_dates` (fermeture exceptionnelle) et `exceptional_openings` (ouverture exceptionnelle)
- **Docstrings JSDoc** sur `getClinicHoursRanges` : documenter explicitement l'ordre de priorité
- **`docs/security/DPIA_MEDIMaestro.md`** : ajouter une ligne dans le registre des traitements si un nouveau risque est identifié (a priori non — on reste dans le scope "configuration clinique" existant)

## Hors scope

- **Spec B — Admin édite les dispos d'un praticien** (task #14) : traité dans une spec séparée
- **Patterns récurrents** (ex: "tous les 1ers samedis du mois") : YAGNI, l'admin peut créer plusieurs entrées à la main
- **Tests E2E Playwright** : mentionnés comme TODO général dans CLAUDE.md, à faire quand l'infra E2E est en place
- **Perf tests** : feature low-traffic, non pertinent
- **Migration de données existantes** : aucune — le champ démarre vide

## Rollout

### Ordre de déploiement

1. **Backend d'abord** (rétrocompatible) :
   - Migration DB : `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
   - Code backend (nouvelles routes, résolveur étendu)
   - Déploiement prod — anciens frontends continuent de fonctionner (champ ignoré)
2. **Frontend ensuite** :
   - Context + API client + UI onglet
   - Déploiement prod — nouvelle UI utilisable

### Rollback

- **Backend** : revert du code + la colonne reste en DB (sans effet si le code ne la lit pas)
- **Frontend** : revert du code ; les données en DB restent intactes
- **DB** : aucun `DROP COLUMN` nécessaire en rollback (safe par défaut)

## Critères d'acceptation (Definition of Done)

- [ ] Migration appliquée sur prod et toutes cliniques provisionnées
- [ ] POST/DELETE `/exceptional-openings` retournent 201/200 happy path
- [ ] Tous les codes d'erreur (400, 403, 404, 409) couverts par tests
- [ ] Résolveur d'horaires respecte la priorité à 4 niveaux
- [ ] UI onglet `openings` fonctionnelle et traduite es/fr/en
- [ ] Propagation sans refresh validée (context → consommateurs)
- [ ] Audit logs confirmés pour add/remove
- [ ] Non-régression : suite de tests existants passe intégralement
- [ ] Documentation CLAUDE.md mise à jour
- [ ] Tests manuels staging validés (8 scénarios)
