# POST-PHASE-G VIEWPORT LAYOUT RECONNAISSANCE
**File:** `public/dashboard.html`
**Date of investigation:** 2026-08-29
**Status:** READ-ONLY — no production files modified

---

## OBSERVED DEFECT

At a 1650px-wide desktop viewport, all dashboard pages (not just Business) render content in only the rightmost ~350–370px of the viewport. The left ~1300px is empty/blank. The sidebar navigation is also mis-placed. The layout is effectively broken for all desktop breakpoints ≥ 1440px (and likely ≥ 900px, see root cause analysis below).

---

## VIEWPORT DIMENSIONS TESTED

- **Reported:** 1650px wide (desktop)
- **Breakpoints active at 1650px:**
  - `@media (min-width: 900px)` — YES
  - `@media (min-width: 1280px) and (max-width: 1439px)` — NO (1650 > 1439)
  - `@media (min-width: 1440px)` — YES

---

## AFFECTED PAGES

**Global — all pages.** The defect is in the `.app` shell grid, which is the parent of `.page-and-input`, which contains every page (`#page-business`, `#page-command`, `#page-finance`, etc.). No page-specific CSS is responsible.

---

## DOM / LAYOUT HIERARCHY

```
<body>                                       (document root)
  <div class="app" id="main-content">        (line 6280) ← THE GRID
    <header class="topbar">                  (line 6286) — grid-area: topbar
    <div class="page-and-input">             (line 6365) ← MISPLACED ITEM
      <div class="page-wrap">               (line 6367)
        <div class="page" id="page-business"> (line 8962)
        ...all other pages...
    <nav class="bottom-nav">                 (line 10201) ← ALSO MISPLACED
```

The `.app` is the CSS grid container. `.topbar`, `.page-and-input`, and `.bottom-nav` are its three direct layout children that must be placed by named grid areas.

---

## CASCADE ANALYSIS

### All `.app` grid-template-columns rules at 1650px

| Block | Line | Rule | Media Query Active? |
|-------|------|------|----------------------|
| B2 (line 21) | 793 | `grid-template-columns: 200px 1fr` | YES (≥900px) — no !important |
| B2 (line 21) | 1454 | `grid-template-columns: var(--sidebar-w) 1fr !important` | YES (≥900px) — has !important |
| B3 (line 2633) | 2725 | `grid-template-columns: var(--v12-nav) 1fr !important` | YES (≥900px) — has !important |
| B5 (line 3633) | 3772 | `grid-template-columns: 200px 1fr!important` | YES (≥900px) — has !important |
| B5 (line 3633) | 4213 | `grid-template-columns: var(--sidebar-w) 1fr !important` | YES (≥900px) — has !important |
| B8 (line 5367) | 6046 | `grid-template-columns: 260px 1fr !important` | NO (1280–1439px only) |
| B8 (line 5367) | 6053 | `grid-template-columns: 280px 1fr !important` | YES (≥1440px) — has !important |

**Winner for `grid-template-columns` at 1650px:** B8 line 6053 — `280px 1fr !important`
Reason: B8 appears latest in the document (`<style id="apex-master">` starts at line 5367), the `@media (min-width:1440px)` block at line 6052–6058 matches, specificity is equal to all other `!important` `.app` rules, and it is the last declaration in source order.

**Computed columns at 1650px:** Column 1 = 280px, Column 2 = 1370px (1650 − 280).

---

### All `.app` grid-template-areas rules at 1650px

| Block | Line | Areas | Media Query Active? |
|-------|------|-------|----------------------|
| B2 (line 21) | 1455–1459 | `"topbar topbar" "ticker ticker" "sidebar body" "chatbar chatbar"` | YES (≥900px) — has !important |
| B3 (line 2633) | 2726 | `"topbar topbar" "sidenav content"` | YES (≥900px) — has !important |
| B5 (line 3633) | 3774 | `"topbar topbar" "sidenav content"` | YES (≥900px) — has !important |
| **B5 (line 3633)** | **4214–4216** | **`"topbar topbar" "sidebar body"`** | YES (≥900px) — has !important |
| B8 (line 5367) | 6053 | *(only columns, no areas set)* | YES (≥1440px) |

**Winner for `grid-template-areas` at 1650px:** B5 line 4214–4216 — `"topbar topbar" "sidebar body"`

