#!/bin/bash

# Démarrer le frontend React (port 3000) et le contrôleur (port 3003)

# Couleurs
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "════════════════════════════════════════════════════════════"
echo "   MedicalPro - Frontend + Controller"
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
    echo -e "${YELLOW}[WARNING]${NC} Arrêt..."
    jobs -p | xargs -r kill 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

log_info "Démarrage du frontend React (port 3000)..."
cd /var/www/medical-pro
npm start > /tmp/medicalpro-frontend.log 2>&1 &
FRONTEND_PID=$!
log_success "Frontend React démarré (PID: $FRONTEND_PID)"

sleep 3

log_info "Démarrage du Service Controller (port 3003)..."
node service-controller-server.js &
CONTROLLER_PID=$!
log_success "Controller démarré (PID: $CONTROLLER_PID)"

echo ""
echo "════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ Services démarrés!${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""
echo -e "🌐 Accès:"
echo -e "   Frontend      : ${YELLOW}http://localhost:3000${NC}"
echo -e "   Controller    : ${YELLOW}http://localhost:3003/controller${NC}"
echo ""
echo "Pour arrêter: Ctrl+C"
echo "════════════════════════════════════════════════════════════"
echo ""

wait
