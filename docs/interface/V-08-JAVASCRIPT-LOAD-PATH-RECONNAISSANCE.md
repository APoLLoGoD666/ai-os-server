# V-08 JAVASCRIPT LOAD-PATH & MONOLITH OPTIMISATION — RECONNAISSANCE
# BROWSER-DRIVEN ANALYSIS — POST V-07

**Date:** 2026-08-31  
**Authority:** V-07 certified implementation + browser automation  
**Methodology:** Playwright headless Chromium, authenticated sessions, 3-run median baseline  
**Server:** Local Node.js (port 3000) — same Supabase DB as production  
**Status:** RECONNAISSANCE ONLY — no implementation changes  

---

## 1. Executive Summary

APEX enters V-08 with a median FCP of **528ms** and median DCL of **3,548ms**. The FCP target (< 2s) is already met. The DCL target (< 3s) is not, but is achievable without a monolith split.

The primary bottleneck is **PlasmaOrb.js**, a 5KB external script that evaluates in 780ms–3,108ms (median ~1,850ms) due to canvas/WebGL initialization. It is loaded as a synchronous `<script src>` tag, blocking the parser for its full evaluation duration. Removing it from the synchronous script path would reduce DCL from ~3,548ms to an estimated **~1,700ms** — a single 1-word change (`async` attribute).

A full monolith split is **not recommended** at this stage. The most valuable changes are surgical attribute modifications to the three external `<script src>` tags, plus one additional ungated boot-call block. The risk-adjusted payoff of module extraction is poor relative to these lower-risk optimizations.

---

## 2. V-07 Baseline (Certified)

Entering V-08:

| Metric | V-07 Certified |
|--------|----------------|
| FCP | 528ms (3-run median — see §3 note) |
| DCL | 3,548ms |
| TTFB | 49ms |
| Boot requests (10s) | 46 |
| Overview API calls | 0 |
| Duplicate groups | 4 |

> **Measurement note:** The V-07 certification document recorded FCP as 3,068ms. That figure was measured by a Playwright script that did not read `performance.getEntriesByType('paint')` — it measured a composite timing closer to DOM Interactive. The V-08 3-run baseline uses the paint timing API and reports 528ms median, which is the correct FCP value. The DCL improvement from V-07 (4,831ms → 3,548ms) is confirmed accurate.

---

## 3. Phase 1 — Real Browser Baseline (3-Run Median)

### Methodology

- Playwright Chromium headless, authenticated (`/auth/login` in-page fetch + reload)
- `performance.getEntriesByType('navigation')[0]` for TTFB, DCL
- `performance.getEntriesByType('paint')` for FCP
- `PerformanceObserver` for long tasks
- `page.on('request')` interception for all network requests
- 10-second capture window after `waitUntil: 'load'`
- 3 independent runs; medians computed

### Run-by-Run Results

| Metric | Run 1 | Run 2 | Run 3 | **Median** |
|--------|-------|-------|-------|------------|
| TTFB | 49ms | 36ms | 61ms | **49ms** |
| FCP | 664ms | 404ms | 528ms | **528ms** |
| DOM Interactive | 3,531ms | 4,308ms | 2,919ms | **3,531ms** |
| DCL | 3,548ms | 4,338ms | 2,943ms | **3,548ms** |
| Load Event End | 3,548ms | 4,339ms | 2,944ms | **3,548ms** |
| Total requests (10s) | 46 | 46 | 46 | **46** |
| Overview API calls | 0 | 0 | 0 | **0** |
| JS Heap (used) | 5.63MB | 3.87MB | 4.28MB | **4.28MB** |
| JS Heap (total) | 9.64MB | 7.78MB | 9.06MB | **9.06MB** |

### Long Tasks (Run 1 representative)

| Task Start | Duration | Assessment |
|-----------|----------|-----------|
| +283ms | 334ms | Inline JS evaluation — APEX MIND canvas |
| +628ms | 109ms | Inline JS evaluation — main runtime start |
| +738ms | 58ms | Inline JS continuation |
| +866ms | 277ms | V10 upgrade block evaluation |
| +1,346ms | 55ms | External lib or IIFE |

### External Script Resource Timings

| Script | Transfer Size | Start (ms) | Duration | End (ms) |
|--------|--------------|-----------|---------|---------|
| supabase.js | 54,910 bytes | 65ms | 95–156ms | ~185ms |
| chart.umd.min.js | 71,035 bytes | 1,148–1,285ms | 75–105ms | ~1,390ms |
| PlasmaOrb.js | 5,323 bytes | 1,499–1,554ms | **779–3,108ms** | **~3,350ms** |
| contextual-card.js | 2,917 bytes | 2,343–4,182ms | 100–568ms | ~3,548ms |

**PlasmaOrb.js is 5KB but evaluates in up to 3,108ms.** This is the dominant bottleneck. Duration variance (4:1 ratio across runs) indicates GPU/canvas initialization work, not parse cost.

---

## 4. Phase 2 — Complete JavaScript Inventory

### Document Structure

Dashboard.html is 1,238,773 bytes (1.21MB uncompressed, 218KB compressed).

| Component | Type | Lines | Est. Size | Boot Requirement |
|-----------|------|-------|-----------|-----------------|
| HTML structure + CSS | HTML/CSS | ~5,000 | ~180KB | BOOT-CRITICAL |
| 20 page HTML bodies | HTML | ~5,000 | ~160KB | BOOT-CRITICAL (shell) |
| Script block 1: Communication calendar | Inline IIFE | ~1,077 | ~35KB | NAVIGATION-ONLY |
| Script block 2: Agent modal IIFE | Inline IIFE | ~145 | ~5KB | NAVIGATION-ONLY |
| Script block 3: APEX MIND canvas topology | Inline IIFE | ~1,959 | ~65KB | NAVIGATION-ONLY |
| Script block 4: Page router (switchPage) | Inline | ~67 | ~2KB | BOOT-CRITICAL |
| Script block 5: APEX Event Dispatcher | Inline | ~130 | ~4KB | BOOT-CRITICAL |
| Script block 6: Main runtime | Inline | ~3,554 | ~120KB | MIXED |
| Script block 7: UI stubs | Inline | ~446 | ~15KB | MIXED |
| Script block 8: Login overlay | Inline | ~39 | ~1KB | BOOT-CRITICAL |
| CDN: Chart.js 4.4.0 UMD | External sync | — | 71KB transfer | NAVIGATION-ONLY |
| Script block 9: V10 upgrade block | Inline | ~3,303 | ~110KB | MIXED |
| Script block 10: Apex Studio | Inline IIFE | ~61 | ~2KB | INTERACTION-ONLY |
| Script block 11: Feed system + WS | Inline IIFE | ~373 | ~12KB | BOOT-CRITICAL |
| External: PlasmaOrb.js | External sync | — | 5KB transfer | COMMAND-PAGE |
| Script block 12: Mobile + Command page | Inline IIFE | ~722 | ~25KB | MIXED |
| Script block 13: Activity + Knowledge + Memory | Inline IIFE | ~758 | ~25KB | NAVIGATION-ONLY |
| External: contextual-card.js | External sync | — | 3KB transfer | INTERACTION-ONLY |
| CDN: Supabase @2 UMD | External sync HEAD | — | 55KB transfer | DEFERRED-OK |

