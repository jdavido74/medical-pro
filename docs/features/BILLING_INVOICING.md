# Refonte Devis & Factures -- Backend + Conformite e-invoicing + SaaS-ready

> Suivi d'implementation -- Branche: `feature/catalog-backend-integration`

---

## Vision

Remplacer le stockage localStorage actuel par une architecture backend complete,
conforme EN 16931 / Factur-X, et concue pour etre reutilisable comme SaaS de
facturation standalone.

**Principe directeur** : le moteur de facturation est **generique** (fonctionne
sans contexte medical). Les champs patient/appointment sont des extensions
optionnelles pour MedicalPro.

---

## Suivi des phases

### Phase 1 -- Backend core

| # | Tache | Fichier(s) | Statut |
|---|-------|-----------|--------|
| 1.1 | Migration DB (documents, document_items, document_sequences, billing_settings) | `migrations/clinic_055_documents_billing.sql` | [x] |
| 1.2 | Modele Sequelize Document | `src/models/clinic/Document.js` | [x] |
| 1.3 | Modele Sequelize DocumentItem | `src/models/clinic/DocumentItem.js` | [x] |
| 1.4 | Modele Sequelize DocumentSequence | `src/models/clinic/DocumentSequence.js` | [x] |
| 1.5 | ModelFactory + associations | `src/base/ModelFactory.js` | [x] |
| 1.6 | documentService.js (calculs totaux, numerotation, conversion devis->facture) | `src/services/documentService.js` | [x] |
| 1.7 | Routes /documents (CRUD + actions + stats) | `src/routes/documents.js` | [x] |

### Phase 2 -- Frontend connexion

| # | Tache | Fichier(s) | Statut |
|---|-------|-----------|--------|
| 2.1 | Client API documentsApi.js | `src/api/documentsApi.js` | [ ] |
| 2.2 | Adapter InvoicesModule.js (localStorage -> API) | `src/components/billing/InvoicesModule.js` | [ ] |
| 2.3 | Adapter QuotesModule.js (localStorage -> API) | `src/components/billing/QuotesModule.js` | [ ] |
| 2.4 | Adapter InvoiceFormModal.js (API + champs EN 16931) | `src/components/billing/InvoiceFormModal.js` | [ ] |
| 2.5 | Adapter QuoteFormModal.js (API + champs EN 16931) | `src/components/billing/QuoteFormModal.js` | [ ] |
| 2.6 | Supprimer localStorage billing dans storage.js | `src/utils/storage.js` | [ ] |

### Phase 3 -- Integration planning

| # | Tache | Fichier(s) | Statut |
|---|-------|-----------|--------|
| 3.1 | Bouton "Creer devis/facture" dans PlanningBookingModal | `src/components/planning/PlanningBookingModal.js` | [ ] |
| 3.2 | Pre-remplissage depuis appointment (patient, traitements, prix) | Frontend forms | [ ] |
| 3.3 | Alimenter appointments.quote_id / invoice_id | Backend routes | [ ] |

### Phase 4 -- E-invoicing

| # | Tache | Fichier(s) | Statut |
|---|-------|-----------|--------|
| 4.1 | facturxService.js (generation XML CII) | `backend/src/services/facturxService.js` | [ ] |
| 4.2 | Endpoint /documents/:id/pdf (PDF/A-3 Factur-X) | Routes documents | [ ] |
| 4.3 | Validation Schematron | facturxService | [ ] |
| 4.4 | Configuration billing_settings dans admin | Frontend admin | [ ] |

### Phase 5 -- Finitions

| # | Tache | Fichier(s) | Statut |
|---|-------|-----------|--------|
| 5.1 | Avoirs (credit notes) | Backend + Frontend | [ ] |
| 5.2 | Stats et reporting | Routes /documents/stats | [ ] |
| 5.3 | Email d'envoi reel | Backend email service | [ ] |
| 5.4 | Migration donnees localStorage existantes | Script one-shot | [ ] |

---

## Schema de donnees

### documents (table unifiee devis/factures/avoirs)