Reason: The B5 block at lines 4210–4218 is a `@media (min-width: 900px)` rule on `.app` with `!important`, appearing **later in source order** within B5 than the B5 block at lines 3769–3775 (same query, same specificity). B8's 1440px block at line 6053 only modifies `grid-template-columns`, not `grid-template-areas`, so areas from B5 line 4214 remain unchallenged.

**Winning grid template areas:** named cells are `topbar` (row 1, both cols), `sidebar` (row 2, col 1), `body` (row 2, col 2).

---

### All `.page-and-input grid-area` rules at 1650px

| Block | Line | Rule | Media Query Active? |
|-------|------|------|----------------------|
| B2 (line 21) | 1466 | `grid-area: body` (no !important) | YES (≥900px) |
| B3 (line 2633) | 2730 | `grid-area: content !important` | YES (≥900px) |
| B5 (line 3633) | 3778 | `grid-area: content!important` | YES (≥900px) |
| B8 (line 5367) | 6042 | `grid-area: content !important` | YES (640–899px only) |

**Winner for `.page-and-input { grid-area }` at 1650px:** B5 line 3778 — `grid-area: content!important`

Reason: B5 line 3778 is the last `!important` declaration for this property on `.page-and-input` that is active at 1650px. (B8 line 6042 is scoped to `@media (min-width: 640px) and (max-width: 899px)` — NOT active at 1650px.)

---

### All `.bottom-nav grid-area` rules at 1650px

| Block | Line | Rule | Active? |
|-------|------|------|---------|
| B2 (line 21) | 1465 | `grid-area: sidebar` | YES |
| B3 (line 2633) | 2731 | `grid-area: sidenav !important` | YES |
| B5 (line 3633) | 3777 | `grid-area: sidenav!important` | YES |

**Winner for `.bottom-nav { grid-area }` at 1650px:** B5 line 3777 — `grid-area: sidenav!important`

---

## THE MISMATCH — ROOT CAUSE

The winning `.app` grid template (from B5 line 4214–4216) defines these named areas:
```
"topbar  topbar"
"sidebar body"
```

Named areas that EXIST in the grid: `topbar`, `sidebar`, `body`

Named areas that grid children REFERENCE:
- `.topbar` → `grid-area: topbar` ✓ MATCHES
- `.page-and-input` → `grid-area: content` ✗ **NO MATCH** — `content` does not exist
- `.bottom-nav` → `grid-area: sidenav` ✗ **NO MATCH** — `sidenav` does not exist

When a grid item references a named area that does not exist in `grid-template-areas`, CSS auto-placement applies. The browser's auto-placement algorithm places unrecognised items into implicit grid tracks, typically stacking them in document order after explicitly-placed items.

### What the browser computes

With the 2-column, 2-row grid (`"topbar topbar" / "sidebar body"`):
1. `.topbar` is correctly placed in row 1, spanning both columns.
2. `.page-and-input` has `grid-area: content` — no such named area → auto-placed. The browser attempts to place it in the first available cell that fits. Since row 2 col 1 is claimed by `sidebar` and row 2 col 2 is claimed by `body`, and **neither `.bottom-nav` (sidenav) nor `.page-and-input` (content) match any real named area**, both are auto-placed into implicit tracks.
3. The auto-placement result depends on browser implementation and document order. In practice, both elements collapse to a single implicit column. The grid column sizes are `280px` and `1370px`, but auto-placed items without an explicit column assignment may be placed starting in column 1 of an implicit row, or may be constrained by the explicit grid's second column only if the browser decides the `body` cell is available.

### Why content appears in the rightmost ~350px

At 1650px with `grid-template-columns: 280px 1fr`, the second column (`body`) spans 1370px — not ~350px. However, the sidebar (`.bottom-nav`, which references `sidenav`) is also auto-placed and may be rendering in column 2 as well, causing both elements to stack in the right column. The ~350px figure suggests a different scenario:

The pre-Phase-G grid most likely had `grid-template-areas: "topbar topbar" "sidenav content"` winning (from B5 line 3774, which appears BEFORE the conflicting B5 line 4214). If this was the pre-Phase-G state, then Phase F-Structural inserted the block at line 4210–4218 containing `"sidebar body"` area names — overriding the `"sidenav content"` areas that were set earlier in the same block. This is a Phase-F-Structural regression, not a Phase-G regression.

