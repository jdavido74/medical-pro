# Architecture de Routing React Router

**Date**: 2024-12-08
**Version**: 1.0
**React Router**: v7.10.1

---

## 📋 Vue d'ensemble

L'application utilise maintenant **React Router** pour gérer la navigation et les routes. Cette refactorisation apporte :

✅ **Persistance de navigation** - L'état est sauvegardé dans l'URL
✅ **Routes explicites** - Chaque section a sa propre URL
✅ **Navigation naturelle** - Boutons précédent/suivant du navigateur fonctionnent
✅ **Partage de liens** - URLs directes vers des sections spécifiques
✅ **Gestion des modals via URL** - Les popups persistent au rechargement

---

## 🗺️ Structure des Routes

### Routes Publiques (Non authentifiées)

| Route | Composant | Description |
|-------|-----------|-------------|
| `/` | HomePage | Page d'accueil publique |
| `/login` | LoginPage | Page de connexion |
| `/signup` | SignupPage | Page d'inscription |
| `/email-verification` | EmailVerificationPage | Vérification d'email |
| `/auth/verify-email/:token` | EmailVerificationCallback | Callback de vérification |

### Routes Privées (Authentification requise)

| Route | Composant | Description |
|-------|-----------|-------------|
| `/dashboard` | HomeModule | Dashboard principal |
| `/home` | → `/dashboard` | Redirection |
| `/patients` | PatientsModule | Liste des patients |
| `/patients/:id` | PatientsModule | Détail d'un patient |
| `/medical-records` | MedicalRecordsModule | Dossiers médicaux |
| `/medical-records/:patientId` | MedicalRecordsModule | Dossier d'un patient |
| `/appointments` | AppointmentsModule | Calendrier des rendez-vous |
| `/appointments/new` | AppointmentsModule | Nouveau rendez-vous |
| `/appointments/:id` | AppointmentsModule | Détail d'un rendez-vous |
| `/quotes` | QuotesModule | Gestion des devis |
| `/invoices` | InvoicesModule | Gestion des factures |
| `/consents` | ConsentManagementModule | Gestion des consentements |
| `/consent-templates` | ConsentTemplatesModule | Templates de consentements |
| `/settings` | SettingsModule | Paramètres utilisateur |

### Routes d'Administration (Rôle admin requis)

| Route | Composant | Description |
|-------|-----------|-------------|
| `/admin` | AdminOverview | Vue d'ensemble admin |
| `/admin/clinic-config` | ClinicConfigurationModule | Configuration clinique |
| `/admin/users` | UserManagementModule | Gestion des utilisateurs |
| `/admin/roles` | RoleManagementModule | Gestion des rôles |
| `/admin/teams` | TeamManagementModule | Gestion des équipes |
| `/admin/audit` | AuditManagementModule | Logs d'audit |

---

## 📁 Structure des Fichiers

```
src/
├── routes/
│   └── index.js              # Configuration centrale des routes
├── layouts/
│   ├── DashboardLayout.js    # Layout pour les pages dashboard
│   ├── AuthLayout.js         # Layout pour les pages d'authentification
│   └── AdminLayout.js        # Layout pour les pages admin
├── hooks/
│   ├── useQueryParams.js     # Hook pour gérer les paramètres d'URL
│   └── useModal.js           # Hook pour gérer les modals via URL
├── components/
│   └── routing/
│       ├── ProtectedRoute.js # Protection des routes authentifiées
│       ├── PublicRoute.js    # Protection des routes publiques
│       └── AdminRoute.js     # Protection des routes admin
└── pages/
    └── admin/
        └── AdminOverview.js  # Page d'aperçu admin
```

---

## 🔐 Protection des Routes

### 1. ProtectedRoute

Protège les routes qui nécessitent une authentification.

```javascript
// Redirige vers /login si non authentifié
<ProtectedRoute>
  <DashboardLayout />
</ProtectedRoute>
```

**Comportement**:
- ✅ Authentifié → Affiche le contenu
- ❌ Non authentifié → Redirige vers `/login`
- ⏳ Chargement → Affiche un loader

### 2. PublicRoute

