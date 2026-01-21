#!/bin/bash

# Script pour démarrer tous les services du MedicalPro
# medicalpro (frontend) - port 3000
# medicalpro-backend - port 3001
# medicalpro-admin - port 3002

set -e

echo "════════════════════════════════════════════════════════════"
echo "   Démarrage des services MedicalPro"
echo "════════════════════════════════════════════════════════════"

# Couleurs pour l'output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Vérifier les répertoires
log_info "Vérification des répertoires..."

if [ ! -d "/var/www/medical-pro" ]; then
    log_error "Répertoire /var/www/medical-pro non trouvé"
    exit 1
fi

if [ ! -d "/var/www/medical-pro-backend" ]; then
    log_error "Répertoire /var/www/medical-pro-backend non trouvé"
    exit 1
fi

if [ ! -d "/var/www/medical-pro-admin" ]; then
    log_error "Répertoire /var/www/medical-pro-admin non trouvé"
    exit 1
fi

log_success "Répertoires vérifiés"

# Fonction pour arrêter proprement les services
cleanup() {
    log_warning "Arrêt des services..."
    jobs -p | xargs -r kill 2>/dev/null || true
    log_success "Services arrêtés"
    exit 0
}

# Piéger les signaux SIGINT et SIGTERM
trap cleanup SIGINT SIGTERM

# Démarrer medicalpro-backend
log_info "Démarrage de medicalpro-backend (port 3001)..."
cd /var/www/medical-pro-backend
npm run dev > /tmp/medicalpro-backend.log 2>&1 &
BACKEND_PID=$!
log_success "medicalpro-backend démarré (PID: $BACKEND_PID)"

# Attendre un peu que le backend soit prêt
sleep 3

# Démarrer medicalpro (frontend)
log_info "Démarrage de medicalpro (port 3000)..."
cd /var/www/medical-pro
npm start > /tmp/medicalpro.log 2>&1 &
FRONTEND_PID=$!
log_success "medicalpro démarré (PID: $FRONTEND_PID)"

# Démarrer medicalpro-admin
log_info "Démarrage de medicalpro-admin (port 3002)..."
cd /var/www/medical-pro-admin
npm start > /tmp/medicalpro-admin.log 2>&1 &
ADMIN_PID=$!
log_success "medicalpro-admin démarré (PID: $ADMIN_PID)"

echo ""
echo "════════════════════════════════════════════════════════════"
echo -e "${GREEN}Tous les services ont été démarrés avec succès!${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""
echo -e "Services disponibles:"
echo -e "  ${BLUE}Frontend (medicalpro)${NC}     : http://localhost:3000"
echo -e "  ${BLUE}Backend API${NC}                : http://localhost:3001"
echo -e "  ${BLUE}Admin (medicalpro-admin)${NC}  : http://localhost:3002"
echo ""
echo -e "Fichiers logs:"
echo -e "  Backend  : /tmp/medicalpro-backend.log"
echo -e "  Frontend : /tmp/medicalpro.log"
echo -e "  Admin    : /tmp/medicalpro-admin.log"
echo ""
echo -e "Pour voir les logs en temps réel:"
echo -e "  ${YELLOW}tail -f /tmp/medicalpro-backend.log${NC}"
echo -e "  ${YELLOW}tail -f /tmp/medicalpro.log${NC}"
echo -e "  ${YELLOW}tail -f /tmp/medicalpro-admin.log${NC}"
echo ""
echo -e "Pour arrêter les services: ${YELLOW}Ctrl+C${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""

# Garder le script en attente
wait
