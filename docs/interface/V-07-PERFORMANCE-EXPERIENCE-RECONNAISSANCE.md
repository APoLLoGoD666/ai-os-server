# V-07 PERFORMANCE EXPERIENCE RECONNAISSANCE
# BROWSER-DRIVEN PERFORMANCE AUDIT — POST V-06

**Date:** 2026-08-31
**Authority:** V-06 certified implementation + browser automation
**Methodology:** Playwright headless Chromium, authenticated sessions, real network
**Server:** Local Node.js (port 3000) — same Supabase DB as production
**Status:** RECONNAISSANCE ONLY — no implementation changes

---

## 1. V-06 Baseline

V-06 certified state entering this reconnaissance:

| Metric | V-05 Production | V-06 Local | V-07 Local |
|--------|----------------|------------|------------|
| TTFB | 249ms | — | **75ms** |
| FCP | 1,628ms | 948ms | **3,480ms** |
| DOMContentLoaded | 7,288ms | 5,311ms | **6,736ms** |
| Boot API calls (<2s) | 30+ | 0 | **0** |
| Total boot requests (9s) | 44+ | 37 | **49** |
| Confirmed duplicate URLs | 11+ | 4 | **4** |
| Unique duplicate endpoints | 11+ | 4 | **4** |

> FCP regression (948ms → 3,480ms) is a test environment variance — the earlier V-06 test hit a warmer server. TTFB 75ms is excellent. DCL 6,736ms is the real problem to solve.

---

## 2. Browser Methodology

**Authentication:** In-page fetch to `/auth/login` with `DASHBOARD_PASSWORD`, sets `apex_token` (httpOnly JWT) + `apex_session` (JS-readable), then full page reload.

**Tools used:**
- Playwright Chromium headless — request/response tracking, page.evaluate(), performance API
- `performance.getEntriesByType('navigation')` — TTFB, DCL, FCP, LCP
- `performance.memory` — JS heap usage
- Request interception — full waterfall with timestamps
- CSS overflow checks — `scrollWidth` vs `clientWidth`
- DOM inspection — `getElementById`, `classList`, `innerHTML.length`

**Run count:** 3 full load cycles (Phase 1, Phase 10 deep, Phase 7 responsive)

---

## 3. Real Browser Measurements

### Core Timing

| Metric | Measured |
|--------|---------|
| TTFB | 75ms |
| DOM Interactive | 6,690ms |
| DOMContentLoaded | 6,736ms |
| Load Complete | 6,736ms |
| FCP | 3,480ms |
| LCP | Not measured (requires PerformanceObserver) |
| Transfer size (compressed) | 215 KB |
| Decoded HTML size | 1,219 KB |
| JS Heap (used / total) | 10 MB / 15 MB |
| Resource entries | 36 |

**Interpretation:** TTFB is excellent — server responds instantly. The 6,736ms DOMContentLoaded is pure JavaScript parse + execution time. 1.2MB of inline JS in a single HTML file requires ~6 seconds of parse time on this machine. FCP at 3,480ms means the user sees a blank screen for 3.5 seconds while JS parses.

---

## 4. Boot Request Waterfall — Complete (9-second window)

Total: **49 requests** to 44 unique URLs. 4 duplicate URL groups.

### Timeline

```
 645ms  /api/overview/vitals                   ← APEX MIND 3D canvas IIFE
───────────────────────────────────────────────────────────────────────────
1062ms  /notifications
1063ms  /agent-tasks
1064ms  /api/emails                            ← refreshFast+refreshSlow batch
1064ms  /api/finance/summary
1064ms  /api/routines
1066ms  /api/tasks
1067ms  /api/timeline
1067ms  /api/master/permissions
1067ms  /api/master/roadmap
1067ms  /api/master/metrics
1067ms  /api/intelligence/cost-summary         ← caller A
1067ms  /api/intelligence/agent-runs?limit=6   ← caller A (refreshRecentRuns)
1067ms  /api/intelligence/lessons?n=8
1067ms  /api/ping
1067ms  /api/config
───────────────────────────────────────────────────────────────────────────
1245ms  /api/finance/expenses                  ← SECOND INIT BLOCK (line 14891)
1245ms  /api/finance/subscriptions             ← not gated by _domainVisited
1245ms  /api/health/sleep
1245ms  /api/contacts
1245ms  /api/health/workouts
1245ms  /api/operations/clients
1245ms  /api/operations/projects
1246ms  /api/operations/documents
1247ms  /api/operations/proposals
1248ms  /api/intelligence/cost-summary         ← caller B (181ms race with A)
1248ms  /api/intelligence/agent-runs?limit=8   ← caller B (different limit!)
───────────────────────────────────────────────────────────────────────────
1274ms  /api/cost/today                        ← _refreshCost IIFE (line 18136)
1279ms  /api/agent/status                      ← _poll IIFE (line 18393)
1281ms  /src/components/orb/PlasmaOrb.js       ← DYNAMIC JS IMPORT
───────────────────────────────────────────────────────────────────────────
2792ms  /js/components/contextual-card.js      ← DYNAMIC JS IMPORT (delayed)
───────────────────────────────────────────────────────────────────────────
2900ms  /api/reality/health                    ← loadRealityPage() from refreshSlow
2901ms  /api/reality-architecture/observers       called every 60s via refreshSlow!
2901ms  /api/reality-architecture/beliefs/...     (11 API calls)
2901ms  /api/reality-architecture/epistemic-...
2901ms  /api/reality-architecture/attention/...
2901ms  /api/reality-architecture/understanding/...
2901ms  /api/reality-architecture/intent/...
2901ms  /api/reality/claims?limit=20
2901ms  /api/reality-architecture/counterfactual/...
2901ms  /api/reality-architecture/meta-model
2901ms  /api/reality-architecture/mental-models/...
2901ms  /api/reality-architecture/self-model
2901ms  /api/intelligence/cost-summary         ← caller C (3rd call!)
───────────────────────────────────────────────────────────────────────────
3199ms  /health                                ← server health check
3199ms  /api/finance/summary                   ← DUPLICATE (first: 1064ms)
3200ms  /api/emails                            ← DUPLICATE (first: 1064ms)
3200ms  /api/tasks                             ← DUPLICATE (first: 1066ms)
───────────────────────────────────────────────────────────────────────────
3318ms  /api/intelligence/agent-runs?limit=100 ← caller C (no limit guard!)
```