Protège les routes publiques (évite l'accès si déjà connecté).

```javascript
// Redirige vers /dashboard si déjà connecté
<PublicRoute>
  <AuthLayout />
</PublicRoute>
```

**Comportement**:
- ✅ Non authentifié → Affiche le contenu
- ❌ Authentifié → Redirige vers `/dashboard`
- ⏳ Chargement → Affiche un loader

### 3. AdminRoute

Protège les routes d'administration (rôle admin requis).

```javascript
// Redirige ou affiche erreur si pas admin
<AdminRoute>
  <AdminLayout />
</AdminRoute>
```

**Comportement**:
- ✅ Admin → Affiche le contenu
- ❌ Non admin → Affiche message d'erreur
- ❌ Non authentifié → Redirige vers `/login`

---

## 🎨 Layouts Réutilisables

### 1. DashboardLayout

Layout pour toutes les pages du dashboard.

**Contient**:
- Sidebar (navigation principale)
- Header (titre et infos contextuelles)
- Zone de contenu (Outlet pour les routes enfants)

**Utilisé par**: Toutes les routes privées (`/dashboard`, `/patients`, etc.)

### 2. AuthLayout

Layout minimaliste pour les pages d'authentification.

**Contient**:
- Fond dégradé vert/émeraude
- Zone de contenu centrée

**Utilisé par**: Routes publiques (`/login`, `/signup`, etc.)

### 3. AdminLayout

Layout spécifique pour l'administration.

**Contient**:
- Header avec badge admin
- Navigation par onglets
- Zone de contenu avec max-width

**Utilisé par**: Routes d'administration (`/admin/*`)

---

## 🪝 Hooks Personnalisés

### 1. useQueryParams

Gère les paramètres d'URL de manière simple.

**Méthodes**:
```javascript
const { getParam, setParam, removeParam, clearParams } = useQueryParams();

// Lire un paramètre
const modal = getParam('modal'); // ?modal=createUser

// Définir un/des paramètres
setParam('modal', 'createUser');
setParam({ modal: 'createUser', id: '123' });

// Supprimer un/des paramètres
removeParam('modal');
removeParam(['modal', 'id']);

// Tout effacer
clearParams();
```

**Cas d'usage**:
- Filtres de recherche
- Pagination
- État des modals
- Paramètres temporaires

### 2. useModal

Gère l'ouverture/fermeture des modals via l'URL.

**Utilisation basique**:
```javascript
const { isOpen, openModal, closeModal, getModalData } = useModal('createPatient');

// Ouvrir
<button onClick={() => openModal()}>Créer patient</button>

// Ouvrir avec données
<button onClick={() => openModal({ patientId: '123' })}>
  Modifier patient
</button>

// Fermer
<Modal isOpen={isOpen} onClose={closeModal}>
  ...
</Modal>

// Récupérer les données
const data = getModalData(); // { patientId: '123' }
```

**Utilisation avancée (plusieurs modals)**:
```javascript
const modals = useModals(['createPatient', 'editPatient', 'deletePatient']);

modals.createPatient.open();
modals.editPatient.open({ id: '123' });
modals.deletePatient.close();
```

**Résultat dans l'URL**:
```
/patients?modal=createPatient
/patients?modal=editPatient&modalData=%7B%22id%22%3A%22123%22%7D
```

---

## 🔄 Migration depuis l'Ancien Système

### Avant (État local)

```javascript
// App.js
const [currentPage, setCurrentPage] = useState('home');

// Navigation
<button onClick={() => setCurrentPage('patients')}>Patients</button>

// Dashboard.js
const [activeModule, setActiveModule] = useState('home');
```

**Problèmes**:
- ❌ État perdu au rechargement
- ❌ Pas de navigation naturelle (boutons navigateur)
- ❌ Impossible de partager des liens
- ❌ URLs ne reflètent pas l'état

### Après (React Router)

```javascript
// App.js
<BrowserRouter>
  <AppRoutes />
</BrowserRouter>

// Navigation
<NavLink to="/patients">Patients</NavLink>
// ou
<button onClick={() => navigate('/patients')}>Patients</button>
```

**Avantages**:
- ✅ État persistant (dans l'URL)
- ✅ Navigation naturelle
- ✅ Partage de liens directs
- ✅ URLs explicites

---

## 🎯 Exemples d'Utilisation

### 1. Navigation Simple

```javascript
import { useNavigate } from 'react-router-dom';

function MyComponent() {
  const navigate = useNavigate();

  return (
    <button onClick={() => navigate('/patients')}>
      Voir les patients
    </button>
  );
}
```

### 2. Navigation avec État

```javascript
// Page source
navigate('/email-verification', {
  state: { email: 'user@example.com' }
});

// Page destination
import { useLocation } from 'react-router-dom';

function EmailVerificationPage() {
  const location = useLocation();
  const email = location.state?.email;

  return <div>Email: {email}</div>;
}
```

### 3. Lire les Paramètres d'URL

```javascript
import { useParams } from 'react-router-dom';

function PatientDetail() {
  const { id } = useParams(); // /patients/:id

  return <div>Patient ID: {id}</div>;
}
```

### 4. Liens de Navigation

```javascript
import { NavLink } from 'react-router-dom';

<NavLink
  to="/patients"
  className={({ isActive }) =>
    isActive ? 'active-link' : 'normal-link'
  }
>
  Patients
</NavLink>
```

### 5. Modal Persistant

```javascript
import { useModal } from '../hooks/useModal';

function PatientsModule() {
  const { isOpen, openModal, closeModal, getModalData } = useModal('createPatient');

  return (
    <>
      <button onClick={() => openModal()}>Nouveau patient</button>

      <PatientFormModal
        isOpen={isOpen}
        onClose={closeModal}
        initialData={getModalData()}
      />
    </>
  );
}
```

**URL résultante**: `/patients?modal=createPatient`

---

## 🧪 Tests de Persistance

### Test 1: Rechargement de Page
1. Naviguer vers `/patients`
2. Recharger la page (F5)
3. ✅ Vous restez sur `/patients`

### Test 2: Navigation Navigateur
1. Naviguer `/dashboard` → `/patients` → `/appointments`
2. Cliquer sur "Précédent" (navigateur)
3. ✅ Retour à `/patients`

### Test 3: Modal Persistant
1. Ouvrir `/patients`
2. Cliquer "Nouveau patient" (ouvre modal)
3. Recharger la page (F5)
4. ✅ Modal toujours ouverte, URL: `/patients?modal=createPatient`

### Test 4: Partage de Lien
1. Copier l'URL `/patients?modal=createPatient&modalData=...`
2. Ouvrir dans un nouvel onglet
3. ✅ Modal ouverte avec les bonnes données

---

## 📝 Conventions de Nommage

### Routes
- Kebab-case: `/medical-records`, `/consent-templates`
- Paramètres: `:id`, `:patientId`, `:token`
- Pluriel pour listes: `/patients`, `/appointments`

### Query Params
- camelCase: `?modal=createPatient&userId=123`
- Boolean: `?isActive=true`
- Arrays (rarement): `?filters=age,name`

### Composants
- PascalCase: `ProtectedRoute`, `DashboardLayout`
- Suffixes: `Layout`, `Route`, `Page`, `Module`

---

## 🚀 Prochaines Étapes

### Fonctionnalités Manquantes

1. **Route `/set-password?token=xxx`** ⏳
   - Page pour définir le mot de passe après invitation
   - Lire le token depuis l'URL
   - Valider et enregistrer le nouveau mot de passe

2. **Gestion des 404** ⏳
   - Page d'erreur personnalisée
   - Redirection intelligente

3. **Analytics/Tracking** ⏳
   - Intégration avec Google Analytics
   - Suivi des changements de route

4. **Breadcrumbs** ⏳
   - Fil d'Ariane automatique
   - Basé sur la hiérarchie des routes

---

## 🔧 Maintenance

### Ajouter une Nouvelle Route

1. **Définir la route dans `src/routes/index.js`**:
```javascript
{
  path: '/new-feature',
  element: <NewFeatureModule />
}
```

2. **Ajouter le lien dans le Sidebar**:
```javascript
// src/components/dashboard/Sidebar.js
{ id: 'new-feature', path: '/new-feature', label: 'Nouvelle fonctionnalité', icon: Star }
```

3. **Ajouter la traduction du titre dans Header**:
```javascript
// src/components/dashboard/Header.js
const modules = {
  ...
  'new-feature': t('modules.newFeature.title')
};
```

### Ajouter une Protection Personnalisée

```javascript
// src/components/routing/CustomRoute.js
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const CustomRoute = ({ children, requiredPermission }) => {
  const { user, hasPermission } = useAuth();

  if (!hasPermission(requiredPermission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};
```

---

## 📚 Ressources

- [React Router Documentation](https://reactrouter.com/)
- [React Router Tutorial](https://reactrouter.com/en/main/start/tutorial)
- [Hooks API Reference](https://reactrouter.com/en/main/hooks/hooks)

---

## ✅ Checklist de Vérification

- [x] react-router-dom installé
- [x] BrowserRouter configuré dans App.js
- [x] Routes définies dans `/routes/index.js`
- [x] Layouts créés (Dashboard, Auth, Admin)
- [x] Hooks créés (useQueryParams, useModal)
- [x] Protection des routes (ProtectedRoute, PublicRoute, AdminRoute)
- [x] Sidebar mis à jour avec NavLink
- [x] Header mis à jour avec useLocation
- [x] Pages publiques mises à jour (useNavigate)
- [x] Pages d'auth mises à jour (useNavigate, useParams, useLocation)
- [ ] Tests de persistance effectués
- [ ] Documentation mise à jour
- [ ] Routes 404 gérées

---

**Auteur**: Claude Code
**Dernière mise à jour**: 2024-12-08
