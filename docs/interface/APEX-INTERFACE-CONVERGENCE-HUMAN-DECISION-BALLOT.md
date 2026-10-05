# APEX — INTERFACE CONVERGENCE HUMAN DECISION BALLOT

**Classification:** HUMAN DECISION DOCUMENT — READ-ONLY — NO IMPLEMENTATION
**Date:** 2026-08-28
**Source Document:** `docs/interface/APEX-INTERFACE-CONVERGENCE-PRODUCT-DESIGN-DECISION-PACK.md`
**Purpose:** Clean ballot surface. Twelve numbered decisions requiring human input. Recommendations shown where authority evidence exists; marked HUMAN DECISION REQUIRED where authority is absent.

---

## PART 1 — DECISION INVENTORY BY GROUP

### Group 1: Technical Decisions (human confirmation of authority-supported position)

| # | ID | Subject | Recommended |
|---|----|---------|-------------|
| 9 | FD-10 | apex-v2.css Phase F migration authorization | AUTHORIZE |
| 10 | FD-11 | Token namespace reconciliation strategy | OPTION A (BRIDGE) |

### Group 2: Product Decisions (require human product judgment)

| # | ID | Subject | Recommended |
|---|----|---------|-------------|
| 1 | FD-01 | Sprite location: inline vs external | OPTION A (inline) |
| 2 | FD-02 | icon-command prototype approval | HUMAN DECISION REQUIRED |
| 3 | FD-03 | icon-system prototype approval | HUMAN DECISION REQUIRED |
| 4 | FD-04 | Agent grid architecture (GAP-31) | HUMAN DECISION REQUIRED |
| 5 | FD-05 | Phase C implementation authorization | HUMAN DECISION REQUIRED |
| 11 | FD-12a | icon-knowledge prototype approval | HUMAN DECISION REQUIRED |
| 12 | FD-13 | Partial Phase B acceptability | OPTION A (full delivery required) |

### Group 3: Design Decisions (require design judgment on icon semantics and UX scope)

| # | ID | Subject | Recommended |
|---|----|---------|-------------|
| 6 | FD-06 | icon-overview icon mapping | HUMAN DECISION REQUIRED |
| 7 | FD-07 | icon-approvals icon mapping | HUMAN DECISION REQUIRED |
| 8 | FD-08 | GAP-25 mobile nav: produce spec or defer | HUMAN DECISION REQUIRED |

### Group 4: Asset Delivery Required (not a decision — creative output)

| ID | Subject | Blocking |
|----|---------|---------|
| FD-12 | 15 missing SVG icon path designs | Phase B (unless FD-13 Option B chosen) |

---

## PART 2 — MINIMUM HUMAN INPUT REQUIRED

**To start Phase B:** Decisions 1, 2, 3, 6, 7, 11, 12 + FD-12 asset delivery (all 15 icons), OR decision 12 = Option B (partial) + minimum N icons specified.

**To start Phase C independently of Phase B:** Decision 5 only. Phase C has no dependency on Phase B, icon assets, or Phases D–F.

**To start Phase F:** Decisions 9 + 10. Phase F has no dependency on Phase B.

**Absolute minimum to unblock something today:** Decision 5 alone starts Phase C.

---

## PART 3 — CRITICAL PATH ANALYSIS

### Two Parallel Tracks

```
Track 1 (Icon Sprint):    Phase B ─────────────────────────────────────────────────────┐
                          (blocked on FD-01,02,03,06,07,11,12a,13 + 15 asset deliveries)│
                                                                                         ├─ PROGRAMME COMPLETE
Track 2 (Feature Sprint): Phase C → Phase D → Phase E → Phase F ────────────────────────┘
                          (C: FD-05)   (D: FD-04)  (E: FD-08+spec) (F: FD-10+FD-11)
```

Tracks are **independent and parallel**. Programme completion requires both tracks done.

### Track 1 Gate Chain (Phase B)

