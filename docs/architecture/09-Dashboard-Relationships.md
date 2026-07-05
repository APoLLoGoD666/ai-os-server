# 09 — Dashboard Relationships

**Date:** 2026-07-02  
**Evidence Source:** server.js (static serving lines 579–595, 923), public/ directory, src/routes/telemetry/index.js, routes/observatory.js

---

## Frontend File Map

| File | Served at | Auth | Purpose |
|------|-----------|------|---------|
| public/dashboard.html | / and /dashboard.html | requireAuth | Main agent control dashboard |
| public/editor.html | /editor | requireAuth | Document/note editor |
| public/sw.js | /sw.js | None | Service worker (PWA offline support) |
| public/manifest.json | /manifest.json | None | PWA manifest |
| public/apex-v2.css | /apex-v2.css | None | Main stylesheet |
| public/apex-custom.css | /apex-custom.css | None | Custom overrides |
| apex-audit.html | UNKNOWN | UNKNOWN | Audit page (at repo root) |
| src/components/ | /src/components/* | None | Component static files |

**Static serving method:** File-by-file `res.sendFile()` — NOT `express.static()` for HTML files (security: prevents directory traversal / env file exposure)

**Exception:** `app.use('/src/components', express.static(...))` — directory-level static for components only

---

## dashboard.html

**Location:** `public/dashboard.html` (canonical) — also `dashboard.html` at root (relationship UNKNOWN)

**Type:** Single-page application (vanilla JS / fetch-based, no bundler confirmed)

**Functions exposed (from CLAUDE.md description):**
- Chat interface
- Agent Control UI (task dispatch, approval, status)
- Memory viewer
- Notifications
- Finance view
- Agent schedules
- Autonomy level display

**Served by:**
```javascript
function _serveDashboard(req, res) {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
}
app.get('/', requireAuth, _serveDashboard);
app.get('/dashboard.html', requireAuth, _serveDashboard);
```

---

## editor.html

**Location:** `public/editor.html`

**Served at:** `/editor` (requireAuth)

**Purpose:** Document creation / editing interface

---

## PWA (Progressive Web App)

**Service Worker:** `public/sw.js` — served at `/sw.js` (no auth)

**Manifest:** `public/manifest.json` — served at `/manifest.json`

**PWA routes module:** `routes/pwa.js` — auto-loaded, handles PWA-specific API endpoints (exact endpoints UNKNOWN)

**iOS PWA bug fix (evidence from server.js:629):** Native form POST redirect used to fix iOS PWA WebKit cookie bug on login

---

## src/routes/telemetry/index.js — Telemetry Dashboard Endpoints

**Mount:** `app.use('/', ...)` at root — telemetry routes accessible without `/api` prefix

**Factory signature:**
```javascript
module.exports = function makeTelemetryRouter({ requireAppAccess, getStatus, errBuffer, gitSha })
```

**Confirmed endpoints (from census):**
- GET /telemetry/status — system status snapshot
- GET /telemetry/errors — recent error buffer
- GET /telemetry/git — git SHA
- GET /api/system/events — server-sent events (REFLEX class — bypasses latency tracking)
- GET /api/latency-stats — latency statistics
- GET /api/latency-traces — latency trace details
- Agent queue status (agentQueue.status() called inside)

**Passed-in dependencies:**
- `requireAppAccess` — from lib/middleware
- `getStatus` → `getMastraStatus` — Mastra initialization status
- `errBuffer` → `_errBuffer` — recent error ring buffer from server.js
- `gitSha` → `GIT_SHA` — build SHA

---

## routes/observatory.js

**Purpose:** Observatory endpoints — system introspection, schema operations, raw pg Pool usage

**Auth:** app-auth (inferred — auto-loaded route)

**DB access:** lib/pg_database.js (raw pg Pool) for schema-level queries

**Internal imports:** UNKNOWN — file not fully read

---

## Health Dashboard

**GET /health** — Public status endpoint serving as Render health check:
```json
{
  "status": "ok|degraded|down",
  "version": "GIT_SHA",
  "uptime": seconds,
  "db": true/false,
  "tts": true/false,
  "ai": true/false,
  "memory": { "heapMb": N, "rssMb": N, "warning": bool, "heapLimit": 220 },
  "mastra": mastraStatus,
  "ws": wsClientCount,
  "sentry": bool,
  "correlationIds": true,
  "recentErrors": last3errors
}
```

**GET /health/deep** — Auth-guarded subsystem health:
- supabase connectivity check
- gateway.getContext() round-trip
- civilization-runtime isRunning/cycleCount

**GET /api/system/health/detailed** — Comprehensive observability snapshot (kernelChain)

---

## WebSocket

**WebSocket handler:** `lib/ws-handler.js` — attached to HTTP server at listen

**Global WS count:** `global._apexWsCount` — displayed in /health response

**Voice WebSocket:** routes/voice-chat.js — voice pipeline state + listener management

---

## CSS / Styling

| File | Served at |
|------|-----------|
| public/apex-v2.css | /apex-v2.css |
| public/apex-custom.css | /apex-custom.css |

**No bundler / build step** for CSS — served directly from public/

---

## apex-audit.html

**Location:** `apex-audit.html` (repo root) + duplicates in worktrees

**Purpose:** UNKNOWN — audit-related frontend page

**Served at:** UNKNOWN — no server.js route found serving apex-audit.html specifically

---

## Telemetry Flow

```
Browser dashboard
        │
        ├── GET /  → public/dashboard.html (requireAuth)
        │
        ├── API calls → /api/* (requireAppAccess via kernelChain)
        │
        ├── SSE stream → GET /api/system/events (telemetry route, no rate limit)
        │
        └── GET /telemetry/status → src/routes/telemetry/index.js
                    │
                    ├── getMastraStatus() — Mastra init state
                    ├── _errBuffer — recent server errors
                    ├── GIT_SHA — build version
                    └── agentQueue.status() — queue depth
```
