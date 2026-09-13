# BETA-LEGACY INTERFACE CONVERGENCE RECONNAISSANCE

**Date:** 2026-08-28  
**Status:** COMPLETE — AWAITING EXPLICIT IMPLEMENTATION AUTHORISATION  
**Classification:** READ-ONLY RECONNAISSANCE — no production files modified

---

## 1. Executive Finding

**Architecture class: OPTION C — Two coexisting DOM/JS systems inside a single HTML file.**

`public/dashboard.html` is not two deployments, not two routes, and not a layered progressive enhancement. It is a single 22,283-line monolith that unconditionally initialises both the legacy interface (14 polling-based page surfaces) and the Beta/Command interface (plasma orb, voice pipeline, command-first navigation) on every page load. Both systems are fully live simultaneously. The page visible to the user is determined solely by CSS `.page.active` state — not by which JS system is running.

The convergence blueprint (`UX-01-CANONICAL-UX-DISCOVERY.md`) prescribes collapsing the 14 legacy pages into 5 canonical surfaces but has not been implemented. As of the end of RX-07, all 14 legacy pages remain materially active, double-polling in the background while the Beta command surface is displayed.

---

## 2. Exact Frontend Entry Points

| Route | Handler | File Served | Auth |
|-------|---------|-------------|------|
| `GET /` | `_serveDashboard` in `src/routes/ui.js` | `public/dashboard.html` | `requireAuth` |
| `GET /dashboard.html` | `_serveDashboard` in `src/routes/ui.js` | `public/dashboard.html` | `requireAuth` |
| `GET /editor` | `src/routes/ui.js` | `public/editor.html` (4.6 KB) | `requireAppAccess` |

**`public/dashboard.html` is the sole production frontend.** There is no second dashboard, no beta-specific route, no feature-flag path to an alternate HTML file.

Serving details:
- `res.sendFile` — no template substitution, no server-side variable injection
- `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate` — current file on every request
- `APP_KEY` is NOT injected by the server; the browser reads it from `localStorage.getItem('apex_app_key')` at line 12976

`public/editor.html` (4.6 KB) is a standalone admin utility served at `/editor`. It is not part of the dashboard and not relevant to convergence.

16+ prototype HTML files exist in `docs/interface/prototype/` — none are served in production (they are design artefacts only).

---

## 3. Legacy Interface Inventory

15 page surfaces classified as legacy. All are registered in `pages[]`, `pageMeta`, and the `switchPage` wrapper chain.

| Page ID | Name | Init Method | Polling |
|---------|------|-------------|---------|
| `page-system` | System | switchPage hook | On demand |
| `page-communication` | Communication | Parse-time IIFE | Calendar renders at parse |
| `page-finance` | Finance | switchPage hook | `refreshSlow()` every 60 s |
| `page-operation` | Operation | switchPage hook | On demand |
| `page-health` | Health | switchPage hook | On demand |
| `page-business` | Business | switchPage hook | On demand |
| `page-university` | University | switchPage hook | On demand |
| `page-occult` | Occult | switchPage hook | On demand |
| `page-activity` | Activity | switchPage hook | On demand |
| `page-agents` | Agents | switchPage hook | On demand |
| `page-approvals` | Approvals | switchPage hook | On demand |
| `page-knowledge` | Knowledge | switchPage hook | On demand |
| `page-intelligence` | Intelligence | switchPage hook | On demand |
| `page-memory` | Memory | switchPage hook (RX-04) | On demand |
| `page-governance` | Governance | switchPage hook (RX-06) | On demand |

**Double-registered polling panels** (fire immediately on page load regardless of active page):
- `refreshCrmPanel` — registered at lines 16856–16859 (direct `setInterval`) AND again at lines 17302–17305 (via `_addInterval`)
- `refreshProjectsPanel` — same double-registration
- `refreshOpsDocumentsPanel` — same double-registration
- `refreshOpsProposalsPanel` — same double-registration

These 4 panels make API calls immediately on page load whether or not their parent page is the active page.

---

## 4. Beta Interface Inventory

