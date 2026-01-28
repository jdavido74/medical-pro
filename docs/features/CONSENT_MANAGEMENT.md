# Gestion des Consentements

## Vue d'ensemble

Le module de gestion des consentements permet de gérer les consentements RGPD et médicaux des patients. Il supporte :
- La création et gestion de modèles de consentements multilingues
- L'envoi de demandes de signature électronique
- Le suivi du cycle de vie des consentements
- La conformité RGPD avec audit trail complet

---

## Architecture

### Frontend
- **Module consentements** : `src/components/dashboard/modules/ConsentManagementModule.js`
  - Composant `ConfirmDeleteModal` - Modale de suppression de consentement
  - Composant `ConsentDetailsModal` - Détails d'un consentement
- **Module modèles** : `src/components/dashboard/modules/ConsentTemplatesModule.js`
  - Composant `ConfirmDeleteTemplateModal` - Modale de suppression de modèle
  - Composant `TemplateDetailsModal` - Détails d'un modèle
- **Contexte** : `src/contexts/ConsentContext.js`
- **API clients** :
  - `src/api/consentsApi.js` - Consentements signés
  - `src/api/consentSigningApi.js` - Demandes de signature
  - `src/api/consentTemplatesApi.js` - Modèles de consentements

### Backend
- **Routes** :
  - `/api/consents` - CRUD consentements
  - `/api/consent-signing` - Demandes de signature
  - `/api/consent-templates` - Modèles
- **Services** :
  - `emailService.js` - Envoi des demandes de signature par email

---

## Types de consentements

| Type | Description |
|------|-------------|
| `medical_treatment` | Traitement médical général |
| `surgery` | Chirurgie / interventions |
| `anesthesia` | Anesthésie |
| `diagnostic` | Examens et diagnostics |
| `telehealth` | Télémédecine |
| `clinical_trial` | Essai clinique / recherche |
| `minor_treatment` | Traitement de mineur |
| `data_processing` | RGPD / Protection des données |
| `photo` | Droit à l'image |
| `communication` | Communication commerciale |
| `dental` | Soins dentaires |
| `mental_health` | Santé mentale |
| `prevention` | Prévention / vaccinations |

---

## Cycle de vie des consentements

### Statuts

```
┌─────────────────┐
│ pending_signature│ ← Demande envoyée, en attente de signature
└────────┬────────┘
         │ Patient signe
         ▼
┌─────────────────┐
│    signed       │ ← Consentement signé/accepté
│   (accepted)    │
│   (granted)     │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌─────────┐
│expired│ │ revoked │ ← Révoqué par patient/praticien
└───────┘ └─────────┘
```

### Correspondance des statuts

| Statut Frontend | Statut Backend | Description |
|-----------------|----------------|-------------|
| `pending_signature` | `pending` | En attente de signature |
| `signed` / `accepted` / `granted` | `accepted` | Signé et valide |
| `revoked` | `revoked` / `rejected` | Révoqué |
| `expired` | - | Date d'expiration dépassée |

---

## Règles de gestion

### Suppression des consentements

Une modale de confirmation personnalisée s'affiche selon le statut du consentement :

| Statut | Comportement | Modale de confirmation |
|--------|--------------|------------------------|
| **En attente de signature** | Confirmation requise | Modale avec informations patient/consentement |
| **Signé / Accepté** | Confirmation requise avec avertissement | Modale avec avertissement d'irréversibilité |
| **Révoqué** | Suppression directe | Aucune confirmation |
| **Expiré** | Suppression directe | Aucune confirmation |
| **Annulé** | Suppression directe | Aucune confirmation |

#### Modale de suppression de consentement

La modale `ConfirmDeleteModal` affiche :
- **Header rouge** avec icône d'avertissement
- **Icône de corbeille** centrale
- **Message adapté** selon le statut (en attente / signé)
- **Informations du consentement** : patient, titre, statut
- **Avertissement d'irréversibilité** pour les consentements signés
- **Boutons** : Annuler / Supprimer (avec état de chargement)

