# APEX — INTERFACE CONVERGENCE IMPLEMENTATION AUTHORISATIONS

**Classification:** IMPLEMENTATION AUTHORITY DOCUMENT
**Date:** 2026-08-28
**Status:** ACTIVE — PHASE C AUTHORIZED — ALL OTHER PHASES PENDING
**Preceding document:** `docs/interface/APEX-INTERFACE-CONVERGENCE-PRODUCT-DESIGN-DECISION-PACK.md`
**Decision record:** `docs/interface/APEX-INTERFACE-CONVERGENCE-DECISION-REGISTER.md` Section 16

---

## 1 — CERTIFIED BASELINE

The following phases are complete and certified before this document:

| Phase | Status | Authority |
|-------|--------|-----------|
| Phase A-1 | COMPLETE — ONE-APEX structural enforcement | PHASE-A-CERTIFICATION.md |
| Phase A-2 | COMPLETE — OPTION C legacy/beta coexistence | PHASE-A-CERTIFICATION.md |
| RX-01 through RX-07 | ALL CERTIFIED | Individual RX certification documents |
| GAP-02, GAP-03, GAP-04, GAP-17, GAP-18, GAP-19, GAP-28 | CLOSED | RX-06, RX-07 certification |

**Current production baseline:** `public/dashboard.html` post-Phase A-2. No production files have been modified by any task in this convergence programme's decision/planning phase.

---

## 2 — HUMAN DECISIONS RECORDED (2026-08-28)

All 12 ballot decisions have been formally recorded. Summary:

| ID | Subject | Decision |
|----|---------|---------|
| FD-01 | Sprite location | OPTION A — INLINE (dashboard.html) |
| FD-02 | icon-command | APPROVED — star polygon prototype |
| FD-03 | icon-system | APPROVED — terminal/monitor prototype |
| FD-04 | Agent grid | OPTION C — HYBRID architecture |
| FD-05 | Phase C | AUTHORIZED — FD-05 IS the authorization |
| FD-06 | icon-overview | APPROVED — World globe |
| FD-07 | icon-approvals | APPROVED — Decisions Stack |
| FD-08 | GAP-25 mobile nav | PRODUCE SPEC — commissioned |
| FD-09 | SVG href | href (pre-resolved) |
| FD-10 | apex-v2.css | AUTHORIZED for Phase F migration |
| FD-11 | Namespace | OPTION A — BRIDGE |
| FD-12a | icon-knowledge | APPROVED — open book prototype |
| FD-13 | Partial Phase B | OPTION A — full 20-icon delivery required |
| FD-12 | 15 icon assets | OUTSTANDING — not a decision; asset delivery required |

---

## 3 — PHASE READINESS MATRIX

| Phase | Gate State | Implementation State | Remaining Blocker |
|-------|-----------|---------------------|-------------------|
| Phase A-1 | CLOSED | COMPLETE | — |
| Phase A-2 | CLOSED | COMPLETE | — |
| Phase A-3 / GAP-27 | UNBLOCKED | PENDING AUDIT | Implementation team var-level audit of Blocks 1–4, 6, 8 vs Block 5; then separate "Phase A-3 Authorized" directive |
| Phase B | 5 icons ready; 15 asset designs outstanding | **BLOCKED** | FD-12 — 15 missing SVG icon path designs |
| Phase C | ALL GATES CLOSED | **AUTHORIZED — IMPLEMENTATION READY** | None. OQ-01–OQ-06 resolved at kick-off. |
| Phase D | Architecture decided (HYBRID) | BLOCKED | Phase C must complete first |
| Phase E | Spec commissioned | BLOCKED | GAP-25 spec delivery + Phase D completion |
| Phase F | Authorized + Bridge strategy | BLOCKED | Phase E completion + "Phase F Authorized" directive |

---

## 4 — REMAINING BLOCKERS

### Single Absolute Blocker — Phase B

**FD-12 — 15 missing SVG icon path designs.** This is the only item blocking Phase B. No decision can substitute for it. All 5 decision-gated icons are now approved and ready. Phase B waits solely for creative asset delivery.

