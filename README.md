# Kiosk Calendar & Tasks

A lightweight Node.js + React application designed to display Google Calendar events and Google Tasks on a Raspberry Pi kiosk setup.

## Features

- 📅 **Calendar Display**: Shows events from Google Calendar ICS feed in month/week/day views
- ✅ **Tasks Display**: Shows Google Tasks with due dates and completion status
- 🔄 **Auto-refresh**: Configurable data refresh with on-disk caching
- 🖥️ **Kiosk Mode**: Optimized for full-screen display without mouse/keyboard
- 📱 **Responsive**: Works on different screen sizes
- ⚡ **Lightweight**: Minimal resource usage for Raspberry Pi Zero 2 W

## Architecture

```
[Chromium Kiosk] ──HTTP──> [Caddy/Lighttpd]
      │                          │
      └────────── /api/* ───────>└───> [NodeJS Backend]
                                         ├─ ICS Parser
                                         └─ Google Tasks API
```

## Quick Start

### Prerequisites

- Raspberry Pi OS Lite (Bullseye)
- Google Calendar ICS URL
- Google Cloud Console project with Tasks API enabled

### 1. Installation

```bash
# Clone or copy the project files
cd /opt/kiosk-api

# Install dependencies
npm install

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
cd backend
npm run oauth
```

Follow the instructions to complete OAuth flow. This will store the refresh token for automatic authentication.

### 5. Build and Deploy

```bash
# Build backend
cd backend
npm run build

# Build frontend
cd ../frontend
npm install
npm run build

# Copy frontend to web directory
sudo cp -r dist/* /var/www/html/
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
cd backend
npm run dev  # Starts with hot reload
```

### Frontend Development

```bash
cd frontend
npm run dev  # Starts Vite dev server with proxy
```

### API Endpoints

- `GET /api/health` - Health check
- `GET /api/calendar` - Calendar events
- `GET /api/tasks` - Tasks list
- `GET /api/meta` - Cache metadata
- `POST /api/admin/refresh` - Force refresh (requires admin token)

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend port | 5055 |
| `BIND_ADDRESS` | Bind address | 127.0.0.1 |
| `ICS_URL` | Google Calendar ICS URL | Required |
| `CACHE_TTL_SECONDS` | Cache TTL | 300 |
| `TIMEZONE` | Timezone | America/Toronto |
| `GOOGLE_CLIENT_ID` | OAuth client ID | Required |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret | Required |
| `DATA_DIR` | Data directory | /srv/data |
| `SECRETS_DIR` | Secrets directory | /opt/kiosk-api/secrets |
| `ADMIN_TOKEN` | Admin API token | change_me |

### Google Calendar ICS URL

To get your ICS URL:
1. Open Google Calendar
2. Go to Settings → Calendar settings
3. Find your calendar → Integrate calendar
4. Copy the "Public URL to this calendar" (ICS format)

## Troubleshooting

### Common Issues

**OAuth errors:**
```bash
# Re-run OAuth bootstrap
cd backend
npm run oauth
```

**Service not starting:**
```bash
# Check logs
sudo journalctl -u kiosk-api -f

# Check configuration
sudo systemctl status kiosk-api
```

**Frontend not loading:**
```bash
# Check Caddy logs
sudo journalctl -u caddy -f

# Verify files are in place
ls -la /var/www/html/
```

**Calendar not updating:**
```bash
# Force refresh
curl -X POST http://localhost/api/admin/refresh

# Check ICS URL
curl -I "YOUR_ICS_URL"
```

### Logs

- Backend logs: `sudo journalctl -u kiosk-api -f`
- Caddy logs: `sudo journalctl -u caddy -f`
- System logs: `sudo journalctl -f`

## Security Notes

- Service binds to localhost only
- OAuth tokens stored with restrictive permissions (600)
- Admin endpoints require token or localhost access
- No public internet exposure

## Performance

- Backend memory usage: < 120 MB
- Frontend bundle size: < 300 KB gzipped
- Cache hit response time: < 50 ms
- First paint: < 2s on Pi Zero 2 W

## License

MIT
