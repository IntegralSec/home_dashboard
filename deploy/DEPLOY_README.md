# Home Dashboard Deployment Script

This directory contains deployment scripts for the Home Dashboard application.

## Scripts

### `install.sh`
Initial installation script for setting up the Home Dashboard on a fresh Raspberry Pi OS system.

### `deploy.sh`
Deployment script for updating an existing Home Dashboard installation with the latest code from GitHub.

## Usage

### Initial Installation
```bash
# Run the installation script (as root or with sudo)
sudo bash deploy/install.sh
```

### Update Existing Deployment
```bash
# Run the deployment script (as dashboard user or with sudo)
bash deploy/deploy.sh
```

## Deployment Script Features

The `deploy.sh` script provides:

- **Automatic Backup**: Creates a backup of the current deployment before updating
- **Service Management**: Stops and starts the kiosk-api service safely
- **Git Integration**: Downloads the latest code from the GitHub repository
- **Build Process**: Automatically builds both backend and frontend
- **Error Handling**: Includes rollback functionality if deployment fails
- **Verification**: Checks that services are running correctly after deployment

### Command Line Options

```bash
# Show help
bash deploy/deploy.sh --help

# Check current deployment status
bash deploy/deploy.sh --status

# Rollback to previous deployment
bash deploy/deploy.sh --rollback
```

## Prerequisites

Before running the deployment script, ensure:

1. The initial installation has been completed (`install.sh`)
2. The `.env` file exists in `/opt/home_dashboard/`
3. Git is installed on the system
4. Node.js and npm are installed
5. The script is run as the `dashboard` user (not root)

## Deployment Process

The deployment script follows these steps:

1. **Prerequisites Check**: Verifies required directories and tools exist
2. **Backup Creation**: Creates a backup of the current deployment
3. **Service Stop**: Stops the running kiosk-api service
4. **Code Download**: Clones the latest code from GitHub
5. **Build Process**: Installs dependencies and builds the application
6. **Deployment**: Copies new files to the deployment directory
7. **Service Start**: Starts the kiosk-api service
8. **Verification**: Checks that services are running correctly
9. **Cleanup**: Removes temporary files

## Troubleshooting

### Deployment Fails
If deployment fails, the script will automatically attempt to rollback to the previous version. You can also manually rollback:

```bash
bash deploy/deploy.sh --rollback
```

### Service Won't Start
Check the service status and logs:

```bash
sudo systemctl status kiosk-api
sudo journalctl -u kiosk-api -f
```

### API Not Responding
Verify the API is accessible:

```bash
curl http://localhost:5055/api/health
```

### Frontend Not Loading
Check if frontend files are in place:

```bash
ls -la /var/www/html/
```

## Security Notes

- The script should not be run as root
- It preserves existing `.env` and `secrets/` directories
- OAuth tokens and configuration are maintained across deployments
- The script includes proper error handling and rollback capabilities
