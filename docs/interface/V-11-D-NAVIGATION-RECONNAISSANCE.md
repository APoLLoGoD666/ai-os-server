# V-11-D Navigation Reconnaissance

**Phase:** V-11-D0 (Reconnaissance Only)  
**Date:** 2026-09-01  
**Status:** COMPLETE — no application code modified  
**Next:** D1 implementation pending explicit authorization

---

## 1. All Existing Navigable Pages

20 pages exist as `#page-{id}` divs. All have a corresponding `#nav-{id}` button in `#apexSideNav`.

| # | Page ID | Nav Label | Page Title (pageMeta) | Page Subtitle | DOM Line |
|---|---------|-----------|----------------------|---------------|----------|
| 1 | `command` | Command | Command | AI · Interface · Control | 6412 |
| 2 | `overview` | Overview | Overview | Governance · Pipeline · Status | 7959 |
| 3 | `operation` | Operation | Operation | Tasks · Agents · Schedules | 7510 |
| 4 | `system` | System | System / PROFILE | Agents · Processes · Health | 6563 |
| 5 | `finance` | Finance | Finance | Budgets · Investing · Planning | 7275 |
| 6 | `communication` | Network | Network | Comms · Messages · Contacts | 6891 |
| 7 | `business` | Business | Business | Ideas · Shopify · Projects | 9040 |
| 8 | `health` | Health | Health | Health · Habits · Wellbeing | 7742 |
| 9 | `university` | University | University | Coursework · Revision · Notes | 9204 |
| 10 | `occult` | Occult *(M)* | Occult | Research · Esoteric · Archive | 9365 |
| 11 | `research` | Research | Research | Intelligence · Sources · Data | 9499 |
| 12 | `civilisation` | Civilisation *(M)* | Civilisation | Genome · Consensus · Clock · Domains | 9575 |
| 13 | `reality` | Reality *(M)* | Reality | Fabric · Claims · Health · Epistemic | 9667 |
| 14 | `activity` | Activity *(M)* | Activity | Events · Observability · Live Feed | 9850 |
| 15 | `agents` | Agents *(M)* | Agents | Status · Tasks · Authority · Runs | 9919 |
| 16 | `approvals` | Approvals *(M)* | Approvals | Pending · Actions · Governance | 9987 |
| 17 | `knowledge` | Knowledge | Knowledge | Facts · Evidence · Gaps · Coverage | 10041 |
| 18 | `intelligence` | Intel | Intelligence | Briefing · Opportunities · Health | 10101 |
| 19 | `memory` | Memory | Memory | Episodic · Semantic · Health | 10160 |
| 20 | `governance` | Govern *(M)* | Governance | Constitutional · Authority · Records | 10219 |

*(M) = master-only nav button*

---

## 2. Page IDs

All follow the pattern `id="page-{name}"`. The `pages` array at line 10387 defines their navigation order:

```javascript
var pages = [
  'command', 'overview', 'operation', 'system', 'finance', 'communication',
  'business', 'health', 'university', 'occult', 'research', 'civilisation',
  'reality', 'activity', 'agents', 'approvals', 'knowledge', 'intelligence',
  'memory', 'governance'
];
```

This array drives the swipe gesture navigation (left/right traversal). Initial `activePage = 'command'` at line 10388. The initial `switchPage('command')` occurs at line 14065 via `invokeAgentFromDash` or implicitly via page load — command page has `.active` in HTML.

---

## 3. Canonical Destination Mapping

**Current nav grouping already uses the 6 V-11 destination labels.** This is a V-11-A implementation.

| Canonical Destination | Current Pages Grouped Here | Notes |
|----------------------|---------------------------|-------|
| **TODAY** | `overview` | `overview` currently contains "Governance Map" + pipeline status — NOT a "what matters now" surface. Needs content redesign, not just nav relabeling. |
| **COMMAND** | `command` | Correct. PlasmaOrb + chat. Master gets agent panel. |
| **LIFE & WORK** | `finance`, `communication`, `business`, `health`, `university`, `research`, `occult`*(M)*, `civilisation`*(M)*, `reality`*(M)* | Nav label for communication button says "Network" not "Communication". `occult`/`civilisation`/`reality` are master-only. |
| **INTELLIGENCE** | `intelligence`, `memory`, `knowledge` | Intelligence nav button label says "Intel" (truncated). These are the 3 analytical pages. |
| **ACTIONS** | `operation`, `agents`*(M)*, `approvals`*(M)* | `operation` is the only user-visible page here. |
| **SYSTEM** | `system`, `activity`*(M)*, `governance`*(M)* | `system` shows PROFILE for users (V-11-A). |

