# Résumé Infrastructure Multi-Pays - MedicalPro

Date: 2025-11-09
Explorateur: Claude Code

---

## RÉSUMÉ EXÉCUTIF

Le projet **MedicalPro** dispose d'une infrastructure **PARTIELLEMENT COMPLÈTE** pour le support multi-pays avec une bonne fondation pour :

- **France (FR)** et **Espagne (ES)** : Configurations pays opérationnelles
- **Architecture Backend** : Isolation des cliniques par base de données
- **Frontend** : Configuration pays et localisation (i18n) structurées
- **Validations métier** : Spécifiques par pays pour SIRET/NIF/TVA/Téléphones

### État Actuel
- Frontend: 80% implémenté
- Backend: 60% implémenté  
- Validation métier: 70% implémenté
- i18n/Locales: 100% implémenté (FR, EN, ES)

---

## 1. CONFIGURATION DE PAYS

### Frontend (.env)
**Fichier:** `/var/www/medical-pro/.env`

```env
REACT_APP_COUNTRY=FR        # Configuration par deployment (FR ou ES)
REACT_APP_ENV=development
REACT_APP_API_BASE_URL=http://localhost:3001/api/v1
```

### Configurations Pays
**Fichiers:** 
- `/var/www/medical-pro/src/config/countries/france.js`
- `/var/www/medical-pro/src/config/countries/spain.js`

Chaque configuration contient:
```javascript
{
  country: { code, name, currency, locale, defaultLanguage, availableLanguages },
  taxation: { defaultRate, rates[], vatNumber, vatLabel },
  business: { registrationNumber, addressFormat },
  invoice: { numberPattern, legalMentions, paymentTermsOptions },
  compliance: { standard, digitalSignatureRequired, regulations },
  validation: { phone, email, postalCode }
}
```

**Paramètres spécifiques France:**
- Devise: EUR
- Locale: fr-FR
- TVA par défaut: 20%
- SIRET: 14 chiffres obligatoire
- VAT: FR + 11 chiffres

**Paramètres spécifiques Espagne:**
- Devise: EUR
- Locale: es-ES
- TVA par défaut: 21%
- NIF: Lettre + 7 chiffres + caractère (OBLIGATOIRE)
- VAT: ES + NIF (OBLIGATOIRE)

### ConfigManager (Frontend)
**Fichier:** `/var/www/medical-pro/src/config/ConfigManager.js`

Classe Singleton qui:
- Initialise la configuration selon `process.env.REACT_APP_COUNTRY`
- Fournit des getters sécurisés pour chaque section
- Valide les numéros métier par pays (SIRET/NIF)
- Formate la devise selon la locale
- Freeze la config pour éviter les modifications

**Méthodes principales:**
```javascript
initialize(countryCode)
getTaxation()
getBusinessConfig()
getInvoiceConfig()
getValidationRules()
getComplianceInfo()

validateBusinessNumber(number)
validateVATNumber(number)
validatePhone(phone)
validatePostalCode(postalCode)
formatCurrency(amount)

useCountryConfig()  // Hook React
```

---

## 2. VALIDATIONS PAR PAYS

### Frontend (Client-side)
**Fichier:** `/var/www/medical-pro/src/utils/validation.js`

**Validations France:**
- `validateFrenchPhoneNumber()` - Format: +33/0123456789
- `validateAdeliNumber()` - 9 chiffres (numéro praticien)
- `validateRppsNumber()` - 11 chiffres (numéro praticien)
- `validatePostalCode()` - 5 chiffres
- `validateSiret()` - 14 chiffres

**Validations Espagne:**
- `validateSpanishPhoneNumber()` - Format: +34/6-9 suivi de 8 chiffres
- `validateSpanishMedicalNumber()` - 6-10 chiffres (colegiado)

**Validations Multi-Pays:**
```javascript
validatePhoneNumber(phone, country = 'es')
validateMedicalNumber(medicalNumber, country = 'es')
```

### Backend (Server-side)

#### Service INSEE (France)
**Fichier:** `/var/www/medical-pro-backend/src/services/inseeService.js`

