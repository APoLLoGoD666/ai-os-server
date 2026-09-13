# APEX INTERFACE CONVERGENCE MASTERPLAN

**Document ID:** APEX-INTERFACE-CONVERGENCE-MASTERPLAN  
**Date:** 2026-08-28  
**Status:** AUTHORITATIVE — PLANNING ONLY  
**Evidence basis:** BETA-LEGACY-INTERFACE-CONVERGENCE-RECONNAISSANCE.md, POST-UX-19-PRODUCTION-GAP-INVENTORY.md, RX-01 through RX-07 certifications, PHASE-A-CERTIFICATION.md, GAP-29-SVG-ASSET-REQUIREMENTS.md, GAP-29-DESIGN-DECISION-RECORD.md  

---

## SECTION 1 — EXECUTIVE TARGET

**ONE APEX. ONE CANONICAL INTERFACE.**

The APEX AI OS has one production frontend: `public/dashboard.html`. The convergence programme's terminal state is a single, internally consistent, fully converged interface that:

- Contains **one navigation system** (not two coexisting systems)
- Contains **one CSS token namespace** (`--ax-*`, canonical) with **one `:root` block**
- Contains **one JS initialisation path** (no parallel Beta + Legacy bootloops)
- Presents **SVG icons** in all nav buttons (no emoji glyphs)
- Renders **20 canonical pages** from `pages[]` — no orphans, no dead registrations
- Has **zero duplicate polling registrations** for any panel
- Has **zero orphan DOM nodes** unreachable from any navigation surface
- Has **complete beta surfaces** for all P0 and P1 gaps
- Satisfies **all UX authority specifications** from UX-05 through UX-19

No second dashboard will be introduced. No second navigation system. No second JS runtime. No second event bus. No second governance runtime. No second memory system.

This document is the authoritative execution plan for reaching that terminal state from the current certified baseline.

---

## SECTION 2 — CURRENT CERTIFIED STATE

### 2.1 RX Programme (RX-01 through RX-07): ALL CERTIFIED

The following reconciliation sprints have been certified closed. Their test suites pass as of Phase A.

| Sprint | Scope | Status | Test Suite |
|--------|-------|--------|------------|
| RX-01 | Initial production baseline | CERTIFIED | Included in RX-02+ regression |
| RX-02 | Foundation gaps | CERTIFIED | `tests/rx-02-p1.test.js` — 4 groups PASS |
| RX-03 | Core surface gaps | CERTIFIED | `tests/rx-03-p1.test.js` — 10 groups PASS |
| RX-04 | Memory, agent, token wiring | CERTIFIED | `tests/rx-04-p1.test.js` — 13 groups PASS |
| RX-05 | Event infrastructure | CERTIFIED | `tests/rx-05-p1.test.js` — 15 groups PASS |
| RX-06 | Constitutional/governance surface | CERTIFIED | `tests/rx-06-p1.test.js` — 13 groups PASS |
| RX-07 | Voice controls + font retirement | CERTIFIED | `tests/rx-07-p1.test.js` — 13 groups PASS |

### 2.2 Phase A (Zero-Dependency Cleanup): PARTIALLY COMPLETE

| Item | Description | Status |
|------|-------------|--------|
| A-1 | `page-browser` orphan DOM node removed | **COMPLETE** |
| A-2 | 4 duplicate `_addInterval` calls removed | **COMPLETE** |
| A-3 | GAP-27 CSS `:root` consolidation | **BLOCKED — per-block targets required** |

### 2.3 Production File State

| File | Lines (approx.) | Notes |
|------|-----------------|-------|
| `public/dashboard.html` | ~22,244 | Post-RX-07 + Phase A-1 + A-2 |
| `server.js` | Unchanged since RX-07 | Not modified in Phase A |
| All other files | Unchanged | Not in Phase A scope |

### 2.4 Gaps Closed by Certified Sprints

| Gap | Description | Closed By |
|-----|-------------|-----------|
| GAP-02 | Voice-state notification suppression | RX-07 |
| GAP-03 | Notification deduplication ring buffer | RX-07 |
| GAP-04 | Attention budget enforcement | RX-07 |
| GAP-05 | Domain token application (`--apex-color-*` wired) | RX-04 |
| GAP-09 | Agent capability/authority matrix display | RX-04 |
| GAP-14 | Memory inspection panel frontend surface | RX-04 |
| GAP-17 | Constitutional dashboard frontend surface | RX-06 |
| GAP-18 | `ExecutionContext.constitution` API propagation | RX-06 |
| GAP-19 | Constitutional audit log route | RX-06 |
| GAP-21 | `correlation_id` in event bus payloads | RX-05 |
| GAP-28 | Retired font removal (IBM Plex Sans, Space Grotesk) | RX-07 |

Additional gaps from GAP-01–GAP-32 not listed as open after RX-07 and not listed above are confirmed closed by RX-01 through RX-06. See individual RX certifications for exact attribution.

---

## SECTION 3 — COMPLETE GAP REGISTER

Status column reflects state as of 2026-08-28, post-RX-07, post-Phase-A.

