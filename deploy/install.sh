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

# Install Caddy (preferred) or Lighttpd
echo "📦 Installing web server..."
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

echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Copy your project files to /opt/home_dashboard"
echo "2. Configure your .env file with Google OAuth credentials"
echo "3. Run 'npm run oauth' to bootstrap Google authentication"
echo "4. Build the project: 'npm run build:all'"
echo "5. Copy frontend build to /var/www/html"
echo "6. Enable and start services:"
echo "   sudo systemctl enable kiosk-api"
echo "   sudo systemctl start kiosk-api"
echo "   sudo systemctl enable caddy"
echo "   sudo systemctl start caddy"
echo ""
echo "See README.md for detailed setup instructions."
