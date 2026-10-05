# POST-PHASE-G BROWSER LAYOUT RECONCILIATION

**Date:** 2026-08-29
**Status:** INVESTIGATION COMPLETE — Awaiting browser hard-refresh verification
**Authority:** APEX — BROWSER-VERIFIED LAYOUT RECONCILIATION — HARD STOP
**Scope:** Read-only static analysis. No production files modified.

---

## Investigation Scope

This document covers the read-only investigation ordered after browser verification
showed the layout STILL BROKEN following the `"sidenav content"` fix applied in
POST-PHASE-G-VIEWPORT-LAYOUT-FIX-CERTIFICATION.md.

The investigation exhausts all evidence obtainable from static file analysis:
all five CSS blocks (B2, B3, B5, B8, B9), all `grid-template-areas` declarations,
all `grid-area` assignments, all `position` rules on layout-critical elements,
and all JavaScript that touches style properties.

---

## Evidence Gathered

### 1. Fix Confirmed In File

```
Line 4214:    grid-template-areas:
Line 4215:      "topbar  topbar"
Line 4216:      "sidenav content" !important;
```

The string `"sidebar body"` does not appear in B5. The fix is on disk.

---

### 2. CSS Variable Resolution

| Variable | Value | Source |
|----------|-------|--------|
| `--sidebar-w` | `200px` | B2 `:root` line 1256, B5 `:root` line 3672 |
| `--v12-nav` | `178px` | B3 `:root` line 2662 |
| `--v12-top` | `48px` | B3 `:root` line 2661 |
| `--topbar-h` | `var(--v12-top) !important` = `48px` | B3 `:root` line 2669 |

---

### 3. Full `grid-template-areas` Cascade at 1660px

All five occurrences in file order — only those with applicable media queries at 1660px enter the cascade:

| Line | Block | Media query | Value | Applies at 1660px | Wins? |
|------|-------|-------------|-------|-------------------|-------|
| 1455 | B2 | `≥900px` | `"topbar topbar" "ticker ticker" "sidebar body" "chatbar chatbar"` !important | YES | No — later source overrides |
| 2726 | B3 | `≥900px` | `"topbar topbar" "sidenav content"` !important | YES | No — later source overrides |
| 3774 | B5 canonical | `≥900px` | `"topbar topbar" "sidenav content"` !important | YES | No — B5 second block is later |
| 4214 | B5 second block | `≥900px` | `"topbar topbar" "sidenav content"` !important | YES | **YES — last `!important` declaration at ≥900px** |
| 6027 | B8 | `≥640px AND ≤899px` | `"topbar topbar" "sidenav content"` !important | NO (1660px > 899px) | — |

**Winner at 1660px: B5 second block line 4214 — `"topbar topbar" "sidenav content"` ✓**

---

### 4. Full `grid-template-columns` Cascade at 1660px

| Line | Block | Media query | Value | Wins? |
|------|-------|-------------|-------|-------|
| 1454 | B2 | `≥900px` | `var(--sidebar-w) 1fr` = `200px 1fr` !important | No |
| 2725 | B3 | `≥900px` | `var(--v12-nav) 1fr` = `178px 1fr` !important | No |
| 3772 | B5 canonical | `≥900px` | `200px 1fr` !important | No |
| 4213 | B5 second block | `≥900px` | `var(--sidebar-w) 1fr` = `200px 1fr` !important | No — B8 overrides |
| 6053 | B8 | `≥1440px` | `280px 1fr` !important | **YES** |

**Winner at 1660px: B8 line 6053 — `280px 1fr` ✓**

---

### 5. `grid-area` Assignment Cascade at 1660px

**`.bottom-nav`:**

| Source | Rule | !important |
|--------|------|-----------|
| B2 line 1464 | `grid-area: sidebar` | No |
| B3 line 2731 | `grid-area: sidenav` | **YES — wins** |
| B5 canonical line 3777 | `grid-area: sidenav` | YES (same value) |

