# Architecture Multi-Pays - Diagrammes Visuels

## 1. FLUX DE CONFIGURATION PAYS

```
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION STARTUP                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────────┐
                    │   .env file         │
                    │ REACT_APP_COUNTRY   │
                    │   = 'FR' or 'ES'    │
                    └─────────────────────┘
                              ↓
                    ┌─────────────────────┐
                    │  ConfigManager      │
                    │  .initialize()      │
                    └─────────────────────┘
                              ↓
                    ┌─────────────────────┐
                    │  Load config file   │
                    │  france.js or       │
                    │  spain.js           │
                    └─────────────────────┘
                              ↓
                    ┌─────────────────────────────────────┐
                    │  Config Loaded & Frozen             │
                    ├─────────────────────────────────────┤
                    │ • Country info (code, currency)     │
                    │ • Validation rules (SIRET/NIF)      │
                    │ • Tax settings (TVA/IVA rates)      │
                    │ • Invoice templates                 │
                    │ • Compliance requirements           │
                    └─────────────────────────────────────┘
                              ↓
                    ┌─────────────────────┐
                    │  Frontend renders   │
                    │  country-specific   │
                    │  UI & validation    │
                    └─────────────────────┘
```

---

## 2. REQUEST FLOW - BACKEND ROUTING

```
┌──────────────────────────────────────────────────────────────────┐
│                     CLIENT REQUEST                               │
│        POST /api/v1/patients                                     │
│        Authorization: Bearer <JWT>                               │
└──────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌──────────────────────┐
                    │  authMiddleware      │
                    │  ┌────────────────┐  │
                    │  │ Verify JWT     │  │
                    │  │ Extract user & │  │
                    │  │ clinicId       │  │
                    │  └────────────────┘  │
                    │  req.user = {        │
                    │    id, email,        │
                    │    companyId (←)     │
                    │  }                   │
                    └──────────────────────┘
                              ↓
                    ┌──────────────────────────────────┐
                    │  clinicRoutingMiddleware (NEW)   │
                    ├──────────────────────────────────┤
                    │ 1. Extract clinicId from JWT     │
                    │ 2. Query centralDB               │
                    │    SELECT clinic_connection      │
                    │    FROM companies                │
                    │    WHERE id = clinicId           │
                    │ 3. getClinicConnection()         │
                    │ 4. Attach req.clinicDb           │
                    └──────────────────────────────────┘
                              ↓
                    ┌──────────────────────────────────┐
                    │  Route Handler                   │
                    │  POST /api/v1/patients           │
                    ├──────────────────────────────────┤
                    │ // Uses req.clinicDb             │
                    │ const patient = await            │
                    │   Patient.create(data)           │
                    │   // Queries ONLY clinic's DB    │
                    └──────────────────────────────────┘
                              ↓
                    ┌──────────────────────────────────┐
                    │  medicalpro_clinic_abc123        │
                    │  (Clinic-specific database)      │
                    │  // Create patient in THIS DB    │
                    └──────────────────────────────────┘
                              ↓
                    ┌──────────────────────────────────┐
                    │  Response sent to client         │
                    │  { patient_id: ..., status: ok } │
                    └──────────────────────────────────┘
```

---

## 3. DATABASE ARCHITECTURE