**Verdict:** The 6 destination groupings are already structurally correct per V-11-A. The critical D1 work is:
1. `overview` page content needs to become a genuine TODAY surface (see section 4 below)
2. `overview` is not the default landing page — `command` is. TODAY should be default.
3. Mobile navigation is fragmented across 3 competing systems.
4. Secondary pages within destinations lack progressive hierarchy.

---

## 4. Ambiguities and Gaps

### 4.1 TODAY page content gap

`page-overview` currently renders a **Governance Pipeline map** (line 7959) — a master system telemetry view, not a "what matters now" human-readable surface.

V-11-D requires TODAY to answer: "What matters now?" with at most 3 items in "Needs You" and human-readable first layer.

The backend `/api/briefing/today` and `/api/briefing/priority-inbox` routes (V-11-C) already exist and provide the canonical data source for TODAY. The overview page currently calls `initOverviewPage()` which refreshes governance/pipeline panels — these are SYSTEM-tier concerns.

**Impact:** TODAY page needs new content sections (briefing, priority inbox, state-aware panels) using V-11-B `setState`. The existing governance panels stay but become secondary. This is the largest content change in V-11-D.

### 4.2 Default boot page

Current: `activePage = 'command'` (line 10388) and the `command` div has `.active` in HTML. The app boots on COMMAND.

V-11-D requirement: TODAY must be the default landing destination.

**Fix:** Change HTML to `<div id="page-overview" class="page active">` and update `activePage = 'overview'` in JS. This is a 2-line change but requires care — the `pages` array, `cmdPausePage()`, and the initial refresh calls at lines 14092–14101 all trigger on boot. TODAY/overview's init must be added to the boot refresh sequence.

### 4.3 Mobile navigation is fragmented

Three separate mobile nav systems:

| System | Pages covered | Role-gating |
|--------|--------------|-------------|
| `#apexSideNav` CSS tab bar (≤899px) | command + `nav-more` visible | command always visible; others hidden |
| `#mobileNavDropdown` grid | 18 pages (all including master-only) | NO role-gating on the dropdown buttons |
| `#moreSheet` bottom sheet | 16 pages (excludes command, agents, approvals, activity) | NO role-gating on sheet buttons |

**Critical issue:** The mobile dropdown (`#mobileNavDropdown`) exposes all 18 pages including master-only ones (`occult`, `civilisation`, `reality`, `agents`, `approvals`, `activity`, `governance`) WITHOUT role filtering. A user role can navigate there from the hamburger menu. The `page-*` divs themselves are unprotected — content is visible if user types the page ID.

**D1-D3 must fix:** The More sheet and dropdown must apply `apex-master-only` filtering consistent with the sidebar.

### 4.4 No URL routing / no deep links

No `history.pushState`, no hash routing. Page state is lost on browser refresh — user always returns to `command` (or the default boot page). Deep links to specific pages are impossible.

**Assessment:** V-11-D should add hash-based routing:
- `switchPage` writes `#page-name` to URL hash
- On load, read hash to restore page
- `popstate` event handles back/forward

This is a safe, self-contained change that does not break any existing behavior.

### 4.5 "overview" as the TODAY nav label

The nav button currently says "Overview" but V-11-D requires the destination to be called "TODAY". The page stays `page-overview` (ID unchanged), but the nav label, pageMeta title, and group header change.

Options:
- A. Change nav button label to "TODAY" + update pageMeta
- B. Create a new `page-today` + nav button (more invasive, breaks swipe array, breaks all switchPage('overview') calls)

**Recommendation:** Option A. Keep `page-overview` ID, rename only the display label. Update `pageMeta.overview = { title: 'Today', sub: 'What matters now' }`.

### 4.6 `page-overview` has no `ds-page-title` element

Unlike all other pages, `page-overview` does not have a `<div class="ds-page-title">` header block. The title only appears in the topbar via `pageMeta`. This is fine for D1 since TODAY's page header should be redesigned anyway.

### 4.7 `operation` page label vs. ACTIONS destination