6 page surfaces classified as Beta/Command-era.

| Page ID | Name | Init Method | Notes |
|---------|------|-------------|-------|
| `page-command` | Command | `cmdInitPage()` via DOMContentLoaded, 250 ms delay | Default active page — `class="page active"` baked in HTML at line 8809 |
| `page-overview` | Overview | Parse-time IIFE | WebSocket opens to `/ws/viz` unconditionally at parse time |
| `page-research` | Research | switchPage hook | API-driven |
| `page-civilisation` | Civilisation | switchPage hook | API-driven |
| `page-reality` | Reality | switchPage hook | API-driven + `refreshSlow()` |
| `page-browser` | Browser | **ORPHAN — never reachable** | Exists at line 11936; absent from `pages[]`, `pageMeta`, all switchPage wrappers |

**`page-browser` is an architectural orphan.** It cannot be navigated to via any current navigation path. It is dead DOM.

**`page-command` Beta systems initialised unconditionally on every page load:**
- Plasma orb canvas (`cmdInitPage()`) — star field, orb animation, stat strip
- Voice pipeline (`speakQueue`, `_processSpeak`, `isListening`, `lastSendWasVoice`)
- `refreshFast()` — memory + notifications + tasks every 30 s
- `refreshSlow()` — email + finance + routines + reality every 60 s

---

## 5. DOM Coexistence Analysis

Both legacy and Beta surfaces exist as `<div class="page">` elements inside `.page-and-input`. They share the same DOM parent. Page visibility is controlled exclusively by the `.page.active` CSS class:

```css
.page        { opacity: 0; pointer-events: none; transform: translateX(18px); position: absolute; inset: 0; }
.page.active { opacity: 1; pointer-events: auto; transform: translateX(0); }
```

**All 20 registered pages exist simultaneously in the DOM.** When `page-command` is active, the other 19 pages are invisible (opacity 0, pointer-events none) but still present and their JS polling loops are still running.

The 21st surface (`page-browser`) is also in the DOM but unreachable.

**No conditional rendering, no dynamic mounting, no framework-managed component lifecycle.** Every page is rendered into the DOM at parse time. Content is populated via API fetch calls that fire when a page becomes active (switchPage hooks) or unconditionally (the 4 double-registered legacy panels, refreshFast/Slow global pollers).

---

## 6. Navigation Architecture

Single navigation element: `.bottom-nav` — functions as both mobile bottom bar and desktop sidebar via CSS grid-area reassignment at `@media (min-width: 900px)`.

```
Mobile  → .bottom-nav = grid-area: bottom (horizontal tabs)
Desktop → .bottom-nav = grid-area: sidebar (vertical rail, 200px wide)
```

Secondary navigation: `#mobileNavDropdown` — hamburger dropdown for overflow pages. Present in DOM but NOT the primary navigation path.

All user-initiated page switches flow through `window.switchPage(name)`. No navigation element directly manipulates DOM — all delegate to `switchPage`.

`switchPage` registration in `pages[]` (line 12776, 20 entries):
```
command, overview, operation, system, finance, communication, business, health,
university, occult, research, civilisation, reality, activity, agents, approvals,
knowledge, intelligence, memory, governance
```

`page-browser` is absent from this array. It cannot be switched to.

---

## 7. switchPage Wrapper Chain

Original `switchPage` defined at line 12801. Overwritten 13 times by IIFE-based monkey-patches:

| Wrapper # | Line | Pages Handled |
|-----------|------|---------------|
| 1 | 17791 | legacy panel refresh hooks |
| 2 | 18861 | communication IIFE sync |
| 3 | 19023 | finance refresh |
| 4 | 19121 | health refresh |
| 5 | 19270 | operation refresh |
| 6 | 19445 | business refresh |
| 7 | 19589 | university / occult refresh |
| 8 | 19773 | research / reality refresh |
| 9 | 20350 | command page — `cmdInitPage()` |
| 10 | 20908 | activity refresh |
| 11 | 21137 | agents refresh |
| 12 | 21540 | knowledge / intelligence refresh |
| 13 | 22269 | memory (RX-04) / approvals / governance (RX-06) refresh |