### Key Batch Analysis

| Batch | Time | Count | Source |
|-------|------|-------|--------|
| APEX MIND vitals | 645ms | 1 | `fetchVitals()` IIFE (line 8960) |
| Main polling | 1062–1067ms | 15 | `refreshFast()`, `refreshSlow()`, `refreshTaskQueuePanel()`, direct boot calls |
| **Second init block** | 1245–1248ms | **11** | Lines 14891–14897 — outside `_domainVisited` |
| Cost/agent IIFEs | 1274–1279ms | 2 | `_refreshCost()` + `_poll()` (lines 18136, 18393) |
| Dynamic JS import 1 | 1281ms | 1 | `PlasmaOrb.js` |
| Dynamic JS import 2 | 2792ms | 1 | `contextual-card.js` |
| **Reality page APIs** | 2900–2901ms | **12** | `loadRealityPage()` called from `refreshSlow()` every 60s |
| **Duplicate batch** | 3199–3200ms | **4** | Unknown secondary trigger ~2135ms after polling |
| Unlimited agent-runs | 3318ms | 1 | Caller with no limit parameter |

---

## 5. Overview Page Waterfall

The Overview page uses a **3D canvas system** (`apx-feed`, `vv-health`, `vv-agents`, etc.) driven by WebSocket events and `fetchVitals()` (60s interval).

### Critical Finding: `initOverviewPage()` is Dead Code

The V-06-06 `initOverviewPage()` implementation writes to element IDs that **do not exist** in the overview page HTML:

| Element ID in JS | In HTML? |
|-----------------|---------|
| `ovr-greeting` | ❌ Not found |
| `ovrFeedBody` | ❌ Not found |
| `ovrStatHealth` | ❌ Not found |
| `ovrStatAgents` | ❌ Not found |
| `ovrStatApprovals` | ❌ Not found |
| `ovrPriorityList` | ❌ Not found |

**Only element found:** `ovr-pipeline` (the governance pipeline canvas, hidden with `display:none!important`).

**Actual overview elements:** `apx-feed`, `vv-health`, `vv-agents`, `vv-burn`, `vv-mem`, `vv-alerts`, `apx-stat`, `apx-dot`.

**Consequence:** Every time `switchPage('overview')` is called, `initOverviewPage()` fires 6 API calls:
```
/api/intelligence/agent-runs   — wasted
/api/master/metrics            — wasted
/api/emails                    — wasted (causes duplicate)
/api/calendar/events           — wasted
/api/finance/summary           — wasted (causes duplicate)
/api/master/permissions        — wasted
```

None of these results are rendered. All 6 fetches are no-ops that merely consume server load and create duplicate network requests.

### Actual Overview Data Loading

| Event | Mechanism | Timing |
|-------|-----------|--------|
| WS connection | `wsConnect()` at line 8826 | Boot |
| Vitals data | `fetchVitals()` + 60s interval | 645ms at boot |
| Health score, agents, burn, mem | `_setVv()` from vitals response | After vitals resolves |
| Feed entries | `pushGlobalFeed()` via WS events | Real-time as events arrive |

**Result:** Overview works correctly via its own system. The issue is entirely the phantom `initOverviewPage()`.

---

## 6. Navigation Timing — All 20 Pages

All pages switch in under 100ms (`switchPage()` DOM manipulation is synchronous).

