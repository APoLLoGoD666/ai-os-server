# GAP-25 MOBILE NAVIGATION DESIGN DECISION RECORD

**Document ID:** GAP-25-MOBILE-NAVIGATION-DESIGN-DECISION-RECORD  
**Status:** OPEN — 7 human decisions required before Phase E authorization is valid  
**Date:** 2026-08-29  
**Version:** 1.0  
**Parent specification:** `docs/interface/GAP-25-MOBILE-NAVIGATION-DESIGN-SPECIFICATION.md`  
**Produced by:** Claude Code — Read-only reconnaissance and design specification agent  

---

## PURPOSE

This document isolates the 7 human decisions (HD-01 through HD-07) identified in GAP-25-MOBILE-NAVIGATION-DESIGN-SPECIFICATION §20 Category C. Each decision is presented as a concise ballot item — the minimum information needed for the product owner or designer to make a choice. Resolution of all 7 decisions is required before the Phase E Implementation Authorization text in Specification §22 can be completed.

---

## HD-01: TAB 4 SLOT SELECTION

**Subject:** The 4th permanent tab in the mobile bottom bar (positions 1, 2, 3 are resolved as `command`, `activity`, `agents`; position 5 is the "More" overflow trigger).

**Context:** UX-05 §32.3 names "Knowledge" as a 5th canonical tab. UX-18 §8.1 does not name Knowledge but names Activity, Agents, and More. `approvals` has a notification badge (amber) signalling governance-critical time-sensitive actions. `knowledge` does not have a badge. The design specification recommends `approvals` (Section 6.5).

**Options:**

| Option | Page | Label | Icon | Badge | Authority Reference |
|--------|------|-------|------|-------|---------------------|
| **A** (recommended) | `approvals` | Approvals | icon-approvals (Decisions Stack — FD-07 approved) | amber `navApprovalsBadge` | UX-05 "Decisions" conceptual; governance-critical |
| **B** | `knowledge` | Knowledge | icon-knowledge (open book — FD-12a approved) | None | UX-05 §32.3 explicitly names Knowledge |

**Consequences:**
- If Option A: `knowledge` goes into overflow (position 7 in overflow list)
- If Option B: `approvals` goes into overflow (position 4 in overflow list, still accessible but no persistent badge visible on tab bar)

**DECISION:** _______ (A or B)  
**Date:** _______  
**Authorized by:** _______

---

## HD-02: OVERFLOW SURFACE TYPE

**Subject:** What the "More" tab opens — drawer sliding from left or bottom sheet sliding from below.

**Context:** `#moreSheet` (bottom sheet infrastructure) already exists at dashboard.html lines 20814–20870 with `role="dialog"` and `aria-label="More pages"`. UX-18 §8.1 describes a "Hamburger Drawer" as the primary overflow pattern. The design specification recommends Option B (bottom sheet) due to lower implementation risk.

**Options:**

| Option | Pattern | DOM | Dismissal | ARIA | Spec Ref |
|--------|---------|-----|----------|------|---------|
| **A** | Full-height drawer (280px, slides from left) | New DOM structure required | tap backdrop, swipe left, Escape | `role="navigation"`, `aria-label="Navigation menu"` | UX-18 §8.1 |
| **B** (recommended) | Bottom sheet (70–85% height, slides from below) | Repurposes existing `#moreSheet` DOM | swipe down, close button, tap outside, Escape | `role="dialog"`, `aria-modal="true"`, `aria-label="More pages"` | `#moreSheet` infrastructure |

**Consequences:**
- Option A: Phase E creates new drawer DOM element; higher implementation scope
- Option B: Phase E wires existing `#moreSheet` to new "More" tab trigger; lower scope

**DECISION:** _______ (A or B)  
**Date:** _______  
**Authorized by:** _______

---

## HD-03: TABLET RANGE NAVIGATION (640–899px)

**Subject:** Whether the 5-tab bottom bar applies only at strict mobile portrait (<640px) or extends to the full current sub-900px range.

**Context:** The current single breakpoint is 900px — everything below 900px gets the bottom bar (currently showing all 20 buttons). The GAP-25 specification introduces a 640px breakpoint for the 5-tab pattern. This leaves the 640–899px "tablet portrait" range with an undefined navigation pattern.

**Options:**

| Option | Mobile (<640px) | Tablet portrait (640–899px) | Tablet landscape (≥900px or ≥1024px) | Breakpoints added |
|--------|----------------|---------------------------|------------------------------------|------------------|
| **A** (recommended) | 5-tab bar | 5-tab bar (same pattern) | Sidebar | 1 breakpoint — only landscape qualifier added |
| **B** | 5-tab bar | Current 20-button bar (unchanged) | Sidebar | 2 breakpoints — both 640px and distinct 640–899px rules |

**Consequences:**
- Option A: Cleaner UX; one visual pattern for all non-desktop viewports; simpler CSS implementation; recommended by this spec
- Option B: Preserves existing 640–899px behavior; avoids change to tablet navigation; requires more CSS work to implement the split

**DECISION:** _______ (A or B)  
**Date:** _______  
**Authorized by:** _______

---

## HD-04: "MORE" TAB INDICATOR WHEN ACTIVE PAGE IS IN OVERFLOW

**Subject:** When the user is on a page that is in the overflow set (not one of the 5 persistent tabs), the "More" tab should provide some indication that it is the "active" bucket. What visual treatment to use.

**Context:** The active tab normally shows cyan color + top indicator bar. If the active page is, say, `finance` (which is in overflow), the user should see some signal that their current location is within "More".

**Options:**

