# 🔐 FRONTEND SECURITY AUDIT & ACTION PLAN

Date: 2025-12-02
Status: Development Phase 1 - Ready for Phase 2 Improvements

---

## EXECUTIVE SUMMARY

The Medical Pro frontend is **well-architected** with good security practices but needs improvements:

- ✅ **Good:** JWT authentication, server-side permissions, API abstraction
- ⚠️ **Needs Fix:** Hardcoded values, localStorage data synchronization, IP address placeholders
- 🔴 **Critical:** XSS risk (inherent to SPA), encryption not implemented

---

## PART 1: HARDCODED VALUES & CONFIGURATION

### A. Hardcoded URLs (No Secrets - Safe)

| File | Value | Purpose | Risk | Fix |
|------|-------|---------|------|-----|
| `src/api/baseClient.js` | `http://localhost:3001/api/v1` | Backend API | ❌ None | ✅ Already uses `.env` |
| `src/config/ConfigManager.js` | `'FR'` | Default country | 🟡 Low | Use `.env` or detect from server |
| `src/utils/regionDetector.js` | `DEFAULT_REGION = 'es'` | Fallback region | 🟡 Low | Keep as-is (safe default) |
| `src/utils/regionDetector.js` | `VALID_REGIONS = {es, fr}` | Valid regions | ✅ None | ✅ Config, not secret |

**Status:** ✅ GOOD - No API keys or secrets hardcoded

---

### B. Hardcoded IP Addresses (CRITICAL FIX NEEDED)

| File | Line | Value | Purpose | Impact |
|------|------|-------|---------|--------|
| `src/utils/security/secureDataAccess.js` | ~45 | `'localhost'` | Audit IP tracking | 🔴 Audit logs show wrong IP |
| `src/utils/security/dataEncryption.js` | ~120 | `'127.0.0.1'` | Session IP validation | 🔴 Sessions can't verify client IP |

**Problem:** Audit logs will show `localhost` instead of real client IP, defeating audit trail security.

**Fix Required:**

```javascript
// WRONG (Current):
const clientIP = '127.0.0.1'; // hardcoded

// CORRECT (Needed):
const getClientIP = async () => {
  try {
    const response = await fetch('/api/v1/auth/ip-info');
    return response.data.clientIP;
  } catch (e) {
    return 'unknown'; // fallback
  }
};
```

**Backend Changes Needed:**
```javascript
// Add new endpoint in backend /src/routes/auth.js
router.get('/ip-info', (req, res) => {
  res.json({
    clientIP: req.ip || req.connection.remoteAddress
  });
});
```

---

## PART 2: LOCALSTORAGE USAGE ANALYSIS

### Data Stored in localStorage (15 Keys)

```
Total estimated size: 5-50 MB (depending on data volume)
```

| Key | Data Type | Sensitivity | Size | Should Remain? | Recommendation |
|-----|-----------|-------------|------|---|---|
| `clinicmanager_token` | JWT | **CRITICAL** | 500-2KB | ✅ YES | Consider httpOnly cookies |
| `clinicmanager_auth` | Legacy auth | **CRITICAL** | 2-5KB | ❌ NO | Remove, deprecated |
| `clinicmanager_remember_email` | Email | LOW | ~50B | ⚠️ MAYBE | Encrypt or remove |
| `medicalPro_patients` | Patient records | **CRITICAL** | 1-10MB | ❌ NO* | Fetch on demand |
| `medicalPro_medical_records` | Medical data | **CRITICAL** | 5-20MB | ❌ NO* | Fetch on demand |
| `medicalPro_appointments` | Appointments | HIGH | 100KB-1MB | ⚠️ MAYBE | Cache with TTL |
| `medicalPro_consents` | Consents | HIGH | 100KB-1MB | ⚠️ MAYBE | Fetch on demand |
| `medicalPro_clinic_config` | Config | MEDIUM | 10-100KB | ✅ YES | Cache config |
| `medicalPro_permissions` | Permissions | MEDIUM | 1-10KB | ❌ NO | Always fetch fresh |
| `medicalPro_audit` | Audit logs | HIGH | 100KB-5MB | ❌ NO | Server-side only |
| All others | Various | LOW-MEDIUM | 100KB-2MB | ⚠️ MAYBE | Review individually |

**Legend:** ✅ Keep | ⚠️ Review | ❌ Remove

---

### Critical Issues with Current localStorage Usage

#### Issue 1: Patient & Medical Data in localStorage (CRITICAL)
**Current:** Entire patient database stored in browser localStorage
**Problem:**
- Patient data (CRITICAL sensitivity) accessible to any script
- Medical records (GDPR/HIPAA sensitive) at risk from XSS
- Data persists even after logout
- 10-20 MB of sensitive data on disk

**Risk Level:** 🔴 CRITICAL

