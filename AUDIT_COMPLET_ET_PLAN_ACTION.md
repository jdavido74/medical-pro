# AUDIT COMPLET - MEDICAL-PRO SaaS
## Rapport de stabilisation et plan d'action

**Date**: 2026-01-18
**Objectif**: Obtenir un SaaS fonctionnel, debuggué et maintenable

---

## RÉSUMÉ EXÉCUTIF

### État actuel
- **Backend**: 19 fichiers routes, ~40% sans validation Joi complète
- **Frontend**: 14 clients API, ~30% avec problèmes de format
- **Migration localStorage→API**: ~35% complète
- **Permissions**: 3 incohérences critiques identifiées
- **Modèles de données**: 92-95% alignés

### Problèmes critiques identifiés: 27
- 🔴 **CRITIQUES** (bloquants): 8
- 🟠 **MAJEURS** (fonctionnalité dégradée): 11
- 🟡 **MINEURS** (dette technique): 8

---

## PARTIE 1: PROBLÈMES CRITIQUES À RÉSOUDRE EN PRIORITÉ

### 1.1 Permissions désynchronisées (CRITIQUE)

| Problème | Impact | Fichier | Action |
|----------|--------|---------|--------|
| `AUDIT_VIEW: 'audit.read'` au lieu de `'audit.view'` | Admin ne peut pas voir les logs | `permissionsStorage.js:125` | Corriger en `'audit.view'` |
| `MEDICAL_NOTES_CREATE` manquant | Médecins ne peuvent pas créer de notes | `permissionsStorage.js` | Ajouter la permission |
| `CONSENTS_SIGN` manquant | Signature consentements bloquée | `permissionsStorage.js` | Ajouter la permission |

### 1.2 Validation Joi manquante (CRITIQUE - Sécurité)

| Route | Méthode | Problème |
|-------|---------|----------|
| `/admin/companies` | GET | Pas de validation pagination |
| `/admin/users` | GET | Pas de validation pagination |
| `/admin/users/:id` | PUT | Pas de schéma validation |
| `/audit/log` | POST | Validation manuelle |
| `/prescriptions` | GET | Pas de validation params |
| `/prescriptions/patient/:patientId` | GET | Pas de validation UUID |
| `/appointments/:id/items` | POST | Pas de validation items |
| `/clinic-settings/closed-dates` | POST | Validation manuelle |
| `/consent-signing/patient/:patientId` | GET | Pas de validation UUID |
| `/quotes` | GET | Pas de validation pagination |

### 1.3 APIs manquantes (CRITIQUE - Fonctionnalité)

| Module Storage | Lignes | API Backend | Statut |
|----------------|--------|-------------|--------|
| `usersStorage.js` | 644 | ❌ Aucune | **À CRÉER** |
| `auditStorage.js` | 635 | ❌ Aucune | **À CRÉER** |
| `backupStorage.js` | 708 | ❌ Aucune | **À CRÉER** |

### 1.4 Query params camelCase vs snake_case (CRITIQUE)

| Client API | Ligne | Problème | Correction |
|------------|-------|----------|------------|
| `consentsApi.js` | 20-22 | `patientId` envoyé | Envoyer `patient_id` |
| `consentTemplatesApi.js` | 19, 1038 | `consentType` envoyé | Envoyer `consent_type` |
| `practitionerAvailabilityApi.js` | 152 | `providerId` envoyé | Envoyer `provider_id` |
| `consentSigningApi.js` | 33 | `params` vs `query` | Utiliser `query` |

---

## PARTIE 2: PROBLÈMES MAJEURS

### 2.1 Migration localStorage incomplète

| Module | API existe | Contexte React | Composants affectés | Priorité |
|--------|------------|----------------|---------------------|----------|
| `appointmentsStorage` | ✅ | ❌ NON | 5+ | HAUTE |
| `consentsStorage` | ✅ | ❌ NON | 3+ | HAUTE |
| `medicalRecordsStorage` | ✅ | ❌ NON | 4+ | HAUTE |
| `consentTemplatesStorage` | ✅ | ❌ NON | 2+ | HAUTE |
| `teamsStorage` | ✅ | ❌ NON | 3+ | MOYENNE |

**Composants avec mélange Storage + API**:
- `AppointmentsModule.js` - utilise storage direct
- `ConsentManagementModule.js` - mixte
- `MedicalRecordsModule.js` - mixte
- `TeamManagementModule.js` - mixte
- `UserManagementModule.js` - storage uniquement