```
┌──────────────────────────────────────────────────────────────────┐
│                      POSTGRES SERVER                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │          medicalpro_central                               │ │
│  │          (Manages ALL clinics)                            │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │ • companies                                               │ │
│  │   - id (UUID)                                            │ │
│  │   - name, country (FR/ES), region                        │ │
│  │   - business_number (SIRET/NIF)                          │ │
│  │   - vat_number (TVA/IVA)                                 │ │
│  │   - db_connection_string                                 │ │
│  │   - settings (JSONB)                                     │ │
│  │                                                           │ │
│  │ • users (central admins only)                            │ │
│  │ • audit_logs                                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────┐                            │
│  │ medicalpro_clinic_550e8400     │                            │
│  │ (Clinic A - FR)                │                            │
│  ├────────────────────────────────┤                            │
│  │ • patients                     │                            │
│  │ • practitioners                │                            │
│  │ • appointments                 │                            │
│  │ • invoices                     │                            │
│  │ • medical_records              │                            │
│  │ • documents                    │                            │
│  │ • consents                     │                            │
│  └────────────────────────────────┘                            │
│                                                                  │
│  ┌────────────────────────────────┐                            │
│  │ medicalpro_clinic_a1b2c3d4     │                            │
│  │ (Clinic B - ES)                │                            │
│  ├────────────────────────────────┤                            │
│  │ • patients                     │                            │
│  │ • practitioners                │                            │
│  │ • appointments                 │                            │
│  │ • invoices                     │                            │
│  │ • medical_records              │                            │
│  │ • documents                    │                            │
│  │ • consents                     │                            │
│  └────────────────────────────────┘                            │
│                                                                  │
│  ... (N more clinic databases)                                  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

SECURITY GUARANTEE:
  One Breach = One Clinic Affected (not all)
```

---

## 4. VALIDATION LAYERS

```
┌──────────────────────────────────────────────────────────────────┐
│                    USER INPUT                                    │
│                (SIRET: 82140255300213)                          │
└──────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌──────────────────────┐
                    │  FRONTEND            │
                    │  (Client-side)       │
                    ├──────────────────────┤
                    │ ConfigManager        │
                    │ .validateSiret()     │
                    │ └─> /^\d{14}$/       │
                    │ ✓ Format OK          │
                    └──────────────────────┘
                              ↓
                    ┌──────────────────────┐
                    │  API CALL            │
                    │  POST /validation/   │
                    │  siret               │
                    └──────────────────────┘
                              ↓
                    ┌──────────────────────┐
                    │  BACKEND             │
                    │  (Server-side)       │
                    ├──────────────────────┤
                    │ 1. Joi Schema        │
                    │    /^\d{14}$/        │
                    │    ✓ Format OK       │
                    │                      │
                    │ 2. FranceInseeService│
                    │    • Call API INSEE  │
                    │    • Verify checksum │
                    │    • Get company data│
                    │    ✓ Valid!          │
                    │                      │
                    │ 3. Company Model     │
                    │    .isValidBusiness()│
                    │    ✓ Stored in DB    │
                    └──────────────────────┘
                              ↓
                    ┌──────────────────────┐
                    │  RESPONSE            │
                    │  {                   │
                    │    valid: true,      │
                    │    siret: '82...',   │
                    │    name: 'Company'   │
                    │  }                   │
                    └──────────────────────┘
```

---

## 5. LOCALIZATION FLOW

```
┌──────────────────────────────────────────────────────────────────┐
│                   APPLICATION START                              │
└──────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌──────────────────────┐
                    │  i18next.init()      │
                    │  Load resources:     │
                    │  • fr/*.json         │
                    │  • en/*.json         │
                    │  • es/*.json         │
                    └──────────────────────┘
                              ↓
                    ┌──────────────────────┐
                    │ Language Detection   │
                    ├──────────────────────┤
                    │ Order:               │
                    │ 1. localStorage      │
                    │ 2. navigator lang    │
                    │ 3. fallback: 'fr'    │
                    └──────────────────────┘
                              ↓
                    ┌──────────────────────────────────┐
                    │  Set Language & Country Config   │
                    ├──────────────────────────────────┤
                    │ IF locale = 'fr'                 │
                    │   ├─ Set i18n lang = 'fr'       │
                    │   └─ ConfigManager country = FR │
                    │       ├─ SIRET validation       │
                    │       ├─ TVA 20%                │
                    │       └─ Phone: +33             │
                    │                                 │
                    │ IF locale = 'es'                │
                    │   ├─ Set i18n lang = 'es'       │
                    │   └─ ConfigManager country = ES │
                    │       ├─ NIF validation         │
                    │       ├─ IVA 21%                │
                    │       └─ Phone: +34             │
                    └──────────────────────────────────┘
                              ↓
                    ┌──────────────────────┐
                    │  Component Renders   │
                    │  with:               │
                    │  • Translated text   │
                    │  • Country-specific  │
                    │    validation rules  │
                    │  • Formatted currency│
                    └──────────────────────┘
```