| Gap ID | Description | Class | Priority | Status | Convergence Phase |
|--------|-------------|-------|----------|--------|-------------------|
| **GAP-01** | L0-L4 progressive disclosure architecture | F | P3 | **OPEN — design required** | Phase C |
| **GAP-02** | Voice-state notification suppression | F | P3 | **CLOSED (RX-07)** | — |
| **GAP-03** | Notification deduplication ring buffer | F | P3 | **CLOSED (RX-07)** | — |
| **GAP-04** | Attention budget enforcement | F | P3 | **CLOSED (RX-07)** | — |
| **GAP-05** | Domain token application | A | P2 | **CLOSED (RX-04)** | — |
| **GAP-06** | Knowledge panel frontend surface | C or B* | P2 | **OPEN — blocked by GAP-32 verification** | Post-Phase-F |
| **GAP-07** | Intelligence panel frontend surface | C | P2 | **OPEN — backend route missing** | Post-Phase-F |
| **GAP-08** | Health agent surface | I | P3 | **OPEN DECISION — agent not in production** | Post-Phase-F |
| **GAP-09** | Agent capability/authority matrix display | B | P2 | **CLOSED (RX-04)** | — |
| **GAP-10** | Task rejection route (`POST /api/tasks/:id/reject`) | C | P1 | **CLOSED (prior RX)** | — |
| **GAP-11** | Undo route (expose `pgMarkAgentActionUndone`) | C | P2 | **CLOSED (prior RX)** | — |
| **GAP-12** | `pgInsertApproval()` audit wiring verification | B | P0 | **CLOSED (prior RX)** | — |
| **GAP-13** | Standing approvals route | C | P1 | **CLOSED (prior RX)** | — |
| **GAP-14** | Memory inspection panel frontend surface | C | P2 | **CLOSED (RX-04)** | — |
| **GAP-15** | Memory correction route (`PATCH /api/memory/:id`) | C | P2 | **OPEN — unscheduled** | Scheduling required (§8) |
| **GAP-16** | Memory deletion route (`DELETE /api/memory/:id`) | C | P2 | **OPEN — unscheduled** | Scheduling required (§8) |
| **GAP-17** | Constitutional dashboard frontend surface | D | P2 | **CLOSED (RX-06)** | — |
| **GAP-18** | `ExecutionContext.constitution` API propagation | D | P2 | **CLOSED (RX-06)** | — |
| **GAP-19** | Constitutional audit log route | C | P2 | **CLOSED (RX-06)** | — |
| **GAP-20** | Viz-broadcaster event type expansion | E | P1 | **CLOSED (prior RX)** | — |
| **GAP-21** | `correlation_id` in event bus payloads | E | P2 | **CLOSED (RX-05)** | — |
| **GAP-22** | Historical event query API | C | P2 | **OPEN — unscheduled** | Scheduling required (§8) |
| **GAP-23** | Full 17-category event taxonomy live data | E | P1 | **CLOSED (prior RX)** | — |
| **GAP-24** | Bottom sheet slide-up component | F | P3 | **OPEN — blocked by GAP-01** | Phase C |
| **GAP-25** | 5-tab persistent bottom nav bar | H | P3 | **OPEN — design required** | Phase D |
| **GAP-26** | Safe-area FAB | H | P3 | **CLOSED (prior RX) or deferred** | — |
| **GAP-27** | Style block consolidation (7 `:root` blocks → 1) | G | P3 | **OPEN — per-block targets required** | Phase F / GAP-27 Track (§9) |
| **GAP-28** | Retired font removal | G | P2 | **CLOSED (RX-07)** | — |
| **GAP-29** | SVG icon system | G | P3 | **OPEN — SVG assets not delivered** | Phase B |
| **GAP-30** | Domain page quality standardisation | H | P3 | **OPEN — quality standard not defined** | Post-Phase-F |
| **GAP-31** | Agent grid architecture decision (OPEN-001) | I | P2 | **OPEN DECISION — product decision pending** | Phase D or separate |
| **GAP-32** | `/api/knowledge` route existence verification | I | P0 | **OPEN — verification action required** | Immediate (pre-Phase-B) |

*GAP-06 classification (C or B) depends on GAP-32 verification outcome.

### 3.1 Open Gap Summary

| Status | Count | Gaps |
|--------|-------|------|
| OPEN (design required) | 2 | GAP-01, GAP-25 |
| OPEN (assets required) | 1 | GAP-29 |
| OPEN (per-block targets required) | 1 | GAP-27 |
| OPEN (unscheduled backend routes) | 3 | GAP-15, GAP-16, GAP-22 |
| OPEN (verification action) | 1 | GAP-32 (P0) |
| OPEN DECISION | 2 | GAP-08, GAP-31 |
| OPEN (blocked upstream) | 3 | GAP-06 (→GAP-32), GAP-07, GAP-24 (→GAP-01) |
| OPEN (not yet defined) | 1 | GAP-30 |
| **TOTAL OPEN** | **14** | |

---

## SECTION 4 — LEGACY/BETA CONVERGENCE STATE

### 4.1 Architecture Classification: OPTION C

The current `public/dashboard.html` contains **two coexisting UI systems** that both initialise unconditionally on every page load:

| System | Layer | Elements |
|--------|-------|---------|
| **Legacy** | Polling-based, 14-page DOM | 14+ `<div class="page">` nodes, `setInterval`/`_addInterval` refresh loops, `switchPage()` chain with 13 monkey-patch wrappers |
| **Beta** | Command/Orb, event-driven | `page-command` (default active), 11-state orb, voice system, Beta-exclusive JS initialisation |

Both systems share one `pages[]` array, one `switchPage()` function, one navigation rail, and one event bus (`lib/event-bus.js`). They are not separated — they are interleaved across 22,000+ lines.