```
-- Identite
id                    UUID PK
company_id            UUID NOT NULL
document_type         VARCHAR(20) NOT NULL  -- 'invoice' | 'quote' | 'credit_note'
document_number       VARCHAR(50) NOT NULL UNIQUE  -- FA-2026-0001, DV-2026-0001
prefix                VARCHAR(10)

-- Parties (snapshots figes, conformes EN 16931)
seller_name           VARCHAR(255) NOT NULL
seller_address        JSONB NOT NULL        -- { line1, line2, postalCode, city, country }
seller_siren          VARCHAR(14)
seller_vat_number     VARCHAR(20)           -- BT-31
seller_legal_form     VARCHAR(100)
seller_capital        VARCHAR(50)
seller_rcs            VARCHAR(100)
seller_email          VARCHAR(255)
seller_phone          VARCHAR(20)

buyer_name            VARCHAR(255) NOT NULL
buyer_address         JSONB
buyer_siren           VARCHAR(14)           -- obligatoire sept 2026
buyer_vat_number      VARCHAR(20)           -- BT-48
buyer_email           VARCHAR(255)
buyer_phone           VARCHAR(20)

-- Dates
issue_date            DATE NOT NULL         -- BT-2
due_date              DATE                  -- BT-9 (factures)
valid_until           DATE                  -- devis
delivery_date         DATE                  -- BT-72

-- Montants
currency              VARCHAR(3) DEFAULT 'EUR'  -- BT-5
subtotal              DECIMAL(12,2) NOT NULL
discount_type         VARCHAR(20) DEFAULT 'none'
discount_value        DECIMAL(10,2) DEFAULT 0
discount_amount       DECIMAL(12,2) DEFAULT 0
tax_amount            DECIMAL(12,2) NOT NULL
tax_details           JSONB DEFAULT '[]'
total                 DECIMAL(12,2) NOT NULL
amount_paid           DECIMAL(12,2) DEFAULT 0
amount_due            DECIMAL(12,2)           -- BT-115

-- Conditions
payment_terms         TEXT
payment_method        VARCHAR(50)
bank_details          JSONB
late_penalty_rate     DECIMAL(5,2)
recovery_indemnity    DECIMAL(10,2) DEFAULT 40
early_payment_discount TEXT
purchase_order        VARCHAR(100)           -- BT-13

-- Statuts
status                VARCHAR(20) NOT NULL DEFAULT 'draft'

-- Tracabilite
sent_at               TIMESTAMP
accepted_at           TIMESTAMP
rejected_at           TIMESTAMP
paid_at               TIMESTAMP
converted_at          TIMESTAMP
converted_from_id     UUID REFERENCES documents(id)
converted_to_id       UUID REFERENCES documents(id)

-- Notes
notes                 TEXT
terms                 TEXT
legal_mentions        TEXT

-- E-invoicing (reforme 2026)
transaction_category  VARCHAR(20)
vat_on_debits         BOOLEAN DEFAULT false
facturx_profile       VARCHAR(30)
facturx_xml           TEXT

-- Extensions medicales (optionnelles)
patient_id            UUID REFERENCES patients(id) ON DELETE SET NULL
appointment_id        UUID REFERENCES appointments(id) ON DELETE SET NULL
practitioner_id       UUID REFERENCES healthcare_providers(id) ON DELETE SET NULL

-- Metadonnees
created_by            UUID
deleted_at            TIMESTAMP
created_at            TIMESTAMP DEFAULT NOW()
updated_at            TIMESTAMP DEFAULT NOW()
```

### document_items (lignes de document)

```
id                    UUID PK
document_id           UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE
sort_order            INTEGER NOT NULL DEFAULT 0

description           TEXT NOT NULL
quantity              DECIMAL(10,3) NOT NULL DEFAULT 1
unit                  VARCHAR(30) DEFAULT 'unite'
unit_price            DECIMAL(12,2) NOT NULL
discount_percent      DECIMAL(5,2) DEFAULT 0
tax_rate              DECIMAL(5,2) NOT NULL        -- BT-152
tax_category_code     VARCHAR(5) DEFAULT 'S'       -- BT-151

line_net_amount       DECIMAL(12,2) NOT NULL       -- BT-131
tax_amount            DECIMAL(12,2) NOT NULL

product_service_id    UUID
product_snapshot      JSONB

created_at            TIMESTAMP DEFAULT NOW()
updated_at            TIMESTAMP DEFAULT NOW()
```

### document_sequences (numerotation sequentielle)

```
id                    UUID PK
company_id            UUID NOT NULL
document_type         VARCHAR(20) NOT NULL
prefix                VARCHAR(10) NOT NULL
year                  INTEGER NOT NULL
last_number           INTEGER NOT NULL DEFAULT 0

UNIQUE(company_id, document_type, year)
```

### clinic_settings -- ajout billing_settings JSONB

