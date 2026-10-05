# POST-PHASE-G VISUAL PRODUCT READINESS ASSESSMENT

**Date:** 2026-08-29
**Status:** ASSESSMENT COMPLETE — Hard Stop. No production files modified.
**Authority:** APEX — POST-G FIXED-STATE VISUAL PRODUCT ASSESSMENT brief
**Scope:** Read-only. Browser-verified at 6 breakpoints via Playwright runtime inspection + computed geometry.

---

## Current-State Verdict

**The Phase G layout regression is resolved.** The global shell renders correctly at all desktop breakpoints (≥900px). The CSS grid named-area mismatch (`"sidebar body"` → `"sidenav content"`) has been corrected and browser-verified: computed geometry confirms sidebar at x=0 and content at x=280 at 1660px.

**The product is NOT beta-ready.** Three independent failure modes block release:
1. **P0 — Mobile (390px):** All content is invisible. The app renders as a blank black screen with a 52px input stub at the bottom.
2. **P1 — Tablet portrait (640px):** A 200px dead zone occupies the left side of every view due to a conflict between Phase E's `position:fixed` on `.bottom-nav` and B8's tablet grid rule. Content is compressed to 440px of 640px viewport width.
3. **P1 — Nav overflow at 640–900px:** 21 nav items in a 720px sidebar height container clips ~3 items. On mobile, 12+ items are unreachable.

Desktop (1280–1660px) is shippable for internal testing. Everything below 1280px requires remediation before any external user sees it.

---

## Browser-Verified Geometry Matrix

All measurements are computed values from `getBoundingClientRect()` via Playwright at each viewport width.

| Breakpoint | Column grid | Sidebar w | Sidebar pos | Content x | Content w | cmd-stage h | cmd-feed layout |
|-----------|-------------|-----------|-------------|-----------|-----------|-------------|-----------------|
| 1660px | 280px + 1380px | 280px | static ✓ | 280px | 1380px | 456px | two-column ✓ |
| 1280px | 260px + 1020px | 260px | static ✓ | 260px | 1020px | 456px | two-column ✓ |
| 1024px | 200px + 824px | 200px | static ✓ | 200px | 824px | 320px (G-04 cap) | stacked — feed: y=439, h=59 |
| 900px | 200px + 700px | 200px | static ✓ | 200px | 700px | 320px (G-04 cap) | stacked — feed: y=394, h=91 |
| 640px | 200px + 440px | — | **FIXED** ✗ | 200px | 440px | — | — |
| 390px | none (display:block) | — | FIXED ✗ | — | full | 0px | — |

---

## P0 Findings (Ship-Blocker — Content Invisible)

### P0-01 — Mobile 390px: App renders as blank screen

**Where:** Any viewport < 900px without the Phase E bottom-nav  
**Computed state:**
- `.app` has no CSS grid assignment below 900px; renders as `display:block`
- `.page-and-input` height: **52px** — the input stub only; zero content visible
- `cmd-stage` height: **0px**
- The chat history, command centre, and all panels occupy 0px of vertical space
- ~695px of the viewport is empty black space

**Root cause:** `.page-and-input` relies on being a grid child to receive `height: 1fr`. When `.app` collapses to `display:block`, `.page-and-input` has no height constraint and shrinks to content height (input field only). No `height: 100%` or `min-height` fallback exists on `.page-and-input` or `.app` for non-grid rendering.

**User impact:** Complete content loss on any phone. App is unusable.

---

## P1 Findings (Beta-Blocker — Severe UX Failure)

### P1-01 — Tablet portrait 640px: 200px left dead zone

**Where:** `@media (min-width:640px) and (max-width:899px)` (B8 tablet rule)  
**Conflict:** B8 creates a two-column grid with `.bottom-nav` in `grid-area: sidenav`. Phase E's `@media (max-width:899px)` sets `.bottom-nav { position: fixed !important }`, removing it from grid flow. The 200px sidenav column becomes an empty dead zone.

**Computed state:**
- `.app` grid-template-columns: `200px 440px`
- `.bottom-nav` position: `fixed` (Phase E wins) — not in grid flow
- Left 200px column: empty. Visually: black void.
- Content: 440px of 640px viewport (69%)

**User impact:** 31% of viewport is dead space at tablet portrait width. Nav is a fixed bottom bar; sidebar column ghost persists.

### P1-02 — Nav overflow at 640–900px sidebar mode

**Where:** 640–899px breakpoint (grid two-column), and 900–1024px desktop mode  
**State:** 21 nav items × 38px each = 798px required. At 900–1024px sidebar height ≈ 720px. Bottom ~3 items are clipped below visible area with no scroll affordance on the sidebar.

**User impact:** Navigation items not reachable without resize. No visual indicator that items exist below the fold.

### P1-03 — Mobile nav: 12+ items unreachable

