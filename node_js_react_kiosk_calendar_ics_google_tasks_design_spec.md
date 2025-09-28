# NodeJS + React Kiosk (Calendar ICS + Google Tasks) — Design Spec

**Target device**: Raspberry Pi Zero 2 W (Raspberry Pi OS Lite, Bullseye).  
**Goal**: Display a calendar (from a Google Calendar ICS URL) and a Google Tasks task list on a connected monitor in kiosk mode (Chromium).  
**Constraints**: Low CPU/RAM, no keyboard/mouse, network may be flaky.

---

## 1) Objectives & Non‑Goals

### 1.1 Objectives
- Render a **month/week/day** calendar view from a **Google Calendar ICS** feed.
- Render a **task list** (read‑only) from **Google Tasks API**.
- Auto‑refresh data on a configurable interval with on‑disk caching to ensure smooth UI.
- Serve a lightweight React SPA locally and expose a tiny local API for calendar/tasks.
- Autostart in **Chromium kiosk mode** on boot.

### 1.2 Non‑Goals
- No write operations (no event/task creation, edits, or deletes).
- No multi‑tenant/multi‑user admin UI. OAuth is a one‑time bootstrap on the Pi.
- No public internet exposure; service is intended for **localhost** only.

---

## 2) High‑Level Architecture

```
[Chromium Kiosk] ──HTTP──> [Caddy/Lighttpd static server]
      │                          │
      └────────── /api/* ───────>└───> [NodeJS Backend (Fastify)]
                                         ├─ fetch ICS → parse → cache (JSON)
                                         └─ Google Tasks (OAuth) → cache (JSON)
```

- **Frontend**: React (Vite) SPA. Fetches `/api/calendar` and `/api/tasks`.
- **Backend**: NodeJS (Fastify). Parses ICS using `node-ical`, calls Google Tasks via `googleapis`.
- **Reverse proxy/static**: Caddy (preferred) or Lighttpd. Serves SPA, reverse‑proxies `/api/*` to `127.0.0.1:5055`.
- **Kiosk**: Existing boot script launches Chromium to `http://localhost/`.
- **Caching**: On-disk JSON cache in `/srv/data`; TTL configurable.

---

## 3) Technology Choices

- **NodeJS**: v20 LTS (or latest LTS available on Bullseye via NodeSource).  
- **Server framework**: Fastify.  
- **Google API client**: `googleapis` (`@google-cloud/local-auth` allowed if helpful).  
- **ICS parsing**: `node-ical`.  
- **Frontend**: React + Vite. Minimal deps; aim for < 300 KB gzipped JS.
- **Styling**: Tailwind or light CSS modules; avoid heavy UI kits.
- **Process mgmt**: systemd service (no PM2 required).  
- **Logging**: stdout (captured by journald). Optional daily log file via reverse proxy.

---

## 4) Configuration

Use a `.env` file (dotenv) read by the backend and build‑time vars for the frontend.

```
# /opt/kiosk-api/.env
PORT=5055
BIND_ADDRESS=127.0.0.1
ICS_URL=https://calendar.google.com/calendar/ical/SECRET/basic.ics
CACHE_TTL_SECONDS=300
TIMEZONE=America/Toronto
# Google OAuth (installed app)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://127.0.0.1:5555/oauth2callback
# Task scopes (read-only)
GOOGLE_SCOPES=https://www.googleapis.com/auth/tasks.readonly
# Storage
DATA_DIR=/srv/data
SECRETS_DIR=/opt/kiosk-api/secrets
# Optional: restrict /api/admin endpoints via a simple shared secret
ADMIN_TOKEN=change_me
```

Frontend build can embed `VITE_REFRESH_MS` (e.g., 60000) for polling.

---

## 5) Backend (Fastify) — Detailed Spec

### 5.1 Endpoints

- `GET /api/health`
  - **200** `{ "ok": true, "uptime": number, "version": string }`

- `GET /api/calendar`
  - Returns parsed events array from cached ICS (refresh if expired).
  - **Response 200 (JSON)**: `Event[]`

- `GET /api/tasks`
  - Returns merged tasks from one or more lists (configurable; default: user’s primary task list).
  - **Response 200 (JSON)**: `Task[]`

- `POST /api/admin/refresh` *(local-only, optional)*
  - Triggers cache refresh for both calendar and tasks.
  - Requires `Authorization: Bearer <ADMIN_TOKEN>` or `127.0.0.1` origin.

- `GET /api/meta`
  - Returns metadata (cache age timestamps, next refresh eta, timezone).

### 5.2 Data Models

**Event**
```ts
interface Event {
  id: string;
  title: string;
  start: string;       // ISO8601 in TIMEZONE
  end?: string;        // ISO8601 in TIMEZONE
  allDay?: boolean;
  location?: string;
  sourceUrl?: string;  // optional html link if available
}
```

