# 📋 Guidelines de Développement - Medical Pro

**Date de création** : 2025-12-07
**Statut** : ✅ Standards établis

Ce document contient **tous les patterns et bonnes pratiques** à suivre pour le développement de l'application Medical Pro.

---

## 🎯 Principes Généraux

### 1. Backend API First
- ✅ **Utiliser les APIs backend** au lieu de LocalStorage
- ✅ **Persister les données** dans la base de données clinic
- ✅ **Transformer les données** automatiquement (camelCase ↔ snake_case)

### 2. Internationalisation (i18n)
- ✅ **Tous les messages** doivent être traduits (ES/FR/EN)
- ✅ **Jamais de texte en dur** dans le code
- ✅ **Utiliser `t()`** pour toutes les chaînes de caractères

### 3. UX Moderne
- ✅ **Pas d'`alert()`** → Utiliser le système de notifications
- ✅ **Feedback immédiat** avec notifications toast
- ✅ **Synchronisation du contexte** pour mise à jour temps réel

---

## 📦 Pattern Standard : Intégration Backend

### Étape 1 : API Client

**Créer le fichier** : `/src/api/[module]Api.js`

```javascript
import { baseClient } from './baseClient';
import { dataTransform } from './dataTransform';

/**
 * Get all items
 */
async function getItems(options = {}) {
  try {
    const response = await baseClient.get('/items', { query: options });
    const data = dataTransform.unwrapResponse(response);

    // Transform each item
    const items = data.map(dataTransform.transformItemFromBackend);

    return {
      items,
      total: response.pagination?.total || 0,
      page: response.pagination?.page || 1
    };
  } catch (error) {
    console.error('[itemsApi] Error fetching items:', error);
    throw error;
  }
}

/**
 * Create item
 */
async function createItem(itemData) {
  try {
    const backendData = dataTransform.transformItemToBackend(itemData);
    const response = await baseClient.post('/items', backendData);
    const data = dataTransform.unwrapResponse(response);
    return dataTransform.transformItemFromBackend(data);
  } catch (error) {
    console.error('[itemsApi] Error creating item:', error);
    throw error;
  }
}

/**
 * Update item
 */
async function updateItem(id, itemData) {
  try {
    const backendData = dataTransform.transformItemToBackend(itemData);
    const response = await baseClient.put(`/items/${id}`, backendData);
    const data = dataTransform.unwrapResponse(response);
    return dataTransform.transformItemFromBackend(data);
  } catch (error) {
    console.error('[itemsApi] Error updating item:', error);
    throw error;
  }
}

export const itemsApi = {
  getItems,
  createItem,
  updateItem
};
```

### Étape 2 : Transformations de Données

**Ajouter dans** : `/src/api/dataTransform.js`

```javascript
/**
 * Transform item from backend (snake_case) to frontend (camelCase)
 */
function transformItemFromBackend(item) {
  if (!item) return null;

  return {
    id: item.id,
    name: item.name,
    // ⚠️ IMPORTANT : Gérer les cas spéciaux
    speciality: item.specialties?.[0], // singular Y
    specialties: item.specialties,      // plural IES array
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    isActive: item.is_active
  };
}

/**
 * Transform item to backend (camelCase to snake_case)
 */
function transformItemToBackend(item) {
  const backendData = {
    name: item.name?.trim(),
    // ⚠️ IMPORTANT : Convertir singular → plural array
    specialties: item.specialties || (item.speciality ? [item.speciality] : []),
    is_active: item.isActive !== undefined ? item.isActive : true
  };

  // ⚠️ IMPORTANT : Nettoyer les valeurs vides
  Object.keys(backendData).forEach(key => {
    if (isEmpty(backendData[key])) {
      delete backendData[key];
    }
  });

  return backendData;
}

// Export
export const dataTransform = {
  // ... existing functions
  transformItemFromBackend,
  transformItemToBackend
};
```

### Étape 3 : Composant Frontend

**Structure du composant** :