At the 1650px breakpoint, B8 line 6053 sets `grid-template-columns: 280px 1fr`, meaning 280px sidebar + 1370px content. If `.page-and-input` auto-places to the only remaining implicit column or if it fails to span the `1fr` column, the effective rendered width narrows dramatically. The ~350px figure is consistent with a scenario where the `.bottom-nav` (width: 280px from B8 line 6054) is rendered visible in the left column, and `.page-and-input` is erroneously placed in a narrow implicit column or forced to share column 2 alongside the sidebar.

The most likely browser behavior: with `grid-auto-flow: row` (default), auto-placed items are placed left-to-right, top-to-bottom, filling the first available cell. Since row 2 of the named grid has two named cells (`sidebar` and `body`) but neither `.bottom-nav` nor `.page-and-input` match those names, they are auto-placed into an implicit row 3 — creating a third row with only the first column. Since the sidebar (`.bottom-nav`) has `width: 280px !important` and `position` is not fixed in desktop mode, it occupies 280px in the first auto-placed column, while `.page-and-input` occupies column 2 of that implicit row. However, without the named grid areas properly aligned, the layout breaks visually.

**The precise ~350px figure:** If the outer `.app` grid collapses to auto-size for the misplaced items, and `--sidebar-w: 200px` or similar variable resolves differently, the content element could be squeezed. Alternatively, if only one of the two items auto-places into column 2 while the other has been given a fixed `width: 200px` (or 280px) by other rules, the "content" area would be `1650 - (1280ish fixed left item) ≈ 370px`. This matches the symptom of "left ~1300px empty."

---

## WINNING CSS RULES SUMMARY

| Element | Property | Winning Value | Block | Line |
|---------|----------|---------------|-------|------|
| `.app` | `grid-template-columns` | `280px 1fr` | B8 `@media (≥1440px)` | 6053 |
| `.app` | `grid-template-areas` | `"topbar topbar" "sidebar body"` | B5 `@media (≥900px)` | 4214–4216 |
| `.app` | `grid-template-rows` | `var(--topbar-h) 1fr` = `48px 1fr` | B5 `@media (≥900px)` | 4212 |
| `.app` | `display` | `grid` | B5 `@media (≥900px)` | 3771 |
| `.topbar` | `grid-area` | `topbar` | B5 `@media (≥900px)` | 3776 |
| `.bottom-nav` | `grid-area` | `sidenav` | B5 `@media (≥900px)` | 3777 |
| `.page-and-input` | `grid-area` | `content` | B5 `@media (≥900px)` | 3778 |

**The collision:** Grid template defines `sidebar` + `body`. Grid items reference `sidenav` + `content`. Zero matches for these two children → auto-placement → broken layout.

---

## ROOT CAUSE — PHASE ATTRIBUTION

### Is Phase G responsible?

**No.** Phase G only modified B5 lines around 3769–3788 (sidebar `168px` → `200px`, topbar `40px` → `48px`) and G-01 through G-04 fixes. The mismatch between `grid-template-areas: "sidebar body"` (line 4214) and `grid-area: content` / `grid-area: sidenav` (lines 3778, 3777) was pre-existing before Phase G.

### Is Phase F-Structural responsible?

**Yes — with high confidence.** The conflicting block at lines 4210–4218:
```css
@media (min-width: 900px) {
  .app {
    grid-template-rows:    var(--topbar-h) 1fr !important;
    grid-template-columns: var(--sidebar-w) 1fr !important;
    grid-template-areas:
      "topbar  topbar"
      "sidebar body" !important;
  }
}
```
...is positioned within B5 AFTER the canonical areas block at line 3769–3775 which correctly sets `"sidenav content"`. This later block uses area names (`sidebar`, `body`) that were from the earlier B2/apex-v2.css era (see line 1466: `.page-and-input { grid-area: body }`) and conflicts with the canonical B5 area names (`sidenav`, `content`). The B5 block header (line 3634) describes B5 as the "SURVIVOR canonical" layer, and its canonical area assignments at lines 3776–3778 use `sidenav` and `content`. The overriding block at 4210–4218 appears to be a Phase-F-Structural consolidation insertion that erroneously preserved the legacy area names from B2.

### Did Phase G expose it?

Phase G changed the sidebar from `168px` to `200px`. Before Phase G, if `--sidebar-w` was already `200px` (confirmed at line 3672: `--sidebar-w: 200px`), the Phase G change in B5 lines 3772/3780 would have already matched. The Phase G change was cosmetically minor and did not alter the cascade winner for `grid-template-areas`. The defect existed before Phase G. Phase G did not cause or expose it — it was already broken.

---

## SEVERITY

