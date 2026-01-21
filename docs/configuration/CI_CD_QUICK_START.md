# ⚡ CI/CD Quick Start (5 Minutes)

Guide ultra-rapide pour automatiser les déploiements multi-pays.

---

## 🎯 En 3 Étapes

### Étape 1: Configure GitHub Secrets (2 min)

1. Va sur: `github.com/YOUR_REPO/settings/secrets/actions`
2. Crée 5 secrets:

```
DEPLOY_HOST       = your-server.com
DEPLOY_USER       = deploy-user
DEPLOY_KEY        = (ta clé SSH privée)
DEPLOY_PATH_ES    = /var/www/medical-pro-es
DEPLOY_PATH_FR    = /var/www/medical-pro-fr
```

### Étape 2: Prépare ton Serveur (2 min)

```bash
# Sur ton serveur production (une seule fois)
sudo curl -sSL https://raw.githubusercontent.com/YOUR_REPO/medical-pro/master/scripts/setup-production-server.sh | sudo bash

# Suis les instructions finales
```

### Étape 3: Pousse du Code (1 min)

```bash
# Localement
git push origin master

# C'est tout! GitHub Actions fait le reste:
# ✅ Build ES
# ✅ Build FR
# ✅ Teste
# ✅ Déploie
# ✅ Recharge Nginx
```

---

## 📊 Workflow Automatique

```
COMMIT sur master
      ↓
GitHub Actions démarre
      ↓
Teste: npm test
      ↓
Build: REACT_APP_COUNTRY=ES npm run build
      ↓
Build: REACT_APP_COUNTRY=FR npm run build
      ↓
SSH Upload ES → /var/www/medical-pro-es/
      ↓
SSH Upload FR → /var/www/medical-pro-fr/
      ↓
SSH: sudo systemctl reload nginx
      ↓
✅ LIVE: es.medicalpro.com et fr.medicalpro.com
```

**Temps total: ~5 minutes**

---

## 🔍 Vérifier le Statut

### Voir les logs de déploiement

```
GitHub Actions → build-and-deploy → cliquer sur le job
```

### Voir la dernière erreur

```
Actions → build-and-deploy → voir le run échoué → logs
```

### Tester localement avant de pousher

```bash
# Test ES (même que ce qui sera déployé)
REACT_APP_COUNTRY=ES npm run build

# Vérifier que index.html existe
ls -la build/index.html
```

---

## 📋 Fichiers Créés

| Fichier | Utilité |
|---------|---------|
| `.github/workflows/build-and-deploy.yml` | Workflow GitHub Actions |
| `scripts/deploy-multi-country.sh` | Déploiement manuel |
| `scripts/setup-production-server.sh` | Configuration serveur |
| `CI_CD_AUTOMATION_GUIDE.md` | Doc complète |
| `.deploy-config.example` | Config template |

---

## 🆘 Problèmes Courants

### Erreur: "Permission denied" en SSH

```bash
# Ajouter la clé
ssh-add ~/.ssh/github-deploy

# Tester
ssh -i ~/.ssh/github-deploy user@server.com "ls -la"
```

### Erreur: "npm not found"

```bash
# Vérifier Node est installé sur le serveur
node --version

# Si non:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt-get install -y nodejs
```

### Erreur: "systemctl: command not found"

```bash
# Le script utilise sudo, vérifier les sudoers
sudo visudo

# Doit contenir:
# deploy-user ALL=(ALL) NOPASSWD: /bin/systemctl reload nginx
```

---

## ✅ Checklist de Production

- [ ] GitHub secrets configurés (DEPLOY_HOST, DEPLOY_USER, DEPLOY_KEY)
- [ ] Serveur configuré (script setup-production-server.sh exécuté)
- [ ] Nginx configuré avec SSL (certbot)
- [ ] Domaines pointent vers le serveur (DNS)
- [ ] Premier déploiement réussi (voir Actions)
- [ ] es.medicalpro.com en ligne et en español
- [ ] fr.medicalpro.com en ligne et en français

---

## 📚 Documentation Complète

Pour plus de détails:
- `CI_CD_AUTOMATION_GUIDE.md` - Guide complet
- `scripts/deploy-multi-country.sh --help` - Options du script
- `.github/workflows/build-and-deploy.yml` - Configuration GitHub Actions

---

## 🚀 C'est Prêt!

À partir de maintenant, chaque fois que tu fais un commit sur `master`:

1. Le code se construit automatiquement
2. Les tests s'exécutent
3. Le ES et FR se déploient
4. Nginx recharge
5. Les changements sont LIVE en ~5 minutes

Plus besoin de faire `npm run build` manuellement ou de faire un `rsync`!

---

**Besoin d'aide?**
- Voir les logs: `Actions` → `build-and-deploy`
- Tester localement: `REACT_APP_COUNTRY=ES npm run build`
- Questions: Consulte `CI_CD_AUTOMATION_GUIDE.md`
