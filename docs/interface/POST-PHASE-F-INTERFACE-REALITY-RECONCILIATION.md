# POST-PHASE-F INTERFACE REALITY RECONCILIATION

**Document ID:** POST-PHASE-F-INTERFACE-REALITY-RECONCILIATION  
**Date:** 2026-08-29  
**Status:** READ-ONLY — No production files modified  
**Produced by:** Claude Code — Read-only reconciliation agent  
**Evidence basis:** Full CSS cascade analysis of `public/dashboard.html` (19,852 lines), `public/apex-v2.css` (archived), all certification documents, and all UX specification documents  

---

## Section 1 — Executive Verdict

The APEX AI OS interface has successfully completed Phases C, D, E, F-Immediate, and F-Structural from a technical correctness standpoint: all 9 automated regression suites pass, no orphan DOM nodes exist, the contextual presentation system is wired, the 5-tab mobile nav is implemented, and the CSS token cascade has been consolidated to a Jarvis-palette B5 survivor block. The interface is **not** at beta product quality. The gap between certified-correct and perceptually finished is explained by two root causes: (1) the B5 survivor's layout grid (168px sidebar, 40px topbar, 2-row layout) overrides the B2 block's richer layout specification and produces a compressed, low-hierarchy appearance; and (2) the command page's `cmd-split` layout places a full-height orb canvas in the left column with a 280px activity feed on the right, but the feed is suppressed below 1100px viewport width, leaving the orb floating in a large empty canvas for most screen sizes. A new implementation phase — Phase G (Visual Product Lift) — is warranted. It is not a restructuring phase; it is a targeted spacing, hierarchy, and productisation pass that does not touch the token namespace, the switch-page chain, or the backend.

---

## Section 2 — Current Certified State

**Phase A (A-1, A-2):** `page-browser` orphan DOM node removed. 4 duplicate `_addInterval` calls removed. A-3 (GAP-27 `:root` consolidation) remains blocked pending per-block targets.

**Phase C:** Progressive disclosure subsystem complete. `cx-top-chrome` (position:fixed, top:0, z-index:99998) and `cx-card-zone` (position:fixed, bottom:24px, right:24px, z-index:9200) inserted into dashboard.html. Five server-side files created. 63 assertions pass.

**Phase D:** HYBRID agent context highlight implemented. Wrapper 14 added to switchPage chain. `_cxPageAgentMap` and `_cxHighlightAgents` wired. 12 phase-D test cases pass.

**Phase E:** GAP-25 mobile 5-tab navigation implemented. Four tab pages (command, activity, agents, approvals) plus More trigger visible at <900px via `@media (max-width: 899px)` CSS block. Wrapper 15 (ARIA `aria-selected` sync) added. 16-button `#moreSheet` grid populated. 12 phase-E test cases pass.

**Phase F-Immediate:** Four hardcoded indigo values in `apex-v2.css` non-root selectors overridden by `<style id="apex-phase-f">` block. Orb inner, waveform bars, input focus ring, and drop-overlay border corrected to cyan. `apex-v2.css` was NOT modified (archived on disk, unlinked).

**Phase F-Structural:** B1 (base reset, ~1278 lines), B4 (Dark Ops Intelligence, ~1506 lines), B6 (Jarvis Palette override, ~509 lines), and B7 (Final Pass Refinement, ~501 lines) removed. `<link rel="stylesheet" href="/apex-v2.css">` removed. B5 designated sole canonical `:root` survivor with consolidated Jarvis tokens. 9/9 regression suites pass at every checkpoint.

**Remaining blocks after Phase F-Structural:**

| Block | Identity | Lines (approx) | Status |
|-------|----------|----------------|--------|
| B2 | APEX v11 Design Tokens | 21–2630 | RETAINED — untouched |
| B3 | APEX v12 Obsidian Neural Interface | 2633–3631 | RETAINED — untouched |
| B5 | SURVIVOR — consolidated `:root` + migrated rules | 3633–5347 | CONSOLIDATED (canonical) |
| B8 | `<style id="apex-master">` | 5349–6195 | RETAINED — untouched |
| B9 | `<style id="apex-phase-f">` | 6197–6222 | RETAINED — 4 fixes |
| apex-custom.css | 2-line comment file | public/ | LOADED via `<link>` — empty |

---

## Section 3 — Observed Live-Interface State

USER-REPORTED visual observations (verbatim, reproduced for analysis):

1. Excessive unused central canvas
2. Compressed right-side navigation/content
3. Navigation labels overlapping or competing with page content
4. Very narrow cards with poor text wrapping
5. Crowded activity/feed presentation
6. Intrusive upload/drop-zone at the top
7. Inconsistent spacing and hierarchy
8. Overall appearance closer to assembled/debug dashboard than a finished product

Code analysis produces the following explanations for each observation (detailed in Sections 8–10):

- Items 1 and 3: The `cmd-split` grid (`1fr 280px`) places the orb in a full-height flexible column. Below 1100px the right column (activity feed, `.cmd-feed-col`) is hidden, leaving the orb centred in a very large empty canvas. Navigation labels (`nav-label`) in the sidebar use `font-family: 'JetBrains Mono'` (monospace) at 11px, which renders wider than proportional type and may compete visually with page title text at the same size.
- Item 2: The B5 survivor defines the sidebar at `168px` (vs. B2's `200px` and UX-05's `200px`). Combined with the topbar at `40px` (B5) vs. `48px` (B2/B3), the overall chrome is compact but the sidebar is narrower than intended.
- Item 4: `cx-card-zone` is `position:fixed; bottom:24px; right:24px; max-width:360px`. When no contextual cards are active (the normal state without agent events), the zone is invisible. The narrow cards observation is INFERENCE: most pages render `ds-panel` components in a vertical flex column at `14px` padding, constrained by the page width (viewport minus 168px sidebar). At laptop-width viewports, this produces adequate card widths. Cards appear narrow if the viewport is narrow or if specific page layouts use fixed-width sub-grids.
- Item 5: The activity feed on the command page (`.cmd-feed-col`, 280px fixed width, `position: right column of cmd-split`) is only visible at ≥1100px. At 900–1100px it disappears. Activity feed on `page-activity` is a vertically stacked list of `apex-event-card` elements at full page width with `gap:5px padding:10px 12px` — dense but not crowded by layout rules.
- Item 6: The drop-overlay (`<div class="drop-overlay" id="dropOverlay">`) appears as a child of `<body>` before the `.app` container. Its CSS (three rules across B2 and B5) defines background and border only — no `display` or `position` in any surviving block. VERIFIED FACT: B1 (the base reset layer, ~1278 lines) was removed in Phase F-Structural (step F-S05D). INFERENCE: B1 almost certainly defined `.drop-overlay { display:none; position:fixed; inset:0; }` as the base state. Without this foundational rule, `.drop-overlay` renders in document flow with no `display:none` suppression from any surviving block. The element then occupies space in the page at its natural position (before `.app`), making it visible as a persistent element rather than a drag-triggered overlay.
- Items 7–8: INFERENCE. The cascade produces four competing grid definitions for `.app` at desktop (B2, B3, B5, and an additional one in B8). The B5 survivor wins cascade order for `!important` rules but non-`!important` properties in B8 may partially apply. The overall visual result is a technically-assembled appearance because: (a) token namespaces from four design eras coexist in the DOM; (b) spacing tokens differ between B2/B3 (using `--space-*`) and B5 (using `--ax-sp-*`); (c) some component CSS still references B2 tokens that cascade to different values than intended; (d) emoji glyphs in nav remain (Phase B not implemented).

