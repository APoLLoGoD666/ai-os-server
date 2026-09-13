# APEX — INTERFACE CONVERGENCE DECISION-GATE RESOLUTION REGISTER

**Classification:** READ-ONLY RECONNAISSANCE PRODUCT
**Date:** 2026-08-28
**Authority:** Evidence gathered from live repository and authoritative interface documents
**Method:** Read-only reconnaissance — zero production file modifications
**Prerequisite:** APEX-INTERFACE-CONVERGENCE-EXECUTION-READINESS.md (completed, 26 sections)

---

## SECTION 1 — COMPLETE DECISION GATE INVENTORY

All decision gates across all phases of the Interface Convergence Programme, classified by resolution status.

| Gate | ID | Topic | Phase | Classification |
|------|----|-------|-------|----------------|
| Gate 1 | GAP-29-D1 | SVG `href` vs `xlink:href` attribute | B | EXPLICIT PRODUCT DECISION REQUIRED |
| Gate 2 | GAP-29-D2 | Sprite location: inline vs external file | B | EXPLICIT PRODUCT DECISION REQUIRED |
| Gate 3 | GAP-29-D3 | Prototype path approval: command, knowledge, system | B | EXPLICIT PRODUCT DECISION REQUIRED |
| Gate 4 | GAP-29-D4 | Icon mapping: overview (globe?), approvals (stack?) | B | EXPLICIT PRODUCT DECISION REQUIRED |
| Gate 5 | GAP-29-D5 | 15 missing icon asset designs | B | BLOCKED BY MISSING ASSET |
| Gate 6 | GAP-01 | Progressive disclosure specification status | C | PARTIALLY RESOLVED — spec exists (UX-08); implementation authorization required |
| Gate 7 | GAP-25 | Mobile nav: 5-tab bottom bar design spec | E | EXPLICIT DESIGN DECISION REQUIRED |
| Gate 8 | GAP-31 | Agent grid architecture: scope and layout | D | EXPLICIT PRODUCT DECISION REQUIRED |
| Gate 9 | GAP-27-EXT | apex-v2.css disposition and unique var migration | F | TECHNICAL RECONCILIATION REQUIRED |
| Gate 10 | GAP-27-NS | `--ax-*` vs `--apex-color-*` namespace bridge | F | TECHNICAL RECONCILIATION REQUIRED |
| Gate 11 | GAP-27-PB | Per-block SURVIVOR/REMOVE/MIGRATE disposition | F | EXPLICIT PRODUCT DECISION REQUIRED |

**Previously resolved gates (pre-convergence programme, included for completeness):**

| Gate | Topic | Resolution |
|------|-------|------------|
| GAP-29-R1 | Symbol ID convention: `icon-{page-name}` | RESOLVED BY AUTHORITY (pages[] array) |
| GAP-29-R2 | Sprite container: `id="ds-icon-sprite"` | RESOLVED BY AUTHORITY (RX-07 test P7-10) |
| GAP-29-R3 | nav-more exclusion from Phase B | RESOLVED BY AUTHORITY (permanently hidden, not in pages[]) |
| GAP-29-R4 | nav-icon width: 18px !important | RESOLVED BY REPOSITORY EVIDENCE (lines 6578, 7921) |
| GAP-29-R5 | SVG tech contract (viewBox, stroke, fill) | RESOLVED BY AUTHORITY (GAP-29-DESIGN-DECISION-RECORD) |
| GAP-29-R6 | aria-hidden="true" on icon SVG elements | RESOLVED BY AUTHORITY (UX-05 §14.5) |
| GAP-29-R7 | External icon library prohibition | RESOLVED BY AUTHORITY (UX-05 §14.6 PROTECT) |

**Total gates:** 11 open + 7 pre-resolved = 18
**Open and blocking:** 11
**Resolved or partially resolved:** 7 + Gate 6 (partial)

---

## SECTION 2 — GATE 6: GAP-01 PROGRESSIVE DISCLOSURE (RECLASSIFIED)

### 2.1 Prior Classification (Incorrect)

Gate 6 was previously classified as: **"BLOCKED — no design specification exists for progressive disclosure."**

This classification is WRONG. The design specification exists and is complete.

### 2.2 Corrected Classification

**PARTIALLY RESOLVED — IMPLEMENTATION AUTHORIZATION REQUIRED**

The specification exists as `docs/interface/UX-08-CONTEXTUAL-PRESENTATION.md` (status: COMPLETE, dated 2026-08-27). UX-08 is the authoritative progressive disclosure specification. It is complete, detailed, and ready for implementation.

### 2.3 UX-08 Specification Summary

UX-08 defines:

**Attention Levels (L0–L5)** — driven by Attention Engine score:
| Level | Score Range | UI Behaviour |
|-------|-------------|--------------|
| L0 SILENT | 0.00–0.20 | No UI output |
| L1 LOG | 0.20–0.35 | Panel collapsed |
| L2 IN-APP | 0.35–0.50 | Contextual card visible |
| L3 ATTENTION | 0.50–0.65 | Contextual card prominent |
| L4 DECISION | 0.65–0.80 | Modal |
| L5 URGENT | 0.80–1.00 | Top chrome banner |

**Disclosure Depth (L0–L4)** — driven by user interaction:
| Level | Content | Trigger |
|-------|---------|---------|
| L0 Surface | 1 line max | Default render |
| L1 Expanded | 2–4 lines | Tap/hover |
| L2 Detail | Full card | Explicit expand |
| L3 Evidence | Raw data/logs | Secondary expand |
| L4 Constitutional | Governance chain | Explicit "why" action |

**Seven presentation categories:** INFORMATION, INSIGHT, STATUS, DECISION, ACTION, WARNING, CONFIRMATION

**Cognitive load budget:** Max 3×L2, 1×L3, 1×L4, 1×L5 concurrent

**Voice interaction constraints:** Suppress L2/L3 during SPEAKING; suppress all during LISTENING; L5 fires through SPEAKING

**dashboard.html modifications specified:** `<div id="cx-card-zone">` and `<div id="cx-top-chrome">`

**Five prototype implementation files specified:**
1. `lib/context/context-engine.js`
2. `lib/context/relevance-filter.js`
3. `lib/presentation/presentation-queue.js`
4. `public/js/components/contextual-card.js`
5. `lib/attention/attention-bridge.js`

### 2.4 Open Implementation Questions (UX-08 §OQ)

UX-08 itself documents 6 unresolved implementation questions:
- **OQ-01:** Attention Engine integration contract (event format, polling vs push)
- **OQ-02:** Card animation duration and easing curve
- **OQ-03:** L4 DECISION modal: full-screen vs centred overlay
- **OQ-04:** Voice synthesis interruption policy during L5 banner
- **OQ-05:** Card persistence after attention score drops below threshold
- **OQ-06:** L3 Evidence data: live query vs snapshot at render time

### 2.5 Gate 6 Resolution Path

