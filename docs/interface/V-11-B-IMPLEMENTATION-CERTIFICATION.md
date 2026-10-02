# V-11-B Implementation Certification

**Status:** CERTIFIED  
**Date:** 2026-08-31  
**Verified by:** Playwright automated test suite (playwright-v11b-verify.js)  
**Result:** 29 PASS / 0 FAIL

---

## Scope

V-11-B implements the Universal State Architecture for APEX. A single canonical `setState(panelEl, stateName, payload)` function replaces all ad-hoc inline state patterns. The `_bootIdentity()` function is hardened per D-Q2 (never silently defaults to master on failure). All changes are confined to `public/dashboard.html`. No backend changes. No push/deploy.

---

## Implementation Manifest

### Edit 1 — CSS: V-11-B State Architecture styles

**Location:** After V-11-A role visibility CSS (after `body.apex-role-master .apex-user-only { display: none !important; }`)

Added:
- `.apex-state-dot` — 6px colored dot indicator (classes: `live`, `stale`, `failed`, `offline`, `empty`, `loading`, `forbidden`)
- `@keyframes apex-dot-pulse` — loading animation (1.2s ease-in-out)
- `.apex-empty` — semantic empty state text (italic, muted)
- `.apex-empty-cta` — call-to-action button for empty states
- `.apex-panel-error` — error block with column layout
- `.apex-panel-error-msg` — error message row with dot + text
- `.apex-panel-retry` — inline retry link (underlined, primary color)
- `.apex-stale-since` — stale timestamp label (9px, italic, muted)
- `#apex-conn-indicator` — global connectivity indicator (invisible when live; amber on degraded; red on offline)
- `body.apex-role-unknown` — identity-loading state (dims role badge with pulse animation)

### Edit 2 — HTML: #apex-conn-indicator element

**Location:** `#apex-identity-pill` in topbar, before `#apex-user-display`

```html
<span id="apex-conn-indicator" aria-live="polite" aria-label="Connection status"></span>
```

### Edit 3 — JS: Universal State utilities block

**Location:** After `invalidateTtlCache()`, before `// ══ CLOCK` comment

Installed as `window.*` globals:

| Symbol | Purpose |
|--------|---------|
| `window._timeAgo(ts)` | Canonical relative-time formatter (replaces 3 diverged local implementations) |
| `window._PANEL_TTLS` | Hardcoded TTL config (SYSTEM 30s → knowledge/memory 15min) |
| `window._parseApiError(resp, json)` | Client adapter normalising `error` / `reply` / plain-text API shapes |
| `window._panelStates` | `Map` — per-panel state atoms `{ data, fetchedAt, stale, error }` |
| `window._apexMarkStale(panelId)` | Mark panel stale in state map |
| `window._apexClearStale(panelId, data)` | Clear stale flag and update fetchedAt |
| `window.setState(el, state, payload)` | Canonical panel-state renderer |
| `window._apexSetConnState(state)` | Update `#apex-conn-indicator` appearance |
| `_apexWireConnectivity()` (IIFE) | Wire `navigator.onLine` → `_apexSetConnState` |

**`setState` state model:**

| State | Dot color | Content rendered |
|-------|-----------|-----------------|
| `ready` | green | `payload.html` |
| `stale` | amber | `payload.html` + `.apex-stale-since` |
| `loading` | indigo (animated) | "Loading…" text |
| `empty` | dim white | `.apex-empty` + optional `.apex-empty-cta` |
| `failed` | red | `.apex-panel-error` + optional `.apex-panel-retry` + optional stale timestamp |
| `offline` | dim white | Same as failed |
| `forbidden` | near-invisible | `.apex-empty` with role message |

### Edit 4 — JS: panelError() delegation

`panelError(container, refetchFnName)` now delegates to `setState(container, 'failed', { ... })` instead of writing legacy `.panel-error` HTML inline.

### Edit 5 — JS: Expenses safeTimeout fix

`refreshExpensesPanel()` 8s timeout now calls `setState(tbody, 'failed', { message: '...', retryFn: 'refreshExpensesPanel()' })` instead of silently showing an empty-state message.

### Edit 6 — JS: Birthday safeTimeout fix

`refreshBirthdayPanel()` 8s timeout now calls `setState(panel, 'failed', { message: '...', retryFn: 'refreshBirthdayPanel()' })` instead of silently showing an empty-state message.

### Edit 7 — JS: Memory panel error fix (D-5 defect)

`refreshMemoryPanel()` catch block now calls `window.setState(container, 'failed', { message: err.message })` instead of `<div class="empty-note">` (which is semantically identical to a true empty state).

### Edit 8 — JS: Email panel error fix (D-5 defect)

`refreshEmailPanel()` catch block now calls `window.setState(el, 'failed', { message: err.message, retryFn: 'refreshEmailPanel()' })` instead of `<div class="empty-note">`.

### Edit 9 — JS: Tasks panel error fix (D-5 defect)

`refreshTaskQueuePanel()`:
- `if (!data.ok)` branch → `setState(el, 'failed', { message: 'Error loading tasks', retryFn: '...' })`
- catch block → `setState(el, 'failed', { message: 'Failed to load tasks', retryFn: '...' })`

### Edit 10 — JS: _bootIdentity() D-Q2 hardening (P0 security fix)

**Before:** Silent `catch(() => {})` — kept master defaults on any auth failure. Legacy comment: `/* auth not yet set up — keep master defaults */`