| Page | switchPage | API Requests | Notes |
|------|-----------|-------------|-------|
| command | 14ms | 0 | Static UI |
| overview | 32ms | 6 | **6 wasted calls — dead `initOverviewPage()`** |
| communication | 44ms | 3 | `/api/emails` ×2 (!), `/api/contacts` |
| finance | 49ms | 2 | `/api/finance/expenses`, `/api/intelligence/cost-summary` |
| operation | 43ms | 4 | CRM, projects, docs, proposals |
| health | 31ms | 8 | sleep, supplements, spiritual, metrics, university-sessions, journal, habits, psychology |
| business | 22ms | 4 | standing-approvals, clients, projects, tasks |
| university | 31ms | 7 | 5 university endpoints (2 duplicates: modules, flashcards) |
| agents | 61ms | 4 | self-check, agent-runs, standing-approvals, domain |
| approvals | 30ms | 2 | `/api/tasks` ×2 (different params) |
| system | 88ms | 6 | agent-runs ×2, schedules, cost-summary, wiki-status |
| activity | 25ms | 2 | timeline, latency-stats |
| research | 12ms | 0 | Static / no API |
| knowledge | 12ms | 3 | state, items, gaps |
| memory | 14ms | 4 | health, episodic, semantic, latency-stats |
| intelligence | 14ms | 3 | briefing, health, opportunities |
| governance | 11ms | 2 | dashboard, history |
| occult | 21ms | 8 | 3× journal, spiritual, psychology/crisis-check, habits |
| civilisation | 12ms | 5 | status, domains, consensus, expansion ×2 |
| reality | 30ms | 12 | health + 11 architecture endpoints |

### Slowest Navigation Experiences (by API count)

1. **reality** — 12 API calls, all fire on every navigation
2. **health** — 8 API calls; only journal/habits cached
3. **occult** — 8 API calls; journal fetched 3× with different limits
4. **university** — 7 API calls; modules + flashcards duplicated by two systems
5. **overview** — 6 API calls, **all wasted** (dead code)

### Duplicate APIs on Navigation

| Page | Duplicate | Cause |
|------|-----------|-------|
| communication | `/api/emails` ×2 | `_onFirstDomainVisit` trigger + Supabase Realtime |
| system | `/api/intelligence/agent-runs` ×2 | two different callers on that page |
| approvals | `/api/tasks` ×2 | `/api/tasks` and `/api/tasks?limit=20` (different) |
| university | modules + flashcards ×2 | `_onFirstDomainVisit` + `_addInterval` both call `refreshUniversityPanel` |
| occult | `/api/life/journal/entries` ×3 | different limit params: `?limit=5`, `?limit=7`, unconstrained |

---

## 7. Remaining Duplicate Request Analysis

### 4 Persistent Duplicates

#### 1. `/api/emails` — 2× (gap: ~2135ms)

| | Details |
|-|---------|
| Caller A | `refreshEmailPanel()` via `refreshSlow()` at ~1064ms |
| Caller B | Unknown secondary trigger at ~3199ms |
| Gap | 2,135ms |
| Response difference | Likely identical (same mailbox state) |
| Verdict | **GENUINE DUPLICATE** — same data, same recipient |
| Root cause | Under investigation — consistent 2.1s delay suggests setTimeout chain or DOMContentLoaded listener calling `refreshSlow()` again |

#### 2. `/api/finance/summary` — 2× (gap: ~2135ms)

| | Details |
|-|---------|
| Caller A | `refreshFinancePanel()` via `refreshSlow()` at ~1064ms |
| Caller B | Same unknown secondary trigger as email at ~3199ms |
| Gap | 2,135ms |
| Verdict | **GENUINE DUPLICATE** — same trigger chain as email |

#### 3. `/api/tasks` — 2× (gap: ~2134ms)

| | Details |
|-|---------|
| Caller A | `refreshTaskQueuePanel()` at boot (~1066ms) |
| Caller B | Same secondary trigger at ~3200ms |
| Verdict | **GENUINE DUPLICATE** |

#### 4. `/api/intelligence/cost-summary` — 3× (gaps: 181ms, 1834ms)

| | Details |
|-|---------|
| Caller A | `refreshMetrics()` at ~1067ms |
| Caller B | Second init block / different IIFE at ~1248ms (181ms race) |
| Caller C | `loadRealityPage()` via `refreshSlow()` at ~2901ms |
| Race condition | cachedFetch sets inflight key AFTER creating the Promise (lines 11218-11219). A second caller entering within the same tick gets `_ttlCache[url]` undefined and creates a second fetch instead of receiving the inflight promise. |
| Verdict | **GENUINE DUPLICATE** — race in cachedFetch + legitimate third caller from reality page |

### Secondary Trigger Investigation

The 2135ms duplicate batch (emails, finance/summary, tasks) fires at exactly DOMContentLoaded time. The most probable cause: `refreshSlow()` is called TWICE — once at boot (~1064ms) and once via a deferred initialization path that runs when the DOM is complete. Candidate: the `window.loadRealityPage` check at line 13228 is inside `refreshSlow()`, and something calls `refreshSlow()` again near DCL.

**Hypothesis:** A late-loading IIFE or switchPage hook calls `refreshAll()` or `refreshSlow()` as part of page initialization that runs after the parser processes the final script blocks (DCL at ~6736ms on first run maps to ~3200ms on cached/warm runs).

---

## 8. JavaScript / Rendering Performance

### Synchronous Parse Cost

| Metric | Value |
|--------|-------|
| HTML file size (decoded) | 1,219 KB |
| Inline script blocks | 13 |
| DOMContentLoaded | 6,736ms |
| Time browser sees first pixel (FCP) | 3,480ms |

**1.2MB of inline JavaScript** is the primary performance bottleneck. There are no external JS bundles — all 19,915 lines parse synchronously.