**Chain fragility:** Each wrapper captures the previous `window.switchPage` as `_orig` (or `_origSwitch` in wrappers 10 and 12 — naming inconsistency). If any wrapper throws before calling `_orig`, all subsequent wrappers' page-init hooks never execute. A runtime error in wrapper 5 (finance) would prevent all of wrappers 6–13 from firing. This is a pre-existing structural fragility unrelated to any RX sprint.

**25+ `setInterval` polling loops** total. `refreshFast` (every 30 s) and `refreshSlow` (every 60 s) fire unconditionally after first page load.

---

## 8. CSS Architecture

10 inline `<style>` blocks plus 2 external CSS files (`/apex-v2.css`, `/apex-custom.css`).

| Block | Lines | Classification | Key Declarations |
|-------|-------|----------------|-----------------|
| 1 | 39–1103 | v10 base | `.app`, `.page`, root palette |
| 2 | 1104–2102 | v11 surface | Competing `.app`, `.page` |
| 3 | 2103–2727 | v12 `--v12-*` | Custom property namespace |
| 4 | 2728–3899 | Desktop grid override (`!important`) | Wins over all prior `.app {}` |
| 5 | 3900–5199 | ax-unify `--ax-*` | Canonical token introduction |
| 6 | 5200–6417 | v13 short tokens (`--bd`, `--tx*`) | `.cmd-feed-col { display:none }` hides right command column |
| 7 | 6418–7427 | Apex-master full `--ax-*` scale | Canonical namespace expanded |
| 8 | 7428–8808 | command-v4 | `.input-zone { display:none!important }`; `grid-template-columns:1fr!important` globally |
| 9 | (distributed) | Domain tokens | `--domain-primary`, `--domain-border` (RX-04) |
| 10 | (distributed) | Patch layer | Point fixes |

**Structural conflicts:**
- 17+ competing `.app {}` definitions; the Block 4 definition with `!important` is the runtime winner
- 14+ competing `.page {}` definitions; all compatible (same visibility pattern)
- 5 competing `:root` color palettes (v10, v11, v12, v13, ax-unify/apex-master)
- Block 8 applies `grid-template-columns:1fr!important` globally — not scoped to command page — overrides desktop grid for all pages
- `.cmd-feed-col { display:none }` in Block 6 hides the right panel of `page-command` globally
- 3 generations of orb CSS (`.plasma-orb`, `.cmd-orb`, `.cmd-stage`)
- `.apex-feed` defined 3 times

**Document self-identification:** `<meta name="apex-version" content="v10">` — document still declares v10 despite 10 CSS layers.

**Canonical target namespace:** `--ax-*` (Blocks 7 and 10). The convergence implementation should consolidate toward this namespace and remove the 4 prior competing palettes.

---

## 9. JavaScript Initialisation Architecture

Both systems initialise unconditionally on every page load. Execution order:

```
HTML parse begins
  │
  ├─ Block 1–8 CSS applied
  │
  ├─ Overview IIFE executes (parse-time)
  │     └─ wsConnect() opens WebSocket to wss://[host]/ws/viz immediately
  │
  ├─ Communication IIFE executes (parse-time)
  │     └─ Calendar rendered immediately regardless of active page
  │
  ├─ Main script block (lines 12973–16488)
  │     ├─ APP_KEY read from localStorage (line 12976)
  │     ├─ _showKeyModal() if no APP_KEY (line 13010)
  │     ├─ All state variables declared
  │     ├─ speak(), viewNotification(), refreshFast(), refreshSlow() defined
  │     └─ Script execution continues past modal call
  │
  ├─ Legacy polling registered (lines 16852–16859)
  │     ├─ refreshCrmPanel — fires immediately
  │     ├─ refreshProjectsPanel — fires immediately
  │     ├─ refreshOpsDocumentsPanel — fires immediately
  │     └─ refreshOpsProposalsPanel — fires immediately
  │
  ├─ switchPage wrappers 1–13 applied (lines 17791–22269)
  │
  ├─ Double-registration of same 4 panels (lines 17302–17305 via _addInterval)
  │
  └─ DOMContentLoaded fires
        ├─ Main handler (line 9634)
        └─ cmdInitPage() with 250 ms delay (line 20354)
              └─ Orb canvas animation, star field, stat strip
```

