# 🎯 PM2 Commands pour Medical Pro

## Status et Monitoring

```bash
# Voir le statut de tous les services
pm2 status

# Voir les logs en temps réel (tous les services)
pm2 logs

# Voir les logs d'un service spécifique
pm2 logs backend
pm2 logs frontend
pm2 logs admin
pm2 logs mailhog

# Voir les 50 dernières lignes de logs
pm2 logs --lines 50

# Monitoring en temps réel (CPU, mémoire)
pm2 monit
```

## Démarrage / Arrêt / Redémarrage

```bash
# Démarrer tous les services
pm2 start ecosystem.config.js

# Arrêter tous les services
pm2 stop all

# Redémarrer tous les services
pm2 restart all

# Redémarrer un service spécifique
pm2 restart backend
pm2 restart frontend
pm2 restart admin
pm2 restart mailhog

# Arrêter et supprimer un service
pm2 delete backend

# Supprimer tous les services
pm2 delete all
```

## Gestion avancée

```bash
# Rendre PM2 persistant (auto-restart après reboot)
pm2 startup
pm2 save

# Augmenter la limite de mémoire pour un service
# Éditer ecosystem.config.js et définir max_memory_restart

# Voir le PID et autres infos
pm2 info backend

# Tuer un service et le redémarrer automatiquement
pm2 kill backend

# Voir l'historique des crashes
pm2 show backend
```

## Fichiers importants

```
/var/www/medical-pro/ecosystem.config.js  - Configuration PM2
/var/www/medical-pro/logs/                - Tous les logs des services
/root/.pm2/                               - Home directory de PM2
```

## Avantages de PM2

✅ **Auto-restart**: Les services redémarrent automatiquement en cas de crash
✅ **Logs centralisés**: Tous les logs dans `/var/www/medical-pro/logs/`
✅ **Monitoring**: Voir CPU/mémoire/uptime en temps réel
✅ **Watch mode**: Backend redémarre automatiquement si les fichiers changent
✅ **Clustering**: Peut utiliser plusieurs instances pour Node.js
✅ **Startup hook**: Auto-start après reboot avec `pm2 startup && pm2 save`