FD-13 decides the gate condition:
- **FD-13 Option A (full delivery):** Phase B blocked until all 15 asset designs delivered. Decisions 1, 2, 3, 6, 7, 11, 12a, 13 can be made today; Phase B still waits for asset delivery.
- **FD-13 Option B (partial):** Phase B can begin immediately for approved icons (minimum 5 if FD-02, FD-03, FD-12a approved and FD-06/07 approved). 15 remaining assets arrive in second pass.

FD-09 is **RESOLVED** (href confirmed by repository evidence). No human action required.

### Track 2 Gate Chain (Feature Sprint)

```
FD-05 AUTHORIZE → Phase C begins (additive, 5 new files, 2 DOM insertions)
                        ↓ Phase C complete
                FD-04 decision → Phase D begins (agent grid)
                        ↓ Phase D complete
                FD-08 + GAP-25 spec delivered → Phase E begins
                        ↓ Phase E complete
                FD-10 AUTHORIZE + FD-11 strategy → Phase F begins (destructive — visual regression required)
```

---

## PART 4 — PHASE ANALYSIS

### Phase B Analysis

**Decisions required (7 of 12 ballot items):** FD-01, FD-02, FD-03, FD-06, FD-07, FD-12a, FD-13
**Asset delivery required:** 15 SVG icon paths (FD-12)
**Already resolved:** FD-09 (href), symbol ID convention (icon-{page-name}), sprite container ID (ds-icon-sprite), nav-icon width (18px !important), stat-chip exclusion, nav-more exclusion
**Regression note:** RX-07 test P7-10 currently asserts `!dash.includes('ds-icon-sprite')` — must be INVERTED as part of Phase B implementation. This is a known obligation, not a new decision.

### Phase C Analysis (independent)

**Status:** SPECIFICATION COMPLETE — AUTHORIZATION ONLY REQUIRED.
UX-08 (2026-08-27) is the complete progressive disclosure specification. Attention levels L0–L5, disclosure depth L0–L4, 7 categories, cognitive load budget, voice constraints, 5 implementation files, and exact dashboard.html DOM insertions are all fully specified. Prior "BLOCKED — no design" classification in PHASE-A-CERTIFICATION and RX-07-CERTIFICATION was incorrect.
**Only gate remaining:** Decision 5 (FD-05) — authorize or defer.
**Phase C is independent of Phase B.** Different DOM zones (cx-card-zone vs nav-icon spans), different files (lib/context/ vs sprite), no interaction.
**GAP-24 (bottom sheet)** unblocks immediately after Phase C. It has a hard dependency on GAP-01.

### GAP-27 Analysis (Phase A-3 / :root consolidation)

**Status: BLOCKED — EXPLICIT TARGET LIST REQUIRED**

The consolidation target is one `:root` block in `<head>` (Block 5, the `--ax-*` Final Authority Layer at dashboard.html line ~6418, the SURVIVOR).

Current state: 13 inline `:root` declarations across 8 `<style>` blocks + 1 in apex-v2.css = 14 total.

| Block | Action | Gate |
|-------|--------|------|
| Block 5 (`--ax-*`, ~line 6418) | SURVIVOR — expand to absorb migrated vars | RESOLVED BY ARCHITECTURE |
| Block 7 (`--apex-color-*`, ~line 7431) | Disposition determined by FD-11 choice | Blocked on Decision 10 |
| apex-v2.css | Migrate unique vars → remove | Blocked on Decision 9 (FD-10) |
| Blocks 1–4, 6, 8 | Implementation team var-level audit: compare each var against Block 5; duplicate vars REMOVE, unique vars MIGRATE | TECHNICAL AUDIT — no human product decision required per block |

**The implementation team must perform the var-level audit for Blocks 1–4, 6, 8.** This is a technical audit (compare var names + values against Block 5), not a product judgment. The product owner need not enumerate individual variable dispositions. GAP-27 unblocks after FD-10 + FD-11 are decided and the audit is completed.

