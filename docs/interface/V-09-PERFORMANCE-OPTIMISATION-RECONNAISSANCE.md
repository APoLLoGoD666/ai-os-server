# V-09 PERFORMANCE OPTIMISATION RECONNAISSANCE
# APEX Interface — V-09A/B Forensics

**Date:** 2026-08-31
**Status:** COMPLETE — implementation authorised
**Baseline state:** V-08 certified and committed (867396a)

---

## 1. V-09A — 3-Run Cold-Load Baseline Medians

| Metric | Run 1 | Run 2 | Run 3 | Median |
|--------|-------|-------|-------|--------|
| TTFB (ms) | 44.6 | 58.9 | 56.9 | **56.9** |
| FCP (ms) | 428 | 408 | 416 | **416** |
| LCP (ms) | 428 | 408 | 416 | **416** |
| DOM Interactive (ms) | 943 | 1,435 | 1,263 | **1,263** |
| DCL (ms) | 1,957 | 1,945 | 1,755 | **1,945** |
| Load Event (ms) | 1,973 | 1,957 | 1,762 | **1,957** |
| Requests 1s | 30 | 24 | 27 | **27** |
| Requests 3s | 36 | 37 | 37 | **37** |
| Requests 5s | 36 | 37 | 37 | **37** |
| Requests 10s | 37 | 37 | 37 | **37** |
| Requests total (12s) | 37 | 37 | 37 | **37** |
| Duplicate groups | 4 | 4 | 4 | **4** |
| Long tasks | 6 | 7 | 6 | **6** |

Note: LCP = FCP in all runs — the largest contentful paint element is the same as the first paint. FCP/LCP at ~416ms is browser-side, well before any API data arrives.

HTML payload: 218,457 bytes compressed / 1,238,718 bytes decompressed.

---

## 2. Script Evaluation Timeline (Run 1 baseline)

| Script | Start (ms) | Duration (ms) | Notes |
|--------|-----------|---------------|-------|
| supabase.js (CDN) | 61 | 111 | Auth dependency — boot-critical |
| chart.umd.min.js (CDN, defer) | 774 | 134 | Charting — deferred |
| contextual-card.js (local, defer) | 880 | 1,073 | **DCL blocker — see §4** |
| PlasmaOrb.js (local, dynamic) | 2,235 | 6,916 | Post-DCL — already fixed by V-08-01 |

Duration includes download wait + evaluation. contextual-card.js execution time matches the DCL gap in every run:
- Run 1: starts +880ms, dur 1,073ms → completes 1,953ms ≈ DCL 1,957ms
- Run 2: starts +1,294ms, dur 639ms → completes 1,933ms ≈ DCL 1,945ms
- Run 3: starts +1,181ms, dur 565ms → completes 1,746ms ≈ DCL 1,755ms

**DCL ≈ DOM Interactive + contextual-card.js evaluation time in all 3 runs.**

---

## 3. Request Waterfall — Full Classification (Run 1)

