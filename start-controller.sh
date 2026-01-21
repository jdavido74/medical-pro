#!/bin/bash

# Script de démarrage du Service Controller
# Port: 3003

# Couleurs
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "════════════════════════════════════════════════════════════"
echo "   🏥 MedicalPro Service Controller"
echo "════════════════════════════════════════════════════════════"
echo ""
echo -e "${BLUE}[INFO]${NC} Vérification des dépendances..."

# Vérifier si Express et WebSocket sont installés
if ! npm list express ws 2>/dev/null | grep -q express; then
    echo -e "${YELLOW}[WARNING]${NC} Installation des dépendances..."
    npm install express ws --legacy-peer-deps --save
fi

echo -e "${GREEN}[OK]${NC} Dépendances vérifiées"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}✅ Serveur démarrant...${NC}"
echo ""
echo "📍 Interface web disponible sur:"
echo -e "   ${YELLOW}http://localhost:3003${NC}"
echo ""
echo "Services pilotés:"
echo "   • Frontend (port 3000)"
echo "   • Backend API (port 3001)"
echo "   • Admin Panel (port 3002)"
echo ""
echo "Pour arrêter le serveur: Ctrl+C"
echo "════════════════════════════════════════════════════════════"
echo ""

# Démarrer le serveur
node service-controller-server.js