Gate 6 does NOT require a new design. It requires:
1. Explicit implementation authorization citing UX-08 §§9–20
2. Resolution of OQ-01 through OQ-06 (can be decided at implementation kick-off)
3. Phase C placement in programme schedule

**What is NOT needed:** A new design brief, a new UX document, or any additional design work.

---

## SECTION 3 — GAP-29 SVG ICON SYSTEM: FULL DECISION MATRIX

### 3.1 Context

GAP-29 replaces 20 Unicode emoji navigation icons with custom SVG icons served via an SVG sprite. Phase B of the convergence programme.

### 3.2 Resolved by Authority — No Decision Required

| Decision Point | Resolution | Authority |
|----------------|------------|-----------|
| Symbol ID convention | `icon-{page-name}` where name = exact `pages[]` array entry | pages[] array at dashboard.html:12736 |
| Sprite container ID | `id="ds-icon-sprite"` | RX-07 test P7-10 (currently asserts !includes — must be inverted on Phase B) |
| nav-more icon | EXCLUDED — permanently hidden (`style="display:none"`), not in pages[] | dashboard.html:12726 + pages[] |
| nav-icon display size | 18px !important | dashboard.html lines 6578 and 7921 |
| SVG technical contract | viewBox="0 0 20 20", stroke-width="1.5", stroke-linecap="round", stroke-linejoin="round", fill="none", stroke="currentColor" | GAP-29-DESIGN-DECISION-RECORD |
| Accessibility | aria-hidden="true" on each icon SVG | UX-05 §14.5 |
| External icon library | PROHIBITED | UX-05 §14.6 PROTECT |
| Stat-chip SVGs (lines 8860–8875) | PROTECT — not Phase B scope | GAP-29-SVG-ASSET-REQUIREMENTS |
| Mobile hamburger `._mnav-btn` | NOT Phase B scope — text only | GAP-29-SVG-ASSET-REQUIREMENTS |

### 3.3 Confirmed Prototype Paths (3 icons, full SVG documented)

From GAP-29-DESIGN-DECISION-RECORD:

**icon-command (⬡ → star polygon):** 6-pointed geometric star — SVG path documented
**icon-knowledge (◆ → book):** Open book with pages — SVG path documented
**icon-system (◉ → terminal/monitor):** Monitor with terminal prompt — SVG path documented

**Decision required:** Explicit operator approval that these 3 prototype designs are acceptable for production use, OR revised path designs submitted.

### 3.4 Ambiguous Mappings (2 icons)

| Icon ID | Current Unicode | Proposed Design | Status |
|---------|----------------|-----------------|--------|
| icon-overview | ◈ | World globe (prototype) | EXPLICIT DECISION REQUIRED |
| icon-approvals | ◇ | Decisions stack (prototype) | EXPLICIT DECISION REQUIRED |

### 3.5 Missing Asset Designs (15 icons)

No design path exists (prototype or otherwise) for:

| Icon ID | Current Unicode | Design Status |
|---------|----------------|---------------|
| icon-operation | ⊞ | NO DESIGN |
| icon-finance | ◎ | NO DESIGN |
| icon-communication | ✉ | NO DESIGN |
| icon-business | ◧ | NO DESIGN |
| icon-health | ◑ | NO DESIGN |
| icon-university | ◫ | NO DESIGN |
| icon-occult | ◬ | NO DESIGN |
| icon-research | ◈ | NO DESIGN |
| icon-civilisation | ⊛ | NO DESIGN |
| icon-reality | ◍ | NO DESIGN |
| icon-activity | ◎ | NO DESIGN |
| icon-agents | ◈ | NO DESIGN |
| icon-intelligence | ◇ | NO DESIGN |
| icon-memory | ▣ | NO DESIGN |
| icon-governance | ⚖ | NO DESIGN |

**Classification: BLOCKED BY MISSING ASSET.** Phase B cannot proceed for these 15 icons until SVG paths are delivered.

### 3.6 Open Technical Decisions (2 gates)

#### Gate 1: `href` vs `xlink:href`

**Evidence for `xlink:href`:** Phase B reconnaissance document (GAP-29-SVG-ASSET-REQUIREMENTS) references `xlink:href` syntax for `<use>` elements.

**Evidence against `xlink:href`:**
- Zero instances of `xlink:href` anywhere in the live codebase (dashboard.html, apex-v2.css, all JS)
- `xlink:href` is deprecated in SVG 2.0 specification — browsers retain backwards compatibility but new authoring should use plain `href`
- All modern browser targets support plain `href` on `<use>` elements

**Recommendation basis:** Plain `href` is modern, unambiguous, and consistent with the codebase. `xlink:href` is a legacy artefact from SVG 1.1 that the reconnaissance document carried forward without checking current codebase conventions.

**Classification: EXPLICIT PRODUCT DECISION REQUIRED.** A one-sentence decision resolves this permanently.

#### Gate 2: Sprite Location — Inline vs External File

**Evidence for external file:** GAP-29 gap inventory language implies a separate SVG sprite file delivered to `public/`.

**Evidence for inline:** GAP-29-SVG-ASSET-REQUIREMENTS Phase B reconnaissance describes inline injection into dashboard.html.

**Conflict:** These two positions are architecturally incompatible. External file requires an additional HTTP request and cache strategy. Inline requires surgery to dashboard.html with a known-size SVG block.

**ONE-APEX constraint:** Both options maintain ONE-APEX integrity (no second UI, one event bus). Neither is disqualified on architecture grounds.

**Performance note:** Inline sprite eliminates an HTTP round-trip and prevents flash-of-missing-icon (FOMI) during initial load. External file allows cache reuse across hypothetical future pages (irrelevant under ONE-APEX single-SPA architecture).

**Classification: EXPLICIT PRODUCT DECISION REQUIRED.** Decision determines Phase B implementation approach.

---

## SECTION 4 — GATE 9: APEX-V2.CSS DISPOSITION

### 4.1 Current State

`public/apex-v2.css` is linked in dashboard.html at lines 3909–3910. It defines the "APEX Zero Design System" — a comprehensive visual redesign using an indigo colour identity (`--accent: #6366f1`).

### 4.2 Authority: UX-05 §4.7 Disposition

UX-05 Canonical Visual Design System §4.7 explicitly states:

> `apex-v2.css indigo #6366f1 system: RETIRE — Conflicts with established cyan identity; no place in canonical system`

This is unambiguous: the **colour system** from apex-v2.css is RETIRED by authority.

### 4.3 Unique Variables That Cannot Be Removed Without Migration

apex-v2.css contains variables that are NOT replicated anywhere in dashboard.html's token blocks. These are consumed by dashboard.html components and cannot be removed without breakage:

**Typography:**
- `--font-sans` (system font stack)
- `--font-mono`
- `--tracking-tight`, `--tracking-wide`

**Spacing scale:**
- `--space-1` through `--space-10`

