# 🧪 FacturePro - Procédure de Test des Évolutions

*Dernière mise à jour : 23 septembre 2024*

---

## 🎯 **Vue d'Ensemble Testing**

### **🏗️ Architecture Actuelle**
```
FacturePro Testing Stack:
├── Frontend (React)
│   ├── Jest + React Testing Library
│   ├── Tests unitaires composants
│   └── Tests d'intégration UI
├── Backend (Node.js + Express)
│   ├── Jest + Supertest
│   ├── Tests API endpoints
│   └── Tests base de données
└── End-to-End
    ├── Tests manuels complets
    └── Validation métier
```

---

## 🚀 **Procédure de Test Standard**

### **Phase 1 : Tests Backend**

#### **1.1 Démarrage Environnement**
```bash
# Terminal 1 - Backend
cd /var/www/facture-pro-backend
npm run dev

# Vérification santé
curl http://localhost:3001/health
```

#### **1.2 Tests API Endpoints**
```bash
# Suite de tests backend
npm test

# Tests avec couverture
npm run test:coverage

# Tests en mode watch (développement)
npm run test:watch
```

#### **1.3 Tests Manuels API**
```bash
# 1. Authentification
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@facturepro.com","password":"demo123"}'

# 2. Récupérer token pour les tests suivants
export TOKEN="eyJhbGciOiJIUzI1NiIs..."

# 3. Test CRUD Clients
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/clients

# 4. Test Validation SIRET
curl -X POST http://localhost:3001/api/v1/validation/siret \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"siret":"12345678901234"}'

# 5. Test Validation NIF
curl -X POST http://localhost:3001/api/v1/validation/nif \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nif":"B12345674"}'
```

### **Phase 2 : Tests Frontend**

#### **2.1 Démarrage Application**
```bash
# Terminal 2 - Frontend
cd /var/www/facture-pro
npm start

# Application disponible sur http://localhost:3000
```

#### **2.2 Tests Unitaires React**
```bash
# Tests composants
npm test

# Tests en mode watch
npm test -- --watch

# Tests avec couverture
npm test -- --coverage --verbose
```

#### **2.3 Tests Visuels Manuel**
**Checklist Navigation :**
- [ ] Dashboard charge correctement
- [ ] Module Clients accessible
- [ ] Module Factures accessible
- [ ] Module Devis accessible
- [ ] Statistiques affichées
- [ ] Aucune erreur console

### **Phase 3 : Tests d'Intégration**

#### **3.1 Test Complet Frontend + Backend**
```bash
# Pré-requis : Backend ET Frontend démarrés

# Scenario de test complet :
# 1. Navigation dashboard
# 2. Création client avec validation SIRET
# 3. Création facture pour ce client
# 4. Génération PDF
# 5. Création devis
# 6. Conversion devis → facture
```

#### **3.2 Test Performance**
```bash
# Test charge backend
ab -n 100 -c 10 http://localhost:3001/health

# Test mémoire frontend (Chrome DevTools)
# - Onglet Performance
# - Onglet Memory
# - Lighthouse audit
```

---

## ✅ **Checklist Validation Évolution**

### **🔧 Tests Techniques**

#### **Backend API**
- [ ] `GET /health` retourne 200 OK
- [ ] `POST /api/v1/auth/login` avec credentials valides
- [ ] `GET /api/v1/clients` avec token valide
- [ ] `POST /api/v1/clients` création réussie
- [ ] `PUT /api/v1/clients/:id` modification réussie
- [ ] `DELETE /api/v1/clients/:id` suppression réussie
- [ ] `POST /api/v1/validation/siret` validation française
- [ ] `POST /api/v1/validation/nif` validation espagnole
- [ ] Gestion erreurs 401, 403, 404, 500
- [ ] Rate limiting fonctionnel

#### **Frontend React**
- [ ] `npm start` démarre sans erreur
- [ ] `npm test` passe tous les tests
- [ ] `npm run build` compile sans erreur
- [ ] Aucune erreur console browser
- [ ] Navigation entre modules fluide
- [ ] LocalStorage sauvegarde données
- [ ] Responsive design mobile/desktop
- [ ] Accessibility (a11y) basique

#### **Base de Données**
- [ ] Connexion PostgreSQL établie
- [ ] Tables créées avec schema correct
- [ ] Contraintes métier respectées
- [ ] Index performance en place
- [ ] Données demo insérées
- [ ] Backup/restore possible

### **👤 Tests Fonctionnels**

#### **Gestion Clients**
- [ ] Créer client entreprise avec SIRET
- [ ] Créer client particulier
- [ ] Modifier client existant
- [ ] Supprimer client (soft delete)
- [ ] Recherche clients par nom/email
- [ ] Filtrage par type (entreprise/particulier)
- [ ] Validation SIRET temps réel
- [ ] Statistiques clients correctes