Winner: `grid-area: sidenav` — matches the winning `grid-template-areas` ✓

**`.page-and-input`:**

| Source | Rule | !important |
|--------|------|-----------|
| B2 line 1466 | `grid-area: body` | No |
| B3 line 2730 | `grid-area: content` | **YES — wins** |
| B5 canonical line 3778 | `grid-area: content` | YES (same value) |

Winner: `grid-area: content` — matches the winning `grid-template-areas` ✓

---

### 6. `.bottom-nav` Position at 1660px

| Source | Rule |
|--------|------|
| B8 line 6123–6126 | `position: fixed !important` INSIDE `@media (max-width: 899px)` |

At 1660px, `@media (max-width: 899px)` does NOT apply. No other CSS rule sets `position` on `.bottom-nav`. It is `position: static` at desktop widths — in-flow grid child. ✓

---

### 7. B9 (apex-phase-f) Layout Content

B9 (lines 6215–6240) contains FOUR rules only, all color corrections:
- `.orb-inner` background
- `.waveform .wb` background  
- `input:focus, textarea:focus, select:focus` box-shadow
- `.drop-overlay` border-color

Zero layout declarations. B9 is eliminated as a source.

---

### 8. JavaScript Layout Manipulation

Full search for `style.(width|left|gridTemplate|marginLeft|transform)` and direct queries on `.app`, `.bottom-nav`, `.page-and-input`:

**Found:** Progress bar width updates, canvas sizing, widget absolute positioning (cx-card-zone), card animations, arrow rotation.

**Not found:** Any JS touching `.app` grid properties, `.bottom-nav` position/width, or `.page-and-input` placement.

JS is eliminated as a source of the layout failure.

---

### 9. In-Flow Direct Children of `.app`

| Element | CSS position | Grid participant? |
|---------|-------------|------------------|
| `#cx-card-zone` | `position:fixed` (inline) | No — out of flow |
| `.topbar` | static | YES → `grid-area: topbar` ✓ |
| `#mobileNavDropdown` | `position:fixed` (inline) | No — out of flow |
| `.help-overlay` | `display:none; position:fixed` (B2 line 995) | No — out of flow |
| `.agent-drawer-overlay` | `display:none; position:fixed` (B2 line 1031) | No — out of flow |
| `.agent-drawer` | `position:fixed` (B2 line 1033) | No — out of flow |
| `.page-and-input` | static | YES → `grid-area: content` ✓ |
| `.bottom-nav` | static at ≥900px | YES → `grid-area: sidenav` ✓ |

Exactly three grid participants. All have correct `grid-area` assignments matching the winning template. ✓

---

## Summary: Static Cascade at 1660px Desktop

| Property | Computed value | Correct? |
|----------|---------------|---------|
| `.app` `display` | `grid` | ✓ |
| `.app` `grid-template-columns` | `280px 1fr` | ✓ |
| `.app` `grid-template-rows` | `48px 1fr` | ✓ |
| `.app` `grid-template-areas` | `"topbar topbar" "sidenav content"` | ✓ |
| `.topbar` `grid-area` | `topbar` | ✓ |
| `.bottom-nav` `grid-area` | `sidenav` | ✓ |
| `.page-and-input` `grid-area` | `content` | ✓ |
| `.bottom-nav` `position` at 1660px | `static` | ✓ |
| Sidebar width (B8 ≥1440px) | `280px` = column 1 width | ✓ |

**Static analysis conclusion: all grid properties are correct after the fix. The layout SHOULD render as intended.**

---

## Answers to the Five Required Questions

### 1. Is the previous fix winning at runtime?

**Static analysis says YES.** `"sidenav content"` at B5 line 4216 is the last `!important` declaration for `grid-template-areas` that applies at 1660px. No later block overrides it.

**Cannot confirm at the browser/computed level** — the server requires auth (HTTP 401) and blocked all automated computed-style inspection. Browser DevTools are needed for definitive runtime confirmation.