### 4.2 Convergence State Map

| Dimension | Current State | Target State |
|-----------|--------------|-------------|
| DOM systems | 2 coexisting (Legacy 14-page + Beta command/orb) | 1 canonical system |
| Page count (registered) | 20 in `pages[]` | 20 in `pages[]` |
| Page count (orphans) | 0 (page-browser removed in A-1) | 0 |
| Navigation systems | 1 rail shared, 2 JS systems branching from it | 1 navigation system |
| Nav icons | Unicode emoji glyphs | SVG sprite icons |
| CSS `:root` blocks | 7 overlapping (GAP-27) | 1 canonical `--ax-*` block |
| CSS `<style>` blocks | 8+ | 1 (Phase F target) |
| JS init paths | 2 (Beta boots + Legacy boots simultaneously) | 1 |
| `switchPage()` | Original + 13 monkey-patch wrappers (lines 12801 + 17791–22269) | 1 canonical implementation |
| Polling registrations | De-duplicated (A-2 complete) | Retained as-is through Phase E |
| Orphan DOM nodes | 0 (A-1 complete) | 0 |
| Dead JS functions | `window.browserAction`, `window.browserFill` (dead code post-A-1) | Removed (Phase E or F) |

### 4.3 switchPage() Chain: Critical Fragility

The `switchPage()` function begins at line 12801. It has been monkey-patched 13 times at lines 17791–22269. Each wrapper calls the previous wrapper. A throw in any wrapper prevents all subsequent page initialisations. This chain is the highest-risk single point of failure in the convergence work. Phase D (navigation consolidation) must resolve this chain.

### 4.4 20 Canonical Pages

```
pages[] = [
  'command', 'overview', 'operation', 'system', 'finance',
  'communication', 'business', 'health', 'university', 'occult',
  'research', 'civilisation', 'reality', 'activity', 'agents',
  'approvals', 'knowledge', 'intelligence', 'memory', 'governance'
]
```

All 20 are registered. `nav-more` is permanently hidden (`style="display:none"` + CSS `!important` at line 338); it is not a page and not in `pages[]`.

---

## SECTION 5 — MASTER EXECUTION PHASES

Each phase is a discrete authorisation unit. No phase begins without explicit written authorisation. No phase infers scope from an adjacent phase.

### Phase A — Zero-Dependency Cleanup

**Status:** PARTIALLY COMPLETE  
**Prerequisite:** None  
**File scope:** `public/dashboard.html` only  

| Item | Description | Status |
|------|-------------|--------|
| A-1 | Remove `page-browser` orphan DOM node | **COMPLETE** |
| A-2 | Deduplicate 4 `_addInterval` polling registrations | **COMPLETE** |
| A-3 | GAP-27 CSS `:root` consolidation (sub-item) | **BLOCKED — per-block targets required** |

**To complete Phase A:** Provide explicit per-block targets for GAP-27 (see §9).

---

### Phase B — SVG Icon System (GAP-29)

**Status:** BLOCKED  
**Prerequisite:** Full 20-icon SVG asset set delivered + 4 implementation decisions resolved  
**File scope:** `public/dashboard.html` — nav buttons only  
**Risk:** Medium. Structural replacement of `<span class="nav-icon">` emoji content. No JS changes.

**What Phase B delivers:**
- Replace 20 Unicode emoji glyphs in `.nav-btn` elements with SVG `<use>` references
- Add `<svg id="ds-icon-sprite">` containing 20 `<symbol>` definitions to `<body>`
- CSS: add `height: 18px` to `.nav-icon svg` rule (no competing `!important` exists for height)
- All icons: `viewBox="0 0 20 20"`, `stroke-width="1.5"`, `stroke-linecap="round"`, `stroke-linejoin="round"`, `fill="none"`, `stroke="currentColor"`
- Symbol ID convention: `icon-{page-name}` matching `pages[]` exactly

**Blockers (all must be resolved before Phase B can begin):**
1. 15 icon SVG paths not delivered (new artwork required)
2. 5 prototype paths not formally approved for production use
3. `href` vs `xlink:href` decision not made (REQUIRES EXPLICIT DECISION — see §6)
4. Sprite location not decided (inline in `<body>` vs. external `.svg` file — see §6)

**Phase B is blocked until GAP-29 Asset Delivery Track (§7) is complete.**

---

### Phase C — Progressive Disclosure (GAP-01)

**Status:** BLOCKED  
**Prerequisite:** GAP-01 design phase deliverable (L0-L4 state machine contract)  
**File scope:** `public/dashboard.html` — card-based surfaces  
**Risk:** High. New architectural system. Cannot be added as a patch.

**What Phase C delivers:**
- L0-L4 disclosure state machine (L0 ambient, L1 summary card, L2 detail sheet, L3 full surface, L4 expert/raw)
- Bottom sheet slide-up component (GAP-24) — depends on L0-L4 contract
- Transition animation system
- Applied to: activity cards, agent cards, approval cards

**Phase C is blocked until GAP-01 design specification is provided.**

---

### Phase D — Navigation Consolidation (GAP-25 + switchPage resolution)

**Status:** BLOCKED (depends on Phase C)  
**Prerequisite:** Phase C complete + GAP-25 design specification (5-tab mobile nav) + GAP-31 decision  
**File scope:** `public/dashboard.html` — navigation HTML, CSS, JS  
**Risk:** Very high. Structural replacement of nav system. Touches `switchPage()` chain.