**Global pollers active after first load (regardless of active page):**
- `refreshFast()` — every 30 s: memory, notifications, tasks
- `refreshSlow()` — every 60 s: email, finance, routines, reality

All fetch calls use `buildApiHeaders()` which injects `x-app-key: APP_KEY`. If `APP_KEY` is empty, all calls return 401 and all dynamic content fails to populate.

---

## 10. Local vs Production Comparison

| Dimension | Local (`localhost:3000`) | Production (Render) |
|-----------|--------------------------|---------------------|
| File served | `public/dashboard.html` from working tree | Same file from deployed build |
| Auth gate | `requireAuth` (session/token check) | Same middleware |
| APP_KEY source | `localStorage` or URL param | Same — no server injection |
| WebSocket | `wss://localhost:3000/ws/viz` | `wss://[render-host]/ws/viz` |
| Supabase | Same connection string from `.env` | Same (shared DB) |
| CSS/JS | Identical — single file, no build step | Identical |
| External CDN | Google Fonts from `fonts.googleapis.com` | Same |
| Polling targets | All `/api/*` routes at `localhost:3000` | All `/api/*` routes at Render host |

**No environment-specific divergence exists.** The dashboard.html served locally is byte-for-byte identical to production (no build transformation, no environment-conditional includes).

---

## 11. Authoritative UX and Interface Documents

Located in `docs/interface/`:

| Document | Status | Role |
|----------|--------|------|
| `UX-00-LEGACY-INTERFACE-BASELINE.md` | COMPLETE | Forensic baseline of legacy 14-page interface; 5 competing CSS token sets documented |
| `UX-01-CANONICAL-UX-DISCOVERY.md` | COMPLETE | Convergence blueprint — 5 canonical surfaces (Command, World, Decisions, Knowledge, System); hamburger and `page-browser` retirement prescribed |
| `POST-UX-19-FINAL-RECONCILIATION.md` | COMPLETE | Hard stop after UX-00–UX-19; "CONDITIONALLY CERTIFIED — FUNCTIONAL BETA WITH EXPLICIT LIMITATIONS" |
| `RX-07-CERTIFICATION.md` | CERTIFIED CLOSED | Font retirement + voice controls; open gaps registry |
| `BETA-INTERFACE-RUNTIME-DIAGNOSTIC.md` | COMPLETE | Root cause: APP_KEY absent → blocking modal; no code change required |
| `BETA-LEGACY-INTERFACE-CONVERGENCE-RECONNAISSANCE.md` | This document | Convergence state assessment |

`UX-01-CANONICAL-UX-DISCOVERY.md` is the authoritative design intent document. It prescribes the target state but has not been fully implemented. The Beta command surface is implemented; the legacy page consolidation into 5 canonical surfaces is not.

---

## 12. ONE-APEX Frontend Convergence Assessment

| Principle | Current State | Compliance |
|-----------|---------------|-----------|
| Single production frontend | `public/dashboard.html` is the sole served artifact | MAINTAINED |
| No second dashboard | No alternate HTML file served | MAINTAINED |
| No second JS runtime | Legacy and Beta share one script execution context | MAINTAINED |
| No second event bus | Zero `new EventEmitter` in dashboard | MAINTAINED |
| No second governance system | `window.governanceRefresh` is the sole governance runtime | MAINTAINED |
| No second memory system | `window.memoryRefresh` is the sole memory runtime | MAINTAINED |
| No second auth mechanism | Single `APP_KEY` governs all API access | MAINTAINED |
| Convergence blueprint implemented | UX-01 5-surface collapse NOT yet executed | **NOT MET** |
| Legacy polling retired | 25+ setInterval loops still active | **NOT MET** |
| CSS namespace consolidated | 5 competing palettes, 10 style blocks | **NOT MET** |
| Dead DOM removed | `page-browser` orphan remains in HTML | **NOT MET** |
| switchPage chain consolidated | 13 monkey-patch wrappers remain | **NOT MET** |

