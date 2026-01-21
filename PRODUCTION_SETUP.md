# 🚀 Setup Production avec PM2

## 1. Configuration PM2 pour la production

```bash
# Rendre PM2 persistant (auto-start après reboot)
pm2 startup
pm2 save

# Vérifier que tout est sauvegardé
pm2 status
```

## 2. Modifications à faire dans ecosystem.config.js pour la production

### A. Désactiver le watch mode du backend
```javascript
// Avant:
watch: ['src'],

// Après (commenté):
// watch: false,  // Désactiver en production
```

### B. Augmenter les limites de redémarrage
```javascript
// En production, être plus strict:
max_restarts: 5,    // Pas plus de 5 restarts
min_uptime: '30s',  // Minimum 30 secondes de uptime
```

### C. Ajouter la détection de fuite mémoire
```javascript
// Redémarrer si mémoire > 800MB
max_memory_restart: '800M',
```

## 3. Logging en production

### A. Archiver les logs
```bash
# Installer pm2-logrotate
pm2 install pm2-logrotate

# Configure la rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30  # Garder 30 jours
```

### B. Externaliser les logs (optionnel mais recommandé)
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Datadog
- New Relic
- CloudWatch (AWS)

## 4. Monitoring en production

### Notifications de crash
```bash
# Email sur crash
pm2 install pm2-auto-pull

# Dashboard web
pm2 web  # Accessible sur http://localhost:9615
```

### Monitoring avancé
```bash
# Installer pm2-monitor
pm2 install pm2-monitor

# Dashboard dans Plus (gratuit ou payant)
# https://app.pm2.io/
```

## 5. Environnements NODE_ENV

```javascript
// Dans ecosystem.config.js
env: {
  NODE_ENV: 'development',
  PORT: 3001
},
env_production: {
  NODE_ENV: 'production',
  PORT: 3001
}
```

```bash
# Démarrer en production
pm2 start ecosystem.config.js --env production
```

## 6. Mise à jour sans downtime

```bash
# Graceful reload (les services redémarrent proprement)
pm2 gracefulReload all

# Ou simplement restart
pm2 restart all
```

## 7. Backups des données PM2

```bash
# Backup la configuration PM2
pm2 save

# Restore après un reboot
pm2 resurrect
```

## 8. Security en production

### A. Variables d'environnement sensibles
```bash
# Ne JAMAIS mettre de secrets dans ecosystem.config.js
# Utiliser un fichier .env

pm2 start app.js --update-env
```

### B. Restrictions de mémoire par service
```javascript
// Backend plus restreint
max_memory_restart: '500M',

// Frontend plus gourmand
max_memory_restart: '1.2G',
```

## 9. Alertes et notifications

```bash
# Envoyer des notifications sur Slack, Discord, etc
# via des scripts custom ou pm2-plus
```

## 10. Checklist production

- [ ] `pm2 startup` executé et saved
- [ ] `pm2-logrotate` installé
- [ ] NODE_ENV=production configuré
- [ ] Max memory limits configurés
- [ ] Logs archivés et monitorés
- [ ] Notifications de crash activées
- [ ] Backup de l'ecosystem.config.js en version control
- [ ] Test de redémarrage du serveur
- [ ] Documentation d'équipe sur comment utiliser PM2

## Commandes Production courantes

```bash
# Voir le status
pm2 status

# Redémarrer en zéro-downtime
pm2 gracefulReload all

# Arrêter proprement
pm2 stop all

# Logs
tail -f /var/www/medical-pro/logs/backend-out-0.log

# Monitoring
pm2 monit
```

## Coûts

- **PM2 gratuit**: 100% functional pour production
- **PM2 Plus (optionnel)**: $10-50/mois pour monitoring avancé, alertes, etc
