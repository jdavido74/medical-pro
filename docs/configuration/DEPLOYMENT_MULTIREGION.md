# Multi-Country Sub-Domain Deployment Guide

## Overview

MedicalPro now supports **region-specific instances** running on separate sub-domains:
- **es.medicalpro.com** - Spain instance (Spanish UI, Spanish business rules)
- **fr.medicalpro.com** - France instance (French UI, French business rules)

Each region is **sticky** - once a user accesses a region instance, they stay in that language/configuration for their entire session.

---

## Architecture

### Frontend Region Detection

The frontend automatically detects region from:

1. **Sub-domain** (highest priority)
   - `es.medicalpro.com` → Spanish instance
   - `fr.medicalpro.com` → French instance

2. **URL path** (fallback for development)
   - `localhost:3000/es-es` → Spanish instance
   - `localhost:3000/fr-fr` → French instance

3. **localStorage** (sticky)
   - Once detected, stored in browser to prevent switching

4. **Default** (fallback)
   - Spanish (es) if no region detected

### Backend Region Detection

The backend automatically detects region from:

1. **Hostname sub-domain** (highest priority)
   - `es.medicalpro.com` → Spanish backend config
   - `fr.medicalpro.com` → French backend config

2. **Query parameter** (API flexibility)
   - `?region=es` or `?region=fr`

3. **User country** (JWT token)
   - Uses authenticated user's country if available

4. **Default** (fallback)
   - Spanish (es) if no region detected

### Business Rules Per Region

Each region has fixed business rules:

| Parameter | Spain (ES) | France (FR) |
|-----------|-----------|------------|
| Language | Spanish | French |
| Currency | EUR | EUR |
| Tax Rate | 21% (IVA) | 20% (TVA) |
| Business ID | NIF | SIRET |
| Validation Rules | NIF format | SIRET format |
| Document Format | Spanish | French |

---

## Development Setup

### Local Development with Path-Based Routing

For development without real sub-domains, use path-based routing:

#### Frontend

```bash
cd /var/www/medical-pro

# Start Spanish instance (default)
REACT_APP_COUNTRY=ES npm start
# Access: http://localhost:3000/es-es

# OR start French instance
REACT_APP_COUNTRY=FR npm start
# Access: http://localhost:3000/fr-fr
```

#### Backend

```bash
cd /var/www/medical-pro-backend

# Start backend (detects region from frontend region query param)
npm start
```

#### Test Region Detection

```bash
# Test Spanish region detection
curl -X GET http://localhost:3001/health \
  -H "Host: es.localhost"

# Test French region detection
curl -X GET http://localhost:3001/health \
  -H "Host: fr.localhost"

# Or use query parameter
curl -X GET http://localhost:3001/health?region=es

# Response should show:
# 📍 Request to {hostname} detected region: ES
```

### Local Testing with Multiple Instances

For testing both regions simultaneously:

```bash
# Terminal 1: Backend
cd /var/www/medical-pro-backend
npm start
# Listens on port 3001

# Terminal 2: Spanish Frontend
cd /var/www/medical-pro
REACT_APP_COUNTRY=ES npm start --port 3000
# Access: http://localhost:3000

# Terminal 3: French Frontend
cd /var/www/medical-pro
REACT_APP_COUNTRY=FR npm start --port 3001
# Access: http://localhost:3001
```

---

## Production Deployment

### Option 1: Sub-Domain Based (Recommended)

#### DNS Configuration

```dns
; Main domain
medicalpro.com.        A    production.ip.address

; Region sub-domains (Point to same backend server)
es.medicalpro.com.     CNAME medicalpro.com.
fr.medicalpro.com.     CNAME medicalpro.com.

; Backend API
api.medicalpro.com.    A    backend.ip.address
```

#### Nginx Configuration