**Technical contract for each icon:**
- `viewBox="0 0 20 20"`
- `stroke="currentColor"` `stroke-width="1.5"` `stroke-linecap="round"` `stroke-linejoin="round"`
- `fill="none"` (default); intentional accent fills use `fill="currentColor"`
- No external library SVG paths
- Delivery format: `<symbol id="icon-{page-name}">` block

**Icons pending delivery:**
`icon-operation`, `icon-finance`, `icon-communication`, `icon-business`, `icon-health`, `icon-university`, `icon-occult`, `icon-research`, `icon-civilisation`, `icon-reality`, `icon-activity`, `icon-agents`, `icon-intelligence`, `icon-memory`, `icon-governance`

### Sequential Blockers — Track 2 (Feature Sprint)

- **Phase D:** Requires Phase C complete. Architecture (HYBRID) is decided.
- **Phase E:** Requires Phase D complete + GAP-25 design specification delivered.
- **Phase F:** Requires Phase E complete. Authorization (FD-10) and strategy (FD-11 BRIDGE) are both decided.

---

## 5 — PHASE C IMPLEMENTATION AUTHORISATION

### Status: AUTHORIZED

**Authority:** FD-05 = AUTHORIZE (2026-08-28 human decision)
**Per Decision Pack §17:** "FD-05 itself IS the authorization (it explicitly says 'authorize')."
**No separate directive required.** Phase C implementation may begin.

### Governing Specification

`docs/interface/UX-08-CONTEXTUAL-PRESENTATION.md` — status COMPLETE (2026-08-27)
**Governing sections:** UX-08 §§9–20

### Authorized Implementation Scope

The following and ONLY the following are authorized under this document:

| # | File | Action | Justification |
|---|------|--------|---------------|
| 1 | `lib/context/context-engine.js` | CREATE NEW | UX-08 §9 — core routing logic |
| 2 | `lib/context/relevance-filter.js` | CREATE NEW | UX-08 §10 — content relevance scoring |
| 3 | `lib/presentation/presentation-queue.js` | CREATE NEW | UX-08 §11 — cognitive load budget enforcement |
| 4 | `public/js/components/contextual-card.js` | CREATE NEW | UX-08 §12 — UI component |
| 5 | `lib/attention/attention-bridge.js` | CREATE NEW | UX-08 §13 — attention engine → context engine wiring |
| 6 | `public/dashboard.html` | INSERT `<div id="cx-card-zone">` | UX-08 §14 — contextual card display zone |
| 7 | `public/dashboard.html` | INSERT `<div id="cx-top-chrome">` | UX-08 §15 — L5 URGENT top chrome banner zone |

### Explicitly NOT Authorized Under Phase C

The following are OUT OF SCOPE for this authorization:

- Phase B (icon sprite, nav-icon span updates)
- Phase D (agent grid)
- Phase E (mobile navigation)
- Phase F (CSS consolidation, apex-v2.css removal, :root consolidation)
- Icon replacement of any kind
- SVG file creation
- Navigation restructuring
- Legacy page retirement
- CSS :root consolidation
- apex-v2.css deletion or modification
- Token namespace bridge declarations
- Backend route changes NOT explicitly required by UX-08
- Any feature, file, or behaviour not listed in the authorized scope above

### Phase C Pre-Implementation Checklist

Before writing any code:

- [ ] Confirm `lib/context/` directory does not exist (no pre-existing implementation to collide with)
- [ ] Confirm `lib/presentation/` directory does not exist
- [ ] Confirm `public/js/components/contextual-card.js` does not exist
- [ ] Confirm `lib/attention/attention-bridge.js` does not exist
- [ ] Confirm no existing production code performs the context engine / attention-bridge role
- [ ] Search dashboard.html for existing `cx-card-zone` or `cx-top-chrome` references
- [ ] Verify `lib/event-bus.js` interface before wiring attention-bridge
- [ ] Verify `lib/voice/state.js` interface before implementing voice suppression
- [ ] Resolve OQ-01 through OQ-06 at kick-off meeting

---

## 6 — PHASE C IMPLEMENTATION BRIEF

### Repository Pre-State (Verified 2026-08-28)