**Radius scale:**
- `--r-sm`, `--r-md`, `--r-lg`, `--r-xl`, `--r-pill`

**Elevation:**
- `--shadow-panel`, `--shadow-pop`
- `--glow-sm`, `--glow-md`

**Layout:**
- `--topbar-h: 44px`
- `--sidebar-w: 200px`
- `--chatbar-h: 52px`

**Command surface tokens:**
- `--cmd-bg`, `--cmd-border`, `--cmd-text`, `--cmd-placeholder`, `--cmd-focus-ring`

**Agent tokens:**
- `--agent-card-bg`, `--agent-card-border`, `--agent-avatar-size`

**These unique vars MUST be migrated into the dashboard.html `--ax-*` Final Authority Layer before apex-v2.css can be removed.**

### 4.4 Conflicting Colour Variables (RETIRE per UX-05 §4.7)

Variables in apex-v2.css that conflict with the canonical cyan system and are subject to RETIRE:
- `--accent: #6366f1` (indigo — RETIRE; canonical is `--accent: #7b2fff`)
- `--primary: #38bdf8` (sky blue — RETIRE; canonical is `--primary: #00d4ff`)
- `--bg: #000000` (conflicts with canonical `--bg: #03060f`)
- `--surface`, `--surface-2`, `--surface-3` (redefine with indigo bias)

Note: The `--ax-*` Final Authority Layer at line 6425 already overrides short-form vars with `!important` for canonical colours. apex-v2.css colour vars may already be subordinate at runtime — but the file's existence creates ambiguity and must be resolved.

### 4.5 Gate 9 Classification

**TECHNICAL RECONCILIATION REQUIRED**

UX-05 §4.7 provides partial authority (RETIRE the colour system). The reconciliation work required:

1. Audit which apex-v2.css unique vars are actively consumed by dashboard.html elements
2. Migrate confirmed-consumed unique vars into `--ax-*` namespace in dashboard.html
3. Confirm `--ax-*` !important overrides correctly suppress conflicting apex-v2.css colour definitions at runtime
4. Remove apex-v2.css link from dashboard.html lines 3909–3910
5. Delete or archive `public/apex-v2.css`

This is implementation work, not a product decision. However, it requires explicit authorization as a Phase F task before execution.

---

## SECTION 5 — GATE 10: TOKEN NAMESPACE RECONCILIATION

### 5.1 Three Active Namespaces

At runtime, three CSS token namespaces coexist in dashboard.html:

| Namespace | Location | Declaration Count | Override Mechanism |
|-----------|----------|-------------------|--------------------|
| Short-form (`--bg`, `--surface`, `--primary`) | Multiple blocks across 8 `<style>` elements | ~40 vars | None — last declaration wins |
| `--ax-*` Final Authority Layer | dashboard.html:6425 (inside `<style>` block 5) | ~60 vars | `!important` on all declarations |
| `--apex-color-*` | dashboard.html:8502 (UX-19 additive block) | ~25 vars | None — no override mechanism |

### 5.2 Current Conflict State

- `--ax-*` values are canonical UX-05 values (cyan identity: `--ax-primary: #00d4ff`)
- `--apex-color-*` values are UX-19 values — not bridged to `--ax-*`; components using `--apex-color-primary` do NOT receive `--ax-primary` value
- Short-form vars (`--primary`) may receive values from multiple `:root` declarations; `--ax-*` !important ensures canonical value wins for vars that bridge short-form → `--ax-*`
- Components written against `--apex-color-*` namespace are NOT covered by `--ax-*` !important overrides

### 5.3 Canonical Token System (UX-05 Authority)

UX-05 defines the canonical colour set:
```
--bg: #03060f
--primary: #00d4ff (cyan)
--secondary: #0066ff
--accent: #7b2fff
--text: #e8f4ff
```

### 5.4 Gate 10 Classification

**TECHNICAL RECONCILIATION REQUIRED**

Required reconciliation decisions:
1. Is `--apex-color-*` namespace to be bridged to `--ax-*` (add bridge declarations), or is `--apex-color-*` to be migrated to `--ax-*` (rename all usages), or is a new unified namespace created?
2. Which namespace is the canonical forward target for new component authoring?
3. Do short-form vars (`--bg`, `--primary`) remain as aliases or are they deprecated?

This reconciliation cannot proceed without explicit architectural decision on namespace strategy. All three paths have different scope and migration costs.

---

## SECTION 6 — GAP-27: :ROOT CONSOLIDATION — PER-BLOCK ANALYSIS

### 6.1 Confirmed State (from EXECUTION-READINESS §§11–12)

**8 `<style>` blocks** in dashboard.html containing `:root` declarations:

| Block # | Line | Scope / Purpose |
|---------|------|-----------------|
| Block 1 | ~20 | Document head — early baseline vars |
| Block 2 | ~1299 | Mid-document injection point |
| Block 3 | ~3912 | Post-apex-v2.css link vars |
| Block 4 | ~4912 | Component-specific block |
| Block 5 | ~6418 | `--ax-*` Final Authority Layer (!important) |
| Block 6 | ~6922 | Post-authority layer additions |
| Block 7 | ~7431 | UX-19 `--apex-color-*` namespace |
| Block 8 | ~7932 | Late-document additions |

**13 total `:root` declarations** across these 8 blocks.

**Plus: apex-v2.css** — 1 additional `:root` block (external file, line ~17)

**Total `:root` declarations to consolidate: 14 (13 inline + 1 external)**

### 6.2 Consolidation Target Architecture

The `--ax-*` Final Authority Layer (Block 5) already implements the correct architectural pattern: a single `!important`-backed canonical block that overrides all earlier declarations.

The Phase F consolidation target is:
- One `:root` block in `<head>` containing all vars in `--ax-*` namespace
- No other `:root` declarations in document
- apex-v2.css removed (Gate 9 prerequisite)

### 6.3 Per-Block Disposition Required

No existing authority document specifies the per-block disposition (SURVIVOR/REMOVE/MIGRATE) for each of the 13 inline `:root` declarations. The following decisions are required for Phase F execution:

| Block | Decision Required |
|-------|-------------------|
| Block 1 (~line 20) | Which vars survive, which are superseded by `--ax-*` |
| Block 2 (~line 1299) | Same |
| Block 3 (~line 3912) | Same — post-apex-v2.css vars |
| Block 4 (~line 4912) | Same |
| Block 5 (~line 6418) | SURVIVOR — this IS the target block (expand to absorb migrated vars) |
| Block 6 (~line 6922) | Which vars are unique vs redundant with Block 5 |
| Block 7 (~line 7431) | `--apex-color-*` — gate 10 resolution required first |
| Block 8 (~line 7932) | Which vars are unique vs redundant |

### 6.4 Gate 11 Classification

**EXPLICIT PRODUCT DECISION REQUIRED** (per-block SURVIVOR/REMOVE/MIGRATE)

