# 🚀 CI/CD Automation Guide - Multi-Country Frontend

Guide complet pour automatiser la construction et le déploiement des frontends ES et FR.

---

## 📋 Vue d'ensemble

Ce système automatise:

1. **Construction** - Build les frontends ES et FR automatiquement
2. **Tests** - Lance les tests avant déploiement
3. **Déploiement** - Déploie automatiquement en production
4. **Notifications** - Alerte sur l'état du déploiement

---

## 🎯 Deux Approches

### Approche 1: GitHub Actions (RECOMMANDÉE)

Avantages:
- ✅ Gratuit avec GitHub
- ✅ Intégré à GitHub
- ✅ Pas de configuration supplémentaire
- ✅ Logs visibles dans le UI

### Approche 2: Script Bash Local

Avantages:
- ✅ Fonctionne partout
- ✅ Total contrôle
- ✅ Pas de dépendance à GitHub

---

## 📝 APPROCHE 1: GitHub Actions

### Étape 1: Configurer les Secrets GitHub

Les secrets permettent de stocker les credentials de déploiement en toute sécurité.

**Via le Web GitHub:**

1. Allez sur: `https://github.com/YOUR_ACCOUNT/medical-pro/settings/secrets/actions`

2. Créez ces secrets (clique `New repository secret`):

```
DEPLOY_HOST        = your-production-server.com
DEPLOY_USER        = deploy-user (ou root)
DEPLOY_PATH_ES     = /var/www/medical-pro-es
DEPLOY_PATH_FR     = /var/www/medical-pro-fr
DEPLOY_KEY         = (contenu de votre clé SSH privée)
```

### Où générer la Clé SSH

**Sur votre serveur de production:**

```bash
# 1. Créer une clé SSH pour les déploiements
ssh-keygen -t ed25519 -f ~/.ssh/github-deploy -N "" -C "github-deploy"

# 2. Autoriser la clé
cat ~/.ssh/github-deploy.pub >> ~/.ssh/authorized_keys

# 3. Afficher la clé privée
cat ~/.ssh/github-deploy

# 4. Copier le contenu complet dans GitHub secret DEPLOY_KEY
```

### Étape 2: Le Workflow s'Exécute Automatiquement

**Déclencheurs:**
- ✅ Chaque `push` sur `master` ou `develop`
- ✅ Chaque `pull request`
- ✅ Modification des fichiers `src/`, `package.json`, etc.
- ✅ Déclenchement manuel (onglet Actions)

**Flux Automatique:**

```
1. Code push sur master
   ↓
2. GitHub détecte le changement
   ↓
3. Lance le workflow (build-and-deploy.yml)
   ↓
4. Build ES Frontend (REACT_APP_COUNTRY=ES)
   ↓
5. Build FR Frontend (REACT_APP_COUNTRY=FR)
   ↓
6. Lance les tests
   ↓
7. Déploie sur production (si master)
   ↓
8. Recharge Nginx
   ↓
9. Notification du résultat
```

### Monitoring des Déploiements

**Voir le statut:**

1. Allez sur l'onglet **Actions** du repo
2. Voir les workflows en cours d'exécution
3. Cliquer pour voir les logs détaillés
4. Les builds prennent ~3-5 minutes

**Voir les logs d'un job spécifique:**

```
Actions → workflow → job → voir les logs
```

---

## 📝 APPROCHE 2: Script Bash Local

Pour les déploiements manuels ou non-GitHub.

### Installation

```bash
# Le script est déjà dans:
/var/www/medical-pro/scripts/deploy-multi-country.sh

# Vérifier qu'il est exécutable
ls -lh scripts/deploy-multi-country.sh
```

### Usage

#### Mode Développement (Local)

```bash
# Test sec - voir ce qui se passerait
./scripts/deploy-multi-country.sh --local --dry-run

# Déploiement réel local
./scripts/deploy-multi-country.sh --local
```

Cela crée:
- `/var/www/medical-pro-es/` - Build ES local
- `/var/www/medical-pro-fr/` - Build FR local

#### Mode Production (Avec SSH)

**Configuration SSH requise:**

