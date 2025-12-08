# Fonctionnalité : Gestion des Pauses du Midi

## 📋 Vue d'ensemble

Cette fonctionnalité permet de configurer les horaires d'ouverture de la clinique avec ou sans pause du midi. Chaque jour peut avoir :
- **Une seule plage horaire** (ex: 8h00 - 18h00 sans pause)
- **Deux plages horaires** (matin + après-midi avec pause du midi)

## 🏗️ Architecture

### Structure des données

```javascript
operatingHours: {
  monday: {
    enabled: true,
    hasLunchBreak: true,  // Case à cocher "Pause du midi"
    // Si hasLunchBreak = true:
    morning: { start: '08:00', end: '12:00' },
    afternoon: { start: '14:00', end: '18:00' },
    // Si hasLunchBreak = false:
    start: '08:00',
    end: '18:00'
  }
}
```

## 🎯 Modifications apportées

### 1. Frontend (`/var/www/medical-pro`)

#### ✅ `src/utils/clinicConfigStorage.js`
- **Structure par défaut** : Modifiée pour inclure `hasLunchBreak`, `morning`, `afternoon`
- **Fonction `isClinicOpen()`** : Mise à jour pour vérifier les créneaux matin/après-midi
- **Fonction `getAvailableSlots()`** : Génère les créneaux en respectant les pauses
  - Créneaux du matin : `morning.start` → `morning.end`
  - Créneaux de l'après-midi : `afternoon.start` → `afternoon.end`
  - Indicateur `period`: 'morning', 'afternoon', ou 'full'

#### ✅ `src/components/admin/ClinicConfigModal.js`
- **Interface utilisateur** :
  - Case à cocher "Pause du midi" pour chaque jour
  - Affichage conditionnel :
    - **Avec pause** : 2 lignes (Matin / Après-midi) avec 4 champs de temps
    - **Sans pause** : 1 ligne avec 2 champs de temps (De / À)

- **Fonction `updateOperatingHours()`** :
  - Gère les champs imbriqués (`morning.start`, `afternoon.end`)
  - Transition automatique entre les deux modes
  - Conservation des horaires lors du basculement

#### ✅ `src/api/dataTransform.js`
- **`transformClinicSettingsFromBackend()`** : Charge `operating_days` depuis le backend
- **`transformClinicSettingsToBackend()`** : Envoie `operating_days` au backend
- **Support JSONB** : Structure flexible pour `operatingHours`

### 2. Backend (`/var/www/medical-pro-backend`)

#### ✅ `src/base/clinicConfigSchemas.js`
- **Schéma `timeRangeSchema`** : Validation des plages horaires (matin/après-midi)
- **Schéma `operatingHoursSchema`** :
  - Validation conditionnelle selon `hasLunchBreak`
  - `hasLunchBreak = false` : `start` et `end` requis
  - `hasLunchBreak = true` : `morning` et `afternoon` requis
  - Utilise `.forbidden()` pour empêcher les structures mixtes

- **Champ `operating_days`** :
  - Tableau d'entiers (0-6)
  - 0 = Dimanche, 1 = Lundi, ..., 6 = Samedi
  - Valeur par défaut : `[1, 2, 3, 4, 5]` (lundi-vendredi)

#### ✅ `migrations/014_add_operating_days_and_lunch_breaks.sql`
- **Nouveau champ** : `operating_days JSONB`
- **Rétrocompatibilité** : JSONB supporte les deux structures
- **Par défaut** : Lundi à vendredi `[1, 2, 3, 4, 5]`

### 3. Base de données

#### Table `clinic_settings`
```sql
CREATE TABLE clinic_settings (
    id UUID PRIMARY KEY,
    facility_id UUID UNIQUE NOT NULL,

    operating_days JSONB DEFAULT '[1, 2, 3, 4, 5]'::jsonb,
    operating_hours JSONB DEFAULT '{...}'::jsonb,

    -- Structure JSONB flexible pour operating_hours:
    -- Peut contenir hasLunchBreak, morning, afternoon
    -- ou start, end selon la configuration
)
```

## 🔄 Flux de données

### Configuration
1. **Utilisateur** : Coche/décoche "Pause du midi" pour un jour
2. **Frontend** : `updateOperatingHours()` transforme la structure
   - Active : Crée `morning` et `afternoon`, supprime `start`/`end`
   - Désactive : Crée `start` et `end`, supprime `morning`/`afternoon`
3. **Sauvegarde** : `clinicSettingsApi.updateClinicSettings()`
4. **Backend** : Validation via `updateClinicSettingsSchema`
5. **Database** : Stockage dans `operating_hours` (JSONB)

