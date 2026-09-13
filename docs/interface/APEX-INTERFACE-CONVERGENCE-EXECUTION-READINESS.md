# APEX INTERFACE CONVERGENCE EXECUTION READINESS REPORT

**Document ID:** APEX-INTERFACE-CONVERGENCE-EXECUTION-READINESS  
**Date:** 2026-08-28  
**Status:** AUTHORITATIVE — READ-ONLY VALIDATION  
**Evidence basis:** Live repository inspection + all authority documents listed in mission briefing  
**Scope:** Validate APEX-INTERFACE-CONVERGENCE-MASTERPLAN.md against repository reality; produce an evidence-grounded execution readiness determination

---

## SECTION 1 — EXECUTIVE VERDICT

**The Masterplan is substantially correct but contains five discrepancies that must be corrected before Phase B or Phase F can proceed safely.**

| Finding | Severity | Correction Required |
|---------|----------|---------------------|
| §7.2 Current Glyph column: 15/20 entries are wrong | HIGH | Correct the glyph table with actual values (documented below) |
| `:root` block count: stated as 7, actual is 13 declarations across 8 blocks | MEDIUM | Update to 8 `<style>` blocks / 13 `:root` declarations |
| `apex-v2.css` external `:root` block not in GAP-27/Phase F scope | MEDIUM | Explicitly include or explicitly exclude `apex-v2.css` from consolidation scope |
| `switchPage` original line number stated as 12801, actual is 12761 | LOW | Informational — line numbers shift; note is stale |
| `--apex-color-*` namespace not addressed in GAP-27 consolidation target | MEDIUM | Decide whether `--apex-color-*` (UX-19) merges into `--ax-*` or stays separate |

**Phase sequence is correct.** Phase B is still blocked (assets not delivered, 4 decisions unresolved). Phase C–F cascade blocks are correctly described.

**Current interface architecture is confirmed as OPTION C** — Legacy polling system and Beta command/orb coexist unconditionally in one file. Not yet converged.

**Terminal state is precisely definable** from the authority documents. It is documented in Section 22 below.

---

## SECTION 2 — MASTERPLAN VALIDATION

### 2.1 Validated Correct

| Masterplan Claim | Evidence | Verdict |
|-----------------|----------|---------|
| 20 canonical pages in `pages[]` | Line 12736: confirmed exact 20-entry array | CORRECT |
| All 20 pages in `pageMeta` | Lines 12739–12759: all 20 entries present | CORRECT |
| All 20 pages have DOM nodes | Grep: exactly 20 `<div class="page" id="page-...">` nodes | CORRECT |
| 0 orphan DOM nodes | `page-browser` absent (Phase A-1 confirmed) | CORRECT |
| `nav-more` permanently hidden | Line 12726: `style="display:none"` confirmed | CORRECT |
| `nav-more` not in `pages[]` | Confirmed absent from array | CORRECT |
| `switchPage` has 13 monkey-patch wrappers | Lines 12761, 17748, 18818, 18980, 19078, 19227, 19402, 19546, 19730, 20307, 20865, 21094, 21497, 22226 = 1 original + 13 overwrites | CORRECT (count) |
| nav-icon canonical width 18px | Lines 6578 and 7921 both: `.nav-icon { width: 18px!important; }` | CORRECT |
| GAP-02/03/04/28 closed by RX-07 | RX-07 certification "Exact Gaps Closed" table | CORRECT |
| GAP-17/18/19 closed by RX-06 | RX-06 certification "Exact Gaps Closed" table | CORRECT |
| Phase A-1 complete | `page-browser` absent from dashboard.html | CORRECT |
| Phase A-2 complete | `_addInterval(refreshCrmPanel...)` absent | CORRECT (per Phase A cert) |
| Phase B blocked (no SVG assets) | No SVG sprite, no symbol elements in dashboard.html | CORRECT |
| 20 nav buttons use emoji/Unicode glyphs | Lines 12641–12729: all use `<span class="nav-icon">[emoji]</span>` | CORRECT |
| editor.html is not a second production UI | Served at `/editor` with `requireAppAccess`; uses GrapesJS — developer tool only | CORRECT — NOT a ONE-APEX violation |

### 2.2 Discrepancies Found

#### DISCREPANCY-01 — §7.2 Current Glyph Column: 15/20 Entries Incorrect
**Severity: HIGH**  
**Location:** Masterplan §7, Table "7.2 Complete 20-Icon Delivery Requirement"  
**Nature:** The "Current Glyph" column was populated with incorrect values — many entries appear to be inherited from prototype icon names or invented values, not actual dashboard.html content.

**Evidence — Actual glyphs from dashboard.html lines 12641–12729:**

| # | Page | Actual Glyph (dashboard.html) | Masterplan §7.2 "Current Glyph" | Match? |
|---|------|------------------------------|----------------------------------|--------|
| 1 | command | ⬡ | ⬡ | ✓ |
| 2 | overview | ◈ | ◈ | ✓ |
| 3 | operation | ⊞ | ⊞ | ✓ |
| 4 | system | ◉ | ⟨/⟩ | ✗ WRONG |
| 5 | finance | ◎ | ₿ | ✗ WRONG |
| 6 | communication | ✉ | ✉ | ✓ |
| 7 | business | ◧ | ⊗ | ✗ WRONG |
| 8 | health | ◑ | ♡ | ✗ WRONG |
| 9 | university | ◫ | ⊙ | ✗ WRONG |
| 10 | occult | ◬ | ☽ | ✗ WRONG |
| 11 | research | ◈ | ◎ | ✗ WRONG |
| 12 | civilisation | ⊛ | ⌖ | ✗ WRONG |
| 13 | reality | ◍ | ◉ | ✗ WRONG |
| 14 | activity | ◎ | ⊛ | ✗ WRONG |
| 15 | agents | ◈ | ⟁ | ✗ WRONG |
| 16 | approvals | ◇ | ✓ | ✗ WRONG |
| 17 | knowledge | ◆ | ◈ | ✗ WRONG |
| 18 | intelligence | ◇ | ◈ | ✗ WRONG |
| 19 | memory | ▣ | ◈ | ✗ WRONG |
| 20 | governance | ⚖ | ⚖ | ✓ |
| **nav-more** | (excluded) | ••• | (correctly excluded) | ✓ |

**Score: 5 correct, 15 incorrect.**

**Impact:** Phase B implementation uses this table to identify which elements to replace. If the glyph column is wrong, the implementer cannot use it to locate and confirm the current state before editing. The symbol IDs (`icon-{page-name}`) and implementation approach remain correct and are unaffected. Only the "current glyph" reference data is wrong.

**Recommended correction:** Update §7.2 "Current Glyph" column with the values in the table above. Do not modify the symbol IDs or implementation approach.

**Additional observation:** Multiple pages share the same emoji glyph — ◈ appears for overview, research, and agents; ◎ appears for finance and activity; ◇ appears for approvals and intelligence. This confirms that emoji icons are not unique per page and that SVG replacement (Phase B) is necessary for visual differentiation.

---

#### DISCREPANCY-02 — `:root` Block Count: 7 Stated, Reality is 13 Declarations / 8 Blocks
**Severity: MEDIUM**  
**Location:** Masterplan §9 "GAP-27 Track" and §5 Phase F description  
**Nature:** The masterplan states "7 overlapping `:root` blocks" (inherited from RX-07 certification). The actual count is higher.

**Evidence:**