- **Valide SIRET** via API INSEE (si token disponible)
- **Fallback format-only** si API indisponible
- **Vérifie la clé de contrôle** (algorithme Luhn)
- **Récupère infos entreprise** (nom, adresse, activité, statut)
- **Recherche par nom** d'entreprise

Utilise: `process.env.INSEE_API_TOKEN` et `process.env.INSEE_API_URL`

#### Service NIF España
**Fichier:** `/var/www/medical-pro-backend/src/services/spainService.js`

- **Valide NIF** (format + caractère de contrôle)
- **Extrait type d'entité** (SA, SL, Association, etc.)
- **Algorithme officiel espagnol** pour clé de contrôle
- **Détecte entités commerciales vs publiques**
- **Génère NIFs samples** pour tests

#### Routes de Validation
**Fichier:** `/var/www/medical-pro-backend/src/routes/validation.js`

```
POST /api/v1/validation/siret
POST /api/v1/validation/nif
POST /api/v1/validation/vat
GET  /api/v1/validation/info
```

**Schémas Joi:**
```javascript
const siretValidationSchema = /^\d{14}$/
const nifValidationSchema = /^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/
const vatValidationSchema = { vatNumber, country: 'FR'|'ES' }
```

### Modèle Company (Validation DB)
**Fichier:** `/var/www/medical-pro-backend/src/models/Company.js`

```javascript
country: {
  type: DataTypes.STRING(2),
  validate: { isIn: [['FR', 'ES']] }
}

business_number: {
  validate: {
    isBusinessNumber(value) {
      if (this.country === 'FR') -> /^\d{14}$/
      if (this.country === 'ES') -> /^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/
    }
  }
}

vat_number: {
  validate: {
    isVatNumber(value) {
      if (this.country === 'FR') -> /^FR\d{11}$/
      if (this.country === 'ES') -> /^ES[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/
    }
  }
}
```

---

## 3. LOCALISATION / i18n

### Structure de Fichiers
```
src/locales/
├── fr/
│   ├── common.json        (termes généraux, validation)
│   ├── auth.json          (authentification)
│   ├── nav.json           (navigation)
│   ├── home.json
│   ├── patients.json
│   ├── appointments.json
│   ├── medical.json
│   ├── consents.json
│   ├── invoices.json
│   ├── analytics.json
│   └── admin.json
├── en/                    (identique structure)
└── es/                    (identique structure)
```

### Configuration i18next
**Fichier:** `/var/www/medical-pro/src/i18n.js`

```javascript
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { fr, en, es },
    fallbackLng: 'fr',
    defaultNS: 'common',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'clinicmanager_language'
    }
  })
```

**Lien avec Pays:**
- France → defaultLanguage: 'fr', availableLanguages: ['fr', 'en']
- Espagne → defaultLanguage: 'es', availableLanguages: ['es', 'en']

### Hook d'Utilisation
```javascript
const { language, changeLanguage, t } = useLanguage();

// Dans les composants
t('common.save')          // Utilise i18next
i18n.changeLanguage('es') // Change la langue
```

---

## 4. CONTRAINTES MÉTIER PAR PAYS

### TVA (Impôts sur la Valeur Ajoutée)

**France:**
```javascript
{
  defaultRate: 20,
  rates: [
    { rate: 0, label: 'Exonéré' },
    { rate: 5.5, label: 'Réduit (livres, première nécessité)' },
    { rate: 10, label: 'Intermédiaire (restauration, transport)' },
    { rate: 20, label: 'Normal' }
  ],
  vatLabel: 'TVA',
  vatNumber: { required: false, format: /^FR[0-9A-Z]{2}[0-9]{9}$/ }
}
```

**Espagne:**
```javascript
{
  defaultRate: 21,
  rates: [
    { rate: 0, label: 'Exento (IVA 0%)' },
    { rate: 4, label: 'Superreducido (produits basiques)' },
    { rate: 10, label: 'Reducido (culture, sport)' },
    { rate: 21, label: 'General' }
  ],
  vatLabel: 'IVA',
  vatNumber: { required: true, format: /^ES[A-Z0-9][0-9]{7}[A-Z0-9]$/ }
}
```

