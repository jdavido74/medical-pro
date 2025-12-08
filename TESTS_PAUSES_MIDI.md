# Tests critiques - Pauses du midi

## ⚠️ IMPORTANT
Ces tests DOIVENT être effectués avant de considérer la fonctionnalité comme terminée.

---

## 📋 Tests Frontend

### Test 1 : Chargement avec données existantes (sans hasLunchBreak)
**Objectif** : Vérifier la rétrocompatibilité

**Étapes** :
1. Ouvrir Admin → Configuration de la clinique
2. Cliquer sur "Configurer la clinique"
3. Aller sur l'onglet "Horaires d'ouverture"

**Résultat attendu** :
- ✅ Les jours s'affichent correctement
- ✅ Case "Pause du midi" est DÉCOCHÉE par défaut
- ✅ Affichage d'une seule ligne : "De: 08:00 À: 18:00"
- ✅ Les horaires existants sont conservés

**En cas d'erreur** :
```
Cannot read properties of undefined (reading 'start')
→ Vérifier ligne 340 dans ClinicConfigModal.js
```

---

### Test 2 : Activation de la pause du midi
**Étapes** :
1. Cocher la case "Pause du midi" pour Lundi
2. Observer l'interface

**Résultat attendu** :
- ✅ Interface change immédiatement (synchrone)
- ✅ Affichage de 2 lignes :
  - Matin: De: 08:00 À: 12:00
  - Après-midi: De: 14:00 À: 18:00
- ✅ Les horaires sont pré-remplis intelligemment
  - Morning start = ancien start (8h00)
  - Morning end = 12h00
  - Afternoon start = 14h00
  - Afternoon end = ancien end (18h00)

**En cas d'erreur** :
```
TypeError: Cannot read properties of undefined
→ Vérifier updateOperatingHours ligne 86-109
```

---

### Test 3 : Modification des horaires avec pause
**Étapes** :
1. Avec "Pause du midi" cochée
2. Modifier "Matin De:" à 09:00
3. Modifier "Après-midi À:" à 19:00

**Résultat attendu** :
- ✅ Les champs se mettent à jour
- ✅ Pas d'erreur console

**En cas d'erreur** :
```
Cannot update nested property
→ Vérifier updateOperatingHours ligne 67-82 (champs imbriqués)
```

---

### Test 4 : Sauvegarde avec pause du midi
**Étapes** :
1. Configurer Lundi avec pause (8h-12h / 14h-18h)
2. Cliquer sur "Sauvegarder"
3. Observer la console réseau (F12 → Network)

**Résultat attendu** :
- ✅ Requête PUT vers `/api/v1/clinic-settings`
- ✅ Payload contient :
```json
{
  "operating_days": [1, 2, 3, 4, 5],
  "operating_hours": {
    "monday": {
      "enabled": true,
      "hasLunchBreak": true,
      "morning": {"start": "08:00", "end": "12:00"},
      "afternoon": {"start": "14:00", "end": "18:00"}
    }
  }
}
```
- ✅ Réponse 200 OK
- ✅ Notification de succès affichée
- ✅ Modal reste ouvert sur le même onglet

**En cas d'erreur** :
```json
{
  "error": {
    "message": "Validation Error",
    "details": "\"start\" is not allowed"
  }
}
```
→ Le backend a rejeté car présence de `start` alors que `hasLunchBreak=true`
→ Vérifier updateOperatingHours ligne 100-101 (delete start/end)

---

### Test 5 : Désactivation de la pause
**Étapes** :
1. Partir d'un jour AVEC pause (8h-12h / 14h-18h)
2. Décocher "Pause du midi"

**Résultat attendu** :
- ✅ Interface change → Une seule ligne
- ✅ Horaires conservés :
  - De: 08:00 (= morning.start)
  - À: 18:00 (= afternoon.end)

**En cas d'erreur** :
```
Horaires réinitialisés à 08:00-18:00
→ Vérifier ligne 104-105 (conservation des horaires)
```

---

### Test 6 : Rechargement après sauvegarde
**Étapes** :
1. Sauvegarder une config avec pause
2. Fermer le modal
3. Rouvrir le modal
4. Aller sur "Horaires d'ouverture"

**Résultat attendu** :
- ✅ Case "Pause du midi" COCHÉE
- ✅ Horaires matin/après-midi affichés correctement
- ✅ Données persistent

**En cas d'erreur** :
```
Pause du midi décochée après rechargement
→ Problème de sauvegarde backend ou de chargement
```

---

## 🔧 Tests Backend

### Test 7 : Validation backend - Structure avec pause
**Commande** :
```bash
curl -X PUT http://localhost:3001/api/v1/clinic-settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operating_hours": {
      "monday": {
        "enabled": true,
        "hasLunchBreak": true,
        "morning": {"start": "08:00", "end": "12:00"},
        "afternoon": {"start": "14:00", "end": "18:00"}
      }
    }
  }'
```

**Résultat attendu** :
- ✅ Réponse 200 OK
- ✅ Données sauvegardées

---

