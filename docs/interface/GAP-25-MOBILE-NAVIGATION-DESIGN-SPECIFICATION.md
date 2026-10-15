# GAP-25 MOBILE NAVIGATION DESIGN SPECIFICATION

**Document ID:** GAP-25-MOBILE-NAVIGATION-DESIGN-SPECIFICATION  
**Status:** DESIGN COMPLETE — HUMAN DECISIONS REQUIRED (see Section 20)  
**Date:** 2026-08-29  
**Version:** 1.0  
**Produced by:** Claude Code — Read-only reconnaissance and design specification agent  
**Evidence basis:** Live repository audit + all authority documents listed in Section 3  
**Phase E dependency:** Phase E CANNOT begin implementation until this specification is reviewed, any HUMAN DECISION REQUIRED items are resolved, and a separate "Phase E Implementation Authorized" directive is issued  

---

## 1. DOCUMENT HEADER

| Field | Value |
|-------|-------|
| Gap ID | GAP-25 |
| Gap Class | H (UX / mobile navigation) |
| Gap Priority | P3 |
| Gap Status | OPEN — this document is the design specification |
| Phase Assignment | Phase E |
| Phase E Prerequisite | Phase D certified COMPLETE (2026-08-29) — SATISFIED |
| Phase E Authorization | NOT YET ISSUED |
| GAP-25 Design Status | This document — FIRST COMPLETE DESIGN SPECIFICATION |
| Authority Basis | UX-05 §31–32, UX-18 §§4–10, §23; MASTERPLAN §5 Phase E; IMPLEMENTATION-AUTHORISATIONS §9 |

---

## 2. EXECUTIVE SUMMARY

GAP-25 is the unresolved design gap for the APEX 5-tab persistent mobile bottom navigation bar. It is classified as a DESIGN PREREQUISITE for Phase E of the Interface Convergence programme.

**What GAP-25 is:** The current mobile navigation (viewport width < 900px) shows all 20 pages in a single horizontal tab bar — which is visually overcrowded and unusable on small screens. Additionally, a legacy hamburger-based dropdown (`#mobileNavDropdown`) exists as a secondary overflow mechanism. Neither provides the canonical UX-05/UX-18 specified 5-tab persistent bottom navigation pattern.

**What GAP-25 resolves:** This specification establishes the complete, implementation-ready design for the mobile bottom navigation: which 5 pages appear in the persistent bar, their order, labels, icons, active/inactive states, overflow surface design, breakpoints, accessibility semantics, and integration with the Phase C contextual presentation system and Phase D HYBRID agent architecture.

**What Phase E will implement:** Phase E implements this specification by replacing the current 20-button horizontal overflow scroll bar at narrow viewports with a 5-tab persistent bottom bar plus a "More" overflow surface (drawer or sheet) that provides access to all remaining 15 pages. Phase E also adds the breakpoint-correct responsive CSS, the overflow mechanism, and the ARIA/semantic markup specified here.

**What Phase E will NOT implement:** Phase E does not collapse the `switchPage()` chain (that is Phase E/F scope per Conflict 2 resolution in PHASE-D-PRE-IMPLEMENTATION-RECONNAISSANCE §2.2). Phase E does not retire legacy pages (that requires explicit per-page authorization). Phase E does not implement GAP-27 CSS consolidation.

---

## 3. AUTHORITY BASIS

Every authority document consulted for this specification, with its specific contribution to GAP-25.

| Document | Relevant Content | Authority Level |
|----------|-----------------|----------------|
| `UX-05-CANONICAL-VISUAL-DESIGN-SYSTEM.md` | §31: 3-tier breakpoints (Mobile <640px, Tablet 640–899px, Desktop ≥900px). §31.2: Navigation row — "Bottom tab bar (5 primary pages)" at Mobile/Tablet. §32.3: Named 5 tabs (Command, World, Decisions, Knowledge, System). §32.6: `env(safe-area-inset-bottom)` PROTECTED. | AUTHORITATIVE — canonical design system |
| `UX-18-MOBILE-RESPONSIVE.md` | §4: Existing responsive audit (single 900px breakpoint OBSERVED, 12 production gaps listed). §6: Full breakpoint model PROPOSED. §7: Layout transformation table. §8: Mobile portrait navigation — 5 tabs max, icon+label, 44px touch target, badge, fixed at bottom above safe area. §8.1: Recommended tabs (Home/Command, Activity, Voice, Agents, More). §23: ARIA — `role="tablist"`, `role="tab"`, `aria-selected`. §26: 30 mobile invariants. | AUTHORITATIVE — canonical mobile UX |
| `APEX-INTERFACE-CONVERGENCE-MASTERPLAN.md` | §3 Gap Register: GAP-25 "5-tab persistent bottom nav bar, Phase D, OPEN — design required". §5 Phase D (original): includes 5-tab at ≤640px. §10.2: "5-tab bottom nav at ≤640px" as terminal acceptance criterion. | AUTHORITATIVE — programme master plan |
| `APEX-INTERFACE-CONVERGENCE-EXECUTION-READINESS.md` | Confirms GAP-25 scope. Confirms Phase D scope conflict resolution (GAP-25 moved to Phase E). | AUTHORITATIVE |
| `APEX-INTERFACE-CONVERGENCE-DECISION-REGISTER.md` | Gate 7 (GAP-25): "EXPLICIT DESIGN DECISION REQUIRED". FD-08 = PRODUCE SPEC (2026-08-28 ballot). Section 9: Gate 7 maps to Phase E, not Phase D. | AUTHORITATIVE |
| `APEX-INTERFACE-CONVERGENCE-PRODUCT-DESIGN-DECISION-PACK.md` | §12 FD-08: "Mobile nav bottom bar design spec (5-tab pattern)" — PRODUCE SPEC authorized. Delivery format specified: "equivalent in detail to UX-08-CONTEXTUAL-PRESENTATION.md". | AUTHORITATIVE |
| `APEX-INTERFACE-CONVERGENCE-IMPLEMENTATION-AUTHORISATIONS.md` | §9 Phase E Design-Deliverable State: lists exactly what GAP-25 spec must deliver (5 tabs, order, labels, active state, inactive state, icon usage, overflow handling, breakpoint, portrait/landscape). Confirms Phase E requires Phase D complete + GAP-25 spec + "Phase E Implementation Authorized" directive. | AUTHORITATIVE — final authority on phase gates |
| `PHASE-D-PRE-IMPLEMENTATION-RECONNAISSANCE.md` | §2.2 Conflict 1: GAP-25 mobile nav is Phase E, NOT Phase D. §11: Exact Phase D/Phase E separation. §13.1: GAP-25 assigned to Phase E. | AUTHORITATIVE — confirms Phase E scope |
| `PHASE-D-CERTIFICATION.md` | Phase D COMPLETE (2026-08-29). Phase E is next candidate. GAP-25 mobile nav was not touched in Phase D. | AUTHORITATIVE — confirms Phase E eligibility |
| `BETA-LEGACY-INTERFACE-CONVERGENCE-RECONNAISSANCE.md` | §6: Navigation architecture — `.bottom-nav` functions as both mobile bottom bar and desktop sidebar. §8: CSS architecture — `@media(min-width:900px)` is the single breakpoint. Identifies legacy hamburger dropdown (`#mobileNavDropdown`) as secondary mechanism. | AUTHORITATIVE — current state baseline |
| `PHASE-C-CERTIFICATION.md` | Phase C COMPLETE (2026-08-29). `cx-top-chrome` and `cx-card-zone` inserted into dashboard.html. Phase D UNBLOCKED. | AUTHORITATIVE |
| `GAP-29-DESIGN-DECISION-RECORD.md` | Icon technical contract (viewBox 0 0 20 20, stroke-width 1.5, stroke-linecap round, fill none, stroke currentColor). 5 approved icon designs. 15 icon designs outstanding. Phase E must use placeholder emoji or wait for Phase B icons. | AUTHORITATIVE — icon system dependency |
| Live repository audit (`public/dashboard.html`, `public/apex-v2.css`) | Exact current HTML/CSS for `.bottom-nav`, `.nav-btn`, all 20 nav buttons, `#mobileNavToggle`, `#mobileNavDropdown`, `#moreSheet`, breakpoints. | EVIDENCE — repository ground truth |

### 3.1 Conflicts Between Authority Documents

**Conflict A — Phase assignment of GAP-25 (RESOLVED):**  
The Masterplan §5 originally assigned GAP-25 to Phase D. PHASE-D-PRE-IMPLEMENTATION-RECONNAISSANCE §2.2 (Conflict 1 resolution) and IMPLEMENTATION-AUTHORISATIONS §9 definitively assign GAP-25 to Phase E. Resolution: Phase E owns GAP-25. This document is the Phase E prerequisite specification.