| Check | Result |
|-------|--------|
| `lib/context/` directory | DOES NOT EXIST — safe to create |
| `lib/presentation/` directory | DOES NOT EXIST — safe to create |
| `public/js/components/contextual-card.js` | DOES NOT EXIST — safe to create |
| `lib/attention/attention-bridge.js` | DOES NOT EXIST — safe to create |
| `cx-card-zone` in dashboard.html | NOT FOUND — safe to insert |
| `cx-top-chrome` in dashboard.html | NOT FOUND — safe to insert |
| Existing attention engine | `lib/attention/attention-engine.js` EXISTS — use as input, do not replace |
| Existing attention manager | `lib/attention/attention-manager.js` EXISTS — use for DB queries, do not replace |
| Existing event bus | `lib/event-bus.js` EXISTS — use for server-side event subscription |
| Existing voice state | `lib/voice/state.js` EXISTS — use for voice suppression checks |
| Dashboard communication pattern | HTTP polling (fetch-based) — confirmed from dashboard.html lines 21293–21309 |

**Conclusion: No duplicate implementation exists. Phase C is additive in all 5 new files and 2 DOM insertions. No existing production code is at risk of collision.**

### OQ Resolution from Repository Evidence

**OQ-01 — Attention Engine integration contract:**
RESOLVED BY REPOSITORY EVIDENCE.
The existing dashboard uses HTTP polling (`fetch()`) as the server→client communication pattern (confirmed: `realityAttentionPanel` at dashboard.html line 21293 uses `fetch('/api/reality-architecture/attention/top?limit=8')`). No WebSocket or SSE data channel exists for runtime data.

**Resolution:** The attention-bridge.js integration contract is **HTTP polling**:
- Server-side: `attention-bridge.js` subscribes to `lib/event-bus.js` (`bus.on('*', ...)`) to recompute scores when relevant events fire (AGENT_COMPLETED, TOOL_COMPLETED, TOOL_DISPATCHED)
- `attention-bridge.js` maintains an in-memory scored result cache
- `context-engine.js` exposes a GET endpoint (e.g. `GET /api/context/attention`) returning current scored items
- Frontend `contextual-card.js` polls at a configurable interval (recommended: 5000ms default, configurable via data attribute)

**OQ-02 — Card animation duration and easing curve:**
UNRESOLVED FROM REPOSITORY EVIDENCE. No animation specification in UX-08 or any authority document.
To be resolved at kick-off. Suggested starting point: 200ms ease-out (matches existing APEX transition patterns observed in dashboard.html).

**OQ-03 — L4 DECISION modal: full-screen vs centred overlay:**
UNRESOLVED FROM REPOSITORY EVIDENCE. No modal pattern specified in any authority document.
To be resolved at kick-off.

**OQ-04 — Voice synthesis interruption policy during L5 banner:**
PARTIALLY RESOLVED BY REPOSITORY EVIDENCE.
`lib/voice/state.js` exposes `voiceState.active` (voice session active), `voiceState.ttsPlaying` (TTS playing), `voiceState.interrupted`.

**Resolution framework from evidence:**
- UX-08 specifies: "Suppress L2/L3 during SPEAKING; suppress all during LISTENING; L5 fires through SPEAKING"
- `attention-bridge.js` must import `lib/voice/state.js` to check voice state before routing events to the presentation queue
- SPEAKING = `voiceState.ttsPlaying === true`
- LISTENING = `voiceState.active === true && !voiceState.ttsPlaying` (inference — confirm at kick-off)
- L5 URGENT fires regardless of SPEAKING state
- Exact L5 behaviour during LISTENING (does L5 fire or suppress during active listening?) is UNRESOLVED — confirm at kick-off.

**OQ-05 — Card persistence after attention score drops below threshold:**
UNRESOLVED FROM REPOSITORY EVIDENCE. No persistence policy in UX-08 or any authority document.
To be resolved at kick-off.

**OQ-06 — L3 Evidence data: live query vs snapshot at render time:**
UNRESOLVED FROM REPOSITORY EVIDENCE. No data retrieval policy for L3 Evidence level specified anywhere.
To be resolved at kick-off.