```nginx
# Main backend upstream
upstream api_backend {
  server backend-server:3001;
}

# Spain instance (es.medicalpro.com)
server {
  server_name es.medicalpro.com;
  listen 443 ssl http2;

  # SSL configuration
  ssl_certificate /etc/ssl/certs/medicalpro-wildcard.crt;
  ssl_certificate_key /etc/ssl/private/medicalpro-wildcard.key;

  # Frontend serving
  root /var/www/medical-pro-es/build;
  location / {
    try_files $uri /index.html;
  }

  # API proxy (region param added for clarity)
  location /api/ {
    proxy_pass http://api_backend;
    proxy_set_header Host es.medicalpro.com;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}

# France instance (fr.medicalpro.com)
server {
  server_name fr.medicalpro.com;
  listen 443 ssl http2;

  # SSL configuration
  ssl_certificate /etc/ssl/certs/medicalpro-wildcard.crt;
  ssl_certificate_key /etc/ssl/private/medicalpro-wildcard.key;

  # Frontend serving
  root /var/www/medical-pro-fr/build;
  location / {
    try_files $uri /index.html;
  }

  # API proxy (region param added for clarity)
  location /api/ {
    proxy_pass http://api_backend;
    proxy_set_header Host fr.medicalpro.com;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}

# HTTP redirect to HTTPS
server {
  server_name es.medicalpro.com fr.medicalpro.com;
  listen 80;
  return 301 https://$server_name$request_uri;
}
```

#### Build and Deploy

```bash
# Build Spanish frontend
cd /var/www/medical-pro
REACT_APP_COUNTRY=ES npm run build
mkdir -p /var/www/medical-pro-es
cp -r build/* /var/www/medical-pro-es/

# Build French frontend
REACT_APP_COUNTRY=FR npm run build
mkdir -p /var/www/medical-pro-fr
cp -r build/* /var/www/medical-pro-fr/

# Deploy backend (once for both regions)
cd /var/www/medical-pro-backend
npm run build  # if applicable
# Copy to production server
rsync -avz . production-server:/var/www/medical-pro-backend/

# Restart services
systemctl restart nginx
systemctl restart medical-pro-backend
```

#### SSL Certificate (Wildcard)

```bash
# Generate wildcard SSL for both sub-domains
certbot certonly --standalone \
  -d medicalpro.com \
  -d es.medicalpro.com \
  -d fr.medicalpro.com \
  -d api.medicalpro.com

# Or use existing wildcard
# *.medicalpro.com certificate covers both es.medicalpro.com and fr.medicalpro.com
```

### Option 2: Docker Compose Deployment

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Shared PostgreSQL
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: medicalpro
      POSTGRES_PASSWORD: secure_password
      POSTGRES_INITDB_ARGS: "--encoding=UTF8"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations/central_001_initial_schema.sql:/docker-entrypoint-initdb.d/01_central.sql
    ports:
      - "5432:5432"

  # Shared backend API
  api:
    build:
      context: ./medical-pro-backend
    environment:
      NODE_ENV: production
      PORT: 3001
      DB_HOST: postgres
      DB_USER: medicalpro
      DB_PASSWORD: secure_password
      CENTRAL_DB_NAME: medicalpro_central
    depends_on:
      - postgres
    ports:
      - "3001:3001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Spanish frontend
  frontend-es:
    build:
      context: ./medical-pro
      args:
        REACT_APP_COUNTRY: ES
    environment:
      REACT_APP_API_URL: https://api.medicalpro.com
    ports:
      - "3000:80"

  # French frontend
  frontend-fr:
    build:
      context: ./medical-pro
      args:
        REACT_APP_COUNTRY: FR
    environment:
      REACT_APP_API_URL: https://api.medicalpro.com
    ports:
      - "3002:80"

  # Nginx reverse proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - /etc/ssl/certs:/etc/ssl/certs
      - /etc/ssl/private:/etc/ssl/private
    depends_on:
      - api
      - frontend-es
      - frontend-fr

volumes:
  postgres_data:
```

### Environment Variables per Instance

**Backend (.env) - Same for All Regions**

```env
# Server
NODE_ENV=production
PORT=3001
API_VERSION=v1