**What Phase D delivers:**
- Collapse 13 `switchPage()` monkey-patch wrappers into one canonical implementation
- Replace hamburger→dropdown pattern with 5-tab persistent bottom nav at ≤640px (GAP-25)
- Resolve GAP-31 (agent grid architecture): page-system vs. page-agents scope decision
- Browser regression suite required before this phase (visual regression risk)

**Phase D is blocked until Phase C is certified and GAP-25 design is provided.**

---

### Phase E — Legacy Page Retirement

**Status:** BLOCKED (depends on Phase D)  
**Prerequisite:** Phase D certified  
**File scope:** `public/dashboard.html` — legacy page DOM nodes and associated JS  
**Risk:** High. Irreversible page removal. Requires explicit per-page authorisation.

**What Phase E delivers:**
- Retirement of legacy-only pages that have been superseded by Beta equivalents (per-page list TBD at authorisation time — do NOT infer now)
- Removal of associated dead JS (polling functions, monkey-patch wrappers for retired pages)
- Removal of `window.browserAction`, `window.browserFill` dead code (left from Phase A-1)
- One `pages[]` entry removed per retired page; `pageMeta` updated accordingly
- `switchPage()` simplified as dead cases are removed

**Phase E requires explicit per-page retirement authorisation. No page may be retired by inference.**

---

### Phase F — CSS Block Consolidation (GAP-27 remainder)

**Status:** BLOCKED (depends on Phase E + automated visual regression tests)  
**Prerequisite:** Phase E certified + automated screenshot-diff regression suite confirmed working  
**File scope:** `public/dashboard.html` — all `<style>` blocks  
**Risk:** Critical. Any cascade reordering across 22,000 lines can cause silent visual breakage. No safe implementation without visual regression tests.

**What Phase F delivers:**
- 7 overlapping `:root` blocks → 1 canonical `--ax-*` block
- 8+ `<style>` blocks → 1 canonical `<style>` block
- Satisfies INV-VS-02 (single canonical style block requirement)

**Phase F is blocked until:**
1. Phase E is certified (page count reduced, reducing cascade complexity)
2. Automated visual regression test suite is in place (screenshot diff per page)
3. GAP-27 per-block targets are explicitly provided (§9)

---

### Post-Phase-F — Remaining Open Gaps

After Phase F, the following open gaps are addressed in a subsequent planning phase:

| Gap | Description | Class |
|-----|-------------|-------|
| GAP-06 | Knowledge panel frontend surface | C or B (pending GAP-32) |
| GAP-07 | Intelligence panel frontend surface | C |
| GAP-08 | Health agent surface | I (decision required) |
| GAP-15 | Memory correction route | C |
| GAP-16 | Memory deletion route | C |
| GAP-22 | Historical event query API | C |
| GAP-30 | Domain page quality standardisation | H |
| GAP-31 | Agent grid architecture | I (decision required) |
| GAP-32 | `/api/knowledge` route verification | I (verification action) |

These are not blocked by Phases A-F but require separate scheduling.

---

## SECTION 6 — DESIGN/DECISION GATES

The following decisions are explicitly unresolved. No implementation may proceed past the gate that depends on each decision. No agent or developer may infer the resolution — explicit instruction is required.

### Gate 1 — `href` vs `xlink:href` in SVG `<use>` elements (GAP-29)

**Status: UNRESOLVED — BLOCKS PHASE B**  
**Evidence:** The reconnaissance document specifies `xlink:href`. The entire codebase (`public/dashboard.html` and `docs/interface/prototype/apex-command-prototype.html`) contains zero uses of `xlink` or `xmlns:xlink`. The `xlink:href` attribute is deprecated in SVG 2.0. `href` is the SVG 2.0 standard and is universally supported by current browsers.  
**Decision required:** Use `href` (SVG 2.0, no namespace, universally supported) OR `xlink:href` (SVG 1.1, requires `xmlns:xlink` namespace declaration, deprecated).  
**Recommendation (to be confirmed):** `href` — consistent with prototype, consistent with codebase, SVG 2.0 compliant.

### Gate 2 — SVG Sprite Location (GAP-29)

**Status: UNRESOLVED — BLOCKS PHASE B**  
**Options:**  
- (A) Inline `<svg id="ds-icon-sprite" style="display:none">` at top of `<body>` — no external request, consistent with ONE-APEX single-file principle  
- (B) External `/public/icons.svg` file — enables browser caching, requires a server route  
**Decision required:** Inline (A) or external (B).  
**Recommendation (to be confirmed):** Inline (A) — consistent with ONE-APEX single-file principle.

### Gate 3 — Prototype Icon Approvals (GAP-29)

**Status: PARTIALLY RESOLVED — 5 prototype paths exist; formal approval pending**  
Five prototype icons exist in `docs/interface/prototype/apex-command-prototype.html` lines 1153–1196. They require explicit approval before production use:

| Icon | Prototype Path | Mapping | Approval |
|------|---------------|---------|---------|
| command | `<polygon points="10,2 12.5,8.5 19,9.5 14.5,14 15.9,20 10,17 4.1,20 5.5,14 1,9.5 7.5,8.5"/>` | → `icon-command` | REQUIRED |
| knowledge | Book with lines | → `icon-knowledge` | REQUIRED |
| system | Terminal/monitor | → `icon-system` | REQUIRED |
| world | Globe (Phase D retirement candidate) | → `icon-overview` candidate | AMBIGUOUS — decision required |
| decisions | Stacked layers (Phase D retirement candidate) | → `icon-approvals` candidate | AMBIGUOUS — decision required |