```javascript
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { itemsApi } from '../../../api/itemsApi';

const MyModule = () => {
  const { user, company, updateUser, updateCompany } = useAuth();
  const { t } = useTranslation('admin');

  // 1️⃣ États
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // 2️⃣ Auto-hide notification après 5 secondes
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // 3️⃣ Fonction pour afficher une notification
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  // 4️⃣ Charger les données au montage
  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      setIsLoading(true);
      const data = await itemsApi.getItems();
      setItems(data.items);
    } catch (error) {
      console.error('[MyModule] Error loading items:', error);
      showNotification(t('module.messages.loadError'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 5️⃣ Sauvegarder
  const handleSave = async (itemData) => {
    setIsSaving(true);

    try {
      const updatedItem = await itemsApi.updateItem(itemData.id, itemData);

      // ⚠️ IMPORTANT : Synchroniser le contexte si nécessaire
      if (itemData.type === 'user') {
        updateUser({ name: updatedItem.name });
      } else if (itemData.type === 'company') {
        updateCompany({ name: updatedItem.name });
      }

      // ⚠️ IMPORTANT : Message traduit
      showNotification(t('module.messages.saveSuccess'), 'success');
    } catch (error) {
      console.error('[MyModule] Error saving:', error);
      const errorMessage = error.message || t('module.messages.saveError');
      showNotification(errorMessage, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // 6️⃣ Rendu avec notification
  return (
    <>
      {/* ⚠️ IMPORTANT : Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
          <div className={`rounded-lg shadow-lg p-4 flex items-center space-x-3 min-w-[320px] max-w-md ${
            notification.type === 'success'
              ? 'bg-green-50 border-l-4 border-green-500'
              : 'bg-red-50 border-l-4 border-red-500'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            )}
            <p className={`flex-1 text-sm font-medium ${
              notification.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {notification.message}
            </p>
            <button
              onClick={() => setNotification(null)}
              className={`flex-shrink-0 ${
                notification.type === 'success'
                  ? 'text-green-600 hover:text-green-800'
                  : 'text-red-600 hover:text-red-800'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Contenu du module */}
      <div className="p-8">
        {/* ... */}
      </div>
    </>
  );
};

export default MyModule;
```

---

## 🌍 Internationalisation (i18n)

### Ajouter des Traductions

**Toujours ajouter dans les 3 fichiers** :

#### 1. Espagnol (`/src/locales/es/admin.json`)

```json
{
  "module": {
    "title": "Título del Módulo",
    "messages": {
      "saveSuccess": "Datos guardados con éxito",
      "saveError": "Error al guardar",
      "loadError": "Error al cargar los datos",
      "deleteSuccess": "Elemento eliminado con éxito",
      "deleteError": "Error al eliminar"
    }
  }
}
```

#### 2. Français (`/src/locales/fr/admin.json`)

```json
{
  "module": {
    "title": "Titre du Module",
    "messages": {
      "saveSuccess": "Données sauvegardées avec succès",
      "saveError": "Erreur lors de la sauvegarde",
      "loadError": "Erreur lors du chargement des données",
      "deleteSuccess": "Élément supprimé avec succès",
      "deleteError": "Erreur lors de la suppression"
    }
  }
}
```

#### 3. Anglais (`/src/locales/en/admin.json`)

```json
{
  "module": {
    "title": "Module Title",
    "messages": {
      "saveSuccess": "Data saved successfully",
      "saveError": "Error saving data",
      "loadError": "Error loading data",
      "deleteSuccess": "Item deleted successfully",
      "deleteError": "Error deleting item"
    }
  }
}
```

### Utilisation dans le Code

```javascript
// ❌ NE JAMAIS FAIRE
showNotification('Datos guardados con éxito', 'success');
alert('Erreur lors de la sauvegarde');

// ✅ TOUJOURS FAIRE
showNotification(t('module.messages.saveSuccess'), 'success');
showNotification(t('module.messages.saveError'), 'error');
```

---

## 🔄 Synchronisation du Contexte AuthContext

### Quand Synchroniser ?

**Synchroniser le contexte après modification de** :
1. **Données utilisateur** → `updateUser()`
2. **Données entreprise** → `updateCompany()`

### Pattern

```javascript
// Après sauvegarde API réussie
const updatedData = await api.updateItem(data);

// ⚠️ IMPORTANT : Synchroniser le contexte
if (affectsUser) {
  updateUser({
    name: updatedData.name,
    email: updatedData.email
  });
}

if (affectsCompany) {
  updateCompany({
    name: updatedData.name,
    phone: updatedData.phone,
    address: updatedData.address
  });
}

