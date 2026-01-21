# 🏥 MedicalPro Service Controller - Interface Web

Une interface web élégante et intuitive pour contrôler tous vos services MedicalPro.

## 🚀 Démarrage Rapide

### Option 1: Démarrer le contrôleur seul (recommandé si services déjà actifs)

```bash
cd /var/www/medical-pro
./start-controller.sh
```

Puis ouvrez votre navigateur:
```
http://localhost:3003
```

### Option 2: Démarrer tout d'un coup (services + contrôleur)

```bash
cd /var/www/medical-pro
./start-all-with-controller.sh
```

L'interface web s'affichera automatiquement.

---

## 📊 Fonctionnalités de l'Interface

### Contrôles Disponibles

1. **Démarrage Simple**
   - Lance les services en arrière-plan
   - Idéal pour le développement
   - Logs disponibles dans `/tmp/medicalpro-*.log`

2. **Démarrage avec tmux**
   - Lance les services avec tmux (4 fenêtres séparées)
   - Meilleure gestion et monitoring
   - Nécessite tmux: `sudo apt install tmux`

3. **Arrêt des Services**
   - Arrête proprement tous les services
   - Libère les ports

4. **Vérification d'État**
   - Affiche l'état de tous les services
   - Montre les ports occupés
   - Affiche les PIDs

### Console de Logs en Temps Réel

- Affichage des logs en direct via WebSocket
- Couleurs pour différents types de messages (info, error, warning, success)
- Bouton pour effacer les logs
- Auto-scroll vers les nouveaux messages

### Indicateur de Connexion

- Affichage de l'état de la connexion au serveur
- Reconnecter automatiquement en cas de déconnexion
- Badge vert (connecté) / rouge (déconnecté)

---

## 🌐 Services Contrôlés

| Service | Port | URL | Framework |
|---------|------|-----|-----------|
| Frontend | 3000 | http://localhost:3000 | React |
| Backend API | 3001 | http://localhost:3001 | Node.js/Express |
| Admin Panel | 3002 | http://localhost:3002 | React |
| **Controller** | **3003** | **http://localhost:3003** | **Express + WebSocket** |

---

## 🔧 Configuration Technique

### Serveur Express

- **Port:** 3003
- **Fichier:** `service-controller-server.js`
- **Dépendances:** 
  - express (framework HTTP)
  - ws (WebSocket)

### Interface Web

- **Fichier:** `public/index.html`
- **Framework:** Vanilla JavaScript + CSS moderne
- **Design:** Responsive (mobile-friendly)
- **Communication:** WebSocket pour les logs en temps réel

### Sécurité

- ✅ Validation des noms de scripts
- ✅ Chemins de fichiers vérifiés
- ✅ Commandes limitées à celles prédéfinies
- ✅ Timeout de sécurité (30 minutes)

---

## 📝 Fichiers Importants

```
/var/www/medical-pro/
├── service-controller-server.js      # Serveur Express/WebSocket
├── start-controller.sh               # Démarrer le contrôleur seul
├── start-all-with-controller.sh      # Démarrer tout
├── public/
│   └── index.html                    # Interface web (HTML/CSS/JS)
├── start-all.sh                      # Scripts de gestion
├── stop-all.sh
├── status-all.sh
└── CONTROLLER_README.md              # Cette documentation
```

---

## 🔍 Dépannage

### Erreur: Port 3003 déjà utilisé

```bash
# Vérifier quel processus occupe le port
lsof -i :3003

# Arrêter le processus
kill -9 <PID>

# Ou arrêter tous les services
./stop-all.sh
```

### Erreur: Module npm manquant

```bash
# Installer les dépendances
cd /var/www/medical-pro
npm install express ws --legacy-peer-deps --save

# Puis redémarrer
./start-controller.sh
```

### WebSocket ne se connecte pas

1. Vérifiez que le serveur est en cours d'exécution
2. Vérifiez la console du navigateur (F12)
3. Vérifiez que le port 3003 est accessible

```bash
# Tester la connectivité
curl -i http://localhost:3003
```

### Les logs ne s'affichent pas

1. Vérifiez la connexion WebSocket (badge en haut à droite)
2. Ouvrez la console du navigateur (F12 > Console)
3. Cherchez les messages d'erreur

---

## 🎨 Personnalisation

### Modifier le Port

Éditez `service-controller-server.js`:
```javascript
const PORT = 3003;  // Changez ici
```

### Ajouter des Boutons

Éditez `public/index.html` et ajoutez des boutons avec des appels AJAX:
```javascript
async function monAction() {
    const response = await fetch('/api/ma-route', { method: 'POST' });
    const data = await response.json();
}
```

Puis ajoutez la route dans `service-controller-server.js`:
```javascript
app.post('/api/ma-route', async (req, res) => {
    // Votre logique ici
    res.json({ success: true });
});
```

---

## 💡 Conseils d'Utilisation

1. **Utiliser tmux pour le démarrage**
   - Meilleure gestion des processus
   - Logs visibles séparément
   - Plus facile à déboguer

2. **Vérifier régulièrement l'état**
   - Utilisez le bouton "Vérifier l'état"
   - Assurez-vous que tous les services sont actifs

3. **Surveiller les logs**
   - Les logs s'affichent en temps réel
   - Idéal pour détecter les erreurs

4. **Arrêter proprement**
   - Toujours utiliser le bouton "Arrêter les services"
   - Évite les problèmes de ports occupés

---

## 📚 Commandes Utiles

```bash
# Démarrer le contrôleur seul
./start-controller.sh

# Démarrer tout (services + contrôleur)
./start-all-with-controller.sh

# Arrêter tous les services
./stop-all.sh

# Vérifier l'état des services
./status-all.sh

# Voir les logs backend
tail -f /tmp/medicalpro-backend.log

# Voir les logs frontend
tail -f /tmp/medicalpro.log

# Voir les logs admin
tail -f /tmp/medicalpro-admin.log

# Afficher l'aide
./help.sh
```

---

## 🔗 Liens Importants

- **Interface Web:** http://localhost:3003
- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:3001
- **Admin:** http://localhost:3002

---

## 📞 Support

En cas de problème:

1. Vérifiez les logs dans la console
2. Utilisez le bouton "Vérifier l'état"
3. Consultez le fichier `SCRIPTS_README.md` pour plus de détails
4. Vérifiez les fichiers logs: `/tmp/medicalpro-*.log`

---

**Version:** 1.0.0  
**Dernière mise à jour:** 2024-11-20