---

### 2. The exact CSS rule currently responsible for the broken rendered geometry

**Cannot determine from static analysis.** The static cascade is correct. The browser observation contradicts it.

**Leading diagnosis: Browser cache.** After the fix was applied to disk, if the browser was served the file via a conditional GET (F5 refresh, not Ctrl+F5), it may have received HTTP 304 and displayed the pre-fix cached version. This would show `"sidebar body"` still active in the browser's CSSOM while the disk file reads `"sidenav content"`.

**Secondary hypothesis:** The fix IS working, but the `overflow: visible !important` on `.bottom-nav` (B5 canonical line 3781) allows nav content to visually extend past the 280px column boundary. This is a separate, pre-existing visual issue that was masked by the first failure and is now newly visible.

---

### 3. One root cause or multiple interacting causes?

After the fix, the original root cause (grid-template-areas named-area mismatch) is resolved.

If the layout is still broken, there are two independent possible causes:
1. **Browser cache** (not a CSS bug — requires hard refresh)
2. **`overflow: visible` on `.bottom-nav`** (pre-existing visual issue, separate from grid placement)

These are not interacting — they are independent.

---

### 4. Minimum safe fix

**Step 1 — Required before any code change:** User hard-refresh the browser at localhost:3000 (Ctrl+Shift+R on Windows, or Ctrl+F5). Then open DevTools → Elements → select `.app` → Computed tab → confirm:
- `grid-template-areas`: should read `"topbar topbar" "sidenav content"`
- `grid-template-columns`: should read `280px 1066px` (or similar 1fr-resolved value)

**If hard refresh fixes the visual:** No code change needed. The fix already works. The browser cache was the cause of the "still broken" report.

**If hard refresh still shows broken layout:** The DevTools computed panel will show the ACTUAL winning declaration. Bring those computed values back for a targeted fix.

**If `overflow: visible` on `.bottom-nav` is causing visual overlap:** The minimum fix is to remove `overflow: visible!important` from B5 canonical line 3781 (restoring default `overflow: hidden` or setting it explicitly). One character change. Requires authorization.

---

### 5. Is a new implementation authorization required?

**For the browser cache scenario (most likely):** No authorization required — no code change needed.

**For any code change** (e.g., fixing `overflow: visible`, removing the redundant B5 second block, or any other discovered issue): YES — a new authorization is required per project safety rules.

**The current HARD STOP stands.** No production files should be modified until browser DevTools inspection with a hard refresh confirms the actual computed state.

---

## Cascade Artifact: Redundant B5 Second Block

As a non-urgent finding: the B5 second block at lines 4210–4218 is architecturally redundant. It sets the same values as B5 canonical (lines 3769–3788) after variable resolution, with the only prior difference being the now-fixed `grid-template-areas` value. Its continued presence adds cascade complexity. Removal would simplify the cascade at zero functional cost. This is NOT an authorization request — it is a Phase H hygiene candidate.

---

## No Production Files Modified

This document is the sole output of this investigation.

| File | Status |
|------|--------|
| `public/dashboard.html` | UNTOUCHED |
| `public/apex-v2.css` | UNTOUCHED |
| `server.js` | UNTOUCHED |

---

## Next Action (User-Executed)

1. In the browser, navigate to localhost:3000
2. After login, press **Ctrl+Shift+R** (hard refresh, bypasses cache)
3. Open DevTools (F12) → Elements → click `.app` container → Computed tab
4. Check: `grid-template-areas` value
5. Report the computed value back — this will confirm whether the fix is live in the browser

If computed value shows `"topbar topbar" "sidenav content"` and the layout still looks wrong, share the DevTools screenshot for targeted diagnosis.

---

**INVESTIGATION COMPLETE. HARD STOP MAINTAINED.**

*Produced: 2026-08-29 | Read-only | No production files modified*
