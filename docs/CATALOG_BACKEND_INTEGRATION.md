# Intégration Catalogue Backend - Documentation de Reprise

**Date**: 24 janvier 2026
**Branche**: `feature/catalog-backend-integration`
**Status**: En cours - Phase 1 terminée

---

## Contexte du Projet

### Problème Initial
Le module Catalogue du frontend utilisait **localStorage** pour stocker les produits/services, tandis que le backend disposait d'une base **PostgreSQL** avec une table `products_services`. Les deux systèmes n'étaient pas connectés, créant une incohérence majeure.

### Objectif
Connecter le frontend au backend pour que le catalogue utilise la base de données PostgreSQL, avec support des attributs médicaux enrichis (dosage, durée, préparation) et des familles de produits avec variantes.

### Architecture Multi-tenant
- **Base centrale**: `medicalpro_central` (utilisateurs, companies)
- **Bases clinic**: `medicalpro_clinic_{uuid}` (données métier par clinique)
- Le catalogue est stocké dans chaque base clinic (table `products_services`)

---

## Stratégie de Versioning

### Tags créés avant les modifications
```
Frontend: v1.0.0-pre-catalog-fix
Backend:  v1.0.0-pre-catalog-fix
```

### Branches de travail
```
Frontend: feature/catalog-backend-integration
Backend:  feature/catalog-backend-integration
```

### Pour revenir en arrière si nécessaire
```bash
# Frontend
cd /var/www/medical-pro
git checkout v1.0.0-pre-catalog-fix

# Backend
cd /var/www/medical-pro-backend
git checkout v1.0.0-pre-catalog-fix
```

---

## Ce qui a été fait

### Backend (`medical-pro-backend`)

#### 1. Migration SQL (`migrations/clinic_042_create_products_services.sql`)
Création complète de la table `products_services` avec tous les champs médicaux:

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | Identifiant unique |
| `title` | VARCHAR(200) | Nom du produit/service |
| `description` | TEXT | Description |
| `type` | VARCHAR(20) | 'product' ou 'service' (legacy) |
| `item_type` | VARCHAR(20) | 'product', 'medication', 'treatment', 'service' |
| `unit_price` | DECIMAL(10,2) | Prix unitaire |
| `currency` | VARCHAR(3) | Devise (EUR par défaut) |
| `unit` | VARCHAR(50) | Unité de mesure |
| `sku` | VARCHAR(100) | Référence produit |
| `tax_rate` | DECIMAL(5,2) | Taux de TVA |
| `company_id` | UUID | ID de la clinique |
| `is_active` | BOOLEAN | Actif/Inactif |
| `duration` | INTEGER | Durée en minutes (5-480) |
| `prep_before` | INTEGER | Temps de préparation avant (0-120 min) |
| `prep_after` | INTEGER | Temps après traitement (0-120 min) |
| `dosage` | DECIMAL(10,2) | Dosage |
| `dosage_unit` | VARCHAR(10) | Unité: mg, ml, g, ui, mcg |
| `volume` | DECIMAL(10,2) | Volume en ml |
| `provenance` | VARCHAR(200) | Origine/provenance |
| `is_overlappable` | BOOLEAN | Traitement chevauchable |
| `machine_type_id` | UUID | Type de machine requis (pour Planning futur) |
| `parent_id` | UUID | ID parent (pour variantes) |
| `is_family` | BOOLEAN | Est une famille |
| `is_variant` | BOOLEAN | Est une variante |

#### 2. Modèle Sequelize (`src/models/ProductService.js`)
- Tous les champs avec validations
- Associations self-reference pour familles/variantes
- Index optimisés

#### 3. Routes API (`src/routes/products.js`)
- Schémas Joi pour validation (create, update, query)
- Transformation camelCase ↔ snake_case
- Endpoints CRUD via `clinicCrudRoutes`
- Endpoints personnalisés:
  - `GET /families` - Familles avec variantes
  - `POST /:id/variants` - Ajouter une variante
  - `POST /:id/duplicate` - Dupliquer un item
  - `GET /stats` - Statistiques du catalogue
  - `GET /for-appointments` - Items pour planification RDV

#### 4. Service de provisioning (`src/services/clinicProvisioningService.js`)
- Migration ajoutée à la liste pour les nouvelles cliniques

#### 5. Migration exécutée
```bash
# Base clinic existante
PGPASSWORD=medicalpro2024 psql -h localhost -U medicalpro \
  -d medicalpro_clinic_b2ccc366_d8d9_423c_ac79_cbbe9d550d18 \
  -f /var/www/medical-pro-backend/migrations/clinic_042_create_products_services.sql
```

### Frontend (`medical-pro`)

#### 1. Client API (`src/api/catalogApi.js`)
Nouveau fichier - Interface avec le backend:
- `getCatalogItems(params)` - Liste avec filtres
- `getCatalogItem(id)` - Détail
- `createCatalogItem(data)` - Création
- `updateCatalogItem(id, data)` - Mise à jour
- `deleteCatalogItem(id)` - Suppression
- `getCatalogFamilies()` - Familles avec variantes
- `createVariant(parentId, data)` - Ajouter variante
- `duplicateCatalogItem(id)` - Dupliquer
- `getCatalogStats()` - Statistiques
- `getItemsForAppointments()` - Pour planification