However: Gate 11 cannot be resolved until Gate 10 is resolved (Block 7 disposition depends on namespace strategy). Gate 10 resolution is a prerequisite for Gate 11.

---

## SECTION 7 — GATE 8: GAP-31 AGENT GRID ARCHITECTURE

### 7.1 Current State

The `agents` page exists in pages[] and has a pageMeta entry. No authoritative design document specifies the agent grid layout or scope boundary.

### 7.2 Three Documented Options

From GAP-31 gap inventory:

**Option A — Page-system scope:** Agent grid shows agents scoped to the current active page. Switching pages updates the agent grid to show page-relevant agents.

**Option B — Page-agents scope:** Agent grid shows a fixed set of global agents regardless of active page. Page context is passed as input to agents, not as grid filter.

**Option C — Hybrid:** Global agents grid with page-context injection and page-specific agent highlighting or filtering.

### 7.3 Architectural Implications

| Option | Event Bus Impact | ONE-APEX Compliance | Phase D Complexity |
|--------|-----------------|---------------------|--------------------|
| A | Requires page-switch events to drive agent grid | Compliant | High — dynamic grid rebind on every switchPage |
| B | No page-switch binding | Compliant | Low — static grid, context passed as param |
| C | Page-switch events for highlighting only | Compliant | Medium |

All three options are ONE-APEX compliant. None requires a second runtime.

### 7.4 Gate 8 Classification

**EXPLICIT PRODUCT DECISION REQUIRED**

No authority document specifies which option. Decision cannot be derived from existing UX docs. Blocks Phase D.

---

## SECTION 8 — GAP-15, GAP-16, GAP-22: UNSCHEDULED GAPS

### 8.1 GAP-15 and GAP-16 — Memory Routes

**GAP-15 (Memory read route):** `routes/memory.js` EXISTS in the live repository. Memory retrieval endpoint present.

**GAP-16 (Memory write route):** Requires verification of write endpoint in routes/memory.js.

Both gaps depend on the same file. No convergence phase is assigned to GAP-15 or GAP-16. They are independent of the convergence phases (A–F) and do not block any convergence gate.

**Classification:** INDEPENDENT — can be scheduled as standalone sprint items without convergence dependency.

### 8.2 GAP-22 — Intelligence Panel

No route or implementation found for GAP-22 intelligence panel during reconnaissance. Not assigned to a convergence phase.

**Classification:** UNSCHEDULED — requires phase assignment before work can be scoped.

### 8.3 Dependency Note

GAP-15, GAP-16, and GAP-22 have zero dependency on Phases A–F. They do not block and are not blocked by the convergence programme. They should be scheduled separately.

---

## SECTION 9 — PHASE DEPENDENCY MATRIX

### 9.1 Gate-to-Phase Blocking Map

| Gate | Blocks Phase | Prerequisite Gates |
|------|-------------|-------------------|
| Gate 1 (href syntax) | B | None |
| Gate 2 (sprite location) | B | None |
| Gate 3 (prototype approval: 3 icons) | B | None |
| Gate 4 (ambiguous mappings: 2 icons) | B | None |
| Gate 5 (15 missing assets) | B | Gates 1, 2, 3, 4 |
| Gate 6 (GAP-01 authorization) | C | None |
| Gate 7 (GAP-25 mobile design) | E | None |
| Gate 8 (GAP-31 architecture) | D | None |
| Gate 9 (apex-v2.css) | F | None |
| Gate 10 (namespace bridge) | F | None |
| Gate 11 (per-block disposition) | F | Gate 10 |

### 9.2 Phase Prerequisites Summary

| Phase | Prerequisite Gates | Status |
|-------|-------------------|--------|
| Phase A | None | COMPLETE (A-1, A-2 done; A-3/GAP-27 blocked) |
| Phase B | Gates 1, 2, 3, 4, 5 | ALL OPEN |
| Phase C | Gate 6 | PARTIALLY RESOLVED — needs authorization only |
| Phase D | Gate 8 | OPEN |
| Phase E | Gate 7 | OPEN |
| Phase F | Gates 9, 10, 11 (Gate 11 depends on Gate 10) | ALL OPEN |

### 9.3 Phase-Parallel Execution Opportunities

Gates 1–5 (Phase B), Gate 6 (Phase C), Gate 7 (Phase E), Gate 8 (Phase D), and Gates 9–11 (Phase F) are mutually independent prerequisite sets. Multiple phases could receive their authorization decisions in parallel if a single product/design session addressed all open gates.

---

## SECTION 10 — CRITICAL PATH ANALYSIS

### 10.1 Shortest Path to Phase B Execution

**Blocking gates:** 1, 2, 3, 4 (decisions) + 5 (asset delivery)

**Critical path:**
1. Resolve Gates 1–4 (four explicit decisions — can be made in one session)
2. Deliver 15 SVG icon assets (Gate 5) — this is the long-lead item
3. Confirm 3 prototype paths approved or submit revised paths (Gate 3)
4. Phase B implementation can proceed once all 20 icon designs are available

**Minimum decisions required to unblock Phase B:** 4 (one session)
**Minimum asset delivery required:** 15 SVG icon path designs (external dependency)

### 10.2 Shortest Path to Phase C Execution

**Blocking gates:** Gate 6 — implementation authorization only

**Critical path:**
1. Issue Phase C implementation authorization explicitly citing UX-08 §§9–20
2. Resolve OQ-01 through OQ-06 (6 implementation questions — can be resolved at kick-off)
3. Phase C can proceed immediately after authorization

**Minimum decisions required to unblock Phase C:** 1 authorization statement + 6 OQ resolutions

### 10.3 Shortest Path to Phase F Execution

**Blocking gates:** Gates 9, 10 (independent), then Gate 11 (depends on Gate 10)

**Critical path:**
1. Resolve Gate 9 (apex-v2.css disposition) — explicit authorization as Phase F task
2. Resolve Gate 10 (namespace strategy) — architectural decision
3. Gate 11 (per-block disposition) can be resolved by implementation team once Gate 10 is decided
4. Phase F implementation proceeds

**Minimum decisions required to unblock Phase F:** 2 decisions (Gates 9, 10) + technical Gate 11 disposition derived from Gate 10

### 10.4 Programme-Level Critical Path

The overall critical path to full convergence programme completion:

```
[Gate 1-4 decisions] ──┐
[Gate 5 asset delivery] ─┤── Phase B ──┐
                                        │
[Gate 6 authorization] ── Phase C ──────┤
                                        │
[Gate 8 decision] ── Phase D ───────────┤
                                        ├── Full Convergence
[Gate 7 design decision] ── Phase E ────┤
                                        │
[Gate 9 authorization] ──┐             │
[Gate 10 decision] ───────┤── Phase F ──┘
[Gate 11 from Gate 10] ──┘
```

**Programme-level long lead item:** Gate 5 (15 missing SVG assets). This is the only gate that cannot be resolved by a product/design decision session — it requires external creative delivery.

---

