#!/bin/bash

# Démarrage complet: backend + frontend + admin + controller

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

cleanup() {
    echo ""
    echo -e "${YELLOW}Arrêt de tous les services...${NC}"
    jobs -p | xargs -r kill 2>/dev/null || true
    log_success "Tous les services arrêtés"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Vérifier les répertoires
log_info "Vérification des répertoires..."
for dir in "medical-pro" "medical-pro-backend" "medical-pro-admin"; do
    if [ ! -d "/var/www/$dir" ]; then
        echo -e "${RED}[ERROR]${NC} Répertoire /var/www/$dir non trouvé"
        exit 1
    fi
done
log_success "Répertoires vérifiés"
echo ""

# Backend (port 3001)
log_info "Démarrage de medicalpro-backend (port 3001)..."
cd /var/www/medical-pro-backend
npm run dev > /tmp/medicalpro-backend.log 2>&1 &
BACKEND_PID=$!
log_success "Backend démarré (PID: $BACKEND_PID)"

sleep 2

# Frontend (port 3000)
log_info "Démarrage de medicalpro (port 3000)..."
cd /var/www/medical-pro
npm start > /tmp/medicalpro-frontend.log 2>&1 &
FRONTEND_PID=$!
log_success "Frontend démarré (PID: $FRONTEND_PID)"

# Admin (port 3002)
log_info "Démarrage de medicalpro-admin (port 3002)..."
cd /var/www/medical-pro-admin
npm start > /tmp/medicalpro-admin.log 2>&1 &
ADMIN_PID=$!
log_success "Admin démarré (PID: $ADMIN_PID)"

sleep 2

echo ""
echo "════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ Tous les services démarrés!${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""
echo -e "🌐 Accès:"
echo -e "   Frontend        : ${YELLOW}http://localhost:3000${NC}"
echo -e "   Backend API     : ${YELLOW}http://localhost:3001${NC}"
echo -e "   Admin Panel     : ${YELLOW}http://localhost:3002${NC}"
echo -e "   Controller      : ${YELLOW}http://localhost:3003/controller${NC}"
echo ""
echo "⚠️  Le Controller va maintenant démarrer (il s'affichera)"
echo "════════════════════════════════════════════════════════════"
echo ""

# Controller (port 3003) - en avant plan
cd /var/www/medical-pro
node service-controller-server.js