`page-operation` nav label is "Operation". The V-11 destination is "ACTIONS". The nav button sits inside the ACTIONS group, which is correct. But the page title says "OPERATIONS" and the sub says "Tasks · Agents · Schedules".

V-11-D should assess whether to rename `operation` → `actions` or keep the existing label. Renaming would require changing the `pages` array, the `data-args='["operation"]'` on line 6697 (system page button), and the 6 `data-fn="switchPage" data-args='["operation"]'` occurrences. **Risk: medium.** Recommendation: keep `operation` ID, change display label if desired.

### 4.8 Intelligence sub-pages vs. INTELLIGENCE destination

`page-intelligence` (the page) sits inside the INTELLIGENCE nav group alongside `memory` and `knowledge`. The page title is "Intelligence". The nav button says "Intel" (truncated for space). V-11-D should expand the label to "Briefing" or "Intelligence" and add the destination-level label clarity.

---

## 5. Master-Only vs. User-Visible

### 5.1 Master-Only (7 pages)

Role-gating is CSS-only via `body.apex-role-user .apex-master-only { display: none !important }` applied to nav buttons:

| Page | Nav button class | In mobile dropdown | In More sheet |
|------|-----------------|-------------------|---------------|
| `occult` | `.apex-master-only` | Yes (ungated) | Yes (ungated) |
| `civilisation` | `.apex-master-only` | Yes (ungated) | Yes (ungated) |
| `reality` | `.apex-master-only` | Yes (ungated) | Yes (ungated) |
| `agents` | `.apex-master-only` | Yes (ungated) | No |
| `approvals` | `.apex-master-only` | Yes (ungated) | No |
| `activity` | `.apex-master-only` | Yes (ungated) | No |
| `governance` | `.apex-master-only` | Yes (ungated) | Yes (ungated) |

**Security note:** The `page-*` content divs themselves carry no role class. A user who discovers `switchPage('agents')` via browser console sees the agents page content. This is a frontend-only gate (backend routes remain protected). Acknowledged as a V-11-N Phase B item.

### 5.2 User-Visible (13 pages)

`command`, `overview`, `finance`, `communication`, `business`, `health`, `university`, `research`, `intelligence`, `memory`, `knowledge`, `operation`, `system`

For `system`: user sees `#v11-user-profile` (PROFILE view) via `applyRoleProfile()`. Master sees `#v11-system-header` + `#v11-system-main`.

---

## 6. Secondary Pages

No separate secondary `page-*` divs. All 20 are primary navigable pages. Secondary content is embedded as panels, tabs, or modals within primary pages:

| Element | Parent page | Description |
|---------|-------------|-------------|
| `#agentDrawer` | `page-agents` area | Slide-in detail panel |
| `#cmdPalette` | global overlay | Command palette |
| `#helpOverlay` | global overlay | Keyboard shortcuts |
| `#emailDraftModal` | DOM-global | Email draft modal |
| `#moreSheet` | mobile nav | Secondary destination picker |
| `#v11-user-profile` | `page-system` | User's PROFILE view |
| `#apexApprModal` | `page-approvals` | Approval confirmation modal |

---

## 7. `switchPage()` Implementation

### Base function (lines 10412–10425):
```javascript
window.switchPage = function(name) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    var page = document.getElementById('page-' + name);
    var btn  = document.getElementById('nav-' + name);
    if (page) page.classList.add('active');
    if (btn)  btn.classList.add('active');
    activePage = name;
    var meta = pageMeta[name] || { title: name.toUpperCase(), sub: '' };
    document.getElementById('topbar-pg-title')?.textContent = meta.title;
    document.getElementById('topbar-pg-sub')?.textContent   = meta.sub;
};
```

### Wrapper chain (14+ layers, file order):

| Lines | Trigger | Action |
|-------|---------|--------|
| 15403–15407 | `overview` | `initOverviewPage()` + 120s refresh interval |
| 16470–16479 | `system` | `initSystemPage()` |
| 16634–16637 | `communication` | `initCommunicationPage()` |
| 16732–16735 | `finance` | `initFinancePage()` |
| 16881–16882 | `business` | CRM/project/doc/proposal refresh |
| 16889–16893 | `operation` | CRM/task/timeline/roadmap refresh |
| 17066–17069 | `university` | `initUniversityPage()` |
| 17210–17213 | `health` | `initHealthPage()` |
| 17394–17397 | `occult` | `initOccultPage()` |
| 17982–17984 | `command` | `cmdInitPage()` (60ms delay) |
| 18552–18567 | always | `_updateMoreState`, mobile page name, scroll, PTT |
| 18571–18580 | always | ARIA `aria-selected` sync on nav buttons |
| 18796–18797 | `civilisation` | `civRefresh()` + `expLoad()` |