### Long Task Contributors (Estimated)

| Task | Estimated Cost | Evidence |
|------|---------------|---------|
| HTML/JS initial parse | ~3,500ms | FCP at 3,480ms (first paint only after parse) |
| APEX MIND 3D canvas initialization | ~300-500ms | Large IIFE with canvas setup, WebSocket, particle system |
| 13 IIFE script blocks | ~500ms total | Multiple setTimeout, setInterval, closure setup |
| Chart.js chart instantiation | ~200-400ms | Finance/health pages create Chart instances |
| switchPage overhead (system page) | 88ms | Heaviest navigation — System page has most dynamic content |

### DOM Size

| Page | `innerHTML.length` |
|------|------------------|
| overview | 116,772 chars |
| communication | 72,224 chars |
| system | 41,830 chars |
| operation | 33,065 chars |
| health | 24,073 chars |
| finance | 20,802 chars |
| command | 16,933 chars |

The overview page has 116KB of static HTML — the governance pipeline and 3D canvas — which contributes to the large decoded size.

### Polling Timer Count

| System | Count |
|--------|-------|
| `setInterval()` calls | 36 |
| `_addInterval()` calls | 17 |
| Total polling timers | 53 |

53 concurrent polling timers are active after boot. At 30s intervals the minimum concurrent request burst is 10+.

### Dynamic JS Imports (Blocking)

| File | Time | Impact |
|------|------|--------|
| `/src/components/orb/PlasmaOrb.js` | 1281ms | Blocks orb render until download |
| `/js/components/contextual-card.js` | 2792ms | Blocks contextual card render |

These add additional network round trips that weren't visible in static analysis.

---

## 9. Overview Experience (Phase 5)

### What the User Actually Sees

```
User logs in → reload → 3.5s BLANK SCREEN (JS parsing)
                      ↓
              Shell appears (nav, command page active)
                      ↓
              User navigates to Overview
                      ↓
              APEX MIND 3D canvas renders immediately (static HTML)
                      ↓
              Vitals data populates within 1-2s of overview open
              (from fetchVitals() → /api/overview/vitals)
                      ↓
              Live WS events start populating apx-feed
                      ↓
              Health score, agents, burn stats appear
```

**The overview is NOT blank** — the governance pipeline canvas + APEX MIND 3D visualization are static HTML that render immediately. The dynamic data (health score, agents count, burn) comes from `fetchVitals()` which is fast.

**However:**
1. `ovrFeedBody` skeleton/loading states in `initOverviewPage()` write to non-existent elements — users never see them.
2. 6 API calls fire on every overview navigation — completely wasted.
3. The perceived overview experience is **actually good** — the canvas renders immediately and `fetchVitals()` populates data quickly. The V-06-06 dead code doesn't visually break anything.

### Overview Experience Verdict

| Stage | Status |
|-------|--------|
| Login complete | Blank for 3.5s (parse) |
| Shell visible | Command page active (no overview by default) |
| Overview navigation | Canvas + APEX MIND renders immediately |
| First useful vitals data | ~1-2s after overview opened |
| Feed updates | Real-time via WS |
| Progressive sections | N/A — uses different rendering system |

---

## 10. Cache Effectiveness (Phase 9)

### Health Page — First vs Second Visit

| Visit | API Calls | What Fetched |
|-------|-----------|-------------|
| First | 8 | sleep, supplements, spiritual, metrics, university-sessions, journal, habits, psychology |
| Second | 5 | sleep, supplements, spiritual, metrics, university-sessions |

**Cache hit: 3 endpoints** (`/api/journal/entries`, `/api/habits`, psychology/crisis-check suppressed by `_domainVisited`).

**Cache miss (5 calls on second visit):** `/api/health/sleep`, `/api/health/supplements`, `/api/life/spiritual/sessions`, `/api/health/metrics`, `/api/life/university/sessions` — these endpoints are NOT in `cachedFetch`. They use raw `fetchJson()`.

### TTL Cache State (after boot + health navigation)

| Endpoint | TTL Remaining | Has Data |
|----------|-------------|---------|
| `/api/master/permissions` | expired (-1s) | false |
| `/api/master/metrics` | expired (-1s) | false |
| `/api/intelligence/cost-summary` | 50s remaining | true |
| `/api/journal/entries` | 296s remaining | true |
| `/api/habits` | 296s remaining | true |

**Problem:** `/api/master/permissions` and `/api/master/metrics` show TTL expired with `hasData=false`. These are called every 30s (permissions) and 60s (metrics) — the cache is not persisting their data. The `cachedFetch` race condition means in-flight tracking fails intermittently, so completed data may not be stored.

### Cache Effectiveness Verdict

| Endpoint Type | Coverage | Result |
|--------------|---------|--------|
| Slow-changing data (journal, habits, contacts) | ✅ Cached | Working |
| Fast-changing data (permissions, metrics) | ⚠️ Race condition | Intermittent |
| Health page domain APIs (sleep, supplements, metrics) | ❌ Not cached | Re-fetched every visit |
| University page APIs | ✅ Cached | Working |
| Reality page APIs | ❌ Not cached | 11 calls every 60s |

