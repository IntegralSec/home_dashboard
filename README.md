# Kiosk Calendar & Tasks

A lightweight Node.js + React application designed to display Google Calendar events and Google Tasks on a Raspberry Pi kiosk setup.

## Features

- 📅 **Calendar Display**: Shows events from Google Calendar ICS feed in month/week/day views
- ✅ **Tasks Display**: Shows Google Tasks with due dates and completion status
- 🔄 **Auto-refresh**: Configurable data refresh with on-disk caching
- 🖥️ **Kiosk Mode**: Optimized for full-screen display without mouse/keyboard
- 📱 **Responsive**: Works on different screen sizes
- ⚡ **Lightweight**: Minimal resource usage for Raspberry Pi Zero 2 W
- 🔐 **Secure**: OAuth token storage with restrictive permissions
- 🚀 **Fast**: Sub-50ms response times with intelligent caching

## Architecture

```
[Chromium Kiosk] ──HTTP──> [Caddy Web Server]
      │                          │
      └────────── /api/* ───────>└───> [NodeJS Backend]
                                         ├─ ICS Parser (node-ical)
                                         ├─ Google Tasks API (googleapis)
                                         └─ File-based Cache Manager
```

## Quick Start

### Prerequisites

- Raspberry Pi OS Lite (Bullseye) or similar Linux distribution
- Node.js LTS (v18+)
- Google Calendar ICS URL
- Google Cloud Console project with Tasks API enabled

### 1. Installation

```bash
# Clone or copy the project files
cd /opt/kiosk-api

# Install dependencies for all packages
npm run install:all

# Install system dependencies (run as root)
sudo bash deploy/install.sh
```

### 2. Configuration

Copy the example environment file and configure it:

```bash
cp backend/env.example backend/.env
nano backend/.env
```

Required configuration:
- `ICS_URL`: Your Google Calendar ICS feed URL
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `TIMEZONE`: Your timezone (e.g., "America/Toronto")

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Tasks API
4. Create OAuth 2.0 credentials (Desktop application type)
5. Add the client ID and secret to your `.env` file

### 4. Bootstrap Authentication

```bash
npm run oauth
```

Follow the instructions to complete OAuth flow. This will store the refresh token for automatic authentication.

### 5. Build and Deploy

```bash
# Build all packages
npm run build:all

# Copy frontend to web directory
sudo cp -r frontend/dist/* /var/www/html/
```

### 6. Start Services

```bash
# Enable and start backend service
sudo systemctl enable kiosk-api
sudo systemctl start kiosk-api

# Enable and start web server
sudo systemctl enable caddy
sudo systemctl start caddy

# Check status
sudo systemctl status kiosk-api
sudo systemctl status caddy
```

### 7. Kiosk Setup

Configure Chromium to start in kiosk mode:

```bash
# Edit autostart file
nano ~/.config/lxsession/LXDE-pi/autostart

# Add this line:
@chromium-browser --kiosk --no-first-run --noerrdialogs --disable-translate --disable-pinch --overscroll-history-navigation=0 http://localhost/

# Disable screen blanking
sudo nano /etc/lightdm/lightdm.conf
# Add: xserver-command=X -s 0 -dpms
```

## Development

### Backend Development

```bash
npm run dev:backend  # Starts with hot reload using tsx
```

### Frontend Development

```bash
npm run dev:frontend  # Starts Vite dev server with proxy
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run install:all` | Install dependencies for both backend and frontend |
| `npm run build:all` | Build both backend and frontend |
| `npm run dev:backend` | Start backend in development mode |
| `npm run dev:frontend` | Start frontend in development mode |
| `npm run start:backend` | Start production backend server |
| `npm run oauth` | Bootstrap Google OAuth authentication |

## API Endpoints

### Public Endpoints

#### `GET /api/health`
Health check endpoint that returns server status and uptime.

**Response:**
```json
{
  "ok": true,
  "uptime": 123.45,
  "version": "1.0.0"
}
```

#### `GET /api/calendar`
Returns cached calendar events from the ICS feed.

**Response:**
```json
[
  {
    "id": "event_id",
    "title": "Event Title",
    "start": "2024-01-15T10:00:00.000Z",
    "end": "2024-01-15T11:00:00.000Z",
    "allDay": false,
    "description": "Event description",
    "location": "Event location"
  }
]
```