---

## 6. CONFIGURATION HIERARCHY

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENVIRONMENT LEVEL                            │
│           REACT_APP_COUNTRY = FR or ES                          │
│           (Set during build/deployment)                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  CONFIGMANAGER LEVEL                            │
│       Loads country-specific configuration                      │
│       • /config/countries/france.js                             │
│       • /config/countries/spain.js                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  COMPONENT LEVEL                                │
│       Uses ConfigManager methods to:                            │
│       • Validate input (validatePhone, validateSiret)          │
│       • Format output (formatCurrency)                          │
│       • Display labels (getTaxLabel, getBusinessNumberLabel)   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  BACKEND LEVEL                                  │
│       Company model stores:                                     │
│       • country: FR or ES                                       │
│       • business_number: SIRET or NIF                          │
│       • vat_number: FR TVA or ES IVA                           │
│       • settings: country-specific defaults                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  DATABASE LEVEL                                 │
│       Clinic database contains:                                 │
│       • patients, appointments, invoices                        │
│       • All tagged with clinic context (implicit)              │
│       • Tax rates, document formats, compliance rules           │
│         inherited from Company.settings                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. VALIDATION RULES MATRIX

```
┌──────────────────┬────────────────────┬────────────────────┐
│ FIELD            │ FRANCE (FR)         │ SPAIN (ES)         │
├──────────────────┼────────────────────┼────────────────────┤
│ Phone            │ +33/0123456789     │ +34/6-9 + 8 digits │
│                  │ (0-9 format)       │ (6-9 start)        │
├──────────────────┼────────────────────┼────────────────────┤
│ Postal Code      │ 5 digits           │ 5 digits           │
│ Pattern          │ ^\d{5}$            │ ^\d{5}$            │
├──────────────────┼────────────────────┼────────────────────┤
│ Business Number  │ SIRET (14 digits)  │ NIF (L+7D+C)       │
│                  │ Optional           │ REQUIRED           │
│                  │ ^\d{14}$           │ ^[A-Z]\d{7}[0-9A-J]│
├──────────────────┼────────────────────┼────────────────────┤
│ VAT Number       │ FR + 11 chars      │ ES + NIF           │
│                  │ Optional           │ REQUIRED           │
│                  │ ^FR[0-9A-Z]{11}$   │ ^ES[A-Z0-9]{8}[0-9]│
├──────────────────┼────────────────────┼────────────────────┤
│ Medical License  │ ADELI (9 digits)   │ Colegiado (6-10)   │
│                  │ OR RPPS (11)       │ (province+number)  │
│                  │ ^\d{9}$ \/ ^\d{11}$│ ^\d{6,10}$         │
├──────────────────┼────────────────────┼────────────────────┤
│ Tax Default Rate │ 20%                │ 21%                │
├──────────────────┼────────────────────┼────────────────────┤
│ Tax Label        │ TVA                │ IVA                │
├──────────────────┼────────────────────┼────────────────────┤
│ Currency         │ EUR (€)            │ EUR (€)            │
├──────────────────┼────────────────────┼────────────────────┤
│ Locale           │ fr-FR              │ es-ES              │
├──────────────────┼────────────────────┼────────────────────┤
│ Default Language │ Français           │ Español            │
├──────────────────┼────────────────────┼────────────────────┤
│ Invoice Prefix   │ FA-                │ FAC-               │
├──────────────────┼────────────────────┼────────────────────┤
│ Archiving Period │ 10 years           │ 4 years            │
└──────────────────┴────────────────────┴────────────────────┘
```

---

## 8. COMPONENT INTEGRATION POINTS