### Gate 4 — 15 New Icon Paths (GAP-29)

**Status: NOT DELIVERED — BLOCKS PHASE B**  
15 icons require new SVG artwork. See §7 for full list.

### Gate 5 — GAP-01 Design Phase (Progressive Disclosure)

**Status: OPEN — BLOCKS PHASE C**  
The L0-L4 disclosure state machine (UX-08) has never been designed as an implementable specification. A dedicated design phase must produce:
- L0-L4 state machine contract
- Component API for bottom sheet (GAP-24)
- Transition animation spec

### Gate 6 — GAP-25 Mobile Nav Design (5-Tab Bottom Bar)

**Status: OPEN — BLOCKS PHASE D**  
UX-18 §4 specifies a 5-tab persistent bottom nav at ≤640px. The specific 5 tabs, their ordering, and the icon/label assignments for mobile have not been specified in an implementable form.

### Gate 7 — GAP-31 Agent Grid Architecture

**Status: OPEN DECISION — affects Phase D scope**  
Three options (a) move grid to page-agents; (b) duplicate; (c) keep system page as-is. Must be decided before Phase D to scope the navigation consolidation correctly.

### Gate 8 — GAP-27 Per-Block Targets (CSS `:root`)

**Status: BLOCKED — BLOCKS PHASE A-3 AND PHASE F**  
7 overlapping `:root` blocks must have explicit per-block authorisation specifying which block is the survivor, which are removed, and which properties migrate. See §9.

---

## SECTION 7 — ASSET DELIVERY TRACK (GAP-29)

Phase B cannot begin until all 20 icon SVG paths are delivered. This section defines the complete delivery requirement.

### 7.1 Technical Contract (non-negotiable)

All icons must conform to:

```
viewBox="0 0 20 20"
stroke-width="1.5"
stroke-linecap="round"
stroke-linejoin="round"
fill="none"
stroke="currentColor"
```

Rendered container: `.nav-icon { width: 18px !important; }` (established at lines 6578 and 7921 — both agree).  
SVG height must be set in Phase B CSS: `height: 18px` on `.nav-icon svg` (no competing rule exists).

### 7.2 Complete 20-Icon Delivery Requirement

| # | Page | Symbol ID | Current Glyph | Source | Status |
|---|------|-----------|---------------|--------|--------|
| 1 | command | `icon-command` | ⬡ | Prototype (star polygon) | AWAITING APPROVAL |
| 2 | overview | `icon-overview` | ◈ | Prototype or new (world/globe ambiguous) | DECISION REQUIRED |
| 3 | operation | `icon-operation` | ⊞ | New artwork required | NOT DELIVERED |
| 4 | system | `icon-system` | ⟨/⟩ | Prototype (terminal/monitor) | AWAITING APPROVAL |
| 5 | finance | `icon-finance` | ₿ | New artwork required | NOT DELIVERED |
| 6 | communication | `icon-communication` | ✉ | New artwork required | NOT DELIVERED |
| 7 | business | `icon-business` | ⊗ | New artwork required | NOT DELIVERED |
| 8 | health | `icon-health` | ♡ | New artwork required | NOT DELIVERED |
| 9 | university | `icon-university` | ⊙ | New artwork required | NOT DELIVERED |
| 10 | occult | `icon-occult` | ☽ | New artwork required | NOT DELIVERED |
| 11 | research | `icon-research` | ◎ | New artwork required | NOT DELIVERED |
| 12 | civilisation | `icon-civilisation` | ⌖ | New artwork required | NOT DELIVERED |
| 13 | reality | `icon-reality` | ◉ | New artwork required | NOT DELIVERED |
| 14 | activity | `icon-activity` | ⊛ | New artwork required | NOT DELIVERED |
| 15 | agents | `icon-agents` | ⟁ | New artwork required | NOT DELIVERED |
| 16 | approvals | `icon-approvals` | ✓ | Prototype or new (decisions/stacked ambiguous) | DECISION REQUIRED |
| 17 | knowledge | `icon-knowledge` | ◈ | Prototype (book) | AWAITING APPROVAL |
| 18 | intelligence | `icon-intelligence` | ◈ | New artwork required | NOT DELIVERED |
| 19 | memory | `icon-memory` | ◈ | New artwork required | NOT DELIVERED |
| 20 | governance | `icon-governance` | ⚖ | New artwork required | NOT DELIVERED |

*Note: Multiple pages share `◈` glyph currently — this is a pre-existing duplication that SVG icons will resolve.

### 7.3 Delivery Checklist (must be 100% complete before Phase B authorisation)

- [ ] Gate 1 resolved: `href` vs `xlink:href` decision made
- [ ] Gate 2 resolved: sprite location (inline vs. external) decided
- [ ] `icon-command` prototype path formally approved
- [ ] `icon-system` prototype path formally approved
- [ ] `icon-knowledge` prototype path formally approved
- [ ] `icon-overview` mapping resolved (world/globe or new design)
- [ ] `icon-approvals` mapping resolved (decisions/stacked or new design)
- [ ] 15 new icon SVG paths delivered for: operation, finance, communication, business, health, university, occult, research, civilisation, reality, activity, agents, intelligence, memory, governance
- [ ] All 20 icons verified against technical contract (viewBox, stroke, fill)

### 7.4 Integration Pattern

