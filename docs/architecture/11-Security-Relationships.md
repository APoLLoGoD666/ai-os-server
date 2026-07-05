# 11 — Security Relationships

**Date:** 2026-07-02  
**Evidence Source:** lib/middleware.js, lib/kernel.js, server.js (CORS, rate limits, helmet), middleware/civilization-kernel.js, lib/app-auth.js

---

## Authentication Architecture

Five distinct authentication mechanisms:

| Mechanism | Header/Source | Env Var | Scope | Notes |
|-----------|--------------|---------|-------|-------|
| App key | `x-app-key` | `APP_ACCESS_KEY` | Full API access | Timing-safe comparison |
| Scoped API key | `x-api-key` | `API_KEY` | Dashboard gate only | Lower privilege than APP_ACCESS_KEY |
| JWT cookie | `apex_token` httpOnly cookie | `JWT_SECRET` | Full API + dashboard | 7-day expiry |
| Cron key | `x-cron-secret` | `CRON_SECRET` | /api/cron/* only | Separate key, separate function |
| Dev bypass | env var | `BYPASS_DASHBOARD_AUTH=true` | Dev only | Blocked in production |

---

## lib/middleware.js

**Purpose:** Core authentication and authorization middleware

**Imports:** `jsonwebtoken`, `crypto`, `lib/pg_helpers` (pgGetAgentTask)

**Exports:**
- `hasAppAccess(req)` — boolean check (x-app-key vs APP_ACCESS_KEY)
- `requireAppAccess(req, res, next)` — Express middleware (x-app-key OR jwt cookie)
- `hasCronAccess(req)` — boolean check (x-cron-secret vs CRON_SECRET)
- `requireCronAccess(req, res, next)` — Express middleware for cron routes
- `requireAuth(req, res, next)` — Dashboard gate (app key OR api key OR jwt)
- `parseCookies(req)` — Cookie parser (no dependency on cookie-parser package)
- `LOGIN_HTML` — inline login page HTML constant

**requireAppAccess logic:**
```
1. hasAppAccess(req) → timing-safe x-app-key check
2. Fail → try JWT from apex_token cookie
3. Both fail → 401 { ok: false, reply: "Access key required." }
```

**requireAuth logic:**
```
1. BYPASS_DASHBOARD_AUTH=true (dev + non-production only)
2. hasAppAccess(req) → full APP_ACCESS_KEY
3. x-api-key → API_KEY (scoped, lower privilege)
4. JWT cookie apex_token → JWT_SECRET
5. All fail → 401 (HTML login page for browser, JSON for API)
```

**Timing-safe comparison:** All key comparisons use `crypto.timingSafeEqual` — prevents timing attacks

---

## lib/app-auth.js

```javascript
module.exports = require('./middleware').requireAppAccess;
```

Single-line shim. All `require('../lib/app-auth')` calls get `requireAppAccess`.

---

## lib/kernel.js — Kernel Chain

**Imports:**
- `lib/middleware` — resolveIdentity, resolveOwnership
- `lib/agent-file-utils` — checkAuthority, checkGovernance

**Exports:** `{ kernelChain }`

**Applied at:** `app.use('/api', ...kernelChain)` — line 638 in server.js

**Purpose:** Constitutional middleware layer — identity resolution + authority checking on EVERY `/api/` request, before any route handler runs.

---

## middleware/civilization-kernel.js — Civilization Kernel

**Applied at:** `app.use(require('./middleware/civilization-kernel'))` — line 409, ALL requests

**Chain:**
1. Loads execution context (lib/runtime/execution-context)
2. Checks constitutional gate (lib/runtime/constitutional-gate)
3. Consults goal graph (lib/goals/goal-graph)
4. Consults attention engine (lib/attention/attention-engine)
5. Queries memory gateway (lib/memory/gateway)
6. Lazy: autonomy-runtime-controller (cognitive runtime)
7. Lazy: watchdog last assessment (lib/constitution/watchdog)

---

## JWT Implementation

**Signing:** `JWT_SECRET` env var — no algorithm specified (defaults to HS256)

**Cookie name:** `apex_token`

**Cookie flags:**
- `httpOnly: true` — inaccessible to JavaScript
- `secure: isSecure` — HTTPS only in production
- `sameSite: 'Lax'` — cross-site protection
- `maxAge: 7 * 24 * 60 * 60 * 1000` — 7 days

**Session cookie:** `apex_session` (non-httpOnly, SameSite=Lax) — set alongside apex_token for PWA detection

---

## Rate Limiting

| Limiter | Path | Window | Max | On breach |
|---------|------|--------|-----|-----------|
| chatLimiter | /chat | 60s | 30 | 429 JSON |
| voiceLimiter | /api/voice-chat | 60s | 40 | 429 JSON |
| authLimiter | /auth/login | 1hr | 10 | 429 JSON |
| generalLimiter | all routes | 15min | 300 | 429 JSON |

**Package:** `express-rate-limit`

---

## CORS Configuration

**Allowed origins:**
- `https://apex-ai-os-cos.uk`
- `https://www.apex-ai-os-cos.uk`
- `https://ai-os-server-jx20.onrender.com`

**Credentials:** Allowed (supports cookie-based auth cross-origin)

**Method:** `cors()` middleware (early in stack)

---

## Security Headers (Helmet)

**Package:** `helmet`

**CSP (Content Security Policy) — confirmed from server.js line 315:**
- `fontSrc`: `'self'`, `data:`, `https://fonts.gstatic.com`

**Other helmet defaults active:** HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy (exact config not fully read)

---

## Content-Type Enforcement

Applied before routes for POST/PUT/PATCH:
```javascript
if (!ct.includes('application/json') && !ct.includes('multipart/form-data') && !ct.includes('application/x-www-form-urlencoded')) {
    return res.status(415).json({ ok: false, reply: 'Unsupported Media Type — send application/json' });
}
```

---

## Execution Class Classification

Every request tagged before reaching routes:
```
REFLEX    → /health, /api/latency-stats, /api/latency-traces, /api/system/events
BACKGROUND → /api/tasks/run, /api/master/*, /api/research/*, /api/browser/*, /api/cloud-autopilot, /api/agent/run, /api/wiki/ingest, /api/rag/*
EXECUTIVE  → everything else
```

Used for latency budgeting and event bus classification.

---

## Auth Boundaries Summary

```
Public (no auth)
├── GET /health
├── GET /manifest.json
├── GET /sw.js
├── GET /apex-v2.css, /apex-custom.css
└── POST /auth/login (with authLimiter)

Dashboard auth (requireAuth — APP_ACCESS_KEY or API_KEY or JWT)
├── GET /
├── GET /dashboard.html
└── GET /editor

API auth (requireAppAccess — APP_ACCESS_KEY or JWT)
├── GET|POST /api/* (via kernelChain)
└── All auto-loaded routes/*.js (via router.use(require('../lib/app-auth')))

Cron auth (requireCronAccess — CRON_SECRET)
└── POST /api/cron/*
```

---

## lib/governance.js — Security Note

lib/governance.js creates its OWN Supabase client (not through lib/clients.js singleton). This means it operates outside the singleton connection pool. Whether this is intentional (isolation) or oversight is UNKNOWN.

---

## Slack Alert Integration (Security Events)

**Module:** services/slack/slack-alerts.js (alertCritical function)

**Triggered:** In /health handler when DB is down (alertCritical called via setImmediate)

**Consumed by:** lib/governance.js (lazy), services/slack/slack-alerts.js

---

## Autonomy Level Security Gate

**Source:** AUTONOMY_LEVEL env var (currently = 3)

**Level 3 write gate:** `lib/agent-step-utils.js` `isSafeLevel3WriteAction()` — determines which write actions auto-execute vs require approval

**Applied by:** server.js, lib/cognitive/runtime/autonomy-runtime-controller.js

**Constitutional constraint:** All agent write actions at any autonomy level still go through governance check (lib/governance.js) in orchestrator pipeline
