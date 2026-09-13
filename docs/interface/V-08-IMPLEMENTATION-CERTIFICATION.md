# V-08 IMPLEMENTATION CERTIFICATION
# JAVASCRIPT LOAD-PATH OPTIMISATION

**Date:** 2026-08-31  
**Authority:** APEX Performance — V-08 Authorization  
**Phase:** V-08-01 through V-08-04 — Implementation + Verification  
**Status:** CERTIFIED — All V-08 targets met  
**Baseline:** V-08 reconnaissance 3-run medians (same session, pre-patch)

---

## 1. Files Modified

| File | Change |
|------|--------|
| `public/dashboard.html` | 5 surgical patches — no new files, no backend changes |

Server, routes, CSS, and all API contracts unchanged.

---

## 2. Before / After Baseline (3-run Playwright medians)

| Metric | V-08 Baseline | After | Delta |
|--------|---------------|-------|-------|
| TTFB | 49ms | 46ms | −3ms |
| FCP | 528ms | 440ms | **−88ms (−17%)** |
| DCL | 3,548ms | 1,638ms | **−1,910ms (−54%)** |
| DOM Interactive | ~1,150ms | 1,150ms | unchanged |
| Boot requests (10s window) | 46 | 37 | **−9 (−20%)** |
| Overview tab API calls | 0 | 0 | unchanged |
| Long tasks | — | 6 | — |

**DCL target: <2,000ms — ACHIEVED at 1,638ms.**  
**FCP must not regress from 528ms — ACHIEVED at 440ms (improved).**

---

## 3. V-08-01 — PlasmaOrb.js Dynamic Injection

**Target:** `<script src="/src/components/orb/PlasmaOrb.js">` — synchronous parse-blocking script  
**File:** `public/dashboard.html` line 18,288  

**Finding:** PlasmaOrb.js is 5KB payload but 779–3,108ms GPU/WebGL evaluation (median ~1,850ms across 3 reconnaissance runs). As a synchronous `<script src>`, its evaluation blocked the parser and prevented DCL from firing. `window.APEX_ORB` (created by PlasmaOrb.js) is only used by `setOrbState()`, which already has `if (window.APEX_ORB)` guard. `initOrb()` (inline particle sphere at line 17,749) is independent and does not use PlasmaOrb.js at all.

**Change:** Removed synchronous `<script src>` tag. Added `_loadOrb()` function called from `cmdInitPage` (Command page initializer):

```javascript
function _loadOrb(){
  if(window.APEX_ORB||window._orbScriptLoaded)return;
  window._orbScriptLoaded=true;
  var s=document.createElement('script');
  s.src='/src/components/orb/PlasmaOrb.js';
  document.body.appendChild(s);
}
// Called at end of cmdInitPage()
_loadOrb();
```

Script tag replaced with:
```html
<!-- PlasmaOrb.js loaded dynamically from cmdInitPage — not on critical parse path -->
```

**Verification:** PlasmaOrb.js appears in waterfall at ~1,923ms (after DCL fires), not before. `setOrbState()` guard prevents errors if called before async load completes. DCL: 3,548ms → 1,638ms.

**DCL saved: ~1,850ms (median GPU/WebGL eval time removed from critical path)**

---

## 4. V-08-02 — Remove Boot Domain Calls + Fix V-07-04 Regression

**Target A:** V-07-04 wrong `_onFirstDomainVisit` boot registrations (lines 14,890–14,893)  
**Target B:** Business domain direct boot calls (lines 14,955–14,958)  
**Target C:** Health hook missing `refreshSleepPanel` / `refreshWorkoutGrid`  
**File:** `public/dashboard.html`

### A — V-07-04 Regression Fix

**Finding:** V-07-04 replaced 5 direct boot calls with `_onFirstDomainVisit` registrations. However, `_onFirstDomainVisit` is NOT a deferred registration system — it calls `fn()` immediately if the domain has not been visited (which is always the case at boot). This meant:
1. The 5 API calls (expenses, subscriptions, sleep, workout, birthday) still fired at boot
2. `_domainVisited['finance']`, `['health']`, `['communication']` were marked `true` at boot
3. The health switchPage hook's own `_onFirstDomainVisit('health', ...)` returned early on first navigation — journal/psychology/mood never loaded

**Change:** Removed the 3 wrong registrations. Line 14,890 now reads:

```javascript
// Domain panels load on first navigation via switchPage hooks — no boot calls needed
```

**Boot requests removed: 5** (expenses, subscriptions, sleep, workout, birthday)

### B — Business Domain Boot Calls

**Finding:** `refreshBizCrmPanel()`, `refreshBizProjectsPanel()`, `refreshBizDocumentsPanel()`, `refreshBizProposalsPanel()` were called directly at boot (lines 14,955–14,958), before the user had navigated to the Business domain. `_addInterval` registrations for each function were retained (periodic refresh continues).

**Change:** 4 direct boot calls removed. `_addInterval` registrations unchanged.

**Boot requests removed: 4** (CRM clients, projects, documents, proposals)

### C — Health Hook Repair

**Finding:** With V-07-04 boot calls removed, `refreshSleepPanel()` (→ `sleepBarsPanel`) and `refreshWorkoutGrid()` had no trigger — `fetchHealthSleep()` in `initHealthPage()` covers different UI elements (`hlthStatSleep`, `hlthSleepLast`, chart data). Without any call to `refreshSleepPanel()` / `refreshWorkoutGrid()`, those panels would never populate.

