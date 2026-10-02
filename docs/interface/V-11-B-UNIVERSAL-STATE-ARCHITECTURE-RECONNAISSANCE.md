# V-11-B Universal State Architecture — Reconnaissance

**Status:** RECONNAISSANCE COMPLETE  
**Date:** 2026-08-31  
**Baseline:** Production frozen at `80ab05b` · V-11-A at `0dce44d` (not pushed)  
**Constraint:** No code modified during this mission.

---

## Part I — Mission Parameters

### §1 · Scope

This document is the canonical authority for V-11-B state architecture. It inventories every state mechanism across the APEX codebase, identifies defects and gaps, and defines the authoritative model that V-11-B must implement. It covers:

- `public/dashboard.html` — all inline CSS, JS, and DOM state mechanisms  
- `lib/ws-handler.js` — WebSocket connection, session, and fan-out state  
- `src/routes/auth.js` and all sibling routes — API error response shapes  
- `middleware/civilization-kernel.js`, `request-context.js`, `rate-limiting.js` — pipeline state injection  
- `lib/session-state-registry.js`, `lib/chat-context.js`, `lib/server-state.js` — server state  
- `public/apex-v2.css`, `public/apex-zero.css`, `public/apex-custom.css` — CSS state classes  

Excluded from scope: Supabase schema state (covered by migration chain), deployment/infra state, agent execution internals beyond WS fan-out.

### §2 · Constraints

| Constraint | Status |
|-----------|--------|
| No code modifications during reconnaissance | ✓ Observed |
| No pushes, deployments, Supabase changes | ✓ Observed |
| No auth changes | ✓ Observed |
| Deliverable: this document | ✓ Complete |

---

## Part II — Forensic Inventory

### §3 · Loading State Inventory

**Primary mechanism — skeleton rows**  
CSS class `.skel` / `.ds-skel-row` found in 30+ locations across `dashboard.html`. These are shimmer-animated placeholder rows injected while data fetches are in flight. Pattern: JS injects HTML string containing `.skel` rows → data arrives → rows replaced with real content.

**Secondary mechanism — spinner**  
`#apex-res-spinner` (and `.apex-res-spinner`) exists on the Research page only. No equivalent exists on Finance, Intelligence, Network, Business, or Health. Loading on those pages is indicated purely by skeleton rows or by nothing at all.

**Tertiary mechanism — `safeTimeout` 8-second fallback**  
Lines 14615–14616, 14776, 14830 in `dashboard.html`. After 8 000 ms without a data response, `safeTimeout` replaces the skeleton/spinner with a fallback message. This fallback fires silently — no visual distinction from a data error.

**Gap: No global loading gate.**  
No `pageState.loading = true` central flag. Loading state is tracked locally per panel via inline variable flags (`_sysPageInited`, `_domainVisited`). These flags have no visual representation.

**Gap: No cross-page loading consistency.**  
Research has a named spinner. Every other page uses skeleton rows only. Mobile viewports at 390px show skeleton rows that are not always properly bounded, creating layout shift.

### §4 · Error State Inventory

**Primary mechanism — inline red text**  
The dominant error pattern across `dashboard.html` is `style="color:#ff4d6d"` applied to an injected text string. This pattern appears 15+ times. It has no semantic class, no icon, no dismiss action, no structured shape.

**Secondary mechanism — `panelError()` helper**  
`panelError(el, message)` is defined once in `dashboard.html` but called only twice. It renders an error string into a panel container. The remaining 13+ error sites bypass it entirely, using direct `innerHTML` with inline red styling.

**Tertiary mechanism — `showTaskToast()`**  
Used for ephemeral task-level feedback. Appears briefly then auto-dismisses. Not logged, not persisted, not accessible. No error severity differentiation.

**Critical defect — state collision with `.empty-note`:**  
The class `.empty-note` is used for BOTH true-empty states AND error states:
- Line 13503: `<div class="empty-note">Error loading tasks</div>` — error
- Line 13008: `<div class="empty-note">Could not load content</div>` — error  
- Line 12803: `<div class="empty-note">Failed to fetch</div>` — error
- Line 13520: `<div class="empty-note">No tasks</div>` — true empty

