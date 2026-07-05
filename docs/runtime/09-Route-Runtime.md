# 09 — Route Runtime

**Date:** 2026-07-02  
**Evidence Source:** server.js (_loadAgentRoutes, inline routes, duplicate routes), routes/cognitive.js, routes/founder.js, routes/founder-graph.js, routes/strategic.js, routes/briefing.js, routes/operations.js, routes/empire.js, routes/entities.js, routes/intelligence.js

---

## Route Loading Architecture

### Auto-Load (`_loadAgentRoutes`)

42 route files auto-loaded from `routes/*.js`.

**Excluded from auto-load (must be manually mounted):**
- `routes/gemini-live.js` — no manual mount found; effectively disabled
- `routes/tts-gemini.js` — no manual mount found; effectively disabled

**Mount pattern:** Each route file is mounted at `/api/<basename>` where basename matches the filename without extension. Example: `routes/cognitive.js` → `/api/cognitive/...`

**Required convention (CLAUDE.md):** Every route file must define an internal sub-prefix matching its filename to prevent route collision under flat-mount. Example: `routes/foo.js` must use `router.get('/foo/...')`.

### Auth Enforcement Pattern

Two patterns exist across route files:

**Pattern A — Global router-level auth:**
```javascript
router.use(require('../lib/app-auth'))  // applies to ALL routes in file
router.get('/cognitive/engines', ...)  // no per-route auth needed
```
Used by: `routes/cognitive.js`, most route files

**Pattern B — Per-route auth:**
```javascript
router.get('/founder/goals', requireAppAccess, handler)  // per-route
router.get('/founder/notes', requireAppAccess, handler)  // per-route
```
Used by: `routes/founder.js` (has per-route auth with section-based `checkAccess()`)

---

## Route Groups — Endpoint Counts and Key Behaviors

### routes/cognitive.js — 27 Endpoints

- Global `router.use(requireAppAccess)` — all routes protected
- All 16 cognitive engines accessible via `/api/cognitive/<engine-name>`
- `/api/cognitive/health` — checks 5 engines (NOT all 16)
- Cognitive engines are imported from `lib/cognitive/index.js` barrel

### routes/founder.js — 21 Endpoints

- Per-route auth via `_os()` lazy factory + `checkAccess(req, section)`
- `checkAccess()` enforces section-level permissions (not just auth)
- `_os()` lazy factory pattern prevents circular deps at load time
- Interacts with `lib/founder/state-tracker.js` for domain/goal state

### routes/founder-graph.js — 14 Endpoints

- BFS path finding at `/api/founder-graph/path`
- **BFS queue capped at 500 entries** to prevent infinite traversal on dense graphs
- `/nodes`, `/edges`, `/goals` use **direct Supabase** (not through lib/clients singleton — own client)
- Direct Supabase bypasses the singleton connection pool for these endpoints

### routes/strategic.js — 12 Endpoints

- Thin wrappers over `lib/intelligence/sie.js`
- `/api/strategic/history` and `/api/strategic/decisions` use direct Supabase
- All strategic routes proxy to SIE functions

### routes/briefing.js — 4 Endpoints