## SECTION 11 — FINAL DECISION REGISTER

### 11.1 Decisions Required from Product Owner

| Decision | Gate | Question | Options | Impact |
|----------|------|----------|---------|--------|
| D-01 | Gate 1 | SVG `<use>` attribute: `href` or `xlink:href`? | `href` (modern, codebase-consistent) or `xlink:href` (legacy, per reconnaissance) | Phase B implementation syntax |
| D-02 | Gate 2 | SVG sprite location: inline in dashboard.html or external `public/icons.svg`? | Inline (no extra HTTP) or external (separate file) | Phase B file structure |
| D-03 | Gate 3 | Prototype icon paths approved? | Approve command (star), knowledge (book), system (terminal) as-is; or submit revised paths | Phase B scope for 3 icons |
| D-04 | Gate 4 | Confirm icon mappings for overview and approvals | overview→globe or new design; approvals→stack or new design | Phase B scope for 2 icons |
| D-05 | Gate 8 | Agent grid architecture option | Option A (page-scoped), Option B (global+context), Option C (hybrid) | Phase D entire implementation |
| D-06 | Gate 11 | Per-block :root disposition | SURVIVOR/REMOVE/MIGRATE for Blocks 1–4, 6, 7, 8 | Phase F implementation |

### 11.2 Decisions Required from Design

| Decision | Gate | Question | Authority Context |
|----------|------|----------|------------------|
| D-07 | Gate 5 | Deliver SVG path designs for 15 missing icons | GAP-29-SVG-ASSET-REQUIREMENTS lists all 15 |
| D-08 | Gate 7 | Mobile nav bottom bar design spec (5-tab pattern) | GAP-25 currently has no design document |

### 11.3 Technical Reconciliation Authorizations Required

| Decision | Gate | Question | Context |
|----------|------|----------|---------|
| D-09 | Gate 9 | Authorize apex-v2.css migration and removal as Phase F task | UX-05 §4.7 provides colour RETIRE authority; unique var migration needs explicit scope authorization |
| D-10 | Gate 10 | Namespace strategy: bridge `--apex-color-*` to `--ax-*`, or migrate usages, or new unified namespace? | Three active namespaces, none bridged; UX-05 canonical system is `--ax-*` |

### 11.4 Implementation Authorization Required

| Decision | Gate | Question | Context |
|----------|------|----------|---------|
| D-11 | Gate 6 | Authorize Phase C implementation citing UX-08 §§9–20 as design authority | UX-08 is COMPLETE; OQ-01 through OQ-06 to be resolved at kick-off |

**Total decisions required before programme can proceed:** 11 (D-01 through D-11)
**Decisions resoluble in one product/design session:** D-01, D-02, D-03, D-04, D-05, D-06, D-09, D-10, D-11 (9 decisions)
**Decisions with external dependency:** D-07 (asset delivery), D-08 (design work)

---

## SECTION 12 — IMPLEMENTATION READINESS AFTER GATE RESOLUTION

### 12.1 Phase B — After D-01 through D-04 and D-07

Assuming all gate decisions made and all 20 SVG assets delivered:

**Ready to execute:** Yes
**Implementation scope:** Insert SVG sprite block into dashboard.html, update 20 nav-icon spans from Unicode to `<svg><use>`, invert RX-07 test P7-10 assertion
**Risk:** Low — additive change, no deletion, switchPage chain unaffected
**Test update required:** RX-07 P7-10 currently asserts `!dash.includes('ds-icon-sprite')` — must be inverted to `dash.includes('ds-icon-sprite')`

### 12.2 Phase C — After D-11 and OQ-01 through OQ-06

Assuming implementation authorization granted and OQs resolved:

**Ready to execute:** Yes
**Implementation scope:** Create 5 new files (lib/context/, lib/presentation/, public/js/components/), insert `<div id="cx-card-zone">` and `<div id="cx-top-chrome">` into dashboard.html
**Risk:** Medium — introduces new runtime components; Attention Engine integration contract (OQ-01) must be stable
**Test update required:** New test suite for contextual card engine

### 12.3 Phase D — After D-05

Assuming agent grid architecture decision made:

**Ready to execute:** Yes — pending D-05
**Implementation scope:** agents page layout, optional switchPage event binding (if Option A or C)
**Risk:** Low to Medium depending on option chosen

### 12.4 Phase E — After D-08

Assuming mobile nav design spec delivered:

**Ready to execute:** Yes — pending D-08
**Implementation scope:** Bottom navigation bar component, responsive breakpoint updates
**Risk:** Medium — requires careful viewport testing

### 12.5 Phase F — After D-09 and D-10 (Gate 11 derives from Gate 10)

Assuming apex-v2.css disposition authorized and namespace strategy decided:

**Ready to execute:** Yes — pending D-09, D-10
**Implementation scope:** Audit apex-v2.css unique var consumption, migrate vars to `--ax-*`, resolve namespace bridge, consolidate 13 `:root` declarations to 1, remove apex-v2.css link
**Risk:** HIGH — destructive operations on CSS token foundation; requires comprehensive visual regression testing across all 20 pages
**Test update required:** Full visual snapshot suite recommended before Phase F begins

---

## SECTION 13 — MASTERPLAN CORRECTIONS REQUIRED

The following corrections must be applied to `docs/interface/APEX-INTERFACE-CONVERGENCE-MASTERPLAN.md` before Phase B/F execution. These are discrepancies identified during execution readiness validation (EXECUTION-READINESS.md §2).

### 13.1 DISCREPANCY-01 (HIGH) — §7.2 Current Glyph Column

**Status:** 15 of 20 entries are incorrect in the masterplan.

**Correct current glyphs** (from dashboard.html lines 12641–12729):

| Page | Masterplan States | Actual Value |
|------|------------------|--------------|
| command | ⬡ | ⬡ ✓ |
| overview | ◈ | ◈ ✓ |
| operation | ⊞ | ⊞ ✓ |
| system | ⟨/⟩ | ◉ ✗ |
| finance | ₿ | ◎ ✗ |
| communication | ✉ | ✉ ✓ |
| business | ⊗ | ◧ ✗ |
| health | ♡ | ◑ ✗ |
| university | ⊙ | ◫ ✗ |
| occult | ☽ | ◬ ✗ |
| research | ◎ | ◈ ✗ |
| civilisation | ⌖ | ⊛ ✗ |
| reality | ◉ | ◍ ✗ |
| activity | ⊛ | ◎ ✗ |
| agents | ⟁ | ◈ ✗ |
| approvals | ✓ | ◇ ✗ |
| knowledge | ◈ | ◆ ✗ |
| intelligence | ◈ | ◇ ✗ |
| memory | ◈ | ▣ ✗ |
| governance | ⚖ | ⚖ ✓ |

**Action required:** Replace all 20 "Current Glyph" entries in §7.2 with the correct values above.

### 13.2 DISCREPANCY-02 (MEDIUM) — §10 :root Count