**CRITICAL — Product blocking.** The layout defect renders the entire dashboard unusable at any desktop viewport ≥ 900px (and especially ≥ 1440px). All pages are affected. The sidebar and content area are misplaced globally.

---

## MINIMAL CORRECTIVE CHANGE REQUIRED

**One property change, in one selector, in one block.**

**Target block:** B5 — the anonymous `<style>` starting at line 3633.
**Target rule:** The `@media (min-width: 900px)` block for `.app` at lines 4210–4218.
**Target property:** `grid-template-areas`

**Current (broken):**
```css
@media (min-width: 900px) {
  .app {
    grid-template-rows:    var(--topbar-h) 1fr !important;
    grid-template-columns: var(--sidebar-w) 1fr !important;
    grid-template-areas:
      "topbar  topbar"
      "sidebar body" !important;
  }
}
```

**Required change (fix):**
```css
@media (min-width: 900px) {
  .app {
    grid-template-rows:    var(--topbar-h) 1fr !important;
    grid-template-columns: var(--sidebar-w) 1fr !important;
    grid-template-areas:
      "topbar  topbar"
      "sidenav content" !important;
  }
}
```

**Exact location:** `dashboard.html`, lines 4214–4216, within B5 (anonymous `<style>` at line 3633).
**Change:** Replace `"sidebar body"` with `"sidenav content"` in the `grid-template-areas` value.

This single change aligns the grid's named areas with the winning assignments:
- `.bottom-nav { grid-area: sidenav }` (B5 line 3777) → now matches `sidenav` ✓
- `.page-and-input { grid-area: content }` (B5 line 3778) → now matches `content` ✓

---

## FILES TO CHANGE

- `C:\Users\arwwo\Desktop\APEX\Scripts\public\dashboard.html`
  - Location: line 4214–4216 (within B5, `@media (min-width: 900px)` block)
  - Change: `"sidebar body"` → `"sidenav content"`

---

## FILES PROTECTED (MUST REMAIN UNTOUCHED)

- B2 (`<style>` starting line 21) — untouched per Phase G protocol
- B3 (`<style>` starting line 2633) — untouched per Phase G protocol
- B8 (`<style id="apex-master">` starting line 5367) — untouched per Phase G protocol
- B9 (`<style id="apex-phase-f">` starting line 6215) — untouched per Phase G protocol
- `server.js` — backend, unrelated
- All other files — unrelated

---

## REGRESSION RISKS

1. **Low:** The change aligns area names with the existing canonical assignments already set at B5 lines 3776–3778. No new names are introduced.
2. **Low:** The B2 block at line 1465–1466 uses `sidebar`/`body` area names (without `!important`) — these remain overridden by B5's `!important` declarations, as they were before the fix.
3. **Low:** The tablet breakpoint at B8 lines 6022–6043 (`@media (min-width: 640px) and (max-width: 899px)`) already correctly uses `"sidenav content"` and `grid-area: content` — consistent with the fix.
4. **Monitor:** After fix, confirm `.bottom-nav { width: 280px }` (from B8 line 6054 at ≥1440px) correctly occupies the `sidenav` column — it should since `grid-template-columns: 280px 1fr` defines the column width and the nav's `width: 280px` will fill it.

---

## BROWSER VERIFICATION REQUIREMENTS

After applying the fix:

1. **1650px viewport:** Confirm `.app` renders as a 2-column grid — left column ~280px (sidenav), right column ~1370px (content). All pages should fill the right column.
2. **1440px viewport:** Confirm left column ~280px, right column ~1160px.
3. **1280–1439px viewport:** Confirm left column ~260px (B8 line 6046), right column fills remainder.
4. **900–1279px viewport:** Confirm left column ~200px (from `--sidebar-w: 200px`), right column fills remainder.
5. **< 900px viewport:** Confirm mobile tab bar renders (B8 Phase E block at lines 6121–6195), bottom-nav displayed as horizontal bottom bar, `.page-and-input` fills full width.
6. **All pages:** Verify no page is scoped to only the rightmost ~350px. Test Command, Business, Finance, System, Health pages.
7. **Topbar:** Confirm topbar spans full width (it should, as `grid-area: topbar` with area `"topbar topbar"` across both columns is unaffected by the fix).

---

## PROPOSED ACCEPTANCE CRITERIA