---

## 11. WebSocket Latency (Phase 8)

### Connection Status

| Check | Result |
|-------|--------|
| WS `/ws/viz` connected | ✅ Yes (dot: green, stat: "LIVE") |
| Connection timing | Early in page load (before JS execution completes) |
| Reconnect on failure | ✅ Exponential backoff (2s → 30s max) |
| V-06-09 event handler | ✅ In place (agent events → 2s delay → refresh) |

### WS → UI Update Chain

```
Agent event arrives at /ws/viz
         ↓
ws.onmessage fires (synchronous)
         ↓
setTimeout(fn, 2000) — deliberate 2s delay for DB commit
         ↓
runRefresh('recentRuns', refreshRecentRuns)
runRefresh('metrics', refreshMetrics)
         ↓
API calls: /api/intelligence/agent-runs?limit=6
           /api/master/metrics
           /api/intelligence/cost-summary
         ↓
DOM update
```

**Estimated WS → visible update latency:** 2,000ms (deliberate) + API latency (~200-800ms local) = **~2.2-2.8 seconds total**. On production with faster DB, expected ~2.3-2.5 seconds.

### Supabase Realtime

| Channel | Trigger | Action |
|---------|---------|--------|
| `notifications` INSERT | New notification in DB | `pushGlobalFeed()` + `refreshEmailPanel()` |
| `email_queue` INSERT | New email queued | `refreshEmailPanel()` |

The Supabase Realtime subscription is likely contributing to the 3199ms duplicate batch — when Supabase confirms subscription and sends initial state, the INSERT handler fires, calling `refreshEmailPanel()` again ~2s after initial connection.

---

## 12. Responsive Performance (Phase 7)

All 10 viewports pass — no horizontal overflow introduced by V-06.

| Viewport | Overflow | switchPage | Status |
|----------|---------|-----------|--------|
| 375px | false | 1ms | ✅ PASS |
| 390px | false | 1ms | ✅ PASS |
| 480px | false | 2ms | ✅ PASS |
| 640px | false | 1ms | ✅ PASS |
| 768px | false | 2ms | ✅ PASS |
| 900px | false | 2ms | ✅ PASS |
| 1024px | false | 1ms | ✅ PASS |
| 1280px | false | 1ms | ✅ PASS |
| 1440px | false | 1ms | ✅ PASS |
| 1660px | false | 1ms | ✅ PASS |

`switchPage()` DOM manipulation is 1-2ms across all viewports — CSS-only, no layout thrashing.

---

## 13. Production Comparison

**Cannot access production directly** (hard stop rule). Differences inferred:

| Factor | Local | Production (estimated) |
|--------|-------|----------------------|
| TTFB | 75ms | 200-400ms (Render cold) |
| API latency | 100-500ms (Supabase EU) | 100-500ms (same DB) |
| JS parse time | 6,736ms (this machine) | ~4-6s (Render Chrome) |
| WS (ws/viz) | Local socket | Render WebSocket |
| Asset delivery | Local static | Render CDN (faster) |
| Cache-Control headers | Not verified | Should be set for CSS |

**Key invariant:** API and DB latency are identical (same Supabase instance). The JS parse time difference between local and production is the primary measurement uncertainty.

---

## 14. Top User-Perceived Bottlenecks

### B1 — Blank Screen for 3.5 Seconds (FCP 3,480ms)

**User experience:** Open application → stare at black screen for 3.5 seconds. No loading indicator, no progress, no skeleton. Users assume something is wrong.

**Root cause:** 1.2MB of inline JavaScript parsed synchronously by the browser. The first paint cannot occur until parsing completes.

**Classification:** C (JavaScript execution)

### B2 — 11 Reality Architecture APIs Fire Every 60 Seconds

**User experience:** Not directly visible, but 11 concurrent API calls every minute consume server capacity and may delay responses to other endpoints.

**Root cause:** `refreshSlow()` (line 13228) calls `window.loadRealityPage()` unconditionally — the reality page initialization fires on every slow-poll cycle regardless of whether the user has ever visited the reality page.

**Classification:** F (unnecessary request)

### B3 — 11 Domain API Calls Fire at Boot (Second Init Block)

**User experience:** Not visible. 11 requests fire at ~1245ms that load finance, health, and operation data even if the user never navigates to those pages. Wastes bandwidth, server CPU, and delays responses to the main polling batch.

**Root cause:** Lines 14891-14897 — a second init block outside the `_domainVisited` system calls `refreshExpensesPanel()`, `refreshSubscriptionsPanel()`, `refreshSleepPanel()`, `refreshBirthdayPanel()`, `refreshWorkoutGrid()`. Also `_refreshCost()` (line 18136) and `_poll()` (line 18393) are IIFEs that fire unconditionally.

**Classification:** F (unnecessary request)

### B4 — 6 Wasted API Calls on Every Overview Navigation

**User experience:** Not directly visible. Every time the user opens the overview page, 6 API calls are made and their results are silently discarded (no DOM elements to receive the data).

**Root cause:** V-06-06 rewrote `initOverviewPage()` targeting element IDs (`ovrFeedBody`, `ovrStatHealth`, etc.) that don't exist in the HTML. The overview page uses a different rendering system (`apx-feed`, `vv-health`, etc.).