**Adding new page hooks:** Follow the established wrapper pattern. Call `_prev(name)` first. Conditionally add page-specific logic. Safe to add new wrappers at any point after the initial definition.

### Swipe gesture:
Lines 10434–10450. On `#pageWrap`, `touchend`: if `dx > 55px` and `dx > 1.5 × dy`, calls `switchPage(pages[idx ± 1])` from the ordered `pages` array. Swipe order follows `pages` array sequence.

---

## 8. Mobile Navigation

### Current mechanism (3 competing systems):

**System 1 — `#apexSideNav` CSS transform (lines 6135–6208)**
At `max-width: 899px`: sidebar becomes fixed bottom tab bar (49px height).
- Visible: `nav-command` + `nav-more` for users; `nav-command` + `nav-more` for master (master-only buttons visible but hidden by `apex-master-only` CSS)
- 16 other nav buttons: `display:none !important` via media query
- Swipe still works (same `#pageWrap` touch handlers)
- Landscape compact: bar shrinks to 40px, labels hidden (`font-size:0`)

**System 2 — `#mobileNavDropdown` (lines 6348–6370)**
18-button grid, fixed overlay below topbar. Triggered by `#mobileNavToggle`. No role-gating. **Contains master-only pages for all users.**

**System 3 — `#moreSheet` (lines 18477–18500)**
16-button bottom sheet. Triggered by `#nav-more` click. No role-gating. Includes all master-only pages for users.

### D3 requirement:
Consolidate to a single mobile nav mechanism. The 6 destination groups map cleanly to the bottom tab bar (6 items = canonical destinations). Secondary pages within each destination move to contextual expansion within the destination.

---

## 9. Deep Link Handling

**Current: none.**

- No `hashchange` listener
- No `popstate` listener  
- No `history.pushState` calls
- URL is cosmetically cleaned after reading `?app_key=` at line 10593
- App always opens on `command` page (or boot-default page)
- Browser back/forward: navigates to previous URL (same page since URL never changes), does not navigate between pages

**D4 requirement:** Add hash-based routing. Safe implementation:

```javascript
// In switchPage wrapper:
history.replaceState(null, '', '#' + name);

// On load:
var hash = location.hash.replace('#', '');
if (pages.indexOf(hash) >= 0) switchPage(hash);
```

This does not conflict with `?app_key=` handling (different query vs. hash mechanisms).

---

## 10. Routing Conflicts

| Type | Finding |
|------|---------|
| Duplicate page IDs | None |
| Duplicate nav IDs | None |
| Nav items → same page | None |
| `pages` array duplicates | None |
| `pageMeta` missing entries | None — all 20 pages have entries |
| Dead CSS `data-page` attributes | Lines 5549–5553 reference `[data-page]` attribute that does not exist on any element. Dead CSS, no impact. |
| switchPage chain gaps | `knowledge`, `intelligence`, `memory`, `governance`, `agents`, `approvals`, `activity`, `reality` have NO wrapper hooks — they load DOM-on-demand with no auto-refresh trigger. See section 15. |

---

## 11. Pages Reachable Only via Secondary Mechanisms