### GAP-31 Analysis (Phase D / Agent Grid)

**Status: OPEN — PRODUCT DECISION PENDING (Decision 4 / FD-04)**

Three options, all ONE-APEX compliant:
- Option A: Page-scoped grid (HIGH complexity, switchPage chain modification required)
- Option B: Global + context injection (LOW complexity, no switchPage changes)
- Option C: Hybrid highlighting (MEDIUM complexity, lightweight switchPage addition)

No authority document specifies which option. The decision is purely a product judgment about user experience and implementation cost.

---

## PART 5 — HUMAN DECISION BALLOT

FD-09 is excluded (RESOLVED BY REPOSITORY EVIDENCE — `href` confirmed). Twelve decisions follow.

---

### Decision 1 — FD-01 — SPRITE LOCATION

Question:
Should the SVG sprite be inline inside dashboard.html, or in a separate external file at public/icons.svg?

Recommended:
OPTION A (inline)

Basis for recommendation: The reconnaissance Phase B files table lists ONLY dashboard.html as the file affected by Phase B. The ONE-APEX single-SPA architecture means there is no page navigation that would benefit from a cached external file — the SPA loads once. Inline eliminates HTTP request, eliminates flash of missing icons before the file loads, and keeps Phase B scope to a single file.

Options:
A. INLINE — Sprite block inserted inside dashboard.html `<body>`. No new files created. No additional HTTP request. dashboard.html grows ~5–10 KB.
B. EXTERNAL — Sprite placed at `public/icons.svg`. New production file created. Additional HTTP request on load. dashboard.html unchanged in size.
C. N/A

Impact:
Determines whether Phase B creates one file or two. Option B creates a new production file that must be served, versioned, and maintained separately.

My response:
[LEAVE BLANK]

---

### Decision 2 — FD-02 — ICON-COMMAND PROTOTYPE APPROVAL

Question:
Is the star polygon path approved for production use as icon-command?

Recommended:
HUMAN DECISION REQUIRED

Basis: This is a visual design approval. No authority document renders judgment on prototype aesthetics. The path conforms to all technical requirements (UX-05 §14). Whether the star polygon is the right visual for the Command page is a product/design call.

Prototype path (from `docs/interface/prototype/apex-command-prototype.html`):
```svg
<symbol id="icon-command" viewBox="0 0 20 20">
  <polygon points="10,2 12.5,8.5 19,9.5 14.5,14 15.9,20 10,17 4.1,20 5.5,14 1,9.5 7.5,8.5"
           fill="none" stroke="currentColor" stroke-width="1.5"
           stroke-linecap="round" stroke-linejoin="round"/>
</symbol>
```

Options:
A. APPROVE — use this prototype path for icon-command
B. REJECT — deliver a revised SVG path conforming to the tech contract (viewBox 0 0 20 20, stroke currentColor, stroke-width 1.5, round caps/joins, fill none)
C. N/A

Impact:
APPROVE: icon-command ready for Phase B immediately.
REJECT: icon-command joins the asset delivery queue. Phase B blocked for this icon until revised path is delivered.

My response:
[LEAVE BLANK]

---

### Decision 3 — FD-03 — ICON-SYSTEM PROTOTYPE APPROVAL

Question:
Is the terminal/monitor path approved for production use as icon-system?

Recommended:
HUMAN DECISION REQUIRED

Basis: Visual design approval. Path conforms to UX-05 §14. Whether a monitor rectangle with terminal lines and an accent circle is the right visual for the System page is a product/design call.

Prototype path (from same source as FD-02):
```svg
<symbol id="icon-system" viewBox="0 0 20 20">
  <rect x="2" y="4" width="16" height="12" rx="2"
        fill="none" stroke="currentColor" stroke-width="1.5"
        stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M6 8h8M6 12h5M14 12h1"
        fill="none" stroke="currentColor" stroke-width="1.5"
        stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="15" cy="8" r="1" fill="currentColor"/>
</symbol>
```