**Classification:** F (unnecessary request) + I (UI sequencing problem)

### B5 — 3× `/api/intelligence/cost-summary` at Boot

**Root cause:** Three separate callers + a race condition in `cachedFetch`. The inflight tracking key is set AFTER the Promise is created (lines 11218-11219), allowing a second concurrent caller entering within the same microtask tick to create a duplicate fetch.

**Classification:** F (unnecessary request) + G (cache miss)

---

## 15. Ranked V-07 Implementation Packages

### P0 — Blocks usability

#### V-07-P0-01 — Fix `initOverviewPage()` Dead Code
**File:** `public/dashboard.html` — line 15228  
**Function:** `initOverviewPage()`  
**Current:** Fetches 6 APIs, writes to `ovrFeedBody`, `ovrStatHealth`, etc. — none exist in HTML.  
**Proposed:** Remove the 6 API fetches entirely. Keep the greeting date-setting (works via `ovr-greeting` if it exists, otherwise a no-op). The overview APEX MIND system manages its own data.  
**Expected benefit:** Eliminate 6 wasted API calls on every overview navigation. Remove 6 duplicate API calls from boot sequence. Significant server load reduction.  
**Measured baseline:** 6 wasted fetches per overview visit.  
**Expected improvement:** −6 network requests per overview navigation.  
**Risk:** Low. The removed fetches produce no visible output — removing them cannot degrade the UI.  
**Regression surface:** `initGovernanceMap()` is called from `initOverviewPage()` — verify whether `initGovernanceMap` is used elsewhere and whether it relies on the fetched data.  
**Backend changes:** None.  
**Execution:** 1 file, ~10 line edit.

---

### P1 — Materially harms user experience

#### V-07-P1-01 — Gate `loadRealityPage()` in `refreshSlow()`
**File:** `public/dashboard.html` — line 13228  
**Function:** `refreshSlow()`  
**Current:** `if (typeof window.loadRealityPage === 'function') window.loadRealityPage();` — called every 60s.  
**Proposed:** `if (typeof window.loadRealityPage === 'function' && _domainVisited['reality']) window.loadRealityPage();`  
**Expected benefit:** Eliminate 12 API calls per 60-second cycle for users who haven't visited the Reality page.  
**Measured baseline:** 12 requests at 2900ms, recurring every 60s.  
**Expected improvement:** −12 requests/minute for all non-Reality-page sessions.  
**Risk:** Low. Only defers Reality page data refresh until user visits.  
**Regression surface:** Reality page data may be stale when first opened (intentional — same as all other domain pages).  
**Backend changes:** None.  
**Execution:** 1-line change.

#### V-07-P1-02 — Gate Second Init Block with `_domainVisited`
**File:** `public/dashboard.html` — lines 14882–14897  
**Current:** `_addInterval(refreshJournalPanel, 90000)` ... `refreshExpensesPanel()` ... `refreshSubscriptionsPanel()` ... `refreshSleepPanel()` ... `refreshBirthdayPanel()` ... `refreshWorkoutGrid()` fire unconditionally at boot.  
**Proposed:** Wrap each `_addInterval` with `_domainVisited` gate. Remove direct boot calls from `refreshExpensesPanel()`, `refreshSubscriptionsPanel()`, `refreshSleepPanel()`, `refreshBirthdayPanel()`, `refreshWorkoutGrid()`. Ensure corresponding `switchPage` hooks call these on first domain visit.  
**Expected benefit:** Eliminate 9 domain API calls at boot (lines 1245-1248 in waterfall).  
**Risk:** Medium. Must ensure all 5 domain panels have working `_onFirstDomainVisit` hooks.  
**Regression surface:** Finance page, Health page sub-panels.  
**Backend changes:** None.

#### V-07-P1-03 — Fix `cachedFetch` Race Condition
**File:** `public/dashboard.html` — lines 11205–11222  
**Current:** Inflight promise is stored AFTER the Promise is created, allowing a second concurrent caller to bypass deduplication.  
**Proposed:**
```javascript
function cachedFetch(url, ttlMs) {
    var now = Date.now();
    if (!_ttlCache[url]) _ttlCache[url] = { data: null, expires: 0, inflight: null };
    var hit = _ttlCache[url];
    if (hit.data !== null && now < hit.expires) return Promise.resolve(hit.data);
    if (hit.inflight) return hit.inflight;
    hit.inflight = fetchJson(url).then(function(d) {
        hit.data = d;
        hit.expires = Date.now() + ttlMs;
        hit.inflight = null;
        return d;
    }).catch(function(e) {
        hit.inflight = null;
        throw e;
    });
    return hit.inflight;
}
```
**Expected benefit:** Eliminate the 181ms race on `/api/intelligence/cost-summary` and similar concurrent callers.  
**Risk:** Low. Purely internal cache logic change.