**Masterplan states:** 7 `:root` blocks (from RX-07 certification)
**Actual:** 13 `:root` declarations across 8 `<style>` blocks in dashboard.html, plus 1 in apex-v2.css = 14 total

**Action required:** Update §10 consolidation scope to state "13 inline `:root` declarations across 8 `<style>` blocks, plus 1 external block in apex-v2.css."

### 13.3 DISCREPANCY-03 (MEDIUM) — apex-v2.css Not in Scope

**Masterplan:** Does not mention apex-v2.css as a consolidation target or Phase F dependency.
**Actual:** apex-v2.css contains a `:root` block with unique vars that must be migrated before the file can be removed. UX-05 §4.7 explicitly orders the colour system RETIRED.

**Action required:** Add apex-v2.css to Phase F scope. Add Gate 9 to the decision gate register. Add migration requirement for unique non-colour vars.

### 13.4 DISCREPANCY-04 (LOW) — switchPage Line Number

**Masterplan states:** switchPage original at line 12801
**Actual:** switchPage original at line 12761 (shifted by Phase A edits)

**Action required:** Update §6 line reference from 12801 to 12761.

### 13.5 DISCREPANCY-05 (MEDIUM) — --apex-color-* Namespace Not Addressed

**Masterplan:** Does not reference `--apex-color-*` namespace (UX-19 block at line 8502).
**Actual:** This is an active third namespace at runtime that is not bridged to `--ax-*`.

**Action required:** Add `--apex-color-*` namespace to Phase F scope. Add Gate 10 (namespace reconciliation) to the decision gate register.

### 13.6 DISCREPANCY-06 (INFO) — R-Series Sprint Plan Superseded

**Masterplan:** References POST-UX-19-R-SERIES-RECONCILIATION sprint plan structure.
**Actual:** That document has been superseded by actual RX-01 through RX-07 execution. RX-06 closed GAP-17/18/19 without the T3-12/T3-13 dependency the reconciliation plan required.

**Action required:** Remove reference to POST-UX-19-R-SERIES-RECONCILIATION as a live planning document; replace with reference to individual RX certification documents.

### 13.7 Gate 6 Reclassification

**Masterplan:** Gate 6 classified as "BLOCKED — no design specification exists."
**Actual:** UX-08 IS the complete progressive disclosure specification. Gate 6 should be reclassified as "IMPLEMENTATION AUTHORIZATION REQUIRED — design authority exists in UX-08 §§9–20."

**Action required:** Update Gate 6 entry in masterplan decision gate register.

---

## SECTION 14 — GATE RESOLUTION SESSION AGENDA

A single product/design session can resolve 9 of 11 open gates. Recommended agenda:

### Agenda Block 1: Phase B (15 minutes)

1. **D-01:** Select `href` (recommended) or `xlink:href` for SVG `<use>` attribute
2. **D-02:** Select inline sprite (recommended) or external `public/icons.svg`
3. **D-03:** Approve or reject 3 prototype icon paths (command/star, knowledge/book, system/terminal) — see GAP-29-DESIGN-DECISION-RECORD for full SVG markup
4. **D-04:** Confirm or specify icon mappings for overview and approvals

### Agenda Block 2: Phase C (10 minutes)

5. **D-11:** Issue Phase C implementation authorization citing UX-08 as design authority; schedule OQ-01 through OQ-06 resolution at implementation kick-off

### Agenda Block 3: Phase D (10 minutes)

6. **D-05:** Select agent grid architecture option (A, B, or C)

### Agenda Block 4: Phase F (20 minutes)

7. **D-09:** Authorize apex-v2.css migration scope as Phase F task
8. **D-10:** Select namespace consolidation strategy (`--apex-color-*` bridge vs migration vs unified namespace)
9. **D-06:** Assign per-block :root disposition (SURVIVOR/REMOVE/MIGRATE) for each of the 8 blocks — after D-10 is decided, Block 7 disposition follows automatically

### Deferred to Design Track (no session deadline)

10. **D-07:** Deliver 15 missing SVG icon asset designs (asset design work — external to decision session)
11. **D-08:** Produce GAP-25 mobile nav bottom bar design specification (design work — external to decision session)

---

## SECTION 15 — DOCUMENT INTEGRITY STATEMENTS

### 15.1 Read-Only Confirmation

This document was produced by read-only reconnaissance of the live repository. Zero production files were modified during this investigation. No SVG files were created. No implementation was performed. No commits were made.

### 15.2 Evidence Basis

All findings are grounded in evidence from live repository files read during this and the preceding session:

- `public/dashboard.html` — primary source for all HTML/CSS/JS state
- `public/apex-v2.css` — external CSS file (linked at lines 3909–3910)
- `docs/interface/GAP-29-SVG-ASSET-REQUIREMENTS.md` — Phase B asset specification
- `docs/interface/GAP-29-DESIGN-DECISION-RECORD.md` — Phase B resolved and open decisions
- `docs/interface/UX-08-CONTEXTUAL-PRESENTATION.md` — complete progressive disclosure specification
- `docs/interface/UX-05-CANONICAL-VISUAL-DESIGN-SYSTEM.md` — canonical visual authority (§4.7 key)
- `docs/interface/POST-UX-19-R-SERIES-RECONCILIATION.md` — now superseded by RX certs
- `docs/interface/POST-UX-19-FINAL-RECONCILIATION.md` — conditional certification
- `docs/interface/RX-06-CERTIFICATION.md` — GAP-17/18/19 closure authority
- `src/routes/ui.js` — route inventory
- `routes/knowledge.js` — knowledge-gap-engine route inventory

### 15.3 Discrepancy Inheritance

This document adopts all discrepancies identified in `APEX-INTERFACE-CONVERGENCE-EXECUTION-READINESS.md` §2 (DISCREPANCY-01 through DISCREPANCY-06) as the basis for Section 13 (Masterplan Corrections). No new discrepancies were identified during Decision Gate reconnaissance beyond what the Execution Readiness report already captured.

### 15.4 Limitations

- apex-v2.css unique var consumption audit (Section 4.3) is a structural inference, not a line-by-line grep of all dashboard.html component CSS. Implementation team must perform exhaustive consumption audit before removal.
- GAP-15 and GAP-16 (`routes/memory.js` endpoint verification) were not exhaustively read — confirmed file exists; write endpoint presence not verified.
- GAP-22 (intelligence panel) marked unscheduled based on absence of evidence; no deep search performed.

---

---

## SECTION 16 — HUMAN DECISION SESSION RESOLUTION (2026-08-28)

All 12 outstanding ballot items resolved by explicit human decision. FD-09 was pre-resolved by repository evidence (prior session). FD-12 (15 missing icon assets) remains an outstanding design deliverable — not a decision.

### 16.1 Decision Resolution Table

