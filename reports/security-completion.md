# Phase 7: Security Completion

---

## Current Security Posture

### HTTP Security Headers — Helmet

Helmet is configured on all routes. Default protections active:

| Header | Effect |
|---|---|
| Content-Security-Policy | Restricts resource loading origins |
| Strict-Transport-Security | Forces HTTPS on all subsequent requests |
| X-Content-Type-Options | Prevents MIME sniffing |
| X-Frame-Options | Blocks clickjacking via iframe embedding |
| X-XSS-Protection | Legacy XSS filter (modern browsers use CSP) |
| Referrer-Policy | Controls referrer header leakage |

### CORS

Configured with an explicit allowlist of origins. Wildcard `*` is not used. Credentials mode is controlled. Preflight requests are handled.

### Rate Limiting

Five distinct rate limiters are applied per route type, preventing abuse and resource exhaustion.

| Limiter | Applied To |
|---|---|
| apiLimiter | General API routes |
| masterLimiter | High-privilege master operations |
| chatLimiter | `/api/chat` — LLM calls |
| voiceLimiter | Voice pipeline routes |
| authLimiter | Authentication routes — strictest limits |

### Authentication — requireAppAccess

All sensitive API routes are protected with `requireAppAccess` from `lib/app-auth`. This middleware performs timing-safe key comparison (using `crypto.timingSafeEqual`) to prevent timing-based key enumeration attacks.

The `APP_ACCESS_KEY` env var is the shared secret. It is checked on every request to protected routes.

### Sentry

Error DSN is configured. Unhandled exceptions and rejections are captured. No PII scrubbing rules are documented — this should be verified.

---

## Identified Gaps

### Gap 1: integrations.js requireAppAccess Was Broken

**Status:** Fixed in this phase.

**Root cause:** `const { requireAppAccess } = require('../lib/app-auth')` destructured `undefined` because `app-auth` exports a function directly. All `/api/integrations/*` routes were unprotected — Express threw before route handlers ran, resulting in 500 errors rather than serving unauthenticated responses, but the authentication layer was absent.

**Fix:** Single-line change to `const requireAppAccess = require('../lib/app-auth')`.

### Gap 2: APP_ACCESS_KEY — No Rotation Mechanism

**Status:** Open.

**Description:** `APP_ACCESS_KEY` is a single static shared secret set in Render env vars. There is no rotation schedule, no secondary key for zero-downtime rotation, and no audit log of which clients used the key.

**Risk:** If the key is leaked, all protected routes are compromised until the key is manually rotated in Render and the service redeployed.

**Recommendation:** Implement a dual-key approach (current key + pending key) to allow rotation without downtime. Add key rotation to the weekly maintenance review.

### Gap 3: Render Env Vars Exposed via API

**Status:** Accepted risk for internal service.

**Description:** The self-check endpoint and performance endpoint return some configuration state (DSN set, URL configured, etc.) that could aid an attacker in understanding the system topology. Since this service is internal-only (protected by `requireAppAccess`), this is acceptable. No raw secret values are returned.

### Gap 4: No PII Scrubbing Rules in Sentry

**Status:** Unverified.

**Description:** Voice and chat routes handle user input. If user messages containing PII are logged and captured by Sentry on exception, they may be stored in Sentry's cloud. Sentry's `beforeSend` hook should be configured to scrub message content from error payloads.

---

## Security Posture Summary

| Control | Status |
|---|---|
| Transport security | Strong (Helmet HSTS) |
| Authentication | Strong (timing-safe, all routes) |
| Rate limiting | Strong (per route type) |
| CORS | Strong (allowlist) |
| Key management | Weak (single static key, no rotation) |
| Error data hygiene | Unverified (Sentry PII) |
| integrations.js auth | Fixed |

Overall posture: adequate for an internal AI OS service. Key rotation and Sentry PII scrubbing are the two remaining material risks.
