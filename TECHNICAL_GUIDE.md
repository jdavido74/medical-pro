# 🛠️ Guide Technique - MedicalPro

**Version** : v2.0.0
**Dernière mise à jour** : 27 septembre 2025
**Public cible** : Développeurs, Architectes, DevOps

---

## 🏗️ Architecture générale

### Stack technique

```
Frontend (Client)
├── React 18.2.0          # Framework principal
├── Tailwind CSS 3.x      # Styling et responsive
├── Lucide React          # Système d'icônes
├── Context API           # State management
└── Create React App      # Build system

Storage (Temporaire)
├── LocalStorage          # Persistance côté client
├── SessionStorage        # Données de session
└── In-Memory Cache       # Optimisations

Backend (Futur)
├── Node.js + Express     # API REST
├── PostgreSQL            # Base de données
├── JWT                   # Authentification
└── Docker                # Containerisation
```

### Structure des dossiers

```
src/
├── components/                 # Composants React
│   ├── admin/                 # Administration système
│   │   ├── AdminDashboard.js
│   │   ├── RoleManagementModule.js
│   │   ├── SpecialtiesAdminModule.js
│   │   └── UsersManagementModule.js
│   ├── auth/                  # Authentification & permissions
│   │   └── PermissionGuard.js
│   ├── dashboard/             # Interface principale
│   │   ├── Dashboard.js
│   │   ├── Header.js
│   │   ├── Sidebar.js
│   │   ├── modules/          # Modules métier
│   │   │   ├── AppointmentsModule.js
│   │   │   ├── ConsentManagementModule.js
│   │   │   ├── ConsentTemplatesModule.js
│   │   │   ├── InvoicesModule.js
│   │   │   ├── MedicalRecordsModule.js
│   │   │   ├── PatientsModule.js
│   │   │   ├── QuotesModule.js
│   │   │   └── SettingsModule.js
│   │   └── modals/           # Dialogues et formulaires
│   │       ├── AppointmentFormModal.js
│   │       ├── ConsentFormModal.js
│   │       ├── ConsentTemplateEditorModal.js
│   │       ├── InvoiceFormModal.js
│   │       ├── PatientFormModal.js
│   │       ├── PatientDetailModal.js
│   │       ├── PDFPreviewModal.js
│   │       └── QuoteFormModal.js
│   ├── medical/               # Composants médicaux
│   │   ├── MedicalHistoryViewer.js
│   │   └── MedicalRecordForm.js
│   ├── notifications/         # Système de notifications
│   │   └── NotificationCenter.js
│   └── public/               # Pages publiques
│       ├── HomePage.js
│       ├── LoginPage.js
│       └── SignupPage.js
├── contexts/                  # Contextes React
│   ├── AuthContext.js        # Authentification & sessions
│   ├── DynamicTranslationsContext.js
│   ├── LanguageContext.js    # Internationalisation
│   └── MedicalModulesContext.js
├── utils/                    # Services et utilitaires
│   ├── appointmentsStorage.js
│   ├── consentsStorage.js
│   ├── consentTemplatesStorage.js
│   ├── consentVariableMapper.js
│   ├── invoicesStorage.js
│   ├── medicalStorage.js
│   ├── notificationsStorage.js
│   ├── patientsStorage.js
│   ├── permissionsStorage.js
│   ├── productsStorage.js
│   ├── quotesStorage.js
│   ├── storage.js
│   └── validation.js
├── config/                   # Configuration
│   └── ConfigManager.js
└── styles/                   # Styles globaux
    └── index.css
```

---

## 🔧 Services de données

### Architecture des services

Tous les services suivent le même pattern :

```javascript
// Pattern type pour un service de données
export const serviceNameStorage = {
  // CRUD Operations
  getAll: () => Array,
  getById: (id) => Object,
  create: (data, userId) => Object,
  update: (id, data, userId) => Object,
  delete: (id, userId) => Boolean,

  // Business Logic
  search: (query) => Array,
  filter: (criteria) => Array,
  validate: (data) => Object,

  // Statistics
  getStatistics: () => Object,

  // Utilities
  export: (format) => String,
  import: (data) => Boolean
};
```

### Services disponibles

#### 1. PatientsStorage (`patientsStorage.js`)

```javascript
// Gestion complète des patients
const patient = {
  id: 'uuid',
  patientNumber: 'P-2024-001',
  firstName: 'Jean',
  lastName: 'Dupont',
  birthDate: '1980-01-01',
  gender: 'male|female|other',
  contact: {
    email: 'jean@example.com',
    phone: '+33123456789',
    address: { street, city, postalCode, country },
    emergencyContact: { name, phone, relationship }
  },
  medical: {
    bloodType: 'O+',
    allergies: ['pénicilline'],
    medications: [],
    conditions: []
  },
  insurance: {
    provider: 'CPAM',
    number: '123456789',
    type: 'standard'
  },
  metadata: {
    createdAt: ISO_DATE,
    updatedAt: ISO_DATE,
    createdBy: 'userId',
    deleted: false
  }
};
```