| Option | Treatment | Distinguishability |
|--------|-----------|-------------------|
| A | Amber dot or small badge on "More" tab | Clearly distinct from normal tab active (cyan) |
| **B** (recommended) | Muted/dim cyan (opacity ~50%) on "More" tab | Signals "sort of active" without being full-active |
| C | Full cyan (same as regular active tab) | Simple implementation; may confuse user about current page identity |

**Consequences:**
- Option A: Requires a new badge element on the "More" button; clearly distinct
- Option B: Simple CSS opacity change; recommended
- Option C: Simplest; risk of confusing "More" as a page destination

**DECISION:** _______ (A, B, or C)  
**Date:** _______  
**Authorized by:** _______

---

## HD-05: OVERFLOW PAGE GROUPING

**Subject:** Whether the 15 (or 16) pages in the overflow surface are displayed as a flat list/grid or organized into labelled groups.

**Context:** The 15 overflow pages span very different domains: system/ops pages (overview, operation, system), domain pages (finance, communication, business, health, university, occult), intelligence/epistemic pages (research, civilisation, reality, intelligence), and management pages (memory, governance). No authority document specifies grouping within the overflow surface.

**Options:**

| Option | Layout | Groups |
|--------|--------|--------|
| A (recommended) | Flat 2-column grid | No headers; alphabetical or frequency order |
| B | Grouped by category with section headers | E.g., "Domain", "Intelligence", "Governance" |
| C | Single-column list | Simple; label-heavy |

**Recommended option A:** Flat 2-column grid is fastest to scan, requires no grouping taxonomy decision, and is easier to implement.

**If Option B is chosen, group taxonomy must also be specified.** Proposed grouping:
- OPERATIONAL: overview, operation, system
- DOMAIN: finance, communication, business, health, university, occult
- INTELLIGENCE: research, civilisation, reality, intelligence
- MANAGEMENT: memory, governance

**DECISION:** _______ (A, B, or C; if B specify group taxonomy)  
**Date:** _______  
**Authorized by:** _______

---

## HD-06: Z-INDEX HIERARCHY CONFIRMATION

**Subject:** The z-index stacking order for mobile overlay surfaces to prevent conflicts between the "More" overflow surface and Phase C contextual bottom sheets.

**Context:** Phase C L3 bottom sheets and L4 full-height sheets are existing features. Phase E adds an overflow surface (bottom sheet or drawer). These must not overlap or obscure each other incorrectly. The design specification recommends a specific hierarchy (Section 15.2).

**Recommended hierarchy from GAP-25-MOBILE-NAVIGATION-DESIGN-SPECIFICATION §15.2:**

| Layer | z-index |
|-------|---------|
| Bottom nav bar | Existing value (not changed) |
| More overflow surface | 3000 |
| Phase C L3 bottom sheet | 3500 |
| Phase C L4 full-height sheet | 4000 |
| Voice overlay | 4500 |
| Approval blocking modal | 5000 |

**Options:**
- **CONFIRM:** Accept the recommended hierarchy
- **OVERRIDE:** Specify alternative values

**Behavioral guarantee:** The overflow surface should NOT appear above L3/L4 Phase C sheets. If the user has a Phase C L3 sheet open and taps "More," the More sheet should appear below the L3 sheet (L3 stays visible/dominant). The user must dismiss the L3 sheet before accessing the overflow. This is the intended UX behavior enforced by the z-index hierarchy above.

**DECISION:** _______ (CONFIRM recommended / OVERRIDE with values: _______)  
**Date:** _______  
**Authorized by:** _______

---

## HD-07: LABEL TYPOGRAPHY

**Subject:** Whether the tab label typography should maintain the current production baseline or be updated to a slightly refined specification.

**Context:** Current baseline (dashboard.html lines 275–278):
- `font-size: 8px`
- `font-weight: 700`
- `letter-spacing: 0.13em`
- `text-transform: uppercase`

This is a very small font size. At 8px, legibility may be marginal on some devices. UX-18 §9.1 lists `font-size: 11px` for labels at 900px+. No UX-18 spec explicitly gives a mobile label font size.

**Options:**

| Option | font-size | font-weight | letter-spacing | text-transform |
|--------|-----------|------------|---------------|----------------|
| **A** (maintain current) | 8px | 700 | 0.13em | uppercase |
| B (slightly larger) | 9px | 600 | 0.08em | uppercase |
| C (match existing ≥640px) | 11px | 400 | 0.01em | none |

Option A: Maintains existing proven production values. Consistent with current UI. Smaller but established.  
Option B: Marginal legibility improvement; modest change.  
Option C: Matches the desktop label style from apex-v2.css line 6580 — may be too large for a 49px bar with 5 tabs.

**DECISION:** _______ (A, B, or C)  
**Date:** _______  
**Authorized by:** _______

---

## DECISION SUMMARY BALLOT

Complete this table and return it to authorize Phase E:

| # | Decision | Choice |
|---|----------|--------|
| HD-01 | Tab 4: approvals (A) or knowledge (B)? | |
| HD-02 | Overflow surface: drawer (A) or bottom sheet (B)? | |
| HD-03 | Tablet 640–899px: 5-tab (A) or current bar (B)? | |
| HD-04 | More-tab overflow indicator: amber dot (A), muted cyan (B), full cyan (C)? | |
| HD-05 | Overflow grouping: flat grid (A), grouped (B), list (C)? | |
| HD-06 | Z-index: confirm recommended (CONFIRM) or override? | |
| HD-07 | Label typography: maintain 8px (A), 9px (B), 11px (C)? | |

Once all 7 decisions are made, the Phase E Authorization text in GAP-25-MOBILE-NAVIGATION-DESIGN-SPECIFICATION §22 may be completed and issued.

---

*GAP-25 DESIGN DECISION RECORD — AWAITING HUMAN DECISIONS HD-01 THROUGH HD-07*