---

## Section 4 — Evidence Methodology

**Code/CSS analysis:** Full read of all six remaining style blocks in `public/dashboard.html` (B2, B3, B5, B8, B9, apex-custom.css). Cascade analysis performed by identifying all rules targeting the same selector across blocks and determining winner by: specificity first, then cascade order (later block wins for equal specificity), then `!important` presence.

**Certification review:** All phase certification documents read (Phase C, D, E, F-Immediate, F-Structural) to understand what each phase actually changed vs. what it left untouched.

**UX specification comparison:** APEX-INTERFACE-CONVERGENCE-MASTERPLAN.md, APEX-INTERFACE-CONVERGENCE-PRODUCT-DESIGN-DECISION-PACK.md, and GAP-25-MOBILE-NAVIGATION-DESIGN-SPECIFICATION.md fully read. UX authority documents referenced in those documents noted but not re-read (UX-05, UX-08, UX-18 — partially referenced via the specification documents that quote them).

**User-reported observations:** The eight visual observations listed above were taken as inputs and traced to specific CSS rules or structural decisions where code evidence exists. Where no code evidence could be found, the observation is classified as INFERENCE or CANNOT DETERMINE.

**Live browser screenshots were not available in the current analysis environment.** All visual findings are derived from static CSS/HTML analysis. Rendering behaviour (font rendering, sub-pixel positioning, browser-specific layout quirks, actual computed widths at real viewport dimensions) cannot be verified without a live browser session.

---

## Section 5 — Viewport/Environment Limitations

The following cannot be verified without a live browser session:

1. **Actual computed layout dimensions.** CSS cascade produces values; browser layout engine applies them with font metrics, rounding, and intrinsic sizing. The 168px sidebar may render at a slightly different effective width due to border-box accounting.
2. **Font rendering.** JetBrains Mono at 11px on the nav-label — whether this visually competes with page content depends on rendering at the actual DPI/zoom of the device in use.
3. **Orb canvas rendering.** The `<canvas id="plasmaOrb">` is sized by JavaScript (`position:absolute; inset:0; width:100%; height:100%`). Whether the canvas fills the cmd-stage correctly or leaves dead space depends on JS execution and canvas API behaviour.
4. **The drop-overlay visibility.** INFERENCE holds that B1 defined the hidden state. If another rule (not found in code analysis) hides it, the drop-overlay may not actually be visible. This requires browser DevTools inspection.
5. **Text wrapping at real card widths.** ds-panel content wrapping depends on actual computed widths which require browser measurement.
6. **Mobile 5-tab rendering.** Phase E CSS targets `@media (max-width: 899px)`. Correct rendering at actual device widths (360px, 390px, 428px) can only be confirmed in a browser.
7. **Contextual card animation and positioning.** `cx-card-zone` bottom-right positioning may produce visual conflicts depending on viewport height.
8. **Z-index stacking.** Multiple elements use z-index values from 2000 to 99999. Actual stacking context tree is browser-computed.

---

## Section 6 — Interface Architecture Map

### 6.1 Desktop Grid (≥900px) — CASCADE WINNER

VERIFIED FACT from B5 (`@media (min-width: 900px)`), the cascade winner:

```
.app {
  display: grid !important;
  grid-template-columns: 168px 1fr !important;
  grid-template-rows: 40px 1fr !important;
  grid-template-areas: "topbar topbar" "sidenav content" !important;
}
```

Areas:
- `topbar`: Full-width header bar, height 40px (B5 canonical value, overrides B2's 48px, B3's 48px var)
- `sidenav`: `.bottom-nav` — 168px wide sidebar, full height below topbar, `background: var(--ax-bg)`, `border-right: 1px solid var(--ax-bd)`, `padding: 8px 0`
- `content`: `.page-and-input` — `flex-direction: column; min-height: 0; overflow: hidden`

### 6.2 Competing Grid Definitions (All Cascading to Same Selector)

| Block | Rule Location | grid-template-columns | grid-template-rows | Cascade Result |
|-------|---------------|-----------------------|--------------------|-|
| B2 | line ~1450, `@media (min-width:900px)` | `var(--sidebar-w) 1fr` → 200px 1fr | `var(--topbar-h) var(--ticker-h) 1fr var(--chatbar-h)` → 48px 0px 1fr 52px | LOSES to B5 (later block, all !important) |
| B3 | line ~2721, `@media (min-width:900px)` | `var(--v12-nav) 1fr` → 178px 1fr | `var(--v12-top) 1fr` → 48px 1fr | LOSES to B5 |
| B5 | line ~3769, `@media (min-width:900px)` | `168px 1fr !important` | `40px 1fr !important` | **WINS — cascade winner** |
| B8 (apex-master) | line ~5492, `@media (min-width:900px)` | (adds nav-btn border-left rules, no grid-template override) | — | No grid conflict |

VERIFIED FACT: B5's `168px` sidebar and `40px` topbar are the production values. The B2 block's richer 4-row layout (including ticker and chatbar as named grid rows) is fully overridden.

### 6.3 Page Content Area

`.page-and-input` contains:
- `.page-wrap` (flex: 1, min-height:0, overflow:hidden, position:relative) — stacking context for pages
- Each `.page` — `position:absolute; inset:0; opacity:0; pointer-events:none` (inactive), `.page.active` — `opacity:1; pointer-events:auto`
- `.input-zone` — bottom chat bar, `height:50px` (B5), `border-top: 1px solid var(--ax-bd)`

### 6.4 Command Page Internal Layout

```
#page-command { padding:0; overflow:hidden; gap:0 }
.cmd-split {
  display: grid;
  grid-template-columns: 1fr 280px;
  height: 100%;
}
@media (max-width: 1099px) {
  .cmd-split { grid-template-columns: 1fr; }
  .cmd-feed-col { display: none; }
}
```

At typical laptop widths (1280–1440px), both columns render. At 900–1099px, only the left column renders. The left column contains `.cmd-stage` (the plasma orb canvas, `position:relative; flex:1`). The canvas fills its container but the orb is drawn as a canvas element; its visual centering depends on JS rendering.

### 6.5 Sidebar Nav