```bash
# 1. Exporter les variables de déploiement
export DEPLOY_HOST="your-server.com"
export DEPLOY_USER="deploy-user"
export DEPLOY_PATH_ES="/var/www/es-build"
export DEPLOY_PATH_FR="/var/www/fr-build"

# 2. Configurer la clé SSH
ssh-add ~/.ssh/github-deploy

# 3. Test sec
./scripts/deploy-multi-country.sh --production --dry-run

# 4. Déploiement réel
./scripts/deploy-multi-country.sh --production
```

#### Options du Script

```bash
# Voir l'aide complète
./scripts/deploy-multi-country.sh --help

# Sauter les tests (plus rapide)
./scripts/deploy-multi-country.sh --skip-tests

# Sauter la compilation (réutilise build/ existant)
./scripts/deploy-multi-country.sh --skip-build

# Combinaisons
./scripts/deploy-multi-country.sh --production --skip-tests --dry-run
```

#### Logs de Déploiement

```bash
# Chaque exécution crée un log
tail -f /tmp/deploy_*.log

# Ou voir le dernier
cat /tmp/deploy_*.log | tail -100
```

---

## ⚙️ Configuration du Serveur Production

### Structure de Fichiers Recommandée

```
/var/www/
├── medical-pro-es/          # Frontend ES build
│   ├── index.html
│   ├── static/
│   └── ...
├── medical-pro-fr/          # Frontend FR build
│   ├── index.html
│   ├── static/
│   └── ...
└── medical-pro-backend/     # Backend Node.js
    ├── src/
    ├── server.js
    └── package.json
```

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/medical-pro