An error and a true empty state are visually identical. A user facing an API failure sees the same UI as a user with no data. This is a P1 defect.

**API-level error shape inconsistency:**  
Routes return errors using two different field names with no consistent taxonomy:
- `{ ok: false, error: message }` — admin.js (10+ occurrences), majority of routes
- `{ ok: false, reply: message }` — auth.js, chat.js, rate-limiter, middleware guards
- Plain `res.status(4xx).send()` — auth.js OAuth paths (no JSON body)

The dashboard JS `fetch` handlers must guess which field to read. No unified error parser exists.

### §5 · Empty State Inventory

**`.empty-note`** (primary, ~25 uses across `dashboard.html`)  
Generic empty state container. Renders centered text in a panel. No illustration, no CTA, no action suggestion. As noted in §4, this class is overloaded for errors — its presence cannot reliably indicate "no data."

**`.queue-empty`** (distinct)  
Used exclusively in the task queue panel. Separate from `.empty-note`, correctly scoped to its container. Not overloaded for errors.

**`#apexResEmpty`** (distinct)  
Used exclusively on the Research page. A named element with its own show/hide logic. Not overloaded.

**Gap: Three empty-state systems for three panels, no unified model.**  
There is no shared empty-state component. Each panel implements its own emptiness independently. Styling, copy, and behavior differ across all three variants.

**Gap: No empty-state differentiation by cause.**  
An empty state caused by "no data exists" looks identical to one caused by "data exists but filters excluded everything." Neither state suggests what the user should do next.

### §6 · Stale / Freshness State Inventory

**`.apex-stale-tag` — CSS class exists, NEVER used in DOM.**  
The class is defined in `dashboard.html`'s inline `<style>` block. It has styling rules (small amber badge, positioned top-right of a panel). It appears in zero template strings, zero JS insertions, and zero static HTML. The freshness indication system is designed but not deployed.

**Three separate `_timeAgo()` implementations (not shared)**  
- One in `dashboard.html` (inline)  
- One in `lib/chat-context.js` (module-local, not exported)  
- One in `lib/session-state-registry.js` (module-local)  

None are imported from a shared utility. Changes to one do not propagate to others. Formatting divergences are possible.

**20+ `setInterval` polling loops in `dashboard.html`**  
Intervals range from 1 000 ms (clock) to 120 000 ms (lessons, costs). Data fetched by these intervals has no visual staleness indicator: if a poll silently fails, the UI shows stale data indefinitely with no badge, no timestamp, and no visual change.

**`_ttlCache` / `inFlightRefreshes` — server-side only**  
TTL caching exists in `lib/chat-context.js` (SUMMARY_TTL_MS = 300 000 ms) and `server.js` general API cache. These TTLs are not surfaced to the frontend. A panel showing data that is 4 minutes 59 seconds old looks identical to one showing data that is 1 second old.

**No `Last-Modified` or `Cache-Control` headers on API responses.**  
Routes do not set HTTP cache semantics. Browsers cannot distinguish fresh from stale responses.

### §7 · Permission / Role State Inventory

**Body-class CSS gate (V-11-A, implemented)**  
`body.apex-role-user .apex-master-only { display: none !important }` and inverse. Specificity (0,2,0) beats `.nav-btn` at (0,1,0). Applied via `applyRoleProfile(role)`.

**`applyRoleProfile(role)` — single canonical gate**  
Called by `_bootIdentity()` after `/api/me` resolves. Toggles body class, swaps SYSTEM page content, updates topbar badge. This is the only role application mechanism.

**`_bootIdentity()` silent fallback**  
If `/api/me` fails (network error, 429, 5xx), `.catch()` fires with an empty body: `/* auth not yet set up */` at line 19918 of `dashboard.html`. The role defaults to `'master'`. A user whose identity fetch fails silently receives master-level UI. This is a P0 security defect — role failure is not a legitimate "default to master" case.