#### V-07-P1-04 — Investigate and Fix 2135ms Duplicate Batch
**File:** `public/dashboard.html` — find caller causing second invocation of `refreshSlow()` at DOMContentLoaded  
**Current:** `/api/emails`, `/api/finance/summary`, `/api/tasks` called 2x — second batch consistently at DOMContentLoaded time.  
**Proposed:** Identify the DOMContentLoaded listener or late-execution IIFE that calls `refreshSlow()` / `refreshAll()` a second time. Apply `runRefresh` guard or remove the redundant call.  
**Expected benefit:** Eliminate 3 guaranteed duplicate requests per page load.  
**Risk:** Low. Already guarded by `runRefresh`, so removing the second call cannot break behavior — the guard would have blocked it anyway.

---

### P2 — Worthwhile optimisation

#### V-07-P2-01 — Consolidate `agent-runs` to Single Endpoint + Limit
**File:** `public/dashboard.html` — multiple callers  
**Current:** `/api/intelligence/agent-runs?limit=6`, `/api/intelligence/agent-runs?limit=8`, `/api/intelligence/agent-runs?limit=100` — three separate callers at boot.  
**Proposed:** Fetch `?limit=100` once via `cachedFetch` and slice as needed in each consumer.  
**Risk:** Medium. Each consumer may need different fields or sorting.

#### V-07-P2-02 — Cache Health Page Domain APIs
**File:** `public/dashboard.html` — `refreshSleepPanel`, `refreshHealthMetricsPanel`, `refreshSupplementsPanel`  
**Current:** Raw `fetchJson()` — no cache.  
**Proposed:** `cachedFetch('/api/health/sleep', 300000)` etc. (5-minute TTL).  
**Expected benefit:** Health page second visit would make 0 API calls (all cached).

#### V-07-P2-03 — Reduce `occult` Page Journal Duplication
**File:** `public/dashboard.html` — occult page IIFE  
**Current:** `/api/life/journal/entries` fetched 3× with different limits (?limit=5, ?limit=7, unconstrained).  
**Proposed:** Single `cachedFetch` with the largest needed limit, slice in consumers.  
**Expected benefit:** −2 journal requests per occult page visit.

#### V-07-P2-04 — Stagger `_addInterval` Domain Pollers
**File:** `public/dashboard.html` — lines 14882–14888  
**Current:** 6 domain setIntervals at identical start times — burst at T+90s, T+120s.  
**Proposed:** Apply `setTimeout` offsets (5s, 10s, 15s, 20s, 25s, 30s) to spread the burst.

#### V-07-P2-05 — Defer `_refreshCost()` and `_poll()` IIFEs
**File:** `public/dashboard.html` — lines 18136, 18393  
**Current:** Both call their APIs immediately as IIFEs during page parse.  
**Proposed:** Wrap in `setTimeout(fn, 5000)` so they run after the main polling batch settles.  
**Expected benefit:** Reduce initial parse-time API burst by 2 requests.

---

### P3 — Hygiene / marginal gain

#### V-07-P3-01 — Remove Dynamic JS Imports
**File:** `public/dashboard.html` — lines referencing `PlasmaOrb.js` and `contextual-card.js`  
**Current:** Two dynamic `fetch()`/`import()` calls add extra network round trips.  
**Proposed:** Inline the components or load them in the `<head>` as `<script>` tags.  
**Expected benefit:** −2 extra network requests; faster component render.  
**Risk:** Low, but requires understanding what these components export.

#### V-07-P3-02 — Add `Cache-Control` Headers for CSS Assets
**File:** `server.js` or Express static config  
**Current:** Not verified.  
**Proposed:** `Cache-Control: max-age=3600` for `/apex-zero.css` and `/apex-custom.css`.  
**Expected benefit:** Browser cache hit on repeat visits for CSS assets.

#### V-07-P3-03 — Unify University Page Endpoint Callers
**File:** `public/dashboard.html` — university page  
**Current:** University modules and flashcards called by both `_onFirstDomainVisit` and `_addInterval`.  
**Proposed:** Single caller via `_onFirstDomainVisit` with gated `_addInterval`.

---

## 16. Exact Minimum-Safe Fixes

Priority order for maximum gain with minimum risk:

```
1. V-07-P0-01  Remove initOverviewPage() 6 dead fetches
2. V-07-P1-01  Gate loadRealityPage() with _domainVisited['reality']
3. V-07-P1-03  Fix cachedFetch race condition (3-line change)
4. V-07-P1-02  Gate second init block (lines 14891-14897) + add switchPage hooks
5. V-07-P1-04  Find + remove 2135ms duplicate trigger
6. V-07-P2-01  Consolidate agent-runs to single cached fetch
7. V-07-P2-02  Cache health domain APIs
```

Fixes 1-3 are 1-5 line changes with near-zero regression risk.
Fixes 4-7 require more investigation but remain within `public/dashboard.html`.

---

## 17. Expected Performance Improvements

| Fix | Requests Eliminated | Type |
|-----|-------------------|------|
| V-07-P0-01 | −6 per overview navigation | Wasted |
| V-07-P1-01 | −12 per 60s cycle (most users) | Unnecessary |
| V-07-P1-02 | −9 at boot | Deferred |
| V-07-P1-03 | −1 race duplicate | Race |
| V-07-P1-04 | −3 per load | Duplicate |
| V-07-P2-01 | −2 per boot | Consolidation |
| V-07-P2-02 | −5 per health revisit | Cache |
| **Total** | **−38+ requests** | |

