#!/bin/bash

# Script pour arrêter tous les services du MedicalPro

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

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo "════════════════════════════════════════════════════════════"
echo "   Arrêt des services MedicalPro"
echo "════════════════════════════════════════════════════════════"
echo ""

# Vérifier s'il y a une session tmux
if tmux has-session -t "medicalpro" 2>/dev/null; then
    log_info "Arrêt de la session tmux 'medicalpro'..."
    tmux kill-session -t "medicalpro"
    log_success "Session tmux arrêtée"
else
    log_warning "Aucune session tmux 'medicalpro' détectée"
fi

# Arrêter les processus npm
log_info "Arrêt des processus npm..."

# Arrêter medicalpro-backend (3001)
if lsof -i :3001 &> /dev/null; then
    log_info "Arrêt du service sur port 3001 (backend)..."
    lsof -ti :3001 | xargs kill -9 2>/dev/null || true
    log_success "Port 3001 libéré"
fi

# Arrêter medicalpro (3000)
if lsof -i :3000 &> /dev/null; then
    log_info "Arrêt du service sur port 3000 (frontend)..."
    lsof -ti :3000 | xargs kill -9 2>/dev/null || true
    log_success "Port 3000 libéré"
fi

# Arrêter medicalpro-admin (3002)
if lsof -i :3002 &> /dev/null; then
    log_info "Arrêt du service sur port 3002 (admin)..."
    lsof -ti :3002 | xargs kill -9 2>/dev/null || true
    log_success "Port 3002 libéré"
fi

# Arrêter les processus node en général
log_info "Nettoyage des processus node/npm..."
pkill -f "npm" 2>/dev/null || true
pkill -f "node" 2>/dev/null || true

sleep 1

echo ""
echo "════════════════════════════════════════════════════════════"
log_success "Tous les services ont été arrêtés avec succès"
echo "════════════════════════════════════════════════════════════"
echo ""

# Vérifier l'état des ports
echo -e "${BLUE}État des ports:${NC}"
echo -n "  Port 3000 : "
if lsof -i :3000 &> /dev/null; then
    echo -e "${RED}Occupé${NC}"
else
    echo -e "${GREEN}Libre${NC}"
fi

echo -n "  Port 3001 : "
if lsof -i :3001 &> /dev/null; then
    echo -e "${RED}Occupé${NC}"
else
    echo -e "${GREEN}Libre${NC}"
fi

echo -n "  Port 3002 : "
if lsof -i :3002 &> /dev/null; then
    echo -e "${RED}Occupé${NC}"
else
    echo -e "${GREEN}Libre${NC}"
fi

echo ""