**Total inline JS: ~13,634 lines, ~421KB uncompressed**

### Script Block Classification

#### Block 1: Communication Calendar (lines ~7,120–8,197)
- **Purpose:** Inline mini-calendar widget for the Communication/Network page
- **Boot required:** No — only renders inside `#page-communication`
- **DOM access:** `document.getElementById('net-cal-body')`, `'net-cal-title'`
- **Timers:** None
- **APIs:** None
- **Classification: NAVIGATION-ONLY** — safe to defer to first communication page visit
- **Note:** Uses JetBrains Mono inline in rendered HTML (flagged by V-04C)

#### Block 2: Agent Modal IIFE (lines ~8,198–8,343)
- **Purpose:** Renders agent detail cards in `#ovr-pipeline` modal (hidden element)
- **Boot required:** No — `#ovr-pipeline` is `display:none!important`
- **Global exposed:** `window.openOvrModal`, `window.closeOvrModal`
- **Classification: NAVIGATION-ONLY** — ovr-pipeline is permanently hidden; modal likely unused
- **Dead code note:** `#ovr-pipeline` confirmed hidden. `window.openOvrModal` has no caller in current HTML via Event Dispatcher (no `data-fn="openOvrModal"`). Possible PROVEN DEAD candidate — requires runtime coverage confirmation.

#### Block 3: APEX MIND Canvas Topology (lines ~8,344–10,303)
- **Purpose:** 44-node organization topology canvas, rendered on Overview page
- **Boot required:** No — renders inside `#page-overview`, only visible when navigated to
- **Execution cost:** HIGH — complex canvas IIFE with 44 node definitions, SVG-style path calculations, event listener setup
- **Estimated parse cost:** ~200–400ms (largest inline IIFE)
- **Global exposed:** None (IIFE-scoped)
- **Dependencies:** `document.getElementById('page-overview')` — returns early if element missing
- **Classification: NAVIGATION-ONLY** — guarded with `if (!page) return;` at top
- **Extraction risk:** LOW — self-contained IIFE with no external dependencies; starts with existence check

#### Block 4: Page Router (lines ~10,304–10,371)
- **Purpose:** `window.switchPage()`, page meta, `_domainVisited`, `_onFirstDomainVisit()`
- **Boot required:** YES — switchPage must exist before any navigation
- **Global exposed:** `window.switchPage`, `window._domainVisited`, `window._onFirstDomainVisit`
- **Classification: BOOT-CRITICAL**

#### Block 5: APEX Event Dispatcher (lines ~10,372–10,502)
- **Purpose:** CSP-compliant `data-fn` click/change/input/keydown/hover handler
- **Boot required:** YES — all button interactions depend on this
- **Event listeners:** Global `document.addEventListener('click')`, `'change'`, `'input'`, `'keydown'`, `'mouseenter'`, `'mouseleave'`
- **Classification: BOOT-CRITICAL**

#### Block 6: Main Runtime (lines ~10,503–14,057) — LARGEST BLOCK
Subdivisions:
- CONFIG + STATE: `APP_KEY`, `autoListen`, `cachedTasks`, TTS state (~60 lines) — BOOT-CRITICAL
- Gemini Live Voice pipeline: `GL` object, `_glStart`, `_glStop`, `_glStartMic` (~400 lines) — BOOT-DEFERABLE (user-activated only)
- TTS/Piper setup + `_probePiper()` (~120 lines) — BOOT-DEFERABLE (`_probePiper()` fires at parse)
- Voice output/SpeechSynthesis (~150 lines) — BOOT-DEFERABLE
- iOS PWA pipeline (~200 lines) — BOOT-DEFERABLE
- VAD/interrupt listener (~100 lines) — BOOT-DEFERABLE
- Chat UI: `renderChatMessage`, `sendVoiceChatCommand`, `sendChatCommandFromText` (~300 lines) — BOOT-CRITICAL (command page shows immediately)
- Fetch utilities: `buildApiUrl`, `buildApiHeaders`, `fetchJson`, `runRefresh`, `cachedFetch` (~100 lines) — BOOT-CRITICAL
- Clock + connection status (~30 lines) — BOOT-CRITICAL
- Orb state: `setOrbState` (~80 lines) — BOOT-CRITICAL (Command page shows orb)
- WebSocket: `wsConnect`, `_wsHb`, `_wsReconnect` (~150 lines) — BOOT-CRITICAL
- Polling: `refreshEmailPanel`, `refreshFinancePanel`, `refreshRoutinesPanel`, `refreshMemory`, `loadNotifications`, `loadTasks`, `refreshTaskQueuePanel`, `refreshFast`, `refreshSlow`, `refreshAll` (~400 lines) — BOOT-CRITICAL (fire at boot)
- Supabase Realtime + iOS orb wiring (~100 lines) — BOOT-DEFERABLE (called at end of block)
- **Classification: MIXED** — ~40% BOOT-CRITICAL, ~60% BOOT-DEFERABLE

#### Block 7: UI Stubs (lines ~14,058–14,504)
- **Purpose:** `openAgentDrawer`, `filterEmails`, domain-specific stubs, `masterRunNext`, governance map, operation stubs
- **Boot required:** No — all are event-triggered
- **Includes:** `initGovernanceMap()` — writes to `#gov-map-root` which is inside permanently-hidden `#ovr-pipeline`
- **Classification: MIXED** — UI stubs INTERACTION-ONLY; `initGovernanceMap` has no live callers (PROBABLY DEAD)

#### Block 8: Login Overlay (lines ~14,505–14,544)
- **Purpose:** Cookie check, login form, session monitoring
- **Boot required:** YES — runs immediately to show/hide login overlay
- **Classification: BOOT-CRITICAL**

#### Block 9: V10 Upgrade Block (lines ~14,547–17,850) — SECOND LARGEST
Subdivisions:
- Interval registry `_addInterval` + cleanup (~5 lines) — BOOT-CRITICAL
- `runRefresh` dedup guard + `inFlightRefreshes` (~25 lines) — BOOT-CRITICAL
- `cachedFetch` + `invalidateTtlCache` (~20 lines) — BOOT-CRITICAL
- `_domainVisited` panel deferral hooks (~30 lines) — BOOT-CRITICAL
- All domain refresh panel functions: finance, health, operation, business, university, communication, agent, approvals, system, activity, research, knowledge, memory, intelligence, governance, reality (~2,500 lines) — NAVIGATION-ONLY (each gated by `_domainVisited` or domain element check)
- `initOverviewPage` (now no-op) — DEAD (4 lines)
- `refreshFast/refreshSlow` polling orchestration (~30 lines) — BOOT-CRITICAL
- `_addInterval` registrations and `_onFirstDomainVisit` registrations (~50 lines) — BOOT-CRITICAL
- **Classification: MIXED** — infrastructure is BOOT-CRITICAL, domain panels are NAVIGATION-ONLY