```
┌────────────────────────────────────────────────────────────────┐
│                      React Component                           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  import { useCountryConfig } from '@config/ConfigManager'     │
│  import { useLanguage } from '@hooks/useLanguage'             │
│  import { validatePhone, validateSiret } from '@utils/validation│
│                                                                │
│  export const CompanyForm = () => {                            │
│    const { config } = useCountryConfig()                       │
│    const { t } = useLanguage()                                 │
│                                                                │
│    return (                                                    │
│      <form>                                                    │
│        <input                                                  │
│          label={config.getBusinessNumberLabel()}     ← FR:    │
│          placeholder={config.getBusinessNumberPlaceholder()} SIRET│
│          validate={(v) => config.validateBusinessNumber(v)}   │
│        />                                                      │
│        <input                                                  │
│          label={t('common.phone')}                             │
│          validate={(v) => validatePhone(v, config.countryCode)│
│        />                                                      │
│        <CurrencyInput                                         │
│          format={config.formatCurrency}                        │
│        />                                                      │
│        <TaxRateSelect                                         │
│          options={config.getTaxRates()}                        │
│          label={config.getTaxLabel()}  ← FR: TVA / ES: IVA    │
│        />                                                      │
│      </form>                                                   │
│    )                                                           │
│  }                                                             │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 9. API VALIDATION ENDPOINT FLOW

```
CLIENT                          API SERVER                      EXTERNAL API

┌──────────────────┐
│ POST /validate   │
│ /siret           │───────────┐
│                  │           │
│ {siret:          │           ├──> Joi Schema Validation
│  82140255300213} │           │    (format check)
│                  │           │
│                  │           ├──> FranceInseeValidator
│                  │           │    • Format check: /^\d{14}$/
│                  │           │    • Checksum: Luhn algo
│                  │           │
│                  │           ├──> API INSEE (if token)
│                  │           │    GET /siret/82140255300213
│                  │           │    ┌──────────────────────┐
│                  │           │    │   INSEE API          │
│                  │           │    │ - Company details    │
│                  │           │    │ - Activity code      │
│                  │           │    │ - Address            │
│                  │           │    └──────────────────────┘
│                  │           │
│                  │  RESPONSE │
│                  │◄──────────┤
│ { valid: true,   │           │
│   siret: '82..', │           │
│   name: 'Co',    │           │
│   address: {...} │           │
│ }                │           │
│                  │           │
└──────────────────┘           │
                               │
                    POST /validate/nif
                    ┌──────────────────┐
                    │ {nif: B12345674}  │
                    └──────────────────┘
                               │
                        Joi Schema Validation
                        SpainNifValidator
                        • Format: /^[A-Z]\d{7}[0-9A-J]$/
                        • Check digit: Official algorithm
                        • Entity type detection
                               │
                    RESPONSE   │
                    { valid: true,
                      nif: 'B12345674',
                      type: 'SL',
                      description: 'Sociedad...'
                    }
