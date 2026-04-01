# Supplier Import & Inventory Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add supplier invoice import via Claude Vision OCR, inventory management with stock tracking, and product-treatment associations with automatic stock deduction on appointment completion.

**Architecture:** Extend existing `products_services` table with stock fields, add `stock_movements` and `treatment_products` tables, new backend routes for stock/import/associations, Claude Vision API for OCR extraction, frontend import modal + stock UI in catalog.

**Tech Stack:** PostgreSQL migrations, Sequelize models, Express routes, @anthropic-ai/sdk for OCR, React components, multer for file upload, sharp for image processing

**Spec:** `docs/superpowers/specs/2026-03-31-supplier-import-inventory-design.md`

---

## File Map

### Backend (`/var/www/medical-pro-backend`)

| File | Action | Purpose |
|---|---|---|
| `migrations/clinic_077_stock_fields.sql` | Create | Add stock fields to products_services + new item_type values |
| `migrations/clinic_078_stock_movements.sql` | Create | Create stock_movements table |
| `migrations/clinic_079_treatment_products.sql` | Create | Create treatment_products table |
| `scripts/run-clinic-migrations.js` | Modify | Add clinic_077-079 |
| `src/services/clinicProvisioningService.js` | Modify | Add clinic_077-079 |
| `src/models/ProductService.js` | Modify | Add stock fields + new item_type values |
| `src/models/clinic/StockMovement.js` | Create | StockMovement model |
| `src/models/clinic/TreatmentProduct.js` | Create | TreatmentProduct model |
| `src/base/ModelFactory.js` | Modify | Register new models |
| `src/routes/products.js` | Modify | Add stock fields to transforms + new item_types in validation |
| `src/routes/stock.js` | Create | Stock movements + alerts API |
| `src/routes/treatmentProducts.js` | Create | Treatment-product association CRUD |
| `src/routes/importInvoice.js` | Create | Upload + Claude Vision OCR + confirm import |
| `src/services/stockService.js` | Create | Stock deduction logic |
| `server.js` | Modify | Mount new routes, install multer |
| `src/utils/permissionConstants.js` | Modify | Add INVENTORY_* and CATALOG_IMPORT permissions |
| `package.json` | Modify | Add @anthropic-ai/sdk, sharp dependencies |

### Frontend (`/var/www/medical-pro`)

| File | Action | Purpose |
|---|---|---|
| `src/api/stockApi.js` | Create | Stock + import API client |
| `src/api/treatmentProductsApi.js` | Create | Treatment-product association API client |
| `src/components/dashboard/modules/CatalogModule.js` | Modify | Add supplement/supply tabs, import button, stock column |
| `src/components/dashboard/modals/CatalogFormModal.js` | Modify | Add stock fields, new item types |
| `src/components/catalog/ImportInvoiceModal.js` | Create | Upload + validation table + confirm |
| `src/components/catalog/StockMovementsTab.js` | Create | Movement history in product detail |
| `src/components/catalog/TreatmentProductsSection.js` | Create | Associate products to treatment |
| `src/components/catalog/StockBadge.js` | Create | Stock level badge with alert styling |
| `src/components/planning/StockDeductionModal.js` | Create | Confirm stock deduction on appointment completion |
| `src/components/dashboard/modules/PlanningModule.js` | Modify | Trigger stock deduction modal on completion |
| `src/constants/catalogConfig.js` | Modify | Add supplement + supply types |
| `src/utils/permissionsStorage.js` | Modify | Add INVENTORY_* and CATALOG_IMPORT permissions |
| `src/locales/es/catalog.json` | Modify | Add stock/import/inventory labels |
| `src/locales/fr/catalog.json` | Modify | French labels |
| `src/locales/en/catalog.json` | Modify | English labels |

---

## Task 1: Database Migrations

**Files:**
- Create: `migrations/clinic_077_stock_fields.sql`
- Create: `migrations/clinic_078_stock_movements.sql`
- Create: `migrations/clinic_079_treatment_products.sql`
- Modify: `scripts/run-clinic-migrations.js`
- Modify: `src/services/clinicProvisioningService.js`

- [ ] **Step 1: Create clinic_077_stock_fields.sql**

