# 🔐 FacturePro Backend - Guide d'Accès

*Dernière mise à jour : 23 septembre 2024*

---

## 🚀 **Configuration Système**

### **🗄️ Base de Données PostgreSQL**
```bash
Host: localhost
Port: 5432
Database: facturepro
User: facturepro
Password: facturepro2024
```

### **🌐 Écosystème URLs**
```bash
# Backend API (commun)
URL: http://localhost:3001
Health: http://localhost:3001/health
API Base: http://localhost:3001/api/v1

# Business App (utilisateurs métier)
URL: http://localhost:3000
Login: admin@facturepro.com

# Admin Portal (super admin)
URL: http://localhost:3002
Login: superadmin@facturepro.com

Environment: development
```

---

## 🔑 **Comptes d'Accès Demo**

### **👑 Super Administrateur (Admin Portal)**
```json
{
  "email": "superadmin@facturepro.com",
  "password": "demo123",
  "role": "super_admin",
  "permissions": "global_system_access",
  "url": "http://localhost:3002"
}
```

### **👤 Administrateur Entreprise (Business App)**
```json
{
  "email": "admin@facturepro.com",
  "password": "demo123",
  "role": "admin",
  "permissions": "company_full_access",
  "url": "http://localhost:3000"
}
```

### **🏢 Entreprise Demo**
```json
{
  "name": "FacturePro Demo SAS",
  "country": "FR",
  "siret": "12345678901234",
  "vat_number": "FR12345678901",
  "address": {
    "street": "123 Rue de la Paix",
    "city": "Paris",
    "postalCode": "75001",
    "country": "France"
  }
}
```

---

## ⚡ **Démarrage Rapide**

### **1. Démarrer l'Écosystème Complet**
```bash
# Terminal 1 - Backend API
cd /var/www/facture-pro-backend
npm run dev
# → http://localhost:3001

# Terminal 2 - Business App
cd /var/www/facture-pro
npm start
# → http://localhost:3000

# Terminal 3 - Admin Portal
cd /var/www/facture-pro-admin-manual
npm install && npm start
# → http://localhost:3002
```

### **2. Vérifier la Santé Backend**
```bash
curl http://localhost:3001/health
```

**Réponse attendue :**
```json
{
  "status": "OK",
  "timestamp": "2025-09-23T13:13:04.432Z",
  "version": "1.0.0",
  "environment": "development"
}
```

### **3. Test Authentifications**

#### **Business User**
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@facturepro.com","password":"demo123"}'
```

#### **Super Admin**
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@facturepro.com","password":"demo123"}'
```

**Réponse attendue :**
```json
{
  "success": true,
  "data": {
    "user": { "role": "super_admin" },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": "24h"
    }
  }
}
```

---

## 🔧 **Endpoints API Principaux**

### **🔐 Authentification**
```bash
POST /api/v1/auth/login       # Connexion
POST /api/v1/auth/refresh     # Renouveler token
GET  /api/v1/auth/me          # Profil utilisateur
```

### **👥 Gestion Clients**
```bash
GET    /api/v1/clients        # Liste clients
POST   /api/v1/clients        # Créer client
PUT    /api/v1/clients/:id    # Modifier client
DELETE /api/v1/clients/:id    # Supprimer client
```

### **📄 Gestion Factures**
```bash
GET    /api/v1/invoices       # Liste factures
POST   /api/v1/invoices       # Créer facture
PUT    /api/v1/invoices/:id   # Modifier facture
DELETE /api/v1/invoices/:id   # Supprimer facture
```

### **📋 Gestion Devis**
```bash
GET    /api/v1/quotes         # Liste devis
POST   /api/v1/quotes         # Créer devis
PUT    /api/v1/quotes/:id     # Modifier devis
POST   /api/v1/quotes/:id/convert # Convertir en facture
```

### **✅ Validation Métier**
```bash
POST /api/v1/validation/siret # Valider SIRET français
POST /api/v1/validation/nif   # Valider NIF espagnol
POST /api/v1/validation/vat   # Valider numéro TVA
```

### **🛡️ Administration (Super Admin)**
```bash
GET  /api/v1/admin/dashboard     # Dashboard global
GET  /api/v1/admin/companies     # Gestion companies
POST /api/v1/admin/companies     # Créer company
GET  /api/v1/admin/users         # Gestion users
POST /api/v1/admin/users         # Créer user
PUT  /api/v1/admin/users/:id     # Modifier user/permissions
```

---

## 🛠️ **Administration Base de Données**

### **🔍 Commandes Utiles**
```bash
# Connexion PostgreSQL
PGPASSWORD=facturepro2024 psql -h localhost -U facturepro -d facturepro

# Lister les tables
\dt

# Voir les utilisateurs
SELECT email, role FROM users;

# Voir les entreprises
SELECT name, country, business_number FROM companies;
```

### **🔄 Reset Demo Data**
```sql
-- Remettre le mot de passe demo
UPDATE users
SET password_hash = '$2a$12$eD.0/PcDRsU9AosmyOUm4uWOlivtRKAiTo5DqLIJjm6O5FVOUPzNG'
WHERE email = 'admin@facturepro.com';
```

---

## 🎯 **Permissions Système**

### **👑 Admin (Accès Complet)**
```javascript
{
  dashboard: { read: true, write: true },
  clients: { read: true, write: true, delete: true },
  invoices: { read: true, write: true, delete: true },
  quotes: { read: true, write: true, delete: true },
  analytics: { read: true, write: true },
  settings: { read: true, write: true },
  users: { read: true, write: true, delete: true }
}
```

### **👤 User (Accès Limité)**
```javascript
{
  dashboard: { read: true, write: false },
  clients: { read: true, write: true, delete: false },
  invoices: { read: true, write: true, delete: false },
  quotes: { read: true, write: true, delete: false },
  analytics: { read: true, write: false },
  settings: { read: true, write: false },
  users: { read: false, write: false, delete: false }
}
```

### **👁️ Readonly (Consultation)**
```javascript
{
  dashboard: { read: true, write: false },
  clients: { read: true, write: false, delete: false },
  invoices: { read: true, write: false, delete: false },
  quotes: { read: true, write: false, delete: false },
  analytics: { read: true, write: false },
  settings: { read: false, write: false },
  users: { read: false, write: false, delete: false }
}
```

---

## 🔍 **Monitoring & Debug**

### **📊 Logs Application**
```bash
# Logs en temps réel
tail -f /var/www/facture-pro-backend/logs/app.log

# Logs PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-16-main.log
```

### **🔧 Troubleshooting**
```bash
# Redémarrer PostgreSQL
sudo systemctl restart postgresql

# Vérifier les ports
sudo netstat -tlnp | grep :3001
sudo netstat -tlnp | grep :5432

# Tester la base
PGPASSWORD=facturepro2024 psql -h localhost -U facturepro -d facturepro -c "SELECT version();"
```

---

## 🚀 **Prochaines Étapes**

### **🔗 Intégration Frontend**
1. **Adapter les appels API** : Remplacer localStorage par fetch
2. **Gestion tokens JWT** : Auto-refresh et stockage sécurisé
3. **Interface validation** : SIRET/NIF en temps réel
4. **Migration données** : localStorage → PostgreSQL

### **📈 Optimisations**
1. **Cache Redis** : Performance queries répétées
2. **Rate limiting** : Protection API
3. **Monitoring** : Métriques et alertes
4. **Tests automatisés** : Coverage 80%+

---

**Backend FacturePro opérationnel et prêt pour l'intégration ! 🎯**