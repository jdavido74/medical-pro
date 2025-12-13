# Architecture: Routes Basées sur la Locale

## Vue d'ensemble

Ce document décrit l'architecture proposée pour unifier la gestion des régions, langues et pays via des routes préfixées par la locale.

## Problème Actuel

### Sources de vérité multiples
```
regionDetector.js    → DEFAULT_REGION = 'es'
dataTransform.js     → defaultCountry = 'FR'
ConfigManager.js     → defaultRegion = 'FR'
SignupPage.js        → region === 'spain' (BUG - corrigé)
```

### Conséquences
- Comportement imprévisible selon le point d'entrée
- Difficile à débugger
- Incohérences UX entre les pages

---

## Architecture Proposée

### Structure des Routes

```
/                                    → Redirect vers locale détectée
├── /:locale/                        → Layout principal avec contexte locale
│   ├── login                        → Page de connexion
│   ├── signup                       → Page d'inscription
│   ├── email-verification           → Vérification email
│   ├── dashboard                    → Dashboard principal
│   │   ├── patients                 → Module patients
│   │   ├── appointments             → Module RDV
│   │   ├── medical-records          → Dossiers médicaux
│   │   ├── consents                 → Consentements
│   │   └── settings                 → Paramètres
│   └── admin/                       → Administration
│       ├── users                    → Gestion utilisateurs
│       ├── clinic                   → Configuration clinique
│       └── roles                    → Gestion des rôles
│
├── /public/                         → Pages publiques (locale dans token/URL)
│   ├── consent/:token               → Signature consentement
│   └── verify/:token                → Vérification email
│
└── /404                             → Page non trouvée
```

### Locales Supportées

| Locale | Pays | Langue | Devise | Format Date |
|--------|------|--------|--------|-------------|
| `fr-FR` | France | Français | EUR | DD/MM/YYYY |
| `es-ES` | Espagne | Español | EUR | DD/MM/YYYY |
| `en-GB` | UK | English | GBP | DD/MM/YYYY |
| `en-US` | USA | English | USD | MM/DD/YYYY |

---

## Composants Clés

### 1. LocaleProvider (Nouveau)

```jsx
// src/contexts/LocaleContext.js
import { createContext, useContext, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const LocaleContext = createContext(null);

const LOCALE_CONFIG = {
  'fr-FR': {
    code: 'fr-FR',
    country: 'FR',
    language: 'fr',
    currency: 'EUR',
    dateFormat: 'DD/MM/YYYY',
    phonePrefix: '+33',
    name: 'France'
  },
  'es-ES': {
    code: 'es-ES',
    country: 'ES',
    language: 'es',
    currency: 'EUR',
    dateFormat: 'DD/MM/YYYY',
    phonePrefix: '+34',
    name: 'España'
  },
  // ... autres locales
};

export function LocaleProvider({ children }) {
  const { locale } = useParams();
  const navigate = useNavigate();

  const config = useMemo(() => {
    const cfg = LOCALE_CONFIG[locale] || LOCALE_CONFIG['fr-FR'];
    return {
      ...cfg,
      // Helpers
      formatDate: (date) => formatDateByLocale(date, cfg),
      formatCurrency: (amount) => formatCurrencyByLocale(amount, cfg),
      changeLocale: (newLocale) => {
        const currentPath = window.location.pathname;
        const newPath = currentPath.replace(`/${locale}/`, `/${newLocale}/`);
        navigate(newPath);
      }
    };
  }, [locale, navigate]);

  return (
    <LocaleContext.Provider value={config}>
      {children}
    </LocaleContext.Provider>
  );
}

export const useLocale = () => useContext(LocaleContext);
```

### 2. LocaleRedirect (Nouveau)

```jsx
// src/components/routing/LocaleRedirect.js
import { Navigate } from 'react-router-dom';

function detectUserLocale() {
  // 1. Check localStorage (returning user)
  const stored = localStorage.getItem('preferred_locale');
  if (stored) return stored;

  // 2. Check browser language
  const browserLang = navigator.language;
  if (browserLang.startsWith('es')) return 'es-ES';
  if (browserLang.startsWith('fr')) return 'fr-FR';
  if (browserLang.startsWith('en-GB')) return 'en-GB';

  // 3. Default
  return 'fr-FR';
}

export function LocaleRedirect() {
  const locale = detectUserLocale();
  return <Navigate to={`/${locale}/dashboard`} replace />;
}
```

### 3. Structure des Routes Mise à Jour

```jsx
// src/routes/index.js
import { LocaleProvider } from '../contexts/LocaleContext';
import { LocaleRedirect } from '../components/routing/LocaleRedirect';

const routes = [
  // Root redirect
  {
    path: '/',
    element: <LocaleRedirect />
  },

  // Locale-prefixed routes
  {
    path: '/:locale',
    element: <LocaleProvider><Outlet /></LocaleProvider>,
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'signup', element: <SignupPage /> },
      { path: 'dashboard', element: <DashboardLayout />, children: [
        { path: '', element: <DashboardHome /> },
        { path: 'patients', element: <PatientsModule /> },
        { path: 'appointments', element: <AppointmentsModule /> },
        // ...
      ]},
      // ...
    ]
  },

  // Public pages (locale in token)
  {
    path: '/public/consent/:token',
    element: <ConsentSigningPage />
  }
];
```

---

## Migration

### Phase 1: Infrastructure (2-3 jours dev)

1. **Créer LocaleContext**
   - [ ] Créer `src/contexts/LocaleContext.js`
   - [ ] Définir `LOCALE_CONFIG` complet
   - [ ] Implémenter `useLocale()` hook