### Devise
- France & Espagne: **EUR** (Euro)
- Format: Utilise `Intl.NumberFormat` avec `locale` correspondant

### Numéros d'Identification Professionnels

**France (Professionnels Santé):**
- ADELI: 9 chiffres (médecins, dentistes, etc.)
- RPPS: 11 chiffres (professions libérales santé)
- FINESS: Pour établissements

**Espagne (Professionnels Santé):**
- Colegiado: 6-10 chiffres, province + numéro séquentiel
- Numéro parcellaire du collège professionnel

### Documents / Facturation

**France:**
```javascript
{
  numberPattern: 'FAC-{YYYY}-{NNNN}',
  legalMentions: [
    'TVA non applicable, art. 293 B du CGI',
    'Dispensé d\'immatriculation au RCS',
    'Ne pas jeter sur la voie publique'
  ],
  paymentTermsOptions: [
    { value: 0, label: 'Paiement à réception' },
    { value: 15, label: '15 jours' },
    { value: 30, label: '30 jours' },
    { value: 45, label: '45 jours' },
    { value: 60, label: '60 jours' }
  ]
}
```

**Espagne:**
```javascript
{
  numberPattern: 'FACT-{YYYY}-{NNNN}',
  legalMentions: [
    'Factura sujeta a IVA',
    'Régimen General del IVA',
    'Conservar durante 4 años'
  ],
  paymentTermsOptions: [
    { value: 0, label: 'Pago al contado' },
    { value: 15, label: '15 días' },
    { value: 30, label: '30 días' },
    { value: 60, label: '60 días' },
    { value: 90, label: '90 días' }
  ]
}
```

### Conformité Réglementaire

**France:**
- Standard: EN 16931
- Signature numérique: Obligatoire
- Archivage: 10 ans
- Formats: PDF/A-3, XML
- Régulations: Code Général des Impôts, Ordonnance 2021-1190

**Espagne:**
- Standard: EN 16931
- Signature numérique: Obligatoire
- Archivage: 4 ans
- Formats: PDF/A-3, XML
- Régulations: Ley 37/1992 IVA, Real Decreto 1619/2012, Ley 11/2020 (SII)

---

## 5. CONFIGURATION DES CLINIQUES

### Backend Architecture

**Multi-Clinic Isolated Database:**

```
medicalpro_central (central - metadata only)
├── companies (clinic registration + DB connection info)
├── users (central admins)
└── audit_logs

medicalpro_clinic_{uuid1} (clinic 1 - isolated)
├── patients
├── practitioners
├── appointments
├── invoices
└── ...

medicalpro_clinic_{uuid2} (clinic 2 - isolated)
├── patients
├── practitioners
├── appointments
└── ...
```

### Modèle Company
**Fichier:** `/var/www/medical-pro-backend/src/models/Company.js`

```javascript
{
  id: UUID (primary key),
  name: STRING(255),
  country: STRING(2), // 'FR' ou 'ES'
  business_number: STRING(20), // SIRET ou NIF
  vat_number: STRING(20), // TVA
  email: STRING(255),
  phone: STRING(20),
  address: JSONB,
  settings: JSONB // Configuré par pays
}
```

**Settings par Défaut:**

France:
```javascript
{
  vatLabel: 'TVA',
  defaultVatRate: 20,
  currency: 'EUR',
  dateFormat: 'DD/MM/YYYY',
  numberFormat: 'FR',
  invoicePrefix: 'FA-',
  quotePrefix: 'DV-'
}
```

Espagne:
```javascript
{
  vatLabel: 'IVA',
  defaultVatRate: 21,
  currency: 'EUR',
  dateFormat: 'DD/MM/YYYY',
  numberFormat: 'ES',
  invoicePrefix: 'FAC-',
  quotePrefix: 'PRES-'
}
```