**No dedicated "forbidden" state in the UI.**  
When a user with user role attempts an API action restricted to master, the server returns 403. The frontend has no handler for 403 at the global level — individual fetch handlers may or may not handle it. No "You don't have permission" visual state exists.

**Middleware role guards (server-side, correct)**  
`requireRole(role)` in `lib/middleware.js` returns `{ ok: false, reply: 'Forbidden.' }` on role mismatch. `checkCapability(capName)` returns `{ ok: false, reply: 'Capability...' }`. These are correct but their responses are handled inconsistently by frontend fetch handlers.

### §8 · Real-Time & WebSocket State Inventory

**Three WebSocket connections in `dashboard.html`**

| Connection | Purpose | States Tracked | Fan-out Filtering |
|-----------|---------|---------------|------------------|
| Viz feed | System metrics / viz | 2: LIVE / OFFLINE | None |
| Activity | Live event stream | 5: live / connecting / degraded / disconnected / reconnecting | None |
| Gemini Live | Voice pipeline | Implicit in voice UI | None |

**Activity WS — 5-state model (partial, not complete)**  
The activity connection tracks: `live`, `connecting`, `degraded`, `disconnected`, `reconnecting`. These states are reflected in a dot indicator. This is the most complete state machine in the codebase.

**Viz feed — 2-state only**  
LIVE / OFFLINE binary. No connecting, degraded, or reconnecting states.

**`_wsSessions` Map (server-side, `lib/ws-handler.js`)**  
Structure per session:
```
{
  sessionId, connectedAt, channels: Set<string>,
  humanId: string | null, role: string,
  _pongReceived: boolean
}
```
`humanId` and `role` are stored correctly. However they are **never used for filtering** in `wsBroadcast()`.

**`wsBroadcast()` — channel-based, not role-filtered**  
Lines 105–111 of `lib/ws-handler.js`: voice transcripts broadcast to all subscribers of the `'voice'` channel regardless of `humanId`. Agent status broadcasts to all subscribers of `'agents'` channel regardless of `humanId`. With two authenticated users connected simultaneously, one user can receive the other's voice transcripts and agent events. This is the P0 security risk flagged in V-11-A certification.

**Heartbeat / keepalive**  
60-second ping interval. Sessions not responding within the window are terminated and pruned from `_wsSessions`. No client-visible reconnection indicator beyond the activity WS 5-state model.

### §9 · Notification State Inventory

**`showTaskToast(message, type)`**  
Type parameter accepts at minimum `'success'` and `'error'` variants. Renders an ephemeral toast. Auto-dismisses. No persistent log, no count badge, no notification center. A dismissed error is permanently lost from the UI.

**No notification queue or count.**  
Multiple simultaneous toasts either stack or replace each other (behavior unverified). No "3 notifications" badge exists in the topbar or sidebar.

**`#apex-notification-banner`**  
A static banner element exists in `dashboard.html` for system-wide notifications. Logic for populating it is either absent or tied to a specific code path. Not wired to the event bus.

### §10 · Agent & Execution State Inventory

**`lib/session-state-registry.js` — server-side event-sourced state**  
Tracks per-session cognitive state across 14 event types: `VOICE_STARTED`, `CLAUDE_STARTED`, `TOOL_DISPATCHED`, `AGENT_STARTED`, `AGENT_COMPLETED`, etc. Computes derived snapshots: `is_stable`, `is_processing`, `is_waiting_on_tools`, `perceived_latency_risk` (LOW/MEDIUM/HIGH), `response_strategy` (REFLEX/DEFERRED/FRAMED).

SESSION_TTL_MS = 15 minutes. Pruned every 5 minutes.

**Frontend agent state — implicit**  
Agent status is received via WS `agent:status` messages. No persistent state model in the frontend maps execution state across reconnections. If a WS reconnects mid-agent-run, the frontend does not know the current agent state.

**`lib/cognitive-orchestrator.js` intent classification**  
SIMPLE_QUERY / MULTI_STEP_TASK / TOOL_REQUIRED / AMBIGUOUS. Response modes: REFLEX / FRAMED / DEFERRED / STREAMED. These states are not surfaced to the user.