# ES Frontend
server {
    server_name es.medicalpro.com;
    listen 443 ssl http2;

    ssl_certificate /etc/ssl/certs/medicalpro.crt;
    ssl_certificate_key /etc/ssl/private/medicalpro.key;

    root /var/www/medical-pro-es;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# FR Frontend
server {
    server_name fr.medicalpro.com;
    listen 443 ssl http2;

    ssl_certificate /etc/ssl/certs/medicalpro.crt;
    ssl_certificate_key /etc/ssl/private/medicalpro.key;

    root /var/www/medical-pro-fr;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# HTTP redirect
server {
    server_name es.medicalpro.com fr.medicalpro.com;
    listen 80;
    return 301 https://$server_name$request_uri;
}
```

### Permissions de Fichiers

```bash
# Sur le serveur de production
sudo chown -R www-data:www-data /var/www/medical-pro-es
sudo chown -R www-data:www-data /var/www/medical-pro-fr
sudo chmod -R 755 /var/www/medical-pro-es
sudo chmod -R 755 /var/www/medical-pro-fr

# Permettre à l'utilisateur SSH de déployer
sudo usermod -aG www-data deploy-user
```

### Autoriser Sudoers pour Nginx

```bash
# Pour permettre au script de recharger Nginx
sudo visudo

# Ajouter cette ligne:
deploy-user ALL=(ALL) NOPASSWD: /bin/systemctl reload nginx
```

---

## 🔄 Flux de Travail Complet

### Développement

```bash
# 1. Développer localement
cd /var/www/medical-pro
REACT_APP_COUNTRY=ES npm start  # Test ES

# 2. Committer et pousser
git add .
git commit -m "feat: Nouvelle fonctionnalité"
git push origin feature-branch

# 3. Créer une Pull Request
# → GitHub Actions lance les tests automatiquement
# → Voir les logs dans l'onglet Actions
```

### Avant Merge en Master

```bash
# Vérifier que tous les tests passent dans GitHub Actions
# Vérifier les logs de build ES et FR
# Approuver et merger la PR
```

### Après Merge en Master

```bash
# GitHub Actions détecte le push sur master
# ✅ Build ES Frontend
# ✅ Build FR Frontend
# ✅ Teste les deux
# ✅ Déploie en production
# ✅ Recharge Nginx
# ✅ Les changements sont LIVE sur es.medicalpro.com et fr.medicalpro.com
```

---

## 📊 Monitoring et Alertes

### Voir l'État des Déploiements

**Via GitHub Actions UI:**

```
Actions → build-and-deploy → voir le dernier run
```

### Ajouter des Notifications Slack

Vous pouvez ajouter des notifications Slack au workflow:

```yaml
- name: Notify Slack
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "Deployment Complete: es.medicalpro.com & fr.medicalpro.com"
      }
```

### Ajouter des Notifications Email

```yaml
- name: Notify Email
  if: failure()
  uses: davismattick/action-send-email@v1
  with:
    server_address: smtp.gmail.com
    server_port: 465
    username: ${{ secrets.EMAIL_USERNAME }}
    password: ${{ secrets.EMAIL_PASSWORD }}
    subject: "Deployment Failed"
    to: "ops@medicalpro.com"
    from: "ci@medicalpro.com"
```

---

## 🐛 Dépannage

### Le déploiement échoue avec "Permission denied"

```bash
# Vérifier la clé SSH
ssh-keyscan -H your-server.com >> ~/.ssh/known_hosts

# Vérifier les permissions
stat ~/.ssh/github-deploy  # doit être 600

# Tester la connexion
ssh -i ~/.ssh/github-deploy deploy-user@your-server.com "ls -la /var/www/"
```

### Build échoue avec "npm: command not found"

```bash
# Dans le workflow, vérifier que Node est installé
# Le workflow utilise ubuntu-latest avec Node 18
# Sinon ajouter manuellement:
- uses: actions/setup-node@v4
  with:
    node-version: 18
```

### Les fichiers statiques ne se chargent pas

```bash
# Vérifier dans Nginx que /api/ est proxifiée correctement
# Les fichiers statiques viennent de /var/www/medical-pro-es/
# Les requêtes /api/ vont au backend sur :3001

# Tester
curl https://es.medicalpro.com/index.html  # doit retourner HTML
curl https://es.medicalpro.com/api/v1/health  # doit aller au backend
```

### Nginx ne reload pas après déploiement

```bash
# Vérifier les permissions sudoers
sudo visudo
# Voir si la ligne est présente:
# deploy-user ALL=(ALL) NOPASSWD: /bin/systemctl reload nginx

# Tester manuellement
sudo systemctl reload nginx
```

---

## 📈 Évolutions Futures

### Ajouter des Environnements

```yaml
# Ajouter un stage "staging"
- name: Deploy to Staging (develop branch)
  if: github.ref == 'refs/heads/develop'
  # Deploy à es-staging.medicalpro.com, fr-staging.medicalpro.com

- name: Deploy to Production (master branch)
  if: github.ref == 'refs/heads/master'
  # Deploy à es.medicalpro.com, fr.medicalpro.com
```

### Ajouter des Tests Automatiques

```yaml
- name: Run E2E Tests
  run: npm run test:e2e

- name: Run Visual Regression Tests
  run: npm run test:visual
```

### Ajouter Analytics de Déploiement

```yaml
- name: Report Deployment
  run: |
    curl -X POST https://analytics.example.com/deploy \
      -H "Content-Type: application/json" \
      -d '{
        "version": "${{ github.sha }}",
        "timestamp": "'$(date -u +'%Y-%m-%dT%H:%M:%SZ')'",
        "environments": ["es.medicalpro.com", "fr.medicalpro.com"]
      }'
```

---

## ✅ Checklist de Mise en Place

- [ ] Créer les secrets GitHub (DEPLOY_HOST, DEPLOY_USER, DEPLOY_KEY, etc.)
- [ ] Configurer l'accès SSH au serveur
- [ ] Configurer Nginx selon le template fourni
- [ ] Créer les répertoires de build (`/var/www/medical-pro-es/`, `/var/www/medical-pro-fr/`)
- [ ] Vérifier les permissions de fichiers
- [ ] Configurer sudoers pour Nginx reload
- [ ] Faire un premier déploiement via GitHub Actions
- [ ] Vérifier que es.medicalpro.com et fr.medicalpro.com sont en ligne
- [ ] Ajouter des notifications (Slack, Email, etc.)
- [ ] Documenter pour l'équipe

---

## 📞 Support

Pour des questions:

1. Vérifier les logs: `Actions` → `build-and-deploy` → voir les erreurs
2. Vérifier les logs de déploiement: `/tmp/deploy_*.log`
3. Vérifier les logs Nginx: `/var/log/nginx/error.log`
4. SSH sur le serveur et vérifier les fichiers sont présents

---

**Dernier update:** 2025-11-10
**Status:** Production Ready