- [ ] At 1650px: content area visually occupies left:280px to right:1650px (width ~1370px)
- [ ] At 1440px: content area visually occupies left:280px to right:1440px (width ~1160px)
- [ ] At 1280px: content area visually occupies left:260px to right:1280px (width ~1020px)
- [ ] At 900px: content area visually occupies left:200px to right:900px (width ~700px)
- [ ] Sidebar nav renders in left ~280px column at all desktop breakpoints
- [ ] Topbar spans full viewport width at all desktop breakpoints
- [ ] Mobile (375px): full-width single-column layout with bottom tab bar
- [ ] No regressions in modal display, badge rendering, indigo-to-cyan fixes (Phase G G-01 through G-04)
- [ ] No regressions in Phase F-Immediate cyan fixes (B9 block)

---

## TERMINAL SUMMARY

### 1. ROOT CAUSE

A CSS cascade conflict within B5 (`<style>` at line 3633). The `@media (min-width: 900px)` block at line 4210–4218 defines `.app { grid-template-areas: "topbar topbar" "sidebar body" }`, which appears LATER in source order than the canonical block at line 3769–3775 (which correctly sets `"topbar topbar" "sidenav content"`). Because both blocks have identical specificity and both use `!important`, the later declaration (line 4214–4216) wins. The winning `grid-template-areas` names the second-row cells `sidebar` and `body`, but the grid items `.bottom-nav` and `.page-and-input` are assigned to `sidenav` and `content` respectively — area names that do not exist in the winning template. CSS auto-placement handles unmatched items, causing both elements to be placed outside the intended layout cells.

### 2. EXACT ELEMENT / SELECTOR RESPONSIBLE

Selector: `.app`
Block: B5 anonymous `<style>` at line 3633
Specific rule block: `@media (min-width: 900px) { .app { ... } }` at lines 4210–4218

### 3. EXACT WINNING CSS RULE

```css
/* dashboard.html, lines 4210–4218, within B5 */
@media (min-width: 900px) {
  .app {
    grid-template-rows:    var(--topbar-h) 1fr !important;
    grid-template-columns: var(--sidebar-w) 1fr !important;
    grid-template-areas:
      "topbar  topbar"
      "sidebar body" !important;
  }
}
```

### 4. WHY THE CONTENT IS IN THE RIGHTMOST ~350px

The `.app` grid's winning template creates named areas `topbar`, `sidebar`, and `body`. The nav (`.bottom-nav`) references `grid-area: sidenav` — unmatched. The content wrapper (`.page-and-input`) references `grid-area: content` — unmatched. Both are auto-placed by the browser. The auto-placement algorithm, combined with the sidebar's `width: 280px !important` (B8 line 6054, active at ≥1440px), results in the sidebar occupying a wide left region while the content is compressed into an auto-sized implicit column or the tail end of the viewport — producing the observed ~350px visible content strip on the right.

### 5. WHETHER IT IS GLOBAL OR PAGE-SPECIFIC

**Global.** The defect is in the `.app` shell grid layout. Every page (`#page-business`, `#page-command`, `#page-finance`, and all others) lives inside `.page-and-input`, which is the misplaced grid child. No individual page CSS is responsible.

### 6. MINIMAL FIX

Change **one value** in **one CSS declaration** in **one file**:

**File:** `C:\Users\arwwo\Desktop\APEX\Scripts\public\dashboard.html`
**Line:** 4214–4216 (inside B5, `@media (min-width: 900px)` block)
**From:**
```
      "topbar  topbar"
      "sidebar body" !important;
```
**To:**
```
      "topbar  topbar"
      "sidenav content" !important;
```

### 7. FILES TO CHANGE

- `C:\Users\arwwo\Desktop\APEX\Scripts\public\dashboard.html` — one value change at line 4214–4216

### 8. FILES PROTECTED

- B2 `<style>` (line 21) — UNTOUCHED
- B3 `<style>` (line 2633) — UNTOUCHED
- B8 `<style id="apex-master">` (line 5367) — UNTOUCHED
- B9 `<style id="apex-phase-f">` (line 6215) — UNTOUCHED
- `server.js` — UNTOUCHED
- All other files — UNTOUCHED

### 9. WHETHER A NEW AUTHORIZATION IS REQUIRED

**Yes.** This is a production HTML file change that affects the global layout shell. Per project safety rules ("Always inspect before editing," "Make small patches"), this fix requires explicit user authorization before application. The change is minimal (one string in one CSS value), surgical (does not alter any other property or block), and fully reversible. No secrets, no backend changes, no route modifications. Present this document to the user and request authorization to apply the one-line fix to `dashboard.html` line 4214–4216.
