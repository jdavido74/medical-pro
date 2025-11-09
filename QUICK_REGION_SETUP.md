# Quick Region Setup Guide

## For Developers - Getting Started in 3 Minutes

### Prerequisites

- Node.js 18+
- PostgreSQL running
- Backend and frontend projects cloned

### Quick Start - Local Development

#### Step 1: Start the Backend (Port 3001)

```bash
cd /var/www/medical-pro-backend
npm install  # if first time
npm start
```

Expected output:
```
🌍 MedicalPro Backend started
📍 Region detection middleware active
✅ Connected to medicalpro_central
Listening on port 3001
```

#### Step 2: Start the Frontend (Separate Terminal)

```bash
cd /var/www/medical-pro

# Option A: Spanish Instance (Default)
npm start
# Opens: http://localhost:3000
# Language: Spanish (ES)
# Loading screen shows: Region: es

# Option B: French Instance (Different Port)
PORT=3001 npm start
# Opens: http://localhost:3001
# Language: French (FR)
# Loading screen shows: Region: fr
```

Expected output:
```
🌍 MedicalPro Region Detected: España (ES)
Compiled successfully!
Local: http://localhost:3000
```

#### Step 3: Test Region Detection

**In Browser Console (F12):**

```javascript
// Check detected region
localStorage.getItem('medicalpro_region')  // Should return 'es' or 'fr'

// Check app initialization
window.location.pathname  // Shows current path
```

**Via Terminal:**

```bash
# Test Spanish region
curl -H "Host: es.localhost" http://localhost:3001/health

# Test French region
curl -H "Host: fr.localhost" http://localhost:3001/health

# Expected output in backend logs:
# 📍 Request to es.localhost detected region: ES
# 📍 Request to fr.localhost detected region: FR
```

### Switching Regions (Local Testing)

#### Method 1: Clear localStorage (Easy)

```javascript
// In browser console:
localStorage.removeItem('medicalpro_region');
location.reload();
```

#### Method 2: Use Different Port

```bash
# Terminal 1: Backend
cd /var/www/medical-pro-backend
npm start

# Terminal 2: Spanish Frontend (port 3000)
cd /var/www/medical-pro
PORT=3000 npm start
# Access: http://localhost:3000

# Terminal 3: French Frontend (port 3001)
cd /var/www/medical-pro
PORT=3001 npm start
# Access: http://localhost:3001
```

Now you have both regions running simultaneously!

### Verifying Region-Specific Behavior

#### 1. Language Detection

```bash
# Spanish instance
curl http://localhost:3000  # Should see Spanish UI

# French instance
curl http://localhost:3001  # Should see French UI
```

#### 2. Backend Business Rules

```bash
# Check region config
curl http://localhost:3001/health | jq .region

# Expected responses:
# { "region": "es", "language": "es", "taxRate": 21 }
# { "region": "fr", "language": "fr", "taxRate": 20 }
```

#### 3. Region Stickiness

```bash
# In browser (Spanish instance opened)
localStorage.getItem('medicalpro_region')
// Returns: 'es'

# Try to navigate to different URL - region stays same
# Try to change language - language stays Spanish
```

### Checking Logs

#### Frontend Logs (Browser Console - F12)

```
🌍 MedicalPro Region Detected: España (ES)  // App.js
```

#### Backend Logs (Terminal)

```
📍 Request to localhost:3000 detected region: ES  // Region middleware
Connected to clinic database: medicalpro_clinic_...
```

### Common Issues

#### Issue 1: Wrong Region Detected

**Solution:**
```bash
# Clear browser storage
localStorage.clear();
sessionStorage.clear();

# Restart browser
# Reload page
```

#### Issue 2: CORS Errors

**Solution:**
Make sure backend CORS is configured for your port:

```bash
# In .env
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

#### Issue 3: Different Languages in Each Tab

**This is Expected!** Each tab has its own localStorage:

```javascript
// Tab 1 (Spanish)
localStorage.getItem('medicalpro_region')  // 'es'

// Tab 2 (French)
localStorage.getItem('medicalpro_region')  // 'fr'

// Shared localStorage entry affects entire domain
// Open both: localhost:3000/es and localhost:3000/fr
// They share same localStorage
```

### Key Files to Check

1. **Frontend Region Detection:**
   - `/var/www/medical-pro/src/utils/regionDetector.js`
   - `/var/www/medical-pro/src/App.js` (useRegion context)

2. **Backend Region Detection:**
   - `/var/www/medical-pro-backend/src/utils/regionDetector.js`
   - `/var/www/medical-pro-backend/server.js` (middleware)

3. **i18n Configuration:**
   - `/var/www/medical-pro/src/i18n.js` (auto-detects language by region)

### Testing Checklist

- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Browser shows correct language for region
- [ ] localStorage contains `medicalpro_region` with correct value
- [ ] Backend logs show detected region
- [ ] Can reload page without region changing
- [ ] Two browsers show different regions

### Next Steps

Once everything works locally:

1. **Production Deployment** → See `MULTI_COUNTRY_SUBDOMAIN_DEPLOYMENT.md`
2. **Add Users** → Use registration flow to test clinic creation
3. **Test Email Verification** → Check console logs for verification links
4. **Test Clinic Isolation** → Verify multiple clinics can't see each other's data

---

## Environment Variables for Development

### Frontend (.env)

```bash
# Not needed for region detection (auto-detects from hostname/localStorage)
# Optional for debugging:
REACT_APP_DEBUG=true
```

### Backend (.env)

```bash
# Region detection is automatic
# For testing specific region (optional):
# REGION_OVERRIDE=es  (not implemented, use query param instead)

# Normal backend config
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

---

## Useful Commands

```bash
# Check region detection without starting server
node -e "
const { detectRegion } = require('./src/utils/regionDetector');
console.log('Detected region:', detectRegion({ hostname: 'es.localhost', query: {} }));
"

# Kill process on port 3001
lsof -i :3001  # Find PID
kill -9 <PID>

# View logs in real-time
tail -f /var/www/medical-pro-backend/logs/app.log

# Test with different hostnames
curl -H 'Host: es.localhost' http://localhost:3001/health
curl -H 'Host: fr.localhost' http://localhost:3001/health
```

---

## FAQ

**Q: Can I switch regions in the same browser tab?**
A: No, the region is sticky per domain. Clear localStorage to reset.

**Q: Does region affect database data?**
A: No, only UI language and business rules. Data is shared across regions (clinics are shared).

**Q: What if I want both regions on same port?**
A: Use different paths: `localhost:3000/es-es` and `localhost:3000/fr-fr` (path-based detection).

**Q: How do I test sub-domain detection locally?**
A: Use `curl -H "Host: es.localhost"` or `/etc/hosts` file to map `es.localhost` → `127.0.0.1`.

**Q: What's the difference between frontend and backend region detection?**
A: Frontend detects once per browser (sticky). Backend detects per request (from hostname/query/user).

---

**Happy developing! 🚀**