**After:** Full D-Q2 compliant implementation:

| HTTP status | Action |
|-------------|--------|
| `401` | Redirect to `/login` |
| `429` | Degrade to `user`, retry after 5s |
| `5xx` | `conn-degraded`, degrade to `user`, retry after 10s |
| Other non-200 | Degrade to `user` |
| Network failure (catch) | `conn-offline`, degrade to `user`, retry after 10s |
| `200 ok:false` | Degrade to `user` |
| `200 ok:true` | Apply `d.role` (defaults to `'user'` not `'master'`) |

Boot sequence:
1. Adds `body.apex-role-unknown` (dims role badge with pulse)
2. Fetches `/api/me`
3. Removes `apex-role-unknown` in all branches (no stuck state)
4. Calls `applyRoleProfile(resolvedRole)`

**Security invariant upheld:** Master is NEVER the default fallback for failed identity resolution (V-11-N I-2).

---

## Defects Fixed

| ID | Defect | Status |
|----|--------|--------|
| D-1 | `.empty-note` used for errors (memory, email, tasks) — semantically identical to true empty | FIXED (edits 7, 8, 9) |
| D-2 | `_bootIdentity()` silent catch defaults to master on failure (P0 security) | FIXED (edit 10) |
| D-3 | `wsBroadcast()` no role filtering | OUT OF SCOPE (Phase B — WS session registry already has `humanId`+`role` per V-11-A) |
| D-4 | `apiCache` keys not scoped by `humanId` | OUT OF SCOPE (Phase B) |
| D-5 | `.apex-stale-tag` CSS defined but never inserted in DOM | SUPERSEDED (replaced by `.apex-stale-since` in setState) |
| D-6 | safeTimeout callbacks show empty text instead of failed state | FIXED (edits 5, 6) |

---

## Test Matrix — 29/29 Pass

| ID | Test | Profile | Result |
|----|------|---------|--------|
| A-1 | Role badge = MASTER | Master JWT | PASS |
| A-2 | body.apex-role-master present | Master JWT | PASS |
| A-3 | body.apex-role-unknown absent after boot | Master JWT | PASS |
| B-1 | Role badge = USER | User JWT | PASS |
| B-2 | body.apex-role-user present | User JWT | PASS |
| B-3 | body.apex-role-master absent | User JWT | PASS |
| B-4 | body.apex-role-unknown absent after boot | User JWT | PASS |
| C-1 | apex-role-unknown NOT stuck — unauthenticated | No cookie (401 mocked) | PASS |
| D-1 | setState ready renders html | Master | PASS |
| E-1 | setState empty renders .apex-empty | Master | PASS |
| F-1 | setState stale renders .apex-stale-since | Master | PASS |
| G-1 | setState failed renders error + retry | Master | PASS |
| H-1 | setState offline renders error block | Master | PASS |
| I-1 | setState forbidden renders message | User | PASS |
| J-1 | setState loading renders loading dot | Master | PASS |
| K-1 | _parseApiError reads .error field | Master | PASS |
| L-1 | _parseApiError reads .reply field | Master | PASS |
| M-1 | _timeAgo formats seconds correctly | Master | PASS |
| N-1 | #apex-conn-indicator present in DOM | Master | PASS |
| N-2 | conn-offline class + OFFLINE text when offline | Master | PASS |
| N-3 | Text cleared when state = live | Master | PASS |
| O-1 | panelError renders apex-panel-error (not legacy panel-error) | Master | PASS |
| P-1 | window._panelStates is a Map | Master | PASS |
| Q-1 | _PANEL_TTLS.finance = 300000 and _default = 300000 | Master | PASS |
| R-1 | All 6 V-11 nav group labels present (V-11-A regression) | Master | PASS |
| S-1 | #nav-agents hidden for user role (V-11-A regression) | User | PASS |
| S-2 | #nav-approvals hidden for user role (V-11-A regression) | User | PASS |
| T-desktop | No horizontal overflow at desktop 1280px | Master | PASS |
| T-mobile | No horizontal overflow at mobile 390px | Master | PASS |

Total: 29 assertions, 29 pass, 0 fail.

---

## Hard Constraints Verification

| Constraint | Status |
|-----------|--------|
| No backend changes | ✓ Only `public/dashboard.html` modified |
| No push / no deploy | ✓ Pending user directive |
| Surgical patches only | ✓ 10 targeted edits; no rewrites |
| All V-11-A tests regress-free | ✓ R-1, S-1, S-2, T-desktop, T-mobile all PASS |
| node --check server.js passes | ✓ No backend syntax errors |
| Master NEVER defaults on auth failure | ✓ D-Q2 implemented in _bootIdentity() |
| HARD STOP after V-11-B | Pending |

---

## Phase C Candidates (not in scope)

1. Wire `setState` into remaining panel fetch functions (finance summary, routines, roadmap, timeline — still use `.empty-note` or raw innerHTML)
2. Implement `_apexMarkStale` / `_apexClearStale` auto-invalidation tied to `_PANEL_TTLS`
3. WS broadcast role filtering (`wsBroadcast` + `_wsSessions` — D-3 / V-11-N I-15)
4. `apiCache` key scoping by `humanId` (D-4)
5. IDOR enforcement (`WHERE human_id = req.identity.humanId`) on backend routes

---

*Certification issued: 2026-08-31*  
*Suite: `playwright-v11b-verify.js`*  
*Results: `playwright-v11b-results.json`*
