# Guide Complet de l'Internationalisation (i18n) - MedicalPro

> **Note**: Ce guide consolide les informations des 5 documents i18n. Les documents individuels sont conservés pour les références détaillées.

## 🌍 Vue d'ensemble

MedicalPro supporte maintenant l'internationalisation (i18n) complète avec:
- ✅ Support multilingue (FR, ES, EN)
- ✅ Emails localisés par région
- ✅ Interface utilisateur multilingue
- ✅ Conversion centralisée avec react-i18next

---

## 📊 État d'avancement

| Composant | FR | ES | EN | Notes |
|-----------|----|----|----| -----|
| **Emails** | ✅ | ✅ | ⏳ | Système automatique par région |
| **Dashboard** | ✅ | ✅ | ⏳ | Interface principale |
| **Patients** | ✅ | ✅ | ⏳ | Module patient |
| **Rendez-vous** | ✅ | ✅ | ⏳ | Calendrier et planification |
| **Dossiers médicaux** | ✅ | ✅ | ⏳ | Suivi médical |
| **Admin** | ✅ | ✅ | ⏳ | Gestion utilisateurs |

---

## 🔧 Système d'Emails Multilingues

### Architecture

```
User registers (country=FR|ES)
    ↓
Create Company with country
    ↓
emailService.sendVerificationEmail(..., region: country)
    ↓
EmailService routes to language-specific template
    ↓
Template FR ou ES est envoyé
    ↓
Email reçu dans la bonne langue
```

### Régions supportées

| Code | Langue | Exemple |
|------|--------|---------|
| **FR** | Français | France, Belgique, Suisse |
| **ES** | Espagnol | Espagne, Amérique latine |
| **EN** | Anglais | À implémenter |

### Fichiers de templates

```
backend/
├── src/services/emailService.js    # Routage dynamique
├── templates/
│   ├── verification-fr.html        # Email de vérification FR
│   ├── verification-es.html        # Email de vérification ES
│   ├── confirmation-fr.html        # Email de confirmation FR
│   └── confirmation-es.html        # Email de confirmation ES
```

### Utilisation

```javascript
// Dans le backend - emailService.js
await emailService.sendVerificationEmail({
  email: user.email,
  firstName: user.firstName,
  companyName: company.name,
  verificationToken: token,
  verificationUrl: url,
  region: company.country  // 'FR' ou 'ES'
});

// Le service sélectionne automatiquement le bon template
```

---

## 🎨 Système d'Interface Multilingue

### Infrastructure

**Fichiers de traduction:**
```
src/locales/
├── en/
│   ├── auth.json          # Authentification
│   ├── patients.json      # Module patients
│   ├── appointments.json  # Module rendez-vous
│   ├── medical.json       # Dossiers médicaux
│   ├── dashboard.json     # Dashboard
│   ├── admin.json         # Administration
│   └── common.json        # Textes communs
├── fr/
│   └── [mêmes fichiers]
└── es/
    └── [mêmes fichiers]
```

### Configuration

**src/config/i18n.js:**
```javascript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: enTranslations },
    fr: { translation: frTranslations },
    es: { translation: esTranslations }
  },
  lng: 'fr', // Langue par défaut
  fallbackLng: 'fr',
  interpolation: { escapeValue: false }
});
```

### Utilisation dans les composants

```javascript
// Importer le hook
import { useTranslation } from 'react-i18next';

// Dans le composant
function MyComponent() {
  const { t } = useTranslation();

  return (
    <h1>{t('patients.title')}</h1>
    <p>{t('patients.description')}</p>
    <button>{t('common.save')}</button>
  );
}
```

### Changement de langue

```javascript
// Dans AuthContext ou settings
function changeLanguage(lang) {
  i18n.changeLanguage(lang); // 'en', 'fr', 'es'
  localStorage.setItem('language', lang);
}
```

---

## 📝 Clés de traduction par module

### Authentification (`auth.json`)

```json
{
  "login": {
    "title": "Connexion",
    "email": "Email",
    "password": "Mot de passe",
    "submit": "Se connecter"
  },
  "signup": {
    "title": "Inscription",
    "firstName": "Prénom"
  }
}
```

### Patients (`patients.json`)

```json
{
  "title": "Gestion des patients",
  "list": {
    "title": "Liste des patients",
    "columns": { "name": "Nom", "email": "Email" }
  },
  "form": {
    "firstName": "Prénom",
    "lastName": "Nom"
  }
}
```

### Commun (`common.json`)

```json
{
  "save": "Enregistrer",
  "cancel": "Annuler",
  "delete": "Supprimer",
  "edit": "Modifier",
  "create": "Créer",
  "actions": "Actions"
}
```

---

## 🔄 Migration vers i18n

### Processus