**Solution:**
```javascript
// WRONG (Current):
const patients = JSON.parse(localStorage.getItem('medicalPro_patients')); // All patients in memory

// CORRECT (Recommended):
// Only fetch patients on demand
const getPatients = async (page = 1, limit = 20) => {
  const response = await fetch(`/api/v1/patients?page=${page}&limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data; // Don't store in localStorage
};

// Cache only if needed:
const cachedPatients = useQuery(['patients', page], () => getPatients(page), {
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000,    // 10 minutes
});
```

---

#### Issue 2: Audit Logs in Browser (MEDIUM)
**Current:** Audit logs stored in `localStorage['medicalPro_audit']`
**Problem:**
- Logs can be deleted by user
- Not immutable
- Mixed with temporary client-side logs
- Should be server-only

**Risk Level:** 🟠 MEDIUM

**Solution:**
```javascript
// REMOVE localStorage audit entirely
// Implement server-side audit logging only

// Frontend should ONLY log to backend:
const logAuditEvent = async (eventType, details) => {
  await fetch('/api/v1/audit/log', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Client-IP': clientIP // From new endpoint
    },
    body: JSON.stringify({
      eventType,
      details,
      timestamp: new Date().toISOString(),
      userId: user.id,
      companyId: user.companyId
    })
  });
};

// Never store locally
```

---

#### Issue 3: "Remember Me" Email in Plain Text (LOW)
**Current:** `localStorage['clinicmanager_remember_email']`
**Problem:**
- Email is not highly sensitive
- But privacy concern (persists across sessions)
- Should be encrypted if kept

**Risk Level:** 🟡 LOW

**Solution:**
```javascript
// Option A: Encrypt before storing
const encryptEmail = (email) => {
  return btoa(email); // Base64 (not real encryption, just obfuscation)
};

// Option B: Store on server instead
// POST /api/v1/auth/remember-email with HttpOnly cookie

// Option C: Remove entirely (Recommended for privacy)
// Users retype email (2 seconds slower UX)
```

---

#### Issue 4: Permissions Caching (SECURITY)
**Current:** Permissions cached in `localStorage['medicalPro_permissions']`
**Problem:**
- Permissions change server-side
- Cache could be out of date
- No TTL/expiration

**Risk Level:** 🟠 MEDIUM

**Solution:**
```javascript
// NEVER cache permissions from user perspective
// Always fetch fresh from /auth/me

// Wrong:
const permissions = JSON.parse(localStorage.getItem('medicalPro_permissions'));

// Correct:
const { permissions } = useAuth(); // Always fresh from SecureAuthContext
// Which calls /auth/me on app load