```
┌─────────────────────────────────────┐
│ ⚠️ Confirmer la suppression        │  ← Header rouge
├─────────────────────────────────────┤
│                                     │
│            🗑️                       │  ← Icône centrale
│                                     │
│   Supprimer un consentement signé ? │
│   Ce consentement a été signé...    │
│                                     │
│   ┌─────────────────────────────┐   │
│   │ Patient: Jean Dupont        │   │  ← Infos consentement
│   │ Consentement: Traitement    │   │
│   │ Statut: Signé               │   │
│   └─────────────────────────────┘   │
│                                     │
│   ⚠️ Attention : Cette action est  │  ← Avertissement (si signé)
│   irréversible...                   │
│                                     │
├─────────────────────────────────────┤
│              [Annuler] [Supprimer]  │  ← Actions
└─────────────────────────────────────┘
```

### Suppression des modèles de consentements

Une modale de confirmation s'affiche systématiquement pour les modèles :

| Statut du modèle | Comportement |
|------------------|--------------|
| **Actif** | Avertissement si utilisé pour des consentements existants |
| **Brouillon** | Confirmation simple |
| **Inactif** | Confirmation simple |

#### Modale de suppression de modèle

La modale `ConfirmDeleteTemplateModal` affiche :
- **Informations du modèle** : nom, catégorie, statut, nombre d'utilisations
- **Avertissement spécial** pour les modèles actifs ayant été utilisés

```
┌─────────────────────────────────────┐
│ 🗑️ Supprimer le modèle             │
├─────────────────────────────────────┤
│                                     │
│   Supprimer un modèle actif ?       │
│                                     │
│   ┌─────────────────────────────┐   │
│   │ Modèle: Consentement RGPD   │   │
│   │ Catégorie: Données          │   │
│   │ Statut: Actif               │   │
│   │ Utilisations: 15 fois       │   │
│   └─────────────────────────────┘   │
│                                     │
│   ⚠️ Ce modèle a été utilisé 15    │  ← Si utilisé
│   fois. Les consentements existants │
│   ne seront pas affectés...         │
│                                     │
├─────────────────────────────────────┤
│              [Annuler] [Supprimer]  │
└─────────────────────────────────────┘
```

### Gestion des IDs combinés

Le module combine deux sources de données :
1. **Consentements signés** (`consents` table) - ID standard UUID
2. **Demandes de signature** (`consent_signing_requests` table) - ID préfixé `signing-{uuid}`

Lors de la suppression :
- Si l'ID commence par `signing-` → Appel à `consentSigningApi.deleteRequest()`
- Sinon → Appel à `deleteConsent()` du contexte

```javascript
// Exemple de logique de suppression
if (consentId.startsWith('signing-')) {
  const signingRequestId = consentId.replace('signing-', '');
  await consentSigningApi.deleteRequest(signingRequestId);
} else {
  await deleteConsent(consentId);
}
```

---

## Demandes de signature

### Création d'une demande

```javascript
const request = await consentSigningApi.createRequest({
  patientId: 'uuid',
  consentTemplateId: 'uuid',
  appointmentId: 'uuid', // optionnel
  sentVia: 'email', // 'email' | 'sms' | 'tablet' | 'link'
  recipientEmail: 'patient@email.com',
  languageCode: 'fr', // 'fr' | 'en' | 'es'
  customMessage: 'Message personnalisé',
  expiresInHours: 48 // 1 à 168 heures
});
```

### Expiration

- Par défaut : 48 heures
- Minimum : 1 heure
- Maximum : 168 heures (7 jours)

### Rappels

Les rappels peuvent être envoyés pour les demandes en statut `pending` via :
```javascript
await consentSigningApi.sendReminder(requestId);
```

---

## Modèles de consentements

### Structure

```javascript
{
  id: 'uuid',
  title: 'Titre du consentement',
  description: 'Description',
  terms: 'Termes et conditions...',
  consentType: 'medical_treatment',
  category: 'medical',
  specialty: 'general',
  defaultLanguage: 'fr',
  version: '1.0',
  isActive: true,
  variables: ['patientName', 'procedureDate', 'doctorName'],
  translations: {
    en: { title: '...', description: '...', terms: '...' },
    es: { title: '...', description: '...', terms: '...' }
  }
}
```