2. **Créer composants routing**
   - [ ] `LocaleRedirect.js` - détection et redirection
   - [ ] `LocaleGuard.js` - validation de locale
   - [ ] Modifier `routes/index.js`

3. **Adapter i18n**
   - [ ] Synchroniser i18next avec locale URL
   - [ ] Supprimer `detectRegion()` usage direct

### Phase 2: Refactoring Composants (3-5 jours dev)

1. **Remplacer region par useLocale()**
   ```jsx
   // AVANT
   import { region } from '../i18n';
   const country = region === 'es' ? 'ES' : 'FR';

   // APRÈS
   import { useLocale } from '../contexts/LocaleContext';
   const { country } = useLocale();
   ```

2. **Composants à migrer**
   - [ ] SignupPage.js
   - [ ] LoginPage.js
   - [ ] PatientFormModal.js
   - [ ] UserFormModal.js
   - [ ] Header.js (sélecteur de langue)
   - [ ] dataTransform.js
   - [ ] ConfigManager.js (supprimer)

### Phase 3: Tests et Cleanup (1-2 jours dev)

1. **Tests**
   - [ ] Tests unitaires LocaleContext
   - [ ] Tests E2E navigation entre locales
   - [ ] Tests de redirection

2. **Cleanup**
   - [ ] Supprimer `regionDetector.js` (ou simplifier)
   - [ ] Supprimer `ConfigManager.js`
   - [ ] Nettoyer imports inutilisés

---

## Exemple d'Utilisation

### Dans un Composant

```jsx
import { useLocale } from '../contexts/LocaleContext';
import PhoneInput from './common/PhoneInput';

function PatientForm() {
  const { country, language, formatDate, changeLocale } = useLocale();

  return (
    <form>
      <PhoneInput defaultCountry={country} />

      <p>Date: {formatDate(new Date())}</p>

      {/* Sélecteur de langue */}
      <select
        value={`${language}-${country}`}
        onChange={(e) => changeLocale(e.target.value)}
      >
        <option value="fr-FR">Français</option>
        <option value="es-ES">Español</option>
        <option value="en-GB">English</option>
      </select>
    </form>
  );
}
```

### Dans les Links

```jsx
import { useLocale } from '../contexts/LocaleContext';
import { Link } from 'react-router-dom';

function Navigation() {
  const { code } = useLocale();

  return (
    <nav>
      <Link to={`/${code}/dashboard`}>Dashboard</Link>
      <Link to={`/${code}/patients`}>Patients</Link>
    </nav>
  );
}
```

---

## URLs Exemples

```
https://medicalpro.com/                        → Redirect to /fr-FR/dashboard
https://medicalpro.com/fr-FR/login             → Login en français
https://medicalpro.com/es-ES/signup            → Inscription en espagnol
https://medicalpro.com/fr-FR/dashboard         → Dashboard français
https://medicalpro.com/es-ES/patients          → Patients en espagnol
https://medicalpro.com/public/consent/abc123   → Consentement (locale dans token)
```

---

## Avantages

| Aspect | Bénéfice |
|--------|----------|
| **Single Source of Truth** | La locale vient uniquement de l'URL |
| **SEO** | URLs indexables, hreflang possible |
| **Partage** | URLs avec contexte linguistique |
| **Debug** | Facile d'identifier la locale active |
| **Cache** | CDN peut cacher par route |
| **Bookmarks** | Utilisateurs peuvent sauvegarder en locale |

---

## Considérations

### Performance
- Le `LocaleProvider` ne re-render que si la locale change
- Les configs sont mémorisées avec `useMemo`

### SEO
- Ajouter `<link rel="alternate" hreflang="...">` dans le head
- Configurer sitemap avec toutes les locales

### Migration Backwards Compatibility
- Pendant la migration, supporter les anciennes URLs avec redirects
- `/login` → `/fr-FR/login` (ou locale détectée)

---

## Fichiers à Créer/Modifier

### Nouveaux Fichiers
```
src/contexts/LocaleContext.js         # Nouveau contexte
src/components/routing/LocaleRedirect.js
src/components/routing/LocaleGuard.js
src/config/locales.js                 # Configuration centralisée
```

### Fichiers à Modifier
```
src/routes/index.js                   # Structure routes
src/App.js                            # Provider wrapping
src/components/auth/LoginPage.js      # useLocale()
src/components/auth/SignupPage.js     # useLocale()
src/components/dashboard/Header.js    # Sélecteur langue
src/i18n.js                           # Sync avec URL
```

### Fichiers à Supprimer (après migration)
```
src/utils/regionDetector.js           # Remplacé par LocaleContext
src/api/ConfigManager.js              # Plus nécessaire
```

---

## Timeline Estimée

| Phase | Durée | Description |
|-------|-------|-------------|
| Phase 1 | 2-3 jours | Infrastructure (contexte, routing) |
| Phase 2 | 3-5 jours | Migration composants |
| Phase 3 | 1-2 jours | Tests et cleanup |
| **Total** | **6-10 jours** | Migration complète |

---

## Prochaines Étapes

1. **Valider cette architecture** avec l'équipe
2. **Créer branche** `feature/locale-routes`
3. **Implémenter Phase 1** (LocaleContext, routes)
4. **Tests manuels** sur environnement de dev
5. **Continuer Phases 2-3**

---

*Document créé le 2025-12-13*
*Auteur: Claude Code (Architecture Analysis)*
