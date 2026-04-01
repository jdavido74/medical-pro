# Supplier Invoice Import & Inventory Management — Design Spec

## Overview

Add supplier invoice import (via PDF/photo + Claude Vision OCR) to automatically register delivered products in the catalog and manage stock levels. Products are linked to treatments with automatic stock deduction when appointments are completed.

## Scope

1. **Supplier invoice import** — upload PDF/photo, OCR extraction via Claude Vision API, matching with existing catalog, validation, stock entry
2. **Inventory management** — stock tracking per product, movement history, low stock alerts
3. **Product ↔ Treatment association** — link products to treatments with standard quantities, parent/child inheritance, auto-deduction on appointment completion
4. **Catalog enrichment** — two new item types: supplements, supplies
5. **Permissions** — new roles for inventory and import access

## Catalog Enrichment

### New item types

Add to `item_type` enum on `products_services`:
- `supplement` — Compléments (vitamines, nutriments)
- `supply` — Fournitures (consommables, matériel jetable)

Existing types unchanged: `product`, `medication`, `treatment`, `service`.

### New stock fields on products_services

| Field | Type | Default | Description |
|---|---|---|---|
| `stock_quantity` | DECIMAL(10,2) | 0 | Current stock quantity |
| `stock_min_alert` | DECIMAL(10,2) | NULL | Low stock alert threshold |
| `lot_number` | VARCHAR(50) | NULL | Lot number (optional) |
| `expiry_date` | DATE | NULL | Expiration date (optional) |
| `supplier_name` | VARCHAR(200) | NULL | Main supplier name |
| `supplier_reference` | VARCHAR(100) | NULL | Supplier product reference |

## Supplier Invoice Import

### Flow

1. Admin clicks **"Importar"** button in catalog header
2. Import modal opens:
   - Drop zone for PDF or image (JPG/PNG)
   - "Tomar foto" button for mobile (camera access)
   - Category selector if context is "Todos"
3. File sent to backend → backend sends image to **Claude Vision API** with structured prompt
4. Claude returns JSON:
   ```json
   {
     "supplier": { "name": "LabEffiplex SA", "invoiceNumber": "EPX/2025/02062", "date": "2025-11-04" },
     "items": [
       { "reference": "[173]", "description": "Vamplex Creme", "quantity": 6.000, "unitPrice": 54.00, "discount": 55, "taxRate": 21, "total": 120.50 }
     ],
     "totals": { "subtotal": 420.76, "tax": 55.32, "total": 476.10 }
   }
   ```
5. **Validation table** displays extracted lines:
   - Each line: reference, description, quantity, unit price, tax, total (all editable)
   - Auto-matching with existing catalog products (name/reference similarity >90% → green "Existente" badge, pre-linked)
   - Unmatched items show orange "Nuevo" badge → will be created in catalog
   - Admin can correct fields, change associations, or skip lines
6. **Confirmation** → existing products get stock incremented, new products created with initial stock
7. Original PDF stored as attachment for traceability

### Import button behavior

- Visible only with `CATALOG_IMPORT` permission
- In catalog header, next to "Nuevo" button
- Contextual:
  - Filter active on "Medicamentos" → import pre-selects `medication` category
  - Filter active on "Fournitures" → import pre-selects `supply` category
  - Filter "Todos" → admin chooses category in import modal

### Claude Vision API integration

Backend endpoint: `POST /api/v1/catalog/import-invoice`

- Accepts multipart form data (file + category)
- Converts PDF to image if needed (using poppler/sharp)
- Sends to Anthropic API with structured extraction prompt
- Returns parsed JSON for frontend validation

Required: `ANTHROPIC_API_KEY` environment variable on backend.

## Inventory Management

### Stock movements table