### §11 · Data & Cache State Inventory

**`_sysPageInited` / `_domainVisited` (dashboard.html)**  
Boolean flags per page preventing re-initialization on tab revisits. No visual representation. No expiry. A page that initialized with stale data will not re-fetch unless explicitly triggered.

**`_ttlCache` (dashboard.html)**  
Object keyed by cache key strings. Values include a timestamp. TTL check is performed before each read. Cache miss triggers a fresh fetch. Silent: no UI indication that a cached vs live value is being displayed.

**`inFlightRefreshes` (dashboard.html)**  
Set of in-flight fetch keys. Prevents duplicate parallel requests for the same resource. Correct pattern. Not visible to user.

**`lib/chat-context.js` server-side caches**  
- `_memorySummaryCache`: TTL = 300 000 ms, invalidated after 10 new messages  
- `_selfCtxCache`: TTL = 60 000 ms  
- `_summaryInFlight`: Promise guard prevents parallel requests  

Module-level mutable variables. In a multi-process (clustered) deployment, each process has its own cache — no shared invalidation. Single-process on Render currently; risk is latent.

**`lib/server-state.js`**  
`_errBuffer[]` — circular buffer of last 20 errors. `GIT_SHA` — deployed revision. No TTL on error buffer. The 20-error limit prevents unbounded growth but may lose older errors before they are examined.

### §12 · Middleware State Injection Pipeline

**Mount order (server.js, inferred from module imports)**

1. `instrument.js` — APM setup (Sentry)  
2. `express-config.js` — Helmet, CORS, compression  
3. `request-context.js` — injects `req.requestId`, `req.executionClass` (REFLEX/EXECUTIVE/BACKGROUND), `req.conversationId`  
4. `middleware/rate-limiting.js` — applies apiLimiter (120/min), masterLimiter (5/min)  
5. `lib/middleware.js resolveIdentity` — injects `req.identity` from JWT  
6. `middleware/civilization-kernel.js` — 7-phase context builder (see below)  
7. Route handlers  
8. `lib/error-handlers.js` — 404 / 5xx fallback  

**`civilization-kernel.js` 7-phase pipeline (578 lines)**

| Phase | Action | Stored On | Notes |
|-------|--------|-----------|-------|
| 2 | Identity hydration | `req.apex.sessionId`, `.authStatus` | |
| 3 | Constitutional gate | `ctx.constitution.verdict` (ALLOW/RESTRICT/DENY/WARN) | 403 on DENY |
| 4 | Goal resolution | `ctx.goals` | Top active goal |
| 5 | Attention scoring | `ctx.attention.tier` (HIGH/MEDIUM/LOW) | Token budget 1000–8000 |
| 5b | Execution modification | `req.apexAttentionTier`, `req.apexMemTokenBudget` | Budget cut on RESTRICT |
| 7 | Memory hydration | async, non-blocking | May not complete before route executes |

**Fail-open philosophy:** All 7 phases call `next()` on error. A broken constitutional gate does not block requests — it silently passes them through. This is correct for availability but means gate failures are invisible without log inspection.

**Request-level state injection summary:**

| Field | Type | Injected By |
|-------|------|-------------|
| `req.requestId` | UUID string | request-context.js |
| `req.executionClass` | REFLEX / EXECUTIVE / BACKGROUND | request-context.js |
| `req.conversationId` | string | request-context.js |
| `req.identity` | `{ humanId, role, email, sessionId, authMethod }` | middleware.js |
| `req.apexAttentionTier` | HIGH / MEDIUM / LOW | civilization-kernel.js |
| `req.apexMemTokenBudget` | 1000 – 8000 | civilization-kernel.js |
| `req.apex` | ExecutionContext object | civilization-kernel.js |

### §13 · CSS State Class Inventory

**`public/apex-v2.css` and `public/apex-zero.css`** — scanned in full.