// Optional: Cache with 1-minute TTL
const cachedPermissions = useQuery(
  ['permissions'],
  () => fetch('/api/v1/auth/me').then(r => r.json()).then(d => d.data.permissions),
  { staleTime: 1 * 60 * 1000 } // Refresh every 1 minute
);
```

---

## PART 3: SECURE ARCHITECTURE RECOMMENDATIONS

### Current Architecture (Phase 1)
```
Frontend                          Backend
├─ localStorage (data)      →    API endpoints
├─ React Context (state)    →    Database
└─ API calls (JWT)          →    Permission checks
```

### Recommended Architecture (Phase 2)
```
Frontend                          Backend
├─ React Query (cache)      →    API endpoints
├─ React Context (state)    →    Database
├─ sessionStorage (token)   →    Permission checks
├─ API calls (JWT)          →    Audit logging
└─ Memory only (large data) →    Encryption at rest
```

---

### Migration Plan: From localStorage to Backend-First

#### Step 1: Remove Patient Data from localStorage (CRITICAL)
**Files to modify:**
- `src/utils/patientsStorage.js` - DELETE
- `src/contexts/PatientContext.js` - Refactor to fetch from API

**Timeline:** 1-2 hours
**Testing:** Test patient list, search, pagination

```javascript
// NEW PatientContext (using API instead of localStorage)
const PatientProvider = ({ children }) => {
  const { token } = useAuth();

  // Use React Query for caching
  const { data: patients, isLoading } = useQuery(
    ['patients'],
    async () => {
      const res = await fetch('/api/v1/patients', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json();
    },
    { staleTime: 5 * 60 * 1000 } // Cache 5 min
  );

  return (
    <PatientContext.Provider value={{ patients, isLoading }}>
      {children}
    </PatientContext.Provider>
  );
};
```

---

#### Step 2: Remove Medical Records from localStorage
**Files to modify:**
- `src/utils/medicalRecordsStorage.js` - DELETE
- `src/contexts/` - Refactor to API

**Timeline:** 1-2 hours

---

#### Step 3: Implement Server-Side Audit Logging Only
**Files to modify:**
- `src/utils/auditStorage.js` - DELETE
- `src/services/auditLogService.js` - Enhance

**Timeline:** 1 hour

**Backend changes:**
```javascript
// src/routes/audit.js (new)
router.post('/log', authenticate, async (req, res) => {
  const { eventType, details } = req.body;

  const auditLog = {
    userId: req.user.id,
    companyId: req.user.companyId,
    eventType,
    details,
    clientIP: req.ip,
    userAgent: req.get('user-agent'),
    timestamp: new Date(),
    success: true
  };

  await AuditLog.create(auditLog); // Save to database

  res.json({ success: true });
});
```

---

#### Step 4: Fix IP Address Tracking
**Files to modify:**
- `src/utils/security/dataEncryption.js`
- `src/utils/security/secureDataAccess.js`

**Timeline:** 30 minutes

```javascript
// Create a hook to get real client IP
const useClientIP = () => {
  const [ip, setIP] = useState('unknown');

  useEffect(() => {
    fetch('/api/v1/auth/ip-info')
      .then(r => r.json())
      .then(d => setIP(d.clientIP))
      .catch(() => setIP('unknown'));
  }, []);

  return ip;
};
```

---

#### Step 5: Implement Proper Caching (React Query)
**Install:** `npm install @tanstack/react-query`

**Timeline:** 2-3 hours

**Key caching policies:**
```javascript
// Patients: Cache 5 min
useQuery(['patients'], getPatients, { staleTime: 5 * 60 * 1000 })

// Appointments: Cache 10 min
useQuery(['appointments'], getAppointments, { staleTime: 10 * 60 * 1000 })

// Permissions: Cache 1 min (always fresh)
useQuery(['permissions'], getPermissions, { staleTime: 1 * 60 * 1000 })

// Medical records: No cache (fetch on demand)
useQuery(['medical-records', id], getMedicalRecord, { enabled: !!id })
```

---

## PART 4: SECURITY IMPROVEMENTS CHECKLIST

### Immediate (This Week)
- [ ] Remove hardcoded IP addresses
- [ ] Add `/api/v1/auth/ip-info` endpoint to backend
- [ ] Remove `localStorage['clinicmanager_auth']` (legacy)
- [ ] Document current localStorage usage

### Short Term (2-4 Weeks)
- [ ] Remove patient data from localStorage
- [ ] Remove medical records from localStorage
- [ ] Remove audit logs from localStorage
- [ ] Implement server-side audit logging
- [ ] Install React Query for proper caching
- [ ] Update PatientContext to use API

### Medium Term (1-2 Months)
- [ ] Implement httpOnly cookies for JWT (backend change)
- [ ] Encrypt "Remember Email" or remove it
- [ ] Add encryption layer for sensitive data (Phase 2)
- [ ] Implement permission caching with TTL
- [ ] Add rate limiting on API endpoints

### Long Term (Production Readiness)
- [ ] Migrate to httpOnly cookies only (remove localStorage token)
- [ ] Implement AES-256-GCM encryption for sensitive data
- [ ] Add field-level encryption for medical records
- [ ] Implement session timeout (24 hours max)
- [ ] Add 2FA support

---

## PART 5: BACKEND SUPPORT NEEDED

### Required New Backend Endpoints

```javascript
// 1. Get client IP info
GET /api/v1/auth/ip-info
Response: { clientIP: "192.168.1.1" }

// 2. Server-side audit logging
POST /api/v1/audit/log
Body: { eventType, details, timestamp, userId, companyId }
Response: { success: true }

// 3. Pagination support for patients
GET /api/v1/patients?page=1&limit=20&search=...
Response: {
  data: [patients],
  total: 1000,
  page: 1,
  pages: 50
}

// 4. Session info endpoint
GET /api/v1/auth/session
Response: {
  user: {...},
  permissions: [...],
  session: {
    loginTime: "...",
    lastActivity: "...",
    ipAddress: "..."
  }
}
```

---

## PART 6: SUMMARY TABLE

| Issue | Severity | Current | Target | Effort |
|-------|----------|---------|--------|--------|
| Hardcoded IPs | 🔴 CRITICAL | localStorage | /api/v1/auth/ip-info | 30 min |
| Patient data in localStorage | 🔴 CRITICAL | localStorage | API + React Query | 2 hours |
| Medical records in localStorage | 🔴 CRITICAL | localStorage | API + React Query | 2 hours |
| Audit logs in localStorage | 🟠 MEDIUM | localStorage | Backend only | 1 hour |
| Permissions caching | 🟠 MEDIUM | localStorage | React Query (1 min) | 1 hour |
| Remember email | 🟡 LOW | Plain text | Encrypted or removed | 30 min |
| JWT token | 🟡 LOW | localStorage | httpOnly cookies | 2-4 hours |
| Encryption | 🟡 LOW | Planned | AES-256-GCM | 8 hours |
| **TOTAL** | | | | **20 hours** |

---

## CONCLUSION

Medical Pro has a **solid foundation** but needs targeted improvements:

1. **This week:** Fix IP addresses and remove legacy auth
2. **Next sprint:** Remove sensitive data from localStorage
3. **Before production:** Implement httpOnly cookies and encryption
4. **Long term:** Full encryption and enhanced security

The architecture supports these changes without breaking existing functionality.

