# Guide de gestion des erreurs

## 📋 Vue d'ensemble

Système centralisé et réutilisable de gestion et d'affichage des erreurs pour l'application Medical Pro.

## 🏗️ Architecture

### 1. Utilitaires (`src/utils/errorHandler.js`)

Fonctions de parsing et formatage des erreurs :

```javascript
import { parseError, extractFieldErrors, formatUserMessage } from '../utils/errorHandler';

// Parse une erreur de n'importe quelle source
const parsed = parseError(error);
// Retourne: { message, details, type, status? }

// Extrait les erreurs de champs (ex: "email" is required)
const fieldErrors = extractFieldErrors(parsed);
// Retourne: { email: 'is required', ... }

// Formate pour affichage utilisateur
const message = formatUserMessage(error);
```

**Types d'erreurs supportés** :
- `backend` - Erreurs du backend Medical Pro
- `http` - Erreurs HTTP (400, 401, 403, 404, 500...)
- `network` - Erreurs de connexion
- `validation` - Erreurs de validation Joi
- `javascript` - Erreurs JavaScript standard
- `unknown` - Erreurs inconnues

### 2. Hook personnalisé (`src/hooks/useFormErrors.js`)

Hook React pour gérer les erreurs de formulaire :

```javascript
import { useFormErrors } from '../hooks/useFormErrors';

function MyForm() {
  const {
    errors,                // Object: field -> error message
    generalError,          // Object: { message, details, type }
    setFieldError,         // Function: (field, message) => void
    clearFieldError,       // Function: (field) => void
    handleBackendError,    // Function: (error) => void
    getFieldError,         // Function: (field) => string|null
    clearErrors,           // Function: () => void
    hasErrors              // Function: () => boolean
  } = useFormErrors();

  const handleSubmit = async () => {
    try {
      await api.save(data);
    } catch (error) {
      handleBackendError(error); // Parse et affiche automatiquement
    }
  };
}
```

### 3. Composants d'affichage (`src/components/common/ErrorMessage.js`)

#### ErrorMessage - Erreur générale

```javascript
import ErrorMessage from '../components/common/ErrorMessage';

<ErrorMessage
  message="Erreur de validation"
  details="Vérifiez les champs obligatoires"
  type="validation"  // error|warning|info|validation
  onDismiss={() => setError(null)}
/>
```

#### FieldError - Erreur de champ

```javascript
import { FieldError } from '../components/common/ErrorMessage';

<FieldError error="Email requis" />
```

#### ErrorList - Liste d'erreurs

```javascript
import { ErrorList } from '../components/common/ErrorMessage';

<ErrorList errors={['Email invalide', 'Téléphone requis']} />
```

### 4. Composants de formulaire (`src/components/common/FormField.js`)

Champs de formulaire avec gestion d'erreurs intégrée :

#### TextField

```javascript
import { TextField } from '../components/common/FormField';

<TextField
  label="Email"
  name="email"
  type="email"
  value={formData.email}
  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
  error={getFieldError('email')}
  required
  icon={Mail}
  placeholder="user@example.com"
/>
```

#### SelectField

```javascript
import { SelectField } from '../components/common/FormField';

<SelectField
  label="Rôle"
  name="role"
  value={formData.role}
  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
  error={getFieldError('role')}
  required
  icon={Shield}
  options={[
    { value: 'admin', label: 'Administrateur' },
    { value: 'user', label: 'Utilisateur' }
  ]}
/>
```

#### TextAreaField

```javascript
import { TextAreaField } from '../components/common/FormField';

<TextAreaField
  label="Description"
  name="description"
  value={formData.description}
  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
  error={getFieldError('description')}
  rows={4}
/>
```

#### CheckboxField

```javascript
import { CheckboxField } from '../components/common/FormField';

<CheckboxField
  label="Compte actif"
  name="isActive"
  checked={formData.isActive}
  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
/>
```

#### RadioGroupField

```javascript
import { RadioGroupField } from '../components/common/FormField';

<RadioGroupField
  label="Type"
  name="type"
  value={formData.type}
  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
  error={getFieldError('type')}
  options={[
    { value: 'patient', label: 'Patient' },
    { value: 'practitioner', label: 'Praticien' }
  ]}
/>
```

## 🎯 Exemple complet