#### 2. AppointmentsStorage (`appointmentsStorage.js`)

```javascript
// Gestion des rendez-vous
const appointment = {
  id: 'uuid',
  patientId: 'uuid',
  practitionerId: 'userId',
  datetime: ISO_DATE,
  duration: 30, // minutes
  type: 'consultation|urgence|suivi',
  status: 'scheduled|confirmed|completed|cancelled',
  notes: 'Notes du rendez-vous',
  reminder: {
    enabled: true,
    sentAt: ISO_DATE,
    method: 'email|sms'
  }
};
```

#### 3. ConsentsStorage (`consentsStorage.js`)

```javascript
// Gestion des consentements RGPD
const consent = {
  id: 'uuid',
  patientId: 'uuid',
  type: 'rgpd_data_processing|medical_care|medical_specific|telemedicine|research',
  purpose: 'Finalité du traitement',
  title: 'Titre du consentement',
  description: 'Contenu détaillé',
  status: 'granted|revoked|expired',
  collectionMethod: 'digital|verbal|written',
  isRequired: true,
  expiresAt: ISO_DATE,
  witness: { name, role, signature }, // Si verbal
  specificDetails: { procedure, risks, alternatives },
  auditTrail: [{
    action: 'created|updated|revoked',
    timestamp: ISO_DATE,
    userId: 'uuid',
    reason: 'string'
  }]
};
```

#### 4. PermissionsStorage (`permissionsStorage.js`)

```javascript
// Système de permissions granulaires
const PERMISSIONS = {
  PATIENTS_VIEW: 'patients.view',
  PATIENTS_CREATE: 'patients.create',
  PATIENTS_EDIT: 'patients.edit',
  PATIENTS_DELETE: 'patients.delete',
  // ... 50+ permissions
};

const role = {
  id: 'super_admin',
  name: 'Super Administrateur',
  description: 'Accès complet',
  level: 100, // 1-100
  permissions: [PERMISSIONS.PATIENTS_VIEW, ...],
  isSystemRole: true,
  color: 'purple'
};
```

---

## 🔐 Système d'authentification

### AuthContext amélioré

```javascript
// Nouvelle structure du contexte d'authentification
const AuthContext = {
  // État
  user: Object,
  isAuthenticated: Boolean,
  isLoading: Boolean,
  userPermissions: Array,
  sessionInfo: Object,

  // Authentification
  login: (userData) => void,
  logout: () => void,
  updateUser: (data) => void,

  // Permissions
  hasPermission: (permission) => Boolean,
  hasAnyPermission: (permissions) => Boolean,
  hasAllPermissions: (permissions) => Boolean,
  refreshPermissions: () => Array,

  // Session
  updateLastActivity: () => void,
  getSessionDuration: () => Number,
  isSessionExpired: () => Boolean
};
```

### Protection par permissions

```javascript
// Composant de protection
<PermissionGuard permission={PERMISSIONS.PATIENTS_VIEW}>
  <PatientsList />
</PermissionGuard>

// Hook de permissions
const { hasPermission, userPermissions } = usePermissions();

// Bouton conditionnel
<PermissionButton
  permission={PERMISSIONS.PATIENTS_CREATE}
  onClick={handleCreate}
>
  Créer patient
</PermissionButton>
```

---

## 📝 Gestion des formulaires

### Pattern de validation

```javascript
// Service de validation
import { validation } from '../utils/validation';

const validatePatient = (data) => {
  const errors = {};

  if (!validation.isRequired(data.firstName)) {
    errors.firstName = 'Prénom requis';
  }

  if (!validation.isValidEmail(data.email)) {
    errors.email = 'Email invalide';
  }

  if (!validation.isValidPhone(data.phone)) {
    errors.phone = 'Téléphone invalide';
  }

  return errors;
};
```

### Modales réutilisables

```javascript
// Pattern pour les modales de formulaire
const FormModal = ({ isOpen, onClose, onSave, editingItem }) => {
  const [formData, setFormData] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setIsSubmitting(false);
      return;
    }

    try {
      const result = editingItem
        ? await updateService(editingItem.id, formData)
        : await createService(formData);

      onSave(result);
      handleClose();
    } catch (error) {
      setValidationErrors({ general: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // JSX avec gestion d'erreurs et loading states
};
```

---

## 📊 Gestion d'état

### LocalStorage structure