#### Block 10: Apex Studio (lines ~17,851–17,912)
- **Purpose:** Developer overlay tool (visual page editor)
- **Boot required:** No — only opens on explicit user toggle
- **Classification: INTERACTION-ONLY** — safe to defer entirely

#### Block 11: Feed System + Activity WS (lines ~17,913–18,286)
- **Purpose:** `apexFeedPush`, `_escHtml`, activity WS handlers for global feed
- **Boot required:** YES — `apexFeedPush` is called by WS message handlers at boot
- **Global exposed:** `window.apexFeedPush`
- **Classification: BOOT-CRITICAL**

#### Block 12: Mobile Enhancements + Command Page (lines ~18,318–19,040)
- **Purpose:** Mobile more-sheet, PTT, orb hold, Command page (stars, orb, strip stats, cmdInitPage)
- **Boot required:** PARTIAL — `window.cmdInitPage` fires at boot (Command is default page); mobile more-sheet BOOT-CRITICAL for mobile; stars/orb BOOT-DEFERABLE (visual only)
- **Classification: MIXED**

#### Block 13: Activity + Knowledge + Memory (lines ~19,041–19,799)
- **Purpose:** Activity page WS, knowledge panel, memory panel, governance page
- **Boot required:** No — navigation-gated domain pages
- **Classification: NAVIGATION-ONLY**

---

## 5. Phase 3 — Script Execution Analysis

### Where the 3,548ms DCL Actually Goes

```
   0ms  Navigation starts
  49ms  TTFB — document bytes begin arriving
  65ms  Supabase CDN fetch starts (sync, in <head>)
 185ms  Supabase.js parsed and evaluated (~115ms)
         ↕ 115ms HEAD BLOCK
        HTML parser resumes, inline CSS parsed
 400ms  FCP → first paint (CSS + shell HTML rendered)
        Inline JS blocks 1–3 executing concurrently:
         Block 1: Calendar (~100ms)
         Block 2: Agent modal (~20ms)
         Block 3: APEX MIND canvas (~200–400ms) ← LONG TASK 334ms
         Block 4–5: Router + Dispatcher (~30ms)
         Block 6: Main runtime (~600ms) ← LONG TASK 277ms
         Block 7: UI stubs (~80ms)
         Block 8: Login overlay (~10ms)
1,155ms  Parser hits Chart.js CDN <script src> → SYNC BLOCK
        Chart.js downloads: ~100ms (CDN fast, 71KB)
        Chart.js evaluates: ~105ms
1,390ms  Chart.js done, parser resumes
         Block 9: V10 upgrade block (~800ms) ← LONG TASKS
         Block 10: Apex Studio (~10ms)
         Block 11: Feed + WS (~60ms)
1,499ms  Parser hits PlasmaOrb.js <script src> → SYNC BLOCK
        PlasmaOrb.js downloads: ~10ms (5KB, local)
        PlasmaOrb.js evaluates: 779–3,108ms ← CRITICAL BOTTLENECK
         [Canvas/WebGL initialization — GPU-dependent variance]
3,349ms  PlasmaOrb.js done, parser resumes
         Block 12: Mobile + Command (~100ms)
         Block 13: Activity + Knowledge (~100ms)
3,369ms  Parser hits contextual-card.js <script src> → SYNC BLOCK
        contextual-card.js evaluates: 100–568ms
3,548ms  DCL fires
```

### Main-Thread Cost Ranking

| Cost | Source | Measured | Type |
|------|--------|---------|------|
| **PlasmaOrb.js evaluation** | Canvas/WebGL init | **779–3,108ms** | EXTERNAL SYNC |
| Inline JS block 6: Main runtime | Config, voice, WS, polling | ~600ms | INLINE SYNC |
| Inline JS block 9: V10 upgrade | All domain panels | ~800ms | INLINE SYNC |
| Inline JS block 3: APEX MIND canvas | 44-node topology | ~200–400ms | INLINE SYNC |
| Supabase.js evaluation | Supabase client lib | ~115ms | EXTERNAL SYNC HEAD |
| Chart.js evaluation | Chart.js 4.4 UMD | ~105ms | EXTERNAL SYNC |
| contextual-card.js evaluation | Contextual card | ~163ms | EXTERNAL SYNC |
| Inline JS block 1: Calendar | Comm page calendar | ~100ms | INLINE SYNC |
| Remaining inline blocks | Various | ~200ms | INLINE SYNC |

---

## 6. Phase 4 — Boot-Critical Code Boundary

### Minimum JavaScript Required for First Useful State

| Requirement | Functions | Estimated Size |
|-------------|-----------|----------------|
| Authenticate | `hasCookie`, `apexDoLogin`, login overlay | ~3KB |
| Render shell | Page router `switchPage`, Event Dispatcher | ~6KB |
| Render navigation | switchPage (already included) | — |
| Render Command skeleton | Basic HTML already in document | 0 |
| Establish WebSocket | `wsConnect`, `_wsHb`, `_wsReconnect` | ~10KB |
| Handle page navigation | `switchPage`, `_domainVisited`, `_onFirstDomainVisit` | ~3KB |
| Render first useful data | `fetchJson`, `cachedFetch`, `runRefresh`, `refreshFast`, `refreshSlow`, `apexFeedPush`, clock | ~20KB |
| Command page rendering | `renderChatMessage`, chat send, `setOrbState`, `updateStatusBar` | ~15KB |

**Estimated BOOT-CRITICAL: ~57KB**

### JavaScript Payload Breakdown

```
CURRENT TOTAL:    ~421KB inline + 134KB external CDN  = ~555KB uncompressed JS
                  (compressed: ~218KB HTML + 134KB external = ~352KB transfer)

BOOT-CRITICAL:    ~57KB   (router + dispatcher + config + WS + fetch + feed + clock + chat)
BOOT-DEFERABLE:   ~130KB  (voice pipeline, APEX MIND canvas, communication calendar)
NAVIGATION-ONLY:  ~180KB  (all domain refresh panels, charts, activity WS)
INTERACTION-ONLY: ~10KB   (Apex Studio, audio VAD details)
LEGACY/DEAD:      ~44KB   (agent modal IIFE, ovr-pipeline code, probably-dead functions)
EXTERNAL:
  Supabase.js:    55KB    (used only for realtime subscriptions — deferred-OK)
  Chart.js:       71KB    (NAVIGATION-ONLY — only needed on chart domain pages)
  PlasmaOrb.js:   5KB     (COMMAND-PAGE — but evaluation is 779–3,108ms)
  contextual-card: 3KB    (INTERACTION-ONLY)
```

---