| Decision ID | Gate | Subject | Option Selected | Resolution Date |
|-------------|------|---------|-----------------|-----------------|
| FD-01 | Gate 2 | Sprite location | **OPTION A — INLINE** | 2026-08-28 |
| FD-02 | Gate 3 | icon-command prototype | **APPROVE — star polygon** | 2026-08-28 |
| FD-03 | Gate 3 | icon-system prototype | **APPROVE — terminal/monitor** | 2026-08-28 |
| FD-04 | Gate 8 | Agent grid architecture | **OPTION C — HYBRID** | 2026-08-28 |
| FD-05 | Gate 6 | Phase C authorization | **AUTHORIZE** | 2026-08-28 |
| FD-06 | Gate 4 | icon-overview mapping | **APPROVE GLOBE** | 2026-08-28 |
| FD-07 | Gate 4 | icon-approvals mapping | **APPROVE STACK** | 2026-08-28 |
| FD-08 | Gate 7 | GAP-25 mobile nav | **PRODUCE SPEC** | 2026-08-28 |
| FD-09 | Gate 1 | SVG href vs xlink:href | **href** (resolved by repository evidence, prior session) | 2026-08-28 |
| FD-10 | Gate 9 | apex-v2.css Phase F | **AUTHORIZE** | 2026-08-28 |
| FD-11 | Gate 10 | Namespace strategy | **OPTION A — BRIDGE** | 2026-08-28 |
| FD-12a | Gate 3 | icon-knowledge prototype | **APPROVE — open book** | 2026-08-28 |
| FD-13 | N/A | Partial Phase B | **OPTION A — FULL DELIVERY REQUIRED** | 2026-08-28 |
| FD-12 | Gate 5 | 15 missing icon assets | OUTSTANDING — ASSET DELIVERY REQUIRED | — |

### 16.2 Per-Decision Resolution Details

#### FD-01 — SPRITE LOCATION — RESOLVED: OPTION A (INLINE)

**Decision:** SVG sprite block inserted inline inside `dashboard.html <body>`. No new file created at `public/icons.svg`.

**What this authorizes:** Phase B implementation may place the `<svg id="ds-icon-sprite">` block directly in dashboard.html. No additional production file is required.

**What this does NOT authorize:** Implementation of Phase B. FD-13 Option A still requires all 20 icons to be ready before Phase B begins.

**Dependencies removed:** Sprite location ambiguity between gap inventory and reconnaissance resolved. Phase B technical architecture confirmed: single-file scope (dashboard.html only).

**Remaining blocker:** 15 missing icon asset designs (FD-12).

---

#### FD-02 — ICON-COMMAND — RESOLVED: APPROVE (STAR POLYGON)

**Decision:** Star polygon path from `docs/interface/prototype/apex-command-prototype.html` approved for production use as `icon-command`.

**Path:** `<polygon points="10,2 12.5,8.5 19,9.5 14.5,14 15.9,20 10,17 4.1,20 5.5,14 1,9.5 7.5,8.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`

**What this authorizes:** Use of this exact prototype path in the Phase B sprite as `<symbol id="icon-command" viewBox="0 0 20 20">`. Design is locked.

**What this does NOT authorize:** Phase B implementation. Gate condition (FD-13 Option A) still requires all 20 icons.

**Remaining blocker:** 15 missing asset designs.

---

#### FD-03 — ICON-SYSTEM — RESOLVED: APPROVE (TERMINAL/MONITOR)

**Decision:** Terminal/monitor path from prototype approved for production use as `icon-system`.

**Path:** `<rect x="2" y="4" width="16" height="12" rx="2" .../>` + `<path d="M6 8h8M6 12h5M14 12h1" .../>` + `<circle cx="15" cy="8" r="1" fill="currentColor"/>` (full markup in Decision Pack §4.2).

**What this authorizes:** Use of this exact prototype path in the Phase B sprite as `<symbol id="icon-system" viewBox="0 0 20 20">`. Design is locked.

**Note:** icon-system is one of three Phase D-surviving icons (System surface). Long production life.

**Remaining blocker:** 15 missing asset designs.

---

#### FD-04 — AGENT GRID ARCHITECTURE — RESOLVED: OPTION C (HYBRID)

**Decision:** Phase D implements a global agent grid with page-context highlighting. Static grid (agents always visible). Page-switch events trigger visual highlighting of context-relevant agents for the active page. No full grid rebind on switch.

**Architecture constraints from this decision:**
- Global agent list loaded once at page initialisation
- switchPage chain receives a lightweight addition (page-context highlight, not rebind)
- Page context is surfaced to agents visually, not as a display filter

**What this authorizes:** Phase D implementation planning may proceed using HYBRID architecture. Implementation does not begin until Phase C is complete and a Phase D implementation authorization is separately issued.

**What this does NOT authorize:** Phase D implementation. Phase D waits for Phase C completion.

**Dependencies:** Phase D blocked until Phase C COMPLETE + separate "Phase D Implementation Authorized" directive.

---

#### FD-05 — PHASE C AUTHORIZATION — RESOLVED: AUTHORIZE

**Decision:** Phase C implementation is AUTHORIZED. UX-08 §§9–20 is the governing design specification.

**Per Decision Pack §17:** FD-05 = AUTHORIZE IS the Phase C implementation authorization. No separate implementation directive is required for Phase C.

**What this authorizes:**
- Creation of `lib/context/context-engine.js`
- Creation of `lib/context/relevance-filter.js`
- Creation of `lib/presentation/presentation-queue.js`
- Creation of `public/js/components/contextual-card.js`
- Creation of `lib/attention/attention-bridge.js`
- Insertion of `<div id="cx-card-zone">` into dashboard.html
- Insertion of `<div id="cx-top-chrome">` into dashboard.html

**What this does NOT authorize:** Phase B, Phase D, Phase E, Phase F, icon replacement, SVG creation, navigation restructuring, CSS consolidation, backend route changes not required by UX-08, any implementation outside UX-08 scope.

**OQ-01 through OQ-06:** To be resolved at implementation kick-off (not prerequisites for authorization).

**This decision immediately unblocks:** Phase C implementation. Also unblocks GAP-24 (bottom sheet) upon Phase C completion.

---

#### FD-06 — ICON-OVERVIEW — RESOLVED: APPROVE GLOBE

**Decision:** World globe candidate path approved for production use as `icon-overview`. Semantic stretch (globe ≠ overview governance/pipeline/status page) acknowledged and accepted.

**Path:** Circle (r=8) + horizontal equator + two longitude arcs (full markup in Decision Pack §4.3).

**What this authorizes:** Use of globe path in Phase B sprite as `<symbol id="icon-overview" viewBox="0 0 20 20">`.

**Remaining blocker:** 15 missing asset designs (FD-13 Option A — Phase B waits for full 20).

---

#### FD-07 — ICON-APPROVALS — RESOLVED: APPROVE STACK

**Decision:** Decisions Stack candidate path approved for production use as `icon-approvals`. Semantic imprecision and future icon-decisions naming similarity acknowledged and accepted.