```javascript
// Clés de stockage standardisées
const STORAGE_KEYS = {
  AUTH: 'clinic_auth',
  PATIENTS: 'clinic_patients',
  APPOINTMENTS: 'clinic_appointments',
  CONSENTS: 'clinic_consents',
  ROLES: 'clinic_roles',
  SETTINGS: 'clinic_settings'
};

// Service de stockage générique
const storageService = {
  get: (key) => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  set: (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }
};
```

### Pattern de cache en mémoire

```javascript
// Cache intelligent pour optimiser les performances
class CacheService {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map(); // Time to live
  }

  set(key, data, ttlMs = 5 * 60 * 1000) { // 5 min par défaut
    this.cache.set(key, data);
    this.ttl.set(key, Date.now() + ttlMs);
  }

  get(key) {
    if (this.isExpired(key)) {
      this.delete(key);
      return null;
    }
    return this.cache.get(key);
  }

  isExpired(key) {
    const expiry = this.ttl.get(key);
    return expiry && Date.now() > expiry;
  }
}
```

---

## 🎨 UI/UX Guidelines

### Design System

#### Couleurs principales

```css
/* Palette médicale professionnelle */
:root {
  --primary-50: #f0f9ff;
  --primary-500: #3b82f6;  /* Bleu médical */
  --primary-600: #2563eb;

  --success-500: #10b981;  /* Vert validation */
  --warning-500: #f59e0b;  /* Orange attention */
  --error-500: #ef4444;    /* Rouge erreur */

  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-500: #6b7280;
  --gray-900: #111827;
}
```

#### Composants standards

```javascript
// Boutons standardisés
const Button = ({ variant = 'primary', size = 'md', ...props }) => {
  const baseClasses = 'font-medium rounded-lg transition-colors focus:outline-none focus:ring-2';

  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]}`}
      {...props}
    />
  );
};
```

### Responsive Design

```javascript
// Breakpoints Tailwind
const breakpoints = {
  sm: '640px',   // Téléphone landscape
  md: '768px',   // Tablette
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large desktop
  '2xl': '1536px' // Extra large
};

// Classes responsive courantes
const responsiveClasses = {
  container: 'w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  grid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
  modal: 'w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl'
};
```

---

## 🧪 Tests et qualité

### Structure de tests

```javascript
// Tests unitaires avec Jest/React Testing Library
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PatientFormModal } from '../PatientFormModal';