When Phase B is authorised and all assets delivered, the integration pattern is:

```html
<!-- In <body>, before first <div class="page"> -->
<svg id="ds-icon-sprite" xmlns="http://www.w3.org/2000/svg" style="display:none">
  <symbol id="icon-command" viewBox="0 0 20 20"><!-- paths --></symbol>
  <!-- ... 19 more symbols ... -->
</svg>

<!-- In each .nav-btn, replacing the emoji <span>: -->
<span class="nav-icon">
  <svg aria-hidden="true"><use href="#icon-{page-name}"/></svg>
</span>
```

(Use `xlink:href` instead of `href` only if Gate 1 resolves that way.)

---

## SECTION 8 — GAP-15/16/22 SCHEDULING

Three backend routes remain unscheduled. They are not blocked by Phases A-F (they are independent of the convergence sequence) but must be assigned to a sprint before any production beta that exposes the memory or observability surfaces.

### GAP-15 — Memory Correction Route

**Description:** `PATCH /api/memory/:id` or equivalent — expose `pgMarkAgentActionUndone()` or a write mutation for recorded memory facts.  
**UX authority:** UX-15  
**Blocking:** Full UX-15 compliance (read-only memory panel exists from RX-04; write operations blocked until this route exists)  
**File:** `lib/memory/helpers.js` (logic) + new public route (file TBD)  
**Required action:** Assign to next backend sprint. Define route contract (body schema, auth, idempotency).

### GAP-16 — Memory Deletion Route

**Description:** `DELETE /api/memory/:id` or equivalent — allow user-initiated memory removal.  
**UX authority:** UX-15  
**Blocking:** UX-15 deletion flow  
**File:** New public route (file TBD)  
**Required action:** Assign to next backend sprint alongside GAP-15 (same surface).

### GAP-22 — Historical Event Query API

**Description:** Paginated event log beyond the current 20-task `GET /api/timeline` window. Date-range query and/or full-text search over past events.  
**UX authority:** UX-17  
**Blocking:** Historical observability surface  
**File:** New backend route (likely `src/routes/` or new `routes/events.js`)  
**Required action:** Assign to backend sprint. Define pagination contract (cursor vs. offset, page size, date-range params).

**Scheduling requirement:** These 3 gaps must be explicitly assigned to a named sprint before production beta launch. They may be scheduled in parallel with Phases B-F since they are backend-only and do not modify `public/dashboard.html`.

---

## SECTION 9 — GAP-27 TRACK (CSS `:root` CONSOLIDATION)

GAP-27 is tracked separately from Phase F because it requires a decision input (per-block targets) that can arrive independently of Phase E completion. Once targets are provided, the work can be sequenced as Phase A-3 (if done early) or Phase F (as the terminal CSS cleanup).

### 9.1 Current State

7 overlapping `:root` blocks exist in `public/dashboard.html`. They contain redundant, partially overlapping, and partially conflicting CSS custom property definitions. INV-VS-02 requires a single canonical `:root` block using the `--ax-*` namespace.

### 9.2 What Is Required Before Any GAP-27 Implementation

Explicit specification of **each of the 7 blocks**, identified by:
- CSS block number (1–7) OR line range (e.g., lines 1234–1267)
- Disposition: **SURVIVOR** (one block only), **REMOVE** (redundant, no unique properties), or **MIGRATE** (unique properties move to the survivor block)
- For MIGRATE blocks: which properties move and their canonical `--ax-*` names in the survivor

No agent or developer may infer which blocks to keep or remove. The block count (7) and target namespace (`--ax-*`) are known; the per-block decisions are not.

### 9.3 Implementation Constraint

Phase F includes GAP-27 as its primary deliverable. However, if per-block targets are provided before Phase E, GAP-27 (item A-3) may be authorised as a standalone Phase A completion item. The work is the same either way; the sequencing depends on when targets are delivered.

### 9.4 Visual Regression Requirement

GAP-27 implementation — regardless of when it is sequenced — requires a browser-based smoke test across all 20 pages after consolidation. Any cascade reordering can silently break styles. A full screenshot-diff regression suite is required before Phase F; a page-by-page manual smoke test is the minimum acceptable for A-3.

---

## SECTION 10 — FINAL INTERFACE QUALITY GATE

Before the convergence programme is declared complete, all of the following conditions must hold simultaneously. This is the terminal acceptance criterion.

### 10.1 Structural

| Check | Criterion |
|-------|-----------|
| ONE-APEX | `public/dashboard.html` is the sole production frontend artifact |
| No second dashboard | Zero additional HTML files in `public/` serving UI |
| No second nav | `switchPage()` — one implementation, zero monkey-patch wrappers |
| No orphan DOM | Zero `<div class="page">` nodes absent from `pages[]` |
| No dead polling | Zero `setInterval`/`_addInterval` calls for retired or non-existent panels |
| No dead JS | `window.browserAction`, `window.browserFill` and all other dead code removed |
| No dead `:root` | Exactly one `:root` block, using `--ax-*` namespace exclusively |
| No dead `<style>` | Exactly one `<style>` block in `<head>` |

### 10.2 Navigation

| Check | Criterion |
|-------|-----------|
| 20 canonical pages | `pages[]` length === 20 |
| SVG icons | All 20 `.nav-btn` elements contain `<svg aria-hidden="true"><use href="#icon-{name}"/></svg>` |
| No emoji glyphs | Zero Unicode emoji in `.nav-icon` spans |
| `ds-icon-sprite` present | `<svg id="ds-icon-sprite">` with 20 `<symbol>` definitions present |
| `nav-more` excluded | `nav-more` button has `style="display:none"` and is absent from `pages[]` |

