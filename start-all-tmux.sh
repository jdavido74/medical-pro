#!/bin/bash

# Script pour démarrer tous les services du MedicalPro avec tmux
# Permet d'avoir une meilleure gestion des processus dans des fenêtres séparées

set -e

echo "════════════════════════════════════════════════════════════"
echo "   Démarrage des services MedicalPro avec tmux"
echo "════════════════════════════════════════════════════════════"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérifier que tmux est installé
if ! command -v tmux &> /dev/null; then
    log_error "tmux n'est pas installé. Installation requise: sudo apt install tmux"
    exit 1
fi

# Vérifier les répertoires
log_info "Vérification des répertoires..."

for dir in "medical-pro" "medical-pro-backend" "medical-pro-admin"; do
    if [ ! -d "/var/www/$dir" ]; then
        log_error "Répertoire /var/www/$dir non trouvé"
        exit 1
    fi
done

log_success "Répertoires vérifiés"

# Vérifier s'il existe déjà une session tmux
SESSION_NAME="medicalpro"
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    log_error "Une session tmux '$SESSION_NAME' existe déjà. Utilisez:"
    echo "  tmux kill-session -t $SESSION_NAME"
    echo "ou connectez-vous à la session existante:"
    echo "  tmux attach-session -t $SESSION_NAME"
    exit 1
fi

# Créer une nouvelle session tmux
log_info "Création de la session tmux '$SESSION_NAME'..."
tmux new-session -d -s "$SESSION_NAME" -x 200 -y 50

# Fenêtre 1: Backend
log_info "Démarrage de medicalpro-backend (fenêtre 1)..."
tmux send-keys -t "$SESSION_NAME:0" "cd /var/www/medical-pro-backend && npm run dev" Enter
tmux rename-window -t "$SESSION_NAME:0" "backend"

# Fenêtre 2: Frontend
log_info "Démarrage de medicalpro (fenêtre 2)..."
tmux new-window -t "$SESSION_NAME" -n "frontend"
tmux send-keys -t "$SESSION_NAME:1" "cd /var/www/medical-pro && npm start" Enter

# Fenêtre 3: Admin
log_info "Démarrage de medicalpro-admin (fenêtre 3)..."
tmux new-window -t "$SESSION_NAME" -n "admin"
tmux send-keys -t "$SESSION_NAME:2" "cd /var/www/medical-pro-admin && npm start" Enter

# Fenêtre 4: Monitoring/Logs
log_info "Création de la fenêtre monitoring..."
tmux new-window -t "$SESSION_NAME" -n "logs"
tmux send-keys -t "$SESSION_NAME:3" "echo '═════════════════════════════════════════════════════════'; \
echo 'Fenêtre de monitoring et logs'; \
echo '═════════════════════════════════════════════════════════'; \
echo ''; \
echo 'Services disponibles:'; \
echo '  Frontend (medicalpro)     : http://localhost:3000'; \
echo '  Backend API               : http://localhost:3001'; \
echo '  Admin (medicalpro-admin)  : http://localhost:3002'; \
echo ''; \
echo 'Commandes tmux utiles:'; \
echo '  Ctrl+B N        : Aller à la fenêtre suivante'; \
echo '  Ctrl+B P        : Aller à la fenêtre précédente'; \
echo '  Ctrl+B (numero) : Aller à la fenêtre spécifique'; \
echo ''; \
echo 'Pour voir les logs:'; \
echo '  tail -f /tmp/medicalpro-backend.log'; \
echo '  tail -f /tmp/medicalpro.log'; \
echo '  tail -f /tmp/medicalpro-admin.log'; \
echo ''; \
zsh" Enter

echo ""
echo "════════════════════════════════════════════════════════════"
echo -e "${GREEN}Session tmux créée avec succès!${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""
echo -e "Pour se connecter à la session:"
echo -e "  ${YELLOW}tmux attach-session -t $SESSION_NAME${NC}"
echo ""
echo -e "Structure de la session:"
echo -e "  Fenêtre 0 (${BLUE}backend${NC})   : medicalpro-backend (port 3001)"
echo -e "  Fenêtre 1 (${BLUE}frontend${NC})  : medicalpro (port 3000)"
echo -e "  Fenêtre 2 (${BLUE}admin${NC})     : medicalpro-admin (port 3002)"
echo -e "  Fenêtre 3 (${BLUE}logs${NC})      : Monitoring et commandes"
echo ""
echo -e "Commandes tmux utiles:"
echo -e "  ${YELLOW}Ctrl+B N${NC}        : Fenêtre suivante"
echo -e "  ${YELLOW}Ctrl+B P${NC}        : Fenêtre précédente"
echo -e "  ${YELLOW}Ctrl+B [numero]${NC} : Aller à la fenêtre"
echo -e "  ${YELLOW}Ctrl+B D${NC}        : Détacher la session"
echo ""
echo -e "Pour arrêter tous les services:"
echo -e "  ${YELLOW}tmux kill-session -t $SESSION_NAME${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""

# Se connecter à la session
log_success "Connexion à la session..."
tmux attach-session -t "$SESSION_NAME"