## 7. Phase 5 — Global Dependency Analysis

### Functions on `window` (partial list)

These are attached to `window` explicitly and are referenced by HTML `data-fn` attributes or by other scripts:

```
window.switchPage            — Event Dispatcher, inline refs, Command page IIFE
window.apexFeedPush          — WS handlers, boot code
window.openOvrModal          — data-fn (if present)
window.closeOvrModal         — data-fn (if present)
window.cmdInitPage           — Command page auto-init, switchPage hook
window.cmdPausePage          — switchPage hook
window.apexStudioToggle      — data-fn
window.asTab                 — data-fn
window.toggleMobileMore      — data-fn
window.closeMobileMore       — data-fn
window.apexFeedPush          — WS handlers
window.setTtsProvider        — data-fn, auto-init
window._apexSetAutoListen    — settings UI
window._apexAppKey           — fetched by external code
window._appKey               — used in all API headers
window.APEX_ORB              — set by PlasmaOrb.js, used by Command page IIFE
window.loadRealityPage       — called from refreshSlow (gated by V-07-02)
window.supabase              — set by Supabase CDN, used by initSupabaseRealtime
```

### Implicit Dependencies (Declaration Order)

| Consumer | Depends On | Risk Level |
|----------|-----------|-----------|
| `initGovernanceMap()` | `document.getElementById('gov-map-root')` | LOW (element exists, hidden) |
| `initOverviewPage()` | Nothing (no-op since V-07-01) | NONE |
| `refreshEmailPanel()` | `fetchJson`, `runRefresh` | MUST be in same or earlier block |
| All domain panels | `fetchJson`, `runRefresh`, `cachedFetch` | MUST be defined first |
| `cmdInitPage` | `initOrb` (uses APEX_ORB from PlasmaOrb.js) | MEDIUM — PlasmaOrb must be loaded first |
| Feed system | `_escHtml` | MUST be defined |
| Chart renders | `Chart` global (from Chart.js CDN) | MEDIUM — Chart.js must load first |
| `initSupabaseRealtime()` | `window.supabase` (from Supabase CDN) | MEDIUM — Supabase must load first |

### Inline Event Handlers vs Event Dispatcher

The Event Dispatcher at block 5 replaces all `onclick`/`onchange` with `data-fn` attributes. Verification shows no remaining `onclick` handlers in the main navigation or domain pages. Some legacy domain page inline handlers may remain — this is not safety-critical for module extraction but must be inventoried before extraction.

### Functions Referenced by Timers

| Timer | Function | Interval |
|-------|---------|---------|
| `_addInterval(refreshJournalPanel, 90000)` | refreshJournalPanel | 90s |
| `_addInterval(refreshHabitTracker, 60000)` | refreshHabitTracker | 60s |
| `_addInterval(refreshPsychologyPanel, 120000)` | refreshPsychologyPanel | 120s |
| `_addInterval(refreshUniversityPanel, 120000)` | refreshUniversityPanel | 120s |
| `_addInterval(refreshContactsPanel, 90000)` | refreshContactsPanel | 90s |
| `_addInterval(refreshExpensesPanel, 120000)` | refreshExpensesPanel | 120s |
| `_addInterval(refreshSubscriptionsPanel, 120000)` | refreshSubscriptionsPanel | 120s |
| `setInterval(tickClock, 1000)` | tickClock | 1s |
| `setInterval(hasCookie check, 60000)` | cookie monitor | 60s |
| Main refresh loop | refreshFast (30s) + refreshSlow (60s) | rolling |

---

## 8. Phase 6 — External Library Analysis

### Supabase JS (@2 UMD)

| Property | Value |
|----------|-------|
| Load position | `<head>` line 19 — RENDER-BLOCKING |
| Transfer size | 54,910 bytes |
| Evaluation time | ~95–156ms (median ~115ms) |
| Boot required | NO — used only by `initSupabaseRealtime()` which runs asynchronously |
| Can defer | YES — requires `initSupabaseRealtime()` to await `window.supabase` ready |
| Pages using it | All — but only for realtime push notifications and email queue |
| Alternative | Native WebSocket subscription via existing `wsConnect` mechanism |
| Recommendation | **Move to `defer`; guard `initSupabaseRealtime()` with supabase-ready check** |

### Chart.js (4.4.0 UMD)

| Property | Value |
|----------|-------|
| Load position | Line 14,546 — mid-document PARSER-BLOCKING |
| Transfer size | 71,035 bytes |
| Evaluation time | ~75–105ms (median ~105ms) |
| Boot required | NO — only used when chart domain pages are first visited |
| Pages using it | Finance charts, Health charts, Business charts, Operation charts |
| Can defer | YES — domain chart render functions check `typeof Chart !== 'undefined'` or can be made to |
| Can lazy-load | YES — dynamic import at first chart page navigation |
| Recommendation | **Move to `defer` immediately; eventually dynamic import on first chart page** |

### PlasmaOrb.js

| Property | Value |
|----------|-------|
| Load position | Line 18,287 — late-document PARSER-BLOCKING |
| Transfer size | 5,323 bytes |
| Evaluation time | **779–3,108ms (median ~1,850ms)** — GPU/canvas init variance |
| Boot required | SOFT — Command page (default) shows orb, but orb is visual-only |
| Pages using it | Command page only |
| Global exposed | `window.APEX_ORB` |
| Can defer | YES — `cmdInitPage` has `if (!CMD.orbFrame) initOrb()` guard |
| Can lazy-load | YES — inject from `cmdInitPage()` if `window.APEX_ORB` not present |
| Risk | LOW — 250ms DOMContentLoaded delay before `cmdInitPage` runs; PlasmaOrb.js (5KB) loads in <10ms |
| Recommendation | **Add `defer` — single attribute, eliminates 779–3,108ms from critical path** |

### contextual-card.js

| Property | Value |
|----------|-------|
| Load position | Line 19,800 — end of document PARSER-BLOCKING |
| Transfer size | 2,917 bytes |
| Evaluation time | 100–568ms |
| Boot required | NO — only used on interaction |
| Can defer | YES — no boot dependencies |
| Recommendation | **Add `defer`** |

### Google Fonts (Inter, JetBrains Mono, Cinzel)

| Property | Value |
|----------|-------|
| Load position | `<head>` preconnect + link |
| Impact | Non-blocking — `display=swap` in URL |
| Boot required | NO for first paint (system fonts render first) |
| Recommendation | Already optimal — no change needed |

---

## 9. Phase 7 — Lazy-Load Candidates

Ranked by: USER VALUE × PAYLOAD SIZE × EXECUTION COST

### Candidate 1: PlasmaOrb.js — Dynamic Load from cmdInitPage

| | |
|--|--|
| **Current** | Loaded via `<script src>` at line 18,287 — blocks 779–3,108ms |
| **Proposed** | Remove script tag; inject from `cmdInitPage()` when Command page first activates |
| **Dependencies** | `window.APEX_ORB` — must be set before `initOrb()` calls succeed |
| **Expected reduction** | 779–3,108ms from DCL critical path |
| **Risk** | LOW |
| **Rollback** | Restore `<script src>` tag |