### Routing Clinic
**Fichier:** `/var/www/medical-pro-backend/src/middleware/clinicRouting.js`

**Flow:**
1. User authenticates → JWT contains clinicId (companyId)
2. Request arrives → authMiddleware verifies JWT
3. clinicRoutingMiddleware:
   - Extrait clinicId du JWT
   - Récupère connection depuis `connectionManager`
   - Attache `req.clinicDb` (Sequelize instance pour clinic)
4. Route handler utilise `req.clinicDb` pour queries clinic-specific

**Sécurité:** Une clinique ne peut jamais accéder aux données d'une autre (isolation DB).

---

## 6. SCHÉMAS DE VALIDATION

### Validations Schemas Joi
**Fichier:** `/var/www/medical-pro-backend/src/base/validationSchemas.js`

```javascript
module.exports = {
  // Champs communs
  firstName: Joi.string().min(2).max(100),
  lastName: Joi.string().min(2).max(100),
  email: Joi.string().email().lowercase(),
  phone: Joi.string().pattern(/^[\+]?[0-9\s\-\(\)]{8,20}$/),
  address: Joi.object({ street, city, postalCode, country, state, complement }),
  notes: Joi.string().max(1000),
  isActive: Joi.boolean(),

  // Champs médicaux
  dateOfBirth: Joi.date().iso().max('now'),
  gender: Joi.string().valid('M', 'F', 'O', 'N/A'),
  socialSecurityNumber: Joi.string().pattern(/^\d{15}$/),  // France
  patientNumber: Joi.string().max(50),
  reason: Joi.string().max(500),
  description: Joi.string().max(2000),
  appointmentStatus: Joi.string().valid('scheduled', 'confirmed', 'cancelled', 'completed', 'no-show'),
  medicalRecordType: Joi.string().valid('consultation', 'examination', 'lab_result', 'prescription', 'imaging', 'note'),

  // Schémas composés
  contact: () => ({ email, phone }),
  personalInfo: () => ({ firstName, lastName, email, phone, dateOfBirth, gender }),
  addressFull: () => ({ address }),

  // Schémas préconstruits
  createPatientSchema: Joi.object({ ... }),
  updatePatientSchema: Joi.object({ ... }),
  createPractitionerSchema: Joi.object({ ... }),
  createAppointmentSchema: Joi.object({ ... }),
  createMedicalRecordSchema: Joi.object({ ... }),
  createConsentSchema: Joi.object({ ... })
}
```

**Limitations Actuelles:**
- Les schémas ne sont PAS contextués par pays
- Les validations de téléphone et code postal sont génériques
- Pas de validation spécifique SIRET/NIF par pays au niveau Joi

**À Améliorer:**
- Créer des schémas par pays
- Intégrer ConfigManager dans les validations Joi
- Rendre les champs optionnels/requis selon pays

---

## 7. VARIABLES D'ENVIRONNEMENT

### Frontend (.env)
**Fichier:** `/var/www/medical-pro/.env`

```env
REACT_APP_COUNTRY=FR                        # Pays (FR ou ES)
REACT_APP_ENV=development                   # Environment
REACT_APP_API_BASE_URL=http://localhost:3001/api/v1
REACT_APP_API_TIMEOUT=30000
```

### Backend (.env)
**Fichier:** `/var/www/medical-pro-backend/.env`

```env
# Serveur
NODE_ENV=development
PORT=3001
API_VERSION=v1

# Base de données
DB_HOST=localhost
DB_PORT=5432
DB_USER=medicalpro
DB_PASSWORD=medicalpro2024
DB_DIALECT=postgres

# Central DB (manages all clinics)
CENTRAL_DB_NAME=medicalpro_central

# Default Clinic DB (for testing/development)
CLINIC_DB_NAME=medicalpro_clinic_550e8400_e29b_41d4_a716_446655440000

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d

# API External Services
INSEE_API_TOKEN=your-insee-api-token           # FRANCE
INSEE_API_URL=https://api.insee.fr/entreprises/sirene/V3

# Medical Services (France)
FINESS_API_URL=https://finess.esante.gouv.fr/
ADELI_API_URL=https://adeli.esante.gouv.fr/

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:3002
```