```
.bottom-nav {
  background: var(--ax-bg);
  border-right: 1px solid var(--ax-bd);
  padding: 8px 0;
  width: 168px;
}
.nav-btn {
  height: 38px;
  padding: 0 16px;
  color: var(--ax-tx2);
  font-size: 11px;
  font-weight: 400;
  font-family: 'Inter';
}
.nav-btn.active {
  color: var(--ax-tx0);
  background: rgba(99,102,241,0.07);
  border-left: 2px solid var(--ax-acc);
}
```

VERIFIED FACT: Active nav button uses `background: rgba(99,102,241,0.07)` — this is the indigo value from the B5 block's nav-btn rule. The `border-left: 2px solid var(--ax-acc)` resolves to cyan (`#00d4ff`) correctly. But the active background tint is indigo (B5 selector `.nav-btn.active`), not cyan. This is a visual inconsistency — active item background is indigo-tinted, border indicator is cyan.

### 6.6 Drop Overlay State

`<div class="drop-overlay" id="dropOverlay">` is at the body level, before `<div class="app">`. VERIFIED FACT: No surviving CSS block sets `display:none` as its base state. The three surviving CSS rules for `.drop-overlay` define only background and border. INFERENCE: B1 (removed in Phase F-Structural step F-S05D) contained the foundational `display:none; position:fixed; inset:0; z-index:9000` for this element. Without B1, the element renders in document flow at its default `display:block` with no `position:fixed`, making it a visible block element above the `.app` grid. JavaScript does add `.active` class (lines 13323–13336) but that mechanism relies on the base hidden state existing — with no base hidden state, the element is always visible.

### 6.7 Mobile Layout (<900px)

Phase E CSS (`@media (max-width: 899px)`, line 6103):
- `.bottom-nav`: `display:flex; flex-direction:row; position:fixed; bottom:0; height:calc(49px + env(safe-area-inset-bottom))`
- 16 overflow buttons hidden, `#nav-more` shown
- Page bottom padding: `calc(49px + safe-area + 24px)`

An earlier rule in B8 (`@media (max-width:900px)`, line ~5884) sets: `button, [role="button"], a, .nav-btn, .more-sheet-btn, input, select, label[for] { min-height:44px !important }` — this applies on mobile and could conflict with the Phase E `height:49px` rule on nav-btns (44px min-height < 49px, no conflict; 44px min-height on `a` elements within nav may affect layout).

---

## Section 7 — 20-Page Health Assessment

Assessment criteria: FUNCTIONAL = page has substantive connected UI; PLACEHOLDER = page has structural elements but no meaningful dynamic content; UNKNOWN = cannot determine without browser execution.

| Page | Assessment | Basis |
|------|------------|-------|
| command | FUNCTIONAL | Orb canvas, waveform, cmd-strip with 4 live stats, cmd-feed-col (activity feed at >1100px), constitution charter panel. Live data via JS polling. |
| overview | FUNCTIONAL | Governance pipeline visualization, multi-level authority hierarchy, identity core panels (Constitution, Founder Identity, Civ Registry). Rich HTML structure. |
| operation | FUNCTIONAL | Has page header, DS stat cards, panels. Content populates via `operationRefresh()`. |
| system | FUNCTIONAL | Self-check, intelligence briefing, performance panels. DS stat cards with live IDs. |
| finance | FUNCTIONAL | Page header, finance bars, stat cards. `financeRefresh()` populates. |
| communication | FUNCTIONAL | Email items, network panels. `commRefresh()` populates. |
| business | FUNCTIONAL | CRM-style panels. `businessRefresh()` populates. |
| health | FUNCTIONAL | Habit tracking, wellbeing panels. `healthRefresh()` populates. |
| university | FUNCTIONAL | Coursework panels, course flow modal. `uniRefresh()` populates. |
| occult | FUNCTIONAL | Meditation streak stats, spiritual journal panels. `occultRefresh()` populates. |
| research | FUNCTIONAL | Intelligence panels. `researchRefresh()` populates. |
| civilisation | FUNCTIONAL | Constitutional gate status, genome/consensus panels. `civRefresh()` populates. |
| reality | FUNCTIONAL | Reality health grid, observer health, belief-reality gap panels. `realitySeed()` / `realityHealthRefresh()` wired. |
| activity | FUNCTIONAL | Live event feed with 17-category filter, connection state banner, `actRefresh()`. Category filter buttons rendered. Relies on WebSocket/viz-broadcaster. |
| agents | FUNCTIONAL | Self-check grid, agent cards, capability matrix. `agentsRefresh()` and Phase D HYBRID highlight wired. |
| approvals | FUNCTIONAL | Approval cards with approve/reject buttons. `approvalsRefresh()` populates. |
| knowledge | FUNCTIONAL | Coverage state panel, knowledge items panel. `knowledgeRefresh()` wired. GAP-32 (route existence) unresolved — data may be empty. |
| intelligence | FUNCTIONAL | Strategic briefing, civilization health panels. `intelligenceRefresh()` wired. |
| memory | FUNCTIONAL | Memory inspection panel from RX-04. Read-only (GAP-15/16 unresolved). |
| governance | FUNCTIONAL | Constitutional status, authority delegation, audit log panels. `governanceRefresh()` wired. |

All 20 pages have substantive HTML structure and refresh wiring. None are pure placeholders. FUNCTIONAL does not mean data-populated — runtime data depends on backend connectivity.

---

## Section 8 — Visual Defects

### VD-01: Drop Overlay Always Visible (P0)

**Cause:** B1 (base reset layer, ~1278 lines) was removed in Phase F-Structural step F-S05D. B1 contained the foundational display/position definition for `.drop-overlay`. The three surviving rules (B2 line 897, B5 line 5170, B9 line 6219) define only `background` and `border` properties. No surviving rule sets `display:none` or `position:fixed` for this element.

**Result:** `<div class="drop-overlay" id="dropOverlay">` renders as a block-level element in document flow at its default `display:block`, above the `.app` grid. It is visible at all times as a border/background element instead of appearing only on file drag.

**Confirming CSS (B2, line 897):**
```css
.drop-overlay {
    background: rgba(0,212,255,0.04);
    border: 2px dashed rgba(0,212,255,0.5);
}
```
No `display`, `position`, or `visibility` property in any surviving block.

### VD-02: Active Nav Button Background Uses Indigo Tint (P2)

**Cause:** B5 survivor (line ~3842):
```css
.nav-btn.active { color: var(--ax-tx0); background: rgba(99,102,241,0.07); border-left: 2px solid var(--ax-acc); }
```
`rgba(99,102,241,0.07)` is the indigo value. The border-left correctly uses `var(--ax-acc)` (cyan). This creates a visually inconsistent active state: cyan border but indigo-tinted background.

### VD-03: B8 brand-ring Still Uses Indigo Border (P2)