### 10.3 Gap Compliance

| Check | Criterion |
|-------|-----------|
| P0 gaps | Zero open P0 gaps |
| P1 gaps | Zero open P1 gaps |
| GAP-27 | CLOSED — single `:root` block with `--ax-*` namespace |
| GAP-29 | CLOSED — SVG sprite with 20 symbols, emoji replaced |
| GAP-01 | CLOSED — L0-L4 disclosure state machine implemented |
| GAP-25 | CLOSED — 5-tab bottom nav at ≤640px |
| GAP-15, 16, 22 | SCHEDULED and CLOSED |

### 10.4 Regression Suites

| Check | Criterion |
|-------|-----------|
| All RX suites | RX-02 through RX-07 + any new Phase suites: ALL PASS |
| Visual regression | Screenshot-diff clean across all 20 pages |
| Browser smoke test | All 20 pages reachable via `switchPage('{name}')` |
| ONE-APEX integrity | All 9 ONE-APEX integrity checks PASS (from Phase A certification model) |

---

## SECTION 11 — FINAL DEFINITION OF DONE

Complete checklist. Every item must be checked before the convergence programme is declared closed.

### Phase A
- [x] `page-browser` DOM node absent
- [x] 4 duplicate `_addInterval` calls absent
- [ ] GAP-27 per-block targets received and implemented (A-3)

### Phase B
- [ ] All 20 icon SVG paths delivered
- [ ] `href` vs `xlink:href` decision made
- [ ] Sprite location decided
- [ ] `<svg id="ds-icon-sprite">` with 20 `<symbol>` elements present in `<body>`
- [ ] All 20 `.nav-btn` elements use `<svg><use href="#icon-{name}"/></svg>`
- [ ] Zero emoji glyphs in nav buttons
- [ ] GAP-29 CLOSED

### Phase C
- [ ] GAP-01 design specification received
- [ ] L0-L4 state machine implemented
- [ ] Bottom sheet component implemented (GAP-24)
- [ ] GAP-01 CLOSED, GAP-24 CLOSED

### Phase D
- [ ] GAP-25 design specification received
- [ ] GAP-31 product decision made
- [ ] 5-tab bottom nav implemented at ≤640px
- [ ] `switchPage()` monkey-patch chain collapsed to one implementation
- [ ] GAP-25 CLOSED, GAP-31 CLOSED

### Phase E
- [ ] Explicit per-page retirement list received
- [ ] All authorised legacy pages retired
- [ ] All associated dead JS removed
- [ ] `window.browserAction`, `window.browserFill` removed
- [ ] `pages[]` updated to reflect retirement

### Phase F
- [ ] Visual regression test suite in place
- [ ] GAP-27 per-block targets received
- [ ] 7 `:root` blocks → 1 canonical `--ax-*` block
- [ ] 8+ `<style>` blocks → 1 canonical `<style>` block
- [ ] INV-VS-02 CLOSED, GAP-27 CLOSED

### Backend / Scheduling
- [ ] GAP-32 verified (knowledge route existence confirmed)
- [ ] GAP-15 scheduled and closed
- [ ] GAP-16 scheduled and closed
- [ ] GAP-22 scheduled and closed

### Post-Convergence Open Work
- [ ] GAP-06 closed (knowledge panel — pending GAP-32)
- [ ] GAP-07 closed (intelligence panel)
- [ ] GAP-08 decided (health agent)
- [ ] GAP-30 closed (domain page quality)

### Terminal Quality Gate
- [ ] All Section 10 structural checks pass
- [ ] All Section 10 navigation checks pass
- [ ] All Section 10 gap compliance checks pass
- [ ] All Section 10 regression suites pass

---

## SECTION 12 — DEPENDENCY GRAPH

Edges represent "must complete before". Read left to right.

```
GAP-32 verification
    └── GAP-06 (knowledge panel)

GAP-29 asset delivery [20 icons + 4 decisions]
    └── Phase B (SVG icons)
            └── [Phase B certified]

GAP-01 design phase
    └── Phase C (progressive disclosure + GAP-24 bottom sheet)
            └── Phase D (nav consolidation + GAP-25 + GAP-31)
                    └── Phase E (legacy page retirement)
                            └── Phase F (CSS block consolidation)
                                    └── CONVERGENCE COMPLETE

GAP-27 per-block targets
    └── Phase A-3 OR Phase F (either sequencing)
            └── Phase F (CSS block consolidation)

GAP-25 design phase
    └── Phase D

GAP-31 product decision
    └── Phase D

Visual regression test suite
    └── Phase F

GAP-15 + GAP-16 scheduling
    └── [backend sprint — independent of Phases A-F]

GAP-22 scheduling
    └── [backend sprint — independent of Phases A-F]
```

### Critical Path

The critical path to convergence:

```
GAP-01 design → Phase C → Phase D → Phase E → Phase F → DONE
```

Phase B (GAP-29) is on a parallel track. It is not on the critical path to full convergence but is required for the navigation quality gate (SVG icons are a terminal acceptance criterion).

The critical input bottleneck: **GAP-01 design phase** — nothing in Phases C through F can begin without it.

---

## SECTION 13 — AUTHORISATION MODEL

### 13.1 Rules