**Task**
```ts
interface Task {
  id: string;
  listId: string;
  title: string;
  notes?: string;
  due?: string;        // ISO8601 (date or datetime)
  status: 'needsAction' | 'completed';
  completedAt?: string;
  updated: string;     // ISO8601
}
```

### 5.3 ICS Handling
- Fetch ICS from `ICS_URL` with timeout (10s) and ETag/If-Modified-Since headers when available.
- Parse with `node-ical`.
- Convert dates to configured `TIMEZONE` (use `luxon`).
- Cache to `${DATA_DIR}/calendar.json` with `mtime` as cache timestamp.
- If fetch fails and cache exists → serve stale cache + set `"stale": true` metadata in `/api/meta`.

### 5.4 Google Tasks Handling
- Use OAuth 2.0 **Installed App** flow with loopback redirect to `127.0.0.1:5555` (or Device Code flow if chosen). A CLI bootstrap command will:
  1) Start a local mini-server to capture the auth code.
  2) Open the Google consent URL (print it if no GUI).  
  3) Exchange for tokens; store **refresh token** in `${SECRETS_DIR}/token.json` (chmod 600).
- Minimal scope: `tasks.readonly`.
- On server start: load credentials; refresh access token as needed.
- Fetch default task list (or lists specified via config), flatten tasks to one array.
- Cache to `${DATA_DIR}/tasks.json` like ICS (TTL same as `CACHE_TTL_SECONDS`).

### 5.5 Caching Strategy
- Read‑through cache: on request, if cache is fresh → return; else refresh (with lock to avoid stampede), write to disk, then return.
- Background refresh option: set up a lightweight internal interval (e.g., every `CACHE_TTL_SECONDS`) to prefetch, or rely solely on read‑through.

### 5.6 Errors & Status Codes
- Network/parse errors → `503` when no cache available. If cache exists, return `200` with last good data and expose staleness in `/api/meta`.
- Validate ICS URL format on startup; warn if non‑HTTPS.

### 5.7 Logging
- Fastify pino logger disabled by default; enable minimal logs in production.
- Log refresh attempts, success/failure, and cache age.

### 5.8 Security
- Bind `BIND_ADDRESS=127.0.0.1` only.
- `/api/admin/*` requires bearer token or localhost.
- Secrets dir permissions: `0700` (dir), token file `0600`.
- Use least scopes for Google APIs (read‑only).

---

## 6) Frontend (React + Vite) — Detailed Spec

### 6.1 Pages/Views
- **Main layout**: two panes side-by-side (responsive stacks on narrow screens):
  - Left: **Calendar** (Month default; simple Week/Day toggle).
  - Right: **Tasks** (group by status; upcoming due dates pinned on top).
- **Header**: current month, last sync time, a small status dot (green=fresh, yellow=stale).

### 6.2 Component Guidelines
- Keep bundle small (< 300 KB gzipped). Prefer hand‑rolled month grid or **FullCalendar** with only necessary plugins (dayGrid, timeGrid). Avoid moment.js (use `luxon`).
- Poll `/api/calendar` and `/api/tasks` every `VITE_REFRESH_MS` (default 60s). Debounce updates to avoid UI thrash.
- Show skeleton/loading states and stale badges if `/api/meta.stale`.
- Timezone: display in `TIMEZONE` provided by `/api/meta`.

### 6.3 Accessibility & Kiosk UX
- Large, high‑contrast fonts suitable for 1080p from a distance.
- Avoid hover‑only affordances (no mouse). Keyboard not required.
- No modals; no scroll jank.

### 6.4 Error UX
- If backend unavailable, show friendly “Reconnecting…” toast and last cached UI if available.

---

## 7) Reverse Proxy & Static Serving

### 7.1 Caddy (preferred)

**Caddyfile**
```
:80 {
  encode zstd gzip
  root * /var/www/html
  file_server

  @api path /api/*
  reverse_proxy @api 127.0.0.1:5055
}
```
- Copy React build to `/var/www/html`.
- Service: `systemctl enable --now caddy` (package installation assumed).

### 7.2 Lighttpd (alternative)

```
server.document-root = "/var/www/html"
server.port = 80

$HTTP["url"] =~ "^/api/" {
  proxy.server = ( "" => (( "host" => "127.0.0.1", "port" => 5055 )) )
}
```

---

## 8) Systemd Units

**Backend** `/etc/systemd/system/kiosk-api.service`
```
[Unit]
Description=Kiosk API (NodeJS)
After=network-online.target
Wants=network-online.target

[Service]
EnvironmentFile=/opt/kiosk-api/.env
User=pi
WorkingDirectory=/opt/kiosk-api
ExecStart=/usr/bin/node ./dist/server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

*(If not using a build step for server, point to `index.js` directly.)*

---

## 9) Project Structure

```
/kiosk
  /frontend
    /src
      /components
      /pages
      /lib
    index.html
    vite.config.ts
    package.json
  /backend
    /src
      server.ts (or index.js)
      lib/ics.ts
      lib/tasks.ts
      lib/cache.ts
      lib/oauth.ts
    package.json
    .env.example
  /deploy
    Caddyfile
    lighttpd.conf
    kiosk-api.service