### Implementation Notes for Phase C

**lib/attention/attention-engine.js:** Pure scorer — `score(item)` returns `{score, inputs, weights}`. Do not modify. `attention-bridge.js` calls this.

**lib/attention/attention-manager.js:** Persistent profile management — `getTopAttentionItems(limit)` queries Supabase `attention_profiles` table. Do not modify. `attention-bridge.js` may call this to retrieve baseline profiles.

**lib/event-bus.js:** `bus.on(type, handler)` or `bus.on('*', handler)` for wildcard subscription. `bus.emit(type, payload)` is non-blocking (setImmediate). Use this for server-side event subscription in attention-bridge.js. Do not add new event types without registering them in `EVENTS` object.

**lib/voice/state.js:** `voiceState.active`, `voiceState.ttsPlaying`, `voiceState.interrupted`. Import this module for voice state checks. Do not modify.

**dashboard.html div insertions:** Two `<div>` elements must be inserted. Exact position within dashboard.html to be determined at implementation by inspecting body structure. Do not disturb existing content. These are additive insertions.

### Phase C Test Requirements (Pre-Implementation)

Tests must be defined BEFORE implementation. Regression coverage required:

| Test Suite | Scope |
|-----------|-------|
| RX-02 | Re-run post-Phase C (verify Phase A-2 invariants unaffected) |
| RX-03 | Re-run post-Phase C |
| RX-04 | Re-run post-Phase C |
| RX-05 | Re-run post-Phase C |
| RX-06 | Re-run post-Phase C |
| RX-07 | Re-run post-Phase C |
| Phase C new suite | L0–L5 attention routing; disclosure depth; cognitive load budget; voice suppression; 7 category coverage; dashboard.html integrity (cx-card-zone and cx-top-chrome present); no second runtime introduced |

**Minimum test assertions for Phase C:**
- `lib/context/context-engine.js` routes L0 → no UI output
- `lib/context/context-engine.js` routes L5 → cx-top-chrome populated
- `lib/presentation/presentation-queue.js` enforces cognitive load budget (max 3×L2, 1×L3, 1×L4, 1×L5)
- Voice suppression: L2/L3 suppressed when `voiceState.ttsPlaying`
- `public/js/components/contextual-card.js` renders without error
- dashboard.html contains `id="cx-card-zone"` after insertion
- dashboard.html contains `id="cx-top-chrome"` after insertion
- No new runtime instance created (ONE-APEX integrity)
- All existing dashboard functionality preserved (chat, pages, switchPage, notifications)

---

## 7 — PHASE B BLOCKED-STATE DEFINITION

Phase B is BLOCKED. The following conditions ALL must be met before Phase B implementation may begin:

### B1 — Technical Architecture (DECIDED — no human action required)

- [x] FD-01: Sprite location = INLINE in dashboard.html
- [x] FD-09: SVG `<use>` attribute = `href`
- [x] Symbol ID convention: `icon-{page-name}` matching `pages[]`
- [x] Sprite container ID: `id="ds-icon-sprite"`
- [x] nav-more: EXCLUDED
- [x] nav-icon width: 18px !important (CSS, not SVG attribute)

### B2 — Approved Icon Designs (DECIDED — designs locked)

- [x] `icon-command` — star polygon (FD-02 APPROVED)
- [x] `icon-system` — terminal/monitor (FD-03 APPROVED)
- [x] `icon-knowledge` — open book (FD-12a APPROVED)
- [x] `icon-overview` — World globe (FD-06 APPROVED)
- [x] `icon-approvals` — Decisions Stack (FD-07 APPROVED)

### B3 — Asset Delivery Outstanding (BLOCKING)