```sql
-- Add stock fields to products_services and extend item_type
ALTER TABLE products_services ADD COLUMN IF NOT EXISTS stock_quantity DECIMAL(10,2) DEFAULT 0;
ALTER TABLE products_services ADD COLUMN IF NOT EXISTS stock_min_alert DECIMAL(10,2);
ALTER TABLE products_services ADD COLUMN IF NOT EXISTS lot_number VARCHAR(50);
ALTER TABLE products_services ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE products_services ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(200);
ALTER TABLE products_services ADD COLUMN IF NOT EXISTS supplier_reference VARCHAR(100);

-- Update item_type check constraint to include new types
-- First drop old constraint if exists, then add new one
DO $$
BEGIN
  ALTER TABLE products_services DROP CONSTRAINT IF EXISTS products_services_item_type_check;
  ALTER TABLE products_services ADD CONSTRAINT products_services_item_type_check
    CHECK (item_type IN ('product', 'medication', 'treatment', 'service', 'supplement', 'supply'));
EXCEPTION WHEN OTHERS THEN
  -- Constraint may not exist, that's fine
  NULL;
END $$;
```

- [ ] **Step 2: Create clinic_078_stock_movements.sql**

```sql
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products_services(id),
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('supplier_entry', 'treatment_exit', 'manual_adjustment', 'loss')),
  quantity DECIMAL(10,2) NOT NULL,
  lot_number VARCHAR(50),
  reference VARCHAR(200),
  notes TEXT,
  appointment_id UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at DESC);
```

- [ ] **Step 3: Create clinic_079_treatment_products.sql**

```sql
CREATE TABLE IF NOT EXISTS treatment_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id UUID NOT NULL REFERENCES products_services(id),
  product_id UUID NOT NULL REFERENCES products_services(id),
  standard_quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT uq_treatment_product UNIQUE(treatment_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_treatment_products_treatment ON treatment_products(treatment_id);
CREATE INDEX IF NOT EXISTS idx_treatment_products_product ON treatment_products(product_id);
```

- [ ] **Step 4: Add to migration lists**

In `scripts/run-clinic-migrations.js` after `'clinic_076_medical_record_is_closed.sql'`:
```javascript
  'clinic_077_stock_fields.sql',
  'clinic_078_stock_movements.sql',
  'clinic_079_treatment_products.sql',
```

Same in `src/services/clinicProvisioningService.js`.

- [ ] **Step 5: Commit**

```bash
cd /var/www/medical-pro-backend
git add migrations/clinic_077_stock_fields.sql migrations/clinic_078_stock_movements.sql migrations/clinic_079_treatment_products.sql scripts/run-clinic-migrations.js src/services/clinicProvisioningService.js
git commit -m "feat(inventory): add migrations for stock fields, stock_movements, treatment_products"
```

---

## Task 2: Backend Models

**Files:**
- Modify: `src/models/ProductService.js`
- Create: `src/models/clinic/StockMovement.js`
- Create: `src/models/clinic/TreatmentProduct.js`
- Modify: `src/base/ModelFactory.js`

- [ ] **Step 1: Add stock fields to ProductService model**

In `src/models/ProductService.js`, add new fields after `exclusive_room` and update `item_type` validation:

Update `isIn` validation on `item_type` to include `'supplement'` and `'supply'`.

Add fields:
```javascript
    stock_quantity: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    stock_min_alert: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    lot_number: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    expiry_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    supplier_name: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    supplier_reference: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
```

- [ ] **Step 2: Create StockMovement model**

Create `/var/www/medical-pro-backend/src/models/clinic/StockMovement.js`:

```javascript
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StockMovement = sequelize.define('StockMovement', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'products_services', key: 'id' },
    },
    movement_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: { isIn: [['supplier_entry', 'treatment_exit', 'manual_adjustment', 'loss']] },
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    lot_number: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    reference: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    appointment_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'stock_movements',
    timestamps: false,
    underscored: true,
  });

  return StockMovement;
};
```

- [ ] **Step 3: Create TreatmentProduct model**

Create `/var/www/medical-pro-backend/src/models/clinic/TreatmentProduct.js`:

```javascript
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TreatmentProduct = sequelize.define('TreatmentProduct', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    treatment_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'products_services', key: 'id' },
    },
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'products_services', key: 'id' },
    },
    standard_quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 1,
    },
    unit: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'treatment_products',
    timestamps: false,
    underscored: true,
  });

  return TreatmentProduct;
};
```

- [ ] **Step 4: Register in ModelFactory**

In `src/base/ModelFactory.js`:
- Import both models
- Add to `CLINIC_MODEL_FACTORIES`
- Add associations:
  - StockMovement belongsTo ProductService (as 'product')
  - ProductService hasMany StockMovement (as 'stockMovements')
  - TreatmentProduct belongsTo ProductService twice (as 'treatment' and 'product')

- [ ] **Step 5: Commit**

```bash
git add src/models/ProductService.js src/models/clinic/StockMovement.js src/models/clinic/TreatmentProduct.js src/base/ModelFactory.js
git commit -m "feat(inventory): add StockMovement, TreatmentProduct models, stock fields on ProductService"
```

---

## Task 3: Backend Permissions

**Files:**
- Modify: `src/utils/permissionConstants.js`

- [ ] **Step 1: Add new permission constants**

In `src/utils/permissionConstants.js`, add to the PERMISSIONS object:
```javascript
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_MANAGE: 'inventory.manage',
  CATALOG_IMPORT: 'catalog.import',
```

Add to ROLE_PERMISSIONS:
- `admin`: add all 3
- `secretary`: add all 3
- `physician`: add `INVENTORY_VIEW`
- `nurse`: add `INVENTORY_VIEW`

- [ ] **Step 2: Commit**

```bash
git add src/utils/permissionConstants.js
git commit -m "feat(inventory): add INVENTORY_VIEW, INVENTORY_MANAGE, CATALOG_IMPORT permissions"
```

---

## Task 4: Backend — Products Route Updates

**Files:**
- Modify: `src/routes/products.js`

- [ ] **Step 1: Update validation schemas**

Add `supplement` and `supply` to `itemType` validation in both `createSchema` and `updateSchema`.

Add stock fields to both schemas:
```javascript
  stockQuantity: Joi.number().min(0).optional(),
  stockMinAlert: Joi.number().min(0).allow(null).optional(),
  lotNumber: Joi.string().max(50).allow('', null).optional(),
  expiryDate: Joi.date().iso().allow(null).optional(),
  supplierName: Joi.string().max(200).allow('', null).optional(),
  supplierReference: Joi.string().max(100).allow('', null).optional(),
```

- [ ] **Step 2: Update fieldMapping**

Add to `fieldMapping`:
```javascript
  stockQuantity: 'stock_quantity',
  stockMinAlert: 'stock_min_alert',
  lotNumber: 'lot_number',
  expiryDate: 'expiry_date',
  supplierName: 'supplier_name',
  supplierReference: 'supplier_reference',
  exclusiveRoom: 'exclusive_room',
```

- [ ] **Step 3: Update transformFromDb**

Add to the transform response:
```javascript
    stockQuantity: parseFloat(data.stock_quantity) || 0,
    stockMinAlert: data.stock_min_alert ? parseFloat(data.stock_min_alert) : null,
    lotNumber: data.lot_number,
    expiryDate: data.expiry_date,
    supplierName: data.supplier_name,
    supplierReference: data.supplier_reference,
```

Also add to the bulk response (GET /for-appointments endpoint).

- [ ] **Step 4: Commit**

```bash
git add src/routes/products.js
git commit -m "feat(inventory): add stock fields and new item types to products route"
```

---

## Task 5: Backend — Stock Routes

**Files:**
- Create: `src/routes/stock.js`
- Modify: `server.js`

- [ ] **Step 1: Create stock routes**

Create `/var/www/medical-pro-backend/src/routes/stock.js` with:

1. `GET /:productId/movements` — paginated movement history for a product
2. `POST /:productId/movement` — manual stock entry (adjustment, loss, supplier_entry)
   - Validates movement_type, quantity, notes
   - Updates `products_services.stock_quantity` accordingly
   - Creates StockMovement record
3. `GET /alerts` — products where `stock_quantity <= stock_min_alert`

Permission checks: `INVENTORY_VIEW` for GET, `INVENTORY_MANAGE` for POST.

