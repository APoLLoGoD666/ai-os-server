# APEX — INTERFACE CONVERGENCE PRODUCT/DESIGN DECISION PACK

**Classification:** PRODUCT/DESIGN DECISION DOCUMENT — READ-ONLY — NO IMPLEMENTATION
**Date:** 2026-08-28
**Prerequisite Documents:**
- `docs/interface/APEX-INTERFACE-CONVERGENCE-MASTERPLAN.md`
- `docs/interface/APEX-INTERFACE-CONVERGENCE-EXECUTION-READINESS.md`
- `docs/interface/APEX-INTERFACE-CONVERGENCE-DECISION-REGISTER.md`
- `docs/interface/BETA-LEGACY-INTERFACE-CONVERGENCE-RECONNAISSANCE.md`
- `docs/interface/GAP-29-SVG-ASSET-REQUIREMENTS.md`
- `docs/interface/GAP-29-DESIGN-DECISION-RECORD.md`
- `docs/interface/PHASE-A-CERTIFICATION.md`
- `docs/interface/RX-07-CERTIFICATION.md`
- `docs/interface/UX-05-CANONICAL-VISUAL-DESIGN-SYSTEM.md`
- `docs/interface/UX-08-CONTEXTUAL-PRESENTATION.md`

**Purpose:** Convert all 11 open decision gates into a single formal approval surface. The product owner must answer each genuine human decision with APPROVE / REJECT / CHOOSE OPTION A / CHOOSE OPTION B / CHOOSE OPTION C / DEFER. No further reconnaissance is required to understand any decision in this document.

---

## SECTION 1 — EXECUTIVE STATUS

### Programme State

| Phase | Status | Blocker |
|-------|--------|---------|
| Phase A (A-1, A-2) | COMPLETE AND CERTIFIED | — |
| Phase A (A-3 / GAP-27) | BLOCKED | Per-block :root disposition required |
| Phase B (GAP-29 SVG icons) | BLOCKED | 11 decisions + 15 icon assets |
| Phase C (GAP-01 progressive disclosure) | BLOCKED | Phase C implementation authorization required |
| Phase D (GAP-31 agent grid) | BLOCKED | Architecture decision required |
| Phase E (GAP-25 mobile nav) | BLOCKED | Mobile nav design specification required |
| Phase F (CSS consolidation) | BLOCKED | apex-v2.css disposition + namespace strategy |

### Gate Summary

| Gate Count | Category |
|-----------|----------|
| 4 gates | RESOLVED BY AUTHORITY — no action required |
| 7 gates | RESOLVED BY REPOSITORY EVIDENCE — no action required |
| 8 gates | Open: require human decision or asset delivery |
| 1 gate | BLOCKED BY EXTERNAL PREREQUISITE (Gate 10 → Gate 11) |

### Decision Requirements Summary

| Category | Count | Decisions |
|----------|-------|-----------|
| Product decisions required | 5 | FD-01, FD-02, FD-03, FD-04, FD-05 |
| Design decisions required | 3 | FD-06, FD-07, FD-08 |
| Technical decisions (can be resolved in this session) | 3 | FD-09, FD-10, FD-11 |
| Asset deliveries required | 1 | FD-12 (15 SVG icons) |
| Additional product decision | 1 | FD-13 (partial Phase B acceptability) |

**Total formal decisions in this document: 13 (FD-01 through FD-13)**

---

## SECTION 2 — COMPLETE 11-GATE REGISTER

The Decision Register classification of each gate is verified below against all authority documents. Reclassifications are noted with evidence.

### Reclassification Basis

| Gate | Decision Register Classification | This Document Classification | Change? |
|------|----------------------------------|------------------------------|---------|
| Gate 1 | EXPLICIT PRODUCT DECISION REQUIRED | **TECHNICAL DECISION REQUIRED** | Reclassified |
| Gate 2 | EXPLICIT PRODUCT DECISION REQUIRED | PRODUCT DECISION REQUIRED | No change |
| Gate 3 | EXPLICIT PRODUCT DECISION REQUIRED | PRODUCT DECISION REQUIRED | No change |
| Gate 4 | EXPLICIT PRODUCT DECISION REQUIRED | **DESIGN DECISION REQUIRED** | Reclassified |
| Gate 5 | BLOCKED BY MISSING ASSET | MISSING ASSET DELIVERY | No change |
| Gate 6 | PARTIALLY RESOLVED | **PRODUCT DECISION REQUIRED** (authorization) | Clarified |
| Gate 7 | EXPLICIT DESIGN DECISION REQUIRED | DESIGN DECISION REQUIRED | No change |
| Gate 8 | EXPLICIT PRODUCT DECISION REQUIRED | PRODUCT DECISION REQUIRED | No change |
| Gate 9 | TECHNICAL RECONCILIATION REQUIRED | **PARTIALLY RESOLVED BY AUTHORITY + TECHNICAL DECISION REQUIRED** | Reclassified |
| Gate 10 | TECHNICAL RECONCILIATION REQUIRED | TECHNICAL DECISION REQUIRED | Refined |
| Gate 11 | EXPLICIT PRODUCT DECISION REQUIRED | **TECHNICAL DECISION REQUIRED + BLOCKED BY EXTERNAL PREREQUISITE** | Reclassified |

### Reclassification Rationale

**Gate 1 (href vs xlink:href):** The question of which SVG `<use>` attribute to use is a technical question with a clear technical answer derived from repository evidence and current web standards. It is not a product feature decision. It is reclassified to TECHNICAL DECISION REQUIRED. The conflict requiring resolution is between existing documentation (reconnaissance says `xlink:href`) and technical reality (`href` is correct and the codebase has zero `xlink` usage). Resolution requires explicit acknowledgment, not product judgment.

**Gate 4 (icon-overview and icon-approvals mapping):** Whether a World globe icon is semantically correct for "Overview" and whether a Decisions stack is semantically correct for "Approvals" is a design judgment about icon semantics. The GAP-29-DESIGN-DECISION-RECORD explicitly labels these as "designer decision." Reclassified to DESIGN DECISION REQUIRED.

**Gate 6 (GAP-01 / UX-08):** The specification question is RESOLVED BY AUTHORITY: UX-08 is the complete progressive disclosure specification. The remaining open gate is issuing a Phase C implementation authorization. This is a product decision (authorize an implementation phase), not a specification gap.

**Gate 9 (apex-v2.css):** UX-05 §4.7 explicitly says `apex-v2.css indigo #6366f1 system: RETIRE — Conflicts with established cyan identity; no place in canonical system.` The color system retirement is RESOLVED BY AUTHORITY. The open question is the migration scope for unique non-color variables — that is a technical implementation decision.

**Gate 11 (per-block :root disposition):** The decision of which vars in Blocks 1–4, 6, and 8 are superseded by the --ax-* Final Authority Layer is a technical audit — comparing variable names and values, not a product judgment. The implementation team can perform this audit and mark dispositions. Block 7 (--apex-color-*) depends on Gate 10. Reclassified to TECHNICAL DECISION REQUIRED + BLOCKED BY EXTERNAL PREREQUISITE.

### Complete Gate Status Table

| Gate | ID | Subject | Phase | Classification | Decision ID | Status |
|------|----|---------|-------|----------------|-------------|--------|
| Gate 1 | GAP-29-D1 | SVG `href` vs `xlink:href` | B | TECHNICAL DECISION REQUIRED | FD-09 | OPEN |
| Gate 2 | GAP-29-D2 | Sprite location: inline vs external | B | PRODUCT DECISION REQUIRED | FD-01 | OPEN |
| Gate 3 | GAP-29-D3 | Prototype path approval (3 icons) | B | PRODUCT DECISION REQUIRED | FD-02/03/04 | OPEN |
| Gate 4 | GAP-29-D4 | Ambiguous icon mappings (overview, approvals) | B | DESIGN DECISION REQUIRED | FD-06/07 | OPEN |
| Gate 5 | GAP-29-D5 | 15 missing icon assets | B | MISSING ASSET DELIVERY | FD-12 | BLOCKED |
| Gate 6 | GAP-01 | Phase C implementation authorization | C | PRODUCT DECISION REQUIRED | FD-05 | OPEN |
| Gate 7 | GAP-25 | Mobile nav design specification | E | DESIGN DECISION REQUIRED | FD-08 | OPEN |
| Gate 8 | GAP-31 | Agent grid architecture | D | PRODUCT DECISION REQUIRED | FD-04 | OPEN |
| Gate 9 | GAP-27-EXT | apex-v2.css disposition | F | PARTIALLY RESOLVED BY AUTHORITY + TECHNICAL DECISION REQUIRED | FD-10 | PARTIAL |
| Gate 10 | GAP-27-NS | Token namespace strategy | F | TECHNICAL DECISION REQUIRED | FD-11 | OPEN |
| Gate 11 | GAP-27-PB | Per-block :root disposition | F | TECHNICAL DECISION REQUIRED + BLOCKED BY EXTERNAL PREREQUISITE | — | BLOCKED |

---

## SECTION 3 — GATE 6: GAP-01 / UX-08 PROGRESSIVE DISCLOSURE

### 3.1 Specification Status

**UX-08 SPECIFICATION COMPLETE — IMPLEMENTATION AUTHORIZATION REQUIRED.**

The prior classification of Gate 6 as "BLOCKED — no design specification exists" was incorrect. This document formally corrects it.

`docs/interface/UX-08-CONTEXTUAL-PRESENTATION.md` is the complete, dated (2026-08-27), authoritative progressive disclosure specification. It specifies:

**Attention levels (UX-08 §§3–8):**

| Level | Score | UI Behaviour |
|-------|-------|-------------|
| L0 SILENT | 0.00–0.20 | No UI output |
| L1 LOG | 0.20–0.35 | Panel collapsed |
| L2 IN-APP | 0.35–0.50 | Contextual card visible |
| L3 ATTENTION | 0.50–0.65 | Contextual card prominent |
| L4 DECISION | 0.65–0.80 | Modal |
| L5 URGENT | 0.80–1.00 | Top chrome banner |

**Disclosure depth levels (UX-08 §12):**

| Level | Content | Trigger |
|-------|---------|---------|
| L0 Surface | 1 line max | Default render |
| L1 Expanded | 2–4 lines | Tap/hover |
| L2 Detail | Full card | Explicit expand |
| L3 Evidence | Raw data/logs | Secondary expand |
| L4 Constitutional | Governance chain | Explicit "why" action |

**Presentation categories:** INFORMATION, INSIGHT, STATUS, DECISION, ACTION, WARNING, CONFIRMATION

**Cognitive load budget:** Max 3×L2, 1×L3, 1×L4, 1×L5 concurrent

**Voice constraints:** Suppress L2/L3 during SPEAKING; suppress all during LISTENING; L5 fires through SPEAKING

**dashboard.html changes specified:** Add `<div id="cx-card-zone">` and `<div id="cx-top-chrome">`

**Implementation files specified:**
1. `lib/context/context-engine.js`
2. `lib/context/relevance-filter.js`
3. `lib/presentation/presentation-queue.js`
4. `public/js/components/contextual-card.js`
5. `lib/attention/attention-bridge.js`

### 3.2 Open Implementation Questions (UX-08 §OQ)

UX-08 itself documents 6 unresolved implementation questions that are to be resolved at implementation kick-off, not before authorization:

| # | Question | Nature |
|---|----------|--------|
| OQ-01 | Attention Engine integration contract (event format: polling vs push?) | Technical |
| OQ-02 | Card animation duration and easing curve | Design |
| OQ-03 | L4 DECISION modal: full-screen vs centred overlay | Design |
| OQ-04 | Voice synthesis interruption policy during L5 banner | Product |
| OQ-05 | Card persistence after attention score drops below threshold | Product |
| OQ-06 | L3 Evidence data: live query vs snapshot at render time | Technical |

These 6 questions do NOT block the authorization decision. They are to be resolved at implementation kick-off once authorization is granted.

### 3.3 What Becomes Unblocked

Once Phase C implementation authorization is issued (FD-05):
- Phase C implementation can begin immediately
- GAP-24 (bottom sheet) unblocks — it has a hard dependency on GAP-01
- OQ-01 through OQ-06 are resolved at kick-off meeting
- 5 new files created (not production file modifications)
- Two `<div>` insertions into dashboard.html

### 3.4 Decision Required

**FD-05:** Issue Phase C implementation authorization, citing UX-08 §§9–20 as the design authority. (Product decision — authorize or defer.)

---

## SECTION 4 — GAP-29 ICON DECISIONS

### 4.1 Complete Icon Decision Map