**Conflict B — Breakpoint at which 5-tab bar activates:**  
UX-05 §31 states "Mobile < 640px" as the mobile breakpoint. UX-18 §8 states "Bottom Tab Bar (5 tabs maximum)" for "Mobile portrait (width < 640px)". UX-18 §7.1 layout table shows "Bottom tab bar" for tablet (640–1023px) as well. MASTERPLAN §10.2 terminal criterion says "5-tab bottom nav at ≤640px". Resolution: The 5-tab bar activates at the mobile portrait breakpoint (< 640px). The tablet range (640–899px) also shows a bottom tab bar per UX-18 §7.1, but this may have a different tab count or be a variant. See Section 11 (Responsive Specification Table) for full resolution.

**Conflict C — Named tabs differ between UX-05 §32.3 and UX-18 §8.1:**  
UX-05 §32.3 names: Command, World, Decisions, Knowledge, System.  
UX-18 §8.1 names: Home/Command Centre, Activity/Feed, Voice (centre FAB style), Agents, More.  
These are different sets. UX-18 is the later, more specific mobile document. UX-05 §32.3 was written when the page set was conceptually different (pre-convergence). Resolution: UX-18 §8.1 is the more authoritative source for mobile tab selection. Both are consulted and reconciled in Section 6 (Five-Tab Selection Analysis).

---

## 4. CURRENT STATE AUDIT

### 4.1 Current Mobile Navigation Structure

The current mobile navigation is the single `.bottom-nav` element (`<nav class="bottom-nav">`) which contains all 20 nav buttons plus the permanently hidden `#nav-more` button.

At viewport widths < 900px (the current single breakpoint), `apex-v2.css` `@media (max-width: 899px)` sets:
- `.bottom-nav`: background dark near-opaque, border-top, no border-right, padding 4px 0
- `.nav-btn { height: 48px !important; }`
- No display:none on any of the 20 buttons — all 20 are visible in a horizontal row

The result at narrow viewports: 20 equal-width tab buttons squeezed into a horizontal scroll or overflow state. This is confirmed as a production gap in UX-19 §1.3: "Mobile (<900px): Hamburger → 3-column grid dropdown — CONFLICTING."

### 4.2 `#nav-more` Element Behavior

`#nav-more` (dashboard.html line 12739) is permanently hidden with `style="display:none"`. It is NOT in `pages[]`. It has `aria-label="More pages"`. Its click handler calls `toggleMobileMore()` which opens `#moreSheet`. However because `nav-more` is permanently hidden, this is currently unreachable.

```html
<!-- Line 12739 -->
<button class="nav-btn" id="nav-more" style="display:none" aria-label="More pages">
    <span class="nav-icon" style="letter-spacing:-1px">•••</span>
    <span class="nav-label">More</span>
</button>
```

Additionally, in dashboard.html CSS (line 338), desktop override explicitly hides it: `#nav-more, #mobilePageName, #floatingPTT { display: none !important; }`. This means `#nav-more` is currently suppressed on ALL viewports.

### 4.3 `#mobileNavToggle` and `#mobileNavDropdown`

The legacy hamburger mechanism:
- `#mobileNavToggle` (line 8739): `style="display:none"` by default. A CSS rule at line 6139 shows it at narrow viewports: `#mobileNavToggle { display: block !important; ... }`.
- `#mobileNavDropdown` (line 8759): `style="display:none"`. Contains 18 `._mnav-btn` buttons using `data-fn="_mobileNavTo"` calling `_mobileNavTo(page)`. Covers: command, overview, operation, system, communication, finance, business, university, health, occult, research, activity, agents, approvals, knowledge, intelligence, memory, governance (18 of 20 — `civilisation` and `reality` are absent from this dropdown).
- `._mnav-btn` CSS (lines 6287–6301): styled as vertical list items with cyan active state.

This hamburger dropdown is a LEGACY mechanism. It is NOT the canonical 5-tab pattern. It must be retired or replaced by Phase E.

### 4.4 `#moreSheet` / `#moreSheetOverlay`

At lines 20814–20870: `#moreSheetOverlay` and `#moreSheet` exist as DOM elements. They are wired to `toggleMobileMore()` function. The `#moreSheet` has `role="dialog"` and `aria-label="More pages"`. This is a pre-existing more-sheet infrastructure that Phase E can repurpose or replace.

### 4.5 Current Breakpoint

Single breakpoint in `apex-v2.css`:
- `@media (min-width: 900px)` (line 176): activates two-column grid layout with sidebar nav
- `@media (max-width: 899px)` (line 1422): activates bottom nav bar with 48px button height

No 640px breakpoint exists anywhere in the codebase. GAP-25's 640px mobile-portrait breakpoint is entirely MISSING from production.

### 4.6 Current Nav Button Inventory (Authoritative)

The following table records exact glyph, label, and attributes for all 20 current nav buttons. Glyphs sourced from EXECUTION-READINESS §2.2 DISCREPANCY-01 (repository-verified).

| # | Element ID | Page | Actual Glyph | Label Text | Notif Badge |
|---|-----------|------|-------------|-----------|------------|
| 1 | `nav-command` | command | ⬡ | Command | None |
| 2 | `nav-overview` | overview | ◈ | Overview | None |
| 3 | `nav-operation` | operation | ⊞ | Operation | `navOpsBadge` (red) |
| 4 | `nav-system` | system | ◉ | System | `navIntelBadge` (cyan) |
| 5 | `nav-finance` | finance | ◎ | Finance | None |
| 6 | `nav-communication` | communication | ✉ | Network | `navCommsBadge` (cyan) |
| 7 | `nav-business` | business | ◧ | Business | None |
| 8 | `nav-health` | health | ◑ | Health | None |
| 9 | `nav-university` | university | ◫ | University | None |
| 10 | `nav-occult` | occult | ◬ | Occult | None |
| 11 | `nav-research` | research | ◈ | Research | None |
| 12 | `nav-civilisation` | civilisation | ⊛ | Civilisation | None |
| 13 | `nav-reality` | reality | ◍ | Reality | None |
| 14 | `nav-activity` | activity | ◎ | Activity | `navActivityBadge` (cyan) |
| 15 | `nav-agents` | agents | ◈ | Agents | None |
| 16 | `nav-approvals` | approvals | ◇ | Approvals | `navApprovalsBadge` (amber) |
| 17 | `nav-knowledge` | knowledge | ◆ | Knowledge | None |
| 18 | `nav-intelligence` | intelligence | ◇ | Intel | None |
| 19 | `nav-memory` | memory | ▣ | Memory | None |
| 20 | `nav-governance` | governance | ⚖ | Govern | None |
| (21) | `nav-more` | (none) | ••• | More | None — PERMANENTLY HIDDEN |

**Note:** `aria-label` is present on: nav-activity, nav-agents, nav-approvals, nav-knowledge, nav-intelligence, nav-memory, nav-governance. It is absent on: nav-command through nav-reality. All buttons lack `role` attribute.

### 4.7 Safe-Area Handling (Current)

`env(safe-area-inset-bottom, 0px)` is applied to `.bottom-nav` via dashboard.html line 234 (the earliest style block). This is OBSERVED and PROTECTED per UX-05 §32.6. Phase E must preserve this.

### 4.8 What Works vs. What Is Deficient

| Aspect | Current State | Deficiency |
|--------|--------------|-----------|
| Desktop nav (≥900px) | Sidebar with all 20 pages | ADEQUATE — not Phase E scope |
| Mobile nav (<900px) | 20 buttons in horizontal bar | DEFICIENT — overcrowded, unusable |
| 5-tab persistent bar | ABSENT | GAP-25 — Phase E must implement |
| Overflow/more surface | `#moreSheet` exists but unreachable | PARTIALLY PRESENT — must be wired and activated |
| Hamburger dropdown | `#mobileNavToggle`/`#mobileNavDropdown` | LEGACY — must be retired in Phase E |
| 640px breakpoint | ABSENT | Phase E must add |
| ARIA semantics | Inconsistent (some `aria-label`, no `role`) | DEFICIENT |
| Touch targets (mobile) | 48px height OBSERVED at <900px | PARTIALLY ADEQUATE (width varies — may be <44px) |
| Safe area | `env(safe-area-inset-bottom)` PRESENT | ADEQUATE |

---

## 5. GAP-25 DESIGN REQUIREMENTS

The following 32 requirements are derived from authority documents. Each is answered with the specified design value or marked HUMAN DECISION REQUIRED.