### Test 8 : Validation backend - Structure sans pause
**Commande** :
```bash
curl -X PUT http://localhost:3001/api/v1/clinic-settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operating_hours": {
      "monday": {
        "enabled": true,
        "hasLunchBreak": false,
        "start": "08:00",
        "end": "18:00"
      }
    }
  }'
```

**Résultat attendu** :
- ✅ Réponse 200 OK
- ✅ Données sauvegardées

---

### Test 9 : Validation backend - Structure mixte (DOIT ÉCHOUER)
**Commande** :
```bash
curl -X PUT http://localhost:3001/api/v1/clinic-settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operating_hours": {
      "monday": {
        "enabled": true,
        "hasLunchBreak": true,
        "start": "08:00",
        "morning": {"start": "08:00", "end": "12:00"}
      }
    }
  }'
```

**Résultat attendu** :
- ✅ Réponse 400 Bad Request
- ✅ Message : `"start" is not allowed` ou `"morning" is required`

---

## 📅 Tests Rendez-vous

### Test 10 : Génération de créneaux avec pause
**Étapes** :
1. Configurer Lundi avec pause (8h-12h / 14h-18h)
2. Aller dans Rendez-vous → Nouveau rendez-vous
3. Sélectionner la date (un lundi)
4. Observer les créneaux proposés

**Résultat attendu** :
- ✅ Créneaux de 08:00 à 12:00 (par pas de 30 min)
- ✅ PAS de créneaux entre 12:00 et 14:00 ❌
- ✅ Créneaux de 14:00 à 18:00 (par pas de 30 min)

**En cas d'erreur** :
```
Créneaux affichés pendant la pause (12:00-14:00)
→ Vérifier getAvailableSlots() dans clinicConfigStorage.js
```

---

### Test 11 : Génération de créneaux sans pause
**Étapes** :
1. Configurer Samedi sans pause (9h-13h)
2. Sélectionner un samedi
3. Observer les créneaux

**Résultat attendu** :
- ✅ Créneaux continus de 09:00 à 13:00
- ✅ Pas de trou dans les créneaux

---

### Test 12 : Vérification isClinicOpen pendant la pause
**Test programmatique** (dans console navigateur) :
```javascript
import { clinicConfigStorage } from './utils/clinicConfigStorage';

// Tester avec un lundi avec pause (8h-12h / 14h-18h)
clinicConfigStorage.isClinicOpen('2025-12-08', '10:00'); // true (matin)
clinicConfigStorage.isClinicOpen('2025-12-08', '12:30'); // false (pause)
clinicConfigStorage.isClinicOpen('2025-12-08', '15:00'); // true (après-midi)
```

---

## 🗄️ Tests Base de données

### Test 13 : Vérifier la migration
**Commande** :
```bash
PGPASSWORD=medicalpro2024 psql -h localhost -U medicalpro -d medicalpro_clinic_<UUID> -c "
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'clinic_settings'
  AND column_name = 'operating_days';
"
```

**Résultat attendu** :
```
 column_name    | data_type
----------------+-----------
 operating_days | jsonb
```

---

### Test 14 : Vérifier les données sauvegardées
**Commande** :
```bash
PGPASSWORD=medicalpro2024 psql -h localhost -U medicalpro -d medicalpro_clinic_<UUID> -c "
  SELECT operating_days, operating_hours
  FROM clinic_settings
  LIMIT 1;
"
```

**Résultat attendu** :
- `operating_days`: `[1, 2, 3, 4, 5]`
- `operating_hours`: Structure JSON avec `hasLunchBreak`, etc.

---

## 🚨 Erreurs connues à surveiller

### Erreur 1 : "Cannot read properties of undefined"
**Cause** : Données backend ne contiennent pas `hasLunchBreak`
**Solution** : Ajouter `?? false` partout où on lit `hasLunchBreak`

### Erreur 2 : Validation Error "start is not allowed"
**Cause** : On envoie `start` alors que `hasLunchBreak=true`
**Solution** : Vérifier que `updateOperatingHours` supprime bien `start`/`end`

### Erreur 3 : Créneaux pendant la pause
**Cause** : `getAvailableSlots()` ne respecte pas `hasLunchBreak`
**Solution** : Vérifier la logique lignes 224-272 dans `clinicConfigStorage.js`

### Erreur 4 : Horaires non conservés lors du basculement
**Cause** : Mauvaise récupération des valeurs dans `updateOperatingHours`
**Solution** : Vérifier lignes 91-98 et 104-105

---

## ✅ Checklist finale

- [ ] Test 1 : Chargement données existantes
- [ ] Test 2 : Activation pause
- [ ] Test 3 : Modification horaires
- [ ] Test 4 : Sauvegarde
- [ ] Test 5 : Désactivation pause
- [ ] Test 6 : Persistence après rechargement
- [ ] Test 7-9 : Validation backend
- [ ] Test 10-11 : Créneaux rendez-vous
- [ ] Test 12 : Vérification isClinicOpen
- [ ] Test 13-14 : Base de données

**Tous les tests doivent être ✅ avant de considérer la fonctionnalité comme terminée.**