Options:
A. APPROVE — use this prototype path for icon-system
B. REJECT — deliver a revised SVG path conforming to the tech contract
C. N/A

Impact:
APPROVE: icon-system ready for Phase B immediately. icon-system survives Phase D (System surface icon).
REJECT: icon-system blocked until revised path delivered. This icon survives Phase D, so design investment is warranted.

My response:
[LEAVE BLANK]

---

### Decision 4 — FD-04 — AGENT GRID ARCHITECTURE (GAP-31)

Question:
Which agent grid architecture should Phase D implement?

Recommended:
HUMAN DECISION REQUIRED

Basis: No authority document specifies. This is a product feature decision. The three options produce meaningfully different user experiences and development effort.

Options:
A. PAGE-SCOPED — Agent grid shows agents relevant to the currently active page. Grid updates on every page switch. HIGH implementation complexity. switchPage chain must be modified to drive agent grid rebind.
B. GLOBAL + CONTEXT INJECTION — Static agent grid showing all agents regardless of active page. Active page context passed to agents as input parameter. LOW implementation complexity. No switchPage changes required.
C. HYBRID — Static global agent grid. Page-switch triggers visual highlighting of context-relevant agents. MEDIUM implementation complexity. Lightweight switchPage integration (no rebind, highlight only).

Impact:
Option A: most context-aware UX; most complex to build; requires modifying the 14-wrapper switchPage chain.
Option B: simplest to build; agents always visible; page context is implicit input.
Option C: middle path; stable agent list with contextual emphasis on relevant agents per page.
All options are ONE-APEX compliant. None requires a second runtime.

My response:
[LEAVE BLANK]

---

### Decision 5 — FD-05 — PHASE C IMPLEMENTATION AUTHORIZATION

Question:
Is Phase C (progressive disclosure) implementation authorized?

Recommended:
HUMAN DECISION REQUIRED

Basis: The specification (UX-08, 2026-08-27) is complete. No design work remains. The only open gate is authorization. The stale "BLOCKED — no design specification" classification in both PHASE-A-CERTIFICATION and RX-07-CERTIFICATION is incorrect and was corrected by this programme. However, whether to authorize the implementation is a product decision — it is an investment of implementation capacity.

Phase C delivers: L0–L5 attention levels, L0–L4 disclosure depth, 7 presentation categories, cognitive load budget enforcement, voice suppression rules. Five new files + two dashboard.html DOM insertions.

Options:
A. AUTHORIZE — Phase C implementation begins using UX-08 §§9–20 as design authority. Six open implementation questions (OQ-01 through OQ-06) resolved at kick-off, not before.
B. DEFER — Phase C remains blocked. State the reason.
C. N/A

Impact:
AUTHORIZE: Phase C begins immediately (no further decisions required). GAP-24 (bottom sheet) unblocks. Phase C is additive — creates 5 new files, modifies dashboard.html with 2 div insertions only.
DEFER: Phase C, GAP-24, and Phase D (which depends on Phase C completion) all remain blocked.

My response:
[LEAVE BLANK]

---

### Decision 6 — FD-06 — ICON-OVERVIEW MAPPING

Question:
Is the World globe icon semantically acceptable for icon-overview, or should a distinct design be created?

Recommended:
HUMAN DECISION REQUIRED

Basis: GAP-29-DDR §6 explicitly classifies this as a designer decision. The globe was designed for the Phase D "World" surface (aggregate of ~10 legacy pages, all geographically/globally framed). The current "Overview" page is a governance/pipeline/status summary. The semantic connection (globe = overview) is a stretch. Whether that stretch is acceptable is a design judgment.

Candidate globe path (from prototype):
```svg
<symbol id="icon-overview" viewBox="0 0 20 20">
  <circle cx="10" cy="10" r="8"
          fill="none" stroke="currentColor" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M2 10h16M10 2a14 14 0 0 1 0 16M10 2a14 14 0 0 0 0 16"
        fill="none" stroke="currentColor" stroke-width="1.5"
        stroke-linecap="round" stroke-linejoin="round"/>
</symbol>
```