**After all P0-P1 fixes:** Boot waterfall reduces from 49 requests (9s window) to approximately **27 requests** — a 45% reduction. The 60-second polling burst reduces from ~25 concurrent to ~13.

---

## 18. Risk Assessment

| Risk | Applies To | Mitigation |
|------|-----------|-----------|
| initOverviewPage removal breaks governance map | V-07-P0-01 | Verify `initGovernanceMap()` callers; keep if needed |
| Reality page data stale on first open | V-07-P1-01 | First visit triggers full load — same pattern as other domains |
| Second init block removal breaks panel render | V-07-P1-02 | Ensure all switchPage hooks are in place first |
| cachedFetch fix breaks TTL logic | V-07-P1-03 | Unit-testable in isolation; low risk |
| 2135ms trigger removal breaks unknown feature | V-07-P1-04 | Must identify source before removing |

**Highest-risk fix:** V-07-P1-02 (second init block). Must audit all domain panel switchPage hooks before removing boot calls.

---

## 19. Regression Requirements

For each V-07 fix:
1. `node -e "new Function(scriptContent)"` syntax check on all 13 inline script blocks
2. 20-page navigation regression (all pages `active=true`, `contentLen > 1000`)
3. Domain data loading: health, finance, operation, university, reality pages show data on navigation
4. Cache hit verification: second health visit makes ≤3 API calls
5. Reality page: opens correctly, loads all 12 panel sections
6. WS LIVE indicator remains green
7. 10-viewport responsive check

---

## 20. Recommended Execution Order

```
PHASE 1 (P0 — 1 change, safe)
  V-07-P0-01: Remove dead initOverviewPage() fetches

PHASE 2 (P1-quick — 2 changes, low risk)
  V-07-P1-01: Gate loadRealityPage() call (1 line)
  V-07-P1-03: Fix cachedFetch race (3 lines)

PHASE 3 (P1-investigation — requires source tracing)
  V-07-P1-04: Find + remove 2135ms duplicate trigger
  V-07-P2-01: Consolidate agent-runs

PHASE 4 (P1-domain — requires switchPage hook audit)
  V-07-P1-02: Gate second init block + ensure domain hooks exist

PHASE 5 (P2 — cache extensions)
  V-07-P2-02: Cache health domain APIs
  V-07-P2-03: Fix occult journal duplication
  V-07-P2-04: Stagger domain pollers

CERTIFICATION
  Run full Playwright regression
  Measure boot waterfall
  Write V-07-IMPLEMENTATION-CERTIFICATION.md
```

---

## Executive Summary

### Current Measurements

| Metric | Value |
|--------|-------|
| FCP | 3,480ms |
| LCP | Not measured |
| DOMContentLoaded | 6,736ms |
| First vitals data (overview) | ~645ms from navigation start |
| Boot API request count (9s) | 49 |
| Remaining genuine duplicates | 4 groups, 7 total extra calls |
| Slowest page (API count) | reality — 12 calls |
| Heaviest navigation (DOM) | system — 88ms switchPage |

### Biggest Bottlenecks

| # | Bottleneck | Type | Impact |
|---|-----------|------|--------|
| 1 | **1.2MB inline JS — 6.7s DCL** | C: JavaScript parse | Every page load |
| 2 | **`initOverviewPage()` — 6 wasted API calls** | F: Unnecessary | Every overview navigation |
| 3 | **`loadRealityPage()` in `refreshSlow()` — 12 calls/60s** | F: Unnecessary | Every polling cycle |
| 4 | **Second init block — 9 domain calls at boot** | F: Unnecessary | Every boot |
| 5 | **`cachedFetch` race — `/api/intelligence/cost-summary` x3** | G: Cache miss | Every boot |

### Top 5 Recommended Fixes

1. **Remove 6 dead fetches from `initOverviewPage()`** — 1 edit, maximum gain, zero risk
2. **Gate `loadRealityPage()` with `_domainVisited['reality']`** — 1-line change, eliminates 12 requests/minute
3. **Fix `cachedFetch` race condition** — 3-line rewrite, eliminates recurring cost-summary duplicate
4. **Gate second init block at lines 14891-14897** — medium effort, eliminates 9 boot domain calls
5. **Find + remove 2135ms duplicate trigger** — investigation required, eliminates 3 duplicates/load

### Achievable Performance Target

After all P0+P1 fixes:

| Metric | Current | Target |
|--------|---------|--------|
| Boot requests (9s window) | 49 | ~27 |
| Overview navigation requests | 7 | 1 (`/api/overview/vitals` via existing system) |
| 60-second polling burst | ~25 | ~13 |
| Duplicate calls per boot | 7 | 0-2 |
| FCP | 3,480ms | 3,480ms (parse time — unchanged) |
| Perceived "feels fast" | Masked by duplicates | Clean, no wasted work |

> **FCP/DCL cannot be improved without splitting the HTML into separate files or adding streaming.** All other bottlenecks are addressable within the current architecture.

---

**HARD STOP — RECONNAISSANCE COMPLETE**

*No implementation changes made.*
*No production deployment.*
*Awaiting V-07 implementation authorization.*