// Notification APRÈS synchronisation
showNotification(t('messages.success'), 'success');
```

### Pourquoi ?

- ✅ **Header se met à jour immédiatement**
- ✅ **Cohérence entre API et UI**
- ✅ **Pas besoin de recharger la page**

---

## 🚫 Règles Strictes

### ❌ À NE JAMAIS FAIRE

```javascript
// ❌ Alert bloquant
alert('Opération réussie');

// ❌ Texte en dur
<button>Guardar</button>

// ❌ LocalStorage pour données business
localStorage.setItem('items', JSON.stringify(items));

// ❌ Pas de synchronisation contexte
await api.updateCompany(data);
// → Header ne se met pas à jour

// ❌ snake_case dans le frontend
const user_name = data.user_name;
```

### ✅ À TOUJOURS FAIRE

```javascript
// ✅ Notification toast
showNotification(t('messages.success'), 'success');

// ✅ i18n
<button>{t('actions.save')}</button>

// ✅ API Backend
const items = await itemsApi.getItems();

// ✅ Synchronisation contexte
await api.updateCompany(data);
updateCompany({ name: data.name }); // ← IMPORTANT

// ✅ camelCase dans le frontend
const userName = data.userName;
```

---

## 📋 Checklist Développement

Avant de considérer un module comme terminé :

### Backend
- [ ] Route créée dans `/src/routes/`
- [ ] Schéma de validation créé (Joi)
- [ ] Middleware `clinicRoutingMiddleware` appliqué
- [ ] Messages d'erreur en FR/ES
- [ ] Logs avec `console.log`/`console.error`

### Frontend - API Client
- [ ] Fichier API créé dans `/src/api/`
- [ ] Fonctions CRUD (GET, POST, PUT, DELETE)
- [ ] Transformations dans `dataTransform.js`
- [ ] Gestion des erreurs avec try/catch

### Frontend - Composant
- [ ] Import `useAuth` avec `updateUser`/`updateCompany`
- [ ] Import `useTranslation` pour i18n
- [ ] État `notification` pour les toasts
- [ ] useEffect pour auto-hide notifications (5s)
- [ ] Fonction `showNotification(message, type)`
- [ ] Composant notification toast dans le JSX
- [ ] Appel API au lieu de LocalStorage
- [ ] Synchronisation contexte après sauvegarde
- [ ] Tous les textes avec `t()`

### i18n
- [ ] Clés ajoutées dans `es/admin.json`
- [ ] Clés ajoutées dans `fr/admin.json`
- [ ] Clés ajoutées dans `en/admin.json`
- [ ] Pas de texte en dur dans le code

### Tests Manuels
- [ ] Chargement initial fonctionne
- [ ] Création fonctionne
- [ ] Modification fonctionne
- [ ] Suppression fonctionne
- [ ] Notifications s'affichent (ES/FR/EN)
- [ ] Header se met à jour si applicable
- [ ] Pas d'erreurs dans la console
- [ ] Données persistées en base

---

## 📚 Modules à Développer

### Phase 6 - Composants Restants

1. ✅ **SettingsModule** → `facilitiesApi` (TERMINÉ)
2. ⏳ **ClinicConfigurationModule** → `clinicSettingsApi`
3. ⏳ **PractitionerManagementModal** → `healthcareProvidersApi`
4. ⏳ **UserManagementModule** → `healthcareProvidersApi`
5. ⏳ **RoleManagementModule** → `clinicRolesApi`

**Pour chaque module** : Suivre ce document à la lettre !

---

## 🎯 Objectif Final

Une application **100%** :
- ✅ **Backend-driven** (données en base)
- ✅ **Multilingue** (ES/FR/EN)
- ✅ **UX moderne** (notifications toast)
- ✅ **Temps réel** (synchronisation contexte)
- ✅ **Cohérente** (patterns standards)

---

## 📞 En Cas de Doute

**Se référer aux exemples existants** :
- `SettingsModule.js` (composant de référence)
- `facilitiesApi.js` (API client de référence)
- `dataTransform.js` (transformations de référence)
- `AuthContext.js` (contexte de référence)

**Toujours se poser ces questions** :
1. Ai-je utilisé l'API au lieu de LocalStorage ?
2. Ai-je traduit tous les messages ?
3. Ai-je synchronisé le contexte si nécessaire ?
4. Ai-je utilisé les notifications toast au lieu d'alert() ?

---

**Ce document est la source de vérité pour tous les développements futurs !** 📖✨