describe('PatientFormModal', () => {
  test('should render form fields correctly', () => {
    render(<PatientFormModal isOpen={true} />);

    expect(screen.getByLabelText(/prénom/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nom/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  test('should validate required fields', async () => {
    render(<PatientFormModal isOpen={true} onSave={jest.fn()} />);

    fireEvent.click(screen.getByText(/enregistrer/i));

    await waitFor(() => {
      expect(screen.getByText(/prénom requis/i)).toBeInTheDocument();
    });
  });
});
```

### Linting et formatage

```json
// .eslintrc.json
{
  "extends": [
    "react-app",
    "react-app/jest"
  ],
  "rules": {
    "no-unused-vars": "warn",
    "no-console": "warn",
    "prefer-const": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

---

## 🚀 Déploiement

### Scripts npm

```json
{
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject",
    "lint": "eslint src/ --ext .js,.jsx",
    "lint:fix": "eslint src/ --ext .js,.jsx --fix",
    "format": "prettier --write src/**/*.{js,jsx,css,md}",
    "analyze": "npm run build && npx bundle-analyzer build/static/js/*.js"
  }
}
```

### Build de production

```bash
# Optimisation pour production
npm run build

# Analyse du bundle
npm run analyze

# Test de l'application
npm test -- --coverage --watchAll=false
```

### Variables d'environnement

```bash
# .env.production
REACT_APP_VERSION=$npm_package_version
REACT_APP_BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
REACT_APP_API_URL=https://api.medicalpro.com
REACT_APP_SENTRY_DSN=your_sentry_dsn
```

---

## 🔄 Migration Backend (Planifiée)

### Architecture API REST

```javascript
// Structure prévue pour l'API
const apiEndpoints = {
  // Authentification
  'POST /auth/login': { body: { email, password } },
  'POST /auth/logout': {},
  'GET /auth/me': {},

  // Patients
  'GET /patients': { query: { page, limit, search } },
  'POST /patients': { body: patientData },
  'PUT /patients/:id': { body: patientData },
  'DELETE /patients/:id': {},

  // Appointments
  'GET /appointments': { query: { date, practitioner } },
  'POST /appointments': { body: appointmentData },

  // Consents
  'GET /consents': { query: { patientId, status } },
  'POST /consents': { body: consentData },
  'PUT /consents/:id/revoke': { body: { reason } }
};
```

### Base de données PostgreSQL

```sql
-- Schema principal des tables
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_number VARCHAR(50) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  birth_date DATE NOT NULL,
  gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  practitioner_id UUID REFERENCES users(id),
  scheduled_at TIMESTAMP NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  status VARCHAR(20) DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  type VARCHAR(50) NOT NULL,
  purpose TEXT NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'granted',
  collection_method VARCHAR(20) DEFAULT 'digital',
  expires_at TIMESTAMP,
  granted_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP NULL,
  revocation_reason TEXT
);
```

---

## 📚 Documentation des APIs internes

### PatientsStorage API

```javascript
/**
 * Service de gestion des patients
 * @module PatientsStorage
 */

/**
 * Récupère tous les patients non supprimés
 * @returns {Array<Patient>} Liste des patients
 */
patientsStorage.getAll()

/**
 * Récupère un patient par son ID
 * @param {string} id - ID du patient
 * @returns {Patient|null} Patient trouvé ou null
 */
patientsStorage.getById(id)

/**
 * Crée un nouveau patient
 * @param {Object} patientData - Données du patient
 * @param {string} userId - ID de l'utilisateur créateur
 * @returns {Patient} Patient créé
 * @throws {Error} Erreur de validation
 */
patientsStorage.create(patientData, userId)
```

### ConsentsStorage API

```javascript
/**
 * Service de gestion des consentements
 * @module ConsentsStorage
 */

/**
 * Types de consentements disponibles
 * @enum {string}
 */
const CONSENT_TYPES = {
  RGPD_DATA_PROCESSING: 'rgpd_data_processing',
  MEDICAL_CARE: 'medical_care',
  MEDICAL_SPECIFIC: 'medical_specific',
  TELEMEDICINE: 'telemedicine',
  RESEARCH: 'research'
};

/**
 * Révoque un consentement
 * @param {string} consentId - ID du consentement
 * @param {string} userId - ID de l'utilisateur
 * @param {string} reason - Raison de la révocation
 * @returns {boolean} Succès de l'opération
 */
consentsStorage.revoke(consentId, userId, reason)
```

---

## 🛠️ Outils de développement

### Extensions VSCode recommandées

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-react-javascript",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

### Configuration Prettier

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

---

## 🔍 Debugging et monitoring

### Logs et debugging

```javascript
// Service de logging structuré
class Logger {
  static info(message, data = {}) {
    console.log(`[INFO] ${message}`, data);
  }

  static error(message, error = {}) {
    console.error(`[ERROR] ${message}`, error);
    // En production : envoyer à Sentry
  }

  static warn(message, data = {}) {
    console.warn(`[WARN] ${message}`, data);
  }
}

// Usage dans les composants
Logger.info('Patient created', { patientId: newPatient.id });
Logger.error('Failed to save patient', error);
```

### Performance monitoring

```javascript
// Mesure des performances
const performanceMonitor = {
  startTimer: (name) => {
    console.time(name);
  },

  endTimer: (name) => {
    console.timeEnd(name);
  },

  measureRender: (ComponentName) => {
    return React.memo(ComponentName, (prevProps, nextProps) => {
      // Comparaison optimisée
      return JSON.stringify(prevProps) === JSON.stringify(nextProps);
    });
  }
};
```

---

## 📋 Checklist de développement

### Avant chaque commit

- [ ] ✅ Lint passé sans erreur
- [ ] ✅ Tests unitaires passés
- [ ] ✅ Build de production réussie
- [ ] ✅ Responsive design vérifié
- [ ] ✅ Permissions testées pour tous les rôles
- [ ] ✅ Documentation mise à jour

### Avant chaque release

- [ ] ✅ Tests d'intégration complets
- [ ] ✅ Validation RGPD et sécurité
- [ ] ✅ Performance benchmark
- [ ] ✅ Accessibilité validée
- [ ] ✅ Documentation utilisateur mise à jour
- [ ] ✅ Changelog publié

---

## 🚨 Troubleshooting

### Problèmes courants

#### 1. Erreurs de permissions

```javascript
// Vérifier les permissions utilisateur
const { userPermissions } = useAuth();
console.log('User permissions:', userPermissions);

// Forcer le rechargement des permissions
const { refreshPermissions } = useAuth();
refreshPermissions();
```

#### 2. Données corrompues en LocalStorage

```javascript
// Nettoyer le localStorage
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('clinic_')) {
    localStorage.removeItem(key);
  }
});
```

#### 3. Erreurs de rendu

```javascript
// Error boundary pour capturer les erreurs
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    Logger.error('React Error Boundary', { error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return <h1>Une erreur est survenue.</h1>;
    }
    return this.props.children;
  }
}
```

---

**Ce guide technique est maintenu à jour avec l'évolution de la plateforme MedicalPro.** 🛠️✨