```json
{
  "seller": {
    "name": "...",
    "address": { "line1": "...", "postalCode": "...", "city": "...", "country": "..." },
    "siren": "...", "vatNumber": "...", "legalForm": "...",
    "rcs": "...", "email": "...", "phone": "..."
  },
  "invoicePrefix": "FA",
  "quotePrefix": "DV",
  "creditNotePrefix": "AV",
  "defaultPaymentTerms": 30,
  "defaultTaxRate": 21,
  "defaultCurrency": "EUR",
  "bankDetails": { "iban": "...", "bic": "...", "bankName": "..." },
  "latePenaltyRate": 3.0,
  "legalMentions": "...",
  "facturxProfile": "EN16931"
}
```

---

## Endpoints API

### CRUD Documents

| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/documents` | Lister (filtres: documentType, status, patientId, search, dateRange) |
| GET | `/documents/:id` | Detail avec lignes |
| POST | `/documents` | Creer (devis, facture ou avoir) |
| PUT | `/documents/:id` | Modifier (uniquement si draft) |
| DELETE | `/documents/:id` | Soft delete (uniquement si draft) |

### Actions

| Methode | Endpoint | Description |
|---------|----------|-------------|
| PATCH | `/documents/:id/send` | Envoyer -> status=sent |
| PATCH | `/documents/:id/accept` | Accepter devis -> status=accepted |
| PATCH | `/documents/:id/reject` | Rejeter devis -> status=rejected |
| PATCH | `/documents/:id/pay` | Marquer payee -> status=paid |
| POST | `/documents/:id/convert` | Convertir devis -> facture |
| POST | `/documents/:id/credit-note` | Creer un avoir depuis une facture |
| GET | `/documents/:id/pdf` | Telecharger PDF (Factur-X) |
| POST | `/documents/:id/duplicate` | Dupliquer un document |

### Stats & Config

| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/documents/stats` | Totaux par statut, CA, impayes |
| GET | `/documents/stats/monthly` | Revenus mensuels |
| GET | `/documents/next-number?type=invoice` | Previsualiser prochain numero |
| GET | `/billing/settings` | Lire parametres facturation |
| PUT | `/billing/settings` | Modifier parametres |

---

## Cycle de vie des documents

```
Devis:    draft -> sent -> accepted / rejected / expired -> converted
Facture:  draft -> sent -> paid / overdue -> cancelled
Avoir:    draft -> sent -> applied
```

---

## Flux de donnees

### A. Creation manuelle
1. Staff ouvre module -> clic "Nouveau"
2. Formulaire : selection client, ajout de lignes (saisie libre ou catalogue)
3. Frontend calcule les totaux en temps reel
4. POST /api/v1/documents -> backend valide, genere le numero sequentiel
5. Retour du document cree avec numero

### B. Creation depuis un rendez-vous
1. Clic sur un RDV -> "Creer un devis" ou "Creer une facture"
2. Pre-remplissage : patient, traitements, prix catalogue, practitioner
3. POST /api/v1/documents avec appointmentId
4. Backend met a jour appointments.quote_id ou invoice_id

### C. Conversion devis -> facture
1. Devis accepted -> "Convertir en facture"
2. POST /api/v1/documents/:id/convert
3. Backend copie lignes + parties, genere nouveau numero FA-YYYY-NNNN
4. Met a jour converted_from_id / converted_to_id

---

## Strategie SaaS

### Generique (reutilisable tel quel)
- Tables documents, document_items, document_sequences
- documentService.js, facturxService.js
- Routes CRUD /documents
- documentsApi.js, formulaires, PDF
- billing_settings

### Specifique MedicalPro
- Champs patient_id, appointment_id, practitioner_id (nullable)
- Pre-remplissage depuis RDV
- Lien appointments.quote_id / invoice_id
- Filtre /documents?patientId=

---

## Conformite EN 16931

Tous les Business Terms obligatoires sont couverts par le schema :
BT-1 (document_number), BT-2 (issue_date), BT-3 (document_type),
BT-5 (currency), BT-9 (due_date), BT-13 (purchase_order),
BT-27 (seller_name), BT-30 (seller_siren), BT-31 (seller_vat_number),
BT-35..40 (seller_address), BT-44 (buyer_name), BT-47 (buyer_siren),
BT-48 (buyer_vat_number), BT-50..55 (buyer_address), BT-72 (delivery_date),
BT-109 (subtotal), BT-112 (total), BT-115 (amount_due),
BT-126 (sort_order), BT-129 (quantity), BT-131 (line_net_amount),
BT-146 (unit_price), BT-151 (tax_category_code), BT-152 (tax_rate),
BT-153 (description).

Reforme francaise sept 2026 : buyer_siren, transaction_category, vat_on_debits.

---

*Derniere mise a jour : Fevrier 2026*