1. **One phase at a time.** No phase begins without explicit written authorisation naming the phase.
2. **Certification before proceeding.** Each phase produces a certification document (modelled on PHASE-A-CERTIFICATION.md) before the next phase is authorised.
3. **No scope inference.** If the authorisation does not explicitly name a file, function, element, or block, it is out of scope. The instruction "do not infer missing requirements" is absolute.
4. **No silent decisions.** Any decision gate (§6) encountered during implementation that is not explicitly resolved in the authorisation text must be reported as a blocker — not resolved by the implementer.
5. **Per-page authorisation for Phase E.** Each page retired in Phase E requires explicit naming in the authorisation. No page may be inferred as "obviously removable."
6. **Per-block authorisation for GAP-27.** Each `:root` block disposition (SURVIVOR / REMOVE / MIGRATE) must be explicitly named. No block may be inferred.
7. **Safety rules always apply.** From CLAUDE.md: never auto-delete, never auto-rename, never change environment variables, never allow agent to edit code without explicit approval. These apply during all phases without exception.

### 13.2 Authorisation Document Format (required for each phase)

Each phase authorisation must specify:
- Phase letter and name
- Explicit file(s) that may be modified
- Explicit scope (what is in and what is out)
- Explicit hard stop condition
- Explicit certification document name to create

### 13.3 Certification Document Format (required after each phase)

Each phase certification must record:
- Every file modified (file name, nature of change)
- Every check performed (with pass/fail)
- All regression suites run (with results)
- All deviations from authorisation (with justification)
- All files confirmed unmodified that were out of scope
- ONE-APEX integrity table

---

## SECTION 14 — NO-DRIFT RULE

**The No-Drift Rule is absolute and overrides all other convenience considerations.**

During any phase:
- Do not touch adjacent code not named in the authorisation
- Do not improve, reformat, or refactor code that is not broken
- Do not add comments to clarify code not in scope
- Do not remove code that appears "obviously dead" unless explicitly authorised
- Do not resolve decision gates by making a choice — report as a blocker
- Do not cascade a change to a second file unless the authorisation explicitly names that second file
- Do not implement a feature that seems obviously implied by the current change

Every changed line in every phase must trace directly to a specific item in the authorisation document. If a changed line cannot be traced, the change is out of scope and must be reverted.

The justification for this rule: the APEX codebase is 22,000+ lines, contains intricate cascade dependencies, and has a certified regression baseline. Undocumented changes — even apparently beneficial ones — introduce unverified state. The certification model only works if the scope is precisely known.

---

## SECTION 15 — FINAL ROADMAP

### Immediate Actions (no implementation — pre-phase decisions)

| Action | Blocks | Owner |
|--------|--------|-------|
| GAP-32: verify `/api/knowledge` route existence | GAP-06 classification | Developer |
| Gate 1: decide `href` vs `xlink:href` | Phase B | Product |
| Gate 2: decide sprite location (inline vs. external) | Phase B | Product |
| Gate 3: approve or reject 5 prototype icon paths | Phase B | Product/Design |
| Gate 4: deliver 15 new icon SVG paths | Phase B | Design |
| GAP-27: provide per-block `:root` targets | Phase A-3 / Phase F | Product |
| GAP-15/16/22: schedule in a backend sprint | Beta quality | Engineering |

### Convergence Sequence

| Phase | Prerequisite | Deliverable | Terminal Check |
|-------|-------------|-------------|----------------|
| A-3 | GAP-27 per-block targets | 7 `:root` → 1 (can precede B-F or wait for F) | A-3 certified |
| B | 20 icons + 4 decisions | SVG sprite + emoji replaced | Phase B certified |
| C | GAP-01 design | L0-L4 + bottom sheet | Phase C certified |
| D | Phase C + GAP-25 + GAP-31 | Nav consolidated + switchPage collapsed | Phase D certified |
| E | Phase D + per-page list | Legacy pages retired | Phase E certified |
| F | Phase E + visual regression suite + GAP-27 targets (if A-3 not done) | 1 `<style>` block, 1 `:root` block | Phase F certified |
| Post-F | Phase F | GAP-06, 07, 08, 30 closed | Individual certifications |
| Backend | Independent | GAP-15, 16, 22 closed | Sprint certifications |

### Parallel Tracks

Track 1 (Frontend convergence): Phase A-3 → B → C → D → E → F  
Track 2 (Asset delivery): GAP-29 icon design and delivery (precondition for Phase B)  
Track 3 (Backend routes): GAP-15, GAP-16, GAP-22 (independent, can run during any Phase)  
Track 4 (Decisions): GAP-01 design, GAP-25 design, GAP-31 decision, GAP-27 per-block targets

All tracks must converge before the terminal quality gate (§10) can be declared complete.

---

## SECTION 16 — FINAL HARD STOP

This document is **planning only**.

No file has been modified. No implementation has begun. No phase has been authorised beyond what is recorded in PHASE-A-CERTIFICATION.md (Phase A, items A-1 and A-2 complete; A-3 blocked).

The convergence work will proceed one phase at a time, under explicit written authorisation, producing a certification document after each phase, with no scope inference at any step.

---

*INTERFACE CONVERGENCE MASTERPLAN COMPLETE — IMPLEMENTATION NOT STARTED.*

*Document covers: Phase A through Phase F + Post-Phase-F + Backend tracks. All 32 gaps inventoried. All 8 decision gates documented. Dependency graph established. No implementation performed in this document.*