# Database (shared)
DB_HOST=postgres-prod
DB_PORT=5432
DB_USER=medicalpro
DB_PASSWORD=secure_password
DB_DIALECT=postgres

# Central database
CENTRAL_DB_NAME=medicalpro_central

# JWT
JWT_SECRET=secure_secret_key_change_this
JWT_REFRESH_SECRET=secure_refresh_secret_key
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d

# Email
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=your-mailgun-user
SMTP_PASSWORD=your-mailgun-password
FROM_EMAIL=noreply@medicalpro.com

# Frontend URLs (handle both regions)
APP_URL=https://medicalpro.com

# CORS (allow both regions)
CORS_ORIGIN=https://es.medicalpro.com,https://fr.medicalpro.com

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/medical-pro-backend/app.log
```

---

## Testing Regions

### Automated Testing

```javascript
// tests/region-detection.test.js
describe('Region Detection', () => {
  describe('Frontend Region Detection', () => {
    it('should detect Spanish region from sub-domain', () => {
      window.location.hostname = 'es.medicalpro.com';
      const region = detectRegion();
      expect(region).toBe('es');
    });

    it('should detect French region from sub-domain', () => {
      window.location.hostname = 'fr.medicalpro.com';
      const region = detectRegion();
      expect(region).toBe('fr');
    });

    it('should use stored region (sticky)', () => {
      localStorage.setItem('medicalpro_region', 'fr');
      const region = detectRegion();
      expect(region).toBe('fr');
    });
  });

  describe('Backend Region Detection', () => {
    it('should detect Spanish region from hostname', () => {
      const req = { hostname: 'es.medicalpro.com', query: {}, user: {} };
      const region = detectRegion(req);
      expect(region).toBe('es');
    });

    it('should detect French region from hostname', () => {
      const req = { hostname: 'fr.medicalpro.com', query: {}, user: {} };
      const region = detectRegion(req);
      expect(region).toBe('fr');
    });

    it('should use query parameter', () => {
      const req = { hostname: 'api.medicalpro.com', query: { region: 'es' }, user: {} };
      const region = detectRegion(req);
      expect(region).toBe('es');
    });
  });
});
```

### Manual Testing

```bash
# Test Spanish instance
curl -H "Host: es.medicalpro.com" http://localhost:3001/health
# Should log: 📍 Request to es.medicalpro.com detected region: ES

# Test French instance
curl -H "Host: fr.medicalpro.com" http://localhost:3001/health
# Should log: 📍 Request to fr.medicalpro.com detected region: FR