```javascript
import React, { useState } from 'react';
import { useFormErrors } from '../hooks/useFormErrors';
import { TextField, SelectField } from '../components/common/FormField';
import ErrorMessage from '../components/common/ErrorMessage';
import { api } from '../api';

function UserForm({ onSave, onClose }) {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: ''
  });

  const {
    generalError,
    setFieldError,
    clearFieldError,
    handleBackendError,
    getFieldError,
    clearErrors
  } = useFormErrors();

  const [isLoading, setIsLoading] = useState(false);

  // Validation frontend
  const validateForm = () => {
    clearErrors();
    let isValid = true;

    if (!formData.email.trim()) {
      setFieldError('email', 'Email requis');
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setFieldError('email', 'Format email invalide');
      isValid = false;
    }

    if (!formData.firstName.trim()) {
      setFieldError('firstName', 'Prénom requis');
      isValid = false;
    }

    if (!formData.lastName.trim()) {
      setFieldError('lastName', 'Nom requis');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await api.createUser(formData);
      clearErrors();
      onSave();
      onClose();
    } catch (error) {
      // Parse automatiquement l'erreur backend et affiche les erreurs de champs
      handleBackendError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    clearFieldError(field); // Efface l'erreur quand l'utilisateur modifie
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Erreur générale */}
      {generalError && (
        <ErrorMessage
          message={generalError.message}
          details={generalError.details}
          type={generalError.type === 'validation' ? 'validation' : 'error'}
        />
      )}

      {/* Champs avec gestion d'erreurs */}
      <TextField
        label="Email"
        name="email"
        type="email"
        value={formData.email}
        onChange={(e) => handleChange('email', e.target.value)}
        error={getFieldError('email')}
        required
        placeholder="user@example.com"
      />

      <TextField
        label="Prénom"
        name="firstName"
        value={formData.firstName}
        onChange={(e) => handleChange('firstName', e.target.value)}
        error={getFieldError('firstName')}
        required
      />

      <TextField
        label="Nom"
        name="lastName"
        value={formData.lastName}
        onChange={(e) => handleChange('lastName', e.target.value)}
        error={getFieldError('lastName')}
        required
      />

      <SelectField
        label="Rôle"
        name="role"
        value={formData.role}
        onChange={(e) => handleChange('role', e.target.value)}
        error={getFieldError('role')}
        required
        options={[
          { value: 'admin', label: 'Administrateur' },
          { value: 'user', label: 'Utilisateur' }
        ]}
      />

      {/* Boutons */}
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onClose}>Annuler</button>
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </form>
  );
}
```

## 🔄 Flux de gestion des erreurs

1. **Validation Frontend** → `setFieldError(field, message)`
2. **Soumission au Backend** → `try { await api.call() } catch (error) { ... }`
3. **Parse de l'erreur** → `handleBackendError(error)`
4. **Affichage automatique** :
   - Erreurs de champs → affichées sous chaque champ
   - Erreur générale → affichée en haut du formulaire
5. **Correction par l'utilisateur** → `clearFieldError(field)` au onChange
6. **Nouvelle soumission** → `clearErrors()` puis recommencer

## 📦 Fichiers créés

```
src/
├── utils/
│   └── errorHandler.js           # Utilitaires de parsing
├── hooks/
│   └── useFormErrors.js           # Hook de gestion d'erreurs
└── components/
    └── common/
        ├── ErrorMessage.js        # Composants d'affichage
        └── FormField.js           # Composants de formulaire
```

## ✅ Avantages

1. **Réutilisable** : Même logique partout dans l'app
2. **Cohérent** : Affichage uniforme des erreurs
3. **Maintenable** : Code centralisé facile à modifier
4. **Type-safe** : Parse automatiquement tous les formats d'erreurs
5. **UX améliorée** : Messages clairs, erreurs en temps réel

## 🚀 Migration d'anciens formulaires

Pour migrer un formulaire existant :

1. Remplacer `useState({})` par `useFormErrors()`
2. Remplacer les `<input>` par `<TextField>`
3. Remplacer les `<select>` par `<SelectField>`
4. Utiliser `handleBackendError()` dans le catch
5. Utiliser `<ErrorMessage>` pour les erreurs générales

**Avant** :
```javascript
const [errors, setErrors] = useState({});

<input className={errors.email ? 'error' : ''} />
{errors.email && <span>{errors.email}</span>}
```

**Après** :
```javascript
const { getFieldError } = useFormErrors();

<TextField error={getFieldError('email')} />
```