- [ ] `icon-operation` — SVG path not yet delivered
- [ ] `icon-finance` — SVG path not yet delivered
- [ ] `icon-communication` — SVG path not yet delivered
- [ ] `icon-business` — SVG path not yet delivered
- [ ] `icon-health` — SVG path not yet delivered
- [ ] `icon-university` — SVG path not yet delivered
- [ ] `icon-occult` — SVG path not yet delivered
- [ ] `icon-research` — SVG path not yet delivered
- [ ] `icon-civilisation` — SVG path not yet delivered
- [ ] `icon-reality` — SVG path not yet delivered
- [ ] `icon-activity` — SVG path not yet delivered
- [ ] `icon-agents` — SVG path not yet delivered
- [ ] `icon-intelligence` — SVG path not yet delivered
- [ ] `icon-memory` — SVG path not yet delivered
- [ ] `icon-governance` — SVG path not yet delivered

### B4 — Scope Decision (DECIDED)

- [x] FD-13: OPTION A — full 20-icon delivery required before Phase B begins. No partial implementation.

### B5 — Phase B Implementation Authorization (NOT YET ISSUED)

- [ ] Separate "Phase B Implementation Authorized" directive must be issued after all above checklist items are complete.

### Phase B Implementation Scope (When Unblocked)

1. Insert `<svg id="ds-icon-sprite" style="display:none" aria-hidden="true">` block with 20 `<symbol>` definitions into dashboard.html `<body>`
2. Replace 20 nav-icon `<span>` emoji characters with `<svg aria-hidden="true"><use href="#icon-{name}"/></svg>`
3. Invert RX-07 test P7-10: `!dash.includes('ds-icon-sprite')` → `dash.includes('ds-icon-sprite')`
4. Run full regression suite

**Phase B risk:** LOW — additive change. No deletion. switchPage chain unaffected.

---

## 8 — PHASE D DEPENDENCY STATE

### Status: ARCHITECTURE DECIDED — IMPLEMENTATION BLOCKED

**Architecture selected:** OPTION C — HYBRID

**HYBRID architecture specification:**
- Global agent grid loaded once at page initialisation
- All agents visible regardless of active page
- switchPage chain receives a lightweight addition: page-context highlight update (not full grid rebind)
- Page-relevant agents visually distinguished when their associated page is active
- Page context passed to agents as input parameter (from existing switchPage event chain)

**Phase D prerequisites:**
1. Phase C must be COMPLETE (Phase D navigation context depends on Phase C contextual card system being stable)
2. Separate "Phase D Implementation Authorized" directive must be issued
3. Phase D implementation spec (agents page layout, highlight mechanism, switchPage integration) must be written before code changes begin

**Phase D does NOT begin until Phase C is certified complete.**

---

## 9 — PHASE E DESIGN-DELIVERABLE STATE

### Status: SPEC COMMISSIONED — PHASE BLOCKED

**FD-08 = PRODUCE SPEC.** GAP-25 mobile navigation design work is commissioned.

**What must be delivered (GAP-25 design specification):**
- Which 5 tabs appear in the mobile bottom bar (from 20 pages)
- Tab order and hierarchy
- Labels for each tab (short form)
- Active state appearance
- Inactive state appearance
- Icon usage (which icons from Phase B sprite, if applicable)
- Overflow handling (20 pages → 5 visible tabs; remaining accessible how?)
- Breakpoint at which bottom bar replaces sidebar
- Portrait/landscape behaviour

**Delivery format:** A design document equivalent in detail to `docs/interface/UX-08-CONTEXTUAL-PRESENTATION.md`. Must include implementation file scope equivalent to UX-08 §§9–20.

**Phase E prerequisites (all must be met before Phase E authorization):**
1. GAP-25 design specification delivered
2. Phase D COMPLETE
3. Separate "Phase E Implementation Authorized" directive

**Phase E does NOT begin before Phase D is certified complete.**

---

## 10 — PHASE F DEPENDENCY STATE

### Status: AUTHORIZED + STRATEGY DECIDED — BLOCKED ON PHASE E

**FD-10 = AUTHORIZE:** Phase F migration and removal of apex-v2.css is authorized.
**FD-11 = BRIDGE:** Namespace reconciliation strategy is BRIDGE.