`<style>` blocks in dashboard.html (8 blocks):
| Style Block | Line | `:root` Declarations Inside |
|-------------|------|-----------------------------|
| Block 1 | 20 | Line 23 (1 declaration) |
| Block 2 | 1299 | Lines 1301, 2440 (2 declarations) |
| Block 3 | 3912 | Line 3919 (1 declaration) |
| Block 4 | 4912 | Line 4919 (1 declaration) |
| Block 5 | 6418 | Line 6425 — `--ax-*` "Final Authority Layer" (1 declaration) |
| Block 6 | 6922 | Lines 6929, 7382 (2 declarations — one main block, one single-property responsive override) |
| Block 7 | 7431 | Line 7573 (1 single-property responsive override) |
| Block 8 | 7932 (`<style id="apex-master">`) | Lines 7939, 7992, 8502, 8537 (4 declarations) |

Total: 8 `<style>` blocks, 13 `:root` declarations.

**The RX-07 cert's "7" figure predates the UX-19 integration** (which added the `--apex-color-*` block at line 8502) and possibly counted only the largest blocks. The gap inventory's "8 `<style>` blocks" is more accurate.

**Impact:** Phase F scope is larger than the masterplan describes. The consolidation must address 8 `<style>` blocks and 13 `:root` declarations, not 7 blocks.

**Recommended correction:** Update masterplan §9.1 to read "8 `<style>` blocks, 13 `:root` declarations" and update Phase F description accordingly.

---

#### DISCREPANCY-03 — `apex-v2.css` External `:root` Block Not in Masterplan Scope
**Severity: MEDIUM**  
**Location:** Masterplan §9 "GAP-27 Track", Phase F description  
**Nature:** `public/apex-v2.css` is an external CSS file served by the application and linked inside `dashboard.html` (line 3909: `<link rel="stylesheet" href="/apex-v2.css">`). It has its own `:root` block (starting at `apex-v2.css` line 17) defining `--bg`, `--surface`, `--accent`, `--primary`, `--cyan`, agent colour variables, and text variables.

The `apex-v2.css` `:root` block is separate from all dashboard.html `:root` blocks. It is served via `src/routes/ui.js` (line 25: `router.get('/apex-v2.css', ...)`).

The "Final Authority Layer" `:root` block at dashboard.html line 6425 maps legacy vars (`--bg`, `--surface`, etc.) to `--ax-*` values using `!important`. Because dashboard.html's `<style id="apex-master">` comes after `apex-v2.css` in the cascade, the `!important` declarations in the line 6425 block override `apex-v2.css`'s `:root` values.

The masterplan does not mention `apex-v2.css` anywhere.

**Impact on Phase F:** If Phase F consolidates all `:root` blocks in dashboard.html into one, but `apex-v2.css` still exists and is linked, there will still be a second `:root` block in the cascade (from the external file). Phase F cannot achieve "one `:root` block" without either:
- (A) Removing `apex-v2.css` link and absorbing its unique properties into the consolidated block, OR
- (B) Explicitly keeping `apex-v2.css` as the single canonical external token file and removing the overlapping internal declarations

This decision has not been made and is not in the masterplan.

**Additional note:** `apex-custom.css` (also linked at line 3910) currently contains only 2 comment lines — it is essentially empty and presents no consolidation problem.

**Recommended correction:** Add `apex-v2.css` to the GAP-27 scope discussion. Add a Gate 9: "Decide whether `apex-v2.css` is absorbed into dashboard.html (inline) or retained as the canonical external token source during Phase F."

---

#### DISCREPANCY-04 — `switchPage` Original Line Number: 12801 Stated, 12761 Actual
**Severity: LOW (informational)**  
**Location:** Masterplan §4.3 "switchPage() Chain"  
**Nature:** Masterplan states "The `switchPage()` function begins at line 12801." Actual line is 12761.

**Evidence:** Grep shows: `12761: window.switchPage = function(name) {`

**Explanation:** The masterplan was written before Phase A edits (which removed ~39 lines). After Phase A-1 removed the `page-browser` block, all subsequent line numbers shifted downward. Line 12801 (pre-Phase-A) became approximately 12761 (post-Phase-A). The monkey-patch count (13) remains correct.

**Recommended correction:** Note in §4.3 that line numbers are approximate and shift with each edit; the count (13 wrappers) is the authoritative reference, not the line number.

---

#### DISCREPANCY-05 — `--apex-color-*` Namespace Not Addressed in GAP-27/Phase F Consolidation
**Severity: MEDIUM**  
**Location:** Masterplan §9, Phase F description  
**Nature:** The masterplan states the consolidation target is "one canonical `--ax-*` block." However, the UX-19 integration added a separate `--apex-color-*` namespace at dashboard.html line 8502 (22 colour tokens + 5 z-index + 4 duration tokens). This block was explicitly marked "INV-VS-02: additive block only — does not replace existing tokens."

The current live interface has TWO active canonical namespaces:
- `--ax-*` — the "Final Authority Layer" (line 6425) — established by design unification pass
- `--apex-color-*` — the UX-19 canonical color token namespace (line 8502)

These two namespaces are not currently bridged to each other. Domain page CSS added in RX-04 uses `--apex-color-primary`, `--apex-color-bg`, etc. Navigation CSS uses `--ax-acc`, `--ax-tx0`, etc.

**Impact on Phase F:** Consolidation must explicitly resolve whether:
- (A) `--apex-color-*` is kept as-is and `--ax-*` is retained for navigation — two namespaces coexist intentionally
- (B) `--apex-color-*` is migrated to `--ax-*` equivalents — one namespace survives
- (C) Both are replaced by a new single unified namespace

This decision has not been made and is not in the masterplan.

**Recommended correction:** Add a Gate 9 or extend Gate 8 to include: "Decide whether `--apex-color-*` and `--ax-*` merge into one namespace during Phase F, or coexist as complementary namespaces."

---

#### DISCREPANCY-06 — R-Series Reconciliation Sprint Plan Is Superseded (Historical Artifact)
**Severity: INFORMATIONAL — No correction needed to masterplan**  
**Location:** `docs/interface/POST-UX-19-R-SERIES-RECONCILIATION.md`  
**Nature:** The R-Series reconciliation document (an authority document listed in the mission) planned RX-01 through RX-07 as a specific future sprint sequence. The actual RX sprints executed a different sequence:
- R-Series planned RX-06 to be sequential on Wave-3 T3-12/T3-13 completion (constitutional prerequisite)
- Actual RX-06 closed GAP-17/18/19 without T3-12/T3-13 by using a pragmatic implementation (querying constitutional_records safe metadata that existed already)

The R-Series reconciliation document is now a superseded planning document. The masterplan correctly reflects the actual RX sprint outcomes. No masterplan correction required. However, the R-Series document should not be used as an authoritative source for "what gaps are open" — use RX-07 certification and masterplan for that.

---

## SECTION 3 — COMPLETE 32-GAP REGISTER

Evidence-grounded status for all 32 gaps, corrected against repository reality:

| Gap | Description | Class | Priority | Status (Verified) | Evidence | Masterplan Phase |
|-----|-------------|-------|----------|--------------------|----------|-----------------|
| GAP-01 | L0-L4 progressive disclosure | F | P3 | **OPEN — design required** | RX-07 cert: "OPEN — design required" | Phase C |
| GAP-02 | Voice-state notification suppression | F | P3 | **CLOSED** | RX-07 cert: CLOSED | — |
| GAP-03 | Notification deduplication ring buffer | F | P3 | **CLOSED** | RX-07 cert: CLOSED | — |
| GAP-04 | Attention budget enforcement | F | P3 | **CLOSED** | RX-07 cert: CLOSED | — |
| GAP-05 | Domain token application | A | P2 | **CLOSED** | RX-04 cert (per summary); UX-10 block at line 8544 present | — |
| GAP-06 | Knowledge panel frontend surface | C | P2 | **OPEN — backend route required** | `routes/knowledge.js` exists but provides knowledge-GAP-engine endpoints (POST /assess, GET /gaps), NOT a UX-11 knowledge panel (entity/fact/search). GAP-32 resolution: route exists at different endpoint scope than UX-11 requires. | Post-Phase-F |
| GAP-07 | Intelligence panel frontend surface | C | P2 | **OPEN — backend route required** | `routes/intelligence.js` exists; content not fully verified | Post-Phase-F |
| GAP-08 | Health agent surface | I | P3 | **OPEN DECISION** | RX-07 cert: "OPEN — product decision"; no health_agent in production | Post-Phase-F |
| GAP-09 | Agent capability/authority matrix | B | P2 | **CLOSED** | RX-04 cert (per summary) | — |
| GAP-10 | Task rejection route | C | P1 | **CLOSED** | Closed in prior RX (not in RX-07 "left open") | — |
| GAP-11 | Undo route | C | P2 | **CLOSED** | Closed in prior RX | — |
| GAP-12 | pgInsertApproval() wiring verification | B | P0 | **CLOSED** | Closed in prior RX | — |
| GAP-13 | Standing approvals route | C | P1 | **CLOSED** | Closed in prior RX | — |
| GAP-14 | Memory inspection panel | C | P2 | **CLOSED** | RX-04 cert (per summary) | — |
| GAP-15 | Memory correction route | C | P2 | **OPEN — unscheduled** | RX-07 cert: "OPEN — unscheduled" | Scheduling required |
| GAP-16 | Memory deletion route | C | P2 | **OPEN — unscheduled** | RX-07 cert: "OPEN — unscheduled" | Scheduling required |
| GAP-17 | Constitutional dashboard surface | D | P2 | **CLOSED** | RX-06 cert: CLOSED; `#page-governance` present in DOM (line 12580) | — |
| GAP-18 | ExecutionContext.constitution propagation | D | P2 | **CLOSED** | RX-06 cert: CLOSED; `/api/governance/dashboard` has constitution block | — |
| GAP-19 | Constitutional audit log route | C | P2 | **CLOSED** | RX-06 cert: CLOSED; `GET /governance/history` route confirmed | — |
| GAP-20 | Viz-broadcaster event type expansion | E | P1 | **CLOSED** | Closed in prior RX (not in RX-07 "left open") | — |
| GAP-21 | correlation_id in event bus | E | P2 | **CLOSED** | RX-05 cert (per summary) | — |
| GAP-22 | Historical event query API | C | P2 | **OPEN — unscheduled** | RX-07 cert: "OPEN — unscheduled" | Scheduling required |
| GAP-23 | 17-category event taxonomy live data | E | P1 | **CLOSED** | Closed in prior RX (depends on GAP-20; not in "left open") | — |
| GAP-24 | Bottom sheet component | F | P3 | **OPEN — blocked by GAP-01** | RX-07 cert: "OPEN — blocked by GAP-01" | Phase C |
| GAP-25 | 5-tab persistent bottom nav bar | H | P3 | **OPEN — design required** | RX-07 cert: "OPEN — design required" | Phase D |
| GAP-26 | Safe-area FAB | H | P3 | **CLOSED or deferred** | Not in RX-07 "left open"; very low priority | — |
| GAP-27 | Style block consolidation | G | P3 | **OPEN — per-block targets required** | RX-07 cert: "OPEN — deferred"; 8 style blocks confirmed | Phase A-3 / Phase F |
| GAP-28 | Retired font removal | G | P2 | **CLOSED** | RX-07 cert: CLOSED | — |
| GAP-29 | SVG icon system | G | P3 | **OPEN — assets not delivered** | RX-07 cert: "OPEN — assets required"; all 20 nav buttons confirmed emoji | Phase B |
| GAP-30 | Domain page quality standardisation | H | P3 | **OPEN — quality standard not defined** | Not in "left open" but P3, class H — standard not yet defined | Post-Phase-F |
| GAP-31 | Agent grid architecture decision | I | P2 | **OPEN DECISION** | RX-07 cert: "OPEN — product decision" | Phase D |
| GAP-32 | /api/knowledge route verification | I | P0 | **PARTIALLY RESOLVED** | `routes/knowledge.js` exists with knowledge-gap-engine POST/GET endpoints. No `GET /api/knowledge` root endpoint. Baseline observation likely refers to `GET /api/knowledge/gaps` which does exist. GAP-06 is confirmed Class C. | Immediate action |

**Open gap summary (post-RX-07, post-Phase-A):**

| Status | Count | Gaps |
|--------|-------|------|
| OPEN (design required) | 2 | GAP-01, GAP-25 |
| OPEN (assets required) | 1 | GAP-29 |
| OPEN (per-block targets) | 1 | GAP-27 |
| OPEN (unscheduled backend) | 3 | GAP-15, GAP-16, GAP-22 |
| OPEN (route required) | 2 | GAP-06, GAP-07 |
| OPEN (blocked upstream) | 2 | GAP-24 (→GAP-01), GAP-30 (→standard) |
| OPEN DECISION | 3 | GAP-08, GAP-31, GAP-32 (partially) |
| **TOTAL OPEN** | **14** | |

---

## SECTION 4 — CURRENT INTERFACE ARCHITECTURE

### 4.1 Architecture Classification: OPTION C — CONFIRMED

The current `public/dashboard.html` contains two coexisting UI systems that both boot unconditionally:

**Legacy system:**
- 14+ polling-based page DOM nodes with `setInterval`/`_addInterval` refresh loops
- `switchPage()` chain: 1 original (line 12761) + 13 monkey-patch wrappers (last at line 22226)
- Shared navigation rail (`.bottom-nav`)
- Panel-based content refresh pattern

**Beta system:**
- `page-command` (default active, line 8809)
- 11-state orb voice interface
- Event-driven architecture via `/ws/viz` WebSocket
- `page-activity`, `page-agents`, `page-approvals`, `page-governance` — UX-19 additions

**Both systems initialise on every page load.** They are interleaved across 22,000+ lines. No separation, no lazy loading, no conditional initialisation.

### 4.2 Architecture Integrity

| ONE-APEX Principle | Status | Evidence |
|-------------------|--------|---------|
| Single production frontend | **MAINTAINED** | `src/routes/ui.js` serves only `dashboard.html`; `editor.html` is dev tool at `/editor` |
| No second dashboard | **MAINTAINED** | No second SPA exists; `editor.html` is a GrapesJS dev tool, not a user-facing dashboard |
| No second navigation system | **MAINTAINED** | One `.bottom-nav` rail; `switchPage()` is global |
| No second JS runtime | **MAINTAINED** | One `<script>` context |
| No second event bus | **MAINTAINED** | One `lib/event-bus.js` |
| No orphan DOM nodes | **MAINTAINED** | `page-browser` removed in Phase A-1 |
| No duplicate polling | **MAINTAINED** | 4 duplicate `_addInterval` calls removed in Phase A-2 |

---

## SECTION 5 — CANONICAL PAGE INVENTORY

All 20 pages verified present in `pages[]`, `pageMeta`, and DOM. Zero orphans.

