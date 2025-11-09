# Architecture de Sécurité - MedicalPro

## 📋 Table des matières
1. [Vue d'ensemble](#vue-densemble)
2. [Layers de sécurité](#layers-de-sécurité)
3. [Flux de données sécurisé](#flux-de-données-sécurisé)
4. [Comment créer un nouveau contexte sécurisé](#comment-créer-un-nouveau-contexte-sécurisé)
5. [Migration localStorage → API](#migration-localstorage--api)
6. [Audit logging](#audit-logging)
7. [Gestion des permissions](#gestion-des-permissions)
8. [Chiffrement des données](#chiffrement-des-données)

---

## 🎯 Vue d'ensemble

MedicalPro suit une architecture **Security-First** avec 3 couches abstraites réutilisables :

```
┌─────────────────────────────────────────────┐
│          Composants (AppointmentModal)      │
│        (ne savent rien de la sécurité)      │
├─────────────────────────────────────────────┤
│     Contextes (PatientContext)              │
│   (synchrone, données réactives)            │
├─────────────────────────────────────────────┤
│  useSecureDataContext Hook (réutilisable)   │
│   (permissions + audit + chiffrement)       │
├─────────────────────────────────────────────┤
│     Couche de Sécurité                      │
│  ├─ secureDataAccess (permissions + audit)  │
│  ├─ dataEncryption (chiffrement abstrait)   │
│  └─ sensitiveLevels (classification)        │
├─────────────────────────────────────────────┤
│     Storage / API                           │
│  ├─ Phase 1: localStorage                   │
│  └─ Phase 2+: API REST / GraphQL            │
└─────────────────────────────────────────────┘
```

### ✅ Avantages de cette architecture

- **Réutilisabilité** : Un seul hook pour TOUS les contextes
- **Synchrone** : Mise à jour automatique des données entre modals
- **GDPR-ready** : Audit logging intégré, chiffrement préparé
- **Extensible** : Ajout facile de nouveaux contextes
- **Migration transparente** : localStorage → API sans toucher aux composants

---

## 🔒 Layers de sécurité

### Layer 1 : Classification des données (sensitiveLevels.js)

Chaque type de données a un niveau de sensibilité :

```javascript
// PUBLIC (pas de sensibilité)
SENSITIVITY_LEVELS.PUBLIC = 0;

// INTERNAL (accès restreint)
SENSITIVITY_LEVELS.INTERNAL = 1;

// CONFIDENTIAL (chiffrement requis)
SENSITIVITY_LEVELS.CONFIDENTIAL = 2;

// HIGHLY_SENSITIVE (données médicales - chiffrement AES-256)
SENSITIVITY_LEVELS.HIGHLY_SENSITIVE = 3;
```

**Mapping pour PATIENT :**
```javascript
DATA_TYPE_SENSITIVITY.PATIENT = {
  id: CONFIDENTIAL,
  firstName: HIGHLY_SENSITIVE,
  email: HIGHLY_SENSITIVE,
  allergies: HIGHLY_SENSITIVE,
  medications: HIGHLY_SENSITIVE,
  // ...
}
```

**Utilisation :**
```javascript
import { isHighlySensitive, getFieldSensitivityLevel } from '../utils/security';

// Vérifier si une donnée est hautement sensible
if (isHighlySensitive('PATIENT')) {
  // Appliquer chiffrement fort
}

// Vérifier la sensibilité d'un champ
const fieldLevel = getFieldSensitivityLevel('PATIENT', 'allergies');
```

---

### Layer 2 : Accès sécurisé (secureDataAccess.js)

Avant CHAQUE accès aux données :

1. **Vérifier les permissions** (RBAC)
2. **Logger l'accès** (audit)
3. **Accéder aux données**
4. **Déchiffrer si nécessaire** (future use)

```javascript
import { secureDataAccess } from '../utils/security';

// Accéder à des données avec permissions + audit
const patient = await secureDataAccess.accessSecure(
  user,                           // Utilisateur courant
  'READ',                         // Action (READ, CREATE, UPDATE, DELETE)
  'PATIENT',                      // Type de données
  () => patientsStorage.getById(id),  // Fonction d'accès
  {
    targetId: id,
    reason: 'View patient profile'   // Pour l'audit
  }
);
```

**Résultat du log audit :**
```javascript
{
  action: 'PATIENT_READ',
  userId: 'user_123',
  targetId: 'pat_001',
  reason: 'View patient profile',
  timestamp: '2025-11-08T16:00:00Z',
  status: 'success'
}
```

---

### Layer 3 : Chiffrement abstrait (dataEncryption.js)

Gère le chiffrement de manière **transparente** pour la migration :

**Phase 1 (Actuellement) :**
```javascript
// localhost - juste marquer comme sensible
const marked = await dataEncryption.encrypt(patientData, 'PATIENT');
// Retour: {firstName: '...', __sensitive__: {dataType: 'PATIENT', ...}}
```

**Phase 2+ (Avec backend API) :**
```javascript
// Backend - chiffrement réel avec AES-256
const marked = await dataEncryption.encrypt(patientData, 'PATIENT');
// Appel API: POST /api/security/encrypt
// Retour: {__encrypted__: 'aes256:...', __sensitive__: {...}}
```

**Pour les développeurs : AUCUN changement de code** ✅

---

## 🔄 Flux de données sécurisé

### Exemple : Créer un patient rapide

```
1. QuickPatientModal.handleSave()
        ↓
2. PatientContext.createPatient(data)
        ↓
3. useSecureDataContext.create()
        ↓
4. secureDataAccess.createSecure()
        │
        ├─ Vérifier permission: user.hasPermission('PATIENT_CREATE')
        ├─ ✅ Autorisé
        │
        ├─ dataEncryption.encrypt(data, 'PATIENT')
        │  └─ Marqué comme sensible (Phase 1) / Chiffré (Phase 2+)
        │
        ├─ patientsStorage.create(encryptedData)
        │  └─ Sauvegardé dans localStorage
        │
        ├─ auditStorage.log({action: 'PATIENT_CREATE', ...})
        │  └─ Audit enregistré
        │
        └─ Retour: newPatient
        ↓
5. PatientContext met à jour state: setPatients([...prev, newPatient])
        ↓
6. ✅ SYNCHRONE : AppointmentFormModal voit le nouveau patient immédiatement
        ↓
7. handlePatientCreated() → setFormData({patientId: newPatient.id})
        ↓
8. ✅ Nouveau patient sélectionné automatiquement
```

---

## 📝 Comment créer un nouveau contexte sécurisé

### Étape 1 : Ajouter la classification de sensibilité

Dans `src/utils/security/sensitiveLevels.js` :

```javascript
DATA_TYPE_SENSITIVITY.MY_NEW_TYPE = {
  level: SENSITIVITY_LEVELS.HIGHLY_SENSITIVE,
  fields: {
    id: CONFIDENTIAL,
    name: HIGHLY_SENSITIVE,
    sensitiveField: HIGHLY_SENSITIVE,
    // ...
  }
};
```

### Étape 2 : Créer le contexte avec le hook

Dans `src/contexts/MyNewContext.js` :

```javascript
import React, { createContext, useCallback, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { myNewStorage } from '../utils/myNewStorage';
import useSecureDataContext from '../hooks/useSecureDataContext';

export const MyNewContext = createContext();

export const MyNewProvider = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // 1️⃣ Un seul hook pour toute la sécurité !
  const secureOps = useSecureDataContext('MY_NEW_TYPE', myNewStorage, user);

  // 2️⃣ Charger les données
  useEffect(() => {
    const load = async () => {
      try {
        if (user) {
          const loaded = await secureOps.getAll();
          setItems(loaded);
        }
        setIsInitialized(true);
      } catch (error) {
        console.error('[MyNewContext] Error:', error);
        setIsInitialized(true);
      }
    };
    load();
  }, [user, secureOps]);

  // 3️⃣ Opérations avec synchronisation
  const createItem = useCallback(async (itemData, options = {}) => {
    try {
      const newItem = await secureOps.create(itemData, {
        reason: options.reason || 'Create new item'
      });

      // ✅ SYNC : Mettre à jour immédiatement
      setItems((prev) => [...prev, newItem]);
      return newItem;
    } catch (error) {
      console.error('[MyNewContext] Error creating:', error);
      throw error;
    }
  }, [secureOps]);

  // ... updateItem, deleteItem, etc.

  const value = {
    items,
    isLoading: secureOps.isLoading,
    error: secureOps.error,
    createItem,
    updateItem,
    deleteItem,
    // ...
  };

  return (
    <MyNewContext.Provider value={value}>
      {children}
    </MyNewContext.Provider>
  );
};
```

### Étape 3 : Utiliser le contexte dans les composants

```javascript
import { useContext } from 'react';
import { MyNewContext } from '../contexts/MyNewContext';

const MyComponent = () => {
  const { items, createItem, isLoading } = useContext(MyNewContext);

  const handleCreate = async () => {
    try {
      const newItem = await createItem({ name: 'Nouveau' });
      // ✅ Les données sont synchrones
      // ✅ Audit logging automatique
      // ✅ Chiffrement appliqué automatiquement
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div>
      {items.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
      <button onClick={handleCreate} disabled={isLoading}>
        Créer
      </button>
    </div>
  );
};
```

### C'est tout ! ✅

Vous avez automatiquement :
- ✅ Vérification des permissions
- ✅ Audit logging
- ✅ Chiffrement (quand backend en place)
- ✅ Synchronisation des données
- ✅ Gestion des erreurs

---

## 🔄 Migration localStorage → API

### Phase 1 (Actuelle)

```
Contexte → useSecureDataContext → secureDataAccess → localStorage
```

### Phase 2 (Transition)

Modifier SEULEMENT le hook :

```javascript
// Dans src/hooks/useSecureDataContext.js

const getAll = useCallback(async () => {
  // Avant:
  // const allData = await secureDataAccess.accessSecure(
  //   user, 'READ', dataType,
  //   () => storageUtility.getAll()  // ← localStorage
  // );

  // Après:
  const allData = await secureDataAccess.accessSecure(
    user, 'READ', dataType,
    () => fetch(`/api/${dataType.toLowerCase()}s`).then(r => r.json())  // ← API
  );

  return allData;
}, [dataType, user]);
```

### Composants et contextes ?

**AUCUN changement** ✅

Ils continuent à fonctionner exactement pareil car tout passe par `useSecureDataContext`.

---

## 📊 Audit Logging

### Que se passe-t-il automatiquement ?

Chaque opération est enregistrée :

```javascript
{
  action: 'PATIENT_CREATE',           // Quoi
  userId: 'user_123',                 // Qui
  targetId: 'pat_001',                // Sur quoi
  reason: 'Create new patient',       // Pourquoi
  timestamp: '2025-11-08T16:00:00Z',  // Quand
  status: 'success',                  // Résultat
  ipAddress: 'localhost',             // D'où
  details: '[SENSITIVE DATA]'         // Détails (sans révéler les données)
}
```

### Accès à l'audit

```javascript
import auditStorage from '../utils/auditStorage';

// Obtenir tous les logs
const logs = auditStorage.getAll();

// Filtrer par utilisateur
const userLogs = logs.filter(log => log.userId === 'user_123');

// Filtrer par action
const createLogs = logs.filter(log => log.action.includes('CREATE'));

// Filtrer par date
const todayLogs = logs.filter(log =>
  new Date(log.timestamp).toDateString() === new Date().toDateString()
);
```

---

## 👤 Gestion des permissions

### Vérifier les permissions

```javascript
import { permissionsStorage } from '../utils/permissionsStorage';

// Vérifier une permission
const canCreate = permissionsStorage.hasPermission(user, 'PATIENT_CREATE');

// Vérifier plusieurs
const canManage = permissionsStorage.hasPermission(user, [
  'PATIENT_READ',
  'PATIENT_CREATE',
  'PATIENT_UPDATE'
]);
```

### Permissions automatiques

Quand vous utilisez le contexte, les vérifications se font automatiquement :

```javascript
const { createPatient } = useContext(PatientContext);

try {
  // Si user n'a pas PATIENT_CREATE : throw error
  // Si user a PATIENT_CREATE : crée le patient
  // Audit est enregistré automatiquement
  const newPatient = await createPatient(data);
} catch (error) {
  // 'Vous n\'avez pas la permission de créer des patients'
  console.error(error.message);
}
```

---

## 🔐 Chiffrement des données

### Sensibilité des données

Chaque donnée est classifiée :

```javascript
// Données HAUTEMENT sensibles (médicales)
HIGHLY_SENSITIVE: {
  firstName, lastName, email, phone,     // Données personnelles
  birthDate, allergies, medications,     // Données médicales
  insuranceNumber, medicalHistory        // Données sensibles
}

// Données CONFIDENTIELLES (accès restreint)
CONFIDENTIAL: {
  id, patientNumber, birthPlace,         // Identifiants
  gender, nationality,                   // Données non-publiques
  createdAt, updatedAt                   // Métadonnées
}

// Données INTERNES (non-sensibles)
INTERNAL: {
  status, isIncomplete                   // État système
}
```

### Redacter les données pour le logging

```javascript
import { dataEncryption } from '../utils/security';

const patient = {
  id: 'pat_001',
  firstName: 'Jean',
  email: 'jean@example.com',
  allergies: 'Pénicilline'
};

// Pour le logging : ne pas révéler les données sensibles
const redacted = dataEncryption.redactSensitiveData(patient, 'PATIENT');
// Retour: {
//   id: 'pat_001',
//   firstName: '[REDACTED]',
//   email: '[REDACTED]',
//   allergies: '[REDACTED]'
// }

console.log(`Created patient ${redacted.id}`);
// Output: "Created patient pat_001" (sans révéler les noms/emails)
```

---

## 🧪 Tester la sécurité

### Tester les permissions

```javascript
// Test 1 : Vérifier que user_regular ne peut pas créer
const user = { id: 'user_regular', role: 'user' };
try {
  await createPatient(data);  // Doit échouer
} catch (error) {
  console.assert(
    error.message.includes('permission'),
    'Permission check passed'
  );
}

// Test 2 : Vérifier que admin peut créer
const admin = { id: 'admin_1', role: 'admin' };
const newPatient = await createPatient(data);
console.assert(newPatient.id, 'Admin creation passed');
```

### Tester l'audit

```javascript
import auditStorage from '../utils/auditStorage';

// Avant opération
const beforeCount = auditStorage.getAll().length;

// Opération
await createPatient(data);

// Après opération
const afterCount = auditStorage.getAll().length;
console.assert(afterCount > beforeCount, 'Audit logged');

// Vérifier le contenu du log
const lastLog = auditStorage.getAll().pop();
console.assert(lastLog.action === 'PATIENT_CREATE', 'Correct action logged');
```

### Tester la synchronisation

```javascript
// Avant de créer
console.assert(context.patients.length === 5, 'Initial count');

// Créer via une modal
await context.createPatient(data);

// Synchrone - l'autre modal voit immédiatement
console.assert(context.patients.length === 6, 'Sync successful');
console.assert(context.patients[5].id === newPatient.id, 'New patient visible');
```

---

## 🚀 Bonnes pratiques

### ✅ À FAIRE

```javascript
// 1. Utiliser les contextes (ils gèrent la sécurité)
const { createPatient } = useContext(PatientContext);
const newPatient = await createPatient(data);

// 2. Utiliser secureDataAccess pour les opérations spéciales
const data = await secureDataAccess.accessSecure(
  user, 'READ', 'PATIENT',
  () => patientsStorage.getById(id)
);

// 3. Redacter les données sensibles pour le logging
console.log(`Patient: ${dataEncryption.redactSensitiveData(patient)}`);

// 4. Vérifier les permissions avant d'afficher l'UI
const { canCreatePatient } = useContext(PatientContext);
if (!await canCreatePatient()) {
  return <p>Non autorisé</p>;
}
```

### ❌ À NE PAS FAIRE

```javascript
// ❌ NE PAS accéder directement à localStorage
const patient = patientsStorage.getById(id);  // Pas de permission check !

// ❌ NE PAS logger les données sensibles
console.log(`Created patient: ${JSON.stringify(patient)}`);  // Révèle les données !

// ❌ NE PAS créer des contextes sans le hook
export const BadContext = createContext();
BadContext.Provider.value = {
  patients: patientsStorage.getAll()  // Pas de permissions, pas d'audit !
};

// ❌ NE PAS mélanger localStorage et API
// (C'est transparent quand on utilise useSecureDataContext ✅)
```

---

## 📚 Fichiers clés

| Fichier | Responsabilité |
|---------|----------------|
| `src/utils/security/sensitiveLevels.js` | Classification des données |
| `src/utils/security/secureDataAccess.js` | Permissions + audit |
| `src/utils/security/dataEncryption.js` | Chiffrement abstrait |
| `src/utils/security/index.js` | Exports |
| `src/hooks/useSecureDataContext.js` | Hook réutilisable (CŒUR) |
| `src/contexts/PatientContext.js` | Exemple complet |
| `src/contexts/AppointmentContext.js` | Exemple complet |
| `src/utils/auditStorage.js` | Audit logging |
| `src/utils/permissionsStorage.js` | Gestion des permissions |

---

## 🎓 FAQ

**Q: Comment ajouter une nouvelle donnée sensible ?**
A: Ajouter dans `sensitiveLevels.js` : `DATA_TYPE_SENSITIVITY.NEW_TYPE = { level: HIGHLY_SENSITIVE, ... }`

**Q: Qu'est-ce qui change quand on passe à une API ?**
A: SEULEMENT le hook `useSecureDataContext` change. Aucun autre code ne bouge.

**Q: Comment je sais que les permissions sont vérifiées ?**
A: Regarder l'audit log. Chaque accès est enregistré avec la raison.

**Q: Et si je fais une erreur de sécurité ?**
A: Les logs audit vous le montreront. Les permissions rejettent automatiquement les accès non-autorisés.

**Q: Comment tester la conformité GDPR ?**
A: Vérifier : audit logs (qui a accédé quand), chiffrement (données protégées), permissions (contrôle d'accès).

---

**Version** : 1.0
**Dernière mise à jour** : 2025-11-08
**Auteur** : Architecture Team