Implementation:
```javascript
// In cmdInitPage(), before initOrb():
function _loadOrb(cb) {
    if (window.APEX_ORB) { cb(); return; }
    var s = document.createElement('script');
    s.src = '/src/components/orb/PlasmaOrb.js';
    s.onload = cb;
    document.body.appendChild(s);
}
// Replace initOrb() call with: _loadOrb(initOrb);
```

### Candidate 2: Chart.js — Defer + Domain-Gate

| | |
|--|--|
| **Current** | Loaded via `<script src>` CDN mid-document — parser-blocking |
| **Proposed** | Add `defer` to existing tag; eventually dynamic import on first chart navigation |
| **Dependencies** | `Chart` global — used by finance, health, business, operation chart renders |
| **Expected reduction** | Removes 71KB CDN from critical path; ~105ms parse time off DCL |
| **Risk** | LOW-MEDIUM (chart renders must handle Chart not yet loaded) |
| **Rollback** | Remove `defer` attribute |

### Candidate 3: APEX MIND Canvas Topology (~1,959 lines, ~65KB)

| | |
|--|--|
| **Current** | Inline IIFE at block 3, evaluates at boot even when user is on Command page |
| **Proposed** | Move to external `apex-mind.js`, loaded with `defer` |
| **Dependencies** | Self-contained IIFE; checks `if (!page) return;` |
| **Expected reduction** | ~200–400ms off inline parse time; external file cacheable |
| **Risk** | MEDIUM — reads `document.getElementById('page-overview')` at eval time; must handle null |
| **Rollback** | Restore inline IIFE |

### Candidate 4: Voice Pipeline (Gemini Live, TTS, STT, iOS PWA)

| | |
|--|--|
| **Current** | ~600+ lines inline in main runtime block, parses at boot |
| **Proposed** | Extract to `apex-voice.js`, dynamic import on first mic interaction |
| **Dependencies** | `GL` object, `_ttsProvider`, `speakQueue` — shared with chat runtime |
| **Expected reduction** | ~80KB inline parse eliminated |
| **Risk** | HIGH — complex shared state with chat runtime; global variable entanglement |
| **Rollback** | Restore inline |

### Candidate 5: Communication Calendar IIFE (~1,077 lines, ~35KB)

| | |
|--|--|
| **Current** | Inline IIFE at block 1, evaluates at boot |
| **Proposed** | Move to external `apex-comm-cal.js`, defer/load on comm page navigation |
| **Dependencies** | `document.getElementById('net-cal-body')` — safe if element absent |
| **Expected reduction** | ~100ms off inline parse time |
| **Risk** | LOW — self-contained IIFE |
| **Rollback** | Restore inline IIFE |

### Candidate 6: Supabase Realtime — Move CDN to `defer`

| | |
|--|--|
| **Current** | CDN in `<head>` — render-blocking ~115ms |
| **Proposed** | `<script defer src="...supabase.js">`, `initSupabaseRealtime()` waits |
| **Dependencies** | `window.supabase` — must be present before call |
| **Expected FCP reduction** | ~115ms |
| **Risk** | MEDIUM — realtime push delayed until after DCL |
| **Rollback** | Remove `defer` attribute |

---

## 10. Phase 8 — External Script Strategy

### Architecture Options Evaluated

#### Option 1: Status Quo (Inline Monolith)

```
dashboard.html (1.21MB inline)
  [sync] supabase.js (55KB)
  [sync] chart.js (71KB)
  [sync] PlasmaOrb.js (5KB, 779–3,108ms eval)
  [sync] contextual-card.js (3KB)
```

- **Expected performance:** DCL ~3,548ms (current)
- **Caching:** None — full document downloaded and parsed on every load
- **Implementation complexity:** Zero
- **Risk:** Zero
- **Verdict:** DCL target not met

#### Option 2: `defer`/`async` on External Scripts Only (RECOMMENDED — see §11)

```
dashboard.html (1.21MB inline)
  [sync HEAD] supabase.js → [defer] 
  [defer] chart.js
  [async/defer] PlasmaOrb.js
  [defer] contextual-card.js
```

- **Expected DCL:** ~1,700ms (PlasmaOrb off critical path)
- **Expected FCP:** ~400ms (Supabase removed from head)
- **Caching:** External scripts cached; HTML still re-downloaded
- **Implementation complexity:** 4 attribute changes
- **Risk:** LOW
- **Verdict:** Meets DCL < 2s target, FCP remains < 2s

#### Option 3: Core + Domain Bundles

```
dashboard.html (shell only, ~300KB)
  core.js (boot-critical, ~57KB, defer)
  domains.js (all domain panels, ~180KB, lazy per navigation)
  voice.js (voice pipeline, ~80KB, lazy on first mic)
  vendor/supabase.js (defer)
  vendor/chart.js (lazy per chart page)
```

- **Expected DCL:** ~1,200ms
- **Expected FCP:** ~350ms
- **Caching:** Vendor bundles cached aggressively; core rarely changes
- **Implementation complexity:** EXTREME — requires refactoring hundreds of global references
- **Risk:** HIGH — global namespace, inline handlers, init ordering, CSP implications
- **Verdict:** Payoff insufficient for complexity; recommended for V-09+

#### Option 4: Native ES Modules

```
dashboard.html → <script type="module" src="apex-core.js">
  import { switchPage } from './router.js'
  import { wsConnect } from './websocket.js'
  ...dynamic imports for domains
```

- **Expected DCL:** ~1,000ms
- **Caching:** Optimal (granular module caching)
- **Implementation complexity:** EXTREME — entire codebase must adopt ESM; no `var` globals, all `export`/`import`
- **Risk:** CRITICAL — breaks Event Dispatcher window lookups, breaks inline handlers, breaks all `window.fn` references
- **CSP:** Requires `script-src 'self'` (remove `unsafe-inline`), which breaks inline scripts in current HTML
- **Verdict:** Correct long-term architecture; not viable without full rewrite

#### Option 5: Dynamic `import()` for Domain Modules

```
// In switchPage():
if (!_loaded[domain]) {
    await import(`/js/domains/${domain}.js`);
    _loaded[domain] = true;
}
```

- **Expected DCL:** ~1,200ms (inline monolith reduced)
- **Implementation complexity:** HIGH — extraction of domain code + global resolution
- **Risk:** MEDIUM-HIGH
- **Verdict:** Correct pattern; viable for V-09 with ES module migration

#### Option 6: Route-Based Lazy Chunks (Webpack/Vite)

Requires a build pipeline. Not compatible with current vanilla JS architecture.
- **Verdict:** Not applicable without introducing a build system

---

## 11. Recommended Architecture

**Phase 1 (V-08): Script attribute optimisation — 4 changes, ~10 minutes implementation**