No state-related CSS classes found in either file. These files contain design tokens and layout primitives only:
- Surface ladder: `--surface`, `--surface-1` … `--surface-3`  
- Semantic colors: `--green` (success), `--red` (danger), `--amber` (warning)  
- Text hierarchy: `--text`, `--text-mid`, `--text-mute`, `--text-faint`  

None of the following classes appear in any CSS file outside `dashboard.html`:  
`.loading`, `.is-loading`, `.is-error`, `.is-empty`, `.is-stale`, `.disabled`, `.skeleton`, `.skel`, `.ds-skel-row`, `.apex-stale-tag`, `.empty-note`, `.queue-empty`

**All state CSS lives in `dashboard.html` `<style>` block.**  
This means state styling cannot be reused across pages without duplicating `dashboard.html`. If APEX ever gains a second HTML file, all state CSS must be duplicated or extracted.

**`public/apex-custom.css`** — empty (user-editable slot via visual editor).

### §14 · State Mechanism Summary Table

| State Type | Mechanism | Locations | Consistent? | Defects |
|-----------|-----------|-----------|-------------|---------|
| Loading | `.skel` / `.ds-skel-row` | 30+ | Partial | No global gate; spinner only on Research |
| Error | Inline `color:#ff4d6d` | 15+ | No | No semantic class; overloads `.empty-note` |
| Empty | `.empty-note` | ~25 | No | Overloaded with errors; no CTA |
| Stale | `.apex-stale-tag` | 0 (never used) | N/A | Designed but not deployed |
| Permission | Body-class CSS gate | 1 | Yes | Silent fallback to master on auth failure |
| WS real-time | 2-state / 5-state (by connection) | 3 connections | No | No role filtering in fan-out |
| Notifications | `showTaskToast` | Multiple | Partial | No queue, no persistence |
| Agent | Server event-sourced | Server only | Yes | Not surfaced to frontend |
| Cache | Module-level + `_ttlCache` | Server + frontend | Partial | No visual freshness signal |
| Forbidden | None | — | N/A | No 403 UI state |

---

## Part III — Canonical Model

### §15 · Canonical State Vocabulary

The following state names are the authoritative V-11-B vocabulary. All implementation must use these exact terms.

**Panel lifecycle states:**

| Token | Meaning | Trigger |
|-------|---------|---------|
| `IDLE` | Panel initialized, awaiting interaction or first load | Initial render |
| `LOADING` | Fetch in flight, skeleton shown | `fetch()` initiated |
| `LIVE` | Data present, within freshness window | Successful fetch |
| `STALE` | Data present, outside freshness window | TTL elapsed without refresh |
| `ERROR` | Fetch failed or server returned error | `!ok` response, 4xx/5xx, network failure |
| `EMPTY` | Fetch succeeded, zero records returned | `data.length === 0` |
| `FORBIDDEN` | Fetch rejected due to insufficient role | 403 response |
| `OFFLINE` | Network or WS connection lost | WS close, fetch `TypeError` |

**Composite states are disallowed.** A panel is exactly one of the above at any instant. `LOADING+STALE` is not a valid state — a refresh is either in-progress (`LOADING`) or not (`STALE`).

**WS connection states (canonical, replaces partial implementations):**

| Token | Meaning |
|-------|---------|
| `CONNECTING` | Initial connect or reconnect attempt in progress |
| `LIVE` | Connected, messages flowing |
| `DEGRADED` | Connected but heartbeat latency > threshold |
| `DISCONNECTED` | Connection closed, not yet attempting reconnect |
| `RECONNECTING` | Closed, backoff timer running, will retry |

### §16 · State Composition Model

Each panel owns a state atom. State transitions are driven by events:

```
Panel State Atom
├── status: IDLE | LOADING | LIVE | STALE | ERROR | EMPTY | FORBIDDEN | OFFLINE
├── data: T | null
├── error: { code, message } | null
├── fetchedAt: timestamp | null
├── staleness: number (ms since fetchedAt)
└── role: 'master' | 'user' (inherited from body class, not per-panel)
```

