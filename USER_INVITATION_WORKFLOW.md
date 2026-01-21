# Workflow d'Invitation d'Utilisateur

**Date**: 2024-12-08
**Fonctionnalité**: Création d'utilisateur avec invitation par email

---

## Vue d'ensemble

Le système permet maintenant deux modes de création d'utilisateur:

1. **Mode Invitation** (Recommandé): L'administrateur crée un utilisateur sans mot de passe. L'utilisateur reçoit un email pour définir son propre mot de passe.
2. **Mode Mot de Passe Direct**: L'administrateur crée un utilisateur avec un mot de passe. L'utilisateur peut se connecter immédiatement.

---

## Workflow Mode Invitation (Nouveau)

### 1. L'Administrateur Crée l'Utilisateur

**Interface**: Configuration > Users > Créer un utilisateur

**Champs requis**:
- Email ✉️
- Prénom
- Nom
- Rôle
- ☑️ **"Envoyer une invitation par email"** (coché par défaut)

**Résultat**:
- ✅ Utilisateur créé avec `account_status = 'pending'`
- ✅ Token d'invitation généré (valide 7 jours)
- ✅ Email d'invitation envoyé (TODO: à implémenter)
- ✅ Lien d'invitation affiché dans la console (temporaire pour debug)

### 2. L'Utilisateur Reçoit l'Email

**Email contient**:
- Lien d'invitation: `http://localhost:3000/set-password?token=xxx`
- Instructions pour définir le mot de passe
- Durée de validité: 7 jours

### 3. L'Utilisateur Définit son Mot de Passe

**Page**: `/set-password?token=xxx` (à créer)

**Actions**:
- Valider le token
- Demander le nouveau mot de passe (minimum 6 caractères)
- Confirmer le mot de passe
- Enregistrer et activer le compte

**Résultat**:
- ✅ `account_status` passe de `'pending'` à `'active'`
- ✅ `password_hash` défini
- ✅ `email_verified` = `true`
- ✅ `invitation_token` et `invitation_expires_at` effacés
- ✅ Utilisateur peut se connecter

---

## Workflow Mode Mot de Passe Direct

### 1. L'Administrateur Crée l'Utilisateur

**Interface**: Configuration > Users > Créer un utilisateur

**Champs requis**:
- Email ✉️
- Prénom
- Nom
- Rôle
- ☐ **Décocher "Envoyer une invitation par email"**
- **Mot de passe** (nouveau champ visible)

**Résultat**:
- ✅ Utilisateur créé avec `account_status = 'active'`
- ✅ Mot de passe défini
- ✅ Utilisateur peut se connecter immédiatement

---

## Statuts de Compte

| Statut | Description | Actions possibles |
|--------|-------------|-------------------|
| `pending` | En attente d'activation par l'utilisateur | Renvoyer invitation, Définir mot de passe manuellement |
| `active` | Compte actif, peut se connecter | Désactiver, Suspendre |
| `suspended` | Compte suspendu temporairement | Réactiver |
| `locked` | Compte verrouillé (trop de tentatives) | Déverrouiller |

---

## Changements Backend

### 1. Migration `014_add_invitation_fields.sql`

```sql
-- Nouvelles colonnes
ALTER TABLE healthcare_providers
ADD COLUMN account_status VARCHAR(50) DEFAULT 'active'
  CHECK (account_status IN ('pending', 'active', 'suspended', 'locked'));

ADD COLUMN invitation_token VARCHAR(255);
ADD COLUMN invitation_expires_at TIMESTAMP;

-- password_hash devient nullable
ALTER COLUMN password_hash DROP NOT NULL;
```

### 2. Schema de Validation

**Fichier**: `src/base/clinicConfigSchemas.js`

```javascript
// password_hash est maintenant OPTIONNEL
password_hash: Joi.string().min(6).optional(),

// Nouveau champ
send_invitation: Joi.boolean().default(false),

// Nouveau statut
account_status: Joi.string()
  .valid('pending', 'active', 'suspended', 'locked')
  .default('active')
```

### 3. Route POST `/api/v1/healthcare-providers`

**Fichier**: `src/routes/healthcareProviders.js`

**Logique**:
```javascript
if (value.send_invitation) {
  // Mode invitation
  invitationToken = crypto.randomBytes(32).toString('hex');
  invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  accountStatus = 'pending';
  hashedPassword = null;
} else {
  // Mode mot de passe direct
  if (!value.password_hash) {
    return error('Mot de passe obligatoire');
  }
  hashedPassword = await bcrypt.hash(value.password_hash, 10);
  accountStatus = 'active';
}
```

---

## Changements Frontend

### 1. UserFormModal

**Fichier**: `src/components/modals/UserFormModal.js`

**Nouveaux champs dans formData**:
```javascript
{
  password: '',
  sendInvitation: true,  // Par défaut
  accountStatus: 'active'
}
```

**Nouvelle UI**:
```jsx
{!user && (
  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
    <CheckboxField
      label="Envoyer une invitation par email"
      name="sendInvitation"
      checked={formData.sendInvitation}
    />

    {!formData.sendInvitation && (
      <TextField
        label="Mot de passe"
        type="password"
        required
      />
    )}
  </div>
)}
```