#### **Gestion Factures**
- [ ] Créer facture pour client existant
- [ ] Ajouter/modifier/supprimer items
- [ ] Calcul automatique TTC/TVA
- [ ] Génération numéro automatique
- [ ] Changement statut (brouillon → envoyée → payée)
- [ ] Génération PDF conforme
- [ ] Duplication facture
- [ ] Statistiques CA correctes

#### **Gestion Devis**
- [ ] Créer devis avec items
- [ ] Conversion devis → facture
- [ ] Gestion dates validité
- [ ] Calculs identiques factures
- [ ] Numérotation cohérente
- [ ] PDF devis conforme

### **🔐 Tests Sécurité**

#### **Authentification**
- [ ] JWT tokens générés correctement
- [ ] Refresh token fonctionnel
- [ ] Expiration tokens respectée
- [ ] Logout invalide tokens
- [ ] Protection routes sensibles

#### **Permissions**
- [ ] Admin : accès complet
- [ ] User : accès limité conforme
- [ ] Readonly : consultation seule
- [ ] Multi-tenant isolation données
- [ ] Validation permissions côté API

### **⚡ Tests Performance**

#### **Métriques Cibles**
- [ ] Démarrage backend < 10s
- [ ] Authentification < 100ms
- [ ] CRUD operations < 200ms
- [ ] Validation SIRET < 3s
- [ ] Génération PDF < 5s
- [ ] Chargement frontend < 3s
- [ ] Navigation modules < 1s

---

## 🚨 **Procédure Cas d'Erreur**

### **Backend Non-Fonctionnel**
```bash
# 1. Vérifier PostgreSQL
sudo systemctl status postgresql
sudo systemctl restart postgresql

# 2. Vérifier logs application
tail -f /var/www/facture-pro-backend/logs/app.log

# 3. Vérifier variables environnement
cat /var/www/facture-pro-backend/.env

# 4. Redémarrer proprement
npm run dev
```

### **Frontend Erreurs**
```bash
# 1. Vérifier node_modules
rm -rf node_modules package-lock.json
npm install

# 2. Clear cache React
npm start -- --reset-cache

# 3. Vérifier erreurs console
# Chrome DevTools > Console > Errors
```

### **Base de Données Issues**
```bash
# 1. Reset complet schema
PGPASSWORD=facturepro2024 psql -h localhost -U facturepro -d facturepro \
  -f migrations/001_initial_schema.sql

# 2. Vérifier permissions
PGPASSWORD=facturepro2024 psql -h localhost -U facturepro -d facturepro \
  -c "SELECT version();"

# 3. Reset mot de passe demo
PGPASSWORD=facturepro2024 psql -h localhost -U facturepro -d facturepro \
  -c "UPDATE users SET password_hash = '$2a$12$eD.0/PcDRsU9AosmyOUm4uWOlivtRKAiTo5DqLIJjm6O5FVOUPzNG' WHERE email = 'admin@facturepro.com';"
```

---

## 📊 **Reporting Tests**

### **✅ Format Validation Évolution**
```markdown
## Test Report - [Nom Evolution] - [Date]

### Backend API
- ✅ Health check: OK
- ✅ Authentication: OK
- ✅ CRUD endpoints: OK
- ✅ Validation services: OK
- ❌ Issue: [description]

### Frontend React
- ✅ Compilation: OK
- ✅ Unit tests: 15/15 passed
- ✅ Navigation: OK
- ✅ No console errors: OK

### Integration
- ✅ Frontend ↔ Backend: OK
- ✅ Performance: <2s all actions
- ✅ Database persistence: OK

### Regression Tests
- ✅ Existing features intact: OK
- ✅ Data integrity: OK
- ✅ User experience: OK

### Deployment Ready: ✅ YES / ❌ NO
```

---

## 🎯 **Tests Automatisés (Futurs)**

### **CI/CD Pipeline Proposé**
```yaml
# .github/workflows/test.yml (exemple)
name: FacturePro Tests
on: [push, pull_request]
jobs:
  backend:
    - Setup PostgreSQL
    - Install dependencies
    - Run Jest tests
    - Check API endpoints
  frontend:
    - Install dependencies
    - Run React tests
    - Build production
    - Lighthouse audit
  integration:
    - Start backend + frontend
    - Run E2E tests
    - Performance tests
```

### **Tools Recommandés**
- **Backend**: Jest + Supertest + Istanbul
- **Frontend**: Jest + React Testing Library + MSW
- **E2E**: Playwright ou Cypress
- **Performance**: Lighthouse CI + WebPageTest
- **Security**: OWASP ZAP + Snyk

---

**Procédure complète pour valider toute évolution FacturePro ! 🎯**

*Adapter selon les évolutions spécifiques et criticité des changements.*