ONE-APEX structural integrity is maintained. ONE-APEX architectural convergence is not yet complete.

---

## 13. Legacy Retirement Candidates

Pages and systems that the UX-01 blueprint identifies for retirement or consolidation:

| Surface | Retirement Disposition | Dependency |
|---------|----------------------|------------|
| `page-browser` | Delete — orphan, unreachable | None |
| `page-operation` | Merge into World surface | switchPage wrappers 1, 5 |
| `page-system` | Merge into System surface | switchPage wrapper 1 |
| `page-finance` | Merge into World surface | switchPage wrapper 3, refreshSlow |
| `page-communication` | Merge into World surface | Parse-time IIFE, Calendar |
| `page-health` | Merge into World surface | switchPage wrapper 4 |
| `page-business` | Merge into World surface | switchPage wrapper 6 |
| `page-university` | Merge into World surface | switchPage wrapper 7 |
| `page-occult` | Merge into World surface | switchPage wrapper 7 |
| `page-research` | Merge into World or Knowledge | switchPage wrapper 8 |
| `page-civilisation` | Merge into World surface | switchPage wrapper 8 |
| `page-reality` | Merge into World surface | switchPage wrapper 8, refreshSlow |
| `#mobileNavDropdown` | Retire hamburger overflow | CSS, JS click handler |
| CRM / Projects / Ops double-polling | Consolidate to single registration | Lines 16852–16859 AND 17302–17305 |
| 4 competing CSS `:root` palettes (v10–v13) | Consolidate to `--ax-*` | All inline style blocks |

Pages to PRESERVE through any convergence:
- `page-command` — primary Beta surface, canonical default
- `page-activity` — retained as Decisions surface input
- `page-agents` — retained as Decisions surface input
- `page-approvals` — retained as Decisions surface (RX-05)
- `page-knowledge` — retained as Knowledge surface
- `page-intelligence` — retained as Knowledge surface input
- `page-memory` — retained as System surface input (RX-04)
- `page-governance` — retained as System surface input (RX-06)
- `page-overview` — retained as World surface candidate

---

## 14. Exact Convergence Dependency Graph

```
GAP-01 (Progressive Disclosure L0–L4)
  └─ GAP-24 (Bottom sheet)
  └─ GAP-25 (5-tab bottom nav)
         └─ Navigation rail consolidation (14 nav buttons → 5)
                └─ Legacy page retirement (14 → 5 canonical surfaces)
                       └─ switchPage wrapper chain collapse (13 → 1 wrapper)
                              └─ CSS block consolidation (10 → 1 canonical block)
                                     └─ Legacy polling retirement (25+ → targeted per-surface)

GAP-29 (SVG icon system)
  └─ Navigation icon replacement (text/emoji → canonical SVG sprites)

GAP-27 (CSS :root consolidation)
  └─ 7 overlapping :root blocks → 1 canonical --ax-* palette
       └─ Inline style removal from all legacy page elements
```

**Critical path blocker:** GAP-01 (design not yet delivered) blocks GAP-24 and GAP-25, which block the navigation consolidation, which is required before legacy page retirement can be safely executed without breaking navigation.

**Unblocked work (can proceed independently):**
- `page-browser` orphan removal (no dependencies)
- Double-polling deduplication (lines 16852–17305, no design required)
- GAP-27 CSS `:root` consolidation (requires explicit per-block authorisation, not design)
- GAP-29 SVG sprites (requires asset delivery, not design)

---

## 15. Risks