**Transition rules:**
- `IDLE → LOADING`: fetch initiated
- `LOADING → LIVE`: fetch succeeded, data.length > 0
- `LOADING → EMPTY`: fetch succeeded, data.length === 0
- `LOADING → ERROR`: fetch threw or `!ok` with non-403
- `LOADING → FORBIDDEN`: response status 403
- `LIVE → STALE`: `staleness > panel.ttl`
- `STALE → LOADING`: refresh triggered (manual or interval)
- `LIVE → OFFLINE` / `STALE → OFFLINE`: WS disconnects or `navigator.onLine` false
- `OFFLINE → LOADING`: connectivity restored

**Global states (body-level, not per-panel):**
- `body.apex-role-master` / `body.apex-role-user` — role gate
- `body.apex-ws-live` / `body.apex-ws-offline` — global WS connectivity

### §17 · L0–L4 Progressive Disclosure Mapping

State information is surfaced to users at five disclosure levels. Higher levels require explicit user action.

| Level | Name | What is shown | When |
|-------|------|--------------|------|
| L0 | Status dot | Colored dot on panel chrome (green/amber/red/grey) | Always visible |
| L1 | State label | Text label: LOADING / LIVE / STALE / ERROR / EMPTY / OFFLINE | On hover over L0 dot |
| L2 | Freshness timestamp | "Updated 3m ago" or "Failed 12s ago" | On hover; always shown when STALE |
| L3 | Error detail | Error code + human message; retry button | Visible in ERROR state; expandable |
| L4 | Diagnostic panel | HTTP status, request ID, raw error, WS session info | Accessible via expand on L3 |

**Application to V-11 destinations:**

| Destination | Panels | Minimum level |
|-------------|--------|--------------|
| TODAY / OVERVIEW | Overview metrics | L0 |
| COMMAND | PlasmaOrb, agent panel | L0 |
| LIFE & WORK | Finance, Network, Business, Health, University, Research | L0 + L2 on STALE |
| INTELLIGENCE | Intelligence, Memory, Knowledge | L0 + L2 |
| ACTIONS | Operation, Agents, Approvals | L0 + L3 on ERROR |
| SYSTEM | System metrics, Activity | L0 + L2 + L3 on ERROR |

### §18 · Freshness Model

**Freshness window definitions (proposed, to be confirmed in V-11-B decisions):**

| Panel class | Proposed TTL | Rationale |
|------------|-------------|-----------|
| Real-time metrics (SYSTEM) | 30 s | Infrastructure data changes rapidly |
| Financial data | 5 min | Daily granularity; too-frequent refresh is noise |
| Task/operation queue | 60 s | Operational — users act on tasks |
| Knowledge / Memory | 15 min | Rarely changes within a session |
| Governance / Activity | 2 min | Audit relevance |
| Research | 10 min | External API rate cost |

**`.apex-stale-tag` activation:**  
The class is defined and has correct styling. V-11-B must wire it into DOM by: inserting `<span class="apex-stale-tag">Stale</span>` into panel headers when `status === STALE`. The insertion logic should read panel `data-ttl` attributes.

**`_timeAgo()` consolidation:**  
V-11-B must select one implementation as canonical and remove the other two. The `lib/chat-context.js` implementation is the closest to a utility (it takes ISO strings and returns human strings). Dashboard.html panels should call a single `window._timeAgo()` exported by the boot script.

### §19 · Empty-State Model

**Rule: `.empty-note` must be reserved exclusively for true empty data. It must never appear when the cause is an error.**

**Three empty-state variants (canonical):**

| Variant | Class | Trigger | Required content |
|---------|-------|---------|----------------|
| True empty | `.apex-empty` | `data.length === 0` | Icon + message + optional CTA |
| Filtered empty | `.apex-empty-filtered` | Data exists but active filter returns 0 | Message + clear-filter link |
| Error | `.apex-panel-error` | `!ok` or `status >= 400` | Error icon + message + retry button |