Options:
A. APPROVE GLOBE — accept the World globe for icon-overview. Semantic stretch acknowledged.
B. DESIGN NEW — deliver a distinct SVG path for Overview (e.g. grid, dashboard tiles, scope brackets). Adds icon-overview to the 15-icon delivery queue (16 total icons to deliver).
C. N/A

Impact:
APPROVE: icon-overview available for Phase B immediately.
DESIGN NEW: icon-overview blocked. Phase B must proceed without it (requires FD-13 Option B) or wait for delivery.

My response:
[LEAVE BLANK]

---

### Decision 7 — FD-07 — ICON-APPROVALS MAPPING

Question:
Is the Decisions Stack icon semantically acceptable for icon-approvals, or should a distinct design be created?

Recommended:
HUMAN DECISION REQUIRED

Basis: GAP-29-DDR §6 explicitly classifies this as a designer decision. The stack was designed for the Phase D "Decisions" surface (aggregate of activity, agents, AND approvals). "Approvals" is a narrower concept (pending approval actions only). Additionally, using this icon for icon-approvals now may create visual confusion when Phase D later creates an icon-decisions symbol for the broader concept.

Candidate decisions stack path (from prototype):
```svg
<symbol id="icon-approvals" viewBox="0 0 20 20">
  <path d="M10 2v16M3 7l7-5 7 5M4 10l6 3 6-3M4 14l6 3 6-3"
        fill="none" stroke="currentColor" stroke-width="1.5"
        stroke-linecap="round" stroke-linejoin="round"/>
</symbol>
```

Options:
A. APPROVE STACK — accept the Decisions Stack for icon-approvals. Accept the semantic imprecision and the future naming similarity risk with icon-decisions.
B. DESIGN NEW — deliver a distinct SVG path for Approvals (e.g. checkmark, seal, document with signature). Adds icon-approvals to the delivery queue.
C. N/A

Impact:
APPROVE: icon-approvals available for Phase B immediately.
DESIGN NEW: icon-approvals blocked; total missing assets increases (16 or 17 depending on FD-06).
Note: future Phase D will need icon-decisions for the aggregate surface regardless of this decision.

My response:
[LEAVE BLANK]

---

### Decision 8 — FD-08 — GAP-25 MOBILE NAV

Question:
Should the GAP-25 mobile navigation design specification be commissioned now, or deferred?

Recommended:
HUMAN DECISION REQUIRED

Basis: No GAP-25 design foundation exists anywhere in the repository. This decision cannot be resolved by inspecting authority documents — it requires creating design work. The desktop navigation is entirely unaffected by this decision.

Options:
A. PRODUCE SPEC — assign GAP-25 design work. The specification must cover: which 5 tabs are shown in the mobile bottom bar, tab order, labels, active/inactive states, icon usage, overflow handling for 20-page navigation, and breakpoint behaviour. Delivery format: a GAP-25 design document equivalent in detail to UX-08.
B. DEFER — Phase E remains blocked indefinitely. Desktop navigation is unaffected.
C. N/A

Impact:
PRODUCE SPEC: Phase E planning unblocked once spec delivered. Phase E implementation begins after Phase D complete.
DEFER: Phase E blocked. Mobile experience remains at current state.

My response:
[LEAVE BLANK]

---

### Decision 9 — FD-10 — APEX-V2.CSS PHASE F AUTHORIZATION

Question:
Is Phase F authorized to execute the apex-v2.css migration and removal?

Recommended:
AUTHORIZE

Basis for recommendation: UX-05 §4.7 is an explicit authority statement: "apex-v2.css indigo #6366f1 system: RETIRE — Conflicts with established cyan identity; no place in canonical system." The retire direction is not in question. The open gate is whether to authorize the implementation team to execute it. Note: at runtime, `--ax-*` !important already overrides apex-v2.css colour vars — visual impact of deferral is minimal. Only structural debt accumulates.

