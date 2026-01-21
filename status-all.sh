#!/bin/bash

# Script pour vérifier l'état des services MedicalPro

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

check_port() {
    local port=$1
    local service=$2

    if lsof -i :$port &> /dev/null; then
        local pid=$(lsof -ti :$port | head -1)
        echo -e "  ${GREEN}✓${NC} ${CYAN}$service${NC} est actif (port $port, PID: $pid)"
        return 0
    else
        echo -e "  ${RED}✗${NC} ${CYAN}$service${NC} n'est pas actif (port $port)"
        return 1
    fi
}

check_tmux_session() {
    if tmux has-session -t "medicalpro" 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} Session tmux ${CYAN}medicalpro${NC} active"
        echo ""
        echo "    Fenêtres :"
        tmux list-windows -t "medicalpro" | sed 's/^/      /'
        return 0
    else
        echo -e "  ${RED}✗${NC} Session tmux ${CYAN}medicalpro${NC} n'existe pas"
        return 1
    fi
}

echo "════════════════════════════════════════════════════════════"
echo "   État des services MedicalPro"
echo "════════════════════════════════════════════════════════════"
echo ""

echo -e "${CYAN}Vérification des services:${NC}"
check_port 3001 "medicalpro-backend"
check_port 3000 "medicalpro (frontend)"
check_port 3002 "medicalpro-admin"

echo ""
echo -e "${CYAN}État de tmux:${NC}"
check_tmux_session

echo ""
echo "════════════════════════════════════════════════════════════"
echo ""

# Afficher les URL d'accès
echo -e "${CYAN}URLs d'accès:${NC}"
echo -e "  ${YELLOW}Frontend${NC}        : http://localhost:3000"
echo -e "  ${YELLOW}Backend API${NC}     : http://localhost:3001"
echo -e "  ${YELLOW}Admin Panel${NC}     : http://localhost:3002"
echo ""

# Afficher les commandes utiles
echo -e "${CYAN}Commandes utiles:${NC}"
echo -e "  Démarrer les services:   ${YELLOW}./start-all.sh${NC} (simple) ou ${YELLOW}./start-all-tmux.sh${NC} (tmux)"
echo -e "  Arrêter les services:    ${YELLOW}./stop-all.sh${NC}"
echo -e "  Se connecter à tmux:     ${YELLOW}tmux attach-session -t medicalpro${NC}"
echo -e "  Voir les logs backend:   ${YELLOW}tail -f /tmp/medicalpro-backend.log${NC}"
echo -e "  Voir les logs frontend:  ${YELLOW}tail -f /tmp/medicalpro.log${NC}"
echo -e "  Voir les logs admin:     ${YELLOW}tail -f /tmp/medicalpro-admin.log${NC}"
echo ""
echo "════════════════════════════════════════════════════════════"