| # | Icon ID | Current Glyph | Design Status | Decision Required |
|---|---------|---------------|---------------|-------------------|
| 1 | `icon-command` | ⬡ | PROTOTYPE PATH EXISTS | FD-02: Approve or reject |
| 2 | `icon-overview` | ◈ | CANDIDATE PATH (World globe) | FD-06: Approve globe or provide new design |
| 3 | `icon-operation` | ⊞ | NO DESIGN | FD-12: Asset delivery |
| 4 | `icon-system` | ◉ | PROTOTYPE PATH EXISTS | FD-03: Approve or reject |
| 5 | `icon-finance` | ◎ | NO DESIGN | FD-12: Asset delivery |
| 6 | `icon-communication` | ✉ | NO DESIGN | FD-12: Asset delivery |
| 7 | `icon-business` | ◧ | NO DESIGN | FD-12: Asset delivery |
| 8 | `icon-health` | ◑ | NO DESIGN | FD-12: Asset delivery |
| 9 | `icon-university` | ◫ | NO DESIGN | FD-12: Asset delivery |
| 10 | `icon-occult` | ◬ | NO DESIGN | FD-12: Asset delivery |
| 11 | `icon-research` | ◈ | NO DESIGN | FD-12: Asset delivery |
| 12 | `icon-civilisation` | ⊛ | NO DESIGN | FD-12: Asset delivery |
| 13 | `icon-reality` | ◍ | NO DESIGN | FD-12: Asset delivery |
| 14 | `icon-activity` | ◎ | NO DESIGN | FD-12: Asset delivery |
| 15 | `icon-agents` | ◈ | NO DESIGN | FD-12: Asset delivery |
| 16 | `icon-approvals` | ◇ | CANDIDATE PATH (Decisions stack) | FD-07: Approve stack or provide new design |
| 17 | `icon-knowledge` | ◆ | PROTOTYPE PATH EXISTS | FD-04: Approve or reject |
| 18 | `icon-intelligence` | ◇ | NO DESIGN | FD-12: Asset delivery |
| 19 | `icon-memory` | ▣ | NO DESIGN | FD-12: Asset delivery |
| 20 | `icon-governance` | ⚖ | NO DESIGN | FD-12: Asset delivery |

**Summary:** 3 prototype paths (FD-02/03/04), 2 candidate paths with semantic ambiguity (FD-06/07), 15 requiring asset delivery (FD-12).

### 4.2 Confirmed Prototype Paths (Approved Pending Operator Confirmation)

These paths exist in `docs/interface/prototype/apex-command-prototype.html` lines 1153–1195. They conform exactly to the UX-05 §14 technical contract. They are design candidates — not automatically authorized for production.

**Prototype path: icon-command (star polygon)**
```svg
<symbol id="icon-command" viewBox="0 0 20 20">
  <polygon points="10,2 12.5,8.5 19,9.5 14.5,14 15.9,20 10,17 4.1,20 5.5,14 1,9.5 7.5,8.5"
           fill="none" stroke="currentColor" stroke-width="1.5"
           stroke-linecap="round" stroke-linejoin="round"/>
</symbol>
```

**Prototype path: icon-knowledge (open book)**
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

**Prototype path: icon-system (terminal/monitor)**
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

### 4.3 Candidate Paths Requiring Design Decision

**Candidate: World Globe for icon-overview**
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
**Design question:** The "World" icon in the prototype represents the Phase D consolidated surface (aggregate of ~10 legacy pages). "Overview" is the current single-page governance/pipeline/status summary. The semantic fit is a stretch. The designer must decide whether the globe is acceptable or whether a distinct concept is needed.

**Candidate: Decisions Stack for icon-approvals**
```svg
<symbol id="icon-approvals" viewBox="0 0 20 20">
  <path d="M10 2v16M3 7l7-5 7 5M4 10l6 3 6-3M4 14l6 3 6-3"
        fill="none" stroke="currentColor" stroke-width="1.5"
        stroke-linecap="round" stroke-linejoin="round"/>
</symbol>
```
**Design question:** The "Decisions" icon in the prototype represents the Phase D surface aggregating activity, agents, and approvals. "Approvals" is narrower (pending approval actions only). The semantic fit is imprecise. Additionally, using this icon for "Approvals" now may create naming confusion when Phase D creates a `icon-decisions` for the same concept. The designer must decide whether this icon is acceptable for the approvals page specifically.

### 4.4 Technical SVG Contract (RESOLVED — No Decision Required)

All icons must conform to the following. This is established by UX-05 §14 and confirmed by prototype conformance. **No decision is required for these items.**

| Attribute | Value | Source |
|-----------|-------|--------|
| `viewBox` | `0 0 20 20` | UX-05 §14.1 |
| `stroke` | `currentColor` | UX-05 §14.1 |
| `stroke-width` | `1.5` | UX-05 §14.1 |
| `stroke-linecap` | `round` | UX-05 §14.1 |
| `stroke-linejoin` | `round` | UX-05 §14.1 |
| `fill` | `none` (except intentional accent fills) | UX-05 §14.1 |
| Rendered size | 18px (via CSS, not SVG attribute) | UX-05 §14.2 |
| Accessibility | `aria-hidden="true"` on icon `<svg>` | UX-05 §14.5 |
| External library | PROHIBITED | UX-05 §14.6 PROTECT |

### 4.5 Resolved Without Decision (RESOLVED BY AUTHORITY / REPOSITORY EVIDENCE)

| Item | Resolution | Source |
|------|------------|--------|
| Symbol ID convention | `icon-{page-name}` matching `pages[]` exactly | GAP-29-DDR §9; pages[] array at dashboard.html:12736 |
| Sprite container ID | `id="ds-icon-sprite"` | RX-07 test P7-10 |
| nav-more exclusion | EXCLUDED — permanently hidden, not in pages[] | dashboard.html:12726 + pages[] |
| nav-icon width | 18px !important | dashboard.html lines 6578 and 7921 |
| stat-chip SVGs (lines 8860–8875) | PROTECT — not Phase B scope | GAP-29-SVG-ASSET-REQUIREMENTS §5 |
| Mobile hamburger `._mnav-btn` | NOT Phase B scope — text only | GAP-29-SVG-ASSET-REQUIREMENTS §3.1 |
| RX-07 test P7-10 | Must be INVERTED when Phase B is implemented | RX-07 test file |

---

## SECTION 5 — GATE 9: APEX-V2.CSS DISPOSITION

### 5.1 Authority Position (RESOLVED FOR COLOR SYSTEM)

**UX-05 §4.7 states explicitly:**
> `apex-v2.css indigo #6366f1 system: RETIRE — Conflicts with established cyan identity; no place in canonical system`

This is unambiguous. The apex-v2.css indigo color system is **RETIRED BY AUTHORITY**. This is not a product decision — it is established by the canonical visual design system document.

### 5.2 Current State of apex-v2.css

