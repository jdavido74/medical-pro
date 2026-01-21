#!/bin/bash

# Script pour démarrer tous les services + le contrôleur web

set -e

# Couleurs
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "════════════════════════════════════════════════════════════"
echo "   🏥 MedicalPro - Démarrage Complet"
echo "════════════════════════════════════════════════════════════"
echo ""

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Fonction pour arrêter proprement
cleanup() {
    echo ""
    echo -e "${YELLOW}[WARNING]${NC} Arrêt des services..."
    jobs -p | xargs -r kill 2>/dev/null || true
    log_success "Tous les services arrêtés"
    exit 0
}

# Piéger les signaux
trap cleanup SIGINT SIGTERM

log_info "Vérification des répertoires..."

for dir in "medical-pro" "medical-pro-backend" "medical-pro-admin"; do
    if [ ! -d "/var/www/$dir" ]; then
        log_error "Répertoire /var/www/$dir non trouvé"
        exit 1
    fi
done

log_success "Répertoires vérifiés"
echo ""

# Démarrer les services en arrière-plan
log_info "Démarrage de medicalpro-backend..."
cd /var/www/medical-pro-backend
npm run dev > /tmp/medicalpro-backend.log 2>&1 &
BACKEND_PID=$!
log_success "medicalpro-backend démarré (PID: $BACKEND_PID)"

sleep 2

log_info "Démarrage de medicalpro (frontend)..."
cd /var/www/medical-pro
npm start > /tmp/medicalpro.log 2>&1 &
FRONTEND_PID=$!
log_success "medicalpro démarré (PID: $FRONTEND_PID)"

log_info "Démarrage de medicalpro-admin..."
cd /var/www/medical-pro-admin
npm start > /tmp/medicalpro-admin.log 2>&1 &
ADMIN_PID=$!
log_success "medicalpro-admin démarré (PID: $ADMIN_PID)"

echo ""
echo "════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ Services démarrés avec succès!${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "🌐 Accès aux services:"
echo -e "   Frontend     : ${YELLOW}http://localhost:3000${NC}"
echo -e "   Backend API  : ${YELLOW}http://localhost:3001${NC}"
echo -e "   Admin Panel  : ${YELLOW}http://localhost:3002${NC}"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""

# Démarrer le contrôleur web en avant-plan
log_info "Démarrage du Service Controller (port 3003)..."
echo ""
cd /var/www/medical-pro
node service-controller-server.js
