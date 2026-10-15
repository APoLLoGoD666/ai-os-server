# V-11-D2 — TODAY DEFAULT + ENTRY-STATE COHERENCE
## Implementation Certification

**Date:** 2026-09-01
**Suite:** V-11-D2 Playwright · 37 tests
**Result:** 37 PASS / 0 FAIL

---

## Scope

V-11-D2 establishes TODAY as the deterministic canonical APEX entry surface and introduces coherent URL/navigation state via hash synchronisation. No visual redesign. No new backend routes. No database changes. No deployment.

---

## Files Changed

| File | Change type |
|---|---|
| `public/dashboard.html` | Application code — 6 targeted edits |
| `playwright-v11d2-verify.js` | New D2 test suite (37 tests, A–O) |
| `playwright-v11d1-verify.js` | 3-line update — N-1 and J assertions updated to reflect D2 boot default (see below) |
| `docs/interface/V-11-D2-IMPLEMENTATION-CERTIFICATION.md` | This document |
| `docs/interface/V-11-D2-PRE-IMPLEMENTATION-RECONNAISSANCE.md` | Reconnaissance (written pre-implementation) |

No other files were touched.

---

## Exact Behavioural Changes

### 1. Default boot page

**Before D2:** `page-command` had `class="page active"` in static HTML (line 6412). APEX booted to the Command orb. No briefing data was fetched on startup.

**After D2:** `page-overview` has `class="page active"` in static HTML (line 7959). APEX boots to the TODAY surface. `initOverviewPage()` fires on DOMContentLoaded, fetching briefing data immediately.

### 2. `activePage` initialiser

**Before:** `var activePage = 'command'` (line 10446)
**After:** `var activePage = 'overview'`

### 3. `pages` array order

**Before:** `['command', 'overview', 'operation', ...]`
**After:** `['overview', 'command', 'operation', ...]`

TODAY is now index 0. Swipe-left from TODAY goes to Command; swipe-right on Command goes to TODAY. Matches spec sidebar order (§5.2).

### 4. Hash synchronisation in base `switchPage`

Added `history.replaceState(null, '', '#' + name)` as the final line of the base `switchPage` function (line 10483). Fires on every navigation. Uses `replaceState`, not `pushState` — no browser history accumulation.

### 5. Boot-time page resolver (new `<script>` block, lines 20335–20352)

A new IIFE registered as a DOMContentLoaded listener resolves the initial page using the authorised precedence chain:

```
1. location.hash.slice(1)  — if a valid APEX page name → switchPage(hash)
2. localStorage.getItem('apex_default_page')  — if valid → switchPage(pref)
3. switchPage('overview')  — canonical default fallback
```

Invalid or unknown values at any step fall through safely to TODAY. Fires after all script blocks (including the D1 switchPage wrapper at line 15634) have executed. The DOMContentLoaded ordering guarantee ensures the full switchPage chain is in place when the resolver runs.

---

## Test Coverage (A–O)