`public/apex-v2.css` is linked in `public/dashboard.html` at lines 3909–3910. It defines the "APEX Zero Design System" — a visual redesign using indigo as the accent color (#6366f1) in direct conflict with the canonical cyan identity (#00d4ff, #7b2fff accent per UX-05).

The `--ax-*` Final Authority Layer at dashboard.html line 6425 already overrides conflicting colour vars with `!important`. At runtime, canonical colours already win over apex-v2.css colour vars. However, the file's existence creates an active `:root` block (line ~17 of apex-v2.css) with its own declarations that must be cleaned up.

### 5.3 Unique Non-Color Variables in apex-v2.css

apex-v2.css contains variables that are **not present in any dashboard.html `:root` block.** These are consumed by dashboard.html components and cannot be removed without migration:

| Category | Variables |
|----------|-----------|
| Typography | `--font-sans`, `--font-mono`, `--tracking-tight`, `--tracking-wide` |
| Spacing scale | `--space-1` through `--space-10` |
| Radius scale | `--r-sm`, `--r-md`, `--r-lg`, `--r-xl`, `--r-pill` |
| Elevation | `--shadow-panel`, `--shadow-pop`, `--glow-sm`, `--glow-md` |
| Layout | `--topbar-h: 44px`, `--sidebar-w: 200px`, `--chatbar-h: 52px` |
| Command surface | `--cmd-bg`, `--cmd-border`, `--cmd-text`, `--cmd-placeholder`, `--cmd-focus-ring` |
| Agent tokens | `--agent-card-bg`, `--agent-card-border`, `--agent-avatar-size` |

**These unique vars must be migrated to the `--ax-*` namespace in dashboard.html before apex-v2.css can be removed without UI breakage.**

### 5.4 Gate 9 Status

| Sub-decision | Status |
|--------------|--------|
| apex-v2.css indigo color system: RETIRE | RESOLVED BY AUTHORITY (UX-05 §4.7) — no product decision required |
| Migration of unique non-color vars to `--ax-*` | TECHNICAL DECISION REQUIRED — authorize as Phase F task (FD-10) |
| Physical removal of apex-v2.css from dashboard.html | Follows migration — technical implementation |

**What the product owner is being asked (FD-10):** Authorize the Phase F migration and removal of apex-v2.css as a discrete implementation task. The RETIRE direction is already established. The authorization question is whether Phase F is approved to execute.

---

## SECTION 6 — GATE 10: TOKEN NAMESPACE RECONCILIATION

### 6.1 Three Active Namespaces at Runtime

| Namespace | Location | Count | Override | Canonical? |
|-----------|----------|-------|----------|-----------|
| Short-form (`--bg`, `--surface`, `--primary`) | 8 inline `<style>` blocks | ~40 vars | None — last declaration wins | No — legacy |
| `--ax-*` Final Authority Layer | dashboard.html:6425 | ~60 vars | `!important` on all | **YES — UX-05 canonical** |
| `--apex-color-*` | dashboard.html:8502 (UX-19) | ~25 vars | None | Additive; not bridged |

### 6.2 Semantic and Usage Analysis

**`--ax-*` namespace:**
- Introduced by UX-05 as the canonical APEX token system
- Uses `!important` to establish definitive override of all earlier declarations
- Contains canonical colours: `--ax-primary: #00d4ff` (cyan), `--ax-bg: #03060f`, `--ax-accent: #7b2fff`
- This is the target namespace for Phase F consolidation
- **This namespace is canonical per UX-05**

**`--apex-color-*` namespace:**
- Introduced by UX-19 as an "additive block only"
- Contains ~25 colour-related vars
- NOT bridged to `--ax-*` — components using `--apex-color-primary` do NOT receive the `--ax-primary` value
- Components written against `--apex-color-*` are NOT covered by `--ax-*` !important overrides
- **Coexistence is accidental, not intentional** — UX-19 added these as additive without defining the bridge

**Short-form vars (`--bg`, `--primary`):**
- Legacy declarations from multiple CSS generations
- `--ax-*` !important overrides these where names overlap
- Cannot be safely removed without confirming every consumer

### 6.3 Authority Position on Canonical Namespace

UX-05 identifies `--ax-*` as the canonical token system. No authority document explicitly states whether `--apex-color-*` should be bridged, merged, or deprecated. UX-19 says "additive block only" — meaning it was added without changing existing code, not that it is canonical.

### 6.4 Three Resolution Strategies

| Strategy | Description | Migration Cost | Risk |
|----------|-------------|----------------|------|
| **Bridge** | Add `--apex-color-primary: var(--ax-primary)` bridge declarations in the --ax-* block | Low — no file changes to components | Bridge declarations must be maintained going forward |
| **Migrate** | Find all `--apex-color-*` usages in dashboard.html and rename to `--ax-*` equivalents | Medium — surgical search-and-replace | Risk of missing usages; must verify equivalence for each var |
| **Absorb** | Fold `--apex-color-*` values into `--ax-*` block and delete the UX-19 :root block | Medium-High — requires var equivalence audit | Clean result; no bridge maintenance |

All three strategies produce a single canonical namespace as the Phase F outcome. The difference is migration approach and transition risk.

### 6.5 Gate 10 Decision Required

**FD-11:** Select namespace consolidation strategy (Bridge, Migrate, or Absorb). This is a TECHNICAL DECISION that the product owner confirms once (choosing the migration approach), then the implementation team executes.

The product owner must also confirm: **`--ax-*` remains the canonical forward namespace for all new component authoring** (this is implicit in UX-05 but should be stated explicitly for the implementation team).

---

## SECTION 7 — GAP-27: :ROOT CONSOLIDATION BLOCK ANALYSIS

### 7.1 Confirmed Inventory

**13 inline `:root` declarations across 8 `<style>` blocks in dashboard.html, plus 1 in apex-v2.css.**

The reconnaissance identifies 10 style blocks total; the Execution Readiness report identifies 8 blocks containing `:root` declarations specifically. Both observations are internally consistent: 2 style blocks contain no `:root` declarations.

| Block | Approx Line | Purpose | Namespace | Survivor/Remove/Migrate |
|-------|------------|---------|-----------|------------------------|
| Block 1 | ~20 | v10 base — early baseline | Short-form (`--bg`, etc.) | PENDING GATE 10 |
| Block 2 | ~1299 | v11 surface | Short-form competing | PENDING GATE 10 |
| Block 3 | ~3912 | Post-apex-v2.css vars | Short-form | PENDING GATE 10 |
| Block 4 | ~4912 | Component-specific | Short-form / `--v12-*` | PENDING GATE 10 |
| **Block 5** | **~6418** | **`--ax-*` Final Authority Layer** | **`--ax-*` !important** | **SURVIVOR** |
| Block 6 | ~6922 | Post-authority additions | Short-form / `--ax-*` | PENDING GATE 10 |
| Block 7 | ~7431 | UX-19 `--apex-color-*` | `--apex-color-*` | PENDING GATE 10 (Gate 10 determines this block's fate) |
| Block 8 | ~7932 | Late-document additions | Mixed | PENDING GATE 10 |
| apex-v2.css | ~line 17 | APEX Zero Design System | `--font-*`, `--space-*`, `--r-*`, `--cmd-*`, `--agent-*`, color vars | MIGRATE non-color vars → REMOVE (per Gate 9) |

### 7.2 Consolidation Architecture Target

The Phase F consolidation target is:

- **One `:root` block in `<head>`** containing all vars in `--ax-*` namespace
- Block 5 is the survivor and expansion target — absorb all migrated vars here
- All other blocks removed after migration
- apex-v2.css removed after Gate 9 migration

### 7.3 Why Per-Block Disposition is a Technical Decision, Not a Product Decision

For Blocks 1–4, 6, and 8, the per-block disposition can be determined technically:
1. List all vars in the block
2. Compare each var against Block 5 (`--ax-*`) declarations
3. If the var is equivalent to an --ax-* var: REMOVE (the --ax-* !important already overrides it)
4. If the var is unique (not in Block 5): MIGRATE to Block 5 in --ax-* naming convention

This is an audit operation, not a product judgment. The implementation team should perform this audit and present findings for confirmation, rather than requiring the product owner to specify dispositions without a var-level inventory.

**The one exception:** Block 7 (`--apex-color-*`) depends entirely on Gate 10 (namespace strategy). Once Gate 10 is resolved, Block 7's disposition follows automatically from the chosen strategy.

### 7.4 Gate 11 Resolution Path

Gate 11 is currently BLOCKED BY EXTERNAL PREREQUISITE (Gate 10). Once Gate 10 is resolved:
1. Block 7 disposition is determined by the chosen namespace strategy
2. Blocks 1–4, 6, 8 are resolved by the implementation team's var-level audit
3. No separate product decision is required for individual var dispositions

---

## SECTION 8 — GAP-31 PRODUCT DECISION

### 8.1 Current State

The `agents` page exists in `pages[]` and has a `pageMeta` entry. No authoritative design document specifies the agent grid layout or scope boundary. RX-07 Certification registers GAP-31 as "OPEN — product decision pending."

### 8.2 Three Documented Options (from gap inventory)

**Option A — Page-scoped agent grid**
The agent grid shows agents scoped to the currently active page. When the user navigates from `page-command` to `page-knowledge`, the grid updates to show knowledge-relevant agents.

| Attribute | Value |
|-----------|-------|
| Event bus impact | Page-switch events drive agent grid rebind |
| switchPage chain | Must integrate agent grid update into existing wrapper chain |
| Implementation complexity | HIGH — dynamic rebind on every switchPage call |
| ONE-APEX compliance | YES |
| User experience | Context-aware; different agents per page |

**Option B — Global agent grid with context injection**
The agent grid shows a fixed set of global agents regardless of active page. Active page context is passed as an input parameter to agents, not as a display filter.

| Attribute | Value |
|-----------|-------|
| Event bus impact | None — no page-switch binding |
| switchPage chain | No changes required |
| Implementation complexity | LOW — static grid |
| ONE-APEX compliance | YES |
| User experience | Consistent agents always visible; page context is implicit |

**Option C — Hybrid: global grid with page-context highlighting**
Global agents grid with page-context injection. Page-specific agents are visually highlighted or filtered when the relevant page is active.

| Attribute | Value |
|-----------|-------|
| Event bus impact | Page-switch events trigger highlighting only (not rebind) |
| switchPage chain | Lightweight addition to existing wrapper |
| Implementation complexity | MEDIUM |
| ONE-APEX compliance | YES |
| User experience | Stable grid with contextual emphasis |

### 8.3 Decision Required

**FD-05 (Gate 8 / GAP-31 — see Section 15, FD-05 is Phase C; this is a separate decision):**

**FD-04 (Gate 8 / GAP-31):** Select agent grid architecture: Option A (page-scoped), Option B (global+context), or Option C (hybrid). This decision determines the entire Phase D implementation approach.

Note: Correction to Section 2 table — Gate 8 maps to FD-04 (not FD-04 which was earlier reserved). See Section 15 (Formal Approval Sheet) for the definitive decision numbering.

---

## SECTION 9 — GAP-15, GAP-16, GAP-22 SCHEDULING

### 9.1 Current Status (from RX-07 Certification)

| Gap | Description | Status | Sprint |
|-----|-------------|--------|--------|
| GAP-15 | Memory correction route | OPEN | Unscheduled |
| GAP-16 | Memory deletion route | OPEN | Unscheduled |
| GAP-22 | Historical event log | OPEN | Unscheduled |

### 9.2 Programme Independence

All three gaps are **independent of Phases A–F**. They do not block any convergence gate. No convergence gate blocks them. They can be scheduled as standalone sprint items at any time.

### 9.3 Repository Evidence

**GAP-15 and GAP-16:** `routes/memory.js` EXISTS in the live repository. Memory retrieval endpoint present. Write/deletion endpoint presence not exhaustively verified during reconnaissance — a separate verification pass is required before implementation.

**GAP-22:** No route or UI implementation found during reconnaissance. Requires full reconnaissance before scheduling.

### 9.4 Scheduling Decision

The Decision Register does not prescribe a scheduling decision for these gaps. They are presented here for product owner awareness.

**Required action:** If these gaps should be scheduled, the product owner assigns them to a sprint. If they should remain deferred, no action is required. They do not affect the convergence programme timeline.

---

## SECTION 10 — DECISIONS RESOLVED BY EXISTING AUTHORITY

These items require **no product owner decision**. They are documented here to confirm they are closed.

| # | Item | Resolution | Source |
|---|------|------------|--------|
| R-01 | Symbol ID convention: `icon-{page-name}` | RESOLVED — matches `pages[]` exactly | GAP-29-DDR §9; pages[] at dashboard.html:12736 |
| R-02 | Sprite container ID: `ds-icon-sprite` | RESOLVED | RX-07 test P7-10 |
| R-03 | nav-more exclusion from Phase B | RESOLVED — permanently hidden, not in pages[] | dashboard.html:12726 + pages[] |
| R-04 | nav-icon rendered size: 18px !important | RESOLVED — two !important declarations agree | dashboard.html lines 6578 and 7921 |
| R-05 | SVG viewBox: 0 0 20 20 | RESOLVED | UX-05 §14.1 |
| R-06 | SVG stroke-width: 1.5 | RESOLVED | UX-05 §14.1 |
| R-07 | SVG stroke-linecap and stroke-linejoin: round | RESOLVED | UX-05 §14.1 |
| R-08 | SVG fill: none (default) | RESOLVED | UX-05 §14.1 |
| R-09 | SVG stroke: currentColor | RESOLVED | UX-05 §14.1 |
| R-10 | Accessibility: aria-hidden="true" on decorative icon SVG | RESOLVED | UX-05 §14.5 |
| R-11 | External icon library: PROHIBITED | RESOLVED | UX-05 §14.6 PROTECT |
| R-12 | Stat-chip SVGs at lines 8860–8875: PROTECT | RESOLVED | GAP-29-SVG-ASSET-REQUIREMENTS §5 |
| R-13 | Mobile hamburger `._mnav-btn`: NOT Phase B scope | RESOLVED | GAP-29-SVG-ASSET-REQUIREMENTS §3.1 |
| R-14 | apex-v2.css indigo color system: RETIRE | RESOLVED BY AUTHORITY | UX-05 §4.7 |
| R-15 | `--ax-*` is the canonical token namespace | RESOLVED BY AUTHORITY | UX-05 canonical token system |
| R-16 | UX-08 is the complete progressive disclosure specification | RESOLVED BY AUTHORITY | UX-08 (status: COMPLETE, 2026-08-27) |
| R-17 | RX-07 test P7-10 must be inverted when Phase B is implemented | RESOLVED | RX-07 test file; GAP-29-DDR §9 |
| R-18 | Block 5 (`--ax-*` Final Authority Layer) is the survivor for :root consolidation | RESOLVED BY ARCHITECTURE | Block 5 is the only !important override layer |
| R-19 | `pages[]` array is the canonical nav registration (20 entries) | RESOLVED | dashboard.html:12736 |
| R-20 | UX-05 canonical colours: --primary: #00d4ff (cyan), --accent: #7b2fff, --bg: #03060f | RESOLVED BY AUTHORITY | UX-05 §4 |

---

## SECTION 11 — DECISIONS REQUIRING PRODUCT APPROVAL

These decisions require explicit product owner judgment. They cannot be derived from existing authority documents.

### FD-01: Sprite Location

**Subject:** Where the SVG sprite container is placed
**Question:** Should the SVG sprite be inline in `dashboard.html` or in an external file at `public/icons.svg`?

| | Inline | External file |
|-|--------|---------------|
| New files | None — dashboard.html only | One new file: `public/icons.svg` |
| HTTP requests | No additional request | One additional file load |
| Flash of missing icon | None (sprite in DOM at parse time) | Possible until file loads |
| dashboard.html size | Grows by ~5–10 KB | Unchanged |
| Future maintainability | Edit dashboard.html to change icons | Edit separate file |
| ONE-APEX compliance | Yes | Yes |

**Evidence:** Gap inventory says "SVG asset files (new)" implying external. Reconnaissance Phase B file table lists only `dashboard.html` implying inline. Sources conflict — requires explicit resolution.

**Authority default:** None. No authority document specifies.

**Downstream effect:** Determines Phase B implementation structure and whether a new file is created.

**Required approval:** CHOOSE OPTION A (inline) or CHOOSE OPTION B (external file)

---

### FD-02: icon-command Prototype Approval

**Subject:** Approve star polygon path for `icon-command`
**Current state:** Star polygon prototype path exists in `docs/interface/prototype/apex-command-prototype.html` lines 1153–1195. Conforms exactly to UX-05 §14 specification. Created for the explicit purpose of Phase B.
**Question:** Is the star polygon design approved for production use as `icon-command`?
**Option A:** APPROVE — use the prototype star polygon path as shown in Section 4.2
**Option B:** REJECT — provide a revised path design before Phase B can proceed for this icon
**Evidence:** Prototype comment: "SVG icons: outlined, 18px, currentColor. UX-05 §14. REWORK from emoji." Path conforms to full technical spec.
**Downstream effect:** If approved, icon-command is ready for Phase B implementation. If rejected, Phase B is blocked for this icon until a revised path is provided.
**Required approval:** APPROVE or REJECT (if reject, provide revised path)

---

### FD-03: icon-system Prototype Approval

**Subject:** Approve terminal/monitor path for `icon-system`
**Current state:** Terminal/monitor prototype path exists. Conforms to UX-05 §14 specification.
**Question:** Is the terminal/monitor design approved for production use as `icon-system`?
**Option A:** APPROVE — use the prototype terminal/monitor path as shown in Section 4.2
**Option B:** REJECT — provide a revised path design before Phase B can proceed for this icon
**Evidence:** Same prototype source as FD-02. Path includes a monitor rect, terminal-line paths, and a filled accent circle.
**Downstream effect:** If approved, icon-system is ready for Phase B implementation.
**Required approval:** APPROVE or REJECT (if reject, provide revised path)

---

### FD-04: Agent Grid Architecture (GAP-31)

**Subject:** Agent grid scope and layout architecture for Phase D
**Current state:** No authority document specifies which option. Three options are documented in the gap inventory.
**Question:** Which agent grid architecture should Phase D implement?
**Option A:** Page-scoped — grid updates when active page changes (HIGH implementation complexity)
**Option B:** Global + context injection — static grid, page context passed as parameter (LOW complexity)
**Option C:** Hybrid — static grid with page-context highlighting (MEDIUM complexity)
**Evidence:** All options are ONE-APEX compliant. RX-07 Certification lists GAP-31 as "product decision pending."
**Downstream effect:** Determines the entire Phase D implementation. Option A requires switchPage chain modification. Option B does not. Option C requires lightweight switchPage integration.
**Required approval:** CHOOSE OPTION A, CHOOSE OPTION B, or CHOOSE OPTION C

---

### FD-05: Phase C Implementation Authorization (GAP-01 / UX-08)

**Subject:** Authorize Phase C (progressive disclosure) implementation
**Current state:** UX-08 is the complete design specification (COMPLETE status, 2026-08-27). No implementation has been performed. Phase A Certification and RX-07 Certification both have stale classifications ("BLOCKED — design required") — this is incorrect per UX-08 existence.
**Question:** Is Phase C implementation authorized, using UX-08 §§9–20 as the design authority?
**Option A:** AUTHORIZE — Phase C implementation begins. OQ-01 through OQ-06 resolved at kick-off.
**Option B:** DEFER — Phase C remains blocked. State the reason.
**Evidence:** UX-08 specifies: L0–L5 attention levels, L0–L4 disclosure depth, 7 categories, cognitive load budget, voice constraints, 5 implementation files, dashboard.html insertions. The specification is complete and sufficient for implementation.
**Downstream effect:** AUTHORIZE unblocks Phase C and GAP-24 (bottom sheet, which has a hard dependency on GAP-01). DEFER leaves Phases C, D (partial), and GAP-24 blocked.
**Required approval:** AUTHORIZE or DEFER

---

### FD-13: Partial Phase B Acceptability

**Subject:** Whether Phase B may proceed with fewer than 20 icons
**Current state:** GAP-29-DESIGN-DECISION-RECORD §10 explicitly states that partial Phase B does NOT satisfy GAP-29. UX-05 G-IG-03 says "Emoji are not used as UI icons under any circumstances" — a blanket rule.
**Question:** If 15 icon assets are not delivered simultaneously, is a partial Phase B (3, 5, or N icons converted while the remainder stays as Unicode) an acceptable intermediate state?
**Option A:** NO — full 20-icon delivery required before Phase B begins. Mixed icon/emoji state is not acceptable. (This is the position of existing authority documents.)
**Option B:** YES (partial) — Phase B proceeds for the N icons that have approved designs. The remainder converts when assets arrive. Explicitly supersedes UX-05 G-IG-03 for this intermediate period.
**Evidence:** GAP-29-DDR §10: "Whether to accept a partial Phase B as an intermediate state is a PRODUCT DECISION that the operator must make explicitly if desired. It is not implied or authorised by existing documents."
**Downstream effect:** OPTION A means Phase B is completely blocked until all 15 missing assets are delivered. OPTION B allows Phase B to begin immediately for the 3–5 icons with existing paths, at the cost of a mixed icon/emoji nav state.
**Required approval:** CHOOSE OPTION A or CHOOSE OPTION B (if Option B, specify minimum N to begin)

---

## SECTION 12 — DECISIONS REQUIRING DESIGN APPROVAL

### FD-06: icon-overview Mapping Decision

**Subject:** Semantic icon choice for `icon-overview`
**Current state:** A World globe prototype path exists. It was designed for the Phase D "World" surface (aggregate of ~10 legacy pages). "Overview" is the current single-page governance/pipeline/status display.
**Question:** Is the World globe semantically appropriate for `icon-overview`, or should a distinct design be created?
**Option A:** APPROVE World globe — use the candidate path from Section 4.3. Accept that the semantic stretch (world ≠ overview) is acceptable.
**Option B:** DESIGN NEW — provide an original icon design for overview that captures its actual semantics.
**Evidence:** GAP-29-DDR §6: "Whether to use the Phase D surface icon for the current per-page icon is a product/design decision." The globe was explicitly designed for a different concept.
**Downstream effect:** APPROVE unblocks icon-overview immediately. DESIGN NEW means icon-overview is added to the missing assets list (16 total instead of 15).
**Required approval:** APPROVE or DESIGN NEW (if Design New, deliver SVG path conforming to Section 4.4 tech contract)

---

### FD-07: icon-approvals Mapping Decision

**Subject:** Semantic icon choice for `icon-approvals`
**Current state:** A Decisions Stack prototype path exists. It was designed for the Phase D "Decisions" surface (aggregate of activity, agents, and approvals). "Approvals" is a narrower concept.
**Question:** Is the Decisions Stack semantically appropriate for `icon-approvals`, or should a distinct design be created?
**Option A:** APPROVE Decisions Stack — use the candidate path from Section 4.3. Accept that using this icon for "Approvals" now may create naming similarity with the future Phase D `icon-decisions` symbol.
**Option B:** DESIGN NEW — provide an original icon for approvals (e.g., a checkmark, a seal, a document with signature, etc.).
**Evidence:** GAP-29-DDR §6: "Requires explicit approval or rejection" — semantic mismatch identified between "Decisions" (Phase D surface) and "Approvals" (current page concept).
**Downstream effect:** APPROVE unblocks icon-approvals immediately. DESIGN NEW adds it to the missing assets list.
**Required approval:** APPROVE or DESIGN NEW (if Design New, deliver SVG path conforming to Section 4.4 tech contract)

---

### FD-08: GAP-25 Mobile Nav Design Specification

**Subject:** Bottom navigation bar design for mobile (5-tab pattern)
**Current state:** No design document exists for GAP-25. RX-07 Certification lists it as "OPEN — design required." The reconnaissance identifies `.bottom-nav` as dual-function: vertical sidebar on desktop, horizontal tab bar on mobile.
**Question:** What is the design for the mobile bottom navigation bar?
**Option A:** Produce a full GAP-25 design specification document equivalent in detail to UX-08. This document would specify: which 5 tabs, tab order, labels, active state, inactive state, icon use, overflow handling, and breakpoint behaviour.
**Option B:** Defer GAP-25 — Phase E remains blocked until mobile design is specified. The desktop navigation is unaffected.
**Evidence:** GAP-25 has no existing design foundation. A specification must be created before Phase E can be planned or implemented.
**Downstream effect:** PRODUCE SPEC unblocks Phase E. DEFER blocks Phase E indefinitely.
**Required approval:** PRODUCE SPEC (assign to designer) or DEFER (state reason)

---

## SECTION 13 — MISSING ASSET DELIVERIES

### FD-12: 15 Missing SVG Icon Designs

**Subject:** SVG path designs for 15 navigation icons with no existing designs
**Status:** BLOCKED — no path data exists in any authoritative document

**Required for each icon:**
- `viewBox="0 0 20 20"`
- `stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"`
- `fill="none"` (with intentional accent fills using `fill="currentColor"` where explicitly chosen)
- A semantically meaningful visual design (no external library paths may be used)

**Icons requiring design from scratch:**

| Symbol ID | Nav Label | Semantic Domain | Phase D Fate |
|-----------|-----------|-----------------|-------------|
| `icon-operation` | Operation | Tasks, agents, scheduling | World surface |
| `icon-finance` | Finance | Budgets, investing, planning | World surface |
| `icon-communication` | Network | Messages, contacts, comms | World surface |
| `icon-business` | Business | Ideas, projects, commerce | World surface |
| `icon-health` | Health | Health, habits, wellbeing | World surface |
| `icon-university` | University | Coursework, revision, notes | World surface |
| `icon-occult` | Occult | Research, esoteric, archive | World surface |
| `icon-research` | Research | Intelligence, sources, data | World/Knowledge |
| `icon-civilisation` | Civilisation | Genome, consensus, clock | World surface |
| `icon-reality` | Reality | Fabric, claims, epistemic | World surface |
| `icon-activity` | Activity | Events, observability, feed | Decisions surface |
| `icon-agents` | Agents | Status, tasks, authority | Decisions surface |
| `icon-intelligence` | Intel | Briefing, opportunities | Knowledge surface |
| `icon-memory` | Memory | Episodic, semantic, health | System surface |
| `icon-governance` | Govern | Constitutional, authority | System surface |

**Design note from GAP-29-DDR §7:** 15 of 20 navigation buttons are scheduled for Phase E retirement. The designer may choose to create simpler/geometric icons for Phase-E-retirement pages and invest more design effort in the 3 surviving icons (command, knowledge, system). This is a product choice — not a constraint from existing authority.

**Delivery format:** May be delivered as SVG path strings, a pre-structured `<symbol>` block, or an explicit "approve prototype path" instruction per icon. The format does not affect Phase B execution.

---

## SECTION 14 — DECISION SESSION AGENDA

This agenda enables the product owner to resolve the maximum number of gates in a single session. FD-12 (asset delivery) and FD-08 (design specification production) cannot be resolved in a decision session — they require creative work.

### Group A: Decisions That Can Be Made in This Session (9 decisions)

| # | Decision | Time Required | Category |
|---|----------|---------------|----------|
| FD-01 | Sprite location (inline vs external) | 2 min | Product |
| FD-02 | icon-command prototype approval | 2 min | Product |
| FD-03 | icon-system prototype approval | 2 min | Product |
| FD-04 | Agent grid architecture (A/B/C) | 5 min | Product |
| FD-05 | Phase C implementation authorization | 3 min | Product |
| FD-06 | icon-overview mapping (globe or new design) | 3 min | Design |
| FD-07 | icon-approvals mapping (stack or new design) | 3 min | Design |
| FD-09 | SVG href vs xlink:href | 2 min | Technical |
| FD-10 | apex-v2.css Phase F migration authorization | 3 min | Technical |
| FD-11 | Token namespace strategy (bridge/migrate/absorb) | 5 min | Technical |
| FD-13 | Partial Phase B acceptability | 3 min | Product |

**Estimated session time for decisions: 33 minutes**

### Group B: Decisions Requiring Design Work (external to session)

| Decision | Work Required |
|----------|--------------|
| FD-08 | Produce GAP-25 mobile nav design specification |
| FD-06 (if DESIGN NEW) | Create icon-overview SVG path |
| FD-07 (if DESIGN NEW) | Create icon-approvals SVG path |

### Group C: Decisions That Resolve After Other Decisions

| Decision | Prerequisite |
|----------|-------------|
| Gate 11 (per-block disposition) | Gate 10 (FD-11) must be decided first |
| icon-knowledge prototype approval | Add to session — 2 min (not listed separately above but can be resolved alongside FD-02/03) |

### Group D: Asset Delivery Required

| Item | Description |
|------|-------------|
| FD-12 | 15 SVG icon designs (creative work, cannot be decided — must be created) |

---

## SECTION 15 — FORMAL APPROVAL SHEET

Each decision is presented in full. The product owner can respond with APPROVE / REJECT / CHOOSE OPTION A / CHOOSE OPTION B / CHOOSE OPTION C / DEFER to each item.

---

### FD-01 — SPRITE LOCATION

| Field | Value |
|-------|-------|
| **Decision ID** | FD-01 |
| **Gate** | Gate 2 |
| **Subject** | SVG sprite container placement |
| **Phase** | B |
| **Current State** | Undecided — two authority sources conflict |
| **Question** | Should the sprite be inline in dashboard.html, or in an external file? |
| **Option A** | INLINE — sprite block added inside dashboard.html `<body>`. No new files. No additional HTTP request. File grows ~5–10 KB. |
| **Option B** | EXTERNAL — sprite placed at `public/icons.svg`. New file created. Additional HTTP request. dashboard.html unchanged in size. |
| **Option C** | N/A |
| **Evidence** | Gap inventory: "SVG asset files (new)" → external. Reconnaissance Phase B files table: only `dashboard.html` → inline. Conflict unresolved. |
| **Downstream Effect** | Determines Phase B file scope. Option B creates a new production file. Under ONE-APEX single-SPA architecture, the caching benefit of external is minimal. |
| **Authority Default** | None — no authority document specifies |
| **Required Approval** | Product owner |

**→ DECISION: RESOLVED (2026-08-28) — OPTION A: INLINE. SVG sprite block inserted inline in dashboard.html `<body>`. No new file created. No additional HTTP request. Phase B scope confirmed as single-file (dashboard.html only). Sprite location ambiguity between gap inventory and reconnaissance formally closed.**

---

### FD-02 — ICON-COMMAND PROTOTYPE APPROVAL

| Field | Value |
|-------|-------|
| **Decision ID** | FD-02 |
| **Gate** | Gate 3 |
| **Subject** | Approve star polygon design for icon-command |
| **Phase** | B |
| **Current State** | Prototype path exists, conforming to UX-05 §14 spec |
| **Question** | Is the star polygon approved for production use as icon-command? |
| **Option A** | APPROVE — use prototype path as shown in Section 4.2 |
| **Option B** | REJECT — provide revised path. Phase B blocked for this icon until revised path delivered. |
| **Option C** | N/A |
| **Evidence** | Path from `docs/interface/prototype/apex-command-prototype.html`. Prototype comment: "REWORK from emoji." Path conforms exactly to UX-05 §14 technical contract. |
| **Downstream Effect** | APPROVE: icon-command immediately ready for Phase B. REJECT: blocked. |
| **Authority Default** | None — prototype is a design candidate, not an authority decision |
| **Required Approval** | Product owner |

**→ DECISION: RESOLVED (2026-08-28) — APPROVED. Star polygon path from Section 4.2 approved for production use as `icon-command`. Design locked. Ready for Phase B sprite when Phase B is authorized.**

---

### FD-03 — ICON-SYSTEM PROTOTYPE APPROVAL

| Field | Value |
|-------|-------|
| **Decision ID** | FD-03 |
| **Gate** | Gate 3 |
| **Subject** | Approve terminal/monitor design for icon-system |
| **Phase** | B |
| **Current State** | Prototype path exists, conforming to UX-05 §14 spec |
| **Question** | Is the terminal/monitor design approved for production use as icon-system? |
| **Option A** | APPROVE — use prototype path as shown in Section 4.2 |
| **Option B** | REJECT — provide revised path |
| **Option C** | N/A |
| **Evidence** | Same prototype source as FD-02. Path includes monitor rectangle, terminal line paths, and single filled accent circle on status indicator. |
| **Downstream Effect** | APPROVE: icon-system immediately ready for Phase B. REJECT: blocked. |
| **Authority Default** | None |
| **Required Approval** | Product owner |

**→ DECISION: RESOLVED (2026-08-28) — APPROVED. Terminal/monitor path from Section 4.2 approved for production use as `icon-system`. Design locked. icon-system is a Phase D-surviving icon (System surface). Ready for Phase B sprite when Phase B is authorized.**

---

### FD-04 — AGENT GRID ARCHITECTURE (GAP-31)

| Field | Value |
|-------|-------|
| **Decision ID** | FD-04 |
| **Gate** | Gate 8 |
| **Subject** | Agent grid scope and architecture for Phase D |
| **Phase** | D |
| **Current State** | No design spec exists. RX-07 lists as "product decision pending." |
| **Question** | Which agent grid architecture should Phase D implement? |
| **Option A** | PAGE-SCOPED — grid shows page-relevant agents; updates on every switchPage. HIGH implementation complexity. |
| **Option B** | GLOBAL + CONTEXT — static grid, page context passed as agent input parameter. LOW complexity. |
| **Option C** | HYBRID — static grid with page-context highlighting on switch. MEDIUM complexity. |
| **Evidence** | All options are ONE-APEX compliant. No options require a second runtime. |
| **Downstream Effect** | Determines entire Phase D implementation scope. Option A requires switchPage chain modification. |
| **Authority Default** | None — no existing authority specifies |
| **Required Approval** | Product owner |

**→ DECISION: RESOLVED (2026-08-28) — OPTION C: HYBRID. Global agent grid with page-context highlighting. Static grid (agents always visible). Page-switch events trigger visual highlighting of context-relevant agents. No full grid rebind on every switchPage. switchPage chain receives lightweight addition only. Phase D implementation scope confirmed as HYBRID architecture.**

---

### FD-05 — PHASE C IMPLEMENTATION AUTHORIZATION (GAP-01 / UX-08)

| Field | Value |
|-------|-------|
| **Decision ID** | FD-05 |
| **Gate** | Gate 6 |
| **Subject** | Authorize Phase C progressive disclosure implementation |
| **Phase** | C |
| **Current State** | UX-08 specification COMPLETE. No implementation performed. Prior "BLOCKED — no design" classification was incorrect. |
| **Question** | Is Phase C implementation authorized, with UX-08 §§9–20 as design authority? |
| **Option A** | AUTHORIZE — Phase C begins. OQ-01 through OQ-06 resolved at kick-off. |
| **Option B** | DEFER — Phase C remains blocked. Reason must be stated. |
| **Option C** | N/A |
| **Evidence** | UX-08 COMPLETE (2026-08-27): specifies L0–L5 attention levels, L0–L4 disclosure depth, 7 categories, voice constraints, cognitive load budget, 5 implementation files, and exact dashboard.html DOM insertions. |
| **Downstream Effect** | AUTHORIZE unblocks Phase C and GAP-24 (bottom sheet, hard dependency on GAP-01). DEFER keeps both blocked. |
| **Authority Default** | UX-08 is the design authority. Authorization is the only remaining gate. |
| **Required Approval** | Product owner |

**→ DECISION: RESOLVED (2026-08-28) — AUTHORIZED. Phase C implementation authorized. UX-08 §§9–20 is the governing design specification. Per Decision Pack §17, this decision IS the Phase C implementation authorization — no separate directive required. OQ-01 through OQ-06 to be resolved at implementation kick-off. Phase C is IMPLEMENTATION-READY. GAP-24 (bottom sheet) unblocks upon Phase C completion.**

---

### FD-06 — ICON-OVERVIEW MAPPING (DESIGN DECISION)

| Field | Value |
|-------|-------|
| **Decision ID** | FD-06 |
| **Gate** | Gate 4 |
| **Subject** | Icon design for icon-overview |
| **Phase** | B |
| **Current State** | World globe candidate path exists from prototype. Designed for Phase D "World" surface, not current "Overview" page. |
| **Question** | Is the World globe semantically appropriate for icon-overview? |
| **Option A** | APPROVE GLOBE — use the World globe candidate path from Section 4.3 |
| **Option B** | DESIGN NEW — create a distinct icon for Overview. This adds icon-overview to the missing assets list (16 total). |
| **Option C** | N/A |
| **Evidence** | GAP-29-DDR §6: semantic stretch identified — "World" = Phase D aggregate surface; "Overview" = current governance/pipeline/status page. Designer must decide if globe is acceptable. |
| **Downstream Effect** | APPROVE: icon-overview immediately available for Phase B. DESIGN NEW: blocked until new path delivered. |
| **Authority Default** | None — semantic mapping requires design judgment |
| **Required Approval** | Designer |

**→ DECISION: RESOLVED (2026-08-28) — APPROVE GLOBE. World globe candidate path from Section 4.3 approved for production use as `icon-overview`. Semantic stretch acknowledged and accepted. Design locked. Ready for Phase B sprite when Phase B is authorized.**

---

### FD-07 — ICON-APPROVALS MAPPING (DESIGN DECISION)

| Field | Value |
|-------|-------|
| **Decision ID** | FD-07 |
| **Gate** | Gate 4 |
| **Subject** | Icon design for icon-approvals |
| **Phase** | B |
| **Current State** | Decisions Stack candidate path exists from prototype. Designed for Phase D "Decisions" surface aggregate. |
| **Question** | Is the Decisions Stack semantically appropriate for icon-approvals? |
| **Option A** | APPROVE STACK — use the Decisions Stack candidate path from Section 4.3 |
| **Option B** | DESIGN NEW — create a distinct icon for Approvals (e.g. checkmark, seal, signature). Adds icon-approvals to missing assets list. |
| **Option C** | N/A |
| **Evidence** | GAP-29-DDR §6: "Decisions" icon maps to Phase D surface aggregating activity/agents/approvals. "Approvals" is narrower. Using the same icon for both creates naming similarity risk with future icon-decisions. |
| **Downstream Effect** | APPROVE: icon-approvals immediately available for Phase B. DESIGN NEW: blocked until new path delivered. |
| **Authority Default** | None — semantic mapping requires design judgment |
| **Required Approval** | Designer |

**→ DECISION: RESOLVED (2026-08-28) — APPROVE STACK. Decisions Stack candidate path from Section 4.3 approved for production use as `icon-approvals`. Semantic imprecision and future icon-decisions naming similarity acknowledged and accepted. Phase D will create a distinct `icon-decisions` symbol for the aggregate surface. Design locked. Ready for Phase B sprite when Phase B is authorized.**

---

### FD-08 — GAP-25 MOBILE NAV DESIGN SPECIFICATION

| Field | Value |
|-------|-------|
| **Decision ID** | FD-08 |
| **Gate** | Gate 7 |
| **Subject** | Mobile navigation bottom bar design (5-tab pattern) |
| **Phase** | E |
| **Current State** | No design spec exists. RX-07: "OPEN — design required." `.bottom-nav` is currently dual-function (desktop sidebar / mobile tab bar via CSS grid-area). |
| **Question** | Should GAP-25 mobile nav design work begin? |
| **Option A** | PRODUCE SPEC — assign to designer. Deliver a GAP-25 design document specifying: 5 tabs, order, labels, active/inactive states, icon usage, overflow handling, breakpoints. |
| **Option B** | DEFER — Phase E remains blocked. No mobile-specific work proceeds. |
| **Option C** | N/A |
| **Evidence** | GAP-25 is a Phase E prerequisite. Phase E has no other dependencies beyond GAP-25 design and Phase D completion. |
| **Downstream Effect** | PRODUCE SPEC unblocks Phase E planning. DEFER blocks Phase E indefinitely. |
| **Authority Default** | None — no existing design foundation |
| **Required Approval** | Product owner (assign work); Designer (produce specification) |

**→ DECISION: RESOLVED (2026-08-28) — PRODUCE SPEC. GAP-25 mobile navigation design work is commissioned. A design specification document must be produced covering: 5 tabs shown in mobile bottom bar, tab order, labels, active/inactive states, icon usage, overflow handling, and breakpoint behaviour. Phase E implementation remains blocked until spec is delivered and Phase D is complete. Desktop navigation is unaffected.**

---

### FD-09 — SVG HREF vs XLINK:HREF (TECHNICAL DECISION)

| Field | Value |
|-------|-------|
| **Decision ID** | FD-09 |
| **Gate** | Gate 1 |
| **Subject** | SVG `<use>` element attribute for sprite references |
| **Phase** | B |
| **Current State** | Reconnaissance (BETA-LEGACY-INTERFACE-CONVERGENCE-RECONNAISSANCE.md) explicitly specifies `xlink:href`. Dashboard.html has zero `xlink` usage. `xlink:href` is deprecated in SVG 2.0. |
| **Question** | Should Phase B implement `href` or `xlink:href` for `<use>` elements? |
| **Option A** | `href` — Modern SVG 2.0 attribute. Supported by all browsers released after 2016. Consistent with zero `xlink` usage in the codebase. No `xmlns:xlink` namespace declaration required. |
| **Option B** | `xlink:href` — As specified in the reconnaissance document. Deprecated in SVG 2.0. Requires adding `xmlns:xlink="http://www.w3.org/1999/xlink"` namespace declaration to each `<svg>` element or ancestor. Silent failure risk in strict XML parsers if namespace omitted. |
| **Option C** | N/A |
| **Evidence** | GAP-29-DDR §9: "Technical recommendation (not a decision): `href` is the correct modern attribute. All browsers released after 2016 support `href` on `<use>`. The reconnaissance's `xlink:href` phrasing appears to be a documentation convention (older SVG notation), not a technical requirement." Zero `xlink:href` instances in live codebase confirmed. |
| **Downstream Effect** | Option A: modern, no namespace declaration needed. Option B: adds namespace complexity, requires xmlns:xlink on each svg element. |
| **Authority Default** | Reconnaissance says `xlink:href`. Technical evidence strongly supports `href`. This document presents both; the technical recommendation from GAP-29-DDR is `href`. |
| **Required Approval** | Product owner (to explicitly supersede reconnaissance specification) |

**→ DECISION: RESOLVED BY REPOSITORY EVIDENCE — Use `href`. Evidence: (1) zero instances of `xlink:href` anywhere in the live codebase (dashboard.html, apex-v2.css, all JS files); (2) `xlink:href` is deprecated in the SVG 2.0 specification; (3) `xmlns:xlink` namespace is not declared in dashboard.html — using `xlink:href` without this declaration causes silent failure in strict XML parsers; (4) GAP-29-DDR §9 explicitly states "href is the correct modern attribute" and identifies reconnaissance's `xlink:href` as "a documentation convention (older SVG notation), not a technical requirement"; (5) all browsers released after 2016 support plain `href` on `<use>` elements. The reconnaissance specification of `xlink:href` is superseded by objective repository evidence. No human product decision required. Phase B must implement `href`.**

---

### FD-10 — APEX-V2.CSS PHASE F MIGRATION AUTHORIZATION

| Field | Value |
|-------|-------|
| **Decision ID** | FD-10 |
| **Gate** | Gate 9 |
| **Subject** | Authorize Phase F migration and removal of apex-v2.css |
| **Phase** | F |
| **Current State** | UX-05 §4.7 RETIRES the color system. Unique non-color vars must be migrated before removal. |
| **Question** | Is Phase F authorized to execute the apex-v2.css migration and removal? |
| **Option A** | AUTHORIZE — Phase F implementation team: (1) audits which unique vars are consumed, (2) migrates them to `--ax-*` namespace, (3) removes apex-v2.css link from dashboard.html lines 3909–3910, (4) deletes or archives `public/apex-v2.css`. |
| **Option B** | DEFER — apex-v2.css remains linked. Its color system is already overridden by `--ax-*` !important at runtime, so visual impact is minimal. Structural debt remains. |
| **Option C** | N/A |
| **Evidence** | UX-05 §4.7: "RETIRE — Conflicts with established cyan identity; no place in canonical system." Unique vars documented in Section 5.3 of this document. |
| **Downstream Effect** | AUTHORIZE enables Phase F to proceed for this track. DEFER leaves 14th `:root` block active and the dashboard.html linked to a file marked for retirement. |
| **Authority Default** | UX-05 §4.7 establishes the RETIRE direction. Authorization of the migration task is the open question. |
| **Required Approval** | Product owner |

**→ DECISION: RESOLVED (2026-08-28) — AUTHORIZED. Phase F is authorized to execute the apex-v2.css migration and removal: (1) audit unique non-color var consumption, (2) migrate confirmed-consumed vars to `--ax-*` Block 5, (3) remove link from dashboard.html lines 3909–3910, (4) delete or archive `public/apex-v2.css`. Phase F implementation awaits Phase E completion and a separate "Phase F Implementation Authorized" directive.**

---

### FD-11 — TOKEN NAMESPACE STRATEGY

| Field | Value |
|-------|-------|
| **Decision ID** | FD-11 |
| **Gate** | Gate 10 |
| **Subject** | Reconciliation strategy for `--ax-*` and `--apex-color-*` namespaces |
| **Phase** | F |
| **Current State** | Two active namespaces. `--ax-*` is canonical (UX-05). `--apex-color-*` added by UX-19 as additive. Not bridged. |
| **Question** | How should `--apex-color-*` be reconciled with `--ax-*`? |
| **Option A** | BRIDGE — add `--apex-color-primary: var(--ax-primary)` bridge declarations in the --ax-* block. Components using --apex-color-* receive correct values. Bridge declarations maintained going forward. Zero consumer changes. |
| **Option B** | MIGRATE — find all `--apex-color-*` usages in dashboard.html and rename to `--ax-*` equivalents. Delete the UX-19 `:root` block (Block 7). Clean result; no bridge maintenance. |
| **Option C** | N/A (A unified third namespace would introduce more complexity, not less) |
| **Evidence** | UX-05 canonical namespace is `--ax-*`. UX-19 added `--apex-color-*` as "additive block only" — not as a canonical replacement. `--ax-*` !important does not cover `--apex-color-*` consumers. |
| **Downstream Effect** | Option A: low risk, bridge added, no component changes. Option B: medium risk, requires exhaustive consumer search, clean end state. Both result in a single canonical namespace. Gate 11 (Block 7 disposition) resolves from this choice. |
| **Authority Default** | `--ax-*` is canonical per UX-05. Strategy for reconciling `--apex-color-*` is unspecified. |
| **Required Approval** | Product owner (technical implementation strategy) |

**→ DECISION: RESOLVED (2026-08-28) — OPTION A: BRIDGE. Add bridge declarations inside the `--ax-*` Final Authority Layer block (Block 5): `--apex-color-primary: var(--ax-primary)` etc. Zero component changes. Block 7 (`--apex-color-*`) retained; bridge ensures canonical values propagate to all `--apex-color-*` consumers. `--ax-*` remains the canonical forward namespace for all new component authoring. Gate 11 (Block 7 disposition) resolves automatically — Block 7 retained with bridge, not deleted.**

---

### FD-12 — ICON-KNOWLEDGE PROTOTYPE APPROVAL

| Field | Value |
|-------|-------|
| **Decision ID** | FD-12a |
| **Gate** | Gate 3 |
| **Subject** | Approve open book design for icon-knowledge |
| **Phase** | B |
| **Current State** | Prototype path exists, conforming to UX-05 §14 spec |
| **Question** | Is the open book design approved for production use as icon-knowledge? |
| **Option A** | APPROVE — use prototype path as shown in Section 4.2 |
| **Option B** | REJECT — provide revised path |
| **Option C** | N/A |
| **Evidence** | Same prototype source as FD-02/03. Path includes book body with left page and two horizontal rules for text lines. |
| **Downstream Effect** | APPROVE: icon-knowledge immediately ready for Phase B. icon-knowledge survives Phase D (Knowledge surface icon). REJECT: blocked. |
| **Authority Default** | None |
| **Required Approval** | Product owner |

**→ DECISION: RESOLVED (2026-08-28) — APPROVED. Open book path from Section 4.2 approved for production use as `icon-knowledge`. icon-knowledge is a Phase D-surviving icon (Knowledge surface — highest long-term visibility of the three survivors). Design locked. Ready for Phase B sprite when Phase B is authorized.**

---

### FD-13 — PARTIAL PHASE B ACCEPTABILITY

| Field | Value |
|-------|-------|
| **Decision ID** | FD-13 |
| **Gate** | N/A (additional decision identified from GAP-29-DDR §10) |
| **Subject** | Whether Phase B may proceed with fewer than 20 completed icons |
| **Phase** | B |
| **Current State** | Existing authority (UX-05 G-IG-03) prohibits emoji as UI icons under any circumstances. GAP-29 scope requires all nav icons replaced. |
| **Question** | If only 3–5 icons are ready, may Phase B begin for those icons while others remain as Unicode? |
| **Option A** | NO — full 20-icon delivery required before Phase B begins. UX-05 G-IG-03 is a blanket rule. This is the position of all existing authority documents. |
| **Option B** | PARTIAL PHASE B — Phase B proceeds for icons with approved designs. Explicitly supersedes UX-05 G-IG-03 for the interim period. Requires specifying the minimum N icons needed to begin (recommendation: all 5 with existing/approved paths: command, knowledge, system, plus overview and approvals decisions). |
| **Option C** | N/A |
| **Evidence** | GAP-29-DDR §10: "Not recommended — full delivery of all 20 icons is the correct approach. Whether to accept a partial Phase B... is a PRODUCT DECISION that the operator must make explicitly." |
| **Downstream Effect** | Option A: Phase B blocked until all 15 missing assets delivered. Option B: Phase B can begin immediately for approved icons, with a second Phase B pass when remaining assets arrive. Creates a mixed icon/emoji interim state. |
| **Authority Default** | OPTION A is the authority-default position. OPTION B requires explicit operator authorization. |
| **Required Approval** | Product owner |

**→ DECISION: RESOLVED (2026-08-28) — OPTION A: FULL DELIVERY REQUIRED. Phase B does not begin until all 20 icon designs are available. Mixed icon/Unicode nav state is not acceptable. UX-05 G-IG-03 blanket prohibition upheld. GAP-29-DDR §10 full delivery requirement upheld. 5 icons are now approved and ready (command, system, knowledge, overview, approvals). 15 icon asset designs remain outstanding. Phase B is BLOCKED until FD-12 deliveries are complete.**

---

## SECTION 16 — POST-DECISION DEPENDENCY GRAPH

After all decisions are recorded, the following work becomes unblocked:

### After FD-01 (Sprite Location) + FD-09 (href):

→ Implementation team knows exact Phase B technical architecture
→ Phase B implementation spec is complete
→ Only awaiting FD-02/03/04/FD-12a (icon approvals) and FD-12 (asset delivery) to begin

### After FD-02 + FD-03 + FD-12a (All 3 Prototype Approvals):

→ 3 icons (command, knowledge, system) are immediately ready for Phase B
→ Phase B can begin for these 3 if FD-13 authorizes partial Phase B (Option B)

### After FD-06 + FD-07 (Ambiguous Mappings):

→ If both APPROVED: 5 icons total are ready for Phase B (command, knowledge, system + overview + approvals)
→ If either DESIGN NEW: that icon joins the 15-asset delivery queue

### After FD-12 (All 15 Asset Designs Delivered):

→ All 20 icons available
→ Phase B implementation can begin (regardless of FD-13 decision)
→ Phase B READY: insert sprite into dashboard.html, update 20 nav-icon spans, invert RX-07 test P7-10

### After FD-05 (Phase C Authorization):

→ Phase C implementation begins
→ OQ-01 through OQ-06 resolved at kick-off meeting
→ 5 new files created: lib/context/context-engine.js, lib/context/relevance-filter.js, lib/presentation/presentation-queue.js, public/js/components/contextual-card.js, lib/attention/attention-bridge.js
→ `<div id="cx-card-zone">` and `<div id="cx-top-chrome">` inserted into dashboard.html
→ GAP-24 (bottom sheet) unblocked immediately after Phase C

### After FD-04 (Agent Grid Architecture):

→ Phase D implementation scope is defined
→ Phase D READY: agents page layout + optional switchPage integration

### After FD-08 (Mobile Nav Spec Produced):

→ Phase E planning can begin
→ Phase E READY: after Phase D complete and GAP-25 spec delivered

### After FD-10 + FD-11 (Phase F Authorizations):

→ Phase F implementation scope is defined
→ Gate 11 resolves from FD-11 choice (no additional decision required)
→ Phase F READY: apex-v2.css migration audit → var migration → :root block consolidation → file removal
→ Phase A-3 / GAP-27 simultaneously unblocks

---

## SECTION 17 — IMPLEMENTATION AUTHORIZATION BOUNDARY

### Critical Distinction

**A decision recorded in this document is NOT an implementation authorization.**

A product/design decision establishes WHAT to build and defines the scope. An implementation authorization is a separate, explicit directive that says WHEN to build it and who is authorized to make code changes.

### Authorization Protocol

Each phase requires a separate implementation authorization after decisions are recorded:

| Phase | Decision Gates | Implementation Authorization |
|-------|---------------|------------------------------|
| Phase B | FD-01, 02, 03, FD-12a, FD-09, FD-13 + FD-12 assets | Separate "Phase B Implementation Authorized" directive |
| Phase C | FD-05 | FD-05 itself IS the authorization (it explicitly says "authorize") |
| Phase D | FD-04 | Separate "Phase D Implementation Authorized" directive |
| Phase E | FD-08 + spec delivery | Separate "Phase E Implementation Authorized" directive |
| Phase F | FD-10, FD-11 | Separate "Phase F Implementation Authorized" directive |

### What Decisions Do Not Authorize

Recording decisions in this document does NOT authorize:
- Modification of `public/dashboard.html`
- Modification of `public/apex-v2.css`
- Modification of any route or backend file
- Creation of any SVG files
- Running any RX sprint
- Beginning any phase implementation

### What Requires Explicit Implementation Authorization

| Action | Requires |
|--------|---------|
| Insert SVG sprite into dashboard.html | Phase B implementation authorization |
| Update 20 nav-icon spans | Phase B implementation authorization |
| Create lib/context/ files | Phase C authorization (FD-05 serves as this for Phase C only) |
| Insert cx-card-zone / cx-top-chrome divs | Phase C authorization |
| Build agents page layout | Phase D implementation authorization |
| Execute apex-v2.css migration | Phase F implementation authorization |
| Consolidate 13 :root blocks | Phase F implementation authorization |

---

## SECTION 18 — EXACT PRECONDITIONS FOR PHASE B

Phase B is READY TO IMPLEMENT when ALL of the following are satisfied:

### Technical Architecture (Both Required)

- [ ] **FD-01 decided** — sprite location (inline or external) confirmed
- [ ] **FD-09 decided** — `href` or `xlink:href` confirmed

### Icon Path Availability (5 Decisions)

- [ ] **FD-02 decided** — icon-command prototype approved or alternative path provided
- [ ] **FD-03 decided** — icon-system prototype approved or alternative path provided
- [ ] **FD-12a decided** — icon-knowledge prototype approved or alternative path provided
- [ ] **FD-06 decided** — icon-overview mapping confirmed (approve globe or design new delivered)
- [ ] **FD-07 decided** — icon-approvals mapping confirmed (approve stack or design new delivered)

### Asset Delivery (External)

- [ ] **FD-12 delivered** — 15 missing icon SVG paths delivered conforming to Section 4.4 tech contract (OR FD-13 Option B chosen with minimum N icons specified)

### Scope Decision

- [ ] **FD-13 decided** — full 20-icon delivery required, OR partial Phase B authorized with minimum N specified

### Regression Awareness

- RX-07 test P7-10 (`!dash.includes('ds-icon-sprite')`) must be INVERTED to `dash.includes('ds-icon-sprite')` as part of Phase B regression suite update

### Phase B Implementation Authorization

- [ ] Separate "Phase B Implementation Authorized" directive issued after all above satisfied

---

## SECTION 19 — EXACT PRECONDITIONS FOR PHASES C–F

### Phase C Preconditions

- [ ] **FD-05 decided: AUTHORIZE** — this IS the Phase C implementation authorization
- [ ] OQ-01 through OQ-06 resolved at implementation kick-off (not pre-requisites for authorization, but required before code is written)
- Phase C is READY immediately upon FD-05 AUTHORIZE

**Phase C implementation scope:**
- Create 5 new files (listed in Section 3.1)
- Insert 2 `<div>` elements into dashboard.html
- No existing production code modified (additive only)

---

### Phase D Preconditions

- [ ] **FD-04 decided** — agent grid architecture chosen
- [ ] Phase C complete (Phase D depends on Phase C navigation structure being stable)
- [ ] Separate "Phase D Implementation Authorized" directive issued

**Phase D implementation scope:** Agents page layout. Conditional switchPage integration (if Option A or C chosen).

---

### Phase E Preconditions

- [ ] **FD-08 decided: PRODUCE SPEC** — GAP-25 design specification produced
- [ ] Phase D complete
- [ ] GAP-25 specification document delivered
- [ ] Separate "Phase E Implementation Authorized" directive issued

**Phase E implementation scope:** Mobile bottom navigation bar component, responsive breakpoint updates, legacy page retirement sequence.

---

### Phase F Preconditions

- [ ] **FD-10 decided: AUTHORIZE** — Phase F apex-v2.css migration authorized
- [ ] **FD-11 decided** — namespace strategy chosen (bridge/migrate)
- [ ] Gate 11 (per-block disposition) — resolves from FD-11 decision via implementation team audit (no additional product decision)
- [ ] Phase E complete
- [ ] Separate "Phase F Implementation Authorized" directive issued

**Phase F implementation scope:** apex-v2.css unique var audit + migration → :root block consolidation (13 inline → 1) → apex-v2.css link removal → apex-v2.css deletion.

**Phase F risk:** HIGH — destructive CSS foundation operations. Visual regression testing across all 20 pages required before and after.

---

### Phase A-3 / GAP-27 Preconditions (Remaining Phase A Item)

- [ ] **FD-11 decided** — namespace strategy resolves Block 7 disposition
- [ ] Implementation team completes var-level audit of Blocks 1–4, 6, 8 against Block 5
- [ ] Separate "Phase A-3 Implementation Authorized" directive issued

**Note:** Phase A-3 (GAP-27) can be authorized independently of Phases D, E if FD-11 is resolved. It does not depend on Phase completion order.

---

## SECTION 20 — FINAL DECISION STATUS

### Decisions Ready to Record (After This Session)

| Decision ID | Subject | Status Required |
|-------------|---------|----------------|
| FD-01 | Sprite location | APPROVE inline / APPROVE external |
| FD-02 | icon-command approval | APPROVE / REJECT |
| FD-03 | icon-system approval | APPROVE / REJECT |
| FD-04 | Agent grid architecture | OPTION A / B / C |
| FD-05 | Phase C authorization | AUTHORIZE / DEFER |
| FD-06 | icon-overview mapping | APPROVE / DESIGN NEW |
| FD-07 | icon-approvals mapping | APPROVE / DESIGN NEW |
| FD-08 | Mobile nav design | PRODUCE SPEC / DEFER |
| FD-09 | href vs xlink:href | **RESOLVED — `href` confirmed by repository evidence** |
| FD-10 | Phase F authorization | AUTHORIZE / DEFER |
| FD-11 | Namespace strategy | OPTION A (bridge) / OPTION B (migrate) |
| FD-12a | icon-knowledge approval | APPROVE / REJECT |
| FD-13 | Partial Phase B | OPTION A (full only) / OPTION B (partial allowed) |

### Gates Resolved Before This Session (No Action Required)

All items in Section 10 (R-01 through R-20) are closed. No product owner response required.

### Remaining External Dependencies

| Item | Dependency Type | Owner |
|------|----------------|-------|
| FD-12 (15 icon designs) | Asset delivery | Designer |
| FD-08 (GAP-25 spec) | Design production | Designer |
| FD-06 (if DESIGN NEW) | Asset delivery | Designer |
| FD-07 (if DESIGN NEW) | Asset delivery | Designer |

---

**PRODUCT/DESIGN DECISION PACK COMPLETE — NO IMPLEMENTATION PERFORMED — AWAITING EXPLICIT PRODUCT/DESIGN APPROVAL.**

---

## Terminal Summary

**Gates resolved by existing authority:** 4 (Gates 3 prototype paths are design candidates; R-01 through R-20 in Section 10 are fully resolved without action)

**Gates requiring human decisions this session:** 9 decisions (FD-01, 02, 03, FD-12a, 04, 05, 09, 10, 11, 13) = product and technical decisions resolvable in one session; plus 3 design decisions (FD-06, 07, 08) requiring designer input

**Gates blocked by asset delivery:** 1 (Gate 5 / FD-12: 15 icon designs required)

**Exact next action:** Product owner reviews Sections 11–13 and records decisions in the Formal Approval Sheet (Section 15). Each decision requires one of: APPROVE / REJECT / CHOOSE OPTION A / CHOOSE OPTION B / CHOOSE OPTION C / DEFER. Once decisions are recorded, each phase receives a separate explicit implementation authorization before code changes begin.

---

## SECTION 21 — TERMINAL READINESS STATE

**Resolution date:** 2026-08-28
**Method:** Decision classification against all authority documents — no production files modified
**Status of Section 15:** All 13 decision lines annotated. 1 resolved by repository evidence (FD-09). 12 remain OPEN pending human or design input.

---

### A — RESOLVED

The following decisions and items are closed. No further input required for these.

| # | Item | Resolution | Authority / Evidence |
|---|------|------------|---------------------|
| R-01 | Symbol ID: `icon-{page-name}` matching `pages[]` | CLOSED | GAP-29-DDR §9; pages[] dashboard.html:12736 |
| R-02 | Sprite container ID: `ds-icon-sprite` | CLOSED | RX-07 test P7-10 |
| R-03 | nav-more excluded from Phase B | CLOSED | dashboard.html:12726; pages[] |
| R-04 | nav-icon width: 18px !important | CLOSED | dashboard.html lines 6578 and 7921 |
| R-05 | SVG viewBox: 0 0 20 20 | CLOSED | UX-05 §14.1 |
| R-06 | SVG stroke-width: 1.5 | CLOSED | UX-05 §14.1 |
| R-07 | SVG stroke-linecap/linejoin: round | CLOSED | UX-05 §14.1 |
| R-08 | SVG fill: none (default) | CLOSED | UX-05 §14.1 |
| R-09 | SVG stroke: currentColor | CLOSED | UX-05 §14.1 |
| R-10 | aria-hidden="true" on decorative icon SVG | CLOSED | UX-05 §14.5 |
| R-11 | External icon library: PROHIBITED | CLOSED | UX-05 §14.6 PROTECT |
| R-12 | Stat-chip SVGs (lines 8860–8875): PROTECT | CLOSED | GAP-29-SVG-ASSET-REQUIREMENTS §5 |
| R-13 | Mobile hamburger `._mnav-btn`: NOT Phase B scope | CLOSED | GAP-29-SVG-ASSET-REQUIREMENTS §3.1 |
| R-14 | apex-v2.css indigo color system: RETIRE | CLOSED | UX-05 §4.7 |
| R-15 | `--ax-*` is the canonical token namespace | CLOSED | UX-05 canonical token system |
| R-16 | UX-08 is the complete progressive disclosure specification | CLOSED | UX-08 (COMPLETE, 2026-08-27) |
| R-17 | RX-07 test P7-10 must be inverted on Phase B | CLOSED | RX-07 test file; GAP-29-DDR §9 |
| R-18 | Block 5 (`--ax-*` Final Authority Layer) is the :root consolidation survivor | CLOSED | Architectural evidence — only !important block |
| R-19 | `pages[]` array is canonical nav registration (20 entries) | CLOSED | dashboard.html:12736 |
| R-20 | Canonical colours: --primary: #00d4ff, --accent: #7b2fff, --bg: #03060f | CLOSED | UX-05 §4 |
| **FD-09** | **SVG `<use>` attribute: `href`** | **CLOSED — RESOLVED BY REPOSITORY EVIDENCE** | Zero xlink:href in codebase; SVG 2.0 deprecated; no xmlns:xlink declared; GAP-29-DDR §9 technical recommendation |
| — | Phase A items A-1 and A-2 | COMPLETE AND CERTIFIED | PHASE-A-CERTIFICATION.md |
| — | GAP-28 (font retirement) | CLOSED — RX-07 CERTIFIED | RX-07-CERTIFICATION.md |
| — | GAP-02, GAP-03, GAP-04 (voice controls) | CLOSED — RX-07 CERTIFIED | RX-07-CERTIFICATION.md |
| — | GAP-17, GAP-18, GAP-19 | CLOSED — RX-06 CERTIFIED | RX-06-CERTIFICATION.md |

**Total closed items: 24 (R-01 through R-20 + FD-09 + Phase A-1/A-2 + RX-07 gaps)**

---

### B — HUMAN DECISIONS REQUIRED

The following decisions cannot be resolved from existing authority documents or repository evidence. They require explicit product owner input.

| Decision | Subject | Options | Consequence of Deferral |
|----------|---------|---------|------------------------|
| **FD-01** | SVG sprite location | OPTION A (inline in dashboard.html) / OPTION B (external public/icons.svg) | Phase B implementation architecture undefined — cannot begin |
| **FD-02** | icon-command prototype approval | APPROVE star polygon / REJECT + provide revised path | Phase B blocked for icon-command |
| **FD-03** | icon-system prototype approval | APPROVE terminal/monitor / REJECT + provide revised path | Phase B blocked for icon-system |
| **FD-04** | Agent grid architecture (GAP-31) | OPTION A (page-scoped) / OPTION B (global+context) / OPTION C (hybrid) | Phase D blocked entirely |
| **FD-05** | Phase C implementation authorization | AUTHORIZE (Phase C begins) / DEFER (state reason) | Phase C and GAP-24 remain blocked |
| **FD-10** | Phase F: apex-v2.css migration authorization | AUTHORIZE / DEFER | Phase F blocked; structural debt remains (no visual impact at runtime) |
| **FD-11** | Token namespace reconciliation strategy | OPTION A (BRIDGE) / OPTION B (MIGRATE) | Phase F and Phase A-3/GAP-27 blocked |
| **FD-12a** | icon-knowledge prototype approval | APPROVE open book / REJECT + provide revised path | Phase B blocked for icon-knowledge (this icon survives Phase D) |
| **FD-13** | Partial Phase B acceptability | OPTION A (full 20 icons required — authority default) / OPTION B (partial OK — overrides UX-05 G-IG-03) | If OPTION A: Phase B blocked until all 15 missing assets delivered |

**Total human decisions pending: 9**

---

### C — DESIGN DECISIONS REQUIRED

The following items require design judgment. They cannot be resolved from authority documents or repository evidence alone.

| Decision | Subject | What Is Needed | Consequence of Deferral |
|----------|---------|---------------|------------------------|
| **FD-06** | icon-overview semantic mapping | APPROVE World globe (Section 4.3 path) or deliver a distinct overview icon design | Phase B blocked for icon-overview |
| **FD-07** | icon-approvals semantic mapping | APPROVE Decisions Stack (Section 4.3 path) or deliver a distinct approvals icon design | Phase B blocked for icon-approvals |
| **FD-08** | GAP-25 mobile nav specification | Produce a design specification document defining 5-tab mobile bottom bar (tabs, order, labels, states, breakpoints) | Phase E blocked indefinitely |

**Total design decisions pending: 3**

Note: FD-06 and FD-07 are binary decisions (approve a candidate that already exists, or commission a new design). They can be resolved quickly. FD-08 requires a full design document to be produced.

---

### D — ASSETS REQUIRED

The following items cannot be resolved by decision. They require actual creative design work and SVG path delivery.

| Item | Asset Required | Count | Technical Specification |
|------|---------------|-------|------------------------|
| **FD-12** | SVG paths for 15 navigation icons | 15 icons | viewBox 0 0 20 20; stroke currentColor 1.5px; round caps/joins; fill none; no external library |

**Icons with NO design in any authoritative document:**

| Symbol ID | Nav Label | Phase D Fate |
|-----------|-----------|-------------|
| `icon-operation` | Operation | World surface |
| `icon-finance` | Finance | World surface |
| `icon-communication` | Network | World surface |
| `icon-business` | Business | World surface |
| `icon-health` | Health | World surface |
| `icon-university` | University | World surface |
| `icon-occult` | Occult | World surface |
| `icon-research` | Research | World/Knowledge |
| `icon-civilisation` | Civilisation | World surface |
| `icon-reality` | Reality | World surface |
| `icon-activity` | Activity | Decisions surface |
| `icon-agents` | Agents | Decisions surface |
| `icon-intelligence` | Intel | Knowledge surface |
| `icon-memory` | Memory | System surface |
| `icon-governance` | Govern | System surface |

**Additional potential assets (depends on FD-06 and FD-07):**
- icon-overview: asset required IF FD-06 = DESIGN NEW (adds 1 icon to delivery queue)
- icon-approvals: asset required IF FD-07 = DESIGN NEW (adds 1 icon to delivery queue)

**Note from GAP-29-DDR §7:** 15 of 20 icons are Phase E retirement candidates. Simpler/geometric designs are acceptable for these; greater investment in the 3 Phase D survivors (command, knowledge, system) is recommended.

---

### E — IMPLEMENTATION BLOCKERS

| Phase | Status | Blocking Items |
|-------|--------|---------------|
| **Phase A-3 / GAP-27** | BLOCKED | FD-11 (namespace strategy → determines Block 7 disposition); then implementation team var-level audit |
| **Phase B** | BLOCKED | FD-01 (sprite location); FD-02 (icon-command); FD-03 (icon-system); FD-12a (icon-knowledge); FD-06 (icon-overview); FD-07 (icon-approvals); FD-12 (15 missing asset designs); FD-13 (scope decision); + separate Phase B implementation authorization |
| **Phase C** | BLOCKED | FD-05 (authorization) — this IS the only blocker; once issued, Phase C is immediately implementable |
| **Phase D** | BLOCKED | FD-04 (agent grid architecture) + Phase C completion |
| **Phase E** | BLOCKED | FD-08 (GAP-25 design specification delivery) + Phase D completion |
| **Phase F** | BLOCKED | FD-10 (apex-v2.css authorization) + FD-11 (namespace strategy) + Phase E completion |

**Single-point-of-failure items:**
- Phase B long-lead item: FD-12 (15 missing icon assets) — no decision can substitute for design delivery
- Phase E long-lead item: FD-08 (GAP-25 design specification) — no decision can substitute for design production

---

### F — IMPLEMENTATION-READY PHASES

**No phase is currently ready for implementation authorization.**

However, proximity to readiness:

| Phase | Missing | Time-to-Ready After Decision |
|-------|---------|------------------------------|
| Phase C | FD-05 only (one authorization) | Immediate — FD-05 itself is the authorization |
| Phase A-3/GAP-27 | FD-11 + var-level audit | Immediate after FD-11 + audit |
| Phase D | FD-04 + Phase C complete | After Phase C completes |
| Phase B | 8 open decisions + 15 missing assets | After all B-track decisions + asset delivery |
| Phase E | FD-08 + Phase D complete | After Phase E design spec delivered |
| Phase F | FD-10 + FD-11 + Phase E complete | After Phase F decisions + Phase E completion |

**Phase C is the closest phase to implementation-ready.** A single authorization (FD-05) unblocks it immediately. It has no asset or design prerequisites — UX-08 is the complete specification.

---

### G — CRITICAL PATH

#### 1. Decision Closure (minimum time: one session)

```
Session:
  Record FD-01 (sprite location)
  Record FD-02 (icon-command approval)
  Record FD-03 (icon-system approval)
  Record FD-04 (agent grid architecture)
  Record FD-05 (Phase C authorization)  ← unlocks Phase C immediately
  Record FD-10 (Phase F authorization)
  Record FD-11 (namespace strategy)     ← unlocks Phase A-3/GAP-27
  Record FD-12a (icon-knowledge approval)
  Record FD-13 (partial Phase B acceptability)

Design decisions (can be concurrent with session):
  Record FD-06 (icon-overview — approve globe or commission design)
  Record FD-07 (icon-approvals — approve stack or commission design)
  Commission FD-08 (GAP-25 mobile nav spec)

FD-09: ALREADY RESOLVED — `href`
```

#### 2. Design and Asset Delivery (long-lead; concurrent with Phase C)

```
FD-12: Design and deliver 15 SVG icon paths  ← critical path for Phase B
FD-08: Produce GAP-25 mobile nav specification  ← critical path for Phase E
FD-06/07 (if DESIGN NEW): Deliver overview/approvals SVG paths
```

#### 3. Phase B

```
Prerequisites: FD-01 ✓ + FD-02 ✓ + FD-03 ✓ + FD-12a ✓ + FD-06 ✓ + FD-07 ✓ + FD-09 ✓ (resolved) + FD-12 (15 assets delivered) + FD-13 ✓
→ Phase B implementation authorization issued
→ SVG sprite inserted into dashboard.html
→ 20 nav-icon spans updated from Unicode to <svg><use href="#icon-*"/>
→ RX-07 test P7-10 inverted
→ Phase B regression suite run
→ GAP-29 CLOSED
```

#### 4. Phases C–F

```
Phase C: FD-05 AUTHORIZE → Implementation begins → OQ-01–06 at kick-off → 5 files created + 2 div insertions → GAP-01 and GAP-24 CLOSED

Phase D: Phase C complete + FD-04 decision → Phase D authorization → agents page layout → GAP-31 CLOSED

Phase E: Phase D complete + FD-08 GAP-25 spec delivered → Phase E authorization → mobile nav + legacy retirement → GAP-25 CLOSED

Phase F: Phase E complete + FD-10 AUTHORIZE + FD-11 decision → Phase F authorization → apex-v2.css migration → :root consolidation → GAP-27 CLOSED
```

#### 5. Final Interface Convergence

```
All Phases A–F complete → ALL 32 GAPS CLOSED → Full convergence achieved
```

#### 6. Terminal Interface Quality Gate

```
Phase F complete
→ Run full regression suite (RX-01 through RX-07 + all phase regression suites)
→ Visual regression check across all 20 pages
→ ONE-APEX integrity audit
→ All 32 gaps verified CLOSED
→ TERMINAL QUALITY GATE PASSED
```

---

### H — REQUIRED HUMAN ACTIONS

The following is the exact numbered list of decisions and actions you must personally provide. Nothing else is needed from you to unblock the programme.

**DECISIONS (respond with APPROVE / REJECT / OPTION A / OPTION B / OPTION C / AUTHORIZE / DEFER):**

1. **FD-01:** SVG sprite location — OPTION A (inline in dashboard.html) or OPTION B (external public/icons.svg)?

2. **FD-02:** icon-command star polygon prototype — APPROVE or REJECT? (If reject, provide revised SVG path.)

3. **FD-03:** icon-system terminal/monitor prototype — APPROVE or REJECT? (If reject, provide revised SVG path.)

4. **FD-12a:** icon-knowledge open book prototype — APPROVE or REJECT? (If reject, provide revised SVG path.)

5. **FD-06:** icon-overview — APPROVE World globe (Section 4.3 path) or DESIGN NEW? (If design new, deliver revised path.)

6. **FD-07:** icon-approvals — APPROVE Decisions Stack (Section 4.3 path) or DESIGN NEW? (If design new, deliver revised path.)

7. **FD-04:** Agent grid architecture for Phase D — OPTION A (page-scoped), OPTION B (global+context), or OPTION C (hybrid)?

8. **FD-05:** Phase C (progressive disclosure) implementation — AUTHORIZE or DEFER?

9. **FD-10:** Phase F apex-v2.css migration — AUTHORIZE or DEFER?

10. **FD-11:** Token namespace strategy — OPTION A (BRIDGE `--apex-color-*` to `--ax-*`) or OPTION B (MIGRATE all `--apex-color-*` usages to `--ax-*`)?

11. **FD-13:** Partial Phase B — OPTION A (full 20-icon delivery required before any Phase B begins — authority default) or OPTION B (partial Phase B allowed — specify minimum N icons)?

**DESIGN/ASSET DELIVERIES:**

12. **FD-08:** Assign GAP-25 mobile nav design specification to a designer (or explicitly defer Phase E).

13. **FD-12:** Deliver SVG path data for 15 navigation icons (operation, finance, communication, business, health, university, occult, research, civilisation, reality, activity, agents, intelligence, memory, governance). Technical spec: viewBox 0 0 20 20; stroke currentColor 1.5; round caps/joins; fill none. No external library paths. Delivery format: path strings, pre-structured `<symbol>` blocks, or annotated references.

**Note on FD-09:** No action required. Resolved by repository evidence — `href` confirmed.

**Note on Gate 11 (per-block :root disposition):** No human action required beyond FD-11. Once FD-11 is recorded, the implementation team performs the var-level audit to determine per-block SURVIVOR/REMOVE/MIGRATE disposition. Block 7 disposition follows automatically from FD-11. Block 5 is already the designated survivor.

---

## SECTION 22 — HUMAN DECISION RESOLUTION (2026-08-28)

All 12 ballot decisions have been recorded. This section is the authoritative resolution record.

### Resolution Summary

| Decision ID | Subject | Resolution |
|-------------|---------|------------|
| FD-01 | Sprite location | **OPTION A — INLINE** |
| FD-02 | icon-command | **APPROVED — star polygon** |
| FD-03 | icon-system | **APPROVED — terminal/monitor** |
| FD-04 | Agent grid architecture | **OPTION C — HYBRID** |
| FD-05 | Phase C authorization | **AUTHORIZED** |
| FD-06 | icon-overview | **APPROVED — World globe** |
| FD-07 | icon-approvals | **APPROVED — Decisions Stack** |
| FD-08 | GAP-25 mobile nav | **PRODUCE SPEC — commissioned** |
| FD-09 | SVG href | **href** (pre-resolved, repository evidence) |
| FD-10 | apex-v2.css Phase F | **AUTHORIZED** |
| FD-11 | Namespace strategy | **OPTION A — BRIDGE** |
| FD-12a | icon-knowledge | **APPROVED — open book** |
| FD-13 | Partial Phase B | **OPTION A — FULL DELIVERY REQUIRED** |
| FD-12 | 15 missing icon assets | **OUTSTANDING — ASSET DELIVERY REQUIRED** |

### Phase Readiness After Decisions

| Phase | Status |
|-------|--------|
| Phase A-1, A-2 | COMPLETE AND CERTIFIED |
| Phase A-3 / GAP-27 | UNBLOCKED FOR AUDIT — FD-10+FD-11 decided |
| Phase B | BLOCKED — awaiting 15 missing icon asset designs (FD-12) |
| Phase C | **IMPLEMENTATION-READY — AUTHORIZED via FD-05** |
| Phase D | ARCHITECTURE DECIDED (HYBRID) — blocked pending Phase C completion |
| Phase E | SPEC COMMISSIONED — blocked pending GAP-25 delivery + Phase D |
| Phase F | AUTHORIZED + BRIDGE STRATEGY — blocked pending Phase E completion |

### Icons Ready for Phase B Sprite

| Symbol ID | Design Status | Path Source |
|-----------|--------------|-------------|
| `icon-command` | **APPROVED** | Section 4.2 star polygon |
| `icon-system` | **APPROVED** | Section 4.2 terminal/monitor |
| `icon-knowledge` | **APPROVED** | Section 4.2 open book |
| `icon-overview` | **APPROVED** | Section 4.3 World globe |
| `icon-approvals` | **APPROVED** | Section 4.3 Decisions Stack |
| 15 remaining | OUTSTANDING | Asset delivery required |

**5 of 20 icons approved. 15 of 20 pending. Phase B blocked per FD-13 Option A until all 20 available.**

---

**HUMAN DECISION RESOLUTION COMPLETE — ALL 12 BALLOT DECISIONS RECORDED — PHASE C AUTHORIZED — PHASE B BLOCKED ON ASSET DELIVERY.**