```sql
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products_services(id),
  movement_type VARCHAR(20) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  lot_number VARCHAR(50),
  reference VARCHAR(200),
  notes TEXT,
  appointment_id UUID REFERENCES appointments(id),
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Movement types

| Type | Description | Stock impact |
|---|---|---|
| `supplier_entry` | Supplier delivery (import or manual) | + quantity |
| `treatment_exit` | Used during treatment (appointment completed) | - quantity |
| `manual_adjustment` | Inventory correction | +/- quantity |
| `loss` | Breakage, expiry, waste | - quantity |

### Display in catalog

- "Stock" column in product list (visible with `INVENTORY_VIEW`)
- Red badge when `stock_quantity <= stock_min_alert`
- Product detail → "Movimientos" tab showing movement history (date, type, quantity, reference, user)

### Low stock alerts

- Red badge on products below threshold in catalog list
- Optional Telegram notification via existing bot when a product drops below threshold after a movement

## Product ↔ Treatment Association

### New table

```sql
CREATE TABLE treatment_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id UUID NOT NULL REFERENCES products_services(id),
  product_id UUID NOT NULL REFERENCES products_services(id),
  standard_quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(treatment_id, product_id)
);
```

### Parent/child inheritance

- Products associated to a parent treatment (family) apply to all children (variants)
- A child can add its own specific products without duplicating parent's
- Effective products = parent products ∪ child-specific products
- If a child explicitly associates the same product as parent, child's quantity overrides parent's

### Stock deduction on appointment completion

1. Appointment status changes to `completed`
2. System resolves effective products for the treatment (parent + child)
3. If products exist → **confirmation modal** shows pre-filled quantities
4. Practitioner can adjust quantities (e.g., 30g → 45g of Vitamin C)
5. On confirm → `treatment_exit` movements created, stock decremented
6. If no associated products → no modal, nothing happens

### Configuration in catalog

- Treatment detail → new section "Productos asociados"
- Add/remove products with standard quantity and unit
- Inherited products from parent shown grayed out (read-only, with "Heredado" badge)

## Permissions

### New permissions

| Permission | Description |
|---|---|
| `INVENTORY_VIEW` | View stock levels and movement history |
| `INVENTORY_MANAGE` | Manage stock: manual adjustments, loss entries |
| `CATALOG_IMPORT` | Import products via supplier invoice |

### Default role assignments

| Permission | admin | secretary | physician | nurse |
|---|---|---|---|---|
| `INVENTORY_VIEW` | ✅ | ✅ | ✅ | ✅ |
| `INVENTORY_MANAGE` | ✅ | ✅ | ❌ | ❌ |
| `CATALOG_IMPORT` | ✅ | ✅ | ❌ | ❌ |

Stock deduction confirmation modal on appointment completion is available to all roles that can complete appointments — it's tied to the appointment workflow, not inventory management.

## API Endpoints

### Import
```
POST /api/v1/catalog/import-invoice          — Upload + OCR extraction
POST /api/v1/catalog/import-invoice/confirm   — Confirm validated lines → create/update products + stock
```

### Stock
```
GET  /api/v1/stock/:productId/movements       — Movement history for a product
POST /api/v1/stock/:productId/movement         — Manual stock entry (adjustment, loss)
GET  /api/v1/stock/alerts                       — Products below minimum threshold
```

### Treatment-Product association
```
GET    /api/v1/treatments/:id/products          — Get associated products (includes inherited)
POST   /api/v1/treatments/:id/products          — Associate a product
PUT    /api/v1/treatments/:id/products/:productId — Update quantity
DELETE /api/v1/treatments/:id/products/:productId — Remove association
```

### Appointment stock deduction
```
GET  /api/v1/appointments/:id/stock-deduction   — Get products to deduct for this appointment
POST /api/v1/appointments/:id/stock-deduction   — Confirm deduction with adjusted quantities
```

## Frontend Components

| Component | Purpose |
|---|---|
| `ImportInvoiceModal.js` | Upload + OCR + validation table + confirm |
| `StockMovementsTab.js` | Movement history in product detail |
| `TreatmentProductsSection.js` | Associate products to treatment in catalog |
| `StockDeductionModal.js` | Confirm stock deduction on appointment completion |
| `StockBadge.js` | Stock level badge with alert styling |

## Data Model Summary

### New tables
- `stock_movements` — movement history
- `treatment_products` — product ↔ treatment association

### Modified tables
- `products_services` — add stock fields + new item_type values
- Role permissions — add INVENTORY_VIEW, INVENTORY_MANAGE, CATALOG_IMPORT

## Out of Scope

- Supplier management (supplier database, purchase orders)
- Multi-location stock (single stock per product per clinic)
- Automatic reorder / purchase suggestions
- Barcode scanning
- Stock valuation (FIFO/LIFO accounting)
- Batch/lot tracking enforcement (fields present but optional)