- [ ] **Step 2: Mount in server.js**

```javascript
const stockRoutes = require('./src/routes/stock');
app.use(`/api/${API_VERSION}/stock`, authMiddleware, clinicRoutingMiddleware, stockRoutes);
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/stock.js server.js
git commit -m "feat(inventory): add stock movements and alerts API routes"
```

---

## Task 6: Backend — Treatment-Product Association Routes

**Files:**
- Create: `src/routes/treatmentProducts.js`
- Modify: `server.js`

- [ ] **Step 1: Create treatment-product routes**

Create `/var/www/medical-pro-backend/src/routes/treatmentProducts.js` with:

1. `GET /treatments/:id/products` — get associated products including inherited from parent
   - Load direct associations for this treatment
   - If treatment has `parent_id`, also load parent's associations
   - Mark inherited items with `isInherited: true`
   - Return merged list (child overrides parent for same product)
2. `POST /treatments/:id/products` — associate a product (body: `{ productId, standardQuantity, unit, notes }`)
3. `PUT /treatments/:id/products/:productId` — update quantity/unit/notes
4. `DELETE /treatments/:id/products/:productId` — remove association

- [ ] **Step 2: Mount in server.js**

```javascript
const treatmentProductsRoutes = require('./src/routes/treatmentProducts');
app.use(`/api/${API_VERSION}/treatment-products`, authMiddleware, clinicRoutingMiddleware, treatmentProductsRoutes);
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/treatmentProducts.js server.js
git commit -m "feat(inventory): add treatment-product association CRUD routes"
```

---

## Task 7: Backend — Stock Deduction Service

**Files:**
- Create: `src/services/stockService.js`

- [ ] **Step 1: Create stock service**

Create `/var/www/medical-pro-backend/src/services/stockService.js` with:

1. `getDeductionForAppointment(clinicDb, appointmentId)` — resolves what products to deduct:
   - Load appointment with service_id
   - Load treatment's associated products (direct + inherited from parent)
   - Return list: `[{ productId, productName, standardQuantity, unit, currentStock }]`

2. `confirmDeduction(clinicDb, appointmentId, items, userId)` — execute deduction:
   - For each item: create `treatment_exit` StockMovement, decrement `stock_quantity`
   - Use transaction for atomicity

- [ ] **Step 2: Commit**

```bash
git add src/services/stockService.js
git commit -m "feat(inventory): add stock deduction service for appointment completion"
```

---

## Task 8: Backend — Stock Deduction API Endpoints

**Files:**
- Modify: `src/routes/stock.js` (or `src/routes/planning.js`)

- [ ] **Step 1: Add deduction endpoints to stock routes**

Add to `src/routes/stock.js`:

1. `GET /appointments/:id/stock-deduction` — calls `stockService.getDeductionForAppointment`
2. `POST /appointments/:id/stock-deduction` — calls `stockService.confirmDeduction` with body `{ items: [{ productId, quantity }] }`

- [ ] **Step 2: Commit**

```bash
git add src/routes/stock.js
git commit -m "feat(inventory): add appointment stock deduction endpoints"
```

---

## Task 9: Backend — Import Invoice Route (Claude Vision OCR)

**Files:**
- Create: `src/routes/importInvoice.js`
- Modify: `server.js`
- Modify: `package.json`

- [ ] **Step 1: Install dependencies**

```bash
cd /var/www/medical-pro-backend
npm install @anthropic-ai/sdk sharp
```

- [ ] **Step 2: Create import route**

Create `/var/www/medical-pro-backend/src/routes/importInvoice.js` with:

1. `POST /` — upload + OCR extraction
   - multer middleware for file upload (PDF/image, max 10MB)
   - If PDF: convert to PNG using sharp/poppler
   - Send image to Claude Vision API with structured extraction prompt:
     ```
     Extract all line items from this supplier invoice image. Return JSON:
     { "supplier": { "name", "invoiceNumber", "date" },
       "items": [{ "reference", "description", "quantity", "unitPrice", "discount", "taxRate", "total" }],
       "totals": { "subtotal", "tax", "total" } }
     ```
   - Parse Claude response, return JSON to frontend
   - Permission: `CATALOG_IMPORT`

