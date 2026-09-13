# AUTHENTICATION ATLAS
## Document 10 of 17 — All Authentication and Authorization
**Generated:** 2026-06-16 | **Baseline Commit:** f77a36d (CERTIFIED)

---

## OVERVIEW

APEX AI OS implements **3 authentication layers** protecting different route categories:

| Layer | Handler | Mechanism | Applied To |
|---|---|---|---|
| 1 | `requireAuth` | JWT cookie OR x-api-key header | ALL /api/* routes (global middleware) |
| 2 | `requireAppAccess` | x-app-key header OR ?app_key query | Specific route files (additional check) |
| 3 | `requireCronAccess` | x-cron-secret header | Cron endpoints only |

---

## LAYER 1: requireAuth

**Location:** `lib/app-auth.js` (canonical) + server.js global middleware
**Applied to:** ALL `/api/*` routes (registered as global Express middleware)
**Bypass env:** `BYPASS_DASHBOARD_AUTH=true` bypasses auth on `/api/dashboard` only

### Two Accepted Credentials

**Option A: JWT Cookie**
| Field | Value |
|---|---|
| Cookie name | `apex_token` |
| Algorithm | JWT (HS256 — standard) |
| Secret | `AGENT_SECRET` env var |
| Expiry | 7 days (168 hours) |
| Verified with | `jsonwebtoken.verify()` |

**Option B: API Key Header**
| Field | Value |
|---|---|
| Header | `x-api-key` |
| Value | Must exactly equal `AGENT_SECRET` env var |
| Comparison | String equality (`===`) |
| Timing-safe | NO — plain string comparison (not crypto.timingSafeEqual) |

### requireAuth Flow

```
Request arrives
    │
    ├─── Cookie: apex_token present?
    │       └─→ jwt.verify(token, AGENT_SECRET)
    │               ├─── Valid: PASS → next()
    │               └─── Invalid/Expired: 401 Unauthorized
    │
    └─── Header: x-api-key present?
            └─→ value === AGENT_SECRET
                    ├─── Match: PASS → next()
                    └─── No match: 401 Unauthorized
    │
    └─── Neither: 401 Unauthorized
```

---

## LAYER 2: requireAppAccess

**Canonical location:** `lib/app-auth.js`
**Duplicate location:** `server.js` lines 827-835 (inline re-declaration)
**Applied to:** Specific route files that require an additional app-level key

### Credentials

| Field | Value |
|---|---|
| Header | `x-app-key` |
| Query param | `?app_key` |
| Value | Must equal `APP_ACCESS_KEY` env var |
| Comparison | `crypto.timingSafeEqual()` — TIMING-SAFE |

### requireAppAccess Flow

```
Request (already passed requireAuth)
    │
    ├─── Header: x-app-key present?
    │       └─→ crypto.timingSafeEqual(Buffer.from(key), Buffer.from(APP_ACCESS_KEY))
    │               ├─── Match: PASS → next()
    │               └─── No match: 403 Forbidden
    │
    └─── Query: ?app_key present?
            └─→ crypto.timingSafeEqual(Buffer.from(key), Buffer.from(APP_ACCESS_KEY))
                    ├─── Match: PASS → next()
                    └─── No match: 403 Forbidden
    │
    └─── Neither: 403 Forbidden
```

### Duplicate Implementation Risk

| Aspect | lib/app-auth.js | server.js lines 827-835 |
|---|---|---|
| Source of truth | YES (canonical) | NO (duplicate) |
| Timing-safe | YES | UNKNOWN — need to verify |
| Risk | — | Silent drift if one updated but not the other |
| Recommended action | Remove server.js inline version | — |

---

## LAYER 3: requireCronAccess

**Location:** server.js (inline, applied to cron routes)
**Applied to:** `/cron/*` endpoints (external Render cron trigger)

### Credentials

| Field | Value |
|---|---|
| Header | `x-cron-secret` |
| Value | Must equal `CRON_SECRET` env var |
| Comparison | `crypto.timingSafeEqual()` — TIMING-SAFE |

### requireCronAccess Flow

```
POST /cron/run-schedules
    │
    └─── Header: x-cron-secret present?
            └─→ crypto.timingSafeEqual(Buffer.from(secret), Buffer.from(CRON_SECRET))
                    ├─── Match: PASS → execute cron job
                    └─── No match: 403 Forbidden
```

---

## LOGIN ENDPOINT VULNERABILITY

**Route:** POST /api/login (inline server.js handler)
**Method:** Dashboard login form (returns JWT cookie on success)
**Vulnerability:** Password comparison uses `!==` (plain string equality) — NOT `crypto.timingSafeEqual()`

```javascript
// VULNERABLE — timing attack possible
if (password !== DASHBOARD_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
}
```

**Risk:** Timing side-channel attack. An attacker can measure response time differences to progressively enumerate the correct password character-by-character.

**Fix required:** Replace `!==` comparison with `crypto.timingSafeEqual()`.

**Env var involved:** `DASHBOARD_PASSWORD`

---

## TIMING-SAFE COMPARISON STATUS

| Handler | Operation | Timing-Safe? | Risk |
|---|---|---|---|
| requireAuth (JWT cookie path) | jwt.verify() | YES (JWT library handles) | LOW |
| requireAuth (x-api-key path) | `key === AGENT_SECRET` | NO | MEDIUM |
| requireAppAccess (canonical) | crypto.timingSafeEqual() | YES | LOW |
| requireAppAccess (server.js duplicate) | UNKNOWN | UNKNOWN | MEDIUM |
| requireCronAccess | crypto.timingSafeEqual() | YES | LOW |
| Login password | `password !== DASHBOARD_PASSWORD` | NO | HIGH |

---

## BYPASS_DASHBOARD_AUTH

| Field | Value |
|---|---|
| Env var | `BYPASS_DASHBOARD_AUTH` |
| Value to trigger bypass | `'true'` (string) |
| Effect | Skips requireAuth on `/api/dashboard` route |
| Risk | If set in production, dashboard is publicly accessible |
| Recommendation | Should be treated as DEAD/DANGEROUS; never set in production |

---

## 8 UNAUTHENTICATED ENDPOINTS

Defined in `routes/operations.js`. These endpoints require NO authentication — intentionally public for operational health checks.

| Method | Path | Purpose | Data Exposed |
|---|---|---|---|
| GET | /api/healthz | Kubernetes-style health check | Service status (LOW RISK) |
| GET | /api/version | App version info | Version string (LOW RISK) |
| GET | /api/status | System status | Status flags (MEDIUM RISK — may reveal system state) |
| GET | /api/ping | Connectivity check | Pong response (LOW RISK) |
| GET | /api/ready | Readiness probe | Ready boolean (LOW RISK) |
| GET | /api/metrics | Request counter metrics | Request counts (MEDIUM RISK — reveals traffic patterns) |
| GET | /api/build-info | Build/deploy information | Commit hash, build time (MEDIUM RISK — reveals deployment info) |
| GET | /api/uptime | Server uptime | Uptime seconds (LOW RISK) |

**Risk assessment:** The most sensitive of these is `/api/build-info` (exposes commit hash, enabling version-specific attacks) and `/api/metrics` (exposes traffic patterns). These are standard operational tradeoffs. `/api/status` exposes system state and should be reviewed for information disclosure.

---

## JWT PARAMETERS

| Parameter | Value |
|---|---|
| Secret | `AGENT_SECRET` env var |
| Algorithm | HS256 (HMAC SHA-256) |
| Expiry | 7 days (168 hours) |
| Cookie name | `apex_token` |
| Cookie options | Likely httpOnly, secure (inferred — not confirmed) |
| Issued at | Login endpoint POST /api/login |
| Revocation | NO — no token revocation list; AGENT_SECRET rotation required to invalidate all tokens |

---

## ENVIRONMENT VARIABLES (AUTH-RELATED)

| Env Var | Purpose | If Missing | Risk |
|---|---|---|---|
| AGENT_SECRET | JWT signing + x-api-key check | Service fails to start or all auth returns 401 | CRITICAL |
| APP_ACCESS_KEY | requireAppAccess check | Specific routes inaccessible | HIGH |
| CRON_SECRET | Cron endpoint protection | Cron inaccessible | MEDIUM |
| DASHBOARD_PASSWORD | Login form password | Dashboard login broken | HIGH |
| BYPASS_DASHBOARD_AUTH | Skip dashboard auth | If set: dashboard unprotected | DANGEROUS |

---

## AUTH BOUNDARY MAP

| Route Category | Auth Required | Type |
|---|---|---|
| /api/healthz, /api/ping, /api/ready, /api/version, /api/uptime, /api/status, /api/metrics, /api/build-info | NONE | Intentionally public |
| /api/login | NONE | Public (issues JWT) |
| /api/logout | NONE | Public (clears cookie) |
| /api/dashboard | AUTH-1 (bypassed if BYPASS_DASHBOARD_AUTH=true) | Protected |
| /api/* (all others) | AUTH-1 (requireAuth) | Protected |
| Specific routes | AUTH-1 + AUTH-2 (requireAppAccess) | Double-protected |
| /cron/* | AUTH-3 (requireCronAccess) | Cron-only access |

---

## SECURITY RECOMMENDATIONS

1. **HIGH:** Fix login password comparison — replace `!==` with `crypto.timingSafeEqual()`
2. **HIGH:** Add timing-safe comparison to requireAuth x-api-key path (`===` is not timing-safe)
3. **MEDIUM:** Remove duplicate requireAppAccess from server.js lines 827-835; use lib/app-auth.js only
4. **MEDIUM:** Verify BYPASS_DASHBOARD_AUTH is never set in production Render environment
5. **MEDIUM:** Consider /api/build-info information disclosure (exposes commit hash)
6. **LOW:** Add token revocation mechanism (e.g., stored invalid tokens table) for immediate session invalidation
7. **LOW:** Verify requireAppAccess duplicate in server.js lines 827-835 is also timing-safe
