# Workflow des rendez-vous - Machine d'état et actions rapides

## Machine d'état des rendez-vous

Chaque rendez-vous suit un cycle de vie strict avec 6 statuts possibles et des transitions autorisees.

### Statuts

| Statut | Type | Description |
|---|---|---|
| `scheduled` | Initial | Rendez-vous programme, en attente de confirmation |
| `confirmed` | Intermediaire | Confirme par le patient ou le praticien |
| `in_progress` | Intermediaire | Soin/consultation en cours |
| `completed` | Terminal | Termine avec succes |
| `cancelled` | Terminal | Annule (par le patient ou la clinique) |
| `no_show` | Terminal | Patient absent, non presente |

### Transitions autorisees

```
scheduled ──────► confirmed ──────► in_progress ──────► completed
    │                 │                   │
    │                 │                   └──► cancelled
    │                 │
    │                 ├──► completed  (raccourci : soin deja fait)
    │                 ├──► cancelled
    │                 └──► no_show
    │
    ├──► in_progress  (demarrage direct)
    ├──► cancelled
    └──► no_show
```

### Regles

- Les etats **terminaux** (`completed`, `cancelled`, `no_show`) n'ont pas de transition sortante.
- `confirmed` peut transitionner directement vers `completed` pour les cas ou le soin est deja effectue sans passer par `in_progress`.
- Toute transition vers `cancelled` ou `no_show` annule automatiquement les actions programmees (rappels, consentement, etc.).

---

## Boutons d'action rapide (vue Liste)

Dans la vue **Liste** du module Planification, chaque ligne affiche des boutons d'action directement visibles (sans menu deroulant) permettant de faire avancer le rendez-vous dans son cycle de vie.

### Regles d'affichage par statut

| Statut actuel | Bouton principal (plein) | Boutons secondaires (outline) |
|---|---|---|
| **scheduled** | `Confirmer` (vert) | `Absent` (orange) - `Annuler` (rouge) |
| **confirmed** | `Termine` (vert) | `Demarrer` (bleu) - `Absent` (orange) - `Annuler` (rouge) |
| **in_progress** | `Termine` (vert) | `Annuler` (rouge) |
| **completed** | aucun | aucun |
| **cancelled** | aucun | aucun |
| **no_show** | aucun | aucun |

### Design des boutons

- **Bouton principal** : fond plein couleur (`bg-green-600 text-white`), action la plus courante
- **Boutons secondaires** : bordure fine + texte couleur (`border border-orange-300 text-orange-600`), actions moins frequentes
- Les etats terminaux n'affichent aucun bouton d'action
- Le menu `...` (MoreHorizontal) reste present pour les actions secondaires : voir details, envoyer consentement, supprimer

### Traductions des boutons

| Cle i18n | FR | EN | ES |
|---|---|---|---|
| `actions.confirm` | Confirmer | Confirm | Confirmar |
| `actions.completed` | Termine | Completed | Terminado |
| `actions.start` | Demarrer | Start | Iniciar |
| `actions.noShow` | Absent | No show | Ausente |
| `actions.cancel` | Annuler | Cancel | Cancelar |

---

## Actions automatiques (backend)

La machine d'etat backend declenche des actions automatiques lors de certaines transitions :

| Transition | Action declenchee | Type |
|---|---|---|
| `scheduled` (24h avant) | Envoi email de confirmation | Programmee |
| → `confirmed` | Envoi consentement | Automatique |
| → `confirmed` | Envoi devis | Automatique (necessite validation) |
| → `completed` | Preparation facture | Automatique (necessite validation) |
| → `cancelled` / `no_show` | Annulation des actions en attente | Automatique |

---

## Fichiers concernes

| Fichier | Role |
|---|---|
| `src/components/dashboard/modules/PlanningModule.js` | UI liste + boutons d'action rapide |
| `src/locales/{fr,en,es}/planning.json` | Traductions des boutons et statuts |
| `src/api/planningApi.js` | API `updateAppointment(id, { status })` |
| Backend: `src/services/appointmentStateMachineService.js` | Machine d'etat + transitions + actions auto |
| Backend: `src/routes/planning.js` | Route PUT `/appointments/:id` |

---

## Configuration des traitements sans machine

Les traitements marques `is_overlappable = true` (toggle "Ne necessite pas de machine" dans le catalogue) :
- N'exigent pas de `machineId` lors de la creation du rendez-vous
- Generent des creneaux bases uniquement sur les horaires de la clinique
- Peuvent se chevaucher avec d'autres rendez-vous sur la meme plage horaire

Le toggle est configurable dans **Catalogue > onglet Attributs** pour les types `treatment` et `service`.
