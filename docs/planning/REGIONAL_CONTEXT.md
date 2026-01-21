# Regional Context & User Session Requirements

## Important Development Guidelines

**Date:** November 2025
**Status:** Critical for all future development
**Author:** Development Team

---

## 1. Regional Context (FR/ES)

### Overview
The application must always be aware of and respect the user's regional/country context (FR for France, ES for Spain). This context drives:
- UI language and translations
- Email templates and content
- Validation rules (SIRET for FR, NIF for ES, etc.)
- Business logic variations
- Legal/regulatory compliance

### Current Implementation Status
✅ **Already in place:**
- Regional detection on app startup (`utils/regionDetector.js`)
- Region stored in `RegionContext` (React Context)
- Region stored in Company model in database
- i18n system with FR/ES translations (350+ keys)
- Email templates localized per region

### How to Use Regional Context

**In Frontend Components:**
```javascript
import { useRegion } from '../App'; // or from context

const MyComponent = () => {
  const { region, regionConfig } = useRegion();

  // Use region for conditional rendering
  if (region === 'es') {
    // Show Spanish-specific UI
  }

  // Use translations
  const { t } = useTranslation('moduleName');
  return <h1>{t('key')}</h1>; // Automatically in region's language
};
```

**In Backend Routes:**
```javascript
// Region is available from authenticated user's company
const user = req.user; // From JWT token
const company = await Company.findByPk(user.company_id);
const region = company.country; // 'FR' or 'ES'

// Use in business logic, validation, etc.
await emailService.sendVerificationEmail({
  email,
  region: region || 'FR'
});
```

### What Must Be Regionalized

1. **UI/Frontend:**
   - All user-facing text via i18n keys
   - Regional form validation rules
   - Date/time formatting
   - Currency/number formatting (if applicable)
   - Regional-specific workflows

2. **Backend:**
   - Email templates and content
   - Validation rules (SIRET length, VAT format, phone format)
   - Business logic variations
   - API response messages
   - Error messages

3. **Data:**
   - Company validation rules based on country
   - User profile fields based on region
   - Regulatory data requirements

### Checking Regional Implementation

Before each feature, verify:
- [ ] i18n keys exist for this feature in EN, FR, ES
- [ ] Component imports and uses `useRegion()` or `useTranslation()`
- [ ] Backend passes region to services that need it
- [ ] Email/message content is localized
- [ ] Validation rules match regional requirements
- [ ] Documentation mentions regional considerations

---

## 2. User Session Management

### Overview
Once a user is authenticated, their session must be used throughout the platform to:
- Personalize the user experience
- Enforce proper access control
- Track user actions
- Maintain user context across pages

### Current Implementation Status
✅ **Already in place:**
- JWT tokens in AuthContext (`contexts/AuthContext.js`)
- User session persistence
- Clinic isolation via `clinicRoutingMiddleware`
- User data stored in JWT and accessible via `useAuth()` hook

### How to Access User Session

**In Frontend Components:**
```javascript
import { useAuth } from '../contexts/AuthContext';

const MyComponent = () => {
  const { user, isAuthenticated, company, clinicId } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Access user data
  console.log(user.email);
  console.log(user.first_name);
  console.log(company.name);
  console.log(clinicId); // For clinic-specific operations

  return <div>Welcome {user.first_name}!</div>;
};
```

**In Backend Routes:**
```javascript
// Middleware attaches user to request
const user = req.user; // Contains userId, email, companyId, clinicId
const company = req.company; // Current company context

// Use in business logic
const result = await UserService.doSomething({
  userId: user.id,
  companyId: user.company_id,
  clinicId: user.clinic_id
});
```

### Session Data Available

**From `useAuth()` Hook:**
```javascript
{
  user: {
    id: 'uuid',
    email: 'user@example.com',
    first_name: 'Jean',
    last_name: 'Dupont',
    role: 'admin', // or 'user', 'readonly'
    email_verified: true
  },
  company: {
    id: 'uuid',
    name: 'Cabinet Médical',
    country: 'FR' // IMPORTANT: Region/country code
  },
  clinicId: 'uuid',
  isAuthenticated: true,
  isLoading: false,
  accessToken: 'jwt-token',
  error: null
}
```

### User Roles & Permissions

The system supports role-based access control:
- **super_admin:** Full platform access
- **admin:** Company-level admin for own company
- **user:** Regular user with standard permissions
- **readonly:** Read-only access

Implement role checks:
```javascript
const { user } = useAuth();

if (user.role === 'admin' || user.role === 'super_admin') {
  // Show admin features
}
```

### Session Persistence

Sessions are automatically persisted via:
1. JWT tokens stored in localStorage
2. AuthContext maintains session state
3. Backend validates JWT on each request
4. User can refresh page without losing session

### When Session is Lost

Implement proper handling:
```javascript
const { isAuthenticated, error } = useAuth();

if (!isAuthenticated || error?.includes('unauthorized')) {
  // Redirect to login
  setCurrentPage('login');
  // Clear stored data
  localStorage.removeItem('token');
}
```

---

## 3. Clinic Isolation (Multi-Tenancy)

### Overview
Each company can have multiple clinics. The system must maintain proper isolation:
- Users only see data from their assigned clinic
- Requests are routed to correct clinic database
- No cross-clinic data leakage

### How It Works

