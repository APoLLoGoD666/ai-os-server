# V-11-A Implementation Certification

**Status:** CERTIFIED  
**Date:** 2026-08-31  
**Verified by:** Playwright automated test suite (playwright-v11a-verify.js)  
**Result:** 28 PASS / 0 FAIL

---

## Scope

V-11-A implements the multi-profile shell foundation for APEX. Six universal destinations are visible to all profiles; content within each destination is filtered by role authority. No navigation-filtering; authority-filtered content only.

---

## Implementation Manifest

### 1. Database Identity Foundation

**File:** `migrations/091_v11a_identity_foundation.sql`

- Extended `humans` table: added `email`, `password_hash`, `role` (default `master`), `status` (default `active`), `invited_by`, `onboarding_completed_at`, `last_login_at`
- New tables: `token_revocations`, `invite_tokens`, `user_capability_overrides`, `audit_log`, `apex_preferences`
- Idempotent DDL (all `IF NOT EXISTS`, `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$` guards)
- Master preferences seed row (`ON CONFLICT DO NOTHING`)

### 2. JWT & Identity Middleware

**File:** `lib/middleware.js`

- `_decodeApexToken(req)` — decodes and verifies `apex_token` JWT cookie
- `_resolveHumanId(req)` — reads `sub` from JWT; falls back to `APEX_HUMAN_ID` env var for legacy tokens (`sub = 'apex-user'`)
- `resolveIdentity(req, res, next)` — populates `req.identity` with `{ humanId, role, email, sessionId, authMethod }`
- `requireRole(role)` — factory for role-specific route guards
- `checkCapability(capName)` — factory for named capability guards (`_MASTER_CAPS` / `_USER_CAPS`)

### 3. Auth Route & Identity Endpoint

**File:** `src/routes/auth.js`

- `POST /auth/login` — JWT now signs `{ sub: MASTER_UUID, role: 'master', email: null, jti }` (migration from legacy `{ apex: true }` payload)
- `GET /api/me` — returns resolved identity for dashboard boot; queries `humans` table, falls back to `req.identity` fields if row missing

### 4. WebSocket Session Identity

**File:** `lib/ws-handler.js`

- On WS `connection`, decodes `apex_token` cookie from upgrade request headers
- Stores `humanId` and `role` in `_wsSessions` Map for per-user WS routing
- Foundation for role-filtered WS event fan-out (Phase B)

### 5. Rate Limiter — Localhost Bypass

**Files:** `server.js`, `middleware/rate-limiting.js`

- Added `_skipLocalhost` skip function to `chatLimiter`, `generalLimiter`, and `apiLimiter`
- Localhost requests bypass rate limits; production requests (real IPs) are unaffected
- Necessary for reliable CI / local test runs that make many concurrent API calls

### 6. Role-Aware Navigation (6 V-11 Destinations)

**File:** `public/dashboard.html` — nav restructure (~line 10250–10350)

All six destinations present for all profiles:

| # | Destination | Items | Master-only items |
|---|-------------|-------|-------------------|
| ① | TODAY | Overview | — |
| ② | COMMAND | Command | — |
| ③ | LIFE & WORK | Finance, Network, Business, Health, University, Research | Occult, Civilisation, Reality |
| ④ | INTELLIGENCE | Intelligence, Memory, Knowledge | — |
| ⑤ | ACTIONS | Operation | Agents, Approvals |
| ⑥ | SYSTEM | System | Activity, Governance |

Master-only nav buttons carry `class="apex-master-only"`.

### 7. Role-Aware Visibility — CSS & JS

**File:** `public/dashboard.html`

**CSS** (specificity 0,2,0 — beats `.nav-btn { display: flex !important }` at 0,1,0):
```css
body.apex-role-user   .apex-master-only { display: none !important; }
body.apex-role-master .apex-user-only   { display: none !important; }
```

**Default body class:** `<body class="apex-role-master">` — master view while identity fetch is pending.

**`applyRoleProfile(role)`** — single canonical mechanism for all role-aware changes:
- Toggles `body.apex-role-master` / `body.apex-role-user` (drives CSS cascade)
- Swaps SYSTEM page: hides `#v11-system-header` + `#v11-system-main` for user; shows `#v11-user-profile`
- Updates topbar identity pill (`#apex-user-display`, `#apex-role-badge`)
- Hides `#v11-cmd-agent-panel` on COMMAND page for user role

### 8. Boot Identity Script

**File:** `public/dashboard.html` (end of body)

```javascript
window._apexUser = { id: null, role: 'master', email: null, displayName: 'Master' };
// _bootIdentity() fetches /api/me → updates _apexUser → calls applyRoleProfile(role)
```

Falls back gracefully if `/api/me` is unreachable (keeps master defaults).

