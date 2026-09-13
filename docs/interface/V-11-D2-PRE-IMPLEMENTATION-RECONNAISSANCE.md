# V-11-D2 — TODAY DEFAULT + ENTRY-STATE COHERENCE
## Pre-Implementation Reconnaissance

**Date:** 2026-09-01
**Author:** Claude Code (V-11-D2 brief reconnaissance phase)
**Status:** COMPLETE — HARD STOP. Awaiting implementation authorisation.
**Application code changes:** NONE

Documents read for this reconnaissance:
- `V-11-DESIGN-DECISIONS.md`
- `V-11-EXPERIENCE-ARCHITECTURE-SPECIFICATION.md`
- `V-11-B-UNIVERSAL-STATE-ARCHITECTURE-RECONNAISSANCE.md`
- `V-11-C-API-CONTRACT-RECONCILIATION.md`
- `V-11-D-NAVIGATION-RECONNAISSANCE.md`
- `V-11-N-IDENTITY-PROFILE-ARCHITECTURE-RECONCILIATION.md`

Code inspected: `public/dashboard.html` (lines 6405–6420, 10443–10510, 15525–15643, 18215–18220, 20225–20332)

---

## A — Default Entry Behaviour

### Current state

`page-command` has `class="page active"` in the static HTML (line 6412). No boot-time `switchPage` call exists — the active page is purely the HTML static state.

```javascript
// line 10446
var activePage = 'command';

// line 10445
var pages = ['command', 'overview', 'operation', 'system', 'finance', ...];
```

Command is at index 0 in the `pages` array, which also governs swipe-gesture order.

When the page loads, the user sees the Command orb immediately. `initOverviewPage()` is never called on boot — the TODAY panels receive no `setState` call and no API requests fire.

### What D2 must change

Three locations require edits to establish TODAY as the default:

| Location | Current | Target |
|---|---|---|
| Line 6412 HTML `class=` | `page active` on `page-command` | `active` on `page-overview`, removed from `page-command` |
| Line 10446 JS initialiser | `var activePage = 'command'` | `var activePage = 'overview'` |
| Line 10445 `pages` array | `['command', 'overview', ...]` | `['overview', 'command', ...]` |

The `pages` array reorder is required for swipe-gesture coherence: the spec sidebar (§5.2) places TODAY first. With `overview` at index 0, a left-to-right swipe from TODAY has no target (correct); right-to-left from TODAY lands on Command (correct).

### Boot-time data fetch

`initOverviewPage()` is NOT called automatically by the HTML active state — it requires an explicit call. The D1 switchPage wrapper (line 15634–15641) calls it when `switchPage('overview')` is invoked. Therefore D2 must call `switchPage('overview')` at boot (or call `initOverviewPage()` directly), via a DOMContentLoaded listener added after all scripts have registered.