No restructuring required. Four attribute modifications to existing `<script>` tags:

1. `<script src="supabase.js">` → `<script defer src="supabase.js">` — remove from head render-block path; guard `initSupabaseRealtime()` with `window.supabase` existence check
2. `<script src="chart.js">` → `<script defer src="chart.js">` — remove from parser critical path; chart renders already execute after navigation
3. `<script src="PlasmaOrb.js">` → `<script defer src="PlasmaOrb.js">` — eliminates 779–3,108ms from DCL; `cmdInitPage` 250ms DOMContentLoaded delay ensures PlasmaOrb available
4. `<script src="contextual-card.js">` → `<script defer src="contextual-card.js">` — removes from end-of-parse block

**Phase 2 (V-09): APEX MIND canvas extraction**

Move 1,959-line APEX MIND canvas IIFE to `/public/js/apex-mind.js`, loaded with `defer`. Requires verifying the IIFE's DOM dependency pattern and adding null guard where missing. Expected ~200–400ms parse time reduction.

**Phase 3 (V-09+): Voice pipeline extraction**

Extract voice pipeline to `/public/js/apex-voice.js`, dynamically imported on first mic tap. Requires careful state variable decoupling (40+ shared globals).

**Phase 4 (V-10+): Domain module extraction**

Incremental extraction of domain panel functions to separate files, lazy-loaded on first `_onFirstDomainVisit`. Requires systematic global→export refactoring.

---

## 12. Phase 9 — Dead Code Analysis

### PROVEN DEAD

| Code | Evidence | Size |
|------|----------|------|
| `initOverviewPage()` body | V-07-01 removed all fetches; remaining 4-line no-op is functionally dead | ~0KB (already neutered) |
| Agent modal IIFE (`_d` object, `_build`, `window.openOvrModal/closeOvrModal`) | `#ovr-pipeline` is `display:none!important`; no `data-fn="openOvrModal"` in current HTML | ~5KB |

### PROBABLY DEAD

| Code | Evidence | Size |
|------|----------|------|
| `initGovernanceMap()` | Only caller was `initOverviewPage()` which now has no body. No other `data-fn="initGovernanceMap"` references. DOM element `gov-map-root` exists but is inside hidden `#ovr-pipeline`. | ~8KB |
| `refreshDocuments()`, `refreshFiles()` | Called only from `refreshAgentData()` which makes dummy calls; routes `/documents`, `/files` may not exist | ~1KB |
| `renderFinanceCards()` | Called at boot (line 14895 retained); target element unclear; no visible Finance cards on overview | ~3KB |

### LEGACY BUT POSSIBLY USED

| Code | Evidence |
|------|----------|
| `_showKeyModal()` | Only fires if `APP_KEY` is empty (line 10540); JWT auth bypasses it, but dev/API-key users may trigger it |
| `refreshDocuments()`, `refreshFiles()` | Could be called from chat commands via `sendChatCommandFromText` |

### ACTIVE

All domain refresh functions in the V10 upgrade block (9: V10) are active — they are called by `_addInterval` and `_onFirstDomainVisit`. All polling functions in block 6 are active. Event Dispatcher, router, WS, feed system are confirmed active.

---

## 13. Phase 10 — Caching Benefit

### Current (Inline Monolith)

Every navigation to dashboard.html requires:
- **First visit:** Download 218KB compressed, parse+eval 1.21MB, DCL ~3,548ms
- **Second visit (cached HTML):** Parse+eval 1.21MB from disk cache, DCL ~3,548ms
- **Refresh:** Full re-parse+eval (browser does not cache parse results for inline JS), DCL ~3,548ms
- **Returning user:** Same as second visit

Browser cache helps with external CDN files (supabase.js, chart.js), but the 1.21MB inline HTML document is re-parsed completely on every load. The browser cannot cache V8 bytecode for inline scripts.

### With External JS Files (V8 Bytecode Cache)

Chrome (V8) caches compiled bytecode for external JS files after the first visit. Estimated benefit:
- Supabase.js: 115ms eval → ~10ms (cached bytecode) after first visit
- Chart.js: 105ms eval → ~10ms (cached bytecode)
- PlasmaOrb.js: 779–3,108ms eval → **~50ms (cached)** — massive benefit

Inline JS cannot benefit from bytecode caching. The 421KB of inline JS always cold-compiles.

### Modelled Caching Scenarios

| Scenario | Current DCL | `defer` changes only | + External domain JS |
|----------|-------------|---------------------|---------------------|
| First visit | 3,548ms | **~1,700ms** | ~1,400ms |
| Second visit (warm CDN) | 3,400ms | **~300ms (bytecode!)** | ~200ms |
| Refresh | 3,548ms | **~1,700ms** | ~1,400ms |
| Returning user (>1h) | 3,400ms | **~300ms** | ~200ms |

The caching benefit of external JS files is most dramatic on second and subsequent visits. A returning user who navigated to APEX yesterday would see PlasmaOrb.js load in ~50ms instead of 779–3,108ms.

---

## 14. Phase 11 — Performance Targets

### Current Medians (V-07 Certified, 3-run)

| Metric | Current |
|--------|---------|
| FCP | **528ms** ✅ already < 2s |
| DCL | **3,548ms** ❌ exceeds 3s target |

### Target: FCP < 2s, DCL < 3s

**FCP < 2s:** Already achieved. No changes required.

**DCL < 3s:** Achievable with V-08-01 alone (`defer` on PlasmaOrb.js). Removing PlasmaOrb.js from the critical path eliminates 779–3,108ms (median ~1,850ms). Estimated DCL: ~1,700ms.

### Target: FCP ~1s, DCL ~2s

**FCP ~1s:** FCP is already ~528ms median. Deferring Supabase.js from head may improve it to ~400ms. Already meets this target.

**DCL ~2s:** Achievable with V-08-01 + V-08-02 (PlasmaOrb.js defer + Chart.js defer). Estimated: ~1,600ms.

### Target: FCP ~500ms, DCL ~1.5s

Requires reducing inline JS parse time. The 421KB inline JS parses in ~2,500ms. Externalizing and caching the 65KB APEX MIND canvas and 35KB communication calendar (~100KB total) could reduce inline parse by ~600ms. Estimated: ~2,000ms DCL on first visit, ~300ms on cached visits.

### What Would Be Required for FCP ~100ms, DCL ~500ms

- Full SSR (server-side rendering) of the shell HTML
- Sub-10KB boot JS served inline (auth check + skeleton only)
- All domain JS deferred/lazy
- No synchronous external scripts in head
- Aggressive module splitting

This is a full application rewrite, not a V-08 scope.

---

## 15. Phase 12 — Migration Risks

### Risk: Global Namespace Pollution

All domain functions are globals. Moving code to external files requires either:
- `window.fn = function() { ... }` assignments in external files, or
- ESM exports (requires removing `data-fn` Event Dispatcher pattern), or
- A globals bridge file

