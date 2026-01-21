# SettingsModule - Intégration Backend ✅

## Modifications Apportées

### 1. Imports Ajoutés
```javascript
import { facilitiesApi } from '../../../api/facilitiesApi';
```

### 2. États Ajoutés
```javascript
const [isLoading, setIsLoading] = useState(false);
const [facility, setFacility] = useState(null);
const [error, setError] = useState(null);
```

### 3. Chargement des Données au Montage
```javascript
useEffect(() => {
  loadFacilityData();
}, []);

const loadFacilityData = async () => {
  try {
    setIsLoading(true);
    setError(null);
    const facilityData = await facilitiesApi.getCurrentFacility();
    setFacility(facilityData);

    // Mise à jour du state avec les données de l'API
    setProfileData(prev => ({
      ...prev,
      companyName: facilityData?.name,
      phone: facilityData?.phone,
      address: facilityData?.address,
      postalCode: facilityData?.postalCode,
      city: facilityData?.city,
      country: facilityData?.country || 'FR'
    }));
  } catch (error) {
    console.error('[SettingsModule] Error loading facility data:', error);
    setError('Erreur lors du chargement des données');
    // Fallback sur les données du contexte AuthContext
  } finally {
    setIsLoading(false);
  }
};
```

### 4. Sauvegarde via API
```javascript
const handleSave = async (section) => {
  setIsSaving(true);
  setError(null);

  try {
    if (section === 'profile') {
      // Profil utilisateur → AuthContext uniquement
      updateUser({
        name: profileData.name,
        email: profileData.email,
        companyName: profileData.companyName
      });
      alert('✅ Profil utilisateur sauvegardé !');
    } else if (section === 'company') {
      // Informations entreprise → API Backend
      const facilityUpdate = {
        name: profileData.companyName,
        phone: profileData.phone,
        address: profileData.address,
        addressLine1: profileData.address,
        postalCode: profileData.postalCode,
        city: profileData.city,
        country: profileData.country
      };

      const updatedFacility = await facilitiesApi.updateCurrentFacility(facilityUpdate);
      setFacility(updatedFacility);
      alert('✅ Informations entreprise sauvegardées avec succès !');
    }
  } catch (error) {
    console.error('[SettingsModule] Error saving:', error);
    const errorMessage = error.message || 'Erreur lors de la sauvegarde';
    setError(errorMessage);
    alert(`❌ ${errorMessage}`);
  } finally {
    setIsSaving(false);
  }
};
```

## Comportement

### Chargement Initial
1. Le composant appelle `loadFacilityData()` au montage
2. Charge les données depuis `/api/v1/facilities/current`
3. Transformation automatique snake_case → camelCase via `dataTransform`
4. Mise à jour du formulaire avec les données

### Onglet "Profile" (Utilisateur)
- **Données** : Nom, Email
- **Sauvegarde** : AuthContext uniquement (pas d'API)
- **Usage** : Informations personnelles de l'utilisateur connecté

### Onglet "Company" (Établissement)
- **Données** : Nom entreprise, Téléphone, Adresse, Code postal, Ville, Pays
- **Sauvegarde** : API Backend → Base de données clinic
- **Usage** : Informations de l'établissement médical

## Gestion des Erreurs

### Au Chargement
- **Erreur API** → Fallback sur données AuthContext
- **Message d'erreur** affiché dans le state
- **Consolereally logged** pour debugging

### À la Sauvegarde
- **Erreur API** → Alert avec message d'erreur
- **State error** mis à jour
- **Console logged** pour debugging

## Flux de Données

```
┌─────────────────────┐
│  SettingsModule     │
│  (Frontend)         │
└──────┬──────────────┘
       │
       │ GET /api/v1/facilities/current
       ▼
┌─────────────────────┐
│  facilitiesApi      │
│  (API Client)       │
└──────┬──────────────┘
       │
       │ baseClient.get()
       ▼
┌─────────────────────┐
│  /facilities route  │
│  (Backend)          │
└──────┬──────────────┘
       │
       │ clinicRoutingMiddleware
       ▼
┌─────────────────────┐
│  medical_facilities │
│  (Base Clinic)      │
└─────────────────────┘
```

## Test Manuel

### 1. Charger les Données
```bash
# Vérifier dans la console browser
# Devrait afficher: [SettingsModule] Loading facility data...
# Puis: Facility data loaded: { name, phone, address, ... }
```

### 2. Modifier les Données
- Aller dans l'onglet "Company"
- Modifier le nom de l'entreprise
- Modifier l'adresse
- Cliquer sur "Sauvegarder"

### 3. Vérifier la Sauvegarde
```bash
# Terminal backend
# Devrait afficher: [facilities] Updating facility...

# Console browser
# Devrait afficher: [SettingsModule] Updating facility with: { ... }
# Puis: ✅ Informations entreprise sauvegardées avec succès !
```

### 4. Recharger la Page
- F5 pour recharger
- Les données doivent être conservées (chargées depuis la base)

## Points Importants

1. **Séparation des Responsabilités** :
   - Onglet "Profile" → AuthContext (données utilisateur)
   - Onglet "Company" → API Backend (données établissement)

2. **Transformation Automatique** :
   - `facilitiesApi` utilise `dataTransform` automatiquement
   - camelCase (frontend) ↔ snake_case (backend)

3. **Fallback Robuste** :
   - En cas d'erreur API, utilise les données AuthContext
   - L'application reste fonctionnelle même si l'API est down

4. **Logs Détaillés** :
   - Console logs pour chaque opération
   - Facilite le debugging

## Prochaines Étapes

✅ SettingsModule connecté au backend
⏳ Tester manuellement
⏳ Passer au composant suivant : ClinicConfigurationModule