**Cause:** B5 (line ~3801):
```css
.brand-ring { border: 1px solid rgba(99,102,241,0.45) !important; }
```
This survived Phase F-Immediate because the fix targeted `apex-v2.css` non-root selectors; `.brand-ring` in the B5 block was not in scope. The brand ring border is indigo, not canonical cyan.

### VD-04: Navigation Badges Hidden (P1)

**Cause:** B5 (line ~3847):
```css
.ds-notif-badge { display: none !important; }
```
All notification badges on nav buttons are suppressed. Five badge elements (`navOpsBadge`, `navIntelBadge`, `navCommsBadge`, `navActivityBadge`, `navApprovalsBadge`) exist in the DOM but are invisible. The amber `navApprovalsBadge` on the approvals tab — a primary governance signal — is silenced.

### VD-05: Emoji Glyphs in Navigation (P2)

**Cause:** Phase B (SVG icon system) not implemented. All 20 nav buttons use Unicode emoji/symbol characters (⬡, ◈, ⊞, etc.). These render inconsistently across platforms and at different sizes than vector icons.

---

## Section 9 — Layout Defects

### LD-01: Command Page Central Canvas Empty at 900–1099px (P1)

**Cause:** B2 block (line ~2990):
```css
@media (max-width: 1099px) {
  .cmd-split { grid-template-columns: 1fr !important; }
  .cmd-feed-col { display: none !important; }
}
```
At 900–1099px viewport width (a common laptop range), the right column (activity feed, 280px) disappears and the orb canvas fills the entire page area. The `#cmd-main` element is `display:flex; flex:1; flex-direction:column; overflow:hidden` — the orb canvas expands to fill available space. The orb itself (`<canvas id="plasmaOrb">`) is drawn at whatever size JS renders it into the canvas element. The remaining vertical space below the orb produces a visually empty central area.

### LD-02: Grid Template Row Conflict — Chatbar Not in Named Area (P1)

**Cause:** B2's grid (lost to B5 cascade) defined 4 rows including a `chatbar` grid area. B5's winning grid has only 2 rows: `topbar` + remaining `1fr`. The `.input-zone` (chat bar) is rendered inside `.page-and-input` (the content area), not as a named grid area. It relies on `flex-direction:column` within page-and-input to pin to the bottom. This is functionally correct but means the chatbar height (`50px`) is not guaranteed at the grid level — it is governed by flex layout within the content column.

### LD-03: Sidebar Width Narrower Than UX Specification (P2)

**Cause:** B5 winner: `grid-template-columns: 168px 1fr`. UX-05 specifies 200px (from the `--sidebar-w` token in B2 and MASTERPLAN §7.1). The 32px reduction (200px → 168px) compresses nav label rendering. At 11px font-size with JetBrains Mono, labels like "CIVILISATION" and "COMMUNICATION" may truncate or wrap.

### LD-04: Topbar Height Mismatch Creates Proportional Imbalance (P2)

**Cause:** B5 winner sets topbar to `height: 40px !important; min-height: 40px !important; max-height: 40px !important`. B2 specified 48px (`--topbar-h: 52px` then overridden to 48px by B3). The 40px topbar appears very thin relative to 168px sidebar and produces a compressed chrome feel.

### LD-05: cx-card-zone Not Responsive to Mobile Tab Bar (INFERENCE — P2)

**Cause:** `cx-card-zone` is `position:fixed; bottom:24px; right:24px`. Phase E adds `padding-bottom: calc(49px + safe-area + 24px)` to `.page` elements, but `cx-card-zone` is outside the page flow. On mobile, the card zone bottom anchor (24px from bottom) would partially overlap the 5-tab bar (49px + safe area). CANNOT DETERMINE without browser whether any active contextual cards are obscured.

### LD-06: page-command Adds Additional Constitution Panel Below cmd-split (P2)

**Cause:** After the `cmd-split` div (line 6452), `#page-command` contains an additional Constitution Charter panel (`background:#0d1424; border-radius:14px; margin-top:16px`). Since `#page-command` is `overflow:hidden` with no scrolling permitted, this panel may be clipped or may force layout issues. CANNOT DETERMINE without browser.

---

## Section 10 — CSS/Cascade Findings

### CF-01: Four Competing `.app` Grid Definitions at Desktop

Four CSS blocks each define `.app { display:grid; grid-template-columns: ... }` inside `@media (min-width:900px)`. Only one wins. B5 wins because it appears latest in the cascade and uses `!important` on all properties. B2's richer 4-row layout (including ticker and chatbar grid areas) is entirely overridden. This is architecturally correct per Phase F-Structural intent but means the ticker-bar grid area (`grid-area: ticker`) is not respected in the current cascade — the ticker-bar element, if present, would flow into an unnamed grid cell.

### CF-02: Three Surviving `:root` Blocks

Phase F-Structural eliminated 4 of 7 `:root` blocks but three remain: B2 (`:root` at line 23, indigo tokens), B3 (`:root` at line 2640, v12 indigo tokens), and B5 (`:root` at line 3646, canonical Jarvis/cyan tokens + bridge aliases). B8 (`apex-master`) adds a fourth `:root` at line 5356 with `--ax-*` extended set. B5's bridge aliases use `!important` to overwrite B2 and B3 values. This functions correctly for most tokens but creates a complex cascade where consumer code in B2 component rules references `--surface` and gets `var(--ax-s1)` via the bridge — an indirect reference chain that is difficult to trace without tooling.

### CF-03: nav-btn active Background Is Indigo in B5

B5 line ~3842: `.nav-btn.active { background: rgba(99,102,241,0.07) !important }`. This is the only definition of nav-btn active background that uses `!important`. No later block overrides it. This is a design inconsistency that was not addressed in Phase F-Immediate (which targeted `apex-v2.css` selectors only) or Phase F-Structural (which retained B5 untouched).

### CF-04: ds-notif-badge Globally Hidden in B5

B5 line ~3847: `.ds-notif-badge { display: none !important }`. This affects all badge instances across all 20 pages and the navigation. The badges were designed as governance signals (amber approval badge, cyan activity badge). Their suppression removes information from the interface.

### CF-05: nav-label font-family Override Chain

B2: `.nav-label { flex: 1 }` (no font specified). B3: `.nav-label` (no explicit rule found). B5: `.nav-label { font-size: 11px; font-weight: 400; letter-spacing: 0.01em; text-transform: none; flex: 1 }` (no font-family). B8 (apex-master, line ~5434): `.nav-label { font-family:var(--ax-f-m) !important; font-weight:500 !important; letter-spacing:0.08em !important; font-size:11px !important }` where `--ax-f-m = 'JetBrains Mono'`. Result: nav labels render in JetBrains Mono, a monospace font, at 11px. This is technically correct per B8 intent but produces wider-than-proportional label rendering.

### CF-06: Legacy `--v12-*` Token Namespace Still Active