| # | Requirement | Design Answer | Authority |
|---|-------------|--------------|-----------|
| R-01 | Which 5 pages appear in the persistent mobile bottom bar? | See Section 6 — PARTIALLY AUTHORITY-RESOLVED, PARTIALLY HUMAN DECISION REQUIRED | UX-05 §32.3, UX-18 §8.1 |
| R-02 | Tab order (left to right) | See Section 7 — PARTIALLY AUTHORITY-RESOLVED | UX-18 §8.1, UX-05 §32 |
| R-03 | Labels for each tab | Short-form labels: Tab 1 through 5 per Section 7. "More" for tab 5 overflow trigger | UX-05 §32.3 labels |
| R-04 | Icon mapping for each tab | Phase B SVG icons when available; emoji glyphs as interim per FD-13 Option A (full 20-icon delivery required before Phase B) — see Section 9 | GAP-29, FD-13 |
| R-05 | Active state | Color: `var(--primary)` (cyan `#00d4ff`). Indicator: 2px top bar (::after, matching current mobile active state). Icon opacity: 1.0. Label opacity: 1.0 | UX-05 §9 canonical tokens; current dashboard.html baseline |
| R-06 | Inactive state | Color: `var(--muted)` (current). Icon opacity: 0.55 (matching current `.nav-icon` rule). Label opacity: 0.7 | Current apex-v2.css baseline |
| R-07 | Label visibility | Labels always visible (icon + label stacked) at mobile portrait. Labels hidden (icon only) at mobile landscape (height < 500px) per UX-18 §8.2 | UX-18 §8.1, §8.2 |
| R-08 | Bottom bar height | 49px total height + `env(safe-area-inset-bottom)` padding. Matches UX-18 §7.2 "Bottom tab bar: 49px fixed bottom + safe-area-inset-bottom" | UX-18 §7.2 |
| R-09 | Icon size | 18px (matching existing `.nav-icon` width rule which is `!important`). When Phase B SVG replaces emoji: 18px height added via `height: 18px` on `.nav-icon svg` | MASTERPLAN §7.1 / EXECUTION-READINESS §2.1 |
| R-10 | Label typography | `font-size: 8px; font-weight: 700; letter-spacing: 0.13em; text-transform: uppercase` (current baseline from dashboard.html line 275–278). HUMAN DECISION REQUIRED: maintain current or update to UX-18 §9.1 "text-transform: uppercase" with different size | Current baseline |
| R-11 | Spacing between tab elements | `gap: 3px` (icon to label, current baseline dashboard.html line 243). Horizontal tab spacing: equal flex distribution (each tab `flex: 1`) | Current baseline |
| R-12 | Safe-area handling | `padding-bottom: env(safe-area-inset-bottom, 0px)` on `.bottom-nav` — PROTECTED. Phase E must preserve this rule. No modification permitted. | UX-05 §32.6 PROTECT; OBSERVED |
| R-13 | Touch targets | Minimum 44×44px effective touch target per UX-05 §33.7, UX-18 §9.1. Bar height 49px satisfies vertical. Tab width: with 5 tabs and ~360px viewport, each tab is ~72px wide — ADEQUATE. | UX-05 §33.7; UX-18 §9.1 |
| R-14 | Overflow behavior | Tab 5 ("More") opens the overflow surface. All pages NOT in the 5-tab set are accessible from the overflow surface. | UX-18 §8.1 |
| R-15 | Pages not in 5-tab bar | The remaining 15 pages are in the overflow surface. Exact set depends on R-01 decision. | UX-18 §8 |
| R-16 | How user accesses remaining pages | Via "More" tab which opens the overflow surface (drawer or sheet). | UX-18 §8.1, §8.5 |
| R-17 | Overflow surface type | Full-height overlay drawer, 280px width, slides in from left — per UX-18 §8.1 "Hamburger Drawer". ALTERNATIVE: bottom sheet (bottom up, 60–80% viewport). HUMAN DECISION REQUIRED: drawer or bottom sheet. | UX-18 §8.1 |
| R-18 | Overflow surface design | Grid of page items (label + icon). Dismiss via tap-outside or swipe. Active page indicator visible. Scrollable if content exceeds height. | UX-18 §8.1, §22.3 |
| R-19 | Overflow open mechanism | Tap "More" (5th tab) → opens overflow surface. Swipe right from left edge also opens (per UX-18 §9.2 gesture model). | UX-18 §8.1, §9.2 |
| R-20 | Active state in overflow | When the active page is one of the overflow pages (not in the 5-tab bar), the "More" tab shows as active (e.g., amber or primary indicator). The active overflow page item is also highlighted within the overflow surface. | UX-18 §25.1 |
| R-21 | Behavior switching from overflow | User taps page in overflow surface → overflow closes → page becomes active → `switchPage(name)` is called → page renders | switchPage chain |
| R-22 | Back/navigation behavior | Android back gesture or swipe-right dismisses overflow surface (if open). When no overlay open: swipe right opens drawer per UX-18 §8.5 | UX-18 §8.5 |
| R-23 | Responsive breakpoints | Mobile portrait (<640px): 5-tab bar active. Mobile landscape (<1024px, height<500px): compact bar, icons only, no labels. Tablet portrait (640–1023px): HUMAN DECISION REQUIRED whether 5-tab or sidebar applies. Desktop (≥900px / ≥1024px): sidebar nav (UNCHANGED). | UX-05 §31, UX-18 §6 |
| R-24 | Landscape behavior | Compact bottom bar: 40px height, icons only (no labels), drawer for overflow. FAB remains but reduced size (UX-18 §8.2). | UX-18 §8.2 |
| R-25 | Accessibility — ARIA roles | Bottom nav: `role="tablist"`. Each tab: `role="tab"`, `aria-selected="true/false"`. Overflow trigger: `aria-haspopup="true"`, `aria-expanded="true/false"`. Overflow surface: `role="dialog"`, `aria-modal="true"`. | UX-18 §23.2 |
| R-26 | Keyboard/focus | Tab key navigates between tabs. Overflow trigger: Enter/Space opens overflow. Overflow items: Arrow keys within overflow. Escape closes overflow and returns focus to "More" tab. Focus trap active within overflow. | UX-18 §23.4, UX-05 §33.2 |
| R-27 | Screen-reader semantics | Each tab: `aria-label="[Page Name]"` if label is not adjacent text, or label IS adjacent text (preferred). Badge: `aria-label="N pending"` on badge element. Overflow trigger: `aria-label="More pages"`. | UX-18 §23.2; UX-05 §33.3 |
| R-28 | Reduced-motion | Overflow slide animation: respects `prefers-reduced-motion: reduce` — replace slide with opacity fade. Tab transition: immediate color change (no animation needed — already instantaneous in current implementation). `@media (prefers-reduced-motion: reduce)` rule is PROTECTED in `apex-v2.css` line 1441. | UX-18 §23.7; UX-05 §33.4 |
| R-29 | Phase D HYBRID agent grid interaction | When `switchPage('agents')` is called from the mobile bottom bar, Wrapper 14 (Phase D) fires — `_cxActivePage` is updated, `_cxHighlightAgents('agents')` runs. No conflict: Phase D is viewport-agnostic and operates on `#page-agents` DOM, not the nav DOM. Phase E must not break the switchPage chain. | PHASE-D-CERTIFICATION §6 |
| R-30 | Phase C contextual presentation interaction | `cx-top-chrome` is positioned below the topbar, above content. `cx-card-zone` is within the page content. Neither conflicts with a bottom tab bar. The bottom bar is fixed-bottom; cx elements are content-area elements. No conflict. Phase E must not insert DOM above `cx-top-chrome`. | PHASE-C-CERTIFICATION §1 |
| R-31 | Phase E legacy retirement interaction | Phase E does NOT retire legacy pages as part of implementing GAP-25. Legacy page retirement (per-page authorization required) is a separate Phase E task. GAP-25 mobile nav implementation and legacy retirement are decoupled tasks within Phase E. | MASTERPLAN §5 Phase E |
| R-32 | Phase F CSS convergence interaction | Phase E must NOT add new `:root` declarations. Any new CSS for the mobile nav must use existing token values (`var(--primary)`, `var(--muted)`, etc.) or be scoped to class rules within an existing style block. No Phase F scope consumed. | IMPLEMENTATION-AUTHORISATIONS §10; PHASE-D-CERTIFICATION §10.3 |

---

## 6. FIVE-TAB SELECTION ANALYSIS

### 6.1 The Core Problem

20 pages must be reduced to 5 persistent mobile tab slots. The UX-05 and UX-18 authority documents provide TWO different candidate sets with different conceptual frameworks.

### 6.2 Authority Candidate Sets

**UX-05 §32.3 candidate set (conceptual — pre-convergence era):**
1. Command
2. World (a Phase D conceptual aggregate surface — not a current page)
3. Decisions (a Phase D conceptual aggregate surface — not a current page)
4. Knowledge
5. System

**Problem with UX-05 §32.3:** "World" and "Decisions" are Phase D conceptual surfaces that do not correspond to current page IDs. "World" was the prototype name for the aggregate of ~10 legacy domain pages. "Decisions" was the prototype name for the aggregate of activity/agents/approvals. Neither is a directly usable page ID in the current `pages[]` array. These labels require a mapping decision or a future Phase D retirement implementation before they can be used.

**UX-18 §8.1 candidate set (mobile-specific, more recent authority):**
1. Home / Command Centre → maps to `command`
2. Activity / Feed → maps to `activity`
3. Voice (centre tab, elevated FAB style) → maps to no specific page — this is the VOICE FAB, not a page
4. Agents → maps to `agents`
5. More (opens hamburger drawer) → maps to overflow trigger

**Problem with UX-18 §8.1:** Tab 3 ("Voice") is described as "centre tab, elevated FAB style" — this is a UI component (the voice FAB), not a page navigation destination. It does not call `switchPage()`. This creates a design question: should the voice control occupy one of the 5 tab slots, or should Voice remain as a floating FAB and all 5 slots be page destinations?