`initOverviewPage()` has a self-guard at line 15533:
```javascript
if (!pageEl || !pageEl.classList.contains('active')) return;
```
This guard passes on boot (after D2's HTML change, `page-overview` is active). The 120s interval timer at line 15642 will also pass this guard while the user remains on TODAY, and will no-op when on any other page.

---

## B — URL / Hash Semantics

### Current state

Zero hash routing exists in the codebase.

- `history.replaceState` appears once (line 10651) — exclusively for `?app_key=` URL cleanup. Not used for navigation.
- `history.pushState` — not called anywhere.
- `location.hash` — not read anywhere.
- No `popstate` listener exists.

Navigation leaves the URL unchanged at `/`. Reload always shows the HTML boot state (currently Command, D2 target: TODAY).

### Target for D2

Add minimal hash routing:

1. **On navigate:** Inside `switchPage`, call `history.replaceState(null, '', '#' + name)` after setting the active page. Use `replaceState` (not `pushState`) — this reflects current location without polluting the browser back-stack. No back-button navigation is introduced.

2. **On boot (DOMContentLoaded):** Read `location.hash.slice(1)`. If it is a valid entry in the `pages` array, call `switchPage(hash_page)`. This is the reload-coherence mechanism.

3. **Fallback chain:**
   - Hash valid → use hash
   - Hash absent/invalid → read `localStorage.getItem('apex_default_page')` (per spec §6.3)
   - localStorage absent/invalid → `switchPage('overview')` (TODAY, canonical default)

Scope note: `replaceState` is placed inside the base `switchPage` definition (line 10470). The D1 wrapper calls `_orig(name)` first, so the URL update fires on every navigation including the boot-time call.

---

## C — Reload Coherence

### Current state

Reload always lands on Command. The URL is `/` with no hash. No session-state is preserved across reload.

### Target for D2

Hash routing (section B) provides reload coherence automatically:

| Scenario | Result |
|---|---|
| First open after D2 deploy (no hash, no localStorage) | Lands on TODAY |
| Reload while on TODAY | `#overview` in URL → lands on TODAY |
| Reload while on Command | `#command` in URL → lands on Command |
| Reload while on Intelligence | `#intelligence` in URL → lands on Intelligence |
| Session expired during any page | Re-login redirects to `/` (no hash) → TODAY |

No additional persistence mechanism is required beyond `history.replaceState` in `switchPage`.

The `apex_last_session_ts` localStorage write (spec §4.7, SD-2) is a separate, future concern — not in D2 scope.

---

## D — Authentication

### Current `_bootIdentity()` flow (lines 20267–20332)

```
DOMContentLoaded →
  _bootIdentity() →
    GET /api/me
      401 → window.location = '/login'
      429 / 5xx → applyRoleProfile('user')  [degraded, no redirect]
      200 → applyRoleProfile(data.role)
```

`applyRoleProfile()` updates UI visibility (nav buttons, page content, role badges). It does **not** call `switchPage`. The landing page after `applyRoleProfile()` is whatever is already active.

### Impact on D2

No auth flow code changes are required for D2.

After D2's HTML change, the HTML boot state is `page-overview`. The DOMContentLoaded handler calls `switchPage('overview')` (boot-time hash reader falls through to default). `_bootIdentity()` runs concurrently and calls `applyRoleProfile()` once `/api/me` resolves — this adjusts the role-specific UI without changing the active page.

**Auth redirect to TODAY is a natural consequence** of making TODAY the HTML boot default, not a separate mechanism.

Edge case — session expiry: If the user's session expires while on `#intelligence`, the 401 redirects to `/login`. After re-login, the browser navigates to `/` with no hash (login page does not preserve the originating hash). The user lands on TODAY. This is correct per Decision 3.

---

## E — Navigation State

### Current state

`activePage` is a closure-scoped variable in the IIFE at line 10443. It tracks the current page string.

`window.switchPage` is a layered wrapper chain. The base (line 10470) sets `.active` class and updates `activePage` and the topbar text. The D1 wrapper (line 15635) is one layer. The final wrapper (line 18217) adds cmd-specific init/pause:

```javascript
window.switchPage = function(name) {
    if (typeof _sp === 'function') _sp(name);
    if (name === 'command') { setTimeout(window.cmdInitPage, 60); }
    else { window.cmdPausePage(); }
};
```

No history state is stored. No back-button navigation exists.

### D2 additions

- `history.replaceState` added inside base `switchPage` (before wrappers run). Every wrapper layer calls `_orig(name)` which propagates to the base, so `replaceState` fires on all navigations.
- `activePage` starts as `'overview'` (line 10446 change). No other changes to navigation state management.

The `pages` array reorder (section A) affects swipe gesture targets only. The swipe handler (lines 10499–10507) indexes into `pages` to find the adjacent page. After reorder, swipe left on TODAY goes to Command; swipe right on Command goes to TODAY. This matches the spec navigation order.

---

## F — Role Behaviour

### Current state

Default role before auth resolves: `window._apexUser = { role: 'master', ... }` (line 20225). After `_bootIdentity()` resolves, `applyRoleProfile(role)` applies the authorised role.

Two roles: `master` (all capabilities) and `user` (restricted set). Role differences currently affect: which nav buttons are visible, which page sections are rendered, and which API endpoints are accessible.

### TODAY surface and roles (from D1 certification)

The TODAY surface (V-11-D1) has no role-gated panels. All three panels — Needs You, Noticed, and Schedule — render for both roles. Panel content differs only by what the API returns for the authenticated user.

D1 test suite section K (6 tests) and L (3 tests) confirmed correct role behaviour.

### Impact on D2

No role-specific changes are needed for D2. Both `master` and `user` land on TODAY on boot. `applyRoleProfile()` runs after `_bootIdentity()` resolves and continues to adjust UI correctly regardless of which page is active.

The `user` role restriction (if any) on `switchPage` to governance/master-only pages is unaffected — those restrictions are enforced in `applyRoleProfile()` and CSS, not in `switchPage` itself.

---

## G — Boot / Performance

### Current boot sequence (pre-D2)

```
HTML parses →
  page-command active (static HTML)
  APEX MIND <script> executes (line ~8473) → destroys pre-script page-overview children
  pages/switchPage IIFE executes (line 10443) → switchPage defined, nav event listeners attached
  D1 IIFE executes (line 15634) → switchPage wrapped for initOverviewPage
  setInterval(initOverviewPage, 120000) registered (line 15642)
  Final switchPage wrapper executes (line 18217)

DOMContentLoaded fires →
  _bootIdentity() → GET /api/me
  applyRoleProfile() → role UI applied

User sees: Command orb (static, no data loaded for TODAY)
```

### D2 boot sequence

```
HTML parses →
  page-overview active (static HTML — D2 change)
  APEX MIND <script> executes — destroys pre-APEX-MIND children of page-overview
    (but #today-surface is AFTER </script>, so it survives — D1 fix preserved)
  pages IIFE executes (line 10443) →
    pages = ['overview', 'command', ...] (D2 reorder)
    activePage = 'overview' (D2 change)
    switchPage defined, nav event listeners attached
  D1 IIFE executes → switchPage wrapped for initOverviewPage
  setInterval(initOverviewPage, 120000) registered
  Final switchPage wrapper executes

DOMContentLoaded fires →
  [BOOT HANDLER] read location.hash →
    if valid page → switchPage(hash)  [covers reload coherence]
    else if apex_default_page localStorage → switchPage(localStorage value)
    else → switchPage('overview')  [canonical default]
  switchPage('overview') →
    base: removes .active from all pages, adds .active to page-overview, activePage='overview'
          history.replaceState(null, '', '#overview')  [D2 addition]
    D1 wrapper: initOverviewPage() →
      guard: page-overview.classList.contains('active') → passes
      setState(needsEl, 'loading'), setState(noticedEl, 'loading'), setState(activeEl, 'loading')
      Promise.allSettled([fetch('/api/briefing/priority-inbox'), fetch('/api/briefing/today')])
  _bootIdentity() runs concurrently → GET /api/me → applyRoleProfile()

User sees: TODAY surface with loading skeletons immediately, then populated data
```

### Performance characteristics

- Shell and topbar: render immediately from static HTML (<10ms)
- TODAY HTML skeleton: visible from first HTML paint (no JS required for structure)
- `initOverviewPage()` fires at DOMContentLoaded: 2 parallel fetches
- `_bootIdentity()` fires concurrently: does not block TODAY render
- 120s auto-refresh: fires `initOverviewPage()` while overview is active; no-op on other pages (guard)
- No duplicate init: boot calls `switchPage('overview')` once. D1 wrapper fires `initOverviewPage()` once. The `setInterval` does not overlap — it starts after DOMContentLoaded and has a 120s minimum before first fire.

### Risk: boot-time switchPage call timing

The boot-time `switchPage('overview')` must fire AFTER the D1 wrapper (line 15634) has wrapped `window.switchPage`. The D1 wrapper runs synchronously during HTML parsing (it's not in a DOMContentLoaded handler). DOMContentLoaded fires after all synchronous scripts complete. Therefore, placing the boot-time handler in a DOMContentLoaded listener guarantees the D1 wrapper is in place. No timing risk.

---

## Implementation Footprint Summary

| Change | Location | Type |
|---|---|---|
| Remove `active` from `page-command` in HTML | Line 6412 | HTML attribute |
| Add `active` to `page-overview` in HTML | `page-overview` opening div | HTML attribute |
| `var activePage = 'overview'` | Line 10446 | JS one-liner |
| Reorder `pages` array (overview first) | Line 10445 | JS one-liner |
| `history.replaceState(null, '', '#' + name)` in base `switchPage` | Line 10470–10483 | JS 1 line inside function |
| Boot-time DOMContentLoaded handler (hash reader + fallback) | After line 10483 or in a DOMContentLoaded listener | JS ~8 lines |

Total application code change: ~12 lines. No new functions. No new backend routes. No new files.

---

## Preserved Invariants

- ✓ `page-overview` ID — unchanged
- ✓ `switchPage` architecture — additive only (replaceState inside base, boot handler outside)
- ✓ V-11-B setState system — untouched
- ✓ V-11-C API contracts — no backend changes
- ✓ V-11-D1 TODAY surface — all D1 HTML, CSS, JS, D1 wrapper preserved intact
- ✓ Master/User authority model — `applyRoleProfile()` unmodified
- ✓ Authentication — `_bootIdentity()` unmodified
- ✓ Performance — no additional API calls; boot fetches replace zero-fetch-on-boot
- ✓ APEX MIND governance — hidden, not deleted (D1 invariant maintained)
- ✓ Default boot page now changes — this IS D2 scope (previously Command, now Today)

---

## Decision 3 Compliance Check

V-11-DESIGN-DECISIONS.md Decision 3 (LOCKED):
> "TODAY is the canonical APEX entry state. It is the default boot landing and the authoritative 'now' surface."
> "User preference override: `apex_default_page` localStorage key."

D2 as specified above:
- ✓ TODAY is HTML boot default after D2
- ✓ `apex_default_page` localStorage is read in the fallback chain
- ✓ Hash routing preserves user's last-visited page on reload

---

**HARD STOP.**
Do not modify application code until implementation is explicitly authorised.
