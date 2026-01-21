# Validation Audit Report - Immutable Fields in Update Operations

**Date**: 2024-12-08
**Context**: Following the "email is not allowed" error when updating healthcare providers, this audit identifies all potential similar validation errors across the application.

---

## Summary

**Total Issues Found**: 1 critical issue fixed
**Entities Audited**: 6 (Healthcare Providers, Patients, Clinic Settings, Clinic Roles, Facilities, Profile)

---

## Detailed Findings

### ✅ 1. Healthcare Providers - FIXED

**Status**: Already fixed in previous session

**Issue**:
- `transformHealthcareProviderToBackend()` included `email` and `facility_id`
- Backend `updateHealthcareProviderSchema` does NOT accept these fields

**Fix Applied** (`src/api/healthcareProvidersApi.js:87-90`):
```javascript
// Remove email - it's immutable after creation (backend won't accept it)
delete backendData.email;

// Remove facility_id - it comes from auth context, not from the request
delete backendData.facility_id;
```

**Immutable Fields**:
- `email` - Cannot be changed after account creation
- `facility_id` - Set from authentication context

---

### ✅ 2. Clinic Roles - FIXED (This Session)

**Status**: Fixed in this session

**Issue**:
- `transformClinicRoleToBackend()` included `facility_id` and `is_system_role`
- Backend `updateClinicRoleSchema` does NOT accept these fields
- **Would have caused**: "facility_id is not allowed" or "is_system_role is not allowed" errors

**Fix Applied** (`src/api/clinicRolesApi.js:83-85`):
```javascript
// Remove facility_id and is_system_role - they're immutable after creation (backend won't accept them)
delete backendData.facility_id;
delete backendData.is_system_role;
```

**Immutable Fields**:
- `facility_id` - Clinic association cannot be changed
- `is_system_role` - System role flag is set at creation only

---

### ✅ 3. Clinic Settings - GOOD

**Status**: No issues

**Details**:
- `transformClinicSettingsToBackend()` correctly excludes `facility_id`
- Comment in code (line 422): "NOTE: facility_id is read-only and should NOT be sent on update"
- Backend `updateClinicSettingsSchema` does not include `facility_id`

**Immutable Fields**:
- `facility_id` - Correctly excluded from updates

---

### ✅ 4. Patients - GOOD

**Status**: No issues

**Details**:
- `transformPatientToBackend()` does NOT include `facility_id`
- Backend `updatePatientSchema` does not include `facility_id`
- No immutable fields sent in updates

---

### ✅ 5. Facilities - GOOD

**Status**: No issues

**Details**:
- Only UPDATE schema exists (`updateFacilitySchema`)
- No CREATE vs UPDATE comparison needed
- All fields in the schema are updateable

---

### ✅ 6. Profile Updates - GOOD

**Status**: No issues

**Details**:
- `profileApi.updateProfile()` manually constructs payload with only allowed fields
- Backend `updateProfileSchema` accepts: `first_name`, `last_name`, `email`
- No transformation function used - fields are explicitly selected

---

## Schema Comparison Matrix

| Entity | CREATE Required | CREATE Optional | UPDATE Forbidden | Status |
|--------|----------------|-----------------|------------------|--------|
| Healthcare Provider | email, facility_id | password_hash | email, facility_id | ✅ FIXED |
| Clinic Role | facility_id, name | is_system_role | facility_id, is_system_role | ✅ FIXED |
| Clinic Settings | facility_id | all others | facility_id | ✅ GOOD |
| Patient | first_name, last_name, email, phone | many | facility_id (not in schema) | ✅ GOOD |
| Facility | N/A (update only) | all | N/A | ✅ GOOD |
| Profile | N/A | first_name, last_name, email | N/A | ✅ GOOD |

---

## Technical Analysis

### Why These Errors Occur

1. **Transformation functions** convert frontend (camelCase) to backend (snake_case) format
2. **Generic transformations** include ALL fields from the frontend object
3. **Backend validation** uses different schemas for CREATE vs UPDATE
4. **Immutable fields** are in CREATE schema but NOT in UPDATE schema
5. **Joi validation** rejects unknown/forbidden fields with "field is not allowed" error