### 6.3 Conflict Resolution Framework

The two authority sources address different concerns:
- UX-05 §32.3 is about CONTENT HIERARCHY (what pages matter most in a future converged interface)
- UX-18 §8.1 is about INTERACTION PATTERN (what is at thumb reach on mobile — including non-page controls)

For GAP-25, the primary question is which 5 PAGES appear in the tab bar (because each tab calls `switchPage(name)`). Voice is a separate control managed by the voice FAB and does not require a tab slot to function.

### 6.4 Candidate Evaluation Table

All 20 pages evaluated against 5 selection criteria: (A) Primary user entry point, (B) Highest frequency of use for a personal AI OS, (C) Named in UX-05 §32 or UX-18 §8, (D) Beta-classified page (preserved, not legacy retirement candidate), (E) Has notification badge (indicating time-sensitive content).

| Page | (A) Primary | (B) High Freq | (C) Named | (D) Beta | (E) Badge | Score | Notes |
|------|------------|--------------|----------|---------|---------|-------|-------|
| command | YES | YES | YES (UX-05, UX-18) | YES | No | 4/5 | Default landing page, voice hub |
| overview | No | Medium | No | Beta-era | No | 1/5 | Governance/pipeline status |
| operation | No | Medium | No | Legacy | No | 1/5 | Tasks/agents/schedules |
| system | No | Low | YES (UX-05) | Legacy | YES (cyan) | 2/5 | Self-check, system health |
| finance | No | Medium | No | Legacy | No | 1/5 | Finance tracking |
| communication | No | Medium | No | Legacy | YES (cyan) | 2/5 | Messages, network |
| business | No | Low | No | Legacy | No | 0/5 | CRM, projects |
| health | No | Low | No | Legacy | No | 0/5 | Habits, wellbeing |
| university | No | Low | No | Legacy | No | 0/5 | Coursework |
| occult | No | Low | No | Legacy | No | 0/5 | Esoteric archive |
| research | No | Medium | No | Beta-era | No | 1/5 | Intelligence/sources |
| civilisation | No | Low | No | Beta-era | No | 0/5 | Genome/governance |
| reality | No | Low | No | Beta-era | No | 0/5 | Epistemic fabric |
| activity | No | HIGH | YES (UX-18) | Beta | YES (cyan) | 4/5 | Live event feed, observability |
| agents | No | HIGH | YES (UX-18) | Beta | No | 3/5 | Agent status, HYBRID context |
| approvals | No | HIGH | No | Beta | YES (amber) | 3/5 | Pending approvals — governance-critical |
| knowledge | No | Medium | YES (UX-05) | Beta | No | 3/5 | Facts, evidence |
| intelligence | No | Medium | No | Beta | No | 1/5 | Briefing |
| memory | No | Low | No | Beta | No | 1/5 | Memory inspection |
| governance | No | Low | No | Beta | No | 1/5 | Constitutional records |

### 6.5 Recommended Five-Tab Set

Based on authority documents (UX-05 §32, UX-18 §8) and candidate evaluation:

**RECOMMENDED SET:**

| Position | Page | Rationale |
|---------|------|-----------|
| 1 | `command` | Default landing page; orb/voice hub; named in both UX-05 and UX-18; highest authority weight |
| 2 | `activity` | Named in UX-18 §8.1; live event feed; notification badge; high mobile relevance; primary observability surface |
| 3 | `agents` | Named in UX-18 §8.1; Phase D HYBRID primary surface; agent interaction is mobile-critical; high frequency for AI OS |
| 4 | `approvals` | Governance-critical; amber notification badge (time-sensitive); UX-14 specifies two-step mobile approval — this surface requires mobile prominence; UX-05 "Decisions" maps to this conceptually |
| 5 | More (overflow trigger) | Access to all remaining 16 pages via overflow surface; UX-18 §8.1 explicitly includes "More" as the 5th element |

**CLASSIFICATION: AUTHORITY-RESOLVED for tabs 1, 2, 3, and 5.**

**Tab 4 is HUMAN DECISION REQUIRED** — see Section 6.6.

### 6.6 Tab 4 Decision

The 4th permanent tab slot has three evidence-supported candidates:

| Candidate | Evidence | Case For | Case Against |
|-----------|----------|---------|--------------|
| `approvals` | UX-05 "Decisions" conceptual mapping; amber badge; governance-critical | Time-sensitive; governance significance; badge alerts user even when not on approvals page | Approvals may be infrequent; amber badge on "More" tab would suffice for overflow-hidden approvals |
| `knowledge` | UX-05 §32.3 explicitly names "Knowledge" as a 5th tab | Named in canonical design system authority | UX-18 §8.1 does not name Knowledge; no notification badge; personal AI OS may use knowledge less on mobile |
| `activity` | (already at position 2 in recommended set) | — | Already included |

**HUMAN DECISION REQUIRED: Tab 4 slot — `approvals` (governance-critical, badge) OR `knowledge` (UX-05 named)?**

This document recommends `approvals` as the stronger candidate (governance + urgency + badge), but this is a product decision the operator must confirm.

### 6.7 Why Excluded Pages Are Excluded

| Excluded Page | Reason |
|--------------|--------|
| overview | No notification badge; governance/pipeline status accessible from command; no authority naming |
| operation | Legacy-classified; tasks/schedules accessible via command or overflow |
| system | Legacy-classified; system self-check is a low-frequency action; not named in UX-18 |
| finance | Legacy-classified; domain-specific; periodic use, not daily mobile entry point |
| communication | Has badge but legacy-classified; accessible via overflow; communication patterns typically managed via native OS apps on mobile |
| business | Legacy-classified; low mobile frequency |
| health | Legacy-classified; low mobile frequency |
| university | Legacy-classified; low mobile frequency |
| occult | Legacy-classified; low mobile frequency |
| research | Beta-era but no badge; low mobile frequency |
| civilisation | Beta-era; low mobile frequency |
| reality | Beta-era; low mobile frequency |
| intelligence | Beta; no badge; briefing typically reviewed on desktop |
| memory | Beta; memory inspection is desktop-priority |
| governance | Beta; constitutional records are desktop-priority |

### 6.8 How Excluded Pages Remain Reachable

All 15 excluded pages are accessible via the "More" tab (position 5) which opens the overflow surface. The overflow surface lists all 15 overflow pages (or 16 if `knowledge` is also excluded). The `switchPage()` call is identical whether the user navigates via a persistent tab or the overflow surface — no page loses any functionality.

Existing `._mnav-btn` elements in `#mobileNavDropdown` also call `switchPage()` via `_mobileNavTo()`. Phase E should retire or repurpose these within the new overflow surface.

---

## 7. MOBILE BOTTOM NAVIGATION SPECIFICATION TABLE

This table specifies all 5 positions plus the More overflow trigger. Tab 4 shows both candidate options pending human decision.

| Position | Page | Label | Icon (Phase B) | Icon (interim emoji) | Active State | Notes |
|---------|------|-------|---------------|---------------------|-------------|-------|
| 1 | `command` | Command | `icon-command` (star polygon — FD-02 approved) | ⬡ | Primary cyan, top indicator bar | Default active; orb hub |
| 2 | `activity` | Activity | `icon-activity` (NOT YET DELIVERED — FD-12) | ◎ | Primary cyan, top indicator bar | Notification badge `navActivityBadge` (cyan) |
| 3 | `agents` | Agents | `icon-agents` (NOT YET DELIVERED — FD-12) | ◈ | Primary cyan, top indicator bar | Phase D HYBRID surface |
| 4a | `approvals` | Approvals | `icon-approvals` (Decisions Stack — FD-07 approved) | ◇ | Primary cyan, top indicator bar | Amber badge `navApprovalsBadge` — RECOMMENDED |
| 4b | `knowledge` | Knowledge | `icon-knowledge` (open book — FD-12a approved) | ◆ | Primary cyan, top indicator bar | ALTERNATIVE to 4a — HUMAN DECISION |
| 5 | (overflow trigger) | More | No page icon — ••• glyph or `···` | ••• | Amber/muted indicator when active page is in overflow | Opens overflow surface; `aria-haspopup`, `aria-expanded` |

**Active state specification:**
- Color: `var(--primary)` = `#00d4ff` (cyan)
- Indicator: 2px bar at top of tab button (`::after` pseudo-element, left 22%–right 22%, height 2px, radius 0 0 2px 2px) — matches current mobile active style
- Icon opacity: 1.0 (up from 0.55 inactive)
- Label opacity: 1.0 (up from ~0.7 inactive)

**Inactive state specification:**
- Color: `var(--muted)` (current baseline)
- Icon opacity: 0.55 (matches current `.nav-icon` rule)
- Label: uppercase, 8px, 700 weight, 0.13em letter-spacing

**"More" tab active-when-overflow-page indicator:**
When the currently active page is one of the overflow (non-tab) pages, the "More" tab button should show a distinct secondary indicator (e.g., amber dot or muted active style). This signals to the user that their current page is in the "More" surface. **HUMAN DECISION REQUIRED: exact More-tab active-when-overflow style.**