| # | +ms | Type | URL | Class | Initiator |
|---|-----|------|-----|-------|-----------|
| 1 | 16 | document | localhost:3000/ | A | browser |
| 2 | 82 | stylesheet | fonts.googleapis.com | A | html |
| 3 | 82 | script | supabase.js (CDN) | A | html — auth |
| 4 | 224 | stylesheet | apex-custom.css | A | html |
| 5 | 224 | stylesheet | apex-zero.css | A | html |
| 6 | 405 | font | JetBrains Mono woff2 | B | CSS |
| 7 | 405 | font | Inter woff2 | B | CSS |
| 8 | 550 | fetch | /api/overview/vitals | B | initOverviewPage |
| 9 | 586 | fetch | localhost:5002/health | C | healthcheck to secondary service |
| 10 | 620 | fetch | /notifications | B | loadNotifications |
| 11 | 620 | fetch | /agent-tasks | B | loadTasks |
| 12 | 620 | fetch | /api/emails | C | refreshEmailPanel (refreshSlow) |
| 13 | 620 | fetch | /api/finance/summary | C | refreshFinancePanel (refreshSlow) |
| 14 | 620 | fetch | /api/routines | B | refreshRoutinesPanel (refreshSlow) |
| 15 | 620 | fetch | /api/tasks | B | refreshTaskQueuePanel |
| 16 | 620 | fetch | /api/timeline | B | refreshTimelinePanel |
| 17 | 620 | fetch | /api/master/permissions | A | pollPermissions |
| 18 | 622 | fetch | /api/master/roadmap | C | refreshRoadmapPanel (boot, no guard) |
| 19 | 622 | fetch | /api/master/metrics | C | refreshMetrics (boot) |
| 20 | 623 | fetch | /api/intelligence/cost-summary | C | refreshMetrics (cachedFetch 60s) [1st] |
| 21 | 623 | fetch | /api/intelligence/agent-runs?limit=6 | C | refreshRecentRuns (boot) |
| 22 | 623 | fetch | /api/intelligence/lessons?n=8 | C | refreshLessons (boot) |
| 23 | 623 | fetch | /api/ping | E | bare fetch — connectivity check |
| 24 | 623 | fetch | /api/config | A | loadCfg (cmdInitPage) |
| 25 | 819 | script | chart.js (CDN, defer) | C | html defer |
| 26 | 819 | fetch | /api/intelligence/cost-summary | D | fetchCommandProgress (raw fetch) [2nd] |
| 27 | 819 | fetch | /api/intelligence/agent-runs?limit=8 | C | fetchCommandUpdates |
| 28 | 872 | fetch | /api/cost/today | C | cmdInitPage |
| 29 | 873 | fetch | /api/agent/status | B | cmdInitPage |
| 30 | 899 | script | contextual-card.js (local, defer) | C | html defer — **DCL blocker** |
| 31 | 2,220 | fetch | /api/intelligence/agent-runs?limit=100 | C | fetchCommandProgress |
| 32 | 2,252 | fetch | /health | C | fetchStripStats (startStripPoll cold boot) |
| 33 | 2,252 | fetch | /api/finance/summary | D | fetchStripStats (cold-boot TTL race) [2nd] |
| 34 | 2,252 | fetch | /api/emails | D | fetchStripStats (cold-boot TTL race) [2nd] |
| 35 | 2,252 | fetch | /api/tasks | D | fetchStripStats (cold-boot TTL race) [2nd] |
| 36 | 2,254 | script | PlasmaOrb.js (local, dynamic) | C | _loadOrb() from cmdInitPage |
| 37 | 9,351 | fetch | /api/intelligence/cost-summary | D | fetchCommandUpdates sequential (after limit=8 resolves) [3rd] |

**Class key:** A=boot-critical, B=useful immediately, C=deferred (domain/page-specific), D=duplicate, E=unnecessary

---

## 4. V-09B — Forensic Analysis

### 4.1 Primary DCL Bottleneck: contextual-card.js

contextual-card.js (156 lines, /js/components/contextual-card.js) is loaded with `defer`. Per the HTML spec, deferred scripts execute synchronously BEFORE DOMContentLoaded fires, after HTML parsing is complete. Its variable evaluation time (565–1,073ms) is the dominant remaining DCL bottleneck.

The file's IIFE structure:
1. Looks up `#cx-card-zone` and `#cx-top-chrome` elements
2. Returns early with no-op if elements absent
3. Injects CSS, connects a separate WebSocket to `/ws/viz` for contextual card push events
4. Listens for `presentation:inject` messages, renders floating cards

The WebSocket to `/ws/viz` is for a progressive-enhancement overlay system. Delaying its connection by ~DCL time (currently ~1,945ms → projected ~1,263ms after fix) introduces negligible risk — pushed card events arrive from server-side agent actions, well after page load.

**Fix: dynamic injection after DOMContentLoaded** — same pattern as V-08-01 PlasmaOrb.js. Expected DCL: ~1,263ms (current DOM Interactive median).

### 4.2 cost-summary 3× → cachedFetch gap

Three distinct callers fetch `/api/intelligence/cost-summary` at boot:

| Call | Initiator | TTL | Timing |
|------|-----------|-----|--------|
| 1st | `refreshMetrics()` | `cachedFetch(60000)` ✓ | +623ms |
| 2nd | `fetchCommandProgress()` | raw `fetch()` ✗ | +819ms |
| 3rd | `fetchCommandUpdates()` | raw `fetch()` ✗ | +820–9,351ms (after agent-runs?limit=8 resolves) |

Calls 2 and 3 bypass `cachedFetch`. Since call 1 populates the 60s TTL cache, calls 2 and 3 would get the cached response if they used `cachedFetch('/api/intelligence/cost-summary', 60000)`. The 60s TTL matches the data update frequency.

**Fix: replace raw `fetch` with `cachedFetch(60000)` in lines 14,969 and 15,034.**

### 4.3 Remaining Duplicate Groups (unchanged from V-08)

| URL | Count | Source | Status |
|-----|-------|--------|--------|
| /api/emails | 2× | refreshEmailPanel + fetchStripStats cold-boot race | Pre-existing V-07 residual — TTL-deduped after T+60s |
| /api/finance/summary | 2× | refreshFinancePanel + fetchStripStats cold-boot race | Same |
| /api/tasks | 2× | refreshTaskQueuePanel + fetchStripStats cold-boot race | Same |
| /api/intelligence/cost-summary | 3× | refreshMetrics + fetchCommandProgress + fetchCommandUpdates | **V-09-02 target** |

