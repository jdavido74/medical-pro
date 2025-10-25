# Guide de test - Nouvelles fonctionnalités Rendez-vous

## 🚀 Démarrage rapide

### 1. Vérifier que le serveur tourne
```bash
# Le serveur devrait être sur http://localhost:3000
# Si pas démarré:
npm start
```

### 2. Accéder à l'application
- URL: http://localhost:3000
- Login avec un compte (demo ou your-email)

---

## 🧪 Test 1: Créer un rendez-vous avec un nouveau patient (flux complet)

### Étapes
1. **Allez à "Rendez-vous"** (menu principal)
2. **Clic sur "Nouveau rendez-vous"** (bouton vert en haut à droite)
3. **Modal "Nouveau rendez-vous" s'ouvre**

### Test 3a: Recherche d'un patient existant
1. Dans le champ "Patient", commencez à taper un nom existant (ex: "María" si données de démo)
2. **✓ Vous devez voir** l'autocomplétion afficher les patients correspondants
3. Cliquez sur un patient pour le sélectionner
4. **✓ La recherche se referme et affiche le patient sélectionné** dans un badge bleu

### Test 3b: Créer un nouveau patient depuis la recherche
1. Dans le champ "Patient", tapez un nom **qui n'existe pas** (ex: "Alexis Martin")
2. Attendez 1 seconde - aucun résultat ne doit s'afficher
3. **✓ Un bouton "Créer nouveau patient" doit apparaître** en bas du dropdown
4. **Clic sur "Créer nouveau patient"**
   - **✓ Une modal "Nouveau patient rapide" s'ouvre**
   - **✓ Les champs "Prénom" et "Nom" sont pré-remplis** avec votre recherche

### Test 4: Remplir le formulaire du nouveau patient
1. La modal est ouverte avec:
   - Prénom: "Alexis" (pré-rempli)
   - Nom: "Martin" (pré-rempli)

2. **Remplissez les champs optionnels:**
   - Email: "alexis.martin@email.com"
   - Téléphone: "+33612345678"

3. **Cliquez "Créer"**
   - **✓ Pas d'erreur, le patient est créé**
   - **✓ La modal se ferme automatiquement**
   - **✓ Retour à la modal de rendez-vous**
   - **✓ Le nouveau patient est automatiquement sélectionné** (visible dans le badge bleu)

### Test 5: Compléter le rendez-vous
1. Vous êtes maintenant dans la modal de rendez-vous avec le patient créé
2. **Remplissez les champs restants:**
   - Praticien: Sélectionnez un médecin
   - Type: Consultation générale
   - Titre: "Première visite"
   - Date: Choisissez une date future
   - Heure: Sélectionnez un créneau disponible

3. **Cliquez "Créer"**
   - **✓ Le rendez-vous est créé**
   - **✓ Vous êtes redirigé à la liste des rendez-vous**
   - **✓ Le nouveau rendez-vous apparaît dans la liste**

---

## 🧪 Test 2: Test de détection de doublon

### Étapes
1. Allez à "Rendez-vous" → "Nouveau rendez-vous"
2. Dans le champ Patient, tapez un nom d'un patient déjà existant (ex: "María García")
3. **✓ Les patients trouvés s'affichent dans le dropdown**
4. **Sans sélectionner**, continuez en tapant un autre nom très proche (ex: "maria garcia" avec accent différent)
5. Ouvrez "Créer nouveau patient"
6. Dans la modal, les champs sont pré-remplis
7. **✓ Un avertissement ORANGE s'affiche** en haut de la modal:
   - "Un patient portant le nom 'María García' existe déjà"
   - "Vérifiez que vous ne créez pas un doublon"
8. Si vous cliquez "Créer" malgré l'avertissement:
   - **✓ Une confirmation JavaScript s'affiche**
   - "Un patient 'María García' existe déjà. Êtes-vous sûr ?"

---

## 🏠 Test 3: Widget "Fiches patients à compléter" sur l'accueil

### Étapes
1. **Créez un nouveau patient** (Test 1) ou plusieurs (répétez le test)
2. **Allez à la page d'accueil** (Dashboard → Home)
3. **Regardez après la section "Actions rapides"**

### Vérifications
- **✓ Un widget ORANGE "Fiches patients à compléter" s'affiche**
- **✓ Le compteur montre le nombre de patients incomplets** (ex: "3")
- **✓ Les noms des patients créés s'affichent** avec leur contact
- **✓ Chaque patient a un bouton "Compléter"**

### Test du bouton Compléter
1. Cliquez "Compléter" sur un patient
2. **✓ Redirection vers "Patients" (PatientsModule)**
3. **✓ Le formulaire patient s'ouvre** (avec les infos minimales pré-remplies)
4. Vous pouvez ajouter les données manquantes:
   - Date de naissance
   - Adresse
   - Assurance
   - Etc.