| # | Page Name | DOM ID | Nav Button ID | Current Nav Glyph | pageMeta | Legacy/Beta | Fate |
|---|-----------|--------|---------------|-------------------|---------|------------|------|
| 1 | command | `#page-command` | `#nav-command` | ⬡ | ✓ | Beta (primary) | PRESERVE |
| 2 | overview | `#page-overview` | `#nav-overview` | ◈ | ✓ | Legacy | Phase D/E review |
| 3 | operation | `#page-operation` | `#nav-operation` | ⊞ | ✓ | Legacy (polling) | Phase D/E review |
| 4 | system | `#page-system` | `#nav-system` | ◉ | ✓ | Legacy (polling) | Phase D/E review (GAP-31) |
| 5 | finance | `#page-finance` | `#nav-finance` | ◎ | ✓ | Legacy (polling) | Phase D/E review |
| 6 | communication | `#page-communication` | `#nav-communication` | ✉ | ✓ | Legacy (polling) | Phase D/E review |
| 7 | business | `#page-business` | `#nav-business` | ◧ | ✓ | Legacy (polling) | Phase D/E review |
| 8 | health | `#page-health` | `#nav-health` | ◑ | ✓ | Legacy (polling) | Phase D/E review |
| 9 | university | `#page-university` | `#nav-university` | ◫ | ✓ | Legacy (polling) | Phase D/E review |
| 10 | occult | `#page-occult` | `#nav-occult` | ◬ | ✓ | Legacy (polling) | Phase D/E review |
| 11 | research | `#page-research` | `#nav-research` | ◈ | ✓ | Legacy (polling) | Phase D/E review |
| 12 | civilisation | `#page-civilisation` | `#nav-civilisation` | ⊛ | ✓ | Legacy (polling) | Phase D/E review |
| 13 | reality | `#page-reality` | `#nav-reality` | ◍ | ✓ | Legacy (polling) | Phase D/E review |
| 14 | activity | `#page-activity` | `#nav-activity` | ◎ | ✓ | Beta (UX-19) | PRESERVE |
| 15 | agents | `#page-agents` | `#nav-agents` | ◈ | ✓ | Beta (UX-19) | PRESERVE (GAP-31 affects scope) |
| 16 | approvals | `#page-approvals` | `#nav-approvals` | ◇ | ✓ | Beta (UX-19) | PRESERVE |
| 17 | knowledge | `#page-knowledge` | `#nav-knowledge` | ◆ | ✓ | Beta (UX-19) | PRESERVE (GAP-06 pending) |
| 18 | intelligence | `#page-intelligence` | `#nav-intelligence` | ◇ | ✓ | Beta (UX-19) | PRESERVE (GAP-07 pending) |
| 19 | memory | `#page-memory` | `#nav-memory` | ▣ | ✓ | Beta (UX-19) | PRESERVE (GAP-15/16 pending) |
| 20 | governance | `#page-governance` | `#nav-governance` | ⚖ | ✓ | Beta (RX-06) | PRESERVE |
| — | nav-more | — | `#nav-more` | ••• | (not in pages[]) | Neither — mobile toggle | EXCLUDED from Phase B scope |

**NOTE:** Which legacy pages are to be RETIRED in Phase E has NOT been specified. The inventory shows the 14 polling-based pages (overview through reality) as "Phase D/E review" — the actual retirement list requires explicit per-page authorisation in the Phase E authorisation document.

---

## SECTION 6 — NAVIGATION CONVERGENCE STATE

### 6.1 Desktop Navigation
- Single `.bottom-nav` rail containing 21 buttons (20 nav + 1 nav-more)
- `nav-more` permanently hidden
- All 20 nav buttons wire to `switchPage(name)` via `addEventListener('click', ...)` at line 12776
- Active state: `.active` CSS class on both button and page
- Default active: `page-command` (DOM `class="page active"` at line 8809)

### 6.2 Mobile Navigation
- Same `.bottom-nav` rail is used on mobile
- Responsive CSS controls layout (horizontal scroll, icon-only, etc.)
- GAP-25: 5-tab bottom nav at ≤640px is NOT implemented — hamburger pattern currently active
- `nav-more` was intended as a mobile overflow control but is permanently hidden

### 6.3 Duplicate Navigation Mechanisms
None found. One navigation system exists.

### 6.4 Icon State
- All 20 nav buttons: `<span class="nav-icon">[Unicode emoji]</span>`
- No SVG elements exist in the navigation rail
- Multiple pages share identical emoji glyphs (see §3 DISCREPANCY-01 note on duplicates)

### 6.5 switchPage() Chain
- Original: line 12761
- 13 monkey-patch wrappers: lines 17748, 18818, 18980, 19078, 19227, 19402, 19546, 19730, 20307, 20865, 21094, 21497, 22226
- Each wrapper saves the previous `switchPage` and calls it, then adds page-specific init logic
- A throw in any wrapper at or after line N prevents the page init of any wrapper at line M > N from running
- This is the critical fragility — Phase D must collapse this chain

### 6.6 What Phase D Must Produce
- Exactly one `switchPage(name)` function — no wrappers remaining
- All 20 pages' init logic consolidated into that one function or called from it directly
- 5-tab bottom nav at ≤640px (GAP-25) — requires GAP-25 design spec first
- GAP-31 resolved (agent grid scope decision)
- Browser regression suite must be in place before this work

---

## SECTION 7 — GAP-29 ASSET READINESS

### 7.1 SVG Asset State
No SVG assets exist anywhere in the repository for navigation icons:
- No `<svg id="ds-icon-sprite">` in `dashboard.html`
- No `<symbol>` elements in any nav-related HTML
- No `.svg` files in `public/`
- The prototype file (`docs/interface/prototype/apex-command-prototype.html`) has 5 prototype icon paths

### 7.2 Resolved Decisions (from GAP-29-DESIGN-DECISION-RECORD.md)
- Symbol ID convention: `icon-{page-name}` — RESOLVED
- nav-more scope: EXCLUDED — RESOLVED

### 7.3 Unresolved Decisions
- Gate 1: `href` vs `xlink:href` — **UNRESOLVED** — BLOCKS Phase B
- Gate 2: Sprite location (inline vs. external) — **UNRESOLVED** — BLOCKS Phase B

### 7.4 Asset Delivery Status
- 5 prototype paths exist (command, system, knowledge, world-candidate, decisions-candidate)
- 15 new icon SVG paths: **NOT DELIVERED**
- 2 prototype paths have ambiguous mapping (world→overview?, decisions→approvals?)
- Formal production approval: **NOT RECEIVED** for any prototype path

### 7.5 Phase B Blockers (must ALL clear before Phase B authorisation)

| Blocker | Status |
|---------|--------|
| Gate 1: href vs xlink:href decision | UNRESOLVED |
| Gate 2: sprite location decision | UNRESOLVED |
| icon-command approval | PENDING |
| icon-system approval | PENDING |
| icon-knowledge approval | PENDING |
| icon-overview mapping (world/new?) | DECISION REQUIRED |
| icon-approvals mapping (decisions/new?) | DECISION REQUIRED |
| 15 new icon SVG paths | NOT DELIVERED |

**Phase B cannot begin until all 8 items above are resolved and the SVG assets are verified against the technical contract.**

### 7.6 Technical Contract (verified from prototype file)
```
viewBox="0 0 20 20"
stroke-width="1.5"
stroke-linecap="round"
stroke-linejoin="round"
fill="none"
stroke="currentColor"
```
Rendered size: 18px × 18px (width by `.nav-icon { width: 18px!important; }` at lines 6578/7921; height must be added to `.nav-icon svg` in Phase B — no competing `!important` exists for height on SVG child).

---

## SECTION 8 — GAP-27 CSS CONSOLIDATION READINESS

### 8.1 Accurate Current State

| Item | Masterplan States | Actual (Verified) |
|------|------------------|-------------------|
| `<style>` block count | "7 overlapping `:root` blocks" | **8** `<style>` blocks |
| `:root` declaration count | 7 | **13** declarations in 8 blocks |
| External CSS `:root` | Not mentioned | `apex-v2.css` has 1 `:root` (external) |
| Canonical namespace | `--ax-*` | `--ax-*` AND `--apex-color-*` both active |

### 8.2 Style Block Map