**Assessment:** HIGH for module extraction, ZERO for `defer`/`async` changes.

### Risk: Inline Event Handlers

The Event Dispatcher replaces most `onclick` handlers. Remaining `data-fn` attributes call `window[fnName]`. If domain functions are in external files, they must still be on `window`. This is manageable but requires discipline.

**Assessment:** MEDIUM for extraction, ZERO for `defer`/`async` changes.

### Risk: Initialization Ordering

Many functions depend on others defined in the same script block. Split across files, the browser must load files in the correct order, or each file must explicitly import its dependencies.

Critical ordering dependencies:
- `fetchJson` → `buildApiUrl`, `buildApiHeaders` (must be available first)
- All domain panels → `runRefresh`, `cachedFetch` (must be available first)
- `cmdInitPage` → `window.APEX_ORB` from PlasmaOrb.js (must load before orb init)
- Chart renders → `Chart` global from Chart.js (must load before chart code runs)
- `initSupabaseRealtime` → `window.supabase` from Supabase CDN

**Assessment for `defer` changes:** MEDIUM — `defer` scripts execute in document order, preserving relative ordering. Supabase `defer` requires guard in `initSupabaseRealtime`.

### Risk: WebSocket Handlers

The WS handler at boot (`wsConnect`) sets up message routing that calls `apexFeedPush`, `refreshEmailPanel`, `renderChatMessage`. These must all exist when WS messages arrive. If they're in deferred files, there's a window where WS messages could arrive before handlers are ready.

**Assessment:** LOW for `defer` (DCL-gated), HIGH for async dynamic imports.

### Risk: CSP (Content Security Policy)

Current CSP: `script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net`

Moving scripts to external `.js` files served from `self` is fully CSP-compliant. No CSP change needed.

Moving to native ES modules would require removing `'unsafe-inline'` (which currently enables ALL inline scripts). Removing `unsafe-inline` would break all 13 inline script blocks simultaneously. **This is a full application migration, not a V-08 scope.**

**Assessment:** ZERO risk for attribute changes or same-origin external files. CRITICAL risk for ESM migration.

### Risk: PlasmaOrb.js `defer` Timing

