# Email Verification Guide - Medical Pro

## Overview
After a user creates an account on Medical Pro, they receive a confirmation email they must verify to activate their account.

## What We've Implemented

### Frontend Changes
1. **EmailVerificationPage.js** - New page showing:
   - Email address requiring verification
   - Instructions on how to verify
   - Resend email button (with i18n translations)
   - Development testing information

2. **Translation Files** - Added `emailVerification` namespace with 16 translation keys in 3 languages:
   - **English** (`src/locales/en/auth.json`)
   - **French** (`src/locales/fr/auth.json`)
   - **Spanish** (`src/locales/es/auth.json`)

3. **App.js** - Updated routing:
   - Imports `EmailVerificationPage`
   - Adds `pendingEmail` state
   - Routes to email verification page after signup

4. **SignupPage.js** - Updated flow:
   - After successful registration → redirects to email verification page
   - Passes email to `EmailVerificationPage`

### User Flow
```
User Registration Form
        ↓
    Create Account (API call)
        ↓
    Email Verification Page ← User sees this
        ↓
    User clicks link in email
        ↓
    Account Activated
        ↓
    Login Page
```

## How to Test Email Verification

### Option 1: Check Backend Logs (Development)
The registration API already generates a verification token. To see the verification email details:

```bash
# Terminal 1: Watch backend logs
tail -f /tmp/backend.log

# Terminal 2: Create account via frontend or API
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "password": "TestPassword123",
    "companyName": "Test Clinic",
    "companyEmail": "clinic@test.com",
    "country": "FR",
    "acceptTerms": true
  }'
```

In the response, you'll see:
```json
{
  "email_verification_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "nextStep": {
    "action": "VERIFY_EMAIL",
    "instructions": "A verification link has been sent to...",
    "expiresIn": "24 hours"
  }
}
```

### Option 2: Use Mailhog (Recommended for Development)

#### Setup Mailhog
```bash
# Install Mailhog
go get github.com/mailhog/MailHog

# Run Mailhog (listens on ports 1025 for SMTP, 8025 for web UI)
MailHog

# Web UI will be available at: http://localhost:8025
```

#### Configure Backend to Use Mailhog
Update your `.env` file:
```env
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@medicalpro.local
```

#### View Emails in Mailhog
1. Open http://localhost:8025
2. Register a new account
3. Email appears in Mailhog UI
4. Click email to see verification link like:
   ```
   http://localhost:3000/verify-email?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### Option 3: Extract Token from Backend Response
1. Copy the `email_verification_token` from the registration API response
2. Verify the email with a backend API call:
```bash
curl -X POST http://localhost:3001/api/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

## Translations Available

### Email Verification Page Messages
All messages are fully translated in EN, FR, ES:

| Key | Purpose |
|-----|---------|
| `emailVerification.title` | Page heading |
| `emailVerification.subtitle` | Email sent confirmation |
| `emailVerification.checkEmail` | Instructions prompt |
| `emailVerification.instructions` | Full verification instructions |
| `emailVerification.resend` | Resend email prompt |
| `emailVerification.resendLink` | Resend button text |
| `emailVerification.success` | Success message |
| `emailVerification.successMessage` | Success description |
| `emailVerification.error` | Error title |
| `emailVerification.errorMessage` | Error description |
| `emailVerification.expiredLink` | Expired token message |
| `emailVerification.expiredMessage` | Expired token description |
| `emailVerification.requestNewLink` | Request new email button |
| `emailVerification.goToLogin` | Login button text |
| `emailVerification.emailSent` | Resend confirmation |
| `emailVerification.errorSending` | Resend error |

## Backend API Endpoints Needed

### 1. Register (Already Implemented ✅)
```bash
POST /api/v1/auth/register
```
Response includes `email_verification_token`

### 2. Verify Email (To Implement)
```bash
POST /api/v1/auth/verify-email
Body: { "token": "JWT_TOKEN" }
Response: { "success": true, "message": "Email verified" }
```

### 3. Resend Verification Email (To Implement)
```bash
POST /api/v1/auth/resend-verification-email
Body: { "email": "user@example.com" }
Response: { "success": true, "message": "Email sent" }
```

## Next Steps to Complete

1. **Create API Endpoint** `/api/v1/auth/verify-email`
   - Accept token as parameter
   - Decode JWT token to get userId and email
   - Update user `email_verified` field to true
   - Return success message

2. **Create API Endpoint** `/api/v1/auth/resend-verification-email`
   - Accept email as parameter
   - Generate new verification token
   - Resend email with new link
   - Return success message

3. **Create Email Verification Callback Page** (Optional Enhancement)
   - Create `EmailVerificationCallback.js` component
   - Handle token from URL query param
   - Call verify-email API
   - Show success/error message
   - Redirect to login after 3 seconds

## Email Content Template

The email sent to users should contain:

```
Subject: Verify Your Medical Pro Account

Hello [FirstName] [LastName],

Welcome to Medical Pro!

To activate your account and start managing your medical practice,
please verify your email address by clicking the link below:

[Verification Link]

This link will expire in 24 hours.

If you didn't create this account, please ignore this email.

---
Medical Pro Team
```

## Translation Example

**French (Français)**
```json
"emailVerification": {
  "title": "Vérifiez votre adresse email",
  "subtitle": "Nous avons envoyé un email de confirmation à",
  "checkEmail": "Veuillez consulter votre email",
  "instructions": "Cliquez sur le lien de vérification dans l'email que nous vous avons envoyé pour activer votre compte."
}
```

**Spanish (Español)**
```json
"emailVerification": {
  "title": "Verifica tu dirección de correo",
  "subtitle": "Hemos enviado un correo de confirmación a",
  "checkEmail": "Por favor, revisa tu correo electrónico",
  "instructions": "Haz clic en el enlace de verificación en el correo que te enviamos para activar tu cuenta."
}
```

## Testing Checklist

- [ ] User registers → Sees email verification page
- [ ] Email verification page displays correct email
- [ ] Resend email button works (with translations)
- [ ] Success/error messages display (with translations)
- [ ] Mobile responsive design
- [ ] All 3 languages show correctly (EN, FR, ES)
- [ ] User can go back to login
- [ ] Verification token expires after 24 hours
- [ ] Only one verification email at a time

## Architecture Diagram

```
┌─────────────────────────────────────────┐
│  Frontend (React)                       │
├─────────────────────────────────────────┤
│  SignupPage.js                          │
│        ↓ (on success)                   │
│  EmailVerificationPage.js               │
│  - Shows email                          │
│  - Resend button                        │
│  - i18n translations (EN/FR/ES)         │
└─────────────────────────────────────────┘
              ↑      ↓
        (API calls)
              │
┌─────────────────────────────────────────┐
│  Backend (Node.js/Express)              │
├─────────────────────────────────────────┤
│  POST /api/v1/auth/register             │
│  POST /api/v1/auth/verify-email         │
│  POST /api/v1/auth/resend-verification  │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Database                               │
├─────────────────────────────────────────┤
│  users.email_verified (boolean)         │
│  users.email_verification_token (JWT)   │
│  users.email_verified_at (timestamp)    │
└─────────────────────────────────────────┘
```

## Security Notes

- ✅ Tokens are JWTs with 24-hour expiration
- ✅ Tokens are signed with HMAC256
- ✅ Tokens include userId, email, and type
- ✅ Resend limits can be implemented (optional)
- ✅ Email domain validation recommended
- ✅ Rate limiting on verify endpoint recommended

---
**Last Updated**: November 10, 2025