**Resolved decisions for Phase F:**
- apex-v2.css indigo color system: RETIRE (UX-05 §4.7)
- Bridge strategy: add `--apex-color-primary: var(--ax-primary)` etc. in Block 5
- Block 5 (`--ax-*` Final Authority Layer, ~line 6418): SURVIVOR
- Block 7 (`--apex-color-*`): RETAINED with bridge (not deleted)
- Blocks 1–4, 6, 8: implementation team performs var-level audit (compare against Block 5; duplicates REMOVE, unique vars MIGRATE to Block 5 in `--ax-*` naming)
- apex-v2.css: migrate unique non-color vars to Block 5, then remove link and delete file

**Phase F prerequisites (all must be met before Phase F begins):**
1. Phase E COMPLETE
2. Implementation team var-level audit of Blocks 1–4, 6, 8 complete
3. Separate "Phase F Implementation Authorized" directive
4. Visual snapshot suite established (Phase F risk: HIGH — destructive CSS operations)

**Phase F does NOT begin before Phase E is certified complete.**

**Phase F risk note:** CSS :root consolidation (13 inline → 1) + apex-v2.css removal are HIGH-risk destructive operations. Full visual regression across all 20 pages required before and after.

---

## 11 — ASSET DELIVERY REQUIREMENTS

### FD-12 — 15 SVG Icon Path Designs (Phase B Critical Path)

**Status:** OUTSTANDING. No delivery has been received. Phase B waits entirely on this.

**Technical contract (non-negotiable):**
```
viewBox="0 0 20 20"
stroke="currentColor"
stroke-width="1.5"
stroke-linecap="round"
stroke-linejoin="round"
fill="none" (default; accent fills use fill="currentColor" explicitly)
No external library SVG paths permitted
```

**Delivery format:** `<symbol id="icon-{page-name}" viewBox="0 0 20 20">` blocks, or SVG path strings with symbol ID mapping.

**Icons outstanding:**

| Symbol ID | Nav Label | Phase D Fate | Design Priority |
|-----------|-----------|-------------|-----------------|
| `icon-operation` | Operation | Phase E retirement | Standard |
| `icon-finance` | Finance | Phase E retirement | Standard |
| `icon-communication` | Network | Phase E retirement | Standard |
| `icon-business` | Business | Phase E retirement | Standard |
| `icon-health` | Health | Phase E retirement | Standard |
| `icon-university` | University | Phase E retirement | Standard |
| `icon-occult` | Occult | Phase E retirement | Standard |
| `icon-research` | Research | World/Knowledge surface | Standard |
| `icon-civilisation` | Civilisation | Phase E retirement | Standard |
| `icon-reality` | Reality | Phase E retirement | Standard |
| `icon-activity` | Activity | Decisions surface | Standard |
| `icon-agents` | Agents | Decisions surface | Standard |
| `icon-intelligence` | Intel | Knowledge surface | Standard |
| `icon-memory` | Memory | System surface | Standard |
| `icon-governance` | Govern | System surface | Standard |

**Design note:** 12 of these 15 are Phase E retirement candidates. Simpler geometric designs are acceptable. No authority document prohibits this approach.

### GAP-25 — Mobile Navigation Design Specification (Phase E Critical Path)

**Status:** COMMISSIONED (FD-08 = PRODUCE SPEC). Design work has not yet been delivered.

---

## 12 — REGRESSION REQUIREMENTS

### Phase C Regression

All of the following must pass after Phase C implementation before Phase C is certified:

- RX-01 through RX-07 re-run (confirm Phase A-2 baseline unaffected)
- Phase C new test suite (see Section 6)
- `node --check server.js` after any backend changes
- `node -e "require('./lib/context/context-engine')"` — verify module resolves
- `node -e "require('./lib/attention/attention-bridge')"` — verify module resolves

### Phase B Regression

After Phase B implementation:
- RX-07 test P7-10 must PASS with inverted assertion (`dash.includes('ds-icon-sprite')`)
- All 20 nav-icon `<use>` elements must render correctly (visual check)
- switchPage must function normally (no regression to navigation)
- Chat, voice, agents, all existing features must be unaffected

### Phase F Regression

Before Phase F begins:
- Full visual snapshot suite across all 20 pages (baseline)

