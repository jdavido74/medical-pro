# Test du SettingsModule - Guide Étape par Étape

## Prérequis ✅

- Backend running sur http://localhost:3001 ✅
- Frontend running sur http://localhost:3000 ✅
- Utilisateur connecté : josedavid.orts@gmail.com

---

## Étape 1 : Ouvrir l'Application

1. **Ouvrir le navigateur** : http://localhost:3000
2. **Se connecter** avec :
   - Email : `josedavid.orts@gmail.com`
   - Mot de passe : `Vistule94!`

---

## Étape 2 : Vérifier le Chargement Initial

### Dans le Navigateur :

1. **Ouvrir la Console** (F12)
2. **Aller dans Settings** (menu latéral)
3. **Chercher dans la console** :
   ```
   [SettingsModule] Loading facility data...
   [SettingsModule] Facility data loaded: { ... }
   ```

### Vérifier les Données Chargées :

Dans l'onglet **"Company"**, vous devriez voir :
- **Nom de l'entreprise** : "Ozon B" (ou le nom actuel)
- **Téléphone** : "+33680110797"
- **Adresse** : (vide si pas encore renseigné)
- **Code postal** : (vide si pas encore renseigné)
- **Ville** : (vide si pas encore renseigné)
- **Pays** : "FR"

---

## Étape 3 : Modifier les Données

### Dans l'onglet "Company" :

1. **Modifier le nom** : "Cabinet Médical Test"
2. **Modifier le téléphone** : "+33123456789"
3. **Ajouter une adresse** : "123 Rue de la Santé"
4. **Ajouter un code postal** : "75014"
5. **Ajouter une ville** : "Paris"
6. **Changer le pays** : Laisser "France"

### Cliquer sur "Sauvegarder"

---

## Étape 4 : Vérifier la Sauvegarde

### Console Navigateur :

Devrait afficher :
```
[SettingsModule] Updating facility with: {
  name: "Cabinet Médical Test",
  phone: "+33123456789",
  address: "123 Rue de la Santé",
  addressLine1: "123 Rue de la Santé",
  postalCode: "75014",
  city: "Paris",
  country: "France"
}
```

Puis :
```
✅ Informations entreprise sauvegardées avec succès !
```

### Vérifier dans les Logs Backend :

```bash
tail -20 /tmp/medicalpro-backend.log | grep -E "(facilities|PUT)"
```

Devrait afficher :
```
[facilities] Updating facility...
PUT /api/v1/facilities/current - 200
```

---

## Étape 5 : Vérifier la Persistance

1. **Recharger la page** (F5)
2. **Se reconnecter** si nécessaire
3. **Aller dans Settings → Company**
4. **Vérifier que les données sont toujours là** :
   - Nom : "Cabinet Médical Test"
   - Téléphone : "+33123456789"
   - Adresse : "123 Rue de la Santé"
   - Etc.

---

## Étape 6 : Vérifier dans la Base de Données

```bash
PGPASSWORD=medicalpro2024 psql -h localhost -U medicalpro \
  -d medicalpro_clinic_2f8e96fd_963a_4d19_9b63_8bc94dd46c10 \
  -c "SELECT name, phone, address_line1, postal_code, city, country
      FROM medical_facilities
      WHERE id = '2f8e96fd-963a-4d19-9b63-8bc94dd46c10';"
```

**Résultat attendu** :
```
           name           |     phone      |    address_line1      | postal_code |  city  | country
--------------------------+----------------+-----------------------+-------------+--------+---------
 Cabinet Médical Test     | +33123456789   | 123 Rue de la Santé   | 75014       | Paris  | FR
```

---

## Troubleshooting

### Erreur : "Failed to fetch facility"

**Cause** : Backend non accessible ou erreur d'authentification

**Solution** :
1. Vérifier que le backend tourne : `curl http://localhost:3001/health`
2. Vérifier le token JWT dans localStorage
3. Vérifier les logs : `tail -f /tmp/medicalpro-backend.log`

### Erreur : "Validation Error"

**Cause** : Données invalides

**Solution** :
1. Vérifier la console pour voir le détail
2. S'assurer que le téléphone commence par "+"
3. S'assurer que le code postal est valide

### Les données ne se chargent pas

**Cause** : Erreur de transformation ou API

**Solution** :
1. Ouvrir la console (F12)
2. Chercher les erreurs
3. Vérifier le Network tab → Voir la réponse de `/facilities/current`

---

## Commandes de Débogage

### Voir les logs backend en temps réel :
```bash
tail -f /tmp/medicalpro-backend.log
```

### Voir les logs frontend en temps réel :
```bash
tail -f /tmp/medicalpro.log
```

### Tester l'API directement :
```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"josedavid.orts@gmail.com","password":"Vistule94!"}' \
  | jq -r '.data.tokens.accessToken')

# 2. GET facility
curl -s -X GET http://localhost:3001/api/v1/facilities/current \
  -H "Authorization: Bearer $TOKEN" | jq

# 3. PUT facility
curl -s -X PUT http://localhost:3001/api/v1/facilities/current \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test via cURL",
    "phone": "+33999999999",
    "address_line1": "Test Address",
    "postal_code": "12345",
    "city": "Test City",
    "country": "FR"
  }' | jq
```

---

## Résultat Attendu

✅ Chargement automatique des données depuis la base
✅ Modification des données dans le formulaire
✅ Sauvegarde via l'API backend
✅ Persistance des données (visible après rechargement)
✅ Logs détaillés dans la console
✅ Données visibles dans la base de données