**Where:** < 900px (mobile bottom bar)  
**State:** Horizontal tab bar shows approximately 9 items. 21 total items means 12+ have no accessible UI target on mobile.

**User impact:** Core product sections (Finance, Business, Uni, File, etc.) are unreachable on any phone screen.

---

## P2 Findings (Quality Issues — Degrade UX)

### P2-01 — cmd-split collapses to vertical stack at 900–1024px

**Where:** 900px and 1024px  
**State:** The cmd-split layout (`display:flex; flex-direction:row`) places `cmd-main-col` (orb + input) and `cmd-feed-col` (280px fixed width) side by side. At 1024px content width = 824px, at 900px = 700px. When `cmd-feed-col` (280px) + `cmd-main-col` minimum width exceed the container, the column wraps to vertical stack.

**Computed positions:**
- 1024px: cmd-feed-col at y=439, height=59px — effectively hidden below fold
- 900px: cmd-feed-col at y=394, height=91px — marginally visible but not functional

G-04 correctly caps `cmd-stage` at 320px at these breakpoints, preventing the stage from overflowing. However, the feed column collapse renders the live-feed panel invisible without a deliberate scroll.

**User impact:** At 900–1024px the app appears to have no live-feed panel. Two-column command centre layout is unavailable to users on 13" laptops at default browser zoom.

### P2-02 — `overflow:visible` on `.bottom-nav` at desktop

**Where:** B5 canonical line 3781: `.bottom-nav { overflow: visible !important }`  
**State:** Desktop sidebar at 280px may visually bleed nav content past its column boundary depending on child element widths. This was identified in the POST-PHASE-G-BROWSER-LAYOUT-RECONCILIATION.md as a pre-existing condition now exposed by the grid fix. Was not measurably impacting computed geometry at the tested breakpoints, but is a latent source of visual artifact on scroll or hover.

### P2-03 — B5 redundant second block

**Where:** B5 lines 4210–4218  
**State:** The block that contained the `"sidebar body"` regression has been corrected but remains structurally redundant. It sets identical values to the B5 canonical block (lines 3769–3788) after the fix. Adds cascade complexity with no functional benefit.

---

## P3 Findings (Hygiene — No UX Impact)

### P3-01 — B2 legacy `"sidebar body"` grid-area declaration

**Where:** B2 line 1455 (`@media (min-width:900px)`)  
**State:** Sets `"topbar topbar" "ticker ticker" "sidebar body"` with `!important`. Overridden by B3, B5, and B8 at all tested breakpoints. Zero functional effect, but the presence of a four-row template (including `ticker`) while the CSSOM renders a two-row template adds confusion to any future cascade audit.

### P3-02 — B2 `grid-area: sidebar` on `.bottom-nav`

**Where:** B2 line 1464  
**State:** Assigns `.bottom-nav` to `grid-area: sidebar`, overridden by B3's `!important` `grid-area: sidenav`. Legacy value, never active. Same hygiene concern as P3-01.

### P3-03 — CSS variable duplication: `--sidebar-w` vs `--v12-nav`

**Where:** `--sidebar-w: 200px` (B2 `:root` + B5 `:root`); `--v12-nav: 178px` (B3 `:root`)  
**State:** Two variables represent sidebar width with different values. B3 uses `--v12-nav` (178px). B5 uses `--sidebar-w` (200px). B8 ≥1440px hardcodes 280px. Three sources, three values. Cascade resolution produces the correct result (B8 hardcode wins at wide desktop) but variable semantics are misleading.

---

## Data / Loading State Audit

| Element | Value observed | Expected at boot | Verdict |
|---------|---------------|-----------------|---------|
| Clock | Current time ✓ | Dynamic | ✓ |
| Date | 2026-08-29 ✓ | Dynamic | ✓ |
| Portfolio balance | `£—` | Requires Supabase | Expected |
| P&L stats | `—` / `—` | Requires Supabase | Expected |
| Agent status | `Checking…` | Requires server poll | Expected |
| Chat history | Empty | Requires auth session | Expected |
| Notifications | Empty | Requires auth session | Expected |
| Nav item counts/badges | Suppressed (G-02) | Badge-suppressed ✓ | ✓ |

All backend-dependent values show placeholder state. This is correct behaviour for a Playwright session that authenticates via JWT but does not carry a full user data session. In the live browser with established session, these will populate from Supabase. No anomalous "stuck" states detected.

---

## Separation of Concerns Audit

### A — CSS Architecture

Five inline `<style>` blocks in a single HTML file is a technical debt item, not an acute risk. The cascade conflicts documented in this phase (B2 legacy names, B3/B5 duplication, B5 second block) are consequences of incremental patching across phases without consolidation. Each new phase appended CSS rather than modifying canonical blocks. This is sustainable for internal tooling at current scale; it becomes a maintenance hazard at Phase H+ if the pattern continues.

**Verdict:** Manageable now. Plan consolidation at Phase H.

### B — Mobile / Desktop Split