---

## 8. OVERFLOW / MORE SPECIFICATION

### 8.1 What nav-more Currently Does

`#nav-more` currently: permanently hidden (`style="display:none"`); its click handler calls `toggleMobileMore()`; that function opens `#moreSheet` (role="dialog") and `#moreSheetOverlay`. The underlying mechanism exists. The nav button is simply hidden.

### 8.2 GAP-25 Design for the Overflow Surface

Two options exist from UX-18 authority. HUMAN DECISION REQUIRED.

**Option A — Full-height Drawer (UX-18 §8.1 primary recommendation):**
- Slides in from left
- 280px width
- Full height
- Semi-transparent backdrop
- Contains: list of all overflow pages, domain sections, settings/profile access
- Dismisses: tap backdrop, swipe left, Escape key
- `role="navigation"`, `aria-label="Main menu"`

**Option B — Bottom Sheet (compatible with existing `#moreSheet` infrastructure):**
- Slides up from bottom
- 70–85% viewport height
- Grid of page tiles (2–3 columns)
- Dismisses: swipe down, close button, tap outside
- `role="dialog"`, `aria-modal="true"`, `aria-label="More pages"` (matches existing element)
- Lower implementation risk — repurposes existing `#moreSheet` DOM element

**This specification recommends Option B (bottom sheet)** because:
1. `#moreSheet` infrastructure already exists at lines 20814–20870
2. The existing `role="dialog"` and `aria-label` are already correct for Option B
3. Phase E scope is smaller (repurpose vs. create new drawer)
4. UX-18 §22.3 specifies bottom sheet as the disclosure mechanism for L3/L4 — using the same pattern for "More" is consistent
5. Option A (drawer) matches UX-18 §8.1 text but requires creating new DOM infrastructure

**HUMAN DECISION REQUIRED: Drawer (Option A) or Bottom Sheet (Option B)?**

### 8.3 Pages in Overflow, Their Order

The following pages appear in the overflow surface (in the recommended order):

| # | Page | Label | Icon | Badge |
|---|------|-------|------|-------|
| 1 | overview | Overview | `icon-overview` (globe — FD-06 approved) | None |
| 2 | operation | Operation | `icon-operation` (not delivered) | `navOpsBadge` (red) |
| 3 | system | System | `icon-system` (terminal — FD-03 approved) | `navIntelBadge` (cyan) |
| 4 | finance | Finance | `icon-finance` (not delivered) | None |
| 5 | communication | Network | `icon-communication` (not delivered) | `navCommsBadge` (cyan) |
| 6 | business | Business | `icon-business` (not delivered) | None |
| 7 | health | Health | `icon-health` (not delivered) | None |
| 8 | university | University | `icon-university` (not delivered) | None |
| 9 | occult | Occult | `icon-occult` (not delivered) | None |
| 10 | research | Research | `icon-research` (not delivered) | None |
| 11 | civilisation | Civilisation | `icon-civilisation` (not delivered) | None |
| 12 | reality | Reality | `icon-reality` (not delivered) | None |
| 13 | intelligence | Intel | `icon-intelligence` (not delivered) | None |
| 14 | memory | Memory | `icon-memory` (not delivered) | None |
| 15 | governance | Govern | `icon-governance` (not delivered) | None |

If `knowledge` is chosen for Tab 4 (Option 4b), `approvals` is added to the overflow list and `knowledge` is removed. Adjust accordingly.

**Grouping HUMAN DECISION REQUIRED:** Should overflow pages be grouped (e.g., Domain pages vs. Operational pages vs. Intelligence pages)? Or displayed as a flat list/grid? No authority document specifies grouping within the "More" surface.

### 8.4 Open/Close Behavior

- Open: Tap "More" tab (position 5) → overflow surface opens with animation (slide up for bottom sheet, slide left for drawer)
- Close: tap backdrop OR swipe down (bottom sheet) OR swipe left (drawer) OR Escape key OR navigate to a page within overflow
- After page selection: overflow closes → `switchPage(name)` fires → page becomes active
- `aria-expanded` on More tab button: updated to "true" when open, "false" when closed

### 8.5 Active-State Behavior in Overflow

When the active page is one of the overflow pages:
- The active page item within the overflow surface is highlighted (same cyan active color as tab bar active state)
- The "More" tab in the bottom bar shows a secondary indicator (distinguishing "the active page is somewhere in here")
- When overflow closes, "More" tab retains this secondary active indicator until user navigates back to a tabbed page

### 8.6 Dismissal

All dismissal methods:
- Swipe down (bottom sheet) or swipe left (drawer)
- Tap outside the overflow surface (backdrop)
- Escape key
- Select a page (auto-dismiss after `switchPage()` call)
- Android back gesture

### 8.7 Accessibility for Overflow Surface

- `role="dialog"` or `role="navigation"` depending on option chosen (see §8.2)
- `aria-modal="true"` (for dialog option)
- `aria-label="More pages"` or `aria-label="Navigation menu"`
- Focus trap active when open
- Focus on open: moves to first focusable item in overflow surface
- Focus on close: returns to "More" tab button
- Escape key closes overflow and returns focus to "More" tab

---

## 9. ICON REQUIREMENTS

For each of the 5 tabs plus overflow trigger: symbol ID, current status, GAP-29/Phase B dependency.

| Tab | Symbol ID | Current Glyph | Phase B Status | FD-Status |
|-----|-----------|--------------|---------------|-----------|
| 1 — Command | `icon-command` | ⬡ | APPROVED — star polygon ready | FD-02 APPROVED |
| 2 — Activity | `icon-activity` | ◎ | OUTSTANDING — no design | FD-12 (asset delivery pending) |
| 3 — Agents | `icon-agents` | ◈ | OUTSTANDING — no design | FD-12 (asset delivery pending) |
| 4a — Approvals | `icon-approvals` | ◇ | APPROVED — Decisions Stack ready | FD-07 APPROVED |
| 4b — Knowledge | `icon-knowledge` | ◆ | APPROVED — open book ready | FD-12a APPROVED |
| 5 — More (trigger) | None (not a page icon) | ••• | Not applicable — use text glyph | N/A |

**Phase B dependency:** Phase E can be implemented with current emoji glyphs in the 5-tab bar. FD-13 OPTION A requires full 20-icon delivery before Phase B begins. Phase E is NOT blocked by Phase B. The 5-tab bar uses the existing emoji glyphs for activity (`◎`) and agents (`◈`) until Phase B delivers `icon-activity` and `icon-agents`.

**When Phase B is eventually delivered:** the 5-tab icons update automatically as all nav-icon spans are replaced globally. No Phase-E-specific icon work is needed for the 2 outstanding icons — Phase B covers all 20.

**Icon container specification (interim emoji, Phase E):**
```html
<span class="nav-icon">[glyph]</span>
<span class="nav-label">[Label]</span>
```
Identical to current structure. No change to icon container.

**Icon container specification (post-Phase B SVG):**
```html
<span class="nav-icon">
  <svg aria-hidden="true"><use href="#icon-{page-name}"/></svg>
</span>
<span class="nav-label">[Label]</span>
```
Phase B handles this replacement globally. Phase E does not need to implement SVG icons.

---

## 10. DESIGN SYSTEM ALIGNMENT

### 10.1 Surface Treatment

| Property | Value | Token |
|----------|-------|-------|
| Background | `rgba(3,6,15,0.98)` | Current baseline (`--bg` = `#03060f`) |
| Border-top | `1px solid var(--border-dim)` | Current baseline |
| Backdrop filter | `blur(20px)` | Current baseline |
| -webkit-backdrop-filter | `blur(20px)` | Current baseline |

No changes from current mobile bottom nav surface treatment. These values are production-proven.

### 10.2 Active State

| Property | Value | Token |
|----------|-------|-------|
| Color | `var(--primary)` | `#00d4ff` (canonical cyan per UX-05) |
| Top indicator bar | 2px, left 22% right 22%, bottom border-radius 2px | Current `::after` pattern |
| Box shadow on indicator | `0 0 8px var(--primary-glow)` | Current baseline |
| Icon opacity | 1.0 | Up from 0.55 |
| Background | `none` (no background fill on mobile active — indicator bar only) | Mobile pattern (desktop uses background fill) |

### 10.3 Inactive State

| Property | Value |
|----------|-------|
| Color | `var(--muted)` |
| Icon opacity | 0.55 |
| Background | none |

### 10.4 Typography

| Element | Specification |
|---------|--------------|
| Label font | System sans-serif (inherits from `--font-sans`) |
| Label size | 8px (current baseline) |
| Label weight | 700 |
| Label letter-spacing | 0.13em |
| Label text-transform | uppercase |
| Icon size | 17px (current font-size) / 18px width (fixed) |

### 10.5 Spacing / Padding

| Element | Specification |
|---------|--------------|
| Button padding | `6px 2px` (current) |
| Icon-to-label gap | `3px` (current `gap: 3px` on flex column) |
| Bar padding-bottom | `env(safe-area-inset-bottom, 0px)` — PROTECTED |
| Bar total height | 49px + safe area |