**Validation**:
- Si `sendInvitation=true`: mot de passe non requis
- Si `sendInvitation=false`: mot de passe requis (min 6 caractères)

---

## À Implémenter (TODO)

### 1. Route de Validation du Token ⏳

**Endpoint**: `POST /api/v1/auth/set-password`

**Body**:
```json
{
  "token": "xxx",
  "password": "NewPassword123!"
}
```

**Logique**:
1. Vérifier que le token existe
2. Vérifier que le token n'est pas expiré
3. Hasher le nouveau mot de passe
4. Mettre à jour l'utilisateur:
   - `password_hash` = nouveau hash
   - `account_status` = 'active'
   - `email_verified` = true
   - `invitation_token` = NULL
   - `invitation_expires_at` = NULL
5. Retourner un JWT pour connexion automatique

### 2. Page Frontend `/set-password` ⏳

**Composant**: `src/components/auth/SetPasswordPage.js`

**UI**:
- Lire le token depuis l'URL
- Formulaire avec:
  - Nouveau mot de passe
  - Confirmer mot de passe
  - Bouton "Définir mon mot de passe"
- Gestion des erreurs:
  - Token invalide
  - Token expiré
  - Mots de passe ne correspondent pas

### 3. Template d'Email d'Invitation ⏳

**Fichier**: `src/services/email/templates/invitation.js`

**Contenu**:
- Titre: "Bienvenue sur MedicalPro"
- Message: "Vous avez été invité à rejoindre..."
- Lien d'invitation (gros bouton)
- Expiration: "Ce lien expire dans 7 jours"
- Support multi-langues (FR/ES)

### 4. Envoi de l'Email ⏳

**Service**: `src/services/email/invitationService.js`

**Intégration avec le système d'email existant**

### 5. Gestion Admin des Invitations Expirées ⏳

**Interface**: Configuration > Users

**Fonctionnalités**:
- Badge "En attente" pour les comptes pending
- Bouton "Renvoyer l'invitation"
- Afficher la date d'expiration
- Possibilité de définir un mot de passe manuellement

---

## Tests à Effectuer

### Test 1: Création avec Invitation ✅

1. Ouvrir Configuration > Users
2. Cliquer "Créer un utilisateur"
3. Remplir email, prénom, nom, rôle
4. Vérifier que "Envoyer invitation" est coché
5. Soumettre
6. Vérifier dans la console le lien d'invitation

**Résultat attendu**:
```json
{
  "success": true,
  "data": {
    "id": "xxx",
    "email": "user@example.com",
    "account_status": "pending",
    "invitation_link": "http://localhost:3000/set-password?token=xxx"
  }
}
```

### Test 2: Création avec Mot de Passe Direct

1. Ouvrir Configuration > Users
2. Cliquer "Créer un utilisateur"
3. Remplir email, prénom, nom, rôle
4. **Décocher** "Envoyer invitation"
5. Entrer un mot de passe (min 6 caractères)
6. Soumettre

**Résultat attendu**:
```json
{
  "success": true,
  "data": {
    "id": "xxx",
    "email": "user@example.com",
    "account_status": "active"
  }
}
```

### Test 3: Validation - Mot de Passe Obligatoire

1. Ouvrir Configuration > Users
2. Cliquer "Créer un utilisateur"
3. Décocher "Envoyer invitation"
4. Ne pas entrer de mot de passe
5. Soumettre

**Résultat attendu**: Erreur "Mot de passe requis (minimum 6 caractères)"

---

## Sécurité

### Token d'Invitation

- **Format**: 64 caractères hexadécimaux (crypto-secure)
- **Durée**: 7 jours
- **Usage unique**: Token supprimé après utilisation
- **Stockage**: Hashé dans la base de données (optionnel pour v2)

### Mot de Passe

- **Hash**: bcrypt avec salt (10 rounds)
- **Minimum**: 6 caractères
- **Validation**: Frontend + Backend

---

## Avantages du Workflow d'Invitation

1. **Sécurité** ✅
   - L'admin ne connaît pas le mot de passe de l'utilisateur
   - Pas de transmission de mot de passe par email/téléphone
   - Token avec expiration

2. **UX améliorée** ✅
   - L'utilisateur choisit son propre mot de passe
   - Lien cliquable dans l'email
   - Confirmation de compte automatique

3. **Conformité RGPD** ✅
   - Pas de stockage temporaire de mot de passe en clair
   - Traçabilité de l'invitation
   - Consentement implicite

4. **Flexibilité** ✅
   - Possibilité de renvoyer une invitation
   - Admin peut toujours définir un mot de passe directement si nécessaire
   - Gestion des invitations expirées

---

## Conclusion

Le workflow d'invitation est maintenant **partiellement implémenté**:

✅ **Backend**: Schéma, migration, route de création
✅ **Frontend**: UI, validation, toggle invitation/mot de passe
⏳ **TODO**: Route de validation du token, page set-password, template email

**Prêt pour test**: Création d'utilisateur avec les deux modes (invitation simulée pour le moment)