The emails/finance/tasks cold-boot race requires sequencing the strip poll to wait for main poll completion — architectural change, V-10+ candidate.

### 4.4 agent-runs — Three Separate Calls

| Call | Limit | Initiator | Purpose |
|------|-------|-----------|---------|
| limit=6 | 6 | `refreshRecentRuns()` | Recent runs panel (master page cards) |
| limit=8 | 8 | `fetchCommandUpdates()` | Command page table (recent runs table) |
| limit=100 | 100 | `fetchCommandProgress()` | Count successful runs for feature bar |

Three different URL strings — `cachedFetch` cannot dedup across different params. limit=6 and limit=8 write to the SAME element ID (`recentRunsPanel`) and produce conflicting formats (card vs table). The limit=100 fetch is used purely for a feature count — extractable from the limit=8 result in theory, but would require non-trivial refactoring. Deferred to V-10.

### 4.5 refreshCommandPage() at Boot

`refreshCommandPage()` (line 15,089) is called unconditionally at eval time (line 15,095) and on a 30s interval (line 15,096). This fires at boot because the command page IS the default page. Boot calls are justified; however, they produce the cost-summary duplicates (fixed by V-09-02) and agent-runs overlaps (V-10 candidate).

### 4.6 Long Tasks

6–7 long tasks (>50ms) during boot, concentrated in the 229–626ms window. These are from inline JS block evaluation (19,900-line monolith parsing). Individual long tasks: 161ms, 101ms, 79ms, 93ms, 52ms, 64ms, 160ms, 305ms, 165ms, 97ms across runs. Reducing these requires splitting the inline monolith — architectural, V-10 candidate.

### 4.7 /api/ping — Unnecessary Boot Request

Bare `fetch(API_BASE + "/api/ping")` at line 13,932, calls `setConnStatus(r.ok)`. One request, no user-visible urgency, no deduplication. Low value to eliminate (risk of breaking connection status indicator, only 1 request). Retained.

---

## 5. V-09D — Perceived Performance

| Experience | Measured time | Notes |
|-----------|--------------|-------|
| Login usable | ~440ms (FCP=LCP) | Shell renders at first paint |
| Dashboard shell usable | ~943ms (DOM Interactive) | Nav, chat input responsive |
| Overview first content | ~620ms+ | API responses arrive ~550–623ms |
| First data appears | ~620ms | /api/overview/vitals at +550ms |
| Navigation usable | ~943ms | switchPage registered during parse |
| Each domain first-visit | On first nav | Correctly gated by _onFirstDomainVisit |

FCP and LCP coincide at ~416ms — the browser paints the dashboard shell (background, nav chrome) as the first meaningful paint. No blank/skeleton delay before shell. Perceived gap is between shell (~416ms) and data population (~620ms+), which is ~200ms — acceptable.

Main perceived bottleneck after DCL is fixed: the 1,263ms DOM Interactive still has 6 long tasks during parse that block user input briefly. These arise from the inline 1.2MB JS monolith — can only be addressed by splitting (V-10 candidate).

---

## 6. V-09C — Authorised Changes

Two minimum-risk changes authorised by forensic evidence:

**V-09-01 (P0):** contextual-card.js → dynamic post-DCL injection
- Pattern: identical to V-08-01 PlasmaOrb.js fix
- Expected DCL: 1,945ms → ~1,263ms (current DOM Interactive)
- Risk: LOW — WebSocket to /ws/viz connects ~DCL later, card system progressive enhancement

**V-09-02 (P1):** cost-summary 3× → 1× via cachedFetch
- Lines 14,969 and 15,034: replace raw `fetch` with `cachedFetch(60000)`
- Expected requests: 37 → 35 (−2 duplicate cost-summary calls)
- Risk: LOW — pure caching change, same data, same TTL as existing caller

---

## 7. Remaining Bottlenecks

| Bottleneck | Scope | Recommended action |
|-----------|-------|--------------------|
| emails/finance/tasks cold-boot TTL race (2× each) | fetchStripStats timing vs main poll | Sequence strip poll after first main poll — V-10 |
| agent-runs 3 calls (limit=6, 8, 100) | refreshRecentRuns + refreshCommandPage overlap | Consolidate callers / use limit=100 result for all — V-10 |
| DOM Interactive 1,263ms from long parse tasks | 1.2MB inline JS monolith | Split monolith into deferred modules — architectural, V-10 |
| /api/ping unnecessary boot request | Single boot call | Remove — V-10 |
| refreshRoadmapPanel no early-return guard | Fires roadmap API even when element absent | Add element guard — V-10 |

---

*Reconnaissance complete. Implementation (V-09C) proceeds.*
