#!/bin/bash

###############################################################################
# Multi-Country Frontend Deployment Script
# Automatise la construction et le déploiement des frontends ES et FR
#
# Usage:
#   ./scripts/deploy-multi-country.sh [options]
#
# Options:
#   --dry-run           Affiche ce qui serait fait sans l'exécuter
#   --local             Déploie localement (développement)
#   --production        Déploie en production (défaut)
#   --skip-build        Saute la compilation (utilise build/ existant)
#   --skip-tests        Saute les tests
#   --help              Affiche cette aide
###############################################################################

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$PROJECT_ROOT/build"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="/tmp/deploy_$TIMESTAMP.log"

# Options
DRY_RUN=false
SKIP_BUILD=false
SKIP_TESTS=false
ENV="production"

# Defaults
DEPLOY_HOST=${DEPLOY_HOST:-""}
DEPLOY_USER=${DEPLOY_USER:-""}
DEPLOY_PATH_ES=${DEPLOY_PATH_ES:-"/var/www/medical-pro-es"}
DEPLOY_PATH_FR=${DEPLOY_PATH_FR:-"/var/www/medical-pro-fr"}

# Functions
print_header() {
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_step() {
    echo -e "\n${BLUE}→ $1${NC}"
}

run_command() {
    local cmd="$1"
    local description="$2"

    if [ -z "$description" ]; then
        description="$cmd"
    fi

    echo "$description..."

    if [ "$DRY_RUN" = true ]; then
        echo "  [DRY-RUN] $cmd"
        return 0
    fi

    if eval "$cmd" >> "$LOG_FILE" 2>&1; then
        print_success "$description"
        return 0
    else
        print_error "$description"
        echo "  See logs: $LOG_FILE"
        return 1
    fi
}

show_help() {
    cat "$0" | grep "^#" | grep -v "^#!/bin/bash" | sed 's/^# //' | sed 's/^#//'
}

build_frontend() {
    local country=$1
    local country_upper=$(echo $country | tr '[:lower:]' '[:upper:]')

    print_step "Building $country_upper Frontend"

    if [ "$SKIP_BUILD" = true ]; then
        print_warning "Skipping build (--skip-build)"
        return 0
    fi

    # Clean previous build for this country
    if [ -d "$BUILD_DIR" ]; then
        print_info "Cleaning previous build..."
        rm -rf "$BUILD_DIR"
    fi

    # Build
    run_command \
        "cd $PROJECT_ROOT && REACT_APP_COUNTRY=$country_upper npm run build" \
        "Compiling $country_upper frontend"

    # Verify build
    if [ ! -d "$BUILD_DIR" ]; then
        print_error "Build directory not created for $country_upper"
        return 1
    fi

    if [ ! -f "$BUILD_DIR/index.html" ]; then
        print_error "index.html not found in build for $country_upper"
        return 1
    fi

    print_success "$country_upper frontend built successfully"
}

verify_build() {
    local country=$1
    local build_path="$BUILD_DIR"

    print_step "Verifying $country build"

    local required_files=(
        "index.html"
        "manifest.json"
        "favicon.ico"
    )

    for file in "${required_files[@]}"; do
        if [ ! -f "$build_path/$file" ]; then
            print_error "Missing: $file"
            return 1
        fi
        print_success "Found: $file"
    done
}

deploy_local() {
    local country=$1
    local country_lower=$(echo $country | tr '[:upper:]' '[:lower:]')

    print_step "Deploying $country to local development"

    # Pour le développement local, on crée des dossiers de test
    local local_path="/var/www/medical-pro-$country_lower"

    print_info "Target: $local_path"

    if [ "$DRY_RUN" = true ]; then
        echo "  [DRY-RUN] Would deploy to $local_path"
        return 0
    fi

    mkdir -p "$local_path"
    cp -r "$BUILD_DIR"/* "$local_path/"

    print_success "$country deployed locally"
}

deploy_production() {
    local country=$1
    local country_lower=$(echo $country | tr '[:upper:]' '[:lower:]')

    print_step "Deploying $country to production"

    # Determine deploy path
    local deploy_path
    if [ "$country_lower" = "es" ]; then
        deploy_path="$DEPLOY_PATH_ES"
    else
        deploy_path="$DEPLOY_PATH_FR"
    fi

    print_info "Deploy host: $DEPLOY_HOST"
    print_info "Deploy user: $DEPLOY_USER"
    print_info "Deploy path: $deploy_path"

    if [ -z "$DEPLOY_HOST" ] || [ -z "$DEPLOY_USER" ]; then
        print_error "DEPLOY_HOST and DEPLOY_USER must be set"
        return 1
    fi

    if [ "$DRY_RUN" = true ]; then
        echo "  [DRY-RUN] Would deploy to $DEPLOY_USER@$DEPLOY_HOST:$deploy_path"
        return 0
    fi

    # Deploy using rsync
    run_command \
        "rsync -avz --delete '$BUILD_DIR'/ '$DEPLOY_USER@$DEPLOY_HOST:$deploy_path'" \
        "Uploading $country build to production"
}

reload_nginx() {
    print_step "Reloading Nginx"

    if [ -z "$DEPLOY_HOST" ] || [ -z "$DEPLOY_USER" ]; then
        print_warning "Cannot reload Nginx (no deploy credentials)"
        return 0
    fi

    if [ "$DRY_RUN" = true ]; then
        echo "  [DRY-RUN] Would reload Nginx on $DEPLOY_HOST"
        return 0
    fi

    run_command \
        "ssh '$DEPLOY_USER@$DEPLOY_HOST' 'sudo systemctl reload nginx'" \
        "Reloading Nginx"
}

run_tests() {
    print_step "Running tests"

    if [ "$SKIP_TESTS" = true ]; then
        print_warning "Skipping tests (--skip-tests)"
        return 0
    fi

    run_command \
        "cd $PROJECT_ROOT && npm test -- --passWithNoTests --watchAll=false" \
        "Running test suite"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --local)
            ENV="local"
            shift
            ;;
        --production)
            ENV="production"
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Main execution
main() {
    print_header "Multi-Country Frontend Deployment"
    print_info "Environment: $ENV"
    [ "$DRY_RUN" = true ] && print_warning "DRY RUN MODE - No changes will be made"

    print_info "Log file: $LOG_FILE"

    # Check dependencies
    print_step "Checking dependencies"
    command -v node >/dev/null 2>&1 || { print_error "Node.js not found"; exit 1; }
    command -v npm >/dev/null 2>&1 || { print_error "npm not found"; exit 1; }
    print_success "Dependencies OK"

    # Run tests (optionnel)
    run_tests || true

    # Build and deploy ES
    build_frontend "es"
    verify_build "es"

    if [ "$ENV" = "local" ]; then
        deploy_local "es"
    else
        deploy_production "es"
    fi

    # Build and deploy FR
    build_frontend "fr"
    verify_build "fr"

    if [ "$ENV" = "local" ]; then
        deploy_local "fr"
    else
        deploy_production "fr"
    fi

    # Reload web server (production only)
    if [ "$ENV" = "production" ]; then
        reload_nginx
    fi

    print_header "Deployment Complete!"
    print_success "ES Frontend: Ready"
    print_success "FR Frontend: Ready"

    if [ "$ENV" = "production" ]; then
        print_info "Verify:"
        print_info "  https://es.medicalpro.com (ES)"
        print_info "  https://fr.medicalpro.com (FR)"
    else
        print_info "Local test paths created"
    fi
}

main "$@"
