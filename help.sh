#!/bin/bash

# Script d'aide pour les scripts de gestion MedicalPro

# Couleurs
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

cat << 'EOF'
════════════════════════════════════════════════════════════════════
             AIDE - Scripts de Gestion MedicalPro
════════════════════════════════════════════════════════════════════

📚 SCRIPTS DISPONIBLES:

  1. 🚀 ./start-all.sh
     └─ Démarre les services en arrière-plan (simple et léger)
        • medical-pro (frontend) - port 3000
        • medical-pro-backend (API) - port 3001
        • medical-pro-admin (admin) - port 3002
     └─ Logs: /tmp/medicalpro-*.log

  2. 🎪 ./start-all-tmux.sh (RECOMMANDÉ)
     └─ Démarre les services avec tmux (gestion élégante)
     └─ 4 fenêtres: backend, frontend, admin, logs
     └─ Prérequis: tmux (sudo apt install tmux)
     └─ Commandes:
        • Ctrl+B N → fenêtre suivante
        • Ctrl+B P → fenêtre précédente
        • Ctrl+B D → détacher la session
        • Ctrl+C  → arrêter le service

  3. ⏹️  ./stop-all.sh
     └─ Arrête tous les services proprement
     └─ Libère les ports 3000, 3001, 3002

  4. ✅ ./status-all.sh
     └─ Affiche l'état de tous les services
     └─ Vérifie la disponibilité des ports
     └─ Affiche les URLs d'accès

  5. ❓ ./help.sh (ce script)
     └─ Affiche cette aide

════════════════════════════════════════════════════════════════════

⚡ DÉMARRAGE RAPIDE:

  Mode simple:
    $ ./start-all.sh

  Mode tmux (meilleur):
    $ ./start-all-tmux.sh

  Vérifier l'état:
    $ ./status-all.sh

  Arrêter:
    $ ./stop-all.sh

════════════════════════════════════════════════════════════════════

🌐 ACCÈS AUX SERVICES:

  Frontend        → http://localhost:3000
  Backend API     → http://localhost:3001
  Admin Panel     → http://localhost:3002

════════════════════════════════════════════════════════════════════

📊 MONITORING:

  Vérifier l'état:
    $ ./status-all.sh

  Voir les logs en temps réel:
    $ tail -f /tmp/medicalpro-backend.log
    $ tail -f /tmp/medicalpro.log
    $ tail -f /tmp/medicalpro-admin.log

  Lister les processus actifs:
    $ lsof -i :3000
    $ lsof -i :3001
    $ lsof -i :3002

════════════════════════════════════════════════════════════════════

🔧 DÉPANNAGE:

  Le port est déjà utilisé?
    $ ./stop-all.sh
    $ ./start-all-tmux.sh

  Installer les dépendances:
    $ cd /var/www/medical-pro && npm install
    $ cd /var/www/medical-pro-backend && npm install
    $ cd /var/www/medical-pro-admin && npm install

  Vérifier Node/npm:
    $ node --version
    $ npm --version

  Supprimer la session tmux existante:
    $ tmux kill-session -t medicalpro

════════════════════════════════════════════════════════════════════

📖 POUR PLUS DE DÉTAILS:

  Lire le documentation complète:
    $ cat SCRIPTS_README.md

════════════════════════════════════════════════════════════════════

Besoin d'aide? Vérifiez les logs avec ./status-all.sh

════════════════════════════════════════════════════════════════════
EOF