After Phase F implementation:
- Full visual snapshot suite diff against baseline
- All `--ax-*` vars resolve correctly
- All `--apex-color-*` vars resolve via bridge to `--ax-*` values
- No UI element uses a broken/missing CSS variable
- apex-v2.css link absent from dashboard.html
- Single `:root` block present in dashboard.html head

---

## 13 — ONE-APEX INTEGRITY REQUIREMENTS

These rules apply to every phase of the convergence programme. No implementation may violate them.

| Rule | Requirement |
|------|------------|
| ONE platform | All implementation targets the single Render-hosted Node/Express backend |
| ONE frontend | All UI changes target `public/dashboard.html` only. No parallel HTML files. |
| ONE navigation | `pages[]` array at dashboard.html:12736 is the canonical nav registration. No alternative navigation system. |
| ONE event bus | `lib/event-bus.js` is the canonical event system. No second runtime. |
| NO second runtime | Phase C must not introduce a second server process, second event loop, or second frontend application |
| NO parallel nav | Phase C contextual cards are additive (cx-card-zone, cx-top-chrome). They do not replace or parallel the main navigation. |
| PROTECT existing | Existing chat, voice, agents, tasks, memory, document, notification features must be preserved without regression |
| CIVILIZATION KERNEL | The existing civilization-kernel authority path must not be disturbed by any convergence phase |

---

## 14 — HARD-STOP RULES

The following actions are PROHIBITED without an explicit new authorization directive:

| Action | Prohibited Until |
|--------|-----------------|
| Modifying `public/dashboard.html` icon spans | Phase B implementation authorization |
| Inserting SVG sprite | Phase B implementation authorization |
| Modifying any CSS token | Phase F implementation authorization |
| Removing apex-v2.css link | Phase F implementation authorization |
| Deleting apex-v2.css | Phase F implementation authorization |
| Merging :root blocks | Phase F implementation authorization |
| Building agents page layout | Phase D implementation authorization |
| Implementing mobile nav | Phase E implementation authorization + GAP-25 spec delivery |
| Fabricating SVG icon paths | NEVER — all icon designs must come from explicit human/designer delivery |
| Auto-deleting any file | NEVER without explicit approval |
| Modifying environment variables | NEVER via agent action |
| Editing production code without approval | NEVER |

---

## 15 — EXACT NEXT AUTHORISED ACTION

### AUTHORIZED NOW: Phase C Implementation

Phase C implementation is the only phase authorized to begin immediately.

**Authorized scope:** 5 new files + 2 dashboard.html div insertions (detailed in Section 6).
**Governing specification:** UX-08 §§9–20.
**Pre-implementation checklist:** Section 6, Phase C Pre-Implementation Checklist.
**OQ resolution:** OQ-01 resolved by repository evidence (polling). OQ-02/03/05/06 to be resolved at kick-off. OQ-04 partially resolved; L5-during-LISTENING edge case to confirm at kick-off.

**Before writing Phase C code:**
1. Run the pre-implementation checklist (Section 6)
2. Read UX-08 §§9–20 in full
3. Run: `node -e "require('./lib/attention/attention-engine')"` — confirm module resolves
4. Run: `node -e "require('./lib/event-bus')"` — confirm module resolves
5. Confirm `lib/context/` does not exist
6. Confirm `lib/presentation/` does not exist
7. Define Phase C test assertions before writing code

**After Phase C implementation:**
1. `node --check server.js`
2. Verify all new module require paths resolve
3. Run full regression suite (RX-01 through RX-07 + Phase C suite)
4. Produce Phase C certification document
5. Phase D becomes the next candidate

### BLOCKED: All Other Phases

| Phase | Blocked By |
|-------|-----------|
| Phase B | 15 missing icon asset designs (FD-12) |
| Phase D | Phase C must complete first |
| Phase E | Phase D must complete + GAP-25 spec delivery |
| Phase F | Phase E must complete |
| Phase A-3 / GAP-27 | Implementation team audit required; then separate authorization |

---

**Document integrity:** This document was produced by read-only reconnaissance of the live repository combined with explicit human decision recording. No production files were modified by the planning process. Phase C is the first authorized production change.

**ONE-APEX — ONE CONVERGENCE — PHASE C IS NOW AUTHORIZED.**