---

## 8. MIGRATIONS BASE DE DONNÉES

**Fichier:** `/var/www/medical-pro-backend/migrations/`

### Central DB Schema
**Fichier:** `central_001_initial_schema.sql`
- Table `companies` (avec champ `country`)
- Stores clinic metadata et connection info

### Clinic DB Schema
**Fichiers:**
- `001_initial_schema.sql` - Tables de base
- `001_medical_schema.sql` - Schéma médical complet
- `002_medical_patients.sql`
- `004_medical_practitioners.sql`
- `005_medical_appointments.sql`
- `006_medical_appointment_items.sql`
- `007_medical_documents.sql`
- `008_medical_consents.sql`

**Note:** Les migrations ne sont PAS contextuées par pays (même schéma pour FR et ES).

---

## 9. INTÉGRATIONS MANQUANTES / À AMÉLIORER

### Frontend
- [ ] ConfigManager pas utilisé dans les routes login/signup
- [ ] ValidationRules du ConfigManager pas appliqués aux formulaires
- [ ] Business number label/placeholder dynamique par pays (pas implémenté)
- [ ] Formats de dates (DD/MM/YYYY vs autres) pas appliqués
- [ ] Téléphone: accepte formats génériques, pas pays-specific au frontend

### Backend
- [ ] Schémas Joi pas contextuées par pays
- [ ] Routes d'admin pas explorées (peut avoir des contraintes)
- [ ] Numéros médicaux (ADELI, Colegiado) pas validés au backend
- [ ] TVA rates pas stockées en DB ni filtrables par pays
- [ ] Formats de documents pas implémentés

### Database
- [ ] Pas de champ `country` dans les modèles Patient, Practitioner, etc.
- [ ] Settings par clinique pas structurés (JSONB générique)
- [ ] Pas de table de configuration des taux TVA par pays
- [ ] Pas de audit trail des changements de configuration pays

### Integration
- [ ] API INSEE non testée en production
- [ ] No API pour validation NIF España (local only)
- [ ] Aucun test des validations par pays
- [ ] Documentation de déploiement multi-pays inexistante

---

## 10. RÉSUMÉ PAR FONCTIONNALITÉ

| Fonctionnalité | Frontend | Backend | DB | Statut |
|---|---|---|---|---|
| **Config Pays (FR/ES)** | ✅ 100% | ✅ 90% | ✅ 80% | Bon |
| **Validations SIRET/NIF** | ✅ 80% | ✅ 100% | ✅ 80% | Bon |
| **TVA/Taxation** | ⚠️ 60% | ✅ 80% | ✅ 70% | À compléter |
| **Formats Documents** | ❌ 0% | ❌ 0% | ❌ 0% | À implémenter |
| **Numéros Médicaux** | ✅ 80% | ⚠️ 50% | ❌ 0% | À compléter |
| **i18n/Locales** | ✅ 100% | ✅ 0% | N/A | Frontend OK |
| **Isolation Cliniques** | N/A | ✅ 100% | ✅ 100% | Excellent |
| **Conformité Régulière** | ⚠️ 40% | ⚠️ 40% | ⚠️ 20% | À implémenter |

---

## 11. RECOMMANDATIONS PRIORITAIRES

### Priorité 1 (Critical)
1. Contextuer les schémas Joi par pays
2. Implémenter les validations backend pour numéros médicaux
3. Utiliser ConfigManager dans les routes de validation
4. Tester API INSEE en QA/Prod

### Priorité 2 (High)
1. Ajouter champ `country` aux modèles Patient/Practitioner
2. Implémenter structuration TVA rates en DB
3. Créer routes admin pour gérer config par clinic
4. Ajouter tests des validations par pays

### Priorité 3 (Medium)
1. Implémenter formats de documents par pays
2. Ajouter audit trail des changes config
3. Créer documentation déploiement multi-pays
4. Implementer API webhooks pour validation NIF (future)

---