**`.empty-note` is deprecated** as of V-11-B. All existing uses must be audited and reclassified as either `.apex-empty` (true empty) or `.apex-panel-error` (error). The 3 confirmed error misuses at lines 13503, 13008, 12803 must be the first corrected.

### §20 · WebSocket Fan-Out State Model

**Current state (defective):**  
`wsBroadcast()` in `lib/ws-handler.js` accepts an optional `filter` function but no callers pass one. Voice transcripts and agent status are fan-out to all channel subscribers regardless of `humanId`.

**Required V-11-B model:**  
All broadcasts that carry per-user data must pass a filter:

```javascript
// Required pattern — humanId-scoped broadcast
wsBroadcast('agents', payload, meta => meta.humanId === targetHumanId);
wsBroadcast('voice',  payload, meta => meta.humanId === targetHumanId);
```

Broadcasts that are genuinely global (system metrics, viz feed) may omit the filter.

**Channel authorization:**  
Currently any authenticated user can subscribe to any channel. V-11-B must add a channel authorization map:

| Channel | Authorized roles |
|---------|----------------|
| `'voice'` | Self only (humanId match) |
| `'agents'` | master (all) or self (user) |
| `'activity'` | master |
| `'viz'` | all |
| `'system'` | master |

### §21 · API Error Response Unification

V-11-B requires a single error shape across all routes:

```json
{
  "ok": false,
  "error": "ERROR_CODE",
  "message": "Human-readable description.",
  "requestId": "uuid"
}
```

**Canonical error codes (non-exhaustive):**

| Code | HTTP | Meaning |
|------|------|---------|
| `AUTH_NOT_CONFIGURED` | 500 | JWT_SECRET missing |
| `INVALID_CREDENTIALS` | 401 | Wrong password |
| `FORBIDDEN` | 403 | Role insufficient |
| `CAPABILITY_DENIED` | 403 | Named capability missing |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Unhandled server error |
| `NOT_FOUND` | 404 | Route missing |
| `VALIDATION_ERROR` | 422 | Request body invalid |

The existing `{ ok: false, reply: ... }` and `{ ok: false, error: ... }` patterns must be unified in V-11-B route-by-route. The rate-limiter `reply` field is a migration priority as it affects all API calls.

### §22 · Role Failure Safety Model

**Current defect:**  
`_bootIdentity()` catch block at line 19918 of `dashboard.html` is an empty no-op. On `/api/me` failure, `window._apexUser` retains its initial value of `{ role: 'master' }`. A user who cannot authenticate receives master-level UI.

**Required V-11-B behavior:**

| Failure cause | Required UI response |
|--------------|---------------------|
| Network error | Show `OFFLINE` state; retry button; no role assumption |
| 401 Unauthorized | Redirect to login; clear local state |
| 429 Rate limited | Retry after 10s with backoff; keep current cached role if known |
| 500 Server error | Show `ERROR` state; keep current cached role if known |
| 403 Forbidden | Role is confirmed insufficient; degrade to user UI; do not silently pass |

**Role must never default to master on failure.** If identity is unknown, the safe default is the most restrictive role (user). The current behavior is the opposite.

---

## Part IV — Verdict

### §23 · Reconnaissance Verdict

**Status: COMPLETE**

All six source layers have been inventoried:
- `dashboard.html` — loading, error, empty, stale, permission, real-time, notification, agent, cache mechanisms
- `lib/ws-handler.js` — session structure, fan-out filtering, heartbeat
- `src/routes/` — error response shapes, API state fields
- `middleware/` — pipeline state injection, civilization-kernel phases
- `lib/` utilities — session registry, chat-context cache, server-state buffer
- `public/` CSS — confirmed no state classes outside dashboard.html

### §24 · Critical Defects (Must Fix in V-11-B)