#### 2. Storage refactorisé (`src/utils/catalogStorage.js`)
- Remplace localStorage par appels API
- Cache local avec TTL de 60 secondes
- Méthodes synchrones (depuis cache) et asynchrones (depuis API)
- Compatibilité avec l'interface existante

#### 3. Module Catalogue (`src/components/dashboard/modules/CatalogModule.js`)
- `loadData()` maintenant async
- Opérations CRUD async (duplicate, delete, toggleActive)
- Stats calculées depuis le state local

#### 4. Modal Formulaire (`src/components/dashboard/modals/CatalogFormModal.js`)
- `handleSubmit()` async avec transformation des champs
- Mapping: `name` → `title`, `type` → `itemType`, `price` → `unitPrice`, `vatRate` → `taxRate`

#### 5. Service d'intégration (`src/services/catalogIntegration.js`)
- Compatibilité avec les deux formats de noms de champs
- Nouvelle fonction `getItemsForAppointmentAsync()`

---

## Ce qui reste à faire

### Phase 2 - Tests et Validation
- [ ] Tester la création d'un produit via l'interface
- [ ] Tester la création d'une famille avec variantes
- [ ] Tester la modification et suppression
- [ ] Vérifier la persistance après refresh
- [ ] Tester les filtres et la recherche

### Phase 3 - Intégration RDV (Planning Module)
- [ ] Créer le module Planning (calendrier machine-based)
- [ ] Tables: `machines`, `machine_types`, `locations`, `breakdowns`
- [ ] Intégrer la sélection de services/traitements depuis le catalogue
- [ ] Gérer les durées (duration + prepBefore + prepAfter)
- [ ] Gérer les traitements chevauchables (is_overlappable)

### Phase 4 - Nettoyage
- [ ] Supprimer le code localStorage obsolète
- [ ] Merger les branches dans master
- [ ] Créer tag de release

---

## Commits réalisés

### Backend
```
9cafad0 feat(catalog): Add medical-specific fields to products/services
91682e8 fix(migrations): Replace ALTER with CREATE for products_services table
93f957c fix(products): Use req.clinicDb instead of non-existent getClinicDatabase
```

### Frontend
```
fe1a00c feat(catalog): Integrate catalog frontend with backend API
```

---

## Commandes utiles

### Vérifier le status des branches
```bash
# Frontend
cd /var/www/medical-pro
git status
git log --oneline -5

# Backend
cd /var/www/medical-pro-backend
git status
git log --oneline -5
```

### Redémarrer le backend
```bash
pm2 restart medical-pro-backend
pm2 logs medical-pro-backend --lines 20
```

### Vérifier la base de données
```bash
# Lister les tables
PGPASSWORD=medicalpro2024 psql -h localhost -U medicalpro \
  -d medicalpro_clinic_b2ccc366_d8d9_423c_ac79_cbbe9d550d18 \
  -c "\dt"

# Voir la structure de products_services
PGPASSWORD=medicalpro2024 psql -h localhost -U medicalpro \
  -d medicalpro_clinic_b2ccc366_d8d9_423c_ac79_cbbe9d550d18 \
  -c "\d products_services"

# Compter les produits
PGPASSWORD=medicalpro2024 psql -h localhost -U medicalpro \
  -d medicalpro_clinic_b2ccc366_d8d9_423c_ac79_cbbe9d550d18 \
  -c "SELECT COUNT(*) FROM products_services"
```

### Tester l'API
```bash
# Health check
curl http://localhost:3001/health

# Products (nécessite token valide)
curl http://localhost:3001/api/v1/products \
  -H "Authorization: Bearer <TOKEN>"
```

---

## Mapping des champs Frontend ↔ Backend

| Frontend | Backend (API) | Base de données |
|----------|---------------|-----------------|
| name | title | title |
| type | itemType | item_type |
| price | unitPrice | unit_price |
| vatRate | taxRate | tax_rate |
| isActive | isActive | is_active |
| prepBefore | prepBefore | prep_before |
| prepAfter | prepAfter | prep_after |
| dosageUnit | dosageUnit | dosage_unit |
| isOverlappable | isOverlappable | is_overlappable |
| machineTypeId | machineTypeId | machine_type_id |
| parentId | parentId | parent_id |
| isFamily | isFamily | is_family |
| isVariant | isVariant | is_variant |

---

## Notes importantes

1. **L'API utilise `/products`** (pas `/catalog`) - voir `server.js` ligne 173

2. **Authentification requise** - Les routes passent par `authMiddleware` + `clinicRoutingMiddleware`

3. **req.clinicDb** - Fourni par le middleware, donne accès à la base de la clinique de l'utilisateur

4. **Cache frontend** - TTL de 60 secondes, invalidé après chaque opération CRUD

5. **Familles/Variantes** - Self-reference via `parent_id`, cascade delete activé

---

## Prochaine session

Pour reprendre:
1. Lire ce document
2. Vérifier que le backend tourne (`pm2 status`)
3. Tester l'interface catalogue dans le navigateur
4. Continuer avec les tests de la Phase 2