| Risk | Severity | Notes |
|------|----------|-------|
| switchPage chain collapse breaks page init | HIGH | Any wrapper removal must verify all 13 pages still receive their init hooks |
| Parse-time IIFE removal crashes overview WebSocket | HIGH | Overview IIFE is self-contained; extraction must replicate its parse-time execution timing |
| CSS block consolidation introduces regression | HIGH | 17+ `.app {}` definitions; cascade order must be verified against all 20 page surfaces |
| Double-polling deduplication causes polling gap | MEDIUM | CRM/projects/ops/proposals panels currently fire on both registrations; removing one must not introduce a gap |
| `page-browser` orphan removal exposes hidden JS references | LOW | Static grep shows no JS references to `page-browser` ID; safe to remove DOM only |
| Communication IIFE calendar re-renders on every switchPage | LOW | Current IIFE renders calendar at parse time; safe for now, inefficient |
| APP_KEY absent breaks all content regardless of convergence state | LOW-CURRENT | Not a convergence risk — existing runtime condition |
| Legacy polling continues after page retirement | MEDIUM | Must cancel `setInterval` handles before removing page surfaces |
| `_origSwitch` naming collision between wrappers 10 and 12 | LOW | Both in separate IIFEs; no actual collision but creates confusion during chain refactor |

---

## 16. Recommended Implementation Sequence (Phases A–F)

**Phase A — Zero-dependency cleanup (no design required)**

1. Remove `page-browser` orphan DOM node (line 11936) — no navigation impact
2. Deduplicate double-registered polling panels (lines 16852–16859, keep; remove lines 17302–17305 duplicates)
3. Consolidate CSS `:root` palettes — 7 overlapping `:root` blocks → 1 canonical `--ax-*` block (GAP-27, requires explicit per-block authorisation)

**Phase B — SVG icon system (asset delivery required)**

4. Deliver SVG sprite sheet (GAP-29 prerequisite)
5. Replace nav button icons with `<use xlink:href="#icon-*">` references (GAP-29)

**Phase C — Progressive disclosure design (design delivery required)**

6. Deliver L0–L4 disclosure design specification (GAP-01 prerequisite)
7. Implement disclosure layer scaffolding (GAP-01)
8. Implement bottom sheet component (GAP-24, unblocks after GAP-01)

**Phase D — Navigation consolidation (unblocks after Phase C)**

9. Implement 5-tab navigation (GAP-25) replacing 20-button rail
10. Update `pages[]` and `pageMeta` to 5 canonical entries
11. Collapse 13 switchPage wrappers into 1 canonical dispatcher

**Phase E — Legacy page retirement (unblocks after Phase D)**

12. Migrate legacy page content into 5 canonical surface panels:
    - World: operation, finance, communication, health, business, university, occult, research, civilisation, reality
    - Decisions: activity, agents, approvals
    - Knowledge: knowledge, intelligence
    - System: memory, governance, system
13. Cancel and consolidate polling loops per canonical surface
14. Remove retired `<div class="page">` DOM nodes

**Phase F — CSS consolidation (unblocks after Phase E)**

15. Remove CSS blocks 1–8; retain only canonical `--ax-*` namespace
16. Remove competing `.app {}`, `.page {}`, and `:root {}` overrides
17. Update `<meta name="apex-version" content="v10">` to current version

---

## 17. Files That Would Change If Implementation Were Authorised

| File | Phase | Change |
|------|-------|--------|
| `public/dashboard.html` | A, B, C, D, E, F | All DOM, CSS, and JS changes |
| `public/apex-v2.css` | F | May be consolidated into dashboard.html or deleted |
| `public/apex-custom.css` | F | May be consolidated into dashboard.html or deleted |
| `tests/rx-07-p1.test.js` | D | P7-09 `:root` count check must be updated after GAP-27 |
| `tests/rx-04-p1.test.js` | E | Memory page checks must reflect new surface structure |
| `tests/rx-06-p1.test.js` | E | Governance page checks must reflect new surface structure |
| New test file (Phase D) | D | Convergence regression suite for 5-surface navigation |

---

## 18. Files That Must Remain Untouched