#### `GET /api/tasks`
Returns cached Google Tasks with due dates and completion status.

**Response:**
```json
[
  {
    "id": "task_id",
    "title": "Task Title",
    "due": "2024-01-15T00:00:00.000Z",
    "completed": false,
    "notes": "Task notes"
  }
]
```

#### `GET /api/meta`
Returns cache metadata including timestamps and TTL information.

**Response:**
```json
{
  "calendar": {
    "timestamp": 1705312800000,
    "ttl": 300,
    "size": 1024
  },
  "tasks": {
    "timestamp": 1705312800000,
    "ttl": 300,
    "size": 512
  },
  "timezone": "America/Toronto",
  "nextRefresh": 1705313100000
}
```

### Admin Endpoints

#### `POST /api/admin/refresh`
Force refresh all cached data. Requires admin token or localhost access.

**Authorization:** Bearer token in Authorization header or localhost origin

**Response:**
```json
{
  "success": true,
  "message": "Cache refresh completed"
}
```

## NPM Packages

### Backend Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@fastify/cors` | ^8.4.0 | Cross-origin resource sharing |
| `dotenv` | ^16.3.1 | Environment variable loading |
| `fastify` | ^4.24.3 | Web framework |
| `fs-extra` | ^11.1.1 | Enhanced file system operations |
| `googleapis` | ^126.0.1 | Google APIs client |
| `luxon` | ^3.4.4 | Date/time manipulation |
| `node-ical` | ^0.16.1 | ICS calendar parsing |

### Backend Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@types/fs-extra` | ^11.0.4 | TypeScript definitions for fs-extra |
| `@types/luxon` | ^3.7.1 | TypeScript definitions for luxon |
| `@types/node` | ^20.8.7 | TypeScript definitions for Node.js |
| `tsx` | ^3.14.0 | TypeScript execution |
| `typescript` | ^5.2.2 | TypeScript compiler |

### Frontend Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `luxon` | ^3.4.4 | Date/time manipulation |
| `react` | ^18.2.0 | UI framework |
| `react-dom` | ^18.2.0 | React DOM rendering |

### Frontend Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@types/luxon` | ^3.7.1 | TypeScript definitions for luxon |
| `@types/react` | ^18.2.37 | TypeScript definitions for React |
| `@types/react-dom` | ^18.2.15 | TypeScript definitions for React DOM |
| `@vitejs/plugin-react` | ^4.1.1 | Vite React plugin |
| `typescript` | ^5.2.2 | TypeScript compiler |
| `vite` | ^4.5.0 | Build tool and dev server |

### Root Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@types/luxon` | ^3.7.1 | TypeScript definitions for luxon |

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Backend server port | 5055 | No |
| `BIND_ADDRESS` | Server bind address | 127.0.0.1 | No |
| `ICS_URL` | Google Calendar ICS feed URL | - | Yes |
| `CACHE_TTL_SECONDS` | Cache time-to-live in seconds | 300 | No |
| `TIMEZONE` | Application timezone | America/Toronto | No |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | - | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | - | Yes |
| `GOOGLE_REDIRECT_URI` | OAuth redirect URI | http://127.0.0.1:5555/oauth2callback | No |
| `GOOGLE_SCOPES` | OAuth scopes | https://www.googleapis.com/auth/tasks.readonly | No |
| `DATA_DIR` | Data storage directory | /srv/data | No |
| `SECRETS_DIR` | OAuth secrets directory | /opt/kiosk-api/secrets | No |
| `ADMIN_TOKEN` | Admin API authentication token | change_me | No |

### Google Calendar ICS URL

To get your ICS URL:
1. Open Google Calendar
2. Go to Settings → Calendar settings
3. Find your calendar → Integrate calendar
4. Copy the "Public URL to this calendar" (ICS format)

**Note:** The URL should end with `/basic.ics` for the basic format.

## Setup and Deployment

### Automated Installation

The project includes an automated installation script for Raspberry Pi OS:

```bash
# Run the installation script (as root)
sudo bash deploy/install.sh
```

This script will:
- Update system packages
- Install Node.js LTS
- Install Caddy web server
- Create necessary directories with proper permissions
- Copy systemd service files
- Copy Caddy configuration

### Manual Deployment Steps

If you prefer manual setup or are using a different distribution:

1. **Install Node.js LTS:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Install Caddy web server:**
   ```bash
   sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
   sudo apt update
   sudo apt install -y caddy
   ```

3. **Create directories:**
   ```bash
   sudo mkdir -p /opt/kiosk-api /srv/data /var/www/html /var/log/caddy
   sudo chown -R pi:pi /opt/kiosk-api /srv/data
   sudo chown -R www-data:www-data /var/www/html
   ```

4. **Copy configuration files:**
   ```bash
   sudo cp deploy/kiosk-api.service /etc/systemd/system/
   sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
   sudo systemctl daemon-reload
   ```

### Production Deployment

For production deployment:

1. **Build the application:**
   ```bash
   npm run build:all
   ```

2. **Deploy frontend:**
   ```bash
   sudo cp -r frontend/dist/* /var/www/html/
   ```

3. **Deploy backend:**
   ```bash
   sudo cp -r backend/dist/* /opt/kiosk-api/
   sudo cp backend/.env /opt/kiosk-api/
   ```

4. **Start services:**
   ```bash
   sudo systemctl enable kiosk-api caddy
   sudo systemctl start kiosk-api caddy
   ```

## Troubleshooting

### Common Issues

**OAuth errors:**
```bash
# Re-run OAuth bootstrap
npm run oauth

# Check if secrets directory exists and has correct permissions
ls -la /opt/kiosk-api/secrets/
```

**Service not starting:**
```bash
# Check service status
sudo systemctl status kiosk-api

# Check logs
sudo journalctl -u kiosk-api -f

# Verify environment file
cat /opt/kiosk-api/.env
```

**Frontend not loading:**
```bash
# Check Caddy status
sudo systemctl status caddy

# Check Caddy logs
sudo journalctl -u caddy -f

# Verify files are in place
ls -la /var/www/html/
```

**Calendar not updating:**
```bash
# Force refresh via API
curl -X POST http://localhost/api/admin/refresh

# Check ICS URL accessibility
curl -I "YOUR_ICS_URL"

# Check cache metadata
curl http://localhost/api/meta
```

**Tasks not loading:**
```bash
# Check OAuth configuration
ls -la /opt/kiosk-api/secrets/

# Verify Google OAuth credentials in .env
grep GOOGLE_CLIENT /opt/kiosk-api/.env
```

### Logs and Monitoring

**Service Logs:**
```bash
# Backend logs
sudo journalctl -u kiosk-api -f

# Caddy web server logs
sudo journalctl -u caddy -f

# Application-specific Caddy logs
sudo tail -f /var/log/caddy/kiosk.log

# System logs
sudo journalctl -f
```

**Health Checks:**
```bash
# API health check
curl http://localhost/api/health

# Check cache status
curl http://localhost/api/meta

# Test calendar endpoint
curl http://localhost/api/calendar

# Test tasks endpoint
curl http://localhost/api/tasks
```

### Performance Monitoring

**Resource Usage:**
```bash
# Check memory usage
free -h

# Check disk usage
df -h

# Monitor system resources
htop
```

**Cache Performance:**
- Cache hit response time: < 50 ms
- Cache miss (fresh fetch): 2-5 seconds
- Memory usage: < 120 MB total

## Security Notes

- **Network Security**: Service binds to localhost only (127.0.0.1)
- **File Permissions**: OAuth tokens stored with restrictive permissions (600)
- **Admin Access**: Admin endpoints require Bearer token or localhost origin
- **No Public Exposure**: Application not accessible from external networks
- **HTTPS**: Caddy can be configured with TLS certificates for local HTTPS
- **Process Isolation**: systemd service runs with security restrictions

## Performance Characteristics

### Resource Usage
- **Backend Memory**: < 120 MB (Node.js process)
- **Frontend Bundle**: < 300 KB gzipped
- **Disk Usage**: < 50 MB (including dependencies)
- **CPU Usage**: Minimal during normal operation

### Response Times
- **Cache Hit**: < 50 ms
- **Cache Miss**: 2-5 seconds (depending on external API response)
- **First Paint**: < 2 seconds on Raspberry Pi Zero 2 W
- **Time to Interactive**: < 3 seconds

### Scalability
- **Concurrent Users**: Designed for single-user kiosk display
- **Cache TTL**: Configurable (default: 5 minutes)
- **Data Storage**: File-based caching suitable for small deployments

## License

MIT License - see LICENSE file for details.