### 10.6 Safe Area

`padding-bottom: env(safe-area-inset-bottom, 0px)` is already applied to `.bottom-nav` at dashboard.html line 234. This is PROTECTED. Phase E must not remove or override this declaration.

### 10.7 Elevation / Shadow

No elevation shadow on the bottom nav bar itself (current behavior). The backdrop-filter blur provides depth perception. No change required.

### 10.8 Interaction States

| State | Visual |
|-------|--------|
| Default / inactive | Muted color, 0.55 icon opacity |
| Active (current page) | Cyan color, 1.0 icon opacity, top indicator bar |
| Pressed (`:active`) | Brief opacity reduction (existing `-webkit-tap-highlight-color: transparent` prevents default; add `:active { opacity: 0.7; }` for feedback) |
| Focus | Focus ring: 2px solid `rgba(0,212,255,0.60)`, 2px offset (UX-05 §33.2) |
| Overflow open | "More" tab: `aria-expanded="true"`, optional indicator |
| More tab when overflow-page active | Secondary indicator (HUMAN DECISION REQUIRED — style to be specified) |

### 10.9 Token Usage

Phase E must use existing `--ax-*` or short-form tokens. No new `:root` declarations.

| Token Used | Value |
|-----------|-------|
| `var(--primary)` | `#00d4ff` (cyan) |
| `var(--muted)` | Current muted text color |
| `var(--border-dim)` | Current border color |
| `env(safe-area-inset-bottom, 0px)` | Device safe area |

No new tokens required. No new `:root` block.

---

## 11. RESPONSIVE SPECIFICATION TABLE

| Viewport | Width | Height | Navigation Mode | Bottom Bar | Labels | Tab Count | Sidebar |
|---------|-------|--------|----------------|-----------|--------|----------|--------|
| Mobile portrait | < 640px | any | 5-tab bottom bar | 49px + safe area | Visible (icon + label) | 5 + More | Hidden |
| Mobile landscape | < 1024px | < 500px | Compact bottom bar | 40px | Hidden (icon only) | 5 + More | Hidden |
| Tablet portrait | 640–1023px | ≥ 500px | HUMAN DECISION REQUIRED: 5-tab or sidebar | TBD | TBD | TBD | TBD |
| Tablet landscape | 1024–1279px | any | Sidebar (inherit ≥900px) | None | N/A | All 20 visible | 240px |
| Desktop | ≥ 900px / ≥ 1280px | any | Sidebar (UNCHANGED) | None | N/A | All 20 visible | 200px |
| Wide desktop | ≥ 1440px | any | Sidebar (UNCHANGED) | None | N/A | All 20 visible | 200px |

**Current production:** Single breakpoint at 900px. Below 900px = bottom bar (all 20 buttons visible). Above 900px = sidebar. Phase E adds the 640px breakpoint and 5-tab logic.

**CSS breakpoints Phase E must add:**
```css
/* Mobile portrait (<640px): 5-tab bar — current content refined */
@media (max-width: 639px) {
  /* Show only 5 tab buttons; hide the other 15 */
  /* Show #nav-more (More trigger) */
}

/* Mobile landscape (height <500px, width <1024px): compact bar */
@media (max-width: 1023px) and (max-height: 499px) {
  /* 40px height, icons only */
}

/* Tablet portrait (640–1023px) — HUMAN DECISION REQUIRED */
/* (keep existing 900px as sidebar or extend 5-tab to 899px) */
```

**Key note on 640px vs 899px boundary:** The existing `@media (max-width: 899px)` currently applies the bottom bar at 900–640px range (tablet) as well. GAP-25's 5-tab bar is specifically for < 640px. Phase E must decide whether the tablet range (640–899px) keeps the current 20-button bar or receives the 5-tab bar. This is **HUMAN DECISION REQUIRED** per the tablet row above.

**Recommended resolution:** Apply 5-tab bar to the full range below 900px (i.e., both tablet 640–899px AND mobile <640px), to avoid a three-state navigation (5-tab / 20-button / sidebar). This avoids implementing a fourth CSS media query tier. **HUMAN DECISION REQUIRED: confirm or override this recommendation.**

---

## 12. STATE MODEL

| State | Description | Visual Indication | ARIA |
|-------|-------------|-----------------|------|
| Default | No page active in bar (impossible in normal flow) | All tabs inactive | All `aria-selected="false"` |
| Active (tabbed page) | One of the 5 tab pages is the current page | Active tab: cyan, top bar indicator | Active tab `aria-selected="true"`, others `false` |
| Active (overflow page) | Current page is in the overflow set | "More" tab shows secondary indicator | "More" tab `aria-selected="true"` nominally; active page in overflow is highlighted |
| Pressed | User is tapping a tab | Brief opacity reduction (`:active`) | No ARIA change |
| Focus | Keyboard focus on a tab | 2px cyan focus ring | `:focus-visible` styling |
| Overflow open | Overflow surface is visible | "More" tab `aria-expanded="true"`; backdrop visible | `aria-expanded="true"` on More tab; overflow surface `aria-modal="true"` |
| Overflow item selected | User taps item in overflow | Brief press state; overflow animates closed | `switchPage()` called |
| Contextual / Phase D | `switchPage('agents')` — HYBRID fires | Agent cards highlighted in `#page-agents` (invisible to bottom nav) | No ARIA change on nav |
| Phase C card visible | `cx-card-zone` shows a contextual card | Card visible in content area above input zone | No nav ARIA change |

---

## 13. ACCESSIBILITY SPECIFICATION TABLE

| Requirement | Exact Behavior |
|-------------|---------------|
| ARIA role on `<nav>` | `role="tablist"` added to `<nav class="bottom-nav">` |
| ARIA role on each tab button | `role="tab"` added to each `.nav-btn` in the 5-tab set |
| ARIA selected on active tab | `aria-selected="true"` on the active tab; `aria-selected="false"` on all others. Updated by `switchPage()`. |
| ARIA role on More tab button | `role="tab"`, `aria-haspopup="true"`, `aria-expanded="false"` (updated to "true" when overflow open) |
| ARIA label on tab buttons | If label text is present and adjacent: no `aria-label` needed (label is already announced). If icon-only (landscape): `aria-label="[Page Name]"` required. |
| ARIA label on notification badges | `aria-label="N pending"` where N is badge count. Badge must have `aria-live="polite"` for dynamic updates. |
| Overflow surface ARIA | `role="dialog"` + `aria-modal="true"` + `aria-label="More pages"` (for bottom sheet Option B) OR `role="navigation"` + `aria-label="Navigation menu"` (for drawer Option A) |
| Focus management — overflow open | Focus moves to first focusable item in overflow surface |
| Focus management — overflow close | Focus returns to "More" tab button |
| Focus trap | Active within overflow surface (both keyboard Tab and Shift+Tab stay within) |
| Escape key | Closes overflow surface; focus returns to "More" tab |
| `prefers-reduced-motion` | Overflow animation replaced by opacity fade (no slide). Tab color changes are instantaneous — already compliant. `@media (prefers-reduced-motion: reduce)` rule at apex-v2.css line 1441 is PROTECTED and extended by Phase E. |
| Touch target size | All 5 tabs: `min-height: 49px`, `flex: 1` — natural width ~72px at 360px viewport. ADEQUATE. |
| Touch target spacing | Tabs are adjacent with no gap. Natural flex layout. Vertical spacing: bar is separated from content by the full content area. |
| Keyboard navigation — tabs | Tab key moves between buttons. Left/right Arrow keys within `role="tablist"` for tab switching (ARIA tab pattern). Enter/Space activates tab. |
| Keyboard navigation — overflow | Arrow keys for list/grid navigation within overflow surface. Enter/Space activates page item. Escape closes. |
| Screen reader announcement on tab change | `switchPage()` updates `#topbar-pg-title` (already implemented). No additional announcement needed if page title update is readable. |
| Skip-to-main link | PROTECTED (UX-05 §33.2). Phase E must not remove or obscure skip-to-main navigation. |
| Colour independence | Active state: cyan color + top indicator bar (shape cue). Inactive: muted color + no indicator (no shape). Badge: color + number text. Connection state: text + color. No state is communicated by color alone. |
| Zoom support | Layout must not break at 200% browser zoom. Bottom bar may reflow to taller height at 200% zoom — this is acceptable as long as content remains accessible. |

---

## 14. PHASE D INTEGRATION

Phase D (HYBRID agent grid) is CERTIFIED COMPLETE (2026-08-29). The following is the integration contract between Phase D and Phase E.

### 14.1 How HYBRID Works With Mobile 5-Tab Nav

When a user navigates to `agents` via the mobile bottom tab bar:
1. User taps tab 3 (`agents`) on the mobile bottom bar
2. Tab 3's click event calls `window.switchPage('agents')` (same event path as desktop)
3. The switchPage chain fires: original → wrappers 1–13 → wrapper 14 (Phase D HYBRID)
4. Wrapper 14: sets `_cxActivePage = 'agents'`; calls `_cxHighlightAgents('agents')` safely (try/catch)
5. agentsRefresh() is called by wrapper 13 (async) → agent cards render → post-render highlight applied