| File | Reason |
|------|--------|
| `server.js` | ONE-APEX — no backend changes from frontend convergence |
| `src/routes/ui.js` | Serves `public/dashboard.html` — route unchanged |
| `routes/governance.js` | ONE-APEX governance runtime — frontend-only convergence |
| `routes/memory.js` | ONE-APEX memory runtime — frontend-only convergence |
| `routes/agents.js` | ONE-APEX agents runtime — frontend-only convergence |
| `lib/event-bus.js` | ONE-APEX event bus — no second instance, no modifications |
| `middleware/express-config.js` | CSP unchanged — Inter + Cinzel + JetBrains Mono already whitelisted |
| Any Supabase schema | No schema changes from UX convergence |

---

## 19. Verification Criteria

Any convergence implementation is verified complete when all of the following are true:

| Check | Criteria |
|-------|----------|
| Navigation | Exactly 5 nav buttons present; all 5 surfaces reachable; no pages stranded |
| Legacy retirement | 14 legacy `<div class="page">` elements removed from DOM |
| Orphan removal | `page-browser` absent from DOM |
| Polling deduplication | No panel registered to both direct `setInterval` and `_addInterval` |
| switchPage chain | Single `window.switchPage` function (no monkey-patch wrappers) |
| CSS consolidation | Exactly 1 `<style>` block; exactly 1 `:root` block defining `--ax-*` |
| Font canonical | Inter, Cinzel, JetBrains Mono — no IBM Plex Sans, no Space Grotesk (already RX-07 verified) |
| Regression suites | All `tests/rx-02-p1` through `tests/rx-07-p1` pass without modification |
| Convergence suite | New convergence test suite (to be authored) all pass |
| ONE-APEX | Zero `new EventEmitter`, zero `new GovernanceRuntime`, zero `new MemoryRuntime` in dashboard |
| Auth | `APP_KEY` modal still present; all `/api/*` calls still use `buildApiHeaders()` |

---

## 20. Final Recommendation

**Convergence is structurally feasible but requires prerequisite delivery before execution.**

The immediate unblocked action is Phase A: remove `page-browser` (no dependencies), deduplicate the 4 double-registered polling panels (lines 16852–17305), and initiate GAP-27 CSS `:root` consolidation once explicit per-block targets are authorised. These three actions reduce architectural debt and are safe to execute independently.

Phases B through F are blocked by GAP-01 design delivery (progressive disclosure specification) and GAP-29 asset delivery (SVG sprites). No implementation of the 5-surface navigation collapse or legacy page retirement should begin before these prerequisites are met.

The `switchPage` monkey-patch chain (13 wrappers) should not be refactored until the legacy pages it serves are retired — attempting to consolidate the chain while legacy pages remain active risks breaking page initialisation across all 20 surfaces.

---

## Convergence State Map

| Dimension | Current State | Target State (UX-01) | Gap |
|-----------|---------------|---------------------|-----|
| Page surfaces | 21 (20 registered + 1 orphan) | 5 canonical | 16 to retire/consolidate |
| Navigation buttons | 20 | 5 tabs | 15 to remove |
| switchPage wrappers | 14 (1 original + 13 monkey-patches) | 1 | 13 to collapse |
| CSS style blocks | 10 inline + 2 external | 1 canonical | 11 to remove |
| `:root` palettes | 7 overlapping | 1 (`--ax-*`) | 6 to remove |
| `.app {}` definitions | 17+ | 1 | 16+ to remove |
| setInterval loops | 25+ | ~5 (one per surface) | 20+ to retire |
| Active document version | `v10` (meta tag) | current | 1 meta tag to update |
| Font system | Inter/Cinzel/JetBrains Mono | Same (RX-07 complete) | DONE |
| Voice controls | Dedup + budget + gate (RX-07) | Same | DONE |
| Governance surface | Present (RX-06) | Retained in System | DONE |
| Memory surface | Present (RX-04) | Retained in System | DONE |

---

**No production files were modified during this reconnaissance. This document is the sole output of the investigation session.**

---

INTERFACE CONVERGENCE RECONNAISSANCE COMPLETE — AWAITING EXPLICIT IMPLEMENTATION AUTHORISATION.