### 2.2 Formats de réponse API incohérents

| Problème | Routes affectées |
|----------|------------------|
| Pagination: `totalPages` vs `pages` vs `total` | Multiples |
| Meta information absente | `/patients`, `/appointments` |
| Error format variable | Global |

### 2.3 Logging incohérent

| Fichier | Problème |
|---------|----------|
| `clinicRoles.js` | `console.error` au lieu de logger |
| `medical-records.js` | Mélange console et logger |
| `prescriptions.js` | `console.error` au lieu de logger |

---

## PARTIE 3: PLAN D'ACTION DÉTAILLÉ

### PHASE 1: CORRECTIONS CRITIQUES (Semaine 1)

#### Sprint 1.1: Permissions (Jour 1-2)

```javascript
// Fichier: src/utils/permissionsStorage.js

// 1. Corriger AUDIT_VIEW (ligne 125)
AUDIT_VIEW: 'audit.view',  // PAS 'audit.read'

// 2. Ajouter permissions manquantes (après ligne 67)
MEDICAL_NOTES_CREATE: 'medical_notes.create',
CONSENTS_SIGN: 'consents.sign',

// 3. Mettre à jour rôle physician (ligne ~287)
// Ajouter: PERMISSIONS.MEDICAL_NOTES_CREATE

// 4. Mettre à jour rôle secretary si nécessaire
// Ajouter: PERMISSIONS.CONSENTS_SIGN
```

#### Sprint 1.2: Validation Joi (Jour 2-4)

Créer les schémas manquants:
```javascript
// Pour chaque route sans validation, ajouter:
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  search: Joi.string().allow('').optional()
});

const uuidParamSchema = Joi.object({
  id: Joi.string().uuid().required()
});
```

#### Sprint 1.3: Query params snake_case (Jour 4-5)

```javascript
// consentsApi.js - ligne 20-22
if (patientId) query.patient_id = patientId;
if (consentType) query.consent_type = consentType;

// consentTemplatesApi.js - ligne 19
if (consentType) query.consent_type = consentType;

// practitionerAvailabilityApi.js - ligne 152
query: { provider_id: providerId, date, duration }
```

### PHASE 2: APIS MANQUANTES (Semaine 2)

#### Sprint 2.1: Users API Backend

Créer `/var/www/medical-pro-backend/src/routes/users.js`:
- GET `/users` - Liste avec pagination
- GET `/users/:id` - Détail utilisateur
- POST `/users` - Création
- PUT `/users/:id` - Modification
- DELETE `/users/:id` - Suppression (soft)

#### Sprint 2.2: Audit API Backend

Compléter `/var/www/medical-pro-backend/src/routes/audit.js`:
- Ajouter validation Joi sur POST `/audit/log`
- Ajouter validation sur GET `/audit/logs`

#### Sprint 2.3: Users API Frontend

Créer `/var/www/medical-pro/src/api/usersApi.js`:
- Même pattern que teamsApi.js
- Transformations snake_case ↔ camelCase

### PHASE 3: CONTEXTES REACT (Semaine 3)

Créer les contextes manquants sur le modèle de `PatientContext`:

1. `AppointmentContext.js`
2. `ConsentContext.js`
3. `MedicalRecordContext.js`
4. `TeamContext.js` (optionnel)

Pattern à suivre:
```javascript
// Exemple: AppointmentContext.js
const AppointmentContext = createContext();

export const AppointmentProvider = ({ children }) => {
  const [appointments, setAppointments] = useState([]);

  const fetchAppointments = async (filters) => {
    const result = await appointmentsApi.getAppointments(filters);
    setAppointments(result.appointments);
  };

  // ... autres méthodes

  return (
    <AppointmentContext.Provider value={{ appointments, fetchAppointments, ... }}>
      {children}
    </AppointmentContext.Provider>
  );
};
```

### PHASE 4: MIGRATION COMPOSANTS (Semaine 4)

Migrer les composants pour utiliser les contextes:

| Composant | De | Vers |
|-----------|-----|------|
| `AppointmentsModule.js` | `appointmentsStorage.getAll()` | `useAppointments()` |
| `ConsentManagementModule.js` | `consentsStorage.*` | `useConsents()` |
| `MedicalRecordsModule.js` | `medicalRecordsStorage.*` | `useMedicalRecords()` |

### PHASE 5: NETTOYAGE (Semaine 5)