| Page | Primary nav | Mobile tab | More sheet | Mobile dropdown | Other |
|------|------------|------------|-----------|----------------|-------|
| `overview` | ✓ sidebar | ✗ | ✓ | ✓ | — |
| `operation` | ✓ sidebar | ✗ | ✓ | ✓ | Line 6697: `data-fn="switchPage"` from system page |
| `finance` | ✓ sidebar | ✗ | ✓ | ✓ | — |
| `communication` | ✓ sidebar | ✗ | ✓ | ✓ | — |
| `business` | ✓ sidebar | ✗ | ✓ | ✓ | — |
| `health` | ✓ sidebar | ✗ | ✓ | ✓ | — |
| `university` | ✓ sidebar | ✗ | ✓ | ✓ | — |
| `research` | ✓ sidebar | ✗ | ✓ | ✓ | — |
| `occult` | ✓ sidebar (M) | ✗ | ✓ (ungated) | ✓ (ungated) | — |
| `civilisation` | ✓ sidebar (M) | ✗ | ✓ (ungated) | ✓ (ungated) | — |
| `reality` | ✓ sidebar (M) | ✗ | ✓ (ungated) | ✓ (ungated) | — |
| `knowledge` | ✓ sidebar | ✗ | ✓ | ✓ | — |
| `intelligence` | ✓ sidebar | ✗ | ✓ | ✓ | — |
| `memory` | ✓ sidebar | ✗ | ✓ | ✓ | — |
| `activity` | ✓ sidebar (M) | ✗ | ✗ | ✓ (ungated) | — |
| `agents` | ✓ sidebar (M) | ✗ | ✗ | ✓ (ungated) | — |
| `approvals` | ✓ sidebar (M) | ✗ | ✗ | ✓ (ungated) | — |
| `governance` | ✓ sidebar (M) | ✗ | ✓ (ungated) | ✓ (ungated) | — |
| `command` | ✓ sidebar | ✓ tab bar | ✗ | ✓ | — |
| `system` | ✓ sidebar | ✗ | ✓ | ✓ | — |

No pages are reachable ONLY through secondary mechanisms — all have sidebar nav buttons. But on mobile, 18/20 pages are reachable only through More sheet or dropdown (non-primary-tab-bar).

---

## 12. Proposed Page-to-Destination Mapping

| Page ID | Current group | Canonical destination | Sub-location | Access |
|---------|--------------|----------------------|-------------|--------|
| `overview` | TODAY | **TODAY** (primary) | — | All roles |
| `command` | COMMAND | **COMMAND** (primary) | — | All roles |
| `finance` | LIFE & WORK | **LIFE & WORK** | Finance | All roles |
| `communication` | LIFE & WORK | **LIFE & WORK** | Network | All roles |
| `business` | LIFE & WORK | **LIFE & WORK** | Business | All roles |
| `health` | LIFE & WORK | **LIFE & WORK** | Health | All roles |
| `university` | LIFE & WORK | **LIFE & WORK** | University | All roles |
| `research` | LIFE & WORK | **LIFE & WORK** | Research | All roles |
| `occult` | LIFE & WORK | **LIFE & WORK** | Occult | Master only |
| `civilisation` | LIFE & WORK | **LIFE & WORK** | Civilisation | Master only |
| `reality` | LIFE & WORK | **LIFE & WORK** | Reality | Master only |
| `intelligence` | INTELLIGENCE | **INTELLIGENCE** | Briefing/Opportunities | All roles |
| `memory` | INTELLIGENCE | **INTELLIGENCE** | Memory | All roles |
| `knowledge` | INTELLIGENCE | **INTELLIGENCE** | Knowledge | All roles |
| `operation` | ACTIONS | **ACTIONS** | Tasks & Pipeline | All roles |
| `agents` | ACTIONS | **ACTIONS** | Agents | Master only |
| `approvals` | ACTIONS | **ACTIONS** | Approvals | Master only |
| `system` | SYSTEM | **SYSTEM** / PROFILE | Infrastructure (M) / Profile (U) | All roles (dual view) |
| `activity` | SYSTEM | **SYSTEM** | Activity | Master only |
| `governance` | SYSTEM | **SYSTEM** | Governance | Master only |

---

## 13. Exact Files and Lines Likely to Change

All changes confined to `public/dashboard.html` only (V-11-D frontend-only scope).

### D1 — Navigation information architecture

| Item | Location | Change |
|------|----------|--------|
| Nav group labels | Lines ~10285–10377 | Verify TODAY/COMMAND/LIFE & WORK/INTELLIGENCE/ACTIONS/SYSTEM labels match exactly |
| `pageMeta.overview` | Line 10392 | `title: 'Today'`, `sub: 'What matters now'` |
| `pageMeta.operation` | Line 10393 | Consider `title: 'Actions'` vs keeping 'Operation' |
| `pageMeta.intelligence` | Line 10408 | `sub: 'Briefing · Analysis · Opportunities'` |
| Nav button label for `nav-overview` | ~Line 10288 | Change "Overview" → "Today" |
| Nav button label for `nav-intelligence` | ~Line 10340 | Change "Intel" → "Intelligence" (or "Briefing") |
| TODAY page content | Lines 7959–9039 | Add briefing/priority-inbox panels; move governance telemetry to secondary/System |

