#!/bin/bash

###############################################################################
# Production Server Setup Script
# Configures a fresh Ubuntu/Debian server for MedicalPro deployment
#
# Usage:
#   sudo ./scripts/setup-production-server.sh
#
# This script:
#   - Creates deploy user
#   - Sets up SSH keys
#   - Installs Node.js (if needed)
#   - Creates build directories
#   - Configures Nginx
#   - Sets up permissions
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_USER="deploy-user"
DEPLOY_HOME="/home/$DEPLOY_USER"
DEPLOY_PATH_ES="/var/www/medical-pro-es"
DEPLOY_PATH_FR="/var/www/medical-pro-fr"
DEPLOY_PATH_BACKEND="/var/www/medical-pro-backend"
NODE_VERSION="18"

# Functions
print_header() {
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
}

print_step() {
    echo -e "\n${BLUE}→ $1${NC}"
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

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    print_error "This script must be run as root (use sudo)"
    exit 1
fi

print_header "MedicalPro Production Server Setup"

# Step 1: Update system
print_step "Updating system packages"
apt-get update
apt-get upgrade -y
print_success "System updated"

# Step 2: Install dependencies
print_step "Installing required packages"
apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    python3 \
    nginx \
    certbot \
    python3-certbot-nginx \
    rsync \
    htop \
    vim \
    nano \
    ufw \
    fail2ban

print_success "Dependencies installed"

# Step 3: Install Node.js if needed
if ! command -v node &> /dev/null; then
    print_step "Installing Node.js $NODE_VERSION"
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
    print_success "Node.js installed"
else
    print_info "Node.js already installed: $(node --version)"
fi

# Step 4: Create deploy user
print_step "Creating deploy user: $DEPLOY_USER"
if id "$DEPLOY_USER" &>/dev/null; then
    print_warning "User $DEPLOY_USER already exists"
else
    useradd -m -s /bin/bash -d "$DEPLOY_HOME" "$DEPLOY_USER"
    print_success "User created"
fi

# Step 5: Setup SSH for deploy user
print_step "Setting up SSH keys for deployment"

SSH_DIR="$DEPLOY_HOME/.ssh"
AUTHORIZED_KEYS="$SSH_DIR/authorized_keys"

mkdir -p "$SSH_DIR"
chmod 700 "$SSH_DIR"

# Check if GitHub deploy key exists
if [ ! -f "$SSH_DIR/id_rsa" ]; then
    print_warning "No SSH key found. You'll need to add one manually."
    print_info "Add your GitHub Actions public key to:"
    print_info "  $AUTHORIZED_KEYS"
    print_info ""
    print_info "In GitHub Actions, add this secret:"
    print_info "  DEPLOY_KEY = contents of your private key"
else
    print_success "SSH key found"
fi

touch "$AUTHORIZED_KEYS"
chmod 600 "$AUTHORIZED_KEYS"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$SSH_DIR"

print_success "SSH configured"

# Step 6: Create build directories
print_step "Creating build directories"

for dir in "$DEPLOY_PATH_ES" "$DEPLOY_PATH_FR" "$DEPLOY_PATH_BACKEND"; do
    mkdir -p "$dir"
    chown "$DEPLOY_USER:www-data" "$dir"
    chmod 755 "$dir"
    print_success "Created: $dir"
done

# Step 7: Configure sudo for deploy user
print_step "Configuring sudo permissions"

SUDOERS_ENTRY="$DEPLOY_USER ALL=(ALL) NOPASSWD: /bin/systemctl reload nginx, /bin/systemctl reload medical-pro-backend"

if ! grep -q "$DEPLOY_USER ALL=(ALL) NOPASSWD" /etc/sudoers 2>/dev/null; then
    echo "$SUDOERS_ENTRY" | tee -a /etc/sudoers.d/medical-pro > /dev/null
    print_success "Sudo configured"
else
    print_info "Sudo already configured"
fi

# Step 8: Create Nginx directories
print_step "Setting up Nginx"

# Create log directory
mkdir -p /var/log/nginx/medical-pro
chown www-data:www-data /var/log/nginx/medical-pro

print_success "Nginx directories created"

# Step 9: Setup firewall
print_step "Configuring firewall"

ufw --force enable
ufw allow ssh
ufw allow http
ufw allow https

print_success "Firewall configured"

# Step 10: Setup fail2ban
print_step "Setting up fail2ban"

systemctl enable fail2ban
systemctl restart fail2ban

print_success "Fail2ban configured"

# Step 11: Create systemd service for backend (optional)
print_step "Creating systemd service for backend"

cat > /etc/systemd/system/medical-pro-backend.service << 'EOF'
[Unit]
Description=MedicalPro Backend API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/medical-pro-backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment="NODE_ENV=production"
Environment="PORT=3001"

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
print_success "Systemd service created"

# Step 12: Create log directory
print_step "Setting up logging"

LOG_DIR="/var/log/medical-pro-deployment"
mkdir -p "$LOG_DIR"
chown "$DEPLOY_USER:www-data" "$LOG_DIR"
chmod 755 "$LOG_DIR"

print_success "Logging configured"

# Step 13: Create deployment configuration template
print_step "Creating deployment configuration"

cat > "$DEPLOY_HOME/.deploy-config" << EOF
# Auto-generated on $(date)

DEPLOY_HOST="$(hostname -f)"
DEPLOY_USER="$DEPLOY_USER"
DEPLOY_PATH_ES="$DEPLOY_PATH_ES"
DEPLOY_PATH_FR="$DEPLOY_PATH_FR"

# Update these before deploying:
SLACK_WEBHOOK_URL=""
NOTIFY_EMAIL=""
EOF

chown "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_HOME/.deploy-config"
chmod 600 "$DEPLOY_HOME/.deploy-config"

print_success "Configuration template created"

# Final instructions
print_header "Setup Complete!"

echo ""
print_success "Server is ready for MedicalPro deployment"

echo ""
print_warning "NEXT STEPS:"
echo ""

echo "1. ADD SSH KEY FOR GITHUB ACTIONS:"
echo "   - Generate key: ssh-keygen -t ed25519 -f ~/.ssh/github-deploy"
echo "   - Copy public key to: $AUTHORIZED_KEYS"
echo "   - Add private key to GitHub secrets as DEPLOY_KEY"
echo ""

echo "2. CONFIGURE NGINX:"
echo "   - Copy template from CI_CD_AUTOMATION_GUIDE.md"
echo "   - Update domain names"
echo "   - Enable SSL with: sudo certbot --nginx"
echo ""

echo "3. SETUP GITHUB SECRETS:"
echo "   - DEPLOY_HOST: $(hostname -f)"
echo "   - DEPLOY_USER: $DEPLOY_USER"
echo "   - DEPLOY_KEY: (private SSH key)"
echo "   - DEPLOY_PATH_ES: $DEPLOY_PATH_ES"
echo "   - DEPLOY_PATH_FR: $DEPLOY_PATH_FR"
echo ""

echo "4. TEST DEPLOYMENT:"
echo "   - Push code to master branch"
echo "   - Check GitHub Actions workflow"
echo "   - Verify builds at es.medicalpro.com and fr.medicalpro.com"
echo ""

echo "5. SETUP MONITORING (optional):"
echo "   - Configure log rotation"
echo "   - Setup health checks"
echo "   - Add Slack/Email notifications"
echo ""

print_info "Configuration saved at: $DEPLOY_HOME/.deploy-config"
print_info "System ready for automated deployments!"

echo ""