| Endpoint | Behavior |
|----------|---------|
| `GET /api/briefing/today` | 9 parallel Supabase queries (distinct from SIE's 9 queries) |
| `GET /api/briefing/motivation` | Direct Claude API call — only route besides chat that calls Anthropic directly |
| `POST /api/briefing/wind-down` | Sends PWA push notification |
| `GET /api/briefing/weekly` | Weekly summary |

`routes/briefing.js` uses its **own Supabase singleton** (not lib/clients).

### routes/operations.js — Mixed Auth

**Critical security note:**

| Endpoint | Auth | Risk |
|----------|------|------|
| `POST /api/operations/migrations/run` | `_auth` only | Executes **raw SQL** — no additional authorization |
| `GET /api/operations/healthz` | **None (PUBLIC)** | Health check |
| `GET /api/operations/version` | **None (PUBLIC)** | Version info |
| `GET /api/operations/status` | **None (PUBLIC)** | Status |
| `GET /api/operations/ping` | **None (PUBLIC)** | Ping |
| `GET /api/operations/ready` | **None (PUBLIC)** | Readiness check |
| `GET /api/operations/metrics` | **None (PUBLIC)** | Metrics |

`/api/operations/migrations/run` with raw SQL and only the basic `_auth` guard represents the highest-risk endpoint in the codebase. The `_auth` function is not fully characterized from evidence (UNKNOWN: what exactly `_auth` checks vs `requireAppAccess`).

### routes/empire.js — 19 Endpoints

- Empire graph CRUD (nodes, edges, relationships)
- Analysis and aggregation endpoints
- Standard `requireAppAccess` auth

### routes/entities.js — 6 Endpoints + ROUTING BUG

**BUG:** Route registration order creates unreachable endpoint:

```javascript
router.get('/entities/:id', ...)       // registered first
router.get('/entities/merge-queue', ...)  // registered AFTER /:id
```

Express matches `/entities/merge-queue` to `/:id` first (with `id = 'merge-queue'`). The `/merge-queue` handler **never executes**. All merge-queue requests are processed as single-entity lookups with `id = 'merge-queue'`.

### routes/intelligence.js — Full Behavioral Summary

**Key behaviors (beyond what Phase 2.1 documented):**

| Endpoint | Behavior |
|----------|---------|
| `GET /api/intelligence/self-check` | Makes **live HTTP calls** to Notion + Slack APIs to verify connectivity |
| `GET /api/intelligence/system-status` | Aggregates 7+ subsystem statuses (memory, governance, agents, SIE, etc.) |
| `POST /api/intelligence/voice/start` | Updates `voiceState.active = true`, calls `broadcastVoiceState()` |
| `POST /api/intelligence/voice/stop` | Updates `voiceState.active = false`, broadcasts |
| `GET /api/intelligence/voice/state` | Returns current `voiceState` object |

**Exports:** `voiceState` and `broadcastVoiceState` — imported by other modules for voice state access.

**Own Supabase client:** `_sbClient` singleton at module load (not lib/clients.js).

---

## Inline Routes (server.js)

Routes defined directly in server.js rather than in route files:

### /health (GET)

```javascript
app.get('/health', async (req, res) => {
  // Queries civilization_health_snapshots (latest score + classification)
  // Checks process.memoryUsage().heapUsed
  // Returns:
  {
    ok: true,
    version: GIT_SHA,
    uptime: process.uptime(),
    heapMb: Math.round(heapUsed / 1024 / 1024),
    heapWarning: heapMb > 150,
    mastra: getMastraStatus(),
    sentry: !!process.env.SENTRY_DSN,
    civilizationScore: snap.score,
    civilizationClass: snap.classification,
    localMode: !!process.env.LOCAL_MODE
  }
  // On DB error: alertCritical via setImmediate (Slack alert)
})
```

### /health/deep (GET) — DUPLICATE DEFINITION

Defined twice in server.js:
- Line 467: active handler
- Line 4088: dead handler (Express first-match wins, line 467 handles all requests)

### /api/cognitive/report (GET) — DUPLICATE DEFINITION

Defined twice in server.js:
- Line 4111: active handler
- Line 4138: dead handler (line 4111 handles all requests)

### /chat (POST)

The primary chat endpoint. Full sub-lifecycle documented in 01-Request-Lifecycle.md.

---

## Route Auth Summary

```
Public (no auth required):
├── GET /health
├── GET /manifest.json
├── GET /sw.js
├── GET /apex-v2.css, /apex-custom.css
├── GET /api/operations/healthz
├── GET /api/operations/version
├── GET /api/operations/status
├── GET /api/operations/ping
├── GET /api/operations/ready
├── GET /api/operations/metrics
└── POST /auth/login (with authLimiter: 10/hr)

Dashboard auth (requireAuth: APP_ACCESS_KEY or API_KEY or JWT):
├── GET /
├── GET /dashboard.html
└── GET /editor

API auth (requireAppAccess: APP_ACCESS_KEY or JWT):
├── POST /chat (chatLimiter: 30/min)
├── POST /api/voice-chat (voiceLimiter: 40/min)
├── All auto-loaded routes/**.js
└── All /api/* (via kernelChain)

Cron auth (requireCronAccess: CRON_SECRET):
└── POST /api/cron/*
```

---

## lib/telemetry/aggregator.js — Snapshot Write DISABLED

**Note on telemetry:**

`computeCivilizationHealth()` runs 9 parallel collectors and produces a 7-level classification:

| Score | Classification |
|-------|---------------|
| ≥ 90 | `digital_civilization` |
| ≥ 80 | `advanced_civilization` |
| ≥ 70 | `emerging_civilization` |
| ≥ 60 | `developing_system` |
| ≥ 55 | `early_system` |
| ≥ 50 | `basic_system` |
| < 50 | `emerging_platform` |

**Snapshot write is intentionally DISABLED** (comment: `DATA-5`). The telemetry aggregator computes health scores but does not persist them to `civilization_health_snapshots`. This table is written by a different path (UNKNOWN which path currently writes to it).