### D2 — Desktop shell

| Item | Location | Change |
|------|----------|--------|
| Default active page | Line 6412 area | Change `class="page active"` from `page-command` to `page-overview` |
| Initial `activePage` | Line 10388 | `var activePage = 'overview'` |
| Boot `switchPage` calls | Lines 14092–14101 | Add `initOverviewPage()` / briefing init to boot sequence |
| `pageMeta` updates | Lines 10390–10411 | See D1 |

### D3 — Mobile shell

| Item | Location | Change |
|------|----------|--------|
| `#moreSheet` role-gating | Lines 18477–18500 | Add `apex-master-only` class to master-only page buttons |
| `#mobileNavDropdown` role-gating | Lines 6348–6370 | Add `apex-master-only` class to master-only page buttons |
| Mobile tab bar composition | Lines 6135–6208 | Confirm 6-destination model works: TODAY+COMMAND visible by default, More provides rest |

### D4 — Routing integration

| Item | Location | Change |
|------|----------|--------|
| Hash write in switchPage | After line 10425 | `history.replaceState(null, '', '#' + name)` |
| Hash read on load | ~Line 10387 area | Read `location.hash` after `pages` array defined |
| `popstate` handler | After switchPage definition | Navigate back/forward via browser hash |
| `pages` array order | Line 10387 | Reorder so TODAY (`overview`) is first: `['overview', 'command', ...]` |

### D5 — Role verification

| Item | Location | Change |
|------|----------|--------|
| `#moreSheet` master-only buttons | Lines 18477–18500 | `apex-master-only` class on occult/civilisation/reality/activity/agents/approvals/governance buttons |
| `#mobileNavDropdown` master-only | Lines 6348–6370 | Same |
| TODAY page content authority | New TODAY panels | Use `apex-master-only`/`apex-user-only` classes on role-specific items |

### D6 — Playwright test suite

New file: `playwright-v11d-verify.js`

---

## 14. What Must NOT Be Changed

| Element | Reason |
|---------|--------|
| All `page-*` div IDs | switchPage(name) depends on `#page-{name}` exactly |
| `switchPage` base signature | 14+ wrapper chain depends on it |
| `applyRoleProfile()` | V-11-B identity system — body class toggle + SYSTEM dual-view |
| `#v11-user-profile` / `#v11-system-header` / `#v11-system-main` | V-11-A SYSTEM/PROFILE dual-view |
| `#apex-conn-indicator` | V-11-B connectivity indicator |
| `window.setState` | V-11-B universal state system |
| `window._bootIdentity()` | V-11-B D-Q2 hardened identity boot |
| All V-11-B CSS | State dots, panel error, stale indicator styles |
| All V-11-C API contract | Backend unchanged in V-11-D |
| `v11-cmd-agent-panel` visibility logic | V-11-A master/user COMMAND panel |
| `.apex-master-only` CSS rule | V-11-A role filtering mechanism |
| `src/routes/auth.js` | Authentication unchanged |
| `lib/ws-handler.js` | WebSocket unchanged |

---

## 15. Test Matrix for D1–D6

### D6 Playwright Verification Suite