1. **Identifier les textes hardcodés**
   ```bash
   grep -r "\"[A-Z].*\"" src/components/ | grep -v i18n
   ```

2. **Créer les clés de traduction**
   ```javascript
   // fr/module.json
   {
     "componentName": {
       "title": "Mon texte"
     }
   }
   ```

3. **Mettre à jour le composant**
   ```javascript
   // Avant
   <h1>Mon texte</h1>

   // Après
   const { t } = useTranslation();
   <h1>{t('componentName.title')}</h1>
   ```

4. **Ajouter les traductions ES**
   ```javascript
   // es/module.json - même structure, textes en espagnol
   ```

### Composants à migrer

**Priorité haute:**
- Dashboard.js
- Header.js
- Sidebar.js
- Navigation.js

**Priorité moyenne:**
- Patients (forms, lists)
- Appointments
- Medical records

**Priorité basse:**
- Admin modules
- Modales d'erreur

---

## 💡 Bonnes pratiques

### 1. Organisation des clés

```json
{
  "module": {
    "section": {
      "item": "Texte"
    }
  }
}
```

### 2. Nommage cohérent

- `title` - Titre principal
- `description` - Description
- `label` - Label d'input
- `placeholder` - Placeholder
- `error` - Message d'erreur
- `success` - Message de succès
- `button` - Texte de bouton

### 3. Pas de logique dans les traductions

```javascript
// ❌ Mauvais
t('user.status', { status: userStatus })

// ✅ Bon
t(`user.status.${userStatus}`)
```

### 4. Contextualiser les clés

```javascript
// ❌ Mauvais - trop générique
t('title')

// ✅ Bon - contextuel
t('patients.title')
t('appointments.title')
```

---

## 🌐 Ajouter une nouvelle langue

### Exemple: Anglais (EN)

1. **Créer les fichiers**
   ```bash
   mkdir -p src/locales/en
   cp -r src/locales/fr/* src/locales/en/
   ```

2. **Traduire les fichiers** (`src/locales/en/`)
   - auth.json → traduction EN
   - patients.json → traduction EN
   - etc.

3. **Ajouter à la configuration** (`src/config/i18n.js`)
   ```javascript
   import enTranslations from '../locales/en/index.json';

   resources: {
     en: { translation: enTranslations },
     // ... autres
   }
   ```

4. **Tester**
   - Changer la langue dans les settings
   - Vérifier que tout s'affiche correctement

---

## 📈 Effort d'implémentation par langue

Voir [I18N_EFFORT.md](./I18N_EFFORT.md) pour l'estimation détaillée.

### Résumé (par langue additionnelle)

| Tâche | Effort |
|-------|--------|
| Traduction (400+ clés) | 3-4h |
| Vérification QA | 2h |
| Corrections UI/layout | 2h |
| Tests complets | 2h |
| **Total** | **9-12h** |

---

## ✅ Checklist d'implémentation

- [ ] Tous les composants utilisent `useTranslation()`
- [ ] Toutes les clés existent en FR et ES
- [ ] Pas de textes hardcodés en français
- [ ] Les emails utilisent le bon template par région
- [ ] Changement de langue fonctionne
- [ ] LocalStorage garde le choix de langue
- [ ] Les traductions sont cohérentes
- [ ] Pas d'espacements cassés en ES ou EN
- [ ] Tous les formulaires sont traduits
- [ ] Messages d'erreur sont traduits

---

## 🔗 Références détaillées

Pour plus d'informations spécifiques:

- **Emails multilingues** → [MULTILINGUAL_EMAILS.md](./MULTILINGUAL_EMAILS.md)
- **Migration détaillée** → [I18N_MIGRATION.md](./I18N_MIGRATION.md)
- **Corrections appliquées** → [I18N_CORRECTIONS.md](./I18N_CORRECTIONS.md)
- **Effort par langue** → [I18N_EFFORT.md](./I18N_EFFORT.md)
- **Scalabilité** → [I18N_SCALABILITY.md](./I18N_SCALABILITY.md)

---

## 📞 Questions fréquentes

**Q: Quelle est la langue par défaut?**
A: Français (FR). Elle peut être changée dans `src/config/i18n.js`

**Q: Comment ajouter une langue?**
A: Créer les fichiers JSON dans `src/locales/[code]/` puis l'ajouter à la configuration i18n.

**Q: Les emails peuvent-ils être en anglais?**
A: Oui, en ajoutant des templates `verification-en.html` et `confirmation-en.html` et en gérant le pays dans Company.

**Q: Comment tester les traductions?**
A: Utiliser le menu de changement de langue et vérifier que tous les textes s'affichent correctement.

---

**Dernière mise à jour**: Décembre 2025
**Version**: 2.0.0 (i18n stabilisé)