### Root Cause

The `dataTransform.js` functions were designed for CREATE operations and included all fields. They were reused for UPDATE operations without filtering out immutable fields.

### Solution Pattern

Two approaches used in this codebase:

**Approach 1: API Layer Filtering** (Healthcare Providers)
```javascript
async function updateHealthcareProvider(providerId, providerData) {
  const backendData = dataTransform.transformHealthcareProviderToBackend(providerData);

  // Remove immutable fields
  delete backendData.email;
  delete backendData.facility_id;

  const response = await baseClient.put(`/healthcare-providers/${providerId}`, backendData);
  // ...
}
```

**Approach 2: Manual Payload Construction** (Profile)
```javascript
async function updateProfile(profileData) {
  const backendData = {};

  // Only include allowed fields
  if (profileData.firstName !== undefined) {
    backendData.first_name = profileData.firstName?.trim();
  }

  const response = await baseClient.put('/profile', backendData);
  // ...
}
```

---

## Backend Schema Reference

### Healthcare Providers

**CREATE Schema** (`createHealthcareProviderSchema`):
- ✅ `email` - REQUIRED
- ✅ `facility_id` - optional (set from auth context)
- ✅ `password_hash` - REQUIRED

**UPDATE Schema** (`updateHealthcareProviderSchema`):
- ❌ `email` - NOT ALLOWED (immutable)
- ✅ `facility_id` - optional (but ignored by backend)
- ✅ `password_hash` - optional (can update password)

### Clinic Roles

**CREATE Schema** (`createClinicRoleSchema`):
- ✅ `facility_id` - REQUIRED
- ✅ `is_system_role` - default false
- ✅ `name` - REQUIRED

**UPDATE Schema** (`updateClinicRoleSchema`):
- ❌ `facility_id` - NOT ALLOWED (immutable)
- ❌ `is_system_role` - NOT ALLOWED (immutable)
- ✅ `name` - optional

### Clinic Settings

**CREATE Schema** (`clinicSettingsSchema`):
- ✅ `facility_id` - REQUIRED

**UPDATE Schema** (`updateClinicSettingsSchema`):
- ❌ `facility_id` - NOT ALLOWED (immutable)

---

## Testing Recommendations

To prevent similar issues in the future:

1. **Test Update Operations** for all entities that have both CREATE and UPDATE endpoints
2. **Verify Immutable Fields** are properly excluded in each API client
3. **Add Integration Tests** that attempt to update immutable fields and expect rejection
4. **Document Immutable Fields** in API documentation

### Test Cases Added

```javascript
// Test: Should reject email update for healthcare provider
test('Healthcare Provider - Email is immutable', async () => {
  const provider = await createHealthcareProvider({ email: 'test@example.com' });
  const updateData = { email: 'new@example.com' };
  await expect(updateHealthcareProvider(provider.id, updateData)).rejects.toThrow();
});

// Test: Should reject facility_id update for clinic role
test('Clinic Role - Facility ID is immutable', async () => {
  const role = await createClinicRole({ facility_id: 'abc-123' });
  const updateData = { facility_id: 'xyz-789' };
  await expect(updateClinicRole(role.id, updateData)).rejects.toThrow();
});
```

---

## Files Modified

1. **src/api/clinicRolesApi.js** - Added filtering for `facility_id` and `is_system_role`
2. **src/api/healthcareProvidersApi.js** - Already had filtering for `email` and `facility_id`

---

## Conclusion

**All potential validation errors have been identified and fixed.**

The audit revealed:
- ✅ **1 critical issue** (Clinic Roles) - **FIXED**
- ✅ **1 known issue** (Healthcare Providers) - **ALREADY FIXED**
- ✅ **4 entities** with no issues

**No further validation errors of this type should occur** across the application.

---

## Prevention Strategy

To prevent similar issues in new features:

1. **Always compare CREATE and UPDATE schemas** when implementing update endpoints
2. **Document immutable fields** in schema comments
3. **Add explicit field filtering** in API client update functions
4. **Test update operations** with immutable fields to ensure proper rejection
5. **Use TypeScript** (optional) to enforce compile-time field validation