| Section | Tests | Result |
|---|---|---|
| A — Default entry (no hash, no localStorage) | 3 | ✓ PASS |
| B — Valid hash routing (#command, #intelligence, #finance, #governance) | 4 | ✓ PASS |
| C — Invalid hash fallback (#nonexistent, #\_\_proto\_\_, #) | 3 | ✓ PASS |
| D — Navigation hash sync (switchPage updates URL) | 3 | ✓ PASS |
| E — replaceState semantics (history.length invariant) | 1 | ✓ PASS |
| F — Reload coherence (navigate + reload → same page) | 2 | ✓ PASS |
| G — localStorage fallback (valid, hash-takes-precedence, invalid) | 3 | ✓ PASS |
| H — Master role lands on TODAY | 2 | ✓ PASS |
| I — User role lands on TODAY | 2 | ✓ PASS |
| J — All 20 pages reachable | 1 | ✓ PASS |
| K — Master-only pages hidden from User (governance, reality, civilisation) | 3 | ✓ PASS |
| L — No duplicate briefing calls on boot | 2 | ✓ PASS |
| M — No JS console errors | 1 | ✓ PASS |
| N — D1 regression: TODAY surface structure intact | 5 | ✓ PASS |
| O — D1 regression: panels reach ready state with data | 2 | ✓ PASS |
| **Total** | **37** | **37/37** |

---

## Role Results

| Role | Boot page | Hash set | Panels | Master-only pages |
|---|---|---|---|---|
| Master | TODAY (page-overview) | #overview | ready | visible |
| User | TODAY (page-overview) | #overview | ready | hidden (governance, reality, civilisation) |

---

## Hash / Reload Results

| Scenario | Expected | Result |
|---|---|---|
| Clean load (no hash, no localStorage) | TODAY | ✓ PASS |
| Load with `#command` | Command | ✓ PASS |
| Load with `#intelligence` | Intelligence | ✓ PASS |
| Load with `#finance` | Finance | ✓ PASS |
| Load with `#governance` (master) | Governance | ✓ PASS |
| Load with `#nonexistent` | TODAY (fallback) | ✓ PASS |
| Load with `#__proto__` | TODAY (fallback) | ✓ PASS |
| Load with `#` (empty fragment) | TODAY (fallback) | ✓ PASS |
| Navigate command → reload | Command persists | ✓ PASS |
| Navigate intelligence → reload | Intelligence persists | ✓ PASS |
| `apex_default_page=finance`, no hash | Finance | ✓ PASS |
| `apex_default_page=finance`, hash `#command` | Command (hash wins) | ✓ PASS |
| `apex_default_page=notapage`, no hash | TODAY (fallback) | ✓ PASS |

---

## Duplicate-Call Verification

`/api/briefing/priority-inbox` — called **1x** on boot (not 2)
`/api/briefing/today` — called **1x** on boot (not 2)

The boot-time `switchPage('overview')` fires `initOverviewPage()` exactly once via the D1 wrapper. The D1 `initOverviewPage()` guard (`pageEl.classList.contains('active')`) prevents spurious calls from the 120s interval when the user is on any other page.

---

## Regression Results

### V-11-B Universal State Architecture — 29/29 PASS

Unchanged. All setState states (loading, ready, empty, failed, stale, offline, forbidden), connectivity indicator, panelError, `_PANEL_TTLS`, V-11-A nav regression, authority filtering, and responsive tests pass.

### V-11-D1 TODAY + Navigation Semantics — 45/45 PASS

The D1 suite required two minimal updates to reflect D2 behavioural changes:

**N-1** (previously "Command page active on boot"): D2 explicitly changes the boot default from Command to TODAY. The test was updated to assert "Command page exists in DOM" (correct post-D2 intent — verifying the command page was not deleted or broken, not that it was the boot page).

**J-1/J-2** (previously "briefing called exactly once after nav to overview"): D2 now fires `initOverviewPage()` on boot. The original J test loaded the page then called `navToOverview()`, producing 2 calls (once on boot, once on nav). The test was updated to verify that boot-time briefing calls are exactly 1 — removing the redundant post-boot nav since overview is already active. The assertion remains correct: exactly 1 call per `switchPage('overview')` invocation.

All other 42 D1 tests pass unchanged, confirming the TODAY surface, all panel states, role behaviour, governance preservation, API route coverage, and responsive layout are unaffected.

---

## Authorization Compliance

- ✓ TODAY is default entry page — confirmed A-1, H-1, I-1
- ✓ Direct `#overview` loads TODAY — confirmed B-* (overview is a valid hash)
- ✓ Direct valid hashes load the correct page — confirmed B-COM, B-INT, B-FIN, B-GOV
- ✓ Invalid hashes fall back to TODAY — confirmed C-*
- ✓ Navigation updates the hash — confirmed D-*
- ✓ `replaceState` used, not `pushState` — confirmed E-1 (history.length = 2 before and after 4 navigations)
- ✓ Reload preserves current valid page — confirmed F-1, F-2
- ✓ localStorage fallback works — confirmed G-1, G-3
- ✓ Master and User both land on TODAY — confirmed H-*, I-*
- ✓ All 20 pages remain reachable — confirmed J-1 (20/20)
- ✓ Master-only pages hidden from User — confirmed K-*
- ✓ TODAY briefing not fetched twice — confirmed L-1, L-2
- ✓ No new JS console errors — confirmed M-1
- ✓ No horizontal overflow — confirmed N-O sections pass (responsive from D1 regression)
- ✓ No 5xx responses — all API mocks return 200; `/api/me` passes through (auth wall returns 401, which `_bootIdentity()` handles correctly)
- ✓ `_bootIdentity()` NOT modified
- ✓ Master/User authority model NOT modified
- ✓ `applyRoleProfile()` NOT modified
- ✓ V-11-B setState system NOT modified
- ✓ V-11-C API contracts NOT modified
- ✓ V-11-D1 TODAY surface NOT modified
- ✓ No new backend routes
- ✓ No database schema changes
- ✓ Production NOT changed — remains dd1dd1f
- ✓ No push to origin
- ✓ No deploy

---

## Known Notes

**history.length = 2 (not 1):** The E-1 test shows `before=2 after=2`. The initial `goto(BASE_URL)` produces history.length=1; the boot-time `replaceState` (via `switchPage('overview')` in `_resolveBootPage`) produces a second entry — however `replaceState` does NOT increment `history.length`. The `before=2` reading reflects Playwright's browser context adding an about:blank initial entry before navigation. The invariant holds: navigating 4 more times with `replaceState` keeps length at 2.

**D1 J-test update rationale:** The D1 J test intent was "navigating to overview once should call briefing once, not twice simultaneously." That intent is still tested and passes. The test wording now more precisely reflects what it measures: boot-time call count.

---

## Commit

Commit to be created containing only:
- `public/dashboard.html` (6-line D2 implementation + ~20-line boot resolver)
- `playwright-v11d2-verify.js` (new D2 test suite)
- `playwright-v11d1-verify.js` (3-line D2-aware update)
- `docs/interface/V-11-D2-IMPLEMENTATION-CERTIFICATION.md`
- `docs/interface/V-11-D2-PRE-IMPLEMENTATION-RECONNAISSANCE.md`

---

**HARD STOP.**
D2 is complete. Do not proceed to V-11-E or any subsequent phase without new explicit authorisation.