# Test with query parameter
curl http://localhost:3001/health?region=es
# Should log: 📍 Request to ... detected region: ES
```

---

## Key Features

### 1. Region Stickiness

Once a user accesses a region instance:
- **Frontend:** Region stored in localStorage
- **Backend:** Region determined from hostname (no user switching)
- **Language:** Fixed per instance (no language selector)

### 2. Language Configuration

- **Spanish Instance (ES):** Spanish UI only (i18n language='es')
- **French Instance (FR):** French UI only (i18n language='fr')
- **No Language Selector:** User can't switch languages within an instance

### 3. Business Rules Isolation

Each region has isolated business rules:
- Tax rates (21% IVA vs 20% TVA)
- Business ID validation (NIF vs SIRET)
- Document formats
- Regulatory requirements

### 4. Data Isolation

- Central database (`medicalpro_central`) shared across regions
- Clinic databases (`medicalpro_clinic_*`) per clinic (isolated)
- No cross-region data access via frontend
- Backend enforces isolation via JWT clinicId

---

## Migration from Single Instance to Multi-Region

If migrating from a single instance:

1. **Build separate frontends:**
   ```bash
   REACT_APP_COUNTRY=ES npm run build  # Spanish
   REACT_APP_COUNTRY=FR npm run build  # French
   ```

2. **Deploy to sub-domains:**
   - Copy Spanish build to `es.medicalpro.com`
   - Copy French build to `fr.medicalpro.com`

3. **Update DNS:** Point sub-domains to production servers

4. **Redirect legacy domain:**
   ```nginx
   server {
     server_name medicalpro.com;
     return 301 https://es.medicalpro.com$request_uri;  # Default to Spanish
   }
   ```

5. **Existing users:**
   - Central database unchanged
   - Clinic databases unchanged
   - Users inherit region from their company's country field

---

## Troubleshooting

### Region Not Detected

**Issue:** App loads with wrong language

**Solution:**
1. Check browser localStorage: `medicalpro_region`
2. Verify hostname: `window.location.hostname`
3. Check backend logs for region detection message
4. Clear localStorage and reload

### Sub-Domain Not Resolving

**Issue:** `es.medicalpro.com` doesn't load

**Solution:**
1. Verify DNS configuration: `nslookup es.medicalpro.com`
2. Check Nginx configuration
3. Verify SSL certificate covers wildcard: `*.medicalpro.com`

### Language Mismatch

**Issue:** Spanish instance shows French

**Solution:**
1. Verify `REACT_APP_COUNTRY` build variable
2. Check i18n.js configuration
3. Clear browser cache and localStorage
4. Rebuild frontend: `REACT_APP_COUNTRY=ES npm run build`

### API Region Mismatch

**Issue:** Backend uses wrong business rules

**Solution:**
1. Check backend logs: "detected region:" message
2. Verify Nginx `X-Forwarded-*` headers
3. Check `Host` header in requests
4. Use query parameter as fallback: `?region=es`

---

## Performance Considerations

### Caching

```nginx
# Cache static assets (same per region)
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}

# Don't cache HTML (region-specific)
location ~* \.html$ {
  expires 0;
  add_header Cache-Control "public, no-cache, must-revalidate";
}
```

### Database

- Single PostgreSQL instance (central + clinic DBs)
- No region-specific database needed
- Region affects business logic only (not data structure)

### CDN Configuration

```javascript
// For CDN (Cloudflare, AWS CloudFront, etc.)
// Route based on sub-domain
// - es.medicalpro.com → Spanish bucket/origin
// - fr.medicalpro.com → French bucket/origin
// - Backend API → Single origin with Host-based routing
```

---

## Scaling

### Horizontal Scaling

```
Load Balancer
├── Spanish Frontend Pool (multiple instances)
├── French Frontend Pool (multiple instances)
└── Backend API Pool (shared, region-agnostic)
    └── Shared PostgreSQL Database
```

### Geographic Distribution

```
Global CDN (Cloudflare, Akamai)
├── es.medicalpro.com → Edge servers in Spain
├── fr.medicalpro.com → Edge servers in France
└── api.medicalpro.com → Origin servers (single location)
```

---

## Security Considerations

### 1. Region Isolation

✅ No cross-region clinic data access (JWT enforced)
✅ Language isolation prevents UI manipulation
✅ Business rules isolated (NIF vs SIRET validation)

### 2. SSL/TLS

✅ Wildcard certificate covers all sub-domains
✅ HSTS enabled for HTTPS enforcement
✅ Certificate transparency logs for monitoring

### 3. CORS

✅ CORS configured per frontend origin
✅ Credentials required for cross-origin requests
✅ API validates region from request context

---

## Documentation References

- **Region Detector (Frontend):** `/var/www/medical-pro/src/utils/regionDetector.js`
- **Region Detector (Backend):** `/var/www/medical-pro-backend/src/utils/regionDetector.js`
- **i18n Configuration:** `/var/www/medical-pro/src/i18n.js`
- **App Context:** `/var/www/medical-pro/src/App.js`
- **Server Middleware:** `/var/www/medical-pro-backend/server.js`
- **Multi-Country Infrastructure:** `/var/www/medical-pro/MULTI_COUNTRY_INFRASTRUCTURE.md`

---

**Last Updated:** 2025-11-09
**Status:** Production Ready
**Supported Regions:** Spain (ES), France (FR)
