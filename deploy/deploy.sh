#!/bin/bash

# Home Dashboard - Deployment Script
# Downloads latest code from GitHub and deploys to replace existing deployment

set -e

# Configuration
REPO_URL="https://github.com/IntegralSec/home_dashboard.git"
DEPLOY_DIR="/opt/home_dashboard"
BACKUP_DIR="/opt/home_dashboard_backup"
TEMP_DIR="/tmp/home_dashboard_deploy"
SERVICE_NAME="kiosk-api"
WEB_ROOT="/var/www/html"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_error "This script should not be run as root. Please run as the dashboard user or with sudo for specific commands."
        exit 1
    fi
}

# Check if required directories exist
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if [ ! -d "$DEPLOY_DIR" ]; then
        log_error "Deployment directory $DEPLOY_DIR does not exist. Please run install.sh first."
        exit 1
    fi
    
    if [ ! -f "$DEPLOY_DIR/.env" ]; then
        log_error "Environment file $DEPLOY_DIR/.env not found. Please ensure it exists before deploying."
        exit 1
    fi
    
    if ! command -v git &> /dev/null; then
        log_error "Git is not installed. Please install git first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install Node.js first."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Create backup of current deployment
create_backup() {
    log_info "Creating backup of current deployment..."
    
    if [ -d "$DEPLOY_DIR" ]; then
        # Remove old backup if it exists
        if [ -d "$BACKUP_DIR" ]; then
            log_info "Removing old backup..."
            sudo rm -rf "$BACKUP_DIR"
        fi
        
        # Create backup
        log_info "Backing up current deployment to $BACKUP_DIR..."
        sudo cp -r "$DEPLOY_DIR" "$BACKUP_DIR"
        sudo chown -R dashboard:dashboard "$BACKUP_DIR"
        log_success "Backup created successfully"
    else
        log_warning "No existing deployment found to backup"
    fi
}

# Stop services
stop_services() {
    log_info "Stopping services..."
    
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        log_info "Stopping $SERVICE_NAME service..."
        sudo systemctl stop "$SERVICE_NAME"
        log_success "$SERVICE_NAME service stopped"
    else
        log_warning "$SERVICE_NAME service is not running"
    fi
}

# Download latest code
download_code() {
    log_info "Downloading latest code from GitHub..."
    
    # Remove temp directory if it exists
    if [ -d "$TEMP_DIR" ]; then
        rm -rf "$TEMP_DIR"
    fi
    
    # Clone repository
    log_info "Cloning repository to $TEMP_DIR..."
    git clone "$REPO_URL" "$TEMP_DIR"
    
    # Checkout main branch
    cd "$TEMP_DIR"
    git checkout main
    
    # Get latest commit info
    COMMIT_HASH=$(git rev-parse --short HEAD)
    COMMIT_DATE=$(git log -1 --format=%ci)
    
    log_success "Code downloaded successfully"
    log_info "Latest commit: $COMMIT_HASH ($COMMIT_DATE)"
}

# Build application
build_application() {
    log_info "Building application..."
    
    cd "$TEMP_DIR"
    
    # Install dependencies
    log_info "Installing dependencies..."
    npm install
    
    # Build backend
    log_info "Building backend..."
    npm run build:backend
    
    # Build frontend
    log_info "Building frontend..."
    npm run build:frontend
    
    log_success "Application built successfully"
}