2. `POST /confirm` — confirm validated lines
   - Body: `{ category, supplierInfo, items: [{ reference, description, quantity, unitPrice, taxRate, existingProductId?, isNew? }] }`
   - For each item:
     - If `existingProductId`: increment `stock_quantity`, create `supplier_entry` movement
     - If `isNew`: create product in catalog with initial stock, create movement
   - Permission: `CATALOG_IMPORT`

- [ ] **Step 3: Mount in server.js**

```javascript
const importInvoiceRoutes = require('./src/routes/importInvoice');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
app.use(`/api/${API_VERSION}/catalog/import-invoice`, authMiddleware, clinicRoutingMiddleware, importInvoiceRoutes);
```

- [ ] **Step 4: Add ANTHROPIC_API_KEY to .env example**

Document that `ANTHROPIC_API_KEY` is required in backend .env for import feature.

- [ ] **Step 5: Commit**

```bash
git add src/routes/importInvoice.js server.js package.json package-lock.json
git commit -m "feat(inventory): add supplier invoice import route with Claude Vision OCR"
```

---

## Task 10: Frontend — API Clients + Permissions + i18n

**Files:**
- Create: `src/api/stockApi.js`
- Create: `src/api/treatmentProductsApi.js`
- Modify: `src/utils/permissionsStorage.js`
- Modify: `src/constants/catalogConfig.js`
- Modify: `src/locales/es/catalog.json`
- Modify: `src/locales/fr/catalog.json`
- Modify: `src/locales/en/catalog.json`

- [ ] **Step 1: Create stockApi.js**

```javascript
import { baseClient } from './baseClient';

export const getStockMovements = async (productId, params) => baseClient.get(`/stock/${productId}/movements`, { query: params });
export const createStockMovement = async (productId, data) => baseClient.post(`/stock/${productId}/movement`, data);
export const getStockAlerts = async () => baseClient.get('/stock/alerts');
export const getStockDeduction = async (appointmentId) => baseClient.get(`/stock/appointments/${appointmentId}/stock-deduction`);
export const confirmStockDeduction = async (appointmentId, items) => baseClient.post(`/stock/appointments/${appointmentId}/stock-deduction`, { items });
export const importInvoice = async (file, category) => {
  const formData = new FormData();
  formData.append('file', file);
  if (category) formData.append('category', category);
  return baseClient.upload('/catalog/import-invoice', formData);
};
export const confirmImport = async (data) => baseClient.post('/catalog/import-invoice/confirm', data);
```

- [ ] **Step 2: Create treatmentProductsApi.js**

```javascript
import { baseClient } from './baseClient';

const BASE = '/treatment-products/treatments';

export const getTreatmentProducts = async (treatmentId) => baseClient.get(`${BASE}/${treatmentId}/products`);
export const addTreatmentProduct = async (treatmentId, data) => baseClient.post(`${BASE}/${treatmentId}/products`, data);
export const updateTreatmentProduct = async (treatmentId, productId, data) => baseClient.put(`${BASE}/${treatmentId}/products/${productId}`, data);
export const removeTreatmentProduct = async (treatmentId, productId) => baseClient.delete(`${BASE}/${treatmentId}/products/${productId}`);
```

- [ ] **Step 3: Add permissions to permissionsStorage.js**

Add to PERMISSIONS object:
```javascript
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_MANAGE: 'inventory.manage',
  CATALOG_IMPORT: 'catalog.import',
```

Add to role defaults: admin + secretary get all 3, physician + nurse get INVENTORY_VIEW.

- [ ] **Step 4: Update catalogConfig.js**

Add to CATALOG_TYPES:
```javascript
  supplement: {
    id: 'supplement',
    fields: ['dosage', 'dosageUnit'],
    canHaveVariants: true,
    icon: 'Heart',
    defaultDuration: null
  },
  supply: {
    id: 'supply',
    fields: [],
    canHaveVariants: false,
    icon: 'Package',
    defaultDuration: null
  },
```

- [ ] **Step 5: Add i18n keys (es/fr/en)**