B3's `:root` defines `--v12-*` tokens. B5's bridge aliases reassign them (`--v12-a: var(--ax-acc)!important` etc.). B3 component rules still reference `--v12-*` variables. The bridge makes these resolve correctly at runtime, but the legacy namespace remains present and visible in DevTools. This is technical debt (GAP-27 not fully closed).

---

## Section 11 — Responsive Findings

### RF-01: Desktop (≥900px) — Two Competing Sidebar Breakpoints

Two `@media (min-width:900px)` blocks exist (B2 and B5). B5 wins. Result: 168px sidebar, 40px topbar, 2-row grid.

### RF-02: Tablet (640–899px) — B8 Adds Sidebar Behaviour

B8 (`@media (min-width:640px) and (max-width:899px)`, line ~6004) defines a 200px sidebar grid. This conflicts with Phase E's `@media (max-width:899px)` which activates the 5-tab bar. Cascade order: B8 appears before Phase E CSS in the document (B8 ends at ~line 6195; Phase E block starts at line 6102 which is inside B8). VERIFIED FACT: Phase E's block is nested inside B8 itself (lines 6102–6190 are within the `<style id="apex-master">` block which runs to line 6195). Phase E's `@media (max-width: 899px)` block is at document line 6102 — this is INSIDE B8. B5's layout rules (lines 3769–3788) also have `@media (min-width:900px)` so do not apply at tablet width. The winning rule at 640–899px: B8's `@media (min-width:640px) and (max-width:899px)` sidebar layout (200px grid) vs. Phase E's `@media (max-width:899px)` bottom bar. Phase E overrides with `!important` on `.bottom-nav { display:flex !important }` — this should win. INFERENCE: at 640–899px, the 5-tab bar renders (Phase E wins via !important and later cascade position). CANNOT DETERMINE without browser whether the B8 grid-template-columns rule also applies at this range and produces a 200px blank sidebar area alongside the bottom bar.

### RF-03: Mobile (<640px) — Phase E Applies Correctly

Phase E rule at `@media (max-width: 899px)` covers all widths below 900px including mobile portrait. The 640px-specific breakpoint mentioned in GAP-25 design specification is handled by the inclusive max-width:899px rule (HD-03 was resolved as "5-tab extends to full <900px range"). VERIFIED FACT: No separate `@media (max-width: 639px)` breakpoint exists. This matches the Phase E certification (HD-03 Option A).

### RF-04: Phase E Mobile Nav Block Position Inside B8

VERIFIED FACT: The Phase E CSS block (lines 6102–6190) appears to be inside `<style id="apex-master">` (which opens at line 5349 and closes at line 6195). This means Phase E CSS is part of B8 from a cascade perspective, not a standalone block inserted after B8. This does not affect functionality (B8/Phase E rules still override B2/B3/B5 by specificity+!important) but means the architectural boundary between "Phase D+E contributions" and "B8 apex-master" is blurred. Future editors reading B8 will encounter Phase E CSS as part of B8 without clear demarcation.

---

## Section 12 — UX/Design Findings

### UF-01: Command Page Does Not Match UX-06 Visual Prototype Intent

The UX-06 prototype (`docs/interface/prototype/apex-command-prototype.html`) envisioned the command page as a visually unified command centre with the orb prominently centred and contextual information arranged hierarchically around it. The current implementation places the orb in a flex column (`cmd-main-col`) that shares a grid with a 280px activity feed. Below 1100px, the feed disappears and the orb sits in an under-populated canvas. The Constitution Charter panel appended below `cmd-split` is not part of the UX-06 specification — it was added as inline HTML without specification authority.

### UF-02: Nav Labels Do Not Match UX-05 Typography Specification

UX-05 §9 specifies Inter (proportional sans-serif) for nav labels. B8 applies JetBrains Mono to `nav-label`. The font mismatch produces a denser, more technical appearance than the specification intends.

### UF-03: Beta Quality Gap on Domain Pages (GAP-30 Open)

Pages such as `health`, `university`, `occult`, `business`, `finance` have consistent structural templates (page-header + stat-cards + panels) but content quality, data richness, and cross-page design coherence vary. GAP-30 (domain page quality standardisation) remains open and unscheduled. These pages are technically FUNCTIONAL but not at a consistent beta presentation quality.

### UF-04: GAP-29 (SVG Icons) Not Implemented

All 20 nav buttons use Unicode symbols. UX-05 §32 requires SVG sprite icons. Phase B remains blocked (15 icon assets not delivered). The emoji/symbol rendering produces an inconsistent aesthetic across operating systems and does not match the UX-05 visual specification.

### UF-05: Greeting Bar / Page Title Not Personalised

The topbar shows a static `topbar-pg-title` and `topbar-pg-sub` that display the current page name ("Command" / "AI · Interface · Control") but no user name, time-of-day greeting, or personalisation. UX-09 (Proactive Communication) specifies proactive personalised greeting behaviour. This is a gap between specification and implementation.

---

## Section 13 — Productisation Findings

### PF-01: Dashboard Presents as an Assembled System, Not a Finished Product

The interface is technically functional and architecturally clean (post-Phase F-Structural) but the visual presentation has markers of an assembled developer tool: emoji nav icons, JetBrains Mono for navigation labels, 40px topbar (thin), 168px sidebar (narrower than specification), suppressed notification badges, and an always-visible drop overlay. Each individual decision is traceable to a cascade rule; collectively they produce a "scaffolded" appearance.

### PF-02: Empty Canvas Experience on Default Landing

When a user opens APEX at typical laptop width (e.g., 1280px), they land on `page-command` which shows:
- A plasma orb canvas in the left column (correct)
- A 280px activity feed column on the right (correct at ≥1100px, which 1280px satisfies)
- Below the `cmd-split`: a Constitution Charter panel
- No apparent call to action, no welcome state, no orientation

At 900–1099px, the activity feed disappears and the orb occupies the full content width — producing the "excessive unused central canvas" observation.

### PF-03: Input Zone Always Visible

The chat input zone (`input-zone`, 50px height) is always visible at the bottom of the content area on all pages including pages where direct chat is not the primary interaction (e.g., Finance, Health, Governance). This is a design decision from the original architecture but creates confusion about the interaction model.

### PF-04: cx-card-zone Currently Dormant

Contextual presentation system (Phase C) is wired but no agent events are generating `presentation:inject` WebSocket messages in the current production state. The `cx-card-zone` element exists in the DOM (`position:fixed; bottom:24px; right:24px`) but is visually absent (no cards rendered). Users cannot assess whether this system is working.

---

## Section 14 — Technical Debt Findings

### TD-01: B2 Component CSS References Legacy Indigo Tokens