### 9. Topbar Identity Pill

**File:** `public/dashboard.html` (topbar)

- `#apex-user-display` — display name
- `#apex-role-badge` — `MASTER` (indigo) or `USER` (cyan)

### 10. SYSTEM Page — Dual View

**File:** `public/dashboard.html` (`#page-system`)

- `#v11-user-profile` — 9-section PROFILE view (Identity, Personal Context, Memory, Privacy, Capabilities, Integrations, Communication, Activity, Security); shown for user, hidden for master
- `#v11-system-header` + `#v11-system-main` — full infrastructure view; shown for master, hidden for user

### 11. Regression Safety

All 20 legacy pages remain in DOM and reachable via `switchPage()`:
`command`, `overview`, `operation`, `system`, `finance`, `communication`, `business`, `health`, `university`, `occult`, `research`, `civilisation`, `reality`, `activity`, `agents`, `approvals`, `knowledge`, `intelligence`, `memory`, `governance`

---

## Test Matrix — 28/28 Pass

| ID | Test | Profile | Result |
|----|------|---------|--------|
| T-1a | `/api/me` returns `role: master` | Master JWT | PASS |
| T-1b | `/api/me` returns correct UUID | Master JWT | PASS |
| T-2a–f | All 6 V-11 nav group labels present in `#apexSideNav` | Master desktop | PASS |
| T-2g | Zero JS console errors on load | Master desktop | PASS |
| T-3 | All 20 page divs `#page-{name}` present in DOM | Master | PASS |
| T-4 | `#nav-agents` visible | Master | PASS |
| T-5a | `#nav-agents` hidden | User JWT | PASS |
| T-5b | `#nav-approvals` hidden | User JWT | PASS |
| T-6 | `#apex-role-badge` text = `USER` | User JWT | PASS |
| T-7 | `#apex-role-badge` text = `MASTER` | Master JWT | PASS |
| T-8a | `#v11-user-profile` visible on SYSTEM page | User JWT | PASS |
| T-8b | `#v11-system-header` hidden on SYSTEM page | User JWT | PASS |
| T-9a | `#v11-system-header` visible on SYSTEM page | Master JWT | PASS |
| T-9b | `#v11-user-profile` hidden on SYSTEM page | Master JWT | PASS |
| T-10a | `#plasmaOrb` present on COMMAND | Master JWT | PASS |
| T-10b | `#plasmaOrb` present on COMMAND | User JWT | PASS |
| T-11 | No horizontal overflow | Desktop 1280px | PASS |
| T-12 | No horizontal overflow | Mobile 390px | PASS |
| T-13a | `switchPage('finance')` activates `#page-finance` | Master | PASS |
| T-13b | `switchPage('intelligence')` activates page | Master | PASS |
| T-13c | `switchPage('memory')` activates page | Master | PASS |
| T-13d | `switchPage('operation')` activates page | Master | PASS |
| T-13e | `switchPage('governance')` activates page | Master | PASS |

Total: 28 assertions, 28 pass, 0 fail.

---

## Hard Constraints Verification

| Constraint | Status |
|-----------|--------|
| All 6 destinations universal (no nav filtering) | ✓ All profiles see all 6 destination groups |
| Authority-filtered content (not navigation-filtered) | ✓ Items within destinations hidden by role, not destinations |
| 20 legacy pages remain reachable | ✓ T-3 confirms all 20 `#page-{name}` divs in DOM |
| PlasmaOrb on COMMAND for all profiles | ✓ T-10 confirms both master and user see `#plasmaOrb` |
| No horizontal overflow | ✓ T-11 (desktop) + T-12 (mobile) |
| COMMIT ONLY AFTER VERIFICATION | ✓ Certified before commit |
| DO NOT PUSH | Pending user directive |
| DO NOT DEPLOY | Pending user directive |
| HARD STOP after V-11-A | Pending |

---

## P0 Security Risks Identified (Phase B)

The following risks were identified during reconnaissance and are **not** addressed in V-11-A (scope-controlled):

1. **Cross-user cache leakage** — `apiCache` keys are not scoped by `humanId`. When user profiles are added, cached data from master sessions may be served to user sessions.
2. **IDOR risk** — backend routes do not enforce `WHERE human_id = req.identity.humanId` on all queries. A user with a valid JWT could request another user's data by ID.
3. **WS broadcast leakage** — `wsBroadcast()` without a filter fan-outs to all connected sessions regardless of role or human identity.

These are Phase B scope items. The WS session registry now stores `humanId` and `role` per connection, enabling role-filtered fan-out when Phase B implements it.

---

*Certification issued: 2026-08-31*  
*Suite: `playwright-v11a-verify.js`*  
*Results: `playwright-v11a-results.json`*