**No conflict.** Phase D is viewport-agnostic. The HYBRID mechanism operates on `#page-agents` DOM, not on the navigation DOM. The bottom tab bar triggering `switchPage()` is functionally identical to the desktop sidebar triggering `switchPage()`.

### 14.2 Page Context Injection and Mobile

`_cxActivePage` stores the active page name regardless of viewport. When the user navigates between pages on mobile, `_cxActivePage` is always up to date. Page context is available to all agent interactions at all viewports.

### 14.3 Wrapper Chain Safety

Phase E introduces NO new switchPage wrapper. Phase E modifies the existing switchPage call (via the nav button click event listener at dashboard.html line 12791). The call is `window.switchPage(name)` — identical to the current pattern. Wrapper 14 continues to execute as the outermost wrapper regardless of what triggers `switchPage()`.

Phase E must NOT modify, rename, or collapse any switchPage wrapper. Phase E is additive to the navigation presentation layer only.

### 14.4 "agents" Tab Navigation Badge

The current `#nav-agents` button has no notification badge. Phase D's HYBRID architecture does not add badges. If Phase E adds a badge to the agents tab in the 5-tab bar, it must not conflict with the Phase D `data-slug`, `data-pages`, or `cx-agent--relevant` class mechanisms.

---

## 15. PHASE C INTEGRATION

Phase C (contextual presentation) is CERTIFIED COMPLETE (2026-08-29).

### 15.1 DOM Zone Separation

Phase C added:
- `<div id="cx-top-chrome">` (line 8723) — positioned in the topbar zone
- `<div id="cx-card-zone">` (line 8728) — positioned in the content area

Neither zone conflicts with the bottom navigation bar. The bottom nav is `position: fixed; bottom: 0` (via flex layout). cx-top-chrome is in the header. cx-card-zone is in the content area between header and bottom bar.

**Phase E constraint:** Do not insert any Phase E DOM elements above `cx-top-chrome` (in the header zone). The mobile overflow surface (drawer or bottom sheet) must not obscure `cx-top-chrome` when closed.

### 15.2 L3/L4 Bottom Sheets

Phase C progressive disclosure uses bottom sheets for L3 (60% height) and L4 (95% height). Phase E's overflow surface is also a bottom sheet (if Option B is chosen). These must NOT conflict.

**Design requirement:** The overflow "More" sheet and the Phase C L3/L4 disclosure sheets are separate DOM elements with separate z-index values. The overflow sheet must have a z-index that does not conflict with L3/L4 sheets.

**Recommended z-index hierarchy:**
- Bottom nav bar: z-index as current
- Overflow sheet overlay: z-index 5000 (below `--apex-z-mobile-nav: 2000` — WAIT, mobile nav z-index is 2000; overflow should be ABOVE the nav bar, so ABOVE 2000)
- Corrected: Overflow sheet: z-index 3000 (above nav bar 2000, below critical modals)
- Phase C L3 bottom sheet: z-index 3500 (above overflow)
- Phase C L4 full-height sheet: z-index 4000 (above L3)
- Voice overlay: z-index 4500 (above L4)
- Approval blocking modal: z-index 5000 (topmost)

**HUMAN DECISION REQUIRED: Confirm or override z-index hierarchy above.**

### 15.3 Contextual Cards and Mobile

`cx-card-zone` renders contextual cards (L2/L3 attention items) in the content area. On mobile portrait, these cards are full-width (UX-18 §12.2). The bottom tab bar is fixed at the bottom. The content area scrolls between the header and the bottom bar. Contextual cards appear within the scrollable content area — no conflict with the tab bar.

---

## 16. LEGACY CONVERGENCE

### 16.1 Canonical vs Legacy Mobile Surfaces

| Surface | Classification | Phase E Action |
|---------|---------------|---------------|
| `<nav class="bottom-nav">` (all 20 buttons) | Canonical — Phase E modifies | MODIFY: show only 5 tabs at <640px; hide others; show `#nav-more` |
| `#mobileNavToggle` (hamburger) | Legacy | RETIRE: hide at all viewports in Phase E (replaced by 5-tab + overflow) |
| `#mobileNavDropdown` (hamburger dropdown) | Legacy | RETIRE: hide at all viewports; functionality replaced by overflow surface |
| `._mnav-btn` buttons | Legacy | RETIRE: rendered inert when `#mobileNavDropdown` is hidden |
| `#moreSheet` / `#moreSheetOverlay` | Pre-existing overflow infrastructure | REPURPOSE (Option B) or leave in place and create new drawer (Option A) |

**Phase E retirement scope:** Phase E DOES retire `#mobileNavToggle` and `#mobileNavDropdown` as NAVIGATION MECHANISMS. This is NOT a legacy page retirement (Phase E separate task). These are navigation surface retirements: the DOM elements remain in the file but are hidden and superseded. Full DOM removal is Phase F scope.

**Per-page legacy retirement requires explicit per-page authorization. Phase E GAP-25 implementation does NOT retire any page from `pages[]`.**

### 16.2 What the Dashboard.html mobileNavToggle Wrapper Does

Wrapper 10 (line 20871) in the switchPage chain updates `#mobilePageName`, resets scroll, and updates `._mnav-btn.active` class. When `#mobileNavToggle` and `#mobileNavDropdown` are retired, the `._mnav-btn.active` update becomes inert (no visible buttons to update) but does not throw. Wrapper 10 remains intact through Phase E.

---

## 17. IMPLEMENTATION BOUNDARY

Phase E is authorized to modify the following files for GAP-25 implementation:

| File | Action | Constraint |
|------|--------|------------|
| `public/dashboard.html` | MODIFY — CSS for 640px breakpoint; show/hide 5 tabs vs overflow; `#nav-more` activation; overflow surface HTML (if new DOM needed) | No new `:root` declarations; no switchPage chain collapse; no page DOM removal |
| `public/apex-v2.css` | MODIFY — Add/update `@media (max-width: 639px)` and `@media (...landscape)` rules | No new `:root` block; use existing tokens |
| `tests/phase-e-p1.test.js` | CREATE — New Phase E test suite | Required per Masterplan §13.3 |
| `docs/interface/PHASE-E-CERTIFICATION.md` | CREATE — After implementation | Required per Masterplan §13.3 |

Phase E for GAP-25 MUST NOT modify:

| File | Reason |
|------|--------|
| `server.js` | Not in Phase E scope |
| `lib/context/*.js` | Phase C deliverables — untouched |
| `lib/attention/*.js` | Phase C deliverables — untouched |
| `lib/presentation/*.js` | Phase C deliverables — untouched |
| `public/js/components/contextual-card.js` | Phase C deliverable — untouched |
| `routes/context.js` | Phase C deliverable — untouched |
| `public/apex-custom.css` | Currently 2 comment lines only — untouched |
| `src/routes/ui.js` | No new static file requires registration for GAP-25 |
| Any route file | No backend changes required for mobile nav |
| `pages[]` array | No pages added or removed |
| `pageMeta` object | No changes |
| `switchPage()` or any wrapper | No modifications; new wrapper 15 is NOT authorized as part of GAP-25 |

---

## 18. TEST REQUIREMENTS

Phase E must produce a test suite (`tests/phase-e-p1.test.js`) covering:

| Test ID | Description |
|---------|-------------|
| T-E-01 | dashboard.html contains exactly 5 `.nav-btn` visible in mobile view at <640px (or CSS hides all but 5 at that breakpoint) |
| T-E-02 | `#nav-more` is present in dashboard.html and NOT hidden at mobile viewports (i.e., the permanent `display:none` override is removed for <640px) |
| T-E-03 | The correct 5 pages appear as visible tabs (command, activity, agents, and the chosen 4th tab) |
| T-E-04 | Each of the 5 tab buttons has `role="tab"` attribute |
| T-E-05 | The `<nav class="bottom-nav">` has `role="tablist"` attribute |
| T-E-06 | Active tab has `aria-selected="true"`; all others have `aria-selected="false"` |
| T-E-07 | `env(safe-area-inset-bottom, 0px)` is still present on `.bottom-nav` |
| T-E-08 | `@media (max-width: 639px)` breakpoint exists in dashboard.html or apex-v2.css |
| T-E-09 | `#mobileNavToggle` is hidden (display:none) at all viewports after Phase E |
| T-E-10 | `#mobileNavDropdown` is hidden (display:none) at all viewports after Phase E |
| T-E-11 | Overflow surface element exists in DOM with `aria-label="More pages"` or equivalent |
| T-E-12 | All 15 overflow pages are present as navigable items in the overflow surface |
| T-E-13 | `switchPage()` chain is intact (wrapper count not reduced — Phase D wrapper 14 still present) |
| T-E-14 | No new `:root` declarations added by Phase E |
| T-E-15 | All RX-02 through RX-07, Phase C, and Phase D regression suites pass post-Phase E |
| T-E-16 | `pages[]` array length is still 20 (no pages removed) |
| T-E-17 | `cx-top-chrome` and `cx-card-zone` still present (Phase C DOM intact) |
| T-E-18 | `_cxPageAgentMap` and `_cxHighlightAgents` still present in dashboard.html (Phase D artifacts intact) |