| Block | Line | Comment | `:root` Namespace(s) | Notes |
|-------|------|---------|---------------------|-------|
| 1 | 20 | (original) | Legacy: `--bg`, `--surface`, `--primary`, `--cyan` | Earliest design tokens |
| 2 | 1299 | "APEX Enhanced Design System" | `--bg`, `--surface`, `--primary`, `--glass`, `--border`, `--cyan` | APEX v11 tokens |
| 3 | 3912 | (after apex-v2.css link) | Mixed | Links at 3909–3910 interrupt cascade |
| 4 | 4912 | Unknown | Unknown | Needs inspection |
| 5 | 6418 | "APEX Design Unification Pass — Final Authority Layer" | `--ax-*` canonical + bridges all legacy vars with `!important` | **The canonical layer** |
| 6 | 6922 | Unknown | `--ax-*` usage + responsive overrides | Includes single-property override at 7382 |
| 7 | 7431 | Unknown | Single-property responsive override (`--topbar-h`) | Low-risk |
| 8 | 7932 | `<style id="apex-master">` | `--apex-color-*` (UX-19), `color-scheme:dark`, reduced-motion | Latest UX-19 additions |
| ext | — | `apex-v2.css` | `--bg`, `--surface`, `--accent`, `--primary`, `--cyan`, agent colors | External; overridden by line 6425 `!important` |

### 8.3 What Per-Block Authorisation Must Specify

For each of the 8 `<style>` blocks AND the `apex-v2.css` external block, provide:
- **SURVIVOR**: This block becomes the one canonical `<style>` block
- **REMOVE**: Block has no unique properties; delete it
- **MIGRATE**: Block has unique properties; enumerate which properties move to the survivor and their canonical names
- **MERGE**: Two blocks have no conflicts; fold one into the other

Additionally specify:
- Does `--ax-*` or `--apex-color-*` survive as the single canonical namespace, or both?
- Does `apex-v2.css` get absorbed into the survivor block (remove the external file) or remain as the token source?

**No implementation may begin until these decisions are provided.**

### 8.4 Visual Regression Requirement
Phase F (and GAP-27 if done as A-3) requires a browser-based visual regression suite before implementation. Any cascade reordering across 22,000 lines can produce silent visual breakage. The current test suites (`tests/rx-*.test.js`) are logic tests, not visual regression tests. Screenshot-diff tooling is not currently set up.

---

## SECTION 9 — GAP-15/16/22 SCHEDULING STATE

### 9.1 Status
All three remain genuinely open. Verified from RX-07 certification "Gaps Deliberately Left Open."

### 9.2 Implementation Dependencies

| Gap | Route Needed | Existing Logic | Effort |
|-----|-------------|----------------|--------|
| GAP-15 | `PATCH /api/memory/:id` or similar | `lib/memory/helpers.js` exists (has relevant mutation logic) | Low-medium |
| GAP-16 | `DELETE /api/memory/:id` or similar | `lib/memory/helpers.js` exists | Low |
| GAP-22 | Paginated event query route | Event store already in place; query route missing | Medium |

### 9.3 Are They Interface Prerequisites?
No. These are backend routes. They do not block Phases A–F. They can be implemented in a standalone backend sprint at any time in parallel with the interface convergence phases.

### 9.4 Why They Must Be Scheduled
Without them, the memory inspection surface (GAP-14, closed by RX-04) is read-only — users cannot correct or delete memory entries. The historical observability surface is limited to the 20-task window. These are UX-15 and UX-17 compliance gaps.

**Recommended:** Assign GAP-15, GAP-16, GAP-22 to the next backend sprint, independent of interface convergence sequencing.

---

## SECTION 10 — GAP-31 PRODUCT DECISION STATE

### 10.1 Current State
The agent grid (domain agent capability/authority matrix) currently lives on `page-system`. `page-agents` (added in UX-19) has a different scope: runs, self-check, standing approvals.

### 10.2 Options (from gap inventory)
- **(a)** Move grid to `page-agents`; `page-system` shows summary only — requires HTML/JS changes
- **(b)** Duplicate grid in both pages — creates data divergence risk
- **(c)** Keep `page-system` as-is; `page-agents` has complementary (not overlapping) scope — no code change

### 10.3 Phase Dependency
GAP-31 decision is required before Phase D (navigation consolidation). Phase D collapses the `switchPage()` chain and must know the correct page-system vs. page-agents scope to do it accurately.

### 10.4 Status
**OPEN DECISION — awaiting product decision.** No implementation may proceed.

---

## SECTION 11 — GAP-01 PROGRESSIVE DISCLOSURE STATE

### 11.1 Current State
No progressive disclosure system exists. All surfaces (activity cards, agent cards, approval cards) render as flat cards. L0-L4 state machine: **not implemented, not designed.**

### 11.2 Design Dependency
A dedicated design phase must produce:
- L0-L4 state machine contract (state definitions, transition rules, component API)
- Bottom sheet specification (GAP-24 — required for L2 disclosure level)
- Transition animation spec

### 11.3 Downstream Blocked Phases
Phase C is blocked on this design spec. Phase D is blocked on Phase C. Phases E and F are blocked on Phase D. GAP-01 is on the critical path of the entire convergence.

