# Scripts de Gestion des Services MedicalPro

Ce répertoire contient des scripts bash pour gérer le démarrage et l'arrêt des trois services principaux de MedicalPro:

- **medicalpro** (frontend React) - Port 3000
- **medicalpro-backend** (API Node.js/Express) - Port 3001
- **medicalpro-admin** (Admin Panel React) - Port 3002

## 📋 Scripts Disponibles

### 1. **start-all.sh** - Démarrage Simple

Démarre tous les services en arrière-plan.

```bash
./start-all.sh
```

**Avantages:**
- Simple et léger
- Les services s'exécutent en arrière-plan
- Logs disponibles dans `/tmp/medicalpro-*.log`

**Inconvénients:**
- Pas de gestion facile des fenêtres
- Moins de contrôle interactif

**Usage:**
```bash
# Démarrer les services
./start-all.sh

# Voir les logs en temps réel
tail -f /tmp/medicalpro-backend.log
tail -f /tmp/medicalpro.log
tail -f /tmp/medicalpro-admin.log

# Arrêter les services
./stop-all.sh
```

---

### 2. **start-all-tmux.sh** - Démarrage avec tmux (Recommandé)

Démarre tous les services dans une session tmux avec des fenêtres séparées.

```bash
./start-all-tmux.sh
```

**Avantages:**
- Gestion élégante des services dans des fenêtres séparées
- Interaction directe avec chaque service
- Logs visibles en temps réel dans chaque fenêtre
- Session persistante

**Prérequis:**
```bash
# Installer tmux si nécessaire
sudo apt update
sudo apt install tmux
```

**Usage:**

Après avoir lancé le script, vous verrez automatiquement la session tmux avec 4 fenêtres:

```
Fenêtre 0 (backend)   → medicalpro-backend (npm run dev)
Fenêtre 1 (frontend)  → medicalpro (npm start)
Fenêtre 2 (admin)     → medicalpro-admin (npm start)
Fenêtre 3 (logs)      → Monitoring et commandes
```

**Commandes tmux utiles:**

| Commande | Description |
|----------|-------------|
| `Ctrl+B N` | Aller à la fenêtre suivante |
| `Ctrl+B P` | Aller à la fenêtre précédente |
| `Ctrl+B 0-3` | Aller à une fenêtre spécifique (0-3) |
| `Ctrl+B D` | Détacher la session (elle reste active) |
| `Ctrl+C` | Arrêter le service dans la fenêtre actuelle |

**Se reconnecter à la session:**
```bash
tmux attach-session -t medicalpro
```

**Arrêter la session:**
```bash
tmux kill-session -t medicalpro
# OU
./stop-all.sh
```

---

### 3. **stop-all.sh** - Arrêt Propre

Arrête tous les services de manière propre.

```bash
./stop-all.sh
```

**Actions:**
- Arrête la session tmux 'medicalpro' (si active)
- Libère les ports 3000, 3001, 3002
- Nettoie les processus npm/node

---

### 4. **status-all.sh** - Vérification de l'État

Vérifie l'état et la disponibilité des services.

```bash
./status-all.sh
```

**Affiche:**
- État de chaque service (actif/inactif)
- Numéro de port et PID
- État de la session tmux
- URLs d'accès
- Commandes utiles

---

## 🚀 Démarrage Rapide

### Option 1: Mode Simple (recommandé pour déboguer)

```bash
cd /var/www/medical-pro
./start-all.sh

# Dans un autre terminal
tail -f /tmp/medicalpro-backend.log
```

### Option 2: Mode tmux (recommandé pour la production)

```bash
cd /var/www/medical-pro
./start-all-tmux.sh

# Déjà connecté automatiquement à la session
# Utiliser Ctrl+B N pour naviguer entre les fenêtres
```

---

## 🔍 Monitoring

### Vérifier l'état des services
```bash
./status-all.sh
```

### Voir les logs en temps réel

```bash
# Backend (port 3001)
tail -f /tmp/medicalpro-backend.log

# Frontend (port 3000)
tail -f /tmp/medicalpro.log

# Admin (port 3002)
tail -f /tmp/medicalpro-admin.log
```

### Vérifier les ports
```bash
lsof -i :3000  # Frontend
lsof -i :3001  # Backend
lsof -i :3002  # Admin
```

---

## 📝 Accès aux Services

Une fois démarrés, les services sont disponibles à:

| Service | URL | Notes |
|---------|-----|-------|
| Frontend | http://localhost:3000 | Application principale |
| Backend API | http://localhost:3001 | API REST |
| Admin Panel | http://localhost:3002 | Panneau d'administration |

---

## 🛠️ Dépannage

### Problème: Port déjà utilisé

```bash
# Vérifier quel processus occupe le port
lsof -i :3000

# Arrêter tous les services proprement
./stop-all.sh

# Si cela ne suffit pas, tuer le processus directement
kill -9 <PID>
# ou
pkill -f "npm start"
```

### Problème: tmux non disponible

Si vous n'avez pas tmux, utilisez le script simple:
```bash
./start-all.sh
```

### Problème: npm command not found

Assurez-vous que Node.js et npm sont installés:
```bash
node --version
npm --version

# Si non installé
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Problème: Module npm manquant

Installez les dépendances avant de démarrer:
```bash
cd /var/www/medical-pro && npm install
cd /var/www/medical-pro-backend && npm install
cd /var/www/medical-pro-admin && npm install
```

---

## 📦 Versions des Services

Les services utilisent les configurations suivantes:

**medical-pro (Frontend)**
- Framework: React 19.1.1
- Port: 3000
- Script: `npm start`

**medical-pro-backend (Backend)**
- Framework: Express.js
- Port: 3001
- Script: `npm run dev` (avec nodemon)
- Base de données: PostgreSQL

**medical-pro-admin (Admin)**
- Framework: React 18.2.0
- Port: 3002
- Script: `npm start`

---

## 🔐 Variables d'Environnement

Assurez-vous que les fichiers `.env` sont configurés dans chaque répertoire:

```bash
# Vérifier les fichiers .env
ls -la /var/www/medical-pro/.env
ls -la /var/www/medical-pro-backend/.env
ls -la /var/www/medical-pro-admin/.env
```

---

## 📧 Support

Pour toute question ou problème avec les scripts, vérifiez:
1. Les logs dans `/tmp/medicalpro-*.log`
2. L'état des services: `./status-all.sh`
3. La disponibilité des ports: `lsof -i :3000`

---

**Dernière mise à jour:** 2024-11-20