---

## 19. DEPENDENCIES

| Dependency | Status | Impact |
|-----------|--------|--------|
| Phase C certified | SATISFIED (2026-08-29) | Phase E eligible |
| Phase D certified | SATISFIED (2026-08-29) | Phase E eligible |
| GAP-25 design specification | SATISFIED by this document | Phase E eligible (pending human decisions) |
| "Phase E Implementation Authorized" directive | NOT YET ISSUED | Phase E BLOCKED until issued |
| GAP-29 Phase B (SVG icons) | BLOCKED (15 assets outstanding) | Phase E does NOT depend on Phase B. Emoji icons used as interim. Phase B delivers icons separately. |
| GAP-31 HYBRID architecture | SATISFIED (FD-04, Phase D complete) | No further dependency |
| Phase D — switchPage chain | SATISFIED — 15 wrappers (original + 14). Phase E must not modify. | Phase E must not add or remove wrappers |
| Human decisions (Section 20) | UNRESOLVED | Phase E authorization should include resolutions |
| Phase E per-page legacy retirement authorization | NOT YET ISSUED (separate from GAP-25) | GAP-25 implementation and legacy retirement are decoupled |
| Phase F CSS consolidation | NOT Phase E dependency | Phase F is after Phase E |
| Phase B SVG icons | NOT Phase E dependency | Independent |

---

## 20. OPEN QUESTIONS

### Category A: Authority-Resolved — No Decision Required

| Question | Resolution | Authority |
|----------|-----------|-----------|
| Is GAP-25 Phase D or Phase E? | Phase E | PHASE-D-PRE-IMPLEMENTATION-RECONNAISSANCE §2.2; IMPLEMENTATION-AUTHORISATIONS §9 |
| Does Phase E collapse the switchPage chain? | NO | Conflict 2 resolution; PHASE-D-CERTIFICATION §12 ONE-APEX integrity |
| Is `env(safe-area-inset-bottom)` required? | YES — PROTECTED | UX-05 §32.6 |
| Does Phase E retire legacy pages? | Only navigation mechanisms; no page DOM removal | MASTERPLAN §5 Phase E |
| Can Phase E add new `:root` declarations? | NO | IMPLEMENTATION-AUTHORISATIONS §10; PHASE-D-CERTIFICATION §10.3 |
| Must Phase C DOM be preserved? | YES | PHASE-C-CERTIFICATION; IMPLEMENTATION-AUTHORISATIONS |
| Is `command` tab 1? | YES | UX-05 §32 "Command — orb centred, always available from tab bar"; UX-18 §8.1 |
| Is `activity` in the 5-tab set? | YES | UX-18 §8.1 "Activity/Feed" named; notification badge |
| Is `agents` in the 5-tab set? | YES | UX-18 §8.1 "Agents" named; Phase D primary surface |

### Category B: Evidence-Resolved — No Decision Required

| Question | Resolution | Evidence |
|----------|-----------|----------|
| Where is `#nav-more` in the DOM? | dashboard.html line 12739 | Repository audit |
| What does `#mobileNavToggle` do? | Opens `#mobileNavDropdown` dropdown overlay | Lines 8739, 20906–20907 |
| Does `#moreSheet` infrastructure exist? | YES — lines 20814–20870 | Repository audit |
| What is the current 640px CSS state? | NO CSS at 640px breakpoint — only 900px exists | apex-v2.css audit |
| Are badge elements present on nav buttons? | YES — 5 badges on operation, system, communication, activity, approvals | Lines 12665, 12670, 12679, 12712, 12721 |
| Is safe-area-inset applied? | YES — dashboard.html line 234 | Repository audit |
| What is the active indicator on mobile currently? | `::after` pseudo-element, 2px height, top of button, left 22% to right 22% | dashboard.html lines 257–267 |

### Category C: Human Decisions Required

| # | Question | Options | Impact |
|---|----------|---------|--------|
| HD-01 | Tab 4 slot: `approvals` or `knowledge`? | (A) approvals — governance-critical, badge; (B) knowledge — named in UX-05 §32.3 | Determines complete 5-tab set |
| HD-02 | Overflow surface type: drawer or bottom sheet? | (A) drawer — 280px left, slide in; (B) bottom sheet — repurposes `#moreSheet` | Determines Phase E DOM changes and z-index |
| HD-03 | Tablet range (640–899px) navigation: 5-tab or sidebar? | (A) 5-tab for full <900px range; (B) 5-tab only for <640px, sidebar for 640–899px | Determines number of additional CSS breakpoints |
| HD-04 | "More" tab active-when-overflow-page indicator style | (A) amber dot; (B) muted/dim active color (not full cyan); (C) same cyan as regular active | Determines CSS for overflow-active state |
| HD-05 | Overflow page grouping | (A) flat list; (B) grouped by category (Domain/Operational/Intelligence) | Determines overflow surface information architecture |
| HD-06 | z-index hierarchy confirmation | See Section 15.2 recommended hierarchy | Determines CSS stacking context |
| HD-07 | Label typography: maintain current 8px/700/uppercase or update? | (A) maintain current; (B) update per new spec | Minor visual change |

### Category D: Design Spec Required

None beyond what is contained in this document. This specification IS the design document that was missing (FD-08 = PRODUCE SPEC).

---

## 21. READINESS VERDICT

**DESIGN COMPLETE — HUMAN DECISIONS REQUIRED**

This specification is complete for all authority-resolved and evidence-resolved requirements. Seven human decisions (HD-01 through HD-07) remain unresolved. The most critical are:

- **HD-01** (tab 4 selection) — blocks exact tab set
- **HD-02** (overflow surface type) — blocks Phase E DOM approach
- **HD-03** (tablet range) — blocks breakpoint implementation

All seven decisions can be resolved in a single product/design session. Once resolved, the specification is implementation-ready.

Phase E is NOT authorized for implementation by this specification alone. A separate "Phase E Implementation Authorized" directive is required per MASTERPLAN §13.2 and IMPLEMENTATION-AUTHORISATIONS §9.

---

## 22. EXACT AUTHORIZATION REQUIRED

The following is the minimum text required to authorize Phase E implementation. Italic brackets indicate items that must be filled in by the product owner before this text is valid.

---

**PHASE E IMPLEMENTATION AUTHORIZED — 2026-08-[DATE]**

**Authority:** GAP-25-MOBILE-NAVIGATION-DESIGN-SPECIFICATION.md (2026-08-29), PHASE-D-CERTIFICATION.md (2026-08-29), IMPLEMENTATION-AUTHORISATIONS §9.

**Phase E implements the 5-tab persistent mobile bottom navigation bar as defined by GAP-25-MOBILE-NAVIGATION-DESIGN-SPECIFICATION.md.**

**Resolved human decisions (required before this authorization is valid):**

- HD-01 Tab 4: *[CHOOSE: approvals / knowledge]*
- HD-02 Overflow surface: *[CHOOSE: drawer (Option A) / bottom sheet (Option B)]*
- HD-03 Tablet range (640–899px): *[CHOOSE: 5-tab extends to full <900px / 5-tab only for <640px]*
- HD-04 More-tab overflow indicator: *[CHOOSE: amber dot / muted active / full cyan]*
- HD-05 Overflow grouping: *[CHOOSE: flat list / grouped by category]*
- HD-06 z-index hierarchy: *[CONFIRM or OVERRIDE Section 15.2 recommendation]*
- HD-07 Label typography: *[CHOOSE: maintain current 8px/700/uppercase / update to new spec]*

**Authorized files:**
- `public/dashboard.html` — MODIFY (CSS breakpoints, show/hide 5 tabs, activate `#nav-more`, overflow surface if new DOM required)
- `public/apex-v2.css` — MODIFY (add `@media (max-width: 639px)` and landscape breakpoint rules, no new `:root`)
- `tests/phase-e-p1.test.js` — CREATE
- `docs/interface/PHASE-E-CERTIFICATION.md` — CREATE after implementation

**Explicitly NOT authorized:**
- Collapsing the switchPage chain (15 implementations → 1)
- Retiring any page from `pages[]`
- Adding new `:root` declarations
- Modifying Phase C files (`lib/context/`, `lib/presentation/`, `lib/attention/`, `public/js/components/contextual-card.js`, `routes/context.js`)
- Modifying Phase D files (agent highlight logic in dashboard.html — only the nav CSS/HTML may be modified)
- CSS block consolidation (Phase F)
- apex-v2.css deletion or modification beyond nav-related responsive rules
- Token namespace bridge declarations
- Any backend route changes
- Any file not named above

**Hard stop:** Phase E ends when `PHASE-E-CERTIFICATION.md` is produced and all regression suites pass (RX-02 through RX-07, Phase C, Phase D, Phase E new suite).

---

*END OF GAP-25 MOBILE NAVIGATION DESIGN SPECIFICATION*
