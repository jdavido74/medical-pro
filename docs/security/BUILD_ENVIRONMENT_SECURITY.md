# Sécurité des builds frontend — Séparation dev/prod

*Dernière mise à jour : 2026-02-24*

---

## Problème identifié

Les variables d'environnement React (`REACT_APP_*`) sont **embarquées en dur** dans le bundle JS au moment du `npm run build` (CRA ne les lit pas au runtime).

Le fichier `.env` contient les valeurs de développement local :
```
REACT_APP_API_BASE_URL=http://localhost:3001/api/v1
```

Si un build est effectué depuis l'environnement de développement (WSL) et déployé manuellement en production, le JS résultant contient `localhost:3001`. La CSP nginx (`connect-src 'self'`) bloque ces requêtes → **l'application est inaccessible**.

### Impact
- **Sévérité** : Critique (application inutilisable)
- **Données exposées** : Aucune (CSP bloque la requête avant envoi)
- **Détection** : L'utilisateur voit "Failed to fetch" / violation CSP dans la console

---

## Solution : séparation des fichiers d'environnement

### Architecture cible

```
/var/www/medical-pro/
├── .env.development    # Dev local uniquement (npm start)
├── .env.production     # Build de production (npm run build)
├── .env.test           # Tests (optionnel)
└── .gitignore          # .env.local ignoré, .env.development et .env.production commités
```

### Comportement CRA

| Commande         | Fichiers chargés (par priorité)                 |
|------------------|--------------------------------------------------|
| `npm start`      | `.env.development.local` > `.env.development` > `.env.local` > `.env` |
| `npm run build`  | `.env.production.local` > `.env.production` > `.env.local` > `.env`   |
| `npm test`       | `.env.test.local` > `.env.test` > `.env.local` > `.env`              |

**Important** : `.env.local` est toujours ignoré en mode test. `.env` est le fallback universel.

### Fichiers à créer

**`.env.development`** (valeurs dev, commité dans git) :
```bash
# Développement local
REACT_APP_COUNTRY=ES
REACT_APP_ENV=development
REACT_APP_API_BASE_URL=http://localhost:3001/api/v1
REACT_APP_API_TIMEOUT=30000
```

**`.env.production`** (valeurs prod, commité dans git — pas de secret) :
```bash
# Production — URLs relatives, proxy nginx
REACT_APP_COUNTRY=ES
REACT_APP_ENV=production
REACT_APP_API_BASE_URL=/api/v1
REACT_APP_API_TIMEOUT=30000
```

**`.env`** à supprimer ou vider (pour forcer l'usage des fichiers spécifiques).

### Pourquoi commiter `.env.production` ?

Les variables `REACT_APP_*` ne contiennent **aucun secret** — elles sont visibles dans le JS du navigateur. Le fichier `.env.production` ne contient que des paramètres de configuration publics (URLs relatives, nom du pays, timeouts). Le commiter garantit que tout build de production utilise les bonnes valeurs, que ce soit via CI/CD ou en local.

---

## Guard post-build dans CI/CD

Ajouter dans `.github/workflows/build-and-deploy.yml`, après l'étape `npm run build` :

```yaml
- name: Verify no dev URLs in production build
  run: |
    if grep -q 'localhost:3001' build/static/js/*.js; then
      echo "ERROR: localhost:3001 found in production build!"
      echo "Le build contient des URLs de développement."
      exit 1
    fi
```

Ce guard empêche tout déploiement si `localhost` apparaît dans le JS produit.

---

## Procédure de déploiement manuel (urgence uniquement)

Si le CI/CD est indisponible et qu'un build manuel est nécessaire :

```bash
# 1. Builder avec les variables de prod explicites
REACT_APP_API_BASE_URL=/api/v1 \
REACT_APP_COUNTRY=ES \
REACT_APP_ENV=production \
npm run build

# 2. Vérifier l'absence de localhost:3001
grep -c 'localhost:3001' build/static/js/main.*.js
# Doit retourner 0

# 3. Copier sur le serveur
scp -P 2222 -r build/ root@72.62.51.173:/var/www/medical-pro/

# 4. Vérifier que index.html est présent
ssh -p 2222 root@72.62.51.173 'ls -la /var/www/medical-pro/build/index.html'

# 5. Redémarrer PM2
ssh -p 2222 root@72.62.51.173 'pm2 restart medical-pro-frontend'
```

---

## CSP nginx (configuration actuelle)

La Content Security Policy dans `/etc/nginx/sites-available/medimaestro` :

```
Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'"
```

- `connect-src 'self'` : n'autorise que les requêtes vers le même domaine (ex: `app.medimaestro.com`)
- Toute requête vers `localhost:3001` est bloquée → c'est le filet de sécurité qui a révélé le problème

### Améliorations futures possibles
- Ajouter `report-uri` ou `report-to` pour détecter les violations CSP en production
- Renforcer `script-src` avec des nonces ou hashes (nécessite SSR ou modification du build)

---

## Checklist déploiement

- [ ] Le build a été fait avec `.env.production` (CI/CD) ou variables explicites
- [ ] `grep -c 'localhost' build/static/js/main.*.js` retourne 0
- [ ] `index.html` est présent dans `/var/www/medical-pro/build/`
- [ ] PM2 redémarré après copie du build
- [ ] Test de connexion fonctionnel sur https://app.medimaestro.com