```

---

## 10) Implementation Details (Backend)

- **`lib/cache.ts`**: read/write JSON to `${DATA_DIR}` with TTL check (mtime). Include a simple file lock (create `.lock` file; if exists and younger than 15s, skip concurrent refresh).
- **`lib/ics.ts`**: fetch with `node-fetch` using ETag/If-Modified-Since; parse via `node-ical`; normalize to `TIMEZONE` using `luxon`, return `Event[]`.
- **`lib/oauth.ts`**: bootstrap command `npm run oauth` to obtain and store token. Store at `${SECRETS_DIR}/token.json`. Enforce `0600` perms.
- **`lib/tasks.ts`**: read token, create `google.auth.OAuth2`, set credentials, call `tasks.tasks.list` for selected list(s); map to `Task[]` and cache.
- **`server.ts`**: Fastify routes, health/meta, and admin refresh. Bind to `BIND_ADDRESS`.

---

## 11) Implementation Details (Frontend)

- **State**: minimal, use React Query or a tiny custom hook with `fetch` + stale‑while‑revalidate.
- **Calendar**: show month grid with event titles; click‑less. Week/Day toggle optional.
- **Tasks**: two sections — Upcoming & Completed (limit completed to recent N). Show due badges.
- **Theming**: CSS variables for colors; high‑contrast default.

---

## 12) Performance Budgets

- Backend RSS < 120 MB; CPU idle low.
- Frontend total JS < 300 KB gzipped; first paint < 2s on Pi Zero 2 W.
- API response time (cache hit) < 50 ms.

---

## 13) Testing & Acceptance Criteria

### 13.1 Unit/Integration Tests
- Backend: mock ICS and Google APIs; verify parsing, caching, staleness, and error paths.
- Frontend: render calendar/task lists with sample payloads; ensure no runtime errors on refresh.

### 13.2 Manual E2E
- With network, both panels populate within 5s; without network, stale data renders and UI shows “stale” indicator.
- Reboot test: Chromium comes up to `http://localhost/` and content shows automatically.

### 13.3 Acceptance Criteria
- ✅ `GET /api/calendar` and `GET /api/tasks` return valid JSON per models.
- ✅ Caching works with TTL; stale served if upstream unavailable.
- ✅ OAuth bootstrap stores refresh token and survives reboots.
- ✅ SPA renders calendar + tasks within budgets.

---

## 14) Build & Run Commands

**Backend**
```
cd backend
npm ci
npm run build   # if TS
npm run start   # or node src/index.js
npm run oauth   # one-time to obtain Google token (instructions print to console)
```

**Frontend**
```
cd frontend
npm ci
npm run build
sudo cp -r dist/* /var/www/html/
```

---

## 15) Security Notes

- Never expose the backend outside localhost.
- Lock down `SECRETS_DIR` and token file perms; do not check into git.
- Use read-only scopes.

---

## 16) Future Extensions

- Multiple calendars (aggregate multi‑ICS sources).
- Multiple task lists with tabs.
- Service worker for offline caching of the SPA assets.
- Night mode / large text accessibility toggle.

---

## 17) Deliverables

- `backend/` Node project with Fastify, production start script, and systemd unit file.
- `frontend/` React + Vite project; static build artifacts.
- Deployment docs covering: installing Node, Caddy/Lighttpd, copying builds, enabling services, OAuth bootstrap steps, and kiosk Chromium flags.

---

## 18) OAuth Bootstrap (Operator Steps)

1. Create OAuth 2.0 **Desktop app** creds in Google Cloud Console.
2. Put Client ID/Secret in `/opt/kiosk-api/.env` and copy to `${SECRETS_DIR}`.
3. Run `npm run oauth` on the Pi via SSH; follow printed URL from another device; approve; ensure `token.json` is created with `0600` perms.
4. Restart backend: `sudo systemctl restart kiosk-api`.

---

## 19) Kiosk Integration

- Chromium points to `http://localhost/`.
- Add flags: `--kiosk --no-first-run --noerrdialogs --disable-translate --disable-pinch --overscroll-history-navigation=0`.
- Disable screen blanking via X (`xset s off -dpms s noblank`).

---

## 20) Wireframe (rough)

```
+--------------------------------------------------------------+
|  September 2025                                  ● Fresh     |
|  [Month ▾] [Week] [Day]         Last sync: 12:01             |
+-------------------+------------------------------------------+
|                   |  Tasks                                   |
|   Calendar grid   |  - [ ] Prepare slides (Due Tue)          |
|   (month view)    |  - [ ] Order parts (Due Fri)             |
|                   |  Completed                                |
|                   |  - [x] Renew domain (Yesterday)          |
+-------------------+------------------------------------------+
```

---

**End of Spec**