1. **Supprimer les appels localStorage directs** dans les composants
2. **Standardiser le logging** (utiliser logger partout)
3. **Standardiser les formats de réponse API**
4. **Documenter les APIs** (OpenAPI/Swagger optionnel)

---

## PARTIE 4: CHECKLIST DE VALIDATION

### Tests à effectuer après chaque phase

#### Phase 1 - Permissions
- [ ] Admin peut accéder aux logs d'audit
- [ ] Médecin peut créer des notes médicales
- [ ] Secrétaire peut signer des consentements
- [ ] Toutes les routes admin fonctionnent

#### Phase 2 - APIs
- [ ] CRUD utilisateurs fonctionne
- [ ] Audit logs sont persistés en DB
- [ ] Pas d'erreur console sur les pages admin

#### Phase 3 - Contextes
- [ ] Données chargées depuis l'API
- [ ] Pas de fallback localStorage utilisé
- [ ] Refresh des données fonctionne

#### Phase 4 - Migration
- [ ] Supprimer localStorage ne casse rien
- [ ] Performance acceptable
- [ ] Pas de régression fonctionnelle

---

## PARTIE 5: ESTIMATION EFFORT

| Phase | Durée estimée | Complexité | Risque |
|-------|---------------|------------|--------|
| Phase 1: Corrections critiques | 5 jours | Moyenne | Faible |
| Phase 2: APIs manquantes | 5 jours | Moyenne | Moyen |
| Phase 3: Contextes React | 5 jours | Haute | Moyen |
| Phase 4: Migration composants | 5 jours | Haute | Élevé |
| Phase 5: Nettoyage | 3 jours | Faible | Faible |

**Total estimé: 23 jours de travail**

---

## PARTIE 6: FICHIERS À MODIFIER (Résumé)

### Backend
```
/var/www/medical-pro-backend/src/
├── routes/
│   ├── admin.js           # Ajouter validation Joi
│   ├── audit.js           # Ajouter validation Joi
│   ├── prescriptions.js   # Ajouter validation params
│   ├── quotes.js          # Ajouter validation pagination
│   ├── consent-signing.js # Ajouter validation UUID
│   ├── clinic-settings.js # Ajouter validation Joi
│   └── users.js           # CRÉER (nouveau fichier)
└── utils/
    └── permissionConstants.js # OK (déjà correct)
```

### Frontend
```
/var/www/medical-pro/src/
├── api/
│   ├── consentsApi.js             # Corriger query params
│   ├── consentTemplatesApi.js     # Corriger query params
│   ├── practitionerAvailabilityApi.js # Corriger query params
│   ├── consentSigningApi.js       # Corriger params → query
│   └── usersApi.js                # CRÉER (nouveau fichier)
├── contexts/
│   ├── AppointmentContext.js      # CRÉER
│   ├── ConsentContext.js          # CRÉER
│   └── MedicalRecordContext.js    # CRÉER
├── utils/
│   └── permissionsStorage.js      # Corriger AUDIT_VIEW + ajouter permissions
└── components/
    ├── dashboard/modules/
    │   ├── AppointmentsModule.js  # Migrer vers contexte
    │   └── ConsentManagementModule.js # Migrer vers contexte
    └── admin/
        └── UserManagementModule.js # Migrer vers API
```

---

## PARTIE 7: PROCHAINES ÉTAPES IMMÉDIATES

### À faire MAINTENANT (Jour 1):

1. **Corriger `permissionsStorage.js`**:
   - Ligne 125: `AUDIT_VIEW: 'audit.view'`
   - Ajouter `MEDICAL_NOTES_CREATE` et `CONSENTS_SIGN`

2. **Corriger les query params** dans:
   - `consentsApi.js`
   - `consentTemplatesApi.js`

3. **Tester** les corrections de permissions

### À faire cette semaine:

4. Ajouter validation Joi aux routes critiques
5. Créer `usersApi.js` frontend
6. Commencer la migration `UserManagementModule.js`

---

## ANNEXES

### A. Liste complète des routes sans validation Joi

Voir audit détaillé section routes backend.

### B. Mapping complet permissions Backend ↔ Frontend

Voir audit détaillé section permissions.

### C. Statistiques localStorage

- **Appels directs restants**: 40+
- **Modules storage**: 12
- **Lignes de code storage**: 7,379

---

*Rapport généré le 2026-01-18*
*Pour questions: Consulter les audits détaillés dans les agents*