**Frontend:**
```javascript
const { clinicId } = useAuth(); // Current clinic context

// All clinic-specific requests include clinicId
const patients = await baseClient.get(`/clinics/${clinicId}/patients`);
```

**Backend:**
```javascript
// clinicRoutingMiddleware automatically:
// 1. Reads clinicId from JWT
// 2. Routes request to correct clinic database
// 3. Validates user has access to clinic

// Developers don't need to manually handle clinic routing
// Just use req.user.clinic_id where needed
```

### Important Notes
- Clinic isolation is enforced by middleware
- Always use `clinicId` from authenticated user
- Never hardcode clinic IDs
- Test with multiple clinics to verify isolation

---

## 4. Integration Checklist for New Features

When developing new features, always ensure:

### Regional Context
- [ ] i18n keys created for FR and ES
- [ ] Component uses `useRegion()` or `useTranslation()`
- [ ] Backend passes region parameter to relevant services
- [ ] Regional validation rules implemented
- [ ] Emails/messages are localized
- [ ] API responses use user's language

### User Session
- [ ] Feature checks user authentication before showing
- [ ] User data from `useAuth()` used appropriately
- [ ] User's clinic context is respected
- [ ] User's company/region is used
- [ ] Role-based access control implemented if needed
- [ ] Session errors handled gracefully

### Data Access
- [ ] Clinic ID used in all clinic-specific queries
- [ ] User ID tracked for audit/logging
- [ ] Company ID used for company-level operations
- [ ] No hardcoded IDs in frontend
- [ ] Backend validates user has access to data

### Testing
- [ ] Test with FR region user
- [ ] Test with ES region user
- [ ] Test with different user roles
- [ ] Test with multiple clinics
- [ ] Test session persistence (refresh page)
- [ ] Test session loss/re-login flow

---

## 5. Common Patterns

### Pattern 1: Regional Conditional UI

```javascript
import { useRegion } from '../App';
import { useTranslation } from 'react-i18next';

const RegionalComponent = () => {
  const { region } = useRegion();
  const { t } = useTranslation('module');

  return (
    <div>
      <h1>{t('title')}</h1>

      {region === 'fr' && (
        <div>{t('frenchSpecificContent')}</div>
      )}

      {region === 'es' && (
        <div>{t('spanishSpecificContent')}</div>
      )}
    </div>
  );
};
```

### Pattern 2: User Session Check

```javascript
import { useAuth } from '../contexts/AuthContext';

const ProtectedComponent = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;

  if (!isAuthenticated) {
    return <RedirectToLogin />;
  }

  return (
    <div>
      Welcome {user.first_name} ({user.role})
    </div>
  );
};
```

### Pattern 3: Clinic-Specific Request

```javascript
import { useAuth } from '../contexts/AuthContext';

const ClinicDataComponent = () => {
  const { clinicId } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const response = await baseClient.get(
        `/clinics/${clinicId}/patients`
      );
      setData(response.data);
    };

    fetchData();
  }, [clinicId]);

  return <div>{/* render data */}</div>;
};
```

### Pattern 4: Backend Service with Region

```javascript
// In /src/services/emailService.js
async sendVerificationEmail({ email, region = 'FR', ... }) {
  // Get region-specific template
  const template = this.getVerificationEmailTemplate(region, params);

  // Send localized email
  await this.transporter.sendMail({
    to: email,
    subject: this.getSubject(region),
    html: template
  });
}
```

---

## 6. Key Files to Understand

### Frontend
- `/src/App.js` - RegionContext provider, routing logic
- `/src/contexts/AuthContext.js` - User session management
- `/src/contexts/RegionContext.js` - or RegionProvider
- `/src/utils/regionDetector.js` - Region detection logic
- `/src/locales/*/` - Translation files (FR, ES)

### Backend
- `/src/config/jwt.js` - JWT token structure
- `/src/middleware/clinicRoutingMiddleware.js` - Clinic isolation
- `/src/routes/auth.js` - Authentication routes
- `/src/services/emailService.js` - Region-aware emails

---

## 7. Future Development Notes

### When Building New Features
1. **Always start with i18n keys** - Define all user-facing text before implementation
2. **Region-aware from day 1** - Don't add regional support later
3. **Use AuthContext immediately** - Don't bypass authentication checks
4. **Test with both regions** - FR and ES, not just one
5. **Document regional variations** - List what's different between regions

### Common Pitfalls to Avoid
- ❌ Hardcoding strings without i18n keys
- ❌ Ignoring regional validation rules
- ❌ Using `window.localStorage` directly instead of AuthContext
- ❌ Hardcoding clinic/company IDs
- ❌ Not checking user role before showing features
- ❌ Testing only with one region
- ❌ Forgetting to pass region to backend services

### Performance Considerations
- Regional context lookup is O(1) - no performance penalty
- i18n translation lookup is cached - minimal overhead
- JWT validation happens once per request - efficient
- Clinic routing is middleware-based - transparent to developers

---

## 8. Questions?

If unsure about:
- **Regional requirements:** Check `MULTILINGUAL_EMAILS_FEATURE.md`
- **Session management:** Review `contexts/AuthContext.js`
- **Clinic routing:** See middleware documentation
- **i18n setup:** Check existing locale files structure
- **Email localization:** See `MULTILINGUAL_EMAILS_IMPLEMENTATION.md`

---

**Remember:** Regional context and user session are foundational to the application. Every feature must respect both.

**Last Updated:** November 13, 2025