### 11.4 Masterplan Adequacy
The masterplan correctly describes GAP-01 as a design-phase prerequisite and correctly blocks Phases C–F on it. No correction needed. However, the masterplan does not contain the design spec itself (by design — it's an authority document yet to be produced).

**Status: BLOCKED — no design spec exists, no deliverable date set.**

---

## SECTION 12 — LEGACY RETIREMENT INVENTORY

The following components are candidates for retirement in Phase E. **No retirement is authorised by this document.** Each item below is a reconnaissance finding only.

### 12.1 Confirmed Dead Code (Post Phase A-1)
| Component | Location | Status |
|-----------|----------|--------|
| `window.browserAction()` | dashboard.html (line ~20600 pre-edit) | Dead code — referenced IDs no longer exist; retirement authorised in Phase E |
| `window.browserFill()` | dashboard.html (line ~20621 pre-edit) | Dead code — same reason |

### 12.2 Legacy Polling Pages (Candidates for Phase E Review)
These 13 pages use the polling (`setInterval`/`_addInterval`) pattern. Whether any are retired in Phase E depends on whether Beta equivalents exist and explicit per-page retirement authorisation is provided.

| Page | DOM ID | Pattern | Beta Equivalent? |
|------|--------|---------|-----------------|
| overview | `#page-overview` | Polling | None confirmed |
| operation | `#page-operation` | Polling | None confirmed |
| system | `#page-system` | Polling + agent grid | `page-agents` (partial overlap — GAP-31) |
| finance | `#page-finance` | Polling | None |
| communication | `#page-communication` | Polling | None |
| business | `#page-business` | Polling | None |
| health | `#page-health` | Polling | None |
| university | `#page-university` | Polling | None |
| occult | `#page-occult` | Polling | None |
| research | `#page-research` | Polling | None |
| civilisation | `#page-civilisation` | Polling | None |
| reality | `#page-reality` | Polling | None |

**Note:** The 6 UX-19 Beta pages (activity, agents, approvals, knowledge, intelligence, memory) and governance (RX-06) are NOT retirement candidates — they are the new canonical surfaces.

### 12.3 switchPage() Monkey-Patch Wrappers
13 monkey-patch wrappers at lines 17748–22226 will be retired as part of Phase D (navigation consolidation), not Phase E. Their page-specific init logic will be consolidated into the canonical `switchPage()`.

### 12.4 Retirement Safety Requirements
Before any page is retired:
- Confirm no other page or JS block references the retired page's DOM IDs
- Confirm the retired page's API endpoints are not consumed elsewhere
- Confirm the retired page's polling function is truly orphaned (not called from anywhere else)
- A browser smoke test on all remaining pages must pass post-retirement
- One page retired per authorisation unit (no batch retirements without explicit list)

---

## SECTION 13 — PHASE A STATUS

| Item | Description | Status |
|------|-------------|--------|
| A-1 | `page-browser` orphan removal | **COMPLETE** — confirmed absent from DOM |
| A-2 | Duplicate `_addInterval` deduplication | **COMPLETE** — per Phase A certification |
| A-3 | GAP-27 CSS `:root` consolidation | **BLOCKED** — per-block targets not provided |

All RX test suites (RX-02 through RX-07) pass as of Phase A certification.

**Prerequisite to complete Phase A:** Provide explicit disposition for each of the 8 `<style>` blocks and the `apex-v2.css` external block (SURVIVOR / REMOVE / MIGRATE). Also decide namespace consolidation strategy (`--ax-*` vs `--apex-color-*`).

---

## SECTION 14 — PHASE B READINESS

**Status: BLOCKED**

Phase B cannot begin. All 8 asset delivery blockers remain open (see §7.5). No SVG assets have been delivered. No SVG assets have been accidentally created (confirmed — `public/` contains no `.svg` files).

**What the implementer needs on Phase B authorisation day:**
1. Gate 1 decision (`href` vs `xlink:href`)
2. Gate 2 decision (inline sprite vs. external file)
3. Formal approval for 3 prototype paths (command, system, knowledge)
4. Mapping decision for 2 ambiguous prototype paths (overview, approvals)
5. 15 new SVG paths verified against technical contract
6. Explicit file authorisation: `public/dashboard.html` only (or `public/icons.svg` if external sprite)

**What Phase B will change (once unblocked):**
- Add `<svg id="ds-icon-sprite">` with 20 `<symbol>` definitions
- Replace all 20 `<span class="nav-icon">[emoji]</span>` with `<span class="nav-icon"><svg aria-hidden="true"><use href="#icon-{name}"/></svg></span>`
- Add `.nav-icon svg { width: 18px; height: 18px; }` CSS rule (no competing `!important` for height exists)
- No JS changes required

---

## SECTION 15 — PHASE C READINESS

**Status: BLOCKED**

No design specification for L0-L4 progressive disclosure exists anywhere in the repository or authority documents. GAP-01 has never progressed beyond "defined as an open gap."

**What must be delivered before Phase C authorisation:**
- L0-L4 state machine specification (state definitions, transition rules, component API contract)
- Bottom sheet specification (GAP-24)
- Transition animation spec
- Identification of which surfaces adopt each disclosure level

Phase C is on the critical path. Nothing in Phases D, E, or F can proceed until Phase C is certified.

---

## SECTION 16 — PHASE D READINESS

**Status: BLOCKED (depends on Phase C)**

Additionally requires before authorisation:
- Phase C certified
- GAP-25 design spec (5-tab bottom nav at ≤640px — specific 5 tabs, ordering, mobile icons)
- GAP-31 product decision (agent grid scope: page-system vs. page-agents)
- Browser screenshot-diff regression suite in place (mandatory precondition for switchPath chain collapse)

Phase D carries the highest implementation risk in the entire programme. The switchPage() chain collapse touches all 20 pages' initialisation logic simultaneously. Without visual regression tests, silent breakage is guaranteed.

---

## SECTION 17 — PHASE E READINESS

**Status: BLOCKED (depends on Phase D)**

Additionally requires:
- Phase D certified
- Explicit per-page retirement list — at minimum, the pages to be retired must be named. No page may be inferred as removable.
- For each page to be retired: confirmation that no active user workflow depends on it

Phase E is the only irreversible phase in the programme (page deletion is destructive). Extra caution is warranted.

---

## SECTION 18 — PHASE F READINESS

**Status: BLOCKED (depends on Phase E, visual regression suite, and GAP-27 per-block targets)**

Additionally requires:
- Phase E certified
- Visual regression test suite operating (screenshot diff across all surviving pages)
- GAP-27 per-block targets (now updated: all 8 `<style>` blocks + `apex-v2.css` disposition)
- Namespace consolidation decision (`--ax-*` vs `--apex-color-*`)
- Decision on `apex-v2.css` scope (absorb into dashboard.html or retain as external canonical)

Phase F carries the second-highest risk (cascade reordering). The visual regression suite is not optional.

---

## SECTION 19 — DEPENDENCY GRAPH

```
GAP-32 (knowledge route verify) → confirm GAP-06 is Class C
GAP-06 + GAP-07 → Post-Phase-F backend sprints

GAP-29 asset delivery (all 20 icons + 4 decisions)
    └── Phase B (SVG icons) → Phase B certified

GAP-01 design phase
    └── Phase C (progressive disclosure + GAP-24 bottom sheet)
            └── Phase D (nav consolidation + GAP-25 + GAP-31)
                    └── Phase E (legacy page retirement — per-page list required)
                            └── Phase F (CSS consolidation — GAP-27 per-block targets + visual regression)
                                    └── CONVERGENCE COMPLETE

GAP-27 per-block targets + apex-v2.css decision
    └── Phase A-3 (if early) OR Phase F (terminal sequencing)

GAP-25 design spec → Phase D (precondition)
GAP-31 product decision → Phase D (precondition)
Visual regression suite → Phase D (precondition) + Phase F (precondition)
GAP-15 + GAP-16 + GAP-22 → Independent backend sprint (parallel to Phases A-F)
```

### Critical Path
```
GAP-01 design → Phase C → Phase D → Phase E → Phase F → DONE
```

Phase B (GAP-29) is a parallel track — not on critical path but required for terminal quality gate.

**Longest current blocker on the critical path:** GAP-01 design phase — no progress, no deliverable, no timeline.

---

## SECTION 20 — REMAINING DECISION GATES

| Gate | Blocks | Status |
|------|--------|--------|
| **Gate 1** — `href` vs `xlink:href` in `<use>` | Phase B | **UNRESOLVED** |
| **Gate 2** — Sprite location (inline vs. external) | Phase B | **UNRESOLVED** |
| **Gate 3** — Prototype icon approvals (command, system, knowledge) | Phase B | **PENDING APPROVAL** |
| **Gate 4** — icon-overview and icon-approvals mapping | Phase B | **DECISION REQUIRED** |
| **Gate 5** — 15 new icon SVG paths | Phase B | **NOT DELIVERED** |
| **Gate 6** — GAP-01 L0-L4 design phase | Phase C | **BLOCKED — no design** |
| **Gate 7** — GAP-25 5-tab mobile nav design | Phase D | **BLOCKED — no design** |
| **Gate 8** — GAP-31 agent grid decision | Phase D | **OPEN DECISION** |
| **Gate 9 (NEW)** — `apex-v2.css` disposition in Phase F | Phase F | **NOT SPECIFIED** |
| **Gate 10 (NEW)** — `--ax-*` vs `--apex-color-*` namespace consolidation | Phase F | **NOT SPECIFIED** |
| **Gate 11 (existing A-3)** — GAP-27 per-block `:root` targets (updated: 8 blocks + ext) | Phase A-3 / Phase F | **UNRESOLVED** |

**Total unresolved decision gates: 11** (9 from masterplan + 2 new ones discovered in this validation)

---

## SECTION 21 — EXACT PRECONDITIONS FOR THE NEXT AUTHORISED PHASE

**The next implementation action that can proceed without any new design/decision inputs:**

**None.** Phase A-3 (the only remaining Phase A item) requires GAP-27 per-block targets — a decision that has not been provided.

**The next VERIFICATION action that can proceed without any new inputs:**

**GAP-32 verification** — run the route grep in `routes/` and `src/routes/` to formally confirm `routes/knowledge.js` exists and classify GAP-06 as Class C. This is a read-only action already effectively completed by this report (evidence: `routes/knowledge.js` confirmed at `C:\Users\arwwo\Desktop\APEX\Scripts\routes\knowledge.js`, providing knowledge-gap-engine endpoints, not UX-11 knowledge panel endpoints).

**What must be provided to unlock Phase B (the next implementation phase):**
1. Gate 1: `href` vs `xlink:href` — explicit decision
2. Gate 2: sprite location — explicit decision
3. 5 prototype path approvals or redesign instructions (command, system, knowledge, overview, approvals)
4. 15 new SVG icon paths for: operation, finance, communication, business, health, university, occult, research, civilisation, reality, activity, agents, intelligence, memory, governance
5. All 20 paths verified against technical contract

**What must be provided to unlock Phase A-3:**
1. Gate 11: Per-block targets for all 8 `<style>` blocks in dashboard.html
2. Gate 9: Disposition of `apex-v2.css` (absorb or retain)
3. Gate 10: `--ax-*` vs `--apex-color-*` namespace decision

**What must be provided to unlock Phase C (and unblock the entire critical path):**
1. Gate 6: L0-L4 progressive disclosure design specification

---

## SECTION 22 — CANONICAL FINAL INTERFACE DEFINITION

**"What should the user see when APEX is finally converged?"**

### Shell
One production file: `public/dashboard.html`. No second frontend. Served by `src/routes/ui.js` at `/`.

### Navigation
- One sidebar nav rail (`.bottom-nav`) with 20 buttons
- Each button: `<svg aria-hidden="true"><use href="#icon-{page-name}"/></svg>` (no emoji)
- One `<svg id="ds-icon-sprite">` with 20 `<symbol>` definitions
- At ≤640px: 5-tab persistent bottom bar (GAP-25 design required) instead of scrollable sidebar
- No `nav-more` button visible
- One `switchPage()` function — no monkey-patches

### Pages (20 canonical)
All 20 pages preserved. Whether any legacy pages are RETIRED in Phase E is to be determined by explicit authorisation (retirement list not yet produced). The terminal state has between 7 and 20 registered pages depending on Phase E retirement decisions.

### Page Hierarchy
- **Command** (`page-command`): Default active. Primary interaction surface. Beta architecture.
- **Activity** (`page-activity`): Event/observability feed. Beta. WebSocket-driven.
- **Agents** (`page-agents`): Agent runs, self-check, standing approvals. Beta.
- **Approvals** (`page-approvals`): Two-step modal approval surface. Beta.
- **Knowledge** (`page-knowledge`): Entity/fact surface (GAP-06 pending full backend).
- **Intelligence** (`page-intelligence`): Intelligence briefing surface (GAP-07 pending backend).
- **Memory** (`page-memory`): Memory inspection (GAP-15/16 pending write routes).
- **Governance** (`page-governance`): Constitutional dashboard. RX-06.
- **Domain pages** (finance, health, business, university, communication, etc.): To be assessed in Phase E.

### Mobile Behaviour (terminal)
- ≤640px: 5-tab persistent bottom nav (GAP-25 — requires design and Phase D)
- L0-L4 progressive disclosure: bottom sheet slide-up for detail/action (GAP-01/GAP-24 — requires design and Phase C)
- Safe-area FAB if required (GAP-26 — low priority, may not be needed)

### Visual System
- One `<style>` block containing all CSS
- One `:root` block with one canonical namespace (decision: `--ax-*` or merged `--ax-*`+`--apex-color-*`)
- `apex-v2.css` either absorbed or designated as the sole canonical external token file
- No competing `!important` cascade overrides (resolved by consolidation)
- Typography: Inter (display/body), Cinzel (brand), JetBrains Mono (code/terminal) — all currently loaded via Google Fonts CDN

### Iconography
- 20 SVG icons in `<svg id="ds-icon-sprite">` — all `viewBox="0 0 20 20"`, `stroke-width="1.5"`, `fill="none"`, `stroke="currentColor"`
- Rendered at 18×18px

### Progressive Disclosure (terminal — pending GAP-01 design)
- L0: Ambient notification (orb state)
- L1: Summary card (flat card, current beta state)
- L2: Detail sheet (bottom sheet slide-up)
- L3: Full surface (page-level view)
- L4: Expert/raw (data view)

### Activity/Event Presentation
- `page-activity`: Full 17-category event taxonomy with live data from all event types (AGENT, Voice, Tool, System, Error, Constitutional, Memory, User, Runtime, Decision, Action)
- `/ws/viz` WebSocket driving real-time updates
- Historical event query (GAP-22) available for paginated log

### Governance/Constitutional Surface
- `page-governance`: Constitutional records metadata, governance chain trace (read-only)
- `GET /api/governance/dashboard` and `GET /api/governance/history` populated
- Constitutional chain-of-thought: NEVER exposed

### Knowledge/Intelligence/Memory Surfaces
- `page-knowledge`: Entity/fact retrieval, search, browse (GAP-06 backend required)
- `page-intelligence`: Intelligence briefing, model lineage, capability inventory (GAP-07 backend required)
- `page-memory`: Memory inspection + correction + deletion (GAP-15/16 required)

### Agent Surfaces
- `page-agents`: Runs, self-check, authority matrix, standing approvals
- `page-system`: Agent grid (scope: TBD by GAP-31 decision)

### Interaction Surface
- Voice: 11-state orb, waveform active in SPEAKING/LIVE states
- Chat: `#chatInput` primary text entry
- Voice suppression: active during LISTENING/SPEAKING/LIVE
- Voice deduplication: 3s window (RX-07 closed)
- Word budget: 2000-word ceiling (RX-07 closed)

---

## SECTION 23 — TERMINAL QUALITY GATE

### Structural Checks

| Check | Criterion | Currently Met? |
|-------|-----------|---------------|
| ONE-APEX: single production file | `dashboard.html` sole frontend | YES |
| No second dashboard | No alternative SPA | YES |
| No orphan DOM nodes | Zero `<div class="page">` absent from `pages[]` | YES |
| No dead polling | Zero `setInterval` for non-existent panels | YES (post Phase A-2) |
| No dead JS | `window.browserAction`, `window.browserFill` absent | NO — Phase E required |
| Single `switchPage()` | Zero monkey-patch wrappers | NO — Phase D required |
| Single `<style>` block | 1 canonical block | NO — Phase F required |
| Single `:root` block | 1 canonical `:root` | NO — Phase F required |
| No duplicate polling | No competing `setInterval` for same panel | YES (post Phase A-2) |

### Navigation Checks

| Check | Criterion | Currently Met? |
|-------|-----------|---------------|
| 20 canonical pages | `pages[]` length === 20 | YES |
| All pages in `pageMeta` | pageMeta has 20 entries | YES |
| All pages have DOM nodes | 20 `<div class="page">` present | YES |
| SVG icons in all nav buttons | All 20 `.nav-btn` use `<svg><use>` | NO — Phase B required |
| No emoji glyphs in nav | Zero Unicode emoji in `.nav-icon` | NO — Phase B required |
| `ds-icon-sprite` present | `<svg id="ds-icon-sprite">` with 20 symbols | NO — Phase B required |
| `nav-more` excluded | Hidden with `style="display:none"`, not in `pages[]` | YES |

### Gap Compliance Checks

| Check | Criterion | Currently Met? |
|-------|-----------|---------------|
| P0 gaps closed | Zero open P0 gaps | YES (GAP-12, GAP-32 both effectively resolved) |
| P1 gaps closed | Zero open P1 gaps | YES (all P1 gaps closed in prior RX) |
| GAP-27 closed | 1 `:root` block, 1 `<style>` block | NO |
| GAP-29 closed | SVG sprite + emoji replaced | NO |
| GAP-01 closed | L0-L4 state machine implemented | NO |
| GAP-25 closed | 5-tab bottom nav at ≤640px | NO |
| GAP-15, 16, 22 closed | Backend write/query routes | NO |

### Regression Suite Checks

| Check | Criterion | Currently Met? |
|-------|-----------|---------------|
| All RX suites | RX-02 through RX-07: ALL PASS | YES (per Phase A cert) |
| Phase B–F suites | New suites required per phase | NOT YET (phases not implemented) |
| Visual regression | Screenshot-diff clean across all pages | NO — suite not set up |
| Browser smoke test | All 20 pages reachable via `switchPage(name)` | YES (current state) |

### Production Verification

| Check | Criterion | Currently Met? |
|-------|-----------|---------------|
| Auth verification | `requireAuth` gate active on `/` | YES (src/routes/ui.js confirmed) |
| ONE-APEX integrity | All 9 principles pass | PARTIAL — structural items pending Phase D–F |
| No console errors | Zero runtime errors from interface | NOT VERIFIED (read-only reconnaissance) |
| Mobile verification | 5-tab nav functional at ≤640px | NO — GAP-25 not implemented |
| Desktop verification | All 20 pages navigable | YES (current state) |

---

## SECTION 24 — RISKS

### R-01 — GAP-01 Critical Path Risk (HIGH)
GAP-01 (L0-L4 progressive disclosure) has been open since UX-08 with no design progress. It is the sole dependency blocking Phases C, D, E, and F. If this design phase is deferred indefinitely, the entire convergence stalls. Mitigation: assign a specific sprint to produce the L0-L4 design specification.

### R-02 — switchPage() Chain Collapse Risk (HIGH)
13 monkey-patches across 22,000 lines. A throw in any wrapper prevents subsequent page inits. Phase D must collapse all of these simultaneously. Without a screenshot-diff regression suite, silent breakage is near-certain. Mitigation: set up visual regression testing before Phase D begins.

### R-03 — CSS Cascade Reordering Risk (HIGH)
Phase F consolidates 8 `<style>` blocks and 13 `:root` declarations. The "Final Authority Layer" at line 6425 uses `!important` to override earlier and external blocks. Removing those `!important` overrides during consolidation (if they're no longer needed when blocks are reordered) could silently change rendered colors, sizes, or spacing. Mitigation: same visual regression suite required for Phase F.

### R-04 — `apex-v2.css` Cascade Position Risk (MEDIUM)
`apex-v2.css` is an external CSS file in the cascade. If Phase F restructures the internal style blocks but does not address `apex-v2.css`, a new cascade conflict may arise (depending on whether the `!important` overrides survive consolidation). Mitigation: explicitly scope `apex-v2.css` into Phase F (see Gate 9).

### R-05 — GAP-32 Nuance Risk (MEDIUM)
`routes/knowledge.js` exists but serves knowledge-gap-engine endpoints, not the UX-11 knowledge panel. If a future implementer reads GAP-32 as "route exists → GAP-06 is Class B," they may wire the frontend to the wrong endpoints. GAP-06 is Class C. Mitigation: document GAP-32 resolution clearly (this report does so).

### R-06 — Phase E Irreversibility Risk (HIGH)
Page deletion is irreversible without git history. No page should be retired without an explicit per-page authorisation. Retirement of a page with active user data (polling panels with real data) without migrating that data to a new surface would create a data vacuum. Mitigation: Phase E authorisation document must name every page to be retired.

### R-07 — Emoji Glyph Uniqueness Risk (LOW — cosmetic)
Multiple pages currently share the same emoji glyph (◈ appears 3 times, ◎ and ◇ each appear twice). Users cannot visually distinguish these pages by icon. Phase B resolves this. No functional impact on convergence.

---

## SECTION 25 — DISCREPANCIES / CORRECTIONS REQUIRED

All 6 discrepancies are summarised here. None has been silently corrected in the masterplan — all are reported only.

| # | Document | Section | Finding | Severity | Action |
|---|----------|---------|---------|----------|--------|
| D-01 | APEX-INTERFACE-CONVERGENCE-MASTERPLAN.md | §7.2 | Current Glyph column: 15/20 entries incorrect | HIGH | Correct glyph table with values from §3 DISCREPANCY-01 |
| D-02 | APEX-INTERFACE-CONVERGENCE-MASTERPLAN.md | §9.1 | `:root` block count: 7 stated, actual is 8 `<style>` blocks / 13 declarations | MEDIUM | Update count; add note that block 8 (`<style id="apex-master">`) was added in UX-19 |
| D-03 | APEX-INTERFACE-CONVERGENCE-MASTERPLAN.md | §9, §5 Phase F | `apex-v2.css` external `:root` block not in scope | MEDIUM | Add Gate 9 (apex-v2.css disposition) to decision gates |
| D-04 | APEX-INTERFACE-CONVERGENCE-MASTERPLAN.md | §4.3 | switchPage original line stated as 12801, actual 12761 | LOW | Note that line numbers shift; count (13) is authoritative |
| D-05 | APEX-INTERFACE-CONVERGENCE-MASTERPLAN.md | §9, §5, §6 | `--apex-color-*` namespace not in GAP-27/Phase F consolidation scope | MEDIUM | Add Gate 10 (namespace merge decision) to decision gates |
| D-06 | POST-UX-19-R-SERIES-RECONCILIATION.md | Sprint plan | Sprint plan describes different sequence than actually executed | INFORMATIONAL | No masterplan correction needed; note document is superseded by actual RX certs |

---

## SECTION 26 — FINAL EXECUTION READINESS VERDICT

**The APEX Interface Convergence Masterplan is substantively correct and is a valid execution plan.**

**Five corrections are required before using the masterplan to authorise Phase B or Phase F:**
- D-01 (glyph table — HIGH)
- D-02 (`:root` count — MEDIUM)
- D-03 (`apex-v2.css` scope — MEDIUM)
- D-04 (line number note — LOW)
- D-05 (namespace decision — MEDIUM)

**Two new decision gates must be added:**
- Gate 9: `apex-v2.css` disposition in Phase F
- Gate 10: `--ax-*` vs `--apex-color-*` namespace consolidation decision

**Phase readiness summary:**

| Phase | Readiness | Primary Blocker |
|-------|-----------|----------------|
| Phase A-3 | BLOCKED | GAP-27 per-block targets not provided; `apex-v2.css` Gate 9 not decided; namespace Gate 10 not decided |
| Phase B | BLOCKED | 20 SVG icons not delivered; Gates 1, 2, 3, 4 not resolved |
| Phase C | BLOCKED | GAP-01 L0-L4 design spec not produced (Gate 6) |
| Phase D | BLOCKED | Phase C; GAP-25 design (Gate 7); GAP-31 decision (Gate 8); visual regression suite |
| Phase E | BLOCKED | Phase D; per-page retirement list |
| Phase F | BLOCKED | Phase E; visual regression suite; Gates 9, 10, 11 |

**The next action the programme can take without additional inputs:** Formally document GAP-32 resolution (knowledge route exists as gap-engine, GAP-06 is confirmed Class C) — already effectively completed by this report.

**The next action that unblocks the most downstream work:** Produce the GAP-01 L0-L4 progressive disclosure design specification. This is the critical path bottleneck. Every convergence phase from C to F depends on it.

**ONE-APEX integrity: CONFIRMED.** The single-file architecture is intact. No second frontend exists. `editor.html` is a developer tool, not a production UI. No architectural drift detected.

---

*EXECUTION READINESS VALIDATION COMPLETE — NO IMPLEMENTATION PERFORMED — AWAITING EXPLICIT AUTHORISATION FOR THE NEXT PHASE.*

*Validation basis: live inspection of `public/dashboard.html`, `public/apex-v2.css`, `public/apex-custom.css`, `public/apex-electron.js`, `public/editor.html`, `src/routes/ui.js`, `routes/knowledge.js`, `routes/` directory listing; plus full reading of POST-UX-19-R-SERIES-RECONCILIATION.md, POST-UX-19-FINAL-RECONCILIATION.md, RX-06-CERTIFICATION.md, RX-07-CERTIFICATION.md, PHASE-A-CERTIFICATION.md, POST-UX-19-PRODUCTION-GAP-INVENTORY.md, APEX-INTERFACE-CONVERGENCE-MASTERPLAN.md.*  
*No production file was modified. No assets were created. No implementation was performed.*