**Path:** `<path d="M10 2v16M3 7l7-5 7 5M4 10l6 3 6-3M4 14l6 3 6-3" .../>` (full markup in Decision Pack §4.3).

**Note:** Phase D will create a distinct `icon-decisions` for the aggregate surface. These will be visually different by Phase D.

**Remaining blocker:** 15 missing asset designs.

---

#### FD-08 — GAP-25 MOBILE NAV — RESOLVED: PRODUCE SPEC

**Decision:** GAP-25 mobile navigation design work is commissioned. A design specification document must be produced covering: which 5 tabs appear in the mobile bottom bar, tab order, labels, active/inactive states, icon usage, overflow handling for 20-page navigation, and breakpoint behaviour.

**What this authorizes:** Design work on the GAP-25 specification. Desktop navigation is unaffected.

**What this does NOT authorize:** Phase E implementation. Phase E requires GAP-25 spec delivery + Phase D completion + separate "Phase E Implementation Authorized" directive.

**What remains blocked:** Phase E — pending GAP-25 spec delivery and Phase D completion.

---

#### FD-09 — SVG HREF — RESOLVED (PRIOR SESSION): href

**Decision (pre-resolved):** Phase B uses plain `href` on `<use>` elements. `xlink:href` is deprecated SVG 2.0 and has zero usage in the live codebase. No `xmlns:xlink` namespace declaration required.

---

#### FD-10 — APEX-V2.CSS PHASE F — RESOLVED: AUTHORIZE

**Decision:** Phase F is authorized to execute the apex-v2.css migration and removal.

**What this authorizes:** Phase F implementation team may: (1) audit unique non-color var consumption in dashboard.html, (2) migrate confirmed-consumed vars to `--ax-*` namespace in Block 5, (3) remove apex-v2.css link from dashboard.html lines 3909–3910, (4) delete or archive `public/apex-v2.css`.

**What this does NOT authorize:** Phase F implementation (requires Phase E completion + separate "Phase F Implementation Authorized" directive). No CSS changes may be made yet.

**Impact on GAP-27:** apex-v2.css portion of GAP-27 (:root consolidation) is now unblocked — execution awaits Phase F authorization.

---

#### FD-11 — NAMESPACE STRATEGY — RESOLVED: OPTION A (BRIDGE)

**Decision:** Reconcile `--apex-color-*` with `--ax-*` via bridge declarations. Add `--apex-color-primary: var(--ax-primary)` etc. inside the `--ax-*` Final Authority Layer (Block 5). Zero component changes. Block 7 (`--apex-color-*`, ~line 7431) remains but is now downstream of the bridge.

**What this resolves:** Gate 10 (namespace strategy). Gate 11 (Block 7 disposition) now resolves automatically: Block 7 is retained but bridge declarations in Block 5 ensure canonical values propagate to `--apex-color-*` consumers.

**Forward rule:** `--ax-*` is the canonical forward namespace for all new component authoring. New vars must use `--ax-*` prefix.

**What this does NOT authorize:** Phase F implementation.

---

#### FD-12a — ICON-KNOWLEDGE — RESOLVED: APPROVE (OPEN BOOK)

**Decision:** Open book path from prototype approved for production use as `icon-knowledge`.

**Path:** Two-path open book with left spine cover and horizontal text lines (full markup in Decision Pack §4.2).

**Note:** icon-knowledge is one of three Phase D-surviving icons (Knowledge surface). Long production life — highest scrutiny warranted. Approved.

**Remaining blocker:** 15 missing asset designs (Phase B waits for full 20 per FD-13 Option A).

---

#### FD-13 — PARTIAL PHASE B — RESOLVED: OPTION A (FULL DELIVERY REQUIRED)

**Decision:** Phase B does not begin until all 20 icon designs are available. A mixed icon/Unicode navigation state is not acceptable. UX-05 G-IG-03 blanket prohibition on emoji as UI icons is upheld. GAP-29-DDR §10 full delivery requirement is upheld.

**What this means for programme state:**
- 5 icons are now approved and ready (command, system, knowledge, overview, approvals)
- 15 icon asset designs are outstanding
- Phase B is BLOCKED until all 15 asset designs are delivered and all 20 icons are confirmed ready
- No partial implementation is authorized

**Remaining blocker:** FD-12 — 15 missing SVG icon path designs.

---

### 16.3 Post-Decision Gate Status

| Gate | Prior Status | Post-Decision Status |
|------|-------------|---------------------|
| Gate 1 (href) | OPEN | RESOLVED — href |
| Gate 2 (sprite location) | OPEN | RESOLVED — INLINE |
| Gate 3 (prototype approvals) | OPEN | RESOLVED — all 3 approved (command, knowledge, system) |
| Gate 4 (ambiguous mappings) | OPEN | RESOLVED — globe and stack approved |
| Gate 5 (15 missing assets) | BLOCKED | STILL BLOCKED — 15 asset designs outstanding |
| Gate 6 (Phase C auth) | PARTIALLY RESOLVED | RESOLVED — AUTHORIZED |
| Gate 7 (GAP-25 spec) | OPEN | COMMISSIONED — spec not yet delivered; Phase E still blocked |
| Gate 8 (agent grid) | OPEN | RESOLVED — HYBRID architecture selected |
| Gate 9 (apex-v2.css) | OPEN | RESOLVED — AUTHORIZED |
| Gate 10 (namespace) | OPEN | RESOLVED — BRIDGE strategy |
| Gate 11 (per-block) | BLOCKED ON GATE 10 | RESOLVED — Block 7 retained with bridge; Blocks 1–4,6,8 resolved by implementation team audit |

### 16.4 Programme State After Human Decisions

| Phase | Prior State | Post-Decision State |
|-------|------------|---------------------|
| Phase A-1 | COMPLETE | COMPLETE |
| Phase A-2 | COMPLETE | COMPLETE |
| Phase A-3 / GAP-27 | BLOCKED | UNBLOCKED FOR AUDIT — FD-10+FD-11 decided; implementation team var-level audit now executable |
| Phase B | BLOCKED (decisions + assets) | BLOCKED — decisions resolved; still waiting on 15 asset designs |
| Phase C | BLOCKED | **AUTHORIZED — IMPLEMENTATION READY** |
| Phase D | BLOCKED | ARCHITECTURE DECIDED (HYBRID); still blocked pending Phase C completion |
| Phase E | BLOCKED | SPEC COMMISSIONED; still blocked pending GAP-25 delivery + Phase D |
| Phase F | BLOCKED | AUTHORIZED + STRATEGY DECIDED (BRIDGE); still blocked pending Phase E completion |

---

**DECISION RESOLUTION COMPLETE — HUMAN DECISIONS RECORDED — PHASE C NOW AUTHORIZED — PHASE B BLOCKED ON ASSET DELIVERY — ALL OTHER PHASES PENDING SEQUENTIAL PREREQUISITES.**