```

---

## 10. COMPLETE REQUEST-TO-RESPONSE CYCLE

```
┌────────────────────────────────────────────────────────────────┐
│                    USER FLOW                                   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ 1. USER SELECTS COUNTRY (Frontend)                            │
│    ┌─────────────────────────────────────┐                    │
│    │ <select onChange={handleCountry}>   │                    │
│    │   <option>France</option>           │                    │
│    │   <option>España</option>           │                    │
│    │ </select>                           │                    │
│    └─────────────────────────────────────┘                    │
│                           ↓                                   │
│                                                                │
│ 2. BUILD PROCESS READS ENV                                    │
│    REACT_APP_COUNTRY = 'ES'                                   │
│                           ↓                                   │
│                                                                │
│ 3. APP INITIALIZES                                            │
│    ConfigManager.initialize('ES')                             │
│    └─ Load spain.js config                                   │
│    └─ Freeze config object                                   │
│                           ↓                                   │
│                                                                │
│ 4. FORM RENDERS                                               │
│    <input                                                     │
│      label="NIF"                    (not "SIRET")             │
│      placeholder="A12345674"        (Spanish format)          │
│      validate={config.validateBusinessNumber}                │
│    />                                                         │
│                           ↓                                   │
│                                                                │
│ 5. USER ENTERS NIF                                            │
│    Value: "B87654321"                                         │
│                           ↓                                   │
│                                                                │
│ 6. FRONTEND VALIDATION                                        │
│    config.validateBusinessNumber('B87654321')                │
│    └─ Check: /^[A-Z]\d{7}[0-9A-J]$/ → ✓ PASS                │
│                           ↓                                   │
│                                                                │
│ 7. SUBMIT FORM                                                │
│    POST /api/v1/validation/nif                               │
│    Body: { nif: 'B87654321' }                                │
│                           ↓                                   │
│                                                                │
│ 8. BACKEND VALIDATION                                         │
│    • Joi Schema Check → ✓                                     │
│    • SpainNifValidator → ✓                                    │
│    • Company.create({ nif, country: 'ES' }) → ✓              │
│                           ↓                                   │
│                                                                │
│ 9. STORE IN CLINIC DB                                         │
│    medicalpro_clinic_{clinicId}                             │
│    companies table:                                           │
│    {                                                          │
│      id: uuid,                                               │
│      name: 'My Clinic',                                      │
│      country: 'ES',                                          │
│      business_number: 'B87654321',                           │
│      vat_number: 'ESB87654321',                              │
│      settings: {                                             │
│        vatLabel: 'IVA',                                      │
│        defaultVatRate: 21,                                   │
│        currency: 'EUR',                                      │
│        invoicePrefix: 'FAC-'                                 │
│      }                                                        │
│    }                                                          │
│                           ↓                                   │
│                                                                │
│ 10. RESPONSE TO CLIENT                                        │
│    {                                                          │
│      success: true,                                          │
│      data: {                                                 │
│        valid: true,                                          │
│        nif: 'B87654321',                                     │
│        entityType: 'SL',                                     │
│        description: 'Sociedad...'                            │
│      },                                                       │
│      message: 'NIF format is valid'                          │
│    }                                                          │
│                           ↓                                   │
│                                                                │
│ 11. FRONTEND UPDATES UI                                       │
│    • Display checkmark icon ✓                                 │
│    • Enable "Next" button                                     │
│    • Proceed to tax configuration (IVA 21%)                  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 11. ERROR HANDLING FLOW

```
┌───────────────────────────────────────────────────────────────┐
│                   USER INPUT ERROR                            │
│            Value: "12345"  (Invalid SIRET)                   │
└───────────────────────────────────────────────────────────────┘
                              ↓
                    ┌──────────────────┐
                    │  Frontend Check  │
                    │  /^\d{14}$/      │
                    │  ✗ FAIL          │
                    └──────────────────┘
                              ↓
                    ┌──────────────────────────────┐
                    │  Display Error Message       │
                    │  (from i18n)                 │
                    │  "SIRET must be 14 digits"   │
                    │  Prevent form submission     │
                    └──────────────────────────────┘
                              ↓
                    ┌──────────────────────────────┐
                    │  OR:                         │
                    │  Passes frontend validation  │
                    │  but API rejects             │
                    └──────────────────────────────┘
                              ↓
                    ┌──────────────────────────────┐
                    │  POST /validation/siret      │
                    │  FranceInseeValidator:       │
                    │  • Format OK                 │
                    │  • Checksum INVALID          │
                    │  • Return: {                 │
                    │      valid: false,           │
                    │      error: 'Invalid SIRET'  │
                    │    }                         │
                    └──────────────────────────────┘
                              ↓
                    ┌──────────────────────────────┐
                    │  Frontend displays:          │
                    │  "SIRET not found in INSEE"  │
                    │  (translated in current lang)│
                    │  User can correct & retry    │
                    └──────────────────────────────┘
```

---