**Change:** Added both functions to the health switchPage hook's `_onFirstDomainVisit` callback:

```javascript
// Before:
if (name==='health') { initHealthPage(); _onFirstDomainVisit('health', function() { refreshJournalPanel(); refreshHabitTracker(); refreshPsychologyPanel(); refreshMoodChart(); }); }

// After:
if (name==='health') { initHealthPage(); _onFirstDomainVisit('health', function() { refreshJournalPanel(); refreshHabitTracker(); refreshPsychologyPanel(); refreshMoodChart(); refreshSleepPanel(); refreshWorkoutGrid(); }); }
```

**Verification:** Health panels now load on first navigation to the Health domain, not at boot.

---

## 5. V-08-03 — Chart.js Deferred Load

**Target:** `<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/...">` — synchronous external CDN script  
**File:** `public/dashboard.html` line 14,546

**Finding:** Chart.js (CDN, ~200KB) was loaded synchronously, blocking HTML parsing. Charts are only used on domain pages navigated to after boot. No chart initialization fires during the Command page boot sequence.

**Change:** Added `defer` attribute:

```html
<script defer src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
```

**Effect:** Chart.js downloads in parallel with HTML parsing and executes after DCL — removed from critical parse path.

---

## 6. V-08-04 — contextual-card.js Deferred Load

**Target:** `<script src="/js/components/contextual-card.js">` — synchronous local script  
**File:** `public/dashboard.html` line 19,801

**Finding:** contextual-card.js was loaded synchronously at the end of the HTML body. As a synchronous script, it still participated in HTML parse blocking. No contextual card initialization is required during boot.

**Change:** Added `defer` attribute:

```html
<script defer src="/js/components/contextual-card.js"></script>
```

---

## 7. Boot Request Waterfall (After)

Confirmed via 3-run Playwright measurement. No domain panel API calls fire at boot:
- `/api/expenses` — deferred to finance first navigation ✅
- `/api/subscriptions` — deferred to finance first navigation ✅
- `/api/health/sleep` (panel) — deferred to health first navigation ✅
- `/api/workouts` — deferred to health first navigation ✅
- `/api/contacts` (birthday) — deferred to communication first navigation ✅
- `/api/operations/clients` — deferred to business first navigation ✅
- `/api/operations/projects` — deferred to business first navigation ✅
- `/api/operations/documents` — deferred to business first navigation ✅
- `/api/operations/proposals` — deferred to business first navigation ✅

Residual duplicates (cold-boot TTL race — pre-existing, addressed by V-07-05 for subsequent cycles):

| URL | Count | Status |
|-----|-------|--------|
| `/api/emails` | 2x | Cold-boot only — TTL-deduped at T+60s+ |
| `/api/finance/summary` | 2x | Cold-boot only — TTL-deduped at T+60s+ |
| `/api/tasks` | 2x | Cold-boot only — TTL-deduped at T+60s+ |
| `/api/intelligence/cost-summary` | 3x | Pre-existing multi-caller — V-08 scope out |

---

## 8. Functional Regression

| Check | Result |
|-------|--------|
| Server syntax (`node --check server.js`) | ✅ Exit 0 |
| Dashboard loads | ✅ |
| 3-run Playwright: consistent 37 requests | ✅ |
| Overview tab: 0 API calls on navigation | ✅ |
| Reality gate (`_domainVisited['reality']` = undefined at boot) | ✅ |
| PlasmaOrb.js: loads after DCL, not blocking | ✅ |
| `setOrbState()`: guarded by `if (window.APEX_ORB)` | ✅ (pre-existing guard) |
| Health panels: deferred to first health navigation | ✅ |
| Finance panels: deferred to first finance navigation | ✅ |
| Business panels: deferred to first business navigation | ✅ |
| Chart.js: loads deferred, not blocking parse | ✅ |
| `_addInterval` registrations: all retained | ✅ |

---

## 9. V-08 Summary — All Sub-Phases

| Fix | Target | Change | DCL Saved | Requests Removed | Status |
|-----|--------|--------|-----------|-----------------|--------|
| V-08-01 | PlasmaOrb.js sync `<script src>` | Dynamic injection from `cmdInitPage` | ~1,850ms | 0 | ✅ PASS |
| V-08-02a | V-07-04 wrong boot registrations (3×) | Removed — domain panels via switchPage hooks | 0 | 5 | ✅ PASS |
| V-08-02b | Business domain boot calls (4×) | Removed — `_addInterval` retained | 0 | 4 | ✅ PASS |
| V-08-02c | Health hook: missing sleep/workout | Added to `_onFirstDomainVisit` callback | 0 | 0 (regression fix) | ✅ PASS |
| V-08-03 | Chart.js sync CDN | `defer` attribute | minor | 0 | ✅ PASS |
| V-08-04 | contextual-card.js sync local | `defer` attribute | minor | 0 | ✅ PASS |

**Total boot requests removed: 9 (46 → 37)**  
**DCL improvement: −1,910ms (−54%), 3,548ms → 1,638ms**  
**FCP improvement: −88ms (−17%), 528ms → 440ms**  
**DCL target (<2,000ms): ACHIEVED**

---

**V-08 CERTIFIED**

*Certification recorded: 2026-08-31*  
*V-07 baseline: production not modified*  
*V-08 changes: `public/dashboard.html` only — 5 surgical patches*  
*Production: UNDEPLOYED*
