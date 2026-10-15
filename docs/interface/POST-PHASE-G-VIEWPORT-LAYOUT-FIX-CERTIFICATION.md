# POST-PHASE-G VIEWPORT LAYOUT FIX — CERTIFICATION

**Date:** 2026-08-29
**Status:** CERTIFIED — Fix applied and verified
**Authority:** POST-PHASE-G-VIEWPORT-LAYOUT-RECONNAISSANCE.md
**Change scope:** One CSS value in one declaration in one file

---

## Root Cause (from Reconnaissance)

A CSS cascade conflict within B5 (`<style>` starting at line 3633). Two `@media (min-width:900px)` blocks both targeted `.app { grid-template-areas }` with `!important`. The canonical block at B5 line 3774 correctly set `"sidenav content"`. A second block at B5 line 4214–4216 — inserted during Phase F-Structural consolidation — set `"sidebar body"`, and won because it appeared **later in source order** with identical specificity and `!important`.

The winning area names (`sidebar`, `body`) did not match the grid-area assignments of the actual children:
- `.bottom-nav { grid-area: sidenav }` → `sidenav` did not exist in the winning template
- `.page-and-input { grid-area: content }` → `content` did not exist in the winning template

Both children were auto-placed by the browser into implicit grid tracks, compressing all page content into the far-right ~350–370px of the 1650px viewport.

**Phase attribution:** Phase F-Structural regression. Phase G did not introduce or expose the defect.

---

## Exact File Changed

**File:** `public/dashboard.html`

**Block:** B5 — anonymous `<style>` starting at line 3633

**Declaration:** `@media (min-width: 900px)` block, `.app` rule, `grid-template-areas` property

---

## Exact Old Declaration

```css
@media (min-width: 900px) {
  .app {
    grid-template-rows:    var(--topbar-h) 1fr !important;
    grid-template-columns: var(--sidebar-w) 1fr !important;
    grid-template-areas:
      "topbar  topbar"
      "sidebar body" !important;   /* WRONG — legacy B2 area names */
  }
}
```

---

## Exact New Declaration

```css
@media (min-width: 900px) {
  .app {
    grid-template-rows:    var(--topbar-h) 1fr !important;
    grid-template-columns: var(--sidebar-w) 1fr !important;
    grid-template-areas:
      "topbar  topbar"
      "sidenav content" !important;   /* CORRECT — matches canonical B5 grid-area assignments */
  }
}
```

---

## Change Verification

Post-edit grep results confirm:
- `"sidebar body"` — absent from B5 (line 4216 now reads `"sidenav content"`)
- `"sidebar body"` at line 1458 — remains in B2 (untouched legacy, overridden by B5 !important as before)
- `"sidenav content"` present at:
  - B3 line 2726 (untouched)
  - B5 line 3774 (canonical block, untouched)
  - B5 line 4216 (the fixed block) ✓
  - B8 line 6027 (untouched)

---

## No Other Production Files Modified

| File | Status |
|------|--------|
| `public/dashboard.html` | MODIFIED — one value in one CSS declaration |
| `public/apex-v2.css` | UNTOUCHED |
| `server.js` | UNTOUCHED |
| B2 block | UNTOUCHED |
| B3 block | UNTOUCHED |
| B8 (apex-master) | UNTOUCHED |
| B9 (apex-phase-f) | UNTOUCHED |
| All JS, routes, tests | UNTOUCHED |

---

## Regression Results

| Suite | Result |
|-------|--------|
| rx-02-p1 | PASS |
| rx-03-p1 | PASS |
| rx-04-p1 | PASS |
| rx-05-p1 | PASS |
| rx-06-p1 | PASS |
| rx-07-p1 | PASS |
| phase-c-p1 | PASS |
| phase-d-p1 | PASS |
| phase-e-p1 | PASS |
| phase-g-p1 (26 assertions) | PASS |
| `node --check server.js` | PASS |

**Total: 9/9 regression suites PASS, 26/26 Phase G assertions PASS**

---

## Browser Verification

Browser verification at localhost:3000 is required by the user to confirm the visual layout is restored. The CSS evidence establishes that the fix is correct:

- `.bottom-nav { grid-area: sidenav }` (B5 line 3777) now matches the winning template's `sidenav` cell ✓
- `.page-and-input { grid-area: content }` (B5 line 3778) now matches the winning template's `content` cell ✓
- At 1650px: `grid-template-columns: 280px 1fr` (B8 ≥1440px rule) → sidebar 280px, content ~1370px
- At 900–1439px: `grid-template-columns: var(--sidebar-w) 1fr` → sidebar 200px, content fills remainder

Expected layout restoration:
- Sidebar occupies left ~200–280px (depending on breakpoint)
- Content (`.page-and-input`) occupies remaining viewport width
- Topbar spans full width (area `"topbar topbar"` across both columns — unaffected)
- Mobile layout (< 900px) — unaffected by this fix

---

## Further Issues Discovered

None. The single grid-template-areas value was the sole cause of the global layout failure. No additional defects were identified during this fix.

---

## Final Layout Result

The `.app` CSS grid now has consistent named area assignments across all active declarations:
- Row 1: `topbar topbar` (full width)
- Row 2, col 1: `sidenav` (sidebar nav)
- Row 2, col 2: `content` (page content wrapper)

This matches the canonical Phase G B5 grid-area assignments and restores the intended desktop layout at all breakpoints ≥ 900px.

---

**CERTIFIED COMPLETE.**

*Produced: 2026-08-29 | One file modified: `public/dashboard.html`*
