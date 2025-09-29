#!/bin/bash

# Home Dashboard - Installation Script
# For Raspberry Pi OS Lite (Bullseye)

set -e

echo "🚀 Installing Home Dashboard..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js (LTS)
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Caddy web server
echo "📦 Installing Caddy web server..."
if command -v caddy &> /dev/null; then
    echo "Caddy already installed"
else
    echo "Installing Caddy..."
    sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
    sudo apt update
    sudo apt install -y caddy
fi

# Remove lighttpd if it exists (to avoid conflicts)
if command -v lighttpd &> /dev/null; then
    echo "📦 Removing lighttpd to avoid conflicts..."
    sudo systemctl stop lighttpd 2>/dev/null || true
    sudo systemctl disable lighttpd 2>/dev/null || true
    sudo apt remove -y lighttpd 2>/dev/null || true
fi

# Create dashboard user
echo "👤 Creating dashboard user..."
if ! id "dashboard" &>/dev/null; then
    sudo useradd -r -s /bin/bash -d /opt/home_dashboard -m dashboard
    echo "✅ Dashboard user created"
else
    echo "Dashboard user already exists"
fi

# Create directories
echo "📁 Creating directories..."
sudo mkdir -p /opt/home_dashboard
sudo mkdir -p /srv/data
sudo mkdir -p /var/www/html
sudo mkdir -p /var/log/caddy

# Set permissions
echo "🔐 Setting permissions for dashboard user..."
sudo chown -R dashboard:dashboard /opt/home_dashboard
sudo chown -R dashboard:dashboard /srv/data
sudo chown -R www-data:www-data /var/www/html

# Set directory permissions
sudo chmod 755 /opt/home_dashboard
sudo chmod 755 /srv/data
sudo chmod 755 /var/www/html

# Ensure Node.js can bind to port 5055
echo "🔌 Configuring Node.js for port binding..."
if command -v setcap &> /dev/null; then
    sudo setcap 'cap_net_bind_service=+ep' /usr/bin/node
    echo "✅ Node.js configured for port binding"
else
    echo "⚠️  setcap not available - port binding may require root privileges"
fi

# Create secrets directory with proper permissions
echo "🔐 Creating secrets directory..."
sudo mkdir -p /opt/home_dashboard/secrets
sudo chown dashboard:dashboard /opt/home_dashboard/secrets
sudo chmod 700 /opt/home_dashboard/secrets

# Copy configuration files
echo "⚙️  Copying configuration files..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
sudo cp "$SCRIPT_DIR/kiosk-api.service" /etc/systemd/system/
sudo cp "$SCRIPT_DIR/Caddyfile" /etc/caddy/Caddyfile

# Reload systemd
sudo systemctl daemon-reload

# Build and copy frontend files
echo "🏗️  Building and copying frontend files..."
if [ -d "/opt/home_dashboard/frontend" ]; then
    echo "Building frontend..."
    cd /opt/home_dashboard
    npm run build:frontend
    
    echo "Copying frontend files to web server directory..."
    sudo cp -r /opt/home_dashboard/frontend/dist/* /var/www/html/
    sudo chown -R www-data:www-data /var/www/html
    sudo chmod -R 644 /var/www/html
    sudo find /var/www/html -type d -exec chmod 755 {} \;
    
    echo "✅ Frontend files copied successfully"
else
    echo "⚠️  Frontend directory not found. You'll need to build and copy files manually."
fi

# Build backend
echo "🏗️  Building backend..."
if [ -d "/opt/home_dashboard/backend" ]; then
    echo "Building backend..."
    cd /opt/home_dashboard
    npm run build:backend
    
    echo "✅ Backend built successfully"
else
    echo "⚠️  Backend directory not found. You'll need to build the backend manually."
fi

# Verify permissions
echo "🔍 Verifying permissions..."
echo "Dashboard user permissions:"
sudo -u dashboard ls -la /opt/home_dashboard/ 2>/dev/null || echo "⚠️  Cannot access /opt/home_dashboard as dashboard user"
sudo -u dashboard ls -la /srv/data/ 2>/dev/null || echo "⚠️  Cannot access /srv/data as dashboard user"

# Enable and start services
echo "🚀 Enabling and starting services..."
echo "Enabling kiosk-api service..."
sudo systemctl enable kiosk-api

echo "Starting kiosk-api service..."
sudo systemctl start kiosk-api

echo "Enabling caddy service..."
sudo systemctl enable caddy

echo "Starting caddy service..."
sudo systemctl start caddy

echo "✅ Services enabled and started successfully"

echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Copy your project files to /opt/home_dashboard"
echo "2. Configure your .env file with Google OAuth credentials"
echo "3. Run 'npm run oauth' to bootstrap Google authentication"
echo ""
echo "Note: Frontend and backend are automatically built, and services are enabled and started during installation."
echo "If you need to restart services:"
echo "   sudo systemctl restart kiosk-api"
echo "   sudo systemctl restart caddy"
echo ""
echo "See README.md for detailed setup instructions."