# 🚀 Guide de test rapide - MedicalPro

**Version** : v2.0.0
**Dernière mise à jour** : 27 septembre 2025

Ce guide vous permet de tester rapidement toutes les fonctionnalités de MedicalPro.

## 🎯 Démarrage rapide

### 1. Lancer l'application
```bash
npm install
npm start
```

L'application sera accessible sur `http://localhost:3000`

### 2. Profils de test disponibles

L'application propose 7 profils de test avec des permissions différentes. Utilisez le **menu de changement de profil** en haut à gauche pour basculer entre les rôles :

| Profil | Niveau | Permissions principales |
|--------|--------|-------------------------|
| **Super Admin** | 100 | Accès complet + gestion système |
| **Admin** | 90 | Gestion complète de la clinique |
| **Médecin** | 70 | Consultations, diagnostics, prescriptions |
| **Spécialiste** | 70 | Accès spécialisé par domaine |
| **Infirmier(ère)** | 50 | Soins infirmiers et suivi patients |
| **Secrétaire** | 30 | Administration et accueil |
| **Lecture seule** | 10 | Consultation uniquement |

### 3. Menu de test des profils

🧪 **Cliquez sur le profil actuel en haut à gauche** pour accéder au menu de changement de profil et tester les différents niveaux d'accès.

---

## 📋 Scénarios de test par Epic

### ✅ Epic 1 : Gestion des patients

#### Test 1.1 : Création et gestion patient
1. **Navigation** : Cliquer sur "Gestion des patients"
2. **Création** : Bouton "Nouveau patient"
3. **Formulaire complet** :
   - Informations personnelles (prénom, nom, date naissance)
   - Contact (email, téléphone, adresse complète)
   - Informations médicales (groupe sanguin, allergies)
   - Contact d'urgence
   - Assurance maladie
4. **Validation** : Tester les validations en temps réel
5. **Sauvegarde** : Enregistrer et vérifier la création
6. **Recherche** : Utiliser la barre de recherche
7. **Modification** : Éditer un patient existant
8. **Détails** : Consulter la vue détaillée

#### Test 1.2 : Fonctionnalités avancées
- 🔍 **Filtres** : Par statut, âge, genre
- 📊 **Tri** : Par colonnes (nom, date, etc.)
- 📄 **Pagination** : Navigation entre pages
- 📤 **Export** : Télécharger les données

---

### ✅ Epic 2 : Données médicales

#### Test 2.1 : Consultation médicale
1. **Navigation** : "Dossiers médicaux" → "Nouvelle consultation"
2. **Sélection patient** : Choisir un patient existant
3. **Saisie consultation** :
   - Motif de consultation
   - Symptômes et plaintes
   - Examen clinique
   - Signes vitaux (tension, poids, température)
4. **Diagnostic** : Recherche CIM-10 et sélection
5. **Prescription** : Ajouter médicaments avec posologie
6. **Sauvegarde** : Enregistrer la consultation

#### Test 2.2 : Historique médical
1. **Timeline** : Consulter l'historique chronologique
2. **Filtres** : Par type, date, praticien
3. **Détails** : Ouvrir une consultation passée
4. **Évolution** : Suivre l'évolution des traitements

---

### ✅ Epic 3 : Rendez-vous et suivi

#### Test 3.1 : Planification RDV
1. **Navigation** : "Rendez-vous"
2. **Nouveau RDV** : Bouton "Nouveau rendez-vous"
3. **Formulaire** :
   - Sélection patient
   - Date et heure
   - Type de consultation
   - Durée (personnalisable)
   - Notes spéciales
4. **Calendrier** : Vérifier l'affichage visuel
5. **Conflits** : Tester la détection de chevauchements

#### Test 3.2 : Gestion avancée
- 📅 **Vues** : Jour, semaine, mois
- 🔄 **Modification** : Déplacer un RDV (drag & drop)
- ❌ **Annulation** : Annuler avec raison
- 🔔 **Rappels** : Voir les notifications automatiques

---

### ✅ Epic 4 : Consentements RGPD

#### Test 4.1 : Gestion des consentements
1. **Navigation** : "Consentements"
2. **Nouveau consentement** : Créer pour un patient
3. **Types disponibles** :
   - RGPD - Traitement des données
   - Soins médicaux généraux
   - Soins spécifiques
   - Télémédecine
   - Recherche médicale
4. **Méthodes** : Digital, verbal (avec témoin), écrit
5. **Validation** : Signer électroniquement
6. **Révocation** : Tester la révocation en un clic

#### Test 4.2 : Templates de consentements
1. **Navigation** : "Modèles de consentements"
2. **Créer template** : Nouvel éditeur
3. **Fonctionnalités** :
   - Éditeur de texte riche
   - Variables dynamiques (40+ disponibles)
   - Aperçu en temps réel
   - Catégories et spécialités
4. **Import/Export** : Tester upload de fichiers
5. **Préremplissage** : Utiliser un template avec un patient

#### Test 4.3 : Préremplissage automatique
1. **Créer consentement** avec template
2. **Sélectionner patient**
3. **Choisir template** → Variables automatiquement remplies
4. **Vérifier** : [NOM_PATIENT], [DATE], [PRATICIEN], etc.

---

### 🚧 Epic 5 : Droits et accès (75% complété)