### Génération de créneaux
1. **`getAvailableSlots(date)`** vérifie `hasLunchBreak`
2. **Avec pause** :
   - Génère créneaux de `morning.start` à `morning.end`
   - Génère créneaux de `afternoon.start` à `afternoon.end`
3. **Sans pause** :
   - Génère créneaux de `start` à `end`
4. **Résultat** : Tableau de créneaux avec `period` indicator

### Vérification de disponibilité
1. **`isClinicOpen(date, time)`** vérifie `hasLunchBreak`
2. **Avec pause** :
   - Vérifie si temps dans `morning` OU `afternoon`
3. **Sans pause** :
   - Vérifie si temps entre `start` et `end`

## 📝 Validation Backend (Joi)

```javascript
// Si hasLunchBreak = false
{
  enabled: true,
  hasLunchBreak: false,
  start: "08:00",      // REQUIS
  end: "18:00",        // REQUIS
  morning: undefined,  // INTERDIT (forbidden)
  afternoon: undefined // INTERDIT (forbidden)
}

// Si hasLunchBreak = true
{
  enabled: true,
  hasLunchBreak: true,
  morning: { start: "08:00", end: "12:00" },    // REQUIS
  afternoon: { start: "14:00", end: "18:00" },  // REQUIS
  start: undefined,    // INTERDIT (forbidden)
  end: undefined       // INTERDIT (forbidden)
}
```

## 🧪 Tests recommandés

### Frontend
1. ✅ Activer "Pause du midi" → Affichage de 2 lignes (matin/après-midi)
2. ✅ Désactiver "Pause du midi" → Affichage d'1 ligne (de/à)
3. ✅ Modifier horaires matin → Sauvegarde correcte
4. ✅ Modifier horaires après-midi → Sauvegarde correcte
5. ✅ Passer de pause à sans pause → Conservation des horaires
6. ✅ Jours fermés → Pas d'affichage des horaires

### Backend
1. ✅ Envoyer structure avec `hasLunchBreak: true` + `morning`/`afternoon` → Accepté
2. ✅ Envoyer structure avec `hasLunchBreak: false` + `start`/`end` → Accepté
3. ✅ Envoyer structure mixte → Rejeté (400 Validation Error)
4. ✅ `operating_days` avec valeurs 0-6 → Accepté
5. ✅ `operating_days` avec valeurs invalides → Rejeté

### Génération de créneaux
1. ✅ Avec pause → Créneaux matin + après-midi (pas de créneaux pendant la pause)
2. ✅ Sans pause → Créneaux continus
3. ✅ Jour fermé → Aucun créneau

## 🔍 Points de vérification

### ✅ Complété
- [x] Structure de données définie
- [x] Frontend : Interface utilisateur avec case à cocher
- [x] Frontend : Logique de basculement entre modes
- [x] Frontend : Génération de créneaux respectant les pauses
- [x] Backend : Schémas de validation Joi
- [x] Backend : Migration base de données
- [x] Transformation des données (dataTransform)
- [x] Validation conditionnelle (Joi .when())
- [x] Rétrocompatibilité JSONB

### ⚠️ À tester
- [ ] Test manuel de l'interface
- [ ] Test de sauvegarde avec pause
- [ ] Test de sauvegarde sans pause
- [ ] Test de génération de créneaux
- [ ] Test de vérification de disponibilité
- [ ] Test de création de rendez-vous respectant les pauses

## 📚 Fichiers modifiés

### Frontend
- `src/utils/clinicConfigStorage.js` (structure, slots, validation)
- `src/components/admin/ClinicConfigModal.js` (UI, gestion état)
- `src/api/dataTransform.js` (transformation données)

### Backend
- `src/base/clinicConfigSchemas.js` (validation Joi)
- `migrations/014_add_operating_days_and_lunch_breaks.sql` (BDD)

## 🚀 Déploiement

### 1. Appliquer la migration
```bash
psql -h localhost -U medicalpro -d medicalpro_clinic_<UUID> -f migrations/014_add_operating_days_and_lunch_breaks.sql
```

### 2. Redémarrer le backend
```bash
cd /var/www/medical-pro-backend
npm restart
```

### 3. Vérifier le frontend
- Ouvrir la configuration de clinique
- Tester l'activation/désactivation de "Pause du midi"
- Sauvegarder et vérifier la persistence

## 💡 Notes importantes

1. **Rétrocompatibilité** : Les anciennes configurations sans `hasLunchBreak` continuent de fonctionner (valeur par défaut : `false`)

2. **Validation stricte** : Impossible d'avoir à la fois `start`/`end` ET `morning`/`afternoon`

3. **Créneaux** : L'attribut `period` permet de filtrer/grouper les créneaux par période

4. **Migration** : Pas besoin de migrer les données existantes, JSONB est flexible

5. **Interface** : La transition entre modes préserve les horaires existants