The mobile rendering failure (P0-01) is a structural gap: no mobile layout contract exists below 900px. Phase E established a mobile nav pattern (`position:fixed` bottom bar) but did not establish a height/layout contract for the content above it. B8 only adds grid rules down to 640px; below that, `display:block` with no height enforcement produces the 52px collapse.

**Verdict:** Mobile is architecturally absent, not just visually rough. Requires dedicated mobile layout work.

### C — Nav Architecture

21 items in a single flat nav structure with no grouping, overflow handling, or secondary navigation pattern is a scaling ceiling. The problem is already manifesting (P1-02, P1-03). This is a IA/nav design decision, not just a CSS overflow fix.

**Verdict:** Nav architecture needs a design decision before implementation. Adding `overflow-y: auto` to the sidebar will suppress items without a visual affordance. A proper solution (grouped nav, collapsible sections, or secondary drawer) requires product-level scoping.

### D — Component/Layout Coupling

The `cmd-split` two-column layout is hardcoded with a 280px fixed feed column and no responsive breakpoint rule. The collapse at 900–1024px (P2-01) is a direct consequence. The component does not know the width of its container; it uses absolute dimensions. A container-query or percentage-based approach would decouple this.

**Verdict:** Acceptable for current scope. Add to Phase H refactor list.

---

## Breakpoint-Level Verdict Summary

| Breakpoint | Shell | Navigation | Command Centre | Verdict |
|-----------|-------|-----------|----------------|---------|
| 1660px | ✓ | ✓ | ✓ two-column | **Shippable** |
| 1280px | ✓ | ✓ | ✓ two-column | **Shippable** |
| 1024px | ✓ | ✓ (minor clip) | ⚠ feed collapsed | Internal only |
| 900px | ✓ | ⚠ bottom clip | ⚠ feed collapsed | Internal only |
| 640px | ✗ dead zone | ✗ partial | — | **Blocked** |
| 390px | ✗ blank screen | ✗ unreachable | — | **Blocked** |

---

## Beta Readiness Determination

**Beta (external users): NOT READY.**

Minimum bar for external access requires:
1. P0-01 resolved — 390px content must be visible
2. P1-01 resolved — 640px dead zone must be eliminated
3. P1-03 resolved — all nav items must be reachable on mobile

**Internal testing (desktop-only, 1280px+): READY.**

The desktop experience at 1280px and above is functionally coherent. All Phase G corrections are in effect (modal states, badge suppression, indigo→cyan, cmd-stage height cap at 900-1099px, sidebar 280px, topbar 48px). The shell, navigation, command centre, and visual system render as intended at these widths.

---

## Is Another Implementation Phase Necessary?

**Yes. Phase H is required before beta.**

The P0 and P1 findings are not fixable with micro-patches. They require:

1. **Mobile layout contract (P0-01):** `.app` and `.page-and-input` need height enforcement below 900px independent of grid participation. Minimum viable fix: `height: 100svh` on `.app` + `flex: 1; min-height: 0` on `.page-and-input` inside a `display:flex; flex-direction:column` fallback. This is a contained change but requires authorization.

2. **640px nav conflict (P1-01):** Phase E `position:fixed` on `.bottom-nav` must be reconciled with B8's tablet grid. Either the tablet grid rule is removed (making 640px render as mobile), or the Phase E rule is scoped to `max-width:639px` only (making 640px render as desktop). This is a design decision before implementation.

3. **Nav overflow (P1-02, P1-03):** Requires a nav architecture decision (scrollable sidebar, grouped items, or overflow drawer) before any code change.

Phase G is complete. Phase H scope = mobile layout + nav architecture + 640px conflict resolution.

---

## Recommended Next Sequence

1. **Design decision (no code):** Confirm intended layout at 640px — is it mobile-style (bottom nav, full-width content) or desktop-style (sidebar grid)? This resolves P1-01 and scopes P1-02.

2. **Mobile layout contract (Phase H-01):** Apply height fallback for sub-900px. One CSS block. Authorization required.

3. **Nav strategy (Phase H-02):** Decide and implement nav overflow handling. Scope depends on design decision in step 1. Authorization required.

4. **B5 second block removal (Phase H-03 — hygiene):** Remove redundant lines 4210–4218 from B5. Zero functional change after cascade analysis. Requires authorization.

5. **CSS consolidation (Phase H-04 — hygiene):** Merge B2/B3/B5 legacy declarations. Low urgency; high value for maintainability.

---

## No Production Files Modified

| File | Status |
|------|--------|
| `public/dashboard.html` | UNTOUCHED |
| `public/apex-v2.css` | UNTOUCHED |
| `server.js` | UNTOUCHED |
| All diagnostic artefacts | DELETED prior to this document |

---

**ASSESSMENT COMPLETE. HARD STOP MAINTAINED.**

*Produced: 2026-08-29 | Read-only | No production files modified*