Options:
A. AUTHORIZE — Phase F implementation team: (1) audits which unique non-color vars from apex-v2.css are consumed by dashboard.html, (2) migrates them to the `--ax-*` namespace in Block 5, (3) removes the apex-v2.css link from dashboard.html lines 3909–3910, (4) deletes or archives `public/apex-v2.css`.
B. DEFER — apex-v2.css remains linked. Structural debt remains but no visual regression occurs (color vars already overridden at runtime by `--ax-*` !important).
C. N/A

Impact:
AUTHORIZE: Enables Phase F CSS track. Removes the 14th `:root` block (the apex-v2.css one) and collapses unique non-color vars into Block 5. Unblocks Phase A-3 / GAP-27 migration for the apex-v2.css portion.
DEFER: apex-v2.css remains as dead linked weight. Non-color layout vars (--topbar-h, --sidebar-w, --font-sans, etc.) remain in the external file.

My response:
[LEAVE BLANK]

---

### Decision 10 — FD-11 — TOKEN NAMESPACE STRATEGY

Question:
How should the `--apex-color-*` namespace (UX-19, Block 7) be reconciled with the canonical `--ax-*` namespace?

Recommended:
OPTION A (BRIDGE)

Basis for recommendation: UX-19 introduced `--apex-color-*` as an "additive block only" — meaning it was added without changing existing code, which is exactly what Option A (bridge) preserves going forward. Option A requires no component changes and carries the lowest migration risk. Option B produces a cleaner end state but requires an exhaustive search of all `--apex-color-*` consumers in dashboard.html and confirmation of var equivalence. Given dashboard.html is ~22,244 lines, Option A is lower risk for the same canonical outcome (single `--ax-*` namespace at end).

Options:
A. BRIDGE — Add bridge declarations inside the `--ax-*` block (e.g. `--apex-color-primary: var(--ax-primary)`). Components using `--apex-color-*` receive canonical values. Zero component changes. Bridge declarations must be maintained when new `--ax-*` vars are added. Block 7 remains but is now downstream of the bridge.
B. MIGRATE — Find all `--apex-color-*` usages in dashboard.html (~22,244 lines) and rename each to the equivalent `--ax-*` name. Delete Block 7 entirely. Clean end state, no bridge maintenance. Medium risk: requires exhaustive search, missed usages cause silent broken styles.
C. N/A

Impact:
Both options produce a single canonical `--ax-*` namespace as the Phase F outcome.
Option A: lower risk, no component changes, bridge maintained going forward.
Option B: clean end state, no bridge declarations, but requires exhaustive consumer audit.
Gate 11 (per-block :root disposition for Block 7) resolves automatically from this choice without requiring a further product decision.

My response:
[LEAVE BLANK]

---

### Decision 11 — FD-12a — ICON-KNOWLEDGE PROTOTYPE APPROVAL

Question:
Is the open book path approved for production use as icon-knowledge?

Recommended:
HUMAN DECISION REQUIRED

Basis: Visual design approval. Path conforms to UX-05 §14. Note: icon-knowledge survives Phase D as the Knowledge surface icon — it is one of three icons with a long production life. Higher design investment is warranted compared to the 15 icons scheduled for Phase E retirement.

Prototype path (from same source as FD-02/03):
```svg
<symbol id="icon-knowledge" viewBox="0 0 20 20">
  <path d="M4 3h9a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H4"
        fill="none" stroke="currentColor" stroke-width="1.5"
        stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M4 3v14a2 2 0 0 0 2 2M7 8h7M7 12h5"
        fill="none" stroke="currentColor" stroke-width="1.5"
        stroke-linecap="round" stroke-linejoin="round"/>
</symbol>
```

Options:
A. APPROVE — use this prototype path for icon-knowledge
B. REJECT — deliver a revised SVG path conforming to the tech contract (viewBox 0 0 20 20, stroke currentColor, stroke-width 1.5, round caps/joins, fill none)
C. N/A

