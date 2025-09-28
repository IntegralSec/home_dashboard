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

# Create directories
echo "📁 Creating directories..."
sudo mkdir -p /opt/home_dashboard
sudo mkdir -p /srv/data
sudo mkdir -p /var/www/html
sudo mkdir -p /var/log/caddy

# Set permissions
sudo chown -R pi:pi /opt/home_dashboard
sudo chown -R pi:pi /srv/data
sudo chown -R www-data:www-data /var/www/html

# Copy configuration files
echo "⚙️  Copying configuration files..."
sudo cp kiosk-api.service /etc/systemd/system/
sudo cp Caddyfile /etc/caddy/Caddyfile

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

echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Copy your project files to /opt/home_dashboard"
echo "2. Configure your .env file with Google OAuth credentials"
echo "3. Run 'npm run oauth' to bootstrap Google authentication"
echo "4. Build the backend: 'npm run build:backend'"
echo "5. Enable and start services:"
echo "   sudo systemctl enable kiosk-api"
echo "   sudo systemctl start kiosk-api"
echo "   sudo systemctl enable caddy"
echo "   sudo systemctl start caddy"
echo ""
echo "Note: Frontend files are automatically built and copied during installation."
echo ""
echo "See README.md for detailed setup instructions."