| ID | Test | Profile | Scope |
|----|------|---------|-------|
| A-1 | Default page on load is TODAY (overview) | Master | D2 |
| A-2 | TODAY nav button is active on load | Master | D2 |
| A-3 | TODAY page shows briefing content / state | Master | D1 |
| B-1 | COMMAND nav goes to command page | Master | D1 |
| B-2 | PlasmaOrb present on COMMAND | Master | Regression |
| B-3 | Agent panel visible on COMMAND for Master | Master | Regression |
| B-4 | Agent panel hidden on COMMAND for User | User | Regression |
| C-1 | All 6 destination groups in `#apexSideNav` | Master | Regression |
| C-2 | All 20 pages reachable via switchPage | Master | D4 |
| D-1 | Master sees 7 master-only nav items | Master | Regression |
| D-2 | User does NOT see 7 master-only nav items | User | Regression |
| D-3 | More sheet master-only items hidden for user | User | D3/D5 |
| D-4 | Mobile dropdown master-only items hidden for user | User | D3/D5 |
| E-1 | SYSTEM page shows infrastructure for Master | Master | Regression |
| E-2 | SYSTEM page shows PROFILE for User | User | Regression |
| F-1 | Browser hash changes on switchPage | Master | D4 |
| F-2 | Hash on load restores correct page | Master | D4 |
| F-3 | Back button navigates to previous page | Master | D4 |
| G-1 | Mobile tab bar shows TODAY + COMMAND + More | User (≤899px) | D3 |
| G-2 | No horizontal overflow at desktop 1280px | Master | Regression |
| G-3 | No horizontal overflow at mobile 390px | Master | Regression |
| H-1 | No JS console errors on load | Master | Regression |
| H-2 | No 5xx API responses during load | Master | D1 |
| I-1 | finance switchPage works | Master | Regression |
| I-2 | intelligence switchPage works | Master | Regression |
| I-3 | memory switchPage works | Master | Regression |
| I-4 | operation switchPage works | Master | Regression |
| I-5 | governance switchPage works | Master | Regression |

Total: 27 planned tests.

---

## 16. Regression Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Changing default boot page (`command` → `overview`) triggers initOverviewPage on load | Medium | Ensure briefing API calls are gracefully handled (V-11-C handles errors canonically) |
| Adding hash routing conflicts with `?app_key=` cleanup | Low | Hash and query params are independent; cleanup code only touches `search`, not `hash` |
| `pages` array reorder breaks swipe gesture | Medium | Swipe uses array index — ensure new order feels intuitive |
| Mobile dropdown role-gating misses a button | Low | Add `apex-master-only` class precisely matching sidebar; CSS rule handles automatically |
| V-11-B `setState` conflicts with new TODAY content | Low | setState is a utility function, not bound to specific page |
| `page-overview` heading design conflicts with new TODAY panels | Medium | overview currently has no `ds-page-title` div — new TODAY header can be added freely |
| switchPage wrapper chain breaks if overview init moved | Low | Wrapper at line 15403 still fires; just add briefing init inside same wrapper |

---

## 17. Safest Implementation Path

**D1: Content-before-structure.** Redesign TODAY content using existing `page-overview` div and V-11-B `setState`, consuming V-11-C `/api/briefing/today` and `/api/briefing/priority-inbox`. Do not touch nav structure yet.

**D2: One-line default page change.** Switch boot from `command` to `overview`. Update `pageMeta.overview`. Rename nav label. Add `initOverviewPage` to briefing refresh sequence.

**D3: Add role-gating to mobile nav.** Add `apex-master-only` class to 7 pages in `#moreSheet` and `#mobileNavDropdown`. The CSS rule already hides them automatically. No new CSS needed.

**D4: Hash routing via switchPage wrapper.** Add a final switchPage wrapper that writes hash + reads hash on load. Does not modify any existing wrapper.

**D5: Verify role filtering.** Run Playwright across both roles. No code changes expected if D1–D4 are done correctly.

**D6: Playwright certification.** Run 27-test suite. Certify.

---

## 18. Git Status Verification

```
Application code: UNCHANGED
Architecture/index.yaml: M (auto-generated timestamp, pre-existing)
public/dashboard.html: M (V-11-B changes, already committed in ca155c1)
```

No V-11-D0 application code changes were made. Reconnaissance is documentation-only.

---

## 19. Code Reuse Assessment

| Component | Reuse | Notes |
|-----------|-------|-------|
| `switchPage` wrapper pattern | ✓ Reuse | Add new wrapper for TODAY init + hash routing |
| V-11-B `setState()` | ✓ Reuse | TODAY panels use setState for briefing data |
| `_parseApiError()` | ✓ Reuse | Briefing API error handling |
| V-11-A `apex-master-only` CSS | ✓ Reuse | Add class to mobile nav buttons — no new CSS |
| `applyRoleProfile()` | ✓ Reuse | No changes needed |
| Existing `initOverviewPage()` | ✓ Extend | Add briefing panels as additional sections |
| More sheet grid pattern | ✓ Reuse | Add class names, no structure change |
| `fetchJsonDeduped` / `cachedFetch` | ✓ Reuse | TODAY panel data fetching |

---

*Reconnaissance complete: 2026-09-01*  
*No application code was modified.*  
*V-11-D0 HARD STOP — awaiting D1 authorization.*
