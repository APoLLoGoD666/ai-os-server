# 03 — Authentication Certification

**Date:** 2026-07-02  
**Mode:** Certification — Evidence-only

---

## Authentication Mechanisms

Five distinct authentication mechanisms exist in APEX. Each is certified independently.

---

## Mechanism 1: App Access Key (x-app-key)

**Header:** `x-app-key`  
**Env var:** `APP_ACCESS_KEY`  
**Used by:** `requireAppAccess` → applied to all `/api/*` routes and auto-loaded route files  
**Implementation:** `lib/middleware.js hasAppAccess(req)`

```javascript
crypto.timingSafeEqual(
  Buffer.from(req.headers['x-app-key']),
  Buffer.from(process.env.APP_ACCESS_KEY)
)
```

**Verdict: ENFORCED**

Evidence:
- Timing-safe comparison prevents timing oracle attacks
- Applied via `requireAppAccess` to all auto-loaded route files through `lib/app-auth.js` shim
- `lib/app-auth.js` is a 1-line shim: `module.exports = require('./middleware').requireAppAccess`
- 42 route files apply this via `router.use(require('../lib/app-auth'))`

**Known bypass:** None for this mechanism specifically. requireAppAccess also accepts JWT (see Mechanism 3).

**Failure behavior:** If APP_ACCESS_KEY env var is not set, `Buffer.from(undefined)` would throw — exact behavior on missing env var is UNKNOWN (not tested in evidence).

---

## Mechanism 2: Scoped API Key (x-api-key)

**Header:** `x-api-key`  
**Env var:** `API_KEY`  
**Used by:** `requireAuth` (dashboard gate only)  
**Implementation:** `lib/middleware.js requireAuth` Step 3

**Verdict: PARTIALLY ENFORCED**

Evidence:
- Only accepted by `requireAuth` — NOT accepted by `requireAppAccess`
- Scoped to dashboard access: `GET /`, `GET /dashboard.html`, `GET /editor`
- Lower privilege than APP_ACCESS_KEY — cannot access `/api/*` routes
- Timing-safe comparison: confirmed in middleware.js

**Known bypass:** BYPASS_DASHBOARD_AUTH=true bypasses the entire requireAuth chain including API key check.

---

## Mechanism 3: JWT Cookie (apex_token)

**Cookie:** `apex_token` (httpOnly)  
**Env var:** `JWT_SECRET`  
**Used by:** `requireAppAccess` (Step 2) and `requireAuth` (Step 4)  
**Algorithm:** HS256 (default — no explicit algorithm specified in JWT verify call)  
**Expiry:** 7 days

**Verdict: ENFORCED**

Evidence:
- httpOnly: inaccessible to JavaScript
- secure flag: set based on `isSecure` (HTTPS only in production)
- sameSite: 'Lax' — cross-site protection
- Cookie parsed by custom `parseCookies(req)` — no dependency on cookie-parser package
- JWT verified with `jsonwebtoken.verify(token, JWT_SECRET)` — standard verification

**Known weakness:** No algorithm pinning. Default HS256. If JWT_SECRET is weak, brute-force risk.

**Token invalidation:** No server-side session store for JWT. Token invalidation requires waiting for 7-day expiry or rotating JWT_SECRET (which invalidates all sessions).

---

## Mechanism 4: Cron Secret (x-cron-secret)

**Header:** `x-cron-secret`  
**Env var:** `CRON_SECRET`  
**Used by:** `requireCronAccess`  
**Applied to:** `/api/cron/*` routes only

**Verdict: ENFORCED**

Evidence:
- Separate secret from APP_ACCESS_KEY — independent credential
- Timing-safe comparison: confirmed
- Applied to cron routes only — correct scope isolation
- No bypass path confirmed in requireCronAccess

---

## Mechanism 5: Dev Bypass (BYPASS_DASHBOARD_AUTH)

**Env var:** `BYPASS_DASHBOARD_AUTH=true` + `NODE_ENV !== 'production'`  
**Scope:** Dashboard auth only (`requireAuth`)

**Verdict: PARTIALLY ENFORCED (guard relies on operator discipline)**

Evidence:
- Guard: `process.env.BYPASS_DASHBOARD_AUTH === 'true' && process.env.NODE_ENV !== 'production'`
- Both conditions are environment variables — operator-controlled
- Nothing prevents setting NODE_ENV=staging + BYPASS_DASHBOARD_AUTH=true on Render production infrastructure
- The comment says "blocked in production" but production is defined by NODE_ENV value, not by infrastructure

**Risk level:** If set in production, ALL dashboard auth is bypassed. No logging of bypass activation confirmed.

---

## WebSocket Authentication

**Method:** Token in query param  
**Comparison:** `crypto.timingSafeEqual`  
**On failure:** `socket.destroy()`

**Verdict: ENFORCED**

Evidence:
- Token extracted from `?token=` query param
- Compared against APP_ACCESS_KEY via timingSafeEqual
- Failure → immediate socket destruction, no fallback
- Sub-paths `/ws/*` fall through (reserved, not authenticated by this handler)

**Note:** Token in query param (URL) means the token appears in server logs and browser history. This is a security consideration not an enforcement gap.

---

## Authentication Coverage Map

| Endpoint Group | Mechanism | Verdict |
|---------------|-----------|---------|
| `GET /health` | None (public) | Intentionally unauthenticated |
| `GET /manifest.json`, `/sw.js`, CSS | None (public) | Intentionally unauthenticated |
| `POST /auth/login` | None (authLimiter only) | Rate-limited, not authenticated |
| `GET /`, `/dashboard.html`, `/editor` | requireAuth (app key OR api key OR JWT) | ENFORCED (except bypass) |
| `POST /chat` | requireAppAccess (app key OR JWT) | ENFORCED |
| All `routes/*.js` | requireAppAccess via lib/app-auth | ENFORCED |
| `/api/cron/*` | requireCronAccess (cron secret) | ENFORCED |
| `GET /api/operations/*` (public ones) | None | Intentionally unauthenticated |
| `POST /api/operations/migrations/run` | `_auth` only | PARTIALLY ENFORCED |
| `GET /ws` | Token query param (timingSafeEqual) | ENFORCED |

---

## Authentication Gaps Summary

| Gap | Description | Severity |
|-----|-------------|---------|
| BYPASS_DASHBOARD_AUTH | Operator-settable bypass of all dashboard auth | HIGH |
| Operations endpoints public | 6+ API endpoints publicly accessible without auth | MEDIUM (intentional design) |
| /migrations/run uses _auth not requireAppAccess | Weaker auth on most dangerous endpoint | HIGH |
| JWT no algorithm pinning | Default HS256, no explicit alg in verify() | LOW |
| JWT no revocation | 7-day validity window, no server-side invalidation | MEDIUM |
| Token in WS URL | APP_ACCESS_KEY appears in server logs | LOW |
| Missing APP_ACCESS_KEY behavior | Behavior on undefined env var not confirmed | UNKNOWN |