### Variables disponibles

Les modèles supportent des variables qui sont remplacées lors de la génération :

| Variable | Description |
|----------|-------------|
| `{{patientName}}` | Nom complet du patient |
| `{{patientFirstName}}` | Prénom du patient |
| `{{patientLastName}}` | Nom de famille du patient |
| `{{procedureDate}}` | Date de la procédure |
| `{{doctorName}}` | Nom du praticien |
| `{{clinicName}}` | Nom de la clinique |

---

## Audit Trail (RGPD)

Chaque consentement maintient un historique complet des actions :

```javascript
{
  auditTrail: [
    {
      action: 'created',
      timestamp: '2024-01-15T10:30:00Z',
      userId: 'uuid',
      details: { method: 'email' }
    },
    {
      action: 'signed',
      timestamp: '2024-01-15T14:22:00Z',
      userId: 'patient-uuid',
      details: {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        signatureMethod: 'digital'
      }
    }
  ]
}
```

### Actions enregistrées

- `created` - Création du consentement
- `sent` - Envoi de la demande de signature
- `viewed` - Consultation par le patient
- `signed` - Signature électronique
- `revoked` - Révocation
- `expired` - Expiration automatique
- `reminder_sent` - Envoi d'un rappel

---

## Permissions

| Permission | Description |
|------------|-------------|
| `consents.view` | Voir les consentements |
| `consents.create` | Créer des consentements |
| `consents.edit` | Modifier des consentements |
| `consents.delete` | Supprimer des consentements |
| `consents.assign` | Assigner/envoyer des demandes de signature |
| `consents.revoke` | Révoquer des consentements |

---

## Intégration avec les rendez-vous

Les consentements peuvent être liés à des rendez-vous via `appointmentId`. Cela permet :
- D'envoyer automatiquement les consentements requis lors de la confirmation d'un RDV
- De vérifier que tous les consentements sont signés avant le RDV
- D'afficher le statut des consentements dans le planning

### Association Traitement ↔ Consentement

La table `treatment_consent_templates` permet d'associer des modèles de consentements à des traitements spécifiques. Lors de la création d'un RDV avec un traitement associé, les consentements requis sont automatiquement identifiés.

---

## API Endpoints

### Consentements

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/consents` | Liste des consentements |
| POST | `/api/consents` | Créer un consentement |
| GET | `/api/consents/:id` | Détails d'un consentement |
| PATCH | `/api/consents/:id` | Modifier un consentement |
| DELETE | `/api/consents/:id` | Supprimer un consentement |
| PATCH | `/api/consents/:id/sign` | Signer électroniquement |
| GET | `/api/consents/patient/:patientId` | Consentements d'un patient |

### Demandes de signature

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/consent-signing` | Liste des demandes |
| POST | `/api/consent-signing` | Créer une demande |
| GET | `/api/consent-signing/:id` | Détails d'une demande |
| DELETE | `/api/consent-signing/:id` | Supprimer une demande |
| PATCH | `/api/consent-signing/:id/cancel` | Annuler une demande |
| POST | `/api/consent-signing/:id/remind` | Envoyer un rappel |

### Modèles

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/consent-templates` | Liste des modèles |
| POST | `/api/consent-templates` | Créer un modèle |
| GET | `/api/consent-templates/:id` | Détails d'un modèle |
| PATCH | `/api/consent-templates/:id` | Modifier un modèle |
| DELETE | `/api/consent-templates/:id` | Supprimer un modèle |

---

## Traductions

Les fichiers de traduction se trouvent dans :
- `src/locales/fr/consents.json`
- `src/locales/en/consents.json`
- `src/locales/es/consents.json`

---

## Changelog

| Date | Version | Description |
|------|---------|-------------|
| 2026-01-28 | 1.3 | Ajout modale de suppression personnalisée pour les modèles |
| 2026-01-28 | 1.2 | Remplacement alert() par modale personnalisée pour consentements |
| 2026-01-28 | 1.1 | Ajout confirmation conditionnelle à la suppression |
| 2026-01-28 | 1.0 | Documentation initiale |