Impact:
APPROVE: icon-knowledge immediately ready for Phase B. This is one of three Phase D-surviving icons — higher scrutiny is appropriate.
REJECT: icon-knowledge blocked until revised path delivered. Alongside FD-02/FD-03, this icon forms the Phase D-surviving trio.

My response:
[LEAVE BLANK]

---

### Decision 12 — FD-13 — PARTIAL PHASE B ACCEPTABILITY

Question:
If only 3–5 icon designs are approved today (from FD-02, FD-03, FD-12a, FD-06, FD-07) and the 15 missing asset paths have not been delivered, may Phase B begin for the approved icons, leaving the rest as Unicode?

Recommended:
OPTION A (full delivery required)

Basis for recommendation: This is the explicit authority position. UX-05 G-IG-03 is a blanket prohibition: "Emoji are not used as UI icons under any circumstances." GAP-29-DDR §10 states: "Not recommended — full delivery of all 20 icons is the correct approach." Option B requires an explicit override of UX-05 G-IG-03 — which is the product owner's prerogative, but the authority default is clear.

Options:
A. FULL DELIVERY REQUIRED — Phase B does not begin until all 20 icon designs are available. A mixed icon/Unicode nav state is not acceptable under UX-05 G-IG-03. This is the position of all existing authority documents.
B. PARTIAL PHASE B AUTHORIZED — Phase B proceeds for icons with approved designs. The remaining icons stay as Unicode until their designs arrive, creating a mixed state. This explicitly supersedes UX-05 G-IG-03 for the interim period. Specify minimum N icons required to begin (natural minimum: the 5 icons with existing paths — command, knowledge, system, plus overview and approvals — pending Decisions 2, 3, 6, 7, 11).
C. N/A

Impact:
Option A: Phase B blocked until all 15 missing assets delivered. All Phase B decisions above can still be recorded now.
Option B: Phase B can begin immediately after Decisions 1–7, 11 are resolved, for whatever icons are approved. A second Phase B pass executes when remaining assets arrive. Interim nav has mixed icon/emoji state visible to users.

My response:
[LEAVE BLANK]

---

## PART 6 — ASSET DELIVERY REQUIREMENT

### FD-12 — 15 Missing SVG Icon Designs

This is not a decision — it is a creative deliverable. 15 icon paths must be produced and delivered. No product decision resolves this; design work must be done.

**Technical contract (non-negotiable, established by UX-05 §14):**
- `viewBox="0 0 20 20"`
- `stroke="currentColor"` `stroke-width="1.5"` `stroke-linecap="round"` `stroke-linejoin="round"`
- `fill="none"` as default; intentional accent fills use `fill="currentColor"`
- No external library paths
- Delivery as `<symbol id="icon-{page-name}">` blocks

**Icons requiring original design:**

| Symbol ID | Nav Label | Phase D Fate | Priority |
|-----------|-----------|-------------|---------|
| `icon-operation` | Operation | Phase E retirement | Standard |
| `icon-finance` | Finance | Phase E retirement | Standard |
| `icon-communication` | Network | Phase E retirement | Standard |
| `icon-business` | Business | Phase E retirement | Standard |
| `icon-health` | Health | Phase E retirement | Standard |
| `icon-university` | University | Phase E retirement | Standard |
| `icon-occult` | Occult | Phase E retirement | Standard |
| `icon-research` | Research | World/Knowledge | Standard |
| `icon-civilisation` | Civilisation | Phase E retirement | Standard |
| `icon-reality` | Reality | Phase E retirement | Standard |
| `icon-activity` | Activity | Decisions surface | Standard |
| `icon-agents` | Agents | Decisions surface | Standard |
| `icon-intelligence` | Intel | Knowledge surface | Standard |
| `icon-memory` | Memory | System surface | Standard |
| `icon-governance` | Govern | System surface | Standard |