#### Test 5.1 : Système de permissions ✅
1. **Navigation** : Menu Admin → "Gestion des rôles" (Super Admin/Admin uniquement)
2. **Visualisation** : Explorer les 50+ permissions par catégorie
3. **Rôles système** : Examiner les 7 rôles prédéfinis
4. **Création rôle** : Nouveau rôle personnalisé (Admin+ uniquement)
5. **Test permissions** : Changer de profil et vérifier les restrictions

#### Test 5.2 : Authentification ✅
1. **Session** : Informations de session en header
2. **Expiration** : Tester l'expiration automatique (8h d'inactivité)
3. **Permissions temps réel** : Changer de rôle et voir les changements
4. **Protection** : Tenter d'accéder à des fonctions non autorisées

#### Test 5.3 : Administration utilisateurs 🚧
*En cours de développement*

#### Test 5.4 : Équipes et délégations ⏳
*Planifié*

---

## 🔐 Test des permissions par rôle

### Test Super Admin
- ✅ Accès à tout
- ✅ Gestion des rôles
- ✅ Administration système
- ✅ Tous les modules

### Test Admin
- ✅ Gestion clinique complète
- ✅ Utilisateurs (lecture)
- ✅ Tous les modules métier
- ❌ Gestion des rôles système

### Test Médecin
- ✅ Patients, RDV, dossiers médicaux
- ✅ Consentements
- ✅ Prescriptions
- ❌ Administration
- ❌ Facturation avancée

### Test Spécialiste
- ✅ Similaire médecin
- ✅ Spécialité dédiée
- ❌ Gestion administrative

### Test Infirmier(ère)
- ✅ Patients (modification limitée)
- ✅ RDV, suivi
- ✅ Consultation dossiers
- ❌ Prescriptions
- ❌ Administration

### Test Secrétaire
- ✅ Patients, RDV
- ✅ Facturation complète
- ✅ Administration accueil
- ❌ Dossiers médicaux
- ❌ Prescriptions

### Test Lecture seule
- ✅ Consultation uniquement
- ❌ Aucune modification
- ❌ Création de données

---

## 📱 Tests responsive

### Desktop (1024px+)
- ✅ Sidebar complète
- ✅ Tableaux larges
- ✅ Modales optimisées

### Tablette (768px-1023px)
- ✅ Sidebar collapsible
- ✅ Grilles adaptatives
- ✅ Navigation tactile

### Mobile (320px-767px)
- ✅ Menu hamburger
- ✅ Formulaires optimisés
- ✅ Modales plein écran

---

## 🧪 Données de test disponibles

### Patients fictifs
- **Jean Dupont** - Dossier médical complet
- **Marie Martin** - Consultations récentes
- **Pierre Durand** - Historique long
- **Sophie Leclerc** - Traitements multiples

### Rendez-vous pré-créés
- RDV du jour, semaine, mois
- Différents types et statuts
- Praticiens variés

### Templates de consentements
- 10+ templates prêts à l'emploi
- Toutes catégories médicales
- Variables pré-configurées

### Factures et devis
- Exemples complets
- Différents statuts
- Patients liés

---

## ✅ Checklist de validation complète

### Interface utilisateur
- [ ] 🎨 Design cohérent et professionnel
- [ ] 📱 Responsive sur tous devices
- [ ] ⚡ Navigation fluide
- [ ] 🔍 Recherches fonctionnelles
- [ ] 📊 Tableaux interactifs

### Fonctionnalités métier
- [ ] 👥 CRUD patients complet
- [ ] 📅 Gestion RDV avancée
- [ ] 📋 Dossiers médicaux détaillés
- [ ] 🛡️ Consentements RGPD conformes
- [ ] 💰 Facturation complète

### Sécurité et permissions
- [ ] 🔐 Authentification robuste
- [ ] 👤 Permissions granulaires
- [ ] 🛡️ Protection des routes
- [ ] ⏰ Gestion des sessions
- [ ] 📝 Audit trail

### Performance
- [ ] ⚡ Chargement < 2s
- [ ] 💾 Persistance des données
- [ ] 🔄 Synchronisation en temps réel
- [ ] 📈 Optimisation renders
- [ ] 🎯 Pas de memory leaks

### Conformité
- [ ] ⚖️ RGPD compliant
- [ ] 📋 Audit trail complet
- [ ] 🔒 Données sécurisées
- [ ] 📊 Rapports conformité
- [ ] 🛡️ Droit à l'oubli

---

## 🚨 Problèmes connus

### Limitations temporaires
- 💾 **Stockage** : LocalStorage (backend en développement)
- 📧 **Email/SMS** : Simulations uniquement
- 🌐 **Offline** : Non supporté
- 📱 **App mobile** : Version web uniquement

### Workarounds
- **Données perdues** : Utiliser l'export régulièrement
- **Performance** : Vider le cache navigateur si lenteur
- **Permissions** : Forcer refresh si incohérences

---

## 📞 Support et feedback

### Développement actif
- 🔄 **Mises à jour** : Hebdomadaires
- 🐛 **Bugs** : Correction rapide
- ✨ **Nouvelles fonctionnalités** : Epic 5-6 en cours

### Retours utilisateurs
- 📝 **Suggestions** : Très appréciées
- 🚀 **Améliorations** : Intégrées rapidement
- 🎯 **Priorités** : Basées sur les besoins métier

---

**MedicalPro v2.0** - Testez toutes les fonctionnalités et profitez de l'expérience complète ! 🏥✨