Add to catalog locale files:
```json
"stock": {
  "quantity": "Stock",
  "minAlert": "Alerta mínima",
  "lotNumber": "Nº Lote",
  "expiryDate": "Fecha caducidad",
  "supplier": "Proveedor",
  "supplierRef": "Ref. proveedor",
  "lowStock": "Stock bajo",
  "movements": "Movimientos",
  "entry": "Entrada",
  "exit": "Salida",
  "adjustment": "Ajuste",
  "loss": "Pérdida"
},
"import": {
  "title": "Importar factura proveedor",
  "upload": "Subir PDF o imagen",
  "takePhoto": "Tomar foto",
  "processing": "Procesando con IA...",
  "category": "Categoría",
  "existing": "Existente",
  "new": "Nuevo",
  "confirm": "Confirmar importación",
  "skip": "Omitir",
  "reference": "Referencia",
  "supplierInfo": "Datos del proveedor"
},
"types": {
  "supplement": "Complemento",
  "supply": "Suministro"
},
"treatmentProducts": {
  "title": "Productos asociados",
  "add": "Asociar producto",
  "quantity": "Cantidad estándar",
  "inherited": "Heredado",
  "noProducts": "Sin productos asociados"
},
"deduction": {
  "title": "Deducción de stock",
  "confirm": "Confirmar deducción",
  "adjustQuantity": "Ajustar cantidad",
  "noProducts": "Sin productos a deducir"
}
```

French and English equivalents in their respective files.

- [ ] **Step 6: Commit**

```bash
cd /var/www/medical-pro
git add src/api/stockApi.js src/api/treatmentProductsApi.js src/utils/permissionsStorage.js src/constants/catalogConfig.js src/locales/
git commit -m "feat(inventory): add API clients, permissions, catalog config, i18n keys"
```

---

## Task 11: Frontend — StockBadge + StockMovementsTab

**Files:**
- Create: `src/components/catalog/StockBadge.js`
- Create: `src/components/catalog/StockMovementsTab.js`

- [ ] **Step 1: Create StockBadge component**

Small inline component showing stock level with color coding:
- Green if stock > min_alert (or no alert set)
- Red if stock <= min_alert
- Gray if stock = 0
- Shows quantity number

- [ ] **Step 2: Create StockMovementsTab component**

Tab component for product detail showing movement history:
- Table: Date, Type (with icon/color), Quantity (+/-), Reference, Notes, User
- Pagination (20 per page)
- "Add movement" button (if INVENTORY_MANAGE permission) → small form: type, quantity, notes

- [ ] **Step 3: Commit**

```bash
git add src/components/catalog/StockBadge.js src/components/catalog/StockMovementsTab.js
git commit -m "feat(inventory): add StockBadge and StockMovementsTab components"
```

---

## Task 12: Frontend — TreatmentProductsSection

**Files:**
- Create: `src/components/catalog/TreatmentProductsSection.js`

- [ ] **Step 1: Create the component**

Section within treatment detail (CatalogFormModal or product view) showing associated products:
- List of associated products with: name, standard quantity, unit, actions (edit quantity, remove)
- Inherited products shown grayed with "Heredado" badge (no edit/remove)
- "Asociar producto" button → dropdown/search to find a product, set quantity + unit
- Uses treatmentProductsApi for CRUD

Props: `{ treatmentId, parentId, t }`

Loads products for treatmentId + parentId on mount, merges with inheritance logic.

- [ ] **Step 2: Commit**

```bash
git add src/components/catalog/TreatmentProductsSection.js
git commit -m "feat(inventory): add TreatmentProductsSection for treatment-product association"
```

---

## Task 13: Frontend — ImportInvoiceModal

**Files:**
- Create: `src/components/catalog/ImportInvoiceModal.js`

- [ ] **Step 1: Create the import modal**

Full modal with 3 steps:

**Step 1 — Upload:**
- Drop zone for file (PDF, JPG, PNG)
- Camera button for mobile
- Category selector (medication, supplement, supply, product)
- "Procesar" button → calls importInvoice API

**Step 2 — Validation:**
- Shows extracted supplier info (name, invoice number, date) — editable
- Table of extracted items: reference, description, quantity, unitPrice, taxRate, total — all editable
- Each row has matching status:
  - Green "Existente" badge + linked product name → auto-matched from catalog
  - Orange "Nuevo" badge → will be created
  - Admin can change: click to search existing product, or mark as new
  - Checkbox to skip/include each line