**Design note:** 15 of these 20 icons are scheduled for Phase E retirement when the navigation consolidates. Simpler, more geometric designs are acceptable for retirement-path icons. The three surviving icons (command, knowledge, system) warrant more design investment — and are covered by Decisions 2, 3, 11 above.

---

## PART 7 — FINAL READINESS MATRIX

| Phase | Gate | Status | Unblocked By |
|-------|------|--------|-------------|
| Phase A-1 | — | COMPLETE AND CERTIFIED | — |
| Phase A-2 | — | COMPLETE AND CERTIFIED | — |
| Phase A-3 / GAP-27 | — | BLOCKED — IMPL TEAM AUDIT REQUIRED | Decisions 9 + 10; then implementation team var-level audit; no per-var product decisions required |
| Phase B | FD-01,02,03,06,07,12a,13 + FD-12 assets | BLOCKED — 7 decisions + 15 asset deliveries | All 7 decisions answered + all 15 (or N) assets delivered |
| Phase C | FD-05 | BLOCKED — AUTHORIZATION ONLY | Decision 5 (FD-05) = AUTHORIZE |
| Phase D | FD-04 + Phase C | BLOCKED — ARCHITECTURE DECISION + PHASE C DEPENDENCY | Decision 4 (FD-04) + Phase C complete |
| Phase E | FD-08 + GAP-25 spec + Phase D | BLOCKED — NO DESIGN SPECIFICATION | Decision 8 (FD-08) = PRODUCE SPEC + spec delivered + Phase D complete |
| Phase F | FD-10 + FD-11 + Phase E | BLOCKED — AUTHORIZATION + STRATEGY | Decisions 9 + 10 + Phase E complete |

### Resolution Summary After This Ballot

| If These Decisions Are Made | What Moves |
|----------------------------|-----------|
| Decision 5 only | Phase C begins (fastest possible unblock — ONE decision) |
| Decisions 1+2+3+6+7+11+12 + FD-13 Option B | Phase B begins for approved icons |
| Decisions 1+2+3+6+7+11+12 + FD-13 Option A + FD-12 assets delivered | Phase B begins for all 20 icons |
| Decision 4 | Phase D design scope defined (implementation waits for Phase C) |
| Decision 8 | Phase E design work commissioned |
| Decisions 9+10 | Phase F scope defined + Phase A-3 / GAP-27 migration path cleared |
| All 12 decisions | All programmes unblocked (except asset delivery and Phase ordering) |

### Items RESOLVED — No Further Human Action Required

| Item | Resolution |
|------|-----------|
| FD-09 — SVG href vs xlink:href | RESOLVED: `href`. Repository evidence. |
| Symbol ID convention | RESOLVED: `icon-{page-name}` |
| Sprite container ID | RESOLVED: `id="ds-icon-sprite"` |
| nav-more exclusion | RESOLVED: permanently hidden, excluded from Phase B |
| nav-icon rendered size | RESOLVED: 18px !important |
| Full SVG tech contract (viewBox, stroke, fill) | RESOLVED: UX-05 §14 |
| UX-08 progressive disclosure specification | RESOLVED: COMPLETE (2026-08-27) |
| apex-v2.css color system retirement | RESOLVED BY AUTHORITY: UX-05 §4.7 |
| `--ax-*` canonical namespace designation | RESOLVED BY AUTHORITY: UX-05 |
| Block 5 survivor designation | RESOLVED BY ARCHITECTURE |
| Stat-chip SVGs (lines 8860–8875) | RESOLVED: PROTECT — not Phase B scope |
| RX-07 test P7-10 inversion obligation | RESOLVED: must invert on Phase B implementation |
| UX-05 canonical colours | RESOLVED: #00d4ff primary, #7b2fff accent, #03060f bg |

---

HUMAN DECISION BALLOT COMPLETE — HARD STOP. No production implementation performed. No design assets fabricated. Awaiting explicit human decisions and required design/asset delivery.