B2 (lines 21–2630) contains extensive component CSS that references `--primary` (which in B2's own `:root` = `#5e6ad2`, indigo). B5's bridge alias reassigns `--primary: var(--ax-acc) !important` = cyan. This means B2 component rules dynamically resolve to cyan at runtime — correct behaviour, but requires understanding the bridge mechanism to verify. Any direct literal indigo values in B2 component CSS (not via variables) survive.

### TD-02: Three Remaining `:root` Blocks (GAP-27 Partially Closed)

Phase F-Structural reduced `:root` blocks from 7 to 3 (B2, B3, B5) plus B8's additional `:root`. GAP-27's terminal criterion (single canonical `:root` with `--ax-*` namespace) is not yet satisfied. Phase A-3 remains blocked pending explicit per-block disposition instructions.

### TD-03: switchPage Chain Has 16 Implementations (Wrappers 1–15 + Original)

The original `switchPage()` + 14 numbered wrappers + mobile wrapper + Wrapper 15 (Phase E ARIA) = 16 implementations in sequence. Phase D was supposed to collapse this chain but per PHASE-D-PRE-IMPLEMENTATION-RECONNAISSANCE conflict resolution, chain collapse was deferred. This is the highest-risk fragility in the codebase.

### TD-04: B1 Removal Created Missing Base Styles

Phase F-Structural removed B1 (base reset layer). B1 defined foundational display/position rules for overlays including `.drop-overlay`. Removal of B1 without auditing every selector it contained for missing base state definitions is the root cause of VD-01 (drop overlay always visible). Other selectors previously defined only in B1 may also be missing their base state definitions.

### TD-05: apex-v2.css Remains on Disk

`public/apex-v2.css` is archived on disk (unlinked from HTML). It contains indigo-era rules. While unlinked and therefore not affecting the cascade, it occupies disk space and may confuse future editors who encounter the file.

### TD-06: mobileNavDropdown and mobileNavToggle Not Retired

Phase E certified retiring `#mobileNavToggle` and `#mobileNavDropdown` as navigation mechanisms (by hiding them via CSS). The DOM elements remain in the file at lines 8289 and 8739 respectively. Full DOM removal is deferred to Phase F scope.

---

## Section 15 — Certified-vs-Observed Discrepancies

### COD-01: Phase F-Structural — Drop Overlay Base State Broken

**Certified:** B1 removed, regression suites all pass.  
**Observed:** Drop overlay always visible (VD-01 above).  
**Explanation:** The regression suites (RX-02 through phase-e-p1) test JS behaviour, route availability, and DOM structure — not pixel-level rendering. No test checks `display:none` on `.drop-overlay` in the base (non-active) state. The removal of B1 broke this base state silently. The test suite did not catch it because no test asserts the drop overlay's visual state.

### COD-02: Phase F-Immediate — nav-btn Active Background Not Fixed

**Certified:** Four indigo values in `apex-v2.css` non-root selectors neutralised.  
**Observed:** nav-btn active background uses `rgba(99,102,241,0.07)` (indigo) from B5.  
**Explanation:** Phase F-Immediate scope was explicitly limited to four selectors in `apex-v2.css`. The B5 block's `nav-btn.active` indigo background was not in scope. This is not a regression — it was a pre-existing condition that Phase F-Immediate was not authorised to fix.

### COD-03: Phase E — 5-Tab CSS Inside B8 Block

**Certified:** Phase E implemented as Change A (CSS block before Phase D comment).  
**Observed:** Phase E CSS is at line 6102 which falls inside `<style id="apex-master">` (lines 5349–6195).  
**Explanation:** The Phase E certification records "CSS Phase E block (before Phase D comment, ~line 8685)" but the actual placement in the post-F-Structural file is at line 6102 within B8. This may be a line-numbering discrepancy between the pre-Phase-F-Structural and post-Phase-F-Structural file (Phase F-Structural removed ~3800 lines). The functional result is correct (Phase E rules apply), but the architectural boundary is merged with B8 rather than being a standalone block.

### COD-04: Phase C cx-card-zone Position

**Certified:** Phase C inserted `cx-card-zone` into dashboard.html.  
**Observed (Phase E certification):** Phase E modified cx-card-zone z-index from 9000 → 9200.  
**Observed (current code):** `cx-card-zone` is `position:fixed; bottom:24px; right:24px; z-index:9200`.  
**Explanation:** Position is fixed at bottom-right, not in the content flow. At mobile viewports with the 5-tab bar (49px), cards at `bottom:24px` may overlap with the tab bar. No Phase E CSS adjusts the cx-card-zone mobile positioning.

---

## Section 16 — P0/P1/P2/P3 Classification

### P0 — Blocks Usability

| ID | Finding | Effect |
|----|---------|--------|
| P0-01 | Drop overlay always visible (VD-01 / TD-04) | A visible dashed border element sits above `.app` at all times, obscuring or confusing the interface before the app shell even renders. This is a direct functional regression from Phase F-Structural removing B1. |

### P1 — Materially Harms Beta Quality

| ID | Finding | Effect |
|----|---------|--------|
| P1-01 | Navigation badges hidden (VD-04 / CF-04) | Governance-critical signals (amber approval badge, cyan activity badge) are suppressed. Users have no visual indicator of pending approvals or new activity on the nav rail. |
| P1-02 | Command page empty canvas at 900–1099px (LD-01) | The default landing page presents a largely empty screen at common laptop viewport widths. First impression is a half-finished interface. |
| P1-03 | B1 removal impact audit incomplete (TD-04) | The drop overlay is confirmed affected. Other B1-only selectors may also be missing base state definitions — cannot verify without a complete B1 content audit. |

### P2 — Polish

| ID | Finding | Effect |
|----|---------|--------|
| P2-01 | Active nav button background is indigo (VD-02 / CF-03) | Visual inconsistency: cyan left border but indigo background tint on active nav item. |
| P2-02 | brand-ring border is indigo (VD-03) | Brand mark renders with indigo border in the canonical cyan interface. |
| P2-03 | Nav label font is JetBrains Mono (CF-05 / UF-02) | Monospace navigation labels are denser and more technical than the Inter proportional font specified in UX-05. |
| P2-04 | Sidebar 168px vs UX-05 200px (LD-03) | Long page labels may truncate. |
| P2-05 | Topbar 40px vs spec 48px (LD-04) | Compressed chrome appearance. |
| P2-06 | cx-card-zone not adjusted for mobile tab bar (LD-05) | Potential overlap on mobile. CANNOT DETERMINE without browser. |
| P2-07 | Command page Constitution panel may be clipped (LD-06) | Extra panel below cmd-split in overflow:hidden context. |
| P2-08 | GAP-30 domain page quality (UF-03) | Domain pages at uneven quality standard. |
| P2-09 | Emoji nav icons vs SVG spec (VD-05 / UF-04) | Cross-platform inconsistency, does not match UX-05. |
| P2-10 | Three remaining `:root` blocks (TD-02) | GAP-27 not fully closed. |

### P3 — Future Productisation

| ID | Finding | Effect |
|----|---------|--------|
| P3-01 | switchPage chain has 16 implementations (TD-03) | Architectural debt, not a user-facing issue currently. |
| P3-02 | Phase E CSS merged into B8 block (COD-03) | Blurred architectural boundary, maintenance issue. |
| P3-03 | GAP-29 (SVG icons) not implemented | Phase B remains blocked. |
| P3-04 | GAP-15/16 (memory write routes) not implemented | Memory panel is read-only. |
| P3-05 | GAP-22 (historical event query) not implemented | Activity page limited to most recent events. |
| P3-06 | Personalisation / greeting absent (UF-05) | No UX-09 proactive communication. |
| P3-07 | apex-v2.css on disk but unlinked (TD-05) | Maintenance confusion. |
| P3-08 | mobileNavDropdown DOM elements retained (TD-06) | Dead DOM. Full removal is Phase F scope. |

---

## Section 17 — Dependency Graph

```
P0-01 (drop overlay visible)
  ├── Requires: restore foundational display:none + position:fixed for .drop-overlay
  └── Unblocked: can be fixed immediately — add single CSS rule to any surviving block

P1-01 (badges hidden)
  ├── Requires: remove .ds-notif-badge { display:none !important } from B5
  └── Note: requires verifying badge JS population still fires

P1-02 (command page empty canvas)
  ├── Requires: design decision on command page layout at 900–1099px
  ├── Option A: restructure cmd-split to show content at smaller widths
  ├── Option B: add an alternative content zone below the orb at this breakpoint
  └── Independent of P0-01 and P1-01

P1-03 (B1 removal impact audit)
  ├── Requires: reconstruct B1 content from backup snapshot (dashboard.html.pre-phase-f-structural)
  ├── Audit every B1 selector for base-state definitions
  └── Must precede any further block removal phases

P2-01 (indigo nav active background)
  ├── Requires: change rgba(99,102,241,0.07) to rgba(0,212,255,0.07) in B5 .nav-btn.active
  └── Independent fix — no dependencies

P2-02 (brand-ring indigo border)
  ├── Requires: change rgba(99,102,241,0.45) to rgba(0,212,255,0.45) or var(--ax-acc) in B5
  └── Independent fix

P2-03 (nav label mono font)
  ├── Requires: override .nav-label font-family in B8 or B5
  └── Independent fix

P2-04 (sidebar width)
  ├── Requires: change B5 grid-template-columns from 168px to 200px
  └── Dependency: triggers re-layout — verify no page content overflows

P2-05 (topbar height)
  ├── Requires: change B5 topbar height from 40px to 48px
  └── Dependency: adjust grid-template-rows from "40px 1fr" to "48px 1fr"

P3-01 (switchPage chain collapse) → requires Phase E complete (done), explicit authorisation
P3-02 (Phase E in B8) → requires Phase F CSS consolidation (future Phase A-3/Phase F)
P3-03 (SVG icons / Phase B) → requires all 20 icon assets delivered
P3-04, P3-05 → backend sprint independent of frontend
```

---

## Section 18 — Recommended Remediation Sequence

**Priority 1 — Immediate (P0):**
1. Restore foundational `.drop-overlay` base state (display:none, position:fixed, inset:0, z-index:9000) by adding it to B5 or a new micro-block. This resolves VD-01/P0-01.
2. Audit `dashboard.html.pre-phase-f-structural` to extract complete B1 content. Identify every selector defined in B1 and verify whether that selector's base state is preserved in B2–B5/B8. Document all orphaned selectors.

**Priority 2 — Phase G Targeted Fixes (P1 and selected P2):**
3. Remove `.ds-notif-badge { display: none !important }` from B5. Re-enable governance signal badges. Verify badge JS population triggers correctly.
4. Address command page 900–1099px empty canvas. Product decision required: what should appear in the main column when the activity feed is hidden?
5. Fix nav-btn active background from indigo to cyan (P2-01).
6. Fix brand-ring border from indigo to cyan (P2-02).
7. Restore sidebar width to 200px in B5 grid-template-columns (P2-04).
8. Restore topbar height to 48px in B5 (P2-05).
9. Override nav-label font-family to 'Inter' (P2-03).

**Priority 3 — Productisation Pass (P2 remaining):**
10. Verify and fix cx-card-zone mobile positioning (P2-06).
11. Resolve Constitution Charter panel overflow in #page-command (P2-07).
12. Define and execute GAP-30 domain page quality standard.

**Priority 4 — Future Phases (P3):**
13. Phase B: SVG icon delivery and integration (blocked by 15 missing assets).
14. Phase A-3/Phase F: Complete GAP-27 `:root` consolidation (blocked by per-block targets).
15. Backend sprint: GAP-15, GAP-16, GAP-22.
16. switchPage chain collapse: separate authorisation required.

---

## Section 19 — Proposed Next Phase Definition

### Phase G — Visual Product Lift

**Name:** Phase G — Visual Product Lift  
**Purpose:** Resolve the P0 drop-overlay regression from Phase F-Structural, restore governance signal badges, and complete the targeted visual productisation changes (sidebar width, topbar height, nav font, active state colour) that were not in scope for Phases C–F but are required for beta quality. Phase G does not touch the backend, the switchPage chain, the token namespace structure, or any page DOM content.

**Scope (explicit items only):**

| Item | Change | File |
|------|--------|------|
| G-01 | Restore `.drop-overlay { display:none; position:fixed; inset:0; z-index:9000; }` base state | `public/dashboard.html` — B5 block only |
| G-02 | Remove `.ds-notif-badge { display: none !important }` from B5 | `public/dashboard.html` — B5 block only |
| G-03 | Change `.nav-btn.active` background from `rgba(99,102,241,0.07)` to `rgba(0,212,255,0.06)` | `public/dashboard.html` — B5 block only |
| G-04 | Change `.brand-ring` border from `rgba(99,102,241,0.45)` to `var(--ax-acc)` | `public/dashboard.html` — B5 block only |
| G-05 | Change B5 `@media (min-width:900px)` grid-template-columns from `168px` to `200px` | `public/dashboard.html` — B5 block only |
| G-06 | Change B5 `@media (min-width:900px)` grid-template-rows from `40px 1fr` to `48px 1fr` | `public/dashboard.html` — B5 block only |
| G-07 | Change B5 `.topbar` height rules from `40px` to `48px` | `public/dashboard.html` — B5 block only |
| G-08 | Override nav-label font-family to `'Inter',system-ui,sans-serif` | `public/dashboard.html` — B5 block only |
| G-09 | Audit B1 from snapshot and document all orphaned base-state selectors | Read-only audit — `dashboard.html.pre-phase-f-structural` |
| G-10 | Produce `tests/phase-g-p1.test.js` | `tests/phase-g-p1.test.js` — CREATE |
| G-11 | Produce `docs/interface/PHASE-G-CERTIFICATION.md` | `docs/interface/PHASE-G-CERTIFICATION.md` — CREATE |

**Non-scope (explicitly excluded):**
- Any change to `server.js`
- Any change to the switchPage chain
- Any modification of B2, B3, B8, or B9 blocks
- Any new `:root` declarations
- Any SVG icon implementation (Phase B)
- Any `:root` block consolidation (Phase A-3/Phase F)
- Any modification to `public/apex-v2.css` (on disk, unlinked — do not touch)
- Any change to page DOM content (page HTML structure)
- Any change to JS logic beyond confirming badge JS still fires post-G-02
- Any Phase C, D, or E deliverable files

**Dependencies:**
- No prerequisite phase required
- G-09 (B1 audit) must complete before G-01 to verify no other B1 selectors need restoration alongside drop-overlay

**Authorization gates:**
- Explicit authorisation naming "Phase G" required before any changes
- Product owner must confirm G-05 (200px sidebar) is acceptable — wider sidebar may require page layout adjustments on narrow viewport
- Product owner must confirm G-06/G-07 (48px topbar) is acceptable
- No agent may infer any scope beyond the G-01 through G-08 items above

**Verification requirements:**
- `node --check server.js` — PASS
- All 9 existing regression suites pass (RX-02 through phase-e-p1)
- Phase G test suite (G-10) — minimum assertions:
  - `.drop-overlay` has `display:none` in CSS base state
  - `.drop-overlay` has `position:fixed` in CSS
  - `.ds-notif-badge` does NOT have `display:none !important` in B5
  - nav-btn active background does not contain `99,102,241`
  - brand-ring border does not contain `99,102,241`
  - B5 grid-template-columns is 200px (or equivalent)
  - topbar height is 48px

**Visual acceptance criteria:**
- Drop overlay is not visible on page load without a file drag event
- Notification badges (at minimum navActivityBadge and navApprovalsBadge) are visible on the nav rail when populated by JS
- Active nav button has cyan left border AND neutral/cyan (not indigo-tinted) background
- Brand ring shows a cyan-family border, not indigo
- Sidebar is 200px wide on desktop
- Topbar is 48px tall on desktop
- Nav labels render in Inter (proportional sans-serif), not monospace

**Terminal definition of done:**  
`PHASE-G-CERTIFICATION.md` produced. All G-test assertions pass. All 9 existing suites pass. Visual acceptance criteria confirmed in browser (live browser session required for final verification). No files modified except those named in the scope table.

---

## Section 20 — Beta-Readiness Delta

The following gap remains between the current certified state and genuine beta quality:

| Category | Item | Severity |
|----------|------|----------|
| Functional regression | Drop overlay always visible (P0-01) | Critical |
| Governance signal | Navigation badges suppressed (P1-01) | High |
| Landing experience | Command page empty canvas at 900–1099px (P1-02) | High |
| Safety audit | B1 removal impact not fully audited (P1-03) | High |
| Visual identity | Active nav background indigo (P2-01) | Medium |
| Visual identity | Brand ring border indigo (P2-02) | Medium |
| Typography | Nav labels in monospace (P2-03) | Medium |
| Layout | Sidebar 32px narrower than spec (P2-04) | Medium |
| Layout | Topbar 8px shorter than spec (P2-05) | Low |
| Mobile | cx-card-zone may overlap tab bar (P2-06) | UNVERIFIED |
| Command page | Constitution panel may clip (P2-07) | UNVERIFIED |
| Domain pages | GAP-30 quality standard undefined (P2-08) | Medium |
| Icons | Phase B SVG icons not implemented (P2-09) | Medium |
| CSS debt | 3 `:root` blocks remain (P2-10) | Low |

---

## Section 21 — Exact Remaining Blockers

**1.** Drop overlay base state missing (`display:none; position:fixed; inset:0`). Caused by B1 removal in Phase F-Structural. Resolved by: adding these properties to B5 `.drop-overlay` rule. Requires Phase G authorisation.

**2.** B1 content not audited post-removal. Other B1-only base-state definitions may be broken. Resolved by: reading `public/dashboard.html.pre-phase-f-structural`, extracting B1 (lines 1–~1278), and auditing every selector for orphaned base states. Must precede claiming Phase F-Structural is fully verified.

**3.** Navigation badges suppressed by B5 rule. `ds-notif-badge { display:none !important }` in B5 hides all governance signal badges. Resolved by: removing that rule from B5. Requires Phase G authorisation.

**4.** Command page landing experience at 900–1099px is under-populated. Activity feed disappears, leaving orb in large empty canvas. Resolved by: product decision on what appears in the left column at this breakpoint, then implementation. No authorisation exists for this currently — requires design decision first.

**5.** nav-btn active background is indigo. `rgba(99,102,241,0.07)` in B5. Resolved by: changing to `rgba(0,212,255,0.06)` or equivalent. Requires Phase G authorisation.

**6.** brand-ring border is indigo. `rgba(99,102,241,0.45)` in B5. Resolved by: changing to `var(--ax-acc)`. Requires Phase G authorisation.

**7.** GAP-29 (SVG icons) remains blocked — 15 icon assets not delivered. No resolution path until icon assets are delivered.

**8.** GAP-30 (domain page quality) has no defined quality standard. Requires product decision on what constitutes acceptable domain page quality before any implementation.

**9.** GAP-15/16/22 (memory write routes, historical events) not scheduled for backend sprint.

**10.** Three `:root` blocks remain (GAP-27 partially closed). Requires explicit per-block disposition targets before A-3/Phase F can complete.

---

## Section 22 — Terminal Readiness Verdict

**NOT BETA-READY — 10 blockers remain**

The interface cannot be presented as a coherent beta-quality command centre in its current state for the following reasons, ranked by severity:

- Blocker 1 (P0): The drop-overlay element is always visible due to a base-state regression introduced by Phase F-Structural's removal of B1. This is a direct functional defect visible on every page load.
- Blockers 2–3 (P1): The B1 removal impact is not fully audited, and governance signal badges are globally suppressed. Users cannot see pending approval or activity indicators.
- Blocker 4 (P1): The default landing page (command) presents an under-populated canvas at the most common laptop viewport range.

Blockers 5–10 are real gaps but do not individually block a beta presentation — they prevent declaration of full beta quality.

**Minimum resolution path to beta review:** Complete Phase G (items G-01 through G-08) plus conduct a live browser session to verify visual acceptance criteria. Phase G can be authorised and executed without any prerequisite phase.

**Full convergence programme completion** additionally requires: Phase B (SVG icons, blocked by assets), Phase A-3/Phase F (CSS consolidation, blocked by per-block targets), GAP-29 icon delivery, GAP-30 domain quality standard, and backend sprint for GAP-15/16/22. These do not individually block the beta review session but must be completed for the Masterplan Section 10 terminal quality gate.

---

*End of POST-PHASE-F-INTERFACE-REALITY-RECONCILIATION.md*  
*Produced: 2026-08-29 | READ-ONLY — No production files modified*
