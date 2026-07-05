# 08 — API Relationships

**Date:** 2026-07-02  
**Evidence Source:** server.js (lines 399–650, 4040–4240), routes/*.js glob, lib/middleware.js

---

## Route Loading Architecture

### Auto-loaded routes (server.js:4048)

```javascript
(function _loadAgentRoutes() {
    fs.readdirSync(path.join(__dirname, 'routes'))
        .filter(f => f.endsWith('.js') && f !== 'gemini-live.js' && f !== 'tts-gemini.js')
        .sort()
        .forEach(f => app.use('/api', require(path.join(_rdir, f))));
})();
```

**Mount prefix:** All auto-loaded routes serve at `/api/*`  
**Sort order:** Alphabetical (consistent load order)  
**Exclusions:** `gemini-live.js` (excluded from auto-load), `tts-gemini.js` (manually mounted separately)

### Manually mounted routes

| Route file | Mount point | How |
|-----------|------------|-----|
| routes/tts-gemini.js | /api | `app.use('/api', require('./routes/tts-gemini'))` (line 4064) |
| src/routes/telemetry/index.js | / | factory: `app.use('/', require(...)({requireAppAccess, getStatus, errBuffer, gitSha}))` (line 4065) |

---

## All Route Files (42 auto-loaded + 2 manual)

| File | Prefix (inferred) | Status |
|------|------------------|--------|
| routes/agents.js | /agents | Auto-loaded |
| routes/briefing.js | /briefing | Auto-loaded |
| routes/career.js | /career | Auto-loaded |
| routes/civilization.js | /civilization | Auto-loaded |
| routes/cognitive-eval.js | /cognitive-eval | Auto-loaded |
| routes/cognitive-evolution.js | /cognitive-evolution | Auto-loaded |
| routes/cognitive.js | /cognitive | Auto-loaded |
| routes/communications.js | /communications | Auto-loaded |
| routes/emails.js | /emails | Auto-loaded |
| routes/empire.js | /empire | Auto-loaded |
| routes/entities.js | /entities | Auto-loaded |
| routes/executive-performance.js | /executive | Auto-loaded |
| routes/finance.js | /finance | Auto-loaded |
| routes/founder-graph.js | /founder-graph | Auto-loaded |
| routes/founder.js | /founder | Auto-loaded |
| routes/governance.js | /governance | Auto-loaded |
| routes/health.js | /health | Auto-loaded |
| routes/intelligence-memory.js | /intelligence-memory | Auto-loaded |
| routes/intelligence.js | /intelligence | Auto-loaded |
| routes/integrations.js | /integrations | Auto-loaded |
| routes/intent.js | /intent | Auto-loaded |
| routes/journal.js | /journal | Auto-loaded |
| routes/knowledge-graph.js | /knowledge-graph | Auto-loaded |
| routes/legal.js | /legal | Auto-loaded |
| routes/life.js | /life | Auto-loaded |
| routes/memory.js | /memory | Auto-loaded |
| routes/nutrition.js | /nutrition | Auto-loaded |
| routes/observatory.js | /observatory | Auto-loaded |
| routes/operations.js | /operations | Auto-loaded |
| routes/property.js | /property | Auto-loaded |
| routes/pwa.js | /pwa | Auto-loaded |
| routes/relationships.js | /relationships | Auto-loaded |
| routes/shopping.js | /shopping | Auto-loaded |
| routes/social.js | /social | Auto-loaded |
| routes/spiritual.js | /spiritual | Auto-loaded |
| routes/strategic.js | /strategic | Auto-loaded |
| routes/travel.js | /travel | Auto-loaded |
| routes/university.js | /university | Auto-loaded |
| routes/voice-chat.js | /voice-chat | Auto-loaded |
| routes/wealth.js | /wealth | Auto-loaded |
| routes/gemini-live.js | — | EXCLUDED from auto-load |
| routes/tts-gemini.js | /api | Manually mounted |
| src/routes/telemetry/index.js | / | Manually mounted (factory) |

**Note:** Each route file is required to define an internal sub-prefix matching its filename (from CLAUDE.md rule) to prevent route collision.

---

## Middleware Stack (Request Order)

```
Incoming request
    │
    ├─[1] helmet() — security headers (CSP, HSTS, XFO, etc.)
    ├─[2] cors() — CORS enforcement (apex-ai-os-cos.uk, www.apex-ai-os-cos.uk, ai-os-server-jx20.onrender.com)
    ├─[3] Content-Type enforcer — 415 on non-JSON POST/PUT/PATCH
    ├─[4] Execution class tagger — tags REFLEX / EXECUTIVE / BACKGROUND
    ├─[5] middleware/civilization-kernel — ALL requests (line 409)
    │
    ├── [/health] GET /health — DB health + memory + AI status (public)
    ├── [/health/deep] GET /health/deep — subsystem health (requireAppAccess, DUPLICATE definition)
    │
    ├─[6] auth routes
    │       POST /auth/login  — password auth → JWT cookie (apex_token, 7 days)
    │       POST /auth/logout — clear cookies
    │
    ├─[7] kernelChain — /api/* only (line 638): identity + authority check
    │
    ├─[8] rate limiters
    │       chatLimiter     /chat            30 req/min
    │       voiceLimiter    /api/voice-chat  40 req/min
    │       authLimiter     /auth/login      10 req/hr
    │       generalLimiter  (all)            300 req/15min
    │
    ├─[9] inline server.js routes (before auto-load)
    │
    └─[10] auto-loaded routes + manual mounts
```

---

## Inline Routes in server.js (Beyond Auto-loaded)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | /health | public | Basic health check |
| GET | /health/deep | requireAppAccess | Deep subsystem health (first definition, line 467) |
| GET | /api/system/health/detailed | kernelChain | Unified observability snapshot |
| POST | /api/governance/apply-migration-005 | requireAppAccess | One-time migration runner |
| GET | /health/deep | requireAppAccess | Deep health (second definition, line 4088 — DUPLICATE) |
| GET | /api/cognitive/report | requireAppAccess | Weekly/monthly/quarterly cognitive report (line 4111) |
| GET | /api/admin/civilization-status | requireAppAccess | Civ runtime status |
| POST | /api/governance/run-cycle | requireAppAccess | Manual civilization cycle trigger |
| POST | /api/cron/civilization | requireCronAccess | Render cron → civilization cycle |
| GET | /api/admin/civilization-status-v2 | requireAppAccess | Extended status + last 5 cycle logs |
| GET | /api/admin/improvements/queue | requireAppAccess | Improvement queue inspection |
| GET | /api/executive/verdicts | requireAppAccess | Recent executive verdicts |
| GET | /api/cron/history | requireAppAccess | Cron run log (last N days) |
| GET | /api/cognitive/report | requireAppAccess | Duplicate definition (line 4138) |
| GET | / (root) | requireAuth | Serves dashboard |
| GET | /dashboard.html | requireAuth | Serves dashboard |
| GET | /editor | requireAuth | Serves editor.html |

**Duplicate routes (confirmed):**
- `/health/deep` — defined at lines 467 AND 4088 (different implementations)
- `/api/cognitive/report` — defined at lines 4111 AND 4138 (near-identical)
- Express uses first match wins for same method+path — second definitions are dead.

---

## Auth Model Per Route Class

| Route class | Auth mechanism |
|-------------|---------------|
| Public routes (/health, /manifest.json, /sw.js) | None |
| Dashboard (/,  /dashboard.html) | requireAuth (JWT cookie or APP_ACCESS_KEY) |
| API routes (/api/*) | requireAppAccess (APP_ACCESS_KEY or JWT) via kernelChain |
| Cron routes (/api/cron/*) | requireCronAccess (x-cron-secret header) |
| Memory/routes/*.js | app-auth (requireAppAccess at router level) |

---

## CORS Configuration

**Allowed origins (evidence from server.js):**
- `https://apex-ai-os-cos.uk`
- `https://www.apex-ai-os-cos.uk`
- `https://ai-os-server-jx20.onrender.com`

**Credentials:** Allowed (cookies cross-origin)

---

## Execution Class Tagger

Applied to every request before routes:

```javascript
const _BACKGROUND_PATHS = /^\/api\/(tasks\/run|master\/|research\/|browser\/|cloud-autopilot|agent\/run|wiki\/ingest|rag\/)/;
const _REFLEX_PATHS     = /^\/(?:health|api\/latency-stats|api\/latency-traces|api\/system\/events)$/;
// REFLEX → matched _REFLEX_PATHS
// BACKGROUND → matched _BACKGROUND_PATHS
// EXECUTIVE → everything else
```

**Used by:** latency tracker, event bus for aggregated metrics

---

## lib/app-auth.js

```javascript
module.exports = require('./middleware').requireAppAccess;
```

Single-line re-export. All routes that do `require('../lib/app-auth')` get `requireAppAccess`.

**Consumed by:** Every routes/*.js that has `router.use(require('../lib/app-auth'))`