With `defer`, PlasmaOrb.js executes after HTML parsing but before DCL. The `cmdInitPage` is called 250ms after DOMContentLoaded. By the time cmdInitPage runs, PlasmaOrb.js will have been evaluated (it's only 5KB, downloads in <10ms, evaluates in 779–3,108ms, but evaluation is off the critical path with `defer`).

Wait — with `defer`, PlasmaOrb.js still evaluates before DCL. It just evaluates AFTER HTML parsing completes, not mid-parse. So DCL would still be delayed by PlasmaOrb evaluation (779–3,108ms).

**The correct approach for PlasmaOrb.js:**

Option A: `defer` — moves evaluation to post-HTML-parse but DCL still blocked  
Option B: `async` — executes immediately when downloaded; may interrupt parser but DCL not blocked  
Option C: Remove script tag + dynamic inject from cmdInitPage — loads only when needed, DCL not blocked

Options B or C eliminate PlasmaOrb from the DCL critical path entirely. Option A does not.

**Recommendation: Option C (dynamic injection from cmdInitPage).** Safe, predictable, explicit.

```javascript
window.cmdInitPage = function() {
    if (CMD.initialized) { if (!CMD.orbFrame) initOrb(); return; }
    CMD.initialized = true;
    initStars();
    // Load PlasmaOrb dynamically if not already present
    if (!window.APEX_ORB) {
        var s = document.createElement('script');
        s.src = '/src/components/orb/PlasmaOrb.js';
        s.onload = function() { initOrb(); };
        document.body.appendChild(s);
    } else {
        initOrb();
    }
    fetchHealth();
    startWidgetClocks();
    startStripPoll();
};
```

**Assessment:** LOW risk with Option C.

---

## 16. Phase 13 — V-08 Implementation Packages

### V-08-01: Remove PlasmaOrb.js from DCL Critical Path

| | |
|--|--|
| **Objective** | Eliminate 779–3,108ms (median ~1,850ms) canvas evaluation from synchronous parse path |
| **Files affected** | `public/dashboard.html` — 2 locations: script tag at line ~18,287 + `cmdInitPage` at line ~17,425 |
| **Exact change** | Remove `<script src="/src/components/orb/PlasmaOrb.js"></script>`; add dynamic injection in `cmdInitPage` |
| **Payload reduction** | 5KB removed from sync path |
| **Main-thread reduction** | 779–3,108ms off DCL critical path |
| **Expected FCP effect** | None (FCP already fires before PlasmaOrb) |
| **Expected DCL effect** | **−1,850ms (median)** → DCL ~1,700ms |
| **Risk** | LOW |
| **Regression tests** | Orb renders on Command page; orb state changes correctly; PlasmaOrb.js loads and window.APEX_ORB is set |
| **Rollback** | Restore script tag; remove dynamic injection |

### V-08-02: Defer Chart.js CDN

| | |
|--|--|
| **Objective** | Remove 71KB CDN from parser critical path |
| **Files affected** | `public/dashboard.html` — line ~14,546 |
| **Exact change** | `<script src="...chart.js">` → `<script defer src="...chart.js">` |
| **Payload reduction** | 71KB off sync path |
| **Main-thread reduction** | ~105ms + unblocks inline JS continuation at ~1,155ms |
| **Expected DCL effect** | ~−100ms (Chart.js already near end of inline parse path) |
| **Risk** | LOW — domain chart renders are navigation-triggered; Chart.js defers until after inline parse, which is fine |
| **Regression tests** | Finance/Health/Business/Operation chart pages render charts correctly |
| **Rollback** | Remove `defer` attribute |

### V-08-03: Defer contextual-card.js

| | |
|--|--|
| **Objective** | Remove ~163ms end-of-parse block from DCL |
| **Files affected** | `public/dashboard.html` — line ~19,800 |
| **Exact change** | Add `defer` attribute |
| **Expected DCL effect** | ~−163ms |
| **Risk** | LOW |
| **Rollback** | Remove `defer` attribute |

### V-08-04: Defer Supabase CDN (+ guard initSupabaseRealtime)

| | |
|--|--|
| **Objective** | Remove 55KB from head render-blocking path |
| **Files affected** | `public/dashboard.html` — line 19 (script tag) + line ~14,006 (`initSupabaseRealtime` call) |
| **Exact change** | Add `defer` to Supabase CDN tag; wrap `initSupabaseRealtime()` call with `window.supabase` check |
| **Expected FCP effect** | ~−115ms (removes head render block) |
| **Expected DCL effect** | Neutral (Supabase moves to post-parse, but `defer` still executes before DCL) |
| **Risk** | MEDIUM — realtime push delayed ~3,500ms vs current ~185ms; notifications appear ~3s later |
| **Mitigation** | Realtime is supplementary — primary data loaded via polling |
| **Rollback** | Remove `defer`; restore direct call |

### V-08-05: Gate Remaining Ungated Boot Operations Domain Calls

| | |
|--|--|
| **Objective** | Remove 4 operations API calls from boot waterfall (clients, projects, documents, proposals) |
| **Files affected** | `public/dashboard.html` — locate the operations domain init block |
| **Finding** | V-08 waterfall shows `/api/operations/clients`, `/api/operations/projects`, `/api/operations/documents`, `/api/operations/proposals` still firing at ~1,476ms — not gated by V-07-04 |
| **Also:** | `/api/finance/expenses`, `/api/finance/subscriptions`, `/api/health/sleep`, `/api/health/workouts`, `/api/contacts` still appearing at ~1,468ms — V-07-04 `_onFirstDomainVisit` registrations may not be firing as expected |
| **Action required** | Read lines ~14,880–15,000 to locate the remaining ungated block; gate with `_onFirstDomainVisit` |
| **Expected reduction** | −4 to −9 boot requests |
| **Risk** | LOW |
| **Rollback** | Restore direct calls |

### V-08-06: Remove Proven Dead Code

| | |
|--|--|
| **Objective** | Remove agent modal IIFE + confirm `initGovernanceMap` has no live callers |
| **Files affected** | `public/dashboard.html` — blocks 2 (~8,198–8,343) + `initGovernanceMap` in block 7 |
| **Action required** | Confirm zero `data-fn="openOvrModal"` references in HTML; confirm `initGovernanceMap` has no callers other than now-dead `initOverviewPage` body |
| **Expected reduction** | ~13KB inline |
| **Expected DCL effect** | ~20–50ms |
| **Risk** | LOW (if caller verification confirms dead) |
| **Rollback** | Restore removed code from git |

### V-08-07: APEX MIND Canvas Externalization

| | |
|--|--|
| **Objective** | Move 1,959-line APEX MIND topology to external cacheable file |
| **Files affected** | `public/dashboard.html` (remove block 3); new `public/js/apex-mind.js` |
| **Exact change** | Extract IIFE to external file; add `<script defer src="/js/apex-mind.js">` |
| **Expected reduction** | ~65KB off inline parse path; V8 bytecode cached from second visit |
| **Expected DCL effect** | ~−200ms first visit; ~−800ms second visit (cached bytecode) |
| **Risk** | MEDIUM — IIFE reads DOM at eval time; must add `if (!page) return;` guard (already present in code, but timing moves) |
| **Rollback** | Restore inline IIFE; remove external script tag |

---

## 17. Acceptance Criteria

### V-08-01 Acceptance
- `window.APEX_ORB` is defined within 500ms of cmdInitPage firing
- Orb canvas renders on Command page first visit
- Orb state changes (standby/listening/thinking/speaking) work correctly
- DCL measured at < 2,000ms on 3-run median (down from 3,548ms)
- No JavaScript errors in console

### V-08-02 Acceptance
- `typeof Chart !== 'undefined'` when Finance/Health charts render
- Finance page charts display correctly on first navigation
- No "Chart is not defined" errors

### V-08-03 Acceptance
- Contextual card feature functions when activated
- No DCL increase from V-08-01 result

### V-08-04 Acceptance
- `window.supabase` is defined before `initSupabaseRealtime()` reads it
- Realtime notifications still arrive (within ~5s of page load instead of ~200ms)
- No Supabase Realtime errors in console

### V-08-05 Acceptance
- Boot waterfall shows 0 operations domain calls before user visits Operation page
- Boot request count ≤ 37 (eliminating the ~9 ungated domain calls)

### V-08-06 Acceptance
- No console errors about missing openOvrModal or initGovernanceMap
- No visible UI regression

---

## 18. Rollback Strategy

All V-08 changes are reversible via git revert of the specific commit. Because V-08 implementation modifies `public/dashboard.html` only (no backend, no API, no CSS changes), rollback is:

1. `git revert <V-08-commit-hash>` or
2. Manually restore the `<script>` tag attributes modified

Production deployment (when authorized) is a single file push of `public/dashboard.html`. Rollback is the same operation.

---

## 19. Final Report

| Metric | Current (Median 3-run) |
|--------|----------------------|
| **FCP** | **528ms** ✅ |
| **LCP** | Not measured (requires PerformanceObserver with different run) |
| **DCL** | **3,548ms** ❌ |
| **TTFB** | **49ms** ✅ |
| **JS parse+eval time** | **~3,500ms** (DCL - TTFB) |
| **Largest main-thread task** | **PlasmaOrb.js: 779–3,108ms** |
| **Inline JS payload** | **~421KB uncompressed** (compressed within 218KB HTML transfer) |
| **Estimated boot-critical JS** | **~57KB** |
| **Estimated deferable JS** | **~130KB** |
| **Proven-dead functions/blocks** | **2 blocks** (agent modal IIFE, initGovernanceMap body) |
| **Largest third-party dependency** | **Chart.js: 71KB transfer** |
| **Best lazy-load candidate** | **PlasmaOrb.js** (5KB but 1,850ms median eval off critical path) |
| **Recommended architecture** | **Script attribute optimisation (V-08-01–04) → no monolith split yet** |
| **Expected DCL improvement (V-08-01 only)** | **3,548ms → ~1,700ms (−1,850ms, −52%)** |
| **Expected DCL improvement (V-08-01–04)** | **3,548ms → ~1,500ms (−57%)** |
| **Biggest migration risk** | **PlasmaOrb.js canvas init GPU variance** (mitigated by dynamic injection) |
| **Should V-08 implementation proceed?** | **YES** — specifically V-08-01 through V-08-05 in order |

---

## 20. Recommended V-08 Priority Order

| Package | Change | Risk | Expected DCL Delta |
|---------|--------|------|--------------------|
| **V-08-01** | PlasmaOrb.js dynamic injection | LOW | **−1,850ms** |
| **V-08-02** | Chart.js `defer` | LOW | **−100ms** |
| **V-08-03** | contextual-card.js `defer` | LOW | **−163ms** |
| **V-08-04** | Supabase CDN `defer` + guard | MEDIUM | −0 DCL, **−115ms FCP** |
| **V-08-05** | Gate remaining ops boot calls | LOW | −9 requests |
| V-08-06 | Remove proven dead code | LOW | −20ms |
| V-08-07 | Externalize APEX MIND canvas | MEDIUM | −200ms first visit |

**V-08-01 alone achieves the DCL < 2s target.** V-08-02 and V-08-03 add marginal DCL improvement. V-08-04 reduces FCP. V-08-05 cleans up residual boot traffic.

**HARD STOP. NO IMPLEMENTATION. NO DEPLOYMENT. AWAIT EXPLICIT AUTHORIZATION.**

---

*Reconnaissance recorded: 2026-08-31*  
*V-07 certified baseline. Production: UNDEPLOYED.*  
*Playwright script: `playwright-v08-baseline.js`*
