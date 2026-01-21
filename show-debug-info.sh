#!/bin/bash

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

clear

echo -e "${BOLD}${CYAN}"
echo "═══════════════════════════════════════════════════════════════"
echo "   🔍 MEDICAL PRO - DEBUG INFORMATION                         "
echo "═══════════════════════════════════════════════════════════════"
echo -e "${NC}"

# 1. État des services
echo -e "\n${BOLD}${BLUE}━━━ 1. État des services ━━━${NC}"
echo ""
echo -e "${CYAN}Backend (Port 3001):${NC}"
if lsof -ti:3001 > /dev/null 2>&1; then
    PID=$(lsof -ti:3001)
    echo -e "  ${GREEN}✅ Running${NC} (PID: $PID)"
else
    echo -e "  ${RED}❌ Stopped${NC}"
fi

echo ""
echo -e "${CYAN}Frontend (Port 3000):${NC}"
if lsof -ti:3000 > /dev/null 2>&1; then
    PID=$(lsof -ti:3000)
    echo -e "  ${GREEN}✅ Running${NC} (PID: $PID)"
else
    echo -e "  ${RED}❌ Stopped${NC}"
fi

# 2. Bases de données
echo -e "\n${BOLD}${BLUE}━━━ 2. Bases de données PostgreSQL ━━━${NC}"
echo ""
PGPASSWORD=medicalpro2024 psql -h localhost -U medicalpro -d postgres -t -c "SELECT datname FROM pg_database WHERE datname LIKE 'medicalpro%' ORDER BY datname;" 2>/dev/null | while read db; do
    db=$(echo $db | xargs) # trim whitespace
    if [ ! -z "$db" ]; then
        if [ "$db" = "medicalpro_central" ]; then
            echo -e "  ${GREEN}✅${NC} $db ${YELLOW}(Central)${NC}"
        else
            echo -e "  ${CYAN}📦${NC} $db"
        fi
    fi
done

# 3. Companies dans la base centrale
echo -e "\n${BOLD}${BLUE}━━━ 3. Companies enregistrées ━━━${NC}"
echo ""
PGPASSWORD=medicalpro2024 psql -h localhost -U medicalpro -d medicalpro_central -t -c "SELECT id, name, country, is_active FROM companies ORDER BY created_at DESC;" 2>/dev/null | while read line; do
    if [ ! -z "$line" ]; then
        echo -e "  ${CYAN}•${NC} $line"
    fi
done

# 4. Comment voir les logs
echo -e "\n${BOLD}${BLUE}━━━ 4. Comment voir les logs ━━━${NC}"
echo ""
echo -e "${YELLOW}Frontend (Console navigateur):${NC}"
echo "  1. Ouvrez http://localhost:3000"
echo "  2. Appuyez sur F12"
echo "  3. Cliquez sur l'onglet 'Console'"
echo "  4. Rechargez la page (F5)"
echo ""
echo -e "${YELLOW}Backend (Terminal):${NC}"
echo "  • Logs en temps réel : ${CYAN}tail -f /tmp/backend.log${NC}"
echo "  • 100 dernières lignes : ${CYAN}tail -100 /tmp/backend.log${NC}"
echo "  • Filtrer clinic logs : ${CYAN}tail -f /tmp/backend.log | grep -E 'ClinicRouting|ConnectionManager'${NC}"
echo ""

# 5. Diagnostic complet
echo -e "\n${BOLD}${BLUE}━━━ 5. Lancer le diagnostic complet ━━━${NC}"
echo ""
echo -e "Pour un diagnostic détaillé de toutes les connexions clinic:"
echo -e "  ${CYAN}cd /var/www/medical-pro-backend && node scripts/diagnose-clinic-db.js${NC}"
echo ""

echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}💡 Astuce:${NC} Gardez ce terminal ouvert et ouvrez un autre terminal pour voir les logs:"
echo -e "   ${CYAN}tail -f /tmp/backend.log${NC}"
echo ""
