# Consent & Electronic Signature Testing Results

**Date:** 2026-01-20
**Tested by:** Claude Code
**Backend Port:** 3001
**Status:** Functional with security issues identified

---

## Test Summary

### 1. Consent Templates API ✅

| Operation | Status | Notes |
|-----------|--------|-------|
| List templates | ✅ PASS | Returns templates with pagination |
| Create template | ✅ PASS | Successfully created with all fields |
| View template | ✅ PASS | All fields returned correctly |

**Test Command:**
```bash
curl -s -X POST http://localhost:3001/api/v1/consent-templates \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"CONSENT-GENERAL-001","title":"Consentement aux soins","consentType":"medical_treatment","validFrom":"2026-01-01","terms":"...","status":"active"}'
```

---

### 2. Consent Creation ✅

| Operation | Status | Notes |
|-----------|--------|-------|
| Create from template | ✅ PASS | Consent created with template content |
| Language support | ✅ PASS | French content used correctly |
| Template version tracking | ✅ PASS | Version captured for audit |

**Created Consent ID:** `9a8683ef-5058-46a2-a88b-2fbc8320ec26`

---

### 3. Electronic Signature (Authenticated) ✅

| Operation | Status | Notes |
|-----------|--------|-------|
| Sign consent (PATCH /sign) | ✅ PASS | Signature recorded with GDPR data |
| IP tracking | ✅ PASS | ::1 (localhost) recorded |
| Device info | ✅ PASS | User-agent, timezone captured |
| Status update | ✅ PASS | Status changed to "accepted" |

**GDPR Compliance Fields Verified:**
- `signed_at`: Timestamp recorded
- `signature_method`: "digital"
- `ip_address`: Client IP captured
- `device_info`: Platform, timezone, user-agent

---

### 4. Signing Request Flow (Email/SMS) ✅

| Operation | Status | Notes |
|-----------|--------|-------|
| Create signing request | ✅ PASS | Token generated |
| Email sending | ✅ PASS | Email queued (test mode) |
| Expiration tracking | ✅ PASS | 72 hours expiry |
| Signing URL generation | ✅ PASS | URL with token generated |

**Signing Request ID:** `1d703ed0-8c74-40c5-807a-29634b055394`
**Signing URL:** `http://localhost:3000/sign-consent/1a5db677-f724-4b6c-a8c3-79afb6e92ab1`

---

### 5. Public Signature Flow (Patient) ✅

| Operation | Status | Notes |
|-----------|--------|-------|
| GET public signing page | ✅ PASS | No auth required, token-based access |
| View consent content | ✅ PASS | Template content returned |
| Viewed timestamp | ✅ PASS | `viewed_at` recorded |
| Submit signature | ✅ PASS | Consent created & signed |
| Signature image storage | ✅ PASS | Base64 image stored |

**Test Signature Flow:**
```bash
# 1. Access signing page (public)
curl http://localhost:3001/api/v1/public/sign/TOKEN

# 2. Submit signature (public)
curl -X POST http://localhost:3001/api/v1/public/sign/TOKEN \
  -d '{"signatureImage":"data:image/png;base64,...","signatureMethod":"digital"}'
```

---

### 6. Permission Testing ⚠️ ISSUES FOUND

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| Practitioner view consents | PASS | PASS | ✅ |
| Practitioner view templates | PASS | PASS | ✅ |
| Practitioner create consent | FAIL | PASS | ⚠️ BUG |
| Practitioner create signing request | FAIL | PASS | ⚠️ BUG |

---

## Security Issues Identified

### Issue 1: Missing Permission Check on `/consents/from-template`

**Severity:** Medium
**Location:** `/var/www/medical-pro-backend/src/routes/consents.js:188`

**Problem:** The `POST /consents/from-template` route does not check for `consents.create` permission. Any authenticated user can create consents regardless of their role permissions.

**Current Code (Line 188):**
```javascript
router.post('/from-template', async (req, res, next) => {
  // No permission check here!
  try {
    const { templateId, patientId, ... } = req.body;
```

**Fix Required:** Add permission middleware:
```javascript
const { checkPermission } = require('../middleware/authMiddleware');
const { PERMISSIONS } = require('../utils/permissionConstants');

router.post('/from-template', checkPermission(PERMISSIONS.CONSENTS_CREATE), async (req, res, next) => {
```

---

### Issue 2: Missing Permission Checks on Consent Signing Routes

**Severity:** Medium
**Location:** `/var/www/medical-pro-backend/src/routes/consent-signing.js`

**Problem:** All routes in consent-signing.js lack permission checks:
- `POST /consent-signing` - Should require `consents.assign`
- `GET /consent-signing/:id` - Should require `consents.view`
- `PATCH /consent-signing/:id/cancel` - Should require `consents.edit`
- `POST /consent-signing/:id/remind` - Should require `consents.assign`

**Fix Required:** Add permission middleware to each route.

---

## Test Accounts Used

| Account | Role | Email | Password |
|---------|------|-------|----------|
| Admin | admin | david@ozondenia.com | Test1234 |
| Practitioner | practitioner | franck@ozondenia.com | Test1234 |

---

## Test Data Created

| Entity | ID | Notes |
|--------|-----|-------|
| Consent Template | d78f2261-a66c-4417-abac-b3d44afdda0c | "Consentement aux soins médicaux" |
| Consent (signed) | 9a8683ef-5058-46a2-a88b-2fbc8320ec26 | Signed via authenticated route |
| Consent (from public) | c868b2c1-f231-461a-8d46-4cc7719535c8 | Signed via public token |
| Signing Request | 1d703ed0-8c74-40c5-807a-29634b055394 | Status: signed |
| Test Patient | 27b30cfd-2c1c-40ff-9c42-721e1b15703c | testpatient@example.com |

---

## Fixes Applied

### Fix 1: Added Permission Check to `/consents/from-template`

**File:** `/var/www/medical-pro-backend/src/routes/consents.js`

```javascript
router.post('/from-template', requirePermission([PERMISSIONS.CONSENTS_CREATE, PERMISSIONS.CONSENTS_ASSIGN], false), async (req, res, next) => {
```

### Fix 2: Added Permission Checks to All Consent Signing Routes

**File:** `/var/www/medical-pro-backend/src/routes/consent-signing.js`

| Route | Permission Required |
|-------|---------------------|
| `POST /` | `consents.assign` |
| `GET /` | `consents.view` |
| `GET /patient/:patientId` | `consents.view` |
| `GET /appointment/:appointmentId` | `consents.view` |
| `GET /:id` | `consents.view` |
| `PATCH /:id/cancel` | `consents.edit` or `consents.revoke` |
| `POST /:id/remind` | `consents.assign` |
| `DELETE /:id` | `consents.delete` |

### Verification

After fix, practitioner without `consents.create` permission now correctly receives:
```json
{
  "success": false,
  "error": {
    "message": "Permission denied",
    "details": "Required permissions: consents.create, consents.assign"
  }
}
```

---

## Recommendations

1. ~~**Critical:** Add permission middleware to custom consent routes~~ ✅ FIXED
2. **Medium:** Add rate limiting to public signing endpoints
3. **Low:** Add token format validation (UUID format check)
4. **Low:** Consider adding CAPTCHA to public signing page