| ID | Defect | Severity | Location |
|----|--------|----------|---------|
| D-1 | `.empty-note` used for both errors and empty — visually identical | P1 | dashboard.html lines 13503, 13008, 12803 |
| D-2 | `_bootIdentity()` defaults to master on auth failure | P0 | dashboard.html line 19918 |
| D-3 | `wsBroadcast()` no role/humanId filtering | P0 | lib/ws-handler.js lines 105–111 |
| D-4 | Error response field inconsistency (`error` vs `reply`) | P1 | All route files |
| D-5 | `.apex-stale-tag` defined but never deployed in DOM | P2 | dashboard.html |
| D-6 | Three non-shared `_timeAgo()` implementations | P2 | dashboard.html, lib/chat-context.js, lib/session-state-registry.js |
| D-7 | No `FORBIDDEN` (403) visual state in frontend | P2 | dashboard.html (absent) |
| D-8 | JWT `jti` not validated against `token_revocations` table | P1 | lib/middleware.js |
| D-9 | No CSS state classes in design system files | P2 | apex-v2.css / apex-zero.css |

### §25 · Decisions Required

The following questions must be answered before V-11-B implementation begins:

**D-Q1 · Freshness TTL values**  
Are the proposed TTL values in §18 correct, or does each panel require a custom TTL set by the feature owner? Who owns TTL configuration?

**D-Q2 · Role failure behavior**  
When `/api/me` fails with a network error (not 401/403), should APEX show an offline state or redirect to login? The safest choice is offline-state + retry; redirect may be preferred for UX.

**D-Q3 · Error unification scope**  
Is V-11-B authorized to modify route error shapes (breaking change for any client consuming `reply` field)? Or should error unification be a separate V-11-C scope item?

**D-Q4 · `panelError()` vs new system**  
Should V-11-B extend the existing `panelError()` helper to become the canonical error renderer, or replace it with a new `setState(panelEl, state, payload)` API?

**D-Q5 · WS channel authorization implementation**  
Should channel authorization be enforced at subscribe-time (reject unauthorized subscribe) or at broadcast-time (filter recipients)? Subscribe-time is more secure; broadcast-time is easier to retrofit.

**D-Q6 · Shared `_timeAgo()` canonical location**  
Should the canonical implementation live in `dashboard.html` global scope (simplest) or in a new `lib/format-utils.js` (cleanest)? The latter requires a build step or manual inclusion.

**D-Q7 · L0–L4 disclosure scope**  
Is L4 (diagnostic panel with raw error + request ID) intended for all users or master-only? Exposing request IDs to users aids support but is also a minor information disclosure.

### §26 · Non-Scope Confirmations

The following items were investigated and confirmed **out of scope** for V-11-B:

- Supabase schema state — migration 091 covers identity; additional schema changes not required for state architecture
- `civilization-kernel.js` attention scoring — server-side only, no frontend state surface needed
- `lib/session-state-registry.js` — well-architected, no changes needed in V-11-B
- `lib/cognitive-orchestrator.js` intent classification — internal to pipeline, not user-visible
- Render deployment infra state — unchanged

### §27 · V-11-B Implementation Readiness

| Prerequisite | Status |
|-------------|--------|
| V-11-A certified and committed | ✓ Complete (0dce44d) |
| All 6 source layers inventoried | ✓ Complete |
| Critical defects identified (D-1 through D-9) | ✓ Complete |
| Canonical vocabulary defined (§15) | ✓ Complete |
| Composition model defined (§16) | ✓ Complete |
| L0–L4 disclosure model defined (§17) | ✓ Complete |
| Freshness model defined (§18) | ✓ Pending D-Q1 decision |
| Empty-state model defined (§19) | ✓ Complete |
| WS fan-out model defined (§20) | ✓ Complete |
| API error taxonomy defined (§21) | ✓ Pending D-Q3 decision |
| Role failure safety model defined (§22) | ✓ Pending D-Q2 decision |
| 7 open decisions documented (D-Q1 through D-Q7) | ✓ Complete |

**V-11-B may begin implementation once D-Q1, D-Q2, and D-Q5 are answered.** D-Q3 determines scope boundary and must be resolved before any route files are touched.

---

*Reconnaissance issued: 2026-08-31*  
*Sources: dashboard.html · lib/ws-handler.js · src/routes/* · middleware/* · lib/* · public/*.css*  
*No code was modified during this investigation.*