- "Confirmar importación" button

**Step 3 — Result:**
- Summary: X products updated, Y products created, Z stock entries
- Close button

Uses stockApi.importInvoice + stockApi.confirmImport.

- [ ] **Step 2: Commit**

```bash
git add src/components/catalog/ImportInvoiceModal.js
git commit -m "feat(inventory): add ImportInvoiceModal with OCR validation flow"
```

---

## Task 14: Frontend — StockDeductionModal

**Files:**
- Create: `src/components/planning/StockDeductionModal.js`

- [ ] **Step 1: Create the deduction modal**

Modal shown when an appointment is completed and has associated treatment products:

Props: `{ isOpen, onClose, appointmentId, treatmentName, onConfirm }`

On open: calls `getStockDeduction(appointmentId)` to get products list.

Displays:
- Treatment name
- Table: Product name, Standard quantity, Adjustable quantity input, Current stock, Unit
- "Confirmar" button → calls `confirmStockDeduction(appointmentId, adjustedItems)`
- "Omitir" button → closes without deducting

If no products returned → auto-closes (no deduction needed).

- [ ] **Step 2: Commit**

```bash
git add src/components/planning/StockDeductionModal.js
git commit -m "feat(inventory): add StockDeductionModal for appointment completion"
```

---

## Task 15: Frontend — CatalogModule Updates

**Files:**
- Modify: `src/components/dashboard/modules/CatalogModule.js`
- Modify: `src/components/dashboard/modals/CatalogFormModal.js`

- [ ] **Step 1: Add supplement/supply tabs and import button to CatalogModule**

In `CatalogModule.js`:
- Add to tab list: `'supplements'`, `'supplies'` after `'services'`
- Add to typeMap: `supplements: 'supplement'`, `supplies: 'supply'`
- Add icons: supplement → Heart, supply → Package
- Add "Importar" button in header (next to "Nuevo") visible with `CATALOG_IMPORT` permission
- Add stock column in the product list table (show StockBadge for items with stock_quantity > 0 or stock_min_alert set)
- Add ImportInvoiceModal rendering (state: showImportModal)

- [ ] **Step 2: Add new item types and stock fields to CatalogFormModal**

In `CatalogFormModal.js`:
- Add `supplement` and `supply` to type icons and options
- Add stock fields section (visible for medication, supplement, supply, product — NOT treatment/service):
  - stock_quantity, stock_min_alert, lot_number, expiry_date, supplier_name, supplier_reference
- For treatment items: add TreatmentProductsSection at the bottom

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/modules/CatalogModule.js src/components/dashboard/modals/CatalogFormModal.js
git commit -m "feat(inventory): add supplement/supply tabs, import button, stock fields to catalog"
```

---

## Task 16: Frontend — PlanningModule Stock Deduction Integration

**Files:**
- Modify: `src/components/dashboard/modules/PlanningModule.js`

- [ ] **Step 1: Trigger StockDeductionModal on appointment completion**

In PlanningModule.js:
- Import StockDeductionModal
- Add state: `stockDeductionModal` (appointmentId, treatmentName)
- Find where appointment status changes to 'completed' (in handleBookingSave or status change handler)
- After successful completion: check if treatment has associated products by calling getStockDeduction
- If products exist → open StockDeductionModal
- On confirm/skip → close modal, refresh data

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/modules/PlanningModule.js
git commit -m "feat(inventory): trigger stock deduction modal on appointment completion"
```

---

## Task 17: Deploy + Validation

- [ ] **Step 1: Install backend dependencies on prod**
- [ ] **Step 2: Add ANTHROPIC_API_KEY to prod .env**
- [ ] **Step 3: Push backend + run migrations**
- [ ] **Step 4: Build + deploy frontend**
- [ ] **Step 5: Test — new catalog types (supplement, supply)**
- [ ] **Step 6: Test — stock fields on product creation/edit**
- [ ] **Step 7: Test — manual stock movement**
- [ ] **Step 8: Test — associate product to treatment**
- [ ] **Step 9: Test — import invoice (upload PDF)**
- [ ] **Step 10: Test — stock deduction on appointment completion**
- [ ] **Step 11: Test — permissions (physician can view stock but not import)**