5. Cliquez "Sauvegarder"
6. **Retournez à l'accueil**
7. **✓ Le patient ne figure plus dans "Fiches à compléter"**

---

## 🔍 Test 4: Validation des données

### Test Email
1. Ouvrez "Créer nouveau patient"
2. Remplissez Email avec un texte **invalide** (ex: "notanemail")
3. Cliquez "Créer"
4. **✓ Message d'erreur rouge:** "Email invalide"

### Test Téléphone
1. Ouvrez "Créer nouveau patient"
2. Remplissez Téléphone avec **moins de 10 chiffres** (ex: "123")
3. Cliquez "Créer"
4. **✓ Message d'erreur rouge:** "Téléphone invalide (minimum 10 chiffres)"

### Test champs obligatoires
1. Ouvrez "Créer nouveau patient"
2. Videz les champs Prénom et Nom
3. Cliquez "Créer"
4. **✓ Messages d'erreur:** "Le prénom est requis" / "Le nom est requis"

---

## 🎯 Test 5: Navigation au clavier (PatientSearchSelect)

### Étapes
1. Allez à "Rendez-vous" → "Nouveau rendez-vous"
2. Cliquez dans le champ "Patient"
3. Tapez un texte pour afficher plusieurs résultats

### Test clavier
- **Flèche bas (↓)**: Descend dans la liste, surligne le patient
- **Flèche haut (↑)**: Remonte dans la liste
- **Enter**: Sélectionne le patient surligné
- **Escape**: Ferme le dropdown

**✓ Tous les raccourcis clavier doivent fonctionner**

---

## 📊 Cas de test spécifiques

### Cas 1: Créer 3 patients rapidement
1. Répétez Test 1 trois fois avec des noms différents
2. Allez à l'accueil
3. **✓ Widget "Fiches à compléter" affiche les 3 patients**

### Cas 2: Compléter tous les profils
1. À partir du widget, cliquez "Compléter" sur chaque patient
2. Remplissez les infos manquantes et sauvegardez
3. Retournez à l'accueil
4. **✓ Le widget disparaît** (ou montre "0 patients")

### Cas 3: Même patient - même rendez-vous
1. Créez un nouveau patient "Jean Dupont"
2. Créez un rendez-vous avec ce patient
3. Ouvrez un autre rendez-vous
4. Cherchez "Jean" → **✓ Le patient créé s'affiche dans la liste**
5. Sélectionnez-le sans passer par "Créer nouveau"

---

## 🐛 Points à vérifier (Debugging)

### Console browser
1. Ouvrez DevTools (F12)
2. Onglet "Console"
3. Vous **ne devez voir aucune erreur rouge**
4. **Warnings jaunes OK** (legacy code)

### localStorage
1. Dans DevTools, allez à "Storage" → "LocalStorage"
2. Cherchez "medicalPro_patients"
3. **✓ Les nouveaux patients doivent être présents** avec `isIncomplete: true`

### Comportement attendu
- ❌ **Ne doit PAS**: Rechargement de page
- ❌ **Ne doit PAS**: Erreur JavaScript
- ❌ **Ne doit PAS**: Données perdues après rechargement (localStorage)
- ✅ **Doit**: Autocomplétion instantanée
- ✅ **Doit**: Modals fluides
- ✅ **Doit**: Patient pré-sélectionné après création

---

## 🎬 Scénario complet de test (5 minutes)

```
1. Accueil (vérifier widget vide)
   ↓
2. Rendez-vous → Nouveau
   ↓
3. Créer "Alice Blanc" (novo patient)
   ↓
4. Compléter rendez-vous avec date/heure/praticien
   ↓
5. Créer le rendez-vous
   ↓
6. Accueil (vérifier widget affiche Alice)
   ↓
7. Clic "Compléter" sur Alice
   ↓
8. Ajouter infos manquantes
   ↓
9. Sauvegarder
   ↓
10. Accueil (vérifier Alice disparue du widget)
   ✅ TEST RÉUSSI
```

---

## 📝 Feedback

Si vous trouvez des bugs:
1. **Prenez une screenshot** si UI problème
2. **Notez les étapes** pour reproduire
3. **Vérifiez la console** pour les erreurs
4. **Testez dans un autre navigateur** (Chrome, Firefox, Safari)

**Merci de reporter les problèmes !** 🙏

---

## 📞 Support

Questions ou problèmes?
- Vérifiez que npm start tourne sur http://localhost:3000
- Essayez Ctrl+Shift+R (hard refresh)
- Vérifiez localStorage n'est pas plein
- Essayez dans un mode incognito

---

Bon test! 🚀