# Deploy application
deploy_application() {
    log_info "Deploying application..."
    
    # Remove old deployment (except .env and secrets)
    log_info "Removing old deployment files..."
    sudo rm -rf "$DEPLOY_DIR/dist"
    sudo rm -rf "$DEPLOY_DIR/node_modules"
    sudo rm -rf "$DEPLOY_DIR/package*.json"
    sudo rm -rf "$DEPLOY_DIR/tsconfig.json"
    sudo rm -rf "$DEPLOY_DIR/src"
    sudo rm -rf "$DEPLOY_DIR/frontend"
    sudo rm -rf "$DEPLOY_DIR/backend"
    sudo rm -rf "$DEPLOY_DIR/deploy"
    sudo rm -rf "$DEPLOY_DIR/README.md"
    sudo rm -rf "$DEPLOY_DIR/.gitignore"
    sudo rm -rf "$DEPLOY_DIR/test-api.http"
    sudo rm -rf "$DEPLOY_DIR/node_js_react_kiosk_calendar_ics_google_tasks_design_spec.md"
    
    # Copy new files
    log_info "Copying new deployment files..."
    sudo cp -r "$TEMP_DIR/backend/dist" "$DEPLOY_DIR/"
    sudo cp "$TEMP_DIR/backend/package.json" "$DEPLOY_DIR/"
    sudo cp "$TEMP_DIR/backend/package-lock.json" "$DEPLOY_DIR/"
    sudo cp "$TEMP_DIR/backend/tsconfig.json" "$DEPLOY_DIR/"
    
    # Copy frontend files to web root
    log_info "Deploying frontend to web server..."
    sudo cp -r "$TEMP_DIR/frontend/dist"/* "$WEB_ROOT/"
    sudo chown -R www-data:www-data "$WEB_ROOT"
    sudo chmod -R 644 "$WEB_ROOT"
    sudo find "$WEB_ROOT" -type d -exec chmod 755 {} \;
    
    # Set ownership
    sudo chown -R dashboard:dashboard "$DEPLOY_DIR"
    
    log_success "Application deployed successfully"
}

# Start services
start_services() {
    log_info "Starting services..."
    
    # Reload systemd in case service file changed
    sudo systemctl daemon-reload
    
    # Start the service
    log_info "Starting $SERVICE_NAME service..."
    sudo systemctl start "$SERVICE_NAME"
    
    # Wait a moment for service to start
    sleep 3
    
    # Check if service is running
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        log_success "$SERVICE_NAME service started successfully"
    else
        log_error "$SERVICE_NAME service failed to start"
        log_info "Checking service status..."
        sudo systemctl status "$SERVICE_NAME" --no-pager
        return 1
    fi
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Wait for service to be ready
    sleep 5
    
    # Check if API is responding
    if curl -s -f "http://localhost:5055/api/health" > /dev/null; then
        log_success "API health check passed"
    else
        log_warning "API health check failed - service may still be starting"
    fi
    
    # Check if frontend is accessible
    if curl -s -f "http://localhost/" > /dev/null; then
        log_success "Frontend accessibility check passed"
    else
        log_warning "Frontend accessibility check failed"
    fi
}

# Cleanup
cleanup() {
    log_info "Cleaning up temporary files..."
    
    if [ -d "$TEMP_DIR" ]; then
        rm -rf "$TEMP_DIR"
        log_success "Temporary files cleaned up"
    fi
}

# Rollback function
rollback() {
    log_error "Deployment failed. Rolling back..."
    
    if [ -d "$BACKUP_DIR" ]; then
        log_info "Restoring from backup..."
        
        # Stop current service
        if systemctl is-active --quiet "$SERVICE_NAME"; then
            sudo systemctl stop "$SERVICE_NAME"
        fi
        
        # Remove failed deployment
        sudo rm -rf "$DEPLOY_DIR"
        
        # Restore backup
        sudo mv "$BACKUP_DIR" "$DEPLOY_DIR"
        sudo chown -R dashboard:dashboard "$DEPLOY_DIR"
        
        # Start service
        sudo systemctl start "$SERVICE_NAME"
        
        log_success "Rollback completed"
    else
        log_error "No backup found for rollback"
    fi
}

# Main deployment function
main() {
    log_info "🚀 Starting Home Dashboard deployment..."
    log_info "Repository: $REPO_URL"
    log_info "Deploy directory: $DEPLOY_DIR"
    
    # Set up error handling
    trap 'log_error "Deployment failed at line $LINENO"; rollback; cleanup; exit 1' ERR
    
    # Run deployment steps
    check_root
    check_prerequisites
    create_backup
    stop_services
    download_code
    build_application
    deploy_application
    start_services
    verify_deployment
    cleanup
    
    log_success "🎉 Deployment completed successfully!"
    log_info "The Home Dashboard is now running with the latest code."
    log_info "You can access it at: http://localhost/"
    
    # Show service status
    log_info "Service status:"
    sudo systemctl status "$SERVICE_NAME" --no-pager
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "Home Dashboard Deployment Script"
        echo ""
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --rollback     Rollback to previous deployment"
        echo "  --status       Show current deployment status"
        echo ""
        echo "This script will:"
        echo "  1. Create a backup of the current deployment"
        echo "  2. Stop the running services"
        echo "  3. Download the latest code from GitHub"
        echo "  4. Build the application"
        echo "  5. Deploy the new version"
        echo "  6. Start the services"
        echo "  7. Verify the deployment"
        echo ""
        exit 0
        ;;
    --rollback)
        rollback
        exit 0
        ;;
    --status)
        log_info "Current deployment status:"
        echo ""
        echo "Service status:"
        sudo systemctl status "$SERVICE_NAME" --no-pager
        echo ""
        echo "API health:"
        if curl -s -f "http://localhost:5055/api/health" > /dev/null; then
            log_success "API is healthy"
        else
            log_error "API is not responding"
        fi
        echo ""
        echo "Frontend:"
        if curl -s -f "http://localhost/" > /dev/null; then
            log_success "Frontend is accessible"
        else
            log_error "Frontend is not accessible"
        fi
        exit 0
        ;;
    "")
        main
        ;;
    *)
        log_error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac
