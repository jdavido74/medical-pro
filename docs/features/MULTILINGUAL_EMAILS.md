# Multilingual Email Feature Documentation

## Overview

The MedicalPro application includes a region-aware email system that automatically sends verification and confirmation emails in the appropriate language (French or Spanish) based on the user's company region (country code).

## Feature Architecture

### 1. Region Detection

When a user registers, they specify a `country` parameter:
- **FR** - France (French language emails)
- **ES** - Spain (Spanish language emails)

This country is stored in the `Company` model and flows through the entire email system.

### 2. Email Service Flow

```
User Registration (country=FR or ES)
    ↓
Auth Route Handler (/api/v1/auth/register)
    ↓
Create Company with country parameter
    ↓
Call emailService.sendVerificationEmail({..., region: company.country})
    ↓
EmailService routes to language-specific template
    ↓
Send localized email via SMTP/Mailhog
```

## Implementation Details

### Backend Files Modified

#### 1. `/var/www/medical-pro-backend/src/services/emailService.js`

**Key Methods:**

- **`sendVerificationEmail(params)`** (line 131)
  - Accepts: `email`, `firstName`, `companyName`, `verificationToken`, `verificationUrl`, `region`
  - Routes to appropriate language template based on region
  - Wraps email with test mode information if enabled

- **`getVerificationEmailTemplate(region, params)`** (line 224)
  - Router method that selects correct template
  - Routes `ES` → Spanish template
  - Routes others (default) → French template

- **`getVerificationEmailTemplateFR(params)`** (line 238)
  - HTML template for French verification email
  - Header: "Bienvenue! 👋 Vérifiez votre adresse email..."
  - Button text: "Vérifier mon adresse email"
  - Security details in French

- **`getVerificationEmailTemplateES(params)`** (line 349)
  - HTML template for Spanish verification email
  - Header: "¡Bienvenido! 👋 Verifica tu dirección de correo..."
  - Button text: "Verificar mi dirección de correo"
  - Security details in Spanish

- **`sendVerificationConfirmed(params)`** (line 465)
  - Accepts: `email`, `firstName`, `companyName`, `region`
  - Sends confirmation email after successful verification
  - Routes to language-specific template

- **`getConfirmationEmailTemplate(region, params)`** (line 511)
  - Router method for confirmation emails
  - Routes `ES` → Spanish template
  - Routes others (default) → French template

- **`getConfirmationEmailTemplateFR(params)`** (line 525)
  - French confirmation email template
  - Header: "Adresse email confirmée! ✅"
  - Success message in French

- **`getConfirmationEmailTemplateES(params)`** (line 579)
  - Spanish confirmation email template
  - Header: "¡Dirección de correo confirmada! ✅"
  - Success message in Spanish

#### 2. `/var/www/medical-pro-backend/src/routes/auth.js`

**Email Sending Points:**

1. **Registration Endpoint** (line 205-211)
   ```javascript
   await emailService.sendVerificationEmail({
     email: result.user.email,
     firstName: result.user.first_name || 'User',
     companyName: result.company.name,
     verificationToken,
     verificationUrl,
     region: result.company.country || 'FR'  // Passes region
   });
   ```

2. **Email Verification Callback** (line 580-584)
   ```javascript
   await emailService.sendVerificationConfirmed({
     email: user.email,
     firstName: user.first_name || 'User',
     companyName: company?.name || 'MedicalPro',
     region: company?.country || 'FR'  // Passes region
   });
   ```

3. **Resend Verification Email** (line 672-678)
   ```javascript
   await emailService.sendVerificationEmail({
     email: user.email,
     firstName: user.first_name || 'User',
     companyName: user.company.name,
     verificationToken,
     verificationUrl,
     region: user.company.country || 'FR'  // Passes region
   });
   ```

## Email Templates

### French Templates (Default)

#### Verification Email
- **Greeting:** "Bienvenue! 👋"
- **Subject:** "Vérifiez votre adresse email - [Company Name]"
- **CTA Button:** "Vérifier mon adresse email"
- **Security Details:**
  - Ce lien de vérification expire dans 24 heures
  - N'oubliez pas de confirmer votre adresse email
  - Vous recevrez un email de confirmation une fois vérifié

#### Confirmation Email
- **Header:** "Adresse email confirmée! ✅"
- **Subject:** "Adresse email confirmée - [Company Name]"
- **Message:** "Votre adresse email a été vérifiée avec succès"
- **Next Steps:** (in French)
  - Connectez-vous avec vos identifiants
  - Complétez votre profil si nécessaire
  - Commencez à utiliser la plateforme

### Spanish Templates

#### Verification Email
- **Greeting:** "¡Bienvenido! 👋"
- **Subject:** "Verifica tu dirección de correo para acceder a [Company Name]"
- **CTA Button:** "Verificar mi dirección de correo"
- **Security Details:**
  - Este enlace de verificación caduca en 24 horas
  - No olvides confirmar tu dirección de correo
  - Recibirás un correo de confirmación una vez verificado

#### Confirmation Email
- **Header:** "¡Dirección de correo confirmada! ✅"
- **Subject:** "¡Dirección de correo confirmada!"
- **Message:** "Tu dirección de correo ha sido verificada exitosamente"
- **Next Steps:** (in Spanish)
  - Inicia sesión con tus credenciales
  - Completa tu perfil si es necesario
  - Comienza a usar la plataforma

## Test Mode Configuration

In test mode (when `TEST_MODE_EMAIL=true`), emails are:
1. Redirected to configured test email address
2. Prefixed with `[TEST - VERIFICATION]` or `[TEST - CONFIRMATION]`
3. Include a yellow info box showing the original recipient email
4. Sent with the correct language for the region

### Environment Variables
```bash
TEST_MODE_EMAIL=true              # Enable test mode
TEST_EMAIL_ADDRESS=dev@medicalpro.test  # Redirect destination
SMTP_HOST=localhost               # Mailhog for testing
SMTP_PORT=1025                    # Mailhog SMTP port
```

## Testing the Feature

### Testing French (FR) Region

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Cabinet Médical France",
    "country": "FR",
    "businessNumber": "12345678901234",
    "vatNumber": "FR12345678901",
    "companyEmail": "clinic@example.fr",
    "companyPhone": "+33123456789",
    "email": "user@example.fr",
    "password": "TestPass123",
    "firstName": "Jean",
    "lastName": "Dupont",
    "address": {},
    "acceptTerms": true
  }'
```

**Expected Result:**
- Email sent with French content
- Subject contains "Vérifiez"
- Body contains "Bienvenue" and "Vérifier mon adresse email"

### Testing Spanish (ES) Region

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Clínica Médica España",
    "country": "ES",
    "businessNumber": "[VALID_NIF]",
    "vatNumber": "ES[VALID_NIF]",
    "companyEmail": "clinic@example.es",
    "companyPhone": "+34912345678",
    "email": "user@example.es",
    "password": "TestPass123",
    "firstName": "Juan",
    "lastName": "García",
    "address": {},
    "acceptTerms": true
  }'
```

**Expected Result:**
- Email sent with Spanish content
- Subject contains Spanish text
- Body contains "¡Bienvenido!" and "Verificar mi dirección de correo"

### Checking Emails in Mailhog

1. **Web Interface:** http://localhost:8025
2. **API Endpoint:** `curl http://localhost:8025/api/v2/messages`

## Verification Flow

1. **User registers** with `country=FR` or `country=ES`
2. **Verification email sent** in appropriate language
3. **User clicks verification link** in email
4. **Frontend redirects** to verification callback page
5. **Backend verifies token** and sets `email_verified=true`
6. **Confirmation email sent** in same language
7. **User redirected** to login page after 10-second confirmation display

## Adding New Languages

To add support for additional languages (e.g., German - `DE`):

1. **Update Company model validation** to accept new country code
2. **Create new template methods** in `emailService.js`:
   ```javascript
   getVerificationEmailTemplateDE({ email, firstName, companyName, verificationUrl, verificationToken }) {
     return `<!-- German HTML email template -->`;
   }

   getConfirmationEmailTemplateDE({ firstName, companyName }) {
     return `<!-- German confirmation template -->`;
   }
   ```

3. **Update router methods** to include new region:
   ```javascript
   getVerificationEmailTemplate(region = 'FR', params) {
     region = region.toUpperCase();
     if (region === 'ES') {
       return this.getVerificationEmailTemplateES(params);
     }
     if (region === 'DE') {
       return this.getVerificationEmailTemplateDE(params);
     }
     return this.getVerificationEmailTemplateFR(params);
   }
   ```

4. **Test registration** with new country code

## Email Content Styling

All email templates use:
- **Font:** Segoe UI, Tahoma, Geneva, Verdana, sans-serif
- **Header:** Gradient background (135deg, #667eea → #764ba2)
- **Confirmation Header:** Green gradient (#16a34a → #15803d)
- **Layout:** Responsive 600px max-width container
- **Button Style:** Matches company branding with hover effects

## Error Handling

### Test Mode
- If email sending fails, registration continues (user can resend later)
- Error logged but doesn't block user account creation

### Production Mode
- Verification email failure logs warning but doesn't fail registration
- Confirmation email failure is non-critical (user already verified)
- All errors include detailed logging for debugging

## Frontend Integration

The frontend (`/var/www/medical-pro/src/components/auth/EmailVerificationCallback.js`):
- Extracts token from URL path: `/auth/verify-email/{TOKEN}`
- Displays verification status (verifying, success, error)
- Shows 10-second countdown before redirecting to login
- Confirms email address on success
- Allows requesting new verification link on error

## Security Considerations

1. **Token Expiration:** 24 hours
2. **Token Format:** JWT with email and verification context
3. **Duplicate Prevention:** System checks if email already verified before sending confirmation
4. **Test Mode Isolation:** Test emails never reach real users

## Monitoring and Debugging

### Logs to Check

**Backend Logs** (npm start output):
```
[EmailService] Attempting to send verification email
[EmailService] Email sent successfully
✅ Verification email sent to [email]
```

**Mailhog Web UI:**
- http://localhost:8025
- View all sent emails with full content
- Check HTML rendering of email templates

### Common Issues

1. **No email received**
   - Check SMTP configuration
   - Verify Mailhog is running on port 1025
   - Check test mode is disabled for production

2. **Wrong language email**
   - Verify `company.country` value in database
   - Check region parameter is passed to emailService
   - Inspect template router method logic

3. **Email formatting issues**
   - Check HTML template syntax
   - Verify special characters (accents, emojis) render correctly
   - Test with multiple email clients

## Summary

The multilingual email feature provides:
- ✅ Automatic language detection based on user's country
- ✅ Professional HTML email templates for French and Spanish
- ✅ Support for both verification and confirmation emails
- ✅ Test mode with email redirection capability
- ✅ Easy expansion for additional languages
- ✅ Seamless integration with existing authentication flow
- ✅ 24-hour token expiration for security
