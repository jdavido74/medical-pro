# Référence des Formulaires - MedicalPro SaaS

> Document de référence listant tous les formulaires du frontend, leurs champs, validations, et endpoints backend.

---

## Table des matières

1. [Authentification](#1-authentification)
2. [Onboarding](#2-onboarding)
3. [Gestion des Utilisateurs](#3-gestion-des-utilisateurs)
4. [Gestion des Patients](#4-gestion-des-patients)
5. [Rendez-vous](#5-rendez-vous)
6. [Dossiers Médicaux](#6-dossiers-médicaux)
7. [Consentements](#7-consentements)
8. [Configuration Clinique](#8-configuration-clinique)
9. [Équipes et Délégations](#9-équipes-et-délégations)
10. [Facturation](#10-facturation)

---

## 1. Authentification

### 1.1 LoginPage.js

**Chemin:** `src/components/auth/LoginPage.js`

**Endpoint Backend:** `POST /api/v1/auth/login`

| Champ | Type | Requis | Validation | Variable Backend |
|-------|------|--------|------------|------------------|
| email | email | ✅ | Format email valide | `email` |
| password | password | ✅ | Min 1 caractère | `password` |
| rememberMe | checkbox | ❌ | - | N/A (frontend only) |

**Réponse Backend:**
```json
{
  "success": true,
  "data": {
    "user": { "id", "email", "firstName", "lastName", "role" },
    "company": { "id", "name", "country", "locale", "phone" },
    "subscription": { "plan", "status", "expiresAt" },
    "permissions": ["users.view", "patients.create", ...]
  },
  "token": "jwt_token"
}
```

**Gestion d'erreurs:**
- `errors.email` - Email invalide
- `errors.password` - Mot de passe incorrect
- `errors.submit` - Erreur générale (compte désactivé, etc.)

---

### 1.2 SignupPage.js

**Chemin:** `src/components/auth/SignupPage.js`

**Endpoint Backend:** `POST /api/v1/auth/register`

| Champ | Type | Requis | Validation | Variable Backend |
|-------|------|--------|------------|------------------|
| firstName | text | ✅ | Non vide | `firstName` |
| lastName | text | ✅ | Non vide | `lastName` |
| email | email | ✅ | Format email valide | `email` + `companyEmail` |
| phone | tel | ✅ | Format international (PhoneInput) | `companyPhone` |
| clinicName | text | ✅ | Min 2 caractères | `companyName` |
| password | password | ✅ | Min 8 caractères | `password` |
| country | select | Auto | FR, ES, GB | `country` |
| locale | hidden | Auto | fr-FR, es-ES, en-GB | `locale` |
| acceptTerms | checkbox | ✅ | Doit être coché | `acceptTerms` |

**Schéma Joi Backend:**
```javascript
{
  companyName: Joi.string().min(2).max(255).required(),
  country: Joi.string().valid('FR', 'ES', 'GB').required(),
  locale: Joi.string().valid('fr-FR', 'es-ES', 'en-GB').optional(),
  companyEmail: Joi.string().email().required(),
  companyPhone: Joi.string().pattern(/^[\+]?[0-9\s\-\(\)]{8,20}$/).optional(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().max(100).optional(),
  lastName: Joi.string().max(100).optional()
}
```

---

## 2. Onboarding

### 2.1 ClinicSetupStep.js

**Chemin:** `src/components/onboarding/steps/ClinicSetupStep.js`

**Endpoint Backend:** `PUT /api/v1/facilities/current`

| Champ | Type | Requis | Validation | Variable Backend |
|-------|------|--------|------------|------------------|
| name | text | ✅ | Non vide | `name` |
| email | email | ✅ | Format email | `email` |
| phone | tel | ❌ | Format valide | `phone` |
| address.street | text | ❌ | - | `address_line1` |
| address.city | text | ❌ | - | `city` |
| address.postalCode | text | ❌ | - | `postal_code` |
| address.country | text | ❌ | Code pays 2 lettres | `country` |

---

### 2.2 ClinicScheduleStep.js

**Chemin:** `src/components/onboarding/steps/ClinicScheduleStep.js`

**Endpoint Backend:** `PUT /api/v1/clinic-settings`

| Champ | Type | Requis | Validation | Variable Backend |
|-------|------|--------|------------|------------------|
| schedule.{day}.enabled | boolean | ✅ | Au moins 1 jour actif | `operating_hours.{day}.enabled` |
| schedule.{day}.hasLunchBreak | boolean | ❌ | - | `operating_hours.{day}.hasLunchBreak` |
| schedule.{day}.morning.start | time | ❌ | Format HH:MM | `operating_hours.{day}.morning.start` |
| schedule.{day}.morning.end | time | ❌ | Format HH:MM | `operating_hours.{day}.morning.end` |
| schedule.{day}.afternoon.start | time | ❌ | Format HH:MM | `operating_hours.{day}.afternoon.start` |
| schedule.{day}.afternoon.end | time | ❌ | Format HH:MM | `operating_hours.{day}.afternoon.end` |
| operatingDays | array | Auto | [0-6] (0=Dimanche) | `operating_days` |

**Jours disponibles:** `monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`, `sunday`

---

### 2.3 TeamSetupStep.js

**Chemin:** `src/components/onboarding/steps/TeamSetupStep.js`

**Endpoint Backend:** `POST /api/v1/teams`

| Champ | Type | Requis | Validation | Variable Backend |
|-------|------|--------|------------|------------------|
| name | text | ✅ | Non vide | `name` |
| description | textarea | ❌ | - | `description` |
| department | select | ❌ | - | `department` |
| specialties | array | ❌ | - | `specialties` |

---

### 2.4 PractitionerSetupStep.js

**Chemin:** `src/components/onboarding/steps/PractitionerSetupStep.js`

**Endpoint Backend:** `POST /api/v1/healthcare-providers`

| Champ | Type | Requis | Validation | Variable Backend |
|-------|------|--------|------------|------------------|
| firstName | text | ✅ | Non vide | `first_name` |
| lastName | text | ✅ | Non vide | `last_name` |
| email | email | ✅ | Format email | `email` |
| profession | select | ✅ | Liste prédéfinie | `profession` |
| specialties | array | ❌ | - | `specialties` |
| rpps | text | ❌ | 11 chiffres | `rpps` |
| adeli | text | ❌ | 9 chiffres | `adeli` |

---

## 3. Gestion des Utilisateurs

### 3.1 UserFormModal.js

**Chemin:** `src/components/modals/UserFormModal.js`

**Endpoint Backend:**
- Création: `POST /api/v1/users`
- Modification: `PUT /api/v1/users/:id`

| Champ | Type | Requis | Validation | Variable Backend |
|-------|------|--------|------------|------------------|
| email | email | ✅ | Format email, unique | `email` |
| firstName | text | ✅ | Non vide | `firstName` |
| lastName | text | ✅ | Non vide | `lastName` |
| phone | tel | ❌ | Format international | `phone` |
| password | password | ✅* | Min 6 caractères (*création sans invitation) | `password` |
| sendInvitation | checkbox | ❌ | - | `sendInvitation` |
| role | select | ✅ | Rôle valide | `role` |
| administrativeRole | select | ❌ | direction, clinic_admin, hr, billing | `administrativeRole` |
| department | select | ❌ | Liste prédéfinie | `department` |
| speciality | select | ❌ | Dépend du département | `speciality` |
| licenseNumber | text | ❌ | - | `licenseNumber` |
| isActive | checkbox | ❌ | - | `isActive` |

**Rôles disponibles:**
- `super_admin` - Super administrateur (niveau 100)
- `admin` - Administrateur (niveau 90)
- `doctor` - Médecin (niveau 70)
- `nurse` - Infirmier (niveau 60)
- `secretary` - Secrétaire (niveau 50)
- `accountant` - Comptable (niveau 40)
- `readonly` - Lecture seule (niveau 10)

**Départements:**
`direction`, `administration`, `generalMedicine`, `cardiology`, `dermatology`, `gynecology`, `pediatrics`, `radiology`, `surgery`, `nursing`, `reception`, `pharmacy`, `laboratory`, `physiotherapy`, `audit`

**Hook utilisé:** `useFormErrors` pour gestion d'erreurs par champ

---

## 4. Gestion des Patients

### 4.1 PatientFormModal.js (Formulaire complet)

**Chemin:** `src/components/dashboard/modals/PatientFormModal.js`

**Endpoint Backend:**
- Création: `POST /api/v1/patients`
- Modification: `PUT /api/v1/patients/:id`

| Champ | Type | Requis | Validation | Variable Backend |
|-------|------|--------|------------|------------------|
| firstName | text | ✅ | Non vide | `first_name` |
| lastName | text | ✅ | Non vide | `last_name` |
| birthDate | date | ✅ | Date valide | `birth_date` |
| gender | select | ✅ | male, female, other | `gender` |
| idNumber | text | ❌ | - | `id_number` |
| socialSecurityNumber | text | ❌ | - | `social_security_number` |
| nationality | text | ❌ | - | `nationality` |
| address.street | text | ❌ | - | `address_line1` |
| address.city | text | ❌ | - | `city` |
| address.postalCode | text | ❌ | - | `postal_code` |
| address.country | text | ❌ | - | `country` |
| contact.phone | tel | ✅ | Format international | `phone` |
| contact.email | email | ❌ | Format email | `email` |
| contact.emergencyContact.name | text | ❌ | - | `emergency_contact_name` |
| contact.emergencyContact.phone | tel | ❌ | - | `emergency_contact_phone` |
| contact.emergencyContact.relationship | text | ❌ | - | `emergency_contact_relationship` |
| insurance.provider | text | ❌ | - | `insurance_provider` |
| insurance.number | text | ❌ | - | `insurance_number` |
| insurance.type | select | ❌ | - | `coverage_type` |
| status | select | ❌ | active, inactive | `is_active` (boolean) |

**Transformation dataTransform:**
- Frontend `contact.email` → Backend `email`
- Frontend `status: 'active'` → Backend `is_active: true`
- Frontend `allergies: []` → Backend `allergies: 'item1, item2'` (string)

---

### 4.2 QuickPatientModal.js (Création rapide)

**Chemin:** `src/components/modals/QuickPatientModal.js`

**Endpoint Backend:** `POST /api/v1/patients` (via PatientContext)

| Champ | Type | Requis | Validation | Variable Backend |
|-------|------|--------|------------|------------------|
| firstName | text | ✅ | Non vide | `first_name` |
| lastName | text | ✅ | Non vide | `last_name` |
| email | email | ❌ | Format email | `email` |
| phone | tel | ❌ | Format international | `phone` |

**Particularités:**
- Crée un patient avec `isIncomplete: true`
- Détection de doublons locale
- Pré-remplissage depuis la recherche

---

## 5. Rendez-vous

### 5.1 AppointmentFormModal.js

**Chemin:** `src/components/modals/AppointmentFormModal.js`

**Endpoints Backend:**
- Créneaux disponibles: `GET /api/v1/practitioner-availability/:providerId/slots`
- Création: `POST /api/v1/appointments`
- Modification: `PUT /api/v1/appointments/:id`
- Suppression: `DELETE /api/v1/appointments/:id`

| Champ | Type | Requis | Validation | Variable Backend |
|-------|------|--------|------------|------------------|
| patientId | select | ✅ | UUID valide | `patient_id` |
| practitionerId | select | ✅ | UUID valide | `provider_id` |
| type | select | ✅ | Type valide | `appointment_type` |
| title | text | ✅ | Non vide | `title` |
| description | textarea | ❌ | - | `description` |
| date | date | ✅ | Date future | `date` |
| startTime | select | ✅ | Créneau disponible | `start_time` |
| endTime | time | Auto | Calculé depuis durée | `end_time` |
| duration | number | Auto | Par défaut 30 min | `duration` |
| status | select | ❌ | scheduled, confirmed, cancelled | `status` |
| priority | select | ❌ | low, normal, high, urgent | `priority` |
| location | text | ❌ | - | `location` |
| notes | textarea | ❌ | - | `notes` |

**Types de rendez-vous:**
- `consultation` - Consultation (30 min)
- `followup` - Suivi (20 min)
- `emergency` - Urgence (45 min)
- `specialist` - Spécialiste (45 min)
- `checkup` - Bilan (60 min)
- `vaccination` - Vaccination (15 min)
- `surgery` - Chirurgie (120 min)

---

## 6. Dossiers Médicaux

### 6.1 MedicalRecordForm.js

**Chemin:** `src/components/medical/MedicalRecordForm.js`

**Endpoint Backend:**
- Création: `POST /api/v1/medical-records`
- Modification: `PUT /api/v1/medical-records/:id`

| Section | Champ | Type | Requis | Variable Backend |
|---------|-------|------|--------|------------------|
| Basic | patientId | select | ✅ | `patient_id` |
| Basic | recordType | select | ✅ | `record_type` |
| Basic | chiefComplaint | text | ❌ | `chief_complaint` |
| Basic | symptoms | array | ❌ | `symptoms` |
| Basic | duration | text | ❌ | `duration` |
| Vitals | weight | number | ❌ | `vital_signs.weight` |
| Vitals | height | number | ❌ | `vital_signs.height` |
| Vitals | bloodPressure | text | ❌ | `vital_signs.blood_pressure` |
| Vitals | heartRate | number | ❌ | `vital_signs.heart_rate` |
| Vitals | temperature | number | ❌ | `vital_signs.temperature` |
| Vitals | respiratoryRate | number | ❌ | `vital_signs.respiratory_rate` |
| Vitals | oxygenSaturation | number | ❌ | `vital_signs.oxygen_saturation` |
| Antecedents | personalHistory | array | ❌ | `antecedents.personal` |
| Antecedents | surgicalHistory | array | ❌ | `antecedents.surgical` |
| Antecedents | allergies | array | ❌ | `allergies` |
| Antecedents | smokingStatus | object | ❌ | `antecedents.smoking` |
| Antecedents | alcoholConsumption | object | ❌ | `antecedents.alcohol` |
| Diagnosis | primary | text | ❌ | `diagnosis.primary` |
| Diagnosis | secondary | array | ❌ | `diagnosis.secondary` |
| Diagnosis | icd10 | array | ❌ | `diagnosis.icd10` |
| Treatment | treatments | array | ❌ | `treatments` |
| Treatment | treatmentPlan | object | ❌ | `treatment_plan` |
| Notes | notes | textarea | ❌ | `notes` |
| Notes | privateNotes | textarea | ❌ | `private_notes` |

---

## 7. Consentements

### 7.1 ConsentFormModal.js

**Chemin:** `src/components/modals/ConsentFormModal.js`

**Endpoint Backend:**
- Création: `POST /api/v1/consents`
- Modification: `PUT /api/v1/consents/:id`

| Champ | Type | Requis | Validation | Variable Backend |
|-------|------|--------|------------|------------------|
| patientId | select | ✅ | UUID valide | `patient_id` |
| type | select | ✅ | Type valide | `consent_type` |
| title | text | ✅ | Non vide | `title` |
| description | textarea | ✅ | Non vide | `description` |
| terms | textarea | ❌ | - | `terms` |
| collectionMethod | select | ✅ | digital, verbal, paper | `signature_method` |
| witnessName | text | ✅* | *Si verbal | N/A (frontend) |
| witnessRole | text | ✅* | *Si verbal | N/A (frontend) |
| expiresAt | date | ❌ | Date future | `valid_until` |
| status | select | ❌ | granted, revoked | `status` (accepted/rejected) |
| consentTemplateId | select | ❌ | UUID valide | `consent_template_id` |

**Types de consentement:**
- `medical_treatment` - Traitement médical
- `data_sharing` - Partage de données
- `research` - Recherche
- `marketing` - Marketing
- `gdpr_processing` - Traitement RGPD
- `photography` - Photographie

**Transformation status:**
- Frontend `granted` → Backend `accepted`
- Frontend `revoked` → Backend `rejected`

---

### 7.2 ConsentTemplateEditorModal.js

**Chemin:** `src/components/modals/ConsentTemplateEditorModal.js`

**Endpoint Backend:**
- Création: `POST /api/v1/consent-templates`
- Modification: `PUT /api/v1/consent-templates/:id`

| Champ | Type | Requis | Validation | Variable Backend |
|-------|------|--------|------------|------------------|
| title | text | ✅ | Non vide | `title` |
| description | textarea | ❌ | - | `description` |
| consentType | select | ✅ | Type valide | `consentType` |
| content | richtext | ✅ | Non vide | `terms` |
| version | text | ❌ | Format x.y | `version` |
| isMandatory | checkbox | ❌ | - | `isMandatory` |
| autoSend | checkbox | ❌ | - | `autoSend` |
| validFrom | date | ❌ | - | `validFrom` |
| validUntil | date | ❌ | - | `validUntil` |

**Variables dynamiques détectées:**
Syntax: `[variable_name]` dans le contenu
Exemples: `[patient_name]`, `[date]`, `[procedure]`

---

### 7.3 SendConsentRequestModal.js

**Chemin:** `src/components/modals/SendConsentRequestModal.js`

**Endpoint Backend:** `POST /api/v1/consent-signing`

| Champ | Type | Requis | Validation | Variable Backend |
|-------|------|--------|------------|------------------|
| patientId | hidden | ✅ | UUID | `patientId` |
| consentTemplateId | select | ✅ | UUID | `consentTemplateId` |
| sentVia | select | ✅ | email, sms, tablet, link | `sentVia` |
| recipientEmail | email | ❌* | *Si email | `recipientEmail` |
| recipientPhone | tel | ❌* | *Si sms | `recipientPhone` |
| languageCode | select | ❌ | fr, en, es | `languageCode` |
| customMessage | textarea | ❌ | - | `customMessage` |
| expiresInHours | number | ❌ | Default 48 | `expiresInHours` |

---

## 8. Configuration Clinique

### 8.1 ClinicConfigModal.js

**Chemin:** `src/components/admin/ClinicConfigModal.js`

**Endpoint Backend:** `PUT /api/v1/clinic-settings`

| Section | Champ | Type | Variable Backend |
|---------|-------|------|------------------|
| Horaires | operating_days | array[0-6] | `operating_days` |
| Horaires | operating_hours.{day} | object | `operating_hours` |
| Fermetures | closed_dates | array | `closed_dates` |
| Créneaux | slot_settings.defaultDuration | number | `slot_settings.defaultDuration` |
| Créneaux | slot_settings.bufferTime | number | `slot_settings.bufferTime` |
| Créneaux | slot_settings.maxAdvanceBooking | number | `slot_settings.maxAdvanceBooking` |
| Notifications | notifications.appointment_reminder | boolean | `notifications` |

---

### 8.2 SettingsModule.js (Profil)

**Chemin:** `src/components/dashboard/modules/SettingsModule.js`

**Endpoints Backend:**
- Profil: `PUT /api/v1/profile`
- Établissement: `PUT /api/v1/facilities/current`
- Mot de passe: `PUT /api/v1/auth/change-password`

| Tab | Champ | Variable Backend |
|-----|-------|------------------|
| Profil | firstName | `first_name` |
| Profil | lastName | `last_name` |
| Profil | email | `email` |
| Sécurité | currentPassword | `currentPassword` |
| Sécurité | newPassword | `newPassword` |
| Entreprise | name | `name` |
| Entreprise | phone | `phone` |
| Entreprise | address | `address_line1` |

---

## 9. Équipes et Délégations

### 9.1 TeamFormModal.js

**Chemin:** `src/components/modals/TeamFormModal.js`

**Endpoint Backend:**
- Création: `POST /api/v1/teams`
- Modification: `PUT /api/v1/teams/:id`

| Champ | Type | Requis | Variable Backend |
|-------|------|--------|------------------|
| name | text | ✅ | `name` |
| description | textarea | ❌ | `description` |
| department | select | ❌ | `department` |
| specialties | array | ❌ | `specialties` |
| isActive | checkbox | ❌ | `is_active` |

---

### 9.2 DelegationFormModal.js

**Chemin:** `src/components/modals/DelegationFormModal.js`

**Endpoint Backend:** Local storage (pas d'API)

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| fromUser | select | ✅ | Utilisateur délégant |
| toUser | select | ✅ | Utilisateur recevant |
| permissions | array | ✅ | Permissions déléguées |
| reason | text | ❌ | Motif |
| startDate | date | ✅ | Date début |
| endDate | date | ✅ | Date fin |

---

## 10. Facturation

### 10.1 QuoteFormModal.js

**Chemin:** `src/components/dashboard/modals/QuoteFormModal.js`

**Endpoint Backend:** Local storage / API quotes

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| patientId | select | ✅ | Patient |
| items | array | ✅ | Lignes de devis |
| items[].description | text | ✅ | Description |
| items[].quantity | number | ✅ | Quantité |
| items[].unitPrice | number | ✅ | Prix unitaire |
| items[].discount | number | ❌ | Remise % |
| dueDate | date | ❌ | Date validité |
| notes | textarea | ❌ | Notes |

---

## Annexes

### A. Hooks de gestion d'erreurs

```javascript
// src/hooks/useFormErrors.js
const {
  errors,           // { fieldName: errorMessage }
  generalError,     // { message, details, type }
  setFieldError,    // (fieldName, errorMessage) => void
  clearFieldError,  // (fieldName) => void
  clearErrors,      // () => void
  handleBackendError, // (error) => parsedError
  getFieldError,    // (fieldName) => errorMessage | null
  hasErrors         // () => boolean
} = useFormErrors();
```

### B. Composants de champs réutilisables

```javascript
// src/components/common/FormField.js
import { TextField, SelectField, TextAreaField, CheckboxField, RadioGroupField } from './FormField';

<TextField
  label="Email"
  name="email"
  value={formData.email}
  onChange={handleChange}
  error={errors.email}
  required
  type="email"
/>
```

### C. Transformation de données (dataTransform.js)

| Frontend | Backend |
|----------|---------|
| `firstName` | `first_name` |
| `lastName` | `last_name` |
| `birthDate` | `birth_date` |
| `isActive` | `is_active` |
| `patientId` | `patient_id` |
| `providerId` | `provider_id` |
| `consentType` | `consent_type` |
| `signedAt` | `signed_at` |

### D. Validation téléphone (PhoneInput)

Le composant `PhoneInput` gère automatiquement:
- Détection du pays depuis le préfixe
- Formatage selon le pays
- Validation de longueur
- Callback `onValidationChange(isValid)`

---

*Document généré le: 2026-01-18*
*Version: 1.